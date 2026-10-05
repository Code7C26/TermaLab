// API de TermaLab Cocina: lecturas reales del módulo, sesión de cocción y avisos.
// Se ejecuta en el Worker de Cloudflare (ver src/worker/index.ts) con una base D1.
//
//   POST   /api/v1/devices/:id/readings   (módulo, X-Device-Key)
//   GET    /api/v1/devices/:id            (app, X-App-Key)  estado actual
//   GET    /api/v1/devices/:id/history    (app)             ?minutes=60
//   POST   /api/v1/devices/:id/session    (app)             {action, target}
//   POST   /api/v1/devices/:id/push       (app)             suscripción push
//   DELETE /api/v1/devices/:id/push       (app)             {endpoint}
//   GET    /api/v1/push/key                                 clave pública VAPID
//   GET    /api/v1/health

import { sendPush } from "./webpush.js";

export const READY_TOLERANCE_C = 0.5;
export const OFFLINE_AFTER_MS = 20_000;
export const HISTORY_EVERY_MS = 15_000;
export const HISTORY_KEEP_MS = 3 * 24 * 3600_000;
export const INTERVAL_ACTIVE_S = 3;
export const INTERVAL_IDLE_S = 10;
const MIN_TARGET = 30;
const MAX_TARGET = 300;

const enc = new TextEncoder();

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Normaliza el código de vinculación: sin guiones ni espacios, en mayúsculas. */
export function normalizeCode(code) {
  return String(code ?? "").replace(/[^0-9a-z]/gi, "").toUpperCase();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

const error = (status, message) => json({ error: message }, status);

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function loadDevice(env, id) {
  if (!/^[a-z0-9]{4,16}$/.test(id)) return null;
  return env.DB.prepare("SELECT * FROM devices WHERE id = ?").bind(id).first();
}

async function authorize(env, id, request, kind) {
  const device = await loadDevice(env, id);
  if (!device) return { fail: error(404, "Módulo no encontrado.") };
  const header = kind === "device" ? "X-Device-Key" : "X-App-Key";
  const raw = request.headers.get(header) ?? "";
  const given = kind === "device" ? raw.trim() : normalizeCode(raw);
  const expected = kind === "device" ? device.device_key_hash : device.app_key_hash;
  if (!given || !safeEqual(await sha256Hex(given), expected)) {
    return { fail: error(401, "Clave incorrecta.") };
  }
  return { device };
}

/** Estado público del módulo, tal como lo ven las apps. */
export function deviceStatus(device, now = Date.now()) {
  const connected = device.last_seen != null && now - device.last_seen < OFFLINE_AFTER_MS;
  return {
    deviceId: device.id,
    deviceName: device.name,
    temperature: device.last_temp,
    probe: device.last_probe ?? "unknown",
    connected,
    measuredAt: device.last_seen ? new Date(device.last_seen).toISOString() : null,
    target: device.target,
    active: device.active === 1,
    startedAt: device.started_at ? new Date(device.started_at).toISOString() : null,
    startTemperature: device.start_temp,
    reached: device.reached_at != null,
    reachedAt: device.reached_at ? new Date(device.reached_at).toISOString() : null,
    source: "device",
  };
}

async function notifyGoal(env, device, temperature) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_JWK) return;
  const vapid = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateJwk: env.VAPID_PRIVATE_JWK,
    subject: env.VAPID_SUBJECT || "https://github.com/Code7C26/TermaLab",
  };
  const { results } = await env.DB.prepare(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE device_id = ?",
  )
    .bind(device.id)
    .all();
  const message = {
    title: "¡Está listo! 🍽️",
    body: `La sonda marca ${temperature.toFixed(1)} °C (objetivo ${device.target} °C).`,
    tag: `termalab-${device.id}`,
    url: "/",
  };
  for (const row of results ?? []) {
    const subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
    try {
      const status = await sendPush(subscription, message, vapid, env.fetch ?? fetch);
      if (status === 404 || status === 410) {
        await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
          .bind(row.endpoint)
          .run();
      }
    } catch (e) {
      console.warn("push falló", e);
    }
  }
}

async function postReading(env, ctx, id, request, now) {
  const { device, fail } = await authorize(env, id, request, "device");
  if (fail) return fail;
  const body = await readJson(request);
  if (!body) return error(400, "JSON inválido.");

  const probe = body.probe === "open" ? "open" : "ok";
  let temperature = null;
  if (probe === "ok") {
    temperature = Number(body.temperature);
    if (!Number.isFinite(temperature) || temperature < -50 || temperature > 1100) {
      return error(400, "Temperatura fuera de rango.");
    }
    temperature = Math.round(temperature * 100) / 100;
  }

  const statements = [];
  let reachedNow = false;
  if (
    device.active === 1 &&
    device.reached_at == null &&
    temperature != null &&
    temperature >= device.target - READY_TOLERANCE_C
  ) {
    reachedNow = true;
  }
  statements.push(
    env.DB.prepare(
      `UPDATE devices SET last_temp = ?, last_probe = ?, last_seen = ?,
         reached_at = CASE WHEN ? THEN ? ELSE reached_at END,
         start_temp = CASE WHEN active = 1 AND start_temp IS NULL THEN ? ELSE start_temp END
       WHERE id = ?`,
    ).bind(temperature, probe, now, reachedNow ? 1 : 0, now, temperature, id),
  );
  if (now - (device.last_history_at ?? 0) >= HISTORY_EVERY_MS) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO readings (device_id, measured_at, temperature, probe) VALUES (?, ?, ?, ?)",
      ).bind(id, now, temperature, probe),
      env.DB.prepare("UPDATE devices SET last_history_at = ? WHERE id = ?").bind(now, id),
      env.DB.prepare("DELETE FROM readings WHERE device_id = ? AND measured_at < ?").bind(
        id,
        now - HISTORY_KEEP_MS,
      ),
    );
  }
  await env.DB.batch(statements);

  if (reachedNow) {
    const job = notifyGoal(env, device, temperature);
    if (ctx?.waitUntil) ctx.waitUntil(job);
    else await job;
  }

  const active = device.active === 1;
  const reached = device.reached_at != null || reachedNow;
  return json({
    ok: true,
    active,
    target: device.target,
    alarm: active && reached,
    interval: active ? INTERVAL_ACTIVE_S : INTERVAL_IDLE_S,
  });
}

async function getStatus(env, id, request, now) {
  const { device, fail } = await authorize(env, id, request, "app");
  if (fail) return fail;
  return json(deviceStatus(device, now));
}

async function getHistory(env, id, request, now) {
  const { fail } = await authorize(env, id, request, "app");
  if (fail) return fail;
  const url = new URL(request.url);
  const minutes = Math.min(Math.max(Number(url.searchParams.get("minutes")) || 60, 1), 72 * 60);
  const { results } = await env.DB.prepare(
    `SELECT measured_at, temperature, probe FROM readings
     WHERE device_id = ? AND measured_at >= ? ORDER BY measured_at`,
  )
    .bind(id, now - minutes * 60_000)
    .all();
  return json({
    deviceId: id,
    points: (results ?? []).map((r) => ({
      t: new Date(r.measured_at).toISOString(),
      temperature: r.temperature,
      probe: r.probe,
    })),
  });
}

async function postSession(env, id, request, now) {
  const { device, fail } = await authorize(env, id, request, "app");
  if (fail) return fail;
  const body = await readJson(request);
  if (!body) return error(400, "JSON inválido.");

  if (body.action === "start") {
    const target = Number(body.target ?? device.target);
    if (!Number.isFinite(target) || target < MIN_TARGET || target > MAX_TARGET) {
      return error(400, `El objetivo debe estar entre ${MIN_TARGET} y ${MAX_TARGET} °C.`);
    }
    await env.DB.prepare(
      `UPDATE devices SET target = ?, active = 1, started_at = ?, start_temp = last_temp,
         reached_at = NULL WHERE id = ?`,
    )
      .bind(Math.round(target * 10) / 10, now, id)
      .run();
  } else if (body.action === "stop") {
    await env.DB.prepare("UPDATE devices SET active = 0 WHERE id = ?").bind(id).run();
  } else if (body.action === "target") {
    const target = Number(body.target);
    if (!Number.isFinite(target) || target < MIN_TARGET || target > MAX_TARGET) {
      return error(400, `El objetivo debe estar entre ${MIN_TARGET} y ${MAX_TARGET} °C.`);
    }
    await env.DB.prepare(
      `UPDATE devices SET target = ?,
         reached_at = CASE WHEN last_temp >= ? - ${READY_TOLERANCE_C} THEN reached_at ELSE NULL END
       WHERE id = ?`,
    )
      .bind(Math.round(target * 10) / 10, target, id)
      .run();
  } else {
    return error(400, "Acción desconocida (start, stop o target).");
  }
  const updated = await loadDevice(env, id);
  return json(deviceStatus(updated, now));
}

async function subscribePush(env, id, request, now) {
  const { fail } = await authorize(env, id, request, "app");
  if (fail) return fail;
  const body = await readJson(request);
  if (request.method === "DELETE") {
    if (body?.endpoint) {
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND device_id = ?")
        .bind(body.endpoint, id)
        .run();
    }
    return json({ ok: true });
  }
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || !p256dh || !auth) {
    return error(400, "Suscripción inválida.");
  }
  await env.DB.prepare(
    `INSERT INTO push_subscriptions (endpoint, device_id, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET device_id = excluded.device_id,
       p256dh = excluded.p256dh, auth = excluded.auth`,
  )
    .bind(endpoint, id, p256dh, auth, now)
    .run();
  return json({ ok: true });
}

export async function handleApi(request, env, ctx, now = Date.now()) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-App-Key, X-Device-Key",
      },
    });
  }

  if (parts[0] === "health") return json({ ok: true, database: Boolean(env.DB) });
  if (parts[0] === "push" && parts[1] === "key" && method === "GET") {
    return json({ publicKey: env.VAPID_PUBLIC_KEY ?? null });
  }
  if (!env.DB) return error(503, "Base de datos no configurada.");

  if (parts[0] === "devices" && parts[1]) {
    const id = parts[1].toLowerCase();
    const action = parts[2] ?? "";
    try {
      if (action === "readings" && method === "POST") return await postReading(env, ctx, id, request, now);
      if (action === "" && method === "GET") return await getStatus(env, id, request, now);
      if (action === "history" && method === "GET") return await getHistory(env, id, request, now);
      if (action === "session" && method === "POST") return await postSession(env, id, request, now);
      if (action === "push" && (method === "POST" || method === "DELETE")) {
        return await subscribePush(env, id, request, now);
      }
    } catch (e) {
      console.error(e);
      return error(500, "Error interno.");
    }
  }
  return error(404, "Ruta no encontrada.");
}

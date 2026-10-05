// Pruebas de la API con una base SQLite real (node:sqlite) que imita a D1.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { handleApi, sha256Hex } from "../lib/server/api.js";
import {
  b64urlDecode,
  b64urlEncode,
  encryptPayload,
  generateVapidKeys,
  vapidAuthorization,
} from "../lib/server/webpush.js";

function d1(db) {
  const wrap = (sql, args = []) => ({
    bind: (...a) => wrap(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
    _exec: () => db.prepare(sql).run(...args),
  });
  return {
    prepare: (sql) => wrap(sql),
    batch: async (stmts) => {
      db.exec("BEGIN");
      try {
        for (const s of stmts) s._exec();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

async function setup(extraEnv = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../../migrations/0001_inicial.sql", import.meta.url), "utf8"));
  db.prepare(
    "INSERT INTO devices (id, name, device_key_hash, app_key_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("abc234", "Módulo de prueba", await sha256Hex("CLAVE-ESP32"), await sha256Hex("K7Q29XMA"), 0);
  return { db, env: { DB: d1(db), ...extraEnv } };
}

const BASE = "https://termalab.test/api/v1";
const call = (env, path, { method = "GET", body, app, device } = {}, now = 1_000_000) =>
  handleApi(
    new Request(BASE + path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        "Content-Type": "application/json",
        ...(app ? { "X-App-Key": app } : {}),
        ...(device ? { "X-Device-Key": device } : {}),
      },
    }),
    env,
    null,
    now,
  );

test("rechaza claves incorrectas", async () => {
  const { env } = await setup();
  assert.equal((await call(env, "/devices/abc234", { app: "MAL" })).status, 401);
  assert.equal(
    (await call(env, "/devices/abc234/readings", { method: "POST", device: "MAL", body: { temperature: 20 } })).status,
    401,
  );
  assert.equal((await call(env, "/devices/zzz999", { app: "K7Q29XMA" })).status, 404);
});

test("el código de vinculación acepta guiones y minúsculas", async () => {
  const { env } = await setup();
  assert.equal((await call(env, "/devices/abc234", { app: "k7q2-9xma" })).status, 200);
});

test("flujo completo: lectura, cocción, objetivo y alarma", async () => {
  const { env } = await setup();
  const dev = { device: "CLAVE-ESP32" };
  const app = { app: "K7Q29XMA" };

  let r = await call(env, "/devices/abc234/readings", { method: "POST", ...dev, body: { temperature: 21.37, probe: "ok" } }, 1_000_000);
  assert.equal(r.status, 200);
  let j = await r.json();
  assert.deepEqual([j.active, j.alarm, j.interval], [false, false, 10]);

  r = await call(env, "/devices/abc234", app, 1_005_000);
  j = await r.json();
  assert.equal(j.temperature, 21.37);
  assert.equal(j.connected, true);
  assert.equal(j.active, false);

  r = await call(env, "/devices/abc234/session", { method: "POST", ...app, body: { action: "start", target: 60 } }, 1_010_000);
  j = await r.json();
  assert.equal(j.active, true);
  assert.equal(j.target, 60);
  assert.equal(j.startTemperature, 21.37);

  r = await call(env, "/devices/abc234/readings", { method: "POST", ...dev, body: { temperature: 45, probe: "ok" } }, 1_020_000);
  j = await r.json();
  assert.deepEqual([j.active, j.alarm, j.interval, j.target], [true, false, 3, 60]);

  r = await call(env, "/devices/abc234/readings", { method: "POST", ...dev, body: { temperature: 59.6, probe: "ok" } }, 1_040_000);
  j = await r.json();
  assert.equal(j.alarm, true, "dentro de la tolerancia de 0,5 °C");

  r = await call(env, "/devices/abc234", app, 1_041_000);
  j = await r.json();
  assert.equal(j.reached, true);

  r = await call(env, "/devices/abc234/session", { method: "POST", ...app, body: { action: "stop" } }, 1_050_000);
  r = await call(env, "/devices/abc234/readings", { method: "POST", ...dev, body: { temperature: 61, probe: "ok" } }, 1_060_000);
  j = await r.json();
  assert.equal(j.alarm, false);
  assert.equal(j.active, false);
});

test("sonda desconectada y valores inválidos", async () => {
  const { env } = await setup();
  const dev = { device: "CLAVE-ESP32" };
  let r = await call(env, "/devices/abc234/readings", { method: "POST", ...dev, body: { probe: "open" } });
  assert.equal(r.status, 200);
  r = await call(env, "/devices/abc234", { app: "K7Q29XMA" });
  const j = await r.json();
  assert.equal(j.probe, "open");
  assert.equal(j.temperature, null);
  r = await call(env, "/devices/abc234/readings", { method: "POST", ...dev, body: { temperature: "caliente" } });
  assert.equal(r.status, 400);
  r = await call(env, "/devices/abc234/session", { method: "POST", app: "K7Q29XMA", body: { action: "start", target: 900 } });
  assert.equal(r.status, 400);
});

test("desconectado cuando pasan más de 20 s sin lecturas", async () => {
  const { env } = await setup();
  await call(env, "/devices/abc234/readings", { method: "POST", device: "CLAVE-ESP32", body: { temperature: 20 } }, 1_000_000);
  const j = await (await call(env, "/devices/abc234", { app: "K7Q29XMA" }, 1_030_000)).json();
  assert.equal(j.connected, false);
});

test("historial cada 15 s y filtrado por minutos", async () => {
  const { env, db } = await setup();
  for (let s = 0; s <= 120; s += 3) {
    await call(env, "/devices/abc234/readings", { method: "POST", device: "CLAVE-ESP32", body: { temperature: 20 + s / 10 } }, 1_000_000 + s * 1000);
  }
  const count = db.prepare("SELECT COUNT(*) AS n FROM readings").get().n;
  assert.ok(count >= 8 && count <= 9, `muestras: ${count}`);
  const j = await (await call(env, "/devices/abc234/history?minutes=1", { app: "K7Q29XMA" }, 1_120_000)).json();
  assert.ok(j.points.length >= 4 && j.points.length <= 5, `puntos: ${j.points.length}`);
});

test("suscripción push y aviso al llegar al objetivo", async () => {
  const vapid = await generateVapidKeys();
  const sent = [];
  const { env, db } = await setup({
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_JWK: vapid.privateJwk,
    fetch: async (url, init) => {
      sent.push({ url, init });
      return new Response(null, { status: 201 });
    },
  });
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaPub = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey)));
  const auth = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  const sub = { endpoint: "https://web.push.apple.com/QWERTY", keys: { p256dh: uaPub, auth } };
  const app = { app: "K7Q29XMA" };
  assert.equal((await call(env, "/devices/abc234/push", { method: "POST", ...app, body: sub })).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get().n, 1);

  await call(env, "/devices/abc234/session", { method: "POST", ...app, body: { action: "start", target: 50 } });
  await call(env, "/devices/abc234/readings", { method: "POST", device: "CLAVE-ESP32", body: { temperature: 49.8 } });
  await call(env, "/devices/abc234/readings", { method: "POST", device: "CLAVE-ESP32", body: { temperature: 51 } });
  assert.equal(sent.length, 1, "un solo aviso por cocción");
  assert.equal(sent[0].url, sub.endpoint);
  assert.equal(sent[0].init.headers["Content-Encoding"], "aes128gcm");
  assert.match(sent[0].init.headers.Authorization, /^vapid t=.+, k=/);

  // el servicio responde 410: se borra la suscripción
  env.fetch = async () => new Response(null, { status: 410 });
  await call(env, "/devices/abc234/session", { method: "POST", ...app, body: { action: "start", target: 52 } });
  await call(env, "/devices/abc234/readings", { method: "POST", device: "CLAVE-ESP32", body: { temperature: 53 } });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get().n, 0);
});

// ---------------------------------------------------------------- web push
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}

test("cifrado aes128gcm: el navegador puede descifrarlo (RFC 8291)", async () => {
  const te = new TextEncoder();
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaPub = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const sub = { keys: { p256dh: b64urlEncode(uaPub), auth: b64urlEncode(authSecret) } };
  const body = await encryptPayload(sub, '{"title":"hola"}');

  // lado del navegador
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0);
  const idlen = body[20];
  const asPub = body.slice(21, 21 + idlen);
  const cipher = body.slice(21 + idlen);
  assert.equal(rs, 4096);
  const asKey = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256));
  const info = new Uint8Array([...te.encode("WebPush: info\0"), ...uaPub, ...asPub]);
  const ikm = await hkdf(authSecret, secret, info, 32);
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, cipher));
  assert.equal(plain.at(-1), 2);
  assert.equal(new TextDecoder().decode(plain.slice(0, -1)), '{"title":"hola"}');
});

test("JWT VAPID firmado con ES256 y verificable con la clave pública", async () => {
  const vapid = await generateVapidKeys();
  const header = await vapidAuthorization("https://web.push.apple.com/abc", { ...vapid, subject: "mailto:a@b.c" }, 0);
  const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, vapid.publicKey);
  const [h, p, s] = token.split(".");
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
  assert.equal(payload.aud, "https://web.push.apple.com");
  const pub = await crypto.subtle.importKey("raw", b64urlDecode(k), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, b64urlDecode(s), new TextEncoder().encode(`${h}.${p}`));
  assert.ok(ok);
});

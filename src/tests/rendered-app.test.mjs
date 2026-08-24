import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const environment = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renderiza la experiencia minimalista de TermaLab Cocina", async () => {
  const response = await worker.fetch(
    new Request("https://termalab.test/", {
      headers: { accept: "text/html" },
    }),
    environment,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /TermaLab Cocina/);
  assert.match(html, /Tu comida, en el punto justo/);
  assert.match(html, /Medición/);
  assert.match(html, /Cuenta/);
  assert.doesNotMatch(html, /192\.168\.4\.1|Dirección del dispositivo|Historial/);
});

test("sirve una lectura remota de demostración", async () => {
  const response = await worker.fetch(
    new Request(
      "https://termalab.test/api/devices/demo/latest?target=63&start=8&elapsed=30000",
    ),
    environment,
    context,
  );

  assert.equal(response.status, 200);
  const reading = await response.json();
  assert.equal(reading.deviceId, "demo");
  assert.equal(reading.connected, true);
  assert.equal(reading.source, "demo");
  assert.ok(reading.temperature > 8);
  assert.ok(reading.temperature < 63);
});

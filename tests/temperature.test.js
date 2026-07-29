const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifyTemperature,
  calculateProgress,
  nextSimulatedTemperature,
  normalizeDevicePayload,
  buildTemperatureEndpoint,
} = require("../src/temperature.js");

test("clasifica temperaturas debajo, dentro y encima del objetivo", () => {
  assert.equal(classifyTemperature(70, 80).key, "heating");
  assert.equal(classifyTemperature(79.6, 80).key, "ready");
  assert.equal(classifyTemperature(81, 80).key, "high");
});

test("calcula el avance entre inicio y objetivo", () => {
  assert.equal(calculateProgress(20, 20, 80), 0);
  assert.equal(calculateProgress(50, 20, 80), 50);
  assert.equal(calculateProgress(90, 20, 80), 100);
});

test("la simulación se acerca al objetivo sin superarlo", () => {
  const nextValue = nextSimulatedTemperature(40, 80, 0.5);
  assert.ok(nextValue > 40);
  assert.ok(nextValue <= 80);
});

test("normaliza la respuesta esperada del ESP32", () => {
  assert.deepEqual(
    normalizeDevicePayload({
      temperatura: "78.36",
      battery: 86,
      connected: true,
    }),
    {
      temperature: 78.4,
      battery: 86,
      connected: true,
    },
  );
});

test("rechaza respuestas sin temperatura", () => {
  assert.throws(
    () => normalizeDevicePayload({ battery: 90 }),
    /temperatura válida/,
  );
});

test("construye el endpoint de temperatura", () => {
  assert.equal(
    buildTemperatureEndpoint("http://192.168.4.1/"),
    "http://192.168.4.1/api/temperature",
  );
  assert.equal(
    buildTemperatureEndpoint("http://192.168.4.1/api/temperature"),
    "http://192.168.4.1/api/temperature",
  );
});

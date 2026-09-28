import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyTemperature,
  formatElapsedTime,
  markerAngleForTemperature,
  progressForTemperature,
  simulatedTemperature,
} from "../lib/temperature.js";

test("clasifica una cocción debajo, en y encima del objetivo", () => {
  assert.equal(classifyTemperature(50, 63).key, "heating");
  assert.equal(classifyTemperature(62.6, 63).key, "ready");
  assert.equal(classifyTemperature(66, 63).key, "high");
});

test("calcula el avance entre el inicio y el objetivo", () => {
  assert.equal(progressForTemperature(8, 8, 63), 0);
  assert.equal(progressForTemperature(35.5, 8, 63), 50);
  assert.equal(progressForTemperature(80, 8, 63), 100);
});

test("ubica el indicador entre el extremo frío y el caliente", () => {
  assert.equal(markerAngleForTemperature(0), -150);
  assert.equal(markerAngleForTemperature(110), 150);
  assert.equal(markerAngleForTemperature(220), 150);
});

test("formatea el tiempo transcurrido de una medición", () => {
  assert.equal(formatElapsedTime(0), "00:00");
  assert.equal(formatElapsedTime(65_400), "01:05");
  assert.equal(formatElapsedTime(-1_000), "00:00");
});

test("la simulación avanza sin superar el objetivo", () => {
  const first = simulatedTemperature(8, 63, 0);
  const later = simulatedTemperature(8, 63, 30_000);
  const finished = simulatedTemperature(8, 63, 1_000_000);

  assert.equal(first, 8);
  assert.ok(later > first);
  assert.ok(later < 63);
  assert.equal(finished, 63);
});

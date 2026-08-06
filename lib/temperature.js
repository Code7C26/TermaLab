export const PRESETS = Object.freeze([
  Object.freeze({
    id: "carne",
    label: "Carne",
    emoji: "🥩",
    target: 63,
    start: 8,
  }),
  Object.freeze({
    id: "pollo",
    label: "Pollo",
    emoji: "🍗",
    target: 74,
    start: 8,
  }),
  Object.freeze({
    id: "pan",
    label: "Pan",
    emoji: "🍞",
    target: 96,
    start: 22,
  }),
]);

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function classifyTemperature(temperature, target, tolerance = 0.5) {
  const difference = Number((target - temperature).toFixed(1));

  if (Math.abs(difference) <= tolerance) {
    return {
      key: "ready",
      label: "Está listo",
      remaining: 0,
    };
  }

  if (difference > tolerance) {
    return {
      key: "heating",
      label: "Cocinando",
      remaining: difference,
    };
  }

  return {
    key: "high",
    label: "Por encima",
    remaining: difference,
  };
}

export function progressForTemperature(temperature, start, target) {
  if (start === target) {
    return 100;
  }

  return clamp(((temperature - start) / (target - start)) * 100, 0, 100);
}

export function markerAngleForTemperature(temperature) {
  const normalized = clamp(temperature, 0, 110) / 110;
  return -150 + normalized * 300;
}

export function simulatedTemperature(start, target, elapsedMilliseconds) {
  const elapsedSeconds = Math.max(0, elapsedMilliseconds / 1000);
  const progress = 1 - Math.exp(-elapsedSeconds / 19);
  const value = start + (target - start) * progress;
  return Number(Math.min(value, target).toFixed(1));
}

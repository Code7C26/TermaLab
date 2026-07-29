(function createTermalabCore(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.TermalabCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildCore() {
  const PRESETS = Object.freeze({
    mate: Object.freeze({
      label: "Agua para mate",
      target: 80,
      start: 22,
      tip: "Para mate, 75–80 °C ofrece agua caliente sin llegar al hervor.",
    }),
    carne: Object.freeze({
      label: "Carne vacuna",
      target: 63,
      start: 8,
      tip: "Usá la temperatura como referencia y verificá siempre el punto en la parte más gruesa.",
    }),
    pollo: Object.freeze({
      label: "Pollo",
      target: 74,
      start: 8,
      tip: "Medí en la parte más gruesa y evitá tocar huesos para obtener una lectura más confiable.",
    }),
    personalizado: Object.freeze({
      label: "Objetivo personalizado",
      target: 70,
      start: 22,
      tip: "Definí un objetivo entre 20 °C y 125 °C según la preparación.",
    }),
  });

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function classifyTemperature(temperature, target, tolerance = 0.5) {
    const difference = Number((target - temperature).toFixed(1));

    if (Math.abs(difference) <= tolerance) {
      return {
        key: "ready",
        label: "Objetivo alcanzado",
        remaining: 0,
      };
    }

    if (difference > tolerance) {
      return {
        key: "heating",
        label: "Calentando",
        remaining: difference,
      };
    }

    return {
      key: "high",
      label: "Por encima",
      remaining: difference,
    };
  }

  function calculateProgress(temperature, start, target) {
    if (target === start) {
      return 100;
    }

    const progress = ((temperature - start) / (target - start)) * 100;
    return clamp(progress, 0, 100);
  }

  function nextSimulatedTemperature(current, target, randomValue = Math.random()) {
    const difference = target - current;

    if (Math.abs(difference) <= 0.35) {
      const idleJitter = (randomValue - 0.5) * 0.18;
      return Number((current + idleJitter).toFixed(1));
    }

    const direction = Math.sign(difference);
    const baseStep = clamp(Math.abs(difference) * 0.065, 0.22, 2.4);
    const jitter = (randomValue - 0.5) * 0.24;
    const nextValue = current + direction * baseStep + jitter;

    if (
      (direction > 0 && nextValue > target) ||
      (direction < 0 && nextValue < target)
    ) {
      return Number(target.toFixed(1));
    }

    return Number(nextValue.toFixed(1));
  }

  function normalizeDevicePayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new TypeError("La respuesta del dispositivo debe ser un objeto JSON.");
    }

    const rawTemperature =
      payload.temperature ?? payload.temperatura ?? payload.current_temperature;
    const temperature = Number(rawTemperature);

    if (!Number.isFinite(temperature)) {
      throw new TypeError("La respuesta no contiene una temperatura válida.");
    }

    return {
      temperature: Number(temperature.toFixed(1)),
      battery: Number.isFinite(Number(payload.battery))
        ? clamp(Number(payload.battery), 0, 100)
        : null,
      connected: payload.connected !== false,
    };
  }

  function buildTemperatureEndpoint(baseUrl) {
    const normalizedUrl = String(baseUrl || "").trim().replace(/\/+$/, "");

    if (!normalizedUrl) {
      throw new TypeError("Ingresá una dirección válida para el ESP32.");
    }

    if (normalizedUrl.endsWith("/api/temperature")) {
      return normalizedUrl;
    }

    return `${normalizedUrl}/api/temperature`;
  }

  return {
    PRESETS,
    clamp,
    classifyTemperature,
    calculateProgress,
    nextSimulatedTemperature,
    normalizeDevicePayload,
    buildTemperatureEndpoint,
  };
});

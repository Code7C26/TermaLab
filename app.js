(function initializeTermalabApp() {
  "use strict";

  const {
    PRESETS,
    clamp,
    classifyTemperature,
    calculateProgress,
    nextSimulatedTemperature,
    normalizeDevicePayload,
    buildTemperatureEndpoint,
  } = window.TermalabCore;

  const STORAGE_KEYS = {
    history: "termalab.history.v1",
    deviceUrl: "termalab.deviceUrl.v1",
  };

  const elements = {
    screens: document.querySelectorAll(".screen"),
    navButtons: document.querySelectorAll("[data-screen]"),
    screenLinks: document.querySelectorAll("[data-screen-link]"),
    presetButtons: document.querySelectorAll("[data-preset]"),
    dataModeInputs: document.querySelectorAll('input[name="dataMode"]'),
    currentTemperature: document.getElementById("currentTemperature"),
    targetSummary: document.getElementById("targetSummary"),
    remainingSummary: document.getElementById("remainingSummary"),
    stateSummary: document.getElementById("stateSummary"),
    temperatureStatus: document.getElementById("temperatureStatus"),
    temperatureGauge: document.getElementById("temperatureGauge"),
    sessionLabel: document.getElementById("sessionLabel"),
    sessionButton: document.getElementById("sessionButton"),
    saveButton: document.getElementById("saveButton"),
    goalAlert: document.getElementById("goalAlert"),
    targetRange: document.getElementById("targetRange"),
    targetNumber: document.getElementById("targetNumber"),
    presetTip: document.getElementById("presetTip"),
    chartLine: document.getElementById("chartLine"),
    chartPoint: document.getElementById("chartPoint"),
    targetLine: document.getElementById("targetLine"),
    targetChartLabel: document.getElementById("targetChartLabel"),
    readingCount: document.getElementById("readingCount"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    clearHistoryButton: document.getElementById("clearHistoryButton"),
    alertsButton: document.getElementById("alertsButton"),
    connectionBadge: document.getElementById("connectionBadge"),
    connectionText: document.getElementById("connectionText"),
    deviceUrl: document.getElementById("deviceUrl"),
    connectButton: document.getElementById("connectButton"),
    deviceMessage: document.getElementById("deviceMessage"),
    toast: document.getElementById("toast"),
  };

  const initialPreset = PRESETS.mate;
  const state = {
    screen: "monitor",
    preset: "mate",
    mode: "demo",
    current: initialPreset.start,
    start: initialPreset.start,
    target: initialPreset.target,
    readings: [],
    running: false,
    timer: null,
    goalAnnounced: false,
    deviceUrl:
      window.localStorage.getItem(STORAGE_KEYS.deviceUrl) ||
      elements.deviceUrl.value,
    history: readHistory(),
  };

  let toastTimer = null;

  function readHistory() {
    try {
      const savedHistory = JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.history) || "[]",
      );
      return Array.isArray(savedHistory) ? savedHistory : [];
    } catch {
      return [];
    }
  }

  function persistHistory() {
    window.localStorage.setItem(
      STORAGE_KEYS.history,
      JSON.stringify(state.history.slice(0, 30)),
    );
  }

  function showScreen(screenId) {
    state.screen = screenId;

    elements.screens.forEach((screen) => {
      const isActive = screen.id === screenId;
      screen.classList.toggle("active", isActive);
      screen.hidden = !isActive;
    });

    elements.navButtons.forEach((button) => {
      const isActive = button.dataset.screen === screenId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });

    window.location.hash = screenId;

    if (screenId === "history") {
      renderHistory();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectPreset(presetKey) {
    const preset = PRESETS[presetKey];

    if (!preset) {
      return;
    }

    stopSession();
    state.preset = presetKey;
    state.target = preset.target;
    state.start = preset.start;
    state.current = preset.start;
    state.readings = [];
    state.goalAnnounced = false;

    elements.presetButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.preset === presetKey);
    });

    elements.targetRange.value = String(preset.target);
    elements.targetNumber.value = String(preset.target);
    elements.sessionLabel.textContent = preset.label;
    elements.presetTip.textContent = preset.tip;
    elements.goalAlert.hidden = true;

    render();
  }

  function updateTarget(rawValue) {
    const nextTarget = clamp(Number(rawValue) || state.target, 20, 125);
    state.target = Math.round(nextTarget);
    state.goalAnnounced = false;
    elements.goalAlert.hidden = true;
    elements.targetRange.value = String(state.target);
    elements.targetNumber.value = String(state.target);

    if (state.preset !== "personalizado") {
      state.preset = "personalizado";
      elements.sessionLabel.textContent = PRESETS.personalizado.label;
      elements.presetTip.textContent = PRESETS.personalizado.tip;
      elements.presetButtons.forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.preset === "personalizado",
        );
      });
    }

    render();
  }

  function toggleSession() {
    if (state.running) {
      stopSession();
      render();
      return;
    }

    startSession();
  }

  function startSession() {
    state.running = true;
    state.goalAnnounced = false;
    elements.goalAlert.hidden = true;
    pushReading(state.current);

    if (state.mode === "demo") {
      state.timer = window.setInterval(() => {
        const nextTemperature = nextSimulatedTemperature(
          state.current,
          state.target,
        );
        pushReading(nextTemperature);
      }, 900);
    } else {
      pollDevice();
      state.timer = window.setInterval(pollDevice, 2000);
    }

    render();
  }

  function stopSession() {
    if (state.timer) {
      window.clearInterval(state.timer);
    }

    state.timer = null;
    state.running = false;
  }

  function pushReading(temperature) {
    state.current = Number(temperature.toFixed(1));
    state.readings.push({
      temperature: state.current,
      timestamp: Date.now(),
    });
    state.readings = state.readings.slice(-30);

    const classification = classifyTemperature(state.current, state.target);

    if (classification.key === "ready" && !state.goalAnnounced) {
      state.goalAnnounced = true;
      elements.goalAlert.hidden = false;
      announceGoal();

      if (state.mode === "demo") {
        stopSession();
      }
    }

    render();
  }

  async function pollDevice() {
    try {
      const endpoint = buildTemperatureEndpoint(state.deviceUrl);
      const response = await window.fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`El ESP32 respondió con estado ${response.status}.`);
      }

      const reading = normalizeDevicePayload(await response.json());
      pushReading(reading.temperature);
      setDeviceMessage(
        reading.battery === null
          ? "ESP32 conectado y enviando temperatura."
          : `ESP32 conectado · batería ${Math.round(reading.battery)}%.`,
        "success",
      );
      setConnectionStatus(true);
    } catch (error) {
      setDeviceMessage(
        `${error.message} Revisá la dirección y que ambos dispositivos estén en la misma red.`,
        "error",
      );
      setConnectionStatus(false);
    }
  }

  async function testDeviceConnection() {
    state.deviceUrl = elements.deviceUrl.value.trim();
    window.localStorage.setItem(STORAGE_KEYS.deviceUrl, state.deviceUrl);
    setDeviceMessage("Probando conexión…");

    const deviceModeInput = document.querySelector(
      'input[name="dataMode"][value="device"]',
    );
    deviceModeInput.checked = true;
    setMode("device");
    await pollDevice();
  }

  function setMode(mode) {
    stopSession();
    state.mode = mode;

    if (mode === "demo") {
      setConnectionStatus(false, "Modo demo");
      setDeviceMessage("El modo demo está activo.");
    } else {
      setConnectionStatus(false, "ESP32 sin verificar");
      setDeviceMessage("Probá la conexión para comenzar a recibir datos.");
    }

    render();
  }

  function setConnectionStatus(connected, customText) {
    elements.connectionBadge.classList.toggle("connected", connected);
    elements.connectionBadge.classList.toggle("demo", !connected);
    elements.connectionText.textContent =
      customText ||
      (connected
        ? "ESP32 conectado"
        : state.mode === "demo"
          ? "Modo demo"
          : "ESP32 desconectado");
  }

  function setDeviceMessage(message, type = "") {
    elements.deviceMessage.textContent = message;
    elements.deviceMessage.className = `form-message ${type}`.trim();
  }

  function announceGoal() {
    showToast(`Objetivo alcanzado: ${state.target} °C.`);

    if ("vibrate" in navigator) {
      navigator.vibrate([180, 80, 180]);
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("TermaLab", {
        body: `La preparación llegó a ${state.target} °C.`,
      });
    }
  }

  async function requestAlerts() {
    if (!("Notification" in window)) {
      showToast("Este navegador no admite notificaciones.");
      return;
    }

    if (Notification.permission === "granted") {
      showToast("Las alertas ya están activadas.");
      elements.alertsButton.textContent = "Alertas activas";
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      elements.alertsButton.textContent = "Alertas activas";
      showToast("Alertas activadas.");
    } else {
      showToast("Las alertas no fueron habilitadas.");
    }
  }

  function saveReading() {
    const preset = PRESETS[state.preset] || PRESETS.personalizado;
    const entry = {
      id: `${Date.now()}-${Math.round(state.current * 10)}`,
      timestamp: Date.now(),
      label: preset.label,
      temperature: state.current,
      target: state.target,
      source: state.mode,
    };

    state.history.unshift(entry);
    state.history = state.history.slice(0, 30);
    persistHistory();
    showToast("Lectura guardada en este navegador.");
  }

  function clearHistory() {
    if (state.history.length === 0) {
      return;
    }

    state.history = [];
    persistHistory();
    renderHistory();
    showToast("Historial eliminado.");
  }

  function renderHistory() {
    const hasHistory = state.history.length > 0;
    elements.historyEmpty.hidden = hasHistory;
    elements.historyList.hidden = !hasHistory;

    if (!hasHistory) {
      elements.historyList.replaceChildren();
      return;
    }

    const fragment = document.createDocumentFragment();

    state.history.forEach((entry) => {
      const item = document.createElement("div");
      const date = new Date(entry.timestamp);
      item.className = "history-item";

      const details = document.createElement("div");
      const title = document.createElement("strong");
      const metadata = document.createElement("small");
      title.textContent = entry.label;
      metadata.textContent = `${date.toLocaleDateString("es-AR")} · ${date.toLocaleTimeString(
        "es-AR",
        { hour: "2-digit", minute: "2-digit" },
      )} · ${entry.source === "device" ? "ESP32" : "Demo"}`;
      details.append(title, metadata);

      const temperature = document.createElement("div");
      temperature.className = "history-temperature";
      temperature.textContent = `${Number(entry.temperature).toFixed(1)} °C`;

      const target = document.createElement("span");
      target.className = "history-target";
      target.textContent = `Objetivo ${entry.target} °C`;

      item.append(details, temperature, target);
      fragment.append(item);
    });

    elements.historyList.replaceChildren(fragment);
  }

  function renderChart() {
    const readings = state.readings;
    const chartLeft = 44;
    const chartRight = 700;
    const chartTop = 20;
    const chartBottom = 190;
    const minimum = 20;
    const maximum = 125;

    const yForTemperature = (temperature) => {
      const normalized = (temperature - minimum) / (maximum - minimum);
      return chartBottom - clamp(normalized, 0, 1) * (chartBottom - chartTop);
    };

    const targetY = yForTemperature(state.target);
    elements.targetLine.setAttribute("y1", String(targetY));
    elements.targetLine.setAttribute("y2", String(targetY));
    elements.targetChartLabel.setAttribute("y", String(Math.max(16, targetY - 8)));
    elements.targetChartLabel.textContent = `${state.target} °C`;

    if (readings.length === 0) {
      elements.chartLine.setAttribute("points", "");
      elements.chartPoint.setAttribute("cx", String(chartLeft));
      elements.chartPoint.setAttribute("cy", String(chartBottom));
      elements.readingCount.textContent = "0 muestras";
      return;
    }

    const denominator = Math.max(readings.length - 1, 1);
    const points = readings.map((reading, index) => {
      const x =
        chartLeft + (index / denominator) * (chartRight - chartLeft);
      const y = yForTemperature(reading.temperature);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const lastPoint = points[points.length - 1].split(",");
    elements.chartLine.setAttribute("points", points.join(" "));
    elements.chartPoint.setAttribute("cx", lastPoint[0]);
    elements.chartPoint.setAttribute("cy", lastPoint[1]);
    elements.readingCount.textContent = `${readings.length} ${
      readings.length === 1 ? "muestra" : "muestras"
    }`;
  }

  function render() {
    const classification = classifyTemperature(state.current, state.target);
    const progress = calculateProgress(
      state.current,
      state.start,
      state.target,
    );
    const gaugeDegrees = Math.round((progress / 100) * 300);

    elements.currentTemperature.textContent = state.current.toFixed(1);
    elements.targetSummary.textContent = String(state.target);
    elements.remainingSummary.textContent =
      classification.key === "ready"
        ? "0.0 °C"
        : classification.remaining > 0
          ? `${classification.remaining.toFixed(1)} °C`
          : `${Math.abs(classification.remaining).toFixed(1)} °C arriba`;
    elements.stateSummary.textContent = state.running
      ? classification.label
      : state.goalAnnounced
        ? "Medición finalizada"
        : "Listo para iniciar";
    elements.temperatureStatus.textContent = classification.label;
    elements.temperatureStatus.className =
      `temperature-status ${classification.key}`;
    elements.temperatureGauge.style.setProperty(
      "--progress",
      `${gaugeDegrees}deg`,
    );
    elements.sessionButton.textContent = state.running
      ? "Detener medición"
      : state.goalAnnounced
        ? "Medir nuevamente"
        : "Iniciar medición";
    elements.targetRange.value = String(state.target);
    elements.targetNumber.value = String(state.target);

    renderChart();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2600);
  }

  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.screen));
  });

  elements.screenLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showScreen(link.dataset.screenLink);
    });
  });

  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => selectPreset(button.dataset.preset));
  });

  elements.dataModeInputs.forEach((input) => {
    input.addEventListener("change", () => setMode(input.value));
  });

  elements.targetRange.addEventListener("input", (event) => {
    updateTarget(event.target.value);
  });
  elements.targetNumber.addEventListener("change", (event) => {
    updateTarget(event.target.value);
  });
  elements.sessionButton.addEventListener("click", toggleSession);
  elements.saveButton.addEventListener("click", saveReading);
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.alertsButton.addEventListener("click", requestAlerts);
  elements.connectButton.addEventListener("click", testDeviceConnection);
  elements.deviceUrl.addEventListener("change", (event) => {
    state.deviceUrl = event.target.value.trim();
    window.localStorage.setItem(STORAGE_KEYS.deviceUrl, state.deviceUrl);
  });

  window.addEventListener("hashchange", () => {
    const requestedScreen = window.location.hash.replace("#", "");

    if (["monitor", "history", "device"].includes(requestedScreen)) {
      showScreen(requestedScreen);
    }
  });

  elements.deviceUrl.value = state.deviceUrl;

  if ("Notification" in window && Notification.permission === "granted") {
    elements.alertsButton.textContent = "Alertas activas";
  }

  const initialScreen = window.location.hash.replace("#", "");
  showScreen(
    ["monitor", "history", "device"].includes(initialScreen)
      ? initialScreen
      : "monitor",
  );
  renderHistory();
  render();
})();

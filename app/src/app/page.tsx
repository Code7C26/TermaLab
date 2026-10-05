"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  PRESETS,
  classifyTemperature,
  clamp,
  formatElapsedTime,
  markerAngleForTemperature,
  progressForTemperature,
} from "@/lib/temperature.js";
import {
  type DeviceStatus,
  type Pairing,
  enablePush,
  fetchStatus,
  isIos,
  isStandalone,
  parsePairingCode,
  pushEnabled,
  pushSupported,
  registerServiceWorker,
  savePairing,
  sendSession,
} from "@/lib/client/device";

type Screen = "measurement" | "account";

type DemoReading = { connected: boolean; temperature: number };

const DEFAULT_PRESET = PRESETS[0];
const DEMO_INTERVAL_MS = 1_200;
const DEVICE_INTERVAL_MS = 2_000;
const READY_TOLERANCE_C = 0.5;
const PAIRING_EVENT = "termalab:pairing";

// La vinculación vive en localStorage; useSyncExternalStore evita desajustes con el render del servidor.
function subscribePairing(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PAIRING_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PAIRING_EVENT, callback);
  };
}
const readPairing = () => {
  try {
    return localStorage.getItem("termalab.pairing");
  } catch {
    return null;
  }
};

function storePairing(pairing: Pairing | null) {
  savePairing(pairing);
  window.dispatchEvent(new Event(PAIRING_EVENT));
}

function alertLocally(title: string, body: string) {
  if ("vibrate" in navigator) navigator.vibrate([180, 80, 180]);
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    } catch {
      /* iOS solo permite avisos desde el service worker */
    }
  }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("measurement");
  const pairingRaw = useSyncExternalStore(subscribePairing, readPairing, () => null);
  const pairing = useMemo<Pairing | null>(() => {
    try {
      return pairingRaw ? (JSON.parse(pairingRaw) as Pairing) : null;
    } catch {
      return null;
    }
  }, [pairingRaw]);

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return (
    <main className="site-shell">
      <section className="phone-shell" aria-label="Aplicación TermaLab Cocina">
        {pairing ? (
          <DeviceApp
            key={pairing.id}
            pairing={pairing}
            screen={screen}
            setScreen={setScreen}
          />
        ) : (
          <DemoApp screen={screen} setScreen={setScreen} />
        )}
      </section>
    </main>
  );
}

/* ------------------------------------------------------------ piezas comunes */

function Header({ badge, tone }: { badge: string; tone: "online" | "offline" | "warn" }) {
  return (
    <header className="app-header">
      <div className="brand-crop" aria-label="TermaLab">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/termalab-logo.png" alt="TermaLab" width={600} height={216} />
      </div>
      <span className={`cloud-badge ${tone}`}>
        <i aria-hidden="true" />
        {badge}
      </span>
    </header>
  );
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <button
        className={screen === "measurement" ? "active" : ""}
        type="button"
        onClick={() => setScreen("measurement")}
        aria-current={screen === "measurement" ? "page" : undefined}
      >
        <span aria-hidden="true">°</span>
        Medición
      </button>
      <button
        className={screen === "account" ? "active" : ""}
        type="button"
        onClick={() => setScreen("account")}
        aria-current={screen === "account" ? "page" : undefined}
      >
        <span aria-hidden="true">○</span>
        Cuenta
      </button>
    </nav>
  );
}

type GaugeProps = {
  temperature: number | null;
  target: number;
  start: number;
  probeMissing?: boolean;
};

function Gauge({ temperature, target, start, probeMissing }: GaugeProps) {
  const value = temperature ?? start;
  const classification = classifyTemperature(value, target);
  return (
    <div
      className="temperature-gauge"
      style={
        {
          "--marker-angle": `${markerAngleForTemperature(value)}deg`,
          "--progress": `${progressForTemperature(value, start, target)}%`,
        } as React.CSSProperties
      }
      aria-label={
        temperature == null ? "Sin lectura de la sonda" : `Temperatura actual ${temperature.toFixed(1)} grados`
      }
    >
      <span className="gauge-marker" aria-hidden="true" />
      <div className="gauge-center">
        <span className="probe-label">SONDA INTERNA</span>
        <div>
          <strong>{temperature == null ? "--" : temperature.toFixed(1)}</strong>
          <span>°C</span>
        </div>
        {probeMissing ? (
          <p className="high">Sonda desconectada</p>
        ) : (
          <p className={classification.key}>{classification.label}</p>
        )}
      </div>
    </div>
  );
}

function PresetRow({ presetId, onSelect }: { presetId: string; onSelect: (id: string) => void }) {
  return (
    <div className="preset-row" aria-label="Tipo de preparación">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          className={presetId === preset.id ? "active" : ""}
          type="button"
          onClick={() => onSelect(preset.id)}
          aria-pressed={presetId === preset.id}
        >
          <span aria-hidden="true">{preset.emoji}</span>
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function TargetControl({ target, onChange }: { target: number; onChange: (d: number) => void }) {
  return (
    <div className="target-control">
      <span>Objetivo</span>
      <div>
        <button type="button" onClick={() => onChange(-1)} aria-label="Bajar temperatura objetivo">
          −
        </button>
        <strong>{target} °C</strong>
        <button type="button" onClick={() => onChange(1)} aria-label="Subir temperatura objetivo">
          +
        </button>
      </div>
    </div>
  );
}

function PairForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parsePairingCode(code);
    if (!parsed) {
      setMessage("El código tiene la forma abc123-ABCD-EFGH.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const status = await fetchStatus({ ...parsed, name: "" });
      storePairing({ ...parsed, name: status.deviceName });
    } catch (e) {
      const status = (e as { status?: number }).status;
      setMessage(
        status === 401 || status === 404
          ? "Código incorrecto. Revisalo y probá de nuevo."
          : "No se pudo conectar con el servidor.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="pair-form" onSubmit={submit}>
      <label htmlFor="pairCode">Código del módulo</label>
      <div>
        <input
          id="pairCode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="abc123-ABCD-EFGH"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
        />
        <button className="small-button" type="submit" disabled={busy || !code.trim()}>
          {busy ? "…" : "Vincular"}
        </button>
      </div>
      {message && <small className="form-message">{message}</small>}
    </form>
  );
}

const noopSubscribe = () => () => {};

function InstallHint() {
  const show = useSyncExternalStore(
    noopSubscribe,
    () => isIos() && !isStandalone(),
    () => false,
  );
  if (!show) return null;
  return (
    <p className="install-hint">
      Para instalar TermaLab en el iPhone: tocá <b>Compartir</b> y después{" "}
      <b>Agregar a inicio</b>. Abrila desde el ícono para recibir avisos.
    </p>
  );
}

/* ------------------------------------------------------------ módulo real */

function DeviceApp({
  pairing,
  screen,
  setScreen,
}: {
  pairing: Pairing;
  screen: Screen;
  setScreen: (s: Screen) => void;
}) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [reachable, setReachable] = useState(true);
  const [presetId, setPresetId] = useState<string>("custom");
  const [draftTarget, setDraftTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [pushState, setPushState] = useState<"off" | "on" | "denied" | "unavailable">("off");
  const announced = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchStatus(pairing);
      setStatus(next);
      setReachable(true);
      if (next.active && next.reached && next.reachedAt && announced.current !== next.reachedAt) {
        announced.current = next.reachedAt;
        alertLocally("TermaLab Cocina", `Llegó a ${next.target} °C.`);
      }
    } catch (e) {
      if ((e as { status?: number }).status === 401 || (e as { status?: number }).status === 404) {
        storePairing(null);
        return;
      }
      setReachable(false);
    }
  }, [pairing]);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, DEVICE_INTERVAL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    void pushEnabled().then((on) => on && setPushState("on"));
    return () => {
      window.clearTimeout(first);
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const target = draftTarget ?? status?.target ?? DEFAULT_PRESET.target;
  const active = status?.active ?? false;
  const reached = active && (status?.reached ?? false);
  const probeMissing = status?.probe === "open";
  const online = reachable && (status?.connected ?? false);
  const startTemp = status?.startTemperature ?? status?.temperature ?? DEFAULT_PRESET.start;
  const elapsed = active && status?.startedAt ? now - Date.parse(status.startedAt) : 0;
  const classification = classifyTemperature(status?.temperature ?? startTemp, target);

  const badge = !reachable
    ? ["Sin internet", "offline"]
    : !status?.connected
      ? ["Módulo apagado", "offline"]
      : probeMissing
        ? ["Revisá la sonda", "warn"]
        : ["Módulo online", "online"];

  const applyTarget = async (value: number) => {
    setDraftTarget(value);
    if (active) {
      try {
        setStatus(await sendSession(pairing, "target", value));
        setDraftTarget(null);
      } catch {
        setReachable(false);
      }
    }
  };

  const selectPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    void applyTarget(preset.target);
  };

  const changeTarget = (difference: number) => {
    setPresetId("custom");
    void applyTarget(clamp(target + difference, 40, 100));
  };

  const toggle = async () => {
    setBusy(true);
    try {
      setStatus(await sendSession(pairing, active ? "stop" : "start", target));
      setDraftTarget(null);
    } catch {
      setReachable(false);
    } finally {
      setBusy(false);
    }
  };

  const activatePush = async () => {
    try {
      const result = await enablePush(pairing);
      setPushState(result === "ok" ? "on" : result);
    } catch {
      setPushState("unavailable");
    }
  };

  return (
    <>
      <Header badge={badge[0]} tone={badge[1] as "online" | "offline" | "warn"} />
      <div className="screen-area">
        {screen === "measurement" ? (
          <section className="measurement-screen" aria-labelledby="screenTitle">
            <div className="screen-intro">
              <p>{status?.deviceName || pairing.name || "Módulo central"}</p>
              <h1 id="screenTitle">Tu comida, en el punto justo.</h1>
            </div>
            <PresetRow presetId={presetId} onSelect={selectPreset} />
            <Gauge
              temperature={status?.temperature ?? null}
              target={target}
              start={startTemp}
              probeMissing={probeMissing}
            />
            <div className="temperature-message" aria-live="polite">
              {reached ? (
                <>
                  <strong>¡Llegó al objetivo!</strong>
                  <span>Podés retirar la preparación.</span>
                </>
              ) : !status?.connected ? (
                <>
                  <strong>Esperando al módulo</strong>
                  <span>Revisá que esté enchufado y con Wi‑Fi.</span>
                </>
              ) : (
                <>
                  <strong>
                    {classification.remaining > 0
                      ? `Faltan ${classification.remaining.toFixed(1)} °C`
                      : "Objetivo alcanzado"}
                  </strong>
                  <span>{active ? "Te avisamos cuando esté lista." : "Elegí el objetivo y empezá."}</span>
                </>
              )}
              {active && (
                <span className="measurement-timer">
                  Tiempo transcurrido · {formatElapsedTime(elapsed)}
                </span>
              )}
            </div>
            <TargetControl target={target} onChange={changeTarget} />
            <button
              className={`primary-button ${active ? "stop" : ""}`}
              type="button"
              onClick={toggle}
              disabled={busy || !reachable}
            >
              {active ? (reached ? "Terminar cocción" : "Detener cocción") : "Empezar cocción"}
            </button>
          </section>
        ) : (
          <section className="account-screen" aria-labelledby="accountTitle">
            <div className="screen-intro">
              <p>Configuración</p>
              <h1 id="accountTitle">Cuenta</h1>
            </div>
            <article className="account-summary">
              <span className="account-avatar">TL</span>
              <div>
                <strong>{status?.deviceName || pairing.name || "Módulo central"}</strong>
                <small>Módulo {pairing.id}</small>
              </div>
            </article>
            <div className="settings-card">
              <div className="setting-row">
                <span className="setting-icon" aria-hidden="true">◉</span>
                <div>
                  <strong>Estado</strong>
                  <small>
                    {status?.measuredAt
                      ? `Última lectura ${new Date(status.measuredAt).toLocaleTimeString("es-AR")}`
                      : "Todavía no envió lecturas"}
                  </small>
                </div>
                <span className={`status-label ${online ? "" : "off"}`}>{online ? "Online" : "Offline"}</span>
              </div>
              <div className="setting-row">
                <span className="setting-icon" aria-hidden="true">♢</span>
                <div>
                  <strong>Avisos en este celular</strong>
                  <small>
                    {pushState === "on"
                      ? "Te avisamos aunque la app esté cerrada"
                      : pushState === "denied"
                        ? "Permiso rechazado en Ajustes"
                        : pushState === "unavailable" || !pushSupported()
                          ? isIos() && !isStandalone()
                            ? "Instalá la app en el inicio primero"
                            : "Este navegador no los permite"
                          : "Al llegar al objetivo"}
                  </small>
                </div>
                <button
                  className="small-button"
                  type="button"
                  onClick={activatePush}
                  disabled={pushState === "on"}
                >
                  {pushState === "on" ? "Activos" : "Activar"}
                </button>
              </div>
              <div className="setting-row">
                <span className="setting-icon" aria-hidden="true">°C</span>
                <div>
                  <strong>Unidad</strong>
                  <small>Grados Celsius</small>
                </div>
                <span className="status-label neutral">°C</span>
              </div>
            </div>
            <InstallHint />
            <button className="link-button" type="button" onClick={() => storePairing(null)}>
              Desvincular este módulo
            </button>
          </section>
        )}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} />
    </>
  );
}

/* ------------------------------------------------------------ demostración */

function DemoApp({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET.id);
  const [target, setTarget] = useState<number>(DEFAULT_PRESET.target);
  const [start, setStart] = useState<number>(DEFAULT_PRESET.start);
  const [temperature, setTemperature] = useState<number>(DEFAULT_PRESET.start);
  const [running, setRunning] = useState(false);
  const [goalReached, setGoalReached] = useState(false);
  const [connected, setConnected] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const startedAt = useRef<number | null>(null);
  const goalAnnounced = useRef(false);

  const classification = useMemo(() => classifyTemperature(temperature, target), [temperature, target]);

  const resetMeasurement = useCallback((initialTemperature: number) => {
    setRunning(false);
    setGoalReached(false);
    setTemperature(initialTemperature);
    setElapsedMilliseconds(0);
    goalAnnounced.current = false;
    startedAt.current = null;
  }, []);

  const announceGoal = useCallback(() => {
    if (goalAnnounced.current) return;
    goalAnnounced.current = true;
    setGoalReached(true);
    setRunning(false);
    alertLocally("TermaLab Cocina", `La preparación llegó a ${target} °C.`);
  }, [target]);

  useEffect(() => {
    if (!running) return;
    const readTemperature = async () => {
      const elapsed = Date.now() - (startedAt.current ?? Date.now());
      setElapsedMilliseconds(elapsed);
      const parameters = new URLSearchParams({
        target: String(target),
        start: String(start),
        elapsed: String(elapsed),
      });
      try {
        const response = await fetch(`/api/devices/demo/latest?${parameters.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("No se pudo leer el módulo.");
        const reading = (await response.json()) as DemoReading;
        setConnected(reading.connected);
        setTemperature(reading.temperature);
        if (reading.temperature >= target - READY_TOLERANCE_C) announceGoal();
      } catch {
        setConnected(false);
      }
    };
    void readTemperature();
    const interval = window.setInterval(readTemperature, DEMO_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [announceGoal, running, start, target]);

  const selectPreset = (id: string) => {
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return;
    resetMeasurement(preset.start);
    setPresetId(preset.id);
    setTarget(preset.target);
    setStart(preset.start);
  };

  const changeTarget = (difference: number) => {
    resetMeasurement(start);
    setPresetId("custom");
    setTarget((currentTarget) => clamp(currentTarget + difference, 40, 100));
  };

  const toggleMeasurement = () => {
    if (running) {
      setRunning(false);
      return;
    }
    startedAt.current = Date.now();
    goalAnnounced.current = false;
    setGoalReached(false);
    setElapsedMilliseconds(0);
    setTemperature(start);
    setConnected(true);
    setRunning(true);
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  };

  return (
    <>
      <Header badge={connected ? "Demo online" : "Sin conexión"} tone={connected ? "online" : "offline"} />
      <div className="screen-area">
        {screen === "measurement" ? (
          <section className="measurement-screen" aria-labelledby="screenTitle">
            <div className="screen-intro">
              <p>TermaLab Cocina</p>
              <h1 id="screenTitle">Tu comida, en el punto justo.</h1>
            </div>
            <PresetRow presetId={presetId} onSelect={selectPreset} />
            <Gauge temperature={temperature} target={target} start={start} />
            <div className="temperature-message" aria-live="polite">
              {goalReached ? (
                <>
                  <strong>¡Llegó al objetivo!</strong>
                  <span>Podés retirar la preparación.</span>
                </>
              ) : (
                <>
                  <strong>
                    {classification.remaining > 0
                      ? `Faltan ${classification.remaining.toFixed(1)} °C`
                      : "Objetivo alcanzado"}
                  </strong>
                  <span>Te avisamos cuando esté lista.</span>
                </>
              )}
              {(running || elapsedMilliseconds > 0) && (
                <span className="measurement-timer">
                  Tiempo transcurrido · {formatElapsedTime(elapsedMilliseconds)}
                </span>
              )}
            </div>
            <TargetControl target={target} onChange={changeTarget} />
            <button
              className={`primary-button ${running ? "stop" : ""}`}
              type="button"
              onClick={toggleMeasurement}
            >
              {running ? "Detener medición" : goalReached ? "Medir de nuevo" : "Iniciar demostración"}
            </button>
          </section>
        ) : (
          <section className="account-screen" aria-labelledby="accountTitle">
            <div className="screen-intro">
              <p>Configuración</p>
              <h1 id="accountTitle">Cuenta</h1>
            </div>
            <article className="account-summary">
              <span className="account-avatar">TL</span>
              <div>
                <strong>Modo demostración</strong>
                <small>Temperaturas simuladas por el servidor</small>
              </div>
            </article>
            <div className="settings-card">
              <div className="setting-row pair-row">
                <span className="setting-icon" aria-hidden="true">◉</span>
                <PairForm />
              </div>
              <div className="setting-row">
                <span className="setting-icon" aria-hidden="true">♢</span>
                <div>
                  <strong>Alertas</strong>
                  <small>{notificationsEnabled ? "Activadas en este celular" : "Aviso al llegar al objetivo"}</small>
                </div>
                <button className="small-button" type="button" onClick={requestNotifications}>
                  {notificationsEnabled ? "Activas" : "Activar"}
                </button>
              </div>
              <div className="setting-row">
                <span className="setting-icon" aria-hidden="true">°C</span>
                <div>
                  <strong>Unidad</strong>
                  <small>Grados Celsius</small>
                </div>
                <span className="status-label neutral">°C</span>
              </div>
            </div>
            <InstallHint />
            <p className="account-note">
              Vinculá tu módulo con el código que te dio el script de alta para ver la sonda real
              desde cualquier lugar.
            </p>
          </section>
        )}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} />
    </>
  );
}

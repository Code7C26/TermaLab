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
  syncPushLang,
} from "@/lib/client/device";
import {
  LANGS,
  LOCALES,
  LangContext,
  MESSAGES,
  storeLang,
  useStoredLang,
  useT,
} from "@/lib/client/i18n";

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
  const lang = useStoredLang();
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

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={lang}>
      <main className="site-shell">
        <section className="phone-shell" aria-label={MESSAGES[lang].appLabel}>
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
    </LangContext.Provider>
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
  const { t } = useT();
  return (
    <nav className="bottom-nav" aria-label={t.navLabel}>
      <button
        className={screen === "measurement" ? "active" : ""}
        type="button"
        onClick={() => setScreen("measurement")}
        aria-current={screen === "measurement" ? "page" : undefined}
      >
        <span aria-hidden="true">°</span>
        {t.navMeasurement}
      </button>
      <button
        className={screen === "account" ? "active" : ""}
        type="button"
        onClick={() => setScreen("account")}
        aria-current={screen === "account" ? "page" : undefined}
      >
        <span aria-hidden="true">○</span>
        {t.navAccount}
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
  const { t } = useT();
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
      aria-label={temperature == null ? t.noReading : t.currentTemperature(temperature.toFixed(1))}
    >
      <span className="gauge-marker" aria-hidden="true" />
      <div className="gauge-center">
        <span className="probe-label">{t.probeLabel}</span>
        <div>
          <strong>{temperature == null ? "--" : temperature.toFixed(1)}</strong>
          <span>°C</span>
        </div>
        {probeMissing ? (
          <p className="high">{t.probeMissing}</p>
        ) : (
          <p className={classification.key}>{t.classification[classification.key]}</p>
        )}
      </div>
    </div>
  );
}

function PresetRow({ presetId, onSelect }: { presetId: string; onSelect: (id: string) => void }) {
  const { t } = useT();
  return (
    <div className="preset-row" aria-label={t.presetsLabel}>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          className={presetId === preset.id ? "active" : ""}
          type="button"
          onClick={() => onSelect(preset.id)}
          aria-pressed={presetId === preset.id}
        >
          <span aria-hidden="true">{preset.emoji}</span>
          {t.presets[preset.id] ?? preset.label}
        </button>
      ))}
    </div>
  );
}

function TargetControl({ target, onChange }: { target: number; onChange: (d: number) => void }) {
  const { t } = useT();
  return (
    <div className="target-control">
      <span>{t.target}</span>
      <div>
        <button type="button" onClick={() => onChange(-1)} aria-label={t.targetDown}>
          −
        </button>
        <strong>{target} °C</strong>
        <button type="button" onClick={() => onChange(1)} aria-label={t.targetUp}>
          +
        </button>
      </div>
    </div>
  );
}

function PairForm() {
  const { t } = useT();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"format" | "wrong" | "server" | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parsePairingCode(code);
    if (!parsed) {
      setMessage("format");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const status = await fetchStatus({ ...parsed, name: "" });
      storePairing({ ...parsed, name: status.deviceName });
    } catch (e) {
      const status = (e as { status?: number }).status;
      setMessage(status === 401 || status === 404 ? "wrong" : "server");
    } finally {
      setBusy(false);
    }
  };

  const messages = { format: t.pairFormat, wrong: t.pairWrong, server: t.serverUnreachable };

  return (
    <form className="pair-form" onSubmit={submit}>
      <label htmlFor="pairCode">{t.pairCode}</label>
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
          {busy ? "…" : t.pairButton}
        </button>
      </div>
      {message && <small className="form-message">{messages[message]}</small>}
    </form>
  );
}

const noopSubscribe = () => () => {};

function InstallHint() {
  const { t } = useT();
  const show = useSyncExternalStore(
    noopSubscribe,
    () => isIos() && !isStandalone(),
    () => false,
  );
  if (!show) return null;
  return (
    <p className="install-hint">
      {t.installHintBefore} <b>{t.installShare}</b> {t.installAnd} <b>{t.installAdd}</b>.{" "}
      {t.installHintAfter}
    </p>
  );
}

function LanguageRow() {
  const { lang, t } = useT();
  return (
    <div className="setting-row">
      <span className="setting-icon" aria-hidden="true">Aa</span>
      <div>
        <strong>{t.language}</strong>
        <small>{t.languageName}</small>
      </div>
      <div className="lang-switch" role="group" aria-label={t.language}>
        {LANGS.map((option) => (
          <button
            key={option}
            className={lang === option ? "active" : ""}
            type="button"
            onClick={() => storeLang(option)}
            aria-pressed={lang === option}
            lang={option}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function UnitRow() {
  const { t } = useT();
  return (
    <div className="setting-row">
      <span className="setting-icon" aria-hidden="true">°C</span>
      <div>
        <strong>{t.unit}</strong>
        <small>{t.celsius}</small>
      </div>
      <span className="status-label neutral">°C</span>
    </div>
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
  const { lang, t } = useT();
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [reachable, setReachable] = useState(true);
  const [presetId, setPresetId] = useState<string>("custom");
  const [draftTarget, setDraftTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [pushState, setPushState] = useState<"off" | "on" | "denied" | "unavailable">("off");
  const announced = useRef<string | null>(null);
  // El aviso local se arma dentro del sondeo; leemos el idioma de una ref para no reiniciarlo.
  const messages = useRef(t);
  useEffect(() => {
    messages.current = t;
  }, [t]);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchStatus(pairing);
      setStatus(next);
      setReachable(true);
      if (next.active && next.reached && next.reachedAt && announced.current !== next.reachedAt) {
        announced.current = next.reachedAt;
        alertLocally("TermaLab Cocina", messages.current.goalNotification(next.target));
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

  // Los avisos push los arma el servidor: le contamos en qué idioma mandarlos.
  useEffect(() => {
    if (pushState === "on") void syncPushLang(pairing, lang).catch(() => {});
  }, [pairing, lang, pushState]);

  const target = draftTarget ?? status?.target ?? DEFAULT_PRESET.target;
  const active = status?.active ?? false;
  const reached = active && (status?.reached ?? false);
  const probeMissing = status?.probe === "open";
  const online = reachable && (status?.connected ?? false);
  const startTemp = status?.startTemperature ?? status?.temperature ?? DEFAULT_PRESET.start;
  const elapsed = active && status?.startedAt ? now - Date.parse(status.startedAt) : 0;
  const classification = classifyTemperature(status?.temperature ?? startTemp, target);
  const moduleName = status?.deviceName || pairing.name || t.defaultModuleName;

  const badge = !reachable
    ? [t.badgeNoInternet, "offline"]
    : !status?.connected
      ? [t.badgeModuleOff, "offline"]
      : probeMissing
        ? [t.badgeCheckProbe, "warn"]
        : [t.badgeModuleOnline, "online"];

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
      const result = await enablePush(pairing, lang);
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
              <p>{moduleName}</p>
              <h1 id="screenTitle">{t.headline}</h1>
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
                  <strong>{t.goalReached}</strong>
                  <span>{t.takeItOut}</span>
                </>
              ) : !status?.connected ? (
                <>
                  <strong>{t.waitingModule}</strong>
                  <span>{t.checkModule}</span>
                </>
              ) : (
                <>
                  <strong>
                    {classification.remaining > 0
                      ? t.remaining(classification.remaining.toFixed(1))
                      : t.targetReached}
                  </strong>
                  <span>{active ? t.weWillNotify : t.chooseTarget}</span>
                </>
              )}
              {active && (
                <span className="measurement-timer">
                  {t.elapsed} · {formatElapsedTime(elapsed)}
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
              {active ? (reached ? t.finishCooking : t.stopCooking) : t.startCooking}
            </button>
          </section>
        ) : (
          <section className="account-screen" aria-labelledby="accountTitle">
            <div className="screen-intro">
              <p>{t.settings}</p>
              <h1 id="accountTitle">{t.account}</h1>
            </div>
            <article className="account-summary">
              <span className="account-avatar">TL</span>
              <div>
                <strong>{moduleName}</strong>
                <small>{t.moduleId(pairing.id)}</small>
              </div>
            </article>
            <div className="settings-card">
              <div className="setting-row">
                <span className="setting-icon" aria-hidden="true">◉</span>
                <div>
                  <strong>{t.status}</strong>
                  <small>
                    {status?.measuredAt
                      ? t.lastReading(new Date(status.measuredAt).toLocaleTimeString(LOCALES[lang]))
                      : t.noReadingsYet}
                  </small>
                </div>
                <span className={`status-label ${online ? "" : "off"}`}>{online ? "Online" : "Offline"}</span>
              </div>
              <div className="setting-row">
                <span className="setting-icon" aria-hidden="true">♢</span>
                <div>
                  <strong>{t.pushTitle}</strong>
                  <small>
                    {pushState === "on"
                      ? t.pushOn
                      : pushState === "denied"
                        ? t.pushDenied
                        : pushState === "unavailable" || !pushSupported()
                          ? isIos() && !isStandalone()
                            ? t.pushInstallFirst
                            : t.pushUnsupported
                          : t.pushOff}
                  </small>
                </div>
                <button
                  className="small-button"
                  type="button"
                  onClick={activatePush}
                  disabled={pushState === "on"}
                >
                  {pushState === "on" ? t.active : t.activate}
                </button>
              </div>
              <LanguageRow />
              <UnitRow />
            </div>
            <InstallHint />
            <button className="link-button" type="button" onClick={() => storePairing(null)}>
              {t.unpair}
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
  const { t } = useT();
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
  const messages = useRef(t);
  useEffect(() => {
    messages.current = t;
  }, [t]);

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
    alertLocally("TermaLab Cocina", messages.current.demoGoalNotification(target));
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
      <Header
        badge={connected ? t.badgeDemoOnline : t.badgeNoConnection}
        tone={connected ? "online" : "offline"}
      />
      <div className="screen-area">
        {screen === "measurement" ? (
          <section className="measurement-screen" aria-labelledby="screenTitle">
            <div className="screen-intro">
              <p>TermaLab Cocina</p>
              <h1 id="screenTitle">{t.headline}</h1>
            </div>
            <PresetRow presetId={presetId} onSelect={selectPreset} />
            <Gauge temperature={temperature} target={target} start={start} />
            <div className="temperature-message" aria-live="polite">
              {goalReached ? (
                <>
                  <strong>{t.goalReached}</strong>
                  <span>{t.takeItOut}</span>
                </>
              ) : (
                <>
                  <strong>
                    {classification.remaining > 0
                      ? t.remaining(classification.remaining.toFixed(1))
                      : t.targetReached}
                  </strong>
                  <span>{t.weWillNotify}</span>
                </>
              )}
              {(running || elapsedMilliseconds > 0) && (
                <span className="measurement-timer">
                  {t.elapsed} · {formatElapsedTime(elapsedMilliseconds)}
                </span>
              )}
            </div>
            <TargetControl target={target} onChange={changeTarget} />
            <button
              className={`primary-button ${running ? "stop" : ""}`}
              type="button"
              onClick={toggleMeasurement}
            >
              {running ? t.stopMeasurement : goalReached ? t.measureAgain : t.startDemo}
            </button>
          </section>
        ) : (
          <section className="account-screen" aria-labelledby="accountTitle">
            <div className="screen-intro">
              <p>{t.settings}</p>
              <h1 id="accountTitle">{t.account}</h1>
            </div>
            <article className="account-summary">
              <span className="account-avatar">TL</span>
              <div>
                <strong>{t.demoMode}</strong>
                <small>{t.demoSimulated}</small>
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
                  <strong>{t.alerts}</strong>
                  <small>{notificationsEnabled ? t.alertsOn : t.alertsOff}</small>
                </div>
                <button className="small-button" type="button" onClick={requestNotifications}>
                  {notificationsEnabled ? t.alertsActive : t.activate}
                </button>
              </div>
              <LanguageRow />
              <UnitRow />
            </div>
            <InstallHint />
            <p className="account-note">{t.demoNote}</p>
          </section>
        )}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} />
    </>
  );
}

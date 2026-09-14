"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PRESETS,
  classifyTemperature,
  clamp,
  formatElapsedTime,
  markerAngleForTemperature,
  progressForTemperature,
} from "@/lib/temperature.js";

type Screen = "measurement" | "account";

type Reading = {
  connected: boolean;
  deviceId: string;
  deviceName: string;
  measuredAt: string;
  source: "demo" | "device";
  target: number;
  temperature: number;
};

const DEFAULT_PRESET = PRESETS[0];
const READING_INTERVAL_MS = 1_200;
const READY_TOLERANCE_C = 0.5;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("measurement");
  const [presetId, setPresetId] = useState(DEFAULT_PRESET.id);
  const [target, setTarget] = useState(DEFAULT_PRESET.target);
  const [start, setStart] = useState(DEFAULT_PRESET.start);
  const [temperature, setTemperature] = useState(DEFAULT_PRESET.start);
  const [running, setRunning] = useState(false);
  const [goalReached, setGoalReached] = useState(false);
  const [connected, setConnected] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  // These refs keep session timing and the one-shot alert stable across renders.
  const startedAt = useRef<number | null>(null);
  const goalAnnounced = useRef(false);

  const classification = useMemo(
    () => classifyTemperature(temperature, target),
    [temperature, target],
  );
  const progress = progressForTemperature(temperature, start, target);
  const markerAngle = markerAngleForTemperature(temperature);

  const resetMeasurement = useCallback((initialTemperature: number) => {
    setRunning(false);
    setGoalReached(false);
    setTemperature(initialTemperature);
    setElapsedMilliseconds(0);
    goalAnnounced.current = false;
    startedAt.current = null;
  }, []);

  const announceGoal = useCallback(() => {
    if (goalAnnounced.current) {
      return;
    }

    goalAnnounced.current = true;
    setGoalReached(true);
    setRunning(false);

    if ("vibrate" in navigator) {
      navigator.vibrate([180, 80, 180]);
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("TermaLab Cocina", {
        body: `La preparación llegó a ${target} °C.`,
      });
    }
  }, [target]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const readTemperature = async () => {
      const elapsed = Date.now() - (startedAt.current ?? Date.now());
      setElapsedMilliseconds(elapsed);
      const parameters = new URLSearchParams({
        target: String(target),
        start: String(start),
        elapsed: String(elapsed),
      });

      try {
        const response = await fetch(
          `/api/devices/demo/latest?${parameters.toString()}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("No se pudo leer el módulo.");
        }

        const reading = (await response.json()) as Reading;
        setConnected(reading.connected);
        setTemperature(reading.temperature);

        if (reading.temperature >= target - READY_TOLERANCE_C) {
          announceGoal();
        }
      } catch {
        setConnected(false);
      }
    };

    void readTemperature();
    const interval = window.setInterval(readTemperature, READING_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [announceGoal, running, start, target]);

  const selectPreset = (id: string) => {
    const preset = PRESETS.find((item) => item.id === id);

    if (!preset) {
      return;
    }

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
    if (!("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  };

  return (
    <main className="site-shell">
      <section className="phone-shell" aria-label="Aplicación TermaLab Cocina">
        <header className="app-header">
          <div className="brand-crop" aria-label="TermaLab">
            <Image
              src="/termalab-logo.png"
              alt="TermaLab"
              width={600}
              height={216}
              priority
            />
          </div>
          <span className={`cloud-badge ${connected ? "online" : "offline"}`}>
            <i aria-hidden="true" />
            {connected ? "Demo online" : "Sin conexión"}
          </span>
        </header>

        <div className="screen-area">
          {screen === "measurement" ? (
            <section className="measurement-screen" aria-labelledby="screenTitle">
              <div className="screen-intro">
                <p>TermaLab Cocina</p>
                <h1 id="screenTitle">Tu comida, en el punto justo.</h1>
              </div>

              <div className="preset-row" aria-label="Tipo de preparación">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className={presetId === preset.id ? "active" : ""}
                    type="button"
                    onClick={() => selectPreset(preset.id)}
                    aria-pressed={presetId === preset.id}
                  >
                    <span aria-hidden="true">{preset.emoji}</span>
                    {preset.label}
                  </button>
                ))}
              </div>

              <div
                className="temperature-gauge"
                style={
                  {
                    "--marker-angle": `${markerAngle}deg`,
                    "--progress": `${progress}%`,
                  } as React.CSSProperties
                }
                aria-label={`Temperatura actual ${temperature.toFixed(1)} grados`}
              >
                <span className="gauge-marker" aria-hidden="true" />
                <div className="gauge-center">
                  <span className="probe-label">SONDA INTERNA</span>
                  <div>
                    <strong>{temperature.toFixed(1)}</strong>
                    <span>°C</span>
                  </div>
                  <p className={classification.key}>{classification.label}</p>
                </div>
              </div>

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

              <div className="target-control">
                <span>Objetivo</span>
                <div>
                  <button
                    type="button"
                    onClick={() => changeTarget(-1)}
                    aria-label="Bajar temperatura objetivo"
                  >
                    −
                  </button>
                  <strong>{target} °C</strong>
                  <button
                    type="button"
                    onClick={() => changeTarget(1)}
                    aria-label="Subir temperatura objetivo"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                className={`primary-button ${running ? "stop" : ""}`}
                type="button"
                onClick={toggleMeasurement}
              >
                {running
                  ? "Detener medición"
                  : goalReached
                    ? "Medir de nuevo"
                    : "Iniciar demostración"}
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
                  <strong>Cuenta de prueba</strong>
                  <small>Sincronización en la nube</small>
                </div>
              </article>

              <div className="settings-card">
                <div className="setting-row">
                  <span className="setting-icon" aria-hidden="true">
                    ◉
                  </span>
                  <div>
                    <strong>Módulo central</strong>
                    <small>Dispositivo de demostración</small>
                  </div>
                  <span className="status-label">Online</span>
                </div>

                <div className="setting-row">
                  <span className="setting-icon" aria-hidden="true">
                    ♢
                  </span>
                  <div>
                    <strong>Alertas</strong>
                    <small>
                      {notificationsEnabled
                        ? "Activadas en este celular"
                        : "Aviso al llegar al objetivo"}
                    </small>
                  </div>
                  <button
                    className="small-button"
                    type="button"
                    onClick={requestNotifications}
                  >
                    {notificationsEnabled ? "Activas" : "Activar"}
                  </button>
                </div>

                <div className="setting-row">
                  <span className="setting-icon" aria-hidden="true">
                    °C
                  </span>
                  <div>
                    <strong>Unidad</strong>
                    <small>Grados Celsius</small>
                  </div>
                  <span className="status-label neutral">°C</span>
                </div>
              </div>

              <p className="account-note">
                En la versión final, tu cuenta asociará el módulo físico y
                guardará las mediciones para verlas desde cualquier lugar.
              </p>
            </section>
          )}
        </div>

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
      </section>
    </main>
  );
}

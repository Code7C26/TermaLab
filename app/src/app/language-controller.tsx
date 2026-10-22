"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Language = "es" | "en";

const STORAGE_KEY = "termalab.language";

const translations: Record<string, string> = {
  "Aplicación TermaLab Cocina": "TermaLab Kitchen app",
  "Navegación principal": "Main navigation",
  "Medición": "Measurement",
  "Cuenta": "Account",
  "Sin lectura de la sonda": "No probe reading",
  "SONDA INTERNA": "INTERNAL PROBE",
  "Sonda desconectada": "Probe disconnected",
  "Tipo de preparación": "Preparation type",
  "Carne": "Meat",
  "Pollo": "Chicken",
  "Pan": "Bread",
  "Está listo": "Ready",
  "Cocinando": "Cooking",
  "Por encima": "Above target",
  "Objetivo": "Target",
  "Bajar temperatura objetivo": "Lower target temperature",
  "Subir temperatura objetivo": "Raise target temperature",
  "Código del módulo": "Module code",
  "Vincular": "Pair",
  "El código tiene la forma abc123-ABCD-EFGH.": "The code must look like abc123-ABCD-EFGH.",
  "Código incorrecto. Revisalo y probá de nuevo.": "Incorrect code. Check it and try again.",
  "No se pudo conectar con el servidor.": "Could not connect to the server.",
  "Para instalar TermaLab en el iPhone: tocá Compartir y después Agregar a inicio. Abrila desde el ícono para recibir avisos.": "To install TermaLab on iPhone, tap Share and then Add to Home Screen. Open it from the icon to receive notifications.",
  "Compartir": "Share",
  "Agregar a inicio": "Add to Home Screen",
  "Sin internet": "No internet",
  "Módulo apagado": "Module offline",
  "Revisá la sonda": "Check the probe",
  "Módulo online": "Module online",
  "Módulo central": "Main module",
  "Tu comida, en el punto justo.": "Your food, cooked just right.",
  "¡Llegó al objetivo!": "Target reached!",
  "Podés retirar la preparación.": "Your food is ready to remove.",
  "Esperando al módulo": "Waiting for the module",
  "Revisá que esté enchufado y con Wi‑Fi.": "Check that it is plugged in and connected to Wi‑Fi.",
  "Objetivo alcanzado": "Target reached",
  "Te avisamos cuando esté lista.": "We'll notify you when it's ready.",
  "Elegí el objetivo y empezá.": "Choose a target and start.",
  "Terminar cocción": "Finish cooking",
  "Detener cocción": "Stop cooking",
  "Empezar cocción": "Start cooking",
  "Configuración": "Settings",
  "Estado": "Status",
  "Todavía no envió lecturas": "No readings received yet",
  "Avisos en este celular": "Notifications on this phone",
  "Te avisamos aunque la app esté cerrada": "We'll notify you even when the app is closed",
  "Permiso rechazado en Ajustes": "Permission denied in Settings",
  "Instalá la app en el inicio primero": "Install the app on your Home Screen first",
  "Este navegador no los permite": "This browser doesn't support notifications",
  "Al llegar al objetivo": "When the target is reached",
  "Activos": "Enabled",
  "Activar": "Enable",
  "Unidad": "Unit",
  "Grados Celsius": "Degrees Celsius",
  "Desvincular este módulo": "Unpair this module",
  "Demo online": "Demo online",
  "Sin conexión": "Offline",
  "TermaLab Cocina": "TermaLab Kitchen",
  "Detener medición": "Stop measurement",
  "Medir de nuevo": "Measure again",
  "Iniciar demostración": "Start demo",
  "Modo demostración": "Demo mode",
  "Temperaturas simuladas por el servidor": "Temperatures simulated by the server",
  "Alertas": "Alerts",
  "Activadas en este celular": "Enabled on this phone",
  "Aviso al llegar al objetivo": "Alert when the target is reached",
  "Activas": "Enabled",
  "Vinculá tu módulo con el código que te dio el script de alta para ver la sonda real desde cualquier lugar.": "Pair your module with the code generated during setup to view the real probe from anywhere.",
  "Idioma": "Language",
  "Español": "Spanish",
  "Inglés": "English",
};

const reverseTranslations = Object.fromEntries(
  Object.entries(translations).map(([spanish, english]) => [english, spanish]),
) as Record<string, string>;

function translateDynamicText(value: string, language: Language) {
  if (language === "en") {
    if (/^Faltan ([\d.,]+) °C$/.test(value)) return value.replace(/^Faltan/, "Remaining");
    if (/^Tiempo transcurrido · /.test(value)) return value.replace(/^Tiempo transcurrido/, "Elapsed time");
    if (/^Última lectura /.test(value)) return value.replace(/^Última lectura/, "Last reading");
    if (/^Módulo /.test(value) && !translations[value]) return value.replace(/^Módulo /, "Module ");
    if (/^Temperatura actual ([\d.,]+) grados$/.test(value)) {
      return value.replace(/^Temperatura actual/, "Current temperature").replace(/ grados$/, " degrees");
    }
  } else {
    if (/^Remaining ([\d.,]+) °C$/.test(value)) return value.replace(/^Remaining/, "Faltan");
    if (/^Elapsed time · /.test(value)) return value.replace(/^Elapsed time/, "Tiempo transcurrido");
    if (/^Last reading /.test(value)) return value.replace(/^Last reading/, "Última lectura");
    if (/^Module /.test(value) && !reverseTranslations[value]) return value.replace(/^Module /, "Módulo ");
    if (/^Current temperature ([\d.,]+) degrees$/.test(value)) {
      return value.replace(/^Current temperature/, "Temperatura actual").replace(/ degrees$/, " grados");
    }
  }
  return value;
}

function translateValue(value: string, language: Language) {
  const normalized = value.trim();
  if (!normalized) return value;
  const dictionary = language === "en" ? translations : reverseTranslations;
  const translated = dictionary[normalized] ?? translateDynamicText(normalized, language);
  if (translated === normalized) return value;
  return value.replace(normalized, translated);
}

function translateDom(language: Language) {
  document.documentElement.lang = language;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.parentElement?.closest("script, style")) {
      node = walker.nextNode();
      continue;
    }
    const current = node.nodeValue ?? "";
    const next = translateValue(current, language);
    if (next !== current) node.nodeValue = next;
    node = walker.nextNode();
  }

  document.querySelectorAll<HTMLElement>("[aria-label], [title], [placeholder]").forEach((element) => {
    for (const attribute of ["aria-label", "title", "placeholder"] as const) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const next = translateValue(current, language);
      if (next !== current) element.setAttribute(attribute, next);
    }
  });
}

function readLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export default function LanguageController() {
  const [language, setLanguage] = useState<Language>("es");
  const [settingsCard, setSettingsCard] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setLanguage(readLanguage());
  }, []);

  useEffect(() => {
    let translating = false;
    const sync = () => {
      const card = document.querySelector<HTMLElement>(".account-screen .settings-card");
      setSettingsCard((current) => (current === card ? current : card));
      if (translating) return;
      translating = true;
      translateDom(language);
      translating = false;
    };

    sync();
    const observer = new MutationObserver(() => queueMicrotask(sync));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const row = useMemo(
    () => (
      <div className="setting-row" data-language-setting="true">
        <span className="setting-icon" aria-hidden="true">文</span>
        <div>
          <strong>{language === "en" ? "Language" : "Idioma"}</strong>
          <small>{language === "en" ? "App language" : "Idioma de la aplicación"}</small>
        </div>
        <select
          aria-label={language === "en" ? "App language" : "Idioma de la aplicación"}
          value={language}
          onChange={(event) => {
            const next = event.target.value as Language;
            setLanguage(next);
            try {
              localStorage.setItem(STORAGE_KEY, next);
            } catch {
              // La app sigue funcionando aunque el navegador bloquee localStorage.
            }
          }}
          style={{
            border: "1px solid #d8d8d8",
            borderRadius: 999,
            background: "white",
            padding: "0.5rem 0.65rem",
            font: "inherit",
            fontWeight: 700,
            color: "inherit",
            maxWidth: "8.5rem",
          }}
        >
          <option value="es">{language === "en" ? "Spanish" : "Español"}</option>
          <option value="en">English</option>
        </select>
      </div>
    ),
    [language],
  );

  return settingsCard ? createPortal(row, settingsCard) : null;
}

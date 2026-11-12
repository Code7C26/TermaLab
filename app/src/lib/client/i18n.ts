// Textos de la web en español e inglés. El idioma elegido vive en localStorage.

import { createContext, useContext, useSyncExternalStore } from "react";

export type Lang = "es" | "en";

export const LANGS: readonly Lang[] = ["es", "en"];

const STORAGE_KEY = "termalab.lang";
const LANG_EVENT = "termalab:lang";

const es = {
  appLabel: "Aplicación TermaLab Cocina",
  navLabel: "Navegación principal",
  navMeasurement: "Medición",
  navAccount: "Cuenta",
  noReading: "Sin lectura de la sonda",
  currentTemperature: (t: string) => `Temperatura actual ${t} grados`,
  probeLabel: "SONDA INTERNA",
  probeMissing: "Sonda desconectada",
  classification: { ready: "Está listo", heating: "Cocinando", high: "Por encima" } as Record<string, string>,
  presetsLabel: "Tipo de preparación",
  presets: { carne: "Carne", pollo: "Pollo", pan: "Pan" } as Record<string, string>,
  target: "Objetivo",
  targetDown: "Bajar temperatura objetivo",
  targetUp: "Subir temperatura objetivo",
  pairFormat: "El código tiene la forma abc123-ABCD-EFGH.",
  pairWrong: "Código incorrecto. Revisalo y probá de nuevo.",
  serverUnreachable: "No se pudo conectar con el servidor.",
  pairCode: "Código del módulo",
  pairButton: "Vincular",
  installHintBefore: "Para instalar TermaLab en el iPhone: tocá",
  installShare: "Compartir",
  installAnd: "y después",
  installAdd: "Agregar a inicio",
  installHintAfter: "Abrila desde el ícono para recibir avisos.",
  goalNotification: (target: number) => `Llegó a ${target} °C.`,
  demoGoalNotification: (target: number) => `La preparación llegó a ${target} °C.`,
  badgeNoInternet: "Sin internet",
  badgeModuleOff: "Módulo apagado",
  badgeCheckProbe: "Revisá la sonda",
  badgeModuleOnline: "Módulo online",
  badgeDemoOnline: "Demo online",
  badgeNoConnection: "Sin conexión",
  defaultModuleName: "Módulo central",
  headline: "Tu comida, en el punto justo.",
  goalReached: "¡Llegó al objetivo!",
  takeItOut: "Podés retirar la preparación.",
  waitingModule: "Esperando al módulo",
  checkModule: "Revisá que esté enchufado y con Wi‑Fi.",
  remaining: (degrees: string) => `Faltan ${degrees} °C`,
  targetReached: "Objetivo alcanzado",
  weWillNotify: "Te avisamos cuando esté lista.",
  chooseTarget: "Elegí el objetivo y empezá.",
  elapsed: "Tiempo transcurrido",
  finishCooking: "Terminar cocción",
  stopCooking: "Detener cocción",
  startCooking: "Empezar cocción",
  stopMeasurement: "Detener medición",
  measureAgain: "Medir de nuevo",
  startDemo: "Iniciar demostración",
  settings: "Configuración",
  account: "Cuenta",
  moduleId: (id: string) => `Módulo ${id}`,
  status: "Estado",
  lastReading: (time: string) => `Última lectura ${time}`,
  noReadingsYet: "Todavía no envió lecturas",
  pushTitle: "Avisos en este celular",
  pushOn: "Te avisamos aunque la app esté cerrada",
  pushDenied: "Permiso rechazado en Ajustes",
  pushInstallFirst: "Instalá la app en el inicio primero",
  pushUnsupported: "Este navegador no los permite",
  pushOff: "Al llegar al objetivo",
  active: "Activos",
  activate: "Activar",
  unit: "Unidad",
  celsius: "Grados Celsius",
  language: "Idioma",
  languageName: "Español",
  unpair: "Desvincular este módulo",
  demoMode: "Modo demostración",
  demoSimulated: "Temperaturas simuladas por el servidor",
  alerts: "Alertas",
  alertsOn: "Activadas en este celular",
  alertsOff: "Aviso al llegar al objetivo",
  alertsActive: "Activas",
  demoNote:
    "Vinculá tu módulo con el código que te dio el script de alta para ver la sonda real desde cualquier lugar.",
};

export type Messages = typeof es;

const en: Messages = {
  appLabel: "TermaLab Kitchen app",
  navLabel: "Main navigation",
  navMeasurement: "Measure",
  navAccount: "Account",
  noReading: "No probe reading",
  currentTemperature: (t) => `Current temperature ${t} degrees`,
  probeLabel: "INTERNAL PROBE",
  probeMissing: "Probe disconnected",
  classification: { ready: "It's ready", heating: "Cooking", high: "Above target" },
  presetsLabel: "Type of food",
  presets: { carne: "Beef", pollo: "Chicken", pan: "Bread" },
  target: "Target",
  targetDown: "Lower target temperature",
  targetUp: "Raise target temperature",
  pairFormat: "The code looks like abc123-ABCD-EFGH.",
  pairWrong: "Wrong code. Check it and try again.",
  serverUnreachable: "Couldn't reach the server.",
  pairCode: "Module code",
  pairButton: "Pair",
  installHintBefore: "To install TermaLab on your iPhone: tap",
  installShare: "Share",
  installAnd: "and then",
  installAdd: "Add to Home Screen",
  installHintAfter: "Open it from the icon to get alerts.",
  goalNotification: (target) => `Reached ${target} °C.`,
  demoGoalNotification: (target) => `Your food reached ${target} °C.`,
  badgeNoInternet: "No internet",
  badgeModuleOff: "Module off",
  badgeCheckProbe: "Check the probe",
  badgeModuleOnline: "Module online",
  badgeDemoOnline: "Demo online",
  badgeNoConnection: "No connection",
  defaultModuleName: "Main module",
  headline: "Your food, cooked just right.",
  goalReached: "Target reached!",
  takeItOut: "You can take it out now.",
  waitingModule: "Waiting for the module",
  checkModule: "Make sure it's plugged in and on Wi‑Fi.",
  remaining: (degrees) => `${degrees} °C to go`,
  targetReached: "Target reached",
  weWillNotify: "We'll let you know when it's ready.",
  chooseTarget: "Pick a target and start.",
  elapsed: "Elapsed time",
  finishCooking: "Finish cooking",
  stopCooking: "Stop cooking",
  startCooking: "Start cooking",
  stopMeasurement: "Stop measuring",
  measureAgain: "Measure again",
  startDemo: "Start demo",
  settings: "Settings",
  account: "Account",
  moduleId: (id) => `Module ${id}`,
  status: "Status",
  lastReading: (time) => `Last reading ${time}`,
  noReadingsYet: "No readings sent yet",
  pushTitle: "Alerts on this phone",
  pushOn: "We'll alert you even if the app is closed",
  pushDenied: "Permission denied in Settings",
  pushInstallFirst: "Add the app to your Home Screen first",
  pushUnsupported: "This browser doesn't support them",
  pushOff: "When the target is reached",
  active: "On",
  activate: "Turn on",
  unit: "Unit",
  celsius: "Degrees Celsius",
  language: "Language",
  languageName: "English",
  unpair: "Unpair this module",
  demoMode: "Demo mode",
  demoSimulated: "Temperatures simulated by the server",
  alerts: "Alerts",
  alertsOn: "On for this phone",
  alertsOff: "Alert when the target is reached",
  alertsActive: "On",
  demoNote:
    "Pair your module with the code the setup script gave you to see the real probe from anywhere.",
};

export const MESSAGES: Record<Lang, Messages> = { es, en };

export const LOCALES: Record<Lang, string> = { es: "es-AR", en: "en-US" };

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANG_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANG_EVENT, callback);
  };
}

function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function useStoredLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => "es");
}

export function storeLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* almacenamiento no disponible: el idioma vuelve a español al recargar */
  }
  window.dispatchEvent(new Event(LANG_EVENT));
}

export const LangContext = createContext<Lang>("es");

export function useT() {
  const lang = useContext(LangContext);
  return { lang, t: MESSAGES[lang] };
}

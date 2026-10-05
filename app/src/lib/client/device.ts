// Cliente de la API de TermaLab para la web: vinculación, estado y avisos push.

export type Pairing = { id: string; key: string; name: string };

export type DeviceStatus = {
  deviceId: string;
  deviceName: string;
  temperature: number | null;
  probe: "ok" | "open" | "unknown";
  connected: boolean;
  measuredAt: string | null;
  target: number;
  active: boolean;
  startedAt: string | null;
  startTemperature: number | null;
  reached: boolean;
  reachedAt: string | null;
};

const STORAGE_KEY = "termalab.pairing";

export function loadPairing(): Pairing | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Pairing) : null;
  } catch {
    return null;
  }
}

export function savePairing(pairing: Pairing | null) {
  try {
    if (pairing) localStorage.setItem(STORAGE_KEY, JSON.stringify(pairing));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* almacenamiento no disponible: la vinculación dura la sesión */
  }
}

/** "pmcnqj-4JJS-RYSH" -> { id: "pmcnqj", key: "4JJSRYSH" } */
export function parsePairingCode(code: string): { id: string; key: string } | null {
  const clean = code.trim();
  const dash = clean.indexOf("-");
  if (dash < 4) return null;
  const id = clean.slice(0, dash).toLowerCase();
  const key = clean.slice(dash + 1).replace(/[^0-9a-z]/gi, "").toUpperCase();
  if (!/^[a-z0-9]{4,16}$/.test(id) || key.length < 6) return null;
  return { id, key };
}

async function request<T>(pairing: Pairing, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/devices/${pairing.id}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-App-Key": pairing.key, ...init.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error((data as { error?: string }).error ?? "Error de conexión.");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return data as T;
}

export const fetchStatus = (p: Pairing) => request<DeviceStatus>(p, "");

export const sendSession = (p: Pairing, action: "start" | "stop" | "target", target?: number) =>
  request<DeviceStatus>(p, "/session", {
    method: "POST",
    body: JSON.stringify({ action, target }),
  });

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function base64UrlToBytes(text: string) {
  const s = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Pide permiso, suscribe este celular y lo registra en el servidor. */
export async function enablePush(pairing: Pairing): Promise<"ok" | "denied" | "unavailable"> {
  if (!pushSupported()) return "unavailable";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = (await registerServiceWorker()) && (await navigator.serviceWorker.ready);
  if (!registration) return "unavailable";
  const { publicKey } = (await (await fetch("/api/v1/push/key")).json()) as { publicKey: string | null };
  if (!publicKey) return "unavailable";
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    }));
  await request(pairing, "/push", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
  return "ok";
}

export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration();
  return Boolean(await registration?.pushManager.getSubscription());
}

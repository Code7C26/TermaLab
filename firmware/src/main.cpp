// TermaLab Cocina - firmware del módulo central
//
// Lee la termocupla K con el MAX6675, envía la temperatura al servidor por
// HTTPS y hace sonar el buzzer cuando la comida llega al objetivo.
//
// Conexiones (ver firmware/README.md):
//   MAX6675  SO  -> GPIO19   CS -> GPIO5   SCK -> GPIO18   VCC -> 3V3   GND -> GND
//   Buzzer activo (+)        -> GPIO25 (con transistor si es de 5 V)
//   LED de estado (+)        -> GPIO26 con resistencia de 220 ohm
//   Pulsador                 -> GPIO27 y GND (usa el pull-up interno)
//
// Pulsador:  toque corto = silenciar la alarma
//            mantener 5 s = abrir el portal de configuración (red "TermaLab-XXXX")

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>

// ------------------------------------------------------------------ pines
constexpr int PIN_MAX_SO = 19;
constexpr int PIN_MAX_CS = 5;
constexpr int PIN_MAX_SCK = 18;
constexpr int PIN_BUZZER = 25;
constexpr int PIN_LED = 26;
constexpr int PIN_BUTTON = 27;

// --------------------------------------------------------------- ajustes
constexpr char DEFAULT_SERVER[] = "https://termalab.TU-CUENTA.workers.dev";
constexpr char PORTAL_PASSWORD[] = "termalab";   // mínimo 8 caracteres
constexpr float READY_TOLERANCE_C = 0.5f;
constexpr uint32_t READ_EVERY_MS = 1000;         // el MAX6675 necesita >= 220 ms
constexpr uint32_t LONG_PRESS_MS = 5000;
constexpr uint32_t HTTP_TIMEOUT_MS = 6000;

// ---------------------------------------------------------------- estado
Preferences prefs;
String serverUrl, deviceId, deviceKey;

float temperature = NAN;      // última lectura válida
bool probeOpen = true;

bool sessionActive = false;   // lo que dijo el servidor la última vez
float target = 63.0f;
bool serverAlarm = false;
uint32_t sendEveryMs = 10000;

bool lastPostOk = false;
bool silenced = false;        // el usuario apagó la alarma con el pulsador
bool alarmWasOn = false;

uint32_t lastReadAt = 0, lastSendAt = 0;

// ============================================================ MAX6675
// Lectura de 16 bits por SPI "a mano": D15..D3 = temperatura * 4, D2 = sonda abierta.
bool readThermocouple(float &celsius, bool &open) {
  digitalWrite(PIN_MAX_CS, LOW);
  delayMicroseconds(10);
  uint16_t raw = 0;
  for (int i = 15; i >= 0; i--) {
    digitalWrite(PIN_MAX_SCK, HIGH);
    delayMicroseconds(10);
    if (digitalRead(PIN_MAX_SO)) raw |= (1u << i);
    digitalWrite(PIN_MAX_SCK, LOW);
    delayMicroseconds(10);
  }
  digitalWrite(PIN_MAX_CS, HIGH);

  if (raw == 0xFFFF || raw == 0x0000) {  // módulo desconectado o sin alimentación
    open = true;
    return false;
  }
  open = raw & 0x0004;
  if (open) return false;
  celsius = (raw >> 3) * 0.25f;
  return true;
}

// ======================================================= configuración
void loadConfig() {
  prefs.begin("termalab", true);
  serverUrl = prefs.getString("server", DEFAULT_SERVER);
  deviceId = prefs.getString("id", "");
  deviceKey = prefs.getString("key", "");
  prefs.end();
  while (serverUrl.endsWith("/")) serverUrl.remove(serverUrl.length() - 1);
}

void saveConfig(const String &server, const String &id, const String &key) {
  prefs.begin("termalab", false);
  if (server.length()) prefs.putString("server", server);
  if (id.length()) prefs.putString("id", id);
  if (key.length()) prefs.putString("key", key);
  prefs.end();
  loadConfig();
}

String portalName() {
  uint64_t mac = ESP.getEfuseMac();
  char name[20];
  snprintf(name, sizeof(name), "TermaLab-%04X", (uint16_t)(mac >> 32));
  return String(name);
}

// Abre el portal (o se conecta a la red guardada) y guarda servidor, ID y clave.
void connectWifi(bool forcePortal) {
  WiFiManager wm;
  wm.setTitle("TermaLab Cocina");
  wm.setConfigPortalTimeout(300);
  wm.setConnectTimeout(20);

  WiFiManagerParameter pServer("server", "Servidor (https://...)", serverUrl.c_str(), 120);
  WiFiManagerParameter pId("id", "ID del módulo", deviceId.c_str(), 16);
  WiFiManagerParameter pKey("key", "Clave del módulo", deviceKey.c_str(), 40);
  wm.addParameter(&pServer);
  wm.addParameter(&pId);
  wm.addParameter(&pKey);

  digitalWrite(PIN_LED, HIGH);
  bool ok;
  String ap = portalName();
  if (forcePortal) {
    Serial.printf("Portal abierto: conectate a la red %s (clave %s)\n", ap.c_str(), PORTAL_PASSWORD);
    ok = wm.startConfigPortal(ap.c_str(), PORTAL_PASSWORD);
  } else {
    ok = wm.autoConnect(ap.c_str(), PORTAL_PASSWORD);
  }

  saveConfig(String(pServer.getValue()), String(pId.getValue()), String(pKey.getValue()));
  Serial.printf("Wi-Fi %s | servidor %s | módulo %s\n", ok ? "conectado" : "sin conexión",
                serverUrl.c_str(), deviceId.c_str());
  WiFi.setAutoReconnect(true);
}

// ================================================================ envío
void sendReading() {
  if (WiFi.status() != WL_CONNECTED || deviceId.isEmpty() || deviceKey.isEmpty()) {
    lastPostOk = false;
    return;
  }

  WiFiClientSecure client;
  // Prototipo: no valida el certificado del servidor. Para producción, cargar
  // el certificado raíz con client.setCACert(...).
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  String url = serverUrl + "/api/v1/devices/" + deviceId + "/readings";
  if (!http.begin(client, url)) {
    lastPostOk = false;
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", deviceKey);

  JsonDocument body;
  if (probeOpen || isnan(temperature)) {
    body["probe"] = "open";
  } else {
    body["probe"] = "ok";
    body["temperature"] = temperature;
  }
  body["uptime"] = millis() / 1000;
  String payload;
  serializeJson(body, payload);

  int code = http.POST(payload);
  if (code == 200) {
    JsonDocument reply;
    if (!deserializeJson(reply, http.getString())) {
      bool wasActive = sessionActive;
      sessionActive = reply["active"] | false;
      target = reply["target"] | target;
      serverAlarm = reply["alarm"] | false;
      sendEveryMs = (uint32_t)(reply["interval"] | 10) * 1000;
      if (sessionActive && !wasActive) silenced = false;  // nueva cocción
    }
    lastPostOk = true;
  } else {
    Serial.printf("Servidor respondió %d: %s\n", code, http.getString().c_str());
    lastPostOk = false;
  }
  http.end();
}

// ============================================================ salidas
bool alarmOn() {
  // La alarma funciona aunque se corte el Wi-Fi: usa el último objetivo conocido.
  bool localReached = sessionActive && !probeOpen && !isnan(temperature) &&
                      temperature >= target - READY_TOLERANCE_C;
  return (serverAlarm || localReached) && !silenced;
}

void updateOutputs(uint32_t now) {
  bool alarm = alarmOn();
  if (alarm && !alarmWasOn) Serial.println("¡Objetivo alcanzado!");
  alarmWasOn = alarm;

  if (alarm) {
    // tres pitidos cortos y una pausa
    uint32_t t = now % 1600;
    bool beep = (t < 150) || (t >= 300 && t < 450) || (t >= 600 && t < 750);
    digitalWrite(PIN_BUZZER, beep);
    digitalWrite(PIN_LED, beep);
    return;
  }
  digitalWrite(PIN_BUZZER, LOW);

  bool led;
  if (WiFi.status() != WL_CONNECTED) {
    led = (now / 250) % 2;                         // parpadeo rápido: sin Wi-Fi
  } else if (!lastPostOk) {
    uint32_t t = now % 1200;
    led = t < 100 || (t >= 200 && t < 300);       // doble parpadeo: servidor no responde
  } else if (probeOpen) {
    led = (now / 700) % 2;                         // parpadeo lento: sonda desconectada
  } else {
    led = true;                                    // fijo: todo bien
  }
  digitalWrite(PIN_LED, led);
}

void handleButton(uint32_t now) {
  static bool wasDown = false;
  static uint32_t downAt = 0;
  static bool longDone = false;
  bool down = digitalRead(PIN_BUTTON) == LOW;

  if (down && !wasDown) {
    downAt = now;
    longDone = false;
  }
  if (down && !longDone && now - downAt >= LONG_PRESS_MS) {
    longDone = true;
    digitalWrite(PIN_BUZZER, HIGH);
    delay(80);
    digitalWrite(PIN_BUZZER, LOW);
    connectWifi(true);
  }
  if (!down && wasDown && !longDone && now - downAt > 40) {
    if (alarmOn()) {
      silenced = true;
      Serial.println("Alarma silenciada");
    }
  }
  wasDown = down;
}

// ============================================================== main
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\nTermaLab Cocina - módulo central");

  pinMode(PIN_MAX_CS, OUTPUT);
  pinMode(PIN_MAX_SCK, OUTPUT);
  pinMode(PIN_MAX_SO, INPUT);
  digitalWrite(PIN_MAX_CS, HIGH);
  digitalWrite(PIN_MAX_SCK, LOW);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);

  // pitido de encendido
  digitalWrite(PIN_BUZZER, HIGH);
  delay(60);
  digitalWrite(PIN_BUZZER, LOW);

  loadConfig();
  bool needsSetup = deviceId.isEmpty() || deviceKey.isEmpty() ||
                    digitalRead(PIN_BUTTON) == LOW;  // mantener el botón al enchufar
  connectWifi(needsSetup);
}

void loop() {
  uint32_t now = millis();
  handleButton(now);

  if (now - lastReadAt >= READ_EVERY_MS) {
    lastReadAt = now;
    float c;
    bool open;
    if (readThermocouple(c, open)) {
      temperature = c;
      probeOpen = false;
    } else {
      probeOpen = open;
    }
    Serial.printf("Sonda: %s %.2f °C | objetivo %.1f | cocción %s\n", probeOpen ? "ABIERTA" : "ok",
                  temperature, target, sessionActive ? "sí" : "no");
  }

  if (now - lastSendAt >= sendEveryMs) {
    lastSendAt = now;
    sendReading();
  }

  updateOutputs(millis());
  delay(10);
}

-- TermaLab Cocina: esquema inicial (Cloudflare D1 / SQLite)

-- Un registro por módulo físico. Las claves se guardan como hash SHA-256.
CREATE TABLE devices (
  id               TEXT PRIMARY KEY,          -- ej. "k7q2mx"
  name             TEXT NOT NULL DEFAULT 'Módulo central',
  device_key_hash  TEXT NOT NULL,             -- clave que usa la ESP32
  app_key_hash     TEXT NOT NULL,             -- código de vinculación de la app
  created_at       INTEGER NOT NULL,          -- ms epoch

  -- última lectura recibida
  last_temp        REAL,
  last_probe       TEXT,                      -- 'ok' | 'open'
  last_seen        INTEGER,                   -- ms epoch
  last_history_at  INTEGER NOT NULL DEFAULT 0,

  -- cocción en curso
  target           REAL NOT NULL DEFAULT 63,
  active           INTEGER NOT NULL DEFAULT 0,
  started_at       INTEGER,
  start_temp       REAL,
  reached_at       INTEGER                    -- cuándo llegó al objetivo
);

-- Historial (una muestra cada ~15 s, se conservan 3 días).
CREATE TABLE readings (
  device_id    TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  measured_at  INTEGER NOT NULL,
  temperature  REAL,
  probe        TEXT NOT NULL
);
CREATE INDEX readings_device_time ON readings (device_id, measured_at);

-- Suscripciones de notificaciones push (web instalable).
CREATE TABLE push_subscriptions (
  endpoint    TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX push_device ON push_subscriptions (device_id);

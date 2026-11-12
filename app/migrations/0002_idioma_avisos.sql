-- Idioma de los avisos push de cada celular ("es" o "en").
ALTER TABLE push_subscriptions ADD COLUMN lang TEXT NOT NULL DEFAULT 'es';

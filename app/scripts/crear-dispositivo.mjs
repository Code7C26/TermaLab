#!/usr/bin/env node
// Da de alta un módulo TermaLab en la base D1.
//
//   node scripts/crear-dispositivo.mjs "Módulo de Oreste"
//
// Imprime:
//   - ID y clave del módulo  -> se cargan en la ESP32 (portal de configuración)
//   - Código de vinculación  -> se escribe en la app (web o iPhone)
// y el comando de wrangler que guarda el módulo en la base (solo hashes).

import { createHash, randomInt } from "node:crypto";

const ALPHA_ID = "abcdefghjkmnpqrstuvwxyz23456789";
const ALPHA_CODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L
const pick = (alpha, n) => Array.from({ length: n }, () => alpha[randomInt(alpha.length)]).join("");
const sha = (s) => createHash("sha256").update(s).digest("hex");

const name = (process.argv[2] || "Módulo central").replace(/'/g, "''");
const id = pick(ALPHA_ID, 6);
const deviceKey = pick(ALPHA_ID + ALPHA_CODE, 24);
const code = pick(ALPHA_CODE, 8);
const sql =
  "INSERT INTO devices (id, name, device_key_hash, app_key_hash, created_at) VALUES " +
  `('${id}', '${name}', '${sha(deviceKey)}', '${sha(code)}', ${Date.now()});`;

console.log(`
Módulo creado (todavía no está guardado en la base)
──────────────────────────────────────────────────
  ID del módulo ........ ${id}
  Clave del módulo ..... ${deviceKey}
  Código para la app ... ${id}-${code.slice(0, 4)}-${code.slice(4)}

Guardalo en Cloudflare con:

  pnpm wrangler d1 execute termalab --remote --config wrangler.jsonc --command "${sql}"

(para probar en tu compu con pnpm dev, cambiá --remote por --local)

Anotá la clave ahora: en la base solo queda el hash y no se puede recuperar.
`);

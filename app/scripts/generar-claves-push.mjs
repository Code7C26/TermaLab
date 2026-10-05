#!/usr/bin/env node
// Genera las claves VAPID para las notificaciones push de la web instalable.
//   node scripts/generar-claves-push.mjs
import { generateVapidKeys } from "../src/lib/server/webpush.js";

const { publicKey, privateJwk } = await generateVapidKeys();
console.log(`
1) Pegá la clave pública en wrangler.jsonc -> vars.VAPID_PUBLIC_KEY:

   ${publicKey}

2) Guardá la privada como secreto (pegala cuando la pida):

   pnpm wrangler secret put VAPID_PRIVATE_JWK

   ${privateJwk}

   Para probar en local, creá app/.dev.vars con:
   VAPID_PRIVATE_JWK='${privateJwk}'
`);

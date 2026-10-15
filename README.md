# TermaLab Cocina

TermaLab Cocina es un termómetro conectado para horno. Una sonda permanece en el alimento durante la cocción, el módulo central queda fuera del horno y la aplicación permite consultar la temperatura y recibir alertas desde cualquier lugar.

## Producto

El sistema se divide en cuatro partes:

1. **Sonda y cable:** termocupla tipo K con punta de acero inoxidable y cable mallado, conectada con terminales de horquilla.
2. **Módulo central:** ESP32 con Wi‑Fi, lector MAX6675, buzzer, LED y pulsador, en una carcasa impresa que queda fuera del horno.
3. **Servidor:** Cloudflare Workers + base D1. Recibe las lecturas del módulo, guarda el historial y manda los avisos.
4. **Apps:** web instalable (también en iPhone, con avisos push) y app nativa para iPhone en SwiftUI.

```text
Sonda en el alimento
        │
        ▼
Módulo ESP32 fuera del horno ── buzzer local al llegar al objetivo
        │ HTTPS (cada 3 s durante la cocción)
        ▼
Servidor TermaLab (Cloudflare + D1)
        │                    │
        ▼                    ▼
Web instalable          App iPhone (SwiftUI)
(avisos push)
```

El celular nunca se conecta a la dirección local del módulo: todo pasa por el servidor, así se puede mirar desde cualquier lugar.

## Estado actual

Disponible:

- Firmware del ESP32: lectura del MAX6675, portal de configuración Wi‑Fi, envío HTTPS, alarma local con buzzer y LED de estado (`firmware/`).
- API con lecturas reales, historial de 3 días, sesión de cocción con objetivo y alarma (`/api/v1`).
- Alta de módulos con clave propia para la ESP32 y código de vinculación para las apps (en la base solo se guardan hashes).
- Notificaciones push web (VAPID) cuando la comida llega al objetivo, también con la app cerrada.
- Web instalable (PWA) con ícono, pantalla completa, vinculación de módulo y modo demostración.
- App nativa para iPhone con medidor, objetivos, cronómetro, gráfico de la última hora y avisos (`ios/`).
- Módulo ESP32 funcionando con la sonda: manda lecturas reales al servidor.
- Carcasa v0.4 para ESP32 + MAX6675, impresa y probada; la tapa tiene un reborde que une el labio con las paredes (`design/modelos 3d/`).
- 14 pruebas automáticas (lógica de temperatura, API sobre SQLite y cifrado push).

Pendiente:

- Ajustes finales de la carcasa a partir de la primera impresión.
- Validar precisión con un termómetro de referencia (hielo, agua hirviendo, cocción real).
- Validar la sonda y el cable para uso continuo dentro del horno.
- Avisos con la app nativa cerrada (requiere Apple Developer Program para APNs).

> La carcasa impresa debe quedar alejada de las superficies calientes y se considera un prototipo.

## Puesta en marcha

Requisitos: Node.js 22.13 o superior, pnpm 11 y una cuenta gratuita de Cloudflare.

### 1. Probar en la compu

```bash
cd app
pnpm install
pnpm db:local                 # crea las tablas en la base local
pnpm dispositivo "Mi módulo"  # copiá el comando que imprime y cambiá --remote por --local
pnpm dev
```

Abrí la dirección que muestra la terminal. Sin vincular funciona en modo demostración; en **Cuenta** pegá el código del módulo para ver la sonda real.

### 2. Publicar en Cloudflare

```bash
cd app
pnpm wrangler login
pnpm wrangler d1 create termalab   # copiá el database_id a wrangler.jsonc
pnpm db:remoto                     # crea las tablas en la nube
pnpm claves-push                   # seguí los 2 pasos que imprime
pnpm deploy
```

`pnpm deploy` imprime la dirección pública, por ejemplo `https://termalab.tu-cuenta.workers.dev`. Esa dirección se carga en el módulo y en la app de iPhone.

### 3. Dar de alta el módulo

```bash
pnpm dispositivo "Módulo de la cocina"
```

Ejecutá el comando `wrangler d1 execute ... --remote` que imprime. Anotá:

- **ID y clave del módulo** → en el portal de configuración de la ESP32.
- **Código para la app** → en la pestaña Cuenta de la web o del iPhone.

### 4. Cargar el firmware

Ver [`firmware/README.md`](firmware/README.md): conexiones, cómo subir el programa con PlatformIO y la primera configuración.

### 5. Instalar en el iPhone

- **Web:** abrí la dirección pública en Safari → **Compartir → Agregar a inicio**. Abrila desde el ícono, vinculá el módulo y tocá **Activar** en Avisos.
- **Nativa:** ver [`ios/README.md`](ios/README.md).

### Pruebas

```bash
pnpm test        # lógica de temperatura + API + cifrado push
pnpm build
pnpm test:rendered
```

## API

| Método | Ruta | Quién | Para qué |
|---|---|---|---|
| POST | `/api/v1/devices/:id/readings` | módulo (`X-Device-Key`) | enviar temperatura; responde objetivo, alarma e intervalo |
| GET | `/api/v1/devices/:id` | app (`X-App-Key`) | estado actual |
| GET | `/api/v1/devices/:id/history?minutes=60` | app | historial |
| POST | `/api/v1/devices/:id/session` | app | `{"action":"start"\|"stop"\|"target","target":63}` |
| POST / DELETE | `/api/v1/devices/:id/push` | app | suscribir o borrar avisos push |
| GET | `/api/v1/push/key` | todos | clave pública VAPID |
| GET | `/api/devices/demo/latest` | todos | lectura simulada (demo) |

## Estructura principal

```text
├── app/        Web + servidor (Next.js 16, Vinext, Cloudflare Workers, D1)
│   ├── migrations/   esquema de la base
│   ├── scripts/      alta de módulos y claves push
│   └── src/          interfaz, API (lib/server), cliente (lib/client), pruebas
├── firmware/   Programa del ESP32 (PlatformIO)
├── ios/        App nativa para iPhone (SwiftUI)
├── assets/     Imágenes, íconos, manifest y service worker
├── design/     Prototipos y modelos 3D de la carcasa
├── docs/       Documentación, análisis y presentaciones
└── README.md
```

## Equipo

- Oreste Berta: Scrum Master, planificación y documentación.
- Julián Ledesma: desarrollo e integración técnica.

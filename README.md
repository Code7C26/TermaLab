# TermaLab Cocina

TermaLab Cocina es un termómetro conectado para horno. Una sonda permanece en el alimento durante la cocción, el módulo central queda fuera del horno y la aplicación permite consultar la temperatura y recibir alertas desde cualquier lugar.

## Producto

El sistema se divide en tres partes:

1. **Sonda y cable:** acero inoxidable apto para alimentos y cable especificado para uso continuo dentro del horno.
2. **Módulo central:** ESP32 con Wi‑Fi, lector de sonda, buzzer y LED, siempre ubicado fuera del horno.
3. **Aplicación web:** interfaz alojada en Internet, con medición, objetivo y alertas. El celular nunca consulta una dirección de red local.

```text
Sonda en el alimento
        │
        ▼
Módulo ESP32 fuera del horno
        │ HTTPS
        ▼
Servidor TermaLab
        │
        ▼
App web desde cualquier lugar
```

## Estado actual

Disponible:

- Aplicación móvil minimalista con dos pestañas: Medición y Cuenta.
- Medidor circular con escala de frío azul a caliente rojo.
- Objetivos rápidos para carne, pollo y pan.
- Temperatura personalizada.
- Cronómetro visible durante cada medición.
- Simulación enviada por una ruta del servidor, sin conexión LAN.
- Base preparada para alojarse en Internet y asociar un dominio propio.
- Pruebas unitarias de la lógica de temperatura.

Pendiente:

- Comprar una sonda apta para alimentos y uso continuo a 250–300 °C.
- Elegir y probar el lector electrónico compatible con esa sonda.
- Crear el firmware del ESP32.
- Crear autenticación de dispositivo y almacenamiento de lecturas reales.
- Implementar notificaciones push en segundo plano.
- Validar precisión y seguridad con cocciones reales.

> La DS18B20 genérica y su cable habitual no deben colocarse dentro del horno. La carcasa impresa en PLA debe permanecer alejada de las superficies calientes y se considera un prototipo.

## Aplicación

La versión actual utiliza un dispositivo de demostración servido desde:

```text
GET /api/devices/demo/latest
```

Cuando exista el módulo completo, el ESP32 enviará las lecturas al servidor mediante HTTPS y un identificador seguro. La aplicación consultará la última lectura almacenada, nunca la dirección local del ESP32.

## Cómo usar el proyecto

Requisitos:

- Node.js 22.13 o superior.
- pnpm 11.

1. Clonar el repositorio y entrar en la carpeta:

```bash
git clone https://github.com/Code7C26/TermaLab.git
cd TermaLab/app
```

2. Instalar las dependencias:

```bash
pnpm install
```

3. Iniciar la aplicación en modo desarrollo:

```bash
pnpm dev
```

4. Abrir en el navegador la dirección local indicada por la terminal, elegir
   una preparación y presionar **Iniciar demostración**. La temperatura y el
   cronómetro avanzarán hasta alcanzar el objetivo configurado.

Pruebas y compilación de producción:

```bash
pnpm test
pnpm build
pnpm test:rendered
```

## Estado técnico actual

- Rama estable: `master`.
- Interfaz: Next.js 16 y React 19.
- Compilación: Vinext y Vite para Cloudflare Workers.
- Fuente de datos actual: endpoint remoto de demostración
  `GET /api/devices/demo/latest`.
- Validación automática: cinco pruebas de lógica y dos pruebas sobre la
  aplicación compilada.
- Hardware real: pendiente de integrar el ESP32, la sonda y el envío seguro de
  lecturas.
- Persistencia y autenticación: pendientes; la versión actual no guarda datos
  reales de usuarios ni dispositivos.

## Estructura principal

```text
├── app/      Código, configuraciones y dependencias de la aplicación
├── assets/   Imágenes y recursos usados por la aplicación
├── design/   Mockups, prototipos y modelos 3D de la carcasa
├── docs/     Documentación, análisis y presentaciones
├── README.md
└── .gitignore
```

Dentro de `app/src/`, la interfaz y las rutas del servidor están en `app/`, las
reglas de temperatura en `lib/`, las pruebas automáticas en `tests/` y el
worker de publicación en `worker/`. Los recursos públicos de la aplicación se
conservan en `assets/public/`.

## Equipo

- Oreste Berta: Scrum Master, planificación y documentación.
- Julián Ledesma: desarrollo e integración técnica.

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

## Desarrollo

Requisitos:

- Node.js 22.13 o superior.
- pnpm 11.

Instalación y ejecución:

```bash
pnpm install
pnpm dev
```

Pruebas y compilación:

```bash
pnpm test
pnpm build
```

## Estructura principal

```text
app/                         Interfaz y rutas del servidor
app/api/devices/demo/latest Simulación remota del dispositivo
lib/temperature.js           Reglas de temperatura
tests/                       Pruebas automáticas
docs/ARQUITECTURA_COCINA.md  Decisiones de producto y próximas etapas
design/                      Diseño de la carcasa
assets/                      Documentación y recursos históricos
```

## Equipo

- Oreste Berta: Scrum Master, planificación y documentación.
- Julián Ledesma: desarrollo e integración técnica.

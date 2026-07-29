# TermaLab

TermaLab es un termómetro inteligente para cocina, mate y alimentos. El MVP combina una sonda de temperatura, un ESP32 con Wi‑Fi y una interfaz web que permite monitorear la lectura y recibir una alerta al alcanzar un objetivo.

## Estado actual

La primera versión de la app web incluye:

- Objetivos rápidos para mate, carne y pollo.
- Temperatura objetivo personalizada entre 20 °C y 125 °C.
- Modo demo con datos simulados claramente identificados.
- Gráfico de las últimas 30 lecturas.
- Alerta visual, vibración y notificación del navegador.
- Historial guardado localmente.
- Conexión configurable con un ESP32 por Wi‑Fi.

## Ver la app

La demo funciona directamente abriendo `index.html`. Para verla con un servidor local:

```bash
npm run dev
```

Después abrir:

```text
http://127.0.0.1:4173
```

## Ejecutar pruebas

```bash
npm test
```

No es necesario instalar dependencias.

## Conexión con el ESP32

La app consulta cada dos segundos:

```text
GET http://DIRECCION-DEL-ESP32/api/temperature
```

Respuesta esperada:

```json
{
  "temperature": 78.4,
  "battery": 86,
  "connected": true
}
```

El firmware deberá permitir solicitudes desde la app mediante CORS o servir directamente `index.html`, `styles.css`, `app.js` y `src/temperature.js`.

## Alcance del MVP

Incluido:

1. Lectura de temperatura con DS18B20.
2. ESP32 conectado por Wi‑Fi.
3. Visualización desde el celular.
4. Configuración de temperatura objetivo.
5. Alerta cuando se alcanza el objetivo.

Fuera del MVP inicial:

- Registro e inicio de sesión.
- Base de datos en internet.
- Aplicación móvil nativa.
- Bluetooth.
- Pantalla OLED.

## Estructura

```text
index.html                 Interfaz principal
styles.css                 Diseño responsive
app.js                     Estado, navegación y conexión
src/temperature.js         Reglas y procesamiento de temperatura
tests/temperature.test.js  Pruebas automáticas
scripts/dev-server.mjs     Servidor local sin dependencias
docs/                      Investigación y documentación
assets/                    Recursos visuales
design/                    Material de diseño
```

## Equipo

- Oreste Berta: Scrum Master, planificación y documentación.
- Julián Ledesma: desarrollo e integración técnica.

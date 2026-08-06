# Arquitectura de TermaLab Cocina

## Objetivo

TermaLab Cocina debe permitir que una persona deje una sonda dentro del alimento, cierre el horno y consulte la temperatura desde el celular. El módulo electrónico siempre queda afuera del horno.

La primera promesa del producto es:

> Te avisamos cuando la comida llega a la temperatura elegida.

## Las tres partes

### 1. Sonda y cable

Requisitos mínimos:

- Sonda penetrante de acero inoxidable apta para alimentos.
- Cable especificado para uso continuo a 250–300 °C.
- Longitud aproximada de 1 metro.
- Conector desmontable para poder reemplazarla.
- Especificación de precisión y rango entregada por el fabricante.

La DS18B20 genérica puede utilizarse en pruebas con líquidos o temperatura ambiente, pero no debe colocarse dentro del horno con su cable habitual.

### 2. Módulo central

Componentes previstos:

- ESP32 con USB‑C.
- Lector compatible con la sonda elegida.
- Buzzer físico.
- LED de estado.
- Botón de encendido o acción.
- Alimentación USB‑C durante el prototipo.
- Conector lateral para la sonda.

El módulo se coloca sobre la mesada, alejado del horno. La carcasa PLA actual sirve como prueba de dimensiones, pero no debe apoyarse en superficies calientes.

### 3. Aplicación y servidor

La aplicación se aloja en Internet. El flujo definitivo será:

```text
Sonda → ESP32 → Wi‑Fi → API TermaLab → base de datos → aplicación
```

El ESP32 enviará lecturas por HTTPS con:

- Identificador del dispositivo.
- Credencial secreta propia.
- Temperatura.
- Estado de la sonda.
- Fecha y hora.

La aplicación leerá esas mediciones desde el servidor. No pedirá una dirección IP ni necesitará estar conectada a la misma red local.

## Etapas

### Etapa 1 — Aplicación remota de demostración

- Dos pestañas: Medición y Cuenta.
- Temperatura simulada desde el servidor.
- Objetivo ajustable.
- Alerta en primer plano.
- Sitio alojado en Internet.

### Etapa 2 — Sonda real

- Comprar una sonda de horno con documentación.
- Elegir el lector electrónico.
- Comparar la lectura con un termómetro de referencia.
- Hacer pruebas en hielo, agua ambiente y agua hirviendo.
- No probar dentro del horno hasta verificar cable, conector y rango.

### Etapa 3 — ESP32 y nube

- Firmware que lee la sonda.
- Configuración inicial del Wi‑Fi.
- Envío HTTPS al servidor.
- Identidad segura por dispositivo.
- Lecturas almacenadas.
- Estado de conexión.

### Etapa 4 — Alertas confiables

- Buzzer local.
- Notificación push con la app cerrada.
- Aviso por sonda desconectada.
- Aviso por dispositivo sin conexión.
- Historial de cocciones.

## Límites de la primera versión

- La aplicación actual utiliza datos simulados.
- La pestaña Cuenta representa la experiencia futura; todavía no registra usuarios.
- Una notificación del navegador en primer plano no reemplaza las notificaciones push.
- Los objetivos son configurables y no constituyen una certificación de seguridad alimentaria.
- Antes de vender el producto se debe documentar la precisión, la ubicación correcta de la sonda, la limpieza y los materiales en contacto con alimentos.

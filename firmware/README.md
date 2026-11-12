# Firmware del módulo central

ESP32 WROOM-32 (38 pines, USB-C) + MAX6675 (HW-550) + termocupla tipo K.

El módulo lee la sonda una vez por segundo y manda la temperatura al servidor
de TermaLab por HTTPS: cada 3 s durante una cocción y cada 10 s el resto del
tiempo. Cuando la comida llega al objetivo suenan el buzzer y el LED, aunque
en ese momento se haya cortado el Wi-Fi (usa el último objetivo que recibió).

## Conexiones

| Componente | Pin del componente | ESP32 |
|---|---|---|
| MAX6675 | VCC | 3V3 |
| MAX6675 | GND | GND |
| MAX6675 | SCK | GPIO 18 |
| MAX6675 | CS | GPIO 5 |
| MAX6675 | SO | GPIO 19 |
| Termocupla | rojo / azul | bornera + / − del MAX6675 |
| Buzzer activo | + | GPIO 25 (con transistor NPN si es de 5 V) |
| Buzzer activo | − | GND |
| LED | ánodo (pata larga) | GPIO 26 con resistencia de 220 Ω |
| LED | cátodo | GND |
| Pulsador | una pata | GPIO 27 |
| Pulsador | otra pata | GND |

Si la temperatura baja cuando calentás la punta, invertí los cables de la
termocupla en la bornera.

## Cargar el programa

Con **VS Code + PlatformIO** (recomendado):

1. Abrí la carpeta `firmware` en VS Code con la extensión PlatformIO.
2. Conectá la ESP32 por USB-C.
3. Tocá **Upload** (flecha →) en la barra de abajo. La primera vez descarga
   las librerías solo.
4. Tocá **Monitor** para ver los mensajes (115200 baudios).

Con **Arduino IDE**:

1. Instalá el soporte de placas "esp32" de Espressif.
2. Instalá las librerías **WiFiManager** (tzapu) y **ArduinoJson** (v7).
3. Copiá `src/main.cpp` a un sketch nuevo (`termalab.ino`).
4. Placa: *ESP32 Dev Module*. Esquema de particiones: *Huge APP*.
5. Subir.

## Primera configuración

1. Creá el módulo en el servidor: `node scripts/crear-dispositivo.mjs` (en la
   carpeta `app`). Te da el **ID** y la **clave del módulo**.
2. Enchufá la ESP32. Como todavía no tiene datos, abre una red Wi-Fi llamada
   **TermaLab-XXXX** (clave `termalab`).
3. Conectate con el celular. Se abre una página (si no, entrá a
   `http://192.168.4.1`). Tocá **Configure WiFi** y completá:
   - tu red Wi-Fi y su clave,
   - **Servidor**: la dirección de tu app, por ejemplo
     `https://termalab.tu-cuenta.workers.dev`,
   - **ID del módulo** y **Clave del módulo**.
4. Guardá. El módulo se conecta a tu red y el LED queda fijo cuando ya
   envía datos.

Para cambiar de red o de servidor: mantené el pulsador **5 segundos** (o
enchufá el módulo con el pulsador apretado) y se vuelve a abrir el portal.

## LED y sonidos

| Señal | Significado |
|---|---|
| LED fijo | Todo bien, enviando lecturas |
| Parpadeo rápido | Sin Wi-Fi |
| Doble parpadeo | Hay Wi-Fi pero el servidor no responde o la clave es incorrecta |
| Parpadeo lento | Sonda desconectada |
| Tres pitidos repetidos | ¡Llegó al objetivo! Un toque al pulsador lo silencia |
| Un pitido corto | Encendido / se abre el portal |

## Notas

- El firmware está cargado y probado en el módulo real (ESP32 WROOM-32 de
  38 pines con MAX6675). Si aparece un error al compilar, revisá que estén
  instaladas las librerías WiFiManager y ArduinoJson v7.
- Prototipo: la conexión HTTPS no valida el certificado del servidor
  (`setInsecure`). Para un producto hay que cargar el certificado raíz.
- El MAX6675 mide de 0 a 1024 °C con resolución de 0,25 °C y un error típico
  de ±2 °C: conviene compararlo con un termómetro de cocina antes de confiar
  en él.

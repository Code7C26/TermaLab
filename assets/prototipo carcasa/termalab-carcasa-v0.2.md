# TermaLab — carcasa v0.2 para ESP32 USB-C

Estado: modelo paramétrico adaptado a la placa seleccionada. Requiere una
verificación con calibre antes de la impresión definitiva.

## Placa objetivo

- Marca y modelo comercial: Starware SKU 2968.
- Módulo: ESP32 WROOM-32.
- Formato: 30 pines.
- Programación y alimentación: USB Type-C con conversor CH340.
- Dimensión publicada: aproximadamente 51,5 x 28,5 mm.
- La imagen del vendedor muestra pines soldados orientados hacia abajo.

## Cambios respecto de la v0.1

- Alojamiento recalculado para una placa de 51,5 x 28,5 mm.
- Holgura lateral de 0,60 mm alrededor de la placa.
- Exterior aumentado a 76 x 46 x 26 mm para separar la placa de los tornillos.
- Base más profunda para dejar unos 6 mm libres debajo del PCB y alojar los pines.
- Abertura USB-C redondeada de 12 x 6 mm.
- La abertura USB-C se reparte entre base y tapa porque el conector cruza la unión.
- Cuatro apoyos interiores, guías laterales y pestañas de retención.
- Extremo de la antena libre de piezas metálicas.

## Dimensiones de diseño

- Exterior: 76 x 46 x 26 mm.
- Paredes, piso y techo: 2,4 mm.
- Radio exterior: 7 mm.
- Holgura de unión: 0,35 mm por lado.
- Paso para la sonda: 8,5 mm.
- Cuatro tornillos M2 autorroscantes.

## Archivos y preparación para impresión

El archivo `termalab-carcasa-v0.2.scad` es paramétrico. La variable `part`
permite elegir:

- `"bottom"` para exportar la base.
- `"top"` para exportar la tapa.
- `"assembly"` para revisar el conjunto armado.
- `"preview"` para ver tapa, base y placa de referencia.

Material sugerido: PETG. Para la primera prueba conviene usar una altura de capa
de 0,24 a 0,28 mm, tres perímetros y 15 % de relleno.

## Medidas que hay que confirmar cuando llegue la placa

1. Largo y ancho máximos del PCB.
2. Altura de los pines por debajo de la placa.
3. Posición y altura exactas del USB-C.
4. Altura máxima del módulo ESP32 y del conversor CH340.
5. Diámetro real del cable o prensa-cable de la sonda.

No conviene encargar una impresión definitiva hasta comprobar esas cinco
medidas. Una prueba rápida de la base permite corregir encastre y tolerancias
con poco material.

Producto de referencia:
https://tienda.starware.com.ar/producto/placa-desarrollo-iot-starware-esp32-wroom-32-30pin-type-c-ch340-wifi-bt42/

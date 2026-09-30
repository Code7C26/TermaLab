# TermaLab - requisitos para la carcasa v0.4

Revisión de la carcasa v0.3.2 frente a `docs/ARQUITECTURA_COCINA.md` y
definiciones tomadas para la próxima versión.

## Decisiones tomadas

- **Sensor:** termocupla tipo K con sonda penetrante de acero inoxidable.
- **Lector:** módulo MAX6675 (SPI, 0 a 1024 °C, resolución 0,25 °C).
  Tamaño aproximado del módulo: 25 x 15 mm. Se conecta al ESP32 con 5 cables
  (VCC, GND, SCK, CS, SO).
- **Placa:** NodeMCU ESP32 WROOM-32 de 38 pines, USB-C, con los pines soldados
  hacia abajo. Ya está disponible; hay que medirla con calibre.
- **Alimentación:** solo USB-C durante el prototipo (sin batería).
- **Conector de la sonda:** a definir (opciones: GX12 roscado, ficha mini de
  termocupla o cable fijo con prensacable).

## Problemas detectados en la v0.3.2

1. **Los pines chocan con el piso.** La placa apoya a 6,8 mm del piso, pero los
   headers sobresalen unos 8,5 mm por debajo. Con cables Dupont enchufados
   hacen falta unos 15 mm.
2. **Medidas de la placa.** El modelo usa 51 x 25 mm, pero muchas ESP32 de 38
   pines miden unos 55 x 28 mm. Con 28 mm de ancho la placa choca con los
   postes de los tornillos, que hoy quedan a 0,3 mm del borde.
3. **Falta espacio.** Del lado de la sonda quedan unos 15 mm libres. No entran
   el módulo MAX6675 y el conector de la sonda juntos.

## Lo que tiene que sumar la v0.4

- Alojamiento para el módulo MAX6675 con sus cables.
- Paso para el conector de la sonda, según el tipo que se elija.
- Agujeros para el buzzer, el LED de estado y el botón.
- Más altura debajo de la placa para los pines y los Dupont.
- Postes de tornillos alejados del borde de la placa.
- Largo exterior estimado: unos 90 mm.

## Pendiente antes de modelar

- Medir la ESP32 real (largo, ancho, alto de los pines por debajo).
- Medir el módulo MAX6675 real.
- Elegir el conector de la sonda.
- Elegir el buzzer (diámetro), el LED (3 o 5 mm) y el botón.

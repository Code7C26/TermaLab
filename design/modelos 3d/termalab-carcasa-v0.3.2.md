# TermaLab - carcasa v0.3.2 para ESP32 USB-C de 38 pines

Modelo diseñado para la placa NodeMCU ESP32 WROOM-32 de 38 pines, USB-C y
conversor CP2102 mostrada en la publicación de HobbyTronica.

## Estado

Los STL están listos para una primera impresión de prueba en una Creality FDM.
La placa todavía debe medirse con calibre cuando llegue antes de encargar una
impresión definitiva.

La revisión 0.3.2 fue reconstruida con un motor geométrico que garantiza mallas
cerradas. Además de unir físicamente el labio, las guías y las pestañas, corrige
las aristas no-manifold que Creality Print detectó en la exportación v0.3.1.

## Dimensiones usadas

- Placa publicada: aproximadamente 51 x 25 mm.
- Carcasa exterior armada: 74 x 44 x 26 mm.
- Paredes: 2,4 mm.
- Piso y techo: 2,4 mm.
- Holgura de la placa: 0,7 mm por lado.
- Holgura entre tapa y base: 0,4 mm por lado.
- Abertura USB-C: 12,2 x 6,2 mm.
- Paso para prensa-cable o sonda: 9,2 mm.

La placa se ubica cerca de la pared del USB-C para que el conector del cable
alcance correctamente el puerto. El espacio libre del extremo opuesto se usa
para el cableado de la sonda.

## Archivos

- `termalab-carcasa-v0.3.2-base.stl`: base, ya orientada para imprimir.
- `termalab-carcasa-v0.3.2-tapa.stl`: tapa invertida, orientada sin soportes.
- `termalab-carcasa-v0.3.2-placa-completa.stl`: ambas piezas en una placa.
- `termalab-carcasa-v0.3.2.mjs`: fuente paramétrica con malla robusta.

## Ajustes recomendados en Creality Print

- Material inicial: PLA. Para uso frecuente cerca de calor, PETG.
- Boquilla: 0,4 mm.
- Altura de capa: 0,20 mm.
- Ancho de línea: 0,40 mm.
- Paredes: 3.
- Capas superiores e inferiores: 5.
- Relleno: 15 % giroidal.
- Soportes: desactivados.
- Adhesión: falda; usar brim de 4 mm si se levantan las esquinas.
- Velocidad exterior: 35 a 45 mm/s.
- Compensación de pata de elefante: 0,15 a 0,20 mm si está disponible.

## Tornillos

Usar cuatro tornillos M2 x 16 mm autorroscantes para plástico, con cabeza de
hasta 4,5 mm. Los tornillos entran desde la parte inferior y quedan alojados en
un rebaje.

## Primera prueba

1. Imprimir primero la base.
2. Probar el encastre de la ESP32 sin forzar las pestañas.
3. Comprobar que un cable USB-C real pueda conectarse.
4. Medir el diámetro del cable o prensa-cable de la sonda.
5. Imprimir la tapa solamente después de validar esos puntos.

Si la placa real difiere más de 0,5 mm de las medidas publicadas, actualizar
`pcbX`, `pcbY`, `pcbLeftGap` y `pcbClearance` en el archivo paramétrico.

Referencia de la placa:
https://hobbytronica.com.ar/modulos-y-placas/placas-de-desarrollo/

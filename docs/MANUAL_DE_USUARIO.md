# Manual de usuario de TermaLab Cocina

TermaLab Cocina es un termómetro conectado para horno. La sonda queda dentro
de la comida, el módulo queda afuera del horno y la aplicación te avisa en el
celular cuando la comida llega a la temperatura que elegiste.

Este manual explica cómo usar el producto. La instalación del servidor y la
carga del firmware están en el [README](../README.md) y en
[`firmware/README.md`](../firmware/README.md).

## Qué incluye

- **Sonda:** termocupla tipo K con punta de acero inoxidable y cable mallado.
- **Módulo central:** caja con pulsador, LED de estado, buzzer y entrada USB‑C.
- **Aplicación:** web instalable en cualquier celular o computadora.

Con el módulo vienen tres datos, que se generan al darlo de alta:

| Dato | Dónde se usa |
|---|---|
| ID del módulo | En la configuración del módulo |
| Clave del módulo | En la configuración del módulo |
| Código para la app (forma `abc123-ABCD-EFGH`) | En la pestaña **Cuenta** de la aplicación |

## Antes de empezar: seguridad

- El módulo va **siempre afuera del horno**, sobre la mesada y lejos de
  hornallas y superficies calientes. La carcasa es de plástico impreso.
- Dentro del horno van solo la punta de la sonda y su cable.
- La punta y el cable quedan calientes después de cocinar. Sacalos con una
  manopla.
- No mojes el módulo ni lo dejes cerca de vapor directo.
- Las temperaturas sugeridas son una ayuda para cocinar. No reemplazan las
  recomendaciones oficiales de seguridad alimentaria.
- Es un prototipo: no lo dejes funcionando sin nadie en casa.

## Primera configuración del módulo

Se hace una sola vez, o cuando cambiás de red Wi‑Fi.

1. Enchufá el módulo con un cable USB‑C. Hace un pitido corto.
2. Como todavía no tiene datos, crea una red Wi‑Fi llamada **TermaLab-XXXX**.
   Conectate desde el celular con la clave `termalab`.
3. Se abre una página de configuración. Si no se abre sola, entrá a
   `http://192.168.4.1` desde el navegador.
4. Tocá **Configure WiFi** y completá:
   - tu red Wi‑Fi y su clave,
   - **Servidor:** la dirección de TermaLab,
   - **ID del módulo** y **Clave del módulo**.
5. Guardá. El módulo se conecta a tu red. Cuando el LED queda fijo, ya está
   enviando lecturas.

Para cambiar de red más adelante, mantené el pulsador apretado **5 segundos**
y se vuelve a abrir la página de configuración.

## Instalar la aplicación

### Web instalable (Android, iPhone o computadora)

1. Abrí la dirección de TermaLab en el navegador.
2. En iPhone (Safari): tocá **Compartir** y después **Agregar a inicio**.
   En Android (Chrome): tocá el menú **⋮** y después **Agregar a pantalla
   principal**. Abrila desde el ícono nuevo.
3. Entrá a la pestaña **Cuenta**, escribí el **Código del módulo** y tocá
   **Vincular**.
4. En **Avisos en este celular** tocá **Activar** y aceptá el permiso. Así el
   aviso llega aunque la aplicación esté cerrada.

Sin vincular un módulo, la aplicación funciona en **modo demostración** con
temperaturas simuladas. Sirve para conocerla antes de tener el producto.

No hace falta bajar nada de una tienda de aplicaciones.

## Cocinar con TermaLab

1. Pinchá la sonda en la parte más gruesa de la comida, sin tocar hueso ni la
   fuente.
2. Meté la comida al horno y pasá el cable por el borde de la puerta. El
   módulo queda afuera.
3. En la pestaña **Medición** elegí el tipo de preparación o ajustá el
   objetivo con los botones − y +.
4. Tocá **Empezar cocción**. La pantalla muestra la temperatura actual,
   cuántos grados faltan y el tiempo transcurrido.
5. Cuando la comida llega al objetivo:
   - el módulo hace tres pitidos repetidos,
   - la aplicación muestra **¡Llegó al objetivo!**,
   - llega un aviso al celular.
6. Tocá el pulsador del módulo una vez para silenciar el buzzer y después
   **Terminar cocción** en la aplicación.

### Objetivos sugeridos

| Preparación | Objetivo |
|---|---|
| Carne | 63 °C |
| Pollo | 74 °C |
| Pan | 96 °C |

El objetivo se puede ajustar entre 40 °C y 100 °C.

## Luces y sonidos del módulo

| Señal | Qué significa | Qué hacer |
|---|---|---|
| LED fijo | Todo bien, enviando lecturas | Nada |
| Parpadeo rápido | Sin Wi‑Fi | Revisar el router o reconfigurar la red |
| Doble parpadeo | Hay Wi‑Fi pero el servidor no responde, o la clave es incorrecta | Revisar la dirección del servidor, el ID y la clave |
| Parpadeo lento | Sonda desconectada | Revisar los dos cables de la sonda en la bornera |
| Tres pitidos repetidos | La comida llegó al objetivo | Un toque al pulsador lo silencia |
| Un pitido corto | Encendido, o se abrió la configuración | Nada |

## Estados en la aplicación

| Mensaje | Qué significa |
|---|---|
| Módulo online | El módulo está enviando lecturas |
| Módulo apagado | No llegan lecturas hace más de 20 segundos. Revisá que esté enchufado y con Wi‑Fi |
| Revisá la sonda | El módulo funciona pero no detecta la sonda |
| Sin internet | El celular no tiene conexión |
| Demo online | Estás en modo demostración, sin módulo vinculado |

Si se corta el Wi‑Fi durante una cocción, el buzzer del módulo suena igual al
llegar al último objetivo que recibió.

## Ajustes

En la pestaña **Cuenta**:

- **Idioma:** español o inglés.
- **Avisos en este celular:** activar o ver el estado de los avisos.
- **Desvincular este módulo:** vuelve al modo demostración.

## Problemas frecuentes

| Problema | Solución |
|---|---|
| No aparece la red TermaLab-XXXX | Mantené el pulsador 5 segundos, o enchufá el módulo con el pulsador apretado |
| La temperatura baja cuando la sonda se calienta | Los cables de la sonda están invertidos en la bornera. Intercambialos |
| "Código incorrecto" al vincular | Revisá mayúsculas y guiones. La forma es `abc123-ABCD-EFGH` |
| No llegan avisos en iPhone | Instalá la web con **Agregar a inicio**, abrila desde el ícono y activá los avisos |
| La lectura no coincide con otro termómetro | El lector tiene un error típico de ±2 °C. Ver [pruebas de precisión](PRUEBAS_DE_PRECISION.md) |

## Cuidado y limpieza

- Limpiá la punta de la sonda con un paño húmedo y detergente después de cada
  uso, y secala.
- No sumerjas el cable completo ni la unión entre el cable y la punta.
- No dobles el cable en ángulos cerrados.
- Guardá el módulo desenchufado, en un lugar seco.

## Datos técnicos

| Característica | Valor |
|---|---|
| Sensor | Termocupla tipo K con lector MAX6675 |
| Rango del lector | 0 a 1024 °C |
| Resolución | 0,25 °C |
| Error típico | ±2 °C |
| Conexión | Wi‑Fi de 2,4 GHz |
| Alimentación | USB‑C, 5 V |
| Historial | 3 días |
| Tamaño del módulo | 106,8 × 40,8 × 32,8 mm |

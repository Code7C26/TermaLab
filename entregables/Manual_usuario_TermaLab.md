# Manual breve de usuario

TermaLab Cocina es un prototipo de termómetro conectado. Esta guía corresponde a la web disponible en https://termalab.termalab-cocina.workers.dev/ y al comportamiento del código revisado. El sensor y el módulo se deben preparar previamente por el equipo.

## Abrir e instalar

1. Abrí la web desde el QR. Sin vincular un módulo aparece el modo demostración y sus temperaturas son simuladas.
2. En iPhone, abrila en Safari, tocá Compartir y Agregar a inicio. Volvé a abrirla desde el ícono. Para Web Push se requiere un entorno compatible, como iOS 16.4 o posterior con la web instalada.
3. En Cuenta ingresá el código de vinculación entregado por el equipo y tocá Vincular. Confirmá Módulo online y una hora de lectura reciente.

## Medir y recibir un aviso

4. En Cuenta, tocá Activar en Avisos en este celular y aceptá el permiso si querés recibir notificaciones.
5. En Medición elegí un objetivo o ajustalo con los controles. La interfaz permite 40 a 100 °C. Los valores predefinidos no certifican seguridad alimentaria.
6. Tocá Empezar cocción y observá la lectura. Colocá la sonda únicamente en las condiciones permitidas por su fabricante.
7. Cuando alcance el objetivo, comprobá el aviso. Al terminar, tocá Terminar cocción o Detener cocción. Un toque breve al pulsador del módulo silencia su alarma.

## Si algo falla

| Mensaje o situación | Qué hacer |
| --- | --- |
| Demo online | Vincular el módulo para obtener datos de la sonda. |
| Módulo apagado o esperando | Verificar alimentación, conexión Wi-Fi y última lectura. |
| Revisá la sonda | Revisar conexiones con el sistema en una condición apropiada y segura. |
| Sin internet | Restablecer conexión. No confiar en una lectura vieja como actual. |
| No llega el push | Comprobar instalación, permisos, navegador compatible y una sesión de prueba. |
| Código incorrecto | Pedir al equipo el código de la app. No usar la clave secreta del ESP32. |

El módulo y la carcasa quedan fuera del horno y lejos de superficies calientes. La precisión y la aptitud del conjunto para uso continuo en horno siguen pendientes. No sumergir el módulo ni conectores. La alarma local depende del último objetivo recibido y de que el módulo permanezca alimentado; no sustituye la supervisión de la cocción.

Fuente de compatibilidad Web Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/




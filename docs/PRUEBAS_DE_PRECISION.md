# Pruebas de precisión

Objetivo: comparar la lectura de TermaLab con un termómetro de referencia en
tres puntos y documentar el error.

El lector MAX6675 tiene una resolución de 0,25 °C y un error típico de ±2 °C.
El criterio de aceptación es que la diferencia con la referencia no supere
±2 °C en ninguno de los puntos.

## Materiales

- Módulo TermaLab con la sonda conectada y la aplicación abierta.
- Termómetro de referencia (anotar marca y modelo).
- Vaso con hielo picado y agua.
- Olla o pava con agua.
- Horno y una preparación real.

## Procedimiento

### 1. Punto de hielo

1. Llenar un vaso con hielo picado y completar con agua fría. Revolver 2 minutos.
2. Sumergir la punta de la sonda y el termómetro de referencia en el centro,
   sin tocar el vaso.
3. Esperar a que la lectura quede estable 30 segundos y anotar las dos.

Valor esperado: 0 °C.

### 2. Agua hirviendo

1. Hervir agua a borbotones.
2. Sumergir las dos puntas sin tocar el fondo ni las paredes.
3. Esperar lectura estable 30 segundos y anotar.

El punto de ebullición baja con la altura: a nivel del mar es 100 °C y
desciende cerca de 1 °C cada 300 m. Anotar la altura del lugar de la prueba.

### 3. Cocción real

1. Colocar las dos sondas juntas en la parte más gruesa de la preparación.
2. Fijar el objetivo en la aplicación y empezar la cocción.
3. Anotar las dos lecturas cada 10 minutos y en el momento del aviso.

## Resultados

Fecha de la prueba: noviembre de 2026.
Referencia: el valor esperado de cada punto (0 °C en hielo y 100 °C en agua
hirviendo).
Lugar y altura: Córdoba, unos 390 m.

| Prueba | Referencia (°C) | TermaLab (°C) | Diferencia (°C) | ¿Dentro de ±2 °C? |
|---|---|---|---|---|
| Hielo | 0 | 1,2 | +1,2 | Sí |
| Agua hirviendo | 100 | 98,5 | −1,5 | Sí |
| Cocción real | | | | No realizada |

## Conclusiones

- Error máximo medido: 1,5 °C, en agua hirviendo. Los dos puntos cumplen el
  criterio de ±2 °C.
- Se tomó 100 °C como referencia del agua hirviendo. A unos 390 m el agua
  hierve cerca de 98,7 °C, así que la diferencia real en ese punto es menor.
- No conviene corregir la lectura con un ajuste fijo: las dos diferencias van
  en sentidos opuestos.
- Falta la prueba en una cocción real.

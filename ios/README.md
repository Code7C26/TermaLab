# TermaLab para iPhone (SwiftUI)

App nativa de TermaLab Cocina. Usa el mismo servidor que la web: muestra la
temperatura de la sonda, permite elegir el objetivo, empezar y terminar la
cocción, ver la curva de la última hora y avisa cuando la comida está lista.
Sin módulo vinculado funciona en **modo demostración** (simula la cocción en
el celular).

Requisitos: Mac con **Xcode 16 o posterior** y un iPhone con **iOS 17 o
posterior**. Alcanza con un Apple ID común (cuenta gratis).

## Instalar en tu iPhone

1. Abrí `ios/TermaLab.xcodeproj` con Xcode.
2. En el panel izquierdo tocá el proyecto **TermaLab** → target **TermaLab** →
   pestaña **Signing & Capabilities**.
3. En **Team** elegí tu Apple ID (si no aparece: *Add an Account…*).
   Si Xcode dice que el *Bundle Identifier* ya existe, cambialo por algo
   único, por ejemplo `ar.termalab.cocina.tunombre`.
   Repetí el paso con el target **TermaLabWidgetsExtension** (la actividad en
   vivo): mismo Team, y su identificador tiene que ser el de la app más
   `.widgets`, por ejemplo `ar.termalab.cocina.tunombre.widgets`.
4. Conectá el iPhone por cable, desbloquealo y aceptá *Confiar en esta
   computadora*.
5. Arriba, elegí tu iPhone como destino y tocá **▶ Run**.
6. La primera vez, en el iPhone: **Ajustes → General → VPN y gestión de
   dispositivos** → tu Apple ID → **Confiar**. En iOS 16 o posterior también
   hay que activar **Ajustes → Privacidad y seguridad → Modo de desarrollador**
   (pide reiniciar).

Con la cuenta gratis la app dura **7 días** instalada: después volvé a tocar
Run desde Xcode. Para TestFlight o App Store hace falta el Apple Developer
Program (USD 99 por año).

## Usarla

1. Pestaña **Cuenta** → **Servidor**: la dirección donde publicaste la web,
   por ejemplo `https://termalab.tu-cuenta.workers.dev`.
2. **Código del módulo**: el que imprime `pnpm dispositivo` (forma
   `abc123-ABCD-EFGH`) → **Vincular módulo**.
3. Pestaña **Medición**: elegí carne, pollo, pan o un objetivo propio y tocá
   **Empezar cocción**.

## Actividad en vivo y avisos

- Al empezar una cocción aparece una **actividad en vivo** en la pantalla
  bloqueada y en la Dynamic Island: temperatura actual, objetivo, avance y
  tiempo transcurrido. La primera vez iOS pregunta si se permiten las
  actividades en vivo de TermaLab.
- Al llegar al objetivo el iPhone muestra el aviso, suena y vibra, también
  **con el celular bloqueado** o con otra app abierta.
- Para lograrlo sin la cuenta paga de Apple, durante la cocción la app sigue
  activa en segundo plano reproduciendo audio en silencio
  (`BackgroundKeeper.swift`). Se apaga sola al llegar al objetivo o al
  terminar la cocción. Mientras dura gasta algo más de batería.
- Límites: si cerrás la app deslizándola hacia arriba, o si entra una llamada
  durante la cocción, la app deja de consultar y la actividad queda marcada
  como apagada. En ese caso avisan la **web instalada en el inicio** (avisos
  push) y el buzzer del módulo, que suena siempre.
- Los avisos remotos de Apple (APNs), que funcionan con la app cerrada del
  todo, requieren el Apple Developer Program.

## Archivos

```text
ios/
├── TermaLab.xcodeproj        proyecto (las carpetas se sincronizan solas)
├── TermaLab-Info.plist        actividades en vivo y audio en segundo plano
├── TermaLabWidgets-Info.plist datos de la extensión de widgets
├── Shared/                    datos de la actividad (app y extensión)
├── TermaLabWidgets/           extensión: vista de pantalla bloqueada y Dynamic Island
└── TermaLab/
    ├── TermaLabApp.swift      entrada, pestañas y colores de la marca
    ├── CookingStore.swift     estado, consulta al servidor cada 2 s, demo
    ├── APIClient.swift        llamadas a /api/v1
    ├── Models.swift           tipos, presets y cálculos de temperatura
    ├── Notifier.swift         avisos locales
    ├── LiveActivity.swift     inicia, actualiza y termina la actividad en vivo
    ├── BackgroundKeeper.swift mantiene la app activa durante la cocción
    ├── Views/                 Medición, Cuenta, medidor y gráfico
    └── Assets.xcassets        ícono, color y logo
```

## Si el proyecto no abre

Si Xcode no abre el proyecto o marca errores al abrirlo, se puede recrear:

1. Xcode → **File → New → Project… → iOS → App**. Nombre `TermaLab`,
   Interface **SwiftUI**, sin Core Data ni tests.
2. Borrá `ContentView.swift` y `TermaLabApp.swift` que crea Xcode.
3. Arrastrá todo el contenido de `ios/TermaLab/` (archivos `.swift`, `Views`
   y `Assets.xcassets`, reemplazando el de Xcode) al proyecto nuevo.
4. En el target, **Minimum Deployments: iOS 17.0**.

Si aparece un error de compilación, revisá que el target tenga iOS 17.0 como
mínimo y que estén incluidos todos los archivos de `ios/TermaLab/`.

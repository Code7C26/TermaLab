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

## Avisos

- Con la app abierta o recién minimizada, el iPhone muestra el aviso, suena y
  vibra al llegar al objetivo.
- Durante la cocción la pantalla no se apaga, para que el celular pueda quedar
  en la mesada con la app abierta.
- Con la app **cerrada**, iOS no deja que la app consulte al servidor, y los
  avisos remotos (APNs) requieren la cuenta paga de Apple. Para ese caso usá la
  **web instalada en el inicio**, que sí recibe avisos push con la app
  cerrada. Igual, el buzzer del módulo suena siempre.

## Archivos

```text
ios/
├── TermaLab.xcodeproj        proyecto (las carpetas se sincronizan solas)
└── TermaLab/
    ├── TermaLabApp.swift      entrada, pestañas y colores de la marca
    ├── CookingStore.swift     estado, consulta al servidor cada 2 s, demo
    ├── APIClient.swift        llamadas a /api/v1
    ├── Models.swift           tipos, presets y cálculos de temperatura
    ├── Notifier.swift         avisos locales
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

import Foundation

/// Idiomas de la app. Se elige en Cuenta y se guarda en el celular.
enum Lang: String, CaseIterable, Identifiable {
    case es, en

    var id: String { rawValue }
    var locale: Locale { Locale(identifier: self == .es ? "es_AR" : "en_US") }
    var strings: Strings { self == .es ? .es : .en }
}

/// Todos los textos de la app en español e inglés (los mismos que la web).
struct Strings {
    // pestañas
    let tabMeasurement: String
    let tabAccount: String

    // medición
    let headline: String
    let demoHeader: String
    let presets: [String: String]
    let probeLabel: String
    let probeMissing: String
    let noReading: String
    let noProbeReading: String
    let heating: String
    let ready: String
    let high: String
    let currentTemperature: (String) -> String
    let goalReached: String
    let takeItOut: String
    let waitingModule: String
    let checkModule: String
    let remaining: (Double) -> String
    let targetReached: String
    let weWillNotify: String
    let chooseTarget: String
    let elapsed: String
    let stopMeasurement: String
    let measureAgain: String
    let startDemo: String
    let finishCooking: String
    let stopCooking: String
    let startCooking: String
    let lastHour: String
    let target: String
    let targetDown: String
    let targetUp: String
    let chartTime: String
    let chartTarget: (Int) -> String

    // insignia de estado
    let badgeDemo: String
    let badgeNoInternet: String
    let badgeOff: String
    let badgeProbe: String

    // cuenta
    let account: String
    let demoMode: String
    let demoSimulated: String
    let moduleId: (String) -> String
    let defaultModuleName: String
    let server: String
    let serverFooter: String
    let pairButton: String
    let pairCode: String
    let pairFooter: String
    let status: String
    let connection: String
    let probe: String
    let probeConnected: String
    let probeDisconnected: String
    let lastReading: String
    let unpair: String
    let language: String
    let unit: String
    let allowAlerts: String
    let alerts: String
    let alertsFooter: String

    // errores y avisos
    let pairFormat: String
    let pairWrong: String
    let serverUnreachable: String
    let serverMissing: String
    let configureServer: String
    let codeRevoked: String
    let requestFailed: (Int) -> String
    let notificationTitle: String
    let notificationBody: (Double, Double) -> String
}

extension Strings {
    static let es = Strings(
        tabMeasurement: "Medición",
        tabAccount: "Cuenta",
        headline: "Tu comida, en el punto justo.",
        demoHeader: "TERMALAB COCINA · DEMO",
        presets: ["carne": "Carne", "pollo": "Pollo", "pan": "Pan"],
        probeLabel: "SONDA INTERNA",
        probeMissing: "Sonda desconectada",
        noReading: "Sin lectura",
        noProbeReading: "Sin lectura de la sonda",
        heating: "Cocinando",
        ready: "Está listo",
        high: "Por encima",
        currentTemperature: { "Temperatura actual \($0) grados" },
        goalReached: "¡Llegó al objetivo!",
        takeItOut: "Podés retirar la preparación.",
        waitingModule: "Esperando al módulo",
        checkModule: "Revisá que esté enchufado y con Wi‑Fi.",
        remaining: { String(format: "Faltan %.1f °C", $0) },
        targetReached: "Objetivo alcanzado",
        weWillNotify: "Te avisamos cuando esté lista.",
        chooseTarget: "Elegí el objetivo y empezá.",
        elapsed: "Tiempo transcurrido",
        stopMeasurement: "Detener medición",
        measureAgain: "Medir de nuevo",
        startDemo: "Iniciar demostración",
        finishCooking: "Terminar cocción",
        stopCooking: "Detener cocción",
        startCooking: "Empezar cocción",
        lastHour: "Última hora",
        target: "Objetivo",
        targetDown: "Bajar temperatura objetivo",
        targetUp: "Subir temperatura objetivo",
        chartTime: "Hora",
        chartTarget: { "Objetivo \($0) °C" },
        badgeDemo: "Demo",
        badgeNoInternet: "Sin internet",
        badgeOff: "Apagado",
        badgeProbe: "Sonda",
        account: "Cuenta",
        demoMode: "Modo demostración",
        demoSimulated: "Temperaturas simuladas en el celular",
        moduleId: { "Módulo \($0)" },
        defaultModuleName: "Módulo central",
        server: "Servidor",
        serverFooter: "La misma dirección donde está publicada la app web.",
        pairButton: "Vincular módulo",
        pairCode: "Código del módulo",
        pairFooter: "Lo da el script de alta (scripts/crear-dispositivo.mjs).",
        status: "Estado",
        connection: "Conexión",
        probe: "Sonda",
        probeConnected: "Conectada",
        probeDisconnected: "Desconectada",
        lastReading: "Última lectura",
        unpair: "Desvincular este módulo",
        language: "Idioma",
        unit: "Unidad",
        allowAlerts: "Permitir avisos",
        alerts: "Avisos",
        alertsFooter: "Durante una cocción la app sigue funcionando con el iPhone bloqueado: la cocción se ve en la pantalla bloqueada y el aviso llega igual. Si cerrás la app deslizándola hacia arriba, deja de avisar. El buzzer del módulo suena siempre.",
        pairFormat: "El código tiene la forma abc123-ABCD-EFGH.",
        pairWrong: "Código incorrecto. Revisalo y probá de nuevo.",
        serverUnreachable: "No se pudo conectar con el servidor.",
        serverMissing: "Primero escribí la dirección del servidor (https://…).",
        configureServer: "Configurá la dirección del servidor en Cuenta.",
        codeRevoked: "El módulo ya no acepta este código. Volvé a vincularlo.",
        requestFailed: { "Error de conexión (\($0))." },
        notificationTitle: "¡Está listo! 🍽️",
        notificationBody: { String(format: "La sonda marca %.1f °C (objetivo %.0f °C).", $0, $1) }
    )

    static let en = Strings(
        tabMeasurement: "Measure",
        tabAccount: "Account",
        headline: "Your food, cooked just right.",
        demoHeader: "TERMALAB KITCHEN · DEMO",
        presets: ["carne": "Beef", "pollo": "Chicken", "pan": "Bread"],
        probeLabel: "INTERNAL PROBE",
        probeMissing: "Probe disconnected",
        noReading: "No reading",
        noProbeReading: "No probe reading",
        heating: "Cooking",
        ready: "It's ready",
        high: "Above target",
        currentTemperature: { "Current temperature \($0) degrees" },
        goalReached: "Target reached!",
        takeItOut: "You can take it out now.",
        waitingModule: "Waiting for the module",
        checkModule: "Make sure it's plugged in and on Wi‑Fi.",
        remaining: { String(format: "%.1f °C to go", $0) },
        targetReached: "Target reached",
        weWillNotify: "We'll let you know when it's ready.",
        chooseTarget: "Pick a target and start.",
        elapsed: "Elapsed time",
        stopMeasurement: "Stop measuring",
        measureAgain: "Measure again",
        startDemo: "Start demo",
        finishCooking: "Finish cooking",
        stopCooking: "Stop cooking",
        startCooking: "Start cooking",
        lastHour: "Last hour",
        target: "Target",
        targetDown: "Lower target temperature",
        targetUp: "Raise target temperature",
        chartTime: "Time",
        chartTarget: { "Target \($0) °C" },
        badgeDemo: "Demo",
        badgeNoInternet: "No internet",
        badgeOff: "Off",
        badgeProbe: "Probe",
        account: "Account",
        demoMode: "Demo mode",
        demoSimulated: "Temperatures simulated on the phone",
        moduleId: { "Module \($0)" },
        defaultModuleName: "Main module",
        server: "Server",
        serverFooter: "The same address where the web app is published.",
        pairButton: "Pair module",
        pairCode: "Module code",
        pairFooter: "The setup script gives it to you (scripts/crear-dispositivo.mjs).",
        status: "Status",
        connection: "Connection",
        probe: "Probe",
        probeConnected: "Connected",
        probeDisconnected: "Disconnected",
        lastReading: "Last reading",
        unpair: "Unpair this module",
        language: "Language",
        unit: "Unit",
        allowAlerts: "Allow alerts",
        alerts: "Alerts",
        alertsFooter: "While cooking, the app keeps running with the iPhone locked: the cook shows on the Lock Screen and the alert still arrives. If you swipe the app closed, alerts stop. The module's buzzer always sounds.",
        pairFormat: "The code looks like abc123-ABCD-EFGH.",
        pairWrong: "Wrong code. Check it and try again.",
        serverUnreachable: "Couldn't reach the server.",
        serverMissing: "First enter the server address (https://…).",
        configureServer: "Set the server address in Account.",
        codeRevoked: "The module no longer accepts this code. Pair it again.",
        requestFailed: { "Connection error (\($0))." },
        notificationTitle: "It's ready! 🍽️",
        notificationBody: { String(format: "The probe reads %.1f °C (target %.0f °C).", $0, $1) }
    )
}

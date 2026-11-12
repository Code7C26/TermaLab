import SwiftUI

@main
struct TermaLabApp: App {
    @State private var store = CookingStore()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        Notifier.shared.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
                .environment(\.locale, store.lang.locale)
                .tint(.ink)
        }
        .onChange(of: scenePhase) { _, phase in
            store.scenePhaseChanged(phase)
        }
    }
}

struct ContentView: View {
    @Environment(CookingStore.self) private var store

    var body: some View {
        TabView {
            MeasurementView()
                .tabItem { Label(store.t.tabMeasurement, systemImage: "thermometer.medium") }
            AccountView()
                .tabItem { Label(store.t.tabAccount, systemImage: "person.crop.circle") }
        }
        .alert("TermaLab", isPresented: Binding(
            get: { store.errorMessage != nil },
            set: { if !$0 { store.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(store.errorMessage ?? "")
        }
    }
}

/// Paleta mínima: tinta, grises del sistema y un único rojo para errores.
extension Color {
    static let ink = Color.primary
    static let brandRed = Color(red: 192 / 255, green: 57 / 255, blue: 43 / 255)
    static let line = Color(uiColor: .systemGray5)
    static let surfaceSoft = Color(uiColor: .secondarySystemBackground)
}

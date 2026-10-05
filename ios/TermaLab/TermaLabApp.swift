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
                .tint(.brandCyan)
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
                .tabItem { Label("Medición", systemImage: "thermometer.medium") }
            AccountView()
                .tabItem { Label("Cuenta", systemImage: "person.crop.circle") }
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

extension Color {
    static let brandNavy = Color(red: 6 / 255, green: 43 / 255, blue: 85 / 255)
    static let brandCyan = Color(red: 5 / 255, green: 188 / 255, blue: 199 / 255)
    static let brandOrange = Color(red: 1, green: 107 / 255, blue: 44 / 255)
    static let brandRed = Color(red: 233 / 255, green: 64 / 255, blue: 64 / 255)
    static let brandGreen = Color(red: 21 / 255, green: 145 / 255, blue: 95 / 255)
    static let surfaceSoft = Color(red: 246 / 255, green: 248 / 255, blue: 251 / 255)
}

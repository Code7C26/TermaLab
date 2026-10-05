import SwiftUI

struct AccountView: View {
    @Environment(CookingStore.self) private var store
    @State private var code = ""
    @State private var pairing = false

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 14) {
                        Text("TL")
                            .font(.headline.weight(.heavy))
                            .foregroundStyle(.white)
                            .frame(width: 46, height: 46)
                            .background(
                                LinearGradient(colors: [.brandCyan, .blue], startPoint: .topLeading, endPoint: .bottomTrailing),
                                in: RoundedRectangle(cornerRadius: 14)
                            )
                        VStack(alignment: .leading, spacing: 2) {
                            Text(store.isDemo ? "Modo demostración" : store.deviceName).font(.headline)
                            Text(store.isDemo ? "Temperaturas simuladas en el celular" : "Módulo \(store.pairing?.id ?? "")")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section {
                    TextField("https://termalab.tu-cuenta.workers.dev", text: $store.serverAddress)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onSubmit { store.saveServerAddress() }
                } header: {
                    Text("Servidor")
                } footer: {
                    Text("La misma dirección donde está publicada la app web.")
                }

                if store.isDemo {
                    Section {
                        TextField("abc123-ABCD-EFGH", text: $code)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .font(.body.monospaced())
                        Button {
                            pairing = true
                            Task {
                                if await store.pair(code: code) { code = "" }
                                pairing = false
                            }
                        } label: {
                            HStack {
                                Text("Vincular módulo")
                                if pairing { Spacer(); ProgressView() }
                            }
                        }
                        .disabled(code.trimmingCharacters(in: .whitespaces).isEmpty || pairing)
                    } header: {
                        Text("Código del módulo")
                    } footer: {
                        Text("Lo da el script de alta (scripts/crear-dispositivo.mjs).")
                    }
                } else {
                    Section("Estado") {
                        LabeledContent("Conexión", value: store.moduleOnline ? "Online" : "Offline")
                        LabeledContent("Sonda", value: store.probeMissing ? "Desconectada" : "Conectada")
                        if let date = store.status?.measuredDate {
                            LabeledContent("Última lectura", value: date.formatted(date: .omitted, time: .standard))
                        }
                    }
                    Section {
                        Button("Desvincular este módulo", role: .destructive) { store.unpair() }
                    }
                }

                Section {
                    LabeledContent("Unidad", value: "°C")
                    Button("Permitir avisos") { Notifier.shared.requestAuthorization() }
                } header: {
                    Text("Avisos")
                } footer: {
                    Text("El iPhone avisa con la app abierta o recién minimizada y deja la pantalla encendida durante la cocción. Para avisos con la app cerrada usá la web instalada en el inicio.")
                }
            }
            .navigationTitle("Cuenta")
        }
    }
}

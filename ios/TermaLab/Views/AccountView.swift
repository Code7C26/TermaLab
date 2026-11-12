import SwiftUI

struct AccountView: View {
    @Environment(CookingStore.self) private var store
    @State private var code = ""
    @State private var pairing = false

    var body: some View {
        @Bindable var store = store
        let t = store.t
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 14) {
                        Text("TL")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Color.ink)
                            .frame(width: 46, height: 46)
                            .background(Color.surfaceSoft, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(store.isDemo ? t.demoMode : store.deviceName).font(.body.weight(.medium))
                            Text(store.isDemo ? t.demoSimulated : t.moduleId(store.pairing?.id ?? ""))
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
                    Text(t.server)
                } footer: {
                    Text(t.serverFooter)
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
                                Text(t.pairButton)
                                if pairing { Spacer(); ProgressView() }
                            }
                        }
                        .disabled(code.trimmingCharacters(in: .whitespaces).isEmpty || pairing)
                    } header: {
                        Text(t.pairCode)
                    } footer: {
                        Text(t.pairFooter)
                    }
                } else {
                    Section(t.status) {
                        LabeledContent(t.connection, value: store.moduleOnline ? "Online" : "Offline")
                        LabeledContent(t.probe, value: store.probeMissing ? t.probeDisconnected : t.probeConnected)
                        if let date = store.status?.measuredDate {
                            LabeledContent(
                                t.lastReading,
                                value: date.formatted(.dateTime.hour().minute().second().locale(store.lang.locale))
                            )
                        }
                    }
                    Section {
                        Button(t.unpair, role: .destructive) { store.unpair() }
                    }
                }

                Section {
                    Picker(t.language, selection: $store.lang) {
                        Text("Español").tag(Lang.es)
                        Text("English").tag(Lang.en)
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text(t.language)
                }

                Section {
                    LabeledContent(t.unit, value: "°C")
                    Button(t.allowAlerts) { Notifier.shared.requestAuthorization() }
                } header: {
                    Text(t.alerts)
                } footer: {
                    Text(t.alertsFooter)
                }
            }
            .navigationTitle(t.account)
        }
    }
}

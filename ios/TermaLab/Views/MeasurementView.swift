import SwiftUI

struct MeasurementView: View {
    @Environment(CookingStore.self) private var store

    private var stateLabel: (String, Color) {
        if store.probeMissing { return ("Sonda desconectada", .brandRed) }
        guard let temperature = store.temperature else { return ("Sin lectura", .secondary) }
        switch Temperature.state(temperature, target: store.target) {
        case .heating: return ("Cocinando", .brandOrange)
        case .ready: return ("Está listo", .brandGreen)
        case .high: return ("Por encima", .brandRed)
        }
    }

    private var message: (String, String) {
        if store.reached { return ("¡Llegó al objetivo!", "Podés retirar la preparación.") }
        if !store.isDemo && !(store.status?.connected ?? false) {
            return ("Esperando al módulo", "Revisá que esté enchufado y con Wi‑Fi.")
        }
        let remaining = store.target - (store.temperature ?? store.startTemperature)
        let title = remaining > Temperature.tolerance
            ? String(format: "Faltan %.1f °C", remaining)
            : "Objetivo alcanzado"
        return (title, store.active ? "Te avisamos cuando esté lista." : "Elegí el objetivo y empezá.")
    }

    private var buttonTitle: String {
        if store.isDemo {
            return store.active ? "Detener medición" : (store.reached ? "Medir de nuevo" : "Iniciar demostración")
        }
        return store.active ? (store.reached ? "Terminar cocción" : "Detener cocción") : "Empezar cocción"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    header
                    presets
                    GaugeView(
                        temperature: store.temperature,
                        target: store.target,
                        label: stateLabel.0,
                        labelColor: stateLabel.1
                    )
                    .padding(.vertical, 8)

                    VStack(spacing: 4) {
                        Text(message.0).font(.headline).foregroundStyle(Color.brandNavy)
                        Text(message.1).font(.footnote).foregroundStyle(.secondary)
                        if store.active || store.elapsed > 0 {
                            Text("Tiempo transcurrido · \(Temperature.elapsedText(store.elapsed))")
                                .font(.footnote.weight(.bold))
                                .monospacedDigit()
                                .foregroundStyle(Color.brandCyan)
                        }
                    }
                    .multilineTextAlignment(.center)

                    targetControl

                    Button { store.toggleCooking() } label: {
                        Text(buttonTitle)
                            .font(.headline)
                            .frame(maxWidth: .infinity, minHeight: 52)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(store.active ? Color.gray.opacity(0.25) : Color.brandNavy)
                    .foregroundStyle(store.active ? Color.brandNavy : .white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .disabled(store.busy)

                    if !store.isDemo && store.history.count > 1 {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Última hora").font(.subheadline.weight(.bold)).foregroundStyle(Color.brandNavy)
                            HistoryChart(points: store.history, target: store.target)
                        }
                        .padding(16)
                        .background(Color.surfaceSoft, in: RoundedRectangle(cornerRadius: 18))
                    }
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 24)
            }
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Image("Logo").resizable().scaledToFit().frame(height: 30)
                }
                ToolbarItem(placement: .topBarTrailing) { statusBadge }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(store.isDemo ? "TERMALAB COCINA · DEMO" : store.deviceName.uppercased())
                .font(.caption.weight(.heavy))
                .tracking(1)
                .foregroundStyle(Color.brandCyan)
            Text("Tu comida, en el punto justo.")
                .font(.system(size: 30, weight: .heavy))
                .foregroundStyle(Color.brandNavy)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    private var presets: some View {
        HStack(spacing: 8) {
            ForEach(Preset.all) { preset in
                Button {
                    store.selectPreset(preset)
                } label: {
                    Text("\(preset.emoji) \(preset.label)")
                        .font(.footnote.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 42)
                        .background(
                            store.presetId == preset.id ? Color.brandCyan.opacity(0.12) : Color.surfaceSoft,
                            in: RoundedRectangle(cornerRadius: 14)
                        )
                        .foregroundStyle(store.presetId == preset.id ? Color.brandNavy : .secondary)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var targetControl: some View {
        HStack {
            Text("Objetivo").font(.subheadline.weight(.medium)).foregroundStyle(.secondary)
            Spacer()
            Button { store.changeTarget(by: -1) } label: {
                Image(systemName: "minus").frame(width: 36, height: 36)
            }
            .buttonStyle(.bordered)
            .accessibilityLabel("Bajar temperatura objetivo")
            Text("\(Int(store.target)) °C")
                .font(.headline)
                .monospacedDigit()
                .frame(minWidth: 64)
                .foregroundStyle(Color.brandNavy)
            Button { store.changeTarget(by: 1) } label: {
                Image(systemName: "plus").frame(width: 36, height: 36)
            }
            .buttonStyle(.bordered)
            .accessibilityLabel("Subir temperatura objetivo")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.surfaceSoft, in: RoundedRectangle(cornerRadius: 18))
    }

    private var statusBadge: some View {
        let (text, color): (String, Color) = {
            if store.isDemo { return ("Demo", .orange) }
            if !store.reachable { return ("Sin internet", .brandRed) }
            if !(store.status?.connected ?? false) { return ("Apagado", .brandRed) }
            if store.probeMissing { return ("Sonda", .orange) }
            return ("Online", .brandGreen)
        }()
        return HStack(spacing: 5) {
            Circle().fill(color).frame(width: 7, height: 7)
            Text(text).font(.caption2.weight(.bold)).foregroundStyle(.secondary)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Color.surfaceSoft, in: Capsule())
    }
}

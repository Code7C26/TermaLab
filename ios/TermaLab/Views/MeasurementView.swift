import SwiftUI

struct MeasurementView: View {
    @Environment(CookingStore.self) private var store

    private var t: Strings { store.t }

    private var stateLabel: (String, Color) {
        if store.probeMissing { return (t.probeMissing, .brandRed) }
        guard let temperature = store.temperature else { return (t.noReading, .secondary) }
        switch Temperature.state(temperature, target: store.target) {
        case .heating: return (t.heating, .secondary)
        case .ready: return (t.ready, .ink)
        case .high: return (t.high, .brandRed)
        }
    }

    private var message: (String, String) {
        if store.reached { return (t.goalReached, t.takeItOut) }
        if !store.isDemo && !(store.status?.connected ?? false) {
            return (t.waitingModule, t.checkModule)
        }
        let remaining = store.target - (store.temperature ?? store.startTemperature)
        let title = remaining > Temperature.tolerance ? t.remaining(remaining) : t.targetReached
        return (title, store.active ? t.weWillNotify : t.chooseTarget)
    }

    private var buttonTitle: String {
        if store.isDemo {
            return store.active ? t.stopMeasurement : (store.reached ? t.measureAgain : t.startDemo)
        }
        return store.active ? (store.reached ? t.finishCooking : t.stopCooking) : t.startCooking
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
                        labelColor: stateLabel.1,
                        strings: t
                    )
                    .padding(.vertical, 8)

                    VStack(spacing: 4) {
                        Text(message.0).font(.body.weight(.medium)).foregroundStyle(Color.ink)
                        Text(message.1).font(.footnote).foregroundStyle(.secondary)
                        if store.active || store.elapsed > 0 {
                            Text("\(t.elapsed) · \(Temperature.elapsedText(store.elapsed))")
                                .font(.footnote)
                                .monospacedDigit()
                                .foregroundStyle(.secondary)
                        }
                    }
                    .multilineTextAlignment(.center)

                    targetControl

                    Button { store.toggleCooking() } label: {
                        Text(buttonTitle)
                            .font(.body.weight(.medium))
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .foregroundStyle(store.active ? Color.ink : Color(uiColor: .systemBackground))
                            .background(store.active ? Color.clear : Color.ink, in: RoundedRectangle(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.ink, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .disabled(store.busy)

                    if !store.isDemo && store.history.count > 1 {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(t.lastHour).font(.subheadline.weight(.medium)).foregroundStyle(Color.ink)
                            HistoryChart(points: store.history, target: store.target, strings: t)
                        }
                        .padding(16)
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.line, lineWidth: 1))
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
            Text(store.isDemo ? t.demoHeader : store.deviceName.uppercased())
                .font(.caption.weight(.medium))
                .tracking(1)
                .foregroundStyle(.secondary)
            Text(t.headline)
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(Color.ink)
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
                    Text(t.presets[preset.id] ?? preset.label)
                        .font(.footnote.weight(.medium))
                        .frame(maxWidth: .infinity, minHeight: 42)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(store.presetId == preset.id ? Color.ink : Color.line, lineWidth: 1)
                        )
                        .foregroundStyle(store.presetId == preset.id ? Color.ink : .secondary)
                        .contentShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var targetControl: some View {
        HStack {
            Text(t.target).font(.subheadline.weight(.medium)).foregroundStyle(.secondary)
            Spacer()
            Button { store.changeTarget(by: -1) } label: {
                Image(systemName: "minus")
                    .frame(width: 36, height: 36)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.line, lineWidth: 1))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(t.targetDown)
            Text("\(Int(store.target)) °C")
                .font(.body.weight(.medium))
                .monospacedDigit()
                .frame(minWidth: 64)
                .foregroundStyle(Color.ink)
            Button { store.changeTarget(by: 1) } label: {
                Image(systemName: "plus")
                    .frame(width: 36, height: 36)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.line, lineWidth: 1))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(t.targetUp)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.line, lineWidth: 1))
    }

    private var statusBadge: some View {
        let (text, color): (String, Color) = {
            if store.isDemo { return (t.badgeDemo, .secondary) }
            if !store.reachable { return (t.badgeNoInternet, .brandRed) }
            if !(store.status?.connected ?? false) { return (t.badgeOff, .brandRed) }
            if store.probeMissing { return (t.badgeProbe, .brandRed) }
            return ("Online", .ink)
        }()
        return HStack(spacing: 5) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(text).font(.caption2.weight(.medium)).foregroundStyle(.secondary)
        }
    }
}

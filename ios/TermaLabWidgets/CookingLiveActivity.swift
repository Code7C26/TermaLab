import ActivityKit
import SwiftUI
import WidgetKit

/// Actividad en vivo de la cocción: pantalla bloqueada y Dynamic Island.
struct CookingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CookingActivityAttributes.self) { context in
            CookingLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(CookingFormat.temperature(context.state.temperature), systemImage: "thermometer.medium")
                        .font(.title3.weight(.semibold))
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.attributes.labelTarget) \(CookingFormat.degrees(context.state.target))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        ProgressView(value: CookingFormat.progress(context))
                            .tint(context.state.reached ? Color.green : Color.orange)
                        Text(CookingFormat.status(context))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.reached ? "checkmark.circle.fill" : "thermometer.medium")
                    .foregroundStyle(context.state.reached ? Color.green : Color.orange)
            } compactTrailing: {
                Text(CookingFormat.degrees(context.state.temperature ?? context.state.target))
                    .monospacedDigit()
            } minimal: {
                Image(systemName: context.state.reached ? "checkmark.circle.fill" : "thermometer.medium")
                    .foregroundStyle(context.state.reached ? Color.green : Color.orange)
            }
        }
    }
}

/// Vista de la pantalla bloqueada.
struct CookingLockScreenView: View {
    let context: ActivityViewContext<CookingActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center) {
                Text(CookingFormat.temperature(context.state.temperature))
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(CookingFormat.status(context))
                        .font(.subheadline.weight(.semibold))
                    if !context.state.reached {
                        Text(context.attributes.startedAt, style: .timer)
                            .font(.subheadline)
                            .monospacedDigit()
                            .multilineTextAlignment(.trailing)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            ProgressView(value: CookingFormat.progress(context))
                .tint(context.state.reached ? Color.green : Color.orange)
            HStack {
                Text("TermaLab · \(context.attributes.deviceName)")
                Spacer()
                Text("\(context.attributes.labelTarget) \(CookingFormat.degrees(context.state.target))")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(16)
    }
}

/// Textos y cálculos compartidos por las vistas de la actividad.
enum CookingFormat {
    static func temperature(_ value: Double?) -> String {
        guard let value else { return "-- °C" }
        return String(format: "%.1f °C", value)
    }

    static func degrees(_ value: Double) -> String {
        String(format: "%.0f°", value)
    }

    static func progress(_ context: ActivityViewContext<CookingActivityAttributes>) -> Double {
        if context.state.reached { return 1 }
        guard let temperature = context.state.temperature else { return 0 }
        let start = context.attributes.startTemperature
        let target = context.state.target
        guard target > start else { return 1 }
        return min(max((temperature - start) / (target - start), 0), 1)
    }

    static func status(_ context: ActivityViewContext<CookingActivityAttributes>) -> String {
        if context.state.reached { return context.attributes.labelReady }
        if context.isStale || !context.state.online { return context.attributes.labelOffline }
        return context.attributes.labelCooking
    }
}

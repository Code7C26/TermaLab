import SwiftUI

/// Medidor circular minimalista: aro gris y punto de la temperatura, escala 0 a 110 °C.
struct GaugeView: View {
    let temperature: Double?
    let target: Double
    let label: String
    let labelColor: Color
    var strings: Strings = .es

    private let sweep = 300.0 // grados del arco

    private var fraction: Double { min(max((temperature ?? 0) / 110, 0), 1) }
    private var targetFraction: Double { min(max(target / 110, 0), 1) }

    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0, to: sweep / 360)
                .stroke(Color.line, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(90 + (360 - sweep) / 2))

            // marca del objetivo
            Capsule()
                .fill(Color.secondary)
                .frame(width: 2, height: 14)
                .offset(y: -128)
                .rotationEffect(.degrees(-sweep / 2 + targetFraction * sweep))

            // indicador de la temperatura actual
            Circle()
                .fill(Color.ink)
                .overlay(Circle().stroke(Color(uiColor: .systemBackground), lineWidth: 3))
                .frame(width: 14, height: 14)
                .offset(y: -128)
                .rotationEffect(.degrees(-sweep / 2 + fraction * sweep))
                .animation(.easeOut(duration: 0.7), value: fraction)

            VStack(spacing: 4) {
                Text(strings.probeLabel)
                    .font(.caption2.weight(.medium))
                    .tracking(1.2)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(temperature.map { String(format: "%.1f", $0) } ?? "--")
                        .font(.system(size: 64, weight: .light))
                        .monospacedDigit()
                        .foregroundStyle(Color.ink)
                        .contentTransition(.numericText())
                    Text("°C")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }
                Text(label)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(labelColor)
            }
        }
        .frame(width: 256, height: 256)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            temperature.map { strings.currentTemperature(String(format: "%.1f", $0)) } ?? strings.noProbeReading
        )
    }
}

#Preview {
    GaugeView(temperature: 52.4, target: 63, label: "Cocinando", labelColor: .secondary)
}

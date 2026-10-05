import SwiftUI

/// Medidor circular: azul frío a rojo caliente, escala 0 a 110 °C.
struct GaugeView: View {
    let temperature: Double?
    let target: Double
    let label: String
    let labelColor: Color

    private let sweep = 300.0 // grados del arco

    private var fraction: Double { min(max((temperature ?? 0) / 110, 0), 1) }
    private var targetFraction: Double { min(max(target / 110, 0), 1) }

    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0, to: sweep / 360)
                .stroke(Color.surfaceSoft, style: StrokeStyle(lineWidth: 18, lineCap: .round))
                .rotationEffect(.degrees(90 + (360 - sweep) / 2))
            Circle()
                .trim(from: 0, to: sweep / 360)
                .stroke(
                    AngularGradient(
                        colors: [.blue, .brandCyan, .yellow, .brandOrange, .brandRed],
                        center: .center,
                        startAngle: .degrees(0),
                        endAngle: .degrees(sweep)
                    ),
                    style: StrokeStyle(lineWidth: 18, lineCap: .round)
                )
                .rotationEffect(.degrees(90 + (360 - sweep) / 2))
                .opacity(0.9)

            // marca del objetivo
            Capsule()
                .fill(Color.brandNavy)
                .frame(width: 4, height: 26)
                .offset(y: -128)
                .rotationEffect(.degrees(-sweep / 2 + targetFraction * sweep))

            // indicador de la temperatura actual
            Circle()
                .fill(.white)
                .overlay(Circle().stroke(Color.brandNavy, lineWidth: 4))
                .frame(width: 20, height: 20)
                .shadow(color: .black.opacity(0.2), radius: 4, y: 2)
                .offset(y: -128)
                .rotationEffect(.degrees(-sweep / 2 + fraction * sweep))
                .animation(.easeOut(duration: 0.7), value: fraction)

            VStack(spacing: 4) {
                Text("SONDA INTERNA")
                    .font(.caption2.weight(.heavy))
                    .tracking(1.2)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(temperature.map { String(format: "%.1f", $0) } ?? "--")
                        .font(.system(size: 64, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Color.brandNavy)
                        .contentTransition(.numericText())
                    Text("°C")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }
                Text(label)
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(labelColor)
            }
        }
        .frame(width: 256, height: 256)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            temperature.map { "Temperatura actual \(String(format: "%.1f", $0)) grados" } ?? "Sin lectura de la sonda"
        )
    }
}

#Preview {
    GaugeView(temperature: 52.4, target: 63, label: "Cocinando", labelColor: .brandOrange)
}

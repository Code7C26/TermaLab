import Charts
import SwiftUI

/// Curva de la última hora con la línea del objetivo.
struct HistoryChart: View {
    let points: [HistoryPoint]
    let target: Double

    var body: some View {
        Chart {
            ForEach(points.filter { $0.temperature != nil }) { point in
                LineMark(
                    x: .value("Hora", point.date),
                    y: .value("°C", point.temperature ?? 0)
                )
                .interpolationMethod(.monotone)
                .foregroundStyle(Color.brandOrange)
            }
            RuleMark(y: .value("Objetivo", target))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                .foregroundStyle(Color.brandNavy.opacity(0.6))
                .annotation(position: .top, alignment: .leading) {
                    Text("Objetivo \(Int(target)) °C")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.hour().minute())
            }
        }
        .frame(height: 160)
    }
}

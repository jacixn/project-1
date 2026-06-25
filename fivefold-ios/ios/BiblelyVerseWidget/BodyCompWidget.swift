//
//  BodyCompWidget.swift
//  BiblelyVerseWidget
//
//  Shows key body composition metrics (health score, body age, BMI, body fat, muscle).
//  Data is written by the React Native app via WidgetBridge -> shared UserDefaults.
//

import WidgetKit
import SwiftUI

// MARK: - Data Model

struct BodyCompData: Codable {
    let healthScore: Int
    let bodyAge: Int
    let bmi: Double
    let bmiStatus: String
    let bodyFat: Double
    let bodyFatStatus: String
    let muscleRate: Double
    let muscleStatus: String
    let weight: Double
    let hasProfile: Bool
    let lastUpdated: String
}

// MARK: - Timeline Entry

struct BodyCompEntry: TimelineEntry {
    let date: Date
    let data: BodyCompData?
}

// MARK: - Timeline Provider

struct BodyCompProvider: TimelineProvider {

    private static let suiteName = "group.com.jesusxoi.biblely"
    private static let key = "widgetBodyCompData"

    private func loadData() -> BodyCompData? {
        guard let defaults = UserDefaults(suiteName: BodyCompProvider.suiteName),
              let jsonString = defaults.string(forKey: BodyCompProvider.key),
              let jsonData = jsonString.data(using: .utf8),
              let bodyComp = try? JSONDecoder().decode(BodyCompData.self, from: jsonData) else {
            return nil
        }
        return bodyComp
    }

    func placeholder(in context: Context) -> BodyCompEntry {
        BodyCompEntry(date: Date(), data: BodyCompData(
            healthScore: 78,
            bodyAge: 27,
            bmi: 23.4,
            bmiStatus: "Normal",
            bodyFat: 18.5,
            bodyFatStatus: "Fitness",
            muscleRate: 36.2,
            muscleStatus: "Normal",
            weight: 74.0,
            hasProfile: true,
            lastUpdated: ""
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (BodyCompEntry) -> Void) {
        let data = loadData() ?? (context.isPreview ? placeholder(in: context).data : nil)
        completion(BodyCompEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BodyCompEntry>) -> Void) {
        let entry = BodyCompEntry(date: Date(), data: loadData())
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }
}

// MARK: - Shared status color (private, prefixed to avoid symbol collisions)

private func bodyCompStatusColor(_ status: String) -> Color {
    switch status.lowercased() {
    case "normal", "fitness", "athletic", "healthy", "high", "very high", "well hydrated":
        return Color(hex: "34D399")
    case "overweight", "average", "elevated", "below average":
        return Color(hex: "FBBF24")
    case "obese", "above average":
        return Color(hex: "F87171")
    default:
        return .white
    }
}

// MARK: - Stat tile (private, prefixed)

private struct BodyCompStatTile: View {
    let label: String
    let value: String
    var status: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .bold))
                .tracking(0.5)
                .foregroundColor(.white.opacity(0.6))
            Text(value)
                .font(.system(size: 19, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            if let status = status {
                Text(status.uppercased())
                    .font(.system(size: 8, weight: .bold))
                    .tracking(0.3)
                    .foregroundColor(bodyCompStatusColor(status))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 9)
        .padding(.vertical, 8)
        .background(WidgetUI.tile)
    }
}

// MARK: - Empty state (private, prefixed)

private struct BodyCompEmptyView: View {
    var compact: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(icon: "heart.fill", title: "Body")
            Spacer(minLength: 0)
            Image(systemName: "figure.stand")
                .font(.system(size: compact ? 26 : 30, weight: .semibold))
                .foregroundColor(.white.opacity(0.85))
            Text("Set up profile")
                .font(.system(size: compact ? 13 : 15, weight: .bold))
                .foregroundColor(.white)
            Text(compact ? "Add your body data in the app." : "Add your body data in Fuel to see your health score and metrics.")
                .font(.system(size: compact ? 10 : 12, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// MARK: - Small Widget View

struct BodyCompWidgetSmallView: View {
    let entry: BodyCompEntry

    var body: some View {
        WidgetCanvas(WidgetUI.body) {
            if let data = entry.data, data.hasProfile {
                VStack(spacing: 8) {
                    WidgetHeader(icon: "heart.fill", title: "Body", trailing: String(format: "%.0f KG", data.weight))

                    Spacer(minLength: 0)

                    WidgetRing(progress: Double(min(data.healthScore, 100)) / 100.0, size: 78, line: 7, tint: .white) {
                        VStack(spacing: 0) {
                            Text("\(data.healthScore)")
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text("SCORE")
                                .font(.system(size: 7, weight: .bold))
                                .tracking(0.5)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }

                    Spacer(minLength: 0)

                    HStack(spacing: 0) {
                        bodyCompMini("\(data.bodyAge)", "AGE")
                        Spacer()
                        bodyCompMini(String(format: "%.1f", data.bmi), "BMI")
                        Spacer()
                        bodyCompMini(String(format: "%.0f%%", data.bodyFat), "FAT")
                    }
                }
                .padding(12)
            } else {
                BodyCompEmptyView(compact: true)
                    .padding(12)
            }
        }
    }

    private func bodyCompMini(_ value: String, _ label: String) -> some View {
        VStack(spacing: 1) {
            Text(value)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 8, weight: .bold))
                .tracking(0.4)
                .foregroundColor(.white.opacity(0.65))
        }
    }
}

// MARK: - Medium Widget View

struct BodyCompWidgetMediumView: View {
    let entry: BodyCompEntry

    var body: some View {
        WidgetCanvas(WidgetUI.body) {
            if let data = entry.data, data.hasProfile {
                VStack(spacing: 10) {
                    WidgetHeader(icon: "heart.fill", title: "Body", trailing: String(format: "%.0f KG", data.weight))

                    HStack(spacing: 14) {
                        VStack(spacing: 6) {
                            WidgetRing(progress: Double(min(data.healthScore, 100)) / 100.0, size: 86, line: 8, tint: .white) {
                                VStack(spacing: 0) {
                                    Text("\(data.healthScore)")
                                        .font(.system(size: 28, weight: .bold, design: .rounded))
                                        .foregroundColor(.white)
                                    Text("SCORE")
                                        .font(.system(size: 7, weight: .bold))
                                        .tracking(0.5)
                                        .foregroundColor(.white.opacity(0.7))
                                }
                            }
                            Text("Body Age \(data.bodyAge)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white.opacity(0.85))
                        }

                        VStack(spacing: 8) {
                            HStack(spacing: 8) {
                                BodyCompStatTile(label: "BMI", value: String(format: "%.1f", data.bmi), status: data.bmiStatus)
                                BodyCompStatTile(label: "Body Fat", value: String(format: "%.1f%%", data.bodyFat), status: data.bodyFatStatus)
                            }
                            HStack(spacing: 8) {
                                BodyCompStatTile(label: "Muscle", value: String(format: "%.1f%%", data.muscleRate), status: data.muscleStatus)
                                BodyCompStatTile(label: "Weight", value: String(format: "%.0f kg", data.weight))
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }

                    Spacer(minLength: 0)
                }
                .padding(16)
            } else {
                BodyCompEmptyView(compact: false)
                    .padding(16)
            }
        }
    }
}

// MARK: - Main Widget View

struct BodyCompWidgetView: View {
    var entry: BodyCompEntry
    @Environment(\.widgetFamily) var family

    private var deepLink: URL? {
        URL(string: "biblely://bodycomp")
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                BodyCompWidgetSmallView(entry: entry)
            case .systemMedium:
                BodyCompWidgetMediumView(entry: entry)
            default:
                BodyCompWidgetSmallView(entry: entry)
            }
        }
        .widgetURL(deepLink)
    }
}

// MARK: - Widget Configuration

struct BodyCompWidget: Widget {
    let kind: String = "BiblelyBodyCompWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BodyCompProvider()) { entry in
            if #available(iOS 17.0, *) {
                BodyCompWidgetView(entry: entry)
                    .containerBackground(for: .widget) { ZStack { WidgetUI.body; WidgetUI.sheen } }
            } else {
                BodyCompWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Body Composition")
        .description("See your health score and key body metrics at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

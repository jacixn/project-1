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

// MARK: - Score Ring View

struct ScoreRingView: View {
    let score: Int
    let ringSize: CGFloat
    let lineWidth: CGFloat

    private var progress: Double {
        Double(min(score, 100)) / 100.0
    }

    private var scoreColor: Color {
        if score >= 80 { return Color(red: 0.06, green: 0.72, blue: 0.51) }
        if score >= 60 { return Color(red: 0.96, green: 0.62, blue: 0.04) }
        return Color(red: 0.94, green: 0.27, blue: 0.27)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.08), lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(
                    scoreColor,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            VStack(spacing: 1) {
                Text("\(score)")
                    .font(.system(size: ringSize * 0.28, weight: .bold, design: .rounded))
                    .foregroundColor(scoreColor)
                Text("SCORE")
                    .font(.system(size: ringSize * 0.08, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
            }
        }
        .frame(width: ringSize, height: ringSize)
    }
}

// MARK: - Small Widget View

struct BodyCompWidgetSmallView: View {
    let entry: BodyCompEntry

    var body: some View {
        if let data = entry.data, data.hasProfile {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.07, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.22)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 6) {
                    HStack {
                        Image("WidgetLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 12, height: 12)
                            .opacity(0.6)
                        Text("Body")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.39, green: 0.40, blue: 0.95))
                        Spacer()
                    }

                    Spacer(minLength: 0)

                    ScoreRingView(
                        score: data.healthScore,
                        ringSize: 76,
                        lineWidth: 6
                    )

                    Spacer(minLength: 0)

                    HStack {
                        VStack(spacing: 1) {
                            Text("\(data.bodyAge)")
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text("Age")
                                .font(.system(size: 8, weight: .medium))
                                .foregroundColor(.white.opacity(0.4))
                        }
                        Spacer()
                        VStack(spacing: 1) {
                            Text(String(format: "%.1f", data.bmi))
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text("BMI")
                                .font(.system(size: 8, weight: .medium))
                                .foregroundColor(.white.opacity(0.4))
                        }
                        Spacer()
                        VStack(spacing: 1) {
                            Text(String(format: "%.0f%%", data.bodyFat))
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text("Fat")
                                .font(.system(size: 8, weight: .medium))
                                .foregroundColor(.white.opacity(0.4))
                        }
                    }
                }
                .padding(12)
            }
        } else {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.07, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.22)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 8) {
                    Image(systemName: "figure.stand")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 0.39, green: 0.40, blue: 0.95).opacity(0.6))
                    Text("Set up profile")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Text("Add your body data\nin the app")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                        .multilineTextAlignment(.center)
                }
                .padding(12)
            }
        }
    }
}

// MARK: - Medium Widget View

struct BodyCompWidgetMediumView: View {
    let entry: BodyCompEntry

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "normal", "fitness", "athletic", "healthy", "high", "very high", "well hydrated":
            return Color(red: 0.06, green: 0.72, blue: 0.51)
        case "overweight", "average", "elevated", "below average":
            return Color(red: 0.96, green: 0.62, blue: 0.04)
        case "obese", "above average":
            return Color(red: 0.94, green: 0.27, blue: 0.27)
        default:
            return Color(red: 0.23, green: 0.51, blue: 0.96)
        }
    }

    var body: some View {
        if let data = entry.data, data.hasProfile {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.07, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.22)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 16) {
                    // Left: Health score ring
                    VStack(spacing: 6) {
                        ScoreRingView(
                            score: data.healthScore,
                            ringSize: 86,
                            lineWidth: 7
                        )
                        Text("Health Score")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(.white.opacity(0.4))
                    }

                    // Right: Metrics grid
                    VStack(spacing: 0) {
                        HStack {
                            Image("WidgetLogo")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 12, height: 12)
                                .opacity(0.6)
                            Text("Body")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color(red: 0.39, green: 0.40, blue: 0.95))
                            Spacer()
                            Text(String(format: "%.0f kg", data.weight))
                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                .foregroundColor(.white.opacity(0.4))
                        }
                        .padding(.bottom, 8)

                        // Metric rows
                        HStack(spacing: 12) {
                            MetricBadge(label: "Body Age", value: "\(data.bodyAge)", color: data.bodyAge <= 35 ? Color(red: 0.23, green: 0.51, blue: 0.96) : Color(red: 0.96, green: 0.62, blue: 0.04))
                            MetricBadge(label: "BMI", value: String(format: "%.1f", data.bmi), status: data.bmiStatus, color: statusColor(data.bmiStatus))
                        }
                        .padding(.bottom, 6)

                        HStack(spacing: 12) {
                            MetricBadge(label: "Body Fat", value: String(format: "%.1f%%", data.bodyFat), status: data.bodyFatStatus, color: statusColor(data.bodyFatStatus))
                            MetricBadge(label: "Muscle", value: String(format: "%.1f%%", data.muscleRate), status: data.muscleStatus, color: statusColor(data.muscleStatus))
                        }

                        Spacer(minLength: 0)
                    }
                }
                .padding(14)
            }
        } else {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.07, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.22)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 16) {
                    Image(systemName: "figure.stand")
                        .font(.system(size: 36))
                        .foregroundColor(Color(red: 0.39, green: 0.40, blue: 0.95).opacity(0.6))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Body Composition")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white.opacity(0.8))
                        Text("Set up your profile in Fuel to see your health score and body metrics.")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.4))
                            .lineLimit(2)
                    }
                }
                .padding(16)
            }
        }
    }
}

// MARK: - Metric Badge (reusable for medium view)

struct MetricBadge: View {
    let label: String
    let value: String
    var status: String? = nil
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundColor(color)
            if let status = status {
                Text(status)
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundColor(color.opacity(0.8))
                    .textCase(.uppercase)
            }
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(Color.white.opacity(0.04))
        .cornerRadius(10)
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
                    .containerBackground(.clear, for: .widget)
            } else {
                BodyCompWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Body Composition")
        .description("See your health score and key body metrics at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

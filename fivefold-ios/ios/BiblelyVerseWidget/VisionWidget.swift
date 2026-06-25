//
//  VisionWidget.swift
//  BiblelyVerseWidget
//
//  Shows active life goals / visions with progress.
//  Data is written by the React Native app via WidgetBridge -> shared UserDefaults.
//

import WidgetKit
import SwiftUI

// MARK: - Data Models

struct VisionItem: Codable {
    let title: String
    let category: String
    let progressPercent: Int
    let timeRemaining: String
}

struct VisionWidgetData: Codable {
    let visions: [VisionItem]
    let totalActive: Int
    let totalAchieved: Int
    let lastUpdated: String
}

// MARK: - Timeline Entry

struct VisionEntry: TimelineEntry {
    let date: Date
    let data: VisionWidgetData?
}

// MARK: - Timeline Provider

struct VisionProvider: TimelineProvider {

    private static let suiteName = "group.com.jesusxoi.biblely"
    private static let key = "widgetVisionData"

    private func loadData() -> VisionWidgetData? {
        guard let defaults = UserDefaults(suiteName: VisionProvider.suiteName),
              let jsonString = defaults.string(forKey: VisionProvider.key),
              let jsonData = jsonString.data(using: .utf8),
              let visionData = try? JSONDecoder().decode(VisionWidgetData.self, from: jsonData) else {
            return nil
        }
        return visionData
    }

    func placeholder(in context: Context) -> VisionEntry {
        VisionEntry(date: Date(), data: VisionWidgetData(
            visions: [
                VisionItem(title: "Run a marathon", category: "health", progressPercent: 65, timeRemaining: "8m left"),
                VisionItem(title: "Learn Spanish", category: "education", progressPercent: 30, timeRemaining: "1y 4m left"),
                VisionItem(title: "Start a business", category: "career", progressPercent: 15, timeRemaining: "2y left"),
            ],
            totalActive: 3,
            totalAchieved: 1,
            lastUpdated: ""
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (VisionEntry) -> Void) {
        let data = loadData() ?? (context.isPreview ? placeholder(in: context).data : nil)
        completion(VisionEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VisionEntry>) -> Void) {
        let entry = VisionEntry(date: Date(), data: loadData())
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }
}

// MARK: - Category Color Helper

private func categoryColor(for category: String) -> Color {
    switch category.lowercased() {
    case "faith":      return Color(red: 0.55, green: 0.35, blue: 0.85)
    case "career":     return Color(red: 0.20, green: 0.50, blue: 0.95)
    case "health":     return Color(red: 0.06, green: 0.72, blue: 0.51)
    case "family":     return Color(red: 0.95, green: 0.40, blue: 0.55)
    case "education":  return Color(red: 1.00, green: 0.60, blue: 0.20)
    case "finance":    return Color(red: 0.06, green: 0.72, blue: 0.51)
    default:           return Color(red: 0.55, green: 0.55, blue: 0.60)
    }
}

// MARK: - Small Widget View

struct VisionWidgetSmallView: View {
    let entry: VisionEntry

    var body: some View {
        WidgetCanvas(WidgetUI.vision) {
            if let data = entry.data, data.totalActive > 0 {
                let hero = data.visions.first
                VStack(alignment: .leading, spacing: 10) {
                    WidgetHeader(icon: "sparkles", title: "Vision")

                    if let hero = hero {
                        HStack(alignment: .center, spacing: 12) {
                            WidgetRing(
                                progress: Double(min(hero.progressPercent, 100)) / 100.0,
                                size: 52,
                                line: 6,
                                tint: .white
                            ) {
                                Text("\(hero.progressPercent)%")
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            }

                            VStack(alignment: .leading, spacing: 3) {
                                Text(hero.title)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                                    .lineLimit(2)
                                WidgetPill(text: hero.category)
                            }
                            Spacer(minLength: 0)
                        }

                        Spacer(minLength: 0)

                        HStack {
                            Text(hero.timeRemaining)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                            Spacer()
                            Text("\(data.totalActive) active")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    } else {
                        Spacer(minLength: 0)
                        Text("\(data.totalActive)")
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text(data.totalActive == 1 ? "active goal" : "active goals")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                .padding(12)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    WidgetHeader(icon: "sparkles", title: "Vision")
                    Spacer(minLength: 0)
                    Image(systemName: "scope")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundColor(.white.opacity(0.85))
                    Text("Set your vision")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                    Text("Open the app to add goals")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(12)
            }
        }
    }
}

// MARK: - Medium Widget View

struct VisionWidgetMediumView: View {
    let entry: VisionEntry

    var body: some View {
        WidgetCanvas(WidgetUI.vision) {
            if let data = entry.data, data.totalActive > 0 {
                VStack(alignment: .leading, spacing: 8) {
                    WidgetHeader(
                        icon: "sparkles",
                        title: "Vision",
                        trailing: "\(data.totalActive) active"
                    )

                    let visibleVisions = Array(data.visions.prefix(2))
                    VStack(spacing: 7) {
                        ForEach(Array(visibleVisions.enumerated()), id: \.offset) { _, vision in
                            VisionRowTile(vision: vision)
                        }
                    }

                    Spacer(minLength: 0)

                    if data.totalAchieved > 0 || data.totalActive > 2 {
                        HStack {
                            if data.totalAchieved > 0 {
                                Text("\(data.totalAchieved) achieved")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                            Spacer()
                            if data.totalActive > 2 {
                                Text("and \(data.totalActive - 2) more")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }
                    }
                }
                .padding(16)
            } else {
                HStack(spacing: 16) {
                    Image(systemName: "scope")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundColor(.white.opacity(0.85))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("What's your vision?")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                        Text("Open the app to set life goals and track your progress towards them.")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                            .lineLimit(2)
                    }
                    Spacer(minLength: 0)
                }
                .padding(16)
            }
        }
    }
}

// MARK: - Vision Row Tile

private struct VisionRowTile: View {
    let vision: VisionItem

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(vision.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Spacer()
                Text("\(vision.progressPercent)%")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }

            WidgetBar(progress: Double(min(vision.progressPercent, 100)) / 100.0, height: 4)

            HStack {
                WidgetPill(text: vision.category)
                Spacer()
                Text(vision.timeRemaining)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.white.opacity(0.65))
            }
        }
        .padding(9)
        .background(WidgetUI.tile)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - Main Widget View

struct VisionWidgetView: View {
    var entry: VisionEntry
    @Environment(\.widgetFamily) var family

    private var deepLink: URL? {
        URL(string: "biblely://vision")
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                VisionWidgetSmallView(entry: entry)
            case .systemMedium:
                VisionWidgetMediumView(entry: entry)
            default:
                VisionWidgetSmallView(entry: entry)
            }
        }
        .widgetURL(deepLink)
    }
}

// MARK: - Widget Configuration

struct VisionWidget: Widget {
    let kind: String = "BiblelyVisionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VisionProvider()) { entry in
            if #available(iOS 17.0, *) {
                VisionWidgetView(entry: entry)
                    .containerBackground(for: .widget) { ZStack { WidgetUI.vision; WidgetUI.sheen } }
            } else {
                VisionWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Vision")
        .description("See your life goals and track progress at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

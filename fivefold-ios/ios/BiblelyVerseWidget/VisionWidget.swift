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
        if let data = entry.data, data.totalActive > 0 {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.06, blue: 0.16),
                        Color(red: 0.14, green: 0.10, blue: 0.24)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image("WidgetLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 12, height: 12)
                            .opacity(0.6)
                        Text("Vision")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.55, green: 0.35, blue: 0.85))
                        Spacer()
                    }

                    Spacer(minLength: 0)

                    Text("\(data.totalActive)")
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Text(data.totalActive == 1 ? "active goal" : "active goals")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.5))

                    // Nearest goal preview
                    if let first = data.visions.first {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(first.title)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                                .lineLimit(1)

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color.white.opacity(0.1))
                                        .frame(height: 4)
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(categoryColor(for: first.category))
                                        .frame(width: geo.size.width * CGFloat(min(first.progressPercent, 100)) / 100.0, height: 4)
                                }
                            }
                            .frame(height: 4)
                        }
                        .padding(.top, 2)
                    }

                    if data.totalAchieved > 0 {
                        Text("\(data.totalAchieved) achieved")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.green.opacity(0.6))
                    }
                }
                .padding(12)
            }
        } else {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.06, blue: 0.16),
                        Color(red: 0.14, green: 0.10, blue: 0.24)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 8) {
                    Image(systemName: "scope")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 0.55, green: 0.35, blue: 0.85).opacity(0.6))
                    Text("Set your vision")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Text("Open the app to add goals")
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

struct VisionWidgetMediumView: View {
    let entry: VisionEntry

    var body: some View {
        if let data = entry.data, data.totalActive > 0 {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.06, blue: 0.16),
                        Color(red: 0.14, green: 0.10, blue: 0.24)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Image("WidgetLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 12, height: 12)
                            .opacity(0.6)
                        Text("Vision")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.55, green: 0.35, blue: 0.85))
                        Spacer()
                        if data.totalAchieved > 0 {
                            Text("\(data.totalAchieved) achieved")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.green.opacity(0.6))
                        }
                        Text("\(data.totalActive) goal\(data.totalActive == 1 ? "" : "s")")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.bottom, 8)

                    let visibleVisions = Array(data.visions.prefix(3))
                    ForEach(Array(visibleVisions.enumerated()), id: \.offset) { index, vision in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(vision.title)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.white.opacity(0.9))
                                    .lineLimit(1)
                                Spacer()
                                Text("\(vision.progressPercent)%")
                                    .font(.system(size: 11, weight: .bold, design: .rounded))
                                    .foregroundColor(categoryColor(for: vision.category))
                            }

                            HStack(spacing: 0) {
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        RoundedRectangle(cornerRadius: 2)
                                            .fill(Color.white.opacity(0.08))
                                            .frame(height: 4)
                                        RoundedRectangle(cornerRadius: 2)
                                            .fill(categoryColor(for: vision.category))
                                            .frame(width: geo.size.width * CGFloat(min(vision.progressPercent, 100)) / 100.0, height: 4)
                                    }
                                }
                                .frame(height: 4)

                                Text(vision.timeRemaining)
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundColor(.white.opacity(0.35))
                                    .frame(width: 65, alignment: .trailing)
                            }
                        }
                        .padding(.vertical, 4)

                        if index < visibleVisions.count - 1 {
                            Divider()
                                .background(Color.white.opacity(0.06))
                        }
                    }

                    if data.totalActive > 3 {
                        Text("and \(data.totalActive - 3) more...")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.3))
                            .padding(.top, 4)
                    }

                    Spacer(minLength: 0)
                }
                .padding(14)
            }
        } else {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.06, blue: 0.16),
                        Color(red: 0.14, green: 0.10, blue: 0.24)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 16) {
                    Image(systemName: "scope")
                        .font(.system(size: 36))
                        .foregroundColor(Color(red: 0.55, green: 0.35, blue: 0.85).opacity(0.6))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("What's your vision?")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white.opacity(0.8))
                        Text("Open the app to set life goals and track your progress towards them.")
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
                    .containerBackground(.clear, for: .widget)
            } else {
                VisionWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Vision")
        .description("See your life goals and track progress at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

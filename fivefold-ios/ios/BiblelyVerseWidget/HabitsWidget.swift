//
//  HabitsWidget.swift
//  BiblelyVerseWidget
//
//  Shows today's habit check-in progress.
//  Data is written by the React Native app via WidgetBridge -> shared UserDefaults.
//

import WidgetKit
import SwiftUI

// MARK: - Data Models

struct HabitItem: Codable {
    let name: String
    let color: String
    let currentStreak: Int
    let isCheckedIn: Bool
}

struct HabitsWidgetData: Codable {
    let habits: [HabitItem]
    let totalCount: Int
    let completedToday: Int
    let bestStreak: Int
    let lastUpdated: String
}

// MARK: - Timeline Entry

struct HabitsEntry: TimelineEntry {
    let date: Date
    let data: HabitsWidgetData?
}

// MARK: - Timeline Provider

struct HabitsProvider: TimelineProvider {

    private static let suiteName = "group.com.jesusxoi.biblely"
    private static let key = "widgetHabitsData"

    private func loadData() -> HabitsWidgetData? {
        guard let defaults = UserDefaults(suiteName: HabitsProvider.suiteName),
              let jsonString = defaults.string(forKey: HabitsProvider.key),
              let jsonData = jsonString.data(using: .utf8),
              let habitsData = try? JSONDecoder().decode(HabitsWidgetData.self, from: jsonData) else {
            return nil
        }
        return habitsData
    }

    func placeholder(in context: Context) -> HabitsEntry {
        HabitsEntry(date: Date(), data: HabitsWidgetData(
            habits: [
                HabitItem(name: "Exercise", color: "#4CAF50", currentStreak: 12, isCheckedIn: true),
                HabitItem(name: "Read Bible", color: "#2196F3", currentStreak: 7, isCheckedIn: true),
                HabitItem(name: "No Smoking", color: "#9C27B0", currentStreak: 30, isCheckedIn: false),
            ],
            totalCount: 3,
            completedToday: 2,
            bestStreak: 30,
            lastUpdated: ""
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (HabitsEntry) -> Void) {
        let data = loadData() ?? (context.isPreview ? placeholder(in: context).data : nil)
        completion(HabitsEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HabitsEntry>) -> Void) {
        let entry = HabitsEntry(date: Date(), data: loadData())
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }
}

// MARK: - Color Helper

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgbValue: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgbValue)
        self.init(
            red: Double((rgbValue >> 16) & 0xFF) / 255.0,
            green: Double((rgbValue >> 8) & 0xFF) / 255.0,
            blue: Double(rgbValue & 0xFF) / 255.0
        )
    }
}

// MARK: - Small Widget View

struct HabitsWidgetSmallView: View {
    let entry: HabitsEntry

    var body: some View {
        if let data = entry.data, data.totalCount > 0 {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.06, green: 0.10, blue: 0.07),
                        Color(red: 0.10, green: 0.15, blue: 0.10)
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
                        Text("Habits")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.30, green: 0.69, blue: 0.31))
                        Spacer()
                    }

                    Spacer(minLength: 0)

                    Text("\(data.completedToday)/\(data.totalCount)")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Text("done today")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.5))

                    if data.bestStreak > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "flame.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.orange)
                            Text("\(data.bestStreak) day streak")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.orange.opacity(0.8))
                        }
                        .padding(.top, 2)
                    }
                }
                .padding(12)
            }
        } else {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.06, green: 0.10, blue: 0.07),
                        Color(red: 0.10, green: 0.15, blue: 0.10)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 0.30, green: 0.69, blue: 0.31).opacity(0.6))
                    Text("No habits yet")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Text("Add habits in the app")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                }
                .padding(12)
            }
        }
    }
}

// MARK: - Medium Widget View

struct HabitsWidgetMediumView: View {
    let entry: HabitsEntry

    var body: some View {
        if let data = entry.data, data.totalCount > 0 {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.06, green: 0.10, blue: 0.07),
                        Color(red: 0.10, green: 0.15, blue: 0.10)
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
                        Text("Habits")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.30, green: 0.69, blue: 0.31))
                        Spacer()
                        Text("\(data.completedToday)/\(data.totalCount) done")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.bottom, 8)

                    let visibleHabits = Array(data.habits.prefix(4))
                    ForEach(Array(visibleHabits.enumerated()), id: \.offset) { index, habit in
                        HStack(spacing: 8) {
                            // Check-in indicator
                            Image(systemName: habit.isCheckedIn ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 14))
                                .foregroundColor(habit.isCheckedIn ? Color(hex: habit.color) : .white.opacity(0.2))

                            Text(habit.name)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(habit.isCheckedIn ? .white.opacity(0.9) : .white.opacity(0.5))
                                .lineLimit(1)

                            Spacer()

                            if habit.currentStreak > 0 {
                                HStack(spacing: 2) {
                                    Image(systemName: "flame.fill")
                                        .font(.system(size: 9))
                                        .foregroundColor(.orange.opacity(0.7))
                                    Text("\(habit.currentStreak)")
                                        .font(.system(size: 10, weight: .bold, design: .rounded))
                                        .foregroundColor(.orange.opacity(0.7))
                                }
                            }
                        }
                        .padding(.vertical, 4)

                        if index < visibleHabits.count - 1 {
                            Divider()
                                .background(Color.white.opacity(0.06))
                        }
                    }

                    if data.totalCount > 4 {
                        Text("and \(data.totalCount - 4) more...")
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
                        Color(red: 0.06, green: 0.10, blue: 0.07),
                        Color(red: 0.10, green: 0.15, blue: 0.10)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 16) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 36))
                        .foregroundColor(Color(red: 0.30, green: 0.69, blue: 0.31).opacity(0.6))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Build Your Habits")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white.opacity(0.8))
                        Text("Open the app to create habits and start tracking your streaks.")
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

struct HabitsWidgetView: View {
    var entry: HabitsEntry
    @Environment(\.widgetFamily) var family

    private var deepLink: URL? {
        URL(string: "biblely://habits")
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                HabitsWidgetSmallView(entry: entry)
            case .systemMedium:
                HabitsWidgetMediumView(entry: entry)
            default:
                HabitsWidgetSmallView(entry: entry)
            }
        }
        .widgetURL(deepLink)
    }
}

// MARK: - Widget Configuration

struct HabitsWidget: Widget {
    let kind: String = "BiblelyHabitsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HabitsProvider()) { entry in
            if #available(iOS 17.0, *) {
                HabitsWidgetView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                HabitsWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Habits")
        .description("Track your daily habits and streaks at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

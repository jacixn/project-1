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

// MARK: - Private Helpers

private struct HabitsStatTile: View {
    let value: String
    let label: String
    var icon: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.85))
                }
                Text(value)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
            Text(label.uppercased())
                .font(.system(size: 9, weight: .semibold))
                .tracking(0.6)
                .foregroundColor(.white.opacity(0.65))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 11)
        .padding(.vertical, 9)
        .background(WidgetUI.tile)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct HabitsRow: View {
    let habit: HabitItem

    var body: some View {
        HStack(spacing: 9) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(Color(hex: habit.color))
                .frame(width: 3, height: 18)
                .opacity(habit.isCheckedIn ? 1 : 0.45)

            Text(habit.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(habit.isCheckedIn ? .white : .white.opacity(0.6))
                .lineLimit(1)

            Spacer(minLength: 6)

            if habit.currentStreak > 0 {
                HStack(spacing: 3) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 9))
                    Text("\(habit.currentStreak)")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                }
                .foregroundColor(.white.opacity(0.9))
            }

            Image(systemName: habit.isCheckedIn ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 14))
                .foregroundColor(habit.isCheckedIn ? .white : .white.opacity(0.3))
        }
    }
}

private struct HabitsEmptyState: View {
    var compact: Bool = false

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: compact ? 26 : 32))
                .foregroundColor(.white.opacity(0.85))
            Text("No habits yet")
                .font(.system(size: compact ? 13 : 16, weight: .bold))
                .foregroundColor(.white)
            Text("Add habits in the app to start tracking streaks.")
                .font(.system(size: compact ? 10 : 12, weight: .medium))
                .foregroundColor(.white.opacity(0.65))
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Small Widget View

struct HabitsWidgetSmallView: View {
    let entry: HabitsEntry

    var body: some View {
        WidgetCanvas(WidgetUI.habits) {
            if let data = entry.data, data.totalCount > 0 {
                let progress = data.totalCount > 0
                    ? Double(data.completedToday) / Double(data.totalCount)
                    : 0

                VStack(alignment: .leading, spacing: 0) {
                    WidgetHeader(icon: "flame.fill", title: "Habits")

                    Spacer(minLength: 0)

                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(data.completedToday)")
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text("/ \(data.totalCount)")
                            .font(.system(size: 17, weight: .semibold, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    }

                    Text("DONE TODAY")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(0.8)
                        .foregroundColor(.white.opacity(0.65))

                    WidgetBar(progress: progress)
                        .padding(.top, 7)

                    if data.bestStreak > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "flame.fill")
                                .font(.system(size: 10))
                            Text("\(data.bestStreak) day best")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundColor(.white.opacity(0.85))
                        .padding(.top, 8)
                    }
                }
                .padding(12)
            } else {
                HabitsEmptyState(compact: true)
                    .padding(12)
            }
        }
    }
}

// MARK: - Medium Widget View

struct HabitsWidgetMediumView: View {
    let entry: HabitsEntry

    var body: some View {
        WidgetCanvas(WidgetUI.habits) {
            if let data = entry.data, data.totalCount > 0 {
                let progress = data.totalCount > 0
                    ? Double(data.completedToday) / Double(data.totalCount)
                    : 0
                let visibleHabits = Array(data.habits.prefix(4))

                HStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 10) {
                        WidgetRing(progress: progress, size: 64, line: 7, tint: .white) {
                            VStack(spacing: 0) {
                                Text("\(data.completedToday)")
                                    .font(.system(size: 20, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                                Text("of \(data.totalCount)")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }

                        HabitsStatTile(value: "\(data.bestStreak)", label: "Best streak", icon: "flame.fill")
                    }
                    .frame(width: 96)

                    VStack(alignment: .leading, spacing: 0) {
                        WidgetHeader(icon: "flame.fill", title: "Habits", trailing: "\(data.completedToday)/\(data.totalCount)")
                            .padding(.bottom, 8)

                        ForEach(Array(visibleHabits.enumerated()), id: \.offset) { index, habit in
                            HabitsRow(habit: habit)
                                .padding(.vertical, 3)

                            if index < visibleHabits.count - 1 {
                                Rectangle()
                                    .fill(WidgetUI.hairline)
                                    .frame(height: 1)
                            }
                        }

                        if data.totalCount > visibleHabits.count {
                            Text("+ \(data.totalCount - visibleHabits.count) more")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white.opacity(0.6))
                                .padding(.top, 5)
                        }

                        Spacer(minLength: 0)
                    }
                }
                .padding(16)
            } else {
                HabitsEmptyState()
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
                    .containerBackground(for: .widget) { ZStack { WidgetUI.habits; WidgetUI.sheen } }
            } else {
                HabitsWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Habits")
        .description("Track your daily habits and streaks at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

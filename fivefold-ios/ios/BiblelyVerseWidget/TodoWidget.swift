//
//  TodoWidget.swift
//  BiblelyVerseWidget
//
//  Shows today's pending tasks from the To-Do feature.
//  Data is written by the React Native app via WidgetBridge -> shared UserDefaults.
//

import WidgetKit
import SwiftUI

// MARK: - Data Models

struct TodoItem: Codable {
    let id: String
    let text: String
    let tier: String        // "low", "mid", "high"
    let scheduledTime: String?
    let isUnscheduled: Bool?
}

struct TodoWidgetData: Codable {
    let todos: [TodoItem]
    let totalCount: Int
    let todayCount: Int
    let unscheduledCount: Int
    let completedCount: Int
    let lastUpdated: String
}

// MARK: - Timeline Entry

struct TodoEntry: TimelineEntry {
    let date: Date
    let data: TodoWidgetData?
}

// MARK: - Timeline Provider

struct TodoProvider: TimelineProvider {

    private static let suiteName = "group.com.jesusxoi.biblely"
    private static let key = "widgetTodoData"

    private func loadData() -> TodoWidgetData? {
        guard let defaults = UserDefaults(suiteName: TodoProvider.suiteName),
              let jsonString = defaults.string(forKey: TodoProvider.key),
              let jsonData = jsonString.data(using: .utf8),
              let todoData = try? JSONDecoder().decode(TodoWidgetData.self, from: jsonData) else {
            return nil
        }
        return todoData
    }

    func placeholder(in context: Context) -> TodoEntry {
        TodoEntry(date: Date(), data: TodoWidgetData(
            todos: [
                TodoItem(id: "1", text: "Morning workout", tier: "high", scheduledTime: "07:00", isUnscheduled: false),
                TodoItem(id: "2", text: "Read Bible chapter", tier: "mid", scheduledTime: "09:00", isUnscheduled: false),
                TodoItem(id: "3", text: "Meal prep", tier: "low", scheduledTime: nil, isUnscheduled: true),
            ],
            totalCount: 5,
            todayCount: 3,
            unscheduledCount: 2,
            completedCount: 1,
            lastUpdated: ""
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (TodoEntry) -> Void) {
        // In preview/gallery, show placeholder data so users see a filled widget
        let data = loadData() ?? (context.isPreview ? placeholder(in: context).data : nil)
        completion(TodoEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodoEntry>) -> Void) {
        let entry = TodoEntry(date: Date(), data: loadData())
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }
}

// MARK: - Tier Color Helper

extension Color {
    static func tierColor(for tier: String) -> Color {
        switch tier.lowercased() {
        case "high":
            return Color(red: 0.95, green: 0.3, blue: 0.3)   // red
        case "mid":
            return Color(red: 1.0, green: 0.75, blue: 0.3)    // amber
        case "low":
            return Color(red: 0.3, green: 0.85, blue: 0.45)   // green
        default:
            return Color(red: 0.6, green: 0.6, blue: 0.65)    // grey
        }
    }
}

// MARK: - Small Widget View

struct TodoWidgetSmallView: View {
    let entry: TodoEntry

    var body: some View {
        if let data = entry.data, data.totalCount > 0 {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.20)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 6) {
                    // Header
                    HStack {
                        Image("WidgetLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 12, height: 12)
                            .opacity(0.6)
                        Text("To-Do")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.6, green: 0.5, blue: 0.85))
                        Spacer()
                    }

                    Spacer(minLength: 0)

                    // Count badge — total pending (today + unscheduled)
                    Text("\(data.totalCount)")
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Text(data.totalCount == 1 ? "task pending" : "tasks pending")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.5))

                    // Next task preview
                    if let first = data.todos.first {
                        HStack(spacing: 5) {
                            Circle()
                                .fill(Color.tierColor(for: first.tier))
                                .frame(width: 6, height: 6)
                            Text(first.text)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                                .lineLimit(1)
                        }
                        .padding(.top, 2)
                    }

                    if data.completedCount > 0 {
                        Text("\(data.completedCount) done")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.green.opacity(0.6))
                    }
                }
                .padding(12)
            }
        } else {
            // Empty state
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.20)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 0.6, green: 0.5, blue: 0.85).opacity(0.6))
                    Text("No pending tasks")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Text("Add tasks in the app")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                }
                .padding(12)
            }
        }
    }
}

// MARK: - Medium Widget View

struct TodoWidgetMediumView: View {
    let entry: TodoEntry

    var body: some View {
        if let data = entry.data, data.totalCount > 0 {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.20)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 0) {
                    // Header row
                    HStack {
                        Image("WidgetLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 12, height: 12)
                            .opacity(0.6)
                        Text("To-Do")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.6, green: 0.5, blue: 0.85))
                        Spacer()
                        if data.completedCount > 0 {
                            Text("\(data.completedCount) done")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.green.opacity(0.6))
                        }
                        Text("\(data.totalCount) task\(data.totalCount == 1 ? "" : "s")")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.bottom, 8)

                    // Task list (up to 4 items)
                    let visibleTodos = Array(data.todos.prefix(4))
                    ForEach(Array(visibleTodos.enumerated()), id: \.offset) { index, todo in
                        HStack(spacing: 8) {
                            Circle()
                                .fill(Color.tierColor(for: todo.tier))
                                .frame(width: 7, height: 7)

                            Text(todo.text)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.9))
                                .lineLimit(1)

                            Spacer()

                            if todo.isUnscheduled == true {
                                Text("Anytime")
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundColor(Color(red: 0.6, green: 0.5, blue: 0.85).opacity(0.6))
                            } else if let time = todo.scheduledTime {
                                Text(time)
                                    .font(.system(size: 10, weight: .medium, design: .rounded))
                                    .foregroundColor(.white.opacity(0.35))
                            }
                        }
                        .padding(.vertical, 4)

                        if index < visibleTodos.count - 1 {
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
            // Empty state
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.07, blue: 0.14),
                        Color(red: 0.12, green: 0.10, blue: 0.20)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 16) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 36))
                        .foregroundColor(Color(red: 0.6, green: 0.5, blue: 0.85).opacity(0.6))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("All clear!")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white.opacity(0.8))
                        Text("No pending tasks. Open the app to add some.")
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

struct TodoWidgetView: View {
    var entry: TodoEntry
    @Environment(\.widgetFamily) var family

    private var deepLink: URL? {
        URL(string: "biblely://todos")
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                TodoWidgetSmallView(entry: entry)
            case .systemMedium:
                TodoWidgetMediumView(entry: entry)
            default:
                TodoWidgetSmallView(entry: entry)
            }
        }
        .widgetURL(deepLink)
    }
}

// MARK: - Widget Configuration

struct TodoWidget: Widget {
    let kind: String = "BiblelyTodoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodoProvider()) { entry in
            if #available(iOS 17.0, *) {
                TodoWidgetView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                TodoWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Tasks")
        .description("See all your pending tasks at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

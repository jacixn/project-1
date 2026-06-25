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

private struct TodoTaskRow: View {
    let todo: TodoItem
    var compact: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(Color.tierColor(for: todo.tier))
                .frame(width: 3, height: compact ? 13 : 16)

            Text(todo.text)
                .font(.system(size: compact ? 12 : 13, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(1)

            Spacer(minLength: 4)

            if todo.isUnscheduled == true {
                WidgetPill(text: "Anytime")
            } else if let time = todo.scheduledTime {
                Text(time)
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundColor(.white.opacity(0.75))
            }
        }
    }
}

struct TodoWidgetSmallView: View {
    let entry: TodoEntry

    var body: some View {
        WidgetCanvas(WidgetUI.todo) {
            if let data = entry.data, data.totalCount > 0 {
                VStack(alignment: .leading, spacing: 0) {
                    WidgetHeader(icon: "checklist", title: "Tasks")

                    Spacer(minLength: 0)

                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text("\(data.totalCount)")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text(data.totalCount == 1 ? "task" : "tasks")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white.opacity(0.65))
                    }

                    if data.completedCount > 0 {
                        Text("\(data.completedCount) done today")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.55))
                            .padding(.top, 1)
                    }

                    Spacer(minLength: 0)

                    if let first = data.todos.first {
                        TodoTaskRow(todo: first, compact: true)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 8)
                            .background(WidgetUI.tile)
                            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                    }
                }
                .padding(12)
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    WidgetHeader(icon: "checklist", title: "Tasks")
                    Spacer(minLength: 0)
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))
                    Text("All clear")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.top, 6)
                    Text("No pending tasks")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                    Spacer(minLength: 0)
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
        WidgetCanvas(WidgetUI.todo) {
            if let data = entry.data, data.totalCount > 0 {
                VStack(alignment: .leading, spacing: 10) {
                    WidgetHeader(
                        icon: "checklist",
                        title: "Tasks",
                        trailing: "\(data.totalCount) pending"
                    )

                    let visibleTodos = Array(data.todos.prefix(4))
                    VStack(spacing: 0) {
                        ForEach(Array(visibleTodos.enumerated()), id: \.offset) { index, todo in
                            TodoTaskRow(todo: todo)
                                .padding(.vertical, 7)
                            if index < visibleTodos.count - 1 {
                                Rectangle()
                                    .fill(Color.white.opacity(0.10))
                                    .frame(height: 1)
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(WidgetUI.tile)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    HStack {
                        if data.totalCount > 4 {
                            Text("and \(data.totalCount - 4) more")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        Spacer()
                        if data.completedCount > 0 {
                            Text("\(data.completedCount) done today")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }

                    Spacer(minLength: 0)
                }
                .padding(16)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    WidgetHeader(icon: "checklist", title: "Tasks")
                    Spacer(minLength: 0)
                    HStack(spacing: 14) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 38, weight: .semibold))
                            .foregroundColor(.white.opacity(0.9))
                        VStack(alignment: .leading, spacing: 3) {
                            Text("All clear")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                            Text("No pending tasks. Open the app to add some.")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                                .lineLimit(2)
                        }
                    }
                    Spacer(minLength: 0)
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
                    .containerBackground(for: .widget) { ZStack { WidgetUI.todo; WidgetUI.sheen } }
            } else {
                TodoWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Tasks")
        .description("See all your pending tasks at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Add Task Widget (one tap to the quick-add form)

struct AddTaskEntry: TimelineEntry {
    let date: Date
}

struct AddTaskProvider: TimelineProvider {
    func placeholder(in context: Context) -> AddTaskEntry { AddTaskEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (AddTaskEntry) -> Void) {
        completion(AddTaskEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<AddTaskEntry>) -> Void) {
        completion(Timeline(entries: [AddTaskEntry(date: Date())], policy: .never))
    }
}

struct AddTaskWidgetView: View {
    var body: some View {
        WidgetCanvas(WidgetUI.add) {
            VStack(alignment: .leading, spacing: 0) {
                WidgetHeader(icon: "checklist", title: "Tasks")

                Spacer(minLength: 0)

                Image(systemName: "plus")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.white)

                Text("Add Task")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.top, 6)

                Text("Tap to capture a new task")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))

                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
        }
        .widgetURL(URL(string: "biblely://addtodo"))
    }
}

struct AddTaskWidget: Widget {
    let kind: String = "BiblelyAddTaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AddTaskProvider()) { _ in
            if #available(iOS 17.0, *) {
                AddTaskWidgetView()
                    .containerBackground(for: .widget) { ZStack { WidgetUI.add; WidgetUI.sheen } }
            } else {
                AddTaskWidgetView()
            }
        }
        .configurationDisplayName("Add Task")
        .description("Tap to quickly add a new task.")
        .supportedFamilies([.systemSmall])
    }
}

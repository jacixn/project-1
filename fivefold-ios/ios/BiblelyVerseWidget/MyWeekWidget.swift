//
//  MyWeekWidget.swift
//  BiblelyVerseWidget
//
//  Your day as ONE flowing timeline (not two columns): what is on now,
//  what comes next, the free stretches between, and when today runs out
//  the list simply carries on into tomorrow. Data comes from the app's
//  My Week loader via WidgetBridge (shared App Group UserDefaults) with
//  every item already wearing its iPhone Calendar colour. The widget moves
//  the "now" line itself (timeline entries every 5 minutes).
//

import WidgetKit
import SwiftUI

// MARK: - Data (must match utils/widgetBridge.js updateMyWeekWidget)

struct MyWeekItem: Codable, Identifiable {
    let id: String
    let title: String
    let start: Int        // minutes from midnight
    let end: Int
    let color: String     // hex
    let kind: String
    let label: String
    let pinned: Bool?
}

struct MyWeekDay: Codable {
    let key: String       // YYYY-MM-DD
    let weekday: String
    let day: Int
    let month: String
    let template: String?
    let items: [MyWeekItem]
}

struct MyWeekData: Codable {
    let days: [MyWeekDay]
    let updatedAt: String
}

// One row of the flowing list: an item, a free stretch, or a day header.
enum MyWeekRow: Identifiable {
    case header(dayKey: String, title: String, sub: String?)
    case item(MyWeekItem, dayKey: String, now: Bool, past: Bool, progress: Double)
    case free(dayKey: String, start: Int, minutes: Int)

    var id: String {
        switch self {
        case .header(let k, _, _): return "h-\(k)"
        case .item(let it, let k, _, _, _): return "i-\(k)-\(it.id)"
        case .free(let k, let s, _): return "f-\(k)-\(s)"
        }
    }
}

// MARK: - Timeline

struct MyWeekEntry: TimelineEntry {
    let date: Date
    let data: MyWeekData?
}

struct MyWeekProvider: TimelineProvider {
    private static let suiteName = "group.com.jesusxoi.biblely"
    private static let key = "widgetMyWeekData"

    private func load() -> MyWeekData? {
        guard let defaults = UserDefaults(suiteName: MyWeekProvider.suiteName),
              let json = defaults.string(forKey: MyWeekProvider.key),
              let data = json.data(using: .utf8),
              let decoded = try? JSONDecoder().decode(MyWeekData.self, from: data) else { return nil }
        return decoded
    }

    static func sample() -> MyWeekData {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        let today = Date()
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
        let wd = DateFormatter(); wd.dateFormat = "EEEE"
        let mo = DateFormatter(); mo.dateFormat = "MMM"
        let dayNum = Calendar.current.component(.day, from: today)
        let items = [
            MyWeekItem(id: "1", title: "2nd Prayer", start: 660, end: 665, color: "#34C759", kind: "prayer", label: "Prayer", pinned: true),
            MyWeekItem(id: "2", title: "Work", start: 540, end: 1050, color: "#D946EF", kind: "calendar", label: "Calendar", pinned: true),
            MyWeekItem(id: "3", title: "Newcastle United vs Liverpool", start: 990, end: 1110, color: "#FF9500", kind: "eyecandySports", label: "EyeCandy Sports", pinned: true),
            MyWeekItem(id: "4", title: "eat dinner", start: 1140, end: 1160, color: "#34C759", kind: "reminder", label: "Reminder", pinned: false),
            MyWeekItem(id: "5", title: "Solo Leveling", start: 1230, end: 1280, color: "#7C5CFF", kind: "eyecandy", label: "EyeCandy", pinned: false),
            MyWeekItem(id: "6", title: "5th Prayer", start: 1320, end: 1325, color: "#34C759", kind: "prayer", label: "Prayer", pinned: true),
        ]
        return MyWeekData(days: [
            MyWeekDay(key: f.string(from: today), weekday: wd.string(from: today), day: dayNum, month: mo.string(from: today), template: "Work Remote", items: items),
            MyWeekDay(key: f.string(from: tomorrow), weekday: wd.string(from: tomorrow), day: Calendar.current.component(.day, from: tomorrow), month: mo.string(from: tomorrow), template: nil, items: [
                MyWeekItem(id: "7", title: "1st Prayer", start: 505, end: 510, color: "#34C759", kind: "prayer", label: "Prayer", pinned: true),
                MyWeekItem(id: "8", title: "Push day", start: 1080, end: 1140, color: "#34C759", kind: "gym", label: "Workout", pinned: false),
            ]),
        ], updatedAt: "")
    }

    func placeholder(in context: Context) -> MyWeekEntry { MyWeekEntry(date: Date(), data: MyWeekProvider.sample()) }

    func getSnapshot(in context: Context, completion: @escaping (MyWeekEntry) -> Void) {
        completion(MyWeekEntry(date: Date(), data: load() ?? (context.isPreview ? MyWeekProvider.sample() : nil)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MyWeekEntry>) -> Void) {
        let data = load()
        // The now line walks by itself: an entry every 5 minutes for 3 hours,
        // then WidgetKit asks again (the app also pushes fresh data on changes).
        var entries: [MyWeekEntry] = []
        let start = Date()
        for i in 0..<36 {
            if let d = Calendar.current.date(byAdding: .minute, value: i * 5, to: start) { entries.append(MyWeekEntry(date: d, data: data)) }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - Building the flow

enum MyWeekFlow {
    static func minuteOfDay(_ date: Date) -> Int {
        let c = Calendar.current.dateComponents([.hour, .minute], from: date)
        return (c.hour ?? 0) * 60 + (c.minute ?? 0)
    }
    static func todayKey(_ date: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f.string(from: date)
    }
    static func clock(_ min: Int) -> String {
        let h = (min / 60) % 24; let m = min % 60
        let h12 = h % 12 == 0 ? 12 : h % 12
        let ap = h >= 12 ? "PM" : "AM"
        return m == 0 ? "\(h12) \(ap)" : "\(h12):\(String(format: "%02d", m)) \(ap)"
    }
    static func short(_ min: Int) -> String {
        let h = (min / 60) % 24; let m = min % 60
        let h12 = h % 12 == 0 ? 12 : h % 12
        return m == 0 ? "\(h12)" : "\(h12):\(String(format: "%02d", m))"
    }
    static func dur(_ mins: Int) -> String {
        let h = mins / 60; let m = mins % 60
        if h == 0 { return "\(m) min" }
        return m == 0 ? "\(h) hr" : "\(h) hr \(m) min"
    }

    // Rows from "now" onward: the item in progress first, then what comes,
    // with free stretches (20 min+) between; runs into the next days until
    // `limit` rows are filled. Returns the rows and how many items today are left.
    static func rows(_ data: MyWeekData?, now: Date, limit: Int, includePastToday: Int = 0) -> (rows: [MyWeekRow], leftToday: Int) {
        guard let data = data, !data.days.isEmpty else { return ([], 0) }
        let nowMin = minuteOfDay(now)
        let tKey = todayKey(now)
        var out: [MyWeekRow] = []
        var leftToday = 0
        var firstDay = true
        for day in data.days {
            let isToday = day.key == tKey
            if !isToday && firstDay { continue } // stale data from another day: skip until the real today shows
            let items = day.items.sorted { $0.start == $1.start ? $0.end < $1.end : $0.start < $1.start }
            var cursor = isToday ? nowMin : 7 * 60
            var dayRows: [MyWeekRow] = []
            if isToday {
                // A little of what just passed, faded, so the line has context.
                let past = items.filter { $0.end <= nowMin }.suffix(includePastToday)
                for it in past { dayRows.append(.item(it, dayKey: day.key, now: false, past: true, progress: 1)) }
            }
            for it in items {
                if isToday && it.end <= nowMin { continue }
                if it.start > cursor && it.start - cursor >= 20 { dayRows.append(.free(dayKey: day.key, start: cursor, minutes: it.start - cursor)) }
                let onNow = isToday && it.start <= nowMin && it.end > nowMin
                let progress = onNow ? Double(nowMin - it.start) / Double(max(1, it.end - it.start)) : 0
                dayRows.append(.item(it, dayKey: day.key, now: onNow, past: false, progress: progress))
                if isToday { leftToday += 1 }
                cursor = max(cursor, it.end)
            }
            if isToday && 24 * 60 - cursor >= 20 && !items.isEmpty { dayRows.append(.free(dayKey: day.key, start: cursor, minutes: 24 * 60 - cursor)) }
            if !isToday {
                let title = firstDay ? day.weekday : (Calendar.current.isDateInTomorrow(dateOf(day.key) ?? now) ? "Tomorrow" : day.weekday)
                out.append(.header(dayKey: day.key, title: title, sub: day.template))
            }
            out.append(contentsOf: dayRows)
            firstDay = false
            if out.count >= limit { break }
        }
        return (Array(out.prefix(limit)), leftToday)
    }

    static func dateOf(_ key: String) -> Date? {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f.date(from: key)
    }

    static func today(_ data: MyWeekData?, now: Date) -> MyWeekDay? {
        data?.days.first { $0.key == todayKey(now) }
    }
}

// MARK: - Pieces

struct MyWeekPalette {
    static let bg = LinearGradient(gradient: Gradient(colors: [Color(hex: "141C16"), Color(hex: "0B100D")]), startPoint: .top, endPoint: .bottom)
    static let text = Color.white
    static let dim = Color.white.opacity(0.55)
    static let faint = Color.white.opacity(0.32)
    static let hairline = Color.white.opacity(0.10)
    static let accent = Color(hex: "3DDC84")
}

struct MyWeekHeader: View {
    let day: MyWeekDay?
    let now: Date
    let leftToday: Int
    var compact: Bool = false
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            if let d = day {
                Text(d.weekday.uppercased()).font(.system(size: compact ? 11 : 12, weight: .heavy)).tracking(0.8).foregroundColor(MyWeekPalette.accent)
                Text("\(d.day)").font(.system(size: compact ? 16 : 20, weight: .heavy)).foregroundColor(MyWeekPalette.text)
                if let t = d.template, !t.isEmpty {
                    Text(t).font(.system(size: compact ? 10 : 11, weight: .bold)).foregroundColor(MyWeekPalette.text.opacity(0.9))
                        .padding(.horizontal, 7).padding(.vertical, 3)
                        .background(RoundedRectangle(cornerRadius: 7).fill(Color.white.opacity(0.12)))
                        .lineLimit(1)
                }
            } else {
                Text("MY WEEK").font(.system(size: 12, weight: .heavy)).tracking(0.8).foregroundColor(MyWeekPalette.accent)
            }
            Spacer(minLength: 0)
            Text(leftToday == 0 ? "nothing left today" : (leftToday == 1 ? "1 left today" : "\(leftToday) left today"))
                .font(.system(size: compact ? 10 : 11, weight: .bold)).foregroundColor(MyWeekPalette.dim).lineLimit(1)
        }
    }
}

struct MyWeekItemRow: View {
    let item: MyWeekItem
    let now: Bool
    let past: Bool
    let progress: Double
    var dense: Bool = false
    var body: some View {
        let tint = Color(hex: item.color)
        HStack(alignment: .center, spacing: 9) {
            VStack(alignment: .trailing, spacing: 1) {
                Text(MyWeekFlow.short(item.start)).font(.system(size: dense ? 12 : 13, weight: .bold)).foregroundColor(past ? MyWeekPalette.faint : MyWeekPalette.text).monospacedDigit()
                Text(now ? "now" : MyWeekFlow.dur(item.end - item.start)).font(.system(size: 9.5, weight: .semibold)).foregroundColor(now ? tint : MyWeekPalette.faint).lineLimit(1)
            }
            .frame(width: 44, alignment: .trailing)
            RoundedRectangle(cornerRadius: 2).fill(tint).frame(width: 3, height: dense ? 26 : 30).opacity(past ? 0.35 : 1)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title).font(.system(size: dense ? 12.5 : 13.5, weight: now ? .heavy : .semibold)).foregroundColor(past ? MyWeekPalette.faint : MyWeekPalette.text).lineLimit(1)
                if now {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.12))
                            Capsule().fill(tint).frame(width: max(4, geo.size.width * min(1, max(0, progress))))
                        }
                    }.frame(height: 4)
                } else {
                    Text("\(MyWeekFlow.clock(item.start)) to \(MyWeekFlow.clock(item.end))\(item.label.isEmpty ? "" : "  ·  \(item.label)")")
                        .font(.system(size: 10, weight: .medium)).foregroundColor(past ? MyWeekPalette.faint : MyWeekPalette.dim).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            if item.pinned == true && !past {
                Image(systemName: "pin.fill").font(.system(size: 9, weight: .bold)).foregroundColor(MyWeekPalette.faint)
            }
        }
        .padding(.vertical, dense ? 1 : 2)
        .background(
            RoundedRectangle(cornerRadius: 10).fill(now ? tint.opacity(0.14) : Color.clear)
                .padding(.horizontal, -6).padding(.vertical, -3)
        )
    }
}

struct MyWeekFreeRow: View {
    let start: Int
    let minutes: Int
    var body: some View {
        HStack(spacing: 8) {
            Text(MyWeekFlow.short(start)).font(.system(size: 11, weight: .semibold)).foregroundColor(MyWeekPalette.faint).monospacedDigit().frame(width: 44, alignment: .trailing)
            Rectangle().fill(MyWeekPalette.hairline).frame(height: 1)
            Text("\(MyWeekFlow.dur(minutes)) free").font(.system(size: 10.5, weight: .bold)).foregroundColor(MyWeekPalette.accent.opacity(0.9)).lineLimit(1)
            Rectangle().fill(MyWeekPalette.hairline).frame(height: 1)
        }
        .padding(.vertical, 1)
    }
}

struct MyWeekDayHeaderRow: View {
    let title: String
    let sub: String?
    var body: some View {
        HStack(spacing: 8) {
            Text(title.uppercased()).font(.system(size: 10.5, weight: .heavy)).tracking(0.8).foregroundColor(MyWeekPalette.accent)
            if let s = sub, !s.isEmpty { Text(s).font(.system(size: 10, weight: .bold)).foregroundColor(MyWeekPalette.dim).lineLimit(1) }
            Rectangle().fill(MyWeekPalette.hairline).frame(height: 1)
        }
        .padding(.top, 4)
    }
}

// MARK: - Views per family

struct MyWeekLargeView: View {
    let entry: MyWeekEntry
    var body: some View {
        let flow = MyWeekFlow.rows(entry.data, now: entry.date, limit: 8, includePastToday: 1)
        VStack(alignment: .leading, spacing: 6) {
            MyWeekHeader(day: MyWeekFlow.today(entry.data, now: entry.date), now: entry.date, leftToday: flow.leftToday)
            if flow.rows.isEmpty {
                Spacer()
                MyWeekEmpty()
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(flow.rows) { row in
                        switch row {
                        case .header(_, let t, let s): MyWeekDayHeaderRow(title: t, sub: s)
                        case .item(let it, _, let now, let past, let p): MyWeekItemRow(item: it, now: now, past: past, progress: p)
                        case .free(_, let s, let m): MyWeekFreeRow(start: s, minutes: m)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 2).padding(.vertical, 2)
        .widgetURL(URL(string: "biblely://myweek"))
    }
}

struct MyWeekMediumView: View {
    let entry: MyWeekEntry
    var body: some View {
        let flow = MyWeekFlow.rows(entry.data, now: entry.date, limit: 4)
        VStack(alignment: .leading, spacing: 5) {
            MyWeekHeader(day: MyWeekFlow.today(entry.data, now: entry.date), now: entry.date, leftToday: flow.leftToday, compact: true)
            if flow.rows.isEmpty {
                Spacer(); MyWeekEmpty(); Spacer()
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(flow.rows) { row in
                        switch row {
                        case .header(_, let t, let s): MyWeekDayHeaderRow(title: t, sub: s)
                        case .item(let it, _, let now, let past, let p): MyWeekItemRow(item: it, now: now, past: past, progress: p, dense: true)
                        case .free(_, let s, let m): MyWeekFreeRow(start: s, minutes: m)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(2)
        .widgetURL(URL(string: "biblely://myweek"))
    }
}

struct MyWeekSmallView: View {
    let entry: MyWeekEntry
    var body: some View {
        let flow = MyWeekFlow.rows(entry.data, now: entry.date, limit: 3)
        let first = flow.rows.compactMap { row -> (MyWeekItem, Bool, Double)? in
            if case .item(let it, _, let now, let past, let p) = row, !past { return (it, now, p) }
            return nil
        }.first
        let freeFirst: Int? = {
            if case .free(_, _, let m)? = flow.rows.first { return m }
            return nil
        }()
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(MyWeekFlow.today(entry.data, now: entry.date)?.weekday.uppercased() ?? "MY WEEK").font(.system(size: 10, weight: .heavy)).tracking(0.8).foregroundColor(MyWeekPalette.accent)
                Spacer()
                Text("\(flow.leftToday) left").font(.system(size: 10, weight: .bold)).foregroundColor(MyWeekPalette.dim)
            }
            Spacer(minLength: 0)
            if let (it, now, p) = first {
                let tint = Color(hex: it.color)
                Text(now ? "NOW" : "NEXT · \(MyWeekFlow.clock(it.start))").font(.system(size: 10, weight: .heavy)).tracking(0.6).foregroundColor(tint)
                Text(it.title).font(.system(size: 16, weight: .heavy)).foregroundColor(MyWeekPalette.text).lineLimit(2).minimumScaleFactor(0.85)
                if now {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.12))
                            Capsule().fill(tint).frame(width: max(4, geo.size.width * min(1, max(0, p))))
                        }
                    }.frame(height: 5)
                    Text("until \(MyWeekFlow.clock(it.end))").font(.system(size: 10.5, weight: .semibold)).foregroundColor(MyWeekPalette.dim)
                } else {
                    let mins = it.start - MyWeekFlow.minuteOfDay(entry.date)
                    Text(mins > 0 && mins < 24 * 60 ? "in \(MyWeekFlow.dur(mins))" : "\(MyWeekFlow.clock(it.start)) to \(MyWeekFlow.clock(it.end))").font(.system(size: 10.5, weight: .semibold)).foregroundColor(MyWeekPalette.dim)
                    if let f = freeFirst { Text("\(MyWeekFlow.dur(f)) free first").font(.system(size: 10, weight: .bold)).foregroundColor(MyWeekPalette.accent.opacity(0.9)) }
                }
            } else {
                MyWeekEmpty()
            }
        }
        .padding(2)
        .widgetURL(URL(string: "biblely://myweek"))
    }
}

struct MyWeekEmpty: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("Nothing left today").font(.system(size: 14, weight: .heavy)).foregroundColor(MyWeekPalette.text)
            Text("Open My Week to plan the day.").font(.system(size: 10.5, weight: .medium)).foregroundColor(MyWeekPalette.dim)
        }
    }
}

struct MyWeekWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: MyWeekEntry
    var body: some View {
        switch family {
        case .systemLarge: MyWeekLargeView(entry: entry)
        case .systemMedium: MyWeekMediumView(entry: entry)
        default: MyWeekSmallView(entry: entry)
        }
    }
}

// MARK: - Widget

struct MyWeekWidget: Widget {
    let kind: String = "BiblelyMyWeekWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MyWeekProvider()) { entry in
            if #available(iOS 17.0, *) {
                MyWeekWidgetView(entry: entry)
                    .containerBackground(for: .widget) { MyWeekPalette.bg }
            } else {
                ZStack { MyWeekPalette.bg; MyWeekWidgetView(entry: entry) }
            }
        }
        .configurationDisplayName("My Week")
        .description("Your day as one timeline: what is on now, what comes next, and the free time between.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

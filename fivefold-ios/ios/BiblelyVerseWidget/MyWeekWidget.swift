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
import EventKit

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
    let eventId: String?     // iPhone Calendar event behind this item, when there is one
    let eventStart: String?  // its start (ISO) so a single deleted occurrence is noticed
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
            MyWeekItem(id: "1", title: "2nd Prayer", start: 660, end: 665, color: "#34C759", kind: "prayer", label: "Prayer", pinned: true, eventId: nil, eventStart: nil),
            MyWeekItem(id: "2", title: "Work", start: 540, end: 1050, color: "#D946EF", kind: "calendar", label: "Calendar", pinned: true, eventId: nil, eventStart: nil),
            MyWeekItem(id: "3", title: "Newcastle United vs Liverpool", start: 990, end: 1110, color: "#FF9500", kind: "eyecandySports", label: "EyeCandy Sports", pinned: true, eventId: nil, eventStart: nil),
            MyWeekItem(id: "4", title: "eat dinner", start: 1140, end: 1160, color: "#34C759", kind: "reminder", label: "Reminder", pinned: false, eventId: nil, eventStart: nil),
            MyWeekItem(id: "5", title: "Solo Leveling", start: 1230, end: 1280, color: "#7C5CFF", kind: "eyecandy", label: "EyeCandy", pinned: false, eventId: nil, eventStart: nil),
            MyWeekItem(id: "6", title: "5th Prayer", start: 1320, end: 1325, color: "#34C759", kind: "prayer", label: "Prayer", pinned: true, eventId: nil, eventStart: nil),
        ]
        return MyWeekData(days: [
            MyWeekDay(key: f.string(from: today), weekday: wd.string(from: today), day: dayNum, month: mo.string(from: today), template: "Work Remote", items: items),
            MyWeekDay(key: f.string(from: tomorrow), weekday: wd.string(from: tomorrow), day: Calendar.current.component(.day, from: tomorrow), month: mo.string(from: tomorrow), template: nil, items: [
                MyWeekItem(id: "7", title: "1st Prayer", start: 505, end: 510, color: "#34C759", kind: "prayer", label: "Prayer", pinned: true, eventId: nil, eventStart: nil),
                MyWeekItem(id: "8", title: "Push day", start: 1080, end: 1140, color: "#34C759", kind: "gym", label: "Workout", pinned: false, eventId: nil, eventStart: nil),
            ]),
        ], updatedAt: "")
    }

    func placeholder(in context: Context) -> MyWeekEntry { MyWeekEntry(date: Date(), data: MyWeekProvider.sample()) }

    func getSnapshot(in context: Context, completion: @escaping (MyWeekEntry) -> Void) {
        completion(MyWeekEntry(date: Date(), data: load() ?? (context.isPreview ? MyWeekProvider.sample() : nil)))
    }

    // Calendar-backed items the user deleted in the Calendar app (or in
    // EyeCandy) while Biblely was closed: drop them here, so the widget never
    // shows something that is gone. Reads the same calendar access the app
    // was granted; without it, nothing is dropped.
    private func pruneGoneEvents(_ data: MyWeekData?) -> MyWeekData? {
        guard let data = data else { return nil }
        let status = EKEventStore.authorizationStatus(for: .event)
        var ok = status == .authorized
        if #available(iOS 17.0, *) { ok = ok || status == .fullAccess }
        guard ok else { return data }
        let store = EKEventStore()
        let iso = ISO8601DateFormatter(); iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let isoPlain = ISO8601DateFormatter()
        let df = DateFormatter(); df.dateFormat = "yyyy-MM-dd"
        var days: [MyWeekDay] = []
        for day in data.days {
            guard let d0 = df.date(from: day.key) else { days.append(day); continue }
            let start = Calendar.current.startOfDay(for: d0)
            let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
            let live = store.events(matching: store.predicateForEvents(withStart: start, end: end, calendars: nil))
            // Nothing readable (access quirk inside the extension): cannot
            // verify, so keep the day exactly as the app sent it.
            if live.isEmpty { days.append(day); continue }
            // expo-calendar hands the app `calendarItemIdentifier`; EventKit's
            // `eventIdentifier` is a different string. Accept either.
            var present = Set<String>()
            for e in live {
                let minute = Int(e.startDate.timeIntervalSince1970 / 60)
                for id in [e.eventIdentifier, e.calendarItemIdentifier].compactMap({ $0 }) {
                    present.insert(id); present.insert("\(id)@\(minute)")
                }
            }
            let backed = day.items.filter { $0.eventId != nil }
            let kept = day.items.filter { it in
                guard let id = it.eventId else { return true }
                if let s = it.eventStart, let date = iso.date(from: s) ?? isoPlain.date(from: s) {
                    return present.contains("\(id)@\(Int(date.timeIntervalSince1970 / 60))") || (present.contains(id) && !live.contains { $0.hasRecurrenceRules && ($0.eventIdentifier == id || $0.calendarItemIdentifier == id) })
                }
                return present.contains(id)
            }
            // Nothing matched at all while the calendar has events: that is an
            // id mismatch, not a mass deletion. Keep everything rather than blank the day.
            if !backed.isEmpty && !live.isEmpty && kept.count == day.items.count - backed.count {
                days.append(day); continue
            }
            days.append(MyWeekDay(key: day.key, weekday: day.weekday, day: day.day, month: day.month, template: day.template, items: kept))
        }
        return MyWeekData(days: days, updatedAt: data.updatedAt)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MyWeekEntry>) -> Void) {
        let data = pruneGoneEvents(load())
        // The now line walks by itself: an entry every 5 minutes for 3 hours,
        // then WidgetKit asks again (the app also pushes fresh data on changes).
        // One entry per minute for two hours: the red line is never more than
        // a minute behind the clock. Then WidgetKit asks again.
        var entries: [MyWeekEntry] = []
        let start = Calendar.current.date(bySetting: .second, value: 0, of: Date()) ?? Date()
        for i in 0..<120 {
            if let d = Calendar.current.date(byAdding: .minute, value: i, to: start) { entries.append(MyWeekEntry(date: d, data: data)) }
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

// MARK: - Large: a real 7-hour timeline, one column, nothing cut off

// Where each block sits: overlapping items share the width side by side
// (like the app's My Week), short ones become a strip with the title beside.
struct MyWeekPlaced: Identifiable {
    let id: String
    let item: MyWeekItem
    let start: Int      // minutes from window start
    let end: Int
    let col: Int
    let cols: Int
    let now: Bool
    let past: Bool
    let tomorrow: Bool
    let strip: Bool     // too short for a box: a line with the title beside it, full width
    let lane: Int       // strips close together stack down one lane each
}

enum MyWeekTimeline {
    static let minutes = 210   // 3 hr 30 min: 6 PM to 9:30 PM, big enough to read every word

    // Window start: the hour that keeps "now" near the top (half an hour of
    // context above it), so 5:52 PM shows 5 PM to 12 AM.
    static func windowStart(now: Date) -> Int {
        let m = MyWeekFlow.minuteOfDay(now)
        return max(0, ((m - 30) / 60) * 60)
    }

    // Items inside the window, from today and (past midnight) tomorrow,
    // with their columns assigned. Minutes are relative to the window.
    static func place(_ data: MyWeekData?, now: Date) -> (placed: [MyWeekPlaced], free: [(start: Int, end: Int)]) {
        guard let data = data else { return ([], []) }
        let nowMin = MyWeekFlow.minuteOfDay(now)
        let ws = windowStart(now: now)
        let we = ws + minutes
        let tKey = MyWeekFlow.todayKey(now)
        guard let tIdx = data.days.firstIndex(where: { $0.key == tKey }) else { return ([], []) }
        var raw: [(MyWeekItem, Int, Int, Bool)] = [] // item, start, end, tomorrow
        for it in data.days[tIdx].items {
            let s = it.start; let e = it.end
            if e <= ws || s >= we { continue }
            raw.append((it, max(ws, s) - ws, min(we, e) - ws, false))
        }
        if we > 24 * 60, data.days.count > tIdx + 1 {
            for it in data.days[tIdx + 1].items {
                let s = it.start + 24 * 60; let e = it.end + 24 * 60
                if e <= ws || s >= we { continue }
                raw.append((it, max(ws, s) - ws, min(we, e) - ws, true))
            }
        }
        // Something that runs over midnight (Sleep 10:30 PM to 6:30 AM) arrives
        // as two pieces: join them into one block across the line.
        let midnight = 24 * 60 - ws
        var joined: [(MyWeekItem, Int, Int, Bool)] = []
        var used = Set<Int>()
        for (idx, g) in raw.enumerated() {
            if used.contains(idx) { continue }
            if !g.3 && g.2 == midnight, let j = raw.indices.first(where: { !used.contains($0) && raw[$0].3 && raw[$0].1 == midnight && raw[$0].0.title == g.0.title }) {
                let t = raw[j]
                let merged = MyWeekItem(id: g.0.id, title: g.0.title, start: g.0.start, end: t.0.end + 24 * 60, color: g.0.color, kind: g.0.kind, label: g.0.label, pinned: g.0.pinned, eventId: g.0.eventId, eventStart: g.0.eventStart)
                joined.append((merged, g.1, t.2, false))
                used.insert(idx); used.insert(j)
            } else {
                joined.append(g); used.insert(idx)
            }
        }
        raw = joined
        raw.sort { $0.1 == $1.1 ? $0.2 > $1.2 : $0.1 < $1.1 }

        // Short things (a prayer, a 20-minute meal) are strips: full width,
        // never a column, stacked a lane down when two fall close together.
        let stripMax = 24
        var placed: [MyWeekPlaced] = []
        var lastStripStart = -999; var lane = 0
        for g in raw where g.2 - g.1 < stripMax {
            let absStart = g.1 + ws, absEnd = g.2 + ws
            lane = (g.1 - lastStripStart < 14) ? lane + 1 : 0
            lastStripStart = g.1
            placed.append(MyWeekPlaced(id: "\(g.3 ? "t" : "d")-\(g.0.id)", item: g.0, start: g.1, end: g.2, col: 0, cols: 1, now: !g.3 && absStart <= nowMin && absEnd > nowMin, past: !g.3 && absEnd <= nowMin, tomorrow: g.3, strip: true, lane: lane))
        }
        raw = raw.filter { $0.2 - $0.1 >= stripMax }

        // Overlap groups -> columns (greedy, first free column).
        var i = 0
        while i < raw.count {
            var groupEnd = raw[i].2
            var j = i
            while j + 1 < raw.count && raw[j + 1].1 < groupEnd { j += 1; groupEnd = max(groupEnd, raw[j].2) }
            let group = Array(raw[i...j])
            var colEnds: [Int] = []
            var assigned: [(Int, (MyWeekItem, Int, Int, Bool))] = []
            for g in group {
                var col = colEnds.firstIndex { $0 <= g.1 }
                if col == nil { colEnds.append(g.2); col = colEnds.count - 1 } else { colEnds[col!] = g.2 }
                assigned.append((col!, g))
            }
            let cols = colEnds.count
            for (col, g) in assigned {
                let absStart = g.1 + ws, absEnd = g.2 + ws
                let onNow = !g.3 && absStart <= nowMin && absEnd > nowMin
                let past = !g.3 && absEnd <= nowMin
                placed.append(MyWeekPlaced(id: "\(g.3 ? "t" : "d")-\(g.0.id)", item: g.0, start: g.1, end: g.2, col: col, cols: cols, now: onNow, past: past, tomorrow: g.3, strip: false, lane: 0))
            }
            i = j + 1
        }

        // Free stretches (30 min+) from now onward, inside the window.
        var free: [(start: Int, end: Int)] = []
        var cursor = max(0, nowMin - ws)
        for p in placed.sorted(by: { $0.start < $1.start }) {
            if p.start - cursor >= 30 { free.append((cursor, p.start)) }
            cursor = max(cursor, p.end)
        }
        if minutes - cursor >= 30 { free.append((cursor, minutes)) }
        return (placed, free)
    }

    static func hourLabel(_ absMin: Int) -> String {
        let h = (absMin / 60) % 24
        if h == 0 { return "12 AM" }
        if h == 12 { return "12 PM" }
        return h < 12 ? "\(h) AM" : "\(h - 12) PM"
    }
}

// "7:45 – 9:45 PM": one suffix, fits a narrow column.
func myWeekRange(_ a: Int, _ b: Int) -> String {
    let ca = MyWeekFlow.clock(a), cb = MyWeekFlow.clock(b)
    let sa = String(ca.suffix(2)), sb = String(cb.suffix(2))
    return sa == sb ? "\(ca.dropLast(3)) – \(cb)" : "\(ca) – \(cb)"
}

struct MyWeekBlock: View {
    let p: MyWeekPlaced
    let height: CGFloat
    var body: some View {
        let tint = Color(hex: p.item.color)
        let strip = p.strip
        let showTime = height >= 28
        // As many title lines as the box can hold (never an ellipsis): the
        // font also shrinks to 55% before any line would overflow.
        let titleLines = max(1, min(4, Int((height - (showTime ? 20 : 8)) / 12)))
        let alpha: Double = p.past ? 0.45 : 1
        Group {
            if strip {
                // The bar starts exactly on the start minute and runs for the
                // real length; the title hangs off its top edge.
                HStack(alignment: .top, spacing: 5) {
                    RoundedRectangle(cornerRadius: 1.5).fill(tint).frame(width: 3, height: max(4, height))
                    HStack(spacing: 5) {
                        Text(p.item.title)
                            .font(.system(size: 9.5, weight: .bold)).foregroundColor(tint)
                            .lineLimit(1).minimumScaleFactor(0.6).allowsTightening(true)
                            .layoutPriority(1)
                        Text(MyWeekFlow.clock(p.item.start)).font(.system(size: 8.5, weight: .semibold)).foregroundColor(tint.opacity(0.8)).lineLimit(1).minimumScaleFactor(0.6)
                    }
                    .frame(height: 11, alignment: .center)
                    .offset(y: -1)
                    Spacer(minLength: 0)
                }
                .frame(height: max(11, height), alignment: .top)
                .opacity(alpha)
            } else {
                ZStack(alignment: .topLeading) {
                    RoundedRectangle(cornerRadius: 7)
                        .fill(tint.opacity(p.now ? 0.34 : 0.2))
                    RoundedRectangle(cornerRadius: 7)
                        .strokeBorder(tint.opacity(p.now ? 0.9 : 0.45), lineWidth: p.now ? 1.2 : 0.8)
                    HStack(alignment: .top, spacing: 0) {
                        RoundedRectangle(cornerRadius: 1.5).fill(tint).frame(width: 3).padding(.vertical, 4).padding(.leading, 4)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(p.item.title)
                                .font(.system(size: titleLines >= 2 ? 11 : 10.5, weight: .bold)).foregroundColor(tint)
                                .lineLimit(titleLines).minimumScaleFactor(0.55).allowsTightening(true)
                            if showTime {
                                Text(p.now ? "now · until \(MyWeekFlow.clock(p.item.end))" : myWeekRange(p.item.start, p.item.end))
                                    .font(.system(size: 9, weight: .semibold)).foregroundColor(tint.opacity(0.85))
                                    .lineLimit(1).minimumScaleFactor(0.5).allowsTightening(true)
                            }
                        }
                        .padding(.leading, 5).padding(.trailing, 4).padding(.top, 4)
                        Spacer(minLength: 0)
                    }
                }
                .frame(height: height)
                .opacity(alpha)
            }
        }
    }
}

struct MyWeekLargeView: View {
    let entry: MyWeekEntry
    private let gutter: CGFloat = 36

    var body: some View {
        let today = MyWeekFlow.today(entry.data, now: entry.date)
        let leftToday = today?.items.filter { $0.end > MyWeekFlow.minuteOfDay(entry.date) }.count ?? 0
        let ws = MyWeekTimeline.windowStart(now: entry.date)
        VStack(alignment: .leading, spacing: 6) {
            MyWeekHeader(day: today, now: entry.date, leftToday: leftToday)
            GeometryReader { geo in
                let totalMin = CGFloat(MyWeekTimeline.minutes)
                let inset: CGFloat = 7 // room for the first and last hour labels
                let pxPerMin = (geo.size.height - inset * 2) / totalMin
                let colW = geo.size.width - gutter
                let laid = MyWeekTimeline.place(entry.data, now: entry.date)
                let nowRel = CGFloat(MyWeekFlow.minuteOfDay(entry.date) - ws)
                ZStack(alignment: .topLeading) {
                    // Hour lines + labels
                    ForEach(Array(stride(from: 0, through: MyWeekTimeline.minutes, by: 30)), id: \.self) { m in
                        let y = inset + CGFloat(m) * pxPerMin
                        let abs = ws + m
                        let hour = m % 60 == 0
                        HStack(spacing: 6) {
                            Text(hour ? MyWeekTimeline.hourLabel(abs) : (m == MyWeekTimeline.minutes ? MyWeekFlow.clock(abs) : String(format: ":%02d", abs % 60)))
                                .font(.system(size: hour ? 9.5 : 8, weight: abs % 1440 == 0 ? .heavy : (hour ? .semibold : .medium)))
                                .foregroundColor(abs % 1440 == 0 ? MyWeekPalette.accent : (hour ? MyWeekPalette.faint : MyWeekPalette.faint.opacity(0.7)))
                                .frame(width: gutter - 6, alignment: .trailing)
                                .lineLimit(1).minimumScaleFactor(0.7)
                            Rectangle().fill(abs % 1440 == 0 ? MyWeekPalette.accent.opacity(0.5) : (hour ? MyWeekPalette.hairline : MyWeekPalette.hairline.opacity(0.5))).frame(height: 1)
                        }
                        .offset(y: y - 6)
                        if abs % 1440 == 0 && m > 0 {
                            // Sits on the line itself, cutting it, never inside a block.
                            Text("TOMORROW").font(.system(size: 8, weight: .heavy)).tracking(0.8).foregroundColor(MyWeekPalette.accent)
                                .padding(.horizontal, 5).padding(.vertical, 1.5)
                                .background(RoundedRectangle(cornerRadius: 5).fill(Color(hex: "0E140F")))
                                .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(MyWeekPalette.accent.opacity(0.5), lineWidth: 1))
                                .frame(width: geo.size.width, alignment: .trailing)
                                .offset(y: y - 8)
                        }
                    }
                    // Free stretches
                    ForEach(Array(laid.free.enumerated()), id: \.offset) { _, f in
                        let y = inset + CGFloat(f.start) * pxPerMin
                        let h = CGFloat(f.end - f.start) * pxPerMin
                        RoundedRectangle(cornerRadius: 7)
                            .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                            .foregroundColor(MyWeekPalette.accent.opacity(0.35))
                            .frame(width: colW, height: max(8, h - 4))
                            .overlay(
                                Text("\(MyWeekFlow.dur(f.end - f.start)) free")
                                    .font(.system(size: h >= 26 ? 10 : 8.5, weight: .bold)).foregroundColor(MyWeekPalette.accent.opacity(0.85))
                                    .lineLimit(1).minimumScaleFactor(0.7)
                            )
                            .offset(x: gutter, y: y + 2)
                    }
                    // Blocks
                    ForEach(laid.placed) { p in
                        let w = p.strip ? colW : (colW - CGFloat(p.cols - 1) * 3) / CGFloat(p.cols)
                        let x = gutter + (p.strip ? 0 : CGFloat(p.col) * (w + 3))
                        let y = inset + CGFloat(p.start) * pxPerMin + (p.strip ? CGFloat(p.lane) * 12 : 1)
                        let h = max(3, CGFloat(p.end - p.start) * pxPerMin - 2)
                        MyWeekBlock(p: p, height: h)
                            .frame(width: w, alignment: .leading)
                            .offset(x: x, y: y)
                    }
                    // Now line
                    if nowRel >= 0 && nowRel <= totalMin {
                        let y = inset + nowRel * pxPerMin
                        HStack(spacing: 4) {
                            Text(MyWeekFlow.short(MyWeekFlow.minuteOfDay(entry.date)))
                                .font(.system(size: 9, weight: .heavy)).foregroundColor(Color(hex: "FF5A5F"))
                                .frame(width: gutter - 6, alignment: .trailing)
                            RoundedRectangle(cornerRadius: 1).fill(Color(hex: "FF5A5F")).frame(width: 4, height: 6)
                            Rectangle().fill(Color(hex: "FF5A5F")).frame(height: 1.5)
                        }
                        .offset(y: y - 3)
                    }
                }
                // Offset children do not size the stack: pin it to the full
                // timeline area or the clip cuts everything below the first hour.
                .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
                .clipped()
            }
        }
        .padding(2)
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

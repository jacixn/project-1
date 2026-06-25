//
//  BiblelyVerseWidgetBundle.swift
//  BiblelyVerseWidget
//

import WidgetKit
import SwiftUI

@main
struct BiblelyVerseWidgetBundle: WidgetBundle {
    var body: some Widget {
        BiblelyVerseWidget()
        FuelWidget()
        TodoWidget()
        AddTaskWidget()
        HabitsWidget()
        BodyCompWidget()
    }
}

// MARK: - Shared premium design system for all Biblely widgets
// Color(hex:) is defined in HabitsWidget.swift and is available target-wide.

enum WidgetUI {
    static func grad(_ a: String, _ b: String, _ start: UnitPoint = .topLeading, _ end: UnitPoint = .bottomTrailing) -> LinearGradient {
        LinearGradient(gradient: Gradient(colors: [Color(hex: a), Color(hex: b)]), startPoint: start, endPoint: end)
    }

    // Domain gradients
    static var verse: LinearGradient { grad("3DDC84", "11935A") }
    static var habits: LinearGradient { grad("7C8CFF", "4135C7") }
    static var vision: LinearGradient { grad("B794F6", "6D28D9") }
    static var fuel: LinearGradient { grad("FFB259", "E8671C") }
    static var body: LinearGradient { grad("3AD6C8", "0C8C83") }
    static var todo: LinearGradient { grad("63A9FF", "2A6CE2") }
    static var add: LinearGradient { grad("48E08C", "0E9A51") }

    // Soft top sheen for depth (placed over the gradient).
    static var sheen: LinearGradient {
        LinearGradient(gradient: Gradient(colors: [Color.white.opacity(0.18), Color.white.opacity(0.0)]),
                       startPoint: .top, endPoint: .center)
    }

    // Frosted inner tile (for sub-cards / stat blocks on a gradient).
    static var tile: Color { Color.white.opacity(0.16) }
    static var tileSoft: Color { Color.white.opacity(0.1) }
    static var hairline: Color { Color.white.opacity(0.18) }
}

// Full-bleed gradient background with sheen — apply to the root of each widget.
struct WidgetCanvas<Content: View>: View {
    let gradient: LinearGradient
    let content: Content
    init(_ gradient: LinearGradient, @ViewBuilder content: () -> Content) {
        self.gradient = gradient
        self.content = content()
    }
    var body: some View {
        if #available(iOS 17.0, *) {
            // On iOS 17+ the gradient + sheen are supplied EDGE-TO-EDGE via each
            // widget's .containerBackground (so the color fills the whole widget,
            // including the system margin). Here we only render the content.
            content
        } else {
            ZStack {
                gradient
                WidgetUI.sheen
                content
            }
        }
    }
}

// A small uppercase status pill (counts, branding).
struct WidgetPill: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 9, weight: .heavy))
            .tracking(0.4)
            .foregroundColor(.white)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Capsule().fill(Color.white.opacity(0.22)))
    }
}

// Header: SF symbol + title (white on gradient), optional trailing pill text.
struct WidgetHeader: View {
    let icon: String
    let title: String
    var trailing: String? = nil
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: icon).font(.system(size: 12, weight: .bold)).foregroundColor(.white.opacity(0.95))
            Text(title).font(.system(size: 13, weight: .bold)).foregroundColor(.white)
            Spacer(minLength: 0)
            if let t = trailing { WidgetPill(text: t) }
        }
    }
}

// Thin rounded progress bar.
struct WidgetBar: View {
    var progress: Double
    var tint: Color = .white
    var height: CGFloat = 6
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.22))
                Capsule().fill(tint)
                    .frame(width: max(height, geo.size.width * min(1, max(0, progress))))
            }
        }
        .frame(height: height)
    }
}

// Progress ring used as data viz (scores / percentages). Not a decorative halo.
struct WidgetRing<Center: View>: View {
    var progress: Double
    var size: CGFloat = 64
    var line: CGFloat = 7
    var tint: Color = .white
    @ViewBuilder var center: () -> Center
    var body: some View {
        ZStack {
            Circle().stroke(Color.white.opacity(0.2), lineWidth: line)
            Circle()
                .trim(from: 0, to: min(1, max(0.001, progress)))
                .stroke(tint, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
            center()
        }
        .frame(width: size, height: size)
    }
}

//
//  FuelWidget.swift
//  BiblelyVerseWidget
//
//  Shows daily calorie & macro progress from the Fuel / Nutrition feature.
//  Data is written by the React Native app via WidgetBridge -> shared UserDefaults.
//

import WidgetKit
import SwiftUI

// MARK: - Data Model

struct FuelData: Codable {
    let caloriesConsumed: Int
    let caloriesTarget: Int
    let proteinConsumed: Int
    let proteinTarget: Int
    let carbsConsumed: Int
    let carbsTarget: Int
    let fatConsumed: Int
    let fatTarget: Int
    let foodCount: Int
    let hasProfile: Bool
    let lastUpdated: String
}

// MARK: - Timeline Entry

struct FuelEntry: TimelineEntry {
    let date: Date
    let data: FuelData?
}

// MARK: - Timeline Provider

struct FuelProvider: TimelineProvider {

    private static let suiteName = "group.com.jesusxoi.biblely"
    private static let key = "widgetFuelData"

    private func loadData() -> FuelData? {
        guard let defaults = UserDefaults(suiteName: FuelProvider.suiteName),
              let jsonString = defaults.string(forKey: FuelProvider.key),
              let jsonData = jsonString.data(using: .utf8),
              let fuel = try? JSONDecoder().decode(FuelData.self, from: jsonData) else {
            return nil
        }
        return fuel
    }

    func placeholder(in context: Context) -> FuelEntry {
        FuelEntry(date: Date(), data: FuelData(
            caloriesConsumed: 1250,
            caloriesTarget: 2000,
            proteinConsumed: 80,
            proteinTarget: 150,
            carbsConsumed: 120,
            carbsTarget: 200,
            fatConsumed: 40,
            fatTarget: 65,
            foodCount: 3,
            hasProfile: true,
            lastUpdated: ""
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (FuelEntry) -> Void) {
        // In preview/gallery, show placeholder data so users see a filled widget
        let data = loadData() ?? (context.isPreview ? placeholder(in: context).data : nil)
        completion(FuelEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FuelEntry>) -> Void) {
        let entry = FuelEntry(date: Date(), data: loadData())
        // Refresh every 30 minutes; also force-refreshed from React Native side
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }
}

// MARK: - Private helper views (file-scoped, prefixed to avoid duplicate symbols)

private struct FuelMacroRow: View {
    let label: String
    let consumed: Int
    let target: Int
    let tint: Color

    private var progress: Double {
        guard target > 0 else { return 0 }
        return min(Double(consumed) / Double(target), 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(label.uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .tracking(0.6)
                    .foregroundColor(.white.opacity(0.7))
                Spacer()
                Text("\(consumed)")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                + Text(" / \(target)g")
                    .font(.system(size: 9, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.55))
            }
            WidgetBar(progress: progress, tint: tint, height: 5)
        }
    }
}

private struct FuelEmptyState: View {
    let compact: Bool

    var body: some View {
        if compact {
            VStack(spacing: 8) {
                Image(systemName: "fork.knife")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundColor(.white)
                Text("Set up Fuel")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                Text("Open the app to start tracking")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.65))
                    .multilineTextAlignment(.center)
            }
        } else {
            HStack(spacing: 16) {
                Image(systemName: "fork.knife")
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundColor(.white)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Set up Fuel")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                    Text("Open the app to set up your nutrition profile and start tracking.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.65))
                        .lineLimit(2)
                }
                Spacer(minLength: 0)
            }
        }
    }
}

// MARK: - Widget Views

struct FuelWidgetSmallView: View {
    let entry: FuelEntry

    private func remaining(_ data: FuelData) -> Int {
        max(data.caloriesTarget - data.caloriesConsumed, 0)
    }

    private func ringProgress(_ data: FuelData) -> Double {
        guard data.caloriesTarget > 0 else { return 0 }
        return min(Double(data.caloriesConsumed) / Double(data.caloriesTarget), 1.0)
    }

    var body: some View {
        WidgetCanvas(WidgetUI.fuel) {
            if let data = entry.data, data.hasProfile {
                VStack(spacing: 0) {
                    WidgetHeader(icon: "fork.knife", title: "Fuel", trailing: "\(data.foodCount)")

                    Spacer(minLength: 6)

                    WidgetRing(
                        progress: ringProgress(data),
                        size: 84,
                        line: 9,
                        tint: .white,
                        center: {
                            VStack(spacing: 0) {
                                Text("\(remaining(data))")
                                    .font(.system(size: 23, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                                Text("LEFT")
                                    .font(.system(size: 8, weight: .bold))
                                    .tracking(1)
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }
                    )

                    Spacer(minLength: 6)

                    HStack(alignment: .firstTextBaseline, spacing: 0) {
                        Text("\(data.caloriesConsumed)")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text(" / \(data.caloriesTarget) cal")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                .padding(12)
            } else {
                FuelEmptyState(compact: true)
                    .padding(12)
            }
        }
    }
}

struct FuelWidgetMediumView: View {
    let entry: FuelEntry

    private func remaining(_ data: FuelData) -> Int {
        max(data.caloriesTarget - data.caloriesConsumed, 0)
    }

    private func ringProgress(_ data: FuelData) -> Double {
        guard data.caloriesTarget > 0 else { return 0 }
        return min(Double(data.caloriesConsumed) / Double(data.caloriesTarget), 1.0)
    }

    var body: some View {
        WidgetCanvas(WidgetUI.fuel) {
            if let data = entry.data, data.hasProfile {
                HStack(spacing: 16) {
                    // Left: calorie ring hero
                    VStack(spacing: 8) {
                        WidgetRing(
                            progress: ringProgress(data),
                            size: 96,
                            line: 10,
                            tint: .white,
                            center: {
                                VStack(spacing: 0) {
                                    Text("\(remaining(data))")
                                        .font(.system(size: 26, weight: .bold, design: .rounded))
                                        .foregroundColor(.white)
                                    Text("LEFT")
                                        .font(.system(size: 8, weight: .bold))
                                        .tracking(1)
                                        .foregroundColor(.white.opacity(0.6))
                                }
                            }
                        )
                        Text("\(data.caloriesConsumed) / \(data.caloriesTarget) cal")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    }

                    // Right: header + macro bars
                    VStack(alignment: .leading, spacing: 10) {
                        WidgetHeader(icon: "fork.knife", title: "Fuel", trailing: "\(data.foodCount) meals")

                        FuelMacroRow(
                            label: "Protein",
                            consumed: data.proteinConsumed,
                            target: data.proteinTarget,
                            tint: Color(hex: "5AA9FF")
                        )
                        FuelMacroRow(
                            label: "Carbs",
                            consumed: data.carbsConsumed,
                            target: data.carbsTarget,
                            tint: Color(hex: "FFC04D")
                        )
                        FuelMacroRow(
                            label: "Fat",
                            consumed: data.fatConsumed,
                            target: data.fatTarget,
                            tint: Color(hex: "FF7A7A")
                        )
                    }
                }
                .padding(16)
            } else {
                FuelEmptyState(compact: false)
                    .padding(16)
            }
        }
    }
}

struct FuelWidgetView: View {
    var entry: FuelEntry
    @Environment(\.widgetFamily) var family

    private var deepLink: URL? {
        URL(string: "biblely://fuel")
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                FuelWidgetSmallView(entry: entry)
            case .systemMedium:
                FuelWidgetMediumView(entry: entry)
            default:
                FuelWidgetSmallView(entry: entry)
            }
        }
        .widgetURL(deepLink)
    }
}

// MARK: - Widget Configuration

struct FuelWidget: Widget {
    let kind: String = "BiblelyFuelWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FuelProvider()) { entry in
            if #available(iOS 17.0, *) {
                FuelWidgetView(entry: entry)
                    .containerBackground(for: .widget) { ZStack { WidgetUI.fuel; WidgetUI.sheen } }
            } else {
                FuelWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Fuel Tracker")
        .description("Track your daily calories and macros at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

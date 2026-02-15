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

// MARK: - Calorie Ring View (reusable)

struct CalorieRingView: View {
    let consumed: Int
    let target: Int
    let ringSize: CGFloat
    let lineWidth: CGFloat

    private var progress: Double {
        guard target > 0 else { return 0 }
        return min(Double(consumed) / Double(target), 1.0)
    }

    private var isOver: Bool {
        consumed > target
    }

    private var remaining: Int {
        max(target - consumed, 0)
    }

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(Color.white.opacity(0.1), lineWidth: lineWidth)

            // Progress ring
            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(
                    isOver ? Color.red : Color.green,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Center text
            VStack(spacing: 1) {
                Text("\(remaining)")
                    .font(.system(size: ringSize * 0.22, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text("left")
                    .font(.system(size: ringSize * 0.1, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .frame(width: ringSize, height: ringSize)
    }
}

// MARK: - Macro Bar View

struct MacroBarView: View {
    let label: String
    let consumed: Int
    let target: Int
    let color: Color

    private var progress: Double {
        guard target > 0 else { return 0 }
        return min(Double(consumed) / Double(target), 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(label)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white.opacity(0.7))
                Spacer()
                Text("\(consumed)/\(target)g")
                    .font(.system(size: 9, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.5))
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 5)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(color)
                        .frame(width: geo.size.width * CGFloat(progress), height: 5)
                }
            }
            .frame(height: 5)
        }
    }
}

// MARK: - Widget Views

struct FuelWidgetSmallView: View {
    let entry: FuelEntry

    var body: some View {
        if let data = entry.data, data.hasProfile {
            ZStack {
                // Background
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.06, green: 0.09, blue: 0.08),
                        Color(red: 0.10, green: 0.14, blue: 0.10)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 6) {
                    // Header
                    HStack {
                        Image("WidgetLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 12, height: 12)
                            .opacity(0.6)
                        Text("Fuel")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color.green.opacity(0.8))
                        Spacer()
                    }

                    Spacer(minLength: 0)

                    // Calorie ring
                    CalorieRingView(
                        consumed: data.caloriesConsumed,
                        target: data.caloriesTarget,
                        ringSize: 80,
                        lineWidth: 7
                    )

                    Spacer(minLength: 0)

                    // Bottom stats
                    HStack {
                        Text("\(data.caloriesConsumed)")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text("/ \(data.caloriesTarget) cal")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .padding(12)
            }
        } else {
            // No profile placeholder
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.06, green: 0.09, blue: 0.08),
                        Color(red: 0.10, green: 0.14, blue: 0.10)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 8) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.green.opacity(0.6))
                    Text("Set up Fuel")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Text("Open the app to get started")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                        .multilineTextAlignment(.center)
                }
                .padding(12)
            }
        }
    }
}

struct FuelWidgetMediumView: View {
    let entry: FuelEntry

    var body: some View {
        if let data = entry.data, data.hasProfile {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.06, green: 0.09, blue: 0.08),
                        Color(red: 0.10, green: 0.14, blue: 0.10)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 16) {
                    // Left: Calorie ring
                    VStack(spacing: 6) {
                        CalorieRingView(
                            consumed: data.caloriesConsumed,
                            target: data.caloriesTarget,
                            ringSize: 90,
                            lineWidth: 8
                        )
                        Text("\(data.caloriesConsumed) / \(data.caloriesTarget) cal")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    }

                    // Right: Macro bars
                    VStack(spacing: 10) {
                        // Header
                        HStack {
                            Image("WidgetLogo")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 12, height: 12)
                                .opacity(0.6)
                            Text("Fuel")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color.green.opacity(0.8))
                            Spacer()
                            Text("\(data.foodCount) meals")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundColor(.white.opacity(0.4))
                        }

                        MacroBarView(
                            label: "Protein",
                            consumed: data.proteinConsumed,
                            target: data.proteinTarget,
                            color: Color(red: 0.35, green: 0.65, blue: 1.0)
                        )

                        MacroBarView(
                            label: "Carbs",
                            consumed: data.carbsConsumed,
                            target: data.carbsTarget,
                            color: Color(red: 1.0, green: 0.75, blue: 0.3)
                        )

                        MacroBarView(
                            label: "Fat",
                            consumed: data.fatConsumed,
                            target: data.fatTarget,
                            color: Color(red: 0.9, green: 0.4, blue: 0.4)
                        )
                    }
                }
                .padding(14)
            }
        } else {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.06, green: 0.09, blue: 0.08),
                        Color(red: 0.10, green: 0.14, blue: 0.10)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 16) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.green.opacity(0.6))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Set up Fuel")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white.opacity(0.8))
                        Text("Open the app to set up your nutrition profile and start tracking.")
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
                    .containerBackground(.clear, for: .widget)
            } else {
                FuelWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Fuel Tracker")
        .description("Track your daily calories and macros at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

//
//  BiblelyVerseWidget.swift
//  BiblelyVerseWidget
//

import WidgetKit
import SwiftUI

// MARK: - Verse Data Model
struct WidgetVerse: Codable {
    let reference: String
    let text: String
}

// MARK: - Timeline Entry
struct VerseEntry: TimelineEntry {
    let date: Date
    let reference: String
    let text: String
}

// MARK: - Timeline Provider
struct VerseProvider: TimelineProvider {
    
    // Load verses from bundled JSON
    private func loadVerses() -> [WidgetVerse] {
        guard let url = Bundle.main.url(forResource: "widget-verses", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let verses = try? JSONDecoder().decode([WidgetVerse].self, from: data) else {
            // Fallback verse if JSON fails to load
            return [WidgetVerse(reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.")]
        }
        return verses
    }
    
    // Get verse for current hour
    private func getVerseForHour() -> WidgetVerse {
        let verses = loadVerses()
        let calendar = Calendar.current
        let now = Date()
        
        // Calculate hour of year (0-8759)
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: now) ?? 1
        let hour = calendar.component(.hour, from: now)
        let hourOfYear = ((dayOfYear - 1) * 24) + hour
        
        // Cycle through verses
        let index = hourOfYear % verses.count
        return verses[index]
    }
    
    func placeholder(in context: Context) -> VerseEntry {
        VerseEntry(
            date: Date(),
            reference: "Psalm 23:1",
            text: "The Lord is my shepherd, I lack nothing."
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
        let verse = getVerseForHour()
        let entry = VerseEntry(date: Date(), reference: verse.reference, text: verse.text)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
        let verse = getVerseForHour()
        let currentDate = Date()
        let entry = VerseEntry(date: currentDate, reference: verse.reference, text: verse.text)
        
        // Refresh at the next hour
        let calendar = Calendar.current
        let nextHour = calendar.date(byAdding: .hour, value: 1, to: currentDate)!
        let nextRefresh = calendar.startOfHour(for: nextHour)
        
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }
}

// MARK: - Extension for Calendar
extension Calendar {
    func startOfHour(for date: Date) -> Date {
        let components = dateComponents([.year, .month, .day, .hour], from: date)
        return self.date(from: components) ?? date
    }
}

// MARK: - Home Screen Widget View
struct VerseWidgetView: View {
    var entry: VerseEntry
    @Environment(\.widgetFamily) var family
    
    // Generate deep link URL for the verse
    private var verseURL: URL? {
        let encoded = entry.reference.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return URL(string: "biblely://verse?ref=\(encoded)")
    }
    
    var body: some View {
        if #available(iOS 16.0, *) {
            switch family {
            case .accessoryRectangular:
                // Lock screen rectangular widget
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Image("WidgetLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 13, height: 13)
                        Text(entry.reference.uppercased())
                            .font(.system(size: 11, weight: .heavy))
                            .minimumScaleFactor(0.7)
                    }
                    Text(entry.text)
                        .font(.system(size: 11, weight: .medium, design: .serif))
                        .lineLimit(3)
                        .minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .widgetURL(verseURL)

            case .accessoryCircular:
                // Lock screen circular widget
                VStack(spacing: 1) {
                    Image("WidgetLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 16, height: 16)
                    Text(entry.reference.components(separatedBy: " ").last ?? "")
                        .font(.system(size: 10, weight: .bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                .widgetURL(verseURL)

            case .accessoryInline:
                // Lock screen inline widget (single line of text)
                Text(entry.reference)
                    .widgetURL(verseURL)

            default:
                homeScreenView
            }
        } else {
            homeScreenView
        }
    }

    private var homeScreenView: some View {
        WidgetCanvas(WidgetUI.verse) {
            VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 12) {
                // Reference as an accent pill plus header glyph
                HStack(spacing: 8) {
                    Image(systemName: "book.fill")
                        .font(.system(size: family == .systemSmall ? 12 : 14, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))
                    Text(entry.reference.uppercased())
                        .font(.system(size: family == .systemSmall ? 11 : 12, weight: .heavy))
                        .tracking(0.5)
                        .foregroundColor(.white.opacity(0.85))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 0)
                }

                // Verse text is the hero, elegant serif
                Text(entry.text)
                    .font(.system(size: getFontSize(), weight: .semibold, design: .serif))
                    .foregroundColor(.white)
                    .lineLimit(getLineLimit())
                    .lineSpacing(family == .systemSmall ? 2 : 3)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Spacer(minLength: 0)

                // Subtle Biblely branding
                HStack(spacing: 5) {
                    Rectangle()
                        .fill(WidgetUI.hairline)
                        .frame(width: 18, height: 1)
                    Text("BIBLELY")
                        .font(.system(size: 9, weight: .bold))
                        .tracking(1.5)
                        .foregroundColor(.white.opacity(0.5))
                    Spacer(minLength: 0)
                }
            }
            .padding(family == .systemSmall ? 12 : 16)
        }
        .widgetURL(verseURL)
    }
    
    private func getFontSize() -> CGFloat {
        switch family {
        case .systemSmall:
            return entry.text.count > 120 ? 11 : 12
        case .systemMedium:
            return entry.text.count > 200 ? 12 : 14
        case .systemLarge:
            return 16
        default:
            return 14
        }
    }
    
    private func getLineLimit() -> Int {
        switch family {
        case .systemSmall:
            return 6
        case .systemMedium:
            return 5
        case .systemLarge:
            return 12
        default:
            return 5
        }
    }
}

// MARK: - Widget Configuration
struct BiblelyVerseWidget: Widget {
    let kind: String = "BiblelyVerseWidget"
    
    private var supportedFamilies: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [
                .systemSmall,
                .systemMedium,
                .accessoryRectangular,
                .accessoryCircular,
                .accessoryInline
            ]
        } else {
            return [.systemSmall, .systemMedium]
        }
    }
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VerseProvider()) { entry in
            if #available(iOS 17.0, *) {
                VerseWidgetView(entry: entry)
                    .containerBackground(for: .widget) { ZStack { WidgetUI.verse; WidgetUI.sheen } }
            } else {
                VerseWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Daily Verse")
        .description("A new Bible verse every hour from 2,305 curated verses.")
        .supportedFamilies(supportedFamilies)
    }
}

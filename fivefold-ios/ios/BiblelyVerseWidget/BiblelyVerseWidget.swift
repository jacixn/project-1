import WidgetKit
import SwiftUI

struct VerseEntry: TimelineEntry {
  let date: Date
  let reference: String
  let text: String
}

struct VerseProvider: TimelineProvider {
  private let appGroupId = "group.com.jesusxoi.biblely"

  func placeholder(in context: Context) -> VerseEntry {
    VerseEntry(date: Date(), reference: "John 3:16", text: "For God so loved the world...")
  }

  func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
    completion(loadEntry(for: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
    let now = Date()
    let entry = loadEntry(for: now)

    var components = Calendar.current.dateComponents([.year, .month, .day], from: now)
    components.day = (components.day ?? 0) + 1
    let nextRefresh = Calendar.current.date(from: components) ?? now.addingTimeInterval(60 * 60 * 24)

    completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
  }

  private func loadEntry(for date: Date) -> VerseEntry {
    if let shared = UserDefaults(suiteName: appGroupId) {
      let reference = shared.string(forKey: "currentVerseReference")
      let text = shared.string(forKey: "currentVerseText")
      if let reference = reference {
        return VerseEntry(
          date: date,
          reference: reference,
          text: (text?.isEmpty == false ? text! : "Tap to open Biblely for the full verse.")
        )
      }
    }

    let verses = loadVerseReferences()
    let reference = pickReference(from: verses, date: date)

    return VerseEntry(
      date: date,
      reference: reference ?? "Psalm 23:1",
      text: "Verse of the Day • Tap to open Biblely"
    )
  }

  private func loadVerseReferences() -> [String] {
    guard
      let url = Bundle.main.url(forResource: "daily-verses-references", withExtension: "json"),
      let data = try? Data(contentsOf: url),
      let payload = try? JSONDecoder().decode(VersesPayload.self, from: data)
    else {
      return []
    }
    return payload.verses
  }

  private func pickReference(from verses: [String], date: Date) -> String? {
    guard !verses.isEmpty else { return nil }
    let day = Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
    let index = (day - 1) % verses.count
    return verses[index]
  }
}

struct VersesPayload: Decodable {
  let verses: [String]
}

struct BiblelyVerseWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: VerseEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryRectangular:
        lockScreenView
      case .systemSmall:
        smallView
      default:
        mediumView
      }
    }
    .widgetURL(URL(string: "biblely://verse"))
    .padding(family == .accessoryRectangular ? 0 : 12)
    .background(backgroundView)
    .containerBackground(for: family)
  }

  private var backgroundView: some View {
    LinearGradient(
      colors: [
        Color(red: 0.24, green: 0.18, blue: 0.36),
        Color(red: 0.16, green: 0.10, blue: 0.28)
      ],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  private var lockScreenView: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 6) {
        Image(systemName: "book.fill")
          .font(.system(size: 12, weight: .semibold))
        Text("Verse of the Day")
          .font(.system(size: 12, weight: .semibold))
      }
      .foregroundColor(.white.opacity(0.9))

      Text(entry.reference)
        .font(.system(size: 15, weight: .bold))
        .foregroundColor(.white)
        .lineLimit(1)

      Text(entry.text)
        .font(.system(size: 12, weight: .medium))
        .foregroundColor(.white.opacity(0.85))
        .lineLimit(2)
    }
  }

  private var smallView: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 6) {
        Image(systemName: "book.fill")
          .font(.system(size: 13, weight: .semibold))
        Text("VOTD")
          .font(.system(size: 12, weight: .semibold))
      }
      .foregroundColor(.white.opacity(0.9))

      Text(entry.reference)
        .font(.system(size: 16, weight: .bold))
        .foregroundColor(.white)
        .lineLimit(1)

      Text(entry.text)
        .font(.system(size: 12, weight: .medium))
        .foregroundColor(.white.opacity(0.9))
        .lineLimit(3)
    }
  }

  private var mediumView: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        HStack(spacing: 8) {
          Image(systemName: "book.fill")
            .font(.system(size: 13, weight: .semibold))
          Text("Verse of the Day")
            .font(.system(size: 13, weight: .semibold))
        }
        Spacer()
        Text("Biblely")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(.white.opacity(0.75))
      }
      .foregroundColor(.white.opacity(0.9))

      Text(entry.reference)
        .font(.system(size: 18, weight: .bold))
        .foregroundColor(.white)
        .lineLimit(1)

      Text(entry.text)
        .font(.system(size: 13, weight: .medium))
        .foregroundColor(.white.opacity(0.92))
        .lineLimit(3)
    }
  }
}

private extension View {
  @ViewBuilder
  func containerBackground(for family: WidgetFamily) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(.clear, for: family == .accessoryRectangular ? .widget : .widget)
    } else {
      self
    }
  }
}

struct BiblelyVerseWidget: Widget {
  let kind: String = "BiblelyVerseWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: VerseProvider()) { entry in
      BiblelyVerseWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Verse of the Day")
    .description("See a fresh verse on your Lock Screen and Home Screen.")
    .supportedFamilies([.accessoryRectangular, .systemSmall, .systemMedium])
  }
}


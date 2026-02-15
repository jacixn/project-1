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
    }
}

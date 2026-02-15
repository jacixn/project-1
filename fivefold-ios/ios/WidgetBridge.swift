//
//  WidgetBridge.swift
//  Biblely
//
//  Native module that writes widget data to the shared App Group UserDefaults
//  and triggers WidgetKit timeline reloads so widgets pick up changes instantly.
//

import Foundation
import WidgetKit

@objc(WidgetBridge)
class WidgetBridge: NSObject {

  private static let suiteName = "group.com.jesusxoi.biblely"

  // MARK: - Exposed to React Native

  /// Write a JSON string to shared UserDefaults under `key`, then reload widget timelines.
  @objc
  func setWidgetData(_ key: String, jsonString: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: WidgetBridge.suiteName) else {
      rejecter("ERR_NO_SUITE", "Could not open App Group UserDefaults", nil)
      return
    }

    defaults.set(jsonString, forKey: key)
    defaults.synchronize()

    // Reload all widget timelines so they pick up the new data
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }

    resolver(true)
  }

  /// Convenience: remove a key from shared UserDefaults.
  @objc
  func removeWidgetData(_ key: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: WidgetBridge.suiteName) else {
      rejecter("ERR_NO_SUITE", "Could not open App Group UserDefaults", nil)
      return
    }

    defaults.removeObject(forKey: key)
    defaults.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }

    resolver(true)
  }

  // MARK: - Module config

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

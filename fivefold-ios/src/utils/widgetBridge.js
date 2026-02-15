/**
 * widgetBridge.js — Pushes live data to iOS WidgetKit widgets via the
 * WidgetBridge native module (shared App Group UserDefaults).
 *
 * Call updateFuelWidget() after any nutrition data change.
 * Call updateTodoWidget() after any todo add / complete / delete / edit.
 */

import { NativeModules, Platform } from 'react-native';
import { getStoredData } from './localStorage';

const { WidgetBridge } = NativeModules;

// Shared UserDefaults keys (must match the Swift widget code)
const FUEL_KEY = 'widgetFuelData';
const TODO_KEY = 'widgetTodoData';

/**
 * Safely write JSON to the shared App Group container and reload widgets.
 * No-ops gracefully on Android or if the native module is missing.
 */
async function setWidgetData(key, data) {
  if (Platform.OS !== 'ios' || !WidgetBridge?.setWidgetData) return;
  try {
    const json = JSON.stringify(data);
    await WidgetBridge.setWidgetData(key, json);
  } catch (err) {
    console.warn('⚠️ widgetBridge.setWidgetData failed:', err);
  }
}

// ─── Fuel / Nutrition Widget ───────────────────────────────────────────

/**
 * Read today's nutrition progress and push it to the Fuel widget.
 * Uses a lazy require to avoid circular imports (nutritionService -> widgetBridge -> nutritionService).
 */
export async function updateFuelWidget() {
  try {
    // Lazy require to break circular dependency
    const nutritionService = require('../services/nutritionService').default;

    const dateKey = nutritionService.getDateKey(new Date());
    const progress = await nutritionService.getDailyProgress(dateKey);

    // Math.round() guarantees integers — Swift's Codable Int decoder
    // rejects JSON floats like 1250.5, so we must send clean ints.
    const payload = {
      caloriesConsumed: Math.round(progress.consumed?.calories || 0),
      caloriesTarget: Math.round(progress.targets?.calories || 2000),
      proteinConsumed: Math.round(progress.consumed?.protein || 0),
      proteinTarget: Math.round(progress.targets?.protein || 150),
      carbsConsumed: Math.round(progress.consumed?.carbs || 0),
      carbsTarget: Math.round(progress.targets?.carbs || 200),
      fatConsumed: Math.round(progress.consumed?.fat || 0),
      fatTarget: Math.round(progress.targets?.fat || 65),
      foodCount: Math.round(progress.consumed?.foodCount || 0),
      hasProfile: progress.hasProfile || false,
      lastUpdated: new Date().toISOString(),
    };

    await setWidgetData(FUEL_KEY, payload);
  } catch (err) {
    console.warn('⚠️ updateFuelWidget failed:', err);
  }
}

// ─── Todo Widget ───────────────────────────────────────────────────────

/**
 * Read today's pending todos and push them to the Todo widget.
 * Shows today's scheduled tasks + overdue tasks, up to 6 items.
 */
export async function updateTodoWidget() {
  try {
    const allTodos = (await getStoredData('todos')) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Filter: not completed, scheduled for today or overdue
    const pending = allTodos.filter((t) => !t.completed);
    const todayTodos = pending.filter((t) => {
      if (!t.scheduledDate) return false;
      return t.scheduledDate <= todayStr; // today + overdue
    });

    // Sort: overdue first, then by scheduled time
    todayTodos.sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate < b.scheduledDate ? -1 : 1;
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
    });

    // Also count unscheduled as "anytime" tasks
    const unscheduledCount = pending.filter((t) => !t.scheduledDate).length;

    const completedToday = allTodos.filter(
      (t) => t.completed && t.completedAt && t.completedAt.startsWith(todayStr)
    ).length;

    const payload = {
      todos: todayTodos.slice(0, 6).map((t) => ({
        id: t.id,
        text: t.text,
        tier: t.tier || 'mid',
        scheduledTime: t.scheduledTime || null,
      })),
      totalCount: todayTodos.length + unscheduledCount,
      todayCount: todayTodos.length,
      unscheduledCount,
      completedCount: completedToday,
      lastUpdated: new Date().toISOString(),
    };

    await setWidgetData(TODO_KEY, payload);
  } catch (err) {
    console.warn('⚠️ updateTodoWidget failed:', err);
  }
}

export default {
  updateFuelWidget,
  updateTodoWidget,
};

/**
 * widgetBridge.js — Pushes live data to iOS WidgetKit widgets via the
 * WidgetBridge native module (shared App Group UserDefaults).
 *
 * Call updateFuelWidget() after any nutrition data change.
 * Call updateTodoWidget() after any todo add / complete / delete / edit.
 * Call updateHabitsWidget() after any habit check-in / add / delete / edit.
 * Call updateVisionWidget() after any vision add / update / delete / achieve.
 * Call updateBodyCompWidget() after nutrition profile changes.
 */

import { NativeModules, Platform } from 'react-native';
import { getStoredData } from './localStorage';

const { WidgetBridge } = NativeModules;

// Shared UserDefaults keys (must match the Swift widget code)
const FUEL_KEY = 'widgetFuelData';
const TODO_KEY = 'widgetTodoData';
const HABITS_KEY = 'widgetHabitsData';
const VISION_KEY = 'widgetVisionData';
const BODY_COMP_KEY = 'widgetBodyCompData';

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

// ─── Habits Widget ──────────────────────────────────────────────────────

/**
 * Read habits data and push it to the Habits widget.
 */
export async function updateHabitsWidget() {
  try {
    const { loadHabits, isCheckedInToday } = require('../services/habitsService');
    const habits = await loadHabits();

    const todayChecked = habits.filter((h) => isCheckedInToday(h));
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);

    const payload = {
      habits: habits.slice(0, 6).map((h) => ({
        name: h.name,
        color: h.color || '#4CAF50',
        currentStreak: h.currentStreak || 0,
        isCheckedIn: isCheckedInToday(h),
      })),
      totalCount: habits.length,
      completedToday: todayChecked.length,
      bestStreak,
      lastUpdated: new Date().toISOString(),
    };

    await setWidgetData(HABITS_KEY, payload);
  } catch (err) {
    console.warn('widgetBridge: updateHabitsWidget failed:', err);
  }
}

// ─── Vision Widget ──────────────────────────────────────────────────────

/**
 * Read active visions and push them to the Vision widget.
 */
export async function updateVisionWidget() {
  try {
    const visionService = require('../services/visionService').default;
    const allVisions = await visionService.loadVisions();
    const active = visionService.getActiveVisions(allVisions);
    const achieved = allVisions.filter((v) => v.status === 'achieved');

    const payload = {
      visions: active.slice(0, 5).map((v) => {
        const progress = visionService.getProgress(v);
        return {
          title: v.title,
          category: v.category || 'other',
          progressPercent: progress > 0 ? Math.max(1, Math.round(progress * 100)) : 0,
          timeRemaining: visionService.getTimeRemaining(v),
        };
      }),
      totalActive: active.length,
      totalAchieved: achieved.length,
      lastUpdated: new Date().toISOString(),
    };

    await setWidgetData(VISION_KEY, payload);
  } catch (err) {
    console.warn('widgetBridge: updateVisionWidget failed:', err);
  }
}

// ─── Body Composition Widget ────────────────────────────────────────────

/**
 * Read body composition data and push it to the Body Comp widget.
 */
export async function updateBodyCompWidget() {
  try {
    const nutritionService = require('../services/nutritionService').default;
    const bodyCompositionService = require('../services/bodyCompositionService').default;

    const profile = await nutritionService.getProfile();
    if (!profile || !profile.weightKg || !profile.heightCm) {
      await setWidgetData(BODY_COMP_KEY, { hasProfile: false, lastUpdated: new Date().toISOString() });
      return;
    }

    const data = bodyCompositionService.calculate(profile);
    if (!data) {
      await setWidgetData(BODY_COMP_KEY, { hasProfile: false, lastUpdated: new Date().toISOString() });
      return;
    }

    const payload = {
      healthScore: Math.round(data.healthScore),
      bodyAge: Math.round(data.bodyAge),
      bmi: Math.round(data.bmi * 10) / 10,
      bmiStatus: data.bmiStatus.label,
      bodyFat: Math.round(data.bodyFat * 10) / 10,
      bodyFatStatus: data.bodyFatStatus.label,
      muscleRate: Math.round(data.muscleRate * 10) / 10,
      muscleStatus: data.muscleStatus.label,
      weight: Math.round(data.weight * 10) / 10,
      hasProfile: true,
      lastUpdated: new Date().toISOString(),
    };

    await setWidgetData(BODY_COMP_KEY, payload);
  } catch (err) {
    console.warn('widgetBridge: updateBodyCompWidget failed:', err);
  }
}

export default {
  updateFuelWidget,
  updateTodoWidget,
  updateHabitsWidget,
  updateVisionWidget,
  updateBodyCompWidget,
};

// Day templates persistence + side effects. Pure rules live in
// utils/dayTemplates.js. Every write funnels through here so storage, the
// cloud copy, the Biblely calendar mirror (what EyeCandy and the Calendar
// app see) and My Week never drift apart.
import { DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';
import {
  PRESET_TEMPLATES, makeTemplate, normalizeTemplate, normalizePlan, emptyPlan, prunePlan,
  withDateTemplate, withWeekdayTemplate, withoutDateChoice, withOverride, withoutTemplate,
  blocksForDay, templateIdForDay, templateForDay, minToHm, reminderHiddenOn, groupHiddenOn, hideGroupsFor,
} from '../utils/dayTemplates';

// Local (utils/dayBusy pulls in services that pull in notifications; this
// file is required from there, so no cycle).
const dateKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const DAY_PLAN_CHANGED = 'dayPlanChanged';
const TEMPLATES_KEY = 'dayTemplates';
const PLAN_KEY = 'dayPlan';

const push = (key, data) => { try { require('./userSyncService').pushToCloud(key, data); } catch {} };
const mirror = () => { try { require('./calendarSync').syncBlocks(); } catch {} };
// Hidden reminders must not ring: the next-fire dates depend on the plan.
const requiet = () => {
  try {
    const ns = require('./notificationService').default;
    ns.rescheduleAllReminderNotifications().catch(() => {});
    ns.scheduleStoredPrayerReminders().catch(() => {});
    ns._rescheduleTaskNotifications().catch(() => {});
    ns._rescheduleWorkoutNotifications().catch(() => {});
  } catch {}
};
const emit = () => { try { DeviceEventEmitter.emit(DAY_PLAN_CHANGED); } catch {} try { require('../utils/widgetBridge').updateMyWeekWidget().catch(() => {}); } catch {} };

// First open seeds the three starting points so the sheet is never empty.
export const getTemplates = async () => {
  const stored = await getStoredData(TEMPLATES_KEY);
  if (stored && Array.isArray(stored.list)) return stored.list.map(normalizeTemplate);
  const seeded = PRESET_TEMPLATES.map((p) => makeTemplate(p.name, p.blocks));
  await saveData(TEMPLATES_KEY, { list: seeded, seededAt: Date.now() });
  return seeded;
};
export const saveTemplates = async (list) => {
  const clean = (list || []).map(normalizeTemplate);
  await saveData(TEMPLATES_KEY, { list: clean, savedAt: Date.now() });
  push(TEMPLATES_KEY, { list: clean });
  mirror(); requiet(); emit();
  return clean;
};
export const upsertTemplate = async (t) => {
  const clean = normalizeTemplate(t);
  const list = await getTemplates();
  const i = list.findIndex((x) => x.id === clean.id);
  if (i >= 0) list[i] = clean; else list.push(clean);
  await saveTemplates(list);
  return clean;
};
export const deleteTemplate = async (id) => {
  const list = (await getTemplates()).filter((t) => t.id !== id);
  await saveData(TEMPLATES_KEY, { list, savedAt: Date.now() });
  push(TEMPLATES_KEY, { list });
  await savePlan(withoutTemplate(await getPlan(), id));
  return list;
};

export const getPlan = async () => normalizePlan((await getStoredData(PLAN_KEY)) || emptyPlan());
export const savePlan = async (plan) => {
  const clean = prunePlan(plan, dateKeyOf(new Date()));
  await saveData(PLAN_KEY, clean);
  push(PLAN_KEY, clean);
  mirror(); requiet(); emit();
  return clean;
};

// Put a template on one date (templateId null = nothing today), and
// optionally on that weekday every week.
export const useTemplateOn = async (dateKey, templateId, { everyWeek = false, dow = null } = {}) => {
  let plan = await getPlan();
  if (everyWeek && dow != null) {
    plan = withWeekdayTemplate(plan, dow, templateId);
    plan = withoutDateChoice(plan, dateKey); // the weekday rule now covers today too
  } else {
    plan = withDateTemplate(plan, dateKey, templateId);
  }
  return savePlan(plan);
};
export const clearWeekday = async (dow) => savePlan(withWeekdayTemplate(await getPlan(), dow, null));

// Per-day exceptions (Move panel, planner, Calendar adoption).
export const moveBlockForDay = async (dateKey, blockId, { startMin, endMin }) =>
  savePlan(withOverride(await getPlan(), dateKey, blockId, { start: minToHm(startMin), end: minToHm(endMin) }));
export const skipBlockForDay = async (dateKey, blockId) => savePlan(withOverride(await getPlan(), dateKey, blockId, null));
export const restoreBlockForDay = async (dateKey, blockId) => savePlan(withOverride(await getPlan(), dateKey, blockId, undefined));

// What My Week / the calendar mirror need for one day.
export const getBlocksForDay = async (date) => {
  const [templates, plan] = await Promise.all([getTemplates(), getPlan()]);
  return blocksForDay(templates, plan, dateKeyOf(date), date.getDay());
};
export const getTemplateIdForDay = async (date) => templateIdForDay(await getPlan(), dateKeyOf(date), date.getDay());
// { keep: [block titles], hide: [groups] } for the day, or null without a template.
export const getTemplateDayFor = async (date) => {
  const [templates, plan] = await Promise.all([getTemplates(), getPlan()]);
  const key = dateKeyOf(date);
  const t = templateForDay(templates, plan, key, date.getDay());
  if (!t) return null;
  return { keep: blocksForDay(templates, plan, key, date.getDay()).map((b) => b.title), hide: hideGroupsFor(t), template: t };
};
// Dates (next `days` days) on which a whole group is turned off by a template.
export const hiddenDatesForGroup = async (group, days = 15) => {
  const out = new Set();
  try {
    const [templates, plan] = await Promise.all([getTemplates(), getPlan()]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= days; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      if (groupHiddenOn(group, templates, plan, dateKeyOf(d), d.getDay())) out.add(dateKeyOf(d));
    }
  } catch {}
  return out;
};

// Dates (next `days` days) on which this reminder is silenced by a template.
export const hiddenDatesForReminder = async (reminder, days = 15) => {
  const out = new Set();
  if (!reminder) return out;
  try {
    const [templates, plan] = await Promise.all([getTemplates(), getPlan()]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= days; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      if (reminderHiddenOn(reminder, templates, plan, dateKeyOf(d), d.getDay())) out.add(dateKeyOf(d));
    }
  } catch {}
  return out;
};

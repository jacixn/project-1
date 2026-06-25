import { getStoredData, saveData } from '../utils/localStorage';
import { pushToCloud } from './userSyncService';
import notificationService from './notificationService';

const STORAGE_KEY = 'user_reminders';

const generateId = () => `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ── Reminder presets (quick-start templates) ───────────────────────────────
// A preset is a reusable template: tapping it pre-fills the create form so the
// user can tweak time/days and save. Built-ins ship with the app; users can save
// their own from any reminder. Presets hold no runtime state (no enabled/completions).
const PRESETS_KEY = 'reminder_presets';

export const BUILTIN_REMINDER_PRESETS = [
  { id: 'preset_breakfast', title: 'Eat breakfast', icon: 'restaurant', color: '#F59E0B', time: '08:00', type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], builtin: true },
  { id: 'preset_water', title: 'Drink water', icon: 'water-drop', color: '#06B6D4', time: '10:00', type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], builtin: true },
  { id: 'preset_pray', title: 'Pray', icon: 'self-improvement', color: '#8B5CF6', time: '07:00', type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], builtin: true },
  { id: 'preset_bible', title: 'Read Bible', icon: 'school', color: '#10B981', time: '20:00', type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], builtin: true },
  { id: 'preset_workout', title: 'Workout', icon: 'fitness-center', color: '#EF4444', time: '18:00', type: 'recurring', days: [1, 2, 3, 4, 5], builtin: true },
  { id: 'preset_sleep', title: 'Sleep', icon: 'bedtime', color: '#6366F1', time: '22:00', type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], builtin: true },
];

export const loadReminderPresets = async () => {
  try {
    const data = await getStoredData(PRESETS_KEY);
    return Array.isArray(data?.presets) ? data.presets : [];
  } catch (e) {
    return [];
  }
};

export const saveReminderPreset = async ({ title, icon, color, time, type, days }) => {
  const presets = await loadReminderPresets();
  const clean = (title || '').trim();
  if (!clean) return null;
  const newPreset = {
    id: `userpreset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: clean,
    icon: icon || 'notifications',
    color: color || '#3B82F6',
    time: time || '08:00',
    type: type || 'recurring',
    days: Array.isArray(days) ? days : [0, 1, 2, 3, 4, 5, 6],
    builtin: false,
  };
  // Replace an existing preset with the same title (case-insensitive) so saving
  // the same name twice updates rather than duplicates.
  const filtered = presets.filter(p => (p.title || '').trim().toLowerCase() !== clean.toLowerCase());
  const updated = [newPreset, ...filtered];
  await saveData(PRESETS_KEY, { presets: updated });
  pushToCloud(PRESETS_KEY, { presets: updated });
  return newPreset;
};

export const deleteReminderPreset = async (id) => {
  const presets = await loadReminderPresets();
  const updated = presets.filter(p => p.id !== id);
  await saveData(PRESETS_KEY, { presets: updated });
  pushToCloud(PRESETS_KEY, { presets: updated });
};

export const loadReminders = async () => {
  try {
    const data = await getStoredData(STORAGE_KEY);
    if (!data || !data.reminders) return [];
    return data.reminders;
  } catch (e) {
    console.error('Error loading reminders:', e);
    return [];
  }
};

const persist = async (reminders) => {
  const data = { reminders };
  await saveData(STORAGE_KEY, data);
  pushToCloud(STORAGE_KEY, data);
  // Mirror to iPhone Calendar if the user enabled it (no-op otherwise).
  try { require('./calendarSync').syncReminders(reminders); } catch {}
};

export const addReminder = async ({ title, time, type, days, icon, color, date }) => {
  const reminders = await loadReminders();
  const reminderType = type || 'recurring';
  const newReminder = {
    id: generateId(),
    title,
    time: time || '08:00',
    type: reminderType,
    days: days || [0, 1, 2, 3, 4, 5, 6],
    icon: icon || 'notifications',
    color: color || '#3B82F6',
    enabled: true,
    createdAt: new Date().toISOString(),
    completions: {},
    // One-time reminders carry the specific date they fire on. Without this the
    // date was dropped, so getRemindersForDay (which matches r.date === dateStr)
    // never showed them on any day.
    ...(reminderType === 'one-time' && date ? { date } : {}),
  };
  reminders.push(newReminder);
  await persist(reminders);
  notificationService.scheduleReminderNotification(newReminder).catch(() => {});
  return newReminder;
};

export const updateReminder = async (id, updates) => {
  const reminders = await loadReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return null;
  const oldReminder = reminders[idx];
  reminders[idx] = { ...oldReminder, ...updates };
  await persist(reminders);
  notificationService.cancelReminderNotification(id).catch(() => {});
  if (reminders[idx].enabled) {
    notificationService.scheduleReminderNotification(reminders[idx]).catch(() => {});
  }
  return reminders[idx];
};

export const deleteReminder = async (id) => {
  const reminders = await loadReminders();
  const existing = reminders.find(r => r.id === id);
  const filtered = reminders.filter(r => r.id !== id);
  await persist(filtered);
  if (existing) {
    notificationService.cancelReminderNotification(id).catch(() => {});
  }
};

export const toggleReminder = async (id) => {
  const reminders = await loadReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return;
  reminders[idx].enabled = !reminders[idx].enabled;
  await persist(reminders);
  if (reminders[idx].enabled) {
    notificationService.scheduleReminderNotification(reminders[idx]).catch(() => {});
  } else {
    notificationService.cancelReminderNotification(id).catch(() => {});
  }
  return reminders[idx];
};

export const completeReminder = async (id, dateStr) => {
  try {
    const reminders = await loadReminders();
    const idx = reminders.findIndex(r => r.id === id);
    if (idx === -1) {
      console.warn(`[Reminders] completeReminder: id "${id}" not found in ${reminders.length} reminders`);
      return;
    }
    if (!reminders[idx].completions) reminders[idx].completions = {};
    reminders[idx].completions[dateStr] = true;
    await persist(reminders);
  } catch (e) {
    console.error('[Reminders] completeReminder failed:', e);
  }
};

export const uncompleteReminder = async (id, dateStr) => {
  try {
    const reminders = await loadReminders();
    const idx = reminders.findIndex(r => r.id === id);
    if (idx === -1) return;
    if (reminders[idx].completions) {
      delete reminders[idx].completions[dateStr];
    }
    await persist(reminders);
  } catch (e) {
    console.error('[Reminders] uncompleteReminder failed:', e);
  }
};

export const getRemindersForDay = (reminders, dayIndex, dateStr) => {
  return reminders
    .filter(r => {
      if (!r.enabled) return false;
      if (r.type === 'one-time') {
        return r.date === dateStr;
      }
      return (r.days || []).includes(dayIndex);
    })
    .sort((a, b) => {
      const [ah, am] = (a.time || '08:00').split(':').map(Number);
      const [bh, bm] = (b.time || '08:00').split(':').map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '8:00 AM';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

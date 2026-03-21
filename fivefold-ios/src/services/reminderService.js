import { getStoredData, saveData } from '../utils/localStorage';
import { pushToCloud } from './userSyncService';

const STORAGE_KEY = 'user_reminders';

const generateId = () => `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
};

export const addReminder = async ({ title, time, type, days, icon, color }) => {
  const reminders = await loadReminders();
  const newReminder = {
    id: generateId(),
    title,
    time: time || '08:00',
    type: type || 'recurring',
    days: days || [0, 1, 2, 3, 4, 5, 6],
    icon: icon || 'notifications',
    color: color || '#3B82F6',
    enabled: true,
    createdAt: new Date().toISOString(),
    completions: {},
  };
  reminders.push(newReminder);
  await persist(reminders);
  return newReminder;
};

export const updateReminder = async (id, updates) => {
  const reminders = await loadReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return null;
  reminders[idx] = { ...reminders[idx], ...updates };
  await persist(reminders);
  return reminders[idx];
};

export const deleteReminder = async (id) => {
  let reminders = await loadReminders();
  reminders = reminders.filter(r => r.id !== id);
  await persist(reminders);
};

export const toggleReminder = async (id) => {
  const reminders = await loadReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return;
  reminders[idx].enabled = !reminders[idx].enabled;
  await persist(reminders);
  return reminders[idx];
};

export const completeReminder = async (id, dateStr) => {
  const reminders = await loadReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return;
  if (!reminders[idx].completions) reminders[idx].completions = {};
  reminders[idx].completions[dateStr] = true;
  await persist(reminders);
};

export const uncompleteReminder = async (id, dateStr) => {
  const reminders = await loadReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return;
  if (reminders[idx].completions) {
    delete reminders[idx].completions[dateStr];
  }
  await persist(reminders);
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

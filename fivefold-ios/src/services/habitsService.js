import { getStoredData, saveData } from '../utils/localStorage';
import { pushToCloud } from './userSyncService';
import { updateHabitsWidget } from '../utils/widgetBridge';

const STORAGE_KEY = 'user_habits';

const generateId = () => `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const recalcStreak = (checkIns) => {
  if (!checkIns || checkIns.length === 0) return 0;

  const sorted = [...checkIns].sort().reverse();
  const today = todayString();
  const yesterday = yesterdayString();

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 0;
  let expected = new Date();
  if (sorted[0] !== today) {
    expected.setDate(expected.getDate() - 1);
  }

  for (const dateStr of sorted) {
    const expStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
    if (dateStr === expStr) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else if (dateStr < expStr) {
      break;
    }
  }
  return streak;
};

export const loadHabits = async () => {
  try {
    const data = await getStoredData(STORAGE_KEY);
    if (!data || !data.habits) return [];

    return data.habits.map((h) => ({
      ...h,
      currentStreak: recalcStreak(h.checkIns),
    }));
  } catch (e) {
    console.error('Error loading habits:', e);
    return [];
  }
};

const persist = async (habits) => {
  const data = { habits };
  await saveData(STORAGE_KEY, data);
  pushToCloud(STORAGE_KEY, data);
  updateHabitsWidget().catch(() => {});
};

export const addHabit = async ({ name, icon, color, reminderTime }) => {
  const habits = await loadHabits();
  const newHabit = {
    id: generateId(),
    name,
    icon: icon || 'flag',
    color: color || '#4CAF50',
    createdAt: todayString(),
    reminderTime: reminderTime || '22:00',
    notificationEnabled: true,
    checkIns: [],
    currentStreak: 0,
    longestStreak: 0,
  };
  habits.push(newHabit);
  await persist(habits);
  return newHabit;
};

export const deleteHabit = async (habitId) => {
  let habits = await loadHabits();
  habits = habits.filter((h) => h.id !== habitId);
  await persist(habits);
};

export const editHabit = async (habitId, updates) => {
  const habits = await loadHabits();
  const idx = habits.findIndex((h) => h.id === habitId);
  if (idx === -1) return null;
  habits[idx] = { ...habits[idx], ...updates };
  await persist(habits);
  return habits[idx];
};

export const checkIn = async (habitId) => {
  const habits = await loadHabits();
  const idx = habits.findIndex((h) => h.id === habitId);
  if (idx === -1) return null;

  const today = todayString();
  if (!habits[idx].checkIns) habits[idx].checkIns = [];
  if (habits[idx].checkIns.includes(today)) return habits[idx];

  habits[idx].checkIns.push(today);
  habits[idx].currentStreak = recalcStreak(habits[idx].checkIns);
  if (habits[idx].currentStreak > habits[idx].longestStreak) {
    habits[idx].longestStreak = habits[idx].currentStreak;
  }
  await persist(habits);
  return habits[idx];
};

export const isCheckedInToday = (habit) => {
  return habit.checkIns?.includes(todayString()) || false;
};

export const getWeekDots = (habit) => {
  const dots = [];
  const today = todayString();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = str === today;
    const checked = habit.checkIns?.includes(str) || false;
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    dots.push({ date: str, isToday, checked, dayLabel });
  }
  return dots;
};

export const getCompletionRate = (habit) => {
  if (!habit.createdAt) return 0;
  const start = new Date(habit.createdAt + 'T12:00:00');
  const now = new Date();
  const totalDays = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1);
  return Math.round(((habit.checkIns?.length || 0) / totalDays) * 100);
};

export const HABIT_ICONS = [
  { name: 'smoke-free', label: 'No Smoking' },
  { name: 'no-drinks', label: 'No Alcohol' },
  { name: 'fitness-center', label: 'Exercise' },
  { name: 'menu-book', label: 'Reading' },
  { name: 'self-improvement', label: 'Meditation' },
  { name: 'bedtime', label: 'Sleep' },
  { name: 'local-drink', label: 'Water' },
  { name: 'restaurant', label: 'Diet' },
  { name: 'directions-run', label: 'Running' },
  { name: 'spa', label: 'Wellness' },
  { name: 'code', label: 'Coding' },
  { name: 'music-note', label: 'Music' },
  { name: 'brush', label: 'Art' },
  { name: 'savings', label: 'Saving' },
  { name: 'flag', label: 'General' },
  { name: 'favorite', label: 'Health' },
];

export const HABIT_COLORS = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF9800',
  '#E91E63', '#00BCD4', '#FF5722', '#607D8B',
  '#3F51B5', '#009688', '#F44336', '#795548',
];

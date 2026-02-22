/**
 * visionService.js — CRUD + utilities for the Vision (life goals) feature.
 *
 * Each vision is stored as a JSON array under userStorage key 'visions'.
 * Cloud sync uses pushToCloud('visions', ...).
 */

import userStorage from '../utils/userStorage';
import { pushToCloud } from './userSyncService';

const STORAGE_KEY = 'visions';

// ── Helpers ──────────────────────────────────────────────────────────

const generateId = () =>
  `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Calculate how many years to add for a given timeframe label.
 * For 'custom', the caller supplies the targetDate directly.
 */
const yearsForTimeframe = (tf) => {
  switch (tf) {
    case '1yr': return 1;
    case '2yr': return 2;
    case '3yr': return 3;
    case '5yr': return 5;
    case '10yr': return 10;
    default: return 0;
  }
};

export const CATEGORIES = [
  { id: 'faith', label: 'Faith', icon: 'menu-book' },
  { id: 'career', label: 'Career', icon: 'work-outline' },
  { id: 'health', label: 'Health', icon: 'fitness-center' },
  { id: 'family', label: 'Family', icon: 'people-outline' },
  { id: 'education', label: 'Education', icon: 'school' },
  { id: 'finance', label: 'Finance', icon: 'account-balance' },
  { id: 'other', label: 'Other', icon: 'star-outline' },
];

export const TIMEFRAMES = [
  { id: '1yr', label: '1 Year' },
  { id: '2yr', label: '2 Years' },
  { id: '3yr', label: '3 Years' },
  { id: '5yr', label: '5 Years' },
  { id: '10yr', label: '10 Years' },
  { id: 'custom', label: 'Custom' },
];

// ── Progress calculation ─────────────────────────────────────────────

export const getProgress = (vision) => {
  if (vision.status === 'achieved') return 1;
  const now = Date.now();
  const start = new Date(vision.createdAt).getTime();
  const end = new Date(vision.targetDate).getTime();
  if (end <= start) return 1;
  const elapsed = now - start;
  const total = end - start;
  return Math.min(1, Math.max(0, elapsed / total));
};

export const getTimeRemaining = (vision) => {
  if (vision.status === 'achieved') return 'Achieved';
  const now = new Date();
  const target = new Date(vision.targetDate);
  const diff = target - now;
  if (diff <= 0) return 'Target date reached';

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0 && remainingMonths > 0) return `${years}y ${remainingMonths}m left`;
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} left`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} left`;
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`;
  return `${totalHours} hr${totalHours !== 1 ? 's' : ''} left`;
};

// ── CRUD ─────────────────────────────────────────────────────────────

export const loadVisions = async () => {
  try {
    const data = await userStorage.get(STORAGE_KEY);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('[visionService] loadVisions error:', e);
    return [];
  }
};

const persist = async (visions) => {
  await userStorage.set(STORAGE_KEY, visions);
  pushToCloud('visions', visions);
};

export const addVision = async ({ title, timeframe, category, targetDate }) => {
  const visions = await loadVisions();
  const now = new Date().toISOString();

  let computedTarget = targetDate;
  if (!computedTarget && timeframe !== 'custom') {
    const d = new Date();
    d.setFullYear(d.getFullYear() + yearsForTimeframe(timeframe));
    computedTarget = d.toISOString();
  }

  const vision = {
    id: generateId(),
    title: title.trim(),
    timeframe,
    category: category || 'other',
    createdAt: now,
    targetDate: computedTarget,
    reflections: [],
    status: 'active',
  };

  const updated = [vision, ...visions];
  await persist(updated);
  return { vision, all: updated };
};

export const updateVision = async (id, updates) => {
  const visions = await loadVisions();
  const idx = visions.findIndex((v) => v.id === id);
  if (idx === -1) return visions;
  visions[idx] = { ...visions[idx], ...updates };
  await persist(visions);
  return visions;
};

export const deleteVision = async (id) => {
  const visions = await loadVisions();
  const updated = visions.filter((v) => v.id !== id);
  await persist(updated);
  return updated;
};

export const addReflection = async (visionId, note) => {
  const visions = await loadVisions();
  const idx = visions.findIndex((v) => v.id === visionId);
  if (idx === -1) return visions;
  visions[idx].reflections.push({
    date: new Date().toISOString(),
    note: note.trim(),
  });
  await persist(visions);
  return visions;
};

export const markAchieved = async (id) => {
  return updateVision(id, { status: 'achieved', achievedAt: new Date().toISOString() });
};

export const archiveVision = async (id) => {
  return updateVision(id, { status: 'archived' });
};

export const getActiveVisions = (visions) =>
  visions.filter((v) => v.status === 'active');

export const getNearestVision = (visions) => {
  const active = getActiveVisions(visions);
  if (!active.length) return null;
  return active.reduce((nearest, v) =>
    new Date(v.targetDate) < new Date(nearest.targetDate) ? v : nearest
  );
};

export default {
  loadVisions,
  addVision,
  updateVision,
  deleteVision,
  addReflection,
  markAchieved,
  archiveVision,
  getActiveVisions,
  getNearestVision,
  getProgress,
  getTimeRemaining,
  CATEGORIES,
  TIMEFRAMES,
};

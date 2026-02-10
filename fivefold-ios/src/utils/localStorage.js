/**
 * localStorage.js — Convenience wrappers around userStorage.
 *
 * saveData / getStoredData automatically add a `fivefold_` prefix to the key
 * and delegate to the UID-scoped userStorage module, so all data written
 * through these helpers is isolated per Firebase account.
 */

import userStorage from './userStorage';

export const getStoredData = async (key) => {
  try {
    return await userStorage.get(`fivefold_${key}`);
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return null;
  }
};

export const saveData = async (key, data) => {
  try {
    return await userStorage.set(`fivefold_${key}`, data);
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
    return false;
  }
};

export const initializeDefaultData = async () => {
  try {
    const existingStats = await getStoredData('userStats');
    if (existingStats) return;

    const defaultStats = {
      totalPoints: 0,
      level: 1,
      completedTasks: 0,
      totalTasks: 0,
      prayersCompleted: 0,
      currentStreak: 0,
      joinedDate: new Date().toISOString()
    };

    await saveData('userStats', defaultStats);
    await saveData('todos', []);
    await saveData('prayerHistory', []);
    await saveData('settings', { theme: 'light' });
  } catch (error) {
    console.error('Failed to initialize default data:', error);
  }
};

export const createEncryptedBackup = async () => {
  return JSON.stringify({ message: 'Backup feature coming soon!' });
};

export const restoreFromBackup = async () => {
  return true;
};

export const getStorageInfo = async () => {
  return { totalEntries: 0, estimatedSize: '0 KB' };
};

/**
 * aiRateLimiter.js — Per-category daily usage caps for AI features.
 *
 * Tracks usage counts in AsyncStorage keyed by date (ai_usage_YYYY-MM-DD).
 * Automatically resets at midnight local time.
 * Requires email verification before any AI feature can be used.
 */

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

const LIMITS = {
  chat: 50,
  food: 15,
  bible: 25,
  task: 30,
  generation: 10,
  voice: 35,
};

const LIMIT_MESSAGES = {
  chat: "You've reached your daily chat limit (50 messages). Your limit resets at midnight — try again tomorrow!",
  food: "You've reached your daily food scan limit (15 scans). Your limit resets at midnight — try again tomorrow!",
  bible: "You've reached your daily Bible discussion limit (25 uses). Your limit resets at midnight — try again tomorrow!",
  task: "You've reached your daily task analysis limit (30 uses). Your limit resets at midnight — try again tomorrow!",
  generation: "You've reached your daily generation limit (10 uses). Your limit resets at midnight — try again tomorrow!",
  voice: "You've reached your daily voice limit (35 uses). Your limit resets at midnight — try again tomorrow!",
};

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `ai_usage_${yyyy}-${mm}-${dd}`;
}

async function getUsageData() {
  try {
    const key = todayKey();
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

async function saveUsageData(data) {
  try {
    await AsyncStorage.setItem(todayKey(), JSON.stringify(data));
  } catch (_) {}
}

function isEmailVerified() {
  const user = auth.currentUser;
  return user ? user.emailVerified : false;
}

function showVerificationPrompt() {
  Alert.alert(
    'Email Verification Required',
    'To keep our community safe and prevent misuse, smart features are only available to verified accounts. It only takes a moment — go to Profile > Settings > Verify Email to get started.',
    [{ text: 'OK' }],
  );
}

async function checkLimit(category) {
  if (!isEmailVerified()) {
    showVerificationPrompt();
    return { allowed: false, limit: 0, used: 0, message: 'To keep our community safe and prevent misuse, smart features are only available to verified accounts. Go to Profile > Settings > Verify Email to get started.', alertShown: true };
  }

  const limit = LIMITS[category];
  if (!limit) return { allowed: true, remaining: 999 };

  const data = await getUsageData();
  const used = data[category] || 0;

  if (used >= limit) {
    return { allowed: false, limit, used, message: LIMIT_MESSAGES[category] };
  }
  return { allowed: true, remaining: limit - used };
}

async function increment(category) {
  const data = await getUsageData();
  data[category] = (data[category] || 0) + 1;
  await saveUsageData(data);
}

async function getUsage() {
  const data = await getUsageData();
  const result = {};
  for (const cat of Object.keys(LIMITS)) {
    result[cat] = { used: data[cat] || 0, limit: LIMITS[cat] };
  }
  return result;
}

async function cleanup() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const today = todayKey();
    const old = keys.filter(k => k.startsWith('ai_usage_') && k !== today);
    if (old.length > 0) await AsyncStorage.multiRemove(old);
  } catch (_) {}
}

// Run cleanup on import (non-blocking)
cleanup();

export default { checkLimit, increment, getUsage, LIMITS, LIMIT_MESSAGES };

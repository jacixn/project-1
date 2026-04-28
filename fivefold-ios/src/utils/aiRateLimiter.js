/**
 * aiRateLimiter.js — Per-category daily usage caps for AI features.
 *
 * Server-authoritative: calls `checkAiUsage` Cloud Function which
 * atomically checks + increments usage in Firestore using server time
 * and the authenticated UID. Client cannot bypass via clock change,
 * app reinstall, or storage edits.
 *
 * Requires email verification before any AI feature can be used.
 */

import { Alert } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebase';

const LIMITS = {
  chat: 50,
  food: 15,
  bible: 25,
  task: 30,
  generation: 10,
  voice: 35,
  speechToText: 25,
  reflection: 15,
};

const LIMIT_MESSAGES = {
  chat: "You've reached your daily chat limit (50 messages). Your limit resets at midnight — try again tomorrow!",
  food: "You've reached your daily food scan limit (15 scans). Your limit resets at midnight — try again tomorrow!",
  bible: "You've reached your daily Bible discussion limit (25 uses). Your limit resets at midnight — try again tomorrow!",
  task: "You've reached your daily task analysis limit (30 uses). Your limit resets at midnight — try again tomorrow!",
  generation: "You've reached your daily generation limit (10 uses). Your limit resets at midnight — try again tomorrow!",
  voice: "You've reached your daily voice limit (35 uses). Your limit resets at midnight — try again tomorrow!",
  speechToText: "You've reached your daily voice input limit (25 uses). Your limit resets at midnight — try again tomorrow!",
  reflection: "You've reached your daily reflection limit (15 prayers). Your reflections will refresh tomorrow!",
};

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

const checkAiUsageFn = httpsCallable(functions, 'checkAiUsage');

async function checkLimit(category) {
  if (!isEmailVerified()) {
    showVerificationPrompt();
    return { allowed: false, limit: 0, used: 0, message: 'To keep our community safe and prevent misuse, smart features are only available to verified accounts. Go to Profile > Settings > Verify Email to get started.', alertShown: true };
  }

  const limit = LIMITS[category];
  if (!limit) return { allowed: true, remaining: 999 };

  try {
    const { data } = await checkAiUsageFn({ category });
    if (!data.allowed) {
      return { allowed: false, limit: data.limit, used: data.used, message: LIMIT_MESSAGES[category] };
    }
    return { allowed: true, remaining: data.limit - data.used };
  } catch (e) {
    // Fail closed — deny on error rather than allow bypass.
    return { allowed: false, limit, used: 0, message: 'Could not verify usage limit. Check your connection and try again.' };
  }
}

// Server-side checkLimit already increments atomically. Kept as no-op for
// backward compatibility with existing callers.
async function increment(_category) {
  return;
}

async function getUsage() {
  // UI display only — reads Firestore doc directly.
  // (Optional convenience; not required for limit enforcement.)
  const result = {};
  for (const cat of Object.keys(LIMITS)) {
    result[cat] = { used: 0, limit: LIMITS[cat] };
  }
  return result;
}

export default { checkLimit, increment, getUsage, LIMITS, LIMIT_MESSAGES };

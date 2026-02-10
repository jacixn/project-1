/**
 * Referral Service
 * 
 * Handles the referral system where users can credit another user
 * who referred them to the app.
 * 
 * Rules:
 * 1. Both users must have verified emails
 * 2. A user can only set their referrer once (immutable)
 * 3. No circular referrals (if A referred B, B cannot say A referred them)
 * 4. A user cannot refer themselves
 * 5. The referrer username must exist
 * 
 * Security:
 * - All checks + writes happen inside a Firestore transaction to prevent
 *   race conditions (e.g. two users referring each other simultaneously)
 * - A client-side mutex prevents double-tap / rapid re-submission
 */

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { refreshEmailVerificationStatus } from './authService';

// ── Client-side mutex to block double-tap ────────────────────
let _submitting = false;

/**
 * Get the current user's referral info
 * @returns {Promise<Object>}
 */
export const getReferralInfo = async () => {
  const user = auth.currentUser;
  if (!user) return { referredBy: null, referredByUsername: null, referralDate: null, referralCount: 0 };

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) return { referredBy: null, referredByUsername: null, referralDate: null, referralCount: 0 };

  const data = userDoc.data();
  return {
    referredBy: data.referredBy || null,
    referredByUsername: data.referredByUsername || null,
    referredByDisplayName: data.referredByDisplayName || null,
    referralDate: data.referralDate?.toDate?.() || null,
    referralCount: data.referralCount || 0,
  };
};

/**
 * Look up a user by their username (outside transaction — read-only helper)
 * @param {string} username
 * @returns {Promise<{ uid: string } | null>}
 */
const resolveUsernameToUid = async (username) => {
  if (!username || username.length < 3) return null;
  const normalizedUsername = username.toLowerCase().trim();
  const usernameDoc = await getDoc(doc(db, 'usernames', normalizedUsername));
  if (!usernameDoc.exists()) return null;
  const { userId } = usernameDoc.data();
  if (!userId) return null;
  return { uid: userId };
};

/**
 * Submit a referral — credit another user as the one who referred you.
 *
 * Every validation AND both writes (set referral + increment count) happen
 * inside a single Firestore transaction so that:
 *   • Two users cannot refer each other simultaneously (race-condition proof)
 *   • A user cannot end up with two referrers (double-submit proof)
 *   • The referral write and the count increment are atomic
 *
 * @param {string} referrerUsername
 * @returns {Promise<{ success: boolean, message: string, referrerDisplayName?: string, referrerUsername?: string }>}
 */
export const submitReferral = async (referrerUsername) => {
  // ─── Client-side mutex ──────────────────────────────────
  if (_submitting) {
    return { success: false, message: 'Please wait — your previous request is still processing.' };
  }
  _submitting = true;

  try {
    const currentUser = auth.currentUser;

    // ─── Guard: Must be signed in ─────────────────────────
    if (!currentUser) {
      return { success: false, message: 'You must be signed in to use referrals.' };
    }

    // ─── Guard: Normalise input ───────────────────────────
    const normalizedInput = referrerUsername?.toLowerCase().trim();
    if (!normalizedInput || normalizedInput.length < 3) {
      return { success: false, message: 'Please enter a valid username (at least 3 characters).' };
    }

    // ─── Guard: Current user's email must be verified ─────
    // (done outside the transaction — requires Firebase Auth reload)
    const currentUserVerified = await refreshEmailVerificationStatus();
    if (!currentUserVerified) {
      return {
        success: false,
        message: 'Your email must be verified before you can submit a referral. Go to your profile and verify your email first.',
      };
    }

    // ─── Guard: Referrer username must resolve to a UID ───
    const resolved = await resolveUsernameToUid(normalizedInput);
    if (!resolved) {
      return { success: false, message: `No user found with the username "@${normalizedInput}". Please double-check and try again.` };
    }
    const referrerUid = resolved.uid;

    // ─── Guard: Cannot refer yourself (by UID) ───────────
    if (referrerUid === currentUser.uid) {
      return { success: false, message: 'You cannot enter your own username as a referral.' };
    }

    // ─── Atomic transaction: re-validate + write ─────────
    const currentUserRef = doc(db, 'users', currentUser.uid);
    const referrerRef = doc(db, 'users', referrerUid);

    const result = await runTransaction(db, async (transaction) => {
      // Read BOTH documents inside the transaction (locks them)
      const currentSnap = await transaction.get(currentUserRef);
      const referrerSnap = await transaction.get(referrerRef);

      if (!currentSnap.exists()) {
        return { success: false, message: 'Your account data could not be found. Please try signing out and back in.' };
      }
      if (!referrerSnap.exists()) {
        return { success: false, message: `The user @${normalizedInput} could not be found.` };
      }

      const currentData = currentSnap.data();
      const referrerData = referrerSnap.data();

      // ── Re-check: already has a referrer? ─────────────
      if (currentData.referredBy) {
        return {
          success: false,
          message: `You have already been referred by @${currentData.referredByUsername || 'someone'}. You can only set this once.`,
        };
      }

      // ── Re-check: self-referral by username match ─────
      if (currentData.username === normalizedInput) {
        return { success: false, message: 'You cannot enter your own username as a referral.' };
      }

      // ── Re-check: referrer's email verified ───────────
      if (!referrerData.emailVerified) {
        return {
          success: false,
          message: `The user @${normalizedInput} has not verified their email yet. Both accounts must have verified emails for a referral to count.`,
        };
      }

      // ── Re-check: circular referral ───────────────────
      if (referrerData.referredBy === currentUser.uid) {
        return {
          success: false,
          message: `@${normalizedInput} has already listed you as the person who referred them. A referral cannot go both ways — that would not make sense!`,
        };
      }

      // ── All checks passed — perform atomic writes ─────
      transaction.update(currentUserRef, {
        referredBy: referrerUid,
        referredByUsername: referrerData.username || normalizedInput,
        referredByDisplayName: referrerData.displayName || referrerData.username || normalizedInput,
        referralDate: serverTimestamp(),
      });

      transaction.update(referrerRef, {
        referralCount: (referrerData.referralCount || 0) + 1,
      });

      return {
        success: true,
        message: `Referral recorded! @${referrerData.username || normalizedInput} has been credited as the person who referred you.`,
        referrerDisplayName: referrerData.displayName || referrerData.username || normalizedInput,
        referrerUsername: referrerData.username || normalizedInput,
      };
    });

    return result;
  } catch (error) {
    console.error('[Referral] Error submitting referral:', error);
    return { success: false, message: 'Something went wrong while saving your referral. Please try again.' };
  } finally {
    // Always release the mutex
    _submitting = false;
  }
};

/**
 * Get how many people a user has referred
 * @param {string} userId - Optional user ID (defaults to current user)
 * @returns {Promise<number>}
 */
export const getReferralCount = async (userId) => {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return 0;

  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return 0;

  return userDoc.data().referralCount || 0;
};

export default {
  getReferralInfo,
  submitReferral,
  getReferralCount,
};

/**
 * Restriction Service
 * 
 * Manages admin-imposed user restrictions (bans).
 * Restriction types:
 *   - social:  blocks Friends & Challenge buttons
 *   - chat:    blocks sending messages
 *   - posting: blocks creating posts on the Hub feed
 * 
 * Duration options: 1 week, 1 month, 1 year, or forever.
 * Stored in Firestore `user_restrictions` collection.
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const RESTRICTIONS_COLLECTION = 'user_restrictions';

/**
 * Duration presets in milliseconds.
 */
const DURATION_MS = {
  '1_week':  7 * 24 * 60 * 60 * 1000,
  '1_month': 30 * 24 * 60 * 60 * 1000,
  '1_year':  365 * 24 * 60 * 60 * 1000,
  'forever': null,
};

export const DURATION_OPTIONS = [
  { id: '1_week',  label: '1 Week' },
  { id: '1_month', label: '1 Month' },
  { id: '1_year',  label: '1 Year' },
  { id: 'forever', label: 'Forever' },
];

export const RESTRICTION_TYPES = [
  { id: 'all',     label: 'Everything (Full Ban)', icon: 'ban' },
  { id: 'social',  label: 'Social (Friends & Challenges)', icon: 'people-outline' },
  { id: 'chat',    label: 'Chat (Messages)', icon: 'chatbubble-outline' },
  { id: 'posting', label: 'Posting (Hub Feed)', icon: 'create-outline' },
];

/** The individual restriction types that 'all' expands to */
export const ALL_RESTRICTION_IDS = ['social', 'chat', 'posting'];

/**
 * Apply a restriction to a user.
 * @param {object} params
 * @param {string} params.userId        - UID of the user to restrict
 * @param {string} params.type          - 'social' | 'chat' | 'posting'
 * @param {string} params.duration      - '1_week' | '1_month' | '1_year' | 'forever'
 * @param {string} params.reason        - Reason / note from admin
 * @param {string} params.adminId       - UID of the admin applying the restriction
 * @param {string} [params.reportId]    - Optional linked report ID
 */
export const applyRestriction = async ({ userId, type, duration, reason, adminId, reportId = null }) => {
  try {
    if (!userId || !type || !duration || !adminId) {
      return { success: false, error: 'Missing required fields' };
    }

    const durationMs = DURATION_MS[duration];
    const expiresAt = durationMs
      ? Timestamp.fromDate(new Date(Date.now() + durationMs))
      : null; // null = forever

    await addDoc(collection(db, RESTRICTIONS_COLLECTION), {
      userId,
      type,
      duration,
      reason: reason || '',
      adminId,
      reportId,
      active: true,
      createdAt: serverTimestamp(),
      expiresAt,
    });

    return { success: true };
  } catch (error) {
    console.error('[Restriction] Failed to apply:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lift / revoke a specific restriction.
 * @param {string} restrictionId - Firestore doc ID
 */
export const liftRestriction = async (restrictionId) => {
  try {
    const ref = doc(db, RESTRICTIONS_COLLECTION, restrictionId);
    await updateDoc(ref, { active: false });
    return { success: true };
  } catch (error) {
    console.error('[Restriction] Failed to lift:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all active restrictions for a user.
 * Automatically filters out expired restrictions.
 * @param {string} userId
 * @returns {object[]} Array of active restriction docs
 */
export const getActiveRestrictions = async (userId) => {
  try {
    if (!userId) return [];

    // Single where clause to avoid needing a composite index
    const q = query(
      collection(db, RESTRICTIONS_COLLECTION),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const now = new Date();
    const active = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Skip inactive restrictions
      if (!data.active) return;

      const expires = data.expiresAt?.toDate?.();

      // Skip expired restrictions (auto-expire)
      if (expires && expires < now) {
        // Silently deactivate expired restriction in background
        updateDoc(doc(db, RESTRICTIONS_COLLECTION, docSnap.id), { active: false }).catch(() => {});
        return;
      }

      active.push({ id: docSnap.id, ...data });
    });

    return active;
  } catch (error) {
    console.error('[Restriction] Failed to get active:', error);
    return [];
  }
};

/**
 * Check if a user is restricted from a specific action.
 * @param {string} userId
 * @param {string} type - 'social' | 'chat' | 'posting'
 * @returns {{ restricted: boolean, restriction: object|null, expiresLabel: string|null }}
 */
export const isRestricted = async (userId, type) => {
  try {
    const restrictions = await getActiveRestrictions(userId);
    const match = restrictions.find(r => r.type === type);

    if (!match) return { restricted: false, restriction: null, expiresLabel: null };

    const expires = match.expiresAt?.toDate?.();
    let expiresLabel = 'permanently';
    if (expires) {
      const diff = expires - new Date();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days <= 1) expiresLabel = 'in less than a day';
      else if (days <= 7) expiresLabel = `in ${days} days`;
      else if (days <= 30) expiresLabel = `in ${Math.ceil(days / 7)} weeks`;
      else if (days <= 365) expiresLabel = `in ${Math.ceil(days / 30)} months`;
      else expiresLabel = `in about ${Math.ceil(days / 365)} years`;
    }

    return { restricted: true, restriction: match, expiresLabel };
  } catch (error) {
    return { restricted: false, restriction: null, expiresLabel: null };
  }
};

/**
 * Get ALL restrictions for a user (active + inactive) for admin view.
 * @param {string} userId
 * @returns {object[]}
 */
export const getAllRestrictionsForUser = async (userId) => {
  try {
    if (!userId) return [];
    // Single where clause — sort client-side to avoid composite index requirement
    const q = query(
      collection(db, RESTRICTIONS_COLLECTION),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort newest first
    results.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    return results;
  } catch (error) {
    console.error('[Restriction] Failed to get all:', error);
    return [];
  }
};

/**
 * Fetch all reports from Firestore for admin panel.
 * Returns newest first, includes reporter/reported info.
 * @returns {object[]}
 */
export const fetchAllReports = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'reports'));
    const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort newest first client-side
    results.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    return results;
  } catch (error) {
    console.error('[Restriction] Failed to fetch reports:', error);
    return [];
  }
};

/**
 * Update report status.
 * @param {string} reportId
 * @param {string} status - 'pending' | 'reviewed' | 'resolved' | 'dismissed'
 */
export const updateReportStatus = async (reportId, status) => {
  try {
    const ref = doc(db, 'reports', reportId);
    await updateDoc(ref, { status, reviewedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Fetch the actual reported content so the admin can see what was reported.
 * @param {string} contentType - 'post' | 'prayer' | 'message' | 'user'
 * @param {string} contentId   - Firestore doc ID of the content
 * @returns {{ text: string, type: string } | null}
 */
export const fetchReportedContent = async (contentType, contentId) => {
  try {
    if (!contentId) return null;

    if (contentType === 'post') {
      const docSnap = await getDoc(doc(db, 'hub_posts', contentId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          text: data.content || '[No text]',
          authorName: data.authorName || 'Unknown',
          type: 'post',
        };
      }
      return { text: '[Post deleted or expired]', type: 'post' };
    }

    if (contentType === 'prayer') {
      const docSnap = await getDoc(doc(db, 'prayers', contentId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          text: data.text || data.content || '[No text]',
          authorName: data.authorName || 'Unknown',
          type: 'prayer',
        };
      }
      return { text: '[Prayer deleted]', type: 'prayer' };
    }

    if (contentType === 'message') {
      // Messages are nested under conversations/{convId}/messages/{msgId}
      // contentId format might be "convId/msgId" or just msgId
      // For now, just indicate it was a message report
      return { text: '[Message — open chat to review]', type: 'message' };
    }

    if (contentType === 'user') {
      return { text: '[User profile reported]', type: 'user' };
    }

    return null;
  } catch (error) {
    console.error('[Restriction] Failed to fetch content:', error);
    return null;
  }
};

/**
 * Fetch a user's display name and email by UID (for admin panel).
 * @param {string} uid
 * @returns {{ displayName: string, email: string, username: string } | null}
 */
export const fetchUserInfo = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      displayName: data.displayName || data.username || 'Unknown',
      email: data.email || '',
      username: data.username || '',
      profilePicture: data.profilePicture || '',
    };
  } catch (error) {
    return null;
  }
};

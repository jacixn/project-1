/**
 * Report & Block Service
 * 
 * Handles user reporting and blocking for Apple Guideline 1.2 (UGC) compliance.
 * - Report offensive content (prayers, posts, messages, users)
 * - Block abusive users
 * - Retrieve blocked user list for filtering
 */

import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const REPORTS_COLLECTION = 'reports';
const BLOCKED_USERS_COLLECTION = 'blocked_users';

/** Available report reasons */
export const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Inappropriate Content' },
  { id: 'harassment', label: 'Harassment or Bullying' },
  { id: 'spam', label: 'Spam' },
  { id: 'hate_speech', label: 'Hate Speech' },
  { id: 'self_harm', label: 'Self-Harm or Dangerous Content' },
  { id: 'other', label: 'Other' },
];

/**
 * Report a piece of content or user.
 * @param {object} params
 * @param {string} params.reporterId       - UID of the person reporting
 * @param {string} params.reportedUserId   - UID of the content owner / reported user
 * @param {string} params.contentType      - 'prayer' | 'post' | 'message' | 'user'
 * @param {string} [params.contentId]      - Firestore doc ID of the content (optional for 'user' type)
 * @param {string} params.reason           - One of REPORT_REASONS[].id
 * @param {string} [params.details]        - Optional extra detail text
 */
export const reportContent = async ({ reporterId, reportedUserId, contentType, contentId = null, reason, details = '' }) => {
  try {
    if (!reporterId || !reportedUserId || !contentType || !reason) {
      return { success: false, error: 'Missing required fields' };
    }

    await addDoc(collection(db, REPORTS_COLLECTION), {
      reporterId,
      reportedUserId,
      contentType,
      contentId,
      reason,
      details,
      status: 'pending', // pending | reviewed | resolved | dismissed
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Block a user. Creates a document in blocked_users keyed by `userId_blockedUserId`.
 */
export const blockUser = async (userId, blockedUserId) => {
  try {
    if (!userId || !blockedUserId) return { success: false, error: 'Missing user IDs' };

    const blockDocId = `${userId}_${blockedUserId}`;
    await setDoc(doc(db, BLOCKED_USERS_COLLECTION, blockDocId), {
      userId,
      blockedUserId,
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Unblock a user.
 */
export const unblockUser = async (userId, blockedUserId) => {
  try {
    const blockDocId = `${userId}_${blockedUserId}`;
    await deleteDoc(doc(db, BLOCKED_USERS_COLLECTION, blockDocId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all blocked user IDs for a given user.
 * @returns {string[]} Array of blocked user UIDs
 */
export const getBlockedUsers = async (userId) => {
  try {
    if (!userId) return [];
    const q = query(
      collection(db, BLOCKED_USERS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data().blockedUserId);
  } catch (error) {
    return [];
  }
};

/**
 * Check if a specific user is blocked by the current user.
 */
export const isUserBlocked = async (userId, otherUserId) => {
  try {
    const blockDocId = `${userId}_${otherUserId}`;
    const docSnap = await getDoc(doc(db, BLOCKED_USERS_COLLECTION, blockDocId));
    return docSnap.exists();
  } catch (error) {
    return false;
  }
};

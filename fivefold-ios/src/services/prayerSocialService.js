/**
 * Prayer Social Service
 * 
 * Handles all social prayer-related operations:
 * - Creating and sharing prayer requests
 * - Prayer feed management
 * - "Praying for you" interactions
 * - Comments on prayers
 * - Prayer partners
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getFriendsData } from './friendsService';

/**
 * Create a new prayer request
 * @param {Object} params - Prayer parameters
 * @param {string} params.userId - User's Firebase UID
 * @param {string} params.displayName - User's display name
 * @param {string} params.username - User's username
 * @param {string} params.profilePicture - User's profile picture URL
 * @param {string} params.countryFlag - User's country flag emoji
 * @param {string} params.content - Prayer request content
 * @param {string} params.visibility - "friends" or "public"
 * @returns {Promise<Object>} - Created prayer object with ID
 */
export const createPrayerRequest = async ({
  userId,
  displayName,
  username,
  profilePicture,
  countryFlag,
  content,
  visibility = 'friends',
}) => {
  if (!userId || !content) {
    throw new Error('User ID and content are required');
  }

  try {
    const prayerData = {
      userId,
      displayName: displayName || 'Anonymous',
      username: username || 'user',
      profilePicture: profilePicture || '',
      countryFlag: countryFlag || '',
      content: content.trim(),
      visibility,
      createdAt: serverTimestamp(),
      prayingCount: 0,
      prayingUsers: [],
      comments: [],
      isActive: true,
    };

    const prayerRef = await addDoc(collection(db, 'prayers'), prayerData);
    
    console.log('[PrayerSocial] Created prayer request:', prayerRef.id);
    
    return {
      id: prayerRef.id,
      ...prayerData,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating prayer request:', error);
    throw error;
  }
};

/**
 * Get prayer feed for a user (prayers from friends + public prayers)
 * @param {string} userId - User's Firebase UID
 * @param {number} limitCount - Maximum number of prayers to fetch
 * @returns {Promise<Array>} - Array of prayer objects
 */
export const getPrayerFeed = async (userId, limitCount = 50) => {
  if (!userId) return [];

  try {
    // Get user's friends list
    const friendsData = await getFriendsData(userId);
    const friendIds = friendsData.friendsList || [];
    
    // Include the user's own prayers and friends' prayers
    const allowedUserIds = [userId, ...friendIds];
    
    const prayers = [];
    
    // Fetch prayers from friends (visibility: friends or public)
    if (allowedUserIds.length > 0) {
      // Firebase 'in' queries are limited to 30 items
      const chunks = [];
      for (let i = 0; i < allowedUserIds.length; i += 30) {
        chunks.push(allowedUserIds.slice(i, i + 30));
      }
      
      for (const chunk of chunks) {
        const q = query(
          collection(db, 'prayers'),
          where('userId', 'in', chunk),
          where('isActive', '==', true),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          prayers.push({
            id: doc.id,
            ...doc.data(),
          });
        });
      }
    }
    
    // Also fetch public prayers from anyone
    const publicQuery = query(
      collection(db, 'prayers'),
      where('visibility', '==', 'public'),
      where('isActive', '==', true),
      limit(30)
    );
    
    const publicSnapshot = await getDocs(publicQuery);
    publicSnapshot.forEach((doc) => {
      // Avoid duplicates
      if (!prayers.find(p => p.id === doc.id)) {
        prayers.push({
          id: doc.id,
          ...doc.data(),
        });
      }
    });
    
    // Sort by createdAt descending
    prayers.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
      return bTime - aTime;
    });
    
    return prayers.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting prayer feed:', error);
    return [];
  }
};

/**
 * Get only the user's own prayers
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<Array>} - Array of user's prayers
 */
export const getMyPrayers = async (userId) => {
  if (!userId) return [];

  try {
    const q = query(
      collection(db, 'prayers'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const prayers = [];
    
    snapshot.forEach((doc) => {
      prayers.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Sort by createdAt descending
    prayers.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    
    return prayers;
  } catch (error) {
    console.error('Error getting my prayers:', error);
    return [];
  }
};

/**
 * Mark that you're praying for someone's prayer request
 * @param {string} prayerId - Prayer document ID
 * @param {string} userId - User's Firebase UID who is praying
 * @param {string} displayName - User's display name
 * @returns {Promise<boolean>} - Success status
 */
export const markPraying = async (prayerId, userId, displayName) => {
  if (!prayerId || !userId) return false;

  try {
    const prayerRef = doc(db, 'prayers', prayerId);
    const prayerDoc = await getDoc(prayerRef);
    
    if (!prayerDoc.exists()) {
      console.warn('Prayer not found:', prayerId);
      return false;
    }
    
    const data = prayerDoc.data();
    const alreadyPraying = data.prayingUsers?.includes(userId);
    
    if (alreadyPraying) {
      // Remove from praying list
      await updateDoc(prayerRef, {
        prayingUsers: arrayRemove(userId),
        prayingCount: increment(-1),
      });
      console.log('[PrayerSocial] Removed praying:', userId);
    } else {
      // Add to praying list
      await updateDoc(prayerRef, {
        prayingUsers: arrayUnion(userId),
        prayingCount: increment(1),
      });
      console.log('[PrayerSocial] Added praying:', userId);
    }
    
    return true;
  } catch (error) {
    console.error('Error marking praying:', error);
    return false;
  }
};

/**
 * Check if user is praying for a specific prayer
 * @param {string} prayerId - Prayer document ID
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<boolean>} - Whether user is praying
 */
export const isPraying = async (prayerId, userId) => {
  if (!prayerId || !userId) return false;

  try {
    const prayerRef = doc(db, 'prayers', prayerId);
    const prayerDoc = await getDoc(prayerRef);
    
    if (!prayerDoc.exists()) return false;
    
    const data = prayerDoc.data();
    return data.prayingUsers?.includes(userId) || false;
  } catch (error) {
    console.error('Error checking praying status:', error);
    return false;
  }
};

/**
 * Add a comment to a prayer request
 * @param {string} prayerId - Prayer document ID
 * @param {Object} comment - Comment data
 * @param {string} comment.userId - Commenter's user ID
 * @param {string} comment.displayName - Commenter's display name
 * @param {string} comment.profilePicture - Commenter's profile picture
 * @param {string} comment.text - Comment text
 * @returns {Promise<boolean>} - Success status
 */
export const addComment = async (prayerId, comment) => {
  if (!prayerId || !comment?.userId || !comment?.text) return false;

  try {
    const prayerRef = doc(db, 'prayers', prayerId);
    
    const commentData = {
      id: `${Date.now()}_${comment.userId}`,
      userId: comment.userId,
      displayName: comment.displayName || 'Anonymous',
      profilePicture: comment.profilePicture || '',
      text: comment.text.trim(),
      createdAt: new Date().toISOString(),
    };
    
    await updateDoc(prayerRef, {
      comments: arrayUnion(commentData),
    });
    
    console.log('[PrayerSocial] Added comment to prayer:', prayerId);
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
};

/**
 * Delete a comment from a prayer request
 * @param {string} prayerId - Prayer document ID
 * @param {Object} comment - Comment to remove (must match exactly)
 * @returns {Promise<boolean>} - Success status
 */
export const deleteComment = async (prayerId, comment) => {
  if (!prayerId || !comment) return false;

  try {
    const prayerRef = doc(db, 'prayers', prayerId);
    
    await updateDoc(prayerRef, {
      comments: arrayRemove(comment),
    });
    
    console.log('[PrayerSocial] Deleted comment from prayer:', prayerId);
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
};

/**
 * Delete a prayer request (soft delete by marking inactive)
 * @param {string} prayerId - Prayer document ID
 * @param {string} userId - User's Firebase UID (must be owner)
 * @returns {Promise<boolean>} - Success status
 */
export const deletePrayer = async (prayerId, userId) => {
  if (!prayerId || !userId) return false;

  try {
    const prayerRef = doc(db, 'prayers', prayerId);
    const prayerDoc = await getDoc(prayerRef);
    
    if (!prayerDoc.exists()) {
      console.warn('Prayer not found:', prayerId);
      return false;
    }
    
    const data = prayerDoc.data();
    if (data.userId !== userId) {
      console.warn('Not authorized to delete this prayer');
      return false;
    }
    
    // Soft delete
    await updateDoc(prayerRef, {
      isActive: false,
      deletedAt: serverTimestamp(),
    });
    
    console.log('[PrayerSocial] Deleted prayer:', prayerId);
    return true;
  } catch (error) {
    console.error('Error deleting prayer:', error);
    return false;
  }
};

/**
 * Subscribe to real-time prayer feed updates
 * @param {string} userId - User's Firebase UID
 * @param {Function} callback - Callback function when prayers update
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToPrayerFeed = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  // Subscribe to public prayers for real-time updates
  const q = query(
    collection(db, 'prayers'),
    where('visibility', '==', 'public'),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  const unsubscribe = onSnapshot(q, 
    (snapshot) => {
      const prayers = [];
      snapshot.forEach((doc) => {
        prayers.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      callback(prayers);
    },
    (error) => {
      console.error('Error in prayer feed subscription:', error);
      callback([]);
    }
  );

  return unsubscribe;
};

/**
 * Get or set prayer partner for a user
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<Object|null>} - Prayer partner data or null
 */
export const getPrayerPartner = async (userId) => {
  if (!userId) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    
    const data = userDoc.data();
    const prayerPartner = data.prayerPartner;
    
    if (!prayerPartner?.partnerId) return null;
    
    // Check if partner assignment is still valid (daily reset)
    const assignedDate = prayerPartner.assignedAt?.toDate?.() || new Date(0);
    const today = new Date();
    const isSameDay = 
      assignedDate.getDate() === today.getDate() &&
      assignedDate.getMonth() === today.getMonth() &&
      assignedDate.getFullYear() === today.getFullYear();
    
    if (!isSameDay) {
      // Need to assign a new partner
      return await assignPrayerPartner(userId);
    }
    
    // Fetch partner details
    const partnerDoc = await getDoc(doc(db, 'users', prayerPartner.partnerId));
    if (!partnerDoc.exists()) return null;
    
    return {
      partnerId: prayerPartner.partnerId,
      ...partnerDoc.data(),
      assignedAt: prayerPartner.assignedAt,
    };
  } catch (error) {
    console.error('Error getting prayer partner:', error);
    return null;
  }
};

/**
 * Assign a new prayer partner from friends list
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<Object|null>} - Assigned prayer partner or null
 */
export const assignPrayerPartner = async (userId) => {
  if (!userId) return null;

  try {
    // Get friends list
    const friendsData = await getFriendsData(userId);
    const friendIds = friendsData.friendsList || [];
    
    if (friendIds.length === 0) return null;
    
    // Pick a random friend
    const randomIndex = Math.floor(Math.random() * friendIds.length);
    const partnerId = friendIds[randomIndex];
    
    // Update user's prayer partner
    await updateDoc(doc(db, 'users', userId), {
      prayerPartner: {
        partnerId,
        assignedAt: serverTimestamp(),
      },
    });
    
    // Fetch partner details
    const partnerDoc = await getDoc(doc(db, 'users', partnerId));
    if (!partnerDoc.exists()) return null;
    
    console.log('[PrayerSocial] Assigned prayer partner:', partnerId);
    
    return {
      partnerId,
      ...partnerDoc.data(),
      assignedAt: new Date(),
    };
  } catch (error) {
    console.error('Error assigning prayer partner:', error);
    return null;
  }
};

/**
 * Get count of people praying for a user's prayers
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<number>} - Total praying count
 */
export const getTotalPrayingForMe = async (userId) => {
  if (!userId) return 0;

  try {
    const myPrayers = await getMyPrayers(userId);
    let total = 0;
    
    myPrayers.forEach((prayer) => {
      total += prayer.prayingCount || 0;
    });
    
    return total;
  } catch (error) {
    console.error('Error getting total praying count:', error);
    return 0;
  }
};

export default {
  createPrayerRequest,
  getPrayerFeed,
  getMyPrayers,
  markPraying,
  isPraying,
  addComment,
  deleteComment,
  deletePrayer,
  subscribeToPrayerFeed,
  getPrayerPartner,
  assignPrayerPartner,
  getTotalPrayingForMe,
};

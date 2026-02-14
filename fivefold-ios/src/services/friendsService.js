/**
 * Friends Service
 * 
 * Handles all friend-related operations:
 * - Searching for users
 * - Sending/accepting/declining friend requests
 * - Managing friends list
 * - Getting friends' stats for leaderboard
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendPushToUser, NotificationTemplates } from './socialNotificationService';

/**
 * Get a user's friends data
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<Object>} - Friends data
 */
export const getFriendsData = async (userId) => {
  if (!userId) return { friendsList: [], pendingRequests: [], sentRequests: [] };
  
  try {
    const friendsDoc = await getDoc(doc(db, 'friends', userId));
    
    if (!friendsDoc.exists()) {
      // Initialize friends document if it doesn't exist
      await setDoc(doc(db, 'friends', userId), {
        friendsList: [],
        pendingRequests: [],
        sentRequests: [],
      });
      return { friendsList: [], pendingRequests: [], sentRequests: [] };
    }
    
    return friendsDoc.data();
  } catch (error) {
    console.error('Error getting friends data:', error);
    return { friendsList: [], pendingRequests: [], sentRequests: [] };
  }
};

/**
 * Get detailed friend profiles with their stats
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<Array>} - Array of friend profiles with stats
 */
export const getFriendsWithStats = async (userId) => {
  if (!userId) return [];
  
  try {
    const friendsData = await getFriendsData(userId);
    const friendIds = friendsData.friendsList || [];
    
    if (friendIds.length === 0) return [];
    
    // Fetch each friend's profile
    const friendProfiles = await Promise.all(
      friendIds.map(async (friendId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', friendId));
          if (userDoc.exists()) {
            return { uid: friendId, ...userDoc.data() };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching friend ${friendId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by points
    return friendProfiles
      .filter(Boolean)
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  } catch (error) {
    console.error('Error getting friends with stats:', error);
    return [];
  }
};

/**
 * Search for users by username
 * @param {string} searchQuery - The search query
 * @param {string} currentUserId - Current user's ID (to exclude from results)
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - Array of matching users
 */
export const searchUsers = async (searchQuery, currentUserId, limit = 10) => {
  if (!searchQuery || searchQuery.length < 2) return [];
  
  try {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // Query users where username starts with the search query
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('username', '>=', normalizedQuery),
      where('username', '<=', normalizedQuery + '\uf8ff')
    );
    
    const querySnapshot = await getDocs(q);
    const results = [];
    
    querySnapshot.forEach((doc) => {
      if (results.length < limit && doc.id !== currentUserId) {
        results.push({ uid: doc.id, ...doc.data() });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

/**
 * Send a friend request
 * @param {string} fromUserId - Current user's ID
 * @param {string} toUserId - Target user's ID
 * @returns {Promise<Object>} - Result with success status and message
 */
export const sendFriendRequest = async (fromUserId, toUserId) => {
  if (!fromUserId || !toUserId) {
    return { success: false, message: 'Invalid user IDs' };
  }
  
  if (fromUserId === toUserId) {
    return { success: false, message: 'Cannot send friend request to yourself' };
  }
  
  try {
    // Check if already friends
    const fromFriendsData = await getFriendsData(fromUserId);
    if (fromFriendsData.friendsList?.includes(toUserId)) {
      return { success: false, message: 'Already friends' };
    }
    
    // Check if request already sent
    const existingSent = fromFriendsData.sentRequests?.find(r => r.toUserId === toUserId);
    if (existingSent) {
      return { success: false, message: 'Friend request already sent' };
    }
    
    // Check if they already sent us a request (auto-accept)
    const pendingFromThem = fromFriendsData.pendingRequests?.find(r => r.fromUserId === toUserId);
    if (pendingFromThem) {
      // Auto-accept their request
      return acceptFriendRequest(fromUserId, toUserId);
    }
    
    const timestamp = new Date().toISOString();
    
    // Add to sender's sent requests
    await setDoc(doc(db, 'friends', fromUserId), {
      sentRequests: arrayUnion({ toUserId, timestamp }),
    }, { merge: true });
    
    // Add to recipient's pending requests
    await setDoc(doc(db, 'friends', toUserId), {
      pendingRequests: arrayUnion({ fromUserId, timestamp }),
    }, { merge: true });
    
    // Send push notification to the recipient
    try {
      const senderDoc = await getDoc(doc(db, 'users', fromUserId));
      const senderName = senderDoc.exists() ? (senderDoc.data().displayName || 'Someone') : 'Someone';
      const notif = NotificationTemplates.friendRequest(senderName);
      await sendPushToUser(toUserId, notif);
    } catch (notifErr) {
      console.warn('Failed to send friend request notification:', notifErr);
    }
    
    return { success: true, message: 'Friend request sent' };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, message: 'Failed to send request' };
  }
};

/**
 * Accept a friend request
 * @param {string} currentUserId - Current user's ID (accepting)
 * @param {string} fromUserId - User who sent the request
 * @returns {Promise<Object>} - Result with success status and message
 */
export const acceptFriendRequest = async (currentUserId, fromUserId) => {
  if (!currentUserId || !fromUserId) {
    return { success: false, message: 'Invalid user IDs' };
  }
  
  try {
    // Get current user's friends data to find the request
    const currentFriendsData = await getFriendsData(currentUserId);
    const request = currentFriendsData.pendingRequests?.find(r => r.fromUserId === fromUserId);
    
    // Add each other to friends lists
    await setDoc(doc(db, 'friends', currentUserId), {
      friendsList: arrayUnion(fromUserId),
      pendingRequests: request ? arrayRemove(request) : currentFriendsData.pendingRequests,
    }, { merge: true });
    
    // Get sender's data to find their sent request
    const senderFriendsData = await getFriendsData(fromUserId);
    const sentRequest = senderFriendsData.sentRequests?.find(r => r.toUserId === currentUserId);
    
    await setDoc(doc(db, 'friends', fromUserId), {
      friendsList: arrayUnion(currentUserId),
      sentRequests: sentRequest ? arrayRemove(sentRequest) : senderFriendsData.sentRequests,
    }, { merge: true });
    
    // Notify the original sender that their request was accepted
    try {
      const accepterDoc = await getDoc(doc(db, 'users', currentUserId));
      const accepterName = accepterDoc.exists() ? (accepterDoc.data().displayName || 'Someone') : 'Someone';
      const notif = NotificationTemplates.friendAccepted(accepterName);
      await sendPushToUser(fromUserId, notif);
    } catch (notifErr) {
      console.warn('Failed to send friend accepted notification:', notifErr);
    }
    
    return { success: true, message: 'Friend request accepted' };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, message: 'Failed to accept request' };
  }
};

/**
 * Decline a friend request
 * @param {string} currentUserId - Current user's ID (declining)
 * @param {string} fromUserId - User who sent the request
 * @returns {Promise<Object>} - Result with success status and message
 */
export const declineFriendRequest = async (currentUserId, fromUserId) => {
  if (!currentUserId || !fromUserId) {
    return { success: false, message: 'Invalid user IDs' };
  }
  
  try {
    // Get current user's friends data to find the request
    const currentFriendsData = await getFriendsData(currentUserId);
    const request = currentFriendsData.pendingRequests?.find(r => r.fromUserId === fromUserId);
    
    if (request) {
      await updateDoc(doc(db, 'friends', currentUserId), {
        pendingRequests: arrayRemove(request),
      });
    }
    
    // Get sender's data to remove their sent request
    const senderFriendsData = await getFriendsData(fromUserId);
    const sentRequest = senderFriendsData.sentRequests?.find(r => r.toUserId === currentUserId);
    
    if (sentRequest) {
      await updateDoc(doc(db, 'friends', fromUserId), {
        sentRequests: arrayRemove(sentRequest),
      });
    }
    
    return { success: true, message: 'Friend request declined' };
  } catch (error) {
    console.error('Error declining friend request:', error);
    return { success: false, message: 'Failed to decline request' };
  }
};

/**
 * Cancel a sent friend request
 * @param {string} currentUserId - Current user's ID (who sent the request)
 * @param {string} toUserId - User who would receive the request
 * @returns {Promise<Object>} - Result with success status and message
 */
export const cancelFriendRequest = async (currentUserId, toUserId) => {
  if (!currentUserId || !toUserId) {
    return { success: false, message: 'Invalid user IDs' };
  }
  
  try {
    // Get current user's friends data to find the sent request
    const currentFriendsData = await getFriendsData(currentUserId);
    const sentRequest = currentFriendsData.sentRequests?.find(r => r.toUserId === toUserId);
    
    if (sentRequest) {
      await updateDoc(doc(db, 'friends', currentUserId), {
        sentRequests: arrayRemove(sentRequest),
      });
    }
    
    // Get recipient's data to remove pending request
    const recipientFriendsData = await getFriendsData(toUserId);
    const pendingRequest = recipientFriendsData.pendingRequests?.find(r => r.fromUserId === currentUserId);
    
    if (pendingRequest) {
      await updateDoc(doc(db, 'friends', toUserId), {
        pendingRequests: arrayRemove(pendingRequest),
      });
    }
    
    return { success: true, message: 'Friend request cancelled' };
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    return { success: false, message: 'Failed to cancel request' };
  }
};

/**
 * Remove a friend
 * @param {string} currentUserId - Current user's ID
 * @param {string} friendId - Friend's ID to remove
 * @returns {Promise<Object>} - Result with success status and message
 */
export const removeFriend = async (currentUserId, friendId) => {
  if (!currentUserId || !friendId) {
    return { success: false, message: 'Invalid user IDs' };
  }
  
  try {
    // Remove from current user's friends list
    await updateDoc(doc(db, 'friends', currentUserId), {
      friendsList: arrayRemove(friendId),
    });
    
    // Remove from friend's friends list
    await updateDoc(doc(db, 'friends', friendId), {
      friendsList: arrayRemove(currentUserId),
    });
    
    return { success: true, message: 'Friend removed' };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, message: 'Failed to remove friend' };
  }
};

/**
 * Get pending friend requests with user details
 * @param {string} userId - Current user's ID
 * @returns {Promise<Array>} - Array of pending requests with user info
 */
export const getPendingRequestsWithDetails = async (userId) => {
  if (!userId) return [];
  
  try {
    const friendsData = await getFriendsData(userId);
    const pendingRequests = friendsData.pendingRequests || [];
    
    if (pendingRequests.length === 0) return [];
    
    // Fetch user details for each request
    const requestsWithDetails = await Promise.all(
      pendingRequests.map(async (request) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', request.fromUserId));
          if (userDoc.exists()) {
            return {
              ...request,
              user: { uid: request.fromUserId, ...userDoc.data() },
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching user ${request.fromUserId}:`, error);
          return null;
        }
      })
    );
    
    return requestsWithDetails.filter(Boolean);
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
};

/**
 * Get the friendship status between current user and another user
 * @param {string} currentUserId - Current user's ID
 * @param {string} otherUserId - Other user's ID
 * @returns {Promise<string>} - Status: 'friends', 'pending', 'requested', 'none'
 */
export const getFriendshipStatus = async (currentUserId, otherUserId) => {
  if (!currentUserId || !otherUserId) return 'none';
  if (currentUserId === otherUserId) return 'self';
  
  try {
    const friendsData = await getFriendsData(currentUserId);
    
    // Check if already friends
    if (friendsData.friendsList?.includes(otherUserId)) {
      return 'friends';
    }
    
    // Check if we sent them a request
    if (friendsData.sentRequests?.some(r => r.toUserId === otherUserId)) {
      return 'requested'; // We requested them
    }
    
    // Check if they sent us a request
    if (friendsData.pendingRequests?.some(r => r.fromUserId === otherUserId)) {
      return 'pending'; // They requested us
    }
    
    return 'none';
  } catch (error) {
    console.error('Error getting friendship status:', error);
    return 'none';
  }
};

/**
 * Get friend count for a user
 * Returns the count of friends that actually exist (not deleted accounts)
 * @param {string} userId - User's ID
 * @returns {Promise<number>} - Number of friends
 */
export const getFriendCount = async (userId) => {
  if (!userId) return 0;
  
  try {
    const friendsData = await getFriendsData(userId);
    const friendIds = friendsData.friendsList || [];
    
    if (friendIds.length === 0) return 0;
    
    // Verify each friend actually exists and count only valid ones
    let validCount = 0;
    const invalidFriends = [];
    
    await Promise.all(
      friendIds.map(async (friendId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', friendId));
          if (userDoc.exists()) {
            validCount++;
          } else {
            invalidFriends.push(friendId);
          }
        } catch (error) {
          console.error(`Error checking friend ${friendId}:`, error);
          invalidFriends.push(friendId);
        }
      })
    );
    
    // Clean up invalid friends from the list (deleted accounts, etc.)
    if (invalidFriends.length > 0) {
      try {
        for (const invalidId of invalidFriends) {
          await updateDoc(doc(db, 'friends', userId), {
            friendsList: arrayRemove(invalidId),
          });
        }
        console.log(`[Friends] Cleaned up ${invalidFriends.length} invalid friend entries`);
      } catch (cleanupError) {
        console.error('Error cleaning up invalid friends:', cleanupError);
      }
    }
    
    return validCount;
  } catch (error) {
    console.error('Error getting friend count:', error);
    return 0;
  }
};

/**
 * Subscribe to pending friend request count in real-time
 * @param {string} userId - Current user's Firebase UID
 * @param {Function} callback - Called with the pending request count (number)
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToPendingRequests = (userId, callback) => {
  if (!userId) {
    callback(0);
    return () => {};
  }

  const friendsDocRef = doc(db, 'friends', userId);
  const unsubscribe = onSnapshot(friendsDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const count = Array.isArray(data.pendingRequests) ? data.pendingRequests.length : 0;
        callback(count);
      } else {
        callback(0);
      }
    },
    (error) => {
      console.error('Error subscribing to pending requests:', error);
      callback(0);
    }
  );

  return unsubscribe;
};

export default {
  getFriendsData,
  getFriendsWithStats,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getPendingRequestsWithDetails,
  getFriendshipStatus,
  getFriendCount,
  subscribeToPendingRequests,
};

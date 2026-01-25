/**
 * Social Notification Service
 * 
 * Handles push notifications for social features:
 * - Prayer requests
 * - Encouragements
 * - Messages
 * - Challenges
 * - Streak celebrations
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getFriendsData } from './friendsService';

// Expo Push Notification API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Save user's push token to Firebase
 * @param {string} userId - User's Firebase UID
 * @param {string} pushToken - Expo push token
 * @returns {Promise<boolean>} - Success status
 */
export const savePushToken = async (userId, pushToken) => {
  if (!userId || !pushToken) return false;

  try {
    await updateDoc(doc(db, 'users', userId), {
      pushToken,
      pushTokenUpdatedAt: new Date(),
    });
    
    console.log('[SocialNotif] Saved push token for user:', userId);
    return true;
  } catch (error) {
    // Document might not exist, try setDoc with merge
    try {
      await setDoc(doc(db, 'users', userId), {
        pushToken,
        pushTokenUpdatedAt: new Date(),
      }, { merge: true });
      
      console.log('[SocialNotif] Saved push token for user (created):', userId);
      return true;
    } catch (retryError) {
      console.error('Error saving push token:', retryError);
      return false;
    }
  }
};

/**
 * Get user's push token from Firebase
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<string|null>} - Push token or null
 */
export const getPushToken = async (userId) => {
  if (!userId) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().pushToken || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Send push notification to a specific user
 * @param {string} userId - Target user's Firebase UID
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.data - Additional data
 * @returns {Promise<boolean>} - Success status
 */
export const sendPushToUser = async (userId, { title, body, data = {} }) => {
  if (!userId) return false;

  try {
    const pushToken = await getPushToken(userId);
    if (!pushToken) {
      console.log('[SocialNotif] No push token for user:', userId);
      return false;
    }

    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        timestamp: Date.now(),
      },
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data?.[0]?.status === 'ok') {
      console.log('[SocialNotif] Push sent to user:', userId);
      return true;
    } else {
      console.warn('[SocialNotif] Push failed:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending push to user:', error);
    return false;
  }
};

/**
 * Send push notification to all friends
 * @param {string} userId - Sender's Firebase UID
 * @param {Object} notification - Notification data
 * @returns {Promise<number>} - Number of notifications sent
 */
export const sendPushToFriends = async (userId, { title, body, data = {} }) => {
  if (!userId) return 0;

  try {
    // Get friends list
    const friendsData = await getFriendsData(userId);
    const friendIds = friendsData.friendsList || [];
    
    if (friendIds.length === 0) {
      console.log('[SocialNotif] No friends to notify');
      return 0;
    }

    // Get all friends' push tokens
    const tokens = [];
    for (const friendId of friendIds) {
      const token = await getPushToken(friendId);
      if (token) {
        tokens.push(token);
      }
    }

    if (tokens.length === 0) {
      console.log('[SocialNotif] No friends have push tokens');
      return 0;
    }

    // Send to all tokens
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        fromUserId: userId,
        timestamp: Date.now(),
      },
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    const successCount = result.data?.filter(r => r.status === 'ok').length || 0;
    
    console.log(`[SocialNotif] Sent to ${successCount}/${tokens.length} friends`);
    return successCount;
  } catch (error) {
    console.error('Error sending push to friends:', error);
    return 0;
  }
};

/**
 * Notification Templates
 */
export const NotificationTemplates = {
  // Prayer notifications
  newPrayerRequest: (senderName) => ({
    title: 'New Prayer Request',
    body: `${senderName} shared a prayer request`,
    data: { type: 'prayer_request' },
  }),

  prayingForYou: (senderName) => ({
    title: 'Someone is Praying',
    body: `${senderName} is praying for you`,
    data: { type: 'praying' },
  }),

  prayerComment: (senderName) => ({
    title: 'New Comment',
    body: `${senderName} commented on your prayer`,
    data: { type: 'prayer_comment' },
  }),

  // Message notifications
  newMessage: (senderName, preview) => ({
    title: senderName,
    body: preview.length > 50 ? preview.substring(0, 50) + '...' : preview,
    data: { type: 'message' },
  }),

  sharedVerse: (senderName) => ({
    title: 'Verse Shared',
    body: `${senderName} shared a Bible verse with you`,
    data: { type: 'shared_verse' },
  }),

  // Encouragement notifications
  encouragement: (senderName, type) => {
    const messages = {
      praying: `${senderName} is praying for you`,
      strong: `${senderName} says "Stay strong!"`,
      bless: `${senderName} says "God bless you!"`,
      love: `${senderName} sent you love`,
    };
    return {
      title: 'Encouragement',
      body: messages[type] || `${senderName} sent you encouragement`,
      data: { type: 'encouragement', encouragementType: type },
    };
  },

  // Challenge notifications
  challengeReceived: (senderName, category) => ({
    title: 'Quiz Challenge',
    body: `${senderName} challenged you to a ${category} quiz!`,
    data: { type: 'challenge' },
  }),

  challengeCompleted: (opponentName, won) => ({
    title: won ? 'You Won!' : 'Challenge Complete',
    body: won 
      ? `You beat ${opponentName} in the quiz challenge!`
      : `${opponentName} won the quiz challenge`,
    data: { type: 'challenge_result', won },
  }),

  // Streak notifications
  streakMilestone: (senderName, days) => ({
    title: 'Streak Celebration',
    body: `${senderName} hit a ${days}-day streak!`,
    data: { type: 'streak_milestone', days },
  }),

  // Friend notifications
  friendRequest: (senderName) => ({
    title: 'Friend Request',
    body: `${senderName} wants to be your friend`,
    data: { type: 'friend_request' },
  }),

  friendAccepted: (senderName) => ({
    title: 'Request Accepted',
    body: `${senderName} accepted your friend request`,
    data: { type: 'friend_accepted' },
  }),
};

/**
 * Send prayer request notification to friends
 * @param {string} userId - Sender's user ID
 * @param {string} displayName - Sender's display name
 * @returns {Promise<number>} - Number sent
 */
export const notifyFriendsOfPrayer = async (userId, displayName) => {
  const notification = NotificationTemplates.newPrayerRequest(displayName);
  return sendPushToFriends(userId, notification);
};

/**
 * Notify user that someone is praying for them
 * @param {string} recipientId - Prayer owner's user ID
 * @param {string} senderName - Person praying
 * @returns {Promise<boolean>} - Success
 */
export const notifyPrayingForYou = async (recipientId, senderName) => {
  const notification = NotificationTemplates.prayingForYou(senderName);
  return sendPushToUser(recipientId, notification);
};

/**
 * Send encouragement notification
 * @param {string} recipientId - Recipient's user ID
 * @param {string} senderName - Sender's name
 * @param {string} type - Encouragement type
 * @returns {Promise<boolean>} - Success
 */
export const notifyEncouragement = async (recipientId, senderName, type) => {
  const notification = NotificationTemplates.encouragement(senderName, type);
  return sendPushToUser(recipientId, notification);
};

/**
 * Send message notification
 * @param {string} recipientId - Recipient's user ID
 * @param {string} senderName - Sender's name
 * @param {string} preview - Message preview
 * @returns {Promise<boolean>} - Success
 */
export const notifyNewMessage = async (recipientId, senderName, preview) => {
  const notification = NotificationTemplates.newMessage(senderName, preview);
  return sendPushToUser(recipientId, notification);
};

/**
 * Send challenge notification
 * @param {string} recipientId - Challenged user's ID
 * @param {string} senderName - Challenger's name
 * @param {string} category - Quiz category
 * @returns {Promise<boolean>} - Success
 */
export const notifyChallenge = async (recipientId, senderName, category) => {
  const notification = NotificationTemplates.challengeReceived(senderName, category);
  return sendPushToUser(recipientId, notification);
};

/**
 * Notify friends of streak milestone
 * @param {string} userId - User who hit milestone
 * @param {string} displayName - User's name
 * @param {number} days - Streak days
 * @returns {Promise<number>} - Number sent
 */
export const notifyStreakMilestone = async (userId, displayName, days) => {
  const notification = NotificationTemplates.streakMilestone(displayName, days);
  return sendPushToFriends(userId, notification);
};

export default {
  savePushToken,
  getPushToken,
  sendPushToUser,
  sendPushToFriends,
  NotificationTemplates,
  notifyFriendsOfPrayer,
  notifyPrayingForYou,
  notifyEncouragement,
  notifyNewMessage,
  notifyChallenge,
  notifyStreakMilestone,
};

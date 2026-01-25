/**
 * Message Service
 * 
 * Handles direct messaging between users:
 * - Conversations management
 * - Sending/receiving messages
 * - Message types (text, verse, prayer, encouragement)
 * - Read receipts
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
  serverTimestamp,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notifyNewMessage } from './socialNotificationService';

/**
 * Generate a consistent conversation ID for two users
 * @param {string} userId1 - First user's ID
 * @param {string} userId2 - Second user's ID
 * @returns {string} - Conversation ID
 */
export const getConversationId = (userId1, userId2) => {
  // Sort user IDs to ensure consistent conversation ID
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

/**
 * Create or get an existing conversation between two users
 * @param {string} userId1 - First user's ID
 * @param {Object} user1Profile - First user's profile
 * @param {string} userId2 - Second user's ID
 * @param {Object} user2Profile - Second user's profile
 * @returns {Promise<Object>} - Conversation object
 */
export const createOrGetConversation = async (userId1, user1Profile, userId2, user2Profile) => {
  if (!userId1 || !userId2) {
    throw new Error('Both user IDs are required');
  }

  const conversationId = getConversationId(userId1, userId2);

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (conversationDoc.exists()) {
      return {
        id: conversationId,
        ...conversationDoc.data(),
      };
    }

    // Create new conversation
    const conversationData = {
      participants: [userId1, userId2],
      participantDetails: {
        [userId1]: {
          displayName: user1Profile?.displayName || 'User',
          username: user1Profile?.username || '',
          profilePicture: user1Profile?.profilePicture || '',
          countryFlag: user1Profile?.countryFlag || '',
        },
        [userId2]: {
          displayName: user2Profile?.displayName || 'User',
          username: user2Profile?.username || '',
          profilePicture: user2Profile?.profilePicture || '',
          countryFlag: user2Profile?.countryFlag || '',
        },
      },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: null,
      unreadCount: {
        [userId1]: 0,
        [userId2]: 0,
      },
      createdAt: serverTimestamp(),
    };

    await setDoc(conversationRef, conversationData);

    console.log('[MessageService] Created conversation:', conversationId);

    return {
      id: conversationId,
      ...conversationData,
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<Array>} - Array of conversations
 */
export const getConversations = async (userId) => {
  if (!userId) return [];

  try {
    // Query without orderBy to avoid needing a composite index
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const snapshot = await getDocs(q);
    const conversations = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Find the other participant
      const otherUserId = data.participants.find(id => id !== userId);
      const otherUser = data.participantDetails?.[otherUserId] || {};

      conversations.push({
        id: doc.id,
        ...data,
        otherUserId,
        otherUser,
        unreadCount: data.unreadCount?.[userId] || 0,
      });
    });

    // Sort by lastMessageAt client-side (most recent first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate?.() || a.lastMessageAt || new Date(0);
      const bTime = b.lastMessageAt?.toDate?.() || b.lastMessageAt || new Date(0);
      return bTime - aTime;
    });

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
};

/**
 * Subscribe to conversations for real-time updates
 * @param {string} userId - User's Firebase UID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToConversations = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  // Query without orderBy to avoid needing a composite index
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );

  const unsubscribe = onSnapshot(q, 
    (snapshot) => {
      const conversations = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherUserId = data.participants.find(id => id !== userId);
        const otherUser = data.participantDetails?.[otherUserId] || {};

        conversations.push({
          id: doc.id,
          ...data,
          otherUserId,
          otherUser,
          unreadCount: data.unreadCount?.[userId] || 0,
        });
      });
      
      // Sort by lastMessageAt client-side (most recent first)
      conversations.sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate?.() || a.lastMessageAt || new Date(0);
        const bTime = b.lastMessageAt?.toDate?.() || b.lastMessageAt || new Date(0);
        return bTime - aTime;
      });
      
      callback(conversations);
    },
    (error) => {
      console.error('Error in conversations subscription:', error);
      callback([]);
    }
  );

  return unsubscribe;
};

/**
 * Get messages in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {number} limitCount - Max messages to fetch
 * @returns {Promise<Array>} - Array of messages
 */
export const getMessages = async (conversationId, limitCount = 50) => {
  if (!conversationId) return [];

  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const messages = [];

    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Return in chronological order
    return messages.reverse();
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

/**
 * Subscribe to messages for real-time updates
 * @param {string} conversationId - Conversation ID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToMessages = (conversationId, callback) => {
  if (!conversationId) {
    callback([]);
    return () => {};
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(
    messagesRef,
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  const unsubscribe = onSnapshot(q, 
    (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      callback(messages);
    },
    (error) => {
      console.error('Error in messages subscription:', error);
      callback([]);
    }
  );

  return unsubscribe;
};

/**
 * Send a message
 * @param {string} conversationId - Conversation ID
 * @param {Object} message - Message data
 * @param {string} message.senderId - Sender's user ID
 * @param {string} message.senderName - Sender's display name
 * @param {string} message.type - Message type (text, verse, prayer, encouragement)
 * @param {string} message.content - Message content
 * @param {Object} message.metadata - Additional metadata (verseRef, etc.)
 * @param {string} recipientId - Recipient's user ID
 * @returns {Promise<Object>} - Sent message
 */
export const sendMessage = async (conversationId, message, recipientId) => {
  if (!conversationId || !message?.senderId || !message?.content) {
    throw new Error('Conversation ID, sender, and content are required');
  }

  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    const messageData = {
      senderId: message.senderId,
      senderName: message.senderName || 'User',
      type: message.type || 'text',
      content: message.content,
      metadata: message.metadata || {},
      createdAt: serverTimestamp(),
      read: false,
    };

    const messageDoc = await addDoc(messagesRef, messageData);

    // Update conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    
    // Preview text based on message type
    let preview = message.content;
    if (message.type === 'verse') {
      preview = `Shared a verse: ${message.metadata?.reference || 'Bible verse'}`;
    } else if (message.type === 'prayer') {
      preview = 'Shared a prayer request';
    } else if (message.type === 'encouragement') {
      preview = message.content;
    }

    await updateDoc(conversationRef, {
      lastMessage: preview.substring(0, 100),
      lastMessageAt: serverTimestamp(),
      lastMessageBy: message.senderId,
      [`unreadCount.${recipientId}`]: increment(1),
    });

    // Send push notification
    if (recipientId) {
      notifyNewMessage(recipientId, message.senderName, preview).catch(err => {
        console.warn('Failed to send message notification:', err);
      });
    }

    console.log('[MessageService] Message sent:', messageDoc.id);

    return {
      id: messageDoc.id,
      ...messageData,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Send a text message
 * @param {string} conversationId - Conversation ID
 * @param {string} senderId - Sender's user ID
 * @param {string} senderName - Sender's name
 * @param {string} text - Message text
 * @param {string} recipientId - Recipient's user ID
 * @returns {Promise<Object>} - Sent message
 */
export const sendTextMessage = async (conversationId, senderId, senderName, text, recipientId) => {
  return sendMessage(conversationId, {
    senderId,
    senderName,
    type: 'text',
    content: text,
  }, recipientId);
};

/**
 * Send a verse message
 * @param {string} conversationId - Conversation ID
 * @param {string} senderId - Sender's user ID
 * @param {string} senderName - Sender's name
 * @param {string} verseText - Verse text
 * @param {string} reference - Verse reference
 * @param {string} note - Personal note
 * @param {string} recipientId - Recipient's user ID
 * @returns {Promise<Object>} - Sent message
 */
export const sendVerseMessage = async (conversationId, senderId, senderName, verseText, reference, note, recipientId) => {
  return sendMessage(conversationId, {
    senderId,
    senderName,
    type: 'verse',
    content: verseText,
    metadata: {
      reference,
      note,
    },
  }, recipientId);
};

/**
 * Send an encouragement message
 * @param {string} conversationId - Conversation ID
 * @param {string} senderId - Sender's user ID
 * @param {string} senderName - Sender's name
 * @param {string} encouragementType - Type (praying, strong, bless, love)
 * @param {string} recipientId - Recipient's user ID
 * @returns {Promise<Object>} - Sent message
 */
export const sendEncouragementMessage = async (conversationId, senderId, senderName, encouragementType, recipientId) => {
  const messages = {
    praying: 'Praying for you',
    strong: 'Stay strong!',
    bless: 'God bless you!',
    love: 'Sending you love',
  };

  return sendMessage(conversationId, {
    senderId,
    senderName,
    type: 'encouragement',
    content: messages[encouragementType] || encouragementType,
    metadata: {
      encouragementType,
    },
  }, recipientId);
};

/**
 * Mark messages as read
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User marking as read
 * @returns {Promise<boolean>} - Success status
 */
export const markAsRead = async (conversationId, userId) => {
  if (!conversationId || !userId) return false;

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    await updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0,
    });

    console.log('[MessageService] Marked as read:', conversationId);
    return true;
  } catch (error) {
    console.error('Error marking as read:', error);
    return false;
  }
};

/**
 * Get total unread count for a user
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<number>} - Total unread count
 */
export const getTotalUnreadCount = async (userId) => {
  if (!userId) return 0;

  try {
    const conversations = await getConversations(userId);
    let total = 0;

    conversations.forEach((conv) => {
      total += conv.unreadCount || 0;
    });

    return total;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Delete a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteConversation = async (conversationId) => {
  if (!conversationId) return false;

  try {
    // Note: This doesn't delete messages subcollection
    // In production, use a Cloud Function to clean up
    await deleteDoc(doc(db, 'conversations', conversationId));
    
    console.log('[MessageService] Deleted conversation:', conversationId);
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
};

export default {
  getConversationId,
  createOrGetConversation,
  getConversations,
  subscribeToConversations,
  getMessages,
  subscribeToMessages,
  sendMessage,
  sendTextMessage,
  sendVerseMessage,
  sendEncouragementMessage,
  markAsRead,
  getTotalUnreadCount,
  deleteConversation,
};

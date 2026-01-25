/**
 * Feed Service
 * 
 * Manages the Hub feed - a Twitter-like global feed where users can post
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  startAfter,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const POSTS_COLLECTION = 'hub_posts';
const POSTS_PER_PAGE = 20;
const POST_EXPIRY_DAYS = 7; // Posts older than 7 days get deleted

/**
 * Create a new post
 */
export const createPost = async (userId, content, userProfile) => {
  try {
    const postData = {
      userId,
      content: content.trim(),
      authorName: userProfile?.displayName || 'Anonymous',
      authorUsername: userProfile?.username || null,
      authorPhoto: userProfile?.profilePicture || null,
      authorCountry: userProfile?.countryFlag || null,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      // Reactions: pray, strong, bless, love
      reactions: {
        pray: [],    // "Praying for you"
        strong: [],  // "Stay strong"
        bless: [],   // "God bless you"
        love: [],    // "Sending love"
      },
      views: 0,
      comments: 0,
    };
    
    const docRef = await addDoc(collection(db, POSTS_COLLECTION), postData);
    console.log('[Feed] Post created with ID:', docRef.id);
    
    return { success: true, postId: docRef.id };
  } catch (error) {
    console.error('[Feed] Error creating post:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get feed posts (paginated)
 */
export const getFeedPosts = async (lastDoc = null, pageSize = POSTS_PER_PAGE) => {
  try {
    let q;
    
    if (lastDoc) {
      q = query(
        collection(db, POSTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    } else {
      q = query(
        collection(db, POSTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
    }
    
    const snapshot = await getDocs(q);
    const posts = [];
    
    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      });
    });
    
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    return {
      posts,
      lastDoc: lastVisible,
      hasMore: posts.length === pageSize,
    };
  } catch (error) {
    console.error('[Feed] Error getting posts:', error);
    return { posts: [], lastDoc: null, hasMore: false };
  }
};

/**
 * Subscribe to real-time feed updates
 */
export const subscribeToPosts = (callback, pageSize = POSTS_PER_PAGE) => {
  const q = query(
    collection(db, POSTS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  
  return onSnapshot(q, (snapshot) => {
    const posts = [];
    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      });
    });
    callback(posts);
  }, (error) => {
    console.error('[Feed] Subscription error:', error);
  });
};

/**
 * Like a post (legacy - kept for backwards compatibility)
 */
export const likePost = async (postId, userId) => {
  return reactToPost(postId, userId, 'love');
};

/**
 * React to a post with different reaction types
 * Types: pray, strong, bless, love
 */
export const reactToPost = async (postId, userId, reactionType) => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return { success: false, error: 'Post not found' };
    }
    
    const postData = postDoc.data();
    const reactions = postData.reactions || { pray: [], strong: [], bless: [], love: [] };
    const currentReaction = reactions[reactionType] || [];
    
    // Also handle legacy likedBy for love reactions
    const likedBy = postData.likedBy || [];
    
    if (currentReaction.includes(userId)) {
      // Remove reaction
      reactions[reactionType] = currentReaction.filter(id => id !== userId);
      
      const updateData = { reactions };
      
      // Also update legacy likes for love reaction
      if (reactionType === 'love') {
        updateData.likes = increment(-1);
        updateData.likedBy = likedBy.filter(id => id !== userId);
      }
      
      await updateDoc(postRef, updateData);
      return { success: true, reacted: false };
    } else {
      // Add reaction
      reactions[reactionType] = [...currentReaction, userId];
      
      const updateData = { reactions };
      
      // Also update legacy likes for love reaction
      if (reactionType === 'love') {
        updateData.likes = increment(1);
        updateData.likedBy = [...likedBy, userId];
      }
      
      await updateDoc(postRef, updateData);
      return { success: true, reacted: true };
    }
  } catch (error) {
    console.error('[Feed] Error reacting to post:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Track a view on a post (every view counts, like YouTube)
 */
export const viewPost = async (postId, userId) => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    
    // Just increment the view count - every view counts!
    await updateDoc(postRef, {
      views: increment(1),
    });
    
    return { success: true };
  } catch (error) {
    console.error('[Feed] Error tracking view:', error);
    return { success: false };
  }
};

/**
 * Delete a post (only by author)
 */
export const deletePost = async (postId, userId) => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return { success: false, error: 'Post not found' };
    }
    
    if (postDoc.data().userId !== userId) {
      return { success: false, error: 'Not authorized' };
    }
    
    await deleteDoc(postRef);
    return { success: true };
  } catch (error) {
    console.error('[Feed] Error deleting post:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get posts by a specific user
 */
export const getUserPosts = async (userId, pageSize = 10) => {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    
    const snapshot = await getDocs(q);
    const posts = [];
    
    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      });
    });
    
    return posts;
  } catch (error) {
    console.error('[Feed] Error getting user posts:', error);
    return [];
  }
};

/**
 * Format time ago string
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Clean up old posts (older than 7 days)
 * This runs automatically when the Hub is opened to save storage costs
 */
export const cleanupOldPosts = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - POST_EXPIRY_DAYS);
    
    // Query for posts older than 7 days
    const q = query(
      collection(db, POSTS_COLLECTION),
      where('createdAt', '<', sevenDaysAgo),
      limit(50) // Delete in batches of 50 to avoid timeout
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('[Feed] No old posts to clean up');
      return { deleted: 0 };
    }
    
    let deletedCount = 0;
    
    // Delete each old post
    for (const docSnapshot of snapshot.docs) {
      try {
        await deleteDoc(doc(db, POSTS_COLLECTION, docSnapshot.id));
        deletedCount++;
        console.log('[Feed] Deleted old post:', docSnapshot.id);
      } catch (err) {
        console.error('[Feed] Error deleting old post:', docSnapshot.id, err);
      }
    }
    
    console.log(`[Feed] Cleanup complete. Deleted ${deletedCount} old posts.`);
    return { deleted: deletedCount };
  } catch (error) {
    console.error('[Feed] Error cleaning up old posts:', error);
    return { deleted: 0, error: error.message };
  }
};

export default {
  createPost,
  getFeedPosts,
  subscribeToPosts,
  likePost,
  reactToPost,
  viewPost,
  deletePost,
  getUserPosts,
  formatTimeAgo,
  cleanupOldPosts,
};

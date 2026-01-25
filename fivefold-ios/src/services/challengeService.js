/**
 * Challenge Service
 * 
 * Handles quiz challenges between friends:
 * - Sending and receiving challenges
 * - Score tracking
 * - Challenge history
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
  or,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notifyChallenge } from './socialNotificationService';

// Quiz categories available for challenges
export const CHALLENGE_CATEGORIES = [
  { id: 'general', name: 'General Bible', icon: 'bible', color: '#6366F1' },
  { id: 'ot', name: 'Old Testament', icon: 'scroll', color: '#F59E0B' },
  { id: 'nt', name: 'New Testament', icon: 'cross', color: '#10B981' },
  { id: 'characters', name: 'Bible Characters', icon: 'users', color: '#EF4444' },
  { id: 'verses', name: 'Famous Verses', icon: 'quote-right', color: '#8B5CF6' },
];

/**
 * Send a challenge to a friend
 * @param {Object} params - Challenge parameters
 * @param {string} params.challengerId - Challenger's user ID
 * @param {string} params.challengerName - Challenger's display name
 * @param {string} params.challengerPicture - Challenger's profile picture
 * @param {string} params.challengedId - Challenged user's ID
 * @param {string} params.challengedName - Challenged user's display name
 * @param {string} params.challengedPicture - Challenged user's profile picture
 * @param {string} params.category - Quiz category
 * @param {Array} params.questions - Array of question IDs for the challenge
 * @returns {Promise<Object>} - Created challenge
 */
export const sendChallenge = async ({
  challengerId,
  challengerName,
  challengerPicture,
  challengedId,
  challengedName,
  challengedPicture,
  category,
  categoryName,
  questionCount,
  questions = [],
}) => {
  if (!challengerId || !challengedId || !category) {
    throw new Error('Challenger, challenged, and category are required');
  }

  try {
    const challengeData = {
      challengerId,
      challengerName: challengerName || 'Challenger',
      challengerPicture: challengerPicture || '',
      challengedId,
      challengedName: challengedName || 'Friend',
      challengedPicture: challengedPicture || '',
      category,
      categoryName: categoryName || CHALLENGE_CATEGORIES.find(c => c.id === category)?.name || category,
      questionCount: questionCount || questions.length,
      questions, // Actual question data
      status: 'pending', // pending, accepted, declined, in_progress, completed
      challengerScore: null,
      challengedScore: null,
      challengerCompleted: false,
      challengedCompleted: false,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const challengeRef = await addDoc(collection(db, 'challenges'), challengeData);
    
    // Send notification to challenged user
    notifyChallenge(challengedId, challengerName, challengeData.categoryName).catch(err => {
      console.warn('Failed to send challenge notification:', err);
    });

    console.log('[ChallengeService] Challenge sent:', challengeRef.id);

    return {
      id: challengeRef.id,
      ...challengeData,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error sending challenge:', error);
    throw error;
  }
};

/**
 * Accept a challenge
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<boolean>} - Success status
 */
export const acceptChallenge = async (challengeId) => {
  if (!challengeId) return false;

  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
    });

    console.log('[ChallengeService] Challenge accepted:', challengeId);
    return true;
  } catch (error) {
    console.error('Error accepting challenge:', error);
    return false;
  }
};

/**
 * Decline a challenge
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<boolean>} - Success status
 */
export const declineChallenge = async (challengeId) => {
  if (!challengeId) return false;

  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'declined',
      declinedAt: serverTimestamp(),
    });

    console.log('[ChallengeService] Challenge declined:', challengeId);
    return true;
  } catch (error) {
    console.error('Error declining challenge:', error);
    return false;
  }
};

/**
 * Submit score for a challenge
 * @param {string} challengeId - Challenge ID
 * @param {string} userId - User submitting score
 * @param {number} score - Quiz score
 * @param {number} totalQuestions - Total questions in quiz
 * @returns {Promise<Object>} - Updated challenge data
 */
export const submitScore = async (challengeId, userId, score, totalQuestions) => {
  console.log('[ChallengeService] submitScore called:', { challengeId, userId, score, totalQuestions });
  
  if (!challengeId || !userId) {
    console.error('[ChallengeService] Missing challengeId or userId!');
    return null;
  }

  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const challengeDoc = await getDoc(challengeRef);
    
    if (!challengeDoc.exists()) {
      console.warn('[ChallengeService] Challenge not found:', challengeId);
      return null;
    }

    const data = challengeDoc.data();
    const isChallenger = data.challengerId === userId;
    
    console.log('[ChallengeService] User role:', isChallenger ? 'CHALLENGER' : 'CHALLENGED');
    console.log('[ChallengeService] Current state:', {
      challengerCompleted: data.challengerCompleted,
      challengedCompleted: data.challengedCompleted,
      status: data.status,
    });
    
    const updateData = isChallenger 
      ? { challengerScore: score, challengerCompleted: true }
      : { challengedScore: score, challengedCompleted: true };

    // Check if both have completed
    const otherCompleted = isChallenger ? data.challengedCompleted : data.challengerCompleted;
    if (otherCompleted) {
      updateData.status = 'completed';
      updateData.completedAt = serverTimestamp();
      console.log('[ChallengeService] Both completed! Setting status to COMPLETED');
    } else {
      updateData.status = 'in_progress';
      console.log('[ChallengeService] Waiting for other player. Setting status to IN_PROGRESS');
    }

    console.log('[ChallengeService] Updating with:', updateData);
    await updateDoc(challengeRef, updateData);

    console.log('[ChallengeService] ✅ Score submitted successfully!');

    return {
      ...data,
      ...updateData,
    };
  } catch (error) {
    console.error('[ChallengeService] ❌ Error submitting score:', error);
    return null;
  }
};

/**
 * Get all challenges for a user
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<Object>} - Challenges grouped by status
 */
export const getChallenges = async (userId) => {
  if (!userId) return { pending: [], active: [], completed: [] };

  try {
    const challengesRef = collection(db, 'challenges');
    
    // Query challenges where user is challenger
    const challengerQuery = query(
      challengesRef,
      where('challengerId', '==', userId),
      limit(50)
    );
    
    // Query challenges where user is challenged
    const challengedQuery = query(
      challengesRef,
      where('challengedId', '==', userId),
      limit(50)
    );

    const [challengerSnap, challengedSnap] = await Promise.all([
      getDocs(challengerQuery),
      getDocs(challengedQuery),
    ]);
    
    const challengesMap = new Map();
    
    challengerSnap.forEach((doc) => {
      const data = doc.data();
      challengesMap.set(doc.id, {
        id: doc.id,
        ...data,
        isChallenger: true,
      });
    });
    
    challengedSnap.forEach((doc) => {
      if (!challengesMap.has(doc.id)) {
        const data = doc.data();
        challengesMap.set(doc.id, {
          id: doc.id,
          ...data,
          isChallenger: false,
        });
      }
    });
    
    const challenges = Array.from(challengesMap.values());
    
    // Sort by createdAt descending (in JS to avoid index requirement)
    challenges.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    // Group by status
    const pending = challenges.filter(c => 
      c.status === 'pending' && c.challengedId === userId
    );
    const active = challenges.filter(c => 
      (c.status === 'accepted' || c.status === 'in_progress') ||
      (c.status === 'pending' && c.challengerId === userId)
    );
    const completed = challenges.filter(c => c.status === 'completed' || c.status === 'declined');

    return { pending, active, completed };
  } catch (error) {
    console.error('Error getting challenges:', error);
    return { pending: [], active: [], completed: [] };
  }
};

/**
 * Subscribe to challenges for real-time updates
 * @param {string} userId - User's Firebase UID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToChallenges = (userId, callback) => {
  if (!userId) {
    callback({ pending: [], active: [], completed: [] });
    return () => {};
  }

  const challengesRef = collection(db, 'challenges');
  
  // Two separate queries to avoid index issues
  const challengerQuery = query(
    challengesRef,
    where('challengerId', '==', userId),
    limit(50)
  );
  
  const challengedQuery = query(
    challengesRef,
    where('challengedId', '==', userId),
    limit(50)
  );
  
  const challengesMap = new Map();
  
  const processAndCallback = async () => {
    const challenges = Array.from(challengesMap.values());
    const now = Date.now();
    
    // Check for expired challenges (older than 7 days and not completed)
    for (const challenge of challenges) {
      const createdAt = challenge.createdAt?.toMillis?.() || 0;
      const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      
      // Expire challenges older than 7 days that aren't completed
      if (ageInDays > 7 && 
          challenge.status !== 'completed' && 
          challenge.status !== 'declined' && 
          challenge.status !== 'expired') {
        // Mark as expired in Firestore (fire and forget)
        updateDoc(doc(db, 'challenges', challenge.id), { 
          status: 'expired',
          expiredAt: serverTimestamp(),
        }).catch(err => console.error('Error expiring challenge:', err));
        
        // Update local state immediately
        challenge.status = 'expired';
        challengesMap.set(challenge.id, challenge);
      }
    }
    
    // Sort by createdAt descending
    challenges.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    const pending = challenges.filter(c => 
      c.status === 'pending' && c.challengedId === userId
    );
    const active = challenges.filter(c => 
      (c.status === 'accepted' || c.status === 'in_progress') ||
      (c.status === 'pending' && c.challengerId === userId)
    );
    const completed = challenges.filter(c => 
      c.status === 'completed' || c.status === 'declined' || c.status === 'expired'
    );

    callback({ pending, active, completed });
  };

  const unsub1 = onSnapshot(challengerQuery, 
    (snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        challengesMap.set(doc.id, {
          id: doc.id,
          ...data,
          isChallenger: true,
        });
      });
      processAndCallback();
    },
    (error) => {
      console.error('Error in challenger subscription:', error);
    }
  );
  
  const unsub2 = onSnapshot(challengedQuery, 
    (snapshot) => {
      snapshot.forEach((doc) => {
        if (!challengesMap.has(doc.id)) {
          const data = doc.data();
          challengesMap.set(doc.id, {
            id: doc.id,
            ...data,
            isChallenger: false,
          });
        }
      });
      processAndCallback();
    },
    (error) => {
      console.error('Error in challenged subscription:', error);
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
};

/**
 * Get a specific challenge
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object|null>} - Challenge data
 */
export const getChallenge = async (challengeId) => {
  if (!challengeId) return null;

  try {
    const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
    
    if (!challengeDoc.exists()) return null;

    return {
      id: challengeDoc.id,
      ...challengeDoc.data(),
    };
  } catch (error) {
    console.error('Error getting challenge:', error);
    return null;
  }
};

/**
 * Get challenge statistics for a user
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<Object>} - Stats object
 */
export const getChallengeStats = async (userId) => {
  if (!userId) return { wins: 0, losses: 0, draws: 0, total: 0 };

  try {
    const { completed } = await getChallenges(userId);
    
    let wins = 0;
    let losses = 0;
    let draws = 0;

    completed.forEach((challenge) => {
      const isChallenger = challenge.challengerId === userId;
      
      // Declined = loss for the person who declined (the challenged user)
      if (challenge.status === 'declined') {
        if (isChallenger) {
          wins++; // Challenger wins when opponent declines
        } else {
          losses++; // Challenged user loses when they decline
        }
        return;
      }
      
      // Expired = loss for whoever didn't complete
      if (challenge.status === 'expired') {
        const didComplete = isChallenger ? challenge.challengerCompleted : challenge.challengedCompleted;
        const opponentCompleted = isChallenger ? challenge.challengedCompleted : challenge.challengerCompleted;
        
        if (!didComplete && opponentCompleted) {
          losses++; // You didn't complete but opponent did
        } else if (didComplete && !opponentCompleted) {
          wins++; // You completed but opponent didn't
        }
        // If neither completed, don't count it
        return;
      }
      
      // Completed = compare scores
      if (challenge.status !== 'completed') return;
      
      const myScore = isChallenger ? challenge.challengerScore : challenge.challengedScore;
      const theirScore = isChallenger ? challenge.challengedScore : challenge.challengerScore;

      if (myScore > theirScore) wins++;
      else if (myScore < theirScore) losses++;
      else draws++;
    });

    const countedChallenges = wins + losses + draws;
    return {
      wins,
      losses,
      draws,
      total: countedChallenges,
      winRate: countedChallenges > 0 ? Math.round((wins / countedChallenges) * 100) : 0,
    };
  } catch (error) {
    console.error('Error getting challenge stats:', error);
    return { wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 };
  }
};

/**
 * Delete/cancel a challenge
 * @param {string} challengeId - Challenge ID
 * @param {string} userId - User requesting deletion
 * @returns {Promise<boolean>} - Success status
 */
export const deleteChallenge = async (challengeId, userId) => {
  if (!challengeId || !userId) return false;

  try {
    const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
    
    if (!challengeDoc.exists()) return false;
    
    const data = challengeDoc.data();
    
    // Only allow deletion by challenger if pending
    if (data.challengerId !== userId || data.status !== 'pending') {
      console.warn('Cannot delete this challenge');
      return false;
    }

    await deleteDoc(doc(db, 'challenges', challengeId));
    
    console.log('[ChallengeService] Challenge deleted:', challengeId);
    return true;
  } catch (error) {
    console.error('Error deleting challenge:', error);
    return false;
  }
};

export default {
  CHALLENGE_CATEGORIES,
  sendChallenge,
  acceptChallenge,
  declineChallenge,
  submitScore,
  getChallenges,
  subscribeToChallenges,
  getChallenge,
  getChallengeStats,
  deleteChallenge,
};

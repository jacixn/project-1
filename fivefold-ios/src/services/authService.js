/**
 * Authentication Service
 * 
 * Handles all Firebase Authentication operations:
 * - Email/password sign up with username
 * - Email/password sign in
 * - Password reset
 * - Sign out
 * - Username availability checking
 */

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getStoredData } from '../utils/localStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if a username is available
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - True if available, false if taken
 */
export const checkUsernameAvailability = async (username) => {
  if (!username || username.length < 3) {
    return false;
  }
  
  const normalizedUsername = username.toLowerCase().trim();
  const usernameRef = doc(db, 'usernames', normalizedUsername);
  const usernameDoc = await getDoc(usernameRef);
  
  return !usernameDoc.exists();
};

/**
 * Sign up a new user with email, password, and username
 * @param {Object} params - Sign up parameters
 * @param {string} params.email - User's email
 * @param {string} params.password - User's password
 * @param {string} params.username - User's chosen username
 * @param {string} params.displayName - User's display name
 * @returns {Promise<Object>} - The created user object
 */
export const signUp = async ({ email, password, username, displayName }) => {
  // Validate username
  const normalizedUsername = username.toLowerCase().trim();
  
  if (normalizedUsername.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (normalizedUsername.length > 20) {
    throw new Error('Username must be 20 characters or less');
  }
  
  if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }
  
  // Check username availability - fresh check right before signup
  const usernameRef = doc(db, 'usernames', normalizedUsername);
  const usernameDoc = await getDoc(usernameRef);
  
  if (usernameDoc.exists()) {
    // Check if this is an orphaned username (no corresponding user account)
    const usernameData = usernameDoc.data();
    if (usernameData.userId) {
      // Verify the user still exists
      const userDoc = await getDoc(doc(db, 'users', usernameData.userId));
      if (!userDoc.exists()) {
        // Orphaned username - delete it and allow signup
        console.log('[Auth] Found orphaned username, cleaning up:', normalizedUsername);
        await deleteDoc(usernameRef);
      } else {
        throw new Error('Username is already taken');
      }
    } else {
      throw new Error('Username is already taken');
    }
  }
  
  // Create the user account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update the user's display name
  await updateProfile(user, {
    displayName: displayName || username,
  });
  
  // Reserve the username in the usernames collection
  await setDoc(doc(db, 'usernames', normalizedUsername), {
    userId: user.uid,
    createdAt: serverTimestamp(),
  });
  
  // Create a FRESH user document in Firestore (no data migration)
  await setDoc(doc(db, 'users', user.uid), {
    email: email.toLowerCase(),
    username: normalizedUsername,
    displayName: displayName || username,
    profilePicture: '',
    country: '',
    countryCode: '',
    countryFlag: '',
    totalPoints: 0,
    currentStreak: 0,
    level: 1,
    prayersCompleted: 0,
    workoutsCompleted: 0,
    tasksCompleted: 0,
    quizzesTaken: 0,
    joinedDate: serverTimestamp(),
    lastActive: serverTimestamp(),
    isPublic: true,
    createdAt: serverTimestamp(),
  });
  
  // Clear local data so the new account starts fresh
  await AsyncStorage.removeItem('fivefold_userStats');
  await AsyncStorage.removeItem('userProfile');
  await AsyncStorage.removeItem('fivefold_userName');
  console.log('[Auth] Created fresh account, cleared local data');
  
  // Initialize the friends document
  await setDoc(doc(db, 'friends', user.uid), {
    friendsList: [],
    pendingRequests: [],
    sentRequests: [],
  });
  
  console.log('[Auth] Account created with migrated data');
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: displayName || username,
    username: normalizedUsername,
  };
};

/**
 * Sign in an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - The signed in user object
 */
export const signIn = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update last active timestamp
  await setDoc(doc(db, 'users', user.uid), {
    lastActive: serverTimestamp(),
  }, { merge: true });
  
  // Get the user's profile from Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    username: userData?.username || '',
    ...userData,
  };
};

/**
 * Sign out the current user
 * Clears local cached data so signing into a different account works correctly
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  // Clear cached user data so next sign in loads correct account data
  await AsyncStorage.removeItem('@biblely_user_cache');
  await AsyncStorage.removeItem('userProfile');
  await AsyncStorage.removeItem('fivefold_userStats');
  await AsyncStorage.removeItem('fivefold_userName');
  console.log('[Auth] Signed out and cleared local cache');
  
  await firebaseSignOut(auth);
};

/**
 * Send a password reset email
 * @param {string} email - User's email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Get the current authenticated user
 * @returns {Object|null} - The current user or null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Get a user's profile from Firestore
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} - The user's profile data
 */
export const getUserProfile = async (userId) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { uid: userId, ...userDoc.data() };
  }
  return null;
};

/**
 * Search for users by username
 * @param {string} searchQuery - The search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of matching users
 */
export const searchUsersByUsername = async (searchQuery, limit = 10) => {
  if (!searchQuery || searchQuery.length < 2) {
    return [];
  }
  
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
    if (results.length < limit) {
      results.push({ uid: doc.id, ...doc.data() });
    }
  });
  
  return results;
};

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} - Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get user-friendly error messages for Firebase auth errors
 * @param {Error} error - The Firebase error
 * @returns {string} - User-friendly error message
 */
export const getAuthErrorMessage = (error) => {
  const errorCode = error.code || '';
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Try signing up instead.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};

export default {
  signUp,
  signIn,
  signOut,
  resetPassword,
  getCurrentUser,
  getUserProfile,
  checkUsernameAvailability,
  searchUsersByUsername,
  onAuthStateChange,
  getAuthErrorMessage,
};

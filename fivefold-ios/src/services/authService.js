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
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../config/firebase';
import { getStoredData } from '../utils/localStorage';
import userStorage from '../utils/userStorage';
import { invalidateLoadingAnimCache } from '../components/CustomLoadingIndicator';

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
  
  // NOTE: Do NOT send verification code here — the user hasn't started onboarding yet.
  // The code will be sent when they tap "Verify Email" during onboarding.
  let maskedEmail = email;
  
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
    emailVerified: false,
    joinedDate: serverTimestamp(),
    lastActive: serverTimestamp(),
    isPublic: true,
    createdAt: serverTimestamp(),
  });
  
  // Clear local data so the new account starts fresh
  await userStorage.remove('fivefold_userStats');
  await userStorage.remove('userProfile');
  await userStorage.remove('fivefold_userName');
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
    maskedEmail,
  };
};

/**
 * Resolve an email-or-username identifier to an actual email address.
 * If the identifier contains '@', it's treated as an email and returned as-is.
 * Otherwise it's treated as a username and looked up in Firestore.
 * @param {string} identifier - Email or username
 * @returns {Promise<string>} - The resolved email address
 */
export const resolveIdentifierToEmail = async (identifier) => {
  if (!identifier || identifier.trim().length === 0) {
    throw new Error('Please enter your email or username.');
  }

  const trimmed = identifier.trim();

  // If it looks like an email (contains @), return as-is
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  // Treat as username — look up in the usernames collection
  const normalizedUsername = trimmed.toLowerCase();
  const usernameRef = doc(db, 'usernames', normalizedUsername);
  const usernameDoc = await getDoc(usernameRef);

  if (!usernameDoc.exists()) {
    throw new Error('No account found with this username.');
  }

  const usernameData = usernameDoc.data();
  if (!usernameData?.userId) {
    throw new Error('No account found with this username.');
  }

  // Get the user's email from the users collection
  const userDocRef = doc(db, 'users', usernameData.userId);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    throw new Error('No account found with this username.');
  }

  const email = userDocSnap.data()?.email;
  if (!email) {
    throw new Error('No email associated with this account.');
  }

  return email.toLowerCase();
};

/**
 * Sign in an existing user with email or username
 * @param {string} emailOrUsername - User's email or username
 * @param {string} password - User's password
 * @returns {Promise<Object>} - The signed in user object
 */
export const signIn = async (emailOrUsername, password) => {
  // Resolve username to email if needed
  const email = await resolveIdentifierToEmail(emailOrUsername);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update last active timestamp and email verification status
  await setDoc(doc(db, 'users', user.uid), {
    lastActive: serverTimestamp(),
    emailVerified: user.emailVerified,
  }, { merge: true });
  
  // Get the user's profile from Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    username: userData?.username || '',
    emailVerified: user.emailVerified,
    ...userData,
  };
};

/**
 * Check if current user's email is verified
 * @returns {boolean} - True if email is verified
 */
export const isEmailVerified = () => {
  const user = auth.currentUser;
  return user ? user.emailVerified : false;
};

/**
 * Send a 6-digit verification code to the current user's email.
 * Calls the sendVerificationCode Cloud Function.
 * @returns {Promise<{success: boolean, maskedEmail: string}>}
 */
export const sendVerificationCode = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user signed in');
  }
  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  const callable = httpsCallable(functions, 'sendVerificationCode');
  const result = await callable();
  console.log('[Auth] Verification code sent to:', result.data.maskedEmail);
  return result.data;
};

/**
 * Verify the 6-digit code entered by the user.
 * Calls the verifyEmailCode Cloud Function.
 * @param {string} code – the 6-digit code
 * @returns {Promise<{success: boolean, emailVerified: boolean}>}
 */
export const verifyEmailCode = async (code) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user signed in');
  }

  const callable = httpsCallable(functions, 'verifyEmailCode');
  const result = await callable({ code });

  // Reload the local user so user.emailVerified updates
  await user.reload();

  console.log('[Auth] Email verified successfully');
  return result.data;
};

/**
 * Reload user to get fresh email verification status
 * @returns {Promise<boolean>} - True if email is verified
 */
export const refreshEmailVerificationStatus = async () => {
  const user = auth.currentUser;
  if (!user) return false;
  
  await user.reload();
  
  // Update Firestore if verification status changed
  if (user.emailVerified) {
    await setDoc(doc(db, 'users', user.uid), {
      emailVerified: true,
    }, { merge: true });
  }
  
  return user.emailVerified;
};

/**
 * Sign out the current user
 * Clears local cached data so signing into a different account works correctly
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  // Clear push token from Firestore BEFORE signing out so this device
  // stops receiving notifications for the outgoing user.
  try {
    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        pushToken: '',
        pushTokenUpdatedAt: new Date(),
      });
      console.log('[Auth] Cleared push token for user:', currentUser.uid);
    }
  } catch (tokenErr) {
    console.warn('[Auth] Failed to clear push token on sign out:', tokenErr);
  }

  // Clear cached user data so next sign in loads correct account data
  await userStorage.remove('@biblely_user_cache');
  await userStorage.remove('userProfile');
  await userStorage.remove('fivefold_userStats');
  await userStorage.remove('fivefold_userName');
  invalidateLoadingAnimCache(); // Reset so next user gets their own animation
  console.log('[Auth] Signed out and cleared local cache');
  
  await firebaseSignOut(auth);
};

/**
 * Send a 6-digit password reset code to the user's email via Cloud Function.
 * Uses the same Resend email service as verification codes (won't go to spam).
 * @param {string} email - User's email
 * @returns {Promise<{success: boolean, maskedEmail: string}>}
 */
export const sendPasswordResetCode = async (email) => {
  const callable = httpsCallable(functions, 'sendPasswordResetCode');
  const result = await callable({ email: email.trim().toLowerCase() });
  console.log('[Auth] Password reset code sent to:', result.data.maskedEmail);
  return result.data;
};

/**
 * Verify the reset code and set a new password via Cloud Function.
 * @param {string} email - User's email
 * @param {string} code - The 6-digit code
 * @param {string} newPassword - The new password (min 6 chars)
 * @returns {Promise<{success: boolean}>}
 */
export const resetPasswordWithCode = async (email, code, newPassword) => {
  const callable = httpsCallable(functions, 'resetPasswordWithCode');
  const result = await callable({
    email: email.trim().toLowerCase(),
    code: code.trim(),
    newPassword,
  });
  console.log('[Auth] Password reset successful');
  return result.data;
};

/**
 * Legacy: Send password reset via Firebase default email.
 * Kept as fallback in case Cloud Function is unavailable.
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
      return 'No account found. Please check your email or username.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email or username and password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};

// ─── Two-Factor Authentication ──────────────────────────────────

/**
 * Check if a user has 2FA enabled by reading their Firestore doc.
 * @param {string} uid - The user's UID
 * @returns {Promise<boolean>}
 */
export const check2FAEnabled = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return !!userDoc.data().twoFactorEnabled;
  }
  return false;
};

/**
 * Send a 2FA login code to the current user's email.
 * Called right after signInWithEmailAndPassword when 2FA is enabled.
 * @returns {Promise<{success: boolean, maskedEmail: string}>}
 */
export const send2FALoginCode = async () => {
  const callable = httpsCallable(functions, 'send2FALoginCode');
  const result = await callable();
  console.log('[Auth] 2FA login code sent to:', result.data.maskedEmail);
  return result.data;
};

/**
 * Verify the 2FA login code. Unauthenticated (user was signed out).
 * @param {string} email - User's email
 * @param {string} code - The 6-digit code
 * @returns {Promise<{success: boolean}>}
 */
export const verify2FALoginCode = async (email, code) => {
  const callable = httpsCallable(functions, 'verify2FALoginCode');
  const result = await callable({
    email: email.trim().toLowerCase(),
    code: code.trim(),
  });
  console.log('[Auth] 2FA login code verified');
  return result.data;
};

/**
 * Send a 2FA setup code to confirm enabling two-factor authentication.
 * Requires email to be verified.
 * @returns {Promise<{success: boolean, maskedEmail: string}>}
 */
export const send2FASetupCode = async () => {
  const callable = httpsCallable(functions, 'send2FASetupCode');
  const result = await callable();
  console.log('[Auth] 2FA setup code sent to:', result.data.maskedEmail);
  return result.data;
};

/**
 * Confirm 2FA setup by verifying the code. Enables 2FA on success.
 * @param {string} code - The 6-digit code
 * @returns {Promise<{success: boolean, twoFactorEnabled: boolean}>}
 */
export const confirm2FASetup = async (code) => {
  const callable = httpsCallable(functions, 'confirm2FASetup');
  const result = await callable({ code: code.trim() });
  console.log('[Auth] 2FA enabled successfully');
  return result.data;
};

/**
 * Disable two-factor authentication.
 * @returns {Promise<{success: boolean, twoFactorEnabled: boolean}>}
 */
export const disable2FA = async () => {
  const callable = httpsCallable(functions, 'disable2FA');
  const result = await callable();
  console.log('[Auth] 2FA disabled');
  return result.data;
};

export default {
  signUp,
  signIn,
  signOut,
  resetPassword,
  sendPasswordResetCode,
  resetPasswordWithCode,
  getCurrentUser,
  getUserProfile,
  checkUsernameAvailability,
  searchUsersByUsername,
  resolveIdentifierToEmail,
  onAuthStateChange,
  getAuthErrorMessage,
  isEmailVerified,
  sendVerificationCode,
  verifyEmailCode,
  refreshEmailVerificationStatus,
  check2FAEnabled,
  send2FALoginCode,
  verify2FALoginCode,
  send2FASetupCode,
  confirm2FASetup,
  disable2FA,
};

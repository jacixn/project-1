import AsyncStorage from '@react-native-async-storage/async-storage';
import userStorage from './userStorage';
import { Alert } from 'react-native';

export const resetOnboardingForTesting = async () => {
  try {
    // Clear onboarding completion flag
    await userStorage.remove('onboardingCompleted');
    
    // Clear all user data for completely fresh start
    const keysToRemove = [
      'userProfile',
      'todos',
      'completedTodos',
      'prayerCompletions',
      'customPrayerNames',
      'customPrayerTimes',
      'achievements',
      'userStats',
      'readingProgress',
      'chatHistory',
      'notificationSettings',
      'appSettings',
      'app_language',
      'theme_preference',
      'wallpaper_preference',
      'smart_features_enabled'
    ];
    
    // Get all keys and clear any user-related data (raw keys include UID scope)
    const allKeys = await AsyncStorage.getAllKeys();
    const allKeysToRemove = allKeys.filter(key => 
      keysToRemove.some(k => key.endsWith(':' + k) || key === k) || 
      key.includes('fivefold_') ||
      key.includes('prayer') ||
      key.includes('todo') ||
      key.includes('completion') ||
      key.includes('user') ||
      key.includes('profile')
    );
    
    if (allKeysToRemove.length > 0) {
      // Use raw AsyncStorage since keys are already fully qualified (UID-scoped)
      await AsyncStorage.multiRemove(allKeysToRemove);
    }
    
    console.log('✅ Account deleted - all user data cleared:', allKeysToRemove);
    
    // Trigger onboarding restart if callback exists
    if (global.onboardingRestartCallback) {
      console.log('🔄 Triggering onboarding restart...');
      global.onboardingRestartCallback();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting account:', error);
    return false;
  }
};

export const forceShowOnboarding = async () => {
  try {
    await userStorage.remove('onboardingCompleted');
    console.log('✅ Onboarding flag cleared - will show on next app restart');
    return true;
  } catch (error) {
    console.error('❌ Error clearing onboarding flag:', error);
    return false;
  }
};

export const deleteAccountCompletely = async (password = null, onProgress = null) => {
  const progress = (stepIndex) => {
    if (onProgress) onProgress(stepIndex);
  };

  try {
    console.log('[Delete] Starting complete account deletion...');

    // Import Firebase modules
    const { auth, db } = await import('../config/firebase');
    const { doc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
    const { deleteUser, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
    const { ref, listAll, deleteObject } = await import('firebase/storage');
    let storage = null;
    try {
      const firebaseConfig = await import('../config/firebase');
      storage = firebaseConfig.storage;
    } catch (_) {}

    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('NO_USER');
    }

    const uid = currentUser.uid;
    const email = currentUser.email;
    console.log('[Delete] User:', uid, email);

    // ── Step 0: Verify identity ──
    progress(0);
    if (!password) throw new Error('PASSWORD_REQUIRED');
    if (!email) throw new Error('NO_EMAIL');

    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(currentUser, credential);
    console.log('[Delete] Re-authenticated');

    // ── Step 1: Delete social content (prayers, posts) ──
    progress(1);
    try {
      // Delete user's social prayers
      const prayersQ = query(collection(db, 'prayers'), where('userId', '==', uid));
      const prayerSnap = await getDocs(prayersQ);
      if (!prayerSnap.empty) {
        const batch = writeBatch(db);
        prayerSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log('[Delete] Deleted', prayerSnap.size, 'prayers');
      }

      // Delete user's social posts
      const postsQ = query(collection(db, 'posts'), where('userId', '==', uid));
      const postSnap = await getDocs(postsQ);
      if (!postSnap.empty) {
        const batch = writeBatch(db);
        postSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log('[Delete] Deleted', postSnap.size, 'posts');
      }
    } catch (e) {
      console.log('[Delete] Social content cleanup:', e.message);
    }

    // ── Step 2: Delete conversations & messages ──
    progress(2);
    try {
      const convsQ = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
      const convSnap = await getDocs(convsQ);
      for (const convDoc of convSnap.docs) {
        // Delete messages subcollection
        try {
          const msgsSnap = await getDocs(collection(db, 'conversations', convDoc.id, 'messages'));
          if (!msgsSnap.empty) {
            const batch = writeBatch(db);
            msgsSnap.forEach(m => batch.delete(m.ref));
            await batch.commit();
          }
        } catch (_) {}
        await deleteDoc(convDoc.ref);
      }
      console.log('[Delete] Deleted', convSnap.size, 'conversations');
    } catch (e) {
      console.log('[Delete] Conversations cleanup:', e.message);
    }

    // ── Step 3: Delete challenges ──
    progress(3);
    try {
      const challQ1 = query(collection(db, 'challenges'), where('challengerId', '==', uid));
      const challQ2 = query(collection(db, 'challenges'), where('challengedId', '==', uid));
      const [snap1, snap2] = await Promise.all([getDocs(challQ1), getDocs(challQ2)]);
      const allChallDocs = [...snap1.docs, ...snap2.docs];
      if (allChallDocs.length > 0) {
        const batch = writeBatch(db);
        const seen = new Set();
        allChallDocs.forEach(d => {
          if (!seen.has(d.id)) { seen.add(d.id); batch.delete(d.ref); }
        });
        await batch.commit();
        console.log('[Delete] Deleted', seen.size, 'challenges');
      }
    } catch (e) {
      console.log('[Delete] Challenges cleanup:', e.message);
    }

    // ── Step 4: Delete cloud profile & data ──
    progress(4);
    try {
      // Get username for reservation cleanup
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.username) {
          await deleteDoc(doc(db, 'usernames', userData.username));
          console.log('[Delete] Deleted username:', userData.username);
        }
      }
      // Delete main user document
      await deleteDoc(doc(db, 'users', uid));
      console.log('[Delete] Deleted user document');

      // Delete friends document
      try { await deleteDoc(doc(db, 'friends', uid)); } catch (_) {}
      console.log('[Delete] Deleted friends document');

      // Delete verification/reset codes
      try { await deleteDoc(doc(db, 'verificationCodes', uid)); } catch (_) {}
      console.log('[Delete] Cleaned up verification codes');
    } catch (e) {
      console.log('[Delete] Cloud profile cleanup:', e.message);
    }

    // ── Step 5: Delete profile pictures from Storage ──
    progress(5);
    try {
      if (storage) {
        const folderRef = ref(storage, `profile-pictures/${uid}`);
        const list = await listAll(folderRef);
        for (const item of list.items) {
          await deleteObject(item);
        }
        console.log('[Delete] Deleted', list.items.length, 'profile pictures');
      }
    } catch (e) {
      console.log('[Delete] Storage cleanup:', e.message);
    }

    // ── Step 6: Clear all local data ──
    progress(6);
    try {
      // Clear SecureStore credentials
      const SecureStore = await import('expo-secure-store');
      try { await SecureStore.deleteItemAsync(`biblely_cred_${uid}`); } catch (_) {}
      console.log('[Delete] Cleared SecureStore credentials');

      // Remove from linked accounts list
      try {
        const linkedRaw = await AsyncStorage.getItem('@biblely_linked_accounts');
        if (linkedRaw) {
          const linked = JSON.parse(linkedRaw);
          const filtered = linked.filter(a => a.uid !== uid);
          await AsyncStorage.setItem('@biblely_linked_accounts', JSON.stringify(filtered));
          console.log('[Delete] Removed from linked accounts');
        }
      } catch (_) {}

      // Clear ALL AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const appKeys = allKeys.filter(k => !k.startsWith('@RNC_AsyncStorage_'));
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
        console.log('[Delete] Removed', appKeys.length, 'local storage keys');
      }
    } catch (e) {
      console.log('[Delete] Local data cleanup:', e.message);
    }

    // ── Step 7: Delete Firebase Auth account ──
    progress(7);
    await deleteUser(currentUser);
    console.log('[Delete] Deleted Firebase Auth account');

    // ── Done ──
    progress(8);
    console.log('[Delete] Account deletion complete — all data removed');
    return true;

  } catch (error) {
    console.error('[Delete] Account deletion failed:', error);
    if (error.code === 'auth/requires-recent-login' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('WRONG_PASSWORD');
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error('TOO_MANY_ATTEMPTS');
    }
    if (['PASSWORD_REQUIRED', 'NO_EMAIL', 'NO_USER', 'WRONG_PASSWORD', 'TOO_MANY_ATTEMPTS'].includes(error.message)) {
      throw error;
    }
    return false;
  }
};
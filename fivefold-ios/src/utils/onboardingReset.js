import AsyncStorage from '@react-native-async-storage/async-storage';
import userStorage from './userStorage';
import { Alert } from 'react-native';

export const resetOnboardingForTesting = async () => {
  try {
    // Clear onboarding completion flag
    await userStorage.remove('onboardingCompleted');
    
    // Clear all user data for completely fresh start — UID-scoped only
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
    
    // Use UID-scoped removal — only removes current user's data,
    // never touches other linked accounts' keys
    const uid = userStorage.getCurrentUid();
    if (uid) {
      const allKeys = await AsyncStorage.getAllKeys();
      const uidPrefix = `u:${uid}:`;
      const userKeys = allKeys.filter(k => k.startsWith(uidPrefix));
      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }
      console.log('✅ User data cleared (UID-scoped):', userKeys.length, 'keys removed');
    } else {
      // Fallback: remove only the explicit keys via userStorage
      for (const key of keysToRemove) {
        try { await userStorage.remove(key); } catch (_) {}
      }
      console.log('✅ User data cleared via userStorage (no UID available)');
    }
    
    // Trigger onboarding restart if callback exists
    if (global.onboardingRestartCallback) {
      console.log('🔄 Triggering onboarding restart...');
      global.onboardingRestartCallback();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
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
    const { doc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch, updateDoc, arrayRemove, increment } = await import('firebase/firestore');
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

    // Helper: batch-delete query results (handles >500 doc batches)
    // Retries once on failure to handle transient network issues
    const batchDeleteQuery = async (q, label) => {
      const attempt = async () => {
        const snap = await getDocs(q);
        if (snap.empty) { console.log(`[Delete] No ${label} found to delete`); return 0; }
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const chunk = docs.slice(i, i + 450);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        console.log(`[Delete] ✓ Deleted ${docs.length} ${label}`);
        return docs.length;
      };
      try {
        return await attempt();
      } catch (e) {
        console.warn(`[Delete] ⚠ FIRST attempt failed for ${label}:`, e.message, '— retrying...');
        try {
          return await attempt();
        } catch (e2) {
          console.error(`[Delete] ✗ FAILED to delete ${label} after retry:`, e2.message);
          return 0;
        }
      }
    };

    // ── Step 1: Delete social content (prayers, hub posts) ──
    progress(1);
    try {
      // Delete user's social prayers
      await batchDeleteQuery(
        query(collection(db, 'prayers'), where('userId', '==', uid)),
        'prayers'
      );
    } catch (e) {
      console.error('[Delete] ✗ Prayer cleanup failed:', e.message);
    }

    try {
      // Delete user's hub posts (collection is 'hub_posts', NOT 'posts')
      const deletedCount = await batchDeleteQuery(
        query(collection(db, 'hub_posts'), where('userId', '==', uid)),
        'hub posts'
      );
      // Verify deletion actually worked
      if (deletedCount > 0) {
        const verifySnap = await getDocs(query(collection(db, 'hub_posts'), where('userId', '==', uid)));
        if (!verifySnap.empty) {
          console.error(`[Delete] ✗ VERIFICATION FAILED: ${verifySnap.size} hub posts still exist for ${uid} — retrying...`);
          await batchDeleteQuery(
            query(collection(db, 'hub_posts'), where('userId', '==', uid)),
            'hub posts (verification retry)'
          );
        } else {
          console.log(`[Delete] ✓ Verified: 0 hub posts remain for ${uid}`);
        }
      }
    } catch (e) {
      console.error('[Delete] ✗ Hub posts cleanup failed:', e.message);
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
            const msgDocs = msgsSnap.docs;
            for (let i = 0; i < msgDocs.length; i += 450) {
              const chunk = msgDocs.slice(i, i + 450);
              const batch = writeBatch(db);
              chunk.forEach(m => batch.delete(m.ref));
              await batch.commit();
            }
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
        const seen = new Set();
        const uniqueDocs = allChallDocs.filter(d => {
          if (seen.has(d.id)) return false;
          seen.add(d.id);
          return true;
        });
        for (let i = 0; i < uniqueDocs.length; i += 450) {
          const chunk = uniqueDocs.slice(i, i + 450);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        console.log('[Delete] Deleted', seen.size, 'challenges');
      }
    } catch (e) {
      console.log('[Delete] Challenges cleanup:', e.message);
    }

    // ── Step 3b: Delete reports & blocked_users ──
    try {
      // Delete reports filed BY this user
      await batchDeleteQuery(
        query(collection(db, 'reports'), where('reporterId', '==', uid)),
        'reports (filed by user)'
      );

      // Delete reports filed AGAINST this user (orphan cleanup)
      await batchDeleteQuery(
        query(collection(db, 'reports'), where('reportedUserId', '==', uid)),
        'reports (filed against user)'
      );

      // Delete blocked_users entries where this user blocked someone
      await batchDeleteQuery(
        query(collection(db, 'blocked_users'), where('userId', '==', uid)),
        'blocked_users (user blocked others)'
      );

      // Delete blocked_users entries where this user WAS blocked by someone
      await batchDeleteQuery(
        query(collection(db, 'blocked_users'), where('blockedUserId', '==', uid)),
        'blocked_users (user was blocked)'
      );

      console.log('[Delete] ✓ Reports & blocks cleaned up');
    } catch (e) {
      console.error('[Delete] ✗ Reports/blocks cleanup:', e.message);
    }

    // ── Step 3c: Clean up likes/reactions on other users' hub posts ──
    try {
      const reactionTypes = ['pray', 'strong', 'bless', 'love'];
      let totalReactionsRemoved = 0;

      for (const rType of reactionTypes) {
        try {
          const reactQ = query(
            collection(db, 'hub_posts'),
            where(`reactions.${rType}`, 'array-contains', uid)
          );
          const reactSnap = await getDocs(reactQ);
          for (const postDoc of reactSnap.docs) {
            try {
              const updateData = {
                [`reactions.${rType}`]: arrayRemove(uid),
              };
              // For 'love' reactions, also update legacy likedBy & decrement likes count
              if (rType === 'love') {
                updateData.likedBy = arrayRemove(uid);
                updateData.likes = increment(-1);
              }
              await updateDoc(postDoc.ref, updateData);
              totalReactionsRemoved++;
            } catch (_) {}
          }
        } catch (e) {
          console.log(`[Delete] Could not clean ${rType} reactions:`, e.message);
        }
      }

      // Also clean legacy likedBy for posts that might not have reactions.love
      try {
        const legacyLikeQ = query(
          collection(db, 'hub_posts'),
          where('likedBy', 'array-contains', uid)
        );
        const legacySnap = await getDocs(legacyLikeQ);
        for (const postDoc of legacySnap.docs) {
          try {
            await updateDoc(postDoc.ref, {
              likedBy: arrayRemove(uid),
              likes: increment(-1),
            });
            totalReactionsRemoved++;
          } catch (_) {}
        }
      } catch (_) {}

      console.log(`[Delete] ✓ Removed ${totalReactionsRemoved} reactions from other users' posts`);
    } catch (e) {
      console.error('[Delete] ✗ Reactions cleanup:', e.message);
    }

    // ── Step 3d: Clean up prayer interactions ──
    try {
      // Remove this user from prayingUsers arrays on other users' prayers
      let prayerInteractionsRemoved = 0;
      try {
        const prayingQ = query(
          collection(db, 'prayers'),
          where('prayingUsers', 'array-contains', uid)
        );
        const prayingSnap = await getDocs(prayingQ);
        for (const prayerDoc of prayingSnap.docs) {
          try {
            await updateDoc(prayerDoc.ref, {
              prayingUsers: arrayRemove(uid),
              prayingCount: increment(-1),
            });
            prayerInteractionsRemoved++;
          } catch (_) {}
        }
      } catch (_) {}

      // Clean up prayerPartner references on other users who had this user as partner
      try {
        const partnerQ = query(
          collection(db, 'users'),
          where('prayerPartner.partnerId', '==', uid)
        );
        const partnerSnap = await getDocs(partnerQ);
        for (const userDoc2 of partnerSnap.docs) {
          try {
            await updateDoc(userDoc2.ref, { prayerPartner: null });
          } catch (_) {}
        }
        if (!partnerSnap.empty) {
          console.log(`[Delete] ✓ Cleared prayerPartner from ${partnerSnap.size} users`);
        }
      } catch (_) {}

      console.log(`[Delete] ✓ Removed ${prayerInteractionsRemoved} prayer interactions`);
    } catch (e) {
      console.error('[Delete] ✗ Prayer interactions cleanup:', e.message);
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

        // ── Referral rollback: if this user was referred by someone,
        //    decrement the referrer's count so deleted accounts can't
        //    be exploited to farm referrals ──
        if (userData.referredBy) {
          try {
            const referrerRef = doc(db, 'users', userData.referredBy);
            const referrerSnap = await getDoc(referrerRef);
            if (referrerSnap.exists()) {
              const currentCount = referrerSnap.data().referralCount || 0;
              if (currentCount > 0) {
                await updateDoc(referrerRef, {
                  referralCount: increment(-1),
                });
                console.log('[Delete] ✓ Decremented referral count for referrer:', userData.referredBy);
              }
            }
          } catch (e) {
            console.error('[Delete] ✗ Referral rollback failed:', e.message);
          }
        }
      }
      // Delete main user document
      await deleteDoc(doc(db, 'users', uid));
      console.log('[Delete] Deleted user document');

      // Delete friends document AND remove user from all other users' friend lists
      try {
        // First get this user's friends list so we can clean their docs
        const friendsDocRef = doc(db, 'friends', uid);
        const friendsDocSnap = await getDoc(friendsDocRef);
        if (friendsDocSnap.exists()) {
          const friendsData = friendsDocSnap.data();
          const friendIds = friendsData.friendsList || [];

          // Remove this user from each friend's friendsList
          for (const friendId of friendIds) {
            try {
              await updateDoc(doc(db, 'friends', friendId), {
                friendsList: arrayRemove(uid),
              });
            } catch (_) {}
          }

          // Remove pending/sent requests referencing this user from other users
          const pendingRequests = friendsData.pendingRequests || [];
          for (const req of pendingRequests) {
            if (req.fromUserId) {
              try {
                const senderDoc = await getDoc(doc(db, 'friends', req.fromUserId));
                if (senderDoc.exists()) {
                  const sentReqs = senderDoc.data().sentRequests || [];
                  const matching = sentReqs.find(r => r.toUserId === uid);
                  if (matching) {
                    await updateDoc(doc(db, 'friends', req.fromUserId), {
                      sentRequests: arrayRemove(matching),
                    });
                  }
                }
              } catch (_) {}
            }
          }

          const sentRequests = friendsData.sentRequests || [];
          for (const req of sentRequests) {
            if (req.toUserId) {
              try {
                const recipientDoc = await getDoc(doc(db, 'friends', req.toUserId));
                if (recipientDoc.exists()) {
                  const pendingReqs = recipientDoc.data().pendingRequests || [];
                  const matching = pendingReqs.find(r => r.fromUserId === uid);
                  if (matching) {
                    await updateDoc(doc(db, 'friends', req.toUserId), {
                      pendingRequests: arrayRemove(matching),
                    });
                  }
                }
              } catch (_) {}
            }
          }

          console.log('[Delete] Cleaned up', friendIds.length, 'friend references');
        }

        // Now delete the user's own friends document
        await deleteDoc(friendsDocRef);
      } catch (e) {
        console.log('[Delete] Friends cleanup:', e.message);
      }
      console.log('[Delete] Deleted friends document');

      // Delete verification/reset codes and password reset codes
      try { await deleteDoc(doc(db, 'verificationCodes', uid)); } catch (_) {}
      try { await deleteDoc(doc(db, 'passwordResetCodes', uid)); } catch (_) {}
      // Also try email-keyed reset codes
      if (email) {
        try { await deleteDoc(doc(db, 'passwordResetCodes', email)); } catch (_) {}
      }
      console.log('[Delete] ✓ Cleaned up verification & password reset codes');
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
      // Clear SecureStore credentials for this user
      const SecureStore = await import('expo-secure-store');
      try { await SecureStore.deleteItemAsync(`biblely_cred_${uid}`); } catch (_) {}
      console.log('[Delete] ✓ Cleared SecureStore credentials');

      // Remove from linked accounts list (preserve other accounts)
      try {
        const linkedRaw = await AsyncStorage.getItem('@biblely_linked_accounts');
        if (linkedRaw) {
          const linked = JSON.parse(linkedRaw);
          const filtered = linked.filter(a => a.uid !== uid);
          if (filtered.length > 0) {
            await AsyncStorage.setItem('@biblely_linked_accounts', JSON.stringify(filtered));
          } else {
            await AsyncStorage.removeItem('@biblely_linked_accounts');
          }
          console.log('[Delete] ✓ Removed from linked accounts');
        }
      } catch (_) {}

      // Clear only THIS user's UID-scoped AsyncStorage keys (u:{uid}:*)
      // This preserves other linked accounts' data
      const allKeys = await AsyncStorage.getAllKeys();
      const uidPrefix = `u:${uid}:`;
      const userKeys = allKeys.filter(k => k.startsWith(uidPrefix));

      // Also remove any non-scoped legacy keys that belong to this user
      // (these are keys from before the UID-scoping migration)
      const legacyKeysToRemove = allKeys.filter(k => 
        !k.startsWith('u:') && 
        !k.startsWith('@RNC_AsyncStorage_') &&
        !k.startsWith('@biblely_linked_accounts') &&
        // Only remove legacy keys if this is the ONLY account (no other linked accounts)
        // Otherwise we risk wiping another account's un-migrated data
        true
      );

      // Check if there are other linked accounts — if so, only remove UID-scoped keys
      const linkedRaw2 = await AsyncStorage.getItem('@biblely_linked_accounts');
      const hasOtherAccounts = linkedRaw2 ? JSON.parse(linkedRaw2).length > 0 : false;

      const keysToRemove = hasOtherAccounts
        ? userKeys  // Only remove UID-scoped keys if other accounts exist
        : [...userKeys, ...legacyKeysToRemove];  // Remove everything if this is the only account

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`[Delete] ✓ Removed ${keysToRemove.length} local storage keys (preserved ${hasOtherAccounts ? 'other accounts data' : 'nothing — sole account'})`);
      }

      // Delete persisted profile pictures from local file system
      try {
        const FileSystem = await import('expo-file-system');
        const docDir = FileSystem.documentDirectory;
        if (docDir) {
          const files = await FileSystem.readDirectoryAsync(docDir);
          const profilePics = files.filter(f => f.startsWith('profile_'));
          for (const pic of profilePics) {
            await FileSystem.deleteAsync(`${docDir}${pic}`, { idempotent: true });
          }
          if (profilePics.length > 0) {
            console.log(`[Delete] ✓ Deleted ${profilePics.length} local profile pictures`);
          }
        }
      } catch (e) {
        console.log('[Delete] Local profile pictures cleanup:', e.message);
      }
    } catch (e) {
      console.error('[Delete] ✗ Local data cleanup:', e.message);
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
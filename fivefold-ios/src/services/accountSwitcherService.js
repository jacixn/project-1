/**
 * Account Switcher Service
 *
 * Manages multiple linked accounts on a single device.
 * Account list is stored in AsyncStorage (app-level, not UID-scoped).
 * Passwords are stored securely in the device Keychain via expo-secure-store.
 *
 * Each account's actual data (prayers, theme, etc.) is already
 * UID-scoped via userStorage, so no data leaks on switch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ── Keys ────────────────────────────────────────────────────────────────────
const ACCOUNTS_KEY = '@biblely_linked_accounts'; // [{uid, email, username, displayName, profilePicture}]
const credKey = (uid) => `biblely_cred_${uid}`;

// ── Account list helpers ────────────────────────────────────────────────────

/**
 * Get all linked accounts stored on this device.
 * @returns {Promise<Array>} Array of account objects
 */
export const getLinkedAccounts = async () => {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[AccountSwitcher] getLinkedAccounts:', err);
    return [];
  }
};

/**
 * Save/update an account in the linked accounts list.
 * If the account already exists (by uid), it updates the profile data.
 * @param {{ uid: string, email: string, username?: string, displayName?: string, profilePicture?: string }} account
 * @param {string} password - The user's password (stored securely in Keychain)
 */
export const saveLinkedAccount = async (account, password) => {
  try {
    const accounts = await getLinkedAccounts();
    const idx = accounts.findIndex((a) => a.uid === account.uid);

    const entry = {
      uid: account.uid,
      email: account.email,
      username: account.username || '',
      displayName: account.displayName || '',
      profilePicture: account.profilePicture || null,
      lastSwitchedAt: Date.now(),
    };

    if (idx >= 0) {
      accounts[idx] = { ...accounts[idx], ...entry };
    } else {
      accounts.push(entry);
    }

    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

    // Store password securely in Keychain
    if (password) {
      await SecureStore.setItemAsync(credKey(account.uid), password);
    }

    console.log('[AccountSwitcher] Saved account:', account.username || account.email);
  } catch (err) {
    console.error('[AccountSwitcher] saveLinkedAccount:', err);
    throw err;
  }
};

/**
 * Update just the profile info for an existing linked account (no password change).
 * @param {string} uid
 * @param {Object} updates - Fields to update (username, displayName, profilePicture, etc.)
 */
export const updateLinkedAccountProfile = async (uid, updates) => {
  try {
    const accounts = await getLinkedAccounts();
    const idx = accounts.findIndex((a) => a.uid === uid);
    if (idx >= 0) {
      accounts[idx] = { ...accounts[idx], ...updates };
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  } catch (err) {
    console.error('[AccountSwitcher] updateLinkedAccountProfile:', err);
  }
};

/**
 * Remove a linked account from this device.
 * Deletes the stored password from Keychain.
 * Does NOT delete the user's UID-scoped data from AsyncStorage.
 * @param {string} uid
 */
export const removeLinkedAccount = async (uid) => {
  try {
    const accounts = await getLinkedAccounts();
    const filtered = accounts.filter((a) => a.uid !== uid);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));

    // Delete password from Keychain
    try {
      await SecureStore.deleteItemAsync(credKey(uid));
    } catch (_) {
      // Ignore — may not exist
    }

    console.log('[AccountSwitcher] Removed account:', uid);
  } catch (err) {
    console.error('[AccountSwitcher] removeLinkedAccount:', err);
  }
};

/**
 * Retrieve the stored password for an account (from Keychain).
 * @param {string} uid
 * @returns {Promise<string|null>}
 */
export const getStoredPassword = async (uid) => {
  try {
    return await SecureStore.getItemAsync(credKey(uid));
  } catch (err) {
    console.error('[AccountSwitcher] getStoredPassword:', err);
    return null;
  }
};

/**
 * Check if an account has stored credentials.
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export const hasStoredCredentials = async (uid) => {
  const pw = await getStoredPassword(uid);
  return pw !== null;
};

/**
 * Firebase Configuration
 * 
 * This file initializes Firebase for use throughout the app.
 * Uses Firebase JS SDK which works with Expo out of the box.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth, 
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
// These values come from the GoogleService-Info.plist
const firebaseConfig = {
  apiKey: 'AIzaSyC0SLWBFa_gLP7GoDX1MuaLpnsWt8Rr0yo',
  authDomain: 'biblely-499cc.firebaseapp.com',
  projectId: 'biblely-499cc',
  storageBucket: 'biblely-499cc.firebasestorage.app',
  messagingSenderId: '786807782315',
  appId: '1:786807782315:ios:42b8c6e79e153b210570ee',
};

// Initialize Firebase (only if it hasn't been initialized already)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with AsyncStorage persistence for React Native
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth already initialized, get existing instance
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Cloud Functions
const functions = getFunctions(app);

export { app, auth, db, storage, functions };

// Read token schedule from Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyD7vfMpAT1J-8-xqXfGDjWJDmJ_4Z9pB4A',
  authDomain: 'biblely-499cc.firebaseapp.com',
  projectId: 'biblely-499cc',
  storageBucket: 'biblely-499cc.firebasestorage.app',
  messagingSenderId: '786807782315',
  appId: '1:786807782315:ios:cf9a3e3c5a8d4e6f3b2a1c',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function readToken(userId) {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log('No user document found.');
    return;
  }
  const data = snap.data();
  console.log('tokenSchedule:', data.tokenSchedule || null);
}

const userId = process.argv[2] || 'RhcYm5toAYelN6d7mnIBpIc2meg2';
readToken(userId).then(() => process.exit(0));

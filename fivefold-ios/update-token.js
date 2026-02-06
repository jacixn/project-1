// Quick script to update token schedule in Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, setDoc, getDoc } = require('firebase/firestore');

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

async function updateTokenSchedule(userId, arrivalTime24h) {
  // Parse time like "15:24" to minutes
  const [hours, minutes] = arrivalTime24h.split(':').map(Number);
  const arrivalMinutes = hours * 60 + minutes;
  
  // Format readable time
  const hour12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const arrivalTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  
  const today = new Date().toISOString().split('T')[0];
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  
  const tokenSchedule = {
    arrivalMinutes,
    arrivalTime,
    tokenDelivered: false,
    date: today,
    timezoneOffsetMinutes,
    useServerNotifications: true,
    updatedAt: new Date().toISOString(),
  };
  
  console.log('Updating token for user:', userId);
  console.log('Token will arrive at:', arrivalTime, `(${arrivalMinutes} minutes)`);
  
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { tokenSchedule }, { merge: true });
    console.log('✅ Token schedule updated successfully!');
    console.log('Now pull-to-refresh on Hub to sync the new time.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

// Get args: node update-token.js USER_ID TIME
const userId = process.argv[2] || 'RhcYm5toAYelN6d7mnIBpIc2meg2';
const time = process.argv[3] || '15:24';

updateTokenSchedule(userId, time);

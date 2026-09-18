// Admin User Analytics: one read of the users collection, folded into the
// numbers the AdminAnalytics screen shows. Throws on failure so the screen
// can render its error state.

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentSeason, getDaysRemaining } from './seasonService';
import { normalizeUser, computeAnalytics } from '../utils/adminAnalytics';

export const fetchAdminAnalytics = async () => {
  const season = getCurrentSeason();
  const snapshot = await getDocs(collection(db, 'users'));
  const users = [];
  snapshot.forEach((docSnap) => {
    users.push(normalizeUser(docSnap.id, docSnap.data({ serverTimestamps: 'estimate' }), season.key));
  });
  const now = Date.now();
  const analytics = computeAnalytics(users, { now });
  return {
    ...analytics,
    season,
    daysLeft: getDaysRemaining(),
    fetchedAt: now,
  };
};

export default { fetchAdminAnalytics };

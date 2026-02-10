import userStorage from './userStorage';

class AppStreakManager {
  static APP_STREAK_KEY = 'app_open_streak';
  static APP_OPEN_DATES_KEY = 'app_open_dates';

  // Initialize streak tracking when app opens
  static async trackAppOpen() {
    try {
      const streakData = await this.getStreakData();
      const today = new Date().toDateString();
      const lastOpen = streakData.lastOpenDate;

      // Check if we already tracked today
      if (lastOpen === today) {
        // Ensure openDates includes today even for existing data
        if (!streakData.openDates) {
          streakData.openDates = [today];
          await userStorage.setRaw(this.APP_STREAK_KEY, JSON.stringify(streakData));
        }
        console.log(`📱 Already tracked app open today. Current streak: ${streakData.currentStreak} days`);
        return streakData;
      }

      // Calculate new streak
      let newStreak = 0;
      if (!lastOpen) {
        // First time opening app
        newStreak = 0; // User spec: first day is 0
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastOpen === yesterdayStr) {
          // Consecutive day - increase streak
          newStreak = (streakData.currentStreak || 0) + 1;
        } else {
          // Missed a day - reset to 0
          newStreak = 0;
          console.log('📱 Streak reset! Missed a day.');
        }
      }

      // Check for milestones
      const milestone = this.checkMilestone(newStreak, streakData.currentStreak || 0);

      // Track open dates for the weekly calendar (keep last 30 days)
      const openDates = streakData.openDates || [];
      if (!openDates.includes(today)) {
        openDates.push(today);
      }
      // Keep only last 30 entries
      const trimmedDates = openDates.slice(-30);

      const updatedStreak = {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streakData.longestStreak || 0),
        lastOpenDate: today,
        totalOpens: (streakData.totalOpens || 0) + 1,
        lastMilestone: milestone ? newStreak : streakData.lastMilestone,
        milestoneReached: milestone,
        openDates: trimmedDates,
      };

      await userStorage.setRaw(this.APP_STREAK_KEY, JSON.stringify(updatedStreak));
      
      console.log(`📱 App open tracked! Streak: ${newStreak} days ${milestone ? `🎉 MILESTONE!` : ''}`);
      
      // Always sync streak to Firebase so it shows on leaderboards
      this.syncStreakToFirebase(newStreak).catch(err => {
        console.log('Could not sync streak to Firebase:', err);
      });
      
      // Notify friends of milestone achievement
      if (milestone && newStreak >= 7) {
        this.celebrateStreakMilestone(newStreak).catch(err => {
          console.log('Could not send streak celebration:', err);
        });
      }
      
      return updatedStreak;
    } catch (error) {
      console.error('Error tracking app open:', error);
      return this.getDefaultStreakData();
    }
  }

  // Check if current streak is a milestone
  static checkMilestone(newStreak, oldStreak) {
    if (newStreak === oldStreak) return false;

    // Milestones: 3, 5, then every 2 after that (7, 9, 11, 13...)
    if (newStreak === 3 || newStreak === 5) {
      return true;
    }
    
    if (newStreak > 5 && newStreak % 2 === 1) {
      // Every odd number after 5
      return true;
    }

    return false;
  }

  // Get streak data
  static async getStreakData() {
    try {
      const data = await userStorage.getRaw(this.APP_STREAK_KEY);
      return data ? JSON.parse(data) : this.getDefaultStreakData();
    } catch (error) {
      console.error('Error getting streak data:', error);
      return this.getDefaultStreakData();
    }
  }

  // Get default streak data
  static getDefaultStreakData() {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastOpenDate: null,
      totalOpens: 0,
      lastMilestone: 0,
      milestoneReached: false
    };
  }

  // Clear milestone flag after showing animation
  static async clearMilestoneFlag() {
    try {
      const streakData = await this.getStreakData();
      streakData.milestoneReached = false;
      await userStorage.setRaw(this.APP_STREAK_KEY, JSON.stringify(streakData));
    } catch (error) {
      console.error('Error clearing milestone flag:', error);
    }
  }

  // Get streak animation based on milestone
  static getStreakAnimation(streak) {
    if (streak === 3) return 'fire_small';
    if (streak === 5) return 'fire_medium';
    if (streak >= 7) return 'fire_large';
    return 'none';
  }

  // Get streak emoji
  static getStreakEmoji(streak) {
    if (streak === 0) return '🔥';
    if (streak < 3) return '🔥';
    if (streak < 5) return '🔥🔥';
    if (streak < 10) return '🔥🔥🔥';
    if (streak < 20) return '🔥🔥🔥🔥';
    return '🔥🔥🔥🔥🔥';
  }

  // Reset streak (for testing or user request)
  static async resetStreak() {
    try {
      await userStorage.setRaw(this.APP_STREAK_KEY, JSON.stringify(this.getDefaultStreakData()));
      console.log('📱 Streak reset to 0');
    } catch (error) {
      console.error('Error resetting streak:', error);
    }
  }

  // Sync current streak to Firebase (for leaderboards)
  static async syncStreakToFirebase(days) {
    try {
      const { auth } = await import('../config/firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        return;
      }

      const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        currentStreak: days,
        lastStreakUpdate: serverTimestamp(),
      });
      
      console.log(`📱 Streak synced to Firebase: ${days} days`);
    } catch (error) {
      // Silently fail - not critical
      console.log('Could not sync streak to Firebase:', error.message);
    }
  }

  // Celebrate streak milestone by notifying friends
  static async celebrateStreakMilestone(days) {
    try {
      // Get current user from auth
      const { auth } = await import('../config/firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('No user logged in, skipping streak celebration');
        return;
      }

      // Get user profile for display name
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const displayName = userDoc.exists() ? (userDoc.data().displayName || 'A friend') : 'A friend';

      // Notify friends
      const { notifyStreakMilestone } = await import('../services/socialNotificationService');
      const sentCount = await notifyStreakMilestone(currentUser.uid, displayName, days);
      
      console.log(`🎉 Streak celebration sent to ${sentCount} friends!`);

      // Record milestone in user profile
      const { updateDoc, arrayUnion } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', currentUser.uid), {
        streakMilestones: arrayUnion(days),
      });
    } catch (error) {
      console.error('Error celebrating streak milestone:', error);
    }
  }
}

export default AppStreakManager;





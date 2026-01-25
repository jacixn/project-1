import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

class AchievementService {
  static ACHIEVEMENTS_KEY = 'fivefold_achievements_unlocked';

  static getLevelFromPoints(points) {
    // Levels 1-9 keep the exponential curve; level 9 starts at 255k total.
    // After level 9, each new level requires a flat +128k points.
    const thresholds = [
      0,      // Level 1
      1000,   // Level 2
      3000,   // Level 3
      7000,   // Level 4
      15000,  // Level 5
      31000,  // Level 6
      63000,  // Level 7
      127000, // Level 8
      255000, // Level 9
    ];

    if (points <= thresholds[1]) return 1;

    // Within the first 9 levels, find the highest threshold not exceeding points
    if (points < thresholds[thresholds.length - 1]) {
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (points >= thresholds[i]) {
          return i + 1;
        }
      }
      return 1;
    }

    // After level 9: flat 128k per additional level
    const extraPoints = points - thresholds[thresholds.length - 1];
    const extraLevels = Math.floor(extraPoints / 128000);
    return thresholds.length + extraLevels;
  }

  static async checkAchievements(newStats) {
    try {
      const unlocked = await this.getUnlockedAchievements();
      const newlyUnlocked = [];
      
      // Streak Rewards Logic
      const streak = newStats.streak || 0;
      const streakRewardKey = `streak_reward_${streak}`;
      if (streak >= 3 && !unlocked.includes(streakRewardKey)) {
        let streakPoints = 0;
        let streakTitle = '';
        
        if (streak === 3) {
          streakPoints = 5000;
          streakTitle = '3-Day Streak!';
        } else if (streak === 5) {
          streakPoints = 10000;
          streakTitle = '5-Day Streak!';
        } else if (streak === 10) {
          streakPoints = 20000;
          streakTitle = '10-Day Streak!';
        } else if (streak === 15) {
          streakPoints = 50000;
          streakTitle = '15-Day Streak!';
        } else if (streak > 15 && streak % 5 === 0) {
          // Every 5 days after 15: 100k, 250k, 500k, 1M, etc. (scaling)
          const multiplier = (streak - 15) / 5;
          streakPoints = 50000 * Math.pow(2, multiplier);
          streakTitle = `${streak}-Day Mega Streak!`;
        }

        if (streakPoints > 0) {
          newlyUnlocked.push({ id: streakRewardKey, title: streakTitle, points: streakPoints });
          unlocked.push(streakRewardKey);
        }
      }

      const milestones = [
        // Tasks
        { id: 'tasks_1', target: 1, type: 'completedTasks', title: 'First Win', points: 10000 },
        { id: 'tasks_5', target: 5, type: 'completedTasks', title: 'Task Apprentice', points: 25000 },
        { id: 'tasks_10', target: 10, type: 'completedTasks', title: 'Task Journeyman', points: 50000 },
        { id: 'tasks_25', target: 25, type: 'completedTasks', title: 'Task Master', points: 100000 },
        { id: 'tasks_50', target: 50, type: 'completedTasks', title: 'Task Expert', points: 250000 },
        { id: 'tasks_100', target: 100, type: 'completedTasks', title: 'Task Centurion', points: 500000 },
        { id: 'tasks_1000', target: 1000, type: 'completedTasks', title: 'Task Titan', points: 2500000 },
        
        // Prayers
        { id: 'prayers_1', target: 1, type: 'prayersCompleted', title: 'First Prayer', points: 10000 },
        { id: 'prayers_5', target: 5, type: 'prayersCompleted', title: 'Prayer Apprentice', points: 25000 },
        { id: 'prayers_10', target: 10, type: 'prayersCompleted', title: 'Prayer Journeyman', points: 50000 },
        { id: 'prayers_25', target: 25, type: 'prayersCompleted', title: 'Prayer Master', points: 100000 },
        { id: 'prayers_50', target: 50, type: 'prayersCompleted', title: 'Prayer Expert', points: 250000 },
        { id: 'prayers_100', target: 100, type: 'prayersCompleted', title: 'Prayer Centurion', points: 500000 },
        { id: 'prayers_1000', target: 1000, type: 'prayersCompleted', title: 'Prayer Veteran', points: 2500000 },
        
        // Verses Read
        { id: 'verses_1', target: 1, type: 'versesRead', title: 'First Verse', points: 10000 },
        { id: 'verses_50', target: 50, type: 'versesRead', title: 'Scripture Seeker', points: 50000 },
        { id: 'verses_100', target: 100, type: 'versesRead', title: 'Bible Student', points: 100000 },
        { id: 'verses_500', target: 500, type: 'versesRead', title: 'Bible Scholar', points: 500000 },
        { id: 'verses_1000', target: 1000, type: 'versesRead', title: 'Word Warrior', points: 1000000 },
        { id: 'verses_10000', target: 10000, type: 'versesRead', title: 'Scripture Sage', points: 5000000 },
        
      ];

      for (const m of milestones) {
        if (!unlocked.includes(m.id) && (newStats[m.type] || 0) >= m.target) {
          newlyUnlocked.push(m);
          unlocked.push(m.id);
        }
      }

      if (newlyUnlocked.length > 0) {
        await AsyncStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
        
        // Award points
        let totalPointsToAward = newlyUnlocked.reduce((sum, m) => sum + m.points, 0);
        
        const currentStats = await getStoredData('userStats') || { points: 0, level: 1 };
        const updatedStats = {
          ...currentStats,
          ...newStats,
          points: (currentStats.points || 0) + totalPointsToAward
        };
        
        // Level up logic (exponential)
        updatedStats.level = this.getLevelFromPoints(updatedStats.points);
        
        await saveData('userStats', updatedStats);
        
        // Also update the central points storage (for consistency)
        const centralPointsStr = await AsyncStorage.getItem('total_points');
        const centralPoints = centralPointsStr ? parseInt(centralPointsStr, 10) : 0;
        const newCentralTotal = centralPoints + totalPointsToAward;
        await AsyncStorage.setItem('total_points', newCentralTotal.toString());
        
        // Sync to Firebase if user is logged in
        const currentUser = auth.currentUser;
        if (currentUser) {
          setDoc(doc(db, 'users', currentUser.uid), {
            totalPoints: newCentralTotal,
            level: updatedStats.level,
            lastActive: serverTimestamp(),
          }, { merge: true }).catch(err => {
            console.warn('🔥 Firebase achievement points sync failed:', err.message);
          });
          console.log(`🔥 Achievement points synced to Firebase: ${newCentralTotal}`);
        }
        
        // Trigger notifications
        newlyUnlocked.forEach(achievement => {
          DeviceEventEmitter.emit('achievementUnlocked', {
            title: achievement.title,
            points: achievement.points
          });
        });
        
        return updatedStats;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return null;
    }
  }

  static async getUnlockedAchievements() {
    try {
      const data = await AsyncStorage.getItem(this.ACHIEVEMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }
}

export default AchievementService;


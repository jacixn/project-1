import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

class AchievementService {
  static ACHIEVEMENTS_KEY = 'fivefold_achievements_unlocked';

  /**
   * Convert total points to level.
   * 
   * Scale:
   *   Level 100  =  1,000,000 pts
   *   Level 200  =  2,000,000 pts
   *   Level 500  =  5,000,000 pts
   *   Level 1000 = 10,000,000 pts
   *   Level 10000 = 100,000,000 pts
   *
   * → 10,000 points per level, minimum level 1.
   */
  static getLevelFromPoints(points) {
    if (!points || points <= 0) return 1;
    const level = Math.floor(points / 10000) + 1;
    return level;
  }

  /**
   * Get the total points required to reach a given level.
   */
  static getPointsForLevel(level) {
    if (level <= 1) return 0;
    return (level - 1) * 10000;
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
          streakPoints = 25000;
          streakTitle = '3-Day Streak!';
        } else if (streak === 5) {
          streakPoints = 50000;
          streakTitle = '5-Day Streak!';
        } else if (streak === 7) {
          streakPoints = 100000;
          streakTitle = '7-Day Streak!';
        } else if (streak === 10) {
          streakPoints = 150000;
          streakTitle = '10-Day Streak!';
        } else if (streak === 14) {
          streakPoints = 250000;
          streakTitle = '2-Week Streak!';
        } else if (streak === 21) {
          streakPoints = 500000;
          streakTitle = '3-Week Streak!';
        } else if (streak === 30) {
          streakPoints = 1000000;
          streakTitle = '30-Day Streak!';
        } else if (streak > 30 && streak % 7 === 0) {
          // Every 7 days after 30: scaling bonuses
          const multiplier = (streak - 30) / 7;
          streakPoints = 500000 * Math.pow(2, Math.min(multiplier, 8));
          streakTitle = `${streak}-Day Mega Streak!`;
        }

        if (streakPoints > 0) {
          newlyUnlocked.push({ id: streakRewardKey, title: streakTitle, points: streakPoints });
          unlocked.push(streakRewardKey);
        }
      }

      const milestones = [
        // Tasks
        { id: 'tasks_1', target: 1, type: 'completedTasks', title: 'First Win', points: 50000 },
        { id: 'tasks_5', target: 5, type: 'completedTasks', title: 'Task Apprentice', points: 125000 },
        { id: 'tasks_10', target: 10, type: 'completedTasks', title: 'Task Journeyman', points: 250000 },
        { id: 'tasks_25', target: 25, type: 'completedTasks', title: 'Task Master', points: 500000 },
        { id: 'tasks_50', target: 50, type: 'completedTasks', title: 'Task Expert', points: 1250000 },
        { id: 'tasks_100', target: 100, type: 'completedTasks', title: 'Task Centurion', points: 2500000 },
        { id: 'tasks_1000', target: 1000, type: 'completedTasks', title: 'Task Titan', points: 12500000 },
        
        // Prayers
        { id: 'prayers_1', target: 1, type: 'prayersCompleted', title: 'First Prayer', points: 50000 },
        { id: 'prayers_5', target: 5, type: 'prayersCompleted', title: 'Prayer Apprentice', points: 125000 },
        { id: 'prayers_10', target: 10, type: 'prayersCompleted', title: 'Prayer Journeyman', points: 250000 },
        { id: 'prayers_25', target: 25, type: 'prayersCompleted', title: 'Prayer Master', points: 500000 },
        { id: 'prayers_50', target: 50, type: 'prayersCompleted', title: 'Prayer Expert', points: 1250000 },
        { id: 'prayers_100', target: 100, type: 'prayersCompleted', title: 'Prayer Centurion', points: 2500000 },
        { id: 'prayers_1000', target: 1000, type: 'prayersCompleted', title: 'Prayer Veteran', points: 12500000 },
        
        // Verses Read
        { id: 'verses_1', target: 1, type: 'versesRead', title: 'First Verse', points: 50000 },
        { id: 'verses_50', target: 50, type: 'versesRead', title: 'Scripture Seeker', points: 250000 },
        { id: 'verses_100', target: 100, type: 'versesRead', title: 'Bible Student', points: 500000 },
        { id: 'verses_500', target: 500, type: 'versesRead', title: 'Bible Scholar', points: 2500000 },
        { id: 'verses_1000', target: 1000, type: 'versesRead', title: 'Word Warrior', points: 5000000 },
        { id: 'verses_10000', target: 10000, type: 'versesRead', title: 'Scripture Sage', points: 25000000 },
        
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


import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';

class AchievementService {
  static ACHIEVEMENTS_KEY = 'fivefold_achievements_unlocked';

  static async checkAchievements(newStats) {
    try {
      const unlocked = await this.getUnlockedAchievements();
      const newlyUnlocked = [];
      
      const milestones = [
        // Tasks
        { id: 'tasks_1', target: 1, type: 'completedTasks', title: 'First Win', points: 500000 },
        { id: 'tasks_100', target: 100, type: 'completedTasks', title: 'Task Centurion', points: 2500000 },
        { id: 'tasks_1000', target: 1000, type: 'completedTasks', title: 'Task Titan', points: 10000000 },
        
        // Prayers
        { id: 'prayers_1', target: 1, type: 'prayersCompleted', title: 'First Prayer', points: 500000 },
        { id: 'prayers_100', target: 100, type: 'prayersCompleted', title: 'Prayer Centurion', points: 2500000 },
        { id: 'prayers_1000', target: 1000, type: 'prayersCompleted', title: 'Prayer Veteran', points: 10000000 },
        
        // Verses Read
        { id: 'verses_1', target: 1, type: 'versesRead', title: 'First Verse', points: 500000 },
        { id: 'verses_1000', target: 1000, type: 'versesRead', title: 'Bible Student', points: 2500000 },
        { id: 'verses_10000', target: 10000, type: 'versesRead', title: 'Scripture Sage', points: 10000000 },
        
        // Points
        { id: 'points_100000', target: 100000, type: 'points', title: 'Point Builder', points: 1000000 },
        { id: 'points_1000000', target: 1000000, type: 'points', title: 'Point Master', points: 5000000 },
        { id: 'points_10000000', target: 10000000, type: 'points', title: 'Point Legend', points: 25000000 },
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
        
        // Level up logic (1 million per level)
        updatedStats.level = Math.floor(updatedStats.points / 1000000) + 1;
        
        await saveData('userStats', updatedStats);
        
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


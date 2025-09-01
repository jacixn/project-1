import AsyncStorage from '@react-native-async-storage/async-storage';

class PrayerCompletionManager {
  static COMPLETION_KEY = 'prayer_completions';
  static POINTS_KEY = 'total_points';

  // Check if prayer can be completed (24hr cooldown)
  static async canCompletePrayer(prayerId) {
    try {
      const completions = await this.getCompletions();
      const lastCompletion = completions[prayerId];
      
      if (!lastCompletion) {
        return true; // Never completed before
      }
      
      const now = new Date();
      const lastCompletedTime = new Date(lastCompletion.completedAt);
      const hoursSinceCompletion = (now - lastCompletedTime) / (1000 * 60 * 60);
      
      console.log(`🕐 Prayer ${prayerId}: Hours since last completion: ${hoursSinceCompletion.toFixed(1)}`);
      
      return hoursSinceCompletion >= 24;
    } catch (error) {
      console.error('Error checking prayer completion:', error);
      return true; // Allow completion if error
    }
  }

  // Complete a prayer and award points
  static async completePrayer(prayerId, prayerName, points = 1000) {
    try {
      // Check if can complete
      const canComplete = await this.canCompletePrayer(prayerId);
      if (!canComplete) {
        throw new Error('Prayer already completed in the last 24 hours');
      }

      const now = new Date();
      const completionData = {
        prayerId,
        prayerName,
        completedAt: now.toISOString(),
        points
      };

      // Store completion
      const completions = await this.getCompletions();
      completions[prayerId] = completionData;
      await AsyncStorage.setItem(this.COMPLETION_KEY, JSON.stringify(completions));

      // Add points to total
      await this.addPoints(points);

      console.log(`✅ Prayer ${prayerId} completed! +${points} points`);
      return completionData;
    } catch (error) {
      console.error('Error completing prayer:', error);
      throw error;
    }
  }

  // Get all prayer completions
  static async getCompletions() {
    try {
      const data = await AsyncStorage.getItem(this.COMPLETION_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting completions:', error);
      return {};
    }
  }

  // Add points to total
  static async addPoints(points) {
    try {
      const currentPoints = await this.getTotalPoints();
      const newTotal = currentPoints + points;
      await AsyncStorage.setItem(this.POINTS_KEY, newTotal.toString());
      console.log(`💰 Points updated: ${currentPoints} + ${points} = ${newTotal}`);
      return newTotal;
    } catch (error) {
      console.error('Error adding points:', error);
      throw error;
    }
  }

  // Get total points
  static async getTotalPoints() {
    try {
      const points = await AsyncStorage.getItem(this.POINTS_KEY);
      return points ? parseInt(points, 10) : 0;
    } catch (error) {
      console.error('Error getting total points:', error);
      return 0;
    }
  }

  // Get time until prayer can be completed again
  static async getTimeUntilNextCompletion(prayerId) {
    try {
      const completions = await this.getCompletions();
      const lastCompletion = completions[prayerId];
      
      if (!lastCompletion) {
        return 0; // Can complete now
      }
      
      const now = new Date();
      const lastCompletedTime = new Date(lastCompletion.completedAt);
      const hoursSinceCompletion = (now - lastCompletedTime) / (1000 * 60 * 60);
      
      if (hoursSinceCompletion >= 24) {
        return 0; // Can complete now
      }
      
      return 24 - hoursSinceCompletion; // Hours remaining
    } catch (error) {
      console.error('Error getting time until next completion:', error);
      return 0;
    }
  }

  // Get completion status for a prayer
  static async getCompletionStatus(prayerId) {
    try {
      const completions = await this.getCompletions();
      const lastCompletion = completions[prayerId];
      const canComplete = await this.canCompletePrayer(prayerId);
      const hoursUntilNext = await this.getTimeUntilNextCompletion(prayerId);
      
      return {
        canComplete,
        lastCompletion,
        hoursUntilNext: canComplete ? 0 : hoursUntilNext
      };
    } catch (error) {
      console.error('Error getting completion status:', error);
      return {
        canComplete: true,
        lastCompletion: null,
        hoursUntilNext: 0
      };
    }
  }

  // Reset all completions (for testing)
  static async resetCompletions() {
    try {
      await AsyncStorage.removeItem(this.COMPLETION_KEY);
      console.log('🔄 All prayer completions reset');
    } catch (error) {
      console.error('Error resetting completions:', error);
    }
  }

  // Reset points (for testing)
  static async resetPoints() {
    try {
      await AsyncStorage.removeItem(this.POINTS_KEY);
      console.log('🔄 Points reset to 0');
    } catch (error) {
      console.error('Error resetting points:', error);
    }
  }
}

export default PrayerCompletionManager;


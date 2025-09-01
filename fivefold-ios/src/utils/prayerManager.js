import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticFeedback } from './haptics';

// Prayer management system - handles dynamic prayer creation/deletion
export class PrayerManager {
  static STORAGE_KEY = 'userPrayers';
  
  // Get all user prayers
  static async getUserPrayers() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Return empty array for new users (0 prayers by default)
      return [];
    } catch (error) {
      console.error('Error loading user prayers:', error);
      return [];
    }
  }
  
  // Save user prayers
  static async saveUserPrayers(prayers) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(prayers));
      return true;
    } catch (error) {
      console.error('Error saving user prayers:', error);
      return false;
    }
  }
  
  // Add a new prayer
  static async addPrayer(name, time) {
    try {
      const prayers = await this.getUserPrayers();
      
      // Generate unique ID
      const id = Date.now().toString();
      
      const newPrayer = {
        id,
        name: name.trim(),
        time: time.trim(),
        createdAt: new Date().toISOString(),
        isCustom: true
      };
      
      prayers.push(newPrayer);
      
      // Sort prayers by time
      prayers.sort((a, b) => {
        const timeA = this.timeToMinutes(a.time);
        const timeB = this.timeToMinutes(b.time);
        return timeA - timeB;
      });
      
      const success = await this.saveUserPrayers(prayers);
      if (success) {
        hapticFeedback.success();
      }
      
      return { success, prayers };
    } catch (error) {
      console.error('Error adding prayer:', error);
      return { success: false, prayers: [] };
    }
  }
  
  // Remove a prayer
  static async removePrayer(prayerId) {
    try {
      const prayers = await this.getUserPrayers();
      const filteredPrayers = prayers.filter(prayer => prayer.id !== prayerId);
      
      const success = await this.saveUserPrayers(filteredPrayers);
      if (success) {
        hapticFeedback.success();
      }
      
      return { success, prayers: filteredPrayers };
    } catch (error) {
      console.error('Error removing prayer:', error);
      return { success: false, prayers: [] };
    }
  }
  
  // Update a prayer
  static async updatePrayer(prayerId, updates) {
    try {
      const prayers = await this.getUserPrayers();
      const prayerIndex = prayers.findIndex(prayer => prayer.id === prayerId);
      
      if (prayerIndex === -1) {
        return { success: false, prayers };
      }
      
      prayers[prayerIndex] = {
        ...prayers[prayerIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Re-sort prayers by time if time was updated
      if (updates.time) {
        prayers.sort((a, b) => {
          const timeA = this.timeToMinutes(a.time);
          const timeB = this.timeToMinutes(b.time);
          return timeA - timeB;
        });
      }
      
      const success = await this.saveUserPrayers(prayers);
      if (success) {
        hapticFeedback.success();
      }
      
      return { success, prayers };
    } catch (error) {
      console.error('Error updating prayer:', error);
      return { success: false, prayers: [] };
    }
  }
  
  // Convert time string (HH:MM) to minutes for sorting
  static timeToMinutes(timeString) {
    if (!timeString || !timeString.includes(':')) return 0;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  // Format time for display
  static formatTime(time) {
    if (!time) return '--:--';
    
    // If it's already in HH:MM format, return it
    if (time.includes(':') && time.match(/^\d{1,2}:\d{2}$/)) {
      return time;
    }
    
    return '--:--';
  }
  
  // Check if user has any prayers
  static async hasAnyPrayers() {
    const prayers = await this.getUserPrayers();
    return prayers.length > 0;
  }
  
  // Get next prayer time
  static getNextPrayer(prayers) {
    if (!prayers || prayers.length === 0) return null;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Find next prayer today
    for (const prayer of prayers) {
      const prayerMinutes = this.timeToMinutes(prayer.time);
      if (prayerMinutes > currentMinutes) {
        return prayer;
      }
    }
    
    // If no prayer left today, return first prayer of tomorrow
    return prayers[0];
  }
  
  // Migrate old prayer system to new system (for existing users)
  static async migrateOldPrayers() {
    try {
      // Check if user already has new prayer system
      const existingPrayers = await this.getUserPrayers();
      if (existingPrayers.length > 0) {
        return { success: true, prayers: existingPrayers };
      }
      
      // Check for old prayer data
      const oldCustomNames = await AsyncStorage.getItem('customPrayerNames');
      const oldCustomTimes = await AsyncStorage.getItem('customPrayerTimes');
      
      if (oldCustomNames || oldCustomTimes) {
        const customNames = oldCustomNames ? JSON.parse(oldCustomNames) : {};
        const customTimes = oldCustomTimes ? JSON.parse(oldCustomTimes) : {};
        
        // Default old prayer structure
        const oldPrayers = [
          { slot: 'pre_dawn', defaultName: 'Before Sunrise', defaultTime: '05:30' },
          { slot: 'post_sunrise', defaultName: 'After Sunrise', defaultTime: '06:30' },
          { slot: 'midday', defaultName: 'Midday', defaultTime: '12:00' },
          { slot: 'pre_sunset', defaultName: 'Before Sunset', defaultTime: '17:30' },
          { slot: 'night', defaultName: 'After Sunset', defaultTime: '18:30' }
        ];
        
        const migratedPrayers = oldPrayers.map((prayer, index) => ({
          id: `migrated_${index}`,
          name: customNames[prayer.slot] || prayer.defaultName,
          time: customTimes[prayer.slot] || prayer.defaultTime,
          createdAt: new Date().toISOString(),
          isCustom: true,
          isMigrated: true
        }));
        
        const success = await this.saveUserPrayers(migratedPrayers);
        
        // Clean up old data
        if (success) {
          await AsyncStorage.removeItem('customPrayerNames');
          await AsyncStorage.removeItem('customPrayerTimes');
        }
        
        return { success, prayers: migratedPrayers };
      }
      
      // No old data, return empty (new user)
      return { success: true, prayers: [] };
    } catch (error) {
      console.error('Error migrating old prayers:', error);
      return { success: false, prayers: [] };
    }
  }
}

export default PrayerManager;


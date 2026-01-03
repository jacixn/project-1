/**
 * iCloud Sync Service
 * Handles automatic synchronization of user data to iCloud
 * Data persists across devices and app reinstalls
 */

import {
  isICloudAvailable,
  getDefaultICloudContainerPath,
  writeFile,
  readFile,
  exist,
  unlink,
  createDir,
  download,
} from 'react-native-cloud-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys that should be synced to iCloud
const SYNC_KEYS = [
  'verse_data',           // Verse annotations (notes, highlights, bookmarks)
  'reading_streaks',      // Reading streak data
  'achievements',         // User achievements
  'journal_notes',        // Journal entries
  'highlight_custom_names', // Custom highlight names
  'fivefold_todos',       // Todos
  'fivefold_user_stats',  // User stats (points, level, etc.)
  'selectedBibleVersion', // Bible version preference
  'weightUnit',           // Weight unit preference
  'purchasedBibleVersions', // Purchased versions
  'prayer_history',       // Prayer history
  'prayer_completions',   // Prayer completions
  'total_points',         // Total user points
  'user_profile',         // User profile data (legacy)
  'userProfile',          // User profile data (current)
  'userName',             // User display name
  'app_settings',         // App settings
  'onboarding_complete',  // Onboarding status (legacy)
  'onboardingCompleted',  // Onboarding status (current)
  'theme_preference',     // Theme preference
  'app_streak_data',      // App usage streak
];

// Metadata key for tracking sync state
const SYNC_METADATA_KEY = 'icloud_sync_metadata';
const LAST_SYNC_KEY = 'last_icloud_sync';
const MIGRATION_COMPLETE_KEY = 'icloud_migration_complete';

class ICloudSyncService {
  constructor() {
    this.isAvailable = false;
    this.isSyncing = false;
    this.syncListeners = [];
    this.containerPath = null;
  }

  /**
   * Initialize the iCloud sync service
   * Call this on app startup
   */
  async initialize() {
    try {
      // Only available on iOS
      if (Platform.OS !== 'ios') {
        console.log('iCloud sync is only available on iOS');
        this.isAvailable = false;
        return false;
      }

      // Check if iCloud is available (user logged in)
      this.isAvailable = await this.checkAvailability();
      
      if (this.isAvailable) {
        // Get the container path
        this.containerPath = await getDefaultICloudContainerPath();
        
        if (!this.containerPath) {
          console.log('iCloud container path not available');
          this.isAvailable = false;
          return false;
        }
        
        // Ensure our data directory exists
        try {
          const dataDir = `${this.containerPath}/Documents/biblely_data`;
          const dirExists = await exist(dataDir);
          if (!dirExists) {
            await createDir(dataDir);
          }
        } catch (dirError) {
          console.log('Could not create data directory:', dirError.message);
        }
        
        console.log('iCloud sync initialized successfully');
        
        // ALWAYS try to sync from cloud first - this handles new devices
        const syncResult = await this.syncFromCloud();
        console.log('Sync from cloud result:', syncResult);
        
        // Check if this device has local data that hasn't been uploaded yet
        const migrationComplete = await AsyncStorage.getItem(MIGRATION_COMPLETE_KEY);
        
        if (!migrationComplete) {
          // Check if we have local data worth uploading
          const hasLocalData = await this.hasSignificantLocalData();
          
          if (hasLocalData) {
            console.log('Found local data - uploading to iCloud...');
            await this.syncAllToCloud();
          }
          
          // Mark migration complete for this device
          await AsyncStorage.setItem(MIGRATION_COMPLETE_KEY, new Date().toISOString());
        }
      } else {
        console.log('iCloud not available - user may not be signed in');
      }

      return this.isAvailable;
    } catch (error) {
      console.error('Error initializing iCloud sync:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Check if iCloud is available
   */
  async checkAvailability() {
    try {
      const available = await isICloudAvailable();
      return available;
    } catch (error) {
      console.log('iCloud availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Check if this device has significant local data worth uploading
   */
  async hasSignificantLocalData() {
    try {
      // Check for key data that indicates real usage
      const verseData = await AsyncStorage.getItem('verse_data');
      const totalPoints = await AsyncStorage.getItem('total_points');
      const userProfile = await AsyncStorage.getItem('user_profile');
      
      // If we have verse data with content, or points > 0, we have real data
      if (verseData) {
        const parsed = JSON.parse(verseData);
        if (Object.keys(parsed).length > 0) {
          console.log('Found local verse data');
          return true;
        }
      }
      
      if (totalPoints && parseInt(totalPoints) > 0) {
        console.log('Found local points:', totalPoints);
        return true;
      }
      
      if (userProfile) {
        console.log('Found local user profile');
        return true;
      }
      
      console.log('No significant local data found');
      return false;
    } catch (error) {
      console.log('Error checking local data:', error.message);
      return false;
    }
  }

  /**
   * Get the file path for a storage key
   */
  getFilePath(key) {
    if (!this.containerPath) return null;
    return `${this.containerPath}/Documents/biblely_data/${key}.json`;
  }

  /**
   * Migrate existing local data to iCloud
   * Called once when iCloud is first set up
   */
  async migrateExistingData() {
    if (!this.isAvailable) {
      return { success: false, reason: 'iCloud not available' };
    }

    this.notifyListeners('migration_started');

    try {
      console.log('Starting data migration to iCloud...');
      
      let migratedCount = 0;
      let skippedCount = 0;

      for (const key of SYNC_KEYS) {
        try {
          const localData = await AsyncStorage.getItem(key);
          
          if (localData) {
            // Check if data already exists in cloud
            const filePath = this.getFilePath(key);
            if (!filePath) continue;
            
            let cloudExists = false;
            
            try {
              cloudExists = await exist(filePath);
            } catch {
              cloudExists = false;
            }

            if (cloudExists) {
              // Cloud has data - need to merge
              console.log(`Key ${key} exists in cloud - merging...`);
              
              try {
                // Download if needed
                await download(filePath);
                const cloudData = await readFile(filePath);
                const cloudParsed = JSON.parse(cloudData);
                const localParsed = JSON.parse(localData);
                
                // Merge: combine cloud and local data
                const merged = await this.mergeData(key, localParsed, cloudParsed.data);
                
                // Save merged data locally
                await AsyncStorage.setItem(key, JSON.stringify(merged.data));
                
                // Upload merged data to cloud
                await this.syncToCloud(key, merged.data);
                
                migratedCount++;
              } catch (mergeError) {
                console.warn(`Error merging ${key}, uploading local:`, mergeError.message);
                // If merge fails, just upload local data
                const parsed = JSON.parse(localData);
                await this.syncToCloud(key, parsed);
                migratedCount++;
              }
            } else {
              // No cloud data - just upload local
              const parsed = JSON.parse(localData);
              await this.syncToCloud(key, parsed);
              migratedCount++;
              console.log(`Migrated ${key} to iCloud`);
            }
          } else {
            skippedCount++;
          }
        } catch (keyError) {
          console.warn(`Error migrating key ${key}:`, keyError.message);
        }
      }

      // Mark migration as complete
      await AsyncStorage.setItem(MIGRATION_COMPLETE_KEY, new Date().toISOString());
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log(`Migration complete: ${migratedCount} keys migrated, ${skippedCount} skipped`);
      this.notifyListeners('migration_completed', { migratedCount, skippedCount });
      
      return { success: true, migratedCount, skippedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      this.notifyListeners('migration_error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all data from iCloud to local storage
   * Called on app launch to pull latest data
   */
  async syncFromCloud() {
    if (!this.isAvailable || this.isSyncing) {
      return { success: false, reason: 'Not available or already syncing' };
    }

    this.isSyncing = true;
    this.notifyListeners('sync_started');

    try {
      console.log('Starting sync from iCloud...');
      
      let syncedCount = 0;
      let conflictCount = 0;

      for (const key of SYNC_KEYS) {
        try {
          const filePath = this.getFilePath(key);
          if (!filePath) continue;
          
          // Check if file exists in iCloud
          const fileExists = await exist(filePath);
          
          if (fileExists) {
            // Download if needed
            try {
              await download(filePath);
            } catch (downloadErr) {
              // File might already be downloaded
            }
            
            // Read from iCloud
            const cloudData = await readFile(filePath);
            const cloudParsed = JSON.parse(cloudData);
            
            // Get local data
            const localData = await AsyncStorage.getItem(key);
            const localParsed = localData ? JSON.parse(localData) : null;
            
            // Resolve conflicts - cloud wins if newer, otherwise merge
            const resolved = await this.resolveConflict(key, localParsed, cloudParsed);
            
            if (resolved.action === 'use_cloud') {
              await AsyncStorage.setItem(key, JSON.stringify(cloudParsed.data));
              syncedCount++;
            } else if (resolved.action === 'merge') {
              await AsyncStorage.setItem(key, JSON.stringify(resolved.data));
              conflictCount++;
            }
            // If action is 'keep_local', we don't change anything
          }
        } catch (keyError) {
          // File might not exist yet, that's okay
          if (!keyError.message?.includes('not found') && !keyError.message?.includes('does not exist')) {
            console.warn(`Error syncing key ${key}:`, keyError.message);
          }
        }
      }

      // Update last sync time
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log(`Sync from iCloud complete: ${syncedCount} synced, ${conflictCount} merged`);
      this.notifyListeners('sync_completed', { syncedCount, conflictCount });
      
      return { success: true, syncedCount, conflictCount };
    } catch (error) {
      console.error('Error syncing from iCloud:', error);
      this.notifyListeners('sync_error', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a specific key to iCloud
   * Call this when data changes
   */
  async syncToCloud(key, data) {
    if (!this.isAvailable) {
      return { success: false, reason: 'iCloud not available' };
    }

    if (!SYNC_KEYS.includes(key)) {
      return { success: false, reason: 'Key not in sync list' };
    }

    try {
      const filePath = this.getFilePath(key);
      if (!filePath) {
        return { success: false, reason: 'No container path' };
      }
      
      // Wrap data with metadata
      const cloudData = {
        data: data,
        lastModified: new Date().toISOString(),
        deviceId: await this.getDeviceId(),
        version: 1
      };

      await writeFile(filePath, JSON.stringify(cloudData));

      console.log(`Synced ${key} to iCloud`);
      return { success: true };
    } catch (error) {
      console.error(`Error syncing ${key} to iCloud:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all local data to iCloud
   * Use for manual backup or initial upload
   */
  async syncAllToCloud() {
    if (!this.isAvailable) {
      return { success: false, reason: 'iCloud not available' };
    }

    this.isSyncing = true;
    this.notifyListeners('sync_started');

    try {
      console.log('Starting full sync to iCloud...');
      
      let syncedCount = 0;
      let errorCount = 0;

      for (const key of SYNC_KEYS) {
        try {
          const localData = await AsyncStorage.getItem(key);
          
          if (localData) {
            const parsed = JSON.parse(localData);
            const result = await this.syncToCloud(key, parsed);
            
            if (result.success) {
              syncedCount++;
            } else {
              errorCount++;
            }
          }
        } catch (keyError) {
          console.warn(`Error syncing key ${key}:`, keyError.message);
          errorCount++;
        }
      }

      // Update last sync time
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log(`Full sync to iCloud complete: ${syncedCount} synced, ${errorCount} errors`);
      this.notifyListeners('sync_completed', { syncedCount, errorCount });
      
      return { success: true, syncedCount, errorCount };
    } catch (error) {
      console.error('Error in full sync to iCloud:', error);
      this.notifyListeners('sync_error', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Resolve conflicts between local and cloud data
   */
  async resolveConflict(key, localData, cloudData) {
    // If no local data, use cloud
    if (!localData) {
      return { action: 'use_cloud', data: cloudData.data };
    }

    // If no cloud data (shouldn't happen here but just in case)
    if (!cloudData || !cloudData.data) {
      return { action: 'keep_local', data: localData };
    }

    // Compare timestamps if available
    const cloudTime = new Date(cloudData.lastModified || 0).getTime();
    const localTime = await this.getLocalModifiedTime(key);

    // If cloud is newer, use cloud data
    if (cloudTime > localTime) {
      return { action: 'use_cloud', data: cloudData.data };
    }

    // If local is newer, keep local (it will be synced to cloud next time)
    if (localTime > cloudTime) {
      return { action: 'keep_local', data: localData };
    }

    // If same time or can't determine, try to merge based on data type
    return await this.mergeData(key, localData, cloudData.data);
  }

  /**
   * Merge data intelligently based on key type
   */
  async mergeData(key, localData, cloudData) {
    try {
      // For array types, merge unique items
      if (Array.isArray(localData) && Array.isArray(cloudData)) {
        const merged = this.mergeArrays(localData, cloudData);
        return { action: 'merge', data: merged };
      }

      // For object types, deep merge
      if (typeof localData === 'object' && typeof cloudData === 'object') {
        const merged = this.deepMerge(cloudData, localData);
        return { action: 'merge', data: merged };
      }

      // For primitives, prefer cloud (newer sync wins)
      return { action: 'use_cloud', data: cloudData };
    } catch (error) {
      console.warn('Error merging data, using cloud:', error);
      return { action: 'use_cloud', data: cloudData };
    }
  }

  /**
   * Merge two arrays, keeping unique items by id or content
   */
  mergeArrays(arr1, arr2) {
    const result = [...arr1];
    const existingIds = new Set(arr1.map(item => item.id || JSON.stringify(item)));
    
    for (const item of arr2) {
      const itemId = item.id || JSON.stringify(item);
      if (!existingIds.has(itemId)) {
        result.push(item);
        existingIds.add(itemId);
      }
    }
    
    return result;
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else if (Array.isArray(source[key])) {
          result[key] = this.mergeArrays(result[key] || [], source[key]);
        } else {
          // Prefer the source (local) value for primitives
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Get local modification time for a key
   */
  async getLocalModifiedTime(key) {
    try {
      const metadata = await AsyncStorage.getItem(`${key}_modified`);
      return metadata ? new Date(metadata).getTime() : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Set local modification time for a key
   */
  async setLocalModifiedTime(key) {
    try {
      await AsyncStorage.setItem(`${key}_modified`, new Date().toISOString());
    } catch (error) {
      console.warn('Error setting modified time:', error);
    }
  }

  /**
   * Get a unique device identifier
   */
  async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch {
      return 'unknown_device';
    }
  }

  /**
   * Get the last sync time
   */
  async getLastSyncTime() {
    try {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return lastSync ? new Date(lastSync) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const lastSync = await this.getLastSyncTime();
    return {
      isAvailable: this.isAvailable,
      isSyncing: this.isSyncing,
      lastSync: lastSync,
      platform: Platform.OS
    };
  }

  /**
   * Add a sync event listener
   */
  addListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data = {}) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.warn('Error in sync listener:', error);
      }
    });
  }

  /**
   * Create a wrapper for AsyncStorage that auto-syncs
   * Use this instead of direct AsyncStorage calls for synced keys
   */
  createSyncedStorage() {
    const self = this;
    
    return {
      async getItem(key) {
        return AsyncStorage.getItem(key);
      },
      
      async setItem(key, value) {
        await AsyncStorage.setItem(key, value);
        await self.setLocalModifiedTime(key);
        
        // Auto-sync to cloud if key is in sync list
        if (SYNC_KEYS.includes(key) && self.isAvailable) {
          try {
            const parsed = JSON.parse(value);
            await self.syncToCloud(key, parsed);
          } catch (error) {
            console.warn('Auto-sync failed for', key, error.message);
          }
        }
      },
      
      async removeItem(key) {
        await AsyncStorage.removeItem(key);
        
        // Also remove from cloud
        if (SYNC_KEYS.includes(key) && self.isAvailable) {
          try {
            const filePath = self.getFilePath(key);
            if (filePath) {
              await unlink(filePath);
            }
          } catch (error) {
            // File might not exist, that's okay
          }
        }
      }
    };
  }
}

// Export singleton instance
const iCloudSyncService = new ICloudSyncService();
export default iCloudSyncService;

// Export the class for testing
export { ICloudSyncService, SYNC_KEYS };


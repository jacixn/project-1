/**
 * Advanced Local Storage Manager for Fivefold App
 * Features: Encryption, Compression, Auto-backup, Data validation
 */

const STORAGE_PREFIX = 'fivefold_';
const BACKUP_PREFIX = 'fivefold_backup_';
const MAX_BACKUPS = 5;

// Simple encryption/decryption (XOR cipher)
const encrypt = (text, key = 'fivefold_secret_key') => {
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    encrypted += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(encrypted);
};

const decrypt = (encryptedText, key = 'fivefold_secret_key') => {
  try {
    const text = atob(encryptedText);
    let decrypted = '';
    for (let i = 0; i < text.length; i++) {
      decrypted += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

// Data validation schemas
const dataSchemas = {
  userStats: {
    points: 'number',
    level: 'number',
    streak: 'number',
    versesRead: 'number',
    totalPrayers: 'number',
    totalTasks: 'number'
  },
  todos: 'array',
  prayerHistory: 'array',
  settings: 'object',
  verseProgress: 'object'
};

const validateData = (key, data) => {
  const schema = dataSchemas[key];
  if (!schema) return true; // Unknown keys are allowed
  
  if (schema === 'array') return Array.isArray(data);
  if (schema === 'object') return typeof data === 'object' && data !== null;
  if (typeof schema === 'object') {
    for (const [field, type] of Object.entries(schema)) {
      if (data[field] !== undefined && typeof data[field] !== type) {
        return false;
      }
    }
  }
  return true;
};

// Core storage functions
export const saveData = (key, data, options = {}) => {
  try {
    if (!validateData(key, data)) {
      console.warn(`Invalid data format for key: ${key}`);
      return false;
    }

    const prefixedKey = STORAGE_PREFIX + key;
    const timestamp = new Date().toISOString();
    
    const dataPackage = {
      data,
      timestamp,
      version: '1.0',
      checksum: generateChecksum(data)
    };

    const serialized = JSON.stringify(dataPackage);
    const finalData = options.encrypt ? encrypt(serialized) : serialized;
    
    localStorage.setItem(prefixedKey, finalData);
    
    // Auto-backup for critical data
    if (['userStats', 'todos', 'prayerHistory'].includes(key)) {
      createAutoBackup(key, dataPackage);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

export const getStoredData = (key, options = {}) => {
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      console.warn('localStorage is not available');
      return options.defaultValue || null;
    }

    const prefixedKey = STORAGE_PREFIX + key;
    const stored = localStorage.getItem(prefixedKey);
    
    if (!stored) return options.defaultValue || null;
    
    const serialized = options.encrypt ? decrypt(stored) : stored;
    if (!serialized) return options.defaultValue || null;
    
    const dataPackage = JSON.parse(serialized);
    
    // Handle legacy data format (direct values without wrapper)
    if (typeof dataPackage !== 'object' || !dataPackage.hasOwnProperty('data')) {
      // This is legacy data, return as-is
      return dataPackage;
    }
    
    // Verify data integrity
    if (dataPackage.checksum && !verifyChecksum(dataPackage.data, dataPackage.checksum)) {
      console.warn(`Data corruption detected for key: ${key}`);
      return attemptDataRecovery(key) || options.defaultValue || null;
    }
    
    return dataPackage.data;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return attemptDataRecovery(key) || options.defaultValue || null;
  }
};

export const removeData = (key) => {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    localStorage.removeItem(prefixedKey);
    // Also remove related backups
    removeBackups(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
};

export const clearAllData = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX) || key.startsWith(BACKUP_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

// Advanced backup system
const createAutoBackup = (key, dataPackage) => {
  try {
    const backupKey = `${BACKUP_PREFIX}${key}_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(dataPackage));
    
    // Cleanup old backups
    cleanupOldBackups(key);
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
};

const cleanupOldBackups = (key) => {
  const backupKeys = Object.keys(localStorage)
    .filter(k => k.startsWith(`${BACKUP_PREFIX}${key}_`))
    .sort((a, b) => {
      const timestampA = parseInt(a.split('_').pop());
      const timestampB = parseInt(b.split('_').pop());
      return timestampB - timestampA; // Newest first
    });
  
  // Keep only the latest MAX_BACKUPS
  backupKeys.slice(MAX_BACKUPS).forEach(backupKey => {
    localStorage.removeItem(backupKey);
  });
};

const removeBackups = (key) => {
  const backupKeys = Object.keys(localStorage)
    .filter(k => k.startsWith(`${BACKUP_PREFIX}${key}_`));
  
  backupKeys.forEach(backupKey => {
    localStorage.removeItem(backupKey);
  });
};

const attemptDataRecovery = (key) => {
  try {
    const backupKeys = Object.keys(localStorage)
      .filter(k => k.startsWith(`${BACKUP_PREFIX}${key}_`))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop());
        const timestampB = parseInt(b.split('_').pop());
        return timestampB - timestampA; // Newest first
      });
    
    for (const backupKey of backupKeys) {
      try {
        const backup = JSON.parse(localStorage.getItem(backupKey));
        if (backup && backup.data) {
          console.log(`Recovered data for ${key} from backup`);
          return backup.data;
        }
      } catch (error) {
        continue; // Try next backup
      }
    }
    
    return null;
  } catch (error) {
    console.error('Data recovery failed:', error);
    return null;
  }
};

// Data integrity functions
const generateChecksum = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

const verifyChecksum = (data, expectedChecksum) => {
  return generateChecksum(data) === expectedChecksum;
};

// Export/Import functionality
export const createEncryptedBackup = () => {
  try {
    const allData = {};
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        const cleanKey = key.replace(STORAGE_PREFIX, '');
        const data = getStoredData(cleanKey);
        if (data !== null) {
          allData[cleanKey] = data;
        }
      }
    });
    
    const backup = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      data: allData,
      checksum: generateChecksum(allData)
    };
    
    return encrypt(JSON.stringify(backup));
  } catch (error) {
    console.error('Backup creation failed:', error);
    return null;
  }
};

export const restoreFromBackup = (backupString) => {
  try {
    const decrypted = decrypt(backupString);
    if (!decrypted) {
      throw new Error('Failed to decrypt backup');
    }
    
    const backup = JSON.parse(decrypted);
    
    if (!backup.version || !backup.data) {
      throw new Error('Invalid backup format');
    }
    
    // Verify backup integrity
    if (backup.checksum && !verifyChecksum(backup.data, backup.checksum)) {
      throw new Error('Backup data corruption detected');
    }
    
    // Clear existing data
    clearAllData();
    
    // Restore data
    let restoredCount = 0;
    Object.entries(backup.data).forEach(([key, value]) => {
      if (saveData(key, value)) {
        restoredCount++;
      }
    });
    
    console.log(`Restored ${restoredCount} data entries from backup`);
    return { success: true, restoredCount, timestamp: backup.timestamp };
    
  } catch (error) {
    console.error('Backup restoration failed:', error);
    return { success: false, error: error.message };
  }
};

// Storage analytics
export const getStorageInfo = () => {
  try {
    const keys = Object.keys(localStorage);
    const fivefoldKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
    const backupKeys = keys.filter(k => k.startsWith(BACKUP_PREFIX));
    
    let totalSize = 0;
    fivefoldKeys.forEach(key => {
      totalSize += localStorage.getItem(key).length;
    });
    
    return {
      totalEntries: fivefoldKeys.length,
      totalBackups: backupKeys.length,
      estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
      lastModified: getStoredData('lastActivity') || new Date().toISOString()
    };
  } catch (error) {
    console.error('Storage info retrieval failed:', error);
    return null;
  }
};

// Initialize default data structure
export const initializeDefaultData = () => {
  const defaults = {
    userStats: {
      points: 0,
      level: 1,
      streak: 0,
      versesRead: 0,
      totalPrayers: 0,
      totalTasks: 0,
      joinDate: new Date().toISOString()
    },
    todos: [],
    prayerHistory: [],
    settings: {
      notifications: true,
      theme: 'default',
      prayerReminders: true,
      autoBackup: true,
      sound: true
    },
    verseProgress: {
      currentIndex: 0,
      cycleCount: 1,
      readVerses: []
    }
  };
  
  Object.entries(defaults).forEach(([key, value]) => {
    if (getStoredData(key) === null) {
      saveData(key, value);
    }
  });
  
  return true;
};

// Local storage utilities for persisting data

const STORAGE_PREFIX = 'fivefold_';

export const saveData = (key, data) => {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    localStorage.setItem(prefixedKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

export const getStoredData = (key) => {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    const data = localStorage.getItem(prefixedKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

export const removeData = (key) => {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    localStorage.removeItem(prefixedKey);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
};

export const clearAllData = () => {
  try {
    // Only clear Fivefold data, not all localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

// Encrypted backup functionality (mock for now)
export const createEncryptedBackup = () => {
  const allData = {};
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      const cleanKey = key.replace(STORAGE_PREFIX, '');
      allData[cleanKey] = getStoredData(cleanKey);
    }
  });
  
  // In production, this would encrypt the data
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: allData
  };
  
  return btoa(JSON.stringify(backup)); // Base64 encode (mock encryption)
};

export const restoreFromBackup = (backupString) => {
  try {
    const backup = JSON.parse(atob(backupString)); // Base64 decode
    
    if (backup.version && backup.data) {
      Object.entries(backup.data).forEach(([key, value]) => {
        saveData(key, value);
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
};

/**
 * iCloud Sync Status Component
 * Shows sync status and allows manual sync in settings
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useICloudSync } from '../hooks/useICloudSync';
import { triggerHaptic } from '../utils/haptics';

const ICloudSyncStatus = () => {
  const { theme, isDark } = useTheme();
  const { isAvailable, isSyncing, lastSync, error, syncNow, refreshFromCloud } = useICloudSync();

  const formatLastSync = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleSync = async () => {
    triggerHaptic('light');
    await syncNow();
  };

  const handleRefresh = async () => {
    triggerHaptic('light');
    await refreshFromCloud();
  };

  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-offline-outline" size={24} color={theme.textSecondary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: theme.text }]}>iCloud Sync</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Not available - sign in to iCloud in Settings
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isSyncing ? "cloud-upload" : "cloud-done"} 
            size={24} 
            color={error ? '#ff6b6b' : '#4CAF50'} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>iCloud Sync</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isSyncing 
              ? 'Syncing...' 
              : error 
                ? `Error: ${error}` 
                : `Last synced: ${formatLastSync(lastSync)}`
            }
          </Text>
        </View>
        
        {isSyncing ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.syncButton, { backgroundColor: isDark ? '#2a2a2a' : '#e0e0e0' }]}
              onPress={handleRefresh}
              disabled={isSyncing}
            >
              <Ionicons name="cloud-download-outline" size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.syncButton, { backgroundColor: isDark ? '#2a2a2a' : '#e0e0e0', marginLeft: 8 }]}
              onPress={handleSync}
              disabled={isSyncing}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Your verses, notes, highlights, progress, and settings sync automatically across all your devices.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  description: {
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ICloudSyncStatus;


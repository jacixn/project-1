/**
 * useICloudSync Hook
 * React hook for iCloud sync functionality
 */

import { useState, useEffect, useCallback } from 'react';
import iCloudSyncService from '../services/iCloudSyncService';

/**
 * Hook to access iCloud sync status and controls
 */
export function useICloudSync() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set initial state
    const updateStatus = async () => {
      const status = await iCloudSyncService.getSyncStatus();
      setIsAvailable(status.isAvailable);
      setIsSyncing(status.isSyncing);
      setLastSync(status.lastSync);
    };
    updateStatus();

    // Listen for sync events
    const unsubscribe = iCloudSyncService.addListener((event, data) => {
      switch (event) {
        case 'sync_started':
          setIsSyncing(true);
          setError(null);
          break;
        case 'sync_completed':
          setIsSyncing(false);
          updateStatus();
          break;
        case 'sync_error':
          setIsSyncing(false);
          setError(data.error);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const syncNow = useCallback(async () => {
    setError(null);
    const result = await iCloudSyncService.syncAllToCloud();
    if (!result.success) {
      setError(result.error || result.reason);
    }
    return result;
  }, []);

  const refreshFromCloud = useCallback(async () => {
    setError(null);
    const result = await iCloudSyncService.syncFromCloud();
    if (!result.success) {
      setError(result.error || result.reason);
    }
    return result;
  }, []);

  return {
    isAvailable,
    isSyncing,
    lastSync,
    error,
    syncNow,
    refreshFromCloud,
  };
}

/**
 * Hook to check if iCloud is available
 */
export function useIsICloudAvailable() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const status = await iCloudSyncService.getSyncStatus();
      setIsAvailable(status.isAvailable);
      setIsChecking(false);
    };
    check();
  }, []);

  return { isAvailable, isChecking };
}

export default useICloudSync;


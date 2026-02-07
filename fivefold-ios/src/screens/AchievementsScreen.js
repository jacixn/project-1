/**
 * Achievements Screen
 * 
 * Wrapper screen for AchievementsModal to enable stack navigation with swipe-back.
 * Loads user stats from AsyncStorage and passes them to the modal component.
 */

import React, { useState, useEffect } from 'react';
import AchievementsModal from '../components/AchievementsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredData } from '../utils/localStorage';

const AchievementsScreen = ({ navigation }) => {
  const [userStats, setUserStats] = useState({});

  useEffect(() => {
    const loadStats = async () => {
      try {
        const storedStats = await getStoredData('userStats') || {};
        setUserStats(storedStats);
      } catch (error) {
        console.error('Error loading user stats:', error);
      }
    };
    loadStats();
  }, []);

  return (
    <AchievementsModal
      visible={true}
      onClose={() => navigation.goBack()}
      userStats={userStats}
      asScreen={true}
    />
  );
};

export default AchievementsScreen;

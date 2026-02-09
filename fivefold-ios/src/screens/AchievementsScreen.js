/**
 * Achievements Screen
 * 
 * Wrapper screen for AchievementsModal to enable stack navigation with swipe-back.
 * Loads user stats from both storage keys (merged) and passes them to the modal.
 */

import React, { useState, useEffect } from 'react';
import AchievementsModal from '../components/AchievementsModal';
import AchievementService from '../services/achievementService';

const AchievementsScreen = ({ navigation }) => {
  const [userStats, setUserStats] = useState({});

  useEffect(() => {
    const loadStats = async () => {
      try {
        const mergedStats = await AchievementService.getStats();
        setUserStats(mergedStats);
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

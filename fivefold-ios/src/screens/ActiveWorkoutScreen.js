/**
 * Active Workout Screen
 *
 * Native-stack modal wrapper for WorkoutModal so the active workout presents
 * like every other sheet in the app (parent scales back, swipe-down to dismiss).
 * Dismissing backgrounds the workout into the mini player (handled inside
 * WorkoutModal via a navigation beforeRemove listener).
 */

import React from 'react';
import WorkoutModal from '../components/WorkoutModal';

const ActiveWorkoutScreen = ({ navigation, route }) => {
  return (
    <WorkoutModal
      asScreen
      visible={true}
      navigation={navigation}
      templateData={route?.params?.templateData || null}
      onClose={() => { if (navigation.canGoBack()) navigation.goBack(); }}
    />
  );
};

export default ActiveWorkoutScreen;

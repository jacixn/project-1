/**
 * Exercises Screen
 * 
 * Wrapper screen for ExercisesModal to enable stack navigation with swipe-back.
 */

import React from 'react';
import ExercisesModal from '../components/ExercisesModal';

const ExercisesScreen = ({ navigation }) => {
  return (
    <ExercisesModal
      visible={true}
      onClose={() => navigation.goBack()}
      asScreen={true}
    />
  );
};

export default ExercisesScreen;

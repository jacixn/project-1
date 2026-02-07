/**
 * Start Workout Screen
 * 
 * Wrapper screen for TemplateSelectionModal to enable stack navigation with swipe-back.
 */

import React from 'react';
import TemplateSelectionModal from '../components/TemplateSelectionModal';

const StartWorkoutScreen = ({ navigation }) => {
  return (
    <TemplateSelectionModal
      visible={true}
      onClose={() => navigation.goBack()}
      asScreen={true}
    />
  );
};

export default StartWorkoutScreen;

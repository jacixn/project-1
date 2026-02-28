/**
 * Start Workout Screen
 * 
 * Wrapper screen for TemplateSelectionModal to enable stack navigation with swipe-back.
 */

import React from 'react';
import { View } from 'react-native';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import FitnessDisclaimer from '../components/FitnessDisclaimer';

const StartWorkoutScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1 }}>
      <TemplateSelectionModal
        visible={true}
        onClose={() => navigation.goBack()}
        asScreen={true}
      />
      <FitnessDisclaimer screenKey="start_workout" />
    </View>
  );
};

export default StartWorkoutScreen;

import React from 'react';
import ThematicGuides from '../components/ThematicGuides';

const ThematicGuidesScreen = ({ navigation }) => (
  <ThematicGuides visible={true} onClose={() => navigation.goBack()} asScreen={true} />
);

export default ThematicGuidesScreen;

import React from 'react';
import ThematicGuides from '../components/ThematicGuides';

const ThematicGuidesScreen = ({ navigation }) => (
  <ThematicGuides
    visible={true}
    asScreen={true}
    onClose={() => navigation.goBack()}
    onOpenGuide={(guide) => navigation.navigate('ThematicGuideDetail', { guide })}
  />
);

export default ThematicGuidesScreen;

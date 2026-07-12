import React from 'react';
import ThematicGuides from '../components/ThematicGuides';

// A single thematic guide, presented as a native pull-to-dismiss modal screen.
// Reuses the ThematicGuides component in detailMode so all the guide-detail
// rendering/audio logic stays in one place.
const ThematicGuideDetailScreen = ({ navigation, route }) => (
  <ThematicGuides
    asScreen
    detailMode
    initialGuide={route?.params?.guide}
    onClose={() => navigation.goBack()}
  />
);

export default ThematicGuideDetailScreen;

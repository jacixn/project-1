import React from 'react';
import BibleTimeline from '../components/BibleTimeline';

// A single Bible-timeline era's stories, as a native pull-to-dismiss modal screen.
// Reuses BibleTimeline in detailMode so the story-card rendering/audio stays put.
const BibleTimelineEraScreen = ({ navigation, route }) => (
  <BibleTimeline
    asScreen
    detailMode
    initialEra={route?.params?.era}
    onClose={() => navigation.goBack()}
  />
);

export default BibleTimelineEraScreen;

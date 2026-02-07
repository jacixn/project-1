import React from 'react';
import BibleTimeline from '../components/BibleTimeline';

const BibleTimelineScreen = ({ navigation }) => (
  <BibleTimeline visible={true} onClose={() => navigation.goBack()} asScreen={true} />
);

export default BibleTimelineScreen;

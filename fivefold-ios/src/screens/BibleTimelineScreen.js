import React from 'react';
import BibleTimeline from '../components/BibleTimeline';

const BibleTimelineScreen = ({ navigation }) => (
  <BibleTimeline
    visible={true}
    asScreen={true}
    onClose={() => navigation.goBack()}
    onOpenEra={(era) => navigation.navigate('BibleTimelineEra', { era })}
  />
);

export default BibleTimelineScreen;

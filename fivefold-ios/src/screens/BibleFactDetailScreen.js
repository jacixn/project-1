import React from 'react';
import BibleFastFacts from '../components/BibleFastFacts';

// A single Bible fast fact, presented as a native pull-to-dismiss modal screen —
// matches the era/guide detail sheets. Reuses BibleFastFacts in detailMode.
const BibleFactDetailScreen = ({ navigation, route }) => (
  <BibleFastFacts
    asScreen
    detailMode
    initialFact={route?.params?.fact}
    onClose={() => navigation.goBack()}
  />
);

export default BibleFactDetailScreen;

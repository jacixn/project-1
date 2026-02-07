import React from 'react';
import BibleFastFacts from '../components/BibleFastFacts';

const BibleFastFactsScreen = ({ navigation }) => (
  <BibleFastFacts visible={true} onClose={() => navigation.goBack()} asScreen={true} />
);

export default BibleFastFactsScreen;

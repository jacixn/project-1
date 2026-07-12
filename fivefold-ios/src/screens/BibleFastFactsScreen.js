import React from 'react';
import BibleFastFacts from '../components/BibleFastFacts';

const BibleFastFactsScreen = ({ navigation }) => (
  <BibleFastFacts
    visible={true}
    asScreen={true}
    onClose={() => navigation.goBack()}
    onOpenFact={(fact) => navigation.navigate('BibleFactDetail', { fact })}
  />
);

export default BibleFastFactsScreen;

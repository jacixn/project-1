import React from 'react';
import InteractiveBibleMaps from '../components/InteractiveBibleMaps';

const BibleMapsScreen = ({ navigation }) => (
  <InteractiveBibleMaps visible={true} onClose={() => navigation.goBack()} asScreen={true} />
);

export default BibleMapsScreen;

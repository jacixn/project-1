import React from 'react';
import AudioLearning from '../components/AudioLearning';

const AudioLearningScreen = ({ navigation }) => (
  <AudioLearning visible={true} onClose={() => navigation.goBack()} asScreen={true} />
);

export default AudioLearningScreen;

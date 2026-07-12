import React from 'react';
import AudioLearning from '../components/AudioLearning';

const AudioLearningScreen = ({ navigation }) => (
  <AudioLearning
    visible={true}
    asScreen={true}
    onClose={() => navigation.goBack()}
    onOpenStory={(story) => navigation.navigate('AudioStory', { story })}
  />
);

export default AudioLearningScreen;

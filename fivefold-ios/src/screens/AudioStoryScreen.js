import React from 'react';
import AudioLearning from '../components/AudioLearning';

// A single audio story's player, presented as a native pull-to-dismiss modal
// screen on top of the story list. Reuses AudioLearning in detailMode.
const AudioStoryScreen = ({ navigation, route }) => (
  <AudioLearning
    asScreen
    detailMode
    initialStory={route?.params?.story}
    onClose={() => navigation.goBack()}
  />
);

export default AudioStoryScreen;

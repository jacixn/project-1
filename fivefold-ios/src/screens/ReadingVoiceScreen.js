import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import VoicePickerModal from '../components/VoicePickerModal';

const ReadingVoiceScreen = ({ navigation }) => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <VoicePickerModal asScreen visible onClose={() => navigation.goBack()} />
    </View>
  );
};

export default ReadingVoiceScreen;

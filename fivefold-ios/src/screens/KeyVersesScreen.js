import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import KeyVerses from '../components/KeyVerses';

const KeyVersesScreen = ({ navigation }) => (
  <KeyVerses
    visible={true}
    onClose={() => navigation.goBack()}
    onNavigateToVerse={(reference) => {
      navigation.goBack();
      setTimeout(() => {
        DeviceEventEmitter.emit('openBibleFromBibleStudy', { verseRef: reference });
      }, 100);
    }}
    onDiscussVerse={(payload) => {
      navigation.goBack();
      setTimeout(() => {
        DeviceEventEmitter.emit('openAiChatFromBibleStudy', payload);
      }, 100);
    }}
    asScreen={true}
  />
);

export default KeyVersesScreen;

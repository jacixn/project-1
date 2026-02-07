/**
 * Bible Study Screen
 * 
 * Wrapper screen for BibleStudyModal to enable stack navigation with swipe-back.
 */

import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import BibleStudyModal from '../components/BibleStudyModal';

const BibleStudyScreen = ({ navigation }) => {
  return (
    <BibleStudyModal
      visible={true}
      onClose={() => navigation.goBack()}
      navigation={navigation}
      onNavigateToVerse={(reference) => {
        navigation.goBack();
        setTimeout(() => {
          DeviceEventEmitter.emit('openBibleFromBibleStudy', { verseRef: reference });
        }, 100);
      }}
      onDiscussVerse={(versePayload) => {
        navigation.goBack();
        setTimeout(() => {
          DeviceEventEmitter.emit('openAiChatFromBibleStudy', versePayload);
        }, 100);
      }}
      asScreen={true}
    />
  );
};

export default BibleStudyScreen;

/**
 * Friend Chat Screen
 * 
 * Wrapper screen for AiBibleChat to enable stack navigation with swipe-back.
 */

import React from 'react';
import AiBibleChat from '../components/AiBibleChat';

const FriendChatScreen = ({ navigation, route }) => {
  const initialVerse = route?.params?.initialVerse || null;

  return (
    <AiBibleChat
      visible={true}
      onClose={() => navigation.goBack()}
      initialVerse={initialVerse}
      onNavigateToBible={(verseRef) => {
        navigation.navigate('BibleReader', { verseRef });
      }}
      asScreen={true}
    />
  );
};

export default FriendChatScreen;

/**
 * Coach Chat Screen
 * 
 * Wrapper screen for AiBibleChat in gym mode to enable stack navigation with swipe-back.
 */

import React from 'react';
import AiBibleChat from '../components/AiBibleChat';

const CoachChatScreen = ({ navigation }) => {
  return (
    <AiBibleChat
      visible={true}
      onClose={() => navigation.goBack()}
      mode="gym"
      asScreen={true}
    />
  );
};

export default CoachChatScreen;

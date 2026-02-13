import React from 'react';
import KeyVerses from '../components/KeyVerses';

const KeyVersesScreen = ({ navigation }) => (
  <KeyVerses
    visible={true}
    onClose={() => navigation.goBack()}
    onNavigateToVerse={(reference) => {
      navigation.navigate('BibleReader', { verseRef: reference });
    }}
    onDiscussVerse={(payload) => {
      navigation.navigate('FriendChat', { initialVerse: payload });
    }}
    asScreen={true}
  />
);

export default KeyVersesScreen;

import React from 'react';
import KeyVerses from '../components/KeyVerses';

const KeyVersesScreen = ({ navigation }) => (
  <KeyVerses
    visible={true}
    onClose={() => navigation.goBack()}
    onNavigateToVerse={(reference) => {
      navigation.navigate('BibleChapter', { verseRef: reference, verseTapTs: Date.now() });
    }}
    onDiscussVerse={(versePayload) => navigation.navigate('BibleChat', { initialVerse: versePayload })}
    asScreen={true}
  />
);

export default KeyVersesScreen;

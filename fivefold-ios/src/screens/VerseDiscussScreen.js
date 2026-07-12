import React, { useCallback } from 'react';
import AiBibleChat from '../components/AiBibleChat';

const VerseDiscussScreen = ({ navigation, route }) => {
  const { verse, title } = route.params || {};

  const handleNavigateToBible = useCallback((verseRef) => {
    navigation.navigate('BibleChapter', { verseRef, verseTapTs: Date.now() });
  }, [navigation]);

  return (
    <AiBibleChat
      visible={true}
      asScreen
      onClose={() => navigation.goBack()}
      initialVerse={verse}
      onNavigateToBible={handleNavigateToBible}
      title={title || 'Discuss This Verse'}
    />
  );
};

export default VerseDiscussScreen;

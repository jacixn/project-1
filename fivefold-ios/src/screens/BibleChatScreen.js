/**
 * Bible Chat Screen
 *
 * Wrapper screen for AiBibleChat in bible mode (the "Guide" AI verse-study
 * assistant) to enable stack navigation with swipe-back. Reached from the
 * "Discuss" affordance on verses. This is an AI feature, not social.
 */

import React, { useCallback } from 'react';
import AiBibleChat from '../components/AiBibleChat';

const BibleChatScreen = ({ navigation, route }) => {
  // Tapping a verse reference in the chat opens the reader at that verse
  // (same wiring as VerseDiscussScreen; without it the tap is a no-op)
  const handleNavigateToBible = useCallback((verseRef) => {
    // verseTapTs forces the reader's deep-link effect to re-fire even when
    // the same reference is tapped twice (the ref string alone wouldn't)
    navigation.navigate('BibleChapter', { verseRef, verseTapTs: Date.now() });
  }, [navigation]);

  return (
    <AiBibleChat
      visible={true}
      onClose={() => navigation.goBack()}
      mode="bible"
      asScreen={true}
      initialVerse={route?.params?.initialVerse || null}
      onNavigateToBible={handleNavigateToBible}
    />
  );
};

export default BibleChatScreen;

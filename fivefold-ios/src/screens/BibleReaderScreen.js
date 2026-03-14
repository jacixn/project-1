/**
 * Bible Reader Screen
 * 
 * Wrapper screen for BibleReader to enable stack navigation with swipe-back.
 */

import React, { useCallback } from 'react';
import BibleReader from '../components/BibleReader';

const BibleReaderScreen = ({ navigation, route }) => {
  const initialVerseReference = route?.params?.verseRef || null;

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleNavigateToAI = useCallback((verseContent) => {
    navigation.navigate('FriendChat', { initialVerse: verseContent });
  }, [navigation]);

  return (
    <BibleReader
      visible={true}
      onClose={handleClose}
      initialVerseReference={initialVerseReference}
      onNavigateToAI={handleNavigateToAI}
      asScreen={true}
    />
  );
};

export default BibleReaderScreen;

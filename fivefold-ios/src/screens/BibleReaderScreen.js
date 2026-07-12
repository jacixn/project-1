/**
 * Bible Reader Screen
 *
 * The books sheet: testaments and their book lists. Picking a book pushes a
 * BibleChapterScreen sheet on top of this one, so backing out of a chapter is
 * a real native dismiss rather than an internal view swap.
 */

import React, { useCallback } from 'react';
import BibleReader from '../components/BibleReader';

const BibleReaderScreen = ({ navigation, route }) => {
  // Only the { searchQuery } form reaches this screen; a plain verse reference
  // goes straight to BibleChapterScreen instead.
  const initialVerseReference = route?.params?.verseRef || null;

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <BibleReader
      visible={true}
      onClose={handleClose}
      initialVerseReference={initialVerseReference}
      onNavigateToAI={(verse) => navigation.navigate('BibleChat', { initialVerse: verse })}
      asScreen={true}
      navigation={navigation}
      screenMode="books"
    />
  );
};

export default BibleReaderScreen;

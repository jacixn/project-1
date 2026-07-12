/**
 * Bible Chapter Screen
 *
 * The reading sheet, presented over the books sheet (or straight over whatever
 * deep-linked to a verse). Its root view IS the chapter, so the native
 * pull-down and the back arrow both dismiss it; chapter/book switching inside
 * it happens in place, never by stacking more sheets.
 *
 * Params: { book, chapterNumber?, targetVerse? } when pushed from the books
 * sheet, or { verseRef, verseTapTs? } for a deep link like "Go to Verse".
 */

import React, { useCallback } from 'react';
import BibleReader from '../components/BibleReader';

const BibleChapterScreen = ({ navigation, route }) => {
  const {
    book = null,
    chapterNumber = null,
    targetVerse = null,
    verseRef = null,
    verseTapTs = null,
  } = route?.params || {};

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <BibleReader
      visible={true}
      onClose={handleClose}
      initialVerseReference={verseRef}
      verseNonce={verseTapTs}
      initialBook={book}
      initialChapterNumber={chapterNumber}
      initialTargetVerse={targetVerse}
      onNavigateToAI={(verse) => navigation.navigate('BibleChat', { initialVerse: verse })}
      asScreen={true}
      navigation={navigation}
      screenMode="verses"
    />
  );
};

export default BibleChapterScreen;

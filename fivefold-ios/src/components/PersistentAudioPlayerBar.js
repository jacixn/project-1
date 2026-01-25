/**
 * PersistentAudioPlayerBar
 * Keeps the audio player visible across screens while TTS is active.
 */

import React, { useEffect, useState } from 'react';
import AudioPlayerBar from './AudioPlayerBar';
import bibleAudioService from '../services/bibleAudioService';
import { hapticFeedback } from '../utils/haptics';

const getVerseNumber = (verse) => {
  if (!verse) return null;
  const num = parseInt(verse.number || verse.verse, 10);
  return Number.isNaN(num) ? null : num;
};

const PersistentAudioPlayerBar = ({ bottomOffset = 0, onNavigateToVerse }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(null);
  const [bookName, setBookName] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);

  const syncFromService = (state) => {
    if (!state) return;
    setIsPlaying(state.isPlaying);
    setIsPaused(state.isPaused);
    setIsLoading(state.isLoading || false);
    setAutoPlayEnabled(state.autoPlayEnabled);

    const verseObj = state.currentVerse?.verse || state.currentVerse;
    setCurrentVerse(verseObj || null);

    const context = bibleAudioService.getCurrentReadingContext?.() || {};
    const book = context.book || state.currentVerse?.book || '';
    const chapter = context.chapter || state.currentVerse?.chapter || 1;
    setBookName(book || '');
    setChapterNumber(chapter || 1);
  };

  useEffect(() => {
    // Initial sync
    syncFromService(bibleAudioService.getPlaybackState?.());

    const canSubscribe = typeof bibleAudioService.addPlaybackListener === 'function';
    let unsubscribePlayback = () => {};
    let unsubscribeVerse = () => {};
    let unsubscribeComplete = () => {};

    if (canSubscribe) {
      unsubscribePlayback = bibleAudioService.addPlaybackListener(syncFromService);
      unsubscribeVerse = bibleAudioService.addVerseChangeListener((verse) => {
        setCurrentVerse(verse);
      });
      unsubscribeComplete = bibleAudioService.addCompleteListener(() => {
        setCurrentVerse(null);
        setIsPlaying(false);
        setIsPaused(false);
        setAutoPlayEnabled(false);
      });
    } else {
      // Fallback for older instances (single listener support)
      const prevPlayback = bibleAudioService.onPlaybackStateChange;
      const prevVerse = bibleAudioService.onVerseChange;
      const prevComplete = bibleAudioService.onComplete;

      const playbackHandler = (state) => {
        if (typeof prevPlayback === 'function') prevPlayback(state);
        syncFromService(state);
      };
      const verseHandler = (verse, index) => {
        if (typeof prevVerse === 'function') prevVerse(verse, index);
        setCurrentVerse(verse);
      };
      const completeHandler = () => {
        if (typeof prevComplete === 'function') prevComplete();
        setCurrentVerse(null);
        setIsPlaying(false);
        setIsPaused(false);
        setAutoPlayEnabled(false);
      };

      bibleAudioService.onPlaybackStateChange = playbackHandler;
      bibleAudioService.onVerseChange = verseHandler;
      bibleAudioService.onComplete = completeHandler;

      unsubscribePlayback = () => {
        if (bibleAudioService.onPlaybackStateChange === playbackHandler) {
          bibleAudioService.onPlaybackStateChange = prevPlayback || null;
        }
      };
      unsubscribeVerse = () => {
        if (bibleAudioService.onVerseChange === verseHandler) {
          bibleAudioService.onVerseChange = prevVerse || null;
        }
      };
      unsubscribeComplete = () => {
        if (bibleAudioService.onComplete === completeHandler) {
          bibleAudioService.onComplete = prevComplete || null;
        }
      };
    }

    return () => {
      unsubscribePlayback();
      unsubscribeVerse();
      unsubscribeComplete();
      if (!canSubscribe) {
        unsubscribePlayback();
        unsubscribeVerse();
        unsubscribeComplete();
      }
    };
  }, []);

  const handleStop = async () => {
    hapticFeedback.buttonPress();
    await bibleAudioService.stop();
  };

  const handleToggleAutoPlay = async () => {
    hapticFeedback.buttonPress();
    if (autoPlayEnabled) {
      bibleAudioService.autoPlayEnabled = false;
      setAutoPlayEnabled(false);
      return;
    }

    const context = bibleAudioService.getCurrentReadingContext?.() || {};
    const verses = context.verses || [];
    const verseNum = getVerseNumber(currentVerse);
    if (!verses.length || !verseNum) {
      return;
    }

    const startIndex = verses.findIndex(v => (v.number || v.verse) === verseNum);
    if (startIndex === -1) return;

    setAutoPlayEnabled(true);
    await bibleAudioService.startAutoPlay({
      book: context.book || bookName,
      chapter: context.chapter || chapterNumber,
      verses,
      startIndex,
    });
  };

  const handleClose = async () => {
    hapticFeedback.buttonPress();
    await bibleAudioService.stop();
  };

  const handlePress = () => {
    // Navigate to the verse being read
    if (onNavigateToVerse && bookName && chapterNumber && currentVerse) {
      const verseNum = getVerseNumber(currentVerse);
      onNavigateToVerse({
        book: bookName,
        chapter: chapterNumber,
        verse: verseNum,
      });
    }
  };

  // Show bar when loading, playing, paused, or in auto-play mode
  const visible = !!currentVerse && (isLoading || isPlaying || isPaused || autoPlayEnabled);

  return (
    <AudioPlayerBar
      visible={visible}
      currentVerse={currentVerse}
      bookName={bookName}
      chapterNumber={chapterNumber}
      isLoading={isLoading}
      isPlaying={isPlaying}
      isPaused={isPaused}
      autoPlayEnabled={autoPlayEnabled}
      onStop={handleStop}
      onToggleAutoPlay={handleToggleAutoPlay}
      onClose={handleClose}
      onPress={handlePress}
      bottomOffset={bottomOffset}
    />
  );
};

export default PersistentAudioPlayerBar;

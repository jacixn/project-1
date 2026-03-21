import React, { useState, useCallback, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import PrayerDetailModal from '../components/PrayerDetailModal';
import { hapticFeedback } from '../utils/haptics';
import verseByReferenceService from '../services/verseByReferenceService';

const PrayerDetailScreen = ({ navigation, route }) => {
  const {
    prayer,
    canComplete: initialCanComplete = false,
    timeUntilAvailable: initialTimeUntilAvailable = null,
  } = route.params || {};

  const [fetchedVerses, setFetchedVerses] = useState({});
  const [bibleVersion, setBibleVersion] = useState('KJV');
  const [loadingVerses, setLoadingVerses] = useState(true);
  const [canComplete, setCanComplete] = useState(initialCanComplete);
  const [timeUntilAvailable, setTimeUntilAvailable] = useState(initialTimeUntilAvailable);
  const [simpleVerseText, setSimpleVerseText] = useState({});
  const [loadingSimple, setLoadingSimple] = useState({});

  useEffect(() => {
    if (!prayer?.verses) return;

    const loadVerses = async () => {
      try {
        setLoadingVerses(true);
        const version = await verseByReferenceService.getPreferredVersion();
        setBibleVersion(version.toUpperCase());

        const versesMap = {};
        for (const verse of prayer.verses) {
          try {
            const verseData = await verseByReferenceService.getVerseByReference(verse.reference, version);
            versesMap[verse.reference] = { text: verseData.text, version: verseData.version };
          } catch (err) {
            versesMap[verse.reference] = { text: verse.text || 'Unable to load verse', version: version.toUpperCase() };
          }
        }
        setFetchedVerses(versesMap);
      } catch (err) {
        console.error('PrayerDetailScreen: Error loading verses', err);
      } finally {
        setLoadingVerses(false);
      }
    };

    loadVerses();
  }, [prayer?.id]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('prayerCompletionStateChanged', (data) => {
      if (data.prayerId === prayer?.id) {
        setCanComplete(data.canComplete);
        setTimeUntilAvailable(data.timeUntilAvailable);
      }
    });
    return () => sub.remove();
  }, [prayer?.id]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDiscuss = useCallback((verse) => {
    navigation.navigate('FriendChat', {
      initialVerse: { text: verse.text, reference: verse.reference },
    });
  }, [navigation]);

  const handleNavigateToBible = useCallback((verseRef) => {
    navigation.navigate('BibleReader', { verseRef });
  }, [navigation]);

  const handleComplete = useCallback(() => {
    DeviceEventEmitter.emit('prayerCompleteFromScreen', { prayerId: prayer?.id });
    navigation.goBack();
  }, [navigation, prayer?.id]);

  const handleSimplify = useCallback(async (verseIndex) => {
    if (!prayer) return;

    const key = `${prayer.id}-${verseIndex}`;
    const verse = prayer.verses[verseIndex];

    if (simpleVerseText[key]) {
      setSimpleVerseText(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      hapticFeedback.light();
      return;
    }

    setLoadingSimple(prev => ({ ...prev, [key]: true }));
    hapticFeedback.light();

    try {
      const productionAiService = require('../services/productionAiService').default;
      const simplified = await productionAiService.simplifyBibleVerse(verse.text, verse.reference);
      setSimpleVerseText(prev => ({ ...prev, [key]: simplified }));
      setLoadingSimple(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      hapticFeedback.success();
    } catch (error) {
      console.error('Simplify error:', error);
      setLoadingSimple(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      hapticFeedback.error();
    }
  }, [prayer, simpleVerseText]);

  if (!prayer) return null;

  return (
    <PrayerDetailModal
      visible={true}
      asScreen
      onClose={handleClose}
      prayer={prayer}
      canComplete={canComplete}
      onComplete={handleComplete}
      onSimplify={handleSimplify}
      onDiscuss={handleDiscuss}
      onNavigateToBible={handleNavigateToBible}
      simpleVerseText={simpleVerseText}
      loadingSimple={loadingSimple}
      timeUntilAvailable={timeUntilAvailable}
      fetchedVerses={fetchedVerses}
      bibleVersion={bibleVersion}
      loadingVerses={loadingVerses}
    />
  );
};

export default PrayerDetailScreen;

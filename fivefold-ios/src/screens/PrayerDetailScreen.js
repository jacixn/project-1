import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrayerDetailModal from '../components/PrayerDetailModal';
import { hapticFeedback } from '../utils/haptics';
import verseByReferenceService from '../services/verseByReferenceService';

const REFLECTION_CACHE_KEY = 'prayer_reflection_cache';

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

  const [reflection, setReflection] = useState(null);
  const [loadingReflection, setLoadingReflection] = useState(false);
  const [reflectionLimited, setReflectionLimited] = useState(false);
  const reflectionRequested = useRef(false);

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
    if (loadingVerses || !prayer?.verses || prayer.verses.length < 2 || reflectionRequested.current) return;
    reflectionRequested.current = true;

    const verse1 = prayer.verses[0];
    const verse2 = prayer.verses[1];
    const v1Text = (fetchedVerses[verse1.reference]?.text || verse1.text || '').replace(/\s+/g, ' ').trim();
    const v2Text = (fetchedVerses[verse2.reference]?.text || verse2.text || '').replace(/\s+/g, ' ').trim();

    if (!v1Text || !v2Text) return;

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${prayer.id}_${today}`;

    const loadReflection = async () => {
      try {
        const cached = await AsyncStorage.getItem(REFLECTION_CACHE_KEY);
        if (cached) {
          const cacheMap = JSON.parse(cached);
          if (cacheMap[cacheKey]) {
            setReflection(cacheMap[cacheKey]);
            return;
          }
        }

        setLoadingReflection(true);
        const productionAiService = require('../services/productionAiService').default;
        const result = await productionAiService.generatePrayerReflection(
          v1Text, verse1.reference, v2Text, verse2.reference
        );

        if (result && result.rateLimited) {
          setReflectionLimited(true);
        } else if (result) {
          setReflection(result);
          const existing = cached ? JSON.parse(cached) : {};
          existing[cacheKey] = result;
          await AsyncStorage.setItem(REFLECTION_CACHE_KEY, JSON.stringify(existing));
        }
      } catch (err) {
        console.error('PrayerDetailScreen: Reflection error', err);
      } finally {
        setLoadingReflection(false);
      }
    };

    loadReflection();
  }, [loadingVerses, fetchedVerses, prayer?.id]);

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
      reflection={reflection}
      loadingReflection={loadingReflection}
      reflectionLimited={reflectionLimited}
    />
  );
};

export default PrayerDetailScreen;

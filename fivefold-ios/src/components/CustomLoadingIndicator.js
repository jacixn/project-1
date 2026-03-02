import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userStorage from '../utils/userStorage';

const getAnimSource = (animId) => {
  switch (animId) {
    case 'hamster': return require('../../assets/Run-Hamster.json');
    case 'cat':     return require('../../assets/Running-Cat.json');
    default:        return null;
  }
};

const getAnimSize = (animId) => {
  return animId === 'hamster' ? 80 : 120;
};

// ═══════════════════════════════════════════════════════════
// MODULE-LEVEL CACHE
// Fetched once, shared across ALL component instances.
// Available synchronously after the first fetch completes.
// ═══════════════════════════════════════════════════════════
let _cachedAnimId = null;      // null = not yet loaded
let _cachePromise = null;      // deduplicates concurrent fetches
let _cacheListeners = [];      // components waiting for the first fetch
let _hadUidOnLoad = false;     // tracks whether UID was available during cache load

const _loadAnimPreference = () => {
  if (_cachedAnimId !== null && _hadUidOnLoad) return Promise.resolve(_cachedAnimId);

  _cachePromise = Promise.all([
    userStorage.getRaw('fivefold_loading_animation'),
    AsyncStorage.getItem('app_splash_loading_animation'),
  ]).then(([uidScopedId, globalId]) => {
    _hadUidOnLoad = !!uidScopedId;
    const anim = uidScopedId || globalId || 'default';
    _cachedAnimId = anim;
    if (uidScopedId) {
      AsyncStorage.setItem('app_splash_loading_animation', anim).catch(() => {});
    }
    _cacheListeners.forEach(fn => fn(_cachedAnimId));
    _cacheListeners = [];
    return _cachedAnimId;
  }).catch(() => {
    _cachedAnimId = 'default';
    _cacheListeners.forEach(fn => fn(_cachedAnimId));
    _cacheListeners = [];
    return _cachedAnimId;
  });

  return _cachePromise;
};

/**
 * Call this when the user changes their loading animation in Customisation.
 * Pass the new animation ID to update the cache immediately.
 */
export const updateLoadingAnimCache = (newAnimId) => {
  _cachedAnimId = newAnimId || 'default';
  _hadUidOnLoad = true;
  _cachePromise = null;
};

/**
 * Call this to force a re-fetch (e.g. on user switch / sign-out).
 */
export const invalidateLoadingAnimCache = () => {
  _cachedAnimId = null;
  _cachePromise = null;
  _hadUidOnLoad = false;
};

// Start fetching immediately when this module is first imported.
// By the time any React component actually mounts and renders,
// the cache will very likely already be populated.
_loadAnimPreference();

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * CustomLoadingIndicator
 *
 * A drop-in replacement for ActivityIndicator that respects the user's
 * selected loading animation from Customisation.
 *
 * Props:
 *   - color: fallback color for the default ActivityIndicator (default: '#6366F1')
 *   - size: size for the default ActivityIndicator ('small' | 'large', default: 'large')
 *   - selectedAnim: if the parent already tracks the animation ID, pass it to skip cache lookup
 */
const CustomLoadingIndicator = ({ color = '#6366F1', size = 'large', selectedAnim }) => {
  // Resolve the animation ID synchronously if possible
  const resolvedSync = selectedAnim !== undefined ? selectedAnim : _cachedAnimId;
  const [animId, setAnimId] = useState(resolvedSync);

  useEffect(() => {
    if (selectedAnim !== undefined) {
      setAnimId(selectedAnim);
      return;
    }
    if (_cachedAnimId !== null && _hadUidOnLoad) {
      setAnimId(_cachedAnimId);
      return;
    }
    const listener = (id) => setAnimId(id);
    _cacheListeners.push(listener);
    _loadAnimPreference();

    return () => {
      _cacheListeners = _cacheListeners.filter(fn => fn !== listener);
    };
  }, [selectedAnim]);

  // Show the user's selected Lottie animation
  if (animId && animId !== 'default') {
    const source = getAnimSource(animId);
    if (source) {
      const dim = getAnimSize(animId);
      return (
        <LottieView
          source={source}
          autoPlay
          loop
          style={{ width: dim, height: dim }}
        />
      );
    }
  }

  // Fallback: standard iOS spinner
  return <ActivityIndicator size={size} color={color} />;
};

export default CustomLoadingIndicator;

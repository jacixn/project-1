import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userStorage from '../utils/userStorage';
import { getReferralCount } from '../services/referralService';

const LOADING_ANIM_GATES = { default: null, cat: 1, hamster: 3 };

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

const _loadAnimPreference = () => {
  if (_cachedAnimId !== null) return Promise.resolve(_cachedAnimId);
  if (_cachePromise) return _cachePromise;

  _cachePromise = Promise.all([
    userStorage.getRaw('fivefold_loading_animation'),
    getReferralCount(),
  ]).then(([id, count]) => {
    const anim = id || 'default';
    const req = LOADING_ANIM_GATES[anim];
    if (req !== null && req !== undefined && count < req) {
      _cachedAnimId = 'default';
    } else {
      _cachedAnimId = anim;
    }
    AsyncStorage.setItem('app_splash_loading_animation', _cachedAnimId).catch(() => {});
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
  _cachePromise = null;
};

/**
 * Call this to force a re-fetch (e.g. on user switch / sign-out).
 */
export const invalidateLoadingAnimCache = () => {
  _cachedAnimId = null;
  _cachePromise = null;
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
    // If parent passed it, always use that
    if (selectedAnim !== undefined) {
      setAnimId(selectedAnim);
      return;
    }
    // If cache is already populated, use it
    if (_cachedAnimId !== null) {
      setAnimId(_cachedAnimId);
      return;
    }
    // Otherwise wait for the in-flight fetch
    const listener = (id) => setAnimId(id);
    _cacheListeners.push(listener);
    // Ensure the fetch is running
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

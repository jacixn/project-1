import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// The controls that sit over an embedded YouTube video, in place of
// YouTube's own.
//
// The embed's chrome is a lot: channel avatar, video title, share, captions,
// settings, a "More videos" thumbnail, the YouTube wordmark, a scrub bar and
// a large centre button, all of it over the picture. None of it can be turned
// off by a parameter (modestbranding stopped doing anything in 2023), but all
// of it is drawn in response to a pointer, so the player page hands the
// iframe no pointer events at all and switches `controls` off. That leaves a
// clean picture and nothing to drive it with, which is what this replaces:
// tap anywhere to play or pause, and a hairline at the bottom that shows
// progress and can be tapped to seek.
//
// Deliberately quiet. A trailer or a form demonstration is a few minutes at
// most, so the controls stay out of the picture until they are asked for.
// Kept byte-identical between EyeCandy and Biblely; edit both.

const FLASH_MS = 620;
const TRACK_H = 3;
const TOUCH_H = 22;
// YouTube draws its title bar and its wordmark row over the picture for the
// first few seconds of playback, whatever the player vars say, and nothing
// turns that off. Measured against a real WKWebView, it clears about three
// seconds after playback starts. These two bands cover exactly the strips it
// occupies until then, so the opening is plain picture rather than somebody
// else's branding. Nothing is scaled or cropped to achieve it: the bands are
// drawn over the same pixels YouTube was already covering, and they go.
const INTRO_COVER_MS = 4200;
const INTRO_FADE_MS = 380;
const BAND = 0.14;

const PlayerChrome = ({ width, height, playing, at = 0, of = 0, onToggle, onSeek }) => {
  const [flash, setFlash] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  // Covers YouTube's opening chrome, then lifts for good.
  const [covering, setCovering] = useState(true);
  const cover = useRef(new Animated.Value(1)).current;
  const startedRef = useRef(false);
  const coverTimer = useRef(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (coverTimer.current) clearTimeout(coverTimer.current);
  }, []);

  useEffect(() => {
    if (!playing || startedRef.current) return;
    startedRef.current = true;
    coverTimer.current = setTimeout(() => {
      Animated.timing(cover, { toValue: 0, duration: INTRO_FADE_MS, useNativeDriver: true })
        .start(() => setCovering(false));
    }, INTRO_COVER_MS);
  }, [playing, cover]);

  const show = (icon) => {
    setFlash(icon);
    fade.setValue(1);
    if (timer.current) clearTimeout(timer.current);
    // Pausing leaves the glyph up: a still picture with nothing on it gives
    // the viewer no sign that the video is theirs to restart.
    if (icon === 'play') return;
    timer.current = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setFlash(null));
    }, FLASH_MS);
  };

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    show(playing ? 'play' : 'pause');
    onToggle?.();
  };

  const seek = (e) => {
    if (!of) return;
    const x = e?.nativeEvent?.locationX;
    if (typeof x !== 'number') return;
    Haptics.selectionAsync().catch(() => {});
    const fraction = Math.max(0, Math.min(1, x / Math.max(1, width)));
    onSeek?.(fraction * of);
  };

  const progress = of > 0 ? Math.max(0, Math.min(1, at / of)) : 0;

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]}>
      {covering ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: cover }]} pointerEvents="none">
          <View style={[styles.band, { top: 0, height: Math.round(height * BAND) }]} />
          <View style={[styles.band, { bottom: 0, height: Math.round(height * BAND) }]} />
        </Animated.View>
      ) : null}

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause' : 'Play'}
      />

      {flash ? (
        <Animated.View style={[styles.glyphWrap, { opacity: fade }]} pointerEvents="none">
          <Ionicons
            name={flash === 'play' ? 'play' : 'pause'}
            size={54}
            color="#fff"
            style={styles.glyph}
          />
        </Animated.View>
      ) : null}

      <Pressable
        style={[styles.touchBar, { height: TOUCH_H }]}
        onPress={seek}
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
      >
        <View style={[styles.track, { height: TRACK_H }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, height: TRACK_H }]} />
        </View>
      </Pressable>

      {!playing && of > 0 ? (
        <View style={styles.timeWrap} pointerEvents="none">
          <Text style={styles.time} allowFontScaling={false}>
            {clock(at)} / {clock(of)}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const clock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${m}:${String(rest).padStart(2, '0')}`;
};

export default PlayerChrome;

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#000',
  },
  glyphWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No disc behind the glyph: a shadow is enough to keep it readable over a
  // bright frame, and it leaves the picture alone.
  glyph: {
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  touchBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  fill: {
    backgroundColor: '#fff',
  },
  timeWrap: {
    position: 'absolute',
    left: 12,
    bottom: TOUCH_H + 4,
  },
  time: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});

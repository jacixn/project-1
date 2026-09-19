import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import ExerciseVideoPlayer, { VideoUnavailable } from './ExerciseVideoPlayer';
import { getExerciseVideos, exerciseSearchUrl } from '../services/exerciseVideoService';
import { cleanTitle } from '../utils/youtubeSearch';

// "Show me how this is done", answered inside Biblely. Tapping used to hand
// the user to the YouTube app and lose their place in the workout.
//
// Several candidates are loaded rather than one, because a video's owner can
// turn embedding off and the only way to find out is to try: a refused video
// is dropped and the next one plays. YouTube is still one tap away, it is
// just no longer the only option.

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAYER_H = Math.round((SCREEN_WIDTH * 9) / 16);

const runtime = (seconds) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m >= 60
    ? `${Math.floor(m / 60)}h ${m % 60}m`
    : `${m}:${String(s).padStart(2, '0')}`;
};

const ExerciseVideoSheet = ({ visible, exerciseName, onClose }) => {
  const { theme, isDark } = useTheme();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refused, setRefused] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const [playerFault, setPlayerFault] = useState(false);

  const playable = useMemo(() => videos.filter((v) => !refused.includes(v.id)), [videos, refused]);
  const current = useMemo(() => playable.find((v) => v.id === playingId) || null, [playable, playingId]);

  // Each open starts clean: a different exercise, and any video refused last
  // time deserves another try on a different connection.
  useEffect(() => {
    if (!visible || !exerciseName) return undefined;
    let alive = true;
    setLoading(true);
    setVideos([]);
    setRefused([]);
    setPlayingId(null);
    setPlayerFault(false);
    getExerciseVideos(exerciseName)
      .then((found) => {
        if (!alive) return;
        setVideos(found);
        setPlayingId(found[0]?.id || null);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [visible, exerciseName]);

  // This video will not play here: drop it and move to the next candidate. A
  // fault is the page itself failing, which every candidate would hit the
  // same way, so the list stops rather than walking all eight to the same end.
  const onUnplayable = useCallback((reason, fault) => {
    if (fault) { setPlayerFault(true); setPlayingId(null); return; }
    setRefused((prev) => {
      const id = playingId;
      if (!id || prev.includes(id)) return prev;
      const next = [...prev, id];
      const rest = videos.filter((v) => !next.includes(v.id));
      setPlayingId(rest[0]?.id || null);
      return next;
    });
  }, [playingId, videos]);

  const openOnYouTube = useCallback(() => {
    hapticFeedback.light();
    const url = current
      ? `https://www.youtube.com/watch?v=${current.id}`
      : exerciseSearchUrl(exerciseName);
    Linking.openURL(url).catch(() => {});
  }, [current, exerciseName]);

  const pick = (id) => {
    hapticFeedback.selection();
    setPlayingId(id);
  };

  const others = playable.filter((v) => v.id !== playingId);
  const subtle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: divider }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {exerciseName}
            </Text>
            <Text style={[styles.headerSub, { color: subtle }]} numberOfLines={1}>
              How it is done
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.done, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={[styles.stage, { height: PLAYER_H }]}>
            {loading ? (
              <View style={styles.stageCenter}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.stageNote}>Finding a tutorial</Text>
              </View>
            ) : current ? (
              <ExerciseVideoPlayer
                key={current.id}
                videoId={current.id}
                width={SCREEN_WIDTH}
                height={PLAYER_H}
                playing={!!visible}
                onUnplayable={onUnplayable}
              />
            ) : (
              <VideoUnavailable
                width={SCREEN_WIDTH}
                height={PLAYER_H}
                message={
                  playerFault
                    ? 'Videos cannot play in this version of the app.'
                    : videos.length
                      ? 'None of these tutorials can be played here.'
                      : 'No tutorial could be found for this exercise.'
                }
                onOpenYouTube={openOnYouTube}
              />
            )}
          </View>

          {current ? (
            <View style={styles.nowPlaying}>
              <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                {cleanTitle(current.title)}
              </Text>
              <Text style={[styles.videoMeta, { color: subtle }]} numberOfLines={1}>
                {[current.channel, runtime(current.seconds)].filter(Boolean).join('  ')}
              </Text>
            </View>
          ) : null}

          {others.length ? (
            <View style={styles.listSection}>
              <Text style={[styles.sectionLabel, { color: subtle }]}>More tutorials</Text>
              {others.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => pick(v.id)}
                  activeOpacity={0.6}
                  style={[styles.row, { borderBottomColor: divider }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${cleanTitle(v.title)}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>
                      {cleanTitle(v.title)}
                    </Text>
                    <Text style={[styles.rowMeta, { color: subtle }]} numberOfLines={1}>
                      {[v.channel, runtime(v.seconds)].filter(Boolean).join('  ')}
                    </Text>
                  </View>
                  <MaterialIcons name="play-arrow" size={22} color={theme.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TouchableOpacity onPress={openOnYouTube} activeOpacity={0.6} style={styles.youtubeRow}>
            <Text style={[styles.youtubeText, { color: subtle }]}>Open on YouTube</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default ExerciseVideoSheet;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSub: { fontSize: 13, fontWeight: '500', marginTop: 1 },
  done: { fontSize: 16, fontWeight: '600' },
  stage: { width: SCREEN_WIDTH, backgroundColor: '#000' },
  stageCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stageNote: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 10 },
  nowPlaying: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  videoTitle: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  videoMeta: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  listSection: { marginTop: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  rowMeta: { fontSize: 12.5, fontWeight: '500', marginTop: 3 },
  youtubeRow: { paddingHorizontal: 16, paddingTop: 20, alignItems: 'center' },
  youtubeText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Switch,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width: SW } = Dimensions.get('window');
const THEME_CARD_W = (SW - 52) / 2;

// ── Storage keys ──────────────────────────────────────────────
const STREAK_ANIM_KEY = 'fivefold_streak_animation';
const BLUETICK_ENABLED_KEY = 'fivefold_bluetick_enabled';

// ── Achievement gate per item ─────────────────────────────────
const ANIM_GATES = {
  fire1:      null,
  fire2:      { id: 'app_streak_15', title: 'Fifteen Day Fire', desc: 'Maintain a 15-day streak', icon: 'local-fire-department', color: '#FF6B00' },
  redcar:     { id: 'chars_5',       title: 'History Buff',     desc: 'Read 5 Bible characters',  icon: 'person',               color: '#E53935' },
  bulb:       { id: 'read_25',       title: 'Daily Reader',     desc: 'Read 25 verses',           icon: 'menu-book',            color: '#FFC107' },
  amongus:    { id: 'tasks_25',      title: 'Productivity Pro', desc: 'Complete 25 tasks',         icon: 'check-circle',         color: '#4CAF50' },
  lightning:  { id: 'saved_25',       title: 'Verse Vault',      desc: 'Save 25 verses',            icon: 'bookmark',             color: '#7C4DFF' },
};

const THEME_GATES = {
  'biblely-jesusnlambs': null,
  'blush-bloom':   { id: 'read_50',      title: 'Scripture Seeker', desc: 'Read 50 verses',       icon: 'menu-book',         color: '#EC407A' },
  'eterna':        { id: 'app_streak_15', title: 'Fifteen Day Fire', desc: '15-day app streak',    icon: 'local-fire-department', color: '#FF6B00' },
  'sailormoon':    { id: 'prayers_5',     title: 'Faithful Five',    desc: 'Complete 5 prayers',    icon: 'self-improvement',  color: '#AB47BC' },
  'biblely-light': { id: 'saved_5',       title: 'Treasure Hunter',  desc: 'Save 5 verses',        icon: 'bookmark',          color: '#42A5F5' },
  'cresvia':       { id: 'tasks_10',      title: 'Task Machine',     desc: 'Complete 10 tasks',     icon: 'check-circle',      color: '#7C4DFF' },
  'spiderman':     { id: 'audio_5',       title: 'Audio Explorer',   desc: 'Listen to 5 audios',    icon: 'headphones',        color: '#EF5350' },
  'biblely-classic':{ id: 'saved_10',     title: 'Scripture Keeper',  desc: 'Save 10 verses',       icon: 'bookmark',          color: '#FFA726' },
};

// ── Badge definitions (each with its own gate) ───────────────
const BADGES = [
  {
    id: 'verified',
    name: 'Blue Tick',
    desc: 'Verified badge next to your name',
    icon: 'verified',
    image: null,
    color: '#1DA1F2',
    gradient: ['#1DA1F2', '#0D8BD9'],
    gate: { id: 'saved_5', title: 'Treasure Hunter', desc: 'Save 5 verses', icon: 'bookmark', color: '#1DA1F2' },
  },
  {
    id: 'biblely',
    name: 'Biblely Badge',
    desc: 'Exclusive founder-level badge',
    icon: null,
    image: require('../../assets/logo.png'),
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    gate: { id: 'app_streak_30', title: 'Monthly Devotion', desc: '30-day app streak', icon: 'local-fire-department', color: '#F59E0B' },
  },
];

// ── Streak animation definitions ──────────────────────────────
const STREAK_ANIMS = [
  { id: 'fire1',     name: 'Holy Fire',  source: require('../../assets/fire-animation.json'),        colors: ['#FF6B00', '#FF9500'] },
  { id: 'fire2',     name: 'Inferno',    source: require('../../assets/Fire2.json'),                 colors: ['#FF3D00', '#FF6E40'] },
  { id: 'redcar',    name: 'Red Car',    source: require('../../assets/Red-Car.json'),               colors: ['#E53935', '#EF5350'] },
  { id: 'bulb',      name: 'Bright Idea', source: require('../../assets/Bulb Transparent.json'),     colors: ['#FFC107', '#FFD54F'] },
  { id: 'amongus',   name: 'Among Us',   source: require('../../assets/Loading 50 _ Among Us.json'), colors: ['#4CAF50', '#66BB6A'] },
  { id: 'lightning', name: 'Lightning',   source: require('../../assets/Lightning.json'),             colors: ['#7C4DFF', '#B388FF'] },
];

// ═══════════════════════════════════════════════════════════════
const CustomisationScreen = () => {
  const navigation = useNavigation();
  const {
    theme, isDark,
    isBlushTheme, isCresviaTheme, isEternaTheme,
    isSpidermanTheme, isFaithTheme, isSailormoonTheme, isBiblelyTheme,
    changeTheme, biblelyWallpapers, selectedWallpaperIndex, changeWallpaper,
    themeWallpapers,
  } = useTheme();

  const [selectedAnim, setSelectedAnim] = useState('fire1');
  const [badgeToggles, setBadgeToggles] = useState({}); // { verified: true, biblely: true }
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [permanentFlags, setPermanentFlags] = useState({});

  // Locked popup state
  const [lockedPopup, setLockedPopup] = useState(null); // { itemName, gate }
  const popupScale = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  // entrance animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  const s4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
    Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    setTimeout(() => Animated.spring(s1, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start(), 80);
    setTimeout(() => Animated.spring(s2, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start(), 200);
    setTimeout(() => Animated.spring(s3, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start(), 320);
    setTimeout(() => Animated.spring(s4, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start(), 440);
  }, []);

  const load = async () => {
    try {
      const [animId, badgeTogglesRaw, oldBtVal, achRaw] = await Promise.all([
        AsyncStorage.getItem(STREAK_ANIM_KEY),
        AsyncStorage.getItem('fivefold_badge_toggles'),
        AsyncStorage.getItem(BLUETICK_ENABLED_KEY), // migrate old key
        AsyncStorage.getItem('fivefold_achievements_unlocked'),
      ]);
      if (animId) setSelectedAnim(animId);

      // Load badge toggles (migrate old bluetick key if needed)
      let toggles = badgeTogglesRaw ? JSON.parse(badgeTogglesRaw) : null;
      if (!toggles) {
        // First time — migrate from old key
        const btOn = oldBtVal !== 'false'; // default true
        toggles = { verified: btOn, biblely: true };
        await AsyncStorage.setItem('fivefold_badge_toggles', JSON.stringify(toggles));
      }
      setBadgeToggles(toggles);

      const ids = achRaw ? JSON.parse(achRaw) : [];
      setUnlockedIds(ids);

      const allGateIds = [
        ...Object.values(ANIM_GATES).filter(Boolean).map(g => g.id),
        ...Object.values(THEME_GATES).filter(Boolean).map(g => g.id),
        ...BADGES.map(b => b.gate.id),
      ];
      const uniqueIds = [...new Set(allGateIds)];
      const flagKeys = uniqueIds.map(id => `fivefold_unlock_${id}`);
      const flagValues = await AsyncStorage.multiGet(flagKeys);
      const flags = {};
      flagValues.forEach(([key, val]) => {
        const achId = key.replace('fivefold_unlock_', '');
        if (val === 'true' || ids.includes(achId)) {
          flags[achId] = true;
          if (val !== 'true' && ids.includes(achId)) {
            AsyncStorage.setItem(key, 'true');
          }
        }
      });
      setPermanentFlags(flags);
    } catch (e) {
      console.warn('[Customisation] load error:', e);
    }
  };

  const isUnlocked = (gate) => {
    if (!gate) return true;
    return permanentFlags[gate.id] || unlockedIds.includes(gate.id);
  };

  // ── Show locked popup ───────────────────────────────────────
  const showLockedPopup = (itemName, gate) => {
    popupScale.setValue(0);
    popupOpacity.setValue(0);
    setLockedPopup({ itemName, gate });
    Animated.parallel([
      Animated.spring(popupScale, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
      Animated.timing(popupOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const hideLockedPopup = () => {
    Animated.parallel([
      Animated.timing(popupScale, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(popupOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setLockedPopup(null));
  };

  const pickAnim = async (id) => {
    const gate = ANIM_GATES[id];
    if (!isUnlocked(gate)) {
      const anim = STREAK_ANIMS.find(a => a.id === id);
      showLockedPopup(anim?.name || 'Animation', gate);
      return;
    }
    setSelectedAnim(id);
    await AsyncStorage.setItem(STREAK_ANIM_KEY, id);
  };

  const toggleBadge = async (badgeId, val) => {
    const updated = { ...badgeToggles, [badgeId]: val };
    setBadgeToggles(updated);
    await AsyncStorage.setItem('fivefold_badge_toggles', JSON.stringify(updated));
    // Also keep old key in sync for backward compat
    if (badgeId === 'verified') {
      await AsyncStorage.setItem(BLUETICK_ENABLED_KEY, val.toString());
    }
  };

  const pickTheme = (t) => {
    const gate = THEME_GATES[t.id];
    if (!isUnlocked(gate)) {
      showLockedPopup(t.name + ' Theme', gate);
      return;
    }
    if (t.isBiblelyVariant) {
      changeTheme('biblely');
      changeWallpaper(t.wallpaperIndex);
    } else {
      changeTheme(t.id);
    }
  };

  // ── Theme data ──────────────────────────────────────────────
  const allThemes = [
    { id: 'biblely-jesusnlambs', name: 'Jesus & Lambs', wallpaper: biblelyWallpapers?.[1]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 1, isBiblelyVariant: true, wallpaperIndex: 1, mode: 'Dark' },
    { id: 'blush-bloom',        name: 'Blush Bloom',   wallpaper: themeWallpapers?.['blush-bloom'], isActive: isBlushTheme, mode: 'Light' },
    { id: 'eterna',             name: 'Eterna',         wallpaper: themeWallpapers?.['eterna'], isActive: isEternaTheme, mode: 'Light' },
    { id: 'sailormoon',         name: 'Sailor Moon',    wallpaper: themeWallpapers?.['sailormoon'], isActive: isSailormoonTheme, mode: 'Light' },
    { id: 'biblely-light',      name: 'Biblely',        wallpaper: biblelyWallpapers?.[0]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 0, isBiblelyVariant: true, wallpaperIndex: 0, mode: 'Light' },
    { id: 'cresvia',            name: 'Cresvia',        wallpaper: themeWallpapers?.['cresvia'], isActive: isCresviaTheme, mode: 'Dark' },
    { id: 'spiderman',          name: 'Spiderman',      wallpaper: themeWallpapers?.['spiderman'], isActive: isSpidermanTheme, mode: 'Dark' },
    { id: 'biblely-classic',    name: 'Classic',         wallpaper: biblelyWallpapers?.[2]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 2, isBiblelyVariant: true, wallpaperIndex: 2, mode: 'Dark' },
  ];

  // ── Colors ──────────────────────────────────────────────────
  const tx = theme.text;
  const tx2 = theme.textSecondary;
  const bg = theme.background;
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.025)';
  const bdr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  // ═══════════════════════════════════════════════════════════
  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      {/* Header */}
      <Animated.View style={[st.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} style={[st.backBtn, { backgroundColor: cardBg, borderColor: bdr }]}>
          <MaterialIcons name="arrow-back-ios" size={18} color={tx} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[st.headerTitle, { color: tx }]}>Customisation</Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── STREAK ANIMATIONS ──────────────────────────── */}
        <AnimSection anim={s1}>
          <SectionHeader icon="local-fire-department" iconBg="#FF6B0020" iconColor="#FF8C00" title="Streak Animation" subtitle="Your daily streak effect" textColor={tx} subtitleColor={tx2} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.animRow} decelerationRate="fast">
            {STREAK_ANIMS.map((a) => {
              const gate = ANIM_GATES[a.id];
              const unlocked = isUnlocked(gate);
              const active = selectedAnim === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.8}
                  onPress={() => pickAnim(a.id)}
                  style={[st.animCard, {
                    borderColor: active ? a.colors[0] : bdr,
                    borderWidth: active ? 2.5 : 1,
                    backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff',
                  }]}
                >
                  <LinearGradient colors={active ? a.colors : [bdr, bdr]} style={st.animStrip} />
                  <View style={st.animLottie}>
                    <LottieView source={a.source} autoPlay loop style={{ width: 80, height: 80 }} />
                  </View>
                  <Text style={[st.animName, { color: tx }]}>{a.name}</Text>

                  {!unlocked ? (
                    <View style={st.animLockWrap}>
                      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.35)']} style={st.animLockOverlay}>
                        <MaterialIcons name="lock" size={22} color="#fff" />
                      </LinearGradient>
                      <View style={[st.animGateBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        <MaterialIcons name="emoji-events" size={10} color="#FFD700" />
                        <Text style={st.animGateText} numberOfLines={1}>{gate.title}</Text>
                      </View>
                    </View>
                  ) : active ? (
                    <LinearGradient colors={a.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.activeBadge}>
                      <MaterialIcons name="check" size={11} color="#fff" />
                      <Text style={st.activeText}>Active</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[st.freeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[st.freeText, { color: tx2 }]}>Tap to use</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </AnimSection>

        {/* ── BADGES ──────────────────────────────────── */}
        <AnimSection anim={s2}>
          <SectionHeader icon="workspace-premium" iconBg="#F59E0B20" iconColor="#F59E0B" title="Badges" subtitle="Show off next to your name" textColor={tx} subtitleColor={tx2} />

          <View style={{ gap: 10 }}>
            {BADGES.map((badge) => {
              const unlocked = isUnlocked(badge.gate);
              const toggledOn = badgeToggles[badge.id] !== false; // default true

              if (!unlocked) {
                return (
                  <TouchableOpacity
                    key={badge.id}
                    activeOpacity={0.8}
                    onPress={() => showLockedPopup(badge.name, badge.gate)}
                    style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: bdr }]}
                  >
                    {/* Left — lock icon in badge color */}
                    <LinearGradient colors={badge.gradient} style={st.badgeIconGrad}>
                      <MaterialIcons name="lock" size={20} color="#fff" />
                    </LinearGradient>
                    {/* Info */}
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[st.badgeName, { color: tx }]}>{badge.name}</Text>
                      <Text style={[st.badgeDesc, { color: tx2 }]}>{badge.desc}</Text>
                    </View>
                    {/* Achievement hint */}
                    <View style={[st.badgeGateChip, { backgroundColor: badge.color + '15' }]}>
                      <MaterialIcons name="emoji-events" size={12} color={badge.color} />
                      <Text style={[st.badgeGateChipText, { color: badge.color }]}>{badge.gate.title}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <View
                  key={badge.id}
                  style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: badge.color + '30' }]}
                >
                  {/* Badge icon/image */}
                  <LinearGradient colors={badge.gradient} style={st.badgeIconGrad}>
                    {badge.image ? (
                      <Image source={badge.image} style={{ width: 26, height: 26, borderRadius: 6 }} resizeMode="contain" />
                    ) : (
                      <MaterialIcons name={badge.icon} size={22} color="#fff" />
                    )}
                  </LinearGradient>
                  {/* Info */}
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[st.badgeName, { color: tx }]}>{badge.name}</Text>
                    <Text style={[st.badgeDesc, { color: tx2 }]}>
                      {toggledOn ? 'Visible on your profile' : 'Hidden from your profile'}
                    </Text>
                  </View>
                  {/* Toggle */}
                  <Switch
                    value={toggledOn}
                    onValueChange={(val) => toggleBadge(badge.id, val)}
                    trackColor={{ false: isDark ? '#333' : '#ddd', true: badge.color }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}
          </View>
        </AnimSection>

        {/* ── THEMES ─────────────────────────────────────── */}
        <AnimSection anim={s3}>
          <SectionHeader icon="palette" iconBg={`${theme.primary}20`} iconColor={theme.primary} title="Themes" subtitle="Change your app's look" textColor={tx} subtitleColor={tx2} />

          <View style={st.themeGrid}>
            {allThemes.map((t) => {
              const gate = THEME_GATES[t.id];
              const unlocked = isUnlocked(gate);
              const active = t.isActive;

              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.85}
                  onPress={() => pickTheme(t)}
                  style={[st.themeCard, {
                    borderColor: active ? theme.primary : bdr,
                    borderWidth: active ? 2.5 : 1,
                  }]}
                >
                  {t.wallpaper ? (
                    <Image source={t.wallpaper} style={st.themeImg} resizeMode="cover" />
                  ) : (
                    <View style={[st.themeImg, { backgroundColor: theme.surface }]} />
                  )}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={st.themeGrad} />

                  {!unlocked && (
                    <View style={st.themeLock}>
                      <View style={st.themeLockCircle}>
                        <MaterialIcons name="lock" size={18} color="#fff" />
                      </View>
                      <View style={st.themeGateBadge}>
                        <MaterialIcons name="emoji-events" size={10} color="#FFD700" />
                        <Text style={st.themeGateText} numberOfLines={1}>{gate.title}</Text>
                      </View>
                    </View>
                  )}

                  {active && unlocked && (
                    <View style={[st.themeCheck, { backgroundColor: theme.primary }]}>
                      <MaterialIcons name="check" size={15} color="#fff" />
                    </View>
                  )}

                  <View style={st.themeMeta}>
                    <Text style={st.themeName}>{t.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={st.themeMode}>{t.mode}</Text>
                      {!gate && (
                        <View style={st.themeFreeBadge}>
                          <Text style={st.themeFreeText}>FREE</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimSection>

        {/* ── APP ICON ─────────────────────────────────────── */}
        <AnimSection anim={s4}>
          <SectionHeader icon="phone-iphone" iconBg="#6366F120" iconColor="#6366F1" title="App Icon" subtitle="Customise your home screen icon" textColor={tx} subtitleColor={tx2} />

          <View style={{
            backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: bdr,
            padding: 24,
            alignItems: 'center',
          }}>
            {/* Preview of current icon */}
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 52, height: 52, borderRadius: 12 }}
                resizeMode="contain"
              />
            </View>

            {/* Coming Soon badge */}
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>Coming Soon</Text>
            </LinearGradient>

            <Text style={{ color: tx2, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
              Choose from multiple app icons{'\n'}to personalise your home screen
            </Text>
          </View>
        </AnimSection>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── LOCKED POPUP MODAL ────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal visible={!!lockedPopup} transparent animationType="none" onRequestClose={hideLockedPopup}>
        <TouchableOpacity activeOpacity={1} onPress={hideLockedPopup} style={st.popupBackdrop}>
          <Animated.View style={[st.popupCard, {
            backgroundColor: isDark ? '#1A1A2E' : '#fff',
            transform: [{ scale: popupScale }],
            opacity: popupOpacity,
          }]}>
            {/* Gradient top accent */}
            <LinearGradient
              colors={lockedPopup?.gate?.color ? [lockedPopup.gate.color, lockedPopup.gate.color + '80'] : ['#FF6B00', '#FF950080']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.popupAccent}
            />

            {/* Lock icon */}
            <View style={[st.popupIconWrap, { backgroundColor: (lockedPopup?.gate?.color || '#FF6B00') + '18' }]}>
              <LinearGradient
                colors={[lockedPopup?.gate?.color || '#FF6B00', (lockedPopup?.gate?.color || '#FF6B00') + 'CC']}
                style={st.popupIconGrad}
              >
                <MaterialIcons name="lock" size={28} color="#fff" />
              </LinearGradient>
            </View>

            {/* Item name */}
            <Text style={[st.popupItemName, { color: tx }]}>
              {lockedPopup?.itemName}
            </Text>
            <Text style={[st.popupLocked, { color: tx2 }]}>is locked</Text>

            {/* Divider */}
            <View style={[st.popupDivider, { backgroundColor: bdr }]} />

            {/* Achievement requirement */}
            <Text style={[st.popupUnlockLabel, { color: tx2 }]}>UNLOCK BY EARNING</Text>

            <View style={[st.popupAchCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: bdr }]}>
              <View style={[st.popupAchIcon, { backgroundColor: (lockedPopup?.gate?.color || '#FF6B00') + '20' }]}>
                <MaterialIcons name={lockedPopup?.gate?.icon || 'emoji-events'} size={22} color={lockedPopup?.gate?.color || '#FF6B00'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.popupAchTitle, { color: tx }]}>
                  {lockedPopup?.gate?.title}
                </Text>
                <Text style={[st.popupAchDesc, { color: tx2 }]}>
                  {lockedPopup?.gate?.desc}
                </Text>
              </View>
              <MaterialIcons name="emoji-events" size={18} color="#FFD700" />
            </View>

            {/* Dismiss button */}
            <TouchableOpacity onPress={hideLockedPopup} style={[st.popupBtn, { backgroundColor: lockedPopup?.gate?.color || '#FF6B00' }]}>
              <Text style={st.popupBtnText}>Got it</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// ── HELPER COMPONENTS ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const AnimSection = ({ anim, children }) => (
  <Animated.View style={{
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  }}>
    {children}
  </Animated.View>
);

const SectionHeader = ({ icon, iconBg, iconColor, title, subtitle, textColor, subtitleColor }) => (
  <View style={st.secHead}>
    <View style={[st.secIcon, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon} size={20} color={iconColor} />
    </View>
    <View>
      <Text style={[st.secTitle, { color: textColor }]}>{title}</Text>
      <Text style={[st.secSub, { color: subtitleColor }]}>{subtitle}</Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// ── STYLES ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const st = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  // Section header
  secHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 24, gap: 12 },
  secIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  secSub: { fontSize: 12, fontWeight: '400', marginTop: 1 },

  // Streak animations
  animRow: { flexDirection: 'row', gap: 10, paddingRight: 16 },
  animCard: { width: SW * 0.32, borderRadius: 18, overflow: 'hidden', paddingBottom: 10, alignItems: 'center' },
  animStrip: { width: '100%', height: 3 },
  animLottie: { paddingTop: 12, paddingBottom: 6, alignItems: 'center', justifyContent: 'center' },
  animName: { fontSize: 13, fontWeight: '700', marginBottom: 6 },

  animLockWrap: { ...StyleSheet.absoluteFillObject, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  animLockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  animGateBadge: { position: 'absolute', bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  animGateText: { fontSize: 9, fontWeight: '700', color: '#FFD700' },

  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  activeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  freeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  freeText: { fontSize: 10, fontWeight: '600' },

  // Verified badge
  // Badges
  badgeCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  badgeIconGrad: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeName: { fontSize: 15, fontWeight: '700' },
  badgeDesc: { fontSize: 11, fontWeight: '400', marginTop: 2 },
  badgeGateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  badgeGateChipText: { fontSize: 9, fontWeight: '700' },

  // Themes grid
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: { width: THEME_CARD_W, height: THEME_CARD_W * 1.5, borderRadius: 16, overflow: 'hidden' },
  themeImg: { width: '100%', height: '100%' },
  themeGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  themeLock: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  themeLockCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  themeGateBadge: { position: 'absolute', bottom: 38, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  themeGateText: { fontSize: 9, fontWeight: '700', color: '#FFD700' },
  themeCheck: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  themeMeta: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  themeName: { fontSize: 13, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  themeMode: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 1 },
  themeFreeBadge: { backgroundColor: 'rgba(16,185,129,0.25)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  themeFreeText: { fontSize: 8, fontWeight: '800', color: '#10B981', letterSpacing: 0.5 },

  // ── Locked popup ────────────────────────────────────────────
  popupBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  popupCard: {
    width: '100%', borderRadius: 24, overflow: 'hidden',
    alignItems: 'center', paddingTop: 0, paddingBottom: 24, paddingHorizontal: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
  },
  popupAccent: { width: '100%', height: 4 },
  popupIconWrap: {
    width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 16,
  },
  popupIconGrad: {
    width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  popupItemName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  popupLocked: { fontSize: 14, fontWeight: '500', marginTop: 2, marginBottom: 16 },

  popupDivider: { width: '80%', height: 1, marginBottom: 16 },

  popupUnlockLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },

  popupAchCard: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    padding: 14, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 20,
  },
  popupAchIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  popupAchTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  popupAchDesc: { fontSize: 12, fontWeight: '400' },

  popupBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  popupBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CustomisationScreen;

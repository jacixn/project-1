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
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import userStorage from '../utils/userStorage';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { getReferralCount } from '../services/referralService';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Storage keys ──────────────────────────────────────────
const STREAK_ANIM_KEY = 'fivefold_streak_animation';
const BLUETICK_ENABLED_KEY = 'fivefold_bluetick_enabled';

// ── Referral gates ────────────────────────────────────────────
// null = free (0 referrals), number = referrals needed to unlock
const ANIM_REFERRAL_GATES = {
  fire1:     null,   // Holy Fire — free
  bulb:      2,      // Bright Idea — 2 referrals
  lightning: 4,      // Lightning — 4 referrals
  redcar:    5,      // Red Car — 5 referrals
  fire2:    5,      // Inferno — 5 referrals
  amongus:   5,      // Among Us — 5 referrals
};

const THEME_REFERRAL_GATES = {
  'biblely-jesusnlambs': null,  // Jesus & Lambs — free
  'cresvia':             1,     // Cresvia — 1 referral
  'eterna':              1,     // Eterna — 1 referral
  'blush-bloom':         3,     // Blush Bloom — 3 referrals
  'sailormoon':          5,     // Sailor Moon — 5 referrals
  'biblely-classic':     5,     // Classic — 5 referrals
  'spiderman':           5,     // Spiderman — 5 referrals
  'biblely-light':       5,     // Biblely — 5 referrals
};

const BADGE_REFERRAL_GATES = {
  country:  null,  // Country flag — free
  verified: 1,     // Blue Tick — 1 referral
  streak:   5,     // Streak animation badge — 5 referrals
  biblely:  5,     // Biblely Badge — 5 referrals
  amongus:  5,     // Among Us badge — 5 referrals
};

// Voice referral gate — 1 referral unlocks all non-free voices
const VOICE_REFERRAL_REQUIRED = 1;

// ── Rarity tier helper ──────────────────────────────────────
const getTier = (required) => {
  if (required === null || required === undefined || required === 0) return { label: 'FREE', color: '#10B981', bg: 'rgba(16,185,129,0.12)', glow: '#10B98140' };
  if (required <= 5) return { label: 'COMMON', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', glow: '#60A5FA30' };
  if (required <= 12) return { label: 'RARE', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', glow: '#A78BFA30' };
  if (required <= 50) return { label: 'EPIC', color: '#F472B6', bg: 'rgba(244,114,182,0.12)', glow: '#F472B630' };
  return { label: 'LEGENDARY', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', glow: '#FBBF2440' };
};

// ── Badge definitions (sorted by referral cost) ─────────────
const BADGES = [
  { id: 'country', name: 'Country', desc: 'Show your country flag next to your name', icon: 'public', image: null, color: '#10B981', gradient: ['#10B981', '#059669'] },
  { id: 'verified', name: 'Blue Tick', desc: 'Verified badge next to your name', icon: 'verified', image: null, color: '#1DA1F2', gradient: ['#1DA1F2', '#0D8BD9'] },
  { id: 'streak', name: 'Streak Animation', desc: 'Show your streak animation as a badge', icon: 'local-fire-department', image: null, color: '#FF6B00', gradient: ['#FF6B00', '#FF9500'] },
  { id: 'biblely', name: 'Biblely Badge', desc: 'Exclusive founder-level badge', icon: null, image: require('../../assets/logo.png'), color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
  { id: 'amongus', name: 'Among Us', desc: 'Among Us animation badge next to your name', icon: null, lottie: require('../../assets/Loading 50 _ Among Us.json'), color: '#4CAF50', gradient: ['#4CAF50', '#66BB6A'] },
];

// ── Streak animation definitions (sorted by referral cost) ──
const STREAK_ANIMS = [
  { id: 'fire1',     name: 'Holy Fire',    source: require('../../assets/fire-animation.json'),        colors: ['#FF6B00', '#FF9500'] },
  { id: 'bulb',      name: 'Bright Idea',  source: require('../../assets/Bulb Transparent.json'),     colors: ['#FFC107', '#FFD54F'] },
  { id: 'lightning', name: 'Lightning',     source: require('../../assets/Lightning.json'),             colors: ['#7C4DFF', '#B388FF'] },
  { id: 'redcar',    name: 'Red Car',      source: require('../../assets/Red-Car.json'),               colors: ['#E53935', '#EF5350'] },
  { id: 'fire2',     name: 'Inferno',      source: require('../../assets/Fire2.json'),                 colors: ['#FF3D00', '#FF6E40'] },
  { id: 'amongus',   name: 'Among Us',     source: require('../../assets/Loading 50 _ Among Us.json'), colors: ['#4CAF50', '#66BB6A'] },
];

// ── Loading animation definitions ────────────────────────────
const LOADING_ANIM_KEY = 'fivefold_loading_animation';
const LOADING_ANIMS = [
  { id: 'default',  name: 'Default',      source: null,                                               colors: ['#6366F1', '#818CF8'], icon: 'sync' },
  { id: 'cat',      name: 'Running Cat',  source: require('../../assets/Running-Cat.json'),           colors: ['#795548', '#A1887F'], icon: null },
  { id: 'hamster',  name: 'Run Hamster',  source: require('../../assets/Run-Hamster.json'),           colors: ['#FF9800', '#FFB74D'], icon: null },
  { id: 'amongus',  name: 'Among Us',     source: require('../../assets/Loading 50 _ Among Us.json'), colors: ['#4CAF50', '#66BB6A'], icon: null },
];

const LOADING_ANIM_REFERRAL_GATES = {
  default:  null,   // Default spinner — free
  cat:      1,      // Running Cat — 1 referral
  hamster:  3,      // Run Hamster — 3 referrals
  amongus:  5,      // Among Us — 5 referrals
};

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
  const [selectedLoadingAnim, setSelectedLoadingAnim] = useState('default');
  const [badgeToggles, setBadgeToggles] = useState({});
  const [referralCount, setReferralCount] = useState(0);

  // Locked popup state
  const [lockedPopup, setLockedPopup] = useState(null);
  const popupScale = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  // Entrance animations — staggered sections
  const headerFade = useRef(new Animated.Value(0)).current;
  const sections = useRef([...Array(7)].map(() => new Animated.Value(0))).current;

  // Shimmer for referral banner
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();

    // Header fade
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Stagger sections with spring
    sections.forEach((anim, i) => {
      setTimeout(() => {
        Animated.spring(anim, { toValue: 1, tension: 45, friction: 9, useNativeDriver: true }).start();
      }, 100 + i * 120);
    });

    // Shimmer loop on referral banner
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, []);

  const load = async () => {
    try {
      const [animId, loadingAnimId, badgeTogglesRaw, oldBtVal, count] = await Promise.all([
        userStorage.getRaw(STREAK_ANIM_KEY),
        userStorage.getRaw(LOADING_ANIM_KEY),
        userStorage.getRaw('fivefold_badge_toggles'),
        userStorage.getRaw(BLUETICK_ENABLED_KEY),
        getReferralCount(),
      ]);
      setReferralCount(count);

      // Validate stored streak animation — reset to free default if locked
      if (animId) {
        const streakReq = ANIM_REFERRAL_GATES[animId];
        if (streakReq !== null && streakReq !== undefined && count < streakReq) {
          setSelectedAnim('fire1'); // Reset to free default
          await userStorage.setRaw(STREAK_ANIM_KEY, 'fire1');
        } else {
          setSelectedAnim(animId);
        }
      }

      // Validate stored loading animation — reset to free default if locked
      if (loadingAnimId) {
        const loadReq = LOADING_ANIM_REFERRAL_GATES[loadingAnimId];
        if (loadReq !== null && loadReq !== undefined && count < loadReq) {
          setSelectedLoadingAnim('default'); // Reset to free default
          await userStorage.setRaw(LOADING_ANIM_KEY, 'default');
        } else {
          setSelectedLoadingAnim(loadingAnimId);
        }
      }

      let toggles = badgeTogglesRaw ? JSON.parse(badgeTogglesRaw) : null;
      if (!toggles) {
        const btOn = oldBtVal !== 'false';
        toggles = { country: true, streak: true, verified: btOn, biblely: true };
        await userStorage.setRaw('fivefold_badge_toggles', JSON.stringify(toggles));
      }
      setBadgeToggles(toggles);
    } catch (e) {
      console.warn('[Customisation] load error:', e);
    }
  };

  // ── Referral gate helpers ──────────────────────────────────
  const isItemUnlocked = (requiredReferrals) => {
    if (requiredReferrals === null || requiredReferrals === undefined) return true;
    return referralCount >= requiredReferrals;
  };

  const showLockedPopup = (itemName, required) => {
    popupScale.setValue(0);
    popupOpacity.setValue(0);
    setLockedPopup({ itemName, required });
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
    const required = ANIM_REFERRAL_GATES[id];
    if (!isItemUnlocked(required)) {
      const anim = STREAK_ANIMS.find(a => a.id === id);
      showLockedPopup(anim?.name || 'Animation', required);
      return;
    }
    setSelectedAnim(id);
    await userStorage.setRaw(STREAK_ANIM_KEY, id);
  };

  const pickLoadingAnim = async (id) => {
    const required = LOADING_ANIM_REFERRAL_GATES[id];
    if (!isItemUnlocked(required)) {
      const anim = LOADING_ANIMS.find(a => a.id === id);
      showLockedPopup(anim?.name || 'Animation', required);
      return;
    }
    setSelectedLoadingAnim(id);
    await userStorage.setRaw(LOADING_ANIM_KEY, id);
  };

  const toggleBadge = async (badgeId, val) => {
    const updated = { ...badgeToggles, [badgeId]: val };
    setBadgeToggles(updated);
    await userStorage.setRaw('fivefold_badge_toggles', JSON.stringify(updated));
    if (badgeId === 'verified') {
      await userStorage.setRaw(BLUETICK_ENABLED_KEY, val.toString());
    }
  };

  const pickTheme = (t) => {
    const required = THEME_REFERRAL_GATES[t.id];
    if (!isItemUnlocked(required)) {
      showLockedPopup(t.name + ' Theme', required);
      return;
    }
    if (t.isBiblelyVariant) {
      changeTheme('biblely');
      changeWallpaper(t.wallpaperIndex);
    } else {
      changeTheme(t.id);
    }
  };

  // ── Theme data (sorted by referral cost low → high) ─────────
  const allThemes = [
    { id: 'biblely-jesusnlambs', name: 'Jesus & Lambs', wallpaper: biblelyWallpapers?.[1]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 1, isBiblelyVariant: true, wallpaperIndex: 1, mode: 'Dark' },
    { id: 'cresvia',            name: 'Cresvia',        wallpaper: themeWallpapers?.['cresvia'], isActive: isCresviaTheme, mode: 'Dark' },
    { id: 'eterna',             name: 'Eterna',         wallpaper: themeWallpapers?.['eterna'], isActive: isEternaTheme, mode: 'Light' },
    { id: 'blush-bloom',        name: 'Blush Bloom',   wallpaper: themeWallpapers?.['blush-bloom'], isActive: isBlushTheme, mode: 'Light' },
    { id: 'sailormoon',         name: 'Sailor Moon',    wallpaper: themeWallpapers?.['sailormoon'], isActive: isSailormoonTheme, mode: 'Light' },
    { id: 'biblely-classic',    name: 'Classic',         wallpaper: biblelyWallpapers?.[2]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 2, isBiblelyVariant: true, wallpaperIndex: 2, mode: 'Dark' },
    { id: 'spiderman',          name: 'Spiderman',      wallpaper: themeWallpapers?.['spiderman'], isActive: isSpidermanTheme, mode: 'Dark' },
    { id: 'biblely-light',      name: 'Biblely',        wallpaper: biblelyWallpapers?.[0]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 0, isBiblelyVariant: true, wallpaperIndex: 0, mode: 'Light' },
  ];

  // ── Colors ──────────────────────────────────────────────────
  const tx = theme.text;
  const tx2 = theme.textSecondary;
  const bg = theme.background;
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.025)';
  const bdr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SW * 2, SW * 2],
  });

  const THEME_CARD_W = (SW - 52) / 2;

  // ═══════════════════════════════════════════════════════════
  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.scroll, { paddingTop: Platform.OS === 'ios' ? 108 : 78 }]} showsVerticalScrollIndicator={false}>



        {/* ── Referral count banner with shimmer ─────── */}
        <AnimSection anim={sections[0]}>
          <View style={[st.referralBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: bdr }]}>
            <Animated.View style={[st.shimmerStripe, { transform: [{ translateX: shimmerTranslate }], backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)' }]} />
            <View style={[st.referralIcon, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialIcons name="person-add" size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: tx }}>Your Referrals</Text>
              <Text style={{ fontSize: 12, color: tx2, marginTop: 2 }}>Refer friends to unlock customisations</Text>
            </View>
            <View style={[st.referralCountBadge, { backgroundColor: theme.primary }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{referralCount}</Text>
            </View>
          </View>
        </AnimSection>

        {/* ── STREAK ANIMATIONS ───────────────────────── */}
        <AnimSection anim={sections[1]}>
          <SectionHeader icon="local-fire-department" iconBg="#FF6B0020" iconColor="#FF8C00" title="Streak Animation" subtitle="Your daily streak effect" textColor={tx} subtitleColor={tx2} />

          <View style={st.animGrid}>
            {STREAK_ANIMS.map((a, idx) => {
              const required = ANIM_REFERRAL_GATES[a.id];
              const unlocked = isItemUnlocked(required);
              const active = selectedAnim === a.id;
              const tier = getTier(required);

              return (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.8}
                  onPress={() => pickAnim(a.id)}
                  style={[st.animCard, {
                    borderColor: active && unlocked ? a.colors[0] : bdr,
                    borderWidth: active && unlocked ? 2.5 : 1,
                    backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff',
                  }]}
                >
                  {/* Top gradient strip */}
                  <LinearGradient colors={active && unlocked ? a.colors : [bdr, bdr]} style={st.animStrip} />

                  {/* Lottie preview — larger */}
                  <View style={st.animLottie}>
                    <LottieView source={a.source} autoPlay loop style={{ width: 90, height: 90 }} />
                  </View>

                  {/* Name */}
                  <Text style={[st.animName, { color: tx }]} numberOfLines={1}>{a.name}</Text>

                  {/* Tier badge */}
                  <View style={[st.tierBadge, { backgroundColor: tier.bg }]}>
                    <Text style={[st.tierText, { color: tier.color }]}>{tier.label}</Text>
                  </View>

                  {/* Lock overlay */}
                  {!unlocked && (
                    <View style={st.animLockWrap}>
                      <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.35)']} style={st.animLockOverlay}>
                        <View style={st.lockIconCircle}>
                          <MaterialIcons name="lock" size={20} color="#fff" />
                        </View>
                      </LinearGradient>
                      <View style={st.animGateBadge}>
                        <MaterialIcons name="person-add" size={10} color="#FFD700" />
                        <Text style={st.animGateText}>{required} referrals</Text>
                      </View>
                    </View>
                  )}

                  {/* Active checkmark */}
                  {active && unlocked && (
                    <View style={st.animActiveWrap}>
                      <LinearGradient colors={a.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.activeBadge}>
                        <MaterialIcons name="check" size={12} color="#fff" />
                        <Text style={st.activeText}>Active</Text>
                      </LinearGradient>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimSection>

        {/* ── LOADING ANIMATION ────────────────────────── */}
        <AnimSection anim={sections[2]}>
          <SectionHeader icon="hourglass-empty" iconBg="#6366F120" iconColor="#6366F1" title="Loading Animation" subtitle="Pull-to-refresh effect" textColor={tx} subtitleColor={tx2} />

          <View style={st.animGrid}>
            {LOADING_ANIMS.map((a) => {
              const required = LOADING_ANIM_REFERRAL_GATES[a.id];
              const unlocked = isItemUnlocked(required);
              const active = selectedLoadingAnim === a.id;
              const tier = getTier(required);

              return (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.8}
                  onPress={() => pickLoadingAnim(a.id)}
                  style={[st.animCard, {
                    borderColor: active && unlocked ? a.colors[0] : bdr,
                    borderWidth: active && unlocked ? 2.5 : 1,
                    backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff',
                  }]}
                >
                  {/* Top gradient strip */}
                  <LinearGradient colors={active && unlocked ? a.colors : [bdr, bdr]} style={st.animStrip} />

                  {/* Preview — Lottie or spinner icon */}
                  <View style={st.animLottie}>
                    {a.source ? (
                      <LottieView source={a.source} autoPlay loop style={{ width: 90, height: 90 }} />
                    ) : (
                      <View style={{
                        width: 90,
                        height: 90,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <View style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          borderWidth: 3,
                          borderColor: isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)',
                          borderTopColor: '#6366F1',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <MaterialIcons name="sync" size={24} color="#6366F1" />
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Name */}
                  <Text style={[st.animName, { color: tx }]} numberOfLines={1}>{a.name}</Text>

                  {/* Tier badge */}
                  <View style={[st.tierBadge, { backgroundColor: tier.bg }]}>
                    <Text style={[st.tierText, { color: tier.color }]}>{tier.label}</Text>
                  </View>

                  {/* Lock overlay */}
                  {!unlocked && (
                    <View style={st.animLockWrap}>
                      <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.35)']} style={st.animLockOverlay}>
                        <View style={st.lockIconCircle}>
                          <MaterialIcons name="lock" size={20} color="#fff" />
                        </View>
                      </LinearGradient>
                      <View style={st.animGateBadge}>
                        <MaterialIcons name="person-add" size={10} color="#FFD700" />
                        <Text style={st.animGateText}>{required} referrals</Text>
                      </View>
                    </View>
                  )}

                  {/* Active checkmark */}
                  {active && unlocked && (
                    <View style={st.animActiveWrap}>
                      <LinearGradient colors={a.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.activeBadge}>
                        <MaterialIcons name="check" size={12} color="#fff" />
                        <Text style={st.activeText}>Active</Text>
                      </LinearGradient>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimSection>

        {/* ── BADGES ──────────────────────────────────── */}
        <AnimSection anim={sections[3]}>
          <SectionHeader icon="workspace-premium" iconBg="#F59E0B20" iconColor="#F59E0B" title="Badges" subtitle="Show off next to your name" textColor={tx} subtitleColor={tx2} />

          <View style={{ gap: 12 }}>
            {BADGES.map((badge) => {
              const required = BADGE_REFERRAL_GATES[badge.id];
              const unlocked = isItemUnlocked(required);
              const toggledOn = badgeToggles[badge.id] !== false;
              const tier = getTier(required);

              if (!unlocked) {
                return (
                  <TouchableOpacity
                    key={badge.id}
                    activeOpacity={0.8}
                    onPress={() => showLockedPopup(badge.name, required)}
                    style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: bdr }]}
                  >
                    <LinearGradient colors={['rgba(80,80,80,0.4)', 'rgba(60,60,60,0.4)']} style={st.badgeIconGrad}>
                      <MaterialIcons name="lock" size={22} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={[st.badgeName, { color: tx, opacity: 0.5 }]}>{badge.name}</Text>
                      <Text style={[st.badgeDesc, { color: tx2, opacity: 0.5 }]}>{badge.desc}</Text>
                    </View>
                    <View style={[st.badgeGateChip, { backgroundColor: tier.bg, borderColor: tier.color + '25', borderWidth: 1 }]}>
                      <MaterialIcons name="person-add" size={12} color={tier.color} />
                      <Text style={[st.badgeGateChipText, { color: tier.color }]}>{required} {required === 1 ? 'referral' : 'referrals'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <View
                  key={badge.id}
                  style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: badge.color + '25' }]}
                >
                  <LinearGradient colors={badge.gradient} style={st.badgeIconGrad}>
                    {badge.lottie ? (
                      <LottieView source={badge.lottie} autoPlay loop style={{ width: 32, height: 32 }} />
                    ) : badge.image ? (
                      <Image source={badge.image} style={{ width: 28, height: 28, borderRadius: 6 }} resizeMode="contain" />
                    ) : (
                      <MaterialIcons name={badge.icon} size={24} color="#fff" />
                    )}
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[st.badgeName, { color: tx }]}>{badge.name}</Text>
                      <View style={[st.tierBadgeSmall, { backgroundColor: tier.bg }]}>
                        <Text style={[st.tierTextSmall, { color: tier.color }]}>{tier.label}</Text>
                      </View>
                    </View>
                    <Text style={[st.badgeDesc, { color: tx2 }]}>
                      {toggledOn ? 'Visible on your profile' : 'Hidden from your profile'}
                    </Text>
                  </View>
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

        {/* ── VOICES ──────────────────────────────────── */}
        <AnimSection anim={sections[4]}>
          <SectionHeader icon="record-voice-over" iconBg="#00BCD420" iconColor="#00BCD4" title="Voices" subtitle="Bible reading voice packs" textColor={tx} subtitleColor={tx2} />

          {(() => {
            const vUnlocked = isItemUnlocked(VOICE_REFERRAL_REQUIRED);
            const vTier = getTier(VOICE_REFERRAL_REQUIRED);
            const freeTier = getTier(null);

            return (
              <View style={{ gap: 12 }}>
                {/* Free voices card */}
                <View style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: '#10B98125' }]}>
                  <LinearGradient colors={['#10B981', '#059669']} style={st.badgeIconGrad}>
                    <MaterialIcons name="mic" size={24} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[st.badgeName, { color: tx }]}>Studio & Device</Text>
                      <View style={[st.tierBadgeSmall, { backgroundColor: freeTier.bg }]}>
                        <Text style={[st.tierTextSmall, { color: freeTier.color }]}>FREE</Text>
                      </View>
                    </View>
                    <Text style={[st.badgeDesc, { color: tx2 }]}>
                      2 premium studio voices + all device voices
                    </Text>
                  </View>
                  <MaterialIcons name="check-circle" size={24} color="#10B981" />
                </View>

                {/* Locked voices card */}
                {!vUnlocked ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => showLockedPopup('All Voices', VOICE_REFERRAL_REQUIRED)}
                    style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: bdr }]}
                  >
                    <LinearGradient colors={['rgba(80,80,80,0.4)', 'rgba(60,60,60,0.4)']} style={st.badgeIconGrad}>
                      <MaterialIcons name="lock" size={22} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={[st.badgeName, { color: tx, opacity: 0.5 }]}>Neural, WaveNet & More</Text>
                      <Text style={[st.badgeDesc, { color: tx2, opacity: 0.5 }]}>
                        35+ extra voices with accents & styles
                      </Text>
                    </View>
                    <View style={[st.badgeGateChip, { backgroundColor: vTier.bg, borderColor: vTier.color + '25', borderWidth: 1 }]}>
                      <MaterialIcons name="person-add" size={12} color={vTier.color} />
                      <Text style={[st.badgeGateChipText, { color: vTier.color }]}>1 referral</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: '#60A5FA25' }]}>
                    <LinearGradient colors={['#60A5FA', '#3B82F6']} style={st.badgeIconGrad}>
                      <MaterialIcons name="graphic-eq" size={24} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[st.badgeName, { color: tx }]}>Neural, WaveNet & More</Text>
                        <View style={[st.tierBadgeSmall, { backgroundColor: vTier.bg }]}>
                          <Text style={[st.tierTextSmall, { color: vTier.color }]}>{vTier.label}</Text>
                        </View>
                      </View>
                      <Text style={[st.badgeDesc, { color: tx2 }]}>
                        35+ extra voices unlocked
                      </Text>
                    </View>
                    <MaterialIcons name="check-circle" size={24} color="#60A5FA" />
                  </View>
                )}
              </View>
            );
          })()}
        </AnimSection>

        {/* ── THEMES ──────────────────────────────────── */}
        <AnimSection anim={sections[5]}>
          <SectionHeader icon="palette" iconBg={`${theme.primary}20`} iconColor={theme.primary} title="Themes" subtitle="Change your app's look" textColor={tx} subtitleColor={tx2} />

          <View style={st.themeGrid}>
            {allThemes.map((t) => {
              const required = THEME_REFERRAL_GATES[t.id];
              const unlocked = isItemUnlocked(required);
              const active = t.isActive;
              const tier = getTier(required);

              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.85}
                  onPress={() => pickTheme(t)}
                  style={[st.themeCard, {
                    width: THEME_CARD_W,
                    height: THEME_CARD_W * 1.55,
                    borderColor: active && unlocked ? theme.primary : bdr,
                    borderWidth: active && unlocked ? 2.5 : 1,
                  }]}
                >
                  {t.wallpaper ? (
                    <Image source={t.wallpaper} style={st.themeImg} resizeMode="cover" />
                  ) : (
                    <View style={[st.themeImg, { backgroundColor: theme.surface }]} />
                  )}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={st.themeGrad} />

                  {!unlocked && (
                    <View style={st.themeLock}>
                      <View style={st.themeLockCircle}>
                        <MaterialIcons name="lock" size={20} color="#fff" />
                      </View>
                      <View style={st.themeGateBadge}>
                        <MaterialIcons name="person-add" size={10} color="#FFD700" />
                        <Text style={st.themeGateText}>{required} referrals</Text>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Text style={st.themeMode}>{t.mode}</Text>
                      <View style={[st.themeTierBadge, { backgroundColor: tier.bg }]}>
                        <Text style={[st.themeTierText, { color: tier.color }]}>{tier.label}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimSection>

        {/* ── APP ICON ─────────────────────────────────────── */}
        <AnimSection anim={sections[6]}>
          <SectionHeader icon="phone-iphone" iconBg="#6366F120" iconColor="#6366F1" title="App Icon" subtitle="Customise your home screen icon" textColor={tx} subtitleColor={tx2} />

          <View style={{
            backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff',
            borderRadius: 22,
            borderWidth: 1,
            borderColor: bdr,
            padding: 28,
            alignItems: 'center',
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 56, height: 56, borderRadius: 14 }}
                resizeMode="contain"
              />
            </View>

            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginBottom: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>Coming Soon</Text>
            </LinearGradient>

            <Text style={{ color: tx2, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              Choose from multiple app icons{'\n'}to personalise your home screen
            </Text>
          </View>
        </AnimSection>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Premium Transparent Header */}
      <BlurView
        intensity={50}
        tint={isDark ? 'dark' : 'light'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
        <Animated.View style={{ paddingHorizontal: 16, paddingBottom: 4, opacity: headerFade }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity
              onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>

            <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
              <Text
                style={{
                  color: tx,
                  fontSize: 17,
                  fontWeight: '700',
                  letterSpacing: 0.3,
                }}
              >
                Customisation
              </Text>
            </View>

            <View style={{ width: 40 }} />
          </View>
        </Animated.View>
      </BlurView>

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
            <LinearGradient colors={[theme.primary, theme.primary + '80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.popupAccent} />

            <View style={[st.popupIconWrap, { backgroundColor: theme.primary + '18' }]}>
              <LinearGradient colors={[theme.primary, theme.primary + 'CC']} style={st.popupIconGrad}>
                <MaterialIcons name="lock" size={28} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={[st.popupItemName, { color: tx }]}>{lockedPopup?.itemName}</Text>
            <Text style={[st.popupLocked, { color: tx2 }]}>is locked</Text>

            <View style={[st.popupDivider, { backgroundColor: bdr }]} />

            <Text style={[st.popupUnlockLabel, { color: tx2 }]}>UNLOCK BY REFERRING</Text>

            <View style={[st.popupReqCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: bdr }]}>
              <View style={[st.popupReqIcon, { backgroundColor: theme.primary + '20' }]}>
                <MaterialIcons name="person-add" size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.popupReqTitle, { color: tx }]}>
                  {lockedPopup?.required} {lockedPopup?.required === 1 ? 'Referral' : 'Referrals'} Needed
                </Text>
                <Text style={[st.popupReqDesc, { color: tx2 }]}>
                  You have {referralCount} — {lockedPopup?.required - referralCount > 0 ? `${lockedPopup?.required - referralCount} more to go` : 'almost there!'}
                </Text>
              </View>
            </View>

            <View style={[st.popupProgress, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <LinearGradient
                colors={[theme.primary, theme.primary + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[st.popupProgressFill, { width: `${Math.min(100, (referralCount / (lockedPopup?.required || 1)) * 100)}%` }]}
              />
            </View>
            <Text style={{ fontSize: 11, color: tx2, marginBottom: 16 }}>
              {referralCount}/{lockedPopup?.required} referrals
            </Text>

            <TouchableOpacity onPress={hideLockedPopup} style={[st.popupBtn, { backgroundColor: theme.primary }]}>
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
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
  }}>
    {children}
  </Animated.View>
);

const SectionHeader = ({ icon, iconBg, iconColor, title, subtitle, textColor, subtitleColor }) => (
  <View style={st.secHead}>
    <View style={[st.secIcon, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon} size={22} color={iconColor} />
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

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // Referral banner
  referralBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1, marginTop: 8, marginBottom: 4,
    overflow: 'hidden',
  },
  shimmerStripe: {
    position: 'absolute', top: 0, bottom: 0, width: SW,
    opacity: 0.6,
  },
  referralIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  referralCountBadge: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // Section header
  secHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 28, gap: 14 },
  secIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  secSub: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.7 },

  // Streak animations — 2-column grid
  animGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  animCard: {
    width: (SW - 44) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 14,
    alignItems: 'center',
  },
  animStrip: { width: '100%', height: 3 },
  animLottie: { paddingTop: 16, paddingBottom: 8, alignItems: 'center', justifyContent: 'center' },
  animName: { fontSize: 14, fontWeight: '700', marginBottom: 6 },

  tierBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  tierText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  tierBadgeSmall: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tierTextSmall: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },

  animLockWrap: { ...StyleSheet.absoluteFillObject, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  animLockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  lockIconCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  animGateBadge: { position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
  animGateText: { fontSize: 10, fontWeight: '700', color: '#FFD700' },

  animActiveWrap: { position: 'absolute', top: 10, right: 10 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  activeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Badges
  badgeCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 18, borderWidth: 1, overflow: 'hidden',
  },
  badgeIconGrad: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeName: { fontSize: 16, fontWeight: '700' },
  badgeDesc: { fontSize: 12, fontWeight: '400', marginTop: 3 },
  badgeGateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  badgeGateChipText: { fontSize: 10, fontWeight: '700' },

  // Themes grid
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { borderRadius: 18, overflow: 'hidden' },
  themeImg: { width: '100%', height: '100%' },
  themeGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  themeLock: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  themeLockCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  themeGateBadge: { position: 'absolute', bottom: 42, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  themeGateText: { fontSize: 10, fontWeight: '700', color: '#FFD700' },
  themeCheck: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  themeMeta: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  themeName: { fontSize: 14, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  themeMode: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  themeTierBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  themeTierText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },

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

  popupReqCard: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    padding: 14, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 16,
  },
  popupReqIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  popupReqTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  popupReqDesc: { fontSize: 12, fontWeight: '400' },

  popupProgress: {
    width: '100%', height: 6, borderRadius: 3, marginBottom: 6, overflow: 'hidden',
  },
  popupProgressFill: {
    height: '100%', borderRadius: 3,
  },

  popupBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  popupBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CustomisationScreen;

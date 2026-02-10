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
import LottieView from 'lottie-react-native';
import userStorage from '../utils/userStorage';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { getReferralCount } from '../services/referralService';

const { width: SW } = Dimensions.get('window');
const THEME_CARD_W = (SW - 52) / 2;

// ── Storage keys ──────────────────────────────────────────────
const STREAK_ANIM_KEY = 'fivefold_streak_animation';
const BLUETICK_ENABLED_KEY = 'fivefold_bluetick_enabled';

// ── Referral gates ────────────────────────────────────────────
// null = free (0 referrals), number = referrals needed to unlock
const ANIM_REFERRAL_GATES = {
  fire1:     null,   // Holy Fire — free
  fire2:     12,     // Inferno — 12 referrals
  redcar:    6,      // Red Car — 6 referrals
  bulb:      4,      // Bright Idea — 4 referrals
  amongus:   50,     // Among Us — 50 referrals
  lightning: 10,     // Lightning — 10 referrals
};

const THEME_REFERRAL_GATES = {
  'biblely-jesusnlambs': null,  // Jesus & Lambs — free
  'blush-bloom':         3,     // Blush Bloom — 3 referrals
  'eterna':              7,     // Eterna — 7 referrals
  'sailormoon':          8,     // Sailor Moon — 8 referrals
  'biblely-light':       100,   // Biblely — 100 referrals
  'cresvia':             5,     // Cresvia — 5 referrals
  'spiderman':           14,    // Spiderman — 14 referrals
  'biblely-classic':     9,     // Classic — 9 referrals
};

const BADGE_REFERRAL_GATES = {
  country:  null,  // Country flag — free
  streak:   null,  // Streak animation badge — free
  verified: 1,     // Blue Tick — 1 referral
  biblely:  70,    // Biblely Badge — 70 referrals
};

// ── Badge definitions ─────────────────────────────────────────
const BADGES = [
  {
    id: 'country',
    name: 'Country',
    desc: 'Show your country flag next to your name',
    icon: 'public',
    image: null,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'streak',
    name: 'Streak Animation',
    desc: 'Show your streak animation as a badge',
    icon: 'local-fire-department',
    image: null,
    color: '#FF6B00',
    gradient: ['#FF6B00', '#FF9500'],
  },
  {
    id: 'verified',
    name: 'Blue Tick',
    desc: 'Verified badge next to your name',
    icon: 'verified',
    image: null,
    color: '#1DA1F2',
    gradient: ['#1DA1F2', '#0D8BD9'],
  },
  {
    id: 'biblely',
    name: 'Biblely Badge',
    desc: 'Exclusive founder-level badge',
    icon: null,
    image: require('../../assets/logo.png'),
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
];

// ── Streak animation definitions ──────────────────────────────
const STREAK_ANIMS = [
  { id: 'fire1',     name: 'Holy Fire',    source: require('../../assets/fire-animation.json'),        colors: ['#FF6B00', '#FF9500'] },
  { id: 'fire2',     name: 'Inferno',      source: require('../../assets/Fire2.json'),                 colors: ['#FF3D00', '#FF6E40'] },
  { id: 'redcar',    name: 'Red Car',      source: require('../../assets/Red-Car.json'),               colors: ['#E53935', '#EF5350'] },
  { id: 'bulb',      name: 'Bright Idea',  source: require('../../assets/Bulb Transparent.json'),     colors: ['#FFC107', '#FFD54F'] },
  { id: 'amongus',   name: 'Among Us',     source: require('../../assets/Loading 50 _ Among Us.json'), colors: ['#4CAF50', '#66BB6A'] },
  { id: 'lightning', name: 'Lightning',     source: require('../../assets/Lightning.json'),             colors: ['#7C4DFF', '#B388FF'] },
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
  const [badgeToggles, setBadgeToggles] = useState({});
  const [referralCount, setReferralCount] = useState(0);

  // Locked popup state
  const [lockedPopup, setLockedPopup] = useState(null); // { itemName, required }
  const popupScale = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  // Entrance animations
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
      const [animId, badgeTogglesRaw, oldBtVal, count] = await Promise.all([
        userStorage.getRaw(STREAK_ANIM_KEY),
        userStorage.getRaw('fivefold_badge_toggles'),
        userStorage.getRaw(BLUETICK_ENABLED_KEY),
        getReferralCount(),
      ]);
      if (animId) setSelectedAnim(animId);
      setReferralCount(count);

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

        {/* ── Referral count banner ──────────────────────── */}
        <View style={[st.referralBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: bdr }]}>
          <View style={[st.referralIcon, { backgroundColor: `${theme.primary}15` }]}>
            <MaterialIcons name="person-add" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: tx }}>Your Referrals</Text>
            <Text style={{ fontSize: 12, color: tx2, marginTop: 1 }}>Refer friends to unlock customisations</Text>
          </View>
          <View style={[st.referralCountBadge, { backgroundColor: theme.primary }]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{referralCount}</Text>
          </View>
        </View>

        {/* ── STREAK ANIMATIONS ──────────────────────────── */}
        <AnimSection anim={s1}>
          <SectionHeader icon="local-fire-department" iconBg="#FF6B0020" iconColor="#FF8C00" title="Streak Animation" subtitle="Your daily streak effect" textColor={tx} subtitleColor={tx2} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.animRow} decelerationRate="fast">
            {STREAK_ANIMS.map((a) => {
              const required = ANIM_REFERRAL_GATES[a.id];
              const unlocked = isItemUnlocked(required);
              const active = selectedAnim === a.id;
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
                  <LinearGradient colors={active && unlocked ? a.colors : [bdr, bdr]} style={st.animStrip} />
                  <View style={st.animLottie}>
                    <LottieView source={a.source} autoPlay loop style={{ width: 80, height: 80 }} />
                  </View>
                  <Text style={[st.animName, { color: tx }]}>{a.name}</Text>

                  {!unlocked ? (
                    <View style={st.animLockWrap}>
                      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.35)']} style={st.animLockOverlay}>
                        <MaterialIcons name="lock" size={22} color="#fff" />
                      </LinearGradient>
                      <View style={st.animGateBadge}>
                        <MaterialIcons name="person-add" size={10} color="#FFD700" />
                        <Text style={st.animGateText}>{required} {required === 1 ? 'referral' : 'referrals'}</Text>
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
              const required = BADGE_REFERRAL_GATES[badge.id];
              const unlocked = isItemUnlocked(required);
              const toggledOn = badgeToggles[badge.id] !== false;

              if (!unlocked) {
                return (
                  <TouchableOpacity
                    key={badge.id}
                    activeOpacity={0.8}
                    onPress={() => showLockedPopup(badge.name, required)}
                    style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: bdr }]}
                  >
                    <LinearGradient colors={badge.gradient} style={st.badgeIconGrad}>
                      <MaterialIcons name="lock" size={20} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[st.badgeName, { color: tx }]}>{badge.name}</Text>
                      <Text style={[st.badgeDesc, { color: tx2 }]}>{badge.desc}</Text>
                    </View>
                    <View style={[st.badgeGateChip, { backgroundColor: badge.color + '15' }]}>
                      <MaterialIcons name="person-add" size={12} color={badge.color} />
                      <Text style={[st.badgeGateChipText, { color: badge.color }]}>{required} {required === 1 ? 'referral' : 'referrals'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <View
                  key={badge.id}
                  style={[st.badgeCard, { backgroundColor: isDark ? 'rgba(15,15,25,0.95)' : '#fff', borderColor: badge.color + '30' }]}
                >
                  <LinearGradient colors={badge.gradient} style={st.badgeIconGrad}>
                    {badge.image ? (
                      <Image source={badge.image} style={{ width: 26, height: 26, borderRadius: 6 }} resizeMode="contain" />
                    ) : (
                      <MaterialIcons name={badge.icon} size={22} color="#fff" />
                    )}
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[st.badgeName, { color: tx }]}>{badge.name}</Text>
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

        {/* ── THEMES ─────────────────────────────────────── */}
        <AnimSection anim={s3}>
          <SectionHeader icon="palette" iconBg={`${theme.primary}20`} iconColor={theme.primary} title="Themes" subtitle="Change your app's look" textColor={tx} subtitleColor={tx2} />

          <View style={st.themeGrid}>
            {allThemes.map((t) => {
              const required = THEME_REFERRAL_GATES[t.id];
              const unlocked = isItemUnlocked(required);
              const active = t.isActive;

              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.85}
                  onPress={() => pickTheme(t)}
                  style={[st.themeCard, {
                    borderColor: active && unlocked ? theme.primary : bdr,
                    borderWidth: active && unlocked ? 2.5 : 1,
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
                        <MaterialIcons name="person-add" size={10} color="#FFD700" />
                        <Text style={st.themeGateText}>{required} {required === 1 ? 'referral' : 'referrals'}</Text>
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
                      {required === null && (
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
              colors={[theme.primary, theme.primary + '80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.popupAccent}
            />

            {/* Lock icon */}
            <View style={[st.popupIconWrap, { backgroundColor: theme.primary + '18' }]}>
              <LinearGradient
                colors={[theme.primary, theme.primary + 'CC']}
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

            {/* Referral requirement */}
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

            {/* Progress bar */}
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

            {/* Dismiss button */}
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

  // Referral banner
  referralBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 8, marginBottom: 4,
  },
  referralIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  referralCountBadge: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

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
  animGateBadge: { position: 'absolute', bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
  animGateText: { fontSize: 9, fontWeight: '700', color: '#FFD700' },

  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  activeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  freeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  freeText: { fontSize: 10, fontWeight: '600' },

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

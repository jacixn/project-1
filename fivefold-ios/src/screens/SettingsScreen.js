import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { resetFitness, RESET_OPTIONS, defaultResetPicks } from '../services/fitnessReset';
import { useWorkout } from '../contexts/WorkoutContext';
import * as StoreReview from 'expo-store-review';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import SheetHeader from '../components/SheetHeader';
import userStorage from '../utils/userStorage';
import { getStoredData, saveData } from '../utils/localStorage';
import { pushToCloud } from '../services/userSyncService';
import calendarSync from '../services/calendarSync';
import { hapticFeedback } from '../utils/haptics';
import bibleAudioService from '../services/bibleAudioService';
import { getVersionById } from '../data/bibleVersions';
import { getReferralInfo } from '../services/referralService';
import { refreshEmailVerificationStatus, check2FAEnabled, disable2FA } from '../services/authService';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { t, language, availableLanguages } = useLanguage();
  const { user, signOut, deleteAccount } = useAuth();

  // Some Biblely wallpaper themes report a light "isBiblelyTheme" that needs dark
  // modal text. ThemeContext doesn't expose isBiblelyTheme to this screen, so we
  // derive the light-Biblely flag from the available signal and fall back to the
  // standard theme text colors (identical to ProfileTab for every non-light case).
  const isBiblelyTheme = !!theme.isBiblely;
  const isLightBiblely = isBiblelyTheme && !isDark;
  const modalTextColor = isLightBiblely ? '#2D2D2D' : theme.text;
  const modalTextSecondaryColor = isLightBiblely ? '#5A5A5A' : theme.textSecondary;
  const modalTextTertiaryColor = isLightBiblely ? '#8A8A8A' : theme.textTertiary;

  // ── Self-contained state (mirrors ProfileTab) ──
  const [referralInfo, setReferralInfo] = useState({ referredBy: null, referredByUsername: null, referredByDisplayName: null, referralCount: 0 });
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('kjv');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [currentVoiceName, setCurrentVoiceName] = useState('Default');
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [calAlarmMin, setCalAlarmMin] = useState(-1);
  const [quickTaskCalEnabled, setQuickTaskCalEnabled] = useState(true);
  const [quickTaskTime, setQuickTaskTime] = useState('18:00');

  // Admin gate (replicated from ProfileTab)
  const ADMIN_EMAILS = ['biblelyios@gmail.com'];
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // ── Loaders ──
  const loadCalendarSyncSetting = async () => {
    try {
      setCalendarSyncEnabled(await calendarSync.isEnabled());
      setCalAlarmMin(await calendarSync.getDefaultAlarmMinutes());
      setQuickTaskCalEnabled((await userStorage.getRaw('quick_todo_calendar_enabled')) !== 'false'); // default ON
      setQuickTaskTime((await userStorage.getRaw('quick_todo_default_time')) || '18:00');
    } catch (error) {
      console.log('Error loading calendar sync setting:', error);
    }
  };

  const loadAll = useCallback(async () => {
    // Referral
    try {
      const info = await getReferralInfo();
      setReferralInfo(info);
    } catch (error) {
      console.error('[Referral] Error loading referral info:', error);
    }

    // Email verification
    try {
      const verified = await refreshEmailVerificationStatus();
      setEmailVerified(verified);
    } catch (e) {
      console.error('Error checking email verification:', e);
    }

    // Two-factor
    try {
      const { auth } = require('../config/firebase');
      if (auth.currentUser) {
        const has2FA = await check2FAEnabled(auth.currentUser.uid);
        setTwoFactorEnabled(has2FA);
      }
    } catch (e) {
      console.error('Error checking 2FA status:', e);
    }

    // Bible version
    try {
      const storedBibleVersion = await userStorage.getRaw('selectedBibleVersion');
      setSelectedBibleVersion(storedBibleVersion || 'niv');
    } catch (e) {
      console.log('Error loading bible version:', e);
    }

    // Weight unit
    try {
      const storedWeightUnit = await userStorage.getRaw('weightUnit');
      setWeightUnit(storedWeightUnit || 'kg');
    } catch (e) {
      console.log('Error loading weight unit:', e);
    }

    // Height unit
    try {
      const storedHeightUnit = await userStorage.getRaw('heightUnit');
      setHeightUnit(storedHeightUnit || 'cm');
    } catch (e) {
      console.log('Error loading height unit:', e);
    }

    // Reading voice name
    try {
      const voice = bibleAudioService.getCurrentVoice();
      if (voice) {
        const name = voice.name || voice.identifier?.split('.').pop()?.replace(/-/g, ' ') || 'Default';
        setCurrentVoiceName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    } catch (e) {
      console.log('Error loading voice name:', e);
    }

    // Calendar sync
    await loadCalendarSyncSetting();
  }, []);

  // Re-read once the signed-in uid is known: on cold start this screen can
  // mount before userStorage has its uid, and scoped reads return null.
  useEffect(() => {
    loadAll();
  }, [loadAll, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // ── Handlers ──
  const handleSelectCalAlarm = async (value) => {
    hapticFeedback.light();
    setCalAlarmMin(value);
    // Persists the default AND re-syncs all domains so existing events pick it
    // up (per-item reminder lead times still win).
    calendarSync.setDefaultAlarmMinutes(value).catch(() => {});
  };

  const handleQuickTaskCalToggle = async (enabled) => {
    hapticFeedback.light();
    setQuickTaskCalEnabled(enabled);
    await userStorage.setRaw('quick_todo_calendar_enabled', enabled ? 'true' : 'false');
  };

  const handleQuickTaskTimeSelect = async (timeStr) => {
    hapticFeedback.light();
    setQuickTaskTime(timeStr);
    await userStorage.setRaw('quick_todo_default_time', timeStr);
  };

  const handleCalendarSyncToggle = async (enabled) => {
    hapticFeedback.light();
    if (enabled) {
      // Optimistic, but revert if permission is denied or setup fails.
      setCalendarSyncEnabled(true);
      const ok = await calendarSync.enable();
      if (!ok) {
        setCalendarSyncEnabled(false);
        Alert.alert(
          'Calendar Access Needed',
          'To mirror your prayers, reminders and workouts, allow Biblely to access your calendar in Settings.'
        );
      }
    } else {
      setCalendarSyncEnabled(false);
      await calendarSync.disable();
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to sign in again to access the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.buttonPress();
            try {
              await signOut();
              // RootNavigator will automatically show Auth screen
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const { endWorkout } = useWorkout() || {};
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPicks, setResetPicks] = useState(defaultResetPicks);
  const pickedCount = RESET_OPTIONS.filter((o) => resetPicks[o.key]).length;
  const toggleResetPick = (key) => {
    hapticFeedback.light();
    setResetPicks((p) => ({ ...p, [key]: !p[key] }));
  };
  const handleResetFitness = () => {
    if (!pickedCount) return;
    hapticFeedback.medium();
    const names = RESET_OPTIONS.filter((o) => resetPicks[o.key]).map((o) => o.label.toLowerCase()).join(', ');
    Alert.alert(
      'Reset selected fitness data?',
      `This clears: ${names}. Everything else stays. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetFitness(resetPicks, { endActiveWorkout: endWorkout });
              hapticFeedback.success?.();
              setResetOpen(false);
              setResetPicks(defaultResetPicks());
              Alert.alert('Done', 'Selected fitness data has been reset.');
            } catch (e) {
              Alert.alert('Reset failed', e?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    hapticFeedback.buttonPress();
    Alert.prompt(
      'Delete Account',
      'Enter your password to permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async (password) => {
            if (!password) {
              Alert.alert('Error', 'Password is required to delete account.');
              return;
            }
            try {
              hapticFeedback.buttonPress();
              await deleteAccount(password);
            } catch (error) {
              console.error('Delete account error:', error);
              if (error.message === 'WRONG_PASSWORD') {
                Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
              } else if (error.message === 'PASSWORD_REQUIRED') {
                Alert.alert('Password Required', 'Please enter your password to delete your account.');
              } else if (error.message === 'NO_EMAIL') {
                Alert.alert('Cannot Delete', 'This account was created with a social login. Please contact support to delete your account.');
              } else if (error.message === 'TOO_MANY_ATTEMPTS') {
                Alert.alert('Too Many Attempts', 'You have tried too many times. Please wait a few minutes and try again.');
              } else {
                Alert.alert('Error', 'Failed to delete account. Please try again later.');
              }
            }
          },
        },
      ],
      'secure-text',
      '',
      'default'
    );
  };

  // Dismiss this sheet then ask ProfileTab to open a child sheet it still owns.
  const openChild = (key, extra) => {
    navigation.goBack();
    setTimeout(() => DeviceEventEmitter.emit('openSettingsChild', { key, ...extra }), 350);
  };

  // Two-Factor row: branch here (we hold fresh emailVerified/twoFactorEnabled),
  // then STACK the setup sheet on top of Settings instead of handing off.
  const handleTwoFactor = () => {
    if (!emailVerified) {
      navigation.navigate('EmailVerification', { fromSignup: false, maskedEmail: user?.email || '' });
      return;
    }
    if (twoFactorEnabled) {
      Alert.alert(
        'Disable Two-Factor Authentication',
        'Are you sure you want to disable two-factor authentication? Your account will be less secure.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: async () => {
            try {
              await disable2FA();
              setTwoFactorEnabled(false);
              hapticFeedback.success();
              Alert.alert('Two-Factor Disabled', 'Two-factor authentication has been turned off.');
            } catch (err) {
              hapticFeedback.error();
              const errMsg = err?.message || '';
              if (errMsg.includes('not-found') || errMsg.includes('NOT_FOUND')) {
                Alert.alert('Service Unavailable', 'Two-factor authentication is being set up. Please try again shortly.');
              } else {
                Alert.alert('Unable to Disable', 'Something went wrong. Please try again later.');
              }
            }
          }},
        ]
      );
    } else {
      navigation.navigate('TwoFactorSheet', { maskedEmail: user?.email || '' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SheetHeader title="Settings" leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* REFERRAL SECTION */}
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: modalTextTertiaryColor,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginLeft: 4,
        }}>
          Referral
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate('ReferralSheet');
            }}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="person-add" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Referred By</Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>
                  {referralInfo.referredByUsername
                    ? `@${referralInfo.referredByUsername} referred you`
                    : 'Enter who referred you'}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* SECURITY SECTION - Two-Factor Authentication */}
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: modalTextTertiaryColor,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginLeft: 4,
        }}>
          Security
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              handleTwoFactor();
            }}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: twoFactorEnabled ? 'rgba(16,185,129,0.15)' : `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons
                  name={twoFactorEnabled ? 'lock' : 'lock-outline'}
                  size={20}
                  color={twoFactorEnabled ? '#10B981' : theme.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>
                  Two-Factor Authentication
                </Text>
                <Text style={{ fontSize: 12, color: twoFactorEnabled ? '#10B981' : modalTextSecondaryColor, marginTop: 2 }}>
                  {twoFactorEnabled ? 'Enabled, extra security on login' : 'Add an extra layer of security'}
                </Text>
              </View>
            </View>
            {twoFactorEnabled ? (
              <MaterialIcons name="check-circle" size={22} color="#10B981" />
            ) : (
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            )}
          </TouchableOpacity>
        </View>

        {/* VERIFY EMAIL SECTION */}
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: modalTextTertiaryColor,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginLeft: 4,
        }}>
          Verification
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              if (!emailVerified) {
                navigation.navigate('EmailVerification', { fromSignup: false, maskedEmail: user?.email || '' });
              }
            }}
            activeOpacity={emailVerified ? 1 : 0.7}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: emailVerified ? 'rgba(16,185,129,0.15)' : `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons
                  name={emailVerified ? 'verified' : 'shield'}
                  size={20}
                  color={emailVerified ? '#10B981' : '#E67E22'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>
                  {emailVerified ? 'Email Verified' : 'Verify Email'}
                </Text>
                <Text style={{ fontSize: 12, color: emailVerified ? '#10B981' : modalTextSecondaryColor, marginTop: 2 }}>
                  {emailVerified ? 'Your email is verified' : 'Tap to verify your email'}
                </Text>
              </View>
            </View>
            {emailVerified ? (
              <MaterialIcons name="check-circle" size={22} color="#10B981" />
            ) : (
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            )}
          </TouchableOpacity>
        </View>

        {/* CONTENT SECTION */}
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: modalTextTertiaryColor,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginLeft: 4,
        }}>
          Content
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          {/* Bible Version */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate('BibleVersionSheet');
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="menu-book" size={20} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Bible Version</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                {getVersionById(selectedBibleVersion).abbreviation}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Language */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate('LanguageSheet');
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="language" size={20} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Language</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                {availableLanguages.find(l => l.code === language)?.nativeName || 'English'}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Reading Voice - Single button that opens voice picker */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate('ReadingVoiceSheet');
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="record-voice-over" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Reading Voice</Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>
                  {bibleAudioService.isUsingGoogleTTS() ? 'Google Neural (best quality)' : 'Device voice (offline)'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* PREFERENCES SECTION */}
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: modalTextTertiaryColor,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginLeft: 4,
        }}>
          Preferences
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          {/* Weight Unit */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={async () => {
              hapticFeedback.buttonPress();
              const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
              setWeightUnit(newUnit);
              await userStorage.setRaw('weightUnit', newUnit);
              pushToCloud('weightUnit', newUnit);
              const storedProfile = await userStorage.getRaw('userProfile');
              if (storedProfile) {
                const profile = JSON.parse(storedProfile);
                profile.weightUnit = newUnit;
                await userStorage.setRaw('userProfile', JSON.stringify(profile));
              }
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="fitness-center" size={20} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Weight Unit</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                {weightUnit.toUpperCase()}
              </Text>
              <MaterialIcons name="sync" size={18} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Height Unit */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={async () => {
              hapticFeedback.buttonPress();
              const newUnit = heightUnit === 'cm' ? 'ft' : 'cm';
              setHeightUnit(newUnit);
              await userStorage.setRaw('heightUnit', newUnit);
              pushToCloud('heightUnit', newUnit);
              const storedProfile = await userStorage.getRaw('userProfile');
              if (storedProfile) {
                const profile = JSON.parse(storedProfile);
                profile.heightUnit = newUnit;
                await userStorage.setRaw('userProfile', JSON.stringify(profile));
              }
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="straighten" size={20} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Height Unit</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                {heightUnit === 'cm' ? 'CM' : 'FT'}
              </Text>
              <MaterialIcons name="sync" size={18} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Verse Popup */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={async () => {
              hapticFeedback.buttonPress();
              try {
                const dismissType = await getStoredData('votd_dismiss_type');
                if (dismissType) {
                  await saveData('votd_dismiss_type', null);
                  await saveData('votd_dismissed_date', null);
                  Alert.alert('Enabled', 'Verse of the Day popup will show again.');
                } else {
                  Alert.alert('Already Enabled', 'The popup is already enabled.');
                }
              } catch (error) {
                console.error('Error toggling verse popup:', error);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="stars" size={20} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Daily Verse Popup</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Customise Tab Bar */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate('CustomiseTabBar');
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="tab" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Customise Tab Bar</Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>Reorder or hide tabs</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Customise Cards */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate('CustomiseCards');
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#8B5CF620',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="dashboard-customize" size={20} color="#8B5CF6" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Customise Cards</Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>Reorder or hide sections</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate('NotificationsSheet');
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="notifications-none" size={20} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Notifications</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Rate Biblely */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={async () => {
              hapticFeedback.buttonPress();
              try {
                const available = await StoreReview.isAvailableAsync();
                if (available) {
                  await StoreReview.requestReview();
                }
              } catch (e) {
                console.warn('[SettingsScreen] StoreReview failed:', e?.message);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#FF950020',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="star" size={20} color="#FF9500" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Rate Biblely</Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>Help us improve with your feedback</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Sync */}
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: theme.primary,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginLeft: 4,
        }}>
          Calendar
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${theme.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="event" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>
                  Sync to iPhone Calendar
                </Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>
                  Add your prayers, reminders, workouts and tasks to your calendar
                </Text>
              </View>
            </View>
            <Switch
              value={calendarSyncEnabled}
              onValueChange={handleCalendarSyncToggle}
              trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
              thumbColor="#fff"
            />
          </View>

          {calendarSyncEnabled && (
            <>
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>
                  Calendar Alert
                </Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>
                  When the Calendar app reminds you. Off silences every calendar alert; other values let items with their own reminder time keep it.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {[
                    { value: -1, label: 'Off' },
                    { value: 0, label: 'At start' },
                    { value: 5, label: '5 min' },
                    { value: 10, label: '10 min' },
                    { value: 15, label: '15 min' },
                    { value: 30, label: '30 min' },
                    { value: 60, label: '1 hour' },
                  ].map((opt) => {
                    const on = calAlarmMin === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => handleSelectCalAlarm(opt.value)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 9,
                          borderWidth: 1,
                          borderColor: on ? theme.primary : (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'),
                          backgroundColor: on ? `${theme.primary}22` : 'transparent',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: on ? theme.primary : modalTextColor }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* Quick task default time */}
          <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${theme.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="schedule" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Add quick tasks to calendar</Text>
                <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>Quick tasks get this time so they show on your calendar</Text>
              </View>
            </View>
            <Switch
              value={quickTaskCalEnabled}
              onValueChange={handleQuickTaskCalToggle}
              trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
          {quickTaskCalEnabled && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginBottom: 8 }}>Default time</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[['09:00', '9 AM'], ['12:00', '12 PM'], ['15:00', '3 PM'], ['18:00', '6 PM'], ['21:00', '9 PM']].map(([val, label]) => {
                  const active = quickTaskTime === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => handleQuickTaskTimeSelect(val)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, backgroundColor: active ? theme.primary : 'transparent', borderColor: active ? theme.primary : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)') }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#fff' : modalTextColor }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ADMIN ANALYTICS - Only visible to admin */}
        {isAdmin && (
          <>
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: theme.primary,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Admin
            </Text>
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  openChild('adminAnalytics');
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="bar-chart" size={20} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text }}>User Analytics</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Separator */}
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', marginHorizontal: 16 }} />

              {/* Reports Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  openChild('adminReports');
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FF3B3020',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="report" size={20} color="#FF3B30" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text }}>User Reports</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Separator */}
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', marginHorizontal: 16 }} />

              {/* User Experience / Feedback */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  openChild('adminFeedback');
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FF950020',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="rate-review" size={20} color="#FF9500" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text }}>User Experience</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* SIGN OUT */}
        <View style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderRadius: 16,
          marginBottom: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="logout" size={20} color={theme.error || '#EF4444'} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: theme.error || '#EF4444' }}>Sign Out</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {user?.email || 'Signed in'}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.error || '#EF4444'} />
          </TouchableOpacity>
        </View>

        {/* DANGER ZONE SECTION */}
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#FF3B30',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginLeft: 4,
        }}>
          Danger Zone
        </Text>

        <View style={{
          backgroundColor: 'rgba(255, 59, 48, 0.1)',
          borderRadius: 16,
          marginBottom: 40,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255, 59, 48, 0.2)',
        }}>
          {/* Reset Fitness Data — fitness only, nothing else */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => { hapticFeedback.light(); setResetOpen((v) => !v); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reset fitness data"
            accessibilityHint="Expands a checklist of what to clear"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 149, 0, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="fitness-center" size={20} color="#FF9500" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#FF9500' }}>Reset Fitness Data</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Pick what to clear — keep templates and custom exercises if you like</Text>
              </View>
            </View>
            <MaterialIcons name={resetOpen ? 'expand-less' : 'chevron-right'} size={20} color="#FF9500" />
          </TouchableOpacity>
          {resetOpen && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
              {RESET_OPTIONS.map((o) => {
                const on = !!resetPicks[o.key];
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => toggleResetPick(o.key)}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={o.label}
                  >
                    <MaterialIcons name={on ? 'check-box' : 'check-box-outline-blank'} size={22} color={on ? '#FF9500' : theme.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{o.label}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>{o.hint}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={handleResetFitness}
                disabled={!pickedCount}
                activeOpacity={0.8}
                style={{ marginTop: 8, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: pickedCount ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255,149,0,0.08)', borderWidth: 1, borderColor: pickedCount ? '#FF9500AA' : '#FF950040' }}
                accessibilityRole="button"
                accessibilityLabel="Reset selected fitness data"
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: pickedCount ? '#FF9500' : theme.textSecondary }}>
                  {pickedCount ? `Reset ${pickedCount} selected` : 'Pick something to reset'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Delete Account */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 59, 48, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="delete-outline" size={20} color="#FF3B30" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#FF3B30' }}>Delete Account</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;

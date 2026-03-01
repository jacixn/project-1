/**
 * ScaleConnectionModal
 *
 * Premium BLE scale connection UI with:
 * - Animated radar scanning pulse
 * - Device list with signal strength indicators
 * - Real-time weight + body fat display with animated ring
 * - Body composition readout when available
 * - Status transitions with haptic feedback
 *
 * After weight stabilises, waits up to 4 s for the scale to send
 * body composition data before finalising the reading.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  FlatList,
  ActivityIndicator,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import scaleService from '../services/scaleService';
import nutritionService from '../services/nutritionService';

const RING_SIZE = 200;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ScaleConnectionModal = ({ visible, onClose, onReadingSaved }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // State
  const [phase, setPhase] = useState('idle');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [liveWeight, setLiveWeight] = useState(null);
  const [liveBodyFat, setLiveBodyFat] = useState(null);
  const [stableReading, setStableReading] = useState(null);
  const [savedDevice, setSavedDevice] = useState(null);
  const [error, setError] = useState(null);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulse2Anim = useRef(new Animated.Value(0)).current;
  const pulse3Anim = useRef(new Animated.Value(0)).current;
  const scanRotate = useRef(new Animated.Value(0)).current;
  const weightScale = useRef(new Animated.Value(0.5)).current;
  const weightOpacity = useRef(new Animated.Value(0)).current;
  const ringProgress = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const deviceListOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  const pulseLoop = useRef(null);
  const profileRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const phaseRef = useRef('idle');
  const bodyCompTimerRef = useRef(null);
  const stableDataRef = useRef(null);

  const textPrimary = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : '#555';
  const textTertiary = isDark ? 'rgba(255,255,255,0.45)' : '#999';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const surfaceBg = isDark ? '#0F0F23' : '#F8F9FB';

  const ACCENT = '#6366F1';
  const ACCENT_END = '#8B5CF6';
  const SUCCESS = '#10B981';
  const SUCCESS_END = '#059669';

  useEffect(() => {
    if (visible) {
      resetState();
      loadSavedDevice();
      loadProfile();
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      scaleService.stopScan();
    }
  }, [visible]);

  const loadProfile = async () => {
    profileRef.current = await nutritionService.getProfile();
  };

  const loadSavedDevice = async () => {
    setSavedDevice(await scaleService.getSavedDevice());
  };

  const updatePhase = (newPhase) => {
    phaseRef.current = newPhase;
    setPhase(newPhase);
  };

  const resetState = () => {
    if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
    if (bodyCompTimerRef.current) { clearTimeout(bodyCompTimerRef.current); bodyCompTimerRef.current = null; }
    stableDataRef.current = null;
    updatePhase('idle');
    setDevices([]);
    setSelectedDevice(null);
    setConnectionStatus('');
    setLiveWeight(null);
    setLiveBodyFat(null);
    setStableReading(null);
    setError(null);
    fadeIn.setValue(0);
    slideUp.setValue(SHEET_HEIGHT);
    panY.setValue(0);
    pulseAnim.setValue(0);
    pulse2Anim.setValue(0);
    pulse3Anim.setValue(0);
    scanRotate.setValue(0);
    weightScale.setValue(0.5);
    weightOpacity.setValue(0);
    ringProgress.setValue(0);
    successScale.setValue(0);
    deviceListOpacity.setValue(0);
    glowPulse.setValue(0.3);
  };

  // ── Scanning ──

  const startScan = async () => {
    updatePhase('scanning');
    setDevices([]);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startScanAnimation();

    try {
      await scaleService.startScan((device) => {
        setDevices(prev => {
          if (prev.find(d => d.id === device.id)) return prev;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return [...prev, device];
        });
      }, 15000);

      scanTimeoutRef.current = setTimeout(() => {
        const currentPhase = phaseRef.current;
        if (currentPhase === 'connecting' || currentPhase === 'measuring' || currentPhase === 'done') return;
        setDevices(prev => {
          if (prev.length > 0) {
            updatePhase('devices');
            Animated.timing(deviceListOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
          } else {
            setError('No scales found nearby. Make sure your scale is on and in pairing mode.');
            updatePhase('idle');
          }
          return prev;
        });
      }, 16000);
    } catch (err) {
      setError(err.message);
      updatePhase('idle');
    }
  };

  useEffect(() => {
    if (phase === 'scanning' && devices.length > 0) {
      updatePhase('devices');
      Animated.timing(deviceListOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [devices.length, phase]);

  const startScanAnimation = () => {
    const createPulse = (anim, delay) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
    Animated.parallel([
      createPulse(pulseAnim, 0), createPulse(pulse2Anim, 700), createPulse(pulse3Anim, 1400),
      Animated.loop(Animated.timing(scanRotate, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })),
    ]).start();
  };

  const stopScanAnimation = () => {
    pulseAnim.stopAnimation();
    pulse2Anim.stopAnimation();
    pulse3Anim.stopAnimation();
    scanRotate.stopAnimation();
  };

  // ── Connection ──

  const onConnected = useCallback(() => {
    updatePhase('measuring');
    startMeasuringAnimation();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const p = profileRef.current;
    if (p) {
      scaleService.sendUserProfile(p.gender, p.age, p.heightCm, p.weightKg);
    }
  }, []);

  const connectToDevice = async (device) => {
    stopScanAnimation();
    scaleService.stopScan();
    if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
    setSelectedDevice(device);
    updatePhase('connecting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await scaleService.connect(
        device.id,
        (data) => handleScaleData(data),
        (status) => { setConnectionStatus(status); if (status === 'connected') onConnected(); }
      );
    } catch (err) {
      setError(`Could not connect to ${device.name}. Please try again.`);
      updatePhase('devices');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const reconnectSaved = async () => {
    if (!savedDevice) return;
    setSelectedDevice(savedDevice);
    updatePhase('connecting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await scaleService.connect(
        savedDevice.id,
        (data) => handleScaleData(data),
        (status) => { setConnectionStatus(status); if (status === 'connected') onConnected(); }
      );
    } catch (err) {
      setError('Could not reconnect. Try scanning for devices.');
      updatePhase('idle');
    }
  };

  const startMeasuringAnimation = () => {
    Animated.parallel([
      Animated.spring(weightScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(weightOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    pulseLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.8, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulseLoop.current.start();
  };

  // ── Data Handling ──

  const finalizeMeasurement = useCallback((data) => {
    if (phaseRef.current !== 'measuring') return;

    if (bodyCompTimerRef.current) { clearTimeout(bodyCompTimerRef.current); bodyCompTimerRef.current = null; }
    stableDataRef.current = null;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStableReading(data);
    updatePhase('done');

    pulseLoop.current?.stop();
    Animated.parallel([
      Animated.timing(ringProgress, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    saveReading(data);
  }, []);

  const handleScaleData = useCallback((data) => {
    if (!data) return;

    // Update live displays with whatever the scale sends
    if (data.weightKg) setLiveWeight(data.weightKg);

    let bf = data.bodyFatPercent || null;
    if (!bf && data.impedance && profileRef.current) {
      const p = profileRef.current;
      bf = scaleService.calculateBodyFat(data.impedance, data.weightKg, p.heightCm, p.age, p.gender === 'male');
    }
    if (bf) setLiveBodyFat(bf);

    if (!data.weightKg || data.weightKg < 25 || !data.stable) return;
    if (phaseRef.current !== 'measuring') return;

    // Weight stable — build reading with all accumulated body comp
    const reading = {
      ...data,
      bodyFatPercent: bf || data.bodyFatPercent || null,
    };

    if (reading.bodyFatPercent) {
      finalizeMeasurement(reading);
      return;
    }

    // No body comp yet — store data and wait up to 15 s for impedance packet
    stableDataRef.current = reading;
    if (!bodyCompTimerRef.current) {
      bodyCompTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'measuring' && stableDataRef.current) {
          finalizeMeasurement(stableDataRef.current);
        }
      }, 15000);
    }
  }, [finalizeMeasurement]);

  const saveReading = async (reading) => {
    await scaleService.saveReading(reading);

    const profile = await nutritionService.getProfile();
    if (profile) {
      const updates = { ...profile, weightKg: reading.weightKg };
      if (reading.bodyFatPercent) updates.bodyFatPercent = reading.bodyFatPercent;
      await nutritionService.saveProfile(updates);
    }
    onReadingSaved?.(reading);
  };

  const handleCloseRef = useRef(null);

  const handleClose = useCallback(() => {
    stopScanAnimation();
    scaleService.stopScan();
    if (bodyCompTimerRef.current) { clearTimeout(bodyCompTimerRef.current); bodyCompTimerRef.current = null; }
    if (phaseRef.current !== 'measuring') scaleService.disconnect();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(slideUp, { toValue: SHEET_HEIGHT, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      panY.setValue(0);
      onClose();
    });
  }, [onClose]);

  handleCloseRef.current = handleClose;

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) panY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) {
          handleCloseRef.current?.();
        } else {
          Animated.spring(panY, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const forgetDevice = async () => {
    await scaleService.forgetDevice();
    setSavedDevice(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getSignalBars = (rssi) => {
    if (!rssi) return 1;
    if (rssi > -50) return 4;
    if (rssi > -65) return 3;
    if (rssi > -80) return 2;
    return 1;
  };

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  const renderPulseRing = (anim, size) => (
    <Animated.View style={[styles.pulseRing, {
      width: size, height: size, borderRadius: size / 2,
      borderColor: ACCENT,
      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }],
    }]} />
  );

  const renderIdlePhase = () => (
    <View style={styles.phaseContainer}>
      <View style={styles.iconContainer}>
        <LinearGradient colors={[ACCENT + '20', ACCENT_END + '10']} style={styles.iconGlow} />
        <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }]}>
          <MaterialIcons name="bluetooth-searching" size={44} color={ACCENT} />
        </View>
      </View>

      <Text style={[styles.phaseTitle, { color: textPrimary }]}>Smart Scale</Text>
      <Text style={[styles.phaseDesc, { color: textSecondary }]}>
        Connect your Bluetooth body composition scale to automatically track your weight and body fat.
      </Text>

      {savedDevice && (
        <TouchableOpacity style={[styles.savedDeviceCard, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)', borderColor: ACCENT + '30' }]} onPress={reconnectSaved} activeOpacity={0.7}>
          <View style={styles.savedDeviceRow}>
            <MaterialIcons name="bluetooth-connected" size={20} color={ACCENT} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.savedDeviceName, { color: textPrimary }]}>{savedDevice.name}</Text>
              <Text style={[styles.savedDeviceHint, { color: ACCENT }]}>Tap to reconnect</Text>
            </View>
            <TouchableOpacity onPress={forgetDevice} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialIcons name="close" size={18} color={textTertiary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={startScan} activeOpacity={0.8}>
        <LinearGradient colors={[ACCENT, ACCENT_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
          <MaterialIcons name="search" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>Scan for Scales</Text>
        </LinearGradient>
      </TouchableOpacity>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
          <MaterialIcons name="error-outline" size={16} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
        </View>
      )}
    </View>
  );

  const renderScanningPhase = () => (
    <View style={styles.phaseContainer}>
      <View style={styles.radarContainer}>
        {renderPulseRing(pulseAnim, 180)}
        {renderPulseRing(pulse2Anim, 180)}
        {renderPulseRing(pulse3Anim, 180)}
        <Animated.View style={{ transform: [{ rotate: scanRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <View style={[styles.scanCenter, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
            <MaterialIcons name="bluetooth-searching" size={32} color={ACCENT} />
          </View>
        </Animated.View>
      </View>
      <Text style={[styles.phaseTitle, { color: textPrimary }]}>Scanning...</Text>
      <Text style={[styles.phaseDesc, { color: textSecondary }]}>
        Looking for nearby Bluetooth scales.{'\n'}Make sure your scale is powered on.
      </Text>
    </View>
  );

  const renderDevicesPhase = () => (
    <Animated.View style={[styles.phaseContainer, { opacity: deviceListOpacity }]}>
      <Text style={[styles.phaseTitle, { color: textPrimary, marginBottom: 4 }]}>Devices Found</Text>
      <Text style={[styles.phaseDesc, { color: textSecondary, marginBottom: 16 }]}>Tap your scale to connect</Text>

      <FlatList
        data={devices}
        keyExtractor={d => d.id}
        style={styles.deviceList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const bars = getSignalBars(item.rssi);
          return (
            <TouchableOpacity
              style={[styles.deviceCard, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              onPress={() => connectToDevice(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.deviceIcon, { backgroundColor: ACCENT + '14' }]}>
                <MaterialIcons name="monitor-weight" size={22} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.deviceName, { color: textPrimary }]}>{item.name}</Text>
                <Text style={[styles.deviceId, { color: textTertiary }]}>
                  Signal: {bars === 4 ? 'Excellent' : bars === 3 ? 'Good' : bars === 2 ? 'Fair' : 'Weak'}
                </Text>
              </View>
              <View style={styles.signalBars}>
                {[1, 2, 3, 4].map(i => (
                  <View key={i} style={[styles.signalBar, {
                    height: 6 + i * 4,
                    backgroundColor: i <= bars ? ACCENT : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                  }]} />
                ))}
              </View>
              <MaterialIcons name="chevron-right" size={20} color={textTertiary} />
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={[styles.secondaryBtn, { borderColor: ACCENT + '40' }]} onPress={startScan} activeOpacity={0.7}>
        <MaterialIcons name="refresh" size={18} color={ACCENT} />
        <Text style={[styles.secondaryBtnText, { color: ACCENT }]}>Scan Again</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderConnectingPhase = () => (
    <View style={styles.phaseContainer}>
      <View style={[styles.connectingRing, { borderColor: ACCENT + '30' }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
      <Text style={[styles.phaseTitle, { color: textPrimary }]}>Connecting...</Text>
      <Text style={[styles.phaseDesc, { color: textSecondary }]}>
        Establishing connection to{'\n'}{selectedDevice?.name || 'your scale'}
      </Text>
    </View>
  );

  const renderMeasuringPhase = () => (
    <Animated.View style={[styles.phaseContainer, { opacity: weightOpacity, transform: [{ scale: weightScale }] }]}>
      <View style={styles.measureContainer}>
        <Animated.View style={[styles.measureGlow, { backgroundColor: ACCENT, opacity: glowPulse }]} />
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.measureRing}>
          <Defs>
            <SvgGrad id="measGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={ACCENT} />
              <Stop offset="1" stopColor={ACCENT_END} />
            </SvgGrad>
          </Defs>
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={RING_STROKE} fill="none" />
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="url(#measGrad)" strokeWidth={RING_STROKE} fill="none" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={RING_CIRCUMFERENCE * 0.25} strokeLinecap="round" rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
        </Svg>
        <View style={styles.measureCenter}>
          <Text style={[styles.liveWeight, { color: textPrimary }]}>{liveWeight ? liveWeight.toFixed(1) : '--.-'}</Text>
          <Text style={[styles.liveUnit, { color: ACCENT }]}>kg</Text>
        </View>
      </View>

      <Text style={[styles.phaseTitle, { color: textPrimary }]}>Step on the Scale</Text>
      <Text style={[styles.phaseDesc, { color: textSecondary }]}>
        Stand still on your scale.{'\n'}The reading will lock when stable.
      </Text>

      {liveWeight && (
        <View style={[styles.liveIndicator, { backgroundColor: ACCENT + '18' }]}>
          <View style={[styles.liveDot, { backgroundColor: ACCENT }]} />
          <Text style={[styles.liveText, { color: ACCENT }]}>
            {liveBodyFat ? `${liveWeight?.toFixed(1)} kg · ${liveBodyFat.toFixed(1)}% fat` : 'Receiving data...'}
          </Text>
        </View>
      )}
    </Animated.View>
  );

  const renderDonePhase = () => {
    const bf = stableReading?.bodyFatPercent || liveBodyFat;

    return (
      <View style={styles.phaseContainer}>
        <Animated.View style={[styles.doneContainer, { transform: [{ scale: successScale }] }]}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Defs>
              <SvgGrad id="doneGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={SUCCESS} />
                <Stop offset="1" stopColor={SUCCESS_END} />
              </SvgGrad>
            </Defs>
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={RING_STROKE} fill="none" />
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="url(#doneGrad)" strokeWidth={RING_STROKE} fill="none" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={ringProgress.interpolate({ inputRange: [0, 1], outputRange: [RING_CIRCUMFERENCE, 0] })} strokeLinecap="round" rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
          </Svg>
          <View style={styles.measureCenter}>
            <Text style={[styles.doneWeight, { color: SUCCESS }]}>{stableReading?.weightKg?.toFixed(1) || '--.-'}</Text>
            <Text style={[styles.doneUnit, { color: SUCCESS }]}>kg</Text>
          </View>
        </Animated.View>

        <View style={styles.doneMetrics}>
          <View style={styles.doneMetricItem}>
            <MaterialIcons name="monitor-weight" size={20} color={SUCCESS} />
            <Text style={[styles.doneMetricValue, { color: textPrimary }]}>{stableReading?.weightKg?.toFixed(1)} kg</Text>
            <Text style={[styles.doneMetricLabel, { color: textTertiary }]}>Weight</Text>
          </View>

          {bf ? (
            <>
              <View style={[styles.doneMetricDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
              <View style={styles.doneMetricItem}>
                <MaterialIcons name="pie-chart" size={20} color="#F59E0B" />
                <Text style={[styles.doneMetricValue, { color: textPrimary }]}>{bf.toFixed(1)}%</Text>
                <Text style={[styles.doneMetricLabel, { color: textTertiary }]}>Body Fat</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={[styles.savedBadge, { backgroundColor: SUCCESS + '14' }]}>
          <MaterialIcons name="check-circle" size={16} color={SUCCESS} />
          <Text style={[styles.savedBadgeText, { color: SUCCESS }]}>Reading saved & profile updated</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleClose} activeOpacity={0.8}>
          <LinearGradient colors={[SUCCESS, SUCCESS_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
            <MaterialIcons name="check" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPhase = () => {
    switch (phase) {
      case 'idle': return renderIdlePhase();
      case 'scanning': return renderScanningPhase();
      case 'devices': return renderDevicesPhase();
      case 'connecting': return renderConnectingPhase();
      case 'measuring': return renderMeasuringPhase();
      case 'done': return renderDonePhase();
      default: return renderIdlePhase();
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeIn }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <Animated.View
          style={[styles.sheet, {
            backgroundColor: surfaceBg,
            paddingBottom: insets.bottom + 20,
            transform: [{ translateY: Animated.add(slideUp, panY) }],
          }]}
        >
          <View {...sheetPanResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />
            </View>
          </View>
          {renderPhase()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: 460, maxHeight: '90%' },
  dragZone: { width: '100%', paddingBottom: 16 },
  handleRow: { alignItems: 'center', paddingTop: 14, paddingBottom: 10 },
  handle: { width: 40, height: 5, borderRadius: 3 },

  phaseContainer: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 8 },

  iconContainer: { marginBottom: 20 },
  iconGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, top: -16, left: -16 },
  iconCircle: { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  phaseTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 },
  phaseDesc: { fontSize: 15, fontWeight: '400', textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 8 },

  savedDeviceCard: { width: '100%', borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  savedDeviceRow: { flexDirection: 'row', alignItems: 'center' },
  savedDeviceName: { fontSize: 15, fontWeight: '600' },
  savedDeviceHint: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  primaryBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, gap: 6, width: '100%', marginTop: 12 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 12, width: '100%' },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 19 },

  radarContainer: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  pulseRing: { position: 'absolute', borderWidth: 2 },
  scanCenter: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },

  deviceList: { width: '100%', maxHeight: 240, marginBottom: 4 },
  deviceCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8, gap: 12 },
  deviceIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deviceName: { fontSize: 15, fontWeight: '600' },
  deviceId: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginRight: 4 },
  signalBar: { width: 4, borderRadius: 2 },

  connectingRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },

  measureContainer: { width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  measureGlow: { position: 'absolute', width: RING_SIZE - 40, height: RING_SIZE - 40, borderRadius: (RING_SIZE - 40) / 2 },
  measureRing: { position: 'absolute' },
  measureCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  liveWeight: { fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  liveUnit: { fontSize: 16, fontWeight: '700', marginTop: -2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 13, fontWeight: '600' },

  doneContainer: { width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  doneWeight: { fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  doneUnit: { fontSize: 16, fontWeight: '700', marginTop: -2 },
  doneMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 20 },
  doneMetricItem: { alignItems: 'center', gap: 4 },
  doneMetricValue: { fontSize: 17, fontWeight: '700' },
  doneMetricLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  doneMetricDivider: { width: 1, height: 40 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 20 },
  savedBadgeText: { fontSize: 13, fontWeight: '600' },
});

export default ScaleConnectionModal;

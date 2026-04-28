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

  // Multi-attempt
  const [attempts, setAttempts] = useState([]);
  const TOTAL_ATTEMPTS = 3;
  const attemptsRef = useRef([]);
  const needsStepOffRef = useRef(false);
  const seenUnstableRef = useRef(true);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const STEP_OFF_SECONDS = 5;

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
  const selectedDeviceRef = useRef(null);
  const startNextAttemptRef = useRef(null);
  const autoProceedRef = useRef(null);
  const retryTimerRef = useRef(null);
  const noDataTimerRef = useRef(null);
  const reconnectForAttemptRef = useRef(null);
  const reconnectGenRef = useRef(0);
  const isRetryingRef = useRef(false);

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
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (autoProceedRef.current) { clearTimeout(autoProceedRef.current); autoProceedRef.current = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (noDataTimerRef.current) { clearTimeout(noDataTimerRef.current); noDataTimerRef.current = null; }
    reconnectGenRef.current++;
    isRetryingRef.current = false;
    stableDataRef.current = null;
    updatePhase('idle');
    setDevices([]);
    setSelectedDevice(null);
    setConnectionStatus('');
    setLiveWeight(null);
    setLiveBodyFat(null);
    setStableReading(null);
    setError(null);
    setAttempts([]);
    setCountdown(null);
    attemptsRef.current = [];
    needsStepOffRef.current = false;
    seenUnstableRef.current = true;
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
        if (currentPhase === 'connecting' || currentPhase === 'measuring' || currentPhase === 'attemptDone' || currentPhase === 'done') return;
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
      setError('Unable to connect to your scale. Please make sure it is turned on and nearby.');
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
    selectedDeviceRef.current = device;
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
    selectedDeviceRef.current = savedDevice;
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
    console.log('[ScaleModal] FINALIZE called — phase:', phaseRef.current, 'data:', JSON.stringify({ weightKg: data?.weightKg, bf: data?.bodyFatPercent, imp: data?.impedance }));
    if (phaseRef.current !== 'measuring') return;

    if (bodyCompTimerRef.current) { clearTimeout(bodyCompTimerRef.current); bodyCompTimerRef.current = null; }
    stableDataRef.current = null;

    if (!data.bodyFatPercent && data.impedance && profileRef.current) {
      const p = profileRef.current;
      const bf = scaleService.calculateBodyFat(data.impedance, data.weightKg, p.heightCm, p.age, p.gender === 'male');
      if (bf) {
        data = { ...data, bodyFatPercent: bf };
        console.log('[ScaleModal] Finalize fallback BF computed:', bf);
      } else {
        console.log('[ScaleModal] Finalize fallback BF null — profile:', JSON.stringify({ heightCm: p.heightCm, age: p.age, gender: p.gender }));
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStableReading(data);

    const updated = [...attemptsRef.current, data];
    attemptsRef.current = updated;
    setAttempts(updated);

    if (updated.length >= TOTAL_ATTEMPTS) {
      const best = pickConsensusReading(updated);
      setStableReading(best);
      updatePhase('done');
      pulseLoop.current?.stop();
      Animated.parallel([
        Animated.timing(ringProgress, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
      saveReading(best);
    } else {
      updatePhase('attemptDone');
      pulseLoop.current?.stop();
    }
  }, []);

  const handleScaleData = useCallback((data) => {
    if (!data) return;

    if (needsStepOffRef.current) return;

    if (data.weightKg && noDataTimerRef.current) {
      clearTimeout(noDataTimerRef.current);
      noDataTimerRef.current = null;
    }

    if (data.weightKg) setLiveWeight(data.weightKg);

    let bf = data.bodyFatPercent || null;
    if (!bf && data.impedance && profileRef.current) {
      const p = profileRef.current;
      bf = scaleService.calculateBodyFat(data.impedance, data.weightKg, p.heightCm, p.age, p.gender === 'male');
      if (!bf) {
        console.log('[ScaleModal] BF compute returned null — profile:', JSON.stringify({ heightCm: p.heightCm, age: p.age, gender: p.gender, weightKg: p.weightKg }), 'impedance:', data.impedance);
      } else {
        console.log('[ScaleModal] BF computed:', bf, 'from impedance:', data.impedance);
      }
    } else if (!bf && data.impedance && !profileRef.current) {
      console.log('[ScaleModal] BF skip — profile not loaded, impedance:', data.impedance);
    }
    if (bf) setLiveBodyFat(bf);

    if (!data.stable) seenUnstableRef.current = true;

    console.log('[ScaleModal] tick — stable:', data.stable, 'phase:', phaseRef.current, 'timerArmed:', !!bodyCompTimerRef.current, 'weight:', data.weightKg, 'bf:', bf);

    if (!data.weightKg || data.weightKg < 25 || !data.stable) return;
    if (phaseRef.current !== 'measuring') return;

    // Weight stable — build reading with all accumulated body comp
    const reading = {
      ...data,
      bodyFatPercent: bf || data.bodyFatPercent || null,
    };

    // Always store latest stable reading — overwritten each tick with newest body comp
    stableDataRef.current = reading;

    // Wait for scale to settle body composition computation. Each new stable packet
    // updates stableDataRef.current; timer fires once with the LAST/most-recent reading.
    // Longer wait when bf still missing (scale hasn't sent body comp yet).
    if (!bodyCompTimerRef.current) {
      const settleMs = reading.bodyFatPercent ? 4000 : 15000;
      bodyCompTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'measuring' && stableDataRef.current) {
          finalizeMeasurement(stableDataRef.current);
        }
      }, settleMs);
    }
  }, [finalizeMeasurement]);

  const saveReading = async (reading) => {
    await scaleService.saveReading(reading);

    const profile = await nutritionService.getProfile();
    if (profile) {
      const weightChanged = Math.abs((profile.weightKg || 0) - reading.weightKg) > 0.3;
      const bfChanged = reading.bodyFatPercent && Math.abs((profile.bodyFatPercent || 0) - reading.bodyFatPercent) > 0.5;

      const updates = { ...profile, weightKg: reading.weightKg };
      if (reading.bodyFatPercent) updates.bodyFatPercent = reading.bodyFatPercent;

      if (profile.aiTargets && (weightChanged || bfChanged)) {
        updates.pendingScaleUpdate = true;
        updates.scaleUpdatedAt = new Date().toISOString();
      }

      await nutritionService.saveProfile(updates);
    }
    onReadingSaved?.(reading);
  };

  // ── Consensus logic ──

  const pickConsensusReading = (readings) => {
    if (readings.length <= 1) return readings[0] || null;

    const WEIGHT_TOL = 1.0;
    const BF_TOL = 2.0;

    const agrees = (a, b) => {
      if (Math.abs((a.weightKg || 0) - (b.weightKg || 0)) > WEIGHT_TOL) return false;
      const bfA = a.bodyFatPercent || 0;
      const bfB = b.bodyFatPercent || 0;
      if (!bfA && !bfB) return true;
      return Math.abs(bfA - bfB) <= BF_TOL;
    };

    const avgOf = (arr) => {
      const n = arr.length;
      const w = arr.reduce((s, r) => s + (r.weightKg || 0), 0) / n;
      const bfs = arr.filter(r => r.bodyFatPercent).map(r => r.bodyFatPercent);
      const bf = bfs.length ? bfs.reduce((s, v) => s + v, 0) / bfs.length : null;
      return {
        ...arr[0],
        weightKg: Math.round(w * 100) / 100,
        bodyFatPercent: bf ? Math.round(bf * 10) / 10 : null,
      };
    };

    if (readings.length === 2) {
      const [a, b] = readings;
      if (agrees(a, b)) return avgOf([a, b]);
      return readings[readings.length - 1];
    }

    if (readings.length >= 3) {
      const [a, b, c] = readings;
      const ab = agrees(a, b);
      const ac = agrees(a, c);
      const bc = agrees(b, c);
      if (ab && ac && bc) return avgOf(readings);
      if (ab) return avgOf([a, b]);
      if (ac) return avgOf([a, c]);
      if (bc) return avgOf([b, c]);
    }

    const sorted = [...readings].sort((a, b) => (a.weightKg || 0) - (b.weightKg || 0));
    return sorted[Math.floor(sorted.length / 2)];
  };

  const reconnectForAttempt = async () => {
    const gen = ++reconnectGenRef.current;

    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (noDataTimerRef.current) { clearTimeout(noDataTimerRef.current); noDataTimerRef.current = null; }

    if (phaseRef.current !== 'measuring') return;

    if (!isRetryingRef.current) {
      needsStepOffRef.current = true;
      setCountdown(0);
    }
    scaleService.resetMeasurement();

    const device = selectedDeviceRef.current;
    if (!device) { needsStepOffRef.current = false; setCountdown(null); return; }

    try {
      scaleService.disconnect();
      await new Promise(r => setTimeout(r, 500));

      if (gen !== reconnectGenRef.current || phaseRef.current !== 'measuring') return;

      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }

      await scaleService.connect(
        device.id,
        (data) => handleScaleData(data),
        (status) => {
          if (gen !== reconnectGenRef.current) return;

          setConnectionStatus(status);
          if (status === 'connected') {
            isRetryingRef.current = false;
            scaleService.resetMeasurement();
            const p = profileRef.current;
            if (p) scaleService.sendUserProfile(p.gender, p.age, p.heightCm, p.weightKg);
            needsStepOffRef.current = false;
            seenUnstableRef.current = false;
            setCountdown(null);

            noDataTimerRef.current = setTimeout(() => {
              if (gen !== reconnectGenRef.current) return;
              if (phaseRef.current === 'measuring' && !stableDataRef.current) {
                console.log('[Scale] No data received after reconnect — retrying connection...');
                isRetryingRef.current = true;
                reconnectForAttemptRef.current?.();
              }
            }, 12000);
          }

          if (status === 'disconnected' && phaseRef.current === 'measuring') {
            retryTimerRef.current = setTimeout(() => {
              if (gen !== reconnectGenRef.current) return;
              if (phaseRef.current === 'measuring') {
                console.log('[Scale] Disconnected during measurement — retrying...');
                isRetryingRef.current = true;
                reconnectForAttemptRef.current?.();
              }
            }, 2000);
          }
        }
      );
    } catch (err) {
      if (gen !== reconnectGenRef.current) return;
      console.warn('[Scale] Reconnect for next attempt failed:', err.message);
      isRetryingRef.current = true;
      needsStepOffRef.current = false;
      setCountdown(null);
      if (phaseRef.current === 'measuring') {
        retryTimerRef.current = setTimeout(() => {
          if (gen !== reconnectGenRef.current) return;
          if (phaseRef.current === 'measuring') {
            console.log('[Scale] Connection failed — retrying...');
            reconnectForAttemptRef.current?.();
          }
        }, 3000);
      }
    }
  };

  reconnectForAttemptRef.current = reconnectForAttempt;

  const startNextAttempt = () => {
    if (bodyCompTimerRef.current) { clearTimeout(bodyCompTimerRef.current); bodyCompTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    stableDataRef.current = null;
    setLiveWeight(null);
    setLiveBodyFat(null);
    setStableReading(null);
    needsStepOffRef.current = true;
    seenUnstableRef.current = false;
    isRetryingRef.current = false;
    setCountdown(STEP_OFF_SECONDS);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          setTimeout(() => reconnectForAttemptRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    updatePhase('measuring');
    startMeasuringAnimation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  startNextAttemptRef.current = startNextAttempt;

  const handleGoodToGo = () => {
    if (autoProceedRef.current) { clearTimeout(autoProceedRef.current); autoProceedRef.current = null; }
    if (bodyCompTimerRef.current) { clearTimeout(bodyCompTimerRef.current); bodyCompTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }

    const currentAttempts = attemptsRef.current;
    const best = pickConsensusReading(currentAttempts);
    setStableReading(best);
    updatePhase('done');
    pulseLoop.current?.stop();
    Animated.parallel([
      Animated.timing(ringProgress, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    saveReading(best);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleNextAttempt = useCallback(() => {
    if (autoProceedRef.current) { clearTimeout(autoProceedRef.current); autoProceedRef.current = null; }
    startNextAttemptRef.current?.();
  }, []);

  const handleCloseRef = useRef(null);

  const handleClose = useCallback(() => {
    stopScanAnimation();
    scaleService.stopScan();
    if (bodyCompTimerRef.current) { clearTimeout(bodyCompTimerRef.current); bodyCompTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (autoProceedRef.current) { clearTimeout(autoProceedRef.current); autoProceedRef.current = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (noDataTimerRef.current) { clearTimeout(noDataTimerRef.current); noDataTimerRef.current = null; }
    scaleService.disconnect();
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

  const renderAttemptIndicator = () => {
    const completedCount = attempts.length;
    return (
      <View style={styles.attemptRow}>
        {[1, 2, 3].map((num) => {
          const isDone = num <= completedCount;
          const isActive = num === completedCount + 1;
          return (
            <React.Fragment key={num}>
              {num > 1 && (
                <View style={[styles.attemptLine, { backgroundColor: isDone ? SUCCESS : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }]} />
              )}
              <View style={[
                styles.attemptDot,
                isDone && { backgroundColor: SUCCESS, borderColor: SUCCESS },
                isActive && { backgroundColor: ACCENT, borderColor: ACCENT },
                !isDone && !isActive && { backgroundColor: 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
              ]}>
                {isDone ? (
                  <MaterialIcons name="check" size={12} color="#FFF" />
                ) : (
                  <Text style={[styles.attemptDotText, { color: isActive ? '#FFF' : textTertiary }]}>{num}</Text>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderMeasuringPhase = () => {
    const attemptNum = attempts.length + 1;
    const isRetry = attemptNum > 1;
    const isCountingDown = countdown !== null && countdown > 0;
    const isReconnecting = countdown === 0;

    return (
      <Animated.View style={[styles.phaseContainer, { opacity: weightOpacity, transform: [{ scale: weightScale }] }]}>
        {renderAttemptIndicator()}
        <Text style={[styles.attemptLabel, { color: ACCENT }]}>Attempt {attemptNum} of {TOTAL_ATTEMPTS}</Text>

        <View style={styles.measureContainer}>
          <Animated.View style={[styles.measureGlow, { backgroundColor: (isCountingDown || isReconnecting) ? textTertiary : ACCENT, opacity: (isCountingDown || isReconnecting) ? 0.15 : glowPulse }]} />
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.measureRing}>
            <Defs>
              <SvgGrad id="measGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={(isCountingDown || isReconnecting) ? textTertiary : ACCENT} />
                <Stop offset="1" stopColor={(isCountingDown || isReconnecting) ? textTertiary : ACCENT_END} />
              </SvgGrad>
            </Defs>
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={RING_STROKE} fill="none" />
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="url(#measGrad)" strokeWidth={RING_STROKE} fill="none" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={isCountingDown ? RING_CIRCUMFERENCE * (countdown / STEP_OFF_SECONDS) : RING_CIRCUMFERENCE * 0.25} strokeLinecap="round" rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
          </Svg>
          <View style={styles.measureCenter}>
            {isCountingDown ? (
              <>
                <Text style={[styles.liveWeight, { color: ACCENT }]}>{countdown}</Text>
                <Text style={[styles.liveUnit, { color: textTertiary }]}>sec</Text>
              </>
            ) : isReconnecting ? (
              <ActivityIndicator size="large" color={ACCENT} />
            ) : (
              <>
                <Text style={[styles.liveWeight, { color: textPrimary }]}>{liveWeight ? liveWeight.toFixed(1) : '--.-'}</Text>
                <Text style={[styles.liveUnit, { color: ACCENT }]}>kg</Text>
              </>
            )}
          </View>
        </View>

        <Text style={[styles.phaseTitle, { color: textPrimary }]}>
          {isCountingDown ? 'Step Off the Scale' : isReconnecting ? 'Preparing Scale...' : isRetry ? (liveWeight ? 'Measuring...' : 'Step Back On') : 'Step on the Scale'}
        </Text>
        <Text style={[styles.phaseDesc, { color: textSecondary }]}>
          {isCountingDown
            ? 'Wait for the countdown, then step back on.'
            : isReconnecting
              ? 'Reconnecting to your scale for a fresh reading.'
              : isRetry
                ? (liveWeight ? 'Stand still. The reading will lock when stable.' : 'Wait for the scale screen to turn off,\nthen step on to start the next reading.')
                : 'Stand still on your scale.\nThe reading will lock when stable.'}
        </Text>

        {!isCountingDown && !isReconnecting && liveWeight && (
          <View style={[styles.liveIndicator, { backgroundColor: ACCENT + '18' }]}>
            <View style={[styles.liveDot, { backgroundColor: ACCENT }]} />
            <Text style={[styles.liveText, { color: ACCENT }]}>
              {liveBodyFat ? `${liveWeight?.toFixed(1)} kg · ${liveBodyFat.toFixed(1)}% fat` : 'Receiving data...'}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderAttemptDonePhase = () => {
    const attemptNum = attempts.length;
    const reading = attempts[attemptNum - 1];
    const bf = reading?.bodyFatPercent;

    return (
      <View style={styles.phaseContainer}>
        {renderAttemptIndicator()}
        <Text style={[styles.attemptLabel, { color: SUCCESS }]}>Attempt {attemptNum} Complete</Text>

        <View style={[styles.attemptResultCard, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)', borderColor: SUCCESS + '25' }]}>
          <View style={styles.attemptResultRow}>
            <View style={styles.attemptResultItem}>
              <MaterialIcons name="monitor-weight" size={18} color={SUCCESS} />
              <Text style={[styles.attemptResultValue, { color: textPrimary }]}>{reading?.weightKg?.toFixed(1)} kg</Text>
            </View>
            {bf ? (
              <>
                <View style={[styles.attemptResultDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                <View style={styles.attemptResultItem}>
                  <MaterialIcons name="pie-chart" size={18} color="#F59E0B" />
                  <Text style={[styles.attemptResultValue, { color: textPrimary }]}>{bf.toFixed(1)}%</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {attempts.length > 1 && (
          <View style={styles.prevAttemptsList}>
            {attempts.slice(0, -1).map((a, i) => (
              <View key={i} style={[styles.prevAttemptRow, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.prevAttemptLabel, { color: textTertiary }]}>Attempt {i + 1}</Text>
                <Text style={[styles.prevAttemptValue, { color: textSecondary }]}>
                  {a.weightKg?.toFixed(1)} kg{a.bodyFatPercent ? ` · ${a.bodyFatPercent.toFixed(1)}%` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.attemptDoneBtns}>
          <TouchableOpacity style={styles.nextAttemptBtn} onPress={handleNextAttempt} activeOpacity={0.8}>
            <LinearGradient colors={[ACCENT, ACCENT_END || ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goodToGoBtnGrad}>
              <MaterialIcons name="refresh" size={18} color="#FFF" />
              <Text style={styles.goodToGoBtnText}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.goodToGoBtn} onPress={handleGoodToGo} activeOpacity={0.8}>
            <LinearGradient colors={[SUCCESS, SUCCESS_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goodToGoBtnGrad}>
              <MaterialIcons name="check" size={18} color="#FFF" />
              <Text style={styles.goodToGoBtnText}>Good to Go</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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

        {attempts.length > 1 && (
          <View style={styles.allAttemptsSection}>
            <Text style={[styles.allAttemptsTitle, { color: textTertiary }]}>All Readings</Text>
            {attempts.map((a, i) => {
              const isOutlier = stableReading && (
                Math.abs((a.weightKg || 0) - (stableReading.weightKg || 0)) > 1.0 ||
                (a.bodyFatPercent && stableReading.bodyFatPercent && Math.abs(a.bodyFatPercent - stableReading.bodyFatPercent) > 2.0)
              );
              return (
                <View key={i} style={[styles.allAttemptRow, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                  <View style={[styles.allAttemptDot, { backgroundColor: isOutlier ? '#EF4444' : SUCCESS }]} />
                  <Text style={[styles.allAttemptNum, { color: textTertiary }]}>#{i + 1}</Text>
                  <Text style={[styles.allAttemptValue, { color: isOutlier ? textTertiary : textPrimary, textDecorationLine: isOutlier ? 'line-through' : 'none' }]}>
                    {a.weightKg?.toFixed(1)} kg{a.bodyFatPercent ? ` · ${a.bodyFatPercent.toFixed(1)}%` : ''}
                  </Text>
                  {isOutlier && <Text style={[styles.outlierTag, { color: '#EF4444' }]}>outlier</Text>}
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.savedBadge, { backgroundColor: SUCCESS + '14' }]}>
          <MaterialIcons name="check-circle" size={16} color={SUCCESS} />
          <Text style={[styles.savedBadgeText, { color: SUCCESS }]}>
            {attempts.length > 1 ? 'Best reading saved & profile updated' : 'Reading saved & profile updated'}
          </Text>
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
      case 'attemptDone': return renderAttemptDonePhase();
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

  // Attempt indicator
  attemptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 0 },
  attemptDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  attemptDotText: { fontSize: 11, fontWeight: '700' },
  attemptLine: { width: 32, height: 2, borderRadius: 1 },
  attemptLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 16, textTransform: 'uppercase' },

  // Auto-proceed

  // Good to go
  attemptDoneBtns: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 16 },
  nextAttemptBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  goodToGoBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  goodToGoBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  goodToGoBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Attempt done card
  attemptResultCard: { width: '100%', borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  attemptResultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  attemptResultItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attemptResultValue: { fontSize: 17, fontWeight: '700' },
  attemptResultDivider: { width: 1, height: 24 },

  // Previous attempts list
  prevAttemptsList: { width: '100%', marginBottom: 4 },
  prevAttemptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  prevAttemptLabel: { fontSize: 12, fontWeight: '600', width: 70 },
  prevAttemptValue: { fontSize: 14, fontWeight: '500' },

  // Done — all attempts
  allAttemptsSection: { width: '100%', marginBottom: 16 },
  allAttemptsTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  allAttemptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  allAttemptDot: { width: 8, height: 8, borderRadius: 4 },
  allAttemptNum: { fontSize: 12, fontWeight: '600', width: 24 },
  allAttemptValue: { fontSize: 14, fontWeight: '500', flex: 1 },
  outlierTag: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});

export default ScaleConnectionModal;

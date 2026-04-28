/**
 * ManualWeighInModal
 *
 * Simple weekly weight + body fat manual entry. Replaces BLE scale flow.
 * Saves through scaleService.saveReading so history/profile pipelines stay intact.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import scaleService from '../services/scaleService';
import nutritionService from '../services/nutritionService';

const ManualWeighInModal = ({ visible, onClose, onSaved }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(60)).current;

  const ACCENT = '#6366F1';
  const SUCCESS = '#10B981';
  const SUCCESS_END = '#059669';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : '#555';
  const textTertiary = isDark ? 'rgba(255,255,255,0.45)' : '#999';
  const cardBg = isDark ? '#1A1A2E' : '#FFFFFF';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  useEffect(() => {
    if (visible) {
      preloadLast();
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      fadeIn.setValue(0);
      slideUp.setValue(60);
      setError(null);
      setSaving(false);
    }
  }, [visible]);

  const preloadLast = async () => {
    const last = await scaleService.getLastReading();
    if (last) {
      setWeight(last.weightKg ? String(last.weightKg) : '');
      setBodyFat(last.bodyFatPercent ? String(last.bodyFatPercent) : '');
    } else {
      const profile = await nutritionService.getProfile();
      if (profile?.weightKg) setWeight(String(profile.weightKg));
      if (profile?.bodyFatPercent) setBodyFat(String(profile.bodyFatPercent));
    }
  };

  const handleSave = async () => {
    const w = parseFloat(weight);
    const bf = bodyFat.trim() === '' ? null : parseFloat(bodyFat);

    if (!w || w < 20 || w > 300) {
      setError('Enter a weight between 20 and 300 kg');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (bf !== null && (isNaN(bf) || bf < 3 || bf > 65)) {
      setError('Body fat must be between 3% and 65%');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const reading = {
        weightKg: Math.round(w * 100) / 100,
        bodyFatPercent: bf !== null ? Math.round(bf * 10) / 10 : null,
        protocol: 'manual',
      };
      await scaleService.saveReading(reading);

      const profile = await nutritionService.getProfile();
      if (profile) {
        const updates = { ...profile, weightKg: reading.weightKg };
        if (reading.bodyFatPercent) updates.bodyFatPercent = reading.bodyFatPercent;
        await nutritionService.saveProfile(updates);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.(reading);
      onClose?.();
    } catch (e) {
      setError('Could not save. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeIn }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centerWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              transform: [{ translateY: slideUp }],
              opacity: fadeIn,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: ACCENT + '14' }]}>
              <MaterialIcons name="fitness-center" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>Weekly Weigh-In</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Enter today's weight and body fat
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={textTertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.fields}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: textSecondary }]}>Weight</Text>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="75.5"
                  placeholderTextColor={textTertiary}
                  style={[styles.input, { color: textPrimary }]}
                  autoFocus
                />
                <Text style={[styles.unit, { color: textTertiary }]}>kg</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: textSecondary }]}>
                Body Fat <Text style={{ color: textTertiary, fontWeight: '400' }}>(optional)</Text>
              </Text>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  keyboardType="decimal-pad"
                  placeholder="18.0"
                  placeholderTextColor={textTertiary}
                  style={[styles.input, { color: textPrimary }]}
                />
                <Text style={[styles.unit, { color: textTertiary }]}>%</Text>
              </View>
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[SUCCESS, SUCCESS_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGrad}
            >
              <MaterialIcons name="check" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Weigh-In'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};


const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 4 },
  fields: { gap: 14, marginBottom: 20 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, fontSize: 22, fontWeight: '600' },
  unit: { fontSize: 15, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 4 },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default ManualWeighInModal;

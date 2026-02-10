/**
 * EmailVerificationScreen
 *
 * Beautiful 6-digit OTP input for email verification.
 * Features:
 * - 6 individual digit boxes with auto-advance
 * - Resend code button with 60-second cooldown
 * - Skip option for deferred verification
 * - Matches the warm orange/cream AuthScreen design
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { hapticFeedback } from '../utils/haptics';
import { sendVerificationCode, verifyEmailCode } from '../services/authService';

const { width } = Dimensions.get('window');
const CODE_LENGTH = 6;

const EmailVerificationScreen = ({ onDismiss }) => {
  // Works both as a Stack.Screen (useNavigation/useRoute) and standalone (onDismiss prop)
  let navigation, route;
  try {
    navigation = useNavigation();
    route = useRoute();
  } catch (_) {
    // Not inside a NavigationContainer child — standalone mode
    navigation = null;
    route = null;
  }
  const maskedEmail = route?.params?.maskedEmail || 'your email';
  const fromSignup = route?.params?.fromSignup ?? !!onDismiss;

  // Code input state
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  // Cooldown timer for resend
  const [cooldown, setCooldown] = useState(fromSignup ? 60 : 0);
  const cooldownRef = useRef(null);

  // Refs for the hidden input and animations
  const hiddenInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const boxScales = useRef(Array(CODE_LENGTH).fill(null).map(() => new Animated.Value(1))).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(cooldownRef.current);
  }, [cooldown]);

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === CODE_LENGTH && code.every(d => d !== '')) {
      handleVerify(fullCode);
    }
  }, [code]);

  // Shake animation for wrong code
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Pop animation on digit entry
  const popBox = (index) => {
    Animated.sequence([
      Animated.timing(boxScales[index], { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.spring(boxScales[index], { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  // Handle text input from the hidden field
  const handleChangeText = (text) => {
    // Only accept digits
    const digits = text.replace(/\D/g, '').split('');
    const newCode = [...code];
    let nextFocus = focusedIndex;

    for (let i = 0; i < digits.length && focusedIndex + i < CODE_LENGTH; i++) {
      const idx = focusedIndex + i;
      newCode[idx] = digits[i];
      popBox(idx);
      nextFocus = idx + 1;
    }

    setCode(newCode);
    if (nextFocus < CODE_LENGTH) {
      setFocusedIndex(nextFocus);
    }
  };

  // Handle backspace
  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Backspace') {
      const newCode = [...code];
      if (code[focusedIndex] !== '') {
        newCode[focusedIndex] = '';
        setCode(newCode);
      } else if (focusedIndex > 0) {
        newCode[focusedIndex - 1] = '';
        setCode(newCode);
        setFocusedIndex(focusedIndex - 1);
      }
    }
  };

  // Tap on a specific box
  const handleBoxPress = (index) => {
    setFocusedIndex(index);
    hiddenInputRef.current?.focus();
  };

  // Verify the code
  const handleVerify = async (fullCode) => {
    if (verifying) return;

    const codeStr = fullCode || code.join('');
    if (codeStr.length !== CODE_LENGTH) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits.');
      return;
    }

    setVerifying(true);
    try {
      hapticFeedback.light();
      const result = await verifyEmailCode(codeStr);

      if (result.success) {
        hapticFeedback.success();
        const dismiss = () => onDismiss ? onDismiss() : navigation?.goBack?.();
        Alert.alert(
          'Email Verified',
          'Your email has been verified successfully.',
          [{ text: 'Continue', onPress: dismiss }]
        );
      }
    } catch (error) {
      hapticFeedback.error();
      triggerShake();
      // Clear the code on failure
      setCode(Array(CODE_LENGTH).fill(''));
      setFocusedIndex(0);

      const msg = error?.message || 'Verification failed. Please try again.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setVerifying(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (cooldown > 0 || sending) return;

    setSending(true);
    try {
      hapticFeedback.light();
      const result = await sendVerificationCode();
      setCooldown(60);
      Alert.alert('Code Sent', `A new code has been sent to ${result.maskedEmail || maskedEmail}.`);
    } catch (error) {
      const msg = error?.message || 'Failed to send code. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSending(false);
    }
  };

  // Skip verification
  const handleSkip = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      navigation?.goBack?.();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#F5EFE6', '#E8DFD0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Animated.View style={[styles.container, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }]}>
            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleSkip}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="mark-email-read" size={44} color="#FFF" />
              </View>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.emailText}>{maskedEmail}</Text>
              </Text>
            </View>

            {/* Code input boxes */}
            <Animated.View style={[styles.codeContainer, { transform: [{ translateX: shakeAnim }] }]}>
              {code.map((digit, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => handleBoxPress(index)}
                >
                  <Animated.View style={[
                    styles.codeBox,
                    focusedIndex === index && styles.codeBoxFocused,
                    digit !== '' && styles.codeBoxFilled,
                    { transform: [{ scale: boxScales[index] }] },
                  ]}>
                    <Text style={[
                      styles.codeDigit,
                      digit !== '' && styles.codeDigitFilled,
                    ]}>
                      {digit || (focusedIndex === index ? '|' : '')}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </Animated.View>

            {/* Hidden TextInput that captures keyboard input */}
            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={1}
              value=""
              onChangeText={handleChangeText}
              onKeyPress={handleKeyPress}
              autoFocus={true}
              caretHidden={true}
            />

            {/* Verify button */}
            <TouchableOpacity
              style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
              onPress={() => handleVerify()}
              disabled={verifying || code.some(d => d === '')}
            >
              <LinearGradient
                colors={code.every(d => d !== '') ? ['#E67E22', '#D35400'] : ['#CCC', '#BBB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyGradient}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.verifyContent}>
                    <Text style={styles.verifyText}>Verify Email</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendLabel}>Didn't receive the code?</Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={cooldown > 0 || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#E67E22" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={[
                    styles.resendButton,
                    cooldown > 0 && styles.resendButtonDisabled,
                  ]}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Skip option */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E67E22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#E67E22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  // Code input
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  codeBox: {
    width: (width - 48 - 50) / 6,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  codeBoxFocused: {
    borderColor: '#E67E22',
    shadowColor: '#E67E22',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  codeBoxFilled: {
    backgroundColor: '#FFF8F0',
    borderColor: '#E67E22',
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: '300',
    color: '#CCC',
  },
  codeDigitFilled: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C3E50',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  // Verify button
  verifyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#E67E22',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  // Resend
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendLabel: {
    fontSize: 14,
    color: '#888',
  },
  resendButton: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E67E22',
    marginTop: 6,
  },
  resendButtonDisabled: {
    color: '#BBB',
    fontWeight: '500',
  },
  // Skip
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
});

export default EmailVerificationScreen;

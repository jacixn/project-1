import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import SheetHeader from '../components/SheetHeader';
import { send2FASetupCode, confirm2FASetup } from '../services/authService';
import hapticFeedback from '../utils/haptics';

// Self-contained native-stack modal screen for the two-factor-authentication
// SETUP (enter emailed code) flow. Visuals ported faithfully from the
// show2FASetupModal block in ProfileTab.js.
const TwoFactorSetupScreen = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();

  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState(route?.params?.maskedEmail || '');
  const [cooldown, setCooldown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Guard so the code is only sent once (React strict/double-mount safe).
  const sentRef = useRef(false);

  // On mount: send the setup code to the user's email.
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    (async () => {
      try {
        const result = await send2FASetupCode();
        setMaskedEmail(result?.maskedEmail || route?.params?.maskedEmail || '');
        setCooldown(60);
      } catch (err) {
        Alert.alert('Unable to Send Code', 'We could not send a verification code. Please try again later.');
        navigation.goBack();
      }
    })();
  }, []);

  // Resend cooldown timer: decrement every 1s while > 0.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      setLoading(true);
      await send2FASetupCode();
      hapticFeedback.success();
      setCooldown(60);
    } catch (err) {
      hapticFeedback.error();
      Alert.alert('Unable to Resend', 'Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await confirm2FASetup(code);
      hapticFeedback.success();
      DeviceEventEmitter.emit('twoFactorChanged', true); // so Settings/ProfileTab refresh
      Alert.alert(
        'Two-Factor Enabled',
        'Your account now requires a verification code when signing in. A code will be sent to your email each time you log in.'
      );
      navigation.goBack();
    } catch (err) {
      hapticFeedback.error();
      Alert.alert('Verification Failed', 'The code you entered is incorrect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SheetHeader
        title="Two-Factor Authentication"
        leftLabel="Cancel"
        onLeft={() => navigation.goBack()}
      />

      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 20, paddingTop: 20 }}>
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: `${theme.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <MaterialIcons name="security" size={40} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 }}>
              We sent a verification code to{'\n'}
              <Text style={{ fontWeight: '700', color: theme.text }}>{maskedEmail}</Text>
            </Text>
          </View>

          {/* Code Input */}
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              6-Digit Code
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              borderRadius: 12,
              paddingHorizontal: 16,
              height: 56,
              borderWidth: 2,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            }}>
              <MaterialIcons name="lock-outline" size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, fontSize: 20, color: theme.text, fontWeight: '600', letterSpacing: 8 }}
                placeholder="000000"
                placeholderTextColor={theme.textTertiary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            {/* Resend */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0}
              style={{ alignSelf: 'center', marginTop: 16 }}
            >
              <Text style={{ fontSize: 14, color: cooldown > 0 ? theme.textTertiary : theme.primary, fontWeight: '600' }}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              opacity: submitting || code.length < 6 ? 0.5 : 1,
            }}
            disabled={submitting || code.length < 6}
            onPress={handleConfirm}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Enable Two-Factor</Text>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
          }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
              Once enabled, you will need to enter a verification code sent to your email each time you sign in. This adds an extra layer of protection to your account.
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default TwoFactorSetupScreen;

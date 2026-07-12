import React, { useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import SheetHeader from '../components/SheetHeader';
import { getReferralInfo, submitReferral } from '../services/referralService';

// "Referred By" — native pull-to-dismiss modal that stacks ON TOP of the
// Settings sheet (Settings scales back behind it, like a verse over the reader).
// Self-contained: loads/persists through referralService, no ProfileTab state.
const ReferralScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  const [referralInfo, setReferralInfo] = useState({ referredByUsername: null, referredByDisplayName: null, referralDate: null, referralCount: 0 });
  const [referralUsername, setReferralUsername] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const submitLock = useRef(false);

  const loadReferralInfo = useCallback(async () => {
    try {
      const info = await getReferralInfo();
      if (info) setReferralInfo(info);
    } catch (error) {
      console.error('[Referral] Error loading referral info:', error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadReferralInfo(); }, [loadReferralInfo]));

  const handleSubmitReferral = async () => {
    if (submitLock.current) return;
    submitLock.current = true;

    if (!referralUsername.trim() || referralUsername.trim().length < 3) {
      Alert.alert('Enter a Username', 'Please enter the username of the person who referred you (at least 3 characters).');
      submitLock.current = false;
      return;
    }

    setReferralLoading(true);
    try {
      const result = await submitReferral(referralUsername.trim());
      if (result.success) {
        Alert.alert('Referral Saved', 'Your referral has been applied successfully!');
        setReferralUsername('');
        await loadReferralInfo();
        navigation.goBack();
      } else {
        Alert.alert('Referral Failed', 'That referral code is invalid or has already been used.');
      }
    } catch (error) {
      console.error('[Referral] Error submitting referral:', error);
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    } finally {
      setReferralLoading(false);
      submitLock.current = false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SheetHeader title="Referral" leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {referralInfo.referredByUsername ? (
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 24,
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: `${theme.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <MaterialIcons name="person" size={32} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 6 }}>
              {referralInfo.referredByDisplayName || referralInfo.referredByUsername} referred you
            </Text>
            <Text style={{ fontSize: 15, color: theme.textSecondary, marginBottom: 4 }}>
              @{referralInfo.referredByUsername}
            </Text>
            {referralInfo.referralDate && (
              <Text style={{ fontSize: 13, color: theme.textTertiary || theme.textSecondary, marginTop: 8 }}>
                Referred on {referralInfo.referralDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: `${theme.primary}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                alignSelf: 'center',
              }}>
                <MaterialIcons name="person-add" size={28} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 8 }}>
                Who referred you?
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                If someone invited you to Biblely, enter their username below to give them credit. This can only be set once.
              </Text>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              }}>
                <Text style={{ fontSize: 18, color: theme.textSecondary, marginRight: 4 }}>@</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: theme.text, paddingVertical: 14 }}
                  placeholder="Enter their username"
                  placeholderTextColor={theme.textTertiary || theme.textSecondary}
                  value={referralUsername}
                  onChangeText={(text) => setReferralUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmitReferral}
                />
              </View>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: referralUsername.trim().length >= 3 ? theme.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                opacity: referralLoading ? 0.7 : 1,
              }}
              onPress={handleSubmitReferral}
              disabled={referralLoading || referralUsername.trim().length < 3}
              activeOpacity={0.8}
            >
              {referralLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: referralUsername.trim().length >= 3 ? '#fff' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
                }}>
                  Submit Referral
                </Text>
              )}
            </TouchableOpacity>

            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 }}>
                How referrals work
              </Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <MaterialIcons name="check-circle" size={16} color={theme.primary} style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                    Both your email and the referrer's email must be verified
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <MaterialIcons name="check-circle" size={16} color={theme.primary} style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                    You can only set your referrer once — it cannot be changed
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <MaterialIcons name="check-circle" size={16} color={theme.primary} style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                    Referrals cannot go both ways between two people
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {referralInfo.referralCount > 0 && (
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 20,
            marginTop: referralInfo.referredByUsername ? 0 : 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: `${theme.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialIcons name="group" size={24} color={theme.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>
                {referralInfo.referralCount}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                {referralInfo.referralCount === 1 ? 'person joined through you' : 'people joined through you'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ReferralScreen;

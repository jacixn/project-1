/**
 * Authentication Screen
 * 
 * Clean, Bread-style login with social sign-in buttons.
 * Includes fallback email option.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { checkUsernameAvailability, resolveIdentifierToEmail } from '../services/authService';
import { hapticFeedback } from '../utils/haptics';
import profanityFilter from '../services/profanityFilterService';

const { width, height } = Dimensions.get('window');
const DECK_CARD_WIDTH = 140;
const DECK_CARD_HEIGHT = 290;
const DECK_CARD_GAP = 14;
const DECK_CYCLE_WIDTH = 9 * (DECK_CARD_WIDTH + DECK_CARD_GAP);

const AuthScreen = ({ onAuthSuccess }) => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, sendPasswordResetCode, resetPasswordWithCode, verify2FAAndSignIn, loading } = useAuth();
  
  // View mode: 'main' (social buttons) or 'email' (email form)
  const [viewMode, setViewMode] = useState('main');
  
  // Email form mode: 'login', 'signup', 'forgot', 'resetCode'
  const [emailMode, setEmailMode] = useState('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password reset OTP flow
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetMaskedEmail, setResetMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetLoading, setResetLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Two-factor authentication
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAMaskedEmail, setTwoFAMaskedEmail] = useState('');
  const [twoFAPassword, setTwoFAPassword] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAResendCooldown, setTwoFAResendCooldown] = useState(0);
  
  // Resolved email (actual email after username lookup, used for 2FA & password reset)
  const [resolvedEmail, setResolvedEmail] = useState('');
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Username availability
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const usernameCheckTimeout = useRef(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mascotBounce = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const word1Anim = useRef(new Animated.Value(0)).current;
  const word2Anim = useRef(new Animated.Value(0)).current;
  const word3Anim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const verseFade = useRef(new Animated.Value(1)).current;
  const marqueeAnim = useRef(new Animated.Value(0)).current;
  const [verseIndex, setVerseIndex] = useState(0);
  const welcomeVerses = useRef([
    'Be still, and know',
    'Trust in the Lord',
    'Walk by faith',
    'Strength for today',
    'Renewed, every morning',
  ]).current;
  const screenshotDeck = useRef([
    require('../../assets/auth-screenshots/1.png'),
    require('../../assets/auth-screenshots/2.png'),
    require('../../assets/auth-screenshots/3.png'),
    require('../../assets/auth-screenshots/4.png'),
    require('../../assets/auth-screenshots/5.png'),
    require('../../assets/auth-screenshots/6.png'),
    require('../../assets/auth-screenshots/7.png'),
    require('../../assets/auth-screenshots/8.png'),
    require('../../assets/auth-screenshots/9.png'),
  ]).current;

  useEffect(() => {
    // Container fade
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Icon entrance: scale up + fade in
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, tension: 36, friction: 7, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    // Staggered word reveal
    Animated.stagger(140, [
      Animated.spring(word1Anim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.spring(word2Anim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.spring(word3Anim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.timing(subtitleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(ctaAnim, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();

    // Mascot float (gentle vertical bob)
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotBounce, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(mascotBounce, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Screenshot deck marquee (auto-scroll loop)
    Animated.loop(
      Animated.timing(marqueeAnim, { toValue: 1, duration: 32000, useNativeDriver: true })
    ).start();

    // Verse rotator
    const verseTimer = setInterval(() => {
      Animated.timing(verseFade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setVerseIndex(i => (i + 1) % welcomeVerses.length);
        Animated.timing(verseFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 3500);

    return () => clearInterval(verseTimer);
  }, []);
  
  // Check username availability with debounce
  useEffect(() => {
    if (emailMode !== 'signup') return;
    
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }
    
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setCheckingUsername(true);
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(username);
        setUsernameAvailable(available);
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    
    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, [username, emailMode]);
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email or username and password.');
      return;
    }
    
    try {
      hapticFeedback.light();
      await signIn(email, password);
      hapticFeedback.success();
    } catch (error) {
      // Check if 2FA is required
      if (error.requires2FA) {
        hapticFeedback.light();
        setTwoFAPassword(password);
        setTwoFAMaskedEmail(error.maskedEmail || email);
        // Store the actual resolved email for 2FA verification (not the username)
        setResolvedEmail(error.resolvedEmail || email);
        setTwoFACode('');
        setEmailMode('2fa');
        setTwoFAResendCooldown(60);
        return;
      }
      hapticFeedback.error();
      Alert.alert('Login Failed', 'Incorrect email or password. Please try again.');
    }
  };
  
  const handle2FAVerify = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your email.');
      return;
    }
    
    try {
      setTwoFALoading(true);
      hapticFeedback.light();
      // Use resolvedEmail (actual email) for 2FA verification, not the username input
      await verify2FAAndSignIn(resolvedEmail || email, twoFAPassword, twoFACode);
      hapticFeedback.success();
      // Clear sensitive data
      setTwoFAPassword('');
      setTwoFACode('');
      setResolvedEmail('');
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Verification Failed', 'The code you entered is incorrect. Please try again.');
    } finally {
      setTwoFALoading(false);
    }
  };
  
  const handleResend2FACode = async () => {
    if (twoFAResendCooldown > 0) return;
    try {
      setTwoFALoading(true);
      hapticFeedback.light();
      // Re-sign in to trigger 2FA code send (use resolved email to avoid extra lookup)
      await signIn(resolvedEmail || email, twoFAPassword);
    } catch (error) {
      if (error.requires2FA) {
        // Expected — code was resent
        hapticFeedback.success();
        setTwoFAMaskedEmail(error.maskedEmail || resolvedEmail || email);
        setTwoFAResendCooldown(60);
      } else {
        hapticFeedback.error();
        Alert.alert('Resend Failed', 'Unable to resend the code. Please try again later.');
      }
    } finally {
      setTwoFALoading(false);
    }
  };
  
  const handleSignup = async () => {
    if (!email || !password || !username || !displayName) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    
    if (!usernameAvailable) {
      Alert.alert('Username Unavailable', 'Please choose a different username.');
      return;
    }

    if (profanityFilter.containsProfanity(username) || profanityFilter.containsProfanity(displayName)) {
      Alert.alert('Inappropriate Content', 'Please choose a different username or display name.');
      return;
    }

    try {
      hapticFeedback.light();
      await signUp({ email, password, username, displayName });
      hapticFeedback.success();
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Sign Up Failed', 'Unable to create your account. The email or username may already be in use.');
    }
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Missing Field', 'Please enter your email or username.');
      return;
    }
    
    try {
      setResetLoading(true);
      hapticFeedback.light();
      
      // Resolve username to email if needed
      let emailForReset = email;
      try {
        emailForReset = await resolveIdentifierToEmail(email);
      } catch (resolveError) {
        hapticFeedback.error();
        Alert.alert('Reset Failed', 'We couldn\'t find an account with that email or username.');
        setResetLoading(false);
        return;
      }
      
      // Store the resolved email for subsequent reset operations
      setResolvedEmail(emailForReset);
      
      const result = await sendPasswordResetCode(emailForReset);
      hapticFeedback.success();
      setResetMaskedEmail(result.maskedEmail || emailForReset);
      setEmailMode('resetCode');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Start 60-second cooldown for resend
      setResendCooldown(60);
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Reset Failed', 'Unable to send the reset code. Please try again later.');
    } finally {
      setResetLoading(false);
    }
  };
  
  const handleResetWithCode = async () => {
    if (!resetCode || resetCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your email.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Password Too Short', 'Your new password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match.');
      return;
    }
    
    try {
      setResetLoading(true);
      hapticFeedback.light();
      // Use resolved email (from handleForgotPassword resolution) for the reset
      await resetPasswordWithCode(resolvedEmail || email, resetCode, newPassword);
      hapticFeedback.success();
      Alert.alert(
        'Password Reset',
        'Your password has been changed successfully. You can now sign in.',
        [{ text: 'Sign In', onPress: () => {
          setEmailMode('login');
          setPassword('');
          setResetCode('');
          setNewPassword('');
          setConfirmNewPassword('');
          setResolvedEmail('');
        }}]
      );
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Reset Failed', 'Unable to reset your password. Please check the code and try again.');
    } finally {
      setResetLoading(false);
    }
  };
  
  const handleResendResetCode = async () => {
    if (resendCooldown > 0) return;
    try {
      setResetLoading(true);
      hapticFeedback.light();
      // Use resolved email for resend (username was already resolved in handleForgotPassword)
      await sendPasswordResetCode(resolvedEmail || email);
      hapticFeedback.success();
      setResendCooldown(60);
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Resend Failed', 'Unable to resend the code. Please try again later.');
    } finally {
      setResetLoading(false);
    }
  };
  
  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);
  
  // Cooldown timer for 2FA resend button
  useEffect(() => {
    if (twoFAResendCooldown <= 0) return;
    const timer = setTimeout(() => setTwoFAResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [twoFAResendCooldown]);
  
  const renderUsernameStatus = () => {
    if (!username || username.length < 3) return null;
    
    if (checkingUsername) {
      return <ActivityIndicator size="small" color="#666" style={{ marginLeft: 8 }} />;
    }
    
    if (usernameAvailable === true) {
      return <MaterialIcons name="check-circle" size={20} color="#4CAF50" style={{ marginLeft: 8 }} />;
    }
    
    if (usernameAvailable === false) {
      return <MaterialIcons name="cancel" size={20} color="#F44336" style={{ marginLeft: 8 }} />;
    }
    
    return null;
  };
  
  // Main view - clean, welcoming design
  if (viewMode === 'main') {
    return (
      <View style={styles.container}>
        {/* Base gradient */}
        <LinearGradient
          colors={['#050D08', '#0A1A0F', '#11241B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.overlayContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
            <View style={{ height: 12 }} />

            {/* Logo */}
            <Animated.View style={{
              opacity: iconOpacity,
              transform: [
                { scale: iconScale },
                { translateY: mascotBounce },
              ],
            }}>
              <Image
                source={require('../../assets/onboard-icon.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Compact headline */}
            <View style={styles.headlineWrap}>
              <View style={styles.headlineRow}>
                <Animated.Text style={[styles.headlineCompact, {
                  opacity: word1Anim,
                  transform: [{ translateY: word1Anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                }]}>
                  Faith.
                </Animated.Text>
                <Animated.Text style={[styles.headlineCompact, {
                  opacity: word2Anim,
                  transform: [{ translateY: word2Anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                }]}>
                  {' Fitness.'}
                </Animated.Text>
                <Animated.Text style={[styles.headlineCompact, styles.headlineAccent, {
                  opacity: word3Anim,
                  transform: [{ translateY: word3Anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                }]}>
                  {' Focus.'}
                </Animated.Text>
              </View>
            </View>

            {/* Cycling verse */}
            <Animated.Text style={[styles.verseLine, { opacity: Animated.multiply(subtitleAnim, verseFade) }]}>
              {welcomeVerses[verseIndex]}
            </Animated.Text>

            <View style={{ height: 24 }} />

            {/* Hero: auto-scrolling screenshot deck */}
            <Animated.View style={[styles.deckWrapper, {
              opacity: iconOpacity,
              transform: [{ scale: iconScale.interpolate({ inputRange: [0.6, 1], outputRange: [0.9, 1] }) }],
            }]}>
              <Animated.View style={[styles.deckRow, {
                transform: [{
                  translateX: marqueeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -DECK_CYCLE_WIDTH],
                  }),
                }],
              }]}>
                {[...screenshotDeck, ...screenshotDeck].map((src, i) => (
                  <View key={i} style={[styles.deckCard, { transform: [{ rotate: i % 2 === 0 ? '-2deg' : '2deg' }] }]}>
                    <Image source={src} style={styles.deckImage} resizeMode="cover" />
                  </View>
                ))}
              </Animated.View>
              {/* Edge fade masks */}
              <LinearGradient
                colors={['#0A1A0F', 'rgba(10,26,15,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.deckEdgeLeft}
                pointerEvents="none"
              />
              <LinearGradient
                colors={['rgba(10,26,15,0)', '#0A1A0F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.deckEdgeRight}
                pointerEvents="none"
              />
            </Animated.View>

            <View style={{ flex: 1 }} />

            {/* CTAs */}
            <Animated.View style={[styles.ctaContainer, {
              opacity: ctaAnim,
              transform: [{ translateY: ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            }]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => { setViewMode('email'); setEmailMode('signup'); }}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.secondaryButton}
                onPress={() => { setViewMode('email'); setEmailMode('login'); }}
              >
                <Text style={styles.secondaryButtonText}>I already have an account</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={{ height: 16 }} />
          </Animated.View>
        </View>
      </View>
    );
  }
  
  // Email form view - Modern redesign
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0A1A0F', '#11241B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.emailScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: '#FFF' }]}
              onPress={() => setViewMode('main')}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            
            {/* Header section */}
            <View style={styles.formHeader}>
              <View style={[styles.formIconContainer, { backgroundColor: '#22C55E' }]}>
                <Ionicons 
                  name={emailMode === 'login' ? 'person' : emailMode === 'signup' ? 'person-add' : emailMode === '2fa' ? 'shield-checkmark' : 'key'} 
                  size={26} 
                  color="#FFF" 
                />
              </View>
              <Text style={[styles.formTitle, { color: '#FFFFFF' }]}>
                {emailMode === 'login' && 'Welcome Back'}
                {emailMode === 'signup' && 'Join Us'}
                {emailMode === 'forgot' && 'Reset Password'}
                {emailMode === 'resetCode' && 'Enter Code'}
                {emailMode === '2fa' && 'Verify Identity'}
              </Text>
              <Text style={[styles.formSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                {emailMode === 'login' && 'Sign in with your email or username'}
                {emailMode === 'signup' && 'Create an account to get started'}
                {emailMode === 'forgot' && 'Enter your email or username to reset'}
                {emailMode === 'resetCode' && `We sent a 6-digit code to ${resetMaskedEmail}`}
                {emailMode === '2fa' && `We sent a verification code to ${twoFAMaskedEmail}`}
              </Text>
            </View>
            
            {/* Form card */}
            <View style={styles.formCard}>
              {/* Mode tabs */}
              {emailMode !== 'forgot' && emailMode !== 'resetCode' && emailMode !== '2fa' && (
                <View style={styles.modeTabs}>
                  <TouchableOpacity
                    style={[styles.modeTab, emailMode === 'login' && styles.modeTabActive]}
                    onPress={() => setEmailMode('login')}
                  >
                    <Ionicons 
                      name="log-in-outline" 
                      size={18} 
                      color={emailMode === 'login' ? '#FFF' : '#888'} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.modeTabText, emailMode === 'login' && styles.modeTabTextActive]}>
                      Login
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeTab, emailMode === 'signup' && styles.modeTabActive]}
                    onPress={() => setEmailMode('signup')}
                  >
                    <Ionicons 
                      name="person-add-outline" 
                      size={18} 
                      color={emailMode === 'signup' ? '#FFF' : '#888'} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.modeTabText, emailMode === 'signup' && styles.modeTabTextActive]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Email/Username input (hidden during reset code entry and 2FA) */}
              {emailMode !== 'resetCode' && emailMode !== '2fa' && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>
                    {emailMode === 'signup' ? 'Email' : 'Email or Username'}
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons 
                      name={emailMode === 'signup' ? 'mail-outline' : 'person-outline'} 
                      size={20} 
                      color="#888" 
                      style={styles.inputIcon} 
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={emailMode === 'signup' ? 'your@email.com' : 'Email or username'}
                      placeholderTextColor="#BBB"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType={emailMode === 'signup' ? 'email-address' : 'default'}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}
              
              {/* Signup fields */}
              {emailMode === 'signup' && (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Display Name</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Your name"
                        placeholderTextColor="#BBB"
                        value={displayName}
                        onChangeText={setDisplayName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="at-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="johndoe"
                        placeholderTextColor="#BBB"
                        value={username}
                        onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        autoCapitalize="none"
                      />
                      {renderUsernameStatus()}
                    </View>
                  </View>
                </>
              )}
              
              {/* Reset code + new password fields */}
              {emailMode === 'resetCode' && (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>6-Digit Code</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="keypad-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter code"
                        value={resetCode}
                        onChangeText={setResetCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholderTextColor="#BBB"
                      />
                    </View>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholderTextColor="#BBB"
                      />
                    </View>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry
                        placeholderTextColor="#BBB"
                      />
                    </View>
                  </View>
                  {/* Resend code */}
                  <TouchableOpacity 
                    onPress={handleResendResetCode} 
                    disabled={resendCooldown > 0}
                    style={{ alignSelf: 'center', marginBottom: 12, marginTop: -4 }}
                  >
                    <Text style={{ fontSize: 14, color: resendCooldown > 0 ? '#BBB' : '#22C55E', fontWeight: '600' }}>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* 2FA code input */}
              {emailMode === '2fa' && (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>6-Digit Code</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter code"
                        value={twoFACode}
                        onChangeText={setTwoFACode}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholderTextColor="#BBB"
                        autoFocus
                      />
                    </View>
                  </View>
                  {/* Resend code */}
                  <TouchableOpacity 
                    onPress={handleResend2FACode} 
                    disabled={twoFAResendCooldown > 0}
                    style={{ alignSelf: 'center', marginBottom: 12, marginTop: -4 }}
                  >
                    <Text style={{ fontSize: 14, color: twoFAResendCooldown > 0 ? '#BBB' : '#22C55E', fontWeight: '600' }}>
                      {twoFAResendCooldown > 0 ? `Resend code in ${twoFAResendCooldown}s` : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Password fields */}
              {emailMode !== 'forgot' && emailMode !== 'resetCode' && emailMode !== '2fa' && (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#BBB"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons 
                          name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                          size={20} 
                          color="#888" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {emailMode === 'signup' && (
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabel}>Confirm Password</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="••••••••"
                          placeholderTextColor="#BBB"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          <Ionicons 
                            name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
                            size={20} 
                            color="#888" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
              
              {/* Forgot password link */}
              {emailMode === 'login' && (
                <TouchableOpacity onPress={() => setEmailMode('forgot')} style={styles.forgotLink}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
              
              {/* Action button */}
              {(() => {
                const isResetFlow = emailMode === 'forgot' || emailMode === 'resetCode';
                const is2FAFlow = emailMode === '2fa';
                const isButtonLoading = is2FAFlow ? twoFALoading : isResetFlow ? resetLoading : loading;
                return (
                  <TouchableOpacity
                    style={[styles.actionButton, isButtonLoading && styles.actionButtonDisabled]}
                    onPress={() => {
                      if (emailMode === 'login') handleLogin();
                      else if (emailMode === 'signup') handleSignup();
                      else if (emailMode === 'resetCode') handleResetWithCode();
                      else if (emailMode === '2fa') handle2FAVerify();
                      else handleForgotPassword();
                    }}
                    disabled={isButtonLoading}
                  >
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionButtonGradient}
                    >
                      {isButtonLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <View style={styles.actionButtonContent}>
                          <Text style={styles.actionButtonText}>
                            {emailMode === 'login' && 'Sign In'}
                            {emailMode === 'signup' && 'Create Account'}
                            {emailMode === 'forgot' && 'Send Reset Code'}
                            {emailMode === 'resetCode' && 'Reset Password'}
                            {emailMode === '2fa' && 'Verify & Sign In'}
                          </Text>
                          <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })()}
              
              {/* Back to login from forgot/resetCode/2fa */}
              {(emailMode === 'forgot' || emailMode === 'resetCode' || emailMode === '2fa') && (
                <TouchableOpacity onPress={() => {
                  setEmailMode('login');
                  setResetCode('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setResendCooldown(0);
                  setTwoFACode('');
                  setTwoFAPassword('');
                  setTwoFAResendCooldown(0);
                  setResolvedEmail('');
                }} style={styles.backToLogin}>
                  <Ionicons name="arrow-back" size={18} color="#888" />
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Bottom spacer */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F', // Dark forest green matching Biblely brand
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlayContent: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  mascotContainer: {
    marginBottom: 16,
  },
  mascotImage: {
    width: width * 0.42,
    height: width * 0.42,
  },
  eyebrowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.28)',
    gap: 8,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    backgroundColor: '#34D572',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D572',
    letterSpacing: 1.2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 160,
    height: 160,
  },
  deckWrapper: {
    width: width,
    height: DECK_CARD_HEIGHT,
    marginHorizontal: -30,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
  },
  deckCard: {
    width: DECK_CARD_WIDTH,
    height: DECK_CARD_HEIGHT,
    marginRight: DECK_CARD_GAP,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0F1F15',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  deckImage: {
    width: '100%',
    height: '100%',
  },
  deckEdgeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 60,
  },
  deckEdgeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 60,
  },
  headlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  headlineCompact: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  headlineWrap: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 46,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 52,
  },
  headlineAccent: {
    color: '#4ADE80',
    textShadowColor: 'rgba(74, 222, 128, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9BB5A4',
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.4,
    paddingHorizontal: 10,
  },
  verseLine: {
    fontSize: 13,
    color: 'rgba(155, 181, 164, 0.75)',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.6,
    paddingHorizontal: 24,
  },
  ctaContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  
  // Email form styles - Modern redesign
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  emailScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -30,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  formIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  modeTabActive: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  modeTabTextActive: {
    color: '#FFF',
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    letterSpacing: 0,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  backToLoginText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
});

export default AuthScreen;

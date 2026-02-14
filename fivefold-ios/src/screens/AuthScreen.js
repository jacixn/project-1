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

const { width, height } = Dimensions.get('window');

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
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    
    // Gentle bounce animation for mascot
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotBounce, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(mascotBounce, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
      Alert.alert('Login Failed', error.message);
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
      Alert.alert('Verification Failed', error.message);
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
        Alert.alert('Resend Failed', error.message);
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
    
    try {
      hapticFeedback.light();
      await signUp({ email, password, username, displayName });
      hapticFeedback.success();
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Sign Up Failed', error.message);
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
        Alert.alert('Reset Failed', resolveError.message);
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
      Alert.alert('Reset Failed', error.message);
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
      Alert.alert('Reset Failed', error.message);
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
      Alert.alert('Resend Failed', error.message);
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
        {/* Background Image */}
        <Image 
          source={require('../../assets/auth-background.jpg')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        
        <View style={styles.overlayContent}>
          <View style={{ flex: 1 }}>
            <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
              {/* Spacer to push headline down */}
              <View style={{ flex: 0.12 }} />
            
            {/* Headline - positioned higher without mascot */}
            <Text style={[styles.headline, { marginTop: 9 }]}>
              FAITH. FITNESS. <Text style={styles.headlineAccent}>FOCUS.</Text>
            </Text>
            <Text style={styles.subtitle}>All in one.</Text>
            
            {/* Flexible spacer to push buttons down */}
            <View style={{ flex: 1 }} />
            
            {/* Main CTA Buttons - at the bottom */}
            <View style={styles.ctaContainer}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => {
                  setViewMode('email');
                  setEmailMode('signup');
                }}
              >
                <Text style={styles.primaryButtonText}>Create Account</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => {
                  setViewMode('email');
                  setEmailMode('login');
                }}
              >
                <Text style={styles.secondaryButtonText}>I already have an account</Text>
              </TouchableOpacity>
              </View>
              
              {/* Bottom spacing */}
              <View style={{ height: 20 }} />
            </Animated.View>
          </View>
        </View>
      </View>
    );
  }
  
  // Email form view - Modern redesign
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#F5EFE6', '#E8DFD0']}
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
              <View style={[styles.formIconContainer, { backgroundColor: '#E67E22' }]}>
                <Ionicons 
                  name={emailMode === 'login' ? 'person' : emailMode === 'signup' ? 'person-add' : emailMode === '2fa' ? 'shield-checkmark' : 'key'} 
                  size={26} 
                  color="#FFF" 
                />
              </View>
              <Text style={[styles.formTitle, { color: '#2C3E50' }]}>
                {emailMode === 'login' && 'Welcome Back'}
                {emailMode === 'signup' && 'Join Us'}
                {emailMode === 'forgot' && 'Reset Password'}
                {emailMode === 'resetCode' && 'Enter Code'}
                {emailMode === '2fa' && 'Verify Identity'}
              </Text>
              <Text style={[styles.formSubtitle, { color: '#666' }]}>
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
                        placeholder="John Doe"
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
                    <Text style={{ fontSize: 14, color: resendCooldown > 0 ? '#BBB' : '#E67E22', fontWeight: '600' }}>
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
                    <Text style={{ fontSize: 14, color: twoFAResendCooldown > 0 ? '#BBB' : '#E67E22', fontWeight: '600' }}>
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
                      colors={['#E67E22', '#D35400']}
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
    backgroundColor: '#F5EFE6', // Warm, friendly background like Bread
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
    width: width * 0.45,
    height: width * 0.45,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2C3E50',
    textAlign: 'center',
    letterSpacing: 2,
  },
  headlineAccent: {
    color: '#E67E22', // Warm accent color
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 17,
    color: '#555',
    marginTop: 12,
    marginBottom: 50,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.3,
    paddingHorizontal: 10,
  },
  ctaContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E67E22',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    shadowColor: '#E67E22',
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
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
    backgroundColor: '#E67E22',
    shadowColor: '#E67E22',
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
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 14,
    color: '#E67E22',
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#E67E22',
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

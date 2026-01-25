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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { checkUsernameAvailability } from '../services/authService';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const AuthScreen = ({ onAuthSuccess }) => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { signIn, signUp, resetPassword, loading } = useAuth();
  
  // View mode: 'main' (social buttons) or 'email' (email form)
  const [viewMode, setViewMode] = useState('main');
  
  // Email form mode: 'login', 'signup', 'forgot'
  const [emailMode, setEmailMode] = useState('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  
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
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    
    try {
      hapticFeedback.light();
      await signIn(email, password);
      hapticFeedback.success();
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Login Failed', error.message);
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
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    
    try {
      hapticFeedback.light();
      await resetPassword(email);
      hapticFeedback.success();
      Alert.alert(
        'Password Reset Sent',
        'Check your email for instructions to reset your password.',
        [{ text: 'OK', onPress: () => setEmailMode('login') }]
      );
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Reset Failed', error.message);
    }
  };
  
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
          source={require('../../assets/auth-background.png')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        
        <View style={styles.overlayContent}>
          <SafeAreaView style={{ flex: 1 }}>
            <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
              {/* Spacer to position text higher */}
              <View style={{ flex: 0.08 }} />
            
            {/* Headline - positioned higher without mascot */}
            <Text style={styles.headline}>
              FAITH. FITNESS. <Text style={styles.headlineAccent}>FOCUS.</Text>
            </Text>
            <Text style={styles.subtitle}>Bible, prayer, workouts, tasks & community. All in one place.</Text>
            
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
              
              {/* Bottom spacing for buttons */}
              <View style={{ height: 50 }} />
            </Animated.View>
          </SafeAreaView>
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
      <SafeAreaView style={{ flex: 1 }}>
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
                  name={emailMode === 'login' ? 'person' : emailMode === 'signup' ? 'person-add' : 'key'} 
                  size={40} 
                  color="#FFF" 
                />
              </View>
              <Text style={[styles.formTitle, { color: '#2C3E50' }]}>
                {emailMode === 'login' && 'Welcome Back'}
                {emailMode === 'signup' && 'Join Us'}
                {emailMode === 'forgot' && 'Reset Password'}
              </Text>
              <Text style={[styles.formSubtitle, { color: '#666' }]}>
                {emailMode === 'login' && 'Sign in to continue your journey'}
                {emailMode === 'signup' && 'Create an account to get started'}
                {emailMode === 'forgot' && 'Enter your email to reset'}
              </Text>
            </View>
            
            {/* Form card */}
            <View style={styles.formCard}>
              {/* Mode tabs */}
              {emailMode !== 'forgot' && (
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
              
              {/* Email input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="#BBB"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              
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
              
              {/* Password fields */}
              {emailMode !== 'forgot' && (
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
              <TouchableOpacity
                style={[styles.actionButton, loading && styles.actionButtonDisabled]}
                onPress={() => {
                  if (emailMode === 'login') handleLogin();
                  else if (emailMode === 'signup') handleSignup();
                  else handleForgotPassword();
                }}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#E67E22', '#D35400']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={styles.actionButtonContent}>
                      <Text style={styles.actionButtonText}>
                        {emailMode === 'login' && 'Sign In'}
                        {emailMode === 'signup' && 'Create Account'}
                        {emailMode === 'forgot' && 'Send Reset Link'}
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Back to login from forgot */}
              {emailMode === 'forgot' && (
                <TouchableOpacity onPress={() => setEmailMode('login')} style={styles.backToLogin}>
                  <Ionicons name="arrow-back" size={18} color="#888" />
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Bottom spacer */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingTop: 16,
    paddingBottom: 40,
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
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
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

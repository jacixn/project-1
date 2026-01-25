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
import { MaterialIcons } from '@expo/vector-icons';
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
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
          {/* Large Mascot */}
          <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: mascotBounce }] }]}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Headline */}
          <Text style={styles.headline}>
            GROW IN <Text style={styles.headlineAccent}>FAITH</Text>
          </Text>
          <Text style={styles.subtitle}>Your spiritual journey starts here!</Text>
          
          {/* Main CTA Buttons */}
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
        </Animated.View>
      </SafeAreaView>
    );
  }
  
  // Email form view
  return (
    <SafeAreaView style={styles.container}>
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
            style={styles.backButton}
            onPress={() => setViewMode('main')}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          {/* Small mascot */}
          <View style={styles.smallMascotContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.smallMascot}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.emailTitle}>
            {emailMode === 'login' && 'Welcome back!'}
            {emailMode === 'signup' && 'Create account'}
            {emailMode === 'forgot' && 'Reset password'}
          </Text>
          
          {/* Mode tabs */}
          {emailMode !== 'forgot' && (
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, emailMode === 'login' && styles.modeTabActive]}
                onPress={() => setEmailMode('login')}
              >
                <Text style={[styles.modeTabText, emailMode === 'login' && styles.modeTabTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, emailMode === 'signup' && styles.modeTabActive]}
                onPress={() => setEmailMode('signup')}
              >
                <Text style={[styles.modeTabText, emailMode === 'signup' && styles.modeTabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Email input */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          {/* Signup fields */}
          {emailMode === 'signup' && (
            <>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  placeholderTextColor="#999"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <MaterialIcons name="alternate-email" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  autoCapitalize="none"
                />
                {renderUsernameStatus()}
              </View>
            </>
          )}
          
          {/* Password fields */}
          {emailMode !== 'forgot' && (
            <>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons 
                    name={showPassword ? 'visibility' : 'visibility-off'} 
                    size={20} 
                    color="#888" 
                  />
                </TouchableOpacity>
              </View>
              
              {emailMode === 'signup' && (
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <MaterialIcons 
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'} 
                      size={20} 
                      color="#888" 
                    />
                  </TouchableOpacity>
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
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.actionButtonText}>
                {emailMode === 'login' && 'Log In'}
                {emailMode === 'signup' && 'Create Account'}
                {emailMode === 'forgot' && 'Send Reset Link'}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Back to login from forgot */}
          {emailMode === 'forgot' && (
            <TouchableOpacity onPress={() => setEmailMode('login')} style={styles.backToLogin}>
              <MaterialIcons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6', // Warm, friendly background like Bread
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  mascotContainer: {
    marginBottom: 20,
  },
  mascotImage: {
    width: width * 0.6,
    height: width * 0.6,
  },
  headline: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2C3E50',
    textAlign: 'center',
    letterSpacing: 1,
  },
  headlineAccent: {
    color: '#E67E22', // Warm accent color
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
    marginBottom: 50,
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
  
  // Email form styles
  keyboardView: {
    flex: 1,
  },
  emailScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  smallMascotContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  smallMascot: {
    width: 80,
    height: 80,
  },
  emailTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#E67E22',
  },
  modeTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  modeTabTextActive: {
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 14,
    color: '#E67E22',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#E67E22',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
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

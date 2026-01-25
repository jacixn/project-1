/**
 * Create Prayer Modal
 * 
 * Beautiful modal for creating and sharing prayer requests.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { createPrayerRequest } from '../services/prayerSocialService';
import * as Haptics from 'expo-haptics';

const CreatePrayerModal = ({ visible, onClose, onPrayerCreated }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('friends'); // 'friends' | 'public'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      slideAnim.setValue(0);
      setContent('');
      setVisibility('friends');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Empty Prayer', 'Please write your prayer request before sharing.');
      return;
    }

    if (content.trim().length < 10) {
      Alert.alert('Too Short', 'Please write a bit more about your prayer request.');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newPrayer = await createPrayerRequest({
        userId: user.uid,
        displayName: userProfile?.displayName || user.displayName || 'Anonymous',
        username: userProfile?.username || 'user',
        profilePicture: userProfile?.profilePicture || '',
        countryFlag: userProfile?.countryFlag || '',
        content: content.trim(),
        visibility,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPrayerCreated(newPrayer);
    } catch (error) {
      console.error('Error creating prayer:', error);
      Alert.alert('Error', 'Failed to share prayer request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (content.trim()) {
      Alert.alert(
        'Discard Prayer?',
        'You have unsaved changes. Are you sure you want to discard?',
        [
          { text: 'Keep Writing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const charCount = content.length;
  const maxChars = 500;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTitle}>
            <FontAwesome5 name="praying-hands" size={18} color={theme.primary} />
            <Text style={[styles.headerTitleText, { color: theme.text }]}>
              Share Prayer
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            <LinearGradient
              colors={content.trim() ? [theme.primary, theme.primary + 'CC'] : ['#888', '#666']}
              style={styles.shareButton}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.shareButtonText}>Share</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: slideAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}
        >
          {/* Prayer Input */}
          <View style={[
            styles.inputContainer,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
          ]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: theme.text }]}
              placeholder="What would you like prayer for?"
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={maxChars}
              value={content}
              onChangeText={setContent}
              editable={!isSubmitting}
            />
            
            {/* Character count */}
            <View style={styles.charCountContainer}>
              <Text style={[
                styles.charCount,
                { color: charCount > maxChars - 50 ? '#FF6B35' : theme.textTertiary },
              ]}>
                {charCount}/{maxChars}
              </Text>
            </View>
          </View>

          {/* Visibility Options */}
          <View style={styles.visibilitySection}>
            <Text style={[styles.visibilityLabel, { color: theme.textSecondary }]}>
              Who can see this?
            </Text>
            
            <View style={styles.visibilityOptions}>
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  visibility === 'friends' && { backgroundColor: theme.primary },
                  visibility !== 'friends' && { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  },
                ]}
                onPress={() => {
                  setVisibility('friends');
                  Haptics.selectionAsync();
                }}
                disabled={isSubmitting}
              >
                <MaterialIcons 
                  name="people" 
                  size={18} 
                  color={visibility === 'friends' ? '#FFF' : theme.textSecondary} 
                />
                <Text style={[
                  styles.visibilityOptionText,
                  { color: visibility === 'friends' ? '#FFF' : theme.text },
                ]}>
                  Friends Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  visibility === 'public' && { backgroundColor: theme.primary },
                  visibility !== 'public' && { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  },
                ]}
                onPress={() => {
                  setVisibility('public');
                  Haptics.selectionAsync();
                }}
                disabled={isSubmitting}
              >
                <MaterialIcons 
                  name="public" 
                  size={18} 
                  color={visibility === 'public' ? '#FFF' : theme.textSecondary} 
                />
                <Text style={[
                  styles.visibilityOptionText,
                  { color: visibility === 'public' ? '#FFF' : theme.text },
                ]}>
                  Everyone
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.visibilityHint, { color: theme.textTertiary }]}>
              {visibility === 'friends' 
                ? 'Only your friends will see this prayer request'
                : 'Anyone can see and pray for this request'}
            </Text>
          </View>

          {/* Tips */}
          <View style={[
            styles.tipsContainer,
            { backgroundColor: theme.primary + '10' },
          ]}>
            <FontAwesome5 name="lightbulb" size={16} color={theme.primary} />
            <Text style={[styles.tipsText, { color: theme.textSecondary }]}>
              Be specific about your prayer needs. This helps others pray more effectively for you.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  shareButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    borderRadius: 16,
    padding: 16,
    minHeight: 200,
    marginBottom: 24,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    textAlignVertical: 'top',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
  },
  visibilitySection: {
    marginBottom: 24,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  visibilityOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityHint: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default CreatePrayerModal;

/**
 * InAppNotification — drop-down banner shown when a push notification
 * arrives while the user is already inside the app.
 *
 * Usage:
 *   <InAppNotification ref={ref} onPress={(data) => { navigate... }} />
 *
 * Trigger:
 *   ref.current.show({ title, body, data });
 */

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

// Fixed top inset — component renders outside SafeAreaProvider
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 24;

const { width } = Dimensions.get('window');

const ICON_MAP = {
  message: { name: 'chat-bubble', color: '#667eea' },
  friend_request: { name: 'person-add', color: '#10b981' },
  challenge: { name: 'emoji-events', color: '#f59e0b' },
  prayer: { name: 'self-improvement', color: '#8b5cf6' },
  workout: { name: 'fitness-center', color: '#ef4444' },
  task: { name: 'check-circle', color: '#14b8a6' },
  streak: { name: 'local-fire-department', color: '#f97316' },
  token_arrived: { name: 'stars', color: '#eab308' },
  achievement: { name: 'military-tech', color: '#a855f7' },
  default: { name: 'notifications', color: '#6366f1' },
};

const AUTO_DISMISS_MS = 4000;

const InAppNotification = forwardRef(({ onPress }, ref) => {
  const { theme, isDark } = useTheme();

  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState({ title: '', body: '', data: {} });

  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef(null);

  const dismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -200, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const show = ({ title, body, data = {} }) => {
    // If already showing, dismiss first then show new
    if (dismissTimer.current) clearTimeout(dismissTimer.current);

    setContent({ title, body, data });
    setVisible(true);
    hapticFeedback.light();

    translateY.setValue(-200);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
  };

  useImperativeHandle(ref, () => ({ show, dismiss }));

  if (!visible) return null;

  const notifType = content.data?.type || 'default';
  const icon = ICON_MAP[notifType] || ICON_MAP.default;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: STATUS_BAR_HEIGHT + 4,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          hapticFeedback.medium();
          dismiss();
          if (onPress) onPress(content.data);
        }}
        style={styles.touchable}
      >
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.banner,
            {
              backgroundColor: isDark ? 'rgba(30,30,40,0.85)' : 'rgba(255,255,255,0.88)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}18` }]}>
            <MaterialIcons name={icon.name} size={22} color={icon.color} />
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {content.title}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]} numberOfLines={2}>
              {content.body}
            </Text>
          </View>

          {/* Dismiss */}
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); dismiss(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.dismissBtn}
          >
            <MaterialIcons name="close" size={16} color={theme.textTertiary} />
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  touchable: {
    width: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default InAppNotification;

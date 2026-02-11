/**
 * Prayer Card Component
 * 
 * Beautiful card displaying a prayer request with elegant design.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { deletePrayer } from '../services/prayerSocialService';
import * as Haptics from 'expo-haptics';

const PrayerCard = ({ 
  prayer, 
  currentUserId, 
  onTogglePraying, 
  onDelete,
  onReport,
  index = 0,
}) => {
  const { theme, isDark } = useTheme();
  const [isPraying, setIsPraying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const prayAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsPraying(prayer.prayingUsers?.includes(currentUserId));
    
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, [prayer.prayingUsers, currentUserId, index]);

  const handlePrayingPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Animated.sequence([
      Animated.timing(prayAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(prayAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isPraying) {
      heartScale.setValue(0);
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(heartScale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }, 600);
      });
    }

    setIsPraying(!isPraying);
    onTogglePraying(prayer.id);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Prayer',
      'Are you sure you want to delete this prayer request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const success = await deletePrayer(prayer.id, currentUserId);
            if (success) {
              onDelete(prayer.id);
            } else {
              setIsDeleting(false);
              Alert.alert('Error', 'Failed to delete prayer request');
            }
          },
        },
      ]
    );
  };

  const isOwner = prayer.userId === currentUserId;
  const timeAgo = getTimeAgo(prayer.createdAt);
  const prayingCount = prayer.prayingCount || 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF',
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {prayer.profilePicture ? (
            <Image source={{ uri: prayer.profilePicture }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[theme.primary, theme.primary + 'AA']}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitial}>
                {(prayer.displayName || 'A').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: theme.text }]} numberOfLines={1}>
                {prayer.displayName || 'Anonymous'}
              </Text>
              {prayer.countryFlag && (
                <Text style={styles.countryFlag}>{prayer.countryFlag}</Text>
              )}
              {isOwner && (
                <View style={[styles.youBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.youBadgeText, { color: theme.primary }]}>You</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>
              {timeAgo}
            </Text>
          </View>
        </View>
        
        {isOwner ? (
          <TouchableOpacity 
            style={[styles.moreButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <MaterialIcons 
              name="more-horiz" 
              size={18} 
              color={theme.textSecondary} 
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.moreButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => onReport && onReport(prayer)}
          >
            <MaterialIcons 
              name="more-horiz" 
              size={18} 
              color={theme.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Prayer Content */}
      <Text style={[styles.content, { color: theme.text }]}>
        {prayer.content}
      </Text>

      {/* Heart Animation Overlay */}
      <Animated.View
        style={[
          styles.heartOverlay,
          {
            opacity: heartScale,
            transform: [{ scale: heartScale }],
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[theme.primary, theme.primary + 'AA']}
          style={styles.heartGradient}
        >
          <FontAwesome5 name="praying-hands" size={32} color="#FFF" />
        </LinearGradient>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <Animated.View style={{ transform: [{ scale: prayAnim }] }}>
          <TouchableOpacity
            style={[
              styles.prayingButton,
              isPraying 
                ? { backgroundColor: theme.primary }
                : { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : theme.primary + '10' },
            ]}
            onPress={handlePrayingPress}
            activeOpacity={0.8}
          >
            <FontAwesome5 
              name="praying-hands" 
              size={14} 
              color={isPraying ? '#FFF' : theme.primary} 
            />
            <Text style={[
              styles.prayingButtonText,
              { color: isPraying ? '#FFF' : theme.primary },
            ]}>
              {isPraying ? 'Praying' : 'Pray'}
            </Text>
            {prayingCount > 0 && (
              <View style={[
                styles.prayingCount,
                { backgroundColor: isPraying ? 'rgba(255,255,255,0.25)' : theme.primary + '20' },
              ]}>
                <Text style={[
                  styles.prayingCountText,
                  { color: isPraying ? '#FFF' : theme.primary },
                ]}>
                  {prayingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// Helper function to get time ago string
const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  countryFlag: {
    fontSize: 14,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  heartOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
  },
  heartGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  prayingButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  prayingCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  prayingCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default PrayerCard;

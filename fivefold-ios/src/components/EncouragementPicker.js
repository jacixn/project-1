/**
 * Encouragement Picker Component
 * 
 * Quick-tap spiritual encouragements to send to friends.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

const ENCOURAGEMENTS = [
  {
    id: 'praying',
    icon: 'praying-hands',
    label: 'Praying for you',
    color: '#6366F1',
  },
  {
    id: 'strong',
    icon: 'fist-raised',
    label: 'Stay strong!',
    color: '#F59E0B',
  },
  {
    id: 'bless',
    icon: 'hand-holding-heart',
    label: 'God bless you!',
    color: '#10B981',
  },
  {
    id: 'love',
    icon: 'heart',
    label: 'Sending love',
    color: '#EF4444',
  },
];

const EncouragementPicker = ({ visible, onClose, onSelect }) => {
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonAnims = useRef(ENCOURAGEMENTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // Slide up
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Stagger button animations
      buttonAnims.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: 1,
          delay: index * 50,
          friction: 6,
          useNativeDriver: true,
        }).start();
      });
    } else {
      slideAnim.setValue(0);
      buttonAnims.forEach(anim => anim.setValue(0));
    }
  }, [visible]);

  const handleSelect = (encouragement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(encouragement.id);
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            }),
          }],
          opacity: slideAnim,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Send Encouragement
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome5 name="times" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {ENCOURAGEMENTS.map((item, index) => (
          <Animated.View
            key={item.id}
            style={{
              transform: [{ scale: buttonAnims[index] }],
              opacity: buttonAnims[index],
            }}
          >
            <TouchableOpacity
              style={styles.encouragementButton}
              onPress={() => handleSelect(item)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[item.color, item.color + 'CC']}
                style={styles.encouragementGradient}
              >
                <FontAwesome5 name={item.icon} size={24} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.encouragementLabel, { color: theme.text }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 70,
    left: 12,
    right: 12,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  encouragementButton: {
    width: 80,
    alignItems: 'center',
    marginBottom: 12,
  },
  encouragementGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  encouragementLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default EncouragementPicker;

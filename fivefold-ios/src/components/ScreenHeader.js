/**
 * ScreenHeader — unified top-of-screen header used across Biblely.
 * Matches the Vision screen look:
 *   • Rounded-square back button (bg tint, `arrow-back` icon)
 *   • Centered title (fontSize 20, weight 700)
 *   • Optional right-side action or subtitle
 *
 * Two layouts available:
 *   1. `<ScreenHeader ... />`                    — pinned flex row at top (default).
 *   2. `<StaticBackButton />` + `<ScrollingTitle />`
 *      Static back button stays pinned, title scrolls with content (Vision pattern).
 *      Render StaticBackButton at the root View level, then place ScrollingTitle
 *      as the first child inside the ScrollView's contentContainer.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const useHeaderColors = () => {
  const { theme, isDark } = useTheme();
  return {
    textPrimary: isDark ? '#FFFFFF' : theme.text,
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : '#6B7280',
    btnBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  };
};

// Pinned header — back + title + right control in a single row at top.
const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightElement,
  background = 'transparent',
}) => {
  const insets = useSafeAreaInsets();
  const { textPrimary, textSecondary, btnBg } = useHeaderColors();

  const rightSlot = rightElement != null
    ? rightElement
    : rightIcon
      ? (
        <TouchableOpacity
          onPress={() => { hapticFeedback.light(); onRightPress?.(); }}
          style={[styles.headerBtn, { backgroundColor: btnBg }]}
          activeOpacity={0.7}
        >
          <MaterialIcons name={rightIcon} size={22} color={textPrimary} />
        </TouchableOpacity>
      )
      : <View style={styles.headerBtn} />;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, backgroundColor: background }]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); onBack(); }}
            style={[styles.headerBtn, { backgroundColor: btnBg }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={22} color={textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightSlot}
      </View>
    </View>
  );
};

// Static back button — pinned, place at the root of the screen View.
export const StaticBackButton = ({ onBack, left = 20 }) => {
  const insets = useSafeAreaInsets();
  const { textPrimary, btnBg } = useHeaderColors();
  if (!onBack) return null;
  return (
    <TouchableOpacity
      onPress={() => { hapticFeedback.light(); onBack(); }}
      style={[
        styles.headerBtn,
        {
          backgroundColor: btnBg,
          position: 'absolute',
          top: insets.top + 8,
          left,
          zIndex: 10,
        },
      ]}
      activeOpacity={0.7}
    >
      <MaterialIcons name="arrow-back" size={22} color={textPrimary} />
    </TouchableOpacity>
  );
};

// Scrolling title row — place as first child inside ScrollView contentContainer.
// Provides a header row WITHOUT a back button (expects StaticBackButton outside).
export const ScrollingTitle = ({ title, subtitle, rightIcon, onRightPress, rightElement }) => {
  const insets = useSafeAreaInsets();
  const { textPrimary, textSecondary, btnBg } = useHeaderColors();

  const rightSlot = rightElement != null
    ? rightElement
    : rightIcon
      ? (
        <TouchableOpacity
          onPress={() => { hapticFeedback.light(); onRightPress?.(); }}
          style={[styles.headerBtn, { backgroundColor: btnBg }]}
          activeOpacity={0.7}
        >
          <MaterialIcons name={rightIcon} size={22} color={textPrimary} />
        </TouchableOpacity>
      )
      : <View style={styles.headerBtn} />;

  return (
    <View style={[styles.scrollRow, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerBtn} />
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightSlot}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});

export default ScreenHeader;

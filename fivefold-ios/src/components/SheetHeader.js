import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Shared header for native pull-to-dismiss modal screens (presentation:'modal').
// Matches the Gibbon pattern: a left action (Done/Cancel/Back), a centered title,
// and an optional right action, on a space-between row. Because these are native
// sheet screens the row only needs a small top pad (the sheet already sits below
// the status bar), NOT a safe-area inset.
const SheetHeader = ({
  title,
  leftLabel = 'Done',
  onLeft,
  rightLabel,
  onRight,
  rightDisabled = false,
  rightColor,
}) => {
  const { theme } = useTheme();
  // Native modal sheets sit BELOW the status bar (the parent shows above them),
  // so they need no notch clearance. useSafeAreaInsets() is unreliable inside a
  // nested modal (it reports the full window notch), so use a fixed top.
  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <View style={styles.side}>
        {onLeft ? (
          <Pressable onPress={onLeft} hitSlop={12}>
            <Text style={[styles.btn, { color: theme.textSecondary }]}>{leftLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>

      <View style={[styles.side, styles.sideRight]}>
        {rightLabel ? (
          <Pressable onPress={onRight} disabled={rightDisabled} hitSlop={12}>
            <Text style={[styles.btn, styles.btnStrong, { color: rightColor || theme.primary, opacity: rightDisabled ? 0.4 : 1 }]}>
              {rightLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { minWidth: 64, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  btn: { fontSize: 16, fontWeight: '500' },
  btnStrong: { fontWeight: '600' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
});

export default SheetHeader;

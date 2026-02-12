/**
 * Report & Block Modal
 * 
 * Reusable modal for reporting content and blocking users.
 * Required by Apple Guideline 1.2 (User Generated Content).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { reportContent, blockUser, REPORT_REASONS } from '../services/reportService';
import * as Haptics from 'expo-haptics';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {function} props.onClose
 * @param {string} props.contentType        - 'prayer' | 'post' | 'message' | 'user'
 * @param {string} [props.contentId]        - Firestore doc ID of the content
 * @param {string} props.reportedUserId     - UID of the content owner / user to report
 * @param {string} props.currentUserId      - UID of the current user (reporter)
 * @param {string} [props.displayName]      - Display name of the reported user (for block confirmation)
 * @param {function} [props.onBlock]        - Callback after successful block (e.g. to filter UI)
 * @param {boolean} [props.showBlockOption] - Whether to show the block user option (default true)
 */
const ReportBlockModal = ({
  visible,
  onClose,
  contentType,
  contentId,
  reportedUserId,
  currentUserId,
  displayName = 'this user',
  onBlock,
  showBlockOption = true,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedReason, setSelectedReason] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('choose'); // 'choose' | 'report' | 'done'

  // ── Animation values ──
  // entryAnim: 0 = off-screen (hidden), 1 = fully visible
  const entryAnim = useRef(new Animated.Value(0)).current;
  // gestureY: driven by PanGestureHandler's translationY (native thread)
  const gestureY = useRef(new Animated.Value(0)).current;

  // Clamp gesture: negative (upward drag) → 0, positive → follows finger
  const clampedGestureY = gestureY.interpolate({
    inputRange: [-300, 0, 500],
    outputRange: [0, 0, 500],
    extrapolate: 'clamp',
  });

  // Entry offset: slides sheet from 600 (off-screen bottom) to 0 (resting)
  const entryOffset = entryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // Combined translateY = entry slide + gesture drag (all native thread)
  const combinedY = Animated.add(entryOffset, clampedGestureY);

  // Backdrop opacity fades with entry animation
  const backdropOpacity = entryAnim;

  // ── Entrance animation when visible becomes true ──
  useEffect(() => {
    if (visible) {
      entryAnim.setValue(0);
      gestureY.setValue(0);
      Animated.spring(entryAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);

  // Internal cleanup (called AFTER exit animation completes)
  const resetAndClose = useCallback(() => {
    setSelectedReason(null);
    setStep('choose');
    setSubmitting(false);
    gestureY.setValue(0);
    entryAnim.setValue(0);
    onClose();
  }, [onClose, gestureY, entryAnim]);

  // Animated close: slide sheet down + fade backdrop, THEN unmount
  const animateClose = useCallback(() => {
    Animated.timing(entryAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => resetAndClose());
  }, [entryAnim, resetAndClose]);

  // Native-driven gesture event — no JS bridge, no jank
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: gestureY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;
      if (translationY > 80 || velocityY > 500) {
        // Dismiss — slide sheet out + fade backdrop simultaneously
        Animated.parallel([
          Animated.timing(gestureY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(entryAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => resetAndClose());
      } else {
        // Snap back
        Animated.spring(gestureY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      }
    }
  }, [resetAndClose, gestureY, entryAnim]);

  const handleReport = async () => {
    if (!selectedReason) {
      Alert.alert('Select a Reason', 'Please select a reason for your report.');
      return;
    }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await reportContent({
      reporterId: currentUserId,
      reportedUserId,
      contentType,
      contentId,
      reason: selectedReason,
    });

    setSubmitting(false);

    if (result.success) {
      setStep('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${displayName}? You won't see their content and they won't be able to message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            const result = await blockUser(currentUserId, reportedUserId);

            setSubmitting(false);

            if (result.success) {
              Alert.alert('User Blocked', `${displayName} has been blocked.`);
              if (onBlock) onBlock(reportedUserId);
              animateClose();
            } else {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderChooseStep = () => (
    <>
      <Text style={[styles.title, { color: theme.text }]}>
        What would you like to do?
      </Text>

      <TouchableOpacity
        style={[styles.optionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFF' }]}
        onPress={() => setStep('report')}
        activeOpacity={0.7}
      >
        <View style={[styles.optionIcon, { backgroundColor: '#FF6B6B20' }]}>
          <MaterialIcons name="flag" size={22} color="#FF6B6B" />
        </View>
        <View style={styles.optionTextWrap}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>Report Content</Text>
          <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
            Flag this {contentType === 'user' ? 'user' : contentType} for review
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={theme.textTertiary} />
      </TouchableOpacity>

      {showBlockOption && (
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFF' }]}
          onPress={handleBlock}
          activeOpacity={0.7}
          disabled={submitting}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#EF444420' }]}>
            <MaterialIcons name="block" size={22} color="#EF4444" />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={[styles.optionTitle, { color: '#EF4444' }]}>Block {displayName}</Text>
            <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
              Hide their content and prevent messages
            </Text>
          </View>
          {submitting ? (
            <ActivityIndicator size="small" color={theme.textTertiary} />
          ) : (
            <MaterialIcons name="chevron-right" size={22} color={theme.textTertiary} />
          )}
        </TouchableOpacity>
      )}
    </>
  );

  const renderReportStep = () => (
    <>
      <View style={styles.reportHeader}>
        <TouchableOpacity onPress={() => setStep('choose')}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text, marginLeft: 12 }]}>
          Why are you reporting?
        </Text>
      </View>

      <ScrollView style={styles.reasonsList} bounces={false}>
        {REPORT_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.id}
            style={[
              styles.reasonButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFF' },
              selectedReason === reason.id && { 
                borderColor: theme.primary, 
                borderWidth: 1.5,
                backgroundColor: theme.primary + '10',
              },
            ]}
            onPress={() => {
              setSelectedReason(reason.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <View style={[
              styles.radioOuter, 
              { borderColor: selectedReason === reason.id ? theme.primary : theme.textTertiary },
            ]}>
              {selectedReason === reason.id && (
                <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
              )}
            </View>
            <Text style={[styles.reasonText, { color: theme.text }]}>
              {reason.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: selectedReason ? theme.primary : theme.primary + '40' },
        ]}
        onPress={handleReport}
        disabled={!selectedReason || submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.submitText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderDoneStep = () => (
    <View style={styles.doneContainer}>
      <View style={[styles.doneIcon, { backgroundColor: '#10B98120' }]}>
        <MaterialIcons name="check-circle" size={48} color="#10B981" />
      </View>
      <Text style={[styles.doneTitle, { color: theme.text }]}>Report Submitted</Text>
      <Text style={[styles.doneDesc, { color: theme.textSecondary }]}>
        Thank you for helping keep our community safe. We'll review this report within 24 hours.
      </Text>
      <TouchableOpacity
        style={[styles.doneButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
        onPress={animateClose}
        activeOpacity={0.7}
      >
        <Text style={[styles.doneButtonText, { color: theme.text }]}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={animateClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          {/* Animated backdrop — fades in/out with entryAnim */}
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdropOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={animateClose} activeOpacity={1} />
          </Animated.View>

          {/* Sheet pinned to bottom, slides up/down */}
          <View style={styles.sheetContainer} pointerEvents="box-none">
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
              activeOffsetY={10}
              failOffsetX={[-20, 20]}
            >
              <Animated.View 
                style={[styles.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', transform: [{ translateY: combinedY }] }]}
              >
                {/* Drag handle */}
                <View style={styles.handleWrap}>
                  <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                </View>

                {step === 'choose' && renderChooseStep()}
                {step === 'report' && renderReportStep()}
                {step === 'done' && renderDoneStep()}
              </Animated.View>
            </PanGestureHandler>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reasonsList: {
    maxHeight: 320,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  doneContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  doneDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginTop: 20,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportBlockModal;

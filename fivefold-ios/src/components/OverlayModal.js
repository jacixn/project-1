// Drop-in replacement for RN <Modal> for popups that can AUTO-FIRE (timers,
// async fetches, global events, notification taps) while a native-stack modal
// (presentation:'modal') is open or being pull-down dismissed.
//
// RN <Modal> presents a UIViewController; if that presentation lands while a
// native sheet is mid interactive dismissal, UIKit ends up with two
// conflicting in-flight transitions and the app freezes (orphaned
// presentation swallows all touches). Same bug class the AchievementToast
// had. This wrapper renders through react-native-screens FullWindowOverlay
// on iOS — a topmost subview of the key window, no presentViewController,
// nothing to deadlock. Android keeps the real Modal (no such freeze there).
//
// Supported props: visible, animationType ('none' | 'fade'), transparent,
// statusBarTranslucent, onRequestClose (Android back only, like RN Modal).
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, StyleSheet } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

const IosOverlay = ({ visible, animationType, children }) => {
  const opacity = useRef(new Animated.Value(animationType === 'fade' ? 0 : 1)).current;

  useEffect(() => {
    if (visible && animationType === 'fade') {
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, animationType, opacity]);

  if (!visible) return null;

  return (
    <FullWindowOverlay>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        {children}
      </Animated.View>
    </FullWindowOverlay>
  );
};

const OverlayModal = ({
  visible,
  animationType = 'none',
  transparent = true,
  statusBarTranslucent = false,
  onRequestClose,
  children,
}) => {
  if (Platform.OS === 'ios') {
    return (
      <IosOverlay visible={visible} animationType={animationType}>
        {children}
      </IosOverlay>
    );
  }
  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  );
};

export default OverlayModal;

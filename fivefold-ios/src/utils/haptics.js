import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if haptics are enabled
let hapticsEnabled = true;

// Load haptics setting on app start
AsyncStorage.getItem('fivefold_vibration').then(value => {
  hapticsEnabled = value !== 'false';
});

// Listen for setting changes
export const updateHapticsSetting = async (enabled) => {
  hapticsEnabled = enabled;
  await AsyncStorage.setItem('fivefold_vibration', enabled ? 'true' : 'false');
};

// Enhanced haptic feedback system with fluid interactions
export const hapticFeedback = {
  // Light feedback for simple taps
  light: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Medium feedback for important actions
  medium: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Heavy feedback for major actions
  heavy: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // Success feedback for task completion
  success: () => {
    if (!hapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Warning feedback for errors
  warning: () => {
    if (!hapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  // Error feedback for failures
  error: () => {
    if (!hapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Selection feedback for picking items
  selection: () => {
    if (!hapticsEnabled) return;
    Haptics.selectionAsync();
  },

  // New fluid haptic patterns
  // Gentle tap for delicate interactions
  gentle: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Button press with bounce feel
  buttonPress: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Card tap with soft feedback
  cardTap: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Achievement unlock celebration
  achievement: () => {
    if (!hapticsEnabled) return;
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 0);
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
  },

  // Page transition feedback
  pageChange: () => {
    if (!hapticsEnabled) return;
    Haptics.selectionAsync();
  },

  // Modal presentation
  modalOpen: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Modal dismissal
  modalClose: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Swipe gesture
  swipe: () => {
    if (!hapticsEnabled) return;
    Haptics.selectionAsync();
  },

  // Long press start
  longPressStart: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Long press end
  longPressEnd: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Progress milestone
  progress: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Prayer start
  prayerStart: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Prayer complete
  prayerComplete: () => {
    if (!hapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Bible verse highlight
  verseHighlight: () => {
    if (!hapticsEnabled) return;
    Haptics.selectionAsync();
  },

  // Task completion celebration
  taskComplete: () => {
    if (!hapticsEnabled) return;
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 0);
    setTimeout(() => hapticsEnabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 150);
  },

  // Level up celebration
  levelUp: () => {
    if (!hapticsEnabled) return;
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 0);
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
    setTimeout(() => hapticsEnabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
  },

  // Double tap
  doubleTap: () => {
    if (!hapticsEnabled) return;
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
  },

  // Triple tap (special action)
  tripleTap: () => {
    if (!hapticsEnabled) return;
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 80);
    setTimeout(() => hapticsEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 160);
  },

  // AI response received
  aiResponse: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Photo capture
  photoCapture: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // Profile update
  profileUpdate: () => {
    if (!hapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Settings toggle
  settingsToggle: () => {
    if (!hapticsEnabled) return;
    Haptics.selectionAsync();
  },

  // Search action
  search: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Bookmark action
  bookmark: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Share action
  share: () => {
    if (!hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
};

// Haptic sequence creator for custom patterns
export const createHapticSequence = (pattern) => {
  pattern.forEach((haptic, index) => {
    setTimeout(() => {
      if (typeof haptic.type === 'string' && hapticFeedback[haptic.type]) {
        hapticFeedback[haptic.type]();
      } else if (haptic.impact) {
        Haptics.impactAsync(haptic.impact);
      } else if (haptic.notification) {
        Haptics.notificationAsync(haptic.notification);
      } else if (haptic.selection) {
        Haptics.selectionAsync();
      }
    }, haptic.delay || index * 100);
  });
};

// Adaptive haptics based on user interaction speed
export const adaptiveHaptic = (velocity = 1) => {
  if (velocity < 0.5) {
    hapticFeedback.gentle();
  } else if (velocity < 1.5) {
    hapticFeedback.light();
  } else if (velocity < 3) {
    hapticFeedback.medium();
  } else {
    hapticFeedback.heavy();
  }
};

export default hapticFeedback;

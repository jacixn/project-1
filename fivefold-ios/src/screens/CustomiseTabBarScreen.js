import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  LayoutAnimation,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';
import { refreshTabBarConfig, DEFAULT_ORDER } from '../navigation/TabNavigator';
import notificationService from '../services/notificationService';

const ROW_HEIGHT = 68;

const TAB_META = {
  BiblePrayer: { label: 'Bible', icon: 'menu-book', color: '#3B82F6' },
  Todos: { label: 'Tasks', icon: 'check-circle', color: '#10B981' },
  Gym: { label: 'Fitness', icon: 'fitness-center', color: '#F59E0B' },
  Hub: { label: 'Hub', icon: 'forum', color: '#8B5CF6' },
  Profile: { label: 'Profile', icon: 'person', color: '#EC4899' },
};

const SWAP_ANIM = {
  duration: 200,
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};

const TabRow = React.memo(({
  name,
  isLast,
  isDark,
  textColor,
  textSecondary,
  theme,
  isHidden,
  isProfile,
  onToggle,
  draggedKey,
  draggingTab,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const meta = TAB_META[name];

  const gesture = React.useMemo(() =>
    Gesture.Pan()
      .activateAfterLongPress(200)
      .onStart(() => {
        'worklet';
        draggedKey.value = name;
        runOnJS(onDragStart)(name);
      })
      .onUpdate(({ translationY }) => {
        'worklet';
        runOnJS(onDragMove)(translationY);
      })
      .onEnd(() => {
        'worklet';
        draggedKey.value = '';
        runOnJS(onDragEnd)();
      })
      .onFinalize(() => {
        'worklet';
        if (draggedKey.value === name) {
          draggedKey.value = '';
          runOnJS(onDragEnd)();
        }
      })
      .enabled(!isProfile),
    [name, isProfile]
  );

  const normalBg = isDark ? '#151515' : '#FFFFFF';
  const isBeingDragged = draggingTab === name;

  const animStyle = useAnimatedStyle(() => {
    const isActive = draggedKey.value === name;
    return {
      transform: [
        { scale: withSpring(isActive ? 1.04 : 1, { damping: 15, stiffness: 200 }) },
      ],
      zIndex: isActive ? 100 : 1,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.tabRow,
          animStyle,
          { backgroundColor: isBeingDragged ? (isDark ? '#1A3D1A' : '#D5F5D5') : normalBg },
          isBeingDragged && { borderRadius: 14, borderWidth: 1.5, borderColor: isDark ? '#2E7D32' : '#4CAF50' },
          !isLast && {
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          },
          isHidden && { opacity: 0.45 },
        ]}
      >
        <View style={styles.dragHandle}>
          {isProfile ? (
            <View style={{ width: 22 }} />
          ) : (
            <MaterialIcons name="drag-indicator" size={22} color={textSecondary} />
          )}
        </View>

        <View style={[styles.tabIconBg, { backgroundColor: meta.color + '20' }]}>
          <MaterialIcons name={meta.icon} size={20} color={meta.color} />
        </View>

        <View style={styles.tabInfo}>
          <Text style={[styles.tabLabel, { color: textColor }]}>{meta.label}</Text>
          {isProfile && (
            <Text style={[styles.tabHint, { color: textSecondary }]}>Always visible</Text>
          )}
        </View>

        {isProfile ? (
          <MaterialIcons name="lock" size={18} color={textSecondary} style={{ opacity: 0.5 }} />
        ) : (
          <Switch
            value={!isHidden}
            onValueChange={() => onToggle(name)}
            trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
            thumbColor="#fff"
            style={{ marginTop: 16 }}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
});

const CustomiseTabBarScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [hidden, setHidden] = useState([]);
  const [initialHidden, setInitialHidden] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [draggingTab, setDraggingTab] = useState(null);

  const orderRef = useRef(order);
  orderRef.current = order;

  const currentDragIdx = useRef(-1);
  const swapAccumulator = useRef(0);

  const draggedKey = useSharedValue('');

  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#666';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await userStorage.get('tabBarConfig');
      if (config) {
        if (config.order) setOrder(config.order);
        if (config.hidden) {
          const filteredHidden = config.hidden.filter(h => h !== 'Profile');
          setHidden(filteredHidden);
          setInitialHidden(filteredHidden);
        }
      }
    } catch (_) {}
  };

  const saveConfig = async () => {
    try {
      const newlyHidden = hidden.filter(h => !initialHidden.includes(h));
      const newlyUnhidden = initialHidden.filter(h => !hidden.includes(h));

      await userStorage.set('tabBarConfig', { order, hidden });
      refreshTabBarConfig();

      for (const tabName of newlyHidden) {
        await notificationService.pauseNotificationsForTab(tabName);
      }
      for (const tabName of newlyUnhidden) {
        await notificationService.restoreNotificationsForTab(tabName);
      }

      hapticFeedback.success();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save tab bar settings.');
    }
  };

  const resetToDefault = () => {
    setOrder([...DEFAULT_ORDER]);
    setHidden([]);
    setHasChanges(true);
    hapticFeedback.medium();
  };

  const toggleTab = useCallback((name) => {
    if (name === 'Profile') return;
    setHidden(prev => {
      const currentOrder = orderRef.current;
      const visibleCount = currentOrder.filter(n => !prev.includes(n)).length;
      if (!prev.includes(name) && visibleCount <= 2) {
        hapticFeedback.error();
        Alert.alert('Minimum Tabs', 'You need at least 2 visible tabs.');
        return prev;
      }
      setHasChanges(true);
      hapticFeedback.light();
      return prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name];
    });
  }, []);

  const onDragStart = useCallback((name) => {
    currentDragIdx.current = orderRef.current.indexOf(name);
    swapAccumulator.current = 0;
    setScrollEnabled(false);
    setDraggingTab(name);
    hapticFeedback.medium();
  }, []);

  const onDragMove = useCallback((translationY) => {
    const adjustedY = translationY - swapAccumulator.current;
    const threshold = ROW_HEIGHT * 0.5;
    const idx = currentDragIdx.current;
    const currentOrder = orderRef.current;

    if (adjustedY > threshold && idx < currentOrder.length - 1) {
      LayoutAnimation.configureNext(SWAP_ANIM);
      const newOrder = [...currentOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      orderRef.current = newOrder;
      setOrder(newOrder);
      setHasChanges(true);
      currentDragIdx.current = idx + 1;
      swapAccumulator.current += ROW_HEIGHT;
      hapticFeedback.light();
    } else if (adjustedY < -threshold && idx > 0) {
      LayoutAnimation.configureNext(SWAP_ANIM);
      const newOrder = [...currentOrder];
      [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
      orderRef.current = newOrder;
      setOrder(newOrder);
      setHasChanges(true);
      currentDragIdx.current = idx - 1;
      swapAccumulator.current -= ROW_HEIGHT;
      hapticFeedback.light();
    }
  }, []);

  const onDragEnd = useCallback(() => {
    currentDragIdx.current = -1;
    swapAccumulator.current = 0;
    setScrollEnabled(true);
    setDraggingTab(null);
  }, []);

  const visibleCount = order.filter(n => !hidden.includes(n)).length;

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back-ios" size={22} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Customise Tab Bar</Text>
        <TouchableOpacity onPress={resetToDefault} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.resetText, { color: theme.primary }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <Text style={[styles.sectionDesc, { color: textSecondary }]}>
          Hold and drag to reorder. Profile is always visible.
        </Text>

        <View style={[styles.previewBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.previewLabel, { color: textSecondary }]}>Preview</Text>
          <View style={styles.previewTabs}>
            {order.filter(n => !hidden.includes(n)).map(name => {
              const meta = TAB_META[name];
              return (
                <View key={name} style={styles.previewTab}>
                  <MaterialIcons name={meta.icon} size={20} color={theme.primary} />
                  <Text style={[styles.previewTabText, { color: textColor }]}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textSecondary }]}>TABS</Text>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {order.map((name, index) => (
            <TabRow
              key={name}
              name={name}
              isLast={index === order.length - 1}
              isDark={isDark}
              textColor={textColor}
              textSecondary={textSecondary}
              theme={theme}
              isHidden={hidden.includes(name)}
              isProfile={name === 'Profile'}
              onToggle={toggleTab}
              draggedKey={draggedKey}
              draggingTab={draggingTab}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          ))}
        </View>

        <Text style={[styles.footerNote, { color: textSecondary }]}>
          {visibleCount} of {order.length} tabs visible
        </Text>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={saveConfig}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  previewBar: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  previewTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  previewTab: {
    alignItems: 'center',
    gap: 4,
  },
  previewTabText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingRight: 16,
    paddingLeft: 4,
  },
  dragHandle: {
    width: 36,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tabInfo: {
    flex: 1,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabHint: {
    fontSize: 12,
    marginTop: 1,
  },
  footerNote: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CustomiseTabBarScreen;

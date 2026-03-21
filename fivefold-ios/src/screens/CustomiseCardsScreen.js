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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';

const ROW_HEIGHT = 68;

const TAB_OPTIONS = [
  { key: 'BiblePrayer', label: 'Bible', icon: 'menu-book', color: '#3B82F6' },
  { key: 'Todos', label: 'Tasks', icon: 'check-circle', color: '#10B981' },
  { key: 'Gym', label: 'Fitness', icon: 'fitness-center', color: '#F59E0B' },
];

const CARD_META = {
  BiblePrayer: {
    Prayer:     { label: 'My Prayers',   icon: 'favorite',      color: '#EC4899' },
    Bible:      { label: 'Holy Bible',    icon: 'menu-book',     color: '#3B82F6' },
    BibleStudy: { label: 'Bible Study',   icon: 'school',        color: '#8B5CF6' },
    PrayerBoard:{ label: 'Prayer Board', icon: 'dashboard',     color: '#F472B6' },
    Library:    { label: 'My Library',    icon: 'collections-bookmark', color: '#F59E0B' },
  },
  Todos: {
    Calendar:   { label: 'This Week',    icon: 'calendar-today', color: '#3B82F6' },
    Reminders:  { label: 'Reminders',    icon: 'notifications-active', color: '#EC4899' },
    Habits:     { label: 'Habits',       icon: 'loop',           color: '#8B5CF6' },
    Vision:     { label: 'Vision',       icon: 'visibility',     color: '#F59E0B' },
    Tasks:      { label: 'Tasks',        icon: 'check-circle',   color: '#10B981' },
  },
  Gym: {
    WeeklyCalendar:  { label: 'This Week',        icon: 'calendar-today',  color: '#3B82F6' },
    BodyComposition: { label: 'Body Composition',  icon: 'monitor-heart',   color: '#EC4899' },
    StartWorkout:    { label: 'Start Workout',     icon: 'play-arrow',      color: '#10B981' },
    Fuel:            { label: 'Fuel',              icon: 'restaurant',      color: '#F59E0B' },
    Physique:        { label: 'Physique',          icon: 'accessibility-new', color: '#8B5CF6' },
    Exercises:       { label: 'Exercises',         icon: 'fitness-center',  color: '#EF4444' },
    WorkoutHistory:  { label: 'Workout History',   icon: 'history',         color: '#6B7280' },
  },
};

const DEFAULT_ORDERS = {
  BiblePrayer: ['Prayer', 'Bible', 'BibleStudy', 'PrayerBoard', 'Library'],
  Todos: ['Calendar', 'Reminders', 'Habits', 'Vision', 'Tasks'],
  Gym: ['WeeklyCalendar', 'BodyComposition', 'StartWorkout', 'Fuel', 'Physique', 'Exercises', 'WorkoutHistory'],
};

const STORAGE_KEYS = {
  BiblePrayer: 'cardConfig_BiblePrayer',
  Todos: 'cardConfig_Todos',
  Gym: 'cardConfig_Gym',
};

const SWAP_ANIM = {
  duration: 200,
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};

const CardRow = React.memo(({
  name,
  tabKey,
  isLast,
  isDark,
  textColor,
  textSecondary,
  theme,
  isHidden,
  onToggle,
  draggedKey,
  draggingCard,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const meta = CARD_META[tabKey]?.[name];
  if (!meta) return null;

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
      }),
    [name]
  );

  const normalBg = isDark ? '#151515' : '#FFFFFF';
  const isBeingDragged = draggingCard === name;

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
          styles.cardRow,
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
          <MaterialIcons name="drag-indicator" size={22} color={textSecondary} />
        </View>

        <View style={[styles.cardIconBg, { backgroundColor: meta.color + '20' }]}>
          <MaterialIcons name={meta.icon} size={20} color={meta.color} />
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardLabel, { color: textColor }]}>{meta.label}</Text>
        </View>

        <Switch
          value={!isHidden}
          onValueChange={() => onToggle(name)}
          trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
          thumbColor="#fff"
          style={{ marginTop: 16 }}
        />
      </Animated.View>
    </GestureDetector>
  );
});

const CustomiseCardsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const initialTab = route.params?.tab || 'BiblePrayer';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [order, setOrder] = useState(DEFAULT_ORDERS[initialTab]);
  const [hidden, setHidden] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [draggingCard, setDraggingCard] = useState(null);

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
    loadConfig(activeTab);
  }, [activeTab]);

  const loadConfig = async (tab) => {
    try {
      const config = await userStorage.get(STORAGE_KEYS[tab]);
      if (config) {
        const defaultOrder = DEFAULT_ORDERS[tab];
        const savedOrder = config.order || defaultOrder;
        const merged = [
          ...savedOrder.filter(id => defaultOrder.includes(id)),
          ...defaultOrder.filter(id => !savedOrder.includes(id)),
        ];
        setOrder(merged);
        setHidden(config.hidden || []);
      } else {
        setOrder([...DEFAULT_ORDERS[tab]]);
        setHidden([]);
      }
      setHasChanges(false);
    } catch (_) {
      setOrder([...DEFAULT_ORDERS[tab]]);
      setHidden([]);
    }
  };

  const saveConfig = async () => {
    try {
      await userStorage.set(STORAGE_KEYS[activeTab], { order, hidden });
      hapticFeedback.success();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save card settings.');
    }
  };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'Save your changes before switching tabs?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => { setActiveTab(tab); } },
          { text: 'Save', onPress: async () => {
            await userStorage.set(STORAGE_KEYS[activeTab], { order, hidden });
            setActiveTab(tab);
          }},
        ]
      );
    } else {
      setActiveTab(tab);
    }
  };

  const resetToDefault = () => {
    setOrder([...DEFAULT_ORDERS[activeTab]]);
    setHidden([]);
    setHasChanges(true);
    hapticFeedback.medium();
  };

  const toggleCard = useCallback((name) => {
    setHidden(prev => {
      const currentOrder = orderRef.current;
      const visibleCount = currentOrder.filter(n => !prev.includes(n)).length;
      if (!prev.includes(name) && visibleCount <= 1) {
        hapticFeedback.error();
        Alert.alert('Minimum Cards', 'You need at least 1 visible card.');
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
    setDraggingCard(name);
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
    setDraggingCard(null);
  }, []);

  const visibleCount = order.filter(n => !hidden.includes(n)).length;
  const currentCards = CARD_META[activeTab] || {};

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
        <Text style={[styles.headerTitle, { color: textColor }]}>Customise Cards</Text>
        <TouchableOpacity onPress={resetToDefault} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.resetText, { color: theme.primary }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Picker */}
      <View style={[styles.tabPicker, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        {TAB_OPTIONS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => switchTab(tab.key)}
              style={[
                styles.tabChip,
                { backgroundColor: isActive ? theme.primary : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={isActive ? '#FFFFFF' : textSecondary}
              />
              <Text style={[
                styles.tabChipText,
                { color: isActive ? '#FFFFFF' : textSecondary },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <Text style={[styles.sectionDesc, { color: textSecondary }]}>
          Hold and drag to reorder. Toggle to show or hide.
        </Text>

        {/* Preview */}
        <View style={[styles.previewBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.previewLabel, { color: textSecondary }]}>Preview</Text>
          <View style={styles.previewCards}>
            {order.filter(n => !hidden.includes(n)).map(name => {
              const meta = currentCards[name];
              if (!meta) return null;
              return (
                <View key={name} style={[styles.previewCard, { backgroundColor: meta.color + '15', borderColor: meta.color + '40' }]}>
                  <MaterialIcons name={meta.icon} size={14} color={meta.color} />
                  <Text style={[styles.previewCardText, { color: textColor }]} numberOfLines={1}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textSecondary }]}>CARDS</Text>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {order.map((name, index) => (
            <CardRow
              key={name}
              name={name}
              tabKey={activeTab}
              isLast={index === order.length - 1}
              isDark={isDark}
              textColor={textColor}
              textSecondary={textSecondary}
              theme={theme}
              isHidden={hidden.includes(name)}
              onToggle={toggleCard}
              draggedKey={draggedKey}
              draggingCard={draggingCard}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          ))}
        </View>

        <Text style={[styles.footerNote, { color: textSecondary }]}>
          {visibleCount} of {order.length} cards visible
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
  tabPicker: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
    borderBottomWidth: 1,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  previewCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  previewCardText: {
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
  cardRow: {
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
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
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

export { CARD_META, DEFAULT_ORDERS, STORAGE_KEYS };
export default CustomiseCardsScreen;

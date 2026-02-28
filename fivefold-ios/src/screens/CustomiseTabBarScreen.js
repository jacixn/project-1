import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';
import { refreshTabBarConfig, DEFAULT_ORDER } from '../navigation/TabNavigator';
import notificationService from '../services/notificationService';

const TAB_META = {
  BiblePrayer: { label: 'Bible', icon: 'menu-book', color: '#3B82F6' },
  Todos: { label: 'Tasks', icon: 'check-circle', color: '#10B981' },
  Gym: { label: 'Fitness', icon: 'fitness-center', color: '#F59E0B' },
  Hub: { label: 'Hub', icon: 'forum', color: '#8B5CF6' },
  Profile: { label: 'Profile', icon: 'person', color: '#EC4899' },
};

const CustomiseTabBarScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [hidden, setHidden] = useState([]);
  const [initialHidden, setInitialHidden] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#666';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    loadConfig();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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

  const resetToDefault = async () => {
    setOrder([...DEFAULT_ORDER]);
    setHidden([]);
    setHasChanges(true);
    hapticFeedback.medium();
  };

  const moveTab = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setOrder(newOrder);
    setHasChanges(true);
    hapticFeedback.light();
  };

  const toggleTab = (name) => {
    if (name === 'Profile') return;
    const visibleCount = order.filter(n => !hidden.includes(n)).length;
    if (!hidden.includes(name) && visibleCount <= 2) {
      hapticFeedback.error();
      Alert.alert('Minimum Tabs', 'You need at least 2 visible tabs.');
      return;
    }
    setHidden(prev =>
      prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name]
    );
    setHasChanges(true);
    hapticFeedback.light();
  };

  const visibleCount = order.filter(n => !hidden.includes(n)).length;

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.background, opacity: fadeAnim }]}>
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

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionDesc, { color: textSecondary }]}>
          Choose which tabs to show and drag to reorder. Profile is always visible.
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
          {order.map((name, index) => {
            const meta = TAB_META[name];
            const isProfile = name === 'Profile';
            const isHidden = hidden.includes(name);
            const isFirst = index === 0;
            const isLast = index === order.length - 1;

            return (
              <View
                key={name}
                style={[
                  styles.tabRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                  isHidden && { opacity: 0.45 },
                ]}
              >
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    onPress={() => moveTab(index, -1)}
                    disabled={isFirst}
                    style={[styles.arrowBtn, isFirst && { opacity: 0.2 }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialIcons name="keyboard-arrow-up" size={22} color={textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveTab(index, 1)}
                    disabled={isLast}
                    style={[styles.arrowBtn, isLast && { opacity: 0.2 }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialIcons name="keyboard-arrow-down" size={22} color={textSecondary} />
                  </TouchableOpacity>
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
                    onValueChange={() => toggleTab(name)}
                    trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            );
          })}
        </View>

        <Text style={[styles.footerNote, { color: textSecondary }]}>
          {visibleCount} of {order.length} tabs visible
        </Text>
      </Animated.ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={saveConfig}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
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
    paddingVertical: 12,
    paddingRight: 16,
    paddingLeft: 4,
  },
  reorderButtons: {
    alignItems: 'center',
    width: 32,
    marginRight: 4,
  },
  arrowBtn: {
    padding: 1,
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

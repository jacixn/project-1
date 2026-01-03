import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  View as SafeAreaView, // Switched to View to ignore bottom safe area as requested
  TextInput,
  FlatList,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const CARD_SIZE = (width - 50) / 2; // 2 cards per row for more impact and space

const AchievementsModal = ({ visible, onClose, userStats }) => {
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [achievements, setAchievements] = useState([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Search bar fade animation (no height change)
  const searchBarOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');
  
  const handleScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
    
    if (direction !== scrollDirection.current && Math.abs(currentScrollY - lastScrollY.current) > 10) {
      scrollDirection.current = direction;
      
      Animated.timing(searchBarOpacity, {
        toValue: direction === 'down' ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    if (visible) {
      // Reset search bar animation
      searchBarOpacity.setValue(1);
      lastScrollY.current = 0;
      scrollDirection.current = 'up';
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
      generateAchievements();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, userStats]);

  const generateAchievements = () => {
    const stats = userStats || {};
    const completedTasks = stats.completedTasks || 0;
    const points = stats.points || 0;
    const level = stats.level || 1;
    const streakDays = stats.streak || 0;
    const prayersCompleted = stats.prayersCompleted || 0;
    const versesRead = stats.versesRead || 0;
    const savedVerses = stats.savedVerses || 0;

    const makeMilestone = ({
      id,
      title,
      description,
      category,
      icon,
      value,
      current,
      rewardPoints,
    }) => ({
      id,
      title,
      description,
      category,
      icon,
      target: value,
      progress: Math.min(current, value),
      completed: current >= value,
      points: rewardPoints,
    });

    const tierReward = (i, total) => {
      // Gradual rewards matching AchievementService
      const percent = i / total;
      if (percent >= 0.95) return 10000000; // 10 Million
      if (percent >= 0.85) return 5000000;  // 5 Million
      if (percent >= 0.7) return 2500000;   // 2.5 Million
      if (percent >= 0.5) return 1000000;   // 1 Million
      if (percent >= 0.3) return 500000;    // 500k
      if (percent >= 0.2) return 250000;    // 250k
      if (percent >= 0.1) return 100000;    // 100k
      if (i >= 5) return 50000;             // 50k
      if (i >= 2) return 25000;             // 25k
      if (i === 1) return 15000;            // 15k
      return 10000;                         // 10k for the very first one
    };

    const taskMilestones = [
      1, 10, 25, 50, 75, 100, 150, 200, 300,
      400, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500,
    ].map((value, i, arr) =>
      makeMilestone({
        id: `tasks_${value}`,
        title:
          value === 1 ? 'First Win' :
          value === 100 ? 'Task Centurion' :
          value === 1000 ? 'Task Titan' :
          value === 5000 ? 'Relentless' :
          `Task Milestone`,
        description: `Complete ${value} total tasks`,
        category: 'tasks',
        icon: 'assignment-turned-in',
        value,
        current: completedTasks,
        rewardPoints: tierReward(i, arr.length),
      })
    );

    const streakMilestones = [
      7, 14, 21, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 365,
    ].map((value, i, arr) =>
      makeMilestone({
        id: `streak_${value}`,
        title:
          value === 7 ? 'Week Strong' :
          value === 30 ? 'One Month' :
          value === 180 ? 'Half Year' :
          value === 365 ? 'One Year' :
          'Streak Milestone',
        description: `Maintain a ${value}-day app streak`,
        category: 'streak',
        icon: 'whatshot',
        value,
        current: streakDays,
        rewardPoints: tierReward(i, arr.length),
      })
    );

    const prayerMilestones = [
      1, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000,
    ].map((value, i, arr) =>
      makeMilestone({
        id: `prayers_${value}`,
        title:
          value === 1 ? 'First Prayer' :
          value === 100 ? 'Prayer Centurion' :
          value === 1000 ? 'Prayer Veteran' :
          'Prayer Milestone',
        description: `Complete ${value} prayers`,
        category: 'prayer',
        icon: 'healing',
        value,
        current: prayersCompleted,
        rewardPoints: tierReward(i, arr.length),
      })
    );

    const verseMilestones = [
      1, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000,
    ].map((value, i, arr) =>
      makeMilestone({
        id: `verses_${value}`,
        title:
          value === 1 ? 'First Verse' :
          value === 500 ? 'Scripture Builder' :
          value === 2000 ? 'Scripture Scholar' :
          value === 10000 ? 'Scripture Sage' :
          'Reading Milestone',
        description: `Read ${value.toLocaleString()} Bible verses`,
        category: 'reading',
        icon: 'menu-book',
        value,
        current: versesRead,
        rewardPoints: tierReward(i, arr.length),
      })
    );

    const savedVerseMilestones = [
      1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500,
    ].map((value, i, arr) =>
      makeMilestone({
        id: `saved_verses_${value}`,
        title:
          value === 1 ? 'First Save' :
          value === 25 ? 'Verse Keeper' :
          value === 100 ? 'Archive Builder' :
          value === 300 ? 'Living Library' :
          'Saved Verses',
        description: `Save ${value} verses`,
        category: 'reading',
        icon: 'bookmark',
        value,
        current: savedVerses,
        rewardPoints: tierReward(i, arr.length),
      })
    );

    const levelMilestones = [
      5, 10, 15, 20, 25,
    ].map((value, i, arr) =>
      makeMilestone({
        id: `level_${value}`,
        title:
          value === 5 ? 'Getting Stronger' :
          value === 10 ? 'Built Different' :
          value === 25 ? 'Elite' :
          'Level Up',
        description: `Reach level ${value}`,
        category: 'level',
        icon: 'military-tech',
        value,
        current: level,
        rewardPoints: tierReward(i, arr.length),
      })
    );

    const special = [
      {
        id: 'special_balanced_disciple',
        title: 'Balanced Disciple',
        description: '100 tasks, 100 prayers, 500 verses',
        category: 'special',
        icon: 'emoji-events',
        target: 1,
        progress: (completedTasks >= 100 && prayersCompleted >= 100 && versesRead >= 500) ? 1 : 0,
        completed: completedTasks >= 100 && prayersCompleted >= 100 && versesRead >= 500,
        points: 1000000,
      },
      {
        id: 'special_devoted_builder',
        title: 'Devoted Builder',
        description: '500 tasks, 50,000 points, 60-day streak',
        category: 'special',
        icon: 'emoji-events',
        target: 1,
        progress: (completedTasks >= 500 && points >= 50000 && streakDays >= 60) ? 1 : 0,
        completed: completedTasks >= 500 && points >= 50000 && streakDays >= 60,
        points: 2500000,
      },
      {
        id: 'special_scripture_and_prayer',
        title: 'Scripture & Prayer',
        description: '2,000 verses and 500 prayers',
        category: 'special',
        icon: 'emoji-events',
        target: 1,
        progress: (versesRead >= 2000 && prayersCompleted >= 500) ? 1 : 0,
        completed: versesRead >= 2000 && prayersCompleted >= 500,
        points: 2500000,
      },
      {
        id: 'special_deep_rooted',
        title: 'Deep Rooted',
        description: '180-day streak, 1,000 prayers, 5,000 verses',
        category: 'special',
        icon: 'emoji-events',
        target: 1,
        progress: (streakDays >= 180 && prayersCompleted >= 1000 && versesRead >= 5000) ? 1 : 0,
        completed: streakDays >= 180 && prayersCompleted >= 1000 && versesRead >= 5000,
        points: 5000000,
      },
      {
        id: 'special_fivefold_legend',
        title: 'Fivefold Legend',
        description: '2,000 tasks, 250,000 points, 365-day streak',
        category: 'special',
        icon: 'emoji-events',
        target: 1,
        progress: (completedTasks >= 2000 && points >= 250000 && streakDays >= 365) ? 1 : 0,
        completed: completedTasks >= 2000 && points >= 250000 && streakDays >= 365,
        points: 10000000,
      },
    ];

    const allAchievements = [
      ...taskMilestones,
      ...streakMilestones,
      ...prayerMilestones,
      ...verseMilestones,
      ...savedVerseMilestones,
      ...levelMilestones,
      ...special,
    ];

    setAchievements(allAchievements);
  };

  const filteredAchievements = achievements.filter(achievement => {
    const matchesSearch = achievement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         achievement.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderAchievement = ({ item }) => (
    <Animated.View
      style={{
        transform: [{ scale: item.completed ? 1 : 0.98 }],
        opacity: item.completed ? 1 : 0.8
      }}
    >
      <TouchableOpacity 
        activeOpacity={0.8}
        style={[
          styles.achievementCard, 
          { 
            backgroundColor: item.completed ? `${theme.primary}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: item.completed ? theme.primary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }
        ]}
      >
        {item.completed && (
          <LinearGradient
            colors={[`${theme.primary}20`, 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        <View style={[styles.achievementIcon, { 
          backgroundColor: item.completed ? theme.primary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          shadowColor: theme.primary,
          shadowOpacity: item.completed ? 0.5 : 0,
          shadowRadius: 10,
          elevation: item.completed ? 10 : 0
        }]}>
          <MaterialIcons 
            name={item.icon} 
            size={28} 
            color={item.completed ? '#FFFFFF' : theme.textTertiary} 
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={[styles.achievementTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          
          <Text style={[styles.achievementDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.achievementProgress}>
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <LinearGradient
                colors={[theme.primary, `${theme.primary}80`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((item.progress / item.target) * 100, 100)}%`
                  }
                ]} 
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={[styles.progressText, { color: theme.textTertiary }]}>
                {item.progress.toLocaleString()}/{item.target.toLocaleString()}
              </Text>
              <Text style={[styles.pointsText, { color: item.completed ? theme.primary : theme.textTertiary, fontWeight: '800' }]}>
                +{Number(item.points || 0).toLocaleString()} PTS
              </Text>
            </View>
          </View>
        </View>
        
        {item.completed && (
          <View style={[styles.completedBadge, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="check" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <LinearGradient
          colors={isDark ? ['#1a1a1a', '#000'] : ['#FDFBFB', '#EBEDEE']}
          style={StyleSheet.absoluteFill}
        />
        
        <Animated.View style={[styles.container, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          {/* Content - FlatList starts from top */}
          <FlatList
            data={filteredAchievements}
            renderItem={renderAchievement}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={{
              padding: 16,
              paddingTop: Platform.OS === 'ios' ? 175 : 145,
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />

          {/* Premium Transparent Header */}
          <BlurView 
            intensity={50} 
            tint={isDark ? 'dark' : 'light'} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              zIndex: 1000,
            }}
          >
            <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
            <Animated.View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={{ 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    paddingHorizontal: 18, 
                    paddingVertical: 10,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ 
                    color: theme.text, 
                    fontSize: 17, 
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}>
                    Achievements
                  </Text>
                  <View style={{ 
                    width: 30, 
                    height: 3, 
                    backgroundColor: theme.primary, 
                    borderRadius: 2,
                    marginTop: 4
                  }} />
                </View>
                
                <View style={{ width: 70 }} />
              </View>
              
              {/* Search bar with fade animation */}
              <Animated.View style={{
                opacity: searchBarOpacity,
                marginTop: 16,
              }}>
                <View style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                }}>
                  <MaterialIcons name="search" size={20} color={theme.textTertiary} />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: theme.text,
                      marginLeft: 10,
                      paddingVertical: 2,
                    }}
                    placeholder="Search milestones..."
                    placeholderTextColor={theme.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons name="close" size={14} color={theme.text} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            </Animated.View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 0, // HeaderContainer handles blur and padding
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  achievementsContainer: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 100, // Space for bottom of list
  },
  achievementCard: {
    width: CARD_SIZE,
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  achievementDesc: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
  achievementProgress: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.6,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default AchievementsModal;

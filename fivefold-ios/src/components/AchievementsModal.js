import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
// Removed InteractiveSwipeBack import
// GlassCard import removed (unused)

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 3; // 3 cards per row with spacing

const AchievementsModal = ({ visible, onClose, userStats }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const [achievements, setAchievements] = useState([]);



  useEffect(() => {
    if (!visible) return;
    generateAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Escalating reward so higher tiers feel meaningfully better
      if (i >= total - 3) return 10000;
      if (i >= total - 7) return 5000;
      if (i >= total - 12) return 2500;
      if (i >= total - 16) return 1500;
      return 1000;
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

    const pointMilestones = [
      1000, 5000, 10000, 15000, 20000, 30000, 40000, 50000,
      75000, 100000, 150000, 200000, 300000, 400000, 500000, 750000, 1000000, 2000000,
    ].map((value, i, arr) =>
      makeMilestone({
        id: `points_${value}`,
        title:
          value === 10000 ? 'Point Builder' :
          value === 100000 ? 'Point Master' :
          value === 1000000 ? 'Point Legend' :
          'Point Milestone',
        description: `Earn ${value.toLocaleString()} total points`,
        category: 'points',
        icon: 'star',
        value,
        current: points,
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
        points: 5000,
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
        points: 7500,
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
        points: 7500,
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
        points: 10000,
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
        points: 15000,
      },
    ];

    const allAchievements = [
      ...taskMilestones,
      ...pointMilestones,
      ...streakMilestones,
      ...prayerMilestones,
      ...verseMilestones,
      ...savedVerseMilestones,
      ...levelMilestones,
      ...special,
    ];

    // Exactly 100 achievements by construction (keep as a guardrail)
    if (allAchievements.length !== 100) {
      console.warn(`Achievements list should be 100, got ${allAchievements.length}`);
    }
    setAchievements(allAchievements);
  };

  const filteredAchievements = achievements.filter(achievement => {
    const matchesSearch = achievement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         achievement.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });



  const renderAchievement = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.achievementCard, 
        { 
          backgroundColor: item.completed ? theme.primary + '20' : theme.card,
          borderColor: item.completed ? theme.primary : theme.border,
        }
      ]}
    >
      <View style={[styles.achievementIcon, { 
        backgroundColor: item.completed ? theme.primary : theme.surface 
      }]}>
        <MaterialIcons 
          name={item.icon} 
          size={24} 
          color={item.completed ? '#FFFFFF' : theme.primary} 
        />
      </View>
      
      <Text style={[styles.achievementTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      
      <Text style={[styles.achievementDesc, { color: theme.textSecondary }]} numberOfLines={3}>
        {item.description}
      </Text>
      
      <View style={styles.achievementProgress}>
        <View style={[styles.progressBar, { backgroundColor: theme.surface }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: theme.primary,
                width: `${Math.min((item.progress / item.target) * 100, 100)}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {item.progress}/{item.target} · {Number(item.points || 0).toLocaleString()} pts
        </Text>
      </View>
      

      
      {item.completed && (
        <View style={[styles.completedBadge, { backgroundColor: theme.primary }]}>
          <MaterialIcons name="check" size={16} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          <View style={styles.headerCenter}>
                          <Text style={[styles.headerTitle, { color: theme.text }]}>
                Achievements
              </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search achievements..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>



        {/* Achievements Grid */}
        <FlatList
          data={filteredAchievements}
          renderItem={renderAchievement}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.achievementsContainer}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },

  achievementsContainer: {
    padding: 20,
  },
  achievementCard: {
    width: CARD_SIZE,
    marginRight: 10,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    minHeight: 34,
  },
  achievementDesc: {
    fontSize: 11,
    marginBottom: 8,
    minHeight: 33,
  },
  achievementProgress: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
  },

  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Removed preview styles
});

export default AchievementsModal;

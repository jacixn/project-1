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
import { GlassCard } from './GlassEffect';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 3; // 3 cards per row with spacing

const AchievementsModal = ({ visible, onClose, userStats }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const [achievements, setAchievements] = useState([]);



  useEffect(() => {
    generateAchievements();
  }, []);



  const generateAchievements = () => {
    // Simple, meaningful achievements - no spam!
    const allAchievements = [
      // Task achievements - only meaningful milestones
      { id: 'daily_5', title: 'Daily Warrior', description: 'Complete 5 tasks in a single day', category: 'tasks', icon: 'check-circle', target: 5, progress: Math.min(userStats.todayCompletedTasks || 0, 5), completed: (userStats.todayCompletedTasks || 0) >= 5, points: 1000 },
      { id: 'daily_10', title: 'Daily Champion', description: 'Complete 10 tasks in a single day', category: 'tasks', icon: 'check-circle', target: 10, progress: Math.min(userStats.todayCompletedTasks || 0, 10), completed: (userStats.todayCompletedTasks || 0) >= 10, points: 1000 },
      { id: 'daily_15', title: 'Daily Legend', description: 'Complete 15 tasks in a single day', category: 'tasks', icon: 'check-circle', target: 15, progress: Math.min(userStats.todayCompletedTasks || 0, 15), completed: (userStats.todayCompletedTasks || 0) >= 15, points: 1000 },

      // Total tasks
      { id: 'total_25', title: 'Task Master', description: 'Complete 25 total tasks', category: 'tasks', icon: 'assignment-turned-in', target: 25, progress: Math.min(userStats.completedTasks || 0, 25), completed: (userStats.completedTasks || 0) >= 25, points: 1000 },
      { id: 'total_50', title: 'Task Expert', description: 'Complete 50 total tasks', category: 'tasks', icon: 'assignment-turned-in', target: 50, progress: Math.min(userStats.completedTasks || 0, 50), completed: (userStats.completedTasks || 0) >= 50, points: 1000 },
      { id: 'total_100', title: 'Task Champion', description: 'Complete 100 total tasks', category: 'tasks', icon: 'assignment-turned-in', target: 100, progress: Math.min(userStats.completedTasks || 0, 100), completed: (userStats.completedTasks || 0) >= 100, points: 1000 },

      // Streaks
      { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7 day streak', category: 'tasks', icon: 'whatshot', target: 7, progress: Math.min(userStats.streak || 0, 7), completed: (userStats.streak || 0) >= 7, points: 1000 },
      { id: 'streak_30', title: 'Month Master', description: 'Maintain a 30 day streak', category: 'tasks', icon: 'whatshot', target: 30, progress: Math.min(userStats.streak || 0, 30), completed: (userStats.streak || 0) >= 30, points: 1000 },

      // Points
      { id: 'points_500', title: 'Point Collector', description: 'Earn 500 total points', category: 'tasks', icon: 'star', target: 500, progress: Math.min(userStats.points || 0, 500), completed: (userStats.points || 0) >= 500, points: 1000 },
      { id: 'points_1000', title: 'Point Master', description: 'Earn 1000 total points', category: 'tasks', icon: 'star', target: 1000, progress: Math.min(userStats.points || 0, 1000), completed: (userStats.points || 0) >= 1000, points: 1000 },

      // Prayer achievements
      { id: 'prayers_25', title: 'Prayer Warrior', description: 'Complete 25 prayers', category: 'prayer', icon: 'healing', target: 25, progress: Math.min(userStats.prayersCompleted || 0, 25), completed: (userStats.prayersCompleted || 0) >= 25, points: 1000 },
      { id: 'prayers_100', title: 'Prayer Master', description: 'Complete 100 prayers', category: 'prayer', icon: 'healing', target: 100, progress: Math.min(userStats.prayersCompleted || 0, 100), completed: (userStats.prayersCompleted || 0) >= 100, points: 1000 },
      
      // Reading achievements  
      { id: 'verses_50', title: 'Scripture Reader', description: 'Read 50 Bible verses', category: 'reading', icon: 'book', target: 50, progress: Math.min(userStats.versesRead || 0, 50), completed: (userStats.versesRead || 0) >= 50, points: 1000 },
      { id: 'verses_200', title: 'Scripture Scholar', description: 'Read 200 Bible verses', category: 'reading', icon: 'book', target: 200, progress: Math.min(userStats.versesRead || 0, 200), completed: (userStats.versesRead || 0) >= 200, points: 1000 },

      // Faith levels
      { id: 'level_5', title: 'Growing Faith', description: 'Reach faith level 5', category: 'faith', icon: 'favorite', target: 5, progress: Math.min(userStats.level || 0, 5), completed: (userStats.level || 0) >= 5, points: 1000 },
      { id: 'level_10', title: 'Strong Faith', description: 'Reach faith level 10', category: 'faith', icon: 'favorite', target: 10, progress: Math.min(userStats.level || 0, 10), completed: (userStats.level || 0) >= 10, points: 1000 },

      // Special achievements
      { id: 'first_task', title: 'Getting Started', description: 'Complete your first task', category: 'special', icon: 'emoji-events', target: 1, progress: Math.min(userStats.completedTasks || 0, 1), completed: (userStats.completedTasks || 0) >= 1, points: 1000 },
      { id: 'first_prayer', title: 'First Prayer', description: 'Complete your first prayer', category: 'special', icon: 'emoji-events', target: 1, progress: Math.min(userStats.prayersCompleted || 0, 1), completed: (userStats.prayersCompleted || 0) >= 1, points: 1000 },
      { id: 'first_verse', title: 'First Reader', description: 'Read your first Bible verse', category: 'special', icon: 'emoji-events', target: 1, progress: Math.min(userStats.versesRead || 0, 1), completed: (userStats.versesRead || 0) >= 1, points: 1000 },

      // Special task achievements
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `task_special_${i + 1}`,
        title: `Early Bird ${i + 1}`,
        description: `Complete a task before 6 AM for ${i + 1} day${i > 0 ? 's' : ''}`,
        category: 'tasks',
        icon: 'wb-sunny',
        target: i + 1,
        progress: 0, // Would need to track this separately
        completed: false,
        points: 1000,
      })),

      // Point-based achievements
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `points_${i + 1}`,
        title: `Point Collector ${i + 1}`,
        description: `Earn ${(i + 1) * 100} total points`,
        category: 'tasks',
        icon: 'star',
        target: (i + 1) * 100,
        progress: Math.min(userStats.points, (i + 1) * 100),
        completed: userStats.points >= (i + 1) * 100,
        points: 1000,
      })),
    ];

    // Faith-based achievements (200 achievements)
    const faithAchievements = [
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `verses_read_${i + 1}`,
        title: `Scripture Scholar ${i + 1}`,
        description: `Read ${(i + 1) * 10} Bible verses`,
        category: 'reading',
        icon: 'book',
        target: (i + 1) * 10,
        progress: Math.min(userStats.versesRead, (i + 1) * 10),
        completed: userStats.versesRead >= (i + 1) * 10,
        points: 1000,
      })),

      ...Array.from({ length: 50 }, (_, i) => ({
        id: `prayers_${i + 1}`,
        title: `Prayer Warrior ${i + 1}`,
        description: `Complete ${(i + 1) * 5} prayers`,
        category: 'prayer',
        icon: 'healing',
        target: (i + 1) * 5,
        progress: Math.min(userStats.prayersCompleted, (i + 1) * 5),
        completed: userStats.prayersCompleted >= (i + 1) * 5,
        points: 1000,
      })),

      ...Array.from({ length: 30 }, (_, i) => ({
        id: `faith_level_${i + 1}`,
        title: `Faith Level ${i + 1}`,
        description: `Reach faith level ${i + 1}`,
        category: 'faith',
        icon: 'favorite',
        target: i + 1,
        progress: Math.min(userStats.level, i + 1),
        completed: userStats.level >= i + 1,
        points: 1000,
      })),

      ...Array.from({ length: 25 }, (_, i) => ({
        id: `morning_prayer_${i + 1}`,
        title: `Morning Devotion ${i + 1}`,
        description: `Pray for ${i + 1} consecutive morning${i > 0 ? 's' : ''}`,
        category: 'prayer',
        icon: 'brightness-5',
        target: i + 1,
        progress: 0, // Would need to track separately
        completed: false,
        points: 1000,
      })),

      ...Array.from({ length: 25 }, (_, i) => ({
        id: `evening_prayer_${i + 1}`,
        title: `Evening Reflection ${i + 1}`,
        description: `Evening prayer for ${i + 1} consecutive night${i > 0 ? 's' : ''}`,
        category: 'prayer',
        icon: 'brightness-3',
        target: i + 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),

      ...Array.from({ length: 20 }, (_, i) => ({
        id: `bible_books_${i + 1}`,
        title: `Book Explorer ${i + 1}`,
        description: `Read from ${i + 1} different Bible book${i > 0 ? 's' : ''}`,
        category: 'reading',
        icon: 'library-books',
        target: i + 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),
    ];

    // Time-based achievements (200 achievements)
    const timeAchievements = [
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `daily_login_${i + 1}`,
        title: `Daily Faithful ${i + 1}`,
        description: `Open app for ${i + 1} consecutive day${i > 0 ? 's' : ''}`,
        category: 'time',
        icon: 'schedule',
        target: i + 1,
        progress: Math.min(userStats.streak, i + 1),
        completed: userStats.streak >= i + 1,
        points: 1000,
      })),

      ...Array.from({ length: 30 }, (_, i) => ({
        id: `week_${i + 1}`,
        title: `Weekly Devotee ${i + 1}`,
        description: `Stay active for ${i + 1} week${i > 0 ? 's' : ''}`,
        category: 'time',
        icon: 'date-range',
        target: (i + 1) * 7,
        progress: Math.min(userStats.streak, (i + 1) * 7),
        completed: userStats.streak >= (i + 1) * 7,
        points: 1000,
      })),

      ...Array.from({ length: 20 }, (_, i) => ({
        id: `month_${i + 1}`,
        title: `Monthly Champion ${i + 1}`,
        description: `Stay active for ${i + 1} month${i > 0 ? 's' : ''}`,
        category: 'time',
        icon: 'calendar-today',
        target: (i + 1) * 30,
        progress: Math.min(userStats.streak, (i + 1) * 30),
        completed: userStats.streak >= (i + 1) * 30,
        points: 1000,
      })),

      ...Array.from({ length: 100 }, (_, i) => ({
        id: `session_${i + 1}`,
        title: `Session Master ${i + 1}`,
        description: `Complete ${i + 1} app session${i > 0 ? 's' : ''}`,
        category: 'time',
        icon: 'access-time',
        target: i + 1,
        progress: i + 1, // Assume all completed for demo
        completed: true,
        points: 1000,
      })),
    ];

    // Social achievements (100 achievements)
    const socialAchievements = [
      ...Array.from({ length: 25 }, (_, i) => ({
        id: `share_verse_${i + 1}`,
        title: `Verse Sharer ${i + 1}`,
        description: `Share ${i + 1} Bible verse${i > 0 ? 's' : ''}`,
        category: 'social',
        icon: 'share',
        target: i + 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),

      ...Array.from({ length: 25 }, (_, i) => ({
        id: `encourage_${i + 1}`,
        title: `Encourager ${i + 1}`,
        description: `Send ${i + 1} encouraging message${i > 0 ? 's' : ''}`,
        category: 'social',
        icon: 'favorite',
        target: i + 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),

      ...Array.from({ length: 25 }, (_, i) => ({
        id: `prayer_request_${i + 1}`,
        title: `Prayer Helper ${i + 1}`,
        description: `Pray for ${i + 1} prayer request${i > 0 ? 's' : ''}`,
        category: 'social',
        icon: 'people',
        target: i + 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),

      ...Array.from({ length: 25 }, (_, i) => ({
        id: `community_${i + 1}`,
        title: `Community Builder ${i + 1}`,
        description: `Join ${i + 1} community event${i > 0 ? 's' : ''}`,
        category: 'social',
        icon: 'group',
        target: i + 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),
    ];

    // Special achievements (200 achievements)
    const specialAchievements = [
      // Holiday achievements
      ...['Christmas', 'Easter', 'Thanksgiving', 'New Year', 'Pentecost'].map((holiday, index) => 
        Array.from({ length: 10 }, (_, i) => ({
          id: `${holiday.toLowerCase()}_${i + 1}`,
          title: `${holiday} Spirit ${i + 1}`,
          description: `Complete special ${holiday} task ${i + 1}`,
          category: 'special',
          icon: 'emoji-events',
          target: 1,
          progress: 0,
          completed: false,
          points: 1000,
        }))
      ).flat(),

      // Milestone achievements
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `milestone_${i + 1}`,
        title: `Milestone ${i + 1}`,
        description: `Reach special milestone ${i + 1}`,
        category: 'special',
        icon: 'flag',
        target: 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),

      // Perfect day achievements
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `perfect_day_${i + 1}`,
        title: `Perfect Day ${i + 1}`,
        description: `Complete all daily goals for ${i + 1} day${i > 0 ? 's' : ''}`,
        category: 'special',
        icon: 'diamond',
        target: i + 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),

      // Discovery achievements
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `discovery_${i + 1}`,
        title: `Discovery ${i + 1}`,
        description: `Discover hidden feature ${i + 1}`,
        category: 'special',
        icon: 'explore',
        target: 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),

      // Bonus achievements
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `bonus_${i + 1}`,
        title: `Bonus Hunter ${i + 1}`,
        description: `Unlock bonus achievement ${i + 1}`,
        category: 'special',
        icon: 'star-border',
        target: 1,
        progress: 0,
        completed: false,
        points: 1000,
      })),
    ];

    allAchievements.push(
      ...faithAchievements,
      ...timeAchievements,
      ...socialAchievements,
      ...specialAchievements
    );

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
          {item.progress}/{item.target}
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

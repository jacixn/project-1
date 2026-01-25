/**
 * Leaderboard Screen
 * 
 * Displays:
 * - Friends leaderboard (only friends)
 * - Global leaderboard (public users only)
 * - Sort by: Points, Streaks
 * - Current user highlighted
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getFriendsWithStats } from '../services/friendsService';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { hapticFeedback } from '../utils/haptics';

const { width } = Dimensions.get('window');

const LeaderboardScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'global'
  const [sortBy, setSortBy] = useState('points'); // 'points', 'streak'
  const [friendsLeaderboard, setFriendsLeaderboard] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Load data on mount and when tab/sort changes
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, activeTab, sortBy]);
  
  const loadData = async () => {
    if (!user) return;
    
    try {
      if (activeTab === 'friends') {
        await loadFriendsLeaderboard();
      } else {
        await loadGlobalLeaderboard();
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const loadFriendsLeaderboard = async () => {
    const friends = await getFriendsWithStats(user.uid);
    
    // Add current user to the list
    const currentUserEntry = {
      uid: user.uid,
      displayName: userProfile?.displayName || user.displayName || 'You',
      username: userProfile?.username || 'you',
      profilePicture: userProfile?.profilePicture || '',
      totalPoints: userProfile?.totalPoints || 0,
      currentStreak: userProfile?.currentStreak || 0,
      isCurrentUser: true,
    };
    
    const allUsers = [currentUserEntry, ...friends];
    
    // Sort by selected metric
    const sorted = allUsers.sort((a, b) => {
      if (sortBy === 'points') {
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      } else {
        return (b.currentStreak || 0) - (a.currentStreak || 0);
      }
    });
    
    // Add rank
    const ranked = sorted.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
    
    setFriendsLeaderboard(ranked);
  };
  
  const loadGlobalLeaderboard = async () => {
    try {
      const usersRef = collection(db, 'users');
      const sortField = sortBy === 'points' ? 'totalPoints' : 'currentStreak';
      
      const q = query(
        usersRef,
        where('isPublic', '==', true),
        orderBy(sortField, 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        users.push({
          uid: doc.id,
          ...doc.data(),
          isCurrentUser: doc.id === user.uid,
        });
      });
      
      // Add rank
      const ranked = users.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
      
      setGlobalLeaderboard(ranked);
    } catch (error) {
      console.error('Error loading global leaderboard:', error);
      setGlobalLeaderboard([]);
    }
  };
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user, activeTab, sortBy]);
  
  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return theme.textSecondary;
    }
  };
  
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return 'emoji-events';
      case 2:
        return 'emoji-events';
      case 3:
        return 'emoji-events';
      default:
        return null;
    }
  };
  
  const renderLeaderboardItem = ({ item, index }) => {
    const rankColor = getRankColor(item.rank);
    const isTopThree = item.rank <= 3;
    
    return (
      <View style={[
        styles.leaderboardItem,
        { 
          backgroundColor: item.isCurrentUser 
            ? (theme.primary + '20') 
            : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          borderColor: item.isCurrentUser ? theme.primary : 'transparent',
          borderWidth: item.isCurrentUser ? 2 : 0,
        }
      ]}>
        {/* Rank */}
        <View style={[
          styles.rankContainer,
          isTopThree && { backgroundColor: rankColor + '20' }
        ]}>
          {getRankIcon(item.rank) ? (
            <MaterialIcons name={getRankIcon(item.rank)} size={20} color={rankColor} />
          ) : (
            <Text style={[styles.rankText, { color: rankColor }]}>
              {item.rank}
            </Text>
          )}
        </View>
        
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.primary + '30' }]}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
          ) : (
            <MaterialIcons name="person" size={24} color={theme.primary} />
          )}
        </View>
        
        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[
            styles.displayName, 
            { color: theme.text },
            item.isCurrentUser && styles.currentUserName
          ]}>
            {item.displayName || 'User'}
            {item.isCurrentUser && ' (You)'}
          </Text>
          <Text style={[styles.username, { color: theme.textSecondary }]}>
            @{item.username || 'unknown'}
          </Text>
        </View>
        
        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: theme.text }]}>
            {sortBy === 'points' 
              ? (item.totalPoints || 0).toLocaleString()
              : (item.currentStreak || 0)}
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
            {sortBy === 'points' ? 'pts' : 'days'}
          </Text>
        </View>
      </View>
    );
  };
  
  // Top 3 podium for friends leaderboard
  const renderPodium = () => {
    const data = activeTab === 'friends' ? friendsLeaderboard : globalLeaderboard;
    if (data.length < 3) return null;
    
    const [first, second, third] = data.slice(0, 3);
    
    return (
      <View style={styles.podiumContainer}>
        {/* Second Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumAvatar, styles.podiumAvatarSmall, { backgroundColor: '#C0C0C0' + '30' }]}>
            {second.profilePicture ? (
              <Image source={{ uri: second.profilePicture }} style={styles.podiumAvatarImage} />
            ) : (
              <MaterialIcons name="person" size={28} color="#C0C0C0" />
            )}
          </View>
          <MaterialIcons name="emoji-events" size={24} color="#C0C0C0" style={styles.podiumMedal} />
          <Text style={[styles.podiumName, { color: theme.text }]} numberOfLines={1}>
            {second.displayName?.split(' ')[0] || 'User'}
          </Text>
          <Text style={[styles.podiumScore, { color: theme.textSecondary }]}>
            {sortBy === 'points' ? second.totalPoints || 0 : second.currentStreak || 0}
          </Text>
          <View style={[styles.podiumBar, styles.podiumBarSecond, { backgroundColor: '#C0C0C0' + '40' }]} />
        </View>
        
        {/* First Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumAvatar, { backgroundColor: '#FFD700' + '30' }]}>
            {first.profilePicture ? (
              <Image source={{ uri: first.profilePicture }} style={styles.podiumAvatarImage} />
            ) : (
              <MaterialIcons name="person" size={36} color="#FFD700" />
            )}
          </View>
          <MaterialIcons name="emoji-events" size={32} color="#FFD700" style={styles.podiumMedal} />
          <Text style={[styles.podiumName, styles.podiumNameFirst, { color: theme.text }]} numberOfLines={1}>
            {first.displayName?.split(' ')[0] || 'User'}
          </Text>
          <Text style={[styles.podiumScore, { color: theme.textSecondary }]}>
            {sortBy === 'points' ? first.totalPoints || 0 : first.currentStreak || 0}
          </Text>
          <View style={[styles.podiumBar, styles.podiumBarFirst, { backgroundColor: '#FFD700' + '40' }]} />
        </View>
        
        {/* Third Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumAvatar, styles.podiumAvatarSmall, { backgroundColor: '#CD7F32' + '30' }]}>
            {third.profilePicture ? (
              <Image source={{ uri: third.profilePicture }} style={styles.podiumAvatarImage} />
            ) : (
              <MaterialIcons name="person" size={28} color="#CD7F32" />
            )}
          </View>
          <MaterialIcons name="emoji-events" size={24} color="#CD7F32" style={styles.podiumMedal} />
          <Text style={[styles.podiumName, { color: theme.text }]} numberOfLines={1}>
            {third.displayName?.split(' ')[0] || 'User'}
          </Text>
          <Text style={[styles.podiumScore, { color: theme.textSecondary }]}>
            {sortBy === 'points' ? third.totalPoints || 0 : third.currentStreak || 0}
          </Text>
          <View style={[styles.podiumBar, styles.podiumBarThird, { backgroundColor: '#CD7F32' + '40' }]} />
        </View>
      </View>
    );
  };
  
  // Not logged in state
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyState}>
          <MaterialIcons name="leaderboard" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to compete</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Create an account to see leaderboards and compete with friends
          </Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const currentData = activeTab === 'friends' ? friendsLeaderboard : globalLeaderboard;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: theme.border || theme.separator }]}>
        {[
          { key: 'friends', label: 'Friends', icon: 'people' },
          { key: 'global', label: 'Global', icon: 'public' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && [styles.tabActive, { borderBottomColor: theme.primary }]
            ]}
            onPress={() => {
              hapticFeedback.light();
              setActiveTab(tab.key);
              setLoading(true);
            }}
          >
            <MaterialIcons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.key ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? theme.primary : theme.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: theme.textSecondary }]}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {[
            { key: 'points', label: 'Points', icon: 'star' },
            { key: 'streak', label: 'Streak', icon: 'local-fire-department' },
          ].map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                { 
                  backgroundColor: sortBy === option.key 
                    ? theme.primary 
                    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }
              ]}
              onPress={() => {
                hapticFeedback.light();
                setSortBy(option.key);
                setLoading(true);
              }}
            >
              <MaterialIcons 
                name={option.icon} 
                size={16} 
                color={sortBy === option.key ? '#FFFFFF' : theme.textSecondary} 
              />
              <Text style={[
                styles.sortButtonText,
                { color: sortBy === option.key ? '#FFFFFF' : theme.textSecondary }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={currentData.slice(3)} // Skip first 3 (shown in podium)
          keyExtractor={(item) => item.uid}
          renderItem={renderLeaderboardItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={currentData.length >= 3 ? renderPodium : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="leaderboard" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTab === 'friends' ? 'Add friends to compete' : 'No public users yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {activeTab === 'friends' 
                  ? 'Search for friends to see them on the leaderboard'
                  : 'Be the first to appear on the global leaderboard'}
              </Text>
            </View>
          }
        />
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortLabel: {
    fontSize: 14,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  podiumAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  podiumAvatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  podiumAvatarImage: {
    width: '100%',
    height: '100%',
  },
  podiumMedal: {
    marginTop: -8,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 80,
  },
  podiumNameFirst: {
    fontSize: 16,
  },
  podiumScore: {
    fontSize: 13,
    marginTop: 2,
  },
  podiumBar: {
    width: '80%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginTop: 8,
  },
  podiumBarFirst: {
    height: 60,
  },
  podiumBarSecond: {
    height: 45,
  },
  podiumBarThird: {
    height: 30,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
  },
  currentUserName: {
    fontWeight: '700',
  },
  username: {
    fontSize: 13,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  signInButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LeaderboardScreen;

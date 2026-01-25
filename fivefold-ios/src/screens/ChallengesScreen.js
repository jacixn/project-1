/**
 * Challenges Screen
 * 
 * Clean quiz challenge interface.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToChallenges,
  acceptChallenge,
  declineChallenge,
  getChallengeStats,
} from '../services/challengeService';
import * as Haptics from 'expo-haptics';

const ChallengesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const [challenges, setChallenges] = useState({ pending: [], active: [], completed: [] });
  const [stats, setStats] = useState({ wins: 0, losses: 0, winRate: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToChallenges(user.uid, (data) => {
      setChallenges(data);
      setLoading(false);
    });

    loadStats();
    return () => unsubscribe();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const statsData = await getChallengeStats(user.uid);
    setStats(statsData);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const switchTab = (tab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const handleAcceptChallenge = async (challengeId) => {
    setActionLoading(prev => ({ ...prev, [challengeId]: true }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await acceptChallenge(challengeId);
      if (success) {
        const { getChallenge } = await import('../services/challengeService');
        const fullChallenge = await getChallenge(challengeId);
        navigation.navigate('ChallengeQuiz', { 
          challengeId, 
          challenge: fullChallenge,
          isChallenger: false,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept challenge.');
    }
    setActionLoading(prev => ({ ...prev, [challengeId]: false }));
  };

  const handleDecline = async (challengeId) => {
    Alert.alert('Decline Challenge?', 'Are you sure you want to decline? This will count as a loss.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        setActionLoading(prev => ({ ...prev, [challengeId]: true }));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
          const success = await declineChallenge(challengeId);
          if (success) {
            console.log('Challenge declined successfully');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to decline challenge.');
        } finally {
          setActionLoading(prev => ({ ...prev, [challengeId]: false }));
        }
      }},
    ]);
  };

  const handlePlay = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { getChallenge } = await import('../services/challengeService');
    const fullChallenge = await getChallenge(item.id);
    navigation.navigate('ChallengeQuiz', { 
      challengeId: item.id, 
      challenge: fullChallenge,
      isChallenger: item.isChallenger,
    });
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const getOpponent = (c) => c.isChallenger
    ? { name: c.challengedName, pic: c.challengedPicture }
    : { name: c.challengerName, pic: c.challengerPicture };

  const getResult = (c) => {
    // Declined = loss for the person who declined (challenged user)
    if (c.status === 'declined') {
      // The challenged person declined, so they lost
      return c.isChallenger ? 'won' : 'lost';
    }
    // Expired without completion = loss for the person who didn't complete
    if (c.status === 'expired') {
      if (c.isChallenger && !c.challengerCompleted) return 'lost';
      if (!c.isChallenger && !c.challengedCompleted) return 'lost';
      return 'won';
    }
    if (c.status !== 'completed') return null;
    const my = c.isChallenger ? c.challengerScore : c.challengedScore;
    const their = c.isChallenger ? c.challengedScore : c.challengerScore;
    return my > their ? 'won' : my < their ? 'lost' : 'draw';
  };

  const currentData = activeTab === 'pending' ? challenges.pending : activeTab === 'active' ? challenges.active : challenges.completed;

  const renderCard = ({ item }) => {
    const opp = getOpponent(item);
    const isPending = item.status === 'pending' && !item.isChallenger;
    const isDeclined = item.status === 'declined';
    const isExpired = item.status === 'expired';
    const result = getResult(item);
    const needsPlay = !isDeclined && !isExpired && ((item.isChallenger && !item.challengerCompleted) || (!item.isChallenger && !item.challengedCompleted));
    const isLoading = actionLoading[item.id];

    return (
      <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF' }]}>
        <View style={styles.cardTop}>
          <View style={[styles.categoryPill, { backgroundColor: '#F59E0B20' }]}>
            <Text style={[styles.categoryText, { color: '#F59E0B' }]}>
              {item.categoryName || 'Quiz'} · {item.questionCount || '?'}Q
            </Text>
          </View>
          <Text style={[styles.timeText, { color: theme.textTertiary }]}>{getTimeAgo(item.createdAt)}</Text>
        </View>

        <View style={styles.cardMain}>
          <View style={styles.oppSection}>
            {opp.pic ? (
              <Image source={{ uri: opp.pic }} style={styles.oppAvatar} />
            ) : (
              <View style={[styles.oppAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.oppInitial, { color: theme.primary }]}>{(opp.name || 'F').charAt(0)}</Text>
              </View>
            )}
            <View>
              <Text style={[styles.oppLabel, { color: theme.textSecondary }]}>
                {isPending ? 'From' : item.isChallenger ? 'You vs' : 'vs'}
              </Text>
              <Text style={[styles.oppName, { color: theme.text }]}>{opp.name || 'Friend'}</Text>
            </View>
          </View>

          {item.status === 'completed' ? (
            <View style={styles.scoresRow}>
              <Text style={[styles.score, { color: result === 'won' ? '#10B981' : result === 'lost' ? '#EF4444' : theme.text }]}>
                {item.isChallenger ? item.challengerScore : item.challengedScore}
              </Text>
              <Text style={[styles.scoreDash, { color: theme.textTertiary }]}>-</Text>
              <Text style={[styles.score, { color: theme.text }]}>
                {item.isChallenger ? item.challengedScore : item.challengerScore}
              </Text>
              <View style={[styles.resultBadge, { backgroundColor: result === 'won' ? '#10B981' : result === 'lost' ? '#EF4444' : '#6B7280' }]}>
                <Text style={styles.resultText}>{result === 'won' ? 'W' : result === 'lost' ? 'L' : 'D'}</Text>
              </View>
            </View>
          ) : isDeclined ? (
            <View style={[styles.resultBadge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.resultText}>L</Text>
            </View>
          ) : isExpired ? (
            <View style={[styles.expiredBadge, { backgroundColor: theme.textTertiary + '20' }]}>
              <Text style={[styles.expiredText, { color: theme.textTertiary }]}>Expired</Text>
            </View>
          ) : isPending ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.declineBtn, { borderColor: theme.textTertiary }]} onPress={() => handleDecline(item.id)} disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" color={theme.textTertiary} /> : <Ionicons name="close" size={18} color={theme.textTertiary} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAcceptChallenge(item.id)} disabled={isLoading}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.acceptBtn}>
                  {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptText}>Play</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : needsPlay ? (
            <TouchableOpacity onPress={() => handlePlay(item)}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.playBtn}>
                <Ionicons name="play" size={16} color="#FFF" />
                <Text style={styles.playText}>Play</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.waitingBadge, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.waitingText, { color: theme.primary }]}>Waiting...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.signInContainer, { paddingTop: insets.top + 60 }]}>
          <View style={[styles.signInIcon, { backgroundColor: '#F59E0B20' }]}>
            <FontAwesome5 name="trophy" size={40} color="#F59E0B" />
          </View>
          <Text style={[styles.signInTitle, { color: theme.text }]}>Challenges</Text>
          <Text style={[styles.signInSubtitle, { color: theme.textSecondary }]}>Sign in to compete</Text>
          <TouchableOpacity style={[styles.signInButton, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Challenges</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#10B98115' }]}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{stats.wins}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Wins</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#EF444415' }]}>
            <Text style={[styles.statNum, { color: '#EF4444' }]}>{stats.losses}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Losses</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#F59E0B15' }]}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{stats.winRate}%</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rate</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {['pending', 'active', 'completed'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && [styles.tabBtnActive, { backgroundColor: '#F59E0B' }]]}
              onPress={() => switchTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? '#FFF' : theme.textSecondary }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {tab === 'pending' && challenges.pending.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.3)' : '#F59E0B' }]}>
                  <Text style={styles.tabBadgeText}>{challenges.pending.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: '#F59E0B15' }]}>
                <FontAwesome5 name="trophy" size={32} color="#F59E0B" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTab === 'pending' ? 'No Pending' : activeTab === 'active' ? 'No Active' : 'No Completed'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Challenge friends from their profile
              </Text>
            </View>
          )}
          contentContainerStyle={[styles.listContent, currentData.length === 0 && styles.emptyListContent]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F59E0B" />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  // Tabs
  tabsRow: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 4 },
  tabBtnActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  // Content
  listContent: { padding: 20, paddingTop: 8, gap: 10 },
  emptyListContent: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Card
  card: { borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  timeText: { fontSize: 12 },
  cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  oppSection: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  oppAvatar: { width: 42, height: 42, borderRadius: 21 },
  oppAvatarPlaceholder: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  oppInitial: { fontSize: 16, fontWeight: '700' },
  oppLabel: { fontSize: 11, marginBottom: 1 },
  oppName: { fontSize: 15, fontWeight: '600' },
  // Scores
  scoresRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  score: { fontSize: 20, fontWeight: '800' },
  scoreDash: { fontSize: 14 },
  resultBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  resultText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  // Actions
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  declineBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18 },
  acceptText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  playBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, gap: 4 },
  playText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  waitingBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  waitingText: { fontSize: 12, fontWeight: '600' },
  expiredBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  expiredText: { fontSize: 12, fontWeight: '600' },
  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  // Sign in
  signInContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  signInIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  signInTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  signInSubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 30 },
  signInButton: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 },
  signInButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default ChallengesScreen;

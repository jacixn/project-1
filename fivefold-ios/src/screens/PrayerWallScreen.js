/**
 * Prayer Wall Screen
 * 
 * Beautiful prayer request feed with elegant design.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  getPrayerFeed, 
  getMyPrayers,
  markPraying,
  getPrayerPartner,
} from '../services/prayerSocialService';
import PrayerCard from '../components/PrayerCard';
import CreatePrayerModal from '../components/CreatePrayerModal';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const PrayerWallScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();

  const [prayers, setPrayers] = useState([]);
  const [myPrayers, setMyPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    
    Animated.spring(fabAnim, {
      toValue: 1,
      delay: 400,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [feedData, myData] = await Promise.all([
        getPrayerFeed(user.uid),
        getMyPrayers(user.uid),
      ]);
      setPrayers(feedData);
      setMyPrayers(myData);
    } catch (error) {
      console.error('Error loading prayer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePrayerCreated = (newPrayer) => {
    setPrayers(prev => [newPrayer, ...prev]);
    setMyPrayers(prev => [newPrayer, ...prev]);
    setShowCreateModal(false);
  };

  const handleTogglePraying = async (prayerId) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const success = await markPraying(prayerId, user.uid, userProfile?.displayName);
    if (success) {
      const updatePrayers = (list) => list.map(p => {
        if (p.id === prayerId) {
          const isPraying = p.prayingUsers?.includes(user.uid);
          return {
            ...p,
            prayingCount: isPraying ? (p.prayingCount || 1) - 1 : (p.prayingCount || 0) + 1,
            prayingUsers: isPraying 
              ? p.prayingUsers.filter(id => id !== user.uid)
              : [...(p.prayingUsers || []), user.uid],
          };
        }
        return p;
      });
      
      setPrayers(updatePrayers);
      setMyPrayers(updatePrayers);
    }
  };

  const handleDeletePrayer = (prayerId) => {
    setPrayers(prev => prev.filter(p => p.id !== prayerId));
    setMyPrayers(prev => prev.filter(p => p.id !== prayerId));
  };

  const switchTab = (tab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const currentData = activeTab === 'feed' ? prayers : myPrayers;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.signInContainer, { paddingTop: insets.top + 60 }]}>
          <View style={[styles.signInIcon, { backgroundColor: theme.primary + '15' }]}>
            <FontAwesome5 name="praying-hands" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.signInTitle, { color: theme.text }]}>Prayer Wall</Text>
          <Text style={[styles.signInSubtitle, { color: theme.textSecondary }]}>
            Sign in to share prayer requests
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Clean Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>Prayer Wall</Text>
          
          <View style={{ width: 40 }} />
        </View>

        {/* Simple Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'feed' && [styles.tabBtnActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => switchTab('feed')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'feed' ? '#FFF' : theme.textSecondary },
            ]}>
              Friends
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'mine' && [styles.tabBtnActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => switchTab('mine')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'mine' ? '#FFF' : theme.textSecondary },
            ]}>
              My Prayers
            </Text>
            {myPrayers.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === 'mine' ? 'rgba(255,255,255,0.3)' : theme.primary }]}>
                <Text style={styles.tabBadgeText}>{myPrayers.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PrayerCard
              prayer={item}
              currentUserId={user.uid}
              onTogglePraying={handleTogglePraying}
              onDelete={handleDeletePrayer}
              index={index}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
                <FontAwesome5 name="praying-hands" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTab === 'feed' ? 'No Prayers Yet' : 'Share Your First Prayer'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {activeTab === 'feed' 
                  ? 'Be the first to share a prayer request'
                  : 'Let your friends support you in prayer'}
              </Text>
            </View>
          )}
          contentContainerStyle={[
            styles.listContent,
            currentData.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: insets.bottom + 24,
            transform: [{ scale: fabAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateModal(true);
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[theme.primary, theme.primary + 'DD']}
            style={styles.fab}
          >
            <MaterialIcons name="add" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <CreatePrayerModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPrayerCreated={handlePrayerCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 6,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Content
  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Sign in
  signInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  signInIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signInTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  signInSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
  },
  signInButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default PrayerWallScreen;

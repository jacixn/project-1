/**
 * Messages Screen
 * 
 * Clean messaging interface with conversations.
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToConversations, cleanupAllOldMessages } from '../services/messageService';
import { getFriendsWithStats } from '../services/friendsService';
import ReportBlockModal from '../components/ReportBlockModal';
import CustomLoadingIndicator from '../components/CustomLoadingIndicator';
import * as Haptics from 'expo-haptics';

const MessagesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
    });

    loadFriends();
    
    // Clean up old messages that were read more than 24 hours ago
    cleanupAllOldMessages(user.uid).catch(err => {
      console.warn('Error cleaning up old messages:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    try {
      const friendsData = await getFriendsWithStats(user.uid);
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation) => {
    Haptics.selectionAsync();
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      otherUser: conversation.otherUser,
      otherUserId: conversation.otherUserId,
    });
  };

  const handleNewMessage = (friend) => {
    Haptics.selectionAsync();
    navigation.navigate('Chat', {
      otherUser: friend,
      otherUserId: friend.uid,
    });
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const renderFriendChip = ({ item }) => (
    <TouchableOpacity
      style={[styles.friendChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFF' }]}
      onPress={() => handleNewMessage(item)}
    >
      {item.profilePicture ? (
        <Image source={{ uri: item.profilePicture }} style={styles.friendChipAvatar} />
      ) : (
        <View style={[styles.friendChipAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.friendChipInitial, { color: theme.primary }]}>
            {(item.displayName || 'F').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={[styles.friendChipName, { color: theme.text }]} numberOfLines={1}>
        {item.displayName?.split(' ')[0] || 'Friend'}
      </Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }) => {
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF' }]}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setReportTarget(item);
        }}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          {item.otherUser?.profilePicture ? (
            <Image source={{ uri: item.otherUser.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                {(item.otherUser?.displayName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {hasUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationTop}>
            <Text style={[styles.conversationName, { color: theme.text }, hasUnread && styles.nameUnread]} numberOfLines={1}>
              {item.otherUser?.displayName || 'User'}
            </Text>
            <Text style={[styles.timeText, { color: theme.textTertiary }]}>
              {getTimeAgo(item.lastMessageAt)}
            </Text>
          </View>
          <Text 
            style={[styles.lastMessage, { color: hasUnread ? theme.text : theme.textSecondary }, hasUnread && styles.messageUnread]} 
            numberOfLines={1}
          >
            {item.lastMessageBy === user?.uid ? 'You: ' : ''}
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.signInContainer, { paddingTop: insets.top + 60 }]}>
          <View style={[styles.signInIcon, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="chatbubbles" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.signInTitle, { color: theme.text }]}>Messages</Text>
          <Text style={[styles.signInSubtitle, { color: theme.textSecondary }]}>
            Sign in to message friends
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
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
        
        <View style={{ width: 40 }} />
      </View>

      {/* Friends Quick Access */}
      {friends.length > 0 && (
        <View style={styles.friendsSection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            New Chat
          </Text>
          <FlatList
            horizontal
            data={friends}
            keyExtractor={(item) => item.uid}
            renderItem={renderFriendChip}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsList}
          />
        </View>
      )}

      {/* Conversations */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <CustomLoadingIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="chatbubbles" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Messages Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Start a conversation with a friend
              </Text>
            </View>
          )}
          contentContainerStyle={[
            styles.listContent,
            conversations.length === 0 && styles.emptyListContent,
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

      <ReportBlockModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        contentType="message"
        contentId={reportTarget?.id}
        reportedUserId={reportTarget?.otherUserId}
        currentUserId={user?.uid}
        displayName={reportTarget?.otherUser?.displayName || 'this user'}
        onBlock={() => {
          setConversations(prev => prev.filter(c => c.otherUserId !== reportTarget?.otherUserId));
          setReportTarget(null);
        }}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  // Friends
  friendsSection: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  friendsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  friendChip: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  friendChipAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 6,
  },
  friendChipAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  friendChipInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  friendChipName: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Conversations
  listContent: {
    padding: 20,
    gap: 10,
  },
  emptyListContent: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 14,
  },
  conversationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  nameUnread: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
  },
  messageUnread: {
    fontWeight: '600',
  },
  // Loading
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
});

export default MessagesScreen;

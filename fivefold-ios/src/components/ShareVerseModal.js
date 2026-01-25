/**
 * Share Verse Modal
 * 
 * Beautiful modal to share a Bible verse with friends.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getFriendsWithStats } from '../services/friendsService';
import { 
  createOrGetConversation, 
  sendVerseMessage,
} from '../services/messageService';
import * as Haptics from 'expo-haptics';

const ShareVerseModal = ({ 
  visible, 
  onClose, 
  verseText, 
  verseReference,
  onShared,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();

  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadFriends();
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
      setSelectedFriends([]);
      setNote('');
    }
  }, [visible]);

  const loadFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const friendsData = await getFriendsWithStats(user.uid);
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId) => {
    Haptics.selectionAsync();
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      }
      return [...prev, friendId];
    });
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Select Friends', 'Please select at least one friend to share with.');
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Send verse to each selected friend
      for (const friendId of selectedFriends) {
        const friend = friends.find(f => f.uid === friendId);
        
        const conversation = await createOrGetConversation(
          user.uid,
          userProfile,
          friendId,
          friend
        );

        await sendVerseMessage(
          conversation.id,
          user.uid,
          userProfile?.displayName || 'User',
          verseText,
          verseReference,
          note.trim() || null,
          friendId
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (onShared) {
        onShared(selectedFriends.length);
      }
      
      onClose();
    } catch (error) {
      console.error('Error sharing verse:', error);
      Alert.alert('Error', 'Failed to share verse. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderFriend = ({ item }) => {
    const isSelected = selectedFriends.includes(item.uid);

    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
          isSelected && { backgroundColor: theme.primary + '20', borderColor: theme.primary, borderWidth: 2 },
        ]}
        onPress={() => toggleFriend(item.uid)}
        activeOpacity={0.7}
      >
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.friendAvatar} />
        ) : (
          <LinearGradient
            colors={[theme.primary + '60', theme.primary + '30']}
            style={styles.friendAvatarPlaceholder}
          >
            <MaterialIcons name="person" size={20} color={theme.primary} />
          </LinearGradient>
        )}
        
        <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
          {item.displayName?.split(' ')[0] || 'Friend'}
        </Text>
        
        {item.countryFlag && (
          <Text style={styles.friendFlag}>{item.countryFlag}</Text>
        )}
        
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="check" size={14} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
          <TouchableOpacity onPress={onClose} disabled={sending}>
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <FontAwesome5 name="share-alt" size={16} color={theme.primary} />
            <Text style={[styles.headerTitleText, { color: theme.text }]}>Share Verse</Text>
          </View>
          
          <TouchableOpacity
            onPress={handleShare}
            disabled={sending || selectedFriends.length === 0}
          >
            <LinearGradient
              colors={selectedFriends.length > 0 ? [theme.primary, theme.primary + 'CC'] : ['#888', '#666']}
              style={styles.sendButton}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Verse Preview */}
        <Animated.View
          style={[
            styles.versePreview,
            { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
              opacity: slideAnim,
            },
          ]}
        >
          <View style={styles.verseHeader}>
            <FontAwesome5 name="bible" size={14} color={theme.primary} />
            <Text style={[styles.verseReference, { color: theme.primary }]}>
              {verseReference || 'Bible Verse'}
            </Text>
          </View>
          <Text style={[styles.verseText, { color: theme.text }]} numberOfLines={4}>
            {verseText || 'No verse selected'}
          </Text>
        </Animated.View>

        {/* Personal Note */}
        <View style={styles.noteSection}>
          <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>
            Add a personal note (optional)
          </Text>
          <TextInput
            style={[
              styles.noteInput,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                color: theme.text,
              },
            ]}
            placeholder="This verse reminded me of you..."
            placeholderTextColor={theme.textTertiary}
            value={note}
            onChangeText={setNote}
            maxLength={200}
            multiline
          />
        </View>

        {/* Friends List */}
        <View style={styles.friendsSection}>
          <Text style={[styles.friendsLabel, { color: theme.textSecondary }]}>
            Select friends to share with
            {selectedFriends.length > 0 && (
              <Text style={{ color: theme.primary }}> ({selectedFriends.length} selected)</Text>
            )}
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Add friends to share verses with them
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.uid}
              renderItem={renderFriend}
              numColumns={3}
              columnWrapperStyle={styles.friendsRow}
              contentContainerStyle={styles.friendsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Verse preview
  versePreview: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  // Note section
  noteSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  noteInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  // Friends section
  friendsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  friendsLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  friendsList: {
    paddingBottom: 20,
  },
  friendsRow: {
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  friendItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    position: 'relative',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  friendAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  friendName: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  friendFlag: {
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Loading/Empty
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ShareVerseModal;

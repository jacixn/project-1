/**
 * Chat Screen
 * 
 * Individual chat with a friend featuring text, verses, and encouragements.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  createOrGetConversation,
  subscribeToMessages,
  sendTextMessage,
  sendEncouragementMessage,
  sendImageMessage,
  markAsRead,
  getConversationId,
  cleanupOldMessages,
} from '../services/messageService';
import EncouragementPicker from '../components/EncouragementPicker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../services/storageService';
import profanityFilter from '../services/profanityFilterService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.6;

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();

  const { otherUser, otherUserId, conversationId: passedConversationId } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(passedConversationId);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEncouragements, setShowEncouragements] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to messages
    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      
      // Mark as read
      if (user?.uid) {
        markAsRead(conversationId, user.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  const initializeChat = async () => {
    if (!user || !otherUserId) {
      setLoading(false);
      return;
    }

    try {
      let convId = passedConversationId;
      
      if (passedConversationId) {
        setConversationId(passedConversationId);
      } else {
        // Create or get conversation
        const conversation = await createOrGetConversation(
          user.uid,
          userProfile,
          otherUserId,
          otherUser
        );
        convId = conversation.id;
        setConversationId(conversation.id);
      }
      
      // Clean up old messages that were read more than 24 hours ago
      if (convId) {
        cleanupOldMessages(convId).catch(err => {
          console.warn('Error cleaning up old messages:', err);
        });
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !conversationId) return;

    const text = inputText.trim();

    // Check for profanity before sending
    if (profanityFilter.containsProfanity(text)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Message Blocked',
        'Inappropriate language was detected in your message. Please keep conversations respectful and kind. Your message was not sent.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setInputText('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await sendTextMessage(
        conversationId,
        user.uid,
        userProfile?.displayName || 'User',
        text,
        otherUserId
      );
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(text); // Restore text on error
    } finally {
      setSending(false);
    }
  };

  const handleSendEncouragement = async (type) => {
    if (sending || !conversationId) return;

    setSending(true);
    setShowEncouragements(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await sendEncouragementMessage(
        conversationId,
        user.uid,
        userProfile?.displayName || 'User',
        type,
        otherUserId
      );
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending encouragement:', error);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (uploadingImage || !conversationId) return;

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to send images.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploadingImage(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Upload to Firebase Storage
      const imagePath = `chat-images/${conversationId}/${user.uid}_${Date.now()}.jpg`;
      const imageUrl = await uploadImage(imagePath, asset.uri);

      // Send image message
      await sendImageMessage(
        conversationId,
        user.uid,
        userProfile?.displayName || 'User',
        imageUrl,
        asset.width,
        asset.height,
        otherUserId
      );

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error sending image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const getTimeString = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const shouldShowTimestamp = (index) => {
    if (index === 0) return true;
    const currentMsg = messages[index];
    const prevMsg = messages[index - 1];
    
    const currentTime = currentMsg.createdAt?.toDate?.() || new Date(currentMsg.createdAt);
    const prevTime = prevMsg.createdAt?.toDate?.() || new Date(prevMsg.createdAt);
    
    // Show timestamp if more than 5 minutes apart
    return (currentTime - prevTime) > 5 * 60 * 1000;
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderId === user?.uid;
    const showTimestamp = shouldShowTimestamp(index);
    const isEncouragement = item.type === 'encouragement';
    const isVerse = item.type === 'verse';
    const isImage = item.type === 'image';

    // Calculate image dimensions
    const getImageDimensions = () => {
      if (!item.metadata?.width || !item.metadata?.height) {
        return { width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_WIDTH * 0.75 };
      }
      const aspectRatio = item.metadata.width / item.metadata.height;
      const width = Math.min(MAX_IMAGE_WIDTH, item.metadata.width);
      const height = width / aspectRatio;
      return { width, height: Math.min(height, 300) };
    };

    return (
      <View>
        {showTimestamp && (
          <Text style={[styles.timestamp, { color: theme.textTertiary }]}>
            {getTimeString(item.createdAt)}
          </Text>
        )}
        
        <View style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}>
          {!isMe && (
            otherUser?.profilePicture ? (
              <Image source={{ uri: otherUser.profilePicture }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: theme.primary + '30' }]}>
                <MaterialIcons name="person" size={14} color={theme.primary} />
              </View>
            )
          )}
          
          <View style={[
            styles.messageBubble,
            isMe && [styles.messageBubbleMe, { backgroundColor: theme.primary }],
            !isMe && [styles.messageBubbleOther, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }],
            isEncouragement && styles.encouragementBubble,
            isImage && styles.imageBubble,
          ]}>
            {isEncouragement && (
              <View style={styles.encouragementIcon}>
                <FontAwesome5 
                  name={
                    item.metadata?.encouragementType === 'praying' ? 'praying-hands' :
                    item.metadata?.encouragementType === 'love' ? 'heart' :
                    item.metadata?.encouragementType === 'bless' ? 'hand-holding-heart' :
                    'fist-raised'
                  } 
                  size={20} 
                  color={isMe ? '#FFF' : theme.primary} 
                />
              </View>
            )}
            
            {isVerse && (
              <View style={[styles.verseHeader, isMe && styles.verseHeaderMe]}>
                <FontAwesome5 name="bible" size={12} color={isMe ? 'rgba(255,255,255,0.8)' : theme.primary} />
                <Text style={[styles.verseReference, { color: isMe ? 'rgba(255,255,255,0.8)' : theme.primary }]}>
                  {item.metadata?.reference || 'Bible Verse'}
                </Text>
              </View>
            )}
            
            {/* Image message */}
            {isImage && item.metadata?.imageUrl && (
              <Image 
                source={{ uri: item.metadata.imageUrl }} 
                style={[styles.messageImage, getImageDimensions()]}
                resizeMode="cover"
              />
            )}
            
            {/* Text content (hide for image messages) */}
            {!isImage && (
              <Text style={[
                styles.messageText,
                { color: isMe ? '#FFF' : theme.text },
                isEncouragement && styles.encouragementText,
              ]}>
                {item.content}
              </Text>
            )}
            
            {isVerse && item.metadata?.note && (
              <Text style={[styles.verseNote, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
                "{item.metadata.note}"
              </Text>
            )}
            
            {/* Read receipt indicator for sent messages */}
            {isMe && (
              <View style={styles.readReceiptContainer}>
                <Text style={styles.messageTime}>
                  {item.createdAt?.toDate ? 
                    item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                    new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                </Text>
                {item.read ? (
                  // Double checkmark for read messages (blue)
                  <View style={styles.readIndicator}>
                    <Ionicons name="checkmark-done" size={14} color="#34B7F1" />
                  </View>
                ) : (
                  // Single checkmark for sent/delivered (gray)
                  <View style={styles.readIndicator}>
                    <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.6)" />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyChatContainer}>
      <LinearGradient
        colors={[theme.primary + '30', theme.primary + '10']}
        style={styles.emptyChatIcon}
      >
        <Ionicons name="chatbubble-ellipses" size={32} color={theme.primary} />
      </LinearGradient>
      <Text style={[styles.emptyChatTitle, { color: theme.text }]}>
        Start the conversation!
      </Text>
      <Text style={[styles.emptyChatSubtitle, { color: theme.textSecondary }]}>
        Send a message or encouragement to {otherUser?.displayName?.split(' ')[0] || 'your friend'}
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Please sign in to chat</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: insets.top + 10,
          backgroundColor: theme.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        }
      ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        {otherUser?.profilePicture ? (
          <Image source={{ uri: otherUser.profilePicture }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.headerAvatarText, { color: theme.primary }]}>
              {(otherUser?.displayName || 'F').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
              {otherUser?.displayName || 'Friend'}
            </Text>
            {otherUser?.countryFlag && (
              <Text style={styles.headerFlag}>{otherUser.countryFlag}</Text>
            )}
          </View>
          {otherUser?.username && (
            <Text style={[styles.headerUsername, { color: theme.textSecondary }]}>
              @{otherUser.username}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            ListEmptyComponent={renderEmptyChat}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.emptyMessagesList,
            ]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        {/* Encouragement Picker */}
        <EncouragementPicker
          visible={showEncouragements}
          onClose={() => setShowEncouragements(false)}
          onSelect={handleSendEncouragement}
        />

        {/* Input Area */}
        <View style={[
          styles.inputContainer,
          { 
            paddingBottom: insets.bottom || 16,
            backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.98)',
          }
        ]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => setShowEncouragements(!showEncouragements)}
          >
            <FontAwesome5 name="heart" size={18} color={theme.primary} />
          </TouchableOpacity>
          
          <View style={[
            styles.inputWrapper,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          ]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.text }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() && { backgroundColor: theme.primary },
              !inputText.trim() && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={inputText.trim() ? '#FFF' : theme.textTertiary} />
            ) : (
              <Ionicons 
                name="send" 
                size={18} 
                color={inputText.trim() ? '#FFF' : theme.textTertiary} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 4,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerFlag: {
    fontSize: 13,
  },
  headerUsername: {
    fontSize: 13,
    marginTop: 1,
  },
  // Chat
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyMessagesList: {
    flex: 1,
  },
  // Empty chat
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyChatIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyChatSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Messages
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  encouragementBubble: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  encouragementIcon: {
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 15,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  verseHeaderMe: {},
  verseReference: {
    fontSize: 12,
    fontWeight: '600',
  },
  verseNote: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Read receipts
  readReceiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  readIndicator: {
    marginLeft: 2,
  },
  // Image messages
  imageBubble: {
    padding: 4,
    overflow: 'hidden',
  },
  messageImage: {
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default ChatScreen;

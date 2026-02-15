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
  Easing,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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
import userStorage from '../utils/userStorage';
import { setActiveChatUser, clearActiveChatUser } from '../services/notificationService';
import { BlurView } from 'expo-blur';
import ReportBlockModal from '../components/ReportBlockModal';
import { isRestricted } from '../services/restrictionService';
import CustomLoadingIndicator from '../components/CustomLoadingIndicator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.6;

// ── First-Time Messaging Disclaimer ──
const MessagingDisclaimer = ({ visible, onAccept, theme, isDark }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Staggered entrance
      Animated.sequence([
        // Backdrop
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // Card scale in
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        // Shield bounce
        Animated.spring(shieldAnim, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        // Stagger checkmarks
        Animated.stagger(120, checkmarkAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          })
        )),
        // Button pop
        Animated.spring(buttonAnim, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Animate out
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onAccept());
  };

  if (!visible) return null;

  const guidelines = [
    { icon: 'favorite', text: 'Be kind, respectful, and uplifting in every message' },
    { icon: 'shield', text: 'Messages are filtered to keep conversations safe' },
    { icon: 'visibility-off', text: 'Messages auto-delete 24 hours after being read' },
    { icon: 'gavel', text: 'Misuse may result in your account being restricted' },
  ];

  return (
    <Animated.View style={[disclaimerStyles.overlay, { opacity: opacityAnim }]}>
      <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      
      <Animated.View style={[
        disclaimerStyles.card,
        {
          backgroundColor: isDark ? 'rgba(30,30,30,0.97)' : 'rgba(255,255,255,0.97)',
          transform: [{ scale: scaleAnim }],
          shadowColor: theme.primary,
        }
      ]}>
        {/* Shield Icon */}
        <Animated.View style={[
          disclaimerStyles.shieldContainer,
          {
            transform: [
              { scale: shieldAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: shieldAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-10deg', '0deg'] }) },
            ],
            opacity: shieldAnim,
          }
        ]}>
          <LinearGradient
            colors={[theme.primary, theme.primary + 'CC']}
            style={disclaimerStyles.shieldGradient}
          >
            <MaterialIcons name="verified-user" size={36} color="#FFF" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Text style={[disclaimerStyles.title, { color: theme.text }]}>
          Community Guidelines
        </Text>
        <Text style={[disclaimerStyles.subtitle, { color: theme.textSecondary }]}>
          We want every conversation to reflect love,{'\n'}respect, and encouragement.
        </Text>

        {/* Guidelines */}
        <View style={disclaimerStyles.guidelinesContainer}>
          {guidelines.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                disclaimerStyles.guidelineRow,
                {
                  opacity: checkmarkAnims[index],
                  transform: [{
                    translateX: checkmarkAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    }),
                  }],
                }
              ]}
            >
              <View style={[disclaimerStyles.guidelineIcon, { backgroundColor: theme.primary + '18' }]}>
                <MaterialIcons name={item.icon} size={18} color={theme.primary} />
              </View>
              <Text style={[disclaimerStyles.guidelineText, { color: theme.text }]}>
                {item.text}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Accept Button */}
        <Animated.View style={{
          transform: [{ scale: buttonAnim }],
          opacity: buttonAnim,
          width: '100%',
        }}>
          <TouchableOpacity
            style={[disclaimerStyles.acceptButton, { backgroundColor: theme.primary }]}
            onPress={handleAccept}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={disclaimerStyles.acceptButtonText}>I Understand</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Text style={[disclaimerStyles.footer, { color: theme.textTertiary }]}>
          This is shown once per conversation for your safety.
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const disclaimerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  shieldContainer: {
    marginBottom: 16,
  },
  shieldGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  guidelinesContainer: {
    width: '100%',
    gap: 14,
    marginBottom: 28,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guidelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  footer: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();

  const { otherUser: rawOtherUser, otherUserId, conversationId: passedConversationId } = route.params || {};
  const [otherUser, setOtherUser] = useState(rawOtherUser);

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(passedConversationId);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEncouragements, setShowEncouragements] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const rawMessagesRef = useRef([]);
  const [tick, setTick] = useState(0);

  // If otherUser is missing displayName, fetch it from Firestore
  useEffect(() => {
    if (otherUser?.displayName || !otherUserId) return;
    const fetchOtherUser = async () => {
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../config/firebase');
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          setOtherUser(prev => ({ ...prev, ...userDoc.data(), uid: otherUserId }));
        }
      } catch (err) {
        console.warn('Error fetching other user profile:', err);
      }
    };
    fetchOtherUser();
  }, [otherUserId]);

  useEffect(() => {
    checkFirstTimeMessaging();
    initializeChat();
  }, []);

  // Suppress notifications from this person while we're actively viewing the chat
  useFocusEffect(
    useCallback(() => {
      if (otherUserId) setActiveChatUser(otherUserId);
      return () => clearActiveChatUser();
    }, [otherUserId])
  );

  // Tick every 30 seconds to refresh countdown timers and re-filter expired messages
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Re-filter expired messages on each tick (removes them from UI without waiting for Firestore)
  useEffect(() => {
    if (rawMessagesRef.current.length === 0) return;
    const now = Date.now();
    const filtered = rawMessagesRef.current.filter(msg => {
      if (msg.deleteAfter) {
        const expiry = msg.deleteAfter?.toDate ? msg.deleteAfter.toDate().getTime() : msg.deleteAfter;
        return expiry > now;
      }
      return true;
    });
    setMessages(filtered);
  }, [tick]);

  // Check if user has seen the messaging guidelines for THIS specific conversation partner
  const checkFirstTimeMessaging = async () => {
    try {
      if (!otherUserId) return;
      const seen = await userStorage.getRaw(`chat_guidelines_accepted_${otherUserId}`);
      if (!seen) {
        setShowDisclaimer(true);
      }
    } catch (err) {
      console.log('Error checking chat guidelines:', err);
    }
  };

  const handleAcceptDisclaimer = async () => {
    setShowDisclaimer(false);
    try {
      if (!otherUserId) return;
      await userStorage.setRaw(`chat_guidelines_accepted_${otherUserId}`, 'true');
    } catch (err) {
      console.log('Error saving chat guidelines acceptance:', err);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to messages — store raw + filter out expired ones client-side
    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      rawMessagesRef.current = msgs;
      const now = Date.now();
      const filtered = msgs.filter(msg => {
        // If message has a deleteAfter timestamp, check if it's expired
        if (msg.deleteAfter) {
          const expiry = msg.deleteAfter?.toDate ? msg.deleteAfter.toDate().getTime() : msg.deleteAfter;
          return expiry > now;
        }
        return true; // Keep messages without deleteAfter (legacy)
      });
      setMessages(filtered);
      setLoading(false);
      
      // Mark as read
      if (user?.uid) {
        markAsRead(conversationId, user.uid);
      }
    });

    // Periodic cleanup: delete expired messages from Firestore every 60 seconds
    const cleanupInterval = setInterval(() => {
      cleanupOldMessages(conversationId).catch(() => {});
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
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
    const text = inputText.trim();
    if (!text || sending || !conversationId) return;

    // Instant feedback — haptic + clear input immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    setSending(true);

    try {
      // Check for profanity (synchronous — fast)
      if (profanityFilter.containsProfanity(text)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Message Blocked',
          'Inappropriate language was detected in your message. Please keep conversations respectful and kind. Your message was not sent.',
          [{ text: 'OK', style: 'default' }]
        );
        setInputText(text); // Restore text
        return;
      }

      // Check chat restriction (async — runs after haptic already fired)
      if (user?.uid) {
        const check = await isRestricted(user.uid, 'chat');
        if (check.restricted) {
          Alert.alert('Chat Restricted', `Your ability to send messages has been restricted ${check.expiresLabel || 'permanently'}. If you believe this is a mistake, please contact support.`);
          setInputText(text); // Restore text
          return;
        }
      }

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

    // Instant feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSending(true);
    setShowEncouragements(false);

    // Check chat restriction
    if (user?.uid) {
      const check = await isRestricted(user.uid, 'chat');
      if (check.restricted) {
        Alert.alert('Chat Restricted', `Your ability to send messages has been restricted ${check.expiresLabel || 'permanently'}. If you believe this is a mistake, please contact support.`);
        setSending(false);
        return;
      }
    }

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

  // Helper: get just the time string
  const getTimeOnly = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  // Helper: get the day label for a date
  const getDayLabel = (date) => {
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) return 'Today';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return 'Yesterday';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Check if this message starts a new day compared to the previous one
  const isDifferentDay = (index) => {
    if (index === 0) return true;
    const currentDate = messages[index].createdAt?.toDate?.() || new Date(messages[index].createdAt);
    const prevDate = messages[index - 1].createdAt?.toDate?.() || new Date(messages[index - 1].createdAt);
    return currentDate.getDate() !== prevDate.getDate() ||
      currentDate.getMonth() !== prevDate.getMonth() ||
      currentDate.getFullYear() !== prevDate.getFullYear();
  };

  // Show a time separator if messages are 5+ minutes apart (but same day)
  const shouldShowTimestamp = (index) => {
    if (index === 0) return true;
    const currentMsg = messages[index];
    const prevMsg = messages[index - 1];
    
    const currentTime = currentMsg.createdAt?.toDate?.() || new Date(currentMsg.createdAt);
    const prevTime = prevMsg.createdAt?.toDate?.() || new Date(prevMsg.createdAt);
    
    // Show timestamp if more than 5 minutes apart
    return (currentTime - prevTime) > 5 * 60 * 1000;
  };

  // Get remaining time until message auto-deletes
  const getTimeRemaining = (deleteAfter) => {
    if (!deleteAfter) return null;
    let expiry;
    if (deleteAfter?.toDate) {
      expiry = deleteAfter.toDate().getTime();
    } else if (typeof deleteAfter === 'number') {
      expiry = deleteAfter;
    } else {
      expiry = new Date(deleteAfter).getTime();
    }
    if (isNaN(expiry)) return null;
    const remaining = expiry - Date.now();
    if (remaining <= 0) return null;
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return '< 1m';
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderId === user?.uid;
    const showTimestamp = shouldShowTimestamp(index);
    const isEncouragement = item.type === 'encouragement';
    const isVerse = item.type === 'verse';
    const isImage = item.type === 'image';

    // Only show avatar on the LAST message in a consecutive group from the same sender
    // (next message is from a different sender, or this is the last message, or next has a timestamp gap)
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const isLastInGroup = !nextMsg || nextMsg.senderId !== item.senderId || shouldShowTimestamp(index + 1);

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

    const showDayHeader = isDifferentDay(index);
    const msgDate = item.createdAt?.toDate?.() || new Date(item.createdAt);
    const timeRemaining = getTimeRemaining(item.deleteAfter);

    return (
      <View>
        {/* Day header — shown once per day */}
        {showDayHeader && (
          <Text style={[styles.timestamp, { color: theme.textTertiary, fontWeight: '700', marginTop: 16, marginBottom: 4 }]}>
            {getDayLabel(msgDate)}
          </Text>
        )}
        
        <View style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
          !isLastInGroup && { marginBottom: 2 },
        ]}>
          {/* Only show avatar on the last message in a consecutive group */}
          {!isMe && isLastInGroup && (
            otherUser?.profilePicture ? (
              <Image source={{ uri: otherUser.profilePicture }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: theme.primary + '30' }]}>
                <MaterialIcons name="person" size={14} color={theme.primary} />
              </View>
            )
          )}
          {/* Invisible spacer to keep alignment when avatar is hidden */}
          {!isMe && !isLastInGroup && (
            <View style={{ width: 28, marginRight: 8 }} />
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
            
            {/* Message footer: time + auto-delete countdown + read receipt */}
            <View style={[styles.messageFooter, !isMe && { justifyContent: 'flex-start' }]}>
              <Text style={[styles.messageTime, !isMe && { color: theme.textTertiary }]}>
                {getTimeOnly(item.createdAt)}
              </Text>
              {timeRemaining && item.read && (
                <View style={styles.countdownBadge}>
                  <Ionicons name="time-outline" size={9} color={isMe ? 'rgba(255,255,255,0.5)' : theme.textTertiary} />
                  <Text style={[styles.countdownText, { color: isMe ? 'rgba(255,255,255,0.5)' : theme.textTertiary }]}>
                    {timeRemaining}
                  </Text>
                </View>
              )}
              {isMe && (
                item.read ? (
                  <Ionicons name="checkmark-done" size={14} color="#34B7F1" style={{ marginLeft: 2 }} />
                ) : (
                  <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.6)" style={{ marginLeft: 2 }} />
                )
              )}
            </View>
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

      {/* First-time messaging disclaimer */}
      <MessagingDisclaimer
        visible={showDisclaimer}
        onAccept={handleAcceptDisclaimer}
        theme={theme}
        isDark={isDark}
      />
      
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

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowReportModal(true)}
        >
          <MaterialIcons name="more-vert" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <CustomLoadingIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            extraData={tick}
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

      <ReportBlockModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="message"
        contentId={conversationId}
        reportedUserId={otherUserId}
        currentUserId={user?.uid}
        displayName={otherUser?.displayName || 'this user'}
        onBlock={() => {
          setShowReportModal(false);
          navigation.goBack();
        }}
      />
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
  // Message footer (time + countdown + read receipt)
  messageFooter: {
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
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  countdownText: {
    fontSize: 9,
    fontWeight: '500',
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

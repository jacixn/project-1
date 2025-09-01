import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '../services/aiService';
import { CircleStrokeSpin, BallVerticalBounce } from './ProgressHUDAnimations';
// Removed InteractiveSwipeBack import

// Bible Verse Reference Parser Component
const BibleVerseText = memo(({ text, style, onVersePress }) => {
  // Regex to match Bible verse references like "John 3:16", "1 Corinthians 13:4-7", "Isaiah 14:12"
  const bibleVerseRegex = /(\d?\s?[A-Za-z]+\s?\d+:\d+(?:-\d+)?)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = bibleVerseRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        key: `text-${lastIndex}`
      });
    }
    
    // Add the Bible verse reference
    parts.push({
      type: 'verse',
      content: match[0],
      key: `verse-${match.index}`,
      reference: match[0].trim()
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
      key: `text-${lastIndex}`
    });
  }
  
  // If no matches found, return original text
  if (parts.length === 0) {
    return <Text style={style}>{text}</Text>;
  }
  
  return (
    <Text style={style}>
      {parts.map((part) => {
        if (part.type === 'verse') {
          return (
            <Text
              key={part.key}
              style={[style, { 
                color: '#6366F1', 
                textDecorationLine: 'underline',
                fontWeight: '600'
              }]}
              onPress={() => onVersePress && onVersePress(part.reference)}
            >
              {part.content}
            </Text>
          );
        }
        return <Text key={part.key}>{part.content}</Text>;
      })}
    </Text>
  );
});

// Typewriter Effect Component
const TypewriterText = memo(({ text, style, speed = 30, onProgress, onVersePress }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        // Call onProgress callback for auto-scrolling
        if (onProgress) {
          onProgress(currentIndex + 1, text.length);
        }
      }, speed);
      
      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && text.length > 0) {
      // Finished typing - no haptic feedback to avoid spam
      // hapticFeedback.gentle(); // Removed to prevent excessive haptics
    }
  }, [currentIndex, text, speed, onProgress]);
  
  useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);
  
  return (
    <View>
      <BibleVerseText 
        text={displayText} 
        style={style} 
        onVersePress={onVersePress}
      />
      {currentIndex < text.length && (
        <Text style={{ opacity: 0.5, fontSize: 16 }}>●</Text>
      )}
    </View>
  );
});

const AiBibleChat = ({ visible, onClose, initialVerse, onNavigateToBible }) => {
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [userName, setUserName] = useState('Friend');
  const [nameLoaded, setNameLoaded] = useState(false);
  const scrollViewRef = useRef(null);

  // Suggested questions that appear on first load
  const suggestedQuestions = [
    "How can I deepen my faith?",
    "How can I understand the Bible better?",
    "What does this verse mean?",
    "How do I pray effectively?",
    "What is God's purpose for my life?",
    "How can I find peace in difficult times?"
  ];

  // Load user name when component mounts
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('userProfile');
        console.log('🔍 AiBibleChat - Raw userProfile:', storedProfile);
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          console.log('🔍 AiBibleChat - Parsed profile:', profile);
          const name = profile.name || 'Friend';
          console.log('🔍 AiBibleChat - Setting userName to:', name);
          setUserName(name);
        }
        setNameLoaded(true);
      } catch (error) {
        console.error('Failed to load user name:', error);
        setNameLoaded(true);
      }
    };
    
    loadUserName();
  }, []);

  useEffect(() => {
    if (visible && nameLoaded) {
      if (initialVerse && messages.length === 0) {
        // If we have an initial verse, start with interpretation
        console.log('🔍 Starting verse interpretation for:', initialVerse);
        console.log('🔍 Using userName:', userName);
        
        // Auto-start interpretation with user's name
        const verseText = initialVerse.text || initialVerse.content || '';
        const verseReference = initialVerse.reference || '';
        const interpretationRequest = `Please help me understand this Bible verse: "${verseText}" - ${verseReference}. My name is ${userName}.`;
        
        // Add user message first
        const userMessage = {
          id: Date.now().toString(),
          text: `Please help me understand this Bible verse: "${verseText}" - ${verseReference}`,
          isAi: false,
          timestamp: new Date(),
        };
        setMessages([userMessage]);
        
        // Then get AI response
        setIsLoading(true);
        getBibleAnswer(interpretationRequest).then(response => {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            text: `Friend:\n${response}`,
            isAi: true,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
          setIsLoading(false);
          scrollToBottom();
        });
      } else if (visible && messages.length === 0 && !initialVerse) {
        // Add welcome message when chat opens normally
        const welcomeMessage = {
          id: Date.now().toString(),
          text: `Friend:\nHi ${userName}! How can I help?`,
          isAi: true,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [visible, initialVerse, userName, nameLoaded]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleVersePress = (verseReference) => {
    console.log('📖 Verse reference tapped:', verseReference);
    hapticFeedback.light();
    
    if (onNavigateToBible) {
      // Close the AI chat and navigate to the Bible
      onClose();
      // Pass the verse reference to navigate to
      onNavigateToBible(verseReference);
    } else {
      // Fallback: show alert if navigation not available
      Alert.alert(
        'Navigate to Bible',
        `Would you like to read ${verseReference} in the Holy Bible section?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes', onPress: () => console.log('Navigate to Bible requested') }
        ]
      );
    }
  };

  const sendMessage = async (messageText = inputText) => {
    if (!messageText.trim() || isLoading) return;

    console.log('📤 Sending message:', messageText);
    hapticFeedback.light();

    const userMessage = {
      id: Date.now().toString(),
      text: messageText,
      isAi: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      console.log('🔄 Starting AI request...');
      // Call AI service for Bible questions - now returns response or error message
      const response = await getBibleAnswer(messageText);
      console.log('✅ Got response:', response);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: response, // This will be either the AI response or a user-friendly error message
        isAi: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Only play success sound if it's not an error message
      if (!response.includes('apologize') && !response.includes('trouble') && !response.includes('settings')) {
        hapticFeedback.success();
      } else {
        hapticFeedback.light(); // Gentle feedback for error messages
      }
    } catch (error) {
      // This should rarely happen now since getBibleAnswer returns errors as strings
      console.error('❌ Unexpected error in sendMessage:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Something unexpected happened. Please try again.",
        isAi: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      hapticFeedback.error();
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const getBibleAnswer = async (question) => {
    console.log('🎯 Friend chat starting for question:', question);
    
    // DEBUG: Let's check AsyncStorage directly here too
    try {
      const debugProfile = await AsyncStorage.getItem('userProfile');
      console.log('🔍 DEBUG - Direct AsyncStorage check in AiBibleChat:', debugProfile);
      if (debugProfile) {
        const parsed = JSON.parse(debugProfile);
        console.log('🔍 DEBUG - Parsed profile in AiBibleChat:', parsed);
        console.log('🔍 DEBUG - Name from parsed profile:', parsed.name);
      }
    } catch (error) {
      console.log('🔍 DEBUG - Error checking AsyncStorage:', error);
    }
    
    try {
      // Add user's name context to the question if it doesn't already include it
      let contextualQuestion = question;
      console.log('🔍 AiBibleChat - Current userName state:', userName);
      if (!question.toLowerCase().includes('my name is') && userName !== 'Friend') {
        contextualQuestion = `${question} (My name is ${userName})`;
        console.log('🔍 AiBibleChat - Contextual question:', contextualQuestion);
      } else {
        console.log('🔍 AiBibleChat - NOT adding name context because userName is:', userName);
      }
      
      // Direct call to proxy for chat (not task analysis!)
      const response = await aiService.chatWithFriend(contextualQuestion);
      
      if (response) {
        console.log('✅ Friend response received');
        return response;
      }
      
      return `Hey ${userName}! How can I help you today?`;
      
    } catch (error) {
      console.error('❌ Friend chat error:', error);
      // Fallback responses for common greetings
      if (question.toLowerCase().includes('hey') || question.toLowerCase().includes('hello') || question.toLowerCase().includes('hi')) {
        return `Hey ${userName}! It's great to hear from you! How are you doing today? Is there anything on your heart you'd like to talk about?`;
      }
      return `I'm here for you, ${userName}! What's on your mind today?`;
    }
  };

  const handleSuggestedQuestion = (question) => {
    hapticFeedback.medium();
    sendMessage(question);
  };

  const handleClose = () => {
    hapticFeedback.light();
    onClose();
  };

  const handleMenuPress = () => {
    hapticFeedback.medium();
    setShowMenu(true);
  };

  const clearChat = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Reset to just the welcome message
            const welcomeMessage = {
              id: Date.now().toString(),
              text: "Friend:\nHow can I help?",
              isAi: true,
              timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            setShowMenu(false);
          },
        },
      ]
    );
  };

  const copyLastMessage = async () => {
    hapticFeedback.light();
    const lastAiMessage = messages.slice().reverse().find(msg => msg.isAi);
    if (lastAiMessage) {
      try {
        await Clipboard.setString(lastAiMessage.text);
        Alert.alert('Copied!', 'Message copied to clipboard');
      } catch (error) {
        Alert.alert('Error', 'Failed to copy message');
      }
    } else {
      Alert.alert('No Messages', 'No messages to copy');
    }
    setShowMenu(false);
  };

  const renderMessage = (message) => {
    const isAi = message.isAi;
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isAi ? styles.aiMessageContainer : styles.userMessageContainer
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isAi ? [styles.aiMessage, { backgroundColor: theme.card }] : [styles.userMessage, { backgroundColor: theme.primary }]
          ]}
        >
          {isAi ? (
            <TypewriterText
              text={message.text}
              style={[
                styles.messageText,
                { color: theme.text }
              ]}
              speed={25} // Faster typing speed for better UX
              onProgress={() => {
                // Auto-scroll as text types
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 50);
              }}
              onVersePress={handleVersePress}
            />
          ) : (
            <Text
              style={[
                styles.messageText,
                { color: '#ffffff' }
              ]}
            >
              {message.text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const testConnectivity = async () => {
    try {
      console.log('🧪 Testing AI connectivity...');
      const apiKey = await AsyncStorage.getItem('fivefold_groq_api_key');
      console.log('🧪 AI test result:', apiKey ? `Enabled (${apiKey.length} chars)` : 'NOT ENABLED');
      Alert.alert('Smart Features Status', apiKey ? 'Smart features are active! Friend is ready to chat.' : 'Please enable smart features in Profile > Settings first.');
    } catch (error) {
      console.error('🧪 AI connectivity test error:', error);
      Alert.alert('Smart Features Error', 'Failed to check smart features status - ' + error.message);
    }
  };

  const renderSuggestedQuestions = () => {
    if (messages.length > 1) return null; // Only show on welcome

    return (
      <View style={styles.suggestionsContainer}>
        {suggestedQuestions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.suggestionButton, { backgroundColor: theme.verseBackground, borderColor: theme.border }]}
            onPress={() => handleSuggestedQuestion(question)}
          >
            <Text style={[styles.suggestionText, { color: theme.text }]}>
              {question}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Ask me anything</Text>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <MaterialIcons name="more-horiz" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map(renderMessage)}
            {renderSuggestedQuestions()}
            
            {isLoading && (
              <View style={[styles.messageContainer, styles.aiMessageContainer]}>
                <View style={[styles.messageBubble, styles.aiMessage, { backgroundColor: theme.card }]}>
                  <View style={styles.thinkingContainer}>
                    <BallVerticalBounce size={30} />
                    <Text style={[styles.messageText, { color: theme.text, marginLeft: 12 }]}>
                      Friend is thinking...
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Ask me anything..."
                placeholderTextColor={theme.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                onSubmitEditing={() => sendMessage()}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: inputText.trim() ? theme.primary : theme.textSecondary }]}
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
              >
                <MaterialIcons name="send" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={copyLastMessage}
            >
              <MaterialIcons name="content-copy" size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Copy Last Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={clearChat}
            >
              <MaterialIcons name="clear" size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Clear Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                setShowMenu(false);
                Alert.alert('About Friend', 'Friend is your smart Bible assistant, powered by advanced technology to help you understand scripture and grow in your faith.');
              }}
            >
              <MaterialIcons name="info" size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>About Friend</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 25 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  aiMessage: {
    borderBottomLeftRadius: 4,
  },
  userMessage: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsContainer: {
    marginTop: 20,
  },
  suggestionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  menuContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  // Removed preview styles
});

export default memo(AiBibleChat);

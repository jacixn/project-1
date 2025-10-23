import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Clipboard,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '../services/aiService';
import { CircleStrokeSpin, BallVerticalBounce } from './ProgressHUDAnimations';
// Removed InteractiveSwipeBack import

// Bible Verse Reference Parser Component
const BibleVerseText = memo(({ text, style, onVersePress }) => {
  // Enhanced regex to match various Bible verse reference formats:
  // "John 3:16", "1 Corinthians 13:4-7", "Romans 8:11", "Matthew, chapter 1, verse 1"
  const bibleVerseRegex = /(?:(?:the\s+)?book\s+of\s+)?(\d?\s?[A-Za-z]+)(?:,?\s*chapter\s+(\d+)(?:[,.\s]*verses?\s+(\d+)(?:-(\d+))?)?|\s+(\d+):(\d+)(?:-(\d+))?)/gi;
  
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
    
    // Parse the matched groups to create a standardized reference
    const book = match[1]; // Book name
    const chapter1 = match[2]; // Chapter from "chapter X" format
    const verse1 = match[3]; // Verse from "verse X" format  
    const verseEnd1 = match[4]; // End verse from "verse X-Y" format
    const chapter2 = match[5]; // Chapter from "Book X:Y" format
    const verse2 = match[6]; // Verse from "Book X:Y" format
    const verseEnd2 = match[7]; // End verse from "Book X:Y-Z" format
    
    // Determine the actual chapter and verse numbers
    const chapter = chapter1 || chapter2;
    const verse = verse1 || verse2;
    const verseEnd = verseEnd1 || verseEnd2;
    
    // Create standardized reference format (Book Chapter:Verse)
    let standardReference = book;
    if (chapter) {
      if (verse) {
        standardReference = `${book} ${chapter}:${verse}`;
        if (verseEnd) {
          standardReference += `-${verseEnd}`;
        }
      } else {
        // If we have chapter but no verse, include the chapter
        standardReference = `${book} ${chapter}`;
      }
    }
    
    console.log('📖 Verse match found:', { 
      matched: match[0], 
      book, 
      chapter, 
      verse, 
      standardReference 
    });
    
    // Add the Bible verse reference
    parts.push({
      type: 'verse',
      content: match[0],
      key: `verse-${match.index}`,
      reference: standardReference.trim()
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
    return (
      <Text 
        style={style} 
        selectable={true}
        selectTextOnFocus={false}
        dataDetectorType="none"
        allowFontScaling={true}
      >
        {text}
      </Text>
    );
  }
  
  return (
    <Text 
      style={style} 
      selectable={true}
      selectTextOnFocus={false}
      dataDetectorType="none"
      allowFontScaling={true}
    >
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userName, setUserName] = useState('Friend');
  const [nameLoaded, setNameLoaded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  // Load user name function
  const loadUserName = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        const name = profile.name || 'Friend';
        setUserName(name);
      }
      setNameLoaded(true);
    } catch (error) {
      setNameLoaded(true);
    }
  };

  // Load chat history when component mounts
  useEffect(() => {
    if (visible) {
      setIsInitializing(true);
      // Initialize quickly, then load data in background
      setTimeout(() => {
        setIsInitializing(false);
        // Load data in background
        loadChatHistory();
        loadUserName();
      }, 100);
    }
  }, [visible]);

  // Save current conversation to history when closing
  useEffect(() => {
    if (!visible && messages.length > 0) {
      saveChatToHistory();
    }
  }, [visible, messages]);

  // Load chat history from AsyncStorage
  const loadChatHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem('friendChatHistory');
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        setChatHistory(history);
      }
    } catch (error) {
      // Error handled gracefully
    }
  };

  // Save current conversation to history
  const saveChatToHistory = async () => {
    if (messages.length === 0) {
      return;
    }

    // Filter out only user and Smart messages (not system messages)
    const conversationMessages = messages.filter(msg => msg.text && msg.text.trim());
    
    if (conversationMessages.length === 0) {
      return;
    }

    try {
      // Get the first user message for preview
      const firstUserMessage = conversationMessages.find(msg => !msg.isAi);
      const previewText = firstUserMessage?.text || conversationMessages[0]?.text || 'Conversation';
      
      const conversation = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        messages: conversationMessages,
        preview: previewText.substring(0, 50) + (previewText.length > 50 ? '...' : ''),
        date: new Date().toLocaleDateString()
      };

      // Load current history to ensure we have the latest
      const storedHistory = await AsyncStorage.getItem('friendChatHistory');
      const currentHistory = storedHistory ? JSON.parse(storedHistory) : [];
      
      const updatedHistory = [conversation, ...currentHistory].slice(0, 50); // Keep last 50 conversations
      await AsyncStorage.setItem('friendChatHistory', JSON.stringify(updatedHistory));
      setChatHistory(updatedHistory);
    } catch (error) {
      // Error handled gracefully
    }
  };

  // Load a conversation from history
  const loadConversationFromHistory = (conversation) => {
    setMessages(conversation.messages);
    setShowHistory(false);
    hapticFeedback.light();
    console.log('📖 Loaded conversation from history');
  };

  // Clear all chat history
  const clearChatHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all chat history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('friendChatHistory');
              setChatHistory([]);
              setShowHistory(false);
              hapticFeedback.success();
              console.log('🗑️ Cleared all chat history');
            } catch (error) {
              console.error('Failed to clear chat history:', error);
            }
          }
        }
      ]
    );
  };

  // Handle keyboard events for better input visibility
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
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
        
        // Then get Smart response
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
      // Close the Smart chat and navigate to the Bible with search
      onClose();
      // Pass the verse reference as a search query instead of navigation
      onNavigateToBible(verseReference, 'search');
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
      console.log('🔄 Starting Smart request...');
      // Call Smart service for Bible questions - now returns response or error message
      const response = await getBibleAnswer(messageText);
      console.log('✅ Got response:', response);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: response, // This will be either the Smart response or a user-friendly error message
        isAi: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-save conversation after Smart response
      setTimeout(() => {
        saveChatToHistory();
      }, 1000); // Small delay to ensure state is updated
      
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
    
    // Load user profile for personalized responses
    try {
      const debugProfile = await AsyncStorage.getItem('userProfile');
      if (debugProfile) {
        const parsed = JSON.parse(debugProfile);
        // Use parsed profile data for personalization
      }
    } catch (error) {
      // Handle profile loading error gracefully
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
      
      // Pass conversation context to prevent repeated greetings
      const isFirstMessage = messages.length <= 1;
      const conversationContext = {
        isFirstMessage,
        messageCount: messages.length,
        userName: userName
      };
      
      // Direct call to proxy for chat (not task analysis!)
      const response = await aiService.chatWithFriend(contextualQuestion, conversationContext);
      
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
      console.log('🧪 Testing Smart connectivity...');
      const apiKey = await AsyncStorage.getItem('fivefold_groq_api_key');
      console.log('🧪 Smart test result:', apiKey ? `Enabled (${apiKey.length} chars)` : 'NOT ENABLED');
      Alert.alert('Smart Features Status', apiKey ? 'Smart features are active! Friend is ready to chat.' : 'Please enable smart features in Profile > Settings first.');
    } catch (error) {
      console.error('🧪 Smart connectivity test error:', error);
      Alert.alert('Smart Features Error', 'Failed to check smart features status - ' + error.message);
    }
  };

  const renderSuggestedQuestions = () => {
    console.log('🔍 AiBibleChat - renderSuggestedQuestions called, messages.length:', messages.length);
    if (messages.length > 1) return null; // Only show on welcome

    return (
      <View style={styles.suggestionsContainer}>
        {console.log('🔍 AiBibleChat - Rendering suggested questions')}
        {suggestedQuestions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.suggestionButton, { 
              backgroundColor: theme.verseBackground || theme.card || (isDark ? '#2D2D2D' : '#F5F5F5'), 
              borderColor: theme.border || (isDark ? '#444444' : '#E0E0E0') 
            }]}
            onPress={() => handleSuggestedQuestion(question)}
          >
            <Text style={[styles.suggestionText, { color: theme.text || (isDark ? '#FFFFFF' : '#000000') }]}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background || (isDark ? '#000000' : '#FFFFFF') }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background || (isDark ? '#000000' : '#FFFFFF'), borderBottomColor: theme.border || (isDark ? '#333333' : '#E0E0E0') }]}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Ask me anything</Text>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <MaterialIcons name="more-horiz" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.chatContainer}>
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.messagesContainer, { backgroundColor: theme.background || (isDark ? '#000000' : '#FFFFFF') }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.messagesContent, { backgroundColor: theme.background || (isDark ? '#000000' : '#FFFFFF') }]}
          >
            {isInitializing ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Initializing chat...
                </Text>
              </View>
            ) : (
              <>
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
              </>
            )}
          </ScrollView>
        </View>

        {/* Input Area - Fixed at bottom with keyboard avoidance */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: theme.background || (isDark ? '#000000' : '#FFFFFF'), 
              borderTopColor: theme.border || (isDark ? '#333333' : '#E0E0E0'),
            }
          ]}>
            <View style={[styles.inputWrapper, { 
              backgroundColor: theme.card || (isDark ? '#2D2D2D' : '#FFFFFF'), 
              borderColor: theme.border || (isDark ? '#444444' : '#E0E0E0')
            }]}>
              <TextInput
                style={[styles.textInput, { 
                  color: theme.text || (isDark ? '#FFFFFF' : '#000000'), // Fallback colors
                  backgroundColor: 'transparent' // Ensure background is transparent
                }]}
                placeholder="Ask me anything..."
                placeholderTextColor={theme.textSecondary || (isDark ? '#AAAAAA' : '#666666')}
                value={inputText}
                onChangeText={(text) => {
                  // Handle text input change
                  setInputText(text);
                }}
                onFocus={() => {
                  console.log('💬 Text input focused');
                  // Scroll to bottom when input is focused
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
                multiline
                maxLength={1000}
                onSubmitEditing={() => sendMessage()}
                autoCorrect={true}
                autoCapitalize="sentences"
                returnKeyType="send"
                blurOnSubmit={false}
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
              onPress={() => {
                setShowMenu(false);
                setShowHistory(true);
                hapticFeedback.light();
              }}
            >
              <MaterialIcons name="history" size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                saveChatToHistory();
                hapticFeedback.light();
              }}
            >
              <MaterialIcons name="save" size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Save Chat</Text>
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

      {/* History Modal */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.historyContainer, { backgroundColor: theme.background }]}>
          {/* History Header */}
          <View style={[styles.historyHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.historyCloseButton, { minWidth: 60, alignItems: 'center' }]}
              onPress={() => setShowHistory(false)}
            >
              <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.historyTitle, { color: theme.text }]}>Chat History</Text>
            <TouchableOpacity
              style={styles.historyClearButton}
              onPress={clearChatHistory}
            >
              <MaterialIcons name="delete-outline" size={24} color={theme.error || '#FF6B6B'} />
            </TouchableOpacity>
          </View>

          {/* History Content */}
          <ScrollView style={styles.historyScrollView} showsVerticalScrollIndicator={false}>
            {chatHistory.length === 0 ? (
              <View style={styles.historyEmptyContainer}>
                <MaterialIcons name="history" size={64} color={theme.textSecondary} />
                <Text style={[styles.historyEmptyTitle, { color: theme.text }]}>No Chat History</Text>
                <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                  Your conversations with Friend will appear here
                </Text>
              </View>
            ) : (
              chatHistory.map((conversation, index) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={[styles.historyItem, { 
                    backgroundColor: `${theme.primary}15`,
                    borderColor: `${theme.primary}30`
                  }]}
                  onPress={() => loadConversationFromHistory(conversation)}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyItemContent}>
                    <View style={styles.historyItemHeader}>
                      <Text style={[styles.historyItemDate, { color: theme.primary }]}>
                        {conversation.date}
                      </Text>
                      <Text style={[styles.historyItemTime, { color: theme.textSecondary }]}>
                        {new Date(conversation.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>
                    <Text 
                      style={[styles.historyItemPreview, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {conversation.preview}
                    </Text>
                    <View style={styles.historyItemFooter}>
                      <Text style={[styles.historyItemMessages, { color: theme.textSecondary }]}>
                        {conversation.messages.length} messages
                      </Text>
                      <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            
            {/* Bottom spacing */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
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
    minHeight: 32,
    marginRight: 12,
    paddingVertical: 4,
    textAlignVertical: 'top', // For Android
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
  
  // History Modal Styles
  historyContainer: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  historyCloseButton: {
    padding: 4,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  historyClearButton: {
    padding: 4,
  },
  historyScrollView: {
    flex: 1,
    paddingTop: 16,
  },
  historyEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  historyEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  historyEmptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  historyItem: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyItemContent: {
    padding: 16,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyItemTime: {
    fontSize: 12,
  },
  historyItemPreview: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  historyItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemMessages: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default memo(AiBibleChat);

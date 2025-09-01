import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import VerseDataManager from '../utils/verseDataManager';

const DailyVerseCard = ({ onJournalPress, style }) => {
  const { theme, isDark } = useTheme();
  const [dailyVerse, setDailyVerse] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyVerse();
  }, []);

  const loadDailyVerse = async () => {
    try {
      setLoading(true);
      const verse = await VerseDataManager.getDailyVerse();
      setDailyVerse(verse);
      
      // Check if bookmarked
      const verseData = await VerseDataManager.getVerseData(verse.id);
      setIsBookmarked(verseData.bookmarks && verseData.bookmarks.length > 0);
    } catch (error) {
      console.error('Error loading daily verse:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      hapticFeedback.medium();
      const message = `"${dailyVerse.text}"\n\n- ${dailyVerse.reference}\n\n📖 Daily Verse from Fivefold`;
      
      await Share.share({
        message: message,
        title: 'Daily Bible Verse',
      });
    } catch (error) {
      console.error('Error sharing verse:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      hapticFeedback.light();
      
      if (isBookmarked) {
        await VerseDataManager.removeBookmark(dailyVerse.id, 'Daily');
        setIsBookmarked(false);
      } else {
        await VerseDataManager.addBookmark(
          dailyVerse.id, 
          'Daily', 
          dailyVerse.reference, 
          dailyVerse.text
        );
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error bookmarking verse:', error);
      Alert.alert('Error', 'Failed to bookmark verse. Please try again.');
    }
  };

  const handleJournal = () => {
    hapticFeedback.medium();
    if (onJournalPress) {
      onJournalPress(dailyVerse.text, dailyVerse.reference);
    }
  };

  const getThemeGradient = () => {
    const themeGradients = {
      hope: ['#3B82F6', '#1E40AF'],
      love: ['#EC4899', '#BE185D'],
      strength: ['#10B981', '#047857'],
      peace: ['#8B5CF6', '#6D28D9'],
      joy: ['#F59E0B', '#D97706'],
      faith: ['#EF4444', '#DC2626'],
      wisdom: ['#6366F1', '#4F46E5'],
    };
    
    return themeGradients[dailyVerse?.theme] || themeGradients.hope;
  };

  const getThemeIcon = () => {
    const themeIcons = {
      hope: '🌅',
      love: '💖',
      strength: '💪',
      peace: '🕊️',
      joy: '😊',
      faith: '✨',
      wisdom: '🦉',
    };
    
    return themeIcons[dailyVerse?.theme] || '✨';
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <BlurView intensity={18} style={styles.loadingCard}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading today's verse...
          </Text>
        </BlurView>
      </View>
    );
  }

  if (!dailyVerse) return null;

  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={18} style={styles.card}>
        {/* Header */}
        <LinearGradient
          colors={getThemeGradient()}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>{getThemeIcon()}</Text>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Daily Verse</Text>
              <Text style={styles.headerSubtitle}>
                {dailyVerse.theme?.charAt(0).toUpperCase() + dailyVerse.theme?.slice(1)} • {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Verse Content */}
        <View style={styles.content}>
          <Text style={[styles.verseText, { color: theme.text }]}>
            "{dailyVerse.text}"
          </Text>
          <Text style={[styles.verseReference, { color: theme.primary }]}>
            - {dailyVerse.reference}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.background }]}
            onPress={handleJournal}
          >
            <MaterialIcons name="edit" size={20} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Journal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.background }]}
            onPress={handleBookmark}
          >
            <MaterialIcons 
              name={isBookmarked ? "bookmark" : "bookmark-border"} 
              size={20} 
              color={isBookmarked ? theme.primary : theme.textSecondary} 
            />
            <Text style={[
              styles.actionText, 
              { color: isBookmarked ? theme.primary : theme.textSecondary }
            ]}>
              {isBookmarked ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.background }]}
            onPress={handleShare}
          >
            <MaterialIcons name="share" size={20} color={theme.textSecondary} />
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Reflection Prompt */}
        <View style={[styles.promptSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.promptTitle, { color: theme.text }]}>💭 Reflect</Text>
          <Text style={[styles.promptText, { color: theme.textSecondary }]}>
            How might this verse guide your day? Tap Journal to write your thoughts.
          </Text>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingCard: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },
  content: {
    padding: 24,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  verseReference: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  promptSection: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default DailyVerseCard;


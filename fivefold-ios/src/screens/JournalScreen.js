/**
 * Journal Screen
 * 
 * Calendar-based journal view with add entry support.
 * Extracted from ProfileTab modal for stack navigation support.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import userStorage from '../utils/userStorage';
import { hapticFeedback } from '../utils/haptics';
import VerseDataManager from '../utils/verseDataManager';
import verseByReferenceService from '../services/verseByReferenceService';
import JournalCalendar from '../components/JournalCalendar';

const JournalScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  
  const [journalNotes, setJournalNotes] = useState([]);
  const [journalVerseTexts, setJournalVerseTexts] = useState({});
  const [journalLoading, setJournalLoading] = useState(true);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newJournalNote, setNewJournalNote] = useState({ reference: '', text: '' });

  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondaryColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';

  // Add entry bottom sheet animation
  const addJournalSlideAnim = useRef(new Animated.Value(600)).current;

  const addJournalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          addJournalSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          Animated.timing(addJournalSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setIsAddingEntry(false);
            setNewJournalNote({ reference: '', text: '' });
            addJournalSlideAnim.setValue(600);
          });
        } else {
          Animated.spring(addJournalSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animate add entry sheet when shown
  useEffect(() => {
    if (isAddingEntry) {
      addJournalSlideAnim.setValue(600);
      Animated.spring(addJournalSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [isAddingEntry]);

  // Helper function to check if a string looks like a Bible reference
  const isValidBibleReference = (ref) => {
    if (!ref || ref === 'Unknown Reference' || ref === 'My Thoughts') return false;
    const bibleRefPattern = /^[1-3]?\s*[A-Za-z]+\s+\d+:\d+(-\d+)?$/;
    return bibleRefPattern.test(ref.trim());
  };

  const loadJournalNotes = async (showLoading = true) => {
    try {
      if (showLoading) setJournalLoading(true);
      
      // Read from BOTH sources
      const existingNotes = await userStorage.getRaw('journalNotes');
      const notes = existingNotes ? JSON.parse(existingNotes) : [];
      
      const verseNotes = await VerseDataManager.getAllNotes();
      
      // Merge: manual entries first, then add verse notes that aren't already present
      const allNotes = [...notes];
      const existingIds = new Set(notes.map(n => n.id));
      verseNotes.forEach(vn => {
        if (!existingIds.has(vn.id)) {
          allNotes.push(vn);
        }
      });
      
      allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setJournalNotes(allNotes);
      
      // Fetch verse texts for notes with valid Bible references (in parallel, not serial)
      const preferredVersion = await userStorage.getRaw('selectedBibleVersion') || 'niv';
      const verseTexts = { ...journalVerseTexts }; // preserve already-loaded texts
      const fetchPromises = allNotes
        .filter(note => isValidBibleReference(note.verseReference) && !verseTexts[note.id])
        .map(async (note) => {
          try {
            const verseData = await verseByReferenceService.getVerseByReference(
              note.verseReference,
              preferredVersion
            );
            if (verseData && verseData.text) {
              verseTexts[note.id] = verseData.text;
            }
          } catch (error) {
            console.error(`Error fetching verse for ${note.verseReference}:`, error);
          }
        });
      
      await Promise.all(fetchPromises);
      setJournalVerseTexts(verseTexts);
    } catch (error) {
      console.error('Error loading journal notes:', error);
      try {
        const existingNotes = await userStorage.getRaw('journalNotes');
        if (existingNotes) {
          const notes = JSON.parse(existingNotes);
          if (notes && notes.length > 0) {
            setJournalNotes(notes);
          }
        }
      } catch (fallbackErr) {
        console.error('Error in fallback load:', fallbackErr);
      }
    }
    if (showLoading) setJournalLoading(false);
  };

  useEffect(() => {
    loadJournalNotes();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#000000'] : ['#fdfbfb', '#ebedee']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Journal Calendar View */}
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: 120,
          paddingTop: Platform.OS === 'ios' ? 130 : 100,
        }}
        scrollEventThrottle={16}
      >
        {journalLoading ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="hourglass-bottom" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
              Loading your notes...
            </Text>
          </View>
        ) : (
          <JournalCalendar
            journalNotes={journalNotes}
            journalVerseTexts={journalVerseTexts}
            onDeleteNote={async (noteId, verseId) => {
              hapticFeedback.light();
              try {
                // 1. Remove from manual journal entries storage ('journalNotes')
                const raw = await userStorage.getRaw('journalNotes');
                const manualNotes = raw ? JSON.parse(raw) : [];
                const remaining = manualNotes.filter(n => n.id !== noteId);
                if (remaining.length !== manualNotes.length) {
                  await userStorage.setRaw('journalNotes', JSON.stringify(remaining));
                }

                // 2. Also remove from verse_data storage (VerseDataManager)
                //    This handles notes created via Bible verse journaling
                if (verseId) {
                  try {
                    await VerseDataManager.deleteNote(verseId, noteId);
                  } catch (e) {
                    console.log('[Journal] Note not in verse_data or already removed:', e.message);
                  }
                }

                // 3. Reload the full merged list so the UI stays consistent (no loading spinner)
                await loadJournalNotes(false);
              } catch (error) {
                console.error('[Journal] Error deleting note:', error);
                Alert.alert('Error', 'Failed to delete note. Please try again.');
              }
            }}
            onAddEntry={() => setIsAddingEntry(true)}
            theme={theme}
            isDark={isDark}
          />
        )}
      </ScrollView>
      
      {/* Floating Add Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 30,
          right: 20,
          zIndex: 1000
        }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => {
            hapticFeedback.medium();
            setIsAddingEntry(true);
          }}
        >
          <MaterialIcons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Add Entry Bottom Sheet Modal */}
      {isAddingEntry && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'position' : 'height'}
          keyboardVerticalOffset={0}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'flex-end',
            zIndex: 2000
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setIsAddingEntry(false);
              setNewJournalNote({ reference: '', text: '' });
            }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'transparent'
            }}
          />

          <Animated.View style={{
            backgroundColor: theme.background,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingBottom: Platform.OS === 'ios' ? 12 : 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 25,
            transform: [{ translateY: addJournalSlideAnim }]
          }}>
            {/* Drag Handle */}
            <View 
              style={{ alignItems: 'center', paddingVertical: 14 }}
              {...addJournalPanResponder.panHandlers}
            >
              <View style={{ 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)', 
                width: 40, height: 5, borderRadius: 3
              }} />
            </View>

            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 24, paddingBottom: 20
            }}>
              <View>
                <Text style={{ fontSize: 26, fontWeight: '900', color: textColor, letterSpacing: -0.5 }}>
                  New Reflection
                </Text>
                <Text style={{ fontSize: 14, color: textSecondaryColor, marginTop: 2, fontWeight: '500' }}>
                  Capture your spiritual journey
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  setIsAddingEntry(false);
                  setNewJournalNote({ reference: '', text: '' });
                }}
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 20, padding: 8
                }}
              >
                <MaterialIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title Input */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <MaterialIcons name="label-outline" size={18} color={theme.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: textColor, marginLeft: 8, letterSpacing: 0.3 }}>
                    Topic or Reference
                  </Text>
                </View>
                <TextInput
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderRadius: 16, padding: 18, fontSize: 17, color: textColor, fontWeight: '600',
                    borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                  }}
                  placeholder="e.g. My Morning Prayer"
                  placeholderTextColor={theme.textTertiary}
                  value={newJournalNote.reference}
                  onChangeText={(text) => setNewJournalNote({ ...newJournalNote, reference: text })}
                />
              </View>

              {/* Note Input */}
              <View style={{ marginBottom: 30 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <MaterialIcons name="create" size={18} color={theme.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: textColor, marginLeft: 8, letterSpacing: 0.3 }}>
                    Your Reflection
                  </Text>
                </View>
                <TextInput
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderRadius: 18, padding: 20, fontSize: 17, color: textColor, fontWeight: '500',
                    borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    minHeight: 220, textAlignVertical: 'top', lineHeight: 26
                  }}
                  placeholder="What is God speaking to you today?"
                  placeholderTextColor={theme.textTertiary}
                  value={newJournalNote.text}
                  onChangeText={(text) => setNewJournalNote({ ...newJournalNote, text: text })}
                  multiline
                  numberOfLines={10}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  borderRadius: 20, overflow: 'hidden',
                  shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
                }}
                onPress={async () => {
                  if (!newJournalNote.text.trim()) {
                    Alert.alert('Empty Note', 'Please write something before saving.');
                    return;
                  }

                  hapticFeedback.success();
                  const newEntry = {
                    id: Date.now().toString(),
                    verseReference: newJournalNote.reference.trim() || 'Personal Reflection',
                    text: newJournalNote.text.trim(),
                    createdAt: new Date().toISOString(),
                    verseId: `custom_${Date.now()}`
                  };

                  try {
                    const existingNotes = await userStorage.getRaw('journalNotes');
                    const notes = existingNotes ? JSON.parse(existingNotes) : [];
                    notes.unshift(newEntry);
                    await userStorage.setRaw('journalNotes', JSON.stringify(notes));
                    
                    setNewJournalNote({ reference: '', text: '' });
                    setIsAddingEntry(false);
                    // Reload the full merged list (manual + verse notes) so the UI stays consistent
                    await loadJournalNotes(false);
                  } catch (error) {
                    console.error('Error saving journal entry:', error);
                    Alert.alert('Error', 'Failed to save your journal entry. Please try again.');
                  }
                }}
              >
                <LinearGradient
                  colors={[theme.primary, `${theme.primary}DD`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                  }}
                >
                  <MaterialIcons name="stars" size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 1 }}>
                    SAVE REFLECTION
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      {/* Premium Transparent Header */}
      <BlurView 
        intensity={50} 
        tint={isDark ? 'dark' : 'light'} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}
      >
        <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setIsAddingEntry(false);
                navigation.goBack();
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>
            
            <View style={{ 
              position: 'absolute',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}>
              <Text style={{ color: textColor, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
                Journal
              </Text>
              <View style={{ width: 20, height: 3, backgroundColor: theme.primary, borderRadius: 2, marginTop: 4 }} />
            </View>

            <View style={{ width: 40 }} />
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});

export default JournalScreen;

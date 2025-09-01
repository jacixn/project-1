import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import VerseDataManager from '../utils/verseDataManager';

const VerseJournalingModal = ({ visible, onClose, verse, verseReference }) => {
  const { theme, isDark } = useTheme();
  const [verseData, setVerseData] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [selectedBookmarks, setSelectedBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Highlight colors
  const highlightColors = [
    { name: 'Hope', color: '#3B82F6', emoji: '💙' },
    { name: 'Love', color: '#EC4899', emoji: '💖' },
    { name: 'Strength', color: '#10B981', emoji: '💪' },
    { name: 'Peace', color: '#8B5CF6', emoji: '🕊️' },
    { name: 'Joy', color: '#F59E0B', emoji: '😊' },
    { name: 'Faith', color: '#EF4444', emoji: '✨' },
  ];

  // Bookmark categories
  const bookmarkCategories = [
    { name: 'Favorites', emoji: '❤️', color: '#EF4444' },
    { name: 'Study', emoji: '📚', color: '#3B82F6' },
    { name: 'Prayer', emoji: '🙏', color: '#8B5CF6' },
    { name: 'Comfort', emoji: '🤗', color: '#10B981' },
    { name: 'Inspiration', emoji: '✨', color: '#F59E0B' },
    { name: 'Memory', emoji: '🧠', color: '#EC4899' },
  ];

  useEffect(() => {
    if (visible && verse) {
      loadVerseData();
    }
  }, [visible, verse]);

  const loadVerseData = async () => {
    try {
      setLoading(true);
      const verseText = verse?.content || verse?.text || verse || '';
      const verseId = `${verseReference}_${verseText.substring(0, 50)}`;
      const data = await VerseDataManager.getVerseData(verseId);
      setVerseData(data);
      
      // Set current highlight
      if (data.highlights && data.highlights.length > 0) {
        setSelectedHighlight(data.highlights[0].color);
      }
      
      // Set current bookmarks
      if (data.bookmarks && data.bookmarks.length > 0) {
        setSelectedBookmarks(data.bookmarks.map(b => b.category));
      }
    } catch (error) {
      console.error('Error loading verse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      hapticFeedback.success();
      const verseText = verse?.content || verse?.text || verse || '';
      const verseId = `${verseReference}_${verseText.substring(0, 50)}`;
      await VerseDataManager.addNote(verseId, newNote.trim(), verseReference);
      setNewNote('');
      await loadVerseData();
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    }
  };

  const handleUpdateNote = async (noteId, newText) => {
    try {
      hapticFeedback.light();
      const verseText = verse?.content || verse?.text || verse || '';
      const verseId = `${verseReference}_${verseText.substring(0, 50)}`;
      await VerseDataManager.updateNote(verseId, noteId, newText);
      setEditingNote(null);
      await loadVerseData();
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Error', 'Failed to update note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticFeedback.error();
              const verseText = verse?.content || verse?.text || verse || '';
      const verseId = `${verseReference}_${verseText.substring(0, 50)}`;
              await VerseDataManager.deleteNote(verseId, noteId);
              await loadVerseData();
            } catch (error) {
              console.error('Error deleting note:', error);
            }
          }
        }
      ]
    );
  };

  const handleHighlight = async (color) => {
    try {
      hapticFeedback.medium();
      const verseText = verse?.content || verse?.text || verse || '';
      const verseId = `${verseReference}_${verseText.substring(0, 50)}`;
      
      if (selectedHighlight === color) {
        // Remove highlight
        await VerseDataManager.removeHighlight(verseId);
        setSelectedHighlight(null);
      } else {
        // Add/change highlight
        await VerseDataManager.addHighlight(verseId, color, verseReference);
        setSelectedHighlight(color);
      }
      
      await loadVerseData();
    } catch (error) {
      console.error('Error handling highlight:', error);
    }
  };

  const handleBookmark = async (category) => {
    try {
      hapticFeedback.light();
      const verseText = verse?.content || verse?.text || verse || '';
      const verseId = `${verseReference}_${verseText.substring(0, 50)}`;
      
      if (selectedBookmarks.includes(category)) {
        // Remove bookmark
        await VerseDataManager.removeBookmark(verseId, category);
        setSelectedBookmarks(prev => prev.filter(c => c !== category));
      } else {
        // Add bookmark
        await VerseDataManager.addBookmark(verseId, category, verseReference, verseText);
        setSelectedBookmarks(prev => [...prev, category]);
      }
      
      await loadVerseData();
    } catch (error) {
      console.error('Error handling bookmark:', error);
    }
  };

  const handleClose = () => {
    hapticFeedback.light();
    setNewNote('');
    setEditingNote(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Verse Journal</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Verse Display */}
            <BlurView intensity={18} style={styles.verseCard}>
              <LinearGradient
                colors={isDark ? ['#4F46E5', '#7C3AED'] : ['#6366F1', '#8B5CF6']}
                style={styles.verseGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.verseReference}>{verseReference}</Text>
              </LinearGradient>
              
              <View style={styles.verseContent}>
                <Text style={[styles.verseText, { 
                  color: theme.text,
                  backgroundColor: selectedHighlight ? `${selectedHighlight}20` : 'transparent'
                }]}>
                  "{verse?.content || verse?.text || verse || 'No verse text available'}"
                </Text>
              </View>
            </BlurView>

            {/* Highlighting Section */}
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🎨 Highlight This Verse</Text>
              <View style={styles.colorRow}>
                {highlightColors.map((item) => (
                  <TouchableOpacity
                    key={item.color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: item.color },
                      selectedHighlight === item.color && styles.selectedColor
                    ]}
                    onPress={() => handleHighlight(item.color)}
                  >
                    <Text style={styles.colorEmoji}>{item.emoji}</Text>
                    {selectedHighlight === item.color && (
                      <View style={styles.selectedIndicator}>
                        <MaterialIcons name="check" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Tap a color to highlight this verse by theme
              </Text>
            </View>

            {/* Bookmarking Section */}
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🔖 Save to Collections</Text>
              <View style={styles.bookmarkGrid}>
                {bookmarkCategories.map((category) => (
                  <TouchableOpacity
                    key={category.name}
                    style={[
                      styles.bookmarkButton,
                      { 
                        backgroundColor: selectedBookmarks.includes(category.name) 
                          ? `${category.color}20` 
                          : theme.background,
                        borderColor: selectedBookmarks.includes(category.name)
                          ? category.color
                          : theme.border
                      }
                    ]}
                    onPress={() => handleBookmark(category.name)}
                  >
                    <Text style={styles.bookmarkEmoji}>{category.emoji}</Text>
                    <Text style={[
                      styles.bookmarkText, 
                      { 
                        color: selectedBookmarks.includes(category.name) 
                          ? category.color 
                          : theme.text 
                      }
                    ]}>
                      {category.name}
                    </Text>
                    {selectedBookmarks.includes(category.name) && (
                      <MaterialIcons name="check-circle" size={16} color={category.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes Section */}
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📝 Personal Notes</Text>
              
              {/* Add New Note */}
              <View style={[styles.noteInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.noteTextInput, { color: theme.text }]}
                  placeholder="What does this verse mean to you? How does it apply to your life?"
                  placeholderTextColor={theme.textSecondary}
                  value={newNote}
                  onChangeText={setNewNote}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.addNoteButton,
                    { 
                      backgroundColor: newNote.trim() ? theme.primary : theme.textTertiary,
                      opacity: newNote.trim() ? 1 : 0.5
                    }
                  ]}
                  onPress={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Existing Notes */}
              {verseData?.notes?.map((note) => (
                <View key={note.id} style={[styles.noteCard, { backgroundColor: theme.background }]}>
                  {editingNote === note.id ? (
                    <View style={styles.editingNote}>
                      <TextInput
                        style={[styles.editNoteInput, { color: theme.text, borderColor: theme.border }]}
                        value={note.text}
                        onChangeText={(text) => {
                          const updatedNotes = verseData.notes.map(n => 
                            n.id === note.id ? { ...n, text } : n
                          );
                          setVerseData({ ...verseData, notes: updatedNotes });
                        }}
                        multiline
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={[styles.editAction, { backgroundColor: theme.success }]}
                          onPress={() => handleUpdateNote(note.id, note.text)}
                        >
                          <MaterialIcons name="check" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editAction, { backgroundColor: theme.textSecondary }]}
                          onPress={() => setEditingNote(null)}
                        >
                          <MaterialIcons name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.noteText, { color: theme.text }]}>{note.text}</Text>
                      <View style={styles.noteActions}>
                        <Text style={[styles.noteDate, { color: theme.textSecondary }]}>
                          {new Date(note.createdAt).toLocaleDateString()}
                        </Text>
                        <View style={styles.noteButtons}>
                          <TouchableOpacity
                            style={styles.noteAction}
                            onPress={() => setEditingNote(note.id)}
                          >
                            <MaterialIcons name="edit" size={16} color={theme.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.noteAction}
                            onPress={() => handleDeleteNote(note.id)}
                          >
                            <MaterialIcons name="delete" size={16} color={theme.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              ))}

              {(!verseData?.notes || verseData.notes.length === 0) && (
                <View style={styles.emptyNotes}>
                  <Text style={[styles.emptyNotesText, { color: theme.textSecondary }]}>
                    No notes yet. Add your first thought or reflection!
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  verseCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  verseGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  verseReference: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verseContent: {
    padding: 20,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  section: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedColor: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  colorEmoji: {
    fontSize: 20,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bookmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    minWidth: 100,
  },
  bookmarkEmoji: {
    fontSize: 16,
  },
  bookmarkText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  noteInput: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  noteTextInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  addNoteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
  },
  noteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  noteAction: {
    padding: 4,
  },
  editingNote: {
    gap: 12,
  },
  editNoteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyNotes: {
    padding: 24,
    alignItems: 'center',
  },
  emptyNotesText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VerseJournalingModal;


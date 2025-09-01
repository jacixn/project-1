import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import AiBibleChat from './AiBibleChat';

// Simple verse pool
const VERSES = [
  { id: 1, reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future." },
  { id: 2, reference: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { id: 3, reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { id: 4, reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { id: 5, reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
  { id: 6, reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { id: 7, reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { id: 8, reference: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
  { id: 9, reference: "Psalm 46:10", text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
  { id: 10, reference: "1 Corinthians 13:4", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud." },
];

const SimplePrayerCard = () => {
  const { theme } = useTheme();
  
  const [prayers, setPrayers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  
  // Simple and Discussion states
  const [showSimpleModal, setShowSimpleModal] = useState(false);
  const [simplifiedText, setSimplifiedText] = useState('');
  const [showDiscussModal, setShowDiscussModal] = useState(false);
  const [verseToDiscuss, setVerseToDiscuss] = useState(null);

  // Load prayers on start
  useEffect(() => {
    loadPrayers();
  }, []);

  const loadPrayers = async () => {
    try {
      const stored = await getStoredData('simplePrayers') || [];
      setPrayers(stored);
    } catch (error) {
      console.log('Error loading prayers:', error);
    }
  };

  const savePrayers = async (prayerList) => {
    try {
      await saveData('simplePrayers', prayerList);
    } catch (error) {
      console.log('Error saving prayers:', error);
    }
  };

  // Get random verses
  const getRandomVerses = () => {
    const shuffled = [...VERSES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  };

  // Add new prayer
  const addPrayer = async () => {
    if (!newPrayerName.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    const newPrayer = {
      id: Date.now(),
      name: newPrayerName.trim(),
      verses: getRandomVerses(),
      createdAt: new Date().toISOString(),
    };

    const updatedPrayers = [...prayers, newPrayer];
    setPrayers(updatedPrayers);
    await savePrayers(updatedPrayers);
    
    setShowAddModal(false);
    setNewPrayerName('');
    hapticFeedback.success();
    
    Alert.alert('Prayer Added! 🙏', `"${newPrayer.name}" has been added to your prayers.`);
  };

  // Remove prayer
  const removePrayer = (prayerId) => {
    Alert.alert(
      'Remove Prayer',
      'Are you sure you want to remove this prayer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedPrayers = prayers.filter(p => p.id !== prayerId);
            setPrayers(updatedPrayers);
            await savePrayers(updatedPrayers);
            hapticFeedback.success();
            Alert.alert('Prayer Removed', 'The prayer has been removed from your list.');
          }
        }
      ]
    );
  };

  // Simplify verse for 12-year-old understanding
  const simplifyVerse = async (verse) => {
    try {
      hapticFeedback.light();
      
      // Try to get AI simplification
      try {
        const productionAiService = require('../services/productionAiService').default;
        const simplified = await productionAiService.simplifyBibleVerse(verse.text, verse.reference);
        setSimplifiedText(simplified);
      } catch (error) {
        // Fallback to basic simplification
        const fallback = `This verse means: ${verse.text.replace(/thee|thou|thy/gi, 'you').replace(/ye/gi, 'you all')}`;
        setSimplifiedText(fallback);
      }
      
      setShowSimpleModal(true);
    } catch (error) {
      console.log('Error simplifying verse:', error);
      Alert.alert('Error', 'Could not simplify verse');
    }
  };

  // Open discussion with AI about verse
  const discussVerse = (verse) => {
    hapticFeedback.light();
    setVerseToDiscuss({
      text: verse.text,
      reference: verse.reference
    });
    setShowPrayerModal(false); // Close prayer modal first
    setTimeout(() => {
      setShowDiscussModal(true); // Then open discussion modal
    }, 300);
  };

  // Complete prayer
  const completePrayer = async (prayer) => {
    try {
      // Award 500 points
      const currentStats = await getStoredData('userStats') || {
        points: 0,
        level: 1,
        completedTasks: 0,
        streak: 0,
        prayersCompleted: 0
      };
      
      const updatedStats = {
        ...currentStats,
        points: currentStats.points + 500,
        prayersCompleted: (currentStats.prayersCompleted || 0) + 1
      };
      
      updatedStats.level = Math.floor(updatedStats.points / 1000) + 1;
      await saveData('userStats', updatedStats);

      // Give new verses to the prayer
      const updatedPrayers = prayers.map(p => 
        p.id === prayer.id 
          ? { ...p, verses: getRandomVerses() }
          : p
      );
      setPrayers(updatedPrayers);
      await savePrayers(updatedPrayers);

      setShowPrayerModal(false);
      hapticFeedback.success();
      
      Alert.alert(
        'Prayer Completed! 🙏',
        'Wonderful! You earned 500 points and received fresh verses for next time.',
        [{ text: 'Amen! 🙏', style: 'default' }]
      );
    } catch (error) {
      console.log('Error completing prayer:', error);
      Alert.alert('Error', 'Could not complete prayer');
    }
  };

  return (
    <BlurView intensity={18} tint="light" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>🙏 My Prayers</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setShowAddModal(true);
            hapticFeedback.light();
          }}
        >
          <MaterialIcons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Prayer List */}
      <ScrollView style={styles.prayerList} showsVerticalScrollIndicator={false}>
        {prayers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite" size={60} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No prayers yet. Add your first prayer to get started!
            </Text>
          </View>
        ) : (
          prayers.map((prayer) => (
            <View key={prayer.id} style={[styles.prayerItem, { backgroundColor: theme.card + 'CC' }]}>
              <TouchableOpacity
                style={styles.prayerContent}
                onPress={() => {
                  setSelectedPrayer(prayer);
                  setShowPrayerModal(true);
                  hapticFeedback.light();
                }}
              >
                <View style={styles.prayerInfo}>
                  <View style={[styles.prayerIcon, { backgroundColor: theme.primary }]}>
                    <MaterialIcons name="favorite" size={16} color="#ffffff" />
                  </View>
                  <Text style={[styles.prayerName, { color: theme.text }]}>
                    {prayer.name}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: theme.error + '20' }]}
                onPress={() => removePrayer(prayer.id)}
              >
                <MaterialIcons name="close" size={16} color={theme.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F0' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add Prayer
              </Text>
              <TouchableOpacity onPress={addPrayer}>
                <Text style={[styles.saveButton, { color: theme.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Prayer Name
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="e.g., Morning Prayer, Gratitude"
                placeholderTextColor={theme.textSecondary}
                value={newPrayerName}
                onChangeText={setNewPrayerName}
                autoFocus
              />
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Prayer Detail Modal */}
      <Modal
        visible={showPrayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrayerModal(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F0' }]}>
            {selectedPrayer && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowPrayerModal(false)}>
                    <MaterialIcons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selectedPrayer.name}
                  </Text>
                  <View style={{ width: 24 }} />
                </View>
                
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    📖 Today's Verses
                  </Text>
                  
                  {selectedPrayer.verses.map((verse, index) => (
                    <View key={verse.id} style={[styles.verseCard, { backgroundColor: theme.card + 'E0' }]}>
                      <View style={styles.verseHeader}>
                        <View style={[styles.verseNumber, { backgroundColor: theme.primary }]}>
                          <Text style={styles.verseNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.verseReference, { color: theme.primary }]}>
                          {verse.reference}
                        </Text>
                      </View>
                      
                      <Text style={[styles.verseText, { color: theme.text }]}>
                        {verse.text}
                      </Text>

                      {/* Verse Action Buttons */}
                      <View style={styles.verseActions}>
                        <TouchableOpacity
                          style={[styles.verseActionButton, { 
                            backgroundColor: theme.success + '20',
                            borderColor: theme.success + '40'
                          }]}
                          onPress={() => simplifyVerse(verse)}
                        >
                          <MaterialIcons name="child-care" size={16} color={theme.success} />
                          <Text style={[styles.verseActionText, { color: theme.success }]}>
                            Simple
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.verseActionButton, { 
                            backgroundColor: theme.primary + '20',
                            borderColor: theme.primary + '40'
                          }]}
                          onPress={() => discussVerse(verse)}
                        >
                          <MaterialIcons name="chat" size={16} color={theme.primary} />
                          <Text style={[styles.verseActionText, { color: theme.primary }]}>
                            Discuss
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: theme.success }]}
                    onPress={() => completePrayer(selectedPrayer)}
                  >
                    <MaterialIcons name="check-circle" size={24} color="#ffffff" />
                    <Text style={styles.completeButtonText}>Complete Prayer</Text>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsText}>+500 pts</Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Simple Verse Modal */}
      <Modal
        visible={showSimpleModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSimpleModal(false)}
      >
        <BlurView intensity={100} tint="dark" style={styles.overlayModal}>
          <View style={[styles.simpleModal, { backgroundColor: theme.card + 'FA' }]}>
            <View style={styles.simpleHeader}>
              <MaterialIcons name="child-care" size={24} color={theme.success} />
              <Text style={[styles.simpleTitle, { color: theme.text }]}>
                Simple Explanation
              </Text>
            </View>
            <ScrollView style={styles.simpleContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.simpleText, { color: theme.textSecondary }]}>
                {simplifiedText}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.simpleButton, { backgroundColor: theme.success }]}
              onPress={() => setShowSimpleModal(false)}
            >
              <Text style={styles.simpleButtonText}>Got it! 👍</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* AI Discussion Modal */}
      {showDiscussModal && verseToDiscuss && (
        <AiBibleChat
          visible={showDiscussModal}
          onClose={() => {
            setShowDiscussModal(false);
            setVerseToDiscuss(null);
            // Reopen prayer modal after discussion
            setTimeout(() => {
              setShowPrayerModal(true);
            }, 300);
          }}
          initialVerse={verseToDiscuss}
          title="Discuss This Verse"
        />
      )}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  prayerList: {
    maxHeight: 300,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  prayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  prayerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 16,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  verseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  verseNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verseReference: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Verse action buttons
  verseActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  verseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  verseActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Simple modal styles
  overlayModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  simpleModal: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  simpleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  simpleContent: {
    maxHeight: 200,
    marginBottom: 20,
  },
  simpleText: {
    fontSize: 16,
    lineHeight: 24,
  },
  simpleButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  simpleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SimplePrayerCard;

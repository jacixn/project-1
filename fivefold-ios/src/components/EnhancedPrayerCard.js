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
import TimePicker from './TimePicker';
import AiBibleChat from './AiBibleChat';
import VerseSimplificationService from '../services/verseSimplificationService';
import PrayerManagementService from '../services/prayerManagementService';

const EnhancedPrayerCard = () => {
  const { theme } = useTheme();
  const [prayers, setPrayers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerTime, setNewPrayerTime] = useState('06:00');
  const [simplifiedVerse, setSimplifiedVerse] = useState('');
  const [showSimplified, setShowSimplified] = useState(false);

  useEffect(() => {
    loadPrayers();
    // Check for prayers that need reactivation on component mount
    PrayerManagementService.checkAndReactivatePrayers();
  }, []);

  const loadPrayers = async () => {
    try {
      const storedPrayers = await PrayerManagementService.getPrayers();
      setPrayers(storedPrayers);
    } catch (error) {
      console.error('Error loading prayers:', error);
    }
  };

  const addPrayer = async () => {
    if (!newPrayerName.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    const result = await PrayerManagementService.addPrayer(newPrayerName, newPrayerTime);
    
    if (result.success) {
      await loadPrayers(); // Refresh the list
      setNewPrayerName('');
      setNewPrayerTime('06:00');
      setShowAddModal(false);
      hapticFeedback.success();
    } else {
      Alert.alert('Error', result.error || 'Failed to add prayer');
    }
  };

  const deletePrayer = (prayerId) => {
    Alert.alert(
      'Delete Prayer',
      'Are you sure you want to delete this prayer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await PrayerManagementService.deletePrayer(prayerId);
            if (result.success) {
              await loadPrayers();
              hapticFeedback.success();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete prayer');
            }
          }
        }
      ]
    );
  };

  const editPrayerName = async (prayerId, newName) => {
    if (!newName.trim()) return;
    
    const result = await PrayerManagementService.updatePrayerName(prayerId, newName);
    if (result.success) {
      await loadPrayers();
      setShowEditModal(false);
      setEditingPrayer(null);
      hapticFeedback.success();
    } else {
      Alert.alert('Error', result.error || 'Failed to update prayer name');
    }
  };

  const editPrayerTime = async (prayerId, newTime) => {
    const result = await PrayerManagementService.updatePrayerTime(prayerId, newTime);
    if (result.success) {
      await loadPrayers();
      setShowTimeModal(false);
      setEditingPrayer(null);
      hapticFeedback.success();
    } else {
      Alert.alert('Error', result.error || 'Failed to update prayer time');
    }
  };

  const completePrayer = async (prayerId) => {
    const result = await PrayerManagementService.completePrayer(prayerId);
    if (result.success) {
      await loadPrayers();
      hapticFeedback.success();
      
      Alert.alert(
        '🙏 Prayer Completed',
        'Your prayer has been completed! It will be available again in 24 hours with new verses.',
        [{ text: 'Amen', style: 'default' }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to complete prayer');
    }
  };

  const isPrayerActive = (prayer) => {
    return PrayerManagementService.isPrayerActive(prayer);
  };

  const getTimeUntilActive = (prayer) => {
    const hoursLeft = PrayerManagementService.getTimeUntilActive(prayer);
    
    if (hoursLeft === null && prayer.completed) {
      // Prayer is ready to be reactivated
      PrayerManagementService.reactivatePrayer(prayer.id).then(() => {
        loadPrayers(); // Refresh the list
      });
    }
    
    return hoursLeft;
  };

  const simplifyVerse = async (verse) => {
    try {
      hapticFeedback.light();
      const result = await VerseSimplificationService.simplifyVerse(verse);
      setSimplifiedVerse(result.simplified);
      setShowSimplified(true);
      
      if (!result.success) {
        // Still show the fallback, but let user know
        setTimeout(() => {
          Alert.alert('Note', 'Using offline explanation. For AI-powered simplification, please configure your API key in Settings.');
        }, 2000);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not simplify verse. Please try again.');
    }
  };

  const openDiscussion = (verse) => {
    setSelectedVerse(verse);
    setShowChatModal(true);
  };

  const renderVerse = (verse, prayerId) => (
    <View key={verse.id} style={[styles.verseContainer, { backgroundColor: theme.verseBackground }]}>
      <Text style={[styles.verseText, { color: theme.text }]}>{verse.text}</Text>
      <Text style={[styles.verseReference, { color: theme.primary }]}>{verse.reference}</Text>
      
      <View style={styles.verseActions}>
        <TouchableOpacity
          style={[styles.verseButton, styles.simpleButton, { backgroundColor: theme.success + '20' }]}
          onPress={() => simplifyVerse(verse)}
        >
          <MaterialIcons name="child-care" size={16} color={theme.success} />
          <Text style={[styles.verseButtonText, { color: theme.success }]}>Simple</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.verseButton, styles.discussButton, { backgroundColor: theme.primary + '20' }]}
          onPress={() => openDiscussion(verse)}
        >
          <MaterialIcons name="chat" size={16} color={theme.primary} />
          <Text style={[styles.verseButtonText, { color: theme.primary }]}>Discuss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrayer = (prayer) => {
    const isActive = isPrayerActive(prayer);
    const hoursLeft = getTimeUntilActive(prayer);

    return (
      <BlurView key={prayer.id} intensity={20} tint="light" style={[
        styles.prayerCard,
        !isActive && { opacity: 0.6 }
      ]}>
        {/* Prayer Header */}
        <View style={styles.prayerHeader}>
          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerName, { color: theme.text }]}>{prayer.name}</Text>
            <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>{prayer.time}</Text>
            {!isActive && hoursLeft && (
              <Text style={[styles.cooldownText, { color: theme.warning }]}>
                Available in {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          
          <View style={styles.prayerActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
              onPress={() => {
                setEditingPrayer(prayer);
                setNewPrayerName(prayer.name);
                setShowEditModal(true);
              }}
            >
              <MaterialIcons name="edit" size={16} color={theme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.textSecondary + '20' }]}
              onPress={() => {
                setEditingPrayer(prayer);
                setNewPrayerTime(prayer.time);
                setShowTimeModal(true);
              }}
            >
              <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.error + '20' }]}
              onPress={() => deletePrayer(prayer.id)}
            >
              <MaterialIcons name="delete" size={16} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Verses */}
        {isActive && (
          <View style={styles.versesContainer}>
            {prayer.verses.map(verse => renderVerse(verse, prayer.id))}
          </View>
        )}

        {/* Complete Button */}
        {isActive && (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: theme.success }]}
            onPress={() => completePrayer(prayer.id)}
          >
            <MaterialIcons name="check-circle" size={20} color="#ffffff" />
            <Text style={styles.completeButtonText}>Complete Prayer</Text>
          </TouchableOpacity>
        )}
      </BlurView>
    );
  };

  return (
    <BlurView intensity={18} tint="light" style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>🙏 My Prayers</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.prayersList} showsVerticalScrollIndicator={false}>
        {prayers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite" size={60} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No prayers yet. Add your first prayer to get started!
            </Text>
          </View>
        ) : (
          prayers.map(renderPrayer)
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Prayer</Text>
            <TouchableOpacity onPress={addPrayer}>
              <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Prayer Name</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.verseBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="e.g., Morning Prayer, Evening Gratitude"
              placeholderTextColor={theme.textSecondary}
              value={newPrayerName}
              onChangeText={setNewPrayerName}
              autoFocus
            />
            
            <Text style={[styles.inputLabel, { color: theme.text }]}>Prayer Time</Text>
            <TouchableOpacity
              style={[styles.timeSelector, { 
                backgroundColor: theme.verseBackground,
                borderColor: theme.border
              }]}
              onPress={() => setShowTimeModal(true)}
            >
              <MaterialIcons name="schedule" size={20} color={theme.primary} />
              <Text style={[styles.timeText, { color: theme.text }]}>{newPrayerTime}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Prayer Name</Text>
            <TouchableOpacity onPress={() => editPrayerName(editingPrayer?.id, newPrayerName)}>
              <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.verseBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Prayer name"
              placeholderTextColor={theme.textSecondary}
              value={newPrayerName}
              onChangeText={setNewPrayerName}
              autoFocus
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Time Picker Modal */}
      <TimePicker
        visible={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        onTimeSelected={(time) => editPrayerTime(editingPrayer?.id, time)}
        currentTime={newPrayerTime}
        title="Select Prayer Time"
      />

      {/* Simplified Verse Modal */}
      <Modal
        visible={showSimplified}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSimplified(false)}
      >
        <View style={styles.overlayModal}>
          <BlurView intensity={80} tint="dark" style={styles.simplifiedModal}>
            <View style={[styles.simplifiedContent, { backgroundColor: theme.card }]}>
              <Text style={[styles.simplifiedTitle, { color: theme.text }]}>
                Simple Explanation
              </Text>
              <Text style={[styles.simplifiedText, { color: theme.textSecondary }]}>
                {simplifiedVerse}
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowSimplified(false)}
              >
                <Text style={styles.closeButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* AI Chat Modal */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowChatModal(false)}
      >
        <AiBibleChat
          initialVerse={selectedVerse}
          onClose={() => setShowChatModal(false)}
          title="Discuss This Verse"
        />
      </Modal>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayersList: {
    maxHeight: 600,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  prayerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  prayerTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  cooldownText: {
    fontSize: 12,
    fontWeight: '500',
  },
  prayerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  versesContainer: {
    marginBottom: 16,
  },
  verseContainer: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  verseText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  verseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  verseButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
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
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  timeText: {
    fontSize: 16,
  },
  overlayModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simplifiedModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  simplifiedContent: {
    borderRadius: 16,
    padding: 24,
    maxWidth: '90%',
    alignItems: 'center',
  },
  simplifiedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  simplifiedText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EnhancedPrayerCard;

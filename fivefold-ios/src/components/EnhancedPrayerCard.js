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
  ActivityIndicator,
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
  
  // Simple state management
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  
  // Form states
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerTime, setNewPrayerTime] = useState('06:00');
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [simplifiedVerse, setSimplifiedVerse] = useState('');

  useEffect(() => {
    loadPrayers();
  }, []);

  const loadPrayers = async () => {
    try {
      setLoading(true);
      await PrayerManagementService.checkAndReactivatePrayers();
      const storedPrayers = await PrayerManagementService.getPrayers();
      setPrayers(storedPrayers);
      console.log('Loaded prayers:', storedPrayers.length);
    } catch (error) {
      console.error('Error loading prayers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isPrayerActive = (prayer) => {
    return PrayerManagementService.isPrayerActive(prayer);
  };

  const getTimeUntilActive = (prayer) => {
    return PrayerManagementService.getTimeUntilActive(prayer);
  };

  // Simple modal functions
  const openAddModal = () => {
    console.log('Opening add modal');
    setNewPrayerName('');
    setNewPrayerTime('06:00');
    setShowAddModal(true);
    hapticFeedback.light();
  };

  const closeAddModal = () => {
    console.log('Closing add modal');
    setShowAddModal(false);
    setNewPrayerName('');
    setNewPrayerTime('06:00');
  };

  const openPrayerModal = (prayer) => {
    console.log('Opening prayer modal for:', prayer.name);
    setSelectedPrayer(prayer);
    setShowPrayerModal(true);
    hapticFeedback.light();
  };

  const closePrayerModal = () => {
    console.log('Closing prayer modal');
    setShowPrayerModal(false);
    setSelectedPrayer(null);
  };

  const openEditModal = (prayer) => {
    console.log('Opening edit modal for:', prayer.name);
    setEditingPrayer(prayer);
    setNewPrayerName(prayer.name);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingPrayer(null);
    setNewPrayerName('');
  };

  const openTimeModal = (prayer = null) => {
    console.log('Opening time modal for:', prayer ? prayer.name : 'new prayer');
    setEditingPrayer(prayer);
    if (prayer) {
      setNewPrayerTime(prayer.time);
    }
    setShowTimeModal(true);
  };

  const closeTimeModal = () => {
    setShowTimeModal(false);
    setEditingPrayer(null);
  };

  // Prayer actions
  const addPrayer = async () => {
    if (!newPrayerName.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    try {
      console.log('Adding prayer:', newPrayerName, newPrayerTime);
      const result = await PrayerManagementService.addPrayer(newPrayerName.trim(), newPrayerTime);
      
      if (result.success) {
        await loadPrayers();
        closeAddModal();
        hapticFeedback.success();
        Alert.alert('Success', 'Prayer added successfully! 🙏');
      } else {
        Alert.alert('Error', result.error || 'Failed to add prayer');
      }
    } catch (error) {
      console.error('Error adding prayer:', error);
      Alert.alert('Error', 'Failed to add prayer');
    }
  };

  const editPrayerName = async () => {
    if (!newPrayerName.trim() || !editingPrayer) return;
    
    try {
      const result = await PrayerManagementService.updatePrayerName(editingPrayer.id, newPrayerName.trim());
      
      if (result.success) {
        await loadPrayers();
        closeEditModal();
        hapticFeedback.success();
      } else {
        Alert.alert('Error', result.error || 'Failed to update prayer name');
      }
    } catch (error) {
      console.error('Error editing prayer name:', error);
      Alert.alert('Error', 'Failed to update prayer name');
    }
  };

  const editPrayerTime = async (time) => {
    console.log('editPrayerTime called with:', time, 'editingPrayer:', editingPrayer);
    
    if (!editingPrayer) {
      // Adding new prayer time
      setNewPrayerTime(time);
      closeTimeModal();
      return;
    }

    try {
      const result = await PrayerManagementService.updatePrayerTime(editingPrayer.id, time);
      
      if (result.success) {
        await loadPrayers();
        closeTimeModal();
        hapticFeedback.success();
      } else {
        Alert.alert('Error', result.error || 'Failed to update prayer time');
      }
    } catch (error) {
      console.error('Error editing prayer time:', error);
      Alert.alert('Error', 'Failed to update prayer time');
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
            try {
              const result = await PrayerManagementService.deletePrayer(prayerId);
              if (result.success) {
                await loadPrayers();
                hapticFeedback.success();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete prayer');
              }
            } catch (error) {
              console.error('Error deleting prayer:', error);
              Alert.alert('Error', 'Failed to delete prayer');
            }
          }
        }
      ]
    );
  };

  const completePrayer = async (prayerId) => {
    try {
      const result = await PrayerManagementService.completePrayer(prayerId);
      
      if (result.success) {
        // Award 500 points
        await awardPoints(500);
        await loadPrayers();
        closePrayerModal();
        hapticFeedback.success();
        
        Alert.alert(
          '🙏 Prayer Completed!',
          'You earned 500 points! Your prayer will be available again in 24 hours with new verses.',
          [{ text: 'Amen! 🙏', style: 'default' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to complete prayer');
      }
    } catch (error) {
      console.error('Error completing prayer:', error);
      Alert.alert('Error', 'Failed to complete prayer');
    }
  };

  const awardPoints = async (points) => {
    try {
      const currentStats = await getStoredData('userStats') || {
        points: 0,
        level: 1,
        completedTasks: 0,
        streak: 0,
        prayersCompleted: 0
      };
      
      const updatedStats = {
        ...currentStats,
        points: currentStats.points + points,
        prayersCompleted: (currentStats.prayersCompleted || 0) + 1
      };
      
      updatedStats.level = Math.floor(updatedStats.points / 1000) + 1;
      await saveData('userStats', updatedStats);
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const simplifyVerse = async (verse) => {
    try {
      hapticFeedback.light();
      const result = await VerseSimplificationService.simplifyVerse(verse);
      setSimplifiedVerse(result.simplified);
      setShowSimplified(true);
      
      if (!result.success) {
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

  const renderVerse = (verse, index) => (
    <View key={verse.id} style={[styles.verseCard, { backgroundColor: theme.card + 'F0' }]}>
      <View style={styles.verseHeader}>
        <View style={[styles.verseNumber, { backgroundColor: theme.primary }]}>
          <Text style={styles.verseNumberText}>{index + 1}</Text>
        </View>
        <Text style={[styles.verseReference, { color: theme.primary }]}>{verse.reference}</Text>
      </View>
      
      <Text style={[styles.verseText, { color: theme.text }]}>{verse.text}</Text>
      
      <View style={styles.verseActions}>
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: theme.success + '15',
            borderColor: theme.success + '30'
          }]}
          onPress={() => simplifyVerse(verse)}
        >
          <MaterialIcons name="child-care" size={18} color={theme.success} />
          <Text style={[styles.actionButtonText, { color: theme.success }]}>Simple</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: theme.primary + '15',
            borderColor: theme.primary + '30'
          }]}
          onPress={() => openDiscussion(verse)}
        >
          <MaterialIcons name="chat" size={18} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.primary }]}>Discuss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrayer = (prayer) => {
    const isActive = isPrayerActive(prayer);
    const hoursLeft = getTimeUntilActive(prayer);

    return (
      <View key={prayer.id} style={[
        styles.prayerCard,
        { backgroundColor: theme.card + 'E0' },
        !isActive && styles.inactivePrayerCard
      ]}>
        <TouchableOpacity
          style={styles.prayerContent}
          onPress={() => {
            console.log('Prayer card tapped:', prayer.name, 'isActive:', isActive);
            if (isActive) {
              openPrayerModal(prayer);
            }
          }}
          disabled={!isActive}
          activeOpacity={0.7}
        >
          <View style={styles.prayerMainInfo}>
            <View style={styles.prayerTitleRow}>
              <View style={[
                styles.prayerIcon,
                { backgroundColor: isActive ? theme.primary : theme.textTertiary }
              ]}>
                <MaterialIcons name="favorite" size={16} color="#ffffff" />
              </View>
              <Text style={[styles.prayerName, { color: theme.text }]}>
                {prayer.name}
              </Text>
              {isActive && (
                <MaterialIcons name="keyboard-arrow-right" size={24} color={theme.primary} />
              )}
            </View>
            
            <View style={styles.prayerMetaRow}>
              <View style={styles.timeContainer}>
                <MaterialIcons name="schedule" size={16} color={theme.primary} />
                <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>
                  {formatTime(prayer.time)}
                </Text>
              </View>
              
              {!isActive && hoursLeft && (
                <View style={[styles.cooldownBadge, { backgroundColor: theme.warning + '25' }]}>
                  <MaterialIcons name="timer" size={14} color={theme.warning} />
                  <Text style={[styles.cooldownText, { color: theme.warning }]}>
                    {hoursLeft}h left
                  </Text>
                </View>
              )}
              
              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: theme.success + '25' }]}>
                  <MaterialIcons name="check-circle" size={14} color={theme.success} />
                  <Text style={[styles.activeText, { color: theme.success }]}>
                    Ready to pray
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.primary + '20' }]}
              onPress={(e) => {
                e.stopPropagation();
                console.log('Edit button pressed for:', prayer.name);
                openEditModal(prayer);
              }}
            >
              <MaterialIcons name="edit" size={16} color={theme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.textSecondary + '20' }]}
              onPress={(e) => {
                e.stopPropagation();
                console.log('Time button pressed for:', prayer.name);
                openTimeModal(prayer);
              }}
            >
              <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.error + '20' }]}
              onPress={(e) => {
                e.stopPropagation();
                console.log('Delete button pressed for:', prayer.name);
                deletePrayer(prayer.id);
              }}
            >
              <MaterialIcons name="delete" size={16} color={theme.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card + 'E0' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading prayers...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card + 'E0' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.text }]}>🙏 My Prayers</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {prayers.length} prayer{prayers.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            console.log('Add button pressed');
            openAddModal();
          }}
        >
          <MaterialIcons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Prayer List */}
      <ScrollView style={styles.prayersList} showsVerticalScrollIndicator={false}>
        {prayers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite" size={80} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No prayers yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Create your first prayer to start your spiritual journey with daily verses from God's Word
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                console.log('Empty state add button pressed');
                openAddModal();
              }}
            >
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Add Prayer</Text>
            </TouchableOpacity>
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
        onRequestClose={closeAddModal}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F5' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeAddModal}>
                <MaterialIcons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add New Prayer
              </Text>
              <TouchableOpacity onPress={addPrayer}>
                <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  Prayer Name
                </Text>
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
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  Prayer Time
                </Text>
                <TouchableOpacity
                  style={[styles.timeSelector, { 
                    backgroundColor: theme.verseBackground,
                    borderColor: theme.border
                  }]}
                  onPress={() => {
                    console.log('Time selector pressed in add modal');
                    openTimeModal();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="schedule" size={24} color={theme.primary} />
                  <Text style={[styles.timeText, { color: theme.text }]}>
                    {formatTime(newPrayerTime)}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Edit Prayer Name Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditModal}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F5' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeEditModal}>
                <MaterialIcons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Prayer Name
              </Text>
              <TouchableOpacity onPress={editPrayerName}>
                <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  Prayer Name
                </Text>
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
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Time Picker Modal */}
      <TimePicker
        visible={showTimeModal}
        onClose={closeTimeModal}
        onTimeSelected={editPrayerTime}
        currentTime={editingPrayer?.time || newPrayerTime}
        title={editingPrayer ? "Edit Prayer Time" : "Select Prayer Time"}
      />

      {/* Prayer Detail Modal */}
      <Modal
        visible={showPrayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePrayerModal}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.prayerModalContent, { backgroundColor: theme.background + 'F8' }]}>
            {selectedPrayer && (
              <>
                <View style={styles.prayerModalHeader}>
                  <TouchableOpacity onPress={closePrayerModal}>
                    <MaterialIcons name="close" size={28} color={theme.text} />
                  </TouchableOpacity>
                  <View style={styles.prayerModalTitleContainer}>
                    <MaterialIcons name="favorite" size={24} color={theme.primary} />
                    <Text style={[styles.prayerModalTitle, { color: theme.text }]}>
                      {selectedPrayer.name}
                    </Text>
                  </View>
                  <View style={styles.prayerModalTime}>
                    <MaterialIcons name="schedule" size={18} color={theme.textSecondary} />
                    <Text style={[styles.prayerModalTimeText, { color: theme.textSecondary }]}>
                      {formatTime(selectedPrayer.time)}
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.prayerModalBody} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.prayerModalSectionTitle, { color: theme.text }]}>
                    📖 Today's Verses
                  </Text>
                  
                  <View style={styles.versesContainer}>
                    {selectedPrayer.verses?.map((verse, index) => 
                      renderVerse(verse, index)
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: theme.success }]}
                    onPress={() => completePrayer(selectedPrayer.id)}
                  >
                    <MaterialIcons name="check-circle" size={28} color="#ffffff" />
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

      {/* Simplified Verse Modal */}
      <Modal
        visible={showSimplified}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSimplified(false)}
      >
        <BlurView intensity={95} tint="dark" style={styles.overlayModal}>
          <View style={[styles.simplifiedContainer, { backgroundColor: theme.card + 'F8' }]}>
            <Text style={[styles.simplifiedTitle, { color: theme.text }]}>
              Simple Explanation
            </Text>
            <Text style={[styles.simplifiedText, { color: theme.textSecondary }]}>
              {simplifiedVerse}
            </Text>
            <TouchableOpacity
              style={[styles.simplifiedButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowSimplified(false)}
            >
              <Text style={styles.simplifiedButtonText}>Got it! 👍</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    maxHeight: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Prayer List
  prayersList: {
    maxHeight: 480,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Prayer Card
  prayerCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inactivePrayerCard: {
    opacity: 0.75,
  },
  prayerContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerMainInfo: {
    flex: 1,
    marginRight: 16,
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  prayerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayerTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  cooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cooldownText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Verse Card
  verseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  verseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verseNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  verseReference: {
    fontSize: 16,
    fontWeight: '800',
  },
  verseText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  verseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Modal Styles
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
    padding: 24,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  saveButton: {
    fontSize: 18,
    fontWeight: '800',
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    fontSize: 18,
    fontWeight: '500',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  
  // Prayer Modal
  prayerModalContent: {
    flex: 1,
  },
  prayerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  prayerModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  prayerModalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  prayerModalTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayerModalTimeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  prayerModalBody: {
    flex: 1,
    padding: 24,
  },
  prayerModalSectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  versesContainer: {
    marginBottom: 32,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    marginBottom: 24,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  
  // Simplified Modal
  overlayModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  simplifiedContainer: {
    borderRadius: 24,
    padding: 32,
    maxWidth: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  simplifiedTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  simplifiedText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 28,
  },
  simplifiedButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  simplifiedButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
});

export default EnhancedPrayerCard;
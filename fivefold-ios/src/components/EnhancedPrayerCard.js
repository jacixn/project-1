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
  
  // Core states
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Simple modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  
  // Form states
  const [prayerName, setPrayerName] = useState('');
  const [prayerTime, setPrayerTime] = useState('06:00');
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [simplifiedText, setSimplifiedText] = useState('');

  // Load prayers on mount
  useEffect(() => {
    loadPrayers();
  }, []);

  const loadPrayers = async () => {
    try {
      setLoading(true);
      console.log('Loading prayers...');
      await PrayerManagementService.checkAndReactivatePrayers();
      const storedPrayers = await PrayerManagementService.getPrayers();
      setPrayers(storedPrayers);
      console.log('Prayers loaded:', storedPrayers);
    } catch (error) {
      console.error('Error loading prayers:', error);
      Alert.alert('Error', 'Failed to load prayers');
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
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

  // ADD PRAYER FUNCTIONS
  const handleAddPress = () => {
    console.log('ADD BUTTON PRESSED');
    setPrayerName('');
    setPrayerTime('06:00');
    setShowAddModal(true);
    hapticFeedback.light();
  };

  const handleAddSave = async () => {
    if (!prayerName.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    try {
      console.log('SAVING PRAYER:', prayerName, prayerTime);
      const result = await PrayerManagementService.addPrayer(prayerName.trim(), prayerTime);
      
      if (result.success) {
        setShowAddModal(false);
        await loadPrayers();
        hapticFeedback.success();
        Alert.alert('Success', 'Prayer added! 🙏');
      } else {
        Alert.alert('Error', result.error || 'Failed to add prayer');
      }
    } catch (error) {
      console.error('Error adding prayer:', error);
      Alert.alert('Error', 'Failed to add prayer');
    }
  };

  const handleAddCancel = () => {
    console.log('ADD CANCELLED');
    setShowAddModal(false);
    setPrayerName('');
    setPrayerTime('06:00');
  };

  // TIME PICKER FUNCTIONS
  const handleTimePress = (prayer = null) => {
    console.log('TIME BUTTON PRESSED for:', prayer ? prayer.name : 'new prayer');
    setEditingPrayer(prayer);
    if (prayer) {
      setPrayerTime(prayer.time);
    }
    setShowTimeModal(true);
    hapticFeedback.light();
  };

  const handleTimeSelected = async (time) => {
    console.log('TIME SELECTED:', time, 'for:', editingPrayer ? editingPrayer.name : 'new prayer');
    
    if (!editingPrayer) {
      // New prayer - just update the time
      setPrayerTime(time);
      setShowTimeModal(false);
      return;
    }

    // Existing prayer - update in database
    try {
      const result = await PrayerManagementService.updatePrayerTime(editingPrayer.id, time);
      
      if (result.success) {
        setShowTimeModal(false);
        await loadPrayers();
        hapticFeedback.success();
        Alert.alert('Success', 'Prayer time updated! ⏰');
      } else {
        Alert.alert('Error', result.error || 'Failed to update time');
      }
    } catch (error) {
      console.error('Error updating time:', error);
      Alert.alert('Error', 'Failed to update time');
    }
  };

  const handleTimeCancel = () => {
    console.log('TIME CANCELLED');
    setShowTimeModal(false);
    setEditingPrayer(null);
  };

  // EDIT PRAYER FUNCTIONS
  const handleEditPress = (prayer) => {
    console.log('EDIT BUTTON PRESSED for:', prayer.name);
    setEditingPrayer(prayer);
    setPrayerName(prayer.name);
    setShowEditModal(true);
    hapticFeedback.light();
  };

  const handleEditSave = async () => {
    if (!prayerName.trim() || !editingPrayer) return;
    
    try {
      console.log('SAVING EDIT:', prayerName, 'for:', editingPrayer.name);
      const result = await PrayerManagementService.updatePrayerName(editingPrayer.id, prayerName.trim());
      
      if (result.success) {
        setShowEditModal(false);
        await loadPrayers();
        hapticFeedback.success();
        Alert.alert('Success', 'Prayer name updated! ✏️');
      } else {
        Alert.alert('Error', result.error || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    }
  };

  const handleEditCancel = () => {
    console.log('EDIT CANCELLED');
    setShowEditModal(false);
    setEditingPrayer(null);
    setPrayerName('');
  };

  // DELETE PRAYER FUNCTION
  const handleDeletePress = (prayer) => {
    console.log('DELETE BUTTON PRESSED for:', prayer.name);
    Alert.alert(
      'Delete Prayer',
      `Are you sure you want to delete "${prayer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('DELETING PRAYER:', prayer.name);
              const result = await PrayerManagementService.deletePrayer(prayer.id);
              if (result.success) {
                await loadPrayers();
                hapticFeedback.success();
                Alert.alert('Success', 'Prayer deleted! 🗑️');
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

  // PRAYER MODAL FUNCTIONS
  const handlePrayerPress = (prayer) => {
    console.log('PRAYER CARD PRESSED:', prayer.name);
    if (isPrayerActive(prayer)) {
      setSelectedPrayer(prayer);
      setShowPrayerModal(true);
      hapticFeedback.light();
    }
  };

  const handlePrayerComplete = async (prayer) => {
    try {
      console.log('COMPLETING PRAYER:', prayer.name);
      const result = await PrayerManagementService.completePrayer(prayer.id);
      
      if (result.success) {
        // Award points
        await awardPoints(500);
        setShowPrayerModal(false);
        await loadPrayers();
        hapticFeedback.success();
        
        Alert.alert(
          '🙏 Prayer Completed!',
          'You earned 500 points! Your prayer will be available again in 24 hours.',
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

  // VERSE FUNCTIONS
  const handleSimplifyVerse = async (verse) => {
    try {
      console.log('SIMPLIFYING VERSE:', verse.reference);
      hapticFeedback.light();
      const result = await VerseSimplificationService.simplifyVerse(verse);
      setSimplifiedText(result.simplified);
      setShowSimplified(true);
      
      if (!result.success) {
        setTimeout(() => {
          Alert.alert('Note', 'Using offline explanation. Configure API key in Settings for AI simplification.');
        }, 2000);
      }
    } catch (error) {
      console.error('Error simplifying verse:', error);
      Alert.alert('Error', 'Could not simplify verse');
    }
  };

  const handleDiscussVerse = (verse) => {
    console.log('DISCUSSING VERSE:', verse.reference);
    setSelectedVerse(verse);
    setShowChatModal(true);
    hapticFeedback.light();
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
        <View>
          <Text style={[styles.title, { color: theme.text }]}>🙏 My Prayers</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {prayers.length} prayer{prayers.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={handleAddPress}
          activeOpacity={0.8}
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
              Create your first prayer to start your spiritual journey
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={handleAddPress}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Add Prayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          prayers.map((prayer) => {
            const isActive = isPrayerActive(prayer);
            const hoursLeft = getTimeUntilActive(prayer);

            return (
              <View key={prayer.id} style={[
                styles.prayerCard,
                { backgroundColor: theme.card + 'F0' },
                !isActive && styles.inactivePrayerCard
              ]}>
                <TouchableOpacity
                  style={styles.prayerContent}
                  onPress={() => handlePrayerPress(prayer)}
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
                            Ready
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
                        handleEditPress(prayer);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="edit" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.quickActionButton, { backgroundColor: theme.textSecondary + '20' }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTimePress(prayer);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.quickActionButton, { backgroundColor: theme.error + '20' }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeletePress(prayer);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete" size={16} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleAddCancel}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F5' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleAddCancel}>
                <MaterialIcons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add New Prayer
              </Text>
              <TouchableOpacity onPress={handleAddSave}>
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
                  value={prayerName}
                  onChangeText={setPrayerName}
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
                  onPress={() => handleTimePress()}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="schedule" size={24} color={theme.primary} />
                  <Text style={[styles.timeText, { color: theme.text }]}>
                    {formatTime(prayerTime)}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Edit Prayer Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleEditCancel}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F5' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleEditCancel}>
                <MaterialIcons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Prayer Name
              </Text>
              <TouchableOpacity onPress={handleEditSave}>
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
                  value={prayerName}
                  onChangeText={setPrayerName}
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
        onClose={handleTimeCancel}
        onTimeSelected={handleTimeSelected}
        currentTime={prayerTime}
        title={editingPrayer ? "Edit Prayer Time" : "Select Prayer Time"}
      />

      {/* Prayer Detail Modal */}
      <Modal
        visible={showPrayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrayerModal(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.prayerModalContent, { backgroundColor: theme.background + 'F8' }]}>
            {selectedPrayer && (
              <>
                <View style={styles.prayerModalHeader}>
                  <TouchableOpacity onPress={() => setShowPrayerModal(false)}>
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
                    {selectedPrayer.verses?.map((verse, index) => (
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
                            onPress={() => handleSimplifyVerse(verse)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="child-care" size={18} color={theme.success} />
                            <Text style={[styles.actionButtonText, { color: theme.success }]}>Simple</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.actionButton, { 
                              backgroundColor: theme.primary + '15',
                              borderColor: theme.primary + '30'
                            }]}
                            onPress={() => handleDiscussVerse(verse)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="chat" size={18} color={theme.primary} />
                            <Text style={[styles.actionButtonText, { color: theme.primary }]}>Discuss</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: theme.success }]}
                    onPress={() => handlePrayerComplete(selectedPrayer)}
                    activeOpacity={0.8}
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
              {simplifiedText}
            </Text>
            <TouchableOpacity
              style={[styles.simplifiedButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowSimplified(false)}
              activeOpacity={0.8}
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
import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
  Animated,
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

const { width: screenWidth } = Dimensions.get('window');

const ModernPrayerCard = () => {
  const { theme } = useTheme();
  
  // Core state
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal visibility states
  const [modals, setModals] = useState({
    add: false,
    edit: false,
    time: false,
    prayer: false,
    chat: false,
    simplified: false,
  });
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    time: '06:00',
    editingPrayer: null,
    selectedPrayer: null,
    selectedVerse: null,
    simplifiedText: '',
  });
  
  // Loading states for individual actions
  const [actionLoading, setActionLoading] = useState({
    add: false,
    edit: false,
    delete: false,
    complete: false,
    simplify: false,
  });

  // Initialize and load prayers
  useEffect(() => {
    initializePrayers();
  }, []);

  const initializePrayers = useCallback(async () => {
    try {
      setLoading(true);
      await PrayerManagementService.checkAndReactivatePrayers();
      const storedPrayers = await PrayerManagementService.getPrayers();
      setPrayers(storedPrayers);
    } catch (error) {
      console.error('Error initializing prayers:', error);
      Alert.alert('Error', 'Failed to load prayers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPrayers = useCallback(async () => {
    try {
      setRefreshing(true);
      await PrayerManagementService.checkAndReactivatePrayers();
      const storedPrayers = await PrayerManagementService.getPrayers();
      setPrayers(storedPrayers);
    } catch (error) {
      console.error('Error refreshing prayers:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Modal management
  const openModal = useCallback((modalName, data = {}) => {
    console.log('Opening modal:', modalName, 'with data:', data);
    setModals(prev => ({ ...prev, [modalName]: true }));
    if (data) {
      setFormData(prev => ({ ...prev, ...data }));
    }
    hapticFeedback.light();
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    // Reset form data when closing modals
    if (modalName === 'add' || modalName === 'edit') {
      setFormData(prev => ({
        ...prev,
        name: '',
        time: '06:00',
        editingPrayer: null,
      }));
    }
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({
      add: false,
      edit: false,
      time: false,
      prayer: false,
      chat: false,
      simplified: false,
    });
    setFormData({
      name: '',
      time: '06:00',
      editingPrayer: null,
      selectedPrayer: null,
      selectedVerse: null,
      simplifiedText: '',
    });
  }, []);

  // Prayer actions
  const handleAddPrayer = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, add: true }));
      const result = await PrayerManagementService.addPrayer(
        formData.name.trim(),
        formData.time
      );
      
      if (result.success) {
        await refreshPrayers();
        closeModal('add');
        hapticFeedback.success();
        Alert.alert('Success', 'Prayer added successfully! 🙏');
      } else {
        Alert.alert('Error', result.error || 'Failed to add prayer');
      }
    } catch (error) {
      console.error('Error adding prayer:', error);
      Alert.alert('Error', 'Failed to add prayer. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, add: false }));
    }
  }, [formData.name, formData.time, refreshPrayers, closeModal]);

  const handleEditPrayerName = useCallback(async () => {
    if (!formData.name.trim() || !formData.editingPrayer) return;
    
    try {
      setActionLoading(prev => ({ ...prev, edit: true }));
      const result = await PrayerManagementService.updatePrayerName(
        formData.editingPrayer.id,
        formData.name.trim()
      );
      
      if (result.success) {
        await refreshPrayers();
        closeModal('edit');
        hapticFeedback.success();
      } else {
        Alert.alert('Error', result.error || 'Failed to update prayer name');
      }
    } catch (error) {
      console.error('Error editing prayer name:', error);
      Alert.alert('Error', 'Failed to update prayer name');
    } finally {
      setActionLoading(prev => ({ ...prev, edit: false }));
    }
  }, [formData.name, formData.editingPrayer, refreshPrayers, closeModal]);

  const handleEditPrayerTime = useCallback(async (time) => {
    console.log('handleEditPrayerTime called with:', time, 'editingPrayer:', formData.editingPrayer);
    
    if (!formData.editingPrayer) {
      // Adding new prayer time
      console.log('Setting new prayer time:', time);
      setFormData(prev => ({ ...prev, time }));
      closeModal('time');
      hapticFeedback.light();
      return;
    }

    try {
      const result = await PrayerManagementService.updatePrayerTime(
        formData.editingPrayer.id,
        time
      );
      
      if (result.success) {
        await refreshPrayers();
        closeModal('time');
        hapticFeedback.success();
      } else {
        Alert.alert('Error', result.error || 'Failed to update prayer time');
      }
    } catch (error) {
      console.error('Error editing prayer time:', error);
      Alert.alert('Error', 'Failed to update prayer time');
    }
  }, [formData.editingPrayer, refreshPrayers, closeModal]);

  const handleDeletePrayer = useCallback((prayerId) => {
    Alert.alert(
      'Delete Prayer',
      'Are you sure you want to delete this prayer? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(prev => ({ ...prev, delete: true }));
              const result = await PrayerManagementService.deletePrayer(prayerId);
              if (result.success) {
                await refreshPrayers();
                hapticFeedback.success();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete prayer');
              }
            } catch (error) {
              console.error('Error deleting prayer:', error);
              Alert.alert('Error', 'Failed to delete prayer');
            } finally {
              setActionLoading(prev => ({ ...prev, delete: false }));
            }
          }
        }
      ]
    );
  }, [refreshPrayers]);

  const handleCompletePrayer = useCallback(async (prayerId) => {
    try {
      setActionLoading(prev => ({ ...prev, complete: true }));
      const result = await PrayerManagementService.completePrayer(prayerId);
      
      if (result.success) {
        // Award 500 points
        await awardPoints(500);
        await refreshPrayers();
        closeModal('prayer');
        hapticFeedback.success();
        
        Alert.alert(
          '🙏 Prayer Completed!',
          'Wonderful! You earned 500 points. Your prayer will be available again in 24 hours with fresh verses from God\'s Word.',
          [{ text: 'Amen! 🙏', style: 'default' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to complete prayer');
      }
    } catch (error) {
      console.error('Error completing prayer:', error);
      Alert.alert('Error', 'Failed to complete prayer');
    } finally {
      setActionLoading(prev => ({ ...prev, complete: false }));
    }
  }, [refreshPrayers, closeModal]);

  const awardPoints = useCallback(async (points) => {
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
      
      return updatedStats;
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }, []);

  // Verse actions
  const handleSimplifyVerse = useCallback(async (verse) => {
    try {
      setActionLoading(prev => ({ ...prev, simplify: true }));
      hapticFeedback.light();
      
      const result = await VerseSimplificationService.simplifyVerse(verse);
      setFormData(prev => ({ ...prev, simplifiedText: result.simplified }));
      openModal('simplified');
      
      if (!result.success) {
        setTimeout(() => {
          Alert.alert(
            'Note',
            'Using offline explanation. For AI-powered simplification, please configure your API key in Settings.'
          );
        }, 2000);
      }
    } catch (error) {
      console.error('Error simplifying verse:', error);
      Alert.alert('Error', 'Could not simplify verse. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, simplify: false }));
    }
  }, [openModal]);

  const handleDiscussVerse = useCallback((verse) => {
    setFormData(prev => ({ ...prev, selectedVerse: verse }));
    openModal('chat');
  }, [openModal]);

  // Utility functions
  const formatTime = useCallback((timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }, []);

  const isPrayerActive = useCallback((prayer) => {
    return PrayerManagementService.isPrayerActive(prayer);
  }, []);

  const getTimeUntilActive = useCallback((prayer) => {
    return PrayerManagementService.getTimeUntilActive(prayer);
  }, []);

  // Render functions
  const renderVerseCard = useCallback((verse, index) => (
    <View key={verse.id} style={[styles.verseCard, { backgroundColor: theme.card + 'F0' }]}>
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
      
      <View style={styles.verseActions}>
        <TouchableOpacity
          style={[styles.verseActionButton, { 
            backgroundColor: theme.success + '20',
            borderColor: theme.success + '40'
          }]}
          onPress={() => handleSimplifyVerse(verse)}
          disabled={actionLoading.simplify}
        >
          {actionLoading.simplify ? (
            <ActivityIndicator size="small" color={theme.success} />
          ) : (
            <MaterialIcons name="child-care" size={18} color={theme.success} />
          )}
          <Text style={[styles.verseActionText, { color: theme.success }]}>
            Simple
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.verseActionButton, { 
            backgroundColor: theme.primary + '20',
            borderColor: theme.primary + '40'
          }]}
          onPress={() => handleDiscussVerse(verse)}
        >
          <MaterialIcons name="chat" size={18} color={theme.primary} />
          <Text style={[styles.verseActionText, { color: theme.primary }]}>
            Discuss
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [theme, handleSimplifyVerse, handleDiscussVerse, actionLoading.simplify]);

  const renderPrayerCard = useCallback((prayer) => {
    const isActive = isPrayerActive(prayer);
    const hoursLeft = getTimeUntilActive(prayer);

    return (
      <View key={prayer.id} style={[
        styles.prayerCard,
        { backgroundColor: theme.card + 'E0' },
        !isActive && styles.inactivePrayerCard
      ]}>
        <TouchableOpacity
          style={[styles.prayerContent, isActive && styles.activePrayerContent]}
          onPress={() => isActive && openModal('prayer', { selectedPrayer: prayer })}
          disabled={!isActive}
          activeOpacity={0.8}
        >
          <View style={styles.prayerMainInfo}>
            <View style={styles.prayerTitleRow}>
              <View style={[
                styles.prayerIcon,
                { backgroundColor: isActive ? theme.primary : theme.textTertiary }
              ]}>
                <MaterialIcons 
                  name="favorite" 
                  size={16} 
                  color="#ffffff" 
                />
              </View>
              <Text style={[styles.prayerName, { color: theme.text }]}>
                {prayer.name}
              </Text>
              {isActive && (
                <MaterialIcons 
                  name="keyboard-arrow-right" 
                  size={24} 
                  color={theme.primary} 
                />
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
                openModal('edit', { editingPrayer: prayer, name: prayer.name });
              }}
            >
              <MaterialIcons name="edit" size={16} color={theme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.textSecondary + '20' }]}
              onPress={(e) => {
                e.stopPropagation();
                console.log('Quick time edit pressed for prayer:', prayer.name);
                openModal('time', { editingPrayer: prayer });
              }}
            >
              <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.error + '20' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleDeletePrayer(prayer.id);
              }}
            >
              <MaterialIcons name="delete" size={16} color={theme.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [
    theme,
    isPrayerActive,
    getTimeUntilActive,
    formatTime,
    openModal,
    handleDeletePrayer,
  ]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card + 'E0' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading your prayers...
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
          onPress={() => openModal('add')}
        >
          <MaterialIcons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Prayer List */}
      <ScrollView 
        style={styles.prayersList} 
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={refreshPrayers}
      >
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
              onPress={() => openModal('add')}
            >
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Add Prayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          prayers.map(renderPrayerCard)
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={modals.add}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => closeModal('add')}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F5' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => closeModal('add')}>
                <MaterialIcons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add New Prayer
              </Text>
              <TouchableOpacity 
                onPress={handleAddPrayer}
                disabled={actionLoading.add}
              >
                {actionLoading.add ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
                )}
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
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
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
                    console.log('Time selector pressed');
                    openModal('time', { editingPrayer: null });
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="schedule" size={24} color={theme.primary} />
                  <Text style={[styles.timeText, { color: theme.text }]}>
                    {formatTime(formData.time)}
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
        visible={modals.edit}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => closeModal('edit')}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F5' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => closeModal('edit')}>
                <MaterialIcons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Prayer Name
              </Text>
              <TouchableOpacity 
                onPress={handleEditPrayerName}
                disabled={actionLoading.edit}
              >
                {actionLoading.edit ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
                )}
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
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  autoFocus
                />
              </View>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Time Picker Modal */}
      <TimePicker
        visible={modals.time}
        onClose={() => {
          console.log('TimePicker onClose called');
          closeModal('time');
        }}
        onTimeSelected={(time) => {
          console.log('TimePicker onTimeSelected called with:', time);
          handleEditPrayerTime(time);
        }}
        currentTime={formData.editingPrayer?.time || formData.time}
        title={formData.editingPrayer ? "Edit Prayer Time" : "Select Prayer Time"}
      />

      {/* Prayer Detail Modal */}
      <Modal
        visible={modals.prayer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => closeModal('prayer')}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.prayerModalContent, { backgroundColor: theme.background + 'F8' }]}>
            {formData.selectedPrayer && (
              <>
                <View style={styles.prayerModalHeader}>
                  <TouchableOpacity onPress={() => closeModal('prayer')}>
                    <MaterialIcons name="close" size={28} color={theme.text} />
                  </TouchableOpacity>
                  <View style={styles.prayerModalTitleContainer}>
                    <MaterialIcons name="favorite" size={24} color={theme.primary} />
                    <Text style={[styles.prayerModalTitle, { color: theme.text }]}>
                      {formData.selectedPrayer.name}
                    </Text>
                  </View>
                  <View style={styles.prayerModalTime}>
                    <MaterialIcons name="schedule" size={18} color={theme.textSecondary} />
                    <Text style={[styles.prayerModalTimeText, { color: theme.textSecondary }]}>
                      {formatTime(formData.selectedPrayer.time)}
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.prayerModalBody} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.prayerModalSectionTitle, { color: theme.text }]}>
                    📖 Today's Verses
                  </Text>
                  
                  <View style={styles.versesContainer}>
                    {formData.selectedPrayer.verses?.map((verse, index) => 
                      renderVerseCard(verse, index)
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: theme.success }]}
                    onPress={() => handleCompletePrayer(formData.selectedPrayer.id)}
                    disabled={actionLoading.complete}
                  >
                    {actionLoading.complete ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <MaterialIcons name="check-circle" size={28} color="#ffffff" />
                    )}
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
        visible={modals.simplified}
        animationType="fade"
        transparent={true}
        onRequestClose={() => closeModal('simplified')}
      >
        <BlurView intensity={95} tint="dark" style={styles.overlayModal}>
          <View style={[styles.simplifiedContainer, { backgroundColor: theme.card + 'F8' }]}>
            <Text style={[styles.simplifiedTitle, { color: theme.text }]}>
              Simple Explanation
            </Text>
            <Text style={[styles.simplifiedText, { color: theme.textSecondary }]}>
              {formData.simplifiedText}
            </Text>
            <TouchableOpacity
              style={[styles.simplifiedButton, { backgroundColor: theme.primary }]}
              onPress={() => closeModal('simplified')}
            >
              <Text style={styles.simplifiedButtonText}>Got it! 👍</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* AI Chat Modal */}
      <Modal
        visible={modals.chat}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => closeModal('chat')}
      >
        <AiBibleChat
          initialVerse={formData.selectedVerse}
          onClose={() => closeModal('chat')}
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
  activePrayerContent: {
    backgroundColor: 'rgba(255,255,255,0.08)',
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
  verseActionButton: {
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
  verseActionText: {
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
    maxWidth: screenWidth - 48,
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

export default ModernPrayerCard;
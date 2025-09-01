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
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: screenWidth } = Dimensions.get('window');

const EnhancedPrayerCard = () => {
  const { theme } = useTheme();
  const [prayers, setPrayers] = useState([]);
  const [expandedPrayer, setExpandedPrayer] = useState(null);
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
  const [animationValues] = useState(new Map());

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

  const togglePrayerExpansion = (prayerId) => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
    });
    
    hapticFeedback.light();
    setExpandedPrayer(expandedPrayer === prayerId ? null : prayerId);
  };

  const getAnimatedValue = (prayerId) => {
    if (!animationValues.has(prayerId)) {
      animationValues.set(prayerId, new Animated.Value(0));
    }
    return animationValues.get(prayerId);
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderVerse = (verse, index) => (
    <BlurView key={verse.id} intensity={15} tint="light" style={[
      styles.verseCard,
      { 
        backgroundColor: theme.card + '90',
        marginTop: index === 0 ? 0 : 12,
      }
    ]}>
      <View style={styles.verseHeader}>
        <View style={[styles.verseNumber, { backgroundColor: theme.primary }]}>
          <Text style={styles.verseNumberText}>{index + 1}</Text>
        </View>
        <Text style={[styles.verseReference, { color: theme.primary }]}>{verse.reference}</Text>
      </View>
      
      <Text style={[styles.verseText, { color: theme.text }]}>{verse.text}</Text>
      
      <View style={styles.verseActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.simpleButton, { 
            backgroundColor: theme.success + '15',
            borderColor: theme.success + '30'
          }]}
          onPress={() => simplifyVerse(verse)}
        >
          <MaterialIcons name="child-care" size={18} color={theme.success} />
          <Text style={[styles.actionButtonText, { color: theme.success }]}>Simple</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.discussButton, { 
            backgroundColor: theme.primary + '15',
            borderColor: theme.primary + '30'
          }]}
          onPress={() => openDiscussion(verse)}
        >
          <MaterialIcons name="chat" size={18} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.primary }]}>Discuss</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  const renderPrayer = (prayer) => {
    const isActive = isPrayerActive(prayer);
    const hoursLeft = getTimeUntilActive(prayer);
    const isExpanded = expandedPrayer === prayer.id;

    return (
      <BlurView key={prayer.id} intensity={25} tint="light" style={[
        styles.prayerCard,
        !isActive && styles.inactivePrayerCard,
        isExpanded && styles.expandedPrayerCard
      ]}>
        {/* Prayer Header - Always Visible */}
        <TouchableOpacity
          style={styles.prayerHeader}
          onPress={() => isActive && togglePrayerExpansion(prayer.id)}
          disabled={!isActive}
        >
          <View style={styles.prayerMainInfo}>
            <View style={styles.prayerTitleRow}>
              <View style={[styles.prayerIcon, { backgroundColor: isActive ? theme.primary : theme.textTertiary }]}>
                <MaterialIcons 
                  name="favorite" 
                  size={16} 
                  color="#ffffff" 
                />
              </View>
              <Text style={[styles.prayerName, { color: theme.text }]}>{prayer.name}</Text>
              {isActive && (
                <MaterialIcons 
                  name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color={theme.textSecondary} 
                />
              )}
            </View>
            
            <View style={styles.prayerMetaRow}>
              <View style={styles.timeContainer}>
                <MaterialIcons name="schedule" size={14} color={theme.primary} />
                <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>
                  {formatTime(prayer.time)}
                </Text>
              </View>
              
              {!isActive && hoursLeft && (
                <View style={[styles.cooldownBadge, { backgroundColor: theme.warning + '20' }]}>
                  <MaterialIcons name="timer" size={12} color={theme.warning} />
                  <Text style={[styles.cooldownText, { color: theme.warning }]}>
                    {hoursLeft}h left
                  </Text>
                </View>
              )}
              
              {isActive && (
                <View style={[styles.statusBadge, { backgroundColor: theme.success + '20' }]}>
                  <MaterialIcons name="check-circle" size={12} color={theme.success} />
                  <Text style={[styles.statusText, { color: theme.success }]}>Ready</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.primary + '15' }]}
              onPress={(e) => {
                e.stopPropagation();
                setEditingPrayer(prayer);
                setNewPrayerName(prayer.name);
                setShowEditModal(true);
              }}
            >
              <MaterialIcons name="edit" size={16} color={theme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.textSecondary + '15' }]}
              onPress={(e) => {
                e.stopPropagation();
                setEditingPrayer(prayer);
                setNewPrayerTime(prayer.time);
                setShowTimeModal(true);
              }}
            >
              <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.error + '15' }]}
              onPress={(e) => {
                e.stopPropagation();
                deletePrayer(prayer.id);
              }}
            >
              <MaterialIcons name="delete" size={16} color={theme.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Expanded Content - Verses and Actions */}
        {isExpanded && isActive && (
          <View style={styles.expandedContent}>
            <View style={styles.versesSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Verses</Text>
              <View style={styles.versesContainer}>
                {prayer.verses.map((verse, index) => renderVerse(verse, index))}
              </View>
            </View>
            
            {/* Complete Prayer Button */}
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: theme.success }]}
              onPress={() => completePrayer(prayer.id)}
            >
              <MaterialIcons name="check-circle" size={22} color="#ffffff" />
              <Text style={styles.completeButtonText}>Complete Prayer</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
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
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  prayersList: {
    maxHeight: 700,
  },
  emptyState: {
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  
  // Prayer Card Styles
  prayerCard: {
    borderRadius: 16,
    padding: 0,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inactivePrayerCard: {
    opacity: 0.7,
  },
  expandedPrayerCard: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // Prayer Header Styles
  prayerHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontWeight: '500',
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
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Expanded Content
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  versesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  versesContainer: {
    gap: 12,
  },
  
  // Verse Card Styles
  verseCard: {
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
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
    fontSize: 13,
    fontWeight: '700',
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Complete Button
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Modal Styles
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
    fontSize: 20,
    fontWeight: '700',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Simplified Modal
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
    borderRadius: 20,
    padding: 28,
    maxWidth: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  simplifiedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  simplifiedText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  closeButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EnhancedPrayerCard;

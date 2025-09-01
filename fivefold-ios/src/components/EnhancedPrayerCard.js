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
  Pressable,
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

const PrayerSection = () => {
  const { theme } = useTheme();
  
  // Prayer data
  const [prayerList, setPrayerList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal visibility
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [prayerDetailsVisible, setPrayerDetailsVisible] = useState(false);
  const [verseSimpleVisible, setVerseSimpleVisible] = useState(false);
  const [verseChatVisible, setVerseChatVisible] = useState(false);
  
  // Form inputs
  const [inputName, setInputName] = useState('');
  const [inputTime, setInputTime] = useState('06:00');
  const [currentPrayer, setCurrentPrayer] = useState(null);
  const [currentVerse, setCurrentVerse] = useState(null);
  const [simpleVerseText, setSimpleVerseText] = useState('');

  // Load prayers when component mounts
  useEffect(() => {
    fetchPrayers();
  }, []);

  const fetchPrayers = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 FETCHING PRAYERS...');
      await PrayerManagementService.checkAndReactivatePrayers();
      const prayers = await PrayerManagementService.getPrayers();
      setPrayerList(prayers);
      console.log('✅ PRAYERS LOADED:', prayers.length);
    } catch (error) {
      console.error('❌ ERROR LOADING PRAYERS:', error);
      Alert.alert('Error', 'Could not load prayers');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const convertTime = (timeStr) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${period}`;
  };

  const checkIfActive = (prayer) => {
    return PrayerManagementService.isPrayerActive(prayer);
  };

  const getHoursLeft = (prayer) => {
    return PrayerManagementService.getTimeUntilActive(prayer);
  };

  // ADD PRAYER FUNCTIONS
  const openAddPrayerModal = () => {
    console.log('🆕 OPENING ADD PRAYER MODAL');
    setInputName('');
    setInputTime('06:00');
    setAddModalVisible(true);
    hapticFeedback.light();
  };

  const closeAddPrayerModal = () => {
    console.log('❌ CLOSING ADD PRAYER MODAL');
    setAddModalVisible(false);
    setInputName('');
    setInputTime('06:00');
  };

  const saveNewPrayer = async () => {
    if (!inputName.trim()) {
      Alert.alert('Missing Name', 'Please enter a prayer name');
      return;
    }

    try {
      console.log('💾 SAVING NEW PRAYER:', inputName, inputTime);
      const result = await PrayerManagementService.addPrayer(inputName.trim(), inputTime);
      
      if (result.success) {
        closeAddPrayerModal();
        await fetchPrayers();
        hapticFeedback.success();
        Alert.alert('Prayer Added! 🙏', `"${inputName}" has been added to your prayers.`);
      } else {
        Alert.alert('Save Failed', result.error || 'Could not save prayer');
      }
    } catch (error) {
      console.error('❌ ERROR SAVING PRAYER:', error);
      Alert.alert('Error', 'Failed to save prayer');
    }
  };

  // TIME PICKER FUNCTIONS
  const openTimePicker = (prayer = null) => {
    console.log('⏰ OPENING TIME PICKER FOR:', prayer ? prayer.name : 'new prayer');
    setCurrentPrayer(prayer);
    if (prayer) {
      setInputTime(prayer.time);
    }
    setTimePickerVisible(true);
    hapticFeedback.light();
  };

  const closeTimePicker = () => {
    console.log('❌ CLOSING TIME PICKER');
    setTimePickerVisible(false);
    setCurrentPrayer(null);
  };

  const saveSelectedTime = async (selectedTime) => {
    console.log('⏰ TIME SELECTED:', selectedTime);
    
    if (!currentPrayer) {
      // For new prayer
      setInputTime(selectedTime);
      closeTimePicker();
      return;
    }

    // For existing prayer
    try {
      const result = await PrayerManagementService.updatePrayerTime(currentPrayer.id, selectedTime);
      
      if (result.success) {
        closeTimePicker();
        await fetchPrayers();
        hapticFeedback.success();
        Alert.alert('Time Updated! ⏰', `Prayer time changed to ${convertTime(selectedTime)}`);
      } else {
        Alert.alert('Update Failed', result.error || 'Could not update time');
      }
    } catch (error) {
      console.error('❌ ERROR UPDATING TIME:', error);
      Alert.alert('Error', 'Failed to update time');
    }
  };

  // EDIT PRAYER FUNCTIONS
  const openEditModal = (prayer) => {
    console.log('✏️ OPENING EDIT MODAL FOR:', prayer.name);
    setCurrentPrayer(prayer);
    setInputName(prayer.name);
    setEditModalVisible(true);
    hapticFeedback.light();
  };

  const closeEditModal = () => {
    console.log('❌ CLOSING EDIT MODAL');
    setEditModalVisible(false);
    setCurrentPrayer(null);
    setInputName('');
  };

  const saveEditedName = async () => {
    if (!inputName.trim() || !currentPrayer) return;
    
    try {
      console.log('💾 SAVING EDITED NAME:', inputName);
      const result = await PrayerManagementService.updatePrayerName(currentPrayer.id, inputName.trim());
      
      if (result.success) {
        closeEditModal();
        await fetchPrayers();
        hapticFeedback.success();
        Alert.alert('Name Updated! ✏️', `Prayer renamed to "${inputName}"`);
      } else {
        Alert.alert('Update Failed', result.error || 'Could not update name');
      }
    } catch (error) {
      console.error('❌ ERROR UPDATING NAME:', error);
      Alert.alert('Error', 'Failed to update name');
    }
  };

  // DELETE PRAYER FUNCTION
  const deletePrayerWithConfirm = (prayer) => {
    console.log('🗑️ DELETE REQUESTED FOR:', prayer.name);
    Alert.alert(
      'Delete Prayer',
      `Are you sure you want to delete "${prayer.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ DELETING PRAYER:', prayer.name);
              const result = await PrayerManagementService.deletePrayer(prayer.id);
              if (result.success) {
                await fetchPrayers();
                hapticFeedback.success();
                Alert.alert('Prayer Deleted! 🗑️', `"${prayer.name}" has been removed.`);
              } else {
                Alert.alert('Delete Failed', result.error || 'Could not delete prayer');
              }
            } catch (error) {
              console.error('❌ ERROR DELETING PRAYER:', error);
              Alert.alert('Error', 'Failed to delete prayer');
            }
          }
        }
      ]
    );
  };

  // PRAYER DETAILS FUNCTIONS
  const openPrayerDetails = (prayer) => {
    console.log('📖 OPENING PRAYER DETAILS FOR:', prayer.name);
    if (checkIfActive(prayer)) {
      setCurrentPrayer(prayer);
      setPrayerDetailsVisible(true);
      hapticFeedback.light();
    }
  };

  const closePrayerDetails = () => {
    console.log('❌ CLOSING PRAYER DETAILS');
    setPrayerDetailsVisible(false);
    setCurrentPrayer(null);
  };

  const completePrayerAction = async (prayer) => {
    try {
      console.log('✅ COMPLETING PRAYER:', prayer.name);
      const result = await PrayerManagementService.completePrayer(prayer.id);
      
      if (result.success) {
        // Award points
        await giveUserPoints(500);
        closePrayerDetails();
        await fetchPrayers();
        hapticFeedback.success();
        
        Alert.alert(
          'Prayer Completed! 🙏',
          'Wonderful! You earned 500 points. Your prayer will return in 24 hours with fresh verses.',
          [{ text: 'Amen! 🙏', style: 'default' }]
        );
      } else {
        Alert.alert('Complete Failed', result.error || 'Could not complete prayer');
      }
    } catch (error) {
      console.error('❌ ERROR COMPLETING PRAYER:', error);
      Alert.alert('Error', 'Failed to complete prayer');
    }
  };

  const giveUserPoints = async (points) => {
    try {
      const stats = await getStoredData('userStats') || {
        points: 0,
        level: 1,
        completedTasks: 0,
        streak: 0,
        prayersCompleted: 0
      };
      
      const newStats = {
        ...stats,
        points: stats.points + points,
        prayersCompleted: (stats.prayersCompleted || 0) + 1
      };
      
      newStats.level = Math.floor(newStats.points / 1000) + 1;
      await saveData('userStats', newStats);
    } catch (error) {
      console.error('❌ ERROR GIVING POINTS:', error);
    }
  };

  // VERSE FUNCTIONS
  const simplifyVerseForUser = async (verse) => {
    try {
      console.log('🧠 SIMPLIFYING VERSE:', verse.reference);
      hapticFeedback.light();
      const result = await VerseSimplificationService.simplifyVerse(verse);
      setSimpleVerseText(result.simplified);
      setVerseSimpleVisible(true);
      
      if (!result.success) {
        setTimeout(() => {
          Alert.alert('Note', 'Using basic explanation. Set up your API key in Settings for AI explanations.');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ ERROR SIMPLIFYING VERSE:', error);
      Alert.alert('Error', 'Could not simplify verse');
    }
  };

  const discussVerseWithAI = (verse) => {
    console.log('💬 OPENING VERSE DISCUSSION FOR:', verse.reference);
    setCurrentVerse(verse);
    setVerseChatVisible(true);
    hapticFeedback.light();
  };

  // RENDER FUNCTIONS
  const renderVerseItem = (verse, index) => (
    <View key={verse.id} style={[styles.verseContainer, { backgroundColor: theme.card + 'F5' }]}>
      <View style={styles.verseTop}>
        <View style={[styles.verseNumberCircle, { backgroundColor: theme.primary }]}>
          <Text style={styles.verseNumberText}>{index + 1}</Text>
        </View>
        <Text style={[styles.verseRef, { color: theme.primary }]}>{verse.reference}</Text>
      </View>
      
      <Text style={[styles.verseContent, { color: theme.text }]}>{verse.text}</Text>
      
      <View style={styles.verseButtonRow}>
        <Pressable
          style={[styles.verseButton, { 
            backgroundColor: theme.success + '20',
            borderColor: theme.success + '40'
          }]}
          onPress={() => simplifyVerseForUser(verse)}
        >
          <MaterialIcons name="child-care" size={18} color={theme.success} />
          <Text style={[styles.verseButtonText, { color: theme.success }]}>Simple</Text>
        </Pressable>
        
        <Pressable
          style={[styles.verseButton, { 
            backgroundColor: theme.primary + '20',
            borderColor: theme.primary + '40'
          }]}
          onPress={() => discussVerseWithAI(verse)}
        >
          <MaterialIcons name="chat" size={18} color={theme.primary} />
          <Text style={[styles.verseButtonText, { color: theme.primary }]}>Discuss</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPrayerItem = (prayer) => {
    const isActive = checkIfActive(prayer);
    const hoursLeft = getHoursLeft(prayer);

    return (
      <View key={prayer.id} style={[
        styles.prayerContainer,
        { backgroundColor: theme.card + 'F2' },
        !isActive && styles.inactivePrayer
      ]}>
        <Pressable
          style={styles.prayerMainArea}
          onPress={() => openPrayerDetails(prayer)}
          disabled={!isActive}
        >
          <View style={styles.prayerInfo}>
            <View style={styles.prayerTitleArea}>
              <View style={[
                styles.prayerIconCircle,
                { backgroundColor: isActive ? theme.primary : theme.textTertiary }
              ]}>
                <MaterialIcons name="favorite" size={18} color="#ffffff" />
              </View>
              <Text style={[styles.prayerTitle, { color: theme.text }]}>
                {prayer.name}
              </Text>
              {isActive && (
                <MaterialIcons name="keyboard-arrow-right" size={26} color={theme.primary} />
              )}
            </View>
            
            <View style={styles.prayerMetaArea}>
              <View style={styles.timeArea}>
                <MaterialIcons name="schedule" size={18} color={theme.primary} />
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                  {convertTime(prayer.time)}
                </Text>
              </View>
              
              {!isActive && hoursLeft && (
                <View style={[styles.cooldownTag, { backgroundColor: theme.warning + '30' }]}>
                  <MaterialIcons name="timer" size={16} color={theme.warning} />
                  <Text style={[styles.cooldownText, { color: theme.warning }]}>
                    {hoursLeft}h left
                  </Text>
                </View>
              )}
              
              {isActive && (
                <View style={[styles.readyTag, { backgroundColor: theme.success + '30' }]}>
                  <MaterialIcons name="check-circle" size={16} color={theme.success} />
                  <Text style={[styles.readyText, { color: theme.success }]}>
                    Ready
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.actionButtonsArea}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.primary + '25' }]}
              onPress={(e) => {
                e.stopPropagation();
                openEditModal(prayer);
              }}
            >
              <MaterialIcons name="edit" size={18} color={theme.primary} />
            </Pressable>
            
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.textSecondary + '25' }]}
              onPress={(e) => {
                e.stopPropagation();
                openTimePicker(prayer);
              }}
            >
              <MaterialIcons name="schedule" size={18} color={theme.textSecondary} />
            </Pressable>
            
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.error + '25' }]}
              onPress={(e) => {
                e.stopPropagation();
                deletePrayerWithConfirm(prayer);
              }}
            >
              <MaterialIcons name="delete" size={18} color={theme.error} />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: theme.card + 'E5' }]}>
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingMessage, { color: theme.text }]}>
            Loading your prayers...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.card + 'E5' }]}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View>
          <Text style={[styles.mainTitle, { color: theme.text }]}>🙏 My Prayers</Text>
          <Text style={[styles.countText, { color: theme.textSecondary }]}>
            {prayerList.length} prayer{prayerList.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={openAddPrayerModal}
        >
          <MaterialIcons name="add" size={30} color="#ffffff" />
        </Pressable>
      </View>

      {/* Prayer List Section */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {prayerList.length === 0 ? (
          <View style={styles.emptyArea}>
            <MaterialIcons name="favorite" size={100} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No prayers yet
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
              Create your first prayer to begin your spiritual journey with daily verses
            </Text>
            <Pressable
              style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
              onPress={openAddPrayerModal}
            >
              <MaterialIcons name="add" size={22} color="#ffffff" />
              <Text style={styles.emptyAddText}>Add Prayer</Text>
            </Pressable>
          </View>
        ) : (
          prayerList.map(renderPrayerItem)
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddPrayerModal}
      >
        <BlurView intensity={100} tint="light" style={styles.fullModal}>
          <SafeAreaView style={[styles.modalBody, { backgroundColor: theme.background + 'F8' }]}>
            <View style={styles.modalTop}>
              <Pressable onPress={closeAddPrayerModal}>
                <MaterialIcons name="close" size={30} color={theme.text} />
              </Pressable>
              <Text style={[styles.modalHeading, { color: theme.text }]}>
                Add New Prayer
              </Text>
              <Pressable onPress={saveNewPrayer}>
                <Text style={[styles.saveText, { color: theme.primary }]}>Save</Text>
              </Pressable>
            </View>
            
            <View style={styles.formArea}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Prayer Name
                </Text>
                <TextInput
                  style={[styles.textField, { 
                    backgroundColor: theme.verseBackground,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="e.g., Morning Prayer, Evening Gratitude"
                  placeholderTextColor={theme.textSecondary}
                  value={inputName}
                  onChangeText={setInputName}
                  autoFocus
                />
              </View>
              
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Prayer Time
                </Text>
                <Pressable
                  style={[styles.timeField, { 
                    backgroundColor: theme.verseBackground,
                    borderColor: theme.border
                  }]}
                  onPress={() => openTimePicker()}
                >
                  <MaterialIcons name="schedule" size={26} color={theme.primary} />
                  <Text style={[styles.timeFieldText, { color: theme.text }]}>
                    {convertTime(inputTime)}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={26} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Edit Prayer Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditModal}
      >
        <BlurView intensity={100} tint="light" style={styles.fullModal}>
          <SafeAreaView style={[styles.modalBody, { backgroundColor: theme.background + 'F8' }]}>
            <View style={styles.modalTop}>
              <Pressable onPress={closeEditModal}>
                <MaterialIcons name="close" size={30} color={theme.text} />
              </Pressable>
              <Text style={[styles.modalHeading, { color: theme.text }]}>
                Edit Prayer Name
              </Text>
              <Pressable onPress={saveEditedName}>
                <Text style={[styles.saveText, { color: theme.primary }]}>Save</Text>
              </Pressable>
            </View>
            
            <View style={styles.formArea}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Prayer Name
                </Text>
                <TextInput
                  style={[styles.textField, { 
                    backgroundColor: theme.verseBackground,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="Prayer name"
                  placeholderTextColor={theme.textSecondary}
                  value={inputName}
                  onChangeText={setInputName}
                  autoFocus
                />
              </View>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Time Picker Modal */}
      <TimePicker
        visible={timePickerVisible}
        onClose={closeTimePicker}
        onTimeSelected={saveSelectedTime}
        currentTime={inputTime}
        title={currentPrayer ? "Edit Prayer Time" : "Select Prayer Time"}
      />

      {/* Prayer Details Modal */}
      <Modal
        visible={prayerDetailsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePrayerDetails}
      >
        <BlurView intensity={100} tint="light" style={styles.fullModal}>
          <SafeAreaView style={[styles.detailsModal, { backgroundColor: theme.background + 'FA' }]}>
            {currentPrayer && (
              <>
                <View style={styles.detailsTop}>
                  <Pressable onPress={closePrayerDetails}>
                    <MaterialIcons name="close" size={30} color={theme.text} />
                  </Pressable>
                  <View style={styles.detailsTitleArea}>
                    <MaterialIcons name="favorite" size={26} color={theme.primary} />
                    <Text style={[styles.detailsTitle, { color: theme.text }]}>
                      {currentPrayer.name}
                    </Text>
                  </View>
                  <View style={styles.detailsTimeArea}>
                    <MaterialIcons name="schedule" size={20} color={theme.textSecondary} />
                    <Text style={[styles.detailsTimeText, { color: theme.textSecondary }]}>
                      {convertTime(currentPrayer.time)}
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.versesHeading, { color: theme.text }]}>
                    📖 Today's Verses
                  </Text>
                  
                  <View style={styles.versesArea}>
                    {currentPrayer.verses?.map((verse, index) => 
                      renderVerseItem(verse, index)
                    )}
                  </View>

                  <Pressable
                    style={[styles.completeBtn, { backgroundColor: theme.success }]}
                    onPress={() => completePrayerAction(currentPrayer)}
                  >
                    <MaterialIcons name="check-circle" size={30} color="#ffffff" />
                    <Text style={styles.completeBtnText}>Complete Prayer</Text>
                    <View style={styles.pointsTag}>
                      <Text style={styles.pointsTagText}>+500 pts</Text>
                    </View>
                  </Pressable>
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Simple Verse Modal */}
      <Modal
        visible={verseSimpleVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setVerseSimpleVisible(false)}
      >
        <BlurView intensity={100} tint="dark" style={styles.overlayModal}>
          <View style={[styles.simpleModal, { backgroundColor: theme.card + 'FA' }]}>
            <Text style={[styles.simpleTitle, { color: theme.text }]}>
              Simple Explanation
            </Text>
            <Text style={[styles.simpleContent, { color: theme.textSecondary }]}>
              {simpleVerseText}
            </Text>
            <Pressable
              style={[styles.simpleBtn, { backgroundColor: theme.primary }]}
              onPress={() => setVerseSimpleVisible(false)}
            >
              <Text style={styles.simpleBtnText}>Got it! 👍</Text>
            </Pressable>
          </View>
        </BlurView>
      </Modal>

      {/* AI Chat Modal */}
      <Modal
        visible={verseChatVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setVerseChatVisible(false)}
      >
        <AiBibleChat
          initialVerse={currentVerse}
          onClose={() => setVerseChatVisible(false)}
          title="Discuss This Verse"
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    borderRadius: 22,
    padding: 22,
    marginHorizontal: 22,
    marginBottom: 22,
    maxHeight: 650,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 15,
  },
  loadingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 70,
  },
  loadingMessage: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
  },
  
  // Header
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  countText: {
    fontSize: 18,
    fontWeight: '600',
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  
  // Prayer List
  scrollArea: {
    maxHeight: 520,
  },
  
  // Empty State
  emptyArea: {
    alignItems: 'center',
    padding: 50,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 25,
    marginBottom: 15,
  },
  emptyMessage: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    paddingHorizontal: 25,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyAddText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  
  // Prayer Card
  prayerContainer: {
    borderRadius: 18,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  inactivePrayer: {
    opacity: 0.8,
  },
  prayerMainArea: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerInfo: {
    flex: 1,
    marginRight: 18,
  },
  prayerTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  prayerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  prayerTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  prayerMetaArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cooldownTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 5,
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: '800',
  },
  readyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 5,
  },
  readyText: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionButtonsArea: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal Styles
  fullModal: {
    flex: 1,
  },
  modalBody: {
    flex: 1,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 28,
    paddingTop: 70,
  },
  modalHeading: {
    fontSize: 24,
    fontWeight: '900',
  },
  saveText: {
    fontSize: 20,
    fontWeight: '900',
  },
  formArea: {
    flex: 1,
    padding: 28,
  },
  fieldGroup: {
    marginBottom: 28,
  },
  fieldLabel: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
  },
  textField: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    fontSize: 20,
    fontWeight: '600',
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    gap: 15,
  },
  timeFieldText: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  
  // Prayer Details Modal
  detailsModal: {
    flex: 1,
  },
  detailsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 28,
    paddingTop: 70,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailsTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 25,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  detailsTimeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsTimeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsContent: {
    flex: 1,
    padding: 28,
  },
  versesHeading: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 28,
    textAlign: 'center',
  },
  versesArea: {
    marginBottom: 40,
  },
  
  // Verse Card
  verseContainer: {
    borderRadius: 18,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  verseTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  verseNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  verseNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  verseRef: {
    fontSize: 18,
    fontWeight: '900',
  },
  verseContent: {
    fontSize: 19,
    lineHeight: 30,
    marginBottom: 22,
    fontStyle: 'italic',
  },
  verseButtonRow: {
    flexDirection: 'row',
    gap: 15,
  },
  verseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  verseButtonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    borderRadius: 22,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 15,
    marginBottom: 28,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  pointsTag: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
  },
  pointsTagText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  
  // Simple Modal
  overlayModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  simpleModal: {
    borderRadius: 28,
    padding: 35,
    maxWidth: '92%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  simpleTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 22,
  },
  simpleContent: {
    fontSize: 20,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 32,
  },
  simpleBtn: {
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  simpleBtnText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
});

export default PrayerSection;
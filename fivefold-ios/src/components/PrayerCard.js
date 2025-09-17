import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { LiquidGlassPrayerCard } from './LiquidGlassCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getPrayerStatus, 
  getPrayerStatusColor, 
  getPrayerStatusText,
  getPrayerCardBackground,
  canCompletePrayer 
} from '../utils/prayerTiming';
import { hapticFeedback } from '../utils/haptics';
import { saveData, getStoredData } from '../utils/localStorage';
import notificationService from '../services/notificationService';

const PrayerCard = ({ userPrayers = [], prayerHistory, onPrayerComplete, onPrayerPress, onManagePrayers, prayerTimes = {} }) => {
  const { theme, isDark } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [editingType, setEditingType] = useState('name'); // 'name' or 'time'
  const [customNames, setCustomNames] = useState({
    pre_dawn: 'Before Sunrise',
    post_sunrise: 'After Sunrise',
    midday: 'Midday',
    pre_sunset: 'Before Sunset',
    night: 'After Sunset'
  });
  const [customTimes, setCustomTimes] = useState(prayerTimes);
  const [tempName, setTempName] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [showEditOptions, setShowEditOptions] = useState(false);

  // Load custom prayer names and times
  useEffect(() => {
    loadCustomNames();
    loadCustomTimes();
  }, []);

  const loadCustomTimes = async () => {
    try {
      const saved = await AsyncStorage.getItem('customPrayerTimes');
      if (saved) {
        setCustomTimes(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading custom prayer times:', error);
    }
  };

  const loadCustomNames = async () => {
    try {
      const saved = await AsyncStorage.getItem('customPrayerNames');
      if (saved) {
        setCustomNames(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading custom prayer names:', error);
    }
  };

  const saveCustomName = async () => {
    if (!editingPrayer || !tempName.trim()) return;
    
    const newNames = {
      ...customNames,
      [editingPrayer]: tempName.trim()
    };
    
    setCustomNames(newNames);
    await AsyncStorage.setItem('customPrayerNames', JSON.stringify(newNames));
    hapticFeedback.success();
    setShowEditModal(false);
    setEditingPrayer(null);
    setTempName('');
    setShowEditOptions(false);
  };

  const saveCustomTime = async () => {
    if (!editingPrayer || !tempTime.trim()) return;
    
    const newTimes = {
      ...customTimes,
      [editingPrayer]: tempTime.trim()
    };
    
    setCustomTimes(newTimes);
    await AsyncStorage.setItem('customPrayerTimes', JSON.stringify(newTimes));
    
    // Reschedule notifications with new custom times
    try {
      const settings = await getStoredData('notificationSettings');
      if (settings?.prayerReminders) {
        // Combine original prayer times with custom times for scheduling
        const allTimes = { ...prayerTimes, ...customTimes };
        for (const [slot, customTime] of Object.entries(newTimes)) {
          if (customTime) {
            allTimes[slot] = customTime;
          }
        }
        await notificationService.schedulePrayerNotifications(allTimes, settings);
        console.log('Prayer notifications rescheduled with new custom time');
      }
    } catch (error) {
      console.log('Error rescheduling notifications:', error);
    }
    
    hapticFeedback.success();
    setShowEditModal(false);
    setEditingPrayer(null);
    setTempTime('');
    setShowEditOptions(false);
  };

  const openEditOptions = (prayer) => {
    setEditingPrayer(prayer.slot);
    setTempName(prayer.name);
    setTempTime(formatTime(prayer.time));
    setShowEditOptions(true);
  };

  // Update time every minute for real-time status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatTime = (time) => {
    if (!time) return '--:--';
    
    // If it's a string, check if it needs formatting
    if (typeof time === 'string') {
      // If it's already in HH:MM format, return it
      if (time.includes(':') && time.match(/^\d{1,2}:\d{2}$/)) {
        return time;
      }
      
      // If it's in HHMM format (like "1400"), convert to HH:MM
      if (time.match(/^\d{3,4}$/)) {
        const paddedTime = time.padStart(4, '0'); // Ensure 4 digits
        const hours = paddedTime.slice(0, 2);
        const minutes = paddedTime.slice(2, 4);
        return `${hours}:${minutes}`;
      }
      
      // Return as-is if already formatted
      return time;
    }
    
    // If it's a Date object, format it
    if (time instanceof Date) {
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Fallback
    return '--:--';
  };



  // Use userPrayers directly - no more hardcoded prayers
  const prayers = userPrayers;

  return (
    <>
      <BlurView 
        intensity={18} 
        tint={isDark ? "dark" : "light"} 
        style={[styles.container, { 
          backgroundColor: isDark 
            ? 'rgba(255, 255, 255, 0.05)' 
            : `${theme.primary}15` // Use theme primary color with 15% opacity for better visibility
        }]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🕊️ Today's Prayers</Text>
      


      <LiquidGlassPrayerCard style={styles.prayersList}>
        {prayers.map(prayer => {
          const prayerStatus = getPrayerStatus(prayer.time, false, prayerHistory, prayer.slot);
          const statusColor = getPrayerStatusColor(prayerStatus.status, theme);
          const statusText = getPrayerStatusText(prayerStatus);
          const cardBackground = getPrayerCardBackground(prayerStatus.status, theme);
          const isCompleted = prayerStatus.status === 'completed';
          const canPress = prayerStatus.canComplete || isCompleted || prayerStatus.status === 'missed';
          
          return (
            <View 
              key={prayer.slot}
              style={[
                styles.prayerItem, 
                { 
                  borderBottomColor: theme.border,
                  backgroundColor: cardBackground,
                  opacity: canPress ? 1 : 0.6
                }
              ]}
            >
              {/* Edit button - replaces prayer icon */}
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: theme.surface }]}
                onPress={() => {
                  hapticFeedback.light();
                  openEditOptions(prayer);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={20} color={theme.primary} />
              </TouchableOpacity>
              
              {/* Prayer info area - clickable for prayer completion */}
              <TouchableOpacity
                style={styles.prayerInfo}
                onPress={() => canPress && onPrayerPress(prayer)}
                disabled={!canPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.prayerName, { color: theme.text }]}>{prayer.name}</Text>
                <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>{formatTime(prayer.time)}</Text>
                <Text style={[styles.prayerStatus, { color: statusColor }]}>{statusText}</Text>
              </TouchableOpacity>
              
              <View style={styles.prayerActions}>
                {/* Status indicator on the right */}
                {isCompleted && (
                  <MaterialIcons name="check-circle" size={20} color={theme.success} />
                )}
                {prayerStatus.status === 'missed' && (
                  <MaterialIcons name="error" size={20} color={theme.error} />
                )}
                {canPress && !isCompleted && prayerStatus.status !== 'missed' && (
                  <MaterialIcons name="arrow-forward-ios" size={16} color={theme.textSecondary} />
                )}
              </View>
            </View>
          );
        })}
      </LiquidGlassPrayerCard>
      
        {/* Hint text */}
        <Text style={[styles.hintText, { color: theme.textTertiary }]}>
          Tap the edit button to change name or time
        </Text>
      </BlurView>

      {/* Edit Options Modal */}
      <Modal
        visible={showEditOptions}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Edit Prayer
            </Text>
            
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                setEditingType('name');
                setShowEditOptions(false);
                setShowEditModal(true);
              }}
            >
              <MaterialIcons name="edit" size={24} color={theme.primary} />
              <Text style={[styles.optionText, { color: theme.text }]}>Edit Name</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                setEditingType('time');
                setShowEditOptions(false);
                setShowEditModal(true);
              }}
            >
              <MaterialIcons name="schedule" size={24} color={theme.primary} />
              <Text style={[styles.optionText, { color: theme.text }]}>Edit Time</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.surface, marginTop: 20 }]}
              onPress={() => {
                setShowEditOptions(false);
                setEditingPrayer(null);
              }}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Prayer Name/Time Modal */}
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {editingType === 'name' ? 'Edit Prayer Name' : 'Edit Prayer Time'}
          </Text>
          
          <TextInput
            style={[styles.modalInput, { 
              backgroundColor: theme.surface, 
              color: theme.text,
              borderColor: theme.border
            }]}
            value={editingType === 'name' ? tempName : tempTime}
            onChangeText={editingType === 'name' ? setTempName : setTempTime}
            placeholder={editingType === 'name' ? 'Enter prayer name' : 'Enter time (HH:MM)'}
            placeholderTextColor={theme.textSecondary}
            autoFocus={true}
            maxLength={editingType === 'name' ? 30 : 5}
            keyboardType={editingType === 'time' ? 'numeric' : 'default'}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                setShowEditModal(false);
                setEditingPrayer(null);
                setTempName('');
              }}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={editingType === 'name' ? saveCustomName : saveCustomTime}
            >
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginHorizontal: 20, // Add horizontal margins for proper edge spacing
    marginBottom: 20, // Add bottom margin for consistency with other cards
    padding: 20, // Add padding inside the card
    borderRadius: 16, // Add border radius to match other cards
    shadowColor: '#000', // Add shadow for consistency
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    overflow: 'hidden',
    shadowRadius: 8,
    elevation: 3, // Android shadow
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  prayerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  completedIcon: {
    marginRight: 8,
  },
  prayersList: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prayerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  prayerTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  prayerStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default PrayerCard;
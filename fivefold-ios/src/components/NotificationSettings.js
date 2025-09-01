import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getStoredData, saveData } from '../utils/localStorage';
import { hapticFeedback } from '../utils/haptics';
import notificationService from '../services/notificationService';
import TimePicker from './TimePicker';

const NotificationSettings = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [settings, setSettings] = useState({
    prayerReminders: true, // Single toggle for 30 min before prayer reminders
    achievementNotifications: true,
    streakReminders: true,
    pushNotifications: true,
    sound: true,
    vibration: true,
  });

  const [prayerTimes, setPrayerTimes] = useState({
    beforeSunrise: '05:30',
    afterSunrise: '06:30',
    midday: '12:00',
    beforeSunset: '17:30',
    afterSunset: '18:30',
  });

  const [prayerNames, setPrayerNames] = useState({
    beforeSunrise: 'Before Sunrise',
    afterSunrise: 'After Sunrise',
    midday: 'Midday',
    beforeSunset: 'Before Sunset',
    afterSunset: 'After Sunset',
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeSlot, setCurrentTimeSlot] = useState(null);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const storedSettings = await getStoredData('notificationSettings');
      const storedTimes = await getStoredData('prayerTimes');
      const storedNames = await getStoredData('prayerNames');
      
      if (storedSettings) {
        setSettings({ ...settings, ...storedSettings });
      }
      
      if (storedTimes) {
        setPrayerTimes({ ...prayerTimes, ...storedTimes });
      }
      
      if (storedNames) {
        setPrayerNames({ ...prayerNames, ...storedNames });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings) => {
    try {
      await saveData('notificationSettings', newSettings);
      setSettings(newSettings);
      
      // Update notification service with new settings
      await notificationService.updateSettings(newSettings);
      
      hapticFeedback.success();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const toggleSetting = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    
    // Provide haptic feedback based on setting type and vibration preference
    if (settings.vibration) {
      if (key === 'pushNotifications') {
        hapticFeedback.medium();
      } else {
        hapticFeedback.light();
      }
    }
    
    // Special handling for main push notifications toggle
    if (key === 'pushNotifications' && !settings[key]) {
      // Request permission when enabling notifications
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission.status || hasPermission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive prayer reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => notificationService.openSettings() 
            }
          ]
        );
        return;
      }
    }
    
    await saveNotificationSettings(newSettings);
  };

  const savePrayerTimes = async (newTimes) => {
    try {
      await saveData('prayerTimes', newTimes);
      setPrayerTimes(newTimes);
      
      // If daily prayer notifications are enabled, reschedule them
      if (settings.dailyPrayerTime && settings.pushNotifications) {
        await notificationService.schedulePrayerNotifications(newTimes);
      }
      
      if (settings.vibration) {
        hapticFeedback.success();
      }
    } catch (error) {
      console.error('Failed to save prayer times:', error);
      Alert.alert('Error', 'Failed to save prayer times');
    }
  };

  const openTimePicker = (timeSlot) => {
    setCurrentTimeSlot(timeSlot);
    setShowTimePicker(true);
    if (settings.vibration) {
      hapticFeedback.light();
    }
  };

  const handleTimeSelected = async (newTime) => {
    const newTimes = { ...prayerTimes, [currentTimeSlot]: newTime };
    await savePrayerTimes(newTimes);
    setShowTimePicker(false);
  };

  const savePrayerNames = async (newNames) => {
    try {
      await saveData('prayerNames', newNames);
      setPrayerNames(newNames);
      
      if (settings.vibration) {
        hapticFeedback.success();
      }
    } catch (error) {
      console.error('Failed to save prayer names:', error);
      Alert.alert('Error', 'Failed to save prayer names');
    }
  };

  const openNameEditor = (timeSlot) => {
    setCurrentTimeSlot(timeSlot);
    setEditingName(prayerNames[timeSlot] || '');
    setShowNameEditor(true);
    if (settings.vibration) {
      hapticFeedback.light();
    }
  };

  const handleNameSaved = async () => {
    if (editingName.trim()) {
      const newNames = { ...prayerNames, [currentTimeSlot]: editingName.trim() };
      await savePrayerNames(newNames);
    }
    setShowNameEditor(false);
  };

  const NotificationToggle = ({ title, subtitle, icon, settingKey, iconColor }) => (
    <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <MaterialIcons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={settings[settingKey]}
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: theme.border, true: iconColor + '40' }}
        thumbColor={settings[settingKey] ? iconColor : theme.surface}
        ios_backgroundColor={theme.border}
      />
    </View>
  );

  const PrayerTimeSection = () => (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🕐 Prayer Times</Text>
      
      {Object.entries(prayerTimes).map(([key, time]) => (
        <TouchableOpacity
          key={key}
          style={[styles.timeItem, { borderBottomColor: theme.border }]}
          onPress={() => openTimePicker(key)}
          onLongPress={() => openNameEditor(key)}
        >
          <View style={styles.timeLeft}>
            <MaterialIcons 
              name={
                key === 'beforeSunrise' ? 'brightness-2' :
                key === 'afterSunrise' ? 'wb-sunny' :
                key === 'midday' ? 'light-mode' :
                key === 'beforeSunset' ? 'wb-twilight' : 
                key === 'afterSunset' ? 'nightlight-round' : 'access-time'
              } 
              size={20} 
              color="#2196F3" 
            />
            <Text style={[styles.timeLabel, { color: theme.text }]}>
              {prayerNames[key] || key}
            </Text>
          </View>
          <View style={styles.timeRight}>
            <Text style={[styles.timeValue, { color: theme.primary }]}>
              {time}
            </Text>
            <MaterialIcons name="chevron-right" size={16} color={theme.textTertiary} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const QuickActions = () => (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 Quick Actions</Text>
      
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.primary + '15' }]}
        onPress={async () => {
          if (settings.vibration) hapticFeedback.medium();
          try {
            await notificationService.testNotification();
            Alert.alert('Test Sent!', 'Check your notification bar for the test notification.');
          } catch (error) {
            Alert.alert('Error', 'Failed to send test notification');
          }
        }}
      >
        <MaterialIcons name="notifications-active" size={20} color={theme.primary} />
        <Text style={[styles.actionText, { color: theme.primary }]}>
          Send Test Notification
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.error + '15' }]}
        onPress={() => {
          if (settings.vibration) hapticFeedback.medium();
          Alert.alert(
            'Clear All Notifications',
            'This will remove all pending prayer reminders. Are you sure?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Clear', 
                style: 'destructive',
                onPress: async () => {
                  try {
                    await notificationService.clearAllNotifications();
                    if (settings.vibration) hapticFeedback.success();
                    Alert.alert('Cleared!', 'All pending notifications have been removed.');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to clear notifications');
                  }
                }
              }
            ]
          );
        }}
      >
        <MaterialIcons name="clear-all" size={20} color={theme.error} />
        <Text style={[styles.actionText, { color: theme.error }]}>
          Clear All Notifications
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            onPress={() => {
              if (settings.vibration) hapticFeedback.light();
              onClose();
            }}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Notification Settings
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Toggle */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <NotificationToggle
              title="Push Notifications"
              subtitle="Enable all prayer reminders and updates"
              icon="notifications"
              settingKey="pushNotifications"
              iconColor={theme.primary}
            />
          </View>

          {/* Single Prayer Reminder Toggle */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🙏 Prayer Reminders</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Remind me 30 minutes before every prayer
            </Text>
            
            <NotificationToggle
              title="Prayer Reminders"
              subtitle="Get notified 30 minutes before each prayer time"
              icon="notifications-active"
              settingKey="prayerReminders"
              iconColor="#2196F3"
            />
          </View>

          {/* App Features */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🎉 App Features</Text>
            
            <NotificationToggle
              title="Achievement Unlocked"
              subtitle="Celebrate your spiritual milestones"
              icon="emoji-events"
              settingKey="achievementNotifications"
              iconColor="#2196F3"
            />
            
            <NotificationToggle
              title="Streak Maintenance"
              subtitle="Keep your prayer streak alive"
              icon="local-fire-department"
              settingKey="streakReminders"
              iconColor="#2196F3"
            />
          </View>

          {/* Notification Style */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🔊 Notification Style</Text>
            
            <NotificationToggle
              title="Sound"
              subtitle="Play sound for notifications"
              icon="volume-up"
              settingKey="sound"
              iconColor="#2196F3"
            />
            
            <NotificationToggle
              title="Vibration"
              subtitle="Vibrate when receiving notifications"
              icon="vibration"
              settingKey="vibration"
              iconColor="#2196F3"
            />
          </View>

          {/* Prayer Times - with editing capability */}
          <PrayerTimeSection />
        </ScrollView>

        {/* Time Picker Modal */}
        {showTimePicker && currentTimeSlot && (
          <TimePicker
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            onTimeSelected={handleTimeSelected}
            currentTime={prayerTimes[currentTimeSlot]}
            title={`Set ${prayerNames[currentTimeSlot]} Time`}
          />
        )}

        {/* Name Editor Modal */}
        <Modal visible={showNameEditor} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowNameEditor(false)}>
                <Text style={[styles.cancelButton, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Prayer Name</Text>
              <TouchableOpacity onPress={handleNameSaved}>
                <Text style={[styles.saveButton, { color: "#2196F3" }]}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.nameEditorContent}>
              <Text style={[styles.nameEditorLabel, { color: theme.text }]}>Prayer Name</Text>
              <TextInput
                style={[styles.nameEditorInput, { 
                  backgroundColor: theme.card, 
                  color: theme.text, 
                  borderColor: theme.border 
                }]}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Enter prayer name"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                maxLength={30}
              />
              <Text style={[styles.nameEditorHint, { color: theme.textSecondary }]}>
                Tap and hold any prayer time to edit its name
              </Text>
            </View>
          </SafeAreaView>
        </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  timeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  timeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  cancelButton: {
    fontSize: 16,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  nameEditorContent: {
    padding: 20,
  },
  nameEditorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  nameEditorInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 12,
  },
  nameEditorHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default NotificationSettings;
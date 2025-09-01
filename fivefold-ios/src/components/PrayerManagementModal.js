import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const PrayerManagementModal = ({ 
  visible, 
  onClose, 
  onAddPrayer, 
  onRemovePrayer, 
  prayers = [] 
}) => {
  const { theme } = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerTime, setNewPrayerTime] = useState('');

  const handleAddPrayer = () => {
    if (!newPrayerName.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    if (!newPrayerTime.trim() || !isValidTime(newPrayerTime)) {
      Alert.alert('Error', 'Please enter a valid time (HH:MM format)');
      return;
    }

    onAddPrayer(newPrayerName.trim(), newPrayerTime.trim());
    setNewPrayerName('');
    setNewPrayerTime('');
    setShowAddForm(false);
    hapticFeedback.success();
  };

  const handleRemovePrayer = (prayer) => {
    Alert.alert(
      'Remove Prayer',
      `Are you sure you want to remove "${prayer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemovePrayer(prayer.id);
            hapticFeedback.success();
          },
        },
      ]
    );
  };

  const isValidTime = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const formatTimeInput = (text) => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as HH:MM
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    } else if (digits.length >= 1) {
      return digits;
    }
    return '';
  };

  const handleTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    setNewPrayerTime(formatted);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancelButton, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Manage Prayers</Text>
          <TouchableOpacity
            onPress={() => {
              setShowAddForm(true);
              hapticFeedback.light();
            }}
          >
            <MaterialIcons name="add" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Add Prayer Form */}
          {showAddForm && (
            <View style={[styles.addForm, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.formTitle, { color: theme.text }]}>Add New Prayer</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Prayer Name</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: theme.border 
                  }]}
                  value={newPrayerName}
                  onChangeText={setNewPrayerName}
                  placeholder="e.g., Morning Prayer"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Time</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: theme.border 
                  }]}
                  value={newPrayerTime}
                  onChangeText={handleTimeChange}
                  placeholder="HH:MM (e.g., 07:30)"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelFormButton, { backgroundColor: theme.surface }]}
                  onPress={() => {
                    setShowAddForm(false);
                    setNewPrayerName('');
                    setNewPrayerTime('');
                  }}
                >
                  <Text style={[styles.formButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.formButton, styles.addFormButton, { backgroundColor: theme.primary }]}
                  onPress={handleAddPrayer}
                >
                  <Text style={[styles.formButtonText, { color: '#fff' }]}>Add Prayer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Prayer List */}
          <View style={styles.prayersList}>
            {prayers.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="schedule" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Prayers Yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Tap the + button to add your first prayer
                </Text>
              </View>
            ) : (
              prayers.map((prayer) => (
                <View
                  key={prayer.id}
                  style={[styles.prayerItem, { 
                    backgroundColor: theme.card, 
                    borderColor: theme.border 
                  }]}
                >
                  <View style={styles.prayerInfo}>
                    <Text style={[styles.prayerName, { color: theme.text }]}>
                      {prayer.name}
                    </Text>
                    <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>
                      {prayer.time}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.removeButton, { backgroundColor: theme.error + '20' }]}
                    onPress={() => handleRemovePrayer(prayer)}
                  >
                    <MaterialIcons name="delete" size={20} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={[styles.instructionTitle, { color: theme.text }]}>
              How to manage prayers:
            </Text>
            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
              • Tap + to add a new prayer with custom name and time
            </Text>
            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
              • Tap the delete button to remove a prayer
            </Text>
            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
              • Prayers are automatically sorted by time
            </Text>

          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addForm: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelFormButton: {
    // Styles handled by backgroundColor prop
  },
  addFormButton: {
    // Styles handled by backgroundColor prop
  },
  formButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  prayersList: {
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  prayerTime: {
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
  },
  instructions: {
    padding: 16,
    marginTop: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default PrayerManagementModal;

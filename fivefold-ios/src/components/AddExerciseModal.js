import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const BODY_PARTS = [
  'Arms',
  'Back',
  'Chest',
  'Core',
  'Full Body',
  'Legs',
  'Shoulders',
];

const CATEGORIES = [
  'Strength',
  'Cardio',
  'Bodyweight',
  'Olympic',
  'Plyometric',
];

const EQUIPMENT_TYPES = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Smith Machine',
  'Body Weight',
  'Kettlebell',
  'Medicine Ball',
  'Box',
  'Jump Rope',
  'Ab Wheel',
];

const AddExerciseModal = ({ visible, onClose, onAdd }) => {
  const { theme, isDark } = useTheme();
  const [exerciseName, setExerciseName] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [showBodyPartPicker, setShowBodyPartPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  const handleAdd = () => {
    if (!exerciseName.trim()) {
      Alert.alert('Missing Information', 'Please enter an exercise name');
      return;
    }
    if (!selectedBodyPart) {
      Alert.alert('Missing Information', 'Please select a body part');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select a category');
      return;
    }
    if (!selectedEquipment) {
      Alert.alert('Missing Information', 'Please select equipment type');
      return;
    }

    const newExercise = {
      name: exerciseName.trim(),
      bodyPart: selectedBodyPart,
      category: selectedCategory,
      equipment: selectedEquipment,
      target: '', // Optional field
    };

    onAdd(newExercise);
    
    // Reset form
    setExerciseName('');
    setSelectedBodyPart('');
    setSelectedCategory('');
    setSelectedEquipment('');
  };

  const handleClose = () => {
    setExerciseName('');
    setSelectedBodyPart('');
    setSelectedCategory('');
    setSelectedEquipment('');
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                handleClose();
              }}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Add Exercise</Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                handleAdd();
              }}
              style={styles.addButton}
            >
              <Text style={[styles.addText, { color: theme.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Exercise Name */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Exercise Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: theme.text,
                  borderColor: theme.border,
                }]}
                placeholder="e.g., Cable Chest Fly"
                placeholderTextColor={theme.textSecondary}
                value={exerciseName}
                onChangeText={setExerciseName}
                autoCapitalize="words"
              />
            </View>

            {/* Body Part */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Body Part</Text>
              <TouchableOpacity
                style={[styles.picker, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: theme.border,
                }]}
                onPress={() => {
                  hapticFeedback.light();
                  setShowBodyPartPicker(true);
                }}
              >
                <Text style={[styles.pickerText, { color: selectedBodyPart ? theme.text : theme.textSecondary }]}>
                  {selectedBodyPart || 'Select body part'}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <TouchableOpacity
                style={[styles.picker, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: theme.border,
                }]}
                onPress={() => {
                  hapticFeedback.light();
                  setShowCategoryPicker(true);
                }}
              >
                <Text style={[styles.pickerText, { color: selectedCategory ? theme.text : theme.textSecondary }]}>
                  {selectedCategory || 'Select category'}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Equipment */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Equipment</Text>
              <TouchableOpacity
                style={[styles.picker, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: theme.border,
                }]}
                onPress={() => {
                  hapticFeedback.light();
                  setShowEquipmentPicker(true);
                }}
              >
                <Text style={[styles.pickerText, { color: selectedEquipment ? theme.text : theme.textSecondary }]}>
                  {selectedEquipment || 'Select equipment'}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Your custom exercise will be saved locally and appear alongside default exercises
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Body Part Picker Modal */}
      <Modal
        visible={showBodyPartPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBodyPartPicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay}
          activeOpacity={0.7}
          onPress={() => {
            hapticFeedback.light();
            setShowBodyPartPicker(false);
          }}
        >
          <View style={[styles.pickerModal, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={[styles.pickerHandle, { backgroundColor: theme.textSecondary }]} />
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Body Part</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {BODY_PARTS.map((part) => (
                <TouchableOpacity
                  key={part}
                  style={[styles.pickerOption, { 
                    borderBottomColor: theme.border,
                    backgroundColor: selectedBodyPart === part ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  }]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedBodyPart(part);
                    setShowBodyPartPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { color: theme.text }]}>{part}</Text>
                  {selectedBodyPart === part && (
                    <MaterialIcons name="check" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay}
          activeOpacity={0.7}
          onPress={() => {
            hapticFeedback.light();
            setShowCategoryPicker(false);
          }}
        >
          <View style={[styles.pickerModal, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={[styles.pickerHandle, { backgroundColor: theme.textSecondary }]} />
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Category</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.pickerOption, { 
                    borderBottomColor: theme.border,
                    backgroundColor: selectedCategory === category ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  }]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedCategory(category);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { color: theme.text }]}>{category}</Text>
                  {selectedCategory === category && (
                    <MaterialIcons name="check" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Equipment Picker Modal */}
      <Modal
        visible={showEquipmentPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEquipmentPicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay}
          activeOpacity={0.7}
          onPress={() => {
            hapticFeedback.light();
            setShowEquipmentPicker(false);
          }}
        >
          <View style={[styles.pickerModal, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={[styles.pickerHandle, { backgroundColor: theme.textSecondary }]} />
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Equipment</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {EQUIPMENT_TYPES.map((equipment) => (
                <TouchableOpacity
                  key={equipment}
                  style={[styles.pickerOption, { 
                    borderBottomColor: theme.border,
                    backgroundColor: selectedEquipment === equipment ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  }]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedEquipment(equipment);
                    setShowEquipmentPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { color: theme.text }]}>{equipment}</Text>
                  {selectedEquipment === equipment && (
                    <MaterialIcons name="check" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 17,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  addText: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1,
  },
  picker: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 17,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModal: {
    maxHeight: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 0.5,
  },
  pickerHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
    opacity: 0.3,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  pickerOptionText: {
    fontSize: 17,
  },
});

export default AddExerciseModal;













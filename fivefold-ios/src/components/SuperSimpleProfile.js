import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width } = Dimensions.get('window');

const SuperSimpleProfile = ({ 
  onNext, 
  onBack, 
  userName, 
  setUserName,
  selectedCountry,
  onCountryPress,
  t 
}) => {
  const { theme } = useTheme();

  const handleContinue = () => {
    if (userName.trim()) {
      hapticFeedback.success();
      onNext();
    } else {
      hapticFeedback.error();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Create Your Profile
      </Text>

      <View style={styles.form}>
        {/* Name Input - Super Simple */}
        <Text style={[styles.label, { color: theme.text }]}>
          Your Name
        </Text>
        <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="words"
            maxLength={30}
          />
        </View>

        {/* Country Button - Super Simple */}
        <Text style={[styles.label, { color: theme.text, marginTop: 30 }]}>
          Your Country
        </Text>
        <TouchableOpacity
          onPress={onCountryPress}
          style={[styles.countryBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.countryText, { color: selectedCountry ? theme.text : theme.textSecondary }]}>
            {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : 'Select country'}
          </Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { borderColor: theme.border }]}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleContinue}
          style={[styles.nextBtn, { backgroundColor: userName.trim() ? theme.primary : theme.border }]}
        >
          <Text style={styles.nextText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  input: {
    fontSize: 16,
  },
  countryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countryText: {
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: 100,
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SuperSimpleProfile;






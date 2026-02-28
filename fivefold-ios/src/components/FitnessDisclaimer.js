import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import userStorage from '../utils/userStorage';

const STORAGE_PREFIX = 'fitness_disclaimer_dismissed_';

const FitnessDisclaimer = ({ screenKey }) => {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const dismissed = await userStorage.get(`${STORAGE_PREFIX}${screenKey}`);
      if (!dismissed) setVisible(true);
    })();
  }, [screenKey]);

  const handleDismiss = () => setVisible(false);

  const handleDontShowAgain = async () => {
    await userStorage.set(`${STORAGE_PREFIX}${screenKey}`, true);
    setVisible(false);
  };

  if (!visible) return null;

  const textColor = isDark ? '#FFFFFF' : '#111111';
  const secondaryColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const bgColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const overlayColor = 'rgba(0,0,0,0.5)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
        <View style={[styles.card, { backgroundColor: bgColor }]}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,165,0,0.12)' : 'rgba(255,165,0,0.08)' }]}>
            <MaterialIcons name="info-outline" size={28} color="#F59E0B" />
          </View>

          <Text style={[styles.title, { color: textColor }]}>
            Before You Begin
          </Text>

          <Text style={[styles.body, { color: secondaryColor }]}>
            The fitness and nutrition features in this app are for informational and general wellness purposes only. They are not a substitute for professional medical advice, diagnosis, or treatment.
          </Text>

          <Text style={[styles.body, { color: secondaryColor, marginTop: 10 }]}>
            Always consult a qualified healthcare professional before starting any new exercise programme, diet plan, or making significant changes to your health routine. If you experience any pain, discomfort, or adverse effects, stop immediately and seek medical attention.
          </Text>

          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: theme.primary }]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>I Understand</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dontShowBtn}
            onPress={handleDontShowAgain}
            activeOpacity={0.7}
          >
            <Text style={[styles.dontShowText, { color: secondaryColor }]}>
              Don't show again for this section
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dontShowBtn: {
    marginTop: 14,
    paddingVertical: 6,
  },
  dontShowText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default FitnessDisclaimer;

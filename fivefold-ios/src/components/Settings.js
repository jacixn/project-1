import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassEffect';
import ThemeModal from './ThemeModal';
import VoicePickerModal from './VoicePickerModal';
import bibleAudioService from '../services/bibleAudioService';

const Settings = ({ settings, onSettingsChange, onClose }) => {
  const { theme, currentTheme, changeTheme, availableThemes, isBlushTheme, isCresviaTheme, isEternaTheme, isFaithTheme, isBiblelyTheme } = useTheme();
  
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [currentVoiceName, setCurrentVoiceName] = useState('Default');

  // Load current voice name
  useEffect(() => {
    const loadVoiceName = () => {
      const voice = bibleAudioService.getCurrentVoice();
      if (voice) {
        // Extract clean name from identifier
        const name = voice.name || voice.identifier?.split('.').pop()?.replace(/-/g, ' ') || 'Default';
        setCurrentVoiceName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    };
    
    loadVoiceName();
    
    // Refresh when voices load
    bibleAudioService.onVoicesLoaded = () => loadVoiceName();
  }, []);

  const getCurrentThemeDisplay = () => {
    if (isBlushTheme) return { icon: '🌸', name: 'Blush Bloom' };
    if (isEternaTheme) return { icon: '✨', name: 'Eterna' };
    if (isCresviaTheme) return { icon: '🌌', name: 'Cresvia' };
    if (isFaithTheme) return { icon: '✝️', name: 'Faith' };
    return { icon: '🎨', name: 'Default' };
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            ⚙️ Settings
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Theme Selection Button */}
          <TouchableOpacity 
            onPress={() => setShowThemeModal(true)}
            activeOpacity={0.7}
          >
            <GlassCard style={styles.section} blushMode={currentTheme && currentTheme !== 'light' && currentTheme !== 'dark'}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="palette" size={22} color={theme.primary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                      Theme
                    </Text>
                    <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                      {getCurrentThemeDisplay().icon} {getCurrentThemeDisplay().name}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* 🎤 Voice Selection Button */}
          <TouchableOpacity 
            onPress={() => setShowVoiceModal(true)}
            activeOpacity={0.7}
          >
            <GlassCard style={styles.section} blushMode={currentTheme && currentTheme !== 'light' && currentTheme !== 'dark'}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="record-voice-over" size={22} color={theme.primary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                      Reading Voice
                    </Text>
                    <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                      🎤 {currentVoiceName}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* 📱 About Section */}
          <GlassCard style={styles.section} blushMode={currentTheme && currentTheme !== 'light' && currentTheme !== 'dark'}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📱 About Biblely</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>Version: 1.0.0</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>Faith & Focus, Every Day</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>Your data is encrypted and synced securely</Text>
          </GlassCard>
        </ScrollView>

        {/* Theme Modal */}
        <ThemeModal 
          visible={showThemeModal} 
          onClose={() => setShowThemeModal(false)} 
        />

        {/* Voice Picker Modal */}
        <VoicePickerModal 
          visible={showVoiceModal} 
          onClose={() => {
            setShowVoiceModal(false);
            // Refresh voice name after selection
            const voice = bibleAudioService.getCurrentVoice();
            if (voice) {
              const name = voice.name || voice.identifier?.split('.').pop()?.replace(/-/g, ' ') || 'Default';
              setCurrentVoiceName(name.charAt(0).toUpperCase() + name.slice(1));
            }
          }} 
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  // Theme Button Styles
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default Settings;
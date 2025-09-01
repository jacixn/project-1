import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, Switch, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassEffect';
import aiService from '../services/aiService';

const Settings = ({ settings, onSettingsChange, onClose }) => {
  const { theme, currentTheme, changeTheme, availableThemes, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();
  
  // API key should be entered by user for security
  const [apiKey, setApiKey] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleEnableAI = async () => {
    if (!aiEnabled) {
      // Turning ON - need API key
      if (!apiKey.trim()) {
        Alert.alert(
          '⚠️ API Key Required',
          'Please enter your Groq API key to enable smart scoring.'
        );
        return;
      }
      
      setIsLoading(true);
      try {
        console.log('🔑 Setting API key:', apiKey.substring(0, 10) + '...');
        await aiService.setApiKey(apiKey.trim());
        
        console.log('📊 Checking AI status...');
        const status = await aiService.getStatus();
        console.log('🔍 AI Status:', status);
        
        if (status.hasApiKey) {
          setAiEnabled(true);
          Alert.alert(
            '🧠 Smart Features Enabled',
            'Smart task scoring is now active!'
          );
          if (onSettingsChange) {
            onSettingsChange({ ...settings, aiEnabled: true });
          }
        } else {
          Alert.alert(
            '❌ Invalid API Key',
            `Status: ${JSON.stringify(status)}\n\n${'Please check your Groq API key and try again.'}`
          );
        }
      } catch (error) {
        console.error('AI setup error:', error);
        Alert.alert(
          '❌ Smart Features Setup Failed',
          `Error: ${error.message}\n\n${'Could not connect to smart features service.'}`
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      // Turning OFF
      await aiService.removeApiKey();
      setAiEnabled(false);
      setApiKey('');
      Alert.alert(
        '🧠 Smart Features Disabled',
        'Smart scoring has been turned off.'
      );
      if (onSettingsChange) {
        onSettingsChange({ ...settings, aiEnabled: false });
      }
    }
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
          {/* 🌸 Theme Selection Section */}
          <GlassCard style={styles.section} blushMode={isBlushTheme || isCresviaTheme || isEternaTheme}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              🎨 Theme
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Choose your preferred app appearance
            </Text>
            
            <View style={styles.themeGrid}>
              {(() => {
                // Define clean theme display info
                const themeInfo = {
                  'light': { icon: '☀️', name: 'Light' },
                  'dark': { icon: '🌙', name: 'Dark' },
                  'blush-bloom': { icon: '🌸', name: 'Blush Bloom' },
                  'cresvia': { icon: '🌌', name: 'Cresvia' },
                  'eterna': { icon: '✨', name: 'Eterna' }
                };
                
                // Create rows of 2 themes each
                const rows = [];
                for (let i = 0; i < availableThemes.length; i += 2) {
                  const row = availableThemes.slice(i, i + 2);
                  rows.push(
                    <View key={`row-${i}`} style={styles.themeRow}>
                      {row.map((themeOption) => {
                        const displayInfo = themeInfo[themeOption.id] || { icon: '🎨', name: themeOption.name };
                        
                        return (
                          <TouchableOpacity
                            key={themeOption.id}
                            style={[
                              styles.themeCard,
                              { 
                                backgroundColor: currentTheme === themeOption.id ? theme.primary + '20' : theme.surface,
                                borderColor: currentTheme === themeOption.id ? theme.primary : theme.border,
                                borderWidth: currentTheme === themeOption.id ? 2 : 1,
                              }
                            ]}
                            onPress={() => changeTheme(themeOption.id)}
                          >
                            <Text style={styles.themeIcon}>{displayInfo.icon}</Text>
                            <Text 
                              numberOfLines={1}
                              style={[
                                styles.themeName, 
                                { 
                                  color: currentTheme === themeOption.id ? theme.primary : theme.text,
                                  fontWeight: currentTheme === themeOption.id ? '700' : '500'
                                }
                              ]}
                            >
                              {displayInfo.name}
                            </Text>
                            {currentTheme === themeOption.id && (
                              <MaterialIcons name="check-circle" size={16} color={theme.primary} style={styles.checkIcon} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                      {/* Add empty space if odd number of themes */}
                      {row.length === 1 && <View style={{ flex: 1 }} />}
                    </View>
                  );
                }
                return rows;
              })()}
            </View>
          </GlassCard>

          {/* 🧠 Smart Scoring Section */}
          <GlassCard style={styles.section} blushMode={isBlushTheme || isCresviaTheme || isEternaTheme}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              🧠 Smart Scoring
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Enable smart features to automatically analyze your tasks and assign smart difficulty points (10-799 range).
            </Text>
            
            <View style={styles.aiToggle}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>
                Smart Scoring
              </Text>
              <Switch
                value={aiEnabled}
                onValueChange={handleEnableAI}
                trackColor={{ false: theme.textTertiary, true: theme.primary }}
                thumbColor={aiEnabled ? '#fff' : '#f4f3f4'}
                disabled={isLoading}
              />
            </View>

            {!aiEnabled && (
              <View style={styles.apiKeySection}>
                <View style={styles.inputHeader}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Groq API Key:
                  </Text>
                  <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)}>
                    <MaterialIcons 
                      name={showApiKey ? "visibility-off" : "visibility"} 
                      size={20} 
                      color={theme.primary} 
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: theme.border 
                  }]}
                  placeholder="Your API key is pre-filled..."
                  placeholderTextColor={theme.textTertiary}
                  value={apiKey}
                  onChangeText={setApiKey}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectTextOnFocus={true}
                />
                <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                  ✅ Your API key is already filled in! Just toggle smart features on. If it doesn't work, get a new key from groq.com.
                </Text>
              </View>
            )}
          </GlassCard>

          {/* 📱 About Section */}
          <GlassCard style={styles.section} blushMode={isBlushTheme || isCresviaTheme || isEternaTheme}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📱 About Biblely</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>Version: 1.0.0</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>Faith & Focus, Every Day</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>All data stays on your device</Text>
          </GlassCard>
        </ScrollView>
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
  aiToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  apiKeySection: {
    marginTop: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  // 🌸 Theme Selection Styles
  themeGrid: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    height: 80,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  themeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default Settings;
/**
 * VoicePickerModal Component
 * Clean, modern modal to browse and select device voices for Bible reading
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import bibleAudioService from '../services/bibleAudioService';
import { hapticFeedback } from '../utils/haptics';

const VoicePickerModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [voices, setVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [previewingId, setPreviewingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadVoices();
    }
  }, [visible]);

  const loadVoices = async () => {
    setLoading(true);
    
    // Wait for voices to be ready if not already
    if (!bibleAudioService.areVoicesReady()) {
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (bibleAudioService.areVoicesReady()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 3000);
      });
    }
    
    const formattedVoices = bibleAudioService.getFormattedVoiceList();
    setVoices(formattedVoices);
    
    const currentVoice = bibleAudioService.getCurrentVoice();
    setSelectedVoiceId(currentVoice?.identifier || null);
    
    setLoading(false);
  };

  const handlePreview = async (voiceId) => {
    hapticFeedback.buttonPress();
    
    if (previewingId === voiceId) {
      await bibleAudioService.stopPreview();
      setPreviewingId(null);
    } else {
      setPreviewingId(voiceId);
      await bibleAudioService.previewVoice(voiceId);
      setPreviewingId(null);
    }
  };

  const handleSelect = async (voiceId) => {
    hapticFeedback.success();
    setSelectedVoiceId(voiceId);
    await bibleAudioService.setVoice(voiceId);
    
    setVoices(voices.map(v => ({
      ...v,
      isSelected: v.id === voiceId,
    })));
  };

  const handleClose = () => {
    bibleAudioService.stopPreview();
    onClose?.();
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'Premium': return '#FFD700';
      case 'Enhanced': return '#9B59B6';
      case 'Siri': return '#007AFF';
      case 'Standard': return '#34C759';
      default: return theme.textSecondary;
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'Premium': return 'star';
      case 'Enhanced': return 'auto-awesome';
      case 'Siri': return 'mic';
      case 'Standard': return 'volume-up';
      default: return 'speaker';
    }
  };

  const getAccentFlag = (accent) => {
    switch (accent) {
      case 'UK': return '🇬🇧';
      case 'AU': return '🇦🇺';
      case 'IN': return '🇮🇳';
      case 'IE': return '🇮🇪';
      case 'ZA': return '🇿🇦';
      default: return '🇺🇸';
    }
  };

  // Group voices by quality
  const groupedVoices = voices.reduce((acc, voice) => {
    if (!acc[voice.quality]) {
      acc[voice.quality] = [];
    }
    acc[voice.quality].push(voice);
    return acc;
  }, {});

  const qualityOrder = ['Premium', 'Enhanced', 'Siri', 'Standard', 'Compact'];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <TouchableOpacity 
            onPress={handleClose} 
            style={[styles.doneButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <Text style={[styles.doneText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: theme.text }]}>
            Reading Voice
          </Text>
          
          <View style={{ width: 60 }} />
        </View>

        {/* Voice Count Badge */}
        {!loading && (
          <View style={[styles.countContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <MaterialIcons name="graphic-eq" size={16} color={theme.primary} />
            <Text style={[styles.countText, { color: theme.textSecondary }]}>
              {voices.length} voices available
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Finding voices...
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {qualityOrder.map(quality => {
              const qualityVoices = groupedVoices[quality];
              if (!qualityVoices || qualityVoices.length === 0) return null;

              return (
                <View key={quality} style={styles.qualitySection}>
                  {/* Quality Header */}
                  <View style={styles.qualityHeader}>
                    <View style={styles.qualityLabelRow}>
                      <View style={[styles.qualityIconBg, { backgroundColor: `${getQualityColor(quality)}20` }]}>
                        <MaterialIcons 
                          name={getQualityIcon(quality)} 
                          size={14} 
                          color={getQualityColor(quality)} 
                        />
                      </View>
                      <Text style={[styles.qualityLabel, { color: theme.text }]}>
                        {quality}
                      </Text>
                    </View>
                    <Text style={[styles.voiceCountLabel, { color: theme.textTertiary }]}>
                      {qualityVoices.length}
                    </Text>
                  </View>

                  {/* Voice Cards */}
                  <View style={[styles.voiceGroup, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    {qualityVoices.map((voice, index) => (
                      <TouchableOpacity
                        key={voice.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(voice.id)}
                        style={[
                          styles.voiceRow,
                          index !== qualityVoices.length - 1 && styles.voiceRowBorder,
                          { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                        ]}
                      >
                        {/* Selection indicator */}
                        <View style={[
                          styles.radioOuter,
                          { borderColor: voice.id === selectedVoiceId ? theme.primary : theme.border }
                        ]}>
                          {voice.id === selectedVoiceId && (
                            <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                          )}
                        </View>
                        
                        {/* Voice info */}
                        <View style={styles.voiceInfo}>
                          <View style={styles.voiceNameRow}>
                            <Text style={[styles.voiceName, { color: theme.text }]}>
                              {voice.name}
                            </Text>
                            <Text style={styles.flagEmoji}>
                              {getAccentFlag(voice.accent)}
                            </Text>
                          </View>
                          <Text style={[styles.voiceAccent, { color: theme.textSecondary }]}>
                            {voice.accent} English
                          </Text>
                        </View>

                        {/* Preview button */}
                        <TouchableOpacity
                          style={[
                            styles.previewBtn,
                            { 
                              backgroundColor: previewingId === voice.id 
                                ? theme.primary 
                                : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            }
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handlePreview(voice.id);
                          }}
                        >
                          <MaterialIcons 
                            name={previewingId === voice.id ? "stop" : "play-arrow"} 
                            size={18} 
                            color={previewingId === voice.id ? '#fff' : theme.primary} 
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}

            {/* Tip Section */}
            <View style={[styles.tipCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <MaterialIcons name="info-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Download more voices in iOS Settings → Accessibility → Spoken Content → Voices
              </Text>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  qualitySection: {
    marginBottom: 20,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  qualityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  voiceCountLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  voiceGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  voiceRowBorder: {
    borderBottomWidth: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  flagEmoji: {
    fontSize: 13,
  },
  voiceAccent: {
    fontSize: 13,
    marginTop: 2,
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});

export default VoicePickerModal;

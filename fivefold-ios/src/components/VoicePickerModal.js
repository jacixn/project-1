/**
 * VoicePickerModal Component
 * Clean, modern modal to select reading voice
 * Shows Google Neural voices (best quality) first, device voices as fallback
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import bibleAudioService from '../services/bibleAudioService';
import googleTtsService from '../services/googleTtsService';
import { hapticFeedback } from '../utils/haptics';

const VoicePickerModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedSource, setSelectedSource] = useState('google'); // 'google' or 'device'
  const [googleVoices, setGoogleVoices] = useState([]);
  const [deviceVoices, setDeviceVoices] = useState([]);
  const [selectedGoogleVoice, setSelectedGoogleVoice] = useState(null);
  const [selectedDeviceVoice, setSelectedDeviceVoice] = useState(null);
  const [previewingId, setPreviewingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadVoices();
    }
  }, [visible]);

  const loadVoices = async () => {
    setLoading(true);
    
    // Get current TTS source
    const currentSource = bibleAudioService.getTTSSource();
    setSelectedSource(currentSource === 'google' ? 'google' : 'device');
    
    // Load Google TTS voices
    const gVoices = googleTtsService.getAvailableVoices();
    setGoogleVoices(gVoices);
    
    const currentGoogleVoice = googleTtsService.getCurrentVoiceInfo?.() || googleTtsService.getCurrentVoice();
    setSelectedGoogleVoice(currentGoogleVoice?.id || 'female-us');
    
    // Wait for device voices to be ready
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
    
    // Load device voices
    const dVoices = bibleAudioService.getFormattedVoiceList();
    setDeviceVoices(dVoices);
    
    const currentDeviceVoice = bibleAudioService.getCurrentVoice();
    setSelectedDeviceVoice(currentDeviceVoice?.identifier || null);
    
    setLoading(false);
  };

  const handleSelectSource = async (source) => {
    hapticFeedback.buttonPress();
    setSelectedSource(source);
    await bibleAudioService.setTTSSource(source === 'google' ? 'google' : 'device');
  };

  const handleSelectGoogleVoice = async (voiceId) => {
    hapticFeedback.success();
    setSelectedGoogleVoice(voiceId);
    await googleTtsService.setVoice(voiceId);
    
    // Also switch to Google TTS if not already
    if (selectedSource !== 'google') {
      setSelectedSource('google');
      await bibleAudioService.setTTSSource('google');
    }
  };

  const handleSelectDeviceVoice = async (voiceId) => {
    hapticFeedback.success();
    setSelectedDeviceVoice(voiceId);
    await bibleAudioService.setVoice(voiceId);
    
    // Also switch to device if not already
    if (selectedSource !== 'device') {
      setSelectedSource('device');
      await bibleAudioService.setTTSSource('device');
    }
  };

  const handlePreviewGoogle = async (voiceId) => {
    hapticFeedback.buttonPress();
    
    if (previewingId === voiceId) {
      await googleTtsService.stop();
      setPreviewingId(null);
    } else {
      setPreviewingId(voiceId);
      await googleTtsService.previewVoice(voiceId);
      setPreviewingId(null);
    }
  };

  const handlePreviewDevice = async (voiceId) => {
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

  const handleClose = () => {
    googleTtsService.stop();
    bibleAudioService.stopPreview();
    onClose?.();
  };

  const getAccentFlag = (id) => {
    if (id.includes('-uk')) return '🇬🇧';
    if (id.includes('-au')) return '🇦🇺';
    return '🇺🇸';
  };

  const getGenderIcon = (voice) => {
    return voice.gender === 'MALE' ? 'person' : 'person-outline';
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'GenZ': return '#FF6B6B'; // Coral pink - young & vibrant
      case 'ChirpHD': return '#00D9FF'; // Cyan - modern & fresh
      case 'Studio': return '#FFD700'; // Gold
      case 'Neural2': return '#9B59B6'; // Purple
      case 'WaveNet': return '#3498DB'; // Blue
      default: return theme.primary;
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'GenZ': return 'local-fire-department'; // Fire emoji vibes
      case 'ChirpHD': return 'speaker'; // Modern speaker
      case 'Studio': return 'star';
      case 'Neural2': return 'auto-awesome';
      case 'WaveNet': return 'graphic-eq';
      default: return 'mic';
    }
  };

  const getTierDescription = (tier) => {
    switch (tier) {
      case 'GenZ': return 'Young, casual & modern - no cap fr fr';
      case 'ChirpHD': return 'Newest HD voices - clear & crisp';
      case 'Studio': return 'Professional narration quality';
      case 'Neural2': return 'Natural everyday speech';
      case 'WaveNet': return 'Great quality with accent variety';
      default: return '';
    }
  };

  // Group Google voices by tier
  const groupedGoogleVoices = googleTtsService.getVoicesGroupedByTier();

  // Group device voices by quality (only show top ones)
  const topDeviceVoices = deviceVoices.slice(0, 8);

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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading voices...
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* GOOGLE TTS SECTION - RECOMMENDED */}
            <View style={styles.section}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => handleSelectSource('google')}
                style={[
                  styles.sectionHeader,
                  { 
                    backgroundColor: selectedSource === 'google' 
                      ? `${theme.primary}15` 
                      : theme.card,
                    borderColor: selectedSource === 'google' 
                      ? theme.primary 
                      : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderWidth: selectedSource === 'google' ? 2 : 1,
                  }
                ]}
              >
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.radioOuter, { borderColor: selectedSource === 'google' ? theme.primary : theme.border }]}>
                    {selectedSource === 'google' && (
                      <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                    )}
                  </View>
                  <View>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Google Neural Voice
                      </Text>
                      <View style={[styles.badge, { backgroundColor: '#34C759' }]}>
                        <Text style={styles.badgeText}>BEST</Text>
                      </View>
                    </View>
                    <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                      Most realistic, human-like voices
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="auto-awesome" size={24} color={theme.primary} />
              </TouchableOpacity>

              {/* Google Voice Options - Organized by Tier */}
              {selectedSource === 'google' && Object.entries(groupedGoogleVoices).map(([tier, tierVoices]) => (
                <View key={tier} style={styles.tierSection}>
                  {/* Tier Header */}
                  <View style={styles.tierHeader}>
                    <View style={[styles.tierIconBg, { backgroundColor: `${getTierColor(tier)}20` }]}>
                      <MaterialIcons name={getTierIcon(tier)} size={14} color={getTierColor(tier)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tierLabel, { color: theme.text }]}>{tier}</Text>
                      <Text style={[styles.tierDescription, { color: theme.textSecondary }]}>
                        {getTierDescription(tier)}
                      </Text>
                    </View>
                    <Text style={[styles.tierCount, { color: theme.textTertiary }]}>{tierVoices.length}</Text>
                  </View>
                  
                  {/* Voices in this tier */}
                  <View style={[styles.voiceGrid, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    {tierVoices.map((voice, index) => (
                      <TouchableOpacity
                        key={voice.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelectGoogleVoice(voice.id)}
                        style={[
                          styles.voiceCard,
                          selectedGoogleVoice === voice.id && { backgroundColor: `${getTierColor(tier)}15` },
                          index !== tierVoices.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                        ]}
                      >
                        <View style={styles.voiceCardLeft}>
                          <View style={[
                            styles.voiceIcon,
                            { backgroundColor: selectedGoogleVoice === voice.id ? `${getTierColor(tier)}20` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                          ]}>
                            <MaterialIcons 
                              name={getGenderIcon(voice)} 
                              size={18} 
                              color={selectedGoogleVoice === voice.id ? getTierColor(tier) : theme.textSecondary} 
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.voiceName, { color: theme.text }]}>
                              {voice.name}
                            </Text>
                            <Text style={[styles.voiceAccent, { color: theme.textSecondary }]} numberOfLines={1}>
                              {voice.description || `${getAccentFlag(voice.id)} English`}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.voiceCardRight}>
                          {selectedGoogleVoice === voice.id && (
                            <MaterialIcons name="check-circle" size={22} color={getTierColor(tier)} />
                          )}
                          <TouchableOpacity
                            style={[
                              styles.previewBtn,
                              { backgroundColor: previewingId === voice.id ? getTierColor(tier) : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handlePreviewGoogle(voice.id);
                            }}
                          >
                            <MaterialIcons 
                              name={previewingId === voice.id ? "stop" : "play-arrow"} 
                              size={18} 
                              color={previewingId === voice.id ? '#fff' : getTierColor(tier)} 
                            />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* DEVICE VOICES SECTION */}
            <View style={styles.section}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => handleSelectSource('device')}
                style={[
                  styles.sectionHeader,
                  { 
                    backgroundColor: selectedSource === 'device' 
                      ? `${theme.primary}15` 
                      : theme.card,
                    borderColor: selectedSource === 'device' 
                      ? theme.primary 
                      : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderWidth: selectedSource === 'device' ? 2 : 1,
                  }
                ]}
              >
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.radioOuter, { borderColor: selectedSource === 'device' ? theme.primary : theme.border }]}>
                    {selectedSource === 'device' && (
                      <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                    )}
                  </View>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Device Voice
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                      Works offline, built into iOS
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="phone-iphone" size={24} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Device Voice Options */}
              {selectedSource === 'device' && topDeviceVoices.length > 0 && (
                <View style={[styles.voiceGrid, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  {topDeviceVoices.map((voice, index) => (
                    <TouchableOpacity
                      key={voice.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectDeviceVoice(voice.id)}
                      style={[
                        styles.voiceCard,
                        selectedDeviceVoice === voice.id && { backgroundColor: `${theme.primary}15` },
                        index !== topDeviceVoices.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ]}
                    >
                      <View style={styles.voiceCardLeft}>
                        <View style={[
                          styles.voiceIcon,
                          { backgroundColor: selectedDeviceVoice === voice.id ? `${theme.primary}20` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                        ]}>
                          <MaterialIcons 
                            name="volume-up" 
                            size={18} 
                            color={selectedDeviceVoice === voice.id ? theme.primary : theme.textSecondary} 
                          />
                        </View>
                        <View>
                          <View style={styles.voiceNameRow}>
                            <Text style={[styles.voiceName, { color: theme.text }]}>
                              {voice.name}
                            </Text>
                            {voice.quality === 'Premium' || voice.quality === 'Enhanced' ? (
                              <View style={[styles.qualityBadge, { backgroundColor: voice.quality === 'Premium' ? '#FFD70030' : '#9B59B630' }]}>
                                <Text style={[styles.qualityBadgeText, { color: voice.quality === 'Premium' ? '#FFD700' : '#9B59B6' }]}>
                                  {voice.quality}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={[styles.voiceAccent, { color: theme.textSecondary }]}>
                            {voice.accent} English
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.voiceCardRight}>
                        {selectedDeviceVoice === voice.id && (
                          <MaterialIcons name="check-circle" size={22} color={theme.primary} />
                        )}
                        <TouchableOpacity
                          style={[
                            styles.previewBtn,
                            { backgroundColor: previewingId === voice.id ? theme.primary : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handlePreviewDevice(voice.id);
                          }}
                        >
                          <MaterialIcons 
                            name={previewingId === voice.id ? "stop" : "play-arrow"} 
                            size={18} 
                            color={previewingId === voice.id ? '#fff' : theme.primary} 
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {selectedSource === 'device' && topDeviceVoices.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                  <MaterialIcons name="info-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No device voices found. Download voices in iOS Settings → Accessibility → Spoken Content → Voices
                  </Text>
                </View>
              )}
            </View>

            {/* Info tip */}
            <View style={[styles.tipCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <MaterialIcons name="lightbulb-outline" size={18} color={theme.primary} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Google Neural voices sound most natural but require internet. Device voices work offline.
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
  },
  section: {
    marginBottom: 16,
  },
  tierSection: {
    marginTop: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  tierIconBg: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tierDescription: {
    fontSize: 11,
    marginTop: 1,
  },
  tierCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
  voiceGrid: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  voiceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voiceCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceAccent: {
    fontSize: 13,
    marginTop: 2,
  },
  qualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    marginTop: 10,
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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

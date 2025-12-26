import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassEffect';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ThemeModal = ({ visible, onClose }) => {
  const { theme, currentTheme, changeTheme, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  const [lightModeExpanded, setLightModeExpanded] = useState(false);
  const [darkModeExpanded, setDarkModeExpanded] = useState(false);

  console.log('ThemeModal rendered with visible:', visible);

  const handleThemeSelect = (themeId) => {
    changeTheme(themeId);
    // Optionally close modal after selection
    // setTimeout(() => onClose(), 300);
  };

  const toggleLightMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLightModeExpanded(!lightModeExpanded);
  };

  const toggleDarkMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDarkModeExpanded(!darkModeExpanded);
  };

  const getCurrentThemeDisplay = () => {
    if (isBlushTheme) return { name: 'Blush Bloom', mode: 'Light' };
    if (isEternaTheme) return { name: 'Eterna', mode: 'Light' };
    if (isFaithTheme) return { name: 'Faith', mode: 'Light' };
    if (isSailormoonTheme) return { name: 'Sailor Moon', mode: 'Light' };
    if (isCresviaTheme) return { name: 'Cresvia', mode: 'Dark' };
    if (isSpidermanTheme) return { name: 'Spiderman', mode: 'Dark' };
    return { name: 'Default', mode: 'Unknown' };
  };

  const current = getCurrentThemeDisplay();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Enhanced Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              onPress={onClose}
              style={[styles.closeCircle, { backgroundColor: theme.surface }]}
            >
              <MaterialIcons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.mainTitle, { color: theme.text }]}>Appearance</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.doneText, { color: theme.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Current Theme Display */}
          <GlassCard style={styles.currentThemeCard} blushMode={isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme}>
            <Text style={[styles.currentLabel, { color: theme.textSecondary }]}>Current Theme</Text>
            <View style={styles.currentThemeInfo}>
              <View style={styles.currentTextContainer}>
                <Text style={[styles.currentName, { color: theme.text }]}>{current.name}</Text>
                <Text style={[styles.currentMode, { color: theme.textSecondary }]}>{current.mode} Mode</Text>
              </View>
            </View>
          </GlassCard>

          {/* Light Mode Section */}
          <GlassCard style={styles.modeSection} blushMode={isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme}>
            <TouchableOpacity 
              style={styles.modeSectionHeader}
              onPress={toggleLightMode}
              activeOpacity={0.7}
            >
              <View style={styles.modeSectionLeft}>
                <MaterialIcons name="wb-sunny" size={24} color={theme.text} />
                <Text style={[styles.modeSectionTitle, { color: theme.text }]}>Light Mode</Text>
              </View>
              <MaterialIcons 
                name={lightModeExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>

            {lightModeExpanded && (
              <View style={styles.themesContainer}>
                {/* Blush Bloom */}
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: isBlushTheme ? theme.primary + '20' : theme.surface,
                      borderColor: isBlushTheme ? theme.primary : theme.border,
                      borderWidth: isBlushTheme ? 2 : 1,
                    }
                  ]}
                  onPress={() => handleThemeSelect('blush-bloom')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeName, 
                    { 
                      color: isBlushTheme ? theme.primary : theme.text,
                      fontWeight: isBlushTheme ? '700' : '600'
                    }
                  ]}>
                    Blush Bloom
                  </Text>
                  {isBlushTheme && (
                    <MaterialIcons name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>

                {/* Eterna */}
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: isEternaTheme ? theme.primary + '20' : theme.surface,
                      borderColor: isEternaTheme ? theme.primary : theme.border,
                      borderWidth: isEternaTheme ? 2 : 1,
                    }
                  ]}
                  onPress={() => handleThemeSelect('eterna')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeName, 
                    { 
                      color: isEternaTheme ? theme.primary : theme.text,
                      fontWeight: isEternaTheme ? '700' : '600'
                    }
                  ]}>
                    Eterna
                  </Text>
                  {isEternaTheme && (
                    <MaterialIcons name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>

                {/* Faith */}
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: isFaithTheme ? theme.primary + '20' : theme.surface,
                      borderColor: isFaithTheme ? theme.primary : theme.border,
                      borderWidth: isFaithTheme ? 2 : 1,
                    }
                  ]}
                  onPress={() => handleThemeSelect('faith')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeName, 
                    { 
                      color: isFaithTheme ? theme.primary : theme.text,
                      fontWeight: isFaithTheme ? '700' : '600'
                    }
                  ]}>
                    Faith
                  </Text>
                  {isFaithTheme && (
                    <MaterialIcons name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>

                {/* Sailor Moon */}
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: isSailormoonTheme ? theme.primary + '20' : theme.surface,
                      borderColor: isSailormoonTheme ? theme.primary : theme.border,
                      borderWidth: isSailormoonTheme ? 2 : 1,
                    }
                  ]}
                  onPress={() => handleThemeSelect('sailormoon')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeName, 
                    { 
                      color: isSailormoonTheme ? theme.primary : theme.text,
                      fontWeight: isSailormoonTheme ? '700' : '600'
                    }
                  ]}>
                    Sailor Moon
                  </Text>
                  {isSailormoonTheme && (
                    <MaterialIcons name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>

          {/* Dark Mode Section */}
          <GlassCard style={styles.modeSection} blushMode={isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme}>
            <TouchableOpacity 
              style={styles.modeSectionHeader}
              onPress={toggleDarkMode}
              activeOpacity={0.7}
            >
              <View style={styles.modeSectionLeft}>
                <MaterialIcons name="nightlight-round" size={24} color={theme.text} />
                <Text style={[styles.modeSectionTitle, { color: theme.text }]}>Dark Mode</Text>
              </View>
              <MaterialIcons 
                name={darkModeExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>

            {darkModeExpanded && (
              <View style={styles.themesContainer}>
                {/* Cresvia */}
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: isCresviaTheme ? theme.primary + '20' : theme.surface,
                      borderColor: isCresviaTheme ? theme.primary : theme.border,
                      borderWidth: isCresviaTheme ? 2 : 1,
                    }
                  ]}
                  onPress={() => handleThemeSelect('cresvia')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeName, 
                    { 
                      color: isCresviaTheme ? theme.primary : theme.text,
                      fontWeight: isCresviaTheme ? '700' : '600'
                    }
                  ]}>
                    Cresvia
                  </Text>
                  {isCresviaTheme && (
                    <MaterialIcons name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>

                {/* Spiderman */}
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: isSpidermanTheme ? theme.primary + '20' : theme.surface,
                      borderColor: isSpidermanTheme ? theme.primary : theme.border,
                      borderWidth: isSpidermanTheme ? 2 : 1,
                    }
                  ]}
                  onPress={() => handleThemeSelect('spiderman')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeName, 
                    { 
                      color: isSpidermanTheme ? theme.primary : theme.text,
                      fontWeight: isSpidermanTheme ? '700' : '600'
                    }
                  ]}>
                    Spiderman
                  </Text>
                  {isSpidermanTheme && (
                    <MaterialIcons name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 10,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  doneText: {
    fontSize: 17,
    fontWeight: '700',
  },
  // Current Theme Card
  currentThemeCard: {
    padding: 20,
    marginBottom: 24,
    borderRadius: 16,
  },
  currentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentThemeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTextContainer: {
    flex: 1,
  },
  currentName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentMode: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Mode Sections
  modeSection: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modeSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Theme Options
  themesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  themeName: {
    fontSize: 17,
    flex: 1,
  },
});

export default ThemeModal;


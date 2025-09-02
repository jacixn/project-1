import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const BibleStudyModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedSection, setSelectedSection] = useState('main');

  const studySections = [
    {
      id: 'characters',
      title: 'Bible Characters',
      icon: 'people',
      description: 'Explore profiles of key Bible figures',
      color: '#FF6B6B',
      features: ['Character profiles', 'Family trees', 'Key events', 'Life lessons']
    },
    {
      id: 'timeline',
      title: 'Bible Timeline',
      icon: 'timeline',
      description: 'Journey through Biblical history',
      color: '#4ECDC4',
      features: ['Chronological events', 'Historical dates', 'Quick verse links', 'Era overview']
    },
    {
      id: 'maps',
      title: 'Interactive Maps',
      icon: 'map',
      description: 'Discover Biblical locations',
      color: '#45B7D1',
      features: ['Key locations', 'Journey routes', 'Historical context', 'Character connections']
    },
    {
      id: 'themes',
      title: 'Thematic Guides',
      icon: 'category',
      description: 'Study by topics and themes',
      color: '#96CEB4',
      features: ['Faith stories', 'Leadership lessons', 'Miracles', 'Prophecies']
    },
    {
      id: 'verses',
      title: 'Key Verses',
      icon: 'format_quote',
      description: 'Essential verses by topic',
      color: '#FECA57',
      features: ['Topical verses', 'Memory verses', 'Life guidance', 'Inspirational quotes']
    },
    {
      id: 'facts',
      title: 'Fast Facts',
      icon: 'lightbulb',
      description: 'Did you know? Bible trivia',
      color: '#FF9FF3',
      features: ['Amazing facts', 'Quick summaries', 'Fun trivia', 'Historical insights']
    },
    {
      id: 'reading',
      title: 'Reading Plans',
      icon: 'schedule',
      description: 'Chronological Bible reading',
      color: '#54A0FF',
      features: ['Historical order', 'Daily readings', 'Progress tracking', 'Guided study']
    },
    {
      id: 'parallels',
      title: 'Parallel Stories',
      icon: 'compare_arrows',
      description: 'Connected Old & New Testament',
      color: '#5F27CD',
      features: ['Story connections', 'Prophecy fulfillment', 'Type & antitype', 'Cross-references']
    },
    {
      id: 'audio',
      title: 'Audio Learning',
      icon: 'volume_up',
      description: 'Listen and learn',
      color: '#00D2D3',
      features: ['Name pronunciation', 'Story summaries', 'Audio guides', 'Listening plans']
    },
    {
      id: 'quiz',
      title: 'Quiz & Games',
      icon: 'quiz',
      description: 'Test your Bible knowledge',
      color: '#FF7675',
      features: ['Interactive quizzes', 'Memory games', 'Progress tracking', 'Achievement badges']
    },
    {
      id: 'culture',
      title: 'Daily Life Context',
      icon: 'home',
      description: 'Life in Biblical times',
      color: '#A29BFE',
      features: ['Ancient customs', 'Food & clothing', 'Social structure', 'Historical context']
    }
  ];

  const handleSectionPress = (sectionId) => {
    hapticFeedback.light();
    setSelectedSection(sectionId);
  };

  const renderMainMenu = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerContainer}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>📚 Bible Study</Text>
        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
          Interactive learning tools to deepen your understanding
        </Text>
      </View>

      <View style={styles.sectionsGrid}>
        {studySections.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.sectionCard, { backgroundColor: theme.card }]}
            onPress={() => handleSectionPress(section.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[`${section.color}20`, `${section.color}10`]}
              style={styles.sectionGradient}
            >
              <View style={[styles.sectionIconContainer, { backgroundColor: `${section.color}20` }]}>
                <MaterialIcons name={section.icon} size={28} color={section.color} />
              </View>
              
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                  {section.description}
                </Text>
                
                <View style={styles.featuresContainer}>
                  {section.features.slice(0, 2).map((feature, idx) => (
                    <View key={idx} style={styles.featureTag}>
                      <Text style={[styles.featureText, { color: section.color }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.comingSoonContainer}>
        <BlurView intensity={20} style={styles.comingSoonCard}>
          <MaterialIcons name="construction" size={24} color={theme.warning} />
          <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
            Coming Soon!
          </Text>
          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
            These amazing Bible study features are being built with love and care. 
            Stay tuned for an incredible learning experience!
          </Text>
        </BlurView>
      </View>
    </ScrollView>
  );

  const renderSectionDetail = () => {
    const section = studySections.find(s => s.id === selectedSection);
    if (!section) return null;

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              hapticFeedback.light();
              setSelectedSection('main');
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <View style={styles.detailTitleContainer}>
            <View style={[styles.detailIcon, { backgroundColor: `${section.color}20` }]}>
              <MaterialIcons name={section.icon} size={32} color={section.color} />
            </View>
            <Text style={[styles.detailTitle, { color: theme.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
              {section.description}
            </Text>
          </View>
        </View>

        <View style={styles.comingSoonContainer}>
          <BlurView intensity={20} style={styles.comingSoonCard}>
            <MaterialIcons name="build" size={32} color={section.color} />
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              {section.title} - In Development
            </Text>
            <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
              This section will include:
            </Text>
            
            <View style={styles.featuresList}>
              {section.features.map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={16} color={section.color} />
                  <Text style={[styles.featureItemText, { color: theme.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </BlurView>
        </View>
      </ScrollView>
    );
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
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Bible Study</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedSection === 'main' ? renderMainMenu() : renderSectionDetail()}
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
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionsGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureText: {
    fontSize: 11,
    fontWeight: '500',
  },
  comingSoonContainer: {
    padding: 20,
  },
  comingSoonCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailHeader: {
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  detailTitleContainer: {
    alignItems: 'center',
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  featureItemText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});

export default BibleStudyModal;

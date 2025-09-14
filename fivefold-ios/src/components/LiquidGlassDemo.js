import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  LiquidGlassCard,
  LiquidVerseCard,
  LiquidPrayerCard,
  LiquidGlassHeader,
  LiquidGlassFAB,
  LiquidGlassModal,
} from './LiquidGlass';

const LiquidGlassDemo = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);

  // Sample data
  const sampleVerses = [
    {
      id: 1,
      text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
      reference: "Jeremiah 29:11",
      category: "Hope"
    },
    {
      id: 2,
      text: "Trust in the Lord with all your heart and lean not on your own understanding.",
      reference: "Proverbs 3:5",
      category: "Trust"
    },
    {
      id: 3,
      text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
      reference: "Joshua 1:9",
      category: "Courage"
    }
  ];

  const samplePrayers = [
    {
      id: 1,
      title: "Morning Prayer",
      time: "6:00 AM",
      completed: true
    },
    {
      id: 2,
      title: "Midday Reflection",
      time: "12:00 PM",
      completed: false
    },
    {
      id: 3,
      title: "Evening Gratitude",
      time: "9:00 PM",
      completed: false
    }
  ];

  if (!visible) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Liquid Glass Header */}
      <LiquidGlassHeader
        title="Liquid Glass Demo"
        onBack={onClose}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Demo Title */}
        <LiquidGlassCard style={styles.titleCard}>
          <View style={styles.titleContent}>
            <MaterialIcons name="auto-awesome" size={32} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              iOS 26 Liquid Glass Effects
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Experience the future of mobile UI design
            </Text>
          </View>
        </LiquidGlassCard>

        {/* Features Section */}
        <LiquidGlassCard style={styles.featuresCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            ✨ Amazing Features
          </Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="blur-on" size={20} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Dynamic Blur Effects
              </Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="touch-app" size={20} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Morphable Surfaces
              </Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="gradient" size={20} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Liquid Gradients
              </Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="animation" size={20} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Smooth Animations
              </Text>
            </View>
          </View>
        </LiquidGlassCard>

        {/* Bible Verses Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>
          📖 Liquid Bible Verses
        </Text>
        {sampleVerses.map((verse) => (
          <LiquidVerseCard
            key={verse.id}
            verse={verse}
            onPress={() => console.log('Verse pressed:', verse.reference)}
          />
        ))}

        {/* Prayer Cards Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>
          🙏 Liquid Prayer Cards
        </Text>
        {samplePrayers.map((prayer) => (
          <LiquidPrayerCard
            key={prayer.id}
            prayer={prayer}
            onPress={() => console.log('Prayer pressed:', prayer.title)}
          />
        ))}

        {/* Interactive Demo */}
        <LiquidGlassCard style={styles.interactiveCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🎮 Interactive Demo
          </Text>
          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: theme.primary + '20' }]}
            onPress={() => setShowModal(true)}
          >
            <MaterialIcons name="open-in-new" size={24} color={theme.primary} />
            <Text style={[styles.demoButtonText, { color: theme.primary }]}>
              Open Liquid Modal
            </Text>
          </TouchableOpacity>
        </LiquidGlassCard>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <LiquidGlassFAB
        icon="favorite"
        onPress={() => console.log('FAB pressed!')}
      />

      {/* Liquid Glass Modal */}
      <LiquidGlassModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      >
        <View style={styles.modalContent}>
          <MaterialIcons name="celebration" size={48} color={theme.primary} />
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Liquid Glass Magic! ✨
          </Text>
          <Text style={[styles.modalText, { color: theme.textSecondary }]}>
            This modal demonstrates the beautiful liquid glass effects that make your Bible app feel premium and modern.
          </Text>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowModal(false)}
          >
            <Text style={[styles.modalButtonText, { color: '#fff' }]}>
              Amazing!
            </Text>
          </TouchableOpacity>
        </View>
      </LiquidGlassModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleCard: {
    marginBottom: 20,
  },
  titleContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  interactiveCard: {
    marginTop: 20,
    marginBottom: 20,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
  modalContent: {
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LiquidGlassDemo;

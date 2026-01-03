import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard, GlassButton, FloatingGlass } from './GlassEffect';
import { 
  FadeInText, 
  SlideUpText, 
  SplitTextAnimation, 
  TypewriterText, 
  ShimmerText, 
  BounceText,
  GradientText 
} from './TextAnimations';

const BlushBloomDemo = ({ visible, onClose }) => {
  const { theme, isBlushTheme, changeTheme } = useTheme();
  const [currentAnimation, setCurrentAnimation] = useState(0);

  const animations = [
    { name: 'Fade In', component: FadeInText },
    { name: 'Slide Up', component: SlideUpText },
    { name: 'Split Text', component: SplitTextAnimation },
    { name: 'Typewriter', component: TypewriterText },
    { name: 'Shimmer', component: ShimmerText },
    { name: 'Bounce', component: BounceText },
    { name: 'Gradient', component: GradientText },
  ];

  const nextAnimation = () => {
    setCurrentAnimation((prev) => (prev + 1) % animations.length);
  };

  const CurrentAnimationComponent = animations[currentAnimation].component;

  if (!visible) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            🌸 Blush Bloom Theme Demo
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Theme Switcher */}
        <GlassCard style={styles.section} blushMode={isBlushTheme}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🎨 Theme Switcher
          </Text>
          <View style={styles.themeButtons}>
            <GlassButton onPress={() => changeTheme('light')} style={styles.themeButton}>
              <Text style={[styles.buttonText, { color: theme.text }]}>☀️ Light</Text>
            </GlassButton>
            <GlassButton onPress={() => changeTheme('dark')} style={styles.themeButton}>
              <Text style={[styles.buttonText, { color: theme.text }]}>🌙 Dark</Text>
            </GlassButton>
            <GlassButton onPress={() => changeTheme('blush-bloom')} style={styles.themeButton}>
              <Text style={[styles.buttonText, { color: theme.text }]}>🌸 Blush</Text>
            </GlassButton>
          </View>
        </GlassCard>

        {/* Text Animations Demo */}
        <GlassCard style={styles.section} blushMode={isBlushTheme}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            ✨ Text Animations
          </Text>
          
          <View style={styles.animationDemo}>
            <CurrentAnimationComponent
              key={currentAnimation} // Force re-render for animation
              style={[styles.demoText, { color: theme.primary }]}
              delay={200}
              duration={1000}
              animationType="slideUp"
            >
              "For I know the plans I have for you," declares the Lord
            </CurrentAnimationComponent>
          </View>

          <Text style={[styles.animationName, { color: theme.textSecondary }]}>
            Current: {animations[currentAnimation].name}
          </Text>

          <GlassButton onPress={nextAnimation} style={styles.nextButton}>
            <MaterialIcons name="refresh" size={20} color={theme.text} />
            <Text style={[styles.buttonText, { color: theme.text, marginLeft: 8 }]}>
              Next Animation
            </Text>
          </GlassButton>
        </GlassCard>

        {/* Glass Effects Showcase */}
        <GlassCard style={styles.section} blushMode={isBlushTheme}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🔮 Glass Effects
          </Text>
          
          <FloatingGlass style={styles.floatingDemo}>
            <Text style={[styles.glassText, { color: theme.text }]}>
              Floating Glass Card
            </Text>
            <Text style={[styles.glassSubtext, { color: theme.textSecondary }]}>
              Beautiful transparent effects
            </Text>
          </FloatingGlass>

          <View style={styles.glassGrid}>
            <GlassCard style={styles.miniCard} blushMode={isBlushTheme}>
              <MaterialIcons name="favorite" size={24} color={theme.primary} />
              <Text style={[styles.miniText, { color: theme.text }]}>Love</Text>
            </GlassCard>
            
            <GlassCard style={styles.miniCard} blushMode={isBlushTheme}>
              <MaterialIcons name="star" size={24} color={theme.warning} />
              <Text style={[styles.miniText, { color: theme.text }]}>Faith</Text>
            </GlassCard>
            
            <GlassCard style={styles.miniCard} blushMode={isBlushTheme}>
              <MaterialIcons name="stars" size={24} color={theme.info} />
              <Text style={[styles.miniText, { color: theme.text }]}>Hope</Text>
            </GlassCard>
          </View>
        </GlassCard>

        {/* Bible Verse with Animation */}
        <GlassCard style={styles.section} blushMode={isBlushTheme}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📖 Animated Verse
          </Text>
          
          <TypewriterText
            style={[styles.verseText, { color: theme.text }]}
            speed={50}
            delay={500}
          >
            "She is clothed with strength and dignity; she can laugh at the days to come."
          </TypewriterText>
          
          <FadeInText
            style={[styles.verseReference, { color: theme.textSecondary }]}
            delay={3000}
          >
            - Proverbs 31:25
          </FadeInText>
        </GlassCard>

        {/* Color Palette */}
        {isBlushTheme && (
          <GlassCard style={styles.section} blushMode={true}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              🌸 Blush Bloom Palette
            </Text>
            
            <View style={styles.colorGrid}>
              <View style={[styles.colorSwatch, { backgroundColor: theme.primary }]}>
                <Text style={styles.colorLabel}>Primary</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.primaryLight }]}>
                <Text style={styles.colorLabel}>Light</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.primaryDark }]}>
                <Text style={[styles.colorLabel, { color: '#fff' }]}>Dark</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.surface }]}>
                <Text style={[styles.colorLabel, { color: theme.text }]}>Surface</Text>
              </View>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  section: {
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  themeButton: {
    flex: 1,
    padding: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  animationDemo: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  demoText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  animationName: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  floatingDemo: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  glassText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  glassSubtext: {
    fontSize: 14,
  },
  glassGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  miniCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  miniText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  verseReference: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});

export default BlushBloomDemo;




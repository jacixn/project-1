import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

// "Byline": the About screen as a single magazine page. Hierarchy comes from
// type size, weight, tracking and whitespace only. No cards, circles, blurs,
// shadows or idle motion; the accent colour is reserved for the second line
// of the headline, the rules, the kicker bar, the initial, the link and the
// square end mark.

const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
const CONTACT_EMAIL = 'biblelyios@gmail.com';
const HEX6 = /^#[0-9a-fA-F]{6}$/;

// Alpha-zero of the SAME hue. Never the 'transparent' keyword, which fades
// through grey on a gradient. Falls back to the solid colour if a theme ever
// hands us something that is not 6-digit hex.
const withAlpha = (hex, alphaHex) => (HEX6.test(hex) ? hex + alphaHex : hex);

const AboutBiblelyModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();

  const accent = isDark ? theme.primaryLight || theme.primary : theme.primary;
  const accentSoft = theme.primaryLight || accent;
  const fade = withAlpha(accent, '00');

  // Entrance only. Every value runs on the native driver and resets when the
  // modal is hidden so the page settles top to bottom on every open.
  const mastheadOpacity = useRef(new Animated.Value(0)).current;
  const headOpacity = useRef(new Animated.Value(0)).current;
  const headY = useRef(new Animated.Value(28)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyY = useRef(new Animated.Value(18)).current;
  const ruleScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mastheadOpacity.setValue(0);
    headOpacity.setValue(0);
    headY.setValue(28);
    bodyOpacity.setValue(0);
    bodyY.setValue(18);
    ruleScale.setValue(0);

    if (!visible) return undefined;

    const entrance = Animated.parallel([
      Animated.timing(mastheadOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(headOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(headY, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(bodyOpacity, {
        toValue: 1,
        duration: 420,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.timing(bodyY, {
        toValue: 0,
        duration: 420,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // The long rule draws itself left to right (scaleX with a left origin,
      // so no layout measurement is needed).
      Animated.timing(ruleScale, {
        toValue: 1,
        duration: 520,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    entrance.start();

    return () => entrance.stop();
  }, [visible]);

  const handleClose = () => {
    hapticFeedback.medium();
    onClose?.();
  };

  const handleEmail = async () => {
    hapticFeedback.light();
    try {
      await Linking.openURL(`mailto:${CONTACT_EMAIL}`);
    } catch (e) {
      // No mail client on this device. The address is selectable, so it can
      // still be copied by hand.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.page, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Masthead: fixed above the scroll, copy slides under it */}
        <Animated.View
          style={[
            styles.masthead,
            { backgroundColor: theme.background, opacity: mastheadOpacity },
          ]}
        >
          <View style={styles.mastheadRow}>
            <Text style={[styles.kicker, { color: theme.textSecondary }]}>
              ABOUT BIBLELY
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="close" size={26} color={theme.text} />
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            {/* Headline block: greeting, credentials, gradient rule */}
            <Animated.View
              style={{ opacity: headOpacity, transform: [{ translateY: headY }] }}
            >
              <Text
                style={[styles.headline, { color: theme.text }]}
                maxFontSizeMultiplier={1.2}
              >
                Hi, I'm{'\n'}<Text style={{ color: accent }}>Jason.</Text>
              </Text>

              <View style={styles.credentials}>
                <Text style={[styles.credential, { color: theme.textSecondary }]}>
                  {'CS & CF GRADUATE'}
                </Text>
                <View
                  style={[styles.credentialSpacer, { backgroundColor: theme.border }]}
                />
                <Text style={[styles.credential, { color: theme.textSecondary }]}>
                  SOFTWARE ENGINEER
                </Text>
              </View>

              <View style={styles.ruleClip}>
                <Animated.View
                  style={[styles.ruleDraw, { transform: [{ scaleX: ruleScale }] }]}
                >
                  <LinearGradient
                    colors={[accent, accentSoft, fade]}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ruleFill}
                  />
                </Animated.View>
              </View>
            </Animated.View>

            {/* Story and closing */}
            <Animated.View
              style={{ opacity: bodyOpacity, transform: [{ translateY: bodyY }] }}
            >
              <Text style={[styles.overline, { color: accent }]}>
                WHY I BUILT THIS
              </Text>

              {/* Lead paragraph with a hung initial. The initial is the whole
                  first word, so nothing is split across two type sizes. */}
              <View style={styles.leadRow}>
                <Text
                  style={[styles.initial, { color: accent }]}
                  maxFontSizeMultiplier={1.2}
                >
                  I
                </Text>
                <Text style={[styles.body, styles.leadBody, { color: theme.text }]}>
                  love reading the Bible and wanted an app to help me read daily,
                  so I tried a few popular Bible apps.
                </Text>
              </View>

              <Text style={[styles.body, styles.paragraph, { color: theme.text }]}>
                Some had paywalls, others just weren't what I was looking for. I
                wanted something simple that combined faith, productivity, and
                wellness in one place.
              </Text>

              <Text style={[styles.body, styles.paragraph, { color: theme.text }]}>
                So I built Biblely. It's got everything I wanted: Bible reading,
                daily prayers, tasks to stay productive, and even fitness
                tracking.{' '}
                <Text style={[styles.emphasis, { color: accent }]}>
                  All completely free.
                </Text>
              </Text>

              <Text style={[styles.body, styles.paragraph, { color: theme.text }]}>
                I made this for myself, but I hope it helps you too.
              </Text>

              {/* Pull-out: the last sentence of the story, set large */}
              <View style={styles.pullout}>
                <LinearGradient
                  colors={[accent, accentSoft]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.pulloutBar}
                />
                <Text style={[styles.pulloutText, { color: theme.text }]}>
                  No subscriptions, no paywalls, just a simple app to help you
                  grow.
                </Text>
              </View>

              {/* Section break */}
              <LinearGradient
                colors={[accent, fade]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shortRule}
              />

              <Text style={[styles.thanks, { color: theme.text }]}>
                Thanks for being here.
              </Text>
              <Text style={[styles.note, { color: theme.textSecondary }]}>
                Hope Biblely helps you out. If you've got any ideas or feedback,
                I'd love to hear them.
              </Text>

              <Pressable
                onPress={handleEmail}
                accessibilityRole="link"
                accessibilityLabel={`Email ${CONTACT_EMAIL}`}
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              >
                <Text selectable style={[styles.linkText, { color: accent }]}>
                  {CONTACT_EMAIL}
                </Text>
                <View style={[styles.linkRule, { backgroundColor: accent }]} />
              </Pressable>

              {/* Signature with a square end mark */}
              <View style={styles.signatureRow}>
                <Text style={[styles.signature, { color: theme.text }]}>Jason</Text>
                <View style={[styles.endMark, { backgroundColor: accent }]} />
              </View>

              {/* Colophon: the icon as a flat ink mark, tinted, no backing */}
              <View style={styles.colophon}>
                <Image
                  source={require('../../assets/animated-icon.png')}
                  style={[styles.colophonMark, { tintColor: theme.textSecondary }]}
                  resizeMode="contain"
                />
                <Text style={[styles.colophonText, { color: theme.textSecondary }]}>
                  BIBLELY
                </Text>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const COLUMN = {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
  paddingHorizontal: 24,
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  // Masthead
  masthead: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  mastheadRow: {
    ...COLUMN,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // Optically align the glyph's right edge with the 24pt text margin.
    marginRight: -9,
  },
  pressed: {
    opacity: 0.4,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 64,
  },
  column: COLUMN,

  // Headline block
  headline: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -1.8,
    paddingRight: 6,
  },
  credentials: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  credential: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.6,
  },
  credentialSpacer: {
    width: 1,
    height: 12,
    marginHorizontal: 10,
  },
  ruleClip: {
    marginTop: 22,
    height: 2,
    overflow: 'hidden',
  },
  ruleDraw: {
    width: '100%',
    height: 2,
    transformOrigin: 'left',
  },
  ruleFill: {
    flex: 1,
  },

  // Story
  overline: {
    marginTop: 40,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  leadRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  initial: {
    fontFamily: SERIF,
    fontWeight: '700',
    fontSize: 76,
    lineHeight: 80,
    marginRight: 10,
    marginTop: -4,
  },
  body: {
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '400',
  },
  leadBody: {
    flex: 1,
  },
  paragraph: {
    marginTop: 16,
  },
  emphasis: {
    fontWeight: '600',
  },
  pullout: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pulloutBar: {
    width: 3,
  },
  pulloutText: {
    flex: 1,
    paddingLeft: 16,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // Closing
  shortRule: {
    marginTop: 48,
    width: 56,
    height: 2,
  },
  thanks: {
    marginTop: 18,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  note: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '400',
  },
  link: {
    marginTop: 22,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  linkRule: {
    height: 2,
    marginTop: 3,
  },
  signatureRow: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  signature: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 30,
    lineHeight: 36,
  },
  endMark: {
    width: 8,
    height: 8,
    marginLeft: 10,
    // Lifts the square from the line-box bottom to the italic's baseline.
    marginBottom: 8,
  },
  colophon: {
    marginTop: 56,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
  },
  colophonMark: {
    width: 22,
    height: 22,
  },
  colophonText: {
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
});

export default AboutBiblelyModal;

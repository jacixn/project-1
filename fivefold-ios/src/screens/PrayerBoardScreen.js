import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Animated as RNAnimated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { Accelerometer } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH;
const CANVAS_HEIGHT = SCREEN_HEIGHT;

const BOARDS_STORAGE_KEY = 'prayerBoards_list';
const OLD_STORAGE_KEY = 'prayerBoard_data';

const BACKGROUNDS = [
  // Naturals
  { id: 'cork', label: 'Cork', colors: ['#C4956A', '#B8845A', '#D4A574'] },
  { id: 'linen', label: 'Linen', colors: ['#E8DDD3', '#DDD0C4', '#F0E6DC'] },
  { id: 'cream', label: 'Cream', colors: ['#FFF8E7', '#FFF0D4', '#FFFDF5'] },
  { id: 'parchment', label: 'Parchment', colors: ['#F5E6C8', '#ECD8B0', '#FAF0DA'] },
  { id: 'sand', label: 'Sand', colors: ['#E8D5B7', '#DEC9A6', '#F0DFC6'] },
  { id: 'wheat', label: 'Wheat', colors: ['#DEB887', '#D2A679', '#E8C89A'] },
  { id: 'walnut', label: 'Walnut', colors: ['#5C4033', '#4A3228', '#6E4E3D'] },
  { id: 'espresso', label: 'Espresso', colors: ['#3C2415', '#2E1A0E', '#4A3020'] },
  { id: 'charcoal', label: 'Charcoal', colors: ['#36454F', '#2C3A44', '#40505A'] },
  { id: 'slate', label: 'Slate', colors: ['#708090', '#607080', '#7A8A9A'] },
  { id: 'stone', label: 'Stone', colors: ['#928E85', '#847F76', '#9C9890'] },
  // Pinks & Reds
  { id: 'blush', label: 'Blush', colors: ['#F5D5D5', '#F0C4C4', '#FAE0E0'] },
  { id: 'rose', label: 'Rose', colors: ['#E8A0A0', '#D88E8E', '#F0B0B0'] },
  { id: 'salmon', label: 'Salmon', colors: ['#FA8072', '#E87060', '#FF9080'] },
  { id: 'coral', label: 'Coral', colors: ['#FF7F7F', '#EE6E6E', '#FF9090'] },
  { id: 'cherry', label: 'Cherry', colors: ['#C41E3A', '#B0102C', '#D43050'] },
  { id: 'burgundy', label: 'Burgundy', colors: ['#722F37', '#60222A', '#843C44'] },
  { id: 'crimson', label: 'Crimson', colors: ['#DC143C', '#C80030', '#EE2448'] },
  { id: 'ruby', label: 'Ruby', colors: ['#9B111E', '#880018', '#AE2030'] },
  { id: 'blushpink', label: 'Blush Pink', colors: ['#FFB6C1', '#FFA4B0', '#FFC8D2'] },
  { id: 'hotpink', label: 'Hot Pink', colors: ['#FF69B4', '#EE58A4', '#FF7AC4'] },
  { id: 'magenta', label: 'Magenta', colors: ['#FF00FF', '#E800E8', '#FF20FF'] },
  { id: 'fuchsia', label: 'Fuchsia', colors: ['#C850C0', '#B840B0', '#D860D0'] },
  // Oranges & Yellows
  { id: 'peach', label: 'Peach', colors: ['#FFDAB9', '#FFC8A0', '#FFE4C8'] },
  { id: 'apricot', label: 'Apricot', colors: ['#FBCEB1', '#F0BC9E', '#FFD8C0'] },
  { id: 'tangerine', label: 'Tangerine', colors: ['#FF9966', '#EE8855', '#FFAA78'] },
  { id: 'sunset', label: 'Sunset', colors: ['#FF6347', '#EE5238', '#FF7558'] },
  { id: 'amber', label: 'Amber', colors: ['#FFBF00', '#E8AD00', '#FFD030'] },
  { id: 'gold', label: 'Gold', colors: ['#FFD700', '#E8C400', '#FFE020'] },
  { id: 'honey', label: 'Honey', colors: ['#EB9605', '#D68700', '#F5A520'] },
  { id: 'marigold', label: 'Marigold', colors: ['#EAA221', '#D89318', '#F4B030'] },
  { id: 'buttercup', label: 'Buttercup', colors: ['#F9E154', '#E8D044', '#FFF068'] },
  { id: 'lemon', label: 'Lemon', colors: ['#FFF44F', '#EEE340', '#FFFF60'] },
  { id: 'banana', label: 'Banana', colors: ['#FFE135', '#EED028', '#FFF048'] },
  { id: 'canary', label: 'Canary', colors: ['#FFEF00', '#EEDE00', '#FFFF20'] },
  // Greens
  { id: 'sage', label: 'Sage', colors: ['#C9DED4', '#B8CFC4', '#D8EBE0'] },
  { id: 'mint', label: 'Mint', colors: ['#B2F0D8', '#9EE0C8', '#C2FFE8'] },
  { id: 'pistachio', label: 'Pistachio', colors: ['#93C572', '#82B460', '#A4D682'] },
  { id: 'olive', label: 'Olive', colors: ['#808000', '#707000', '#909010'] },
  { id: 'forest', label: 'Forest', colors: ['#228B22', '#187818', '#30A030'] },
  { id: 'emerald', label: 'Emerald', colors: ['#50C878', '#40B868', '#60D888'] },
  { id: 'jade', label: 'Jade', colors: ['#00A86B', '#00985E', '#00B878'] },
  { id: 'lime', label: 'Lime', colors: ['#BFFF00', '#AAEE00', '#D0FF20'] },
  { id: 'matcha', label: 'Matcha', colors: ['#8DB600', '#7EA400', '#9EC810'] },
  { id: 'moss', label: 'Moss', colors: ['#8A9A5B', '#788A4A', '#98AA68'] },
  { id: 'fern', label: 'Fern', colors: ['#4F7942', '#3E6832', '#5E8A50'] },
  { id: 'eucalyptus', label: 'Eucalyptus', colors: ['#5F8575', '#4E7464', '#6E9684'] },
  // Blues
  { id: 'sky', label: 'Sky', colors: ['#87CEEB', '#75BED8', '#98DEFA'] },
  { id: 'baby', label: 'Baby Blue', colors: ['#89CFF0', '#78BEE0', '#9AE0FF'] },
  { id: 'powder', label: 'Powder', colors: ['#B0E0E6', '#9ED0D8', '#C0F0F4'] },
  { id: 'arctic', label: 'Arctic', colors: ['#71A6D2', '#6096C0', '#80B6E2'] },
  { id: 'cobalt', label: 'Cobalt', colors: ['#0047AB', '#003898', '#0058BE'] },
  { id: 'navy', label: 'Navy', colors: ['#1E2A3A', '#2C3E50', '#1A2530'] },
  { id: 'royal', label: 'Royal', colors: ['#4169E1', '#3058D0', '#527AF2'] },
  { id: 'cornflower', label: 'Cornflower', colors: ['#6495ED', '#5484DC', '#74A6FE'] },
  { id: 'ocean', label: 'Ocean', colors: ['#006994', '#005880', '#007AA8'] },
  { id: 'teal', label: 'Teal', colors: ['#008080', '#006E6E', '#009090'] },
  { id: 'cyan', label: 'Cyan', colors: ['#00BFFF', '#00AEE8', '#00D0FF'] },
  { id: 'aqua', label: 'Aqua', colors: ['#7FDBDA', '#6ECAC8', '#90ECE8'] },
  { id: 'turquoise', label: 'Turquoise', colors: ['#40E0D0', '#30D0C0', '#50F0E0'] },
  // Purples
  { id: 'lavender', label: 'Lavender', colors: ['#E6E6FA', '#D4D4EA', '#F0F0FF'] },
  { id: 'lilac', label: 'Lilac', colors: ['#C8A2C8', '#B890B8', '#D8B2D8'] },
  { id: 'mauve', label: 'Mauve', colors: ['#E0B0FF', '#D0A0F0', '#F0C0FF'] },
  { id: 'violet', label: 'Violet', colors: ['#8B00FF', '#7A00E8', '#9C10FF'] },
  { id: 'plum', label: 'Plum', colors: ['#8E4585', '#7E3575', '#9E5595'] },
  { id: 'grape', label: 'Grape', colors: ['#6F2DA8', '#5E1C98', '#803EB8'] },
  { id: 'amethyst', label: 'Amethyst', colors: ['#9966CC', '#8855BB', '#AA77DD'] },
  { id: 'orchid', label: 'Orchid', colors: ['#DA70D6', '#CA60C6', '#EA80E6'] },
  { id: 'indigo', label: 'Indigo', colors: ['#4B0082', '#3C0070', '#5C1094'] },
  { id: 'iris', label: 'Iris', colors: ['#5A4FCF', '#4A3FBF', '#6A5FDF'] },
  // Blacks & Greys
  { id: 'midnight', label: 'Midnight', colors: ['#0C0C1E', '#080818', '#141428'] },
  { id: 'obsidian', label: 'Obsidian', colors: ['#1A1A2E', '#121224', '#222238'] },
  { id: 'graphite', label: 'Graphite', colors: ['#474747', '#383838', '#565656'] },
  { id: 'silver', label: 'Silver', colors: ['#C0C0C0', '#B0B0B0', '#D0D0D0'] },
  { id: 'pearl', label: 'Pearl', colors: ['#EAEAEA', '#DEDEDE', '#F4F4F4'] },
  { id: 'ivory', label: 'Ivory', colors: ['#FFFFF0', '#F5F5E0', '#FFFFFA'] },
  { id: 'snow', label: 'Snow', colors: ['#FFFAFA', '#F0EAEA', '#FFFFFF'] },
  { id: 'ash', label: 'Ash', colors: ['#B2BEB5', '#A2AEA5', '#C2CEC5'] },
  // Specials
  { id: 'rosegold', label: 'Rose Gold', colors: ['#B76E79', '#A65E68', '#C87E8A'] },
  { id: 'copper', label: 'Copper', colors: ['#B87333', '#A66324', '#CA8344'] },
  { id: 'bronze', label: 'Bronze', colors: ['#CD7F32', '#BC6E22', '#DE9042'] },
  { id: 'champagne', label: 'Champagne', colors: ['#F7E7CE', '#E8D8BE', '#FFF0D8'] },
  { id: 'clay', label: 'Clay', colors: ['#B66A50', '#A55A40', '#C87A60'] },
  { id: 'terracotta', label: 'Terracotta', colors: ['#E2725B', '#D2624B', '#F2826B'] },
  { id: 'rust', label: 'Rust', colors: ['#B7410E', '#A63200', '#C85220'] },
  { id: 'cinnamon', label: 'Cinnamon', colors: ['#D2691E', '#C05A10', '#E27A30'] },
  { id: 'mocha', label: 'Mocha', colors: ['#967969', '#866858', '#A68A7A'] },
  { id: 'taupe', label: 'Taupe', colors: ['#8B8589', '#7A7478', '#9C969A'] },
  { id: 'driftwood', label: 'Driftwood', colors: ['#A8977A', '#98876A', '#B8A78A'] },
  { id: 'mushroom', label: 'Mushroom', colors: ['#BAA38A', '#AA937A', '#CAB39A'] },
];

const GRADIENT_BACKGROUNDS = [
  { id: 'grad-sunset', label: 'Sunset', colors: ['#FF6B35', '#F7C59F'], type: 'gradient' },
  { id: 'grad-ocean', label: 'Ocean', colors: ['#2193b0', '#6dd5ed'], type: 'gradient' },
  { id: 'grad-lavender', label: 'Lavender', colors: ['#C9B1FF', '#FFB6C1'], type: 'gradient' },
  { id: 'grad-forest', label: 'Forest', colors: ['#134E5E', '#71B280'], type: 'gradient' },
  { id: 'grad-peach', label: 'Peach', colors: ['#FFDEE9', '#B5FFFC'], type: 'gradient' },
  { id: 'grad-midnight', label: 'Midnight', colors: ['#0F2027', '#2C5364'], type: 'gradient' },
  { id: 'grad-rose', label: 'Rose', colors: ['#FF9A9E', '#FECFEF'], type: 'gradient' },
  { id: 'grad-sky', label: 'Sky', colors: ['#89F7FE', '#66A6FF'], type: 'gradient' },
  { id: 'grad-ember', label: 'Ember', colors: ['#FF416C', '#FF4B2B'], type: 'gradient' },
  { id: 'grad-aurora', label: 'Aurora', colors: ['#7F7FD5', '#86A8E7', '#91EAE4'], type: 'gradient' },
  { id: 'grad-golden', label: 'Golden', colors: ['#F09819', '#EDDE5D'], type: 'gradient' },
  { id: 'grad-royal', label: 'Royal', colors: ['#141E30', '#243B55'], type: 'gradient' },
  { id: 'grad-blossom', label: 'Blossom', colors: ['#FFC3A0', '#FFAFBD'], type: 'gradient' },
  { id: 'grad-arctic', label: 'Arctic', colors: ['#E0EAFC', '#CFDEF3'], type: 'gradient' },
  { id: 'grad-dusk', label: 'Dusk', colors: ['#2C3E50', '#FD746C'], type: 'gradient' },
];

const DARK_BG_IDS = new Set([
  'navy', 'midnight', 'obsidian', 'charcoal', 'walnut', 'espresso', 'forest', 'cobalt',
  'ocean', 'indigo', 'iris', 'grape', 'violet', 'burgundy', 'ruby', 'cherry', 'crimson',
  'graphite', 'rust', 'olive', 'fern', 'eucalyptus', 'plum', 'teal', 'royal',
  'grad-midnight', 'grad-forest', 'grad-royal', 'grad-dusk',
]);

const BUILT_IN_STICKERS = {
  faith: [
    { id: 'cross', content: '✝️', label: 'Cross' },
    { id: 'pray', content: '🙏', label: 'Pray' },
    { id: 'dove', content: '🕊️', label: 'Dove' },
    { id: 'church', content: '⛪', label: 'Church' },
    { id: 'bible', content: '📖', label: 'Bible' },
    { id: 'angel', content: '👼', label: 'Angel' },
    { id: 'candle', content: '🕯️', label: 'Candle' },
    { id: 'halo', content: '😇', label: 'Halo' },
    { id: 'hands_up', content: '🙌', label: 'Praise' },
    { id: 'olive', content: '🫒', label: 'Olive' },
    { id: 'fish', content: '🐟', label: 'Fish' },
    { id: 'lamb', content: '🐑', label: 'Lamb' },
    { id: 'bread', content: '🍞', label: 'Bread' },
    { id: 'wine', content: '🍷', label: 'Wine' },
    { id: 'fire_faith', content: '🔥', label: 'Fire' },
    { id: 'scroll', content: '📜', label: 'Scroll' },
    { id: 'light', content: '💡', label: 'Light' },
    { id: 'shepherd', content: '🧑‍🌾', label: 'Shepherd' },
    { id: 'crown_faith', content: '👑', label: 'Crown' },
    { id: 'shield', content: '🛡️', label: 'Shield' },
  ],
  decorative: [
    { id: 'heart', content: '❤️', label: 'Heart' },
    { id: 'pink_heart', content: '🩷', label: 'Pink Heart' },
    { id: 'flower', content: '🌸', label: 'Flower' },
    { id: 'rose', content: '🌹', label: 'Rose' },
    { id: 'ribbon', content: '🎀', label: 'Ribbon' },
    { id: 'star', content: '⭐', label: 'Star' },
    { id: 'sparkles', content: '✨', label: 'Sparkles' },
    { id: 'butterfly', content: '🦋', label: 'Butterfly' },
    { id: 'sunflower', content: '🌻', label: 'Sunflower' },
    { id: 'leaf', content: '🍃', label: 'Leaf' },
    { id: 'rainbow', content: '🌈', label: 'Rainbow' },
    { id: 'gem', content: '💎', label: 'Gem' },
    { id: 'cloud_d', content: '☁️', label: 'Cloud' },
    { id: 'moon_d', content: '🌙', label: 'Moon' },
    { id: 'music', content: '🎵', label: 'Music' },
    { id: 'feather', content: '🪶', label: 'Feather' },
    { id: 'clover', content: '🍀', label: 'Clover' },
    { id: 'hourglass', content: '⏳', label: 'Hourglass' },
    { id: 'compass', content: '🧭', label: 'Compass' },
    { id: 'anchor', content: '⚓', label: 'Anchor' },
  ],
  nature: [
    { id: 'tree', content: '🌳', label: 'Tree' },
    { id: 'mountain', content: '⛰️', label: 'Mountain' },
    { id: 'sun', content: '☀️', label: 'Sun' },
    { id: 'moon_n', content: '🌕', label: 'Moon' },
    { id: 'cloud_n', content: '⛅', label: 'Cloud' },
    { id: 'rain', content: '🌧️', label: 'Rain' },
    { id: 'snow', content: '❄️', label: 'Snow' },
    { id: 'fire', content: '🔥', label: 'Fire' },
    { id: 'water', content: '💧', label: 'Water' },
    { id: 'earth', content: '🌍', label: 'Earth' },
    { id: 'wind', content: '🌬️', label: 'Wind' },
    { id: 'wave', content: '🌊', label: 'Wave' },
    { id: 'sunrise', content: '🌅', label: 'Sunrise' },
    { id: 'palm', content: '🌴', label: 'Palm' },
    { id: 'tulip', content: '🌷', label: 'Tulip' },
    { id: 'hibiscus', content: '🌺', label: 'Hibiscus' },
  ],
  symbols: [
    { id: 'infinity', content: '♾️', label: 'Infinity' },
    { id: 'crown_s', content: '👑', label: 'Crown' },
    { id: 'key', content: '🔑', label: 'Key' },
    { id: 'lock', content: '🔒', label: 'Lock' },
    { id: 'shield_s', content: '🛡️', label: 'Shield' },
    { id: 'lamp', content: '🪔', label: 'Lamp' },
    { id: 'book', content: '📚', label: 'Book' },
    { id: 'scroll_s', content: '📜', label: 'Scroll' },
    { id: 'trumpet', content: '🎺', label: 'Trumpet' },
    { id: 'sword', content: '⚔️', label: 'Sword' },
    { id: 'peace_sym', content: '☮️', label: 'Peace' },
    { id: 'yin_yang', content: '☯️', label: 'Balance' },
    { id: 'bell', content: '🔔', label: 'Bell' },
    { id: 'chain', content: '⛓️', label: 'Chain' },
  ],
  words: [
    { id: 'w_blessed', content: 'Blessed', label: 'Blessed', isText: true },
    { id: 'w_pray', content: 'Pray', label: 'Pray', isText: true },
    { id: 'w_faith', content: 'Faith', label: 'Faith', isText: true },
    { id: 'w_hope', content: 'Hope', label: 'Hope', isText: true },
    { id: 'w_amen', content: 'Amen', label: 'Amen', isText: true },
    { id: 'w_jesus', content: 'Jesus', label: 'Jesus', isText: true },
    { id: 'w_love', content: 'Love', label: 'Love', isText: true },
    { id: 'w_grace', content: 'Grace', label: 'Grace', isText: true },
    { id: 'w_peace', content: 'Peace', label: 'Peace', isText: true },
    { id: 'w_trust', content: 'Trust', label: 'Trust', isText: true },
    { id: 'w_hallelujah', content: 'Hallelujah', label: 'Hallelujah', isText: true },
    { id: 'w_rejoice', content: 'Rejoice', label: 'Rejoice', isText: true },
    { id: 'w_thankful', content: 'Thankful', label: 'Thankful', isText: true },
    { id: 'w_worship', content: 'Worship', label: 'Worship', isText: true },
    { id: 'w_mercy', content: 'Mercy', label: 'Mercy', isText: true },
    { id: 'w_glory', content: 'Glory', label: 'Glory', isText: true },
    { id: 'w_strength', content: 'Strength', label: 'Strength', isText: true },
    { id: 'w_courage', content: 'Courage', label: 'Courage', isText: true },
    { id: 'w_forgiven', content: 'Forgiven', label: 'Forgiven', isText: true },
    { id: 'w_redeemed', content: 'Redeemed', label: 'Redeemed', isText: true },
  ],
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const createDefaultBoard = () => ({ id: generateId(), name: 'My Prayers', background: 'cork', items: [], answeredPrayers: [] });

const ENVELOPE_COLORS = [
  '#EC4899', '#FF6B6B', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16', '#E879F9',
  '#F97316', '#14B8A6', '#A855F7', '#FB923C', '#6366F1',
];

const CARD_COLORS = [
  '#FFFFFF', '#F8F9FA', '#FFF9C4', '#FFECB3', '#FFE0B2',
  '#FFCCBC', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9',
  '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9',
  '#DCEDC8', '#F0F4C3', '#1E1E1E',
  // Deeper/bolder options
  '#FF6B6B', '#FF8E8E', '#FF4757', '#E84393', '#A855F7',
  '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9', '#06B6D4',
  '#14B8A6', '#10B981', '#22C55E', '#84CC16', '#EAB308',
  '#F97316', '#EF4444',
];

const FONT_SIZES = [
  { id: 'xs', label: 'XS', value: 10 },
  { id: 'small', label: 'S', value: 12 },
  { id: 'medium', label: 'M', value: 15 },
  { id: 'large', label: 'L', value: 19 },
  { id: 'xl', label: 'XL', value: 24 },
];

const FONT_STYLES = [
  { id: 'system', label: 'Clean', fontFamily: undefined },
  { id: 'serif', label: 'Serif', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  { id: 'handwriting', label: 'Script', fontFamily: Platform.OS === 'ios' ? 'Noteworthy' : undefined },
  { id: 'mono', label: 'Mono', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  { id: 'rounded', label: 'Round', fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : undefined },
];

const CARD_BORDERS = [
  { id: 'none', label: 'None' },
  { id: 'thin', label: 'Thin', width: 1, style: 'solid' },
  { id: 'bold', label: 'Bold', width: 2.5, style: 'solid' },
  { id: 'dashed', label: 'Dash', width: 2, style: 'dashed' },
  { id: 'glow', label: 'Glow' },
];

const BORDER_COLORS = [
  '#EC4899', '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#5AC8FA', '#007AFF', '#AF52DE',
];

const CARD_SHAPES = [
  { id: 'rounded', label: 'Rounded', radius: 16 },
  { id: 'pill', label: 'Pill', radius: 28 },
  { id: 'square', label: 'Square', radius: 4 },
];

const CARD_OPACITIES = [
  { id: 'solid', label: 'Solid', alpha: 0.92 },
  { id: 'frosted', label: 'Frosted', alpha: 0.7 },
  { id: 'ghost', label: 'Ghost', alpha: 0.4 },
];

const PHOTO_SIZES = [
  { id: 'small', label: 'S', size: 60 },
  { id: 'medium', label: 'M', size: 100 },
  { id: 'large', label: 'L', size: 150 },
];

const PHOTO_FRAMES = [
  { id: 'none', label: 'None' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'circle', label: 'Circle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'shadow', label: 'Shadow' },
];

const WORD_STICKER_COLORS = [
  '#EC4899', '#FF3B30', '#3B82F6', '#8B5CF6', '#10B981',
  '#F59E0B', '#FFFFFF', '#1E1E1E', '#FF6B6B', '#008080',
];

const TEXT_ALIGNMENTS = [
  { id: 'left', icon: 'format-align-left' },
  { id: 'center', icon: 'format-align-center' },
  { id: 'right', icon: 'format-align-right' },
];

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const isColorDark = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
};

const darkenHex = (hex, amount = 0.35) => {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `rgb(${r},${g},${b})`;
};

// ─── Draggable Board Item ───
const DraggableItem = ({ item, onUpdate, onDelete, onTap, isDeleteMode, parallaxX, parallaxY }) => {
  const posX = useSharedValue(item.x);
  const posY = useSharedValue(item.y);
  const savedX = useSharedValue(item.x);
  const savedY = useSharedValue(item.y);
  const itemScale = useSharedValue(1);
  const zIdx = useSharedValue(item.zIndex || 1);
  const didDrag = useSharedValue(false);

  const layerMultiplier = item.layer === 0 ? 12 : item.layer === 2 ? 3 : 7;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedX.value = posX.value;
      savedY.value = posY.value;
      itemScale.value = withSpring(1.08, { damping: 15 });
      zIdx.value = 999;
      didDrag.value = false;
    })
    .onUpdate((e) => {
      posX.value = savedX.value + e.translationX;
      posY.value = savedY.value + e.translationY;
      if (Math.abs(e.translationX) > 5 || Math.abs(e.translationY) > 5) {
        didDrag.value = true;
      }
    })
    .onEnd(() => {
      itemScale.value = withSpring(1, { damping: 15 });
      zIdx.value = item.zIndex || 1;
      runOnJS(onUpdate)(item.id, { x: posX.value, y: posY.value });
    })
    .minDistance(10);

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (isDeleteMode) {
      runOnJS(onDelete)(item.id);
    } else if ((item.type === 'folder' || item.type === 'answered') && onTap) {
      runOnJS(onTap)(item);
    }
  });

  const composed = Gesture.Exclusive(tapGesture, panGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value + (parallaxX?.value || 0) * layerMultiplier },
      { translateY: posY.value + (parallaxY?.value || 0) * layerMultiplier },
      { rotate: `${item.rotation || 0}deg` },
      { scale: itemScale.value * (item.scale || 1) },
    ],
    zIndex: zIdx.value,
    position: 'absolute',
  }));

  const renderContent = () => {
    if (item.type === 'prayer') {
      const cardBg = item.cardColor || '#FFFFFF';
      const isDarkCard = isColorDark(cardBg);
      const sizeObj = FONT_SIZES.find(s => s.id === item.fontSize) || FONT_SIZES[2];
      const styleObj = FONT_STYLES.find(f => f.id === item.fontStyle) || FONT_STYLES[0];
      const shapeObj = CARD_SHAPES.find(s => s.id === item.cardShape) || CARD_SHAPES[0];
      const opacityObj = CARD_OPACITIES.find(o => o.id === item.cardOpacity) || CARD_OPACITIES[0];
      const borderObj = CARD_BORDERS.find(b => b.id === item.borderStyle) || CARD_BORDERS[0];
      const textAlign = item.textAlign || 'center';

      const bgColor = hexToRgba(cardBg, opacityObj.alpha);

      const borderProps = {};
      if (borderObj.id === 'thin' || borderObj.id === 'bold' || borderObj.id === 'dashed') {
        borderProps.borderWidth = borderObj.width;
        borderProps.borderColor = item.borderColor || '#EC4899';
        if (borderObj.id === 'dashed') {
          borderProps.borderStyle = 'dashed';
        }
      }

      const glowProps = borderObj.id === 'glow' ? {
        shadowColor: item.borderColor || '#EC4899',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 10,
      } : {};

      return (
        <View style={[
          styles.prayerCard,
          { backgroundColor: bgColor, borderRadius: shapeObj.radius },
          borderProps,
          glowProps,
        ]}>
          <Text
            style={[
              styles.prayerText,
              {
                fontSize: sizeObj.value,
                color: isDarkCard ? '#F5F5F5' : '#1a1a1a',
                textAlign,
              },
              styleObj.fontFamily && { fontFamily: styleObj.fontFamily },
            ]}
            numberOfLines={6}
          >
            {item.content}
          </Text>
          {isDeleteMode && (
            <View style={[styles.deleteOverlay, { borderRadius: shapeObj.radius }]}>
              <MaterialIcons name="close" size={24} color="#FF3B30" />
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'sticker') {
      if (item.isText) {
        const stickerColor = item.stickerColor || '#EC4899';
        return (
          <View style={styles.wordSticker}>
            <Text style={[styles.wordStickerText, { color: stickerColor }]}>{item.content}</Text>
            {isDeleteMode && (
              <View style={styles.deleteBadge}>
                <MaterialIcons name="close" size={14} color="#fff" />
              </View>
            )}
          </View>
        );
      }
      return (
        <View style={styles.emojiSticker}>
          <Text style={styles.emojiText}>{item.content}</Text>
          {isDeleteMode && (
            <View style={styles.deleteBadge}>
              <MaterialIcons name="close" size={14} color="#fff" />
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'photo') {
      const photoSizeObj = PHOTO_SIZES.find(s => s.id === item.photoSize) || PHOTO_SIZES[1];
      const photoFrame = item.photoFrame || 'rounded';
      const sz = photoSizeObj.size;

      const frameStyles = {};
      const imageStyles = { width: '100%', height: '100%' };

      if (photoFrame === 'polaroid') {
        frameStyles.backgroundColor = '#fff';
        frameStyles.padding = 6;
        frameStyles.paddingBottom = 24;
        frameStyles.borderRadius = 4;
        frameStyles.shadowColor = '#000';
        frameStyles.shadowOffset = { width: 1, height: 3 };
        frameStyles.shadowOpacity = 0.3;
        frameStyles.shadowRadius = 6;
        frameStyles.elevation = 6;
        imageStyles.borderRadius = 2;
      } else if (photoFrame === 'circle') {
        frameStyles.borderRadius = sz / 2;
        frameStyles.overflow = 'hidden';
        frameStyles.backgroundColor = '#fff';
        frameStyles.padding = 3;
        frameStyles.shadowColor = '#000';
        frameStyles.shadowOffset = { width: 0, height: 2 };
        frameStyles.shadowOpacity = 0.2;
        frameStyles.shadowRadius = 4;
        frameStyles.elevation = 4;
        imageStyles.borderRadius = (sz - 6) / 2;
      } else if (photoFrame === 'shadow') {
        frameStyles.borderRadius = 8;
        frameStyles.overflow = 'hidden';
        frameStyles.backgroundColor = '#fff';
        frameStyles.padding = 3;
        frameStyles.shadowColor = '#000';
        frameStyles.shadowOffset = { width: 2, height: 6 };
        frameStyles.shadowOpacity = 0.4;
        frameStyles.shadowRadius = 12;
        frameStyles.elevation = 10;
        imageStyles.borderRadius = 6;
      } else if (photoFrame === 'none') {
        frameStyles.borderRadius = 0;
        frameStyles.overflow = 'hidden';
        frameStyles.padding = 0;
        imageStyles.borderRadius = 0;
      } else {
        frameStyles.borderRadius = 8;
        frameStyles.overflow = 'hidden';
        frameStyles.backgroundColor = '#fff';
        frameStyles.padding = 3;
        frameStyles.shadowColor = '#000';
        frameStyles.shadowOffset = { width: 1, height: 3 };
        frameStyles.shadowOpacity = 0.25;
        frameStyles.shadowRadius = 5;
        frameStyles.elevation = 5;
        imageStyles.borderRadius = 6;
      }

      return (
        <View style={[{ width: sz, height: photoFrame === 'polaroid' ? sz + 18 : sz }, frameStyles]}>
          <Image source={{ uri: item.content }} style={imageStyles} />
          {isDeleteMode && (
            <View style={styles.deleteBadge}>
              <MaterialIcons name="close" size={14} color="#fff" />
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'folder') {
      const accentColor = item.color || '#EC4899';
      const prayerCount = item.prayers?.length || 0;
      const isDarkAccent = isColorDark(accentColor);
      const flapColor = darkenHex(accentColor, 0.3);
      return (
        <View style={styles.envelopeContainer}>
          <View style={[styles.envelopeBody, { backgroundColor: accentColor }]}>
            <View style={[styles.envelopeInner, { backgroundColor: hexToRgba(accentColor, 0.18) }]}>
              <Text style={[styles.envelopeName, { color: isDarkAccent ? '#fff' : '#1a1a1a' }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.envelopeCount, { color: isDarkAccent ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)' }]}>
                {prayerCount} prayer{prayerCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.envelopeFlapWrap}>
              <View style={[styles.envelopeFlapDown, { borderTopColor: flapColor }]} />
            </View>
            <View style={styles.envelopeSealCenter}>
              <View style={[styles.envelopeSealCircle, { backgroundColor: isDarkAccent ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)', borderColor: isDarkAccent ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                <MaterialIcons name="mail" size={16} color={isDarkAccent ? '#fff' : '#444'} />
              </View>
            </View>
          </View>
          {isDeleteMode && (
            <View style={styles.deleteOverlayFolder}>
              <MaterialIcons name="close" size={24} color="#FF3B30" />
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'answered') {
      const answeredCount = item.count || 0;
      return (
        <View style={styles.envelopeContainer}>
          <View style={[styles.envelopeBody, { backgroundColor: '#F59E0B' }]}>
            <View style={[styles.envelopeInner, { backgroundColor: 'rgba(245,158,11,0.18)' }]}>
              <Text style={[styles.envelopeName, { color: '#fff' }]}>Answered</Text>
              <Text style={[styles.envelopeCount, { color: 'rgba(255,255,255,0.65)' }]}>
                {answeredCount} prayer{answeredCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.envelopeFlapWrap}>
              <View style={[styles.envelopeFlapDown, { borderTopColor: 'rgba(210,135,8,0.9)' }]} />
            </View>
            <View style={styles.envelopeSealCenter}>
              <View style={[styles.envelopeSealCircle, { backgroundColor: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.15)' }]}>
                <MaterialIcons name="check" size={16} color="#fff" />
              </View>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animStyle}>
        {renderContent()}
      </Animated.View>
    </GestureDetector>
  );
};

// ─── Main Screen ───
const PrayerBoardScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [boards, setBoards] = useState([createDefaultBoard()]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stickerTab, setStickerTab] = useState('faith');

  // Photo picker state
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoSize, setPhotoSize] = useState('medium');
  const [photoFrame, setPhotoFrame] = useState('rounded');
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Word sticker colour picker state
  const [pendingWordSticker, setPendingWordSticker] = useState(null);
  const [wordStickerColor, setWordStickerColor] = useState('#EC4899');
  const [showWordColorPicker, setShowWordColorPicker] = useState(false);

  // Folder/envelope state
  const [openFolderId, setOpenFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#EC4899');
  const [showAnsweredModal, setShowAnsweredModal] = useState(false);
  const [folderPrayerText, setFolderPrayerText] = useState('');
  const [showAddPrayerInFolder, setShowAddPrayerInFolder] = useState(false);
  const answeredPulse = useRef(new RNAnimated.Value(1)).current;

  const currentBoard = boards[currentBoardIndex] || boards[0] || createDefaultBoard();

  // ─── Create folder sheet modal ───
  const [noteMounted, setNoteMounted] = useState(false);
  const noteBackdropAnim = useRef(new RNAnimated.Value(0)).current;
  const noteSlideAnim = useRef(new RNAnimated.Value(1)).current;
  const noteDragY = useRef(new RNAnimated.Value(0)).current;

  const notePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2,
    onPanResponderGrant: () => { noteDragY.setValue(0); },
    onPanResponderMove: RNAnimated.event([null, { dy: noteDragY }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        Keyboard.dismiss();
        RNAnimated.parallel([
          RNAnimated.timing(noteDragY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
          RNAnimated.timing(noteBackdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          setNoteMounted(false);
          noteDragY.setValue(0);
          noteSlideAnim.setValue(1);
          setNewFolderName('');
        });
      } else {
        RNAnimated.spring(noteDragY, { toValue: 0, damping: 25, useNativeDriver: true }).start();
      }
    },
  }), []);

  // ─── Sticker picker modal ───
  const [stickerMounted, setStickerMounted] = useState(false);
  const stickerBackdropAnim = useRef(new RNAnimated.Value(0)).current;
  const stickerSlideAnim = useRef(new RNAnimated.Value(1)).current;
  const stickerDragY = useRef(new RNAnimated.Value(0)).current;

  const stickerPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2,
    onPanResponderGrant: () => { stickerDragY.setValue(0); },
    onPanResponderMove: RNAnimated.event([null, { dy: stickerDragY }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        RNAnimated.parallel([
          RNAnimated.timing(stickerDragY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
          RNAnimated.timing(stickerBackdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          setStickerMounted(false);
          stickerDragY.setValue(0);
          stickerSlideAnim.setValue(1);
        });
      } else {
        RNAnimated.spring(stickerDragY, { toValue: 0, damping: 25, useNativeDriver: true }).start();
      }
    },
  }), []);

  const parallaxX = useSharedValue(0);
  const parallaxY = useSharedValue(0);
  const accelSubscription = useRef(null);
  const boardRef = useRef(null);

  // ─── Load boards (with migration from old single-board format) ───
  useEffect(() => {
    (async () => {
      try {
        const savedBoards = await userStorage.get(BOARDS_STORAGE_KEY);
        if (savedBoards && Array.isArray(savedBoards) && savedBoards.length > 0) {
          const migrated = savedBoards.map(board => {
            if (!board.answeredPrayers) board.answeredPrayers = [];
            const oldPrayers = board.items?.filter(it => it.type === 'prayer') || [];
            if (oldPrayers.length > 0) {
              const folder = {
                id: generateId(),
                type: 'folder',
                name: 'My Prayers',
                color: '#EC4899',
                prayers: oldPrayers.map(p => ({
                  id: generateId(),
                  text: p.content,
                  createdAt: Date.now(),
                })),
                x: oldPrayers[0].x,
                y: oldPrayers[0].y,
                rotation: 0,
                scale: 1.0,
                layer: 1,
                zIndex: 1,
              };
              board.items = [...board.items.filter(it => it.type !== 'prayer'), folder];
            }
            return board;
          });
          setBoards(migrated);
          await userStorage.set(BOARDS_STORAGE_KEY, migrated);
          return;
        }
        const oldData = await userStorage.get(OLD_STORAGE_KEY);
        if (oldData && oldData.items) {
          const migrated = [{ id: generateId(), name: 'My Prayers', background: oldData.background || 'cork', items: oldData.items, answeredPrayers: [] }];
          setBoards(migrated);
          await userStorage.set(BOARDS_STORAGE_KEY, migrated);
          await userStorage.remove(OLD_STORAGE_KEY);
          return;
        }
      } catch (e) {
        console.log('Error loading prayer boards:', e);
      }
    })();
  }, []);

  const saveBoards = useCallback(async (data) => {
    try {
      await userStorage.set(BOARDS_STORAGE_KEY, data);
    } catch (e) {
      console.log('Error saving prayer boards:', e);
    }
  }, []);

  const updateCurrentBoard = useCallback((updater) => {
    setBoards(prev => {
      const next = [...prev];
      const idx = Math.min(currentBoardIndex, next.length - 1);
      next[idx] = updater(next[idx]);
      saveBoards(next);
      return next;
    });
  }, [currentBoardIndex, saveBoards]);

  // Parallax accelerometer
  useEffect(() => {
    Accelerometer.setUpdateInterval(32);
    accelSubscription.current = Accelerometer.addListener(({ x, y }) => {
      parallaxX.value = withSpring(x, { damping: 20, stiffness: 90 });
      parallaxY.value = withSpring(y - 0.5, { damping: 20, stiffness: 90 });
    });

    return () => {
      if (accelSubscription.current) {
        accelSubscription.current.remove();
        accelSubscription.current = null;
      }
    };
  }, [parallaxX, parallaxY]);

  // ─── Modal open/close ───
  const openCreateFolder = useCallback(() => {
    setNewFolderName('');
    setNewFolderColor('#EC4899');
    noteDragY.setValue(0);
    setNoteMounted(true);
    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(noteBackdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(noteSlideAnim, { toValue: 0, damping: 28, stiffness: 300, mass: 0.8, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const closeCreateFolder = useCallback(() => {
    Keyboard.dismiss();
    RNAnimated.parallel([
      RNAnimated.timing(noteBackdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(noteSlideAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setNoteMounted(false);
      noteDragY.setValue(0);
      noteSlideAnim.setValue(1);
      setNewFolderName('');
    });
  }, []);

  const openStickerPicker = useCallback(() => {
    setStickerTab('faith');
    stickerDragY.setValue(0);
    setStickerMounted(true);
    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(stickerBackdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(stickerSlideAnim, { toValue: 0, damping: 28, stiffness: 300, mass: 0.8, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const closeStickerPicker = useCallback(() => {
    RNAnimated.parallel([
      RNAnimated.timing(stickerBackdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(stickerSlideAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setStickerMounted(false);
      stickerDragY.setValue(0);
      stickerSlideAnim.setValue(1);
    });
  }, []);

  // ─── Board item CRUD ───
  const updateItem = useCallback((id, updates) => {
    updateCurrentBoard(board => ({
      ...board,
      items: board.items.map(item => item.id === id ? { ...item, ...updates } : item),
    }));
  }, [updateCurrentBoard]);

  const deleteItem = useCallback((id) => {
    hapticFeedback.medium();
    updateCurrentBoard(board => ({
      ...board,
      items: board.items.filter(item => item.id !== id),
    }));
  }, [updateCurrentBoard]);

  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    hapticFeedback.success();
    const randomX = 30 + Math.random() * (CANVAS_WIDTH - 200);
    const randomY = 120 + Math.random() * (CANVAS_HEIGHT - 400);

    const newItem = {
      id: generateId(),
      type: 'folder',
      name: newFolderName.trim(),
      color: newFolderColor,
      prayers: [],
      x: randomX,
      y: randomY,
      rotation: 0,
      scale: 1.0,
      layer: 1,
      zIndex: (currentBoard.items?.length || 0) + 1,
    };

    updateCurrentBoard(board => ({
      ...board,
      items: [...board.items, newItem],
    }));
    closeCreateFolder();
  }, [newFolderName, newFolderColor, currentBoard, updateCurrentBoard, closeCreateFolder]);

  const openFolder = useCallback((item) => {
    if (item.type === 'answered') {
      hapticFeedback.light();
      setShowAnsweredModal(true);
    } else if (item.type === 'folder') {
      hapticFeedback.light();
      setOpenFolderId(item.id);
    }
  }, []);

  const openFolderItem = useMemo(() => {
    if (!openFolderId) return null;
    return currentBoard.items.find(it => it.id === openFolderId) || null;
  }, [openFolderId, currentBoard.items]);

  const addPrayerToFolder = useCallback(() => {
    if (!folderPrayerText.trim() || !openFolderId) return;
    hapticFeedback.success();
    const prayer = {
      id: generateId(),
      text: folderPrayerText.trim(),
      createdAt: Date.now(),
    };
    updateCurrentBoard(board => ({
      ...board,
      items: board.items.map(item =>
        item.id === openFolderId
          ? { ...item, prayers: [...(item.prayers || []), prayer] }
          : item
      ),
    }));
    setFolderPrayerText('');
    setShowAddPrayerInFolder(false);
    Keyboard.dismiss();
  }, [folderPrayerText, openFolderId, updateCurrentBoard]);

  const markPrayerAnswered = useCallback((prayerId) => {
    if (!openFolderId) return;
    hapticFeedback.success();
    const folder = currentBoard.items.find(it => it.id === openFolderId);
    if (!folder) return;
    const prayer = folder.prayers?.find(p => p.id === prayerId);
    if (!prayer) return;

    const answeredEntry = {
      id: generateId(),
      text: prayer.text,
      folderId: openFolderId,
      folderName: folder.name,
      answeredAt: Date.now(),
    };

    updateCurrentBoard(board => ({
      ...board,
      items: board.items.map(item =>
        item.id === openFolderId
          ? { ...item, prayers: item.prayers.filter(p => p.id !== prayerId) }
          : item
      ),
      answeredPrayers: [...(board.answeredPrayers || []), answeredEntry],
    }));

    RNAnimated.sequence([
      RNAnimated.timing(answeredPulse, { toValue: 1.2, duration: 200, useNativeDriver: true }),
      RNAnimated.spring(answeredPulse, { toValue: 1, damping: 8, useNativeDriver: true }),
    ]).start();
  }, [openFolderId, currentBoard.items, updateCurrentBoard, answeredPulse]);

  const deletePrayerFromFolder = useCallback((prayerId) => {
    if (!openFolderId) return;
    Alert.alert('Delete Prayer', 'Remove this prayer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          hapticFeedback.medium();
          updateCurrentBoard(board => ({
            ...board,
            items: board.items.map(item =>
              item.id === openFolderId
                ? { ...item, prayers: item.prayers.filter(p => p.id !== prayerId) }
                : item
            ),
          }));
        },
      },
    ]);
  }, [openFolderId, updateCurrentBoard]);

  const renameFolder = useCallback((folderId) => {
    const folder = currentBoard.items.find(it => it.id === folderId);
    if (!folder) return;
    Alert.prompt('Rename Folder', 'Enter a new name:', (name) => {
      if (!name?.trim()) return;
      updateCurrentBoard(board => ({
        ...board,
        items: board.items.map(item =>
          item.id === folderId ? { ...item, name: name.trim() } : item
        ),
      }));
    }, 'plain-text', folder.name, 'default');
  }, [currentBoard.items, updateCurrentBoard]);

  const answeredByFolder = useMemo(() => {
    const groups = {};
    (currentBoard.answeredPrayers || []).forEach(prayer => {
      const key = prayer.folderName || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(prayer);
    });
    return groups;
  }, [currentBoard.answeredPrayers]);

  const answeredItem = useMemo(() => ({
    id: '__answered__',
    type: 'answered',
    count: (currentBoard.answeredPrayers || []).length,
    x: currentBoard.answeredPosition?.x ?? 20,
    y: currentBoard.answeredPosition?.y ?? 200,
    rotation: 0,
    scale: 1.0,
    layer: 1,
    zIndex: 0,
  }), [currentBoard.answeredPrayers, currentBoard.answeredPosition]);

  const updateAnsweredPosition = useCallback((id, updates) => {
    if (id === '__answered__') {
      updateCurrentBoard(board => ({
        ...board,
        answeredPosition: { x: updates.x, y: updates.y },
      }));
    } else {
      updateItem(id, updates);
    }
  }, [updateCurrentBoard, updateItem]);

  const addSticker = useCallback((sticker, color) => {
    hapticFeedback.light();
    const randomX = 40 + Math.random() * (CANVAS_WIDTH - 100);
    const randomY = 120 + Math.random() * (CANVAS_HEIGHT - 300);
    const randomRotation = Math.floor(Math.random() * 21) - 10;

    const newItem = {
      id: generateId(),
      type: 'sticker',
      content: sticker.content,
      isText: sticker.isText || false,
      stickerColor: color || undefined,
      x: randomX,
      y: randomY,
      rotation: randomRotation,
      scale: 1.0,
      layer: 2,
      zIndex: (currentBoard.items?.length || 0) + 1,
    };

    updateCurrentBoard(board => ({
      ...board,
      items: [...board.items, newItem],
    }));
  }, [currentBoard, updateCurrentBoard]);

  const addPhotoToBoard = useCallback((uri, size, frame) => {
    hapticFeedback.success();
    const randomX = 40 + Math.random() * (CANVAS_WIDTH - 120);
    const randomY = 120 + Math.random() * (CANVAS_HEIGHT - 300);
    const randomRotation = Math.floor(Math.random() * 21) - 10;

    const newItem = {
      id: generateId(),
      type: 'photo',
      content: uri,
      photoSize: size,
      photoFrame: frame,
      x: randomX,
      y: randomY,
      rotation: randomRotation,
      scale: 1.0,
      layer: 2,
      zIndex: (currentBoard.items?.length || 0) + 1,
    };

    updateCurrentBoard(board => ({
      ...board,
      items: [...board.items, newItem],
    }));
  }, [currentBoard, updateCurrentBoard]);

  const importPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPendingPhoto(result.assets[0].uri);
        setPhotoSize('medium');
        setPhotoFrame('rounded');
        setShowPhotoOptions(true);
        closeStickerPicker();
      }
    } catch (e) {
      console.log('Error importing photo:', e);
    }
  }, [closeStickerPicker]);

  const confirmPhoto = useCallback(() => {
    if (pendingPhoto) {
      addPhotoToBoard(pendingPhoto, photoSize, photoFrame);
    }
    setShowPhotoOptions(false);
    setPendingPhoto(null);
  }, [pendingPhoto, photoSize, photoFrame, addPhotoToBoard]);

  const importBackgroundImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        hapticFeedback.success();
        updateCurrentBoard(board => ({
          ...board,
          background: 'custom',
          backgroundImage: result.assets[0].uri,
        }));
        setShowBgPicker(false);
      }
    } catch (e) {
      console.log('Error importing background:', e);
    }
  }, [updateCurrentBoard]);

  const changeBackground = useCallback((bgId) => {
    hapticFeedback.light();
    updateCurrentBoard(board => {
      const updated = { ...board, background: bgId };
      if (bgId !== 'custom') delete updated.backgroundImage;
      return updated;
    });
    setShowBgPicker(false);
  }, [updateCurrentBoard]);

  // ─── Board CRUD ───
  const addNewBoard = useCallback(() => {
    Alert.prompt('New Board', 'Enter a name for your board:', (name) => {
      if (!name?.trim()) return;
      hapticFeedback.success();
      const newBoard = createDefaultBoard();
      newBoard.name = name.trim();
      setBoards(prev => {
        const next = [...prev, newBoard];
        saveBoards(next);
        setCurrentBoardIndex(next.length - 1);
        return next;
      });
    }, 'plain-text', '', 'default');
  }, [saveBoards]);

  const renameCurrentBoard = useCallback(() => {
    Alert.prompt('Rename Board', 'Enter a new name:', (name) => {
      if (!name?.trim()) return;
      updateCurrentBoard(board => ({ ...board, name: name.trim() }));
    }, 'plain-text', currentBoard.name, 'default');
  }, [currentBoard.name, updateCurrentBoard]);

  const deleteCurrentBoard = useCallback(() => {
    if (boards.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one board.');
      return;
    }
    Alert.alert('Delete Board', `Delete "${currentBoard.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          hapticFeedback.medium();
          const idx = currentBoardIndex;
          setBoards(prev => {
            const next = prev.filter((_, i) => i !== idx);
            saveBoards(next);
            return next;
          });
          setCurrentBoardIndex(prev => Math.max(0, prev - 1));
        },
      },
    ]);
  }, [boards.length, currentBoard.name, currentBoardIndex, saveBoards]);

  const saveBoardAsImage = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save to your photo library.');
        return;
      }
      hapticFeedback.light();
      setIsSaving(true);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const uri = await captureRef(boardRef, { format: 'png', quality: 1 });
      setIsSaving(false);
      await MediaLibrary.saveToLibraryAsync(uri);
      hapticFeedback.success();
      Alert.alert('Saved', `"${currentBoard.name}" saved to your photo library.`);
    } catch (e) {
      setIsSaving(false);
      console.log('Error saving board:', e);
      Alert.alert('Error', 'Failed to save board. Please try again.');
    }
  }, [currentBoard.name]);

  // ─── Derived values ───
  const isGradientBg = currentBoard.background?.startsWith('grad-');
  const isCustomBg = currentBoard.background === 'custom';

  const currentBg = useMemo(() => {
    if (isGradientBg) {
      return GRADIENT_BACKGROUNDS.find(g => g.id === currentBoard.background) || GRADIENT_BACKGROUNDS[0];
    }
    return BACKGROUNDS.find(b => b.id === currentBoard.background) || BACKGROUNDS[0];
  }, [currentBoard.background, isGradientBg]);

  const textureDots = useMemo(() =>
    Array.from({ length: 80 }).map((_, i) => ({
      key: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      opacity: 0.03 + Math.random() * 0.06,
      width: 2 + Math.random() * 4,
      height: 2 + Math.random() * 4,
    })),
  []);

  const bgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: parallaxX.value * 15 },
      { translateY: parallaxY.value * 15 },
    ],
  }));

  return (
    <View style={{ flex: 1 }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          ref={boardRef}
          collapsable={false}
          style={[styles.container, { backgroundColor: isCustomBg ? '#000' : currentBg.colors[0] }]}
        >
          {/* Custom background image */}
          {isCustomBg && currentBoard.backgroundImage && (
            <Image
              source={{ uri: currentBoard.backgroundImage }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          )}

          {/* Gradient background */}
          {isGradientBg && (
            <LinearGradient
              colors={currentBg.colors}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}

          {/* Parallax background layer (for solid colours) */}
          {!isGradientBg && !isCustomBg && (
            <Animated.View style={[styles.bgLayer, bgStyle]}>
              <View style={[styles.bgFill, { backgroundColor: currentBg.colors[0] }]} />
              {(currentBg.id === 'cork' || currentBg.id === 'linen') && (
                <View style={styles.textureOverlay}>
                  {textureDots.map(dot => (
                    <View
                      key={dot.key}
                      style={[
                        styles.textureDot,
                        {
                          left: dot.left,
                          top: dot.top,
                          opacity: dot.opacity,
                          width: dot.width,
                          height: dot.height,
                          backgroundColor: currentBg.id === 'cork' ? '#8B6914' : '#A09080',
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
              <View style={[styles.gradientOverlay, {
                backgroundColor: currentBg.colors[1],
                opacity: 0.3,
              }]} />
            </Animated.View>
          )}

          {/* Big title visible during save */}
          {isSaving && (
            <View style={[styles.saveTitleContainer, { paddingTop: insets.top + 20 }]}>
              <Text style={styles.saveTitle}>{currentBoard.name}</Text>
            </View>
          )}

          {/* Header */}
          {!isSaving && (
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.goBack()}
              >
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => { if (boards.length > 1) { hapticFeedback.light(); setShowBoardSwitcher(true); } else { renameCurrentBoard(); } }}
              activeOpacity={0.7}
              style={styles.headerCenter}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>{currentBoard.name}</Text>
              {boards.length > 1 && (
                <View style={styles.headerSubRow}>
                  <Text style={styles.headerBoardCount}>{currentBoardIndex + 1} of {boards.length}</Text>
                  <MaterialIcons name="unfold-more" size={14} color="rgba(255,255,255,0.5)" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={addNewBoard}
              >
                <MaterialIcons name="add" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, isDeleteMode && styles.headerBtnActive]}
                onPress={() => {
                  hapticFeedback.light();
                  setIsDeleteMode(!isDeleteMode);
                }}
              >
                <MaterialIcons name={isDeleteMode ? 'check' : 'delete-outline'} size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          )}

          {/* Canvas with items */}
          <View style={styles.canvas}>
            {currentBoard.items.length === 0 && (currentBoard.answeredPrayers || []).length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{currentBoard.name}</Text>
                <Text style={styles.emptySubtitle}>
                  Tap "Folder" below to create prayer envelopes for your board
                </Text>
              </View>
            )}
            {currentBoard.items.map(item => (
              <DraggableItem
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onTap={openFolder}
                isDeleteMode={isDeleteMode}
                parallaxX={parallaxX}
                parallaxY={parallaxY}
              />
            ))}
            {/* Answered Envelope */}
            <RNAnimated.View style={{ transform: [{ scale: answeredPulse }] }}>
              <DraggableItem
                key="__answered__"
                item={answeredItem}
                onUpdate={updateAnsweredPosition}
                onDelete={() => {}}
                onTap={openFolder}
                isDeleteMode={false}
                parallaxX={parallaxX}
                parallaxY={parallaxY}
              />
            </RNAnimated.View>
          </View>

          {/* Bottom Toolbar */}
          {!isSaving && (
          <View style={[styles.toolbar, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => { hapticFeedback.light(); openCreateFolder(); }}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#EC489920' }]}>
                <MaterialIcons name="folder" size={22} color="#EC4899" />
              </View>
              <Text style={styles.toolLabel}>Folder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => { hapticFeedback.light(); openStickerPicker(); }}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#8B5CF620' }]}>
                <MaterialIcons name="emoji-emotions" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.toolLabel}>Stickers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={importPhoto}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#3B82F620' }]}>
                <MaterialIcons name="add-photo-alternate" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.toolLabel}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => { hapticFeedback.light(); setShowBgPicker(true); }}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#F59E0B20' }]}>
                <MaterialIcons name="palette" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.toolLabel}>Board</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={saveBoardAsImage}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#10B98120' }]}>
                <MaterialIcons name="save-alt" size={22} color="#10B981" />
              </View>
              <Text style={styles.toolLabel}>Save</Text>
            </TouchableOpacity>
          </View>
          )}

          {/* Board Switcher */}
          <Modal visible={showBoardSwitcher} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowBoardSwitcher(false)}
            >
              <View style={[styles.boardSwitcherSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
                <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000', marginBottom: 12 }]}>
                  Switch Board
                </Text>
                <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.45 }} showsVerticalScrollIndicator={false}>
                  {boards.map((board, i) => {
                    const isGrad = board.background?.startsWith('grad-');
                    const isCust = board.background === 'custom';
                    const bg = isGrad
                      ? GRADIENT_BACKGROUNDS.find(g => g.id === board.background) || GRADIENT_BACKGROUNDS[0]
                      : BACKGROUNDS.find(b => b.id === board.background) || BACKGROUNDS[0];
                    const isActive = i === currentBoardIndex;
                    return (
                      <TouchableOpacity
                        key={board.id}
                        style={[
                          styles.boardSwitcherItem,
                          { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5' },
                          isActive && { borderColor: '#EC4899', borderWidth: 2 },
                        ]}
                        onPress={() => {
                          hapticFeedback.selection();
                          setCurrentBoardIndex(i);
                          setShowBoardSwitcher(false);
                        }}
                      >
                        {isGrad ? (
                          <LinearGradient colors={bg.colors} style={styles.boardSwitcherSwatch} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                        ) : isCust && board.backgroundImage ? (
                          <Image source={{ uri: board.backgroundImage }} style={styles.boardSwitcherSwatch} />
                        ) : (
                          <View style={[styles.boardSwitcherSwatch, { backgroundColor: bg.colors[0] }]} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.boardSwitcherName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>{board.name}</Text>
                          <Text style={[styles.boardSwitcherMeta, { color: isDark ? '#888' : '#999' }]}>
                            {board.items?.length || 0} item{(board.items?.length || 0) !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        {isActive && <MaterialIcons name="check-circle" size={22} color="#EC4899" />}
                        {boards.length > 1 && (
                          <TouchableOpacity
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => {
                              Alert.alert('Delete Board', `Delete "${board.name}"? This cannot be undone.`, [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete', style: 'destructive', onPress: () => {
                                    hapticFeedback.medium();
                                    setShowBoardSwitcher(false);
                                    setBoards(prev => {
                                      const next = prev.filter((_, idx) => idx !== i);
                                      saveBoards(next);
                                      return next;
                                    });
                                    if (currentBoardIndex >= i && currentBoardIndex > 0) {
                                      setCurrentBoardIndex(prev => prev - 1);
                                    }
                                  },
                                },
                              ]);
                            }}
                          >
                            <MaterialIcons name="delete-outline" size={20} color="#FF3B30" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Background Picker */}
          <Modal visible={showBgPicker} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowBgPicker(false)}
            >
              <View style={[styles.bgPickerSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
                <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000', marginBottom: 16 }]}>
                  Board Background
                </Text>
                <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.55 }} showsVerticalScrollIndicator={false}>
                  {/* Import Image */}
                  <TouchableOpacity
                    style={[styles.importBgBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' }]}
                    onPress={importBackgroundImage}
                  >
                    <MaterialIcons name="add-photo-alternate" size={22} color="#3B82F6" />
                    <Text style={[styles.importBgBtnText, { color: isDark ? '#ddd' : '#333' }]}>
                      Import from Photos
                    </Text>
                  </TouchableOpacity>

                  {/* Gradient Backgrounds */}
                  <Text style={[styles.bgSectionLabel, { color: isDark ? '#aaa' : '#666' }]}>Gradients</Text>
                  <View style={styles.bgGrid}>
                    {GRADIENT_BACKGROUNDS.map(grad => {
                      const isActive = currentBoard.background === grad.id;
                      const isDarkLabel = DARK_BG_IDS.has(grad.id);
                      return (
                        <TouchableOpacity
                          key={grad.id}
                          style={[styles.bgOption, isActive && styles.bgOptionActive]}
                          onPress={() => changeBackground(grad.id)}
                        >
                          <LinearGradient
                            colors={grad.colors}
                            style={StyleSheet.absoluteFillObject}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          />
                          <Text style={[styles.bgLabel, { color: isDarkLabel ? '#fff' : '#333' }]}>{grad.label}</Text>
                          {isActive && (
                            <MaterialIcons name="check-circle" size={18} color="#EC4899" style={{ marginTop: 4 }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Solid Backgrounds */}
                  <Text style={[styles.bgSectionLabel, { color: isDark ? '#aaa' : '#666' }]}>Solid Colours</Text>
                  <View style={styles.bgGrid}>
                    {BACKGROUNDS.map(bg => {
                      const isDarkBg = DARK_BG_IDS.has(bg.id);
                      return (
                        <TouchableOpacity
                          key={bg.id}
                          style={[
                            styles.bgOption,
                            { backgroundColor: bg.colors[0] },
                            currentBoard.background === bg.id && styles.bgOptionActive,
                          ]}
                          onPress={() => changeBackground(bg.id)}
                        >
                          <Text style={[styles.bgLabel, {
                            color: isDarkBg ? '#fff' : '#333',
                          }]}>{bg.label}</Text>
                          {currentBoard.background === bg.id && (
                            <MaterialIcons name="check-circle" size={18} color="#EC4899" style={{ marginTop: 4 }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {boards.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteBoardBtn}
                    onPress={() => { setShowBgPicker(false); setTimeout(deleteCurrentBoard, 300); }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#FF3B30" />
                    <Text style={styles.deleteBoardBtnText}>Delete This Board</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Photo Options Modal */}
          <Modal visible={showPhotoOptions} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => { setShowPhotoOptions(false); setPendingPhoto(null); }}
            >
              <View style={[styles.bgPickerSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
                <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000', marginBottom: 16 }]}>
                  Photo Options
                </Text>

                {pendingPhoto && (
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <Image
                      source={{ uri: pendingPhoto }}
                      style={{ width: 80, height: 80, borderRadius: 10 }}
                    />
                  </View>
                )}

                <Text style={[styles.sectionLabel, { color: isDark ? '#aaa' : '#666' }]}>Size</Text>
                <View style={styles.fontSizeRow}>
                  {PHOTO_SIZES.map(size => (
                    <TouchableOpacity
                      key={size.id}
                      style={[
                        styles.fontSizeChip,
                        { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' },
                        photoSize === size.id && styles.fontSizeChipActive,
                      ]}
                      onPress={() => { hapticFeedback.selection(); setPhotoSize(size.id); }}
                    >
                      <Text style={[
                        styles.fontSizeLabel,
                        { color: isDark ? '#ddd' : '#333' },
                        photoSize === size.id && styles.fontSizeLabelActive,
                      ]}>{size.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionLabel, { color: isDark ? '#aaa' : '#666' }]}>Frame</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow} contentContainerStyle={{ gap: 8 }}>
                  {PHOTO_FRAMES.map(frame => (
                    <TouchableOpacity
                      key={frame.id}
                      style={[
                        styles.fontStyleChip,
                        { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' },
                        photoFrame === frame.id && styles.fontStyleChipActive,
                      ]}
                      onPress={() => { hapticFeedback.selection(); setPhotoFrame(frame.id); }}
                    >
                      <Text style={[
                        styles.fontStyleLabel,
                        { color: isDark ? '#ddd' : '#333' },
                        photoFrame === frame.id && styles.fontStyleLabelActive,
                      ]}>{frame.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.addBoardBtn} onPress={confirmPhoto}>
                  <Text style={styles.addBoardBtnText}>Add to Board</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Word Sticker Colour Picker Modal */}
          <Modal visible={showWordColorPicker} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => { setShowWordColorPicker(false); setPendingWordSticker(null); }}
            >
              <View style={[styles.bgPickerSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
                <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000', marginBottom: 16 }]}>
                  Sticker Colour
                </Text>

                {pendingWordSticker && (
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', fontStyle: 'italic', color: wordStickerColor }}>
                      {pendingWordSticker.content}
                    </Text>
                  </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 4 }}>
                  {WORD_STICKER_COLORS.map(color => {
                    const isSelected = wordStickerColor === color;
                    const isDarkC = isColorDark(color);
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color, borderColor: isDarkC ? '#555' : 'rgba(0,0,0,0.1)', width: 40, height: 40, borderRadius: 20 },
                          isSelected && { borderColor: '#EC4899', borderWidth: 2.5 },
                        ]}
                        onPress={() => { hapticFeedback.selection(); setWordStickerColor(color); }}
                      >
                        {isSelected && <MaterialIcons name="check" size={18} color={isDarkC ? '#fff' : '#EC4899'} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.addBoardBtn, { marginTop: 20 }]}
                  onPress={() => {
                    if (pendingWordSticker) {
                      addSticker(pendingWordSticker, wordStickerColor);
                    }
                    setShowWordColorPicker(false);
                    setPendingWordSticker(null);
                  }}
                >
                  <Text style={styles.addBoardBtnText}>Add to Board</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </GestureHandlerRootView>

      {/* ─── Create Folder Sheet (outside GestureHandlerRootView) ─── */}
      {noteMounted && (
        <View style={styles.sheetOverlay}>
          <RNAnimated.View
            style={[StyleSheet.absoluteFill, {
              backgroundColor: '#000',
              opacity: RNAnimated.multiply(
                noteBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
                noteDragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: 'clamp' }),
              ),
            }]}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeCreateFolder} />
          </RNAnimated.View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sheetKeyboard}
            pointerEvents="box-none"
          >
            <RNAnimated.View
              style={[styles.sheetContainer, {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                paddingBottom: insets.bottom,
                transform: [{
                  translateY: RNAnimated.add(
                    noteSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_HEIGHT] }),
                    noteDragY.interpolate({ inputRange: [-1, 0, SCREEN_HEIGHT], outputRange: [0, 0, SCREEN_HEIGHT], extrapolate: 'clamp' }),
                  ),
                }],
              }]}
            >
              <View {...notePanResponder.panHandlers}>
                <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]} />
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: isDark ? '#fff' : '#000' }]}>Create Folder</Text>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.sheetScroll}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                <TextInput
                  style={[styles.noteInput, {
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
                    minHeight: 50,
                    maxHeight: 50,
                  }]}
                  placeholder="Folder name (e.g. Family, Health, Work...)"
                  placeholderTextColor={isDark ? '#888' : '#999'}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  maxLength={40}
                  autoFocus
                />

                {/* Envelope Preview */}
                <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
                  <View style={[styles.envelopeContainer, { transform: [{ scale: 0.9 }] }]}>
                    <View style={[styles.envelopeBody, { backgroundColor: newFolderColor }]}>
                      <View style={[styles.envelopeInner, { backgroundColor: hexToRgba(newFolderColor, 0.18) }]}>
                        <Text style={[styles.envelopeName, { color: isColorDark(newFolderColor) ? '#fff' : '#1a1a1a' }]} numberOfLines={2}>
                          {newFolderName.trim() || 'Preview'}
                        </Text>
                        <Text style={[styles.envelopeCount, { color: isColorDark(newFolderColor) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)' }]}>
                          0 prayers
                        </Text>
                      </View>
                      <View style={styles.envelopeFlapWrap}>
                        <View style={[styles.envelopeFlapDown, { borderTopColor: darkenHex(newFolderColor, 0.3) }]} />
                      </View>
                      <View style={styles.envelopeSealCenter}>
                        <View style={[styles.envelopeSealCircle, { backgroundColor: isColorDark(newFolderColor) ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)', borderColor: isColorDark(newFolderColor) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                          <MaterialIcons name="mail" size={16} color={isColorDark(newFolderColor) ? '#fff' : '#444'} />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={[styles.sectionLabel, { color: isDark ? '#aaa' : '#666' }]}>Envelope Colour</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 4 }}>
                  {ENVELOPE_COLORS.map(color => {
                    const isSelected = newFolderColor === color;
                    const isDarkColor = isColorDark(color);
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color, borderColor: isDarkColor ? '#555' : 'rgba(0,0,0,0.1)' },
                          isSelected && { borderColor: '#fff', borderWidth: 2.5 },
                        ]}
                        onPress={() => { hapticFeedback.selection(); setNewFolderColor(color); }}
                      >
                        {isSelected && <MaterialIcons name="check" size={16} color={isDarkColor ? '#fff' : '#333'} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.addBoardBtn, !newFolderName.trim() && { opacity: 0.4 }]}
                  onPress={createFolder}
                  disabled={!newFolderName.trim()}
                >
                  <Text style={styles.addBoardBtnText}>Create Folder</Text>
                </TouchableOpacity>
              </ScrollView>
            </RNAnimated.View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ─── Sticker Picker (outside GestureHandlerRootView) ─── */}
      {stickerMounted && (
        <View style={styles.sheetOverlay}>
          <RNAnimated.View
            style={[StyleSheet.absoluteFill, {
              backgroundColor: '#000',
              opacity: RNAnimated.multiply(
                stickerBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
                stickerDragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: 'clamp' }),
              ),
            }]}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeStickerPicker} />
          </RNAnimated.View>

          <View style={styles.sheetKeyboard} pointerEvents="box-none">
            <RNAnimated.View
              style={[styles.sheetContainer, {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                paddingBottom: insets.bottom,
                transform: [{
                  translateY: RNAnimated.add(
                    stickerSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_HEIGHT] }),
                    stickerDragY.interpolate({ inputRange: [-1, 0, SCREEN_HEIGHT], outputRange: [0, 0, SCREEN_HEIGHT], extrapolate: 'clamp' }),
                  ),
                }],
              }]}
            >
              <View {...stickerPanResponder.panHandlers}>
                <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]} />
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: isDark ? '#fff' : '#000' }]}>Stickers</Text>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll} bounces={false}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                  {[
                    { id: 'faith', label: 'Faith', icon: 'church' },
                    { id: 'decorative', label: 'Decor', icon: 'favorite' },
                    { id: 'nature', label: 'Nature', icon: 'eco' },
                    { id: 'symbols', label: 'Symbols', icon: 'auto-awesome' },
                    { id: 'words', label: 'Words', icon: 'text-fields' },
                  ].map(tab => (
                    <TouchableOpacity
                      key={tab.id}
                      style={[
                        styles.stickerTab,
                        { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' },
                        stickerTab === tab.id && { backgroundColor: '#EC4899' },
                      ]}
                      onPress={() => { hapticFeedback.selection(); setStickerTab(tab.id); }}
                    >
                      <MaterialIcons name={tab.icon} size={16} color={stickerTab === tab.id ? '#fff' : (isDark ? '#aaa' : '#666')} />
                      <Text style={[
                        styles.stickerTabText,
                        { color: isDark ? '#aaa' : '#666' },
                        stickerTab === tab.id && { color: '#fff' },
                      ]}>{tab.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.stickerGridInner}>
                  {(BUILT_IN_STICKERS[stickerTab] || []).map(sticker => (
                    <TouchableOpacity
                      key={sticker.id}
                      style={[styles.stickerCell, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5' }]}
                      onPress={() => {
                        if (sticker.isText) {
                          setPendingWordSticker(sticker);
                          setWordStickerColor('#EC4899');
                          setShowWordColorPicker(true);
                          closeStickerPicker();
                        } else {
                          addSticker(sticker);
                          closeStickerPicker();
                        }
                      }}
                    >
                      {sticker.isText ? (
                        <Text style={styles.stickerWordPreview}>{sticker.content}</Text>
                      ) : (
                        <Text style={styles.stickerEmojiPreview}>{sticker.content}</Text>
                      )}
                      <Text style={[styles.stickerCellLabel, { color: isDark ? '#888' : '#999' }]}>{sticker.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.importPhotoBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' }]}
                  onPress={() => importPhoto()}
                >
                  <MaterialIcons name="add-photo-alternate" size={22} color="#3B82F6" />
                  <Text style={[styles.importPhotoBtnText, { color: isDark ? '#ddd' : '#333' }]}>
                    Import from Photos
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </RNAnimated.View>
          </View>
        </View>
      )}

      {/* ─── Inside Folder Popup ─── */}
      <Modal visible={!!openFolderId} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.7} onPress={() => { setOpenFolderId(null); setShowAddPrayerInFolder(false); setFolderPrayerText(''); }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.popupKeyboard} pointerEvents="box-none">
            <BlurView
              intensity={isDark ? 45 : 70}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.popupCard, { backgroundColor: isDark ? 'rgba(8,8,12,0.82)' : 'rgba(255,255,255,0.82)' }]}
            >
              <LinearGradient
                colors={[`${openFolderItem?.color || '#EC4899'}33`, `${openFolderItem?.color || '#EC4899'}0A`, 'transparent']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.popupHalo} />

              {/* Header */}
              <View style={styles.popupHeader}>
                <View style={[styles.popupIconWrap, { borderColor: (openFolderItem?.color || '#EC4899') + '50', backgroundColor: (openFolderItem?.color || '#EC4899') + '18' }]}>
                  <MaterialIcons name="mail" size={22} color={openFolderItem?.color || '#EC4899'} />
                </View>
                <View style={styles.popupHeaderContent}>
                  <TouchableOpacity onPress={() => openFolderItem && renameFolder(openFolderItem.id)}>
                    <Text style={[styles.popupTitle, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                      {openFolderItem?.name || 'Folder'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.popupSubtitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                    {openFolderItem?.prayers?.length || 0} prayer{(openFolderItem?.prayers?.length || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.popupCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => { setOpenFolderId(null); setShowAddPrayerInFolder(false); setFolderPrayerText(''); }}
                >
                  <MaterialIcons name="close" size={20} color={isDark ? '#aaa' : '#666'} />
                </TouchableOpacity>
              </View>

              {/* Prayer List */}
              <ScrollView
                style={styles.popupScroll}
                contentContainerStyle={styles.popupScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {(!openFolderItem?.prayers || openFolderItem.prayers.length === 0) && !showAddPrayerInFolder && (
                  <View style={styles.popupEmpty}>
                    <MaterialIcons name="mail-outline" size={36} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'} />
                    <Text style={[styles.popupEmptyText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }]}>No prayers yet</Text>
                  </View>
                )}
                {(openFolderItem?.prayers || []).map((prayer) => (
                  <View
                    key={prayer.id}
                    style={[styles.prayerListItem, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prayerListText, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                        {prayer.text}
                      </Text>
                      <Text style={[styles.prayerListDate, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
                        {new Date(prayer.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.prayerListActions}>
                      <TouchableOpacity
                        style={[styles.prayerActionBtn, { backgroundColor: 'rgba(16,185,129,0.12)' }]}
                        onPress={() => markPrayerAnswered(prayer.id)}
                      >
                        <MaterialIcons name="check-circle-outline" size={22} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.prayerActionBtn, { backgroundColor: 'rgba(255,59,48,0.1)' }]}
                        onPress={() => deletePrayerFromFolder(prayer.id)}
                      >
                        <MaterialIcons name="delete-outline" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {showAddPrayerInFolder && (
                  <View style={[styles.addPrayerInFolderCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  }]}>
                    <TextInput
                      style={[styles.folderPrayerInput, {
                        color: isDark ? '#fff' : '#000',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      }]}
                      placeholder="Write your prayer..."
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
                      value={folderPrayerText}
                      onChangeText={setFolderPrayerText}
                      multiline
                      maxLength={300}
                      autoFocus
                    />
                    <View style={styles.addPrayerBtnRow}>
                      <TouchableOpacity
                        style={styles.addPrayerCancelBtn}
                        onPress={() => { setShowAddPrayerInFolder(false); setFolderPrayerText(''); Keyboard.dismiss(); }}
                      >
                        <Text style={[styles.addPrayerCancelText, { color: isDark ? '#aaa' : '#666' }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.addPrayerConfirmBtn, !folderPrayerText.trim() && { opacity: 0.4 }]}
                        onPress={addPrayerToFolder}
                        disabled={!folderPrayerText.trim()}
                      >
                        <Text style={styles.addPrayerConfirmText}>Add Prayer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Add Prayer Button */}
              {!showAddPrayerInFolder && (
                <TouchableOpacity
                  style={[styles.popupAddBtn, {
                    backgroundColor: openFolderItem?.color || '#EC4899',
                    shadowColor: openFolderItem?.color || '#EC4899',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.28,
                    shadowRadius: 14,
                  }]}
                  onPress={() => { hapticFeedback.light(); setShowAddPrayerInFolder(true); }}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <Text style={styles.popupAddBtnText}>Add Prayer</Text>
                </TouchableOpacity>
              )}
            </BlurView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── Answered Prayers Popup ─── */}
      <Modal visible={showAnsweredModal} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.7} onPress={() => setShowAnsweredModal(false)} />
          <BlurView
            intensity={isDark ? 45 : 70}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.popupCard, { backgroundColor: isDark ? 'rgba(8,8,12,0.82)' : 'rgba(255,255,255,0.82)' }]}
          >
            <LinearGradient
              colors={['rgba(245,158,11,0.2)', 'rgba(245,158,11,0.04)', 'transparent']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.popupHalo} />

            {/* Header */}
            <View style={styles.popupHeader}>
              <View style={[styles.popupIconWrap, { borderColor: '#F59E0B50', backgroundColor: '#F59E0B18' }]}>
                <MaterialIcons name="check-circle" size={22} color="#F59E0B" />
              </View>
              <View style={styles.popupHeaderContent}>
                <Text style={[styles.popupTitle, { color: '#F59E0B' }]}>Answered Prayers</Text>
                <Text style={[styles.popupSubtitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                  {(currentBoard.answeredPrayers || []).length} prayer{(currentBoard.answeredPrayers || []).length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.popupCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => setShowAnsweredModal(false)}
              >
                <MaterialIcons name="close" size={20} color={isDark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.popupScroll}
              contentContainerStyle={styles.popupScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {(currentBoard.answeredPrayers || []).length === 0 && (
                <View style={styles.popupEmpty}>
                  <MaterialIcons name="check-circle" size={36} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'} />
                  <Text style={[styles.popupEmptyText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }]}>No answered prayers yet</Text>
                </View>
              )}
              {Object.entries(answeredByFolder).map(([folderName, prayers]) => (
                <View key={folderName} style={{ marginBottom: 16 }}>
                  <Text style={[styles.answeredGroupTitle, { color: isDark ? '#ddd' : '#333' }]}>
                    {folderName}
                  </Text>
                  {prayers.map(prayer => (
                    <View
                      key={prayer.id}
                      style={[styles.answeredPrayerItem, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      }]}
                    >
                      <MaterialIcons name="check-circle" size={18} color="#F59E0B" style={{ marginRight: 10, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.answeredPrayerText, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                          {prayer.text}
                        </Text>
                        <Text style={[styles.answeredPrayerDate, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
                          Answered {new Date(prayer.answeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  textureDot: {
    position: 'absolute',
    borderRadius: 10,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  saveTitleContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 100,
  },
  saveTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
    zIndex: 100,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: '#FF3B30',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerLeft: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  headerBoardCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  headerRight: {
    width: 84,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  canvas: {
    flex: 1,
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 100,
  },
  toolBtn: {
    alignItems: 'center',
    gap: 4,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  prayerCard: {
    width: 170,
    minHeight: 90,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    lineHeight: 22,
    textAlign: 'center',
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiSticker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 40,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  wordSticker: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  wordStickerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EC4899',
    fontStyle: 'italic',
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  sheetKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetScroll: {
    paddingHorizontal: 20,
  },
  addBoardBtn: {
    backgroundColor: '#EC4899',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  addBoardBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
  },
  noteInput: {
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontWeight: '500',
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  pickerRow: {
    flexDirection: 'row',
    maxHeight: 44,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fontSizeChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeChipActive: {
    backgroundColor: '#EC4899',
  },
  fontSizeLabel: {
    fontWeight: '700',
  },
  fontSizeLabelActive: {
    color: '#fff',
  },
  fontStyleChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fontStyleChipActive: {
    backgroundColor: '#EC4899',
  },
  fontStyleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  fontStyleLabelActive: {
    color: '#fff',
  },
  stickerTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  stickerTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stickerGridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stickerCell: {
    width: (SCREEN_WIDTH - 40 - 40) / 5,
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmojiPreview: {
    fontSize: 28,
  },
  stickerWordPreview: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EC4899',
    fontStyle: 'italic',
  },
  stickerCellLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  importPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
  },
  importPhotoBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  bgPickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bgSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
  },
  importBgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 4,
  },
  importBgBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  boardSwitcherSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  boardSwitcherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  boardSwitcherSwatch: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  boardSwitcherName: {
    fontSize: 16,
    fontWeight: '700',
  },
  boardSwitcherMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  bgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bgOption: {
    width: (SCREEN_WIDTH - 40 - 36) / 4,
    height: 65,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  bgOptionActive: {
    borderColor: '#EC4899',
  },
  bgLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBoardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  deleteBoardBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  envelopeContainer: {
    width: 130,
    alignItems: 'center',
  },
  envelopeBody: {
    width: 130,
    height: 130,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'visible',
    position: 'relative',
  },
  envelopeInner: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
    paddingTop: 58,
  },
  envelopeFlapWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  envelopeFlapDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 65,
    borderRightWidth: 65,
    borderTopWidth: 38,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  envelopeSealCenter: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  envelopeSealCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  envelopeName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  envelopeCount: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  deleteOverlayFolder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  folderModalContainer: {
    flex: 1,
  },
  folderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  folderModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  folderModalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  folderPrayerList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  folderEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  folderEmptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  folderEmptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupKeyboard: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: SCREEN_HEIGHT * 0.65,
    borderRadius: 24,
    padding: 24,
    paddingBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 18,
  },
  popupHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    alignSelf: 'center',
    opacity: 0.35,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  popupHeaderContent: {
    flex: 1,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  popupSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  popupCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupScroll: {
    flexGrow: 0,
  },
  popupScrollContent: {
    paddingBottom: 8,
  },
  popupEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  popupEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  popupAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
    elevation: 12,
  },
  popupAddBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  prayerListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  prayerListText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  prayerListDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
  },
  prayerListActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  prayerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPrayerInFolderCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  folderPrayerInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontWeight: '500',
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  addPrayerBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  addPrayerCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addPrayerCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addPrayerConfirmBtn: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addPrayerConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  answeredGroupTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  answeredPrayerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  answeredPrayerText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  answeredPrayerDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default PrayerBoardScreen;

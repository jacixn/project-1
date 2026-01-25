// 🌌 Cresvia Theme - Cosmic Masculine Elegance
export const cresviaWallpaper = require('./wallpaper1.png');

export const cresviaTheme = {
  name: 'Cresvia',
  id: 'cresvia',
  
  // Light Mode (Refined Cosmic Light)
  light: {
    // Background colors - Refined cosmic with better contrast
    background: '#F1F3FF', // Refined light cosmic blue
    surface: 'rgba(235, 238, 255, 0.9)', // More solid cosmic surface
    card: 'rgba(255, 255, 255, 0.85)', // More visible glassy cards
    
    // Text colors - Better contrast cosmic colors
    text: '#1A1B3A', // Deep cosmic navy for better readability
    textSecondary: '#2D1B69', // Rich cosmic purple
    textTertiary: '#4C1D95', // Medium cosmic purple
    
    // Brand colors - Vibrant cosmic spectrum for light mode
    primary: '#6D28D9', // Rich electric purple
    primaryLight: '#A78BFA', // Bright cosmic purple
    primaryDark: '#4C1D95', // Deep cosmic purple
    
    // Status colors - Vibrant cosmic themed
    success: '#047857', // Rich cosmic emerald
    warning: '#B45309', // Rich cosmic amber
    error: '#B91C1C', // Rich cosmic red
    info: '#1D4ED8', // Rich cosmic blue
    
    // UI colors - Refined cosmic light
    border: 'rgba(109, 40, 217, 0.25)', // Richer purple border
    separator: 'rgba(235, 238, 255, 0.4)', // More visible cosmic separator
    overlay: 'rgba(26, 27, 58, 0.5)', // Better cosmic overlay
    
    // Prayer/Bible specific - Enhanced cosmic tones
    prayerBackground: 'rgba(241, 243, 255, 0.9)', // More solid cosmic prayer
    bibleBackground: 'rgba(235, 238, 255, 0.9)', // More solid cosmic bible
    verseBackground: 'rgba(255, 255, 255, 0.7)', // More visible verse background
    
    // Tab colors - Enhanced cosmic tabs
    tabBackground: 'rgba(235, 238, 255, 0.8)', // More solid tabs
    tabActive: '#6D28D9', // Rich electric purple active
    tabInactive: '#64748B', // Better muted cosmic inactive
    
    // Shadows - Rich purple cosmic glow
    shadowColor: '#6D28D9',
    shadowOpacity: 0.25,
    elevation: 6,
    
    // Gradients - Enhanced cosmic flows
    gradient: ['#A78BFA', '#6D28D9', '#4C1D95'], // Rich cosmic gradient
    headerGradient: ['#F1F3FF', '#EBEEFF'], // Enhanced cosmic header
    
    // Glass effect properties - Enhanced cosmic glass
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(109, 40, 217, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 8,
    },
    
    // Modal glass effect - Enhanced cosmic
    modalGlass: {
      backgroundColor: 'rgba(235, 238, 255, 0.25)',
      borderColor: 'rgba(109, 40, 217, 0.3)',
      borderWidth: 1,
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    
    // Card glass effect - Refined cosmic
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(109, 40, 217, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
    
    // Button glass effect - Rich cosmic
    buttonGlass: {
      backgroundColor: 'rgba(109, 40, 217, 0.2)',
      borderColor: 'rgba(109, 40, 217, 0.35)',
      borderWidth: 1,
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    
    // Special effects - Enhanced cosmic energy
    glow: {
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 15,
    },
    
    // Animation colors - Enhanced cosmic energy flows
    animation: {
      shimmer: ['#A78BFA', '#6D28D9', '#A78BFA'],
      pulse: '#6D28D9',
      ripple: 'rgba(109, 40, 217, 0.25)',
    }
  },

  // Dark Mode (Current Cosmic Look)
  dark: {
  // Background colors - Deep cosmic blacks with subtle purples
  background: '#0A0A0F', // Deep space black
  surface: 'rgba(15, 15, 25, 0.8)', // Dark cosmic surface
  card: 'rgba(25, 25, 40, 0.15)', // Glassy dark transparent
  
    // Text colors - High contrast electric colors for readability
    text: '#FFFFFF', // Pure white for maximum readability
    textSecondary: '#E2E8F0', // Very light blue-white
    textTertiary: '#CBD5E1', // Light blue-gray
    
    // Brand colors - Bright cosmic spectrum for dark mode
    primary: '#A78BFA', // Light cosmic purple (brighter for dark backgrounds)
    primaryLight: '#C4B5FD', // Very light cosmic purple
    primaryDark: '#7C3AED', // Electric purple
    
    // Status colors - High contrast cosmic themed
    success: '#10B981', // Bright emerald
    warning: '#F59E0B', // Bright amber
    error: '#EF4444', // Bright red
    info: '#3B82F6', // Bright blue
  
  // UI colors - Glassy and cosmic
  border: 'rgba(124, 58, 237, 0.3)', // Transparent purple border
  separator: 'rgba(25, 25, 40, 0.4)', // Dark cosmic separator
  overlay: 'rgba(10, 10, 15, 0.8)', // Deep space overlay
  
  // Prayer/Bible specific - Cosmic tones
  prayerBackground: 'rgba(15, 15, 25, 0.9)', // Dark cosmic prayer
  bibleBackground: 'rgba(25, 25, 40, 0.9)', // Darker cosmic bible
  verseBackground: 'rgba(40, 40, 60, 0.2)', // Glassy cosmic verse
  
  // Tab colors - Glassy cosmic
  tabBackground: 'rgba(25, 25, 40, 0.7)', // Transparent cosmic tabs
  tabActive: '#7C3AED', // Electric purple active
  tabInactive: '#6B7280', // Muted cosmic inactive
  
  // Shadows - Purple cosmic glow
  shadowColor: '#7C3AED',
  shadowOpacity: 0.4,
  elevation: 8,
  
  // Gradients - Cosmic flows
  gradient: ['#1E1B4B', '#7C3AED', '#A78BFA'], // Deep to light cosmic
  headerGradient: ['#0A0A0F', '#1E1B4B'], // Space gradient
  
  // Glass effect properties - Cosmic glass
  glass: {
    backgroundColor: 'rgba(40, 40, 60, 0.12)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    backdropFilter: 'blur(20px)', // For web
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  
  // Modal glass effect - Deep cosmic
  modalGlass: {
    backgroundColor: 'rgba(25, 25, 40, 0.18)',
    borderColor: 'rgba(124, 58, 237, 0.35)',
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 12,
  },
  
  // Card glass effect - Subtle cosmic
  cardGlass: {
    backgroundColor: 'rgba(40, 40, 60, 0.1)',
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 0.5,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  
  // Button glass effect - Electric cosmic
  buttonGlass: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: 'rgba(124, 58, 237, 0.45)',
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 7,
  },
  
  // Special effects - Cosmic energy
  glow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 18,
  },
  
  // Animation colors - Cosmic energy flows
  animation: {
    shimmer: ['#1E1B4B', '#7C3AED', '#1E1B4B'],
    pulse: '#7C3AED',
    ripple: 'rgba(124, 58, 237, 0.4)',
    }
  }
};

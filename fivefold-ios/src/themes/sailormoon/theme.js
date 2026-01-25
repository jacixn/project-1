// 🌙 Sailor Moon Theme - Magical Girl Purple & Pink
export const sailormoonWallpaper = require('./wallpaper1.jpg');

export const sailormoonTheme = {
  name: 'Sailor Moon',
  id: 'sailormoon',
  
  // Light Mode (Main Look - Pastel Dream)
  light: {
    // Background colors - Soft pastel
    background: '#F5F0FF', // Very light purple
    surface: 'rgba(248, 240, 255, 0.8)', // Light lavender surface
    card: 'rgba(255, 255, 255, 0.85)', // White card
    
    // Text colors - Readable purples
    text: '#5B4B6E', // Deep purple text
    textSecondary: '#8B7BA8', // Medium purple
    textTertiary: '#B8A4D9', // Light purple
    
    // Brand colors - Sailor Moon purple & pink
    primary: '#C8A2D0', // Soft purple
    primaryLight: '#E0C4E8', // Very light purple
    primaryDark: '#9B7BA8', // Dark purple
    
    // Status colors - Pastel versions
    success: '#A8E6CF', // Soft green
    warning: '#FFD8A8', // Soft orange
    error: '#FFB6C1', // Soft pink red
    info: '#B8A4D9', // Lavender
    
    // UI colors - Soft pastels
    border: 'rgba(200, 162, 208, 0.2)', // Light purple border
    separator: 'rgba(248, 240, 255, 0.3)', // Light separator
    overlay: 'rgba(91, 75, 110, 0.5)', // Purple overlay
    
    // Prayer/Bible specific - Soft purple tones
    prayerBackground: 'rgba(245, 240, 255, 0.8)', // Light purple prayer
    bibleBackground: 'rgba(248, 232, 255, 0.8)', // Light pink-purple bible
    verseBackground: 'rgba(255, 255, 255, 0.2)', // Glassy white
    
    // Tab colors - Soft purple
    tabBackground: 'rgba(248, 240, 255, 0.6)', // Light transparent tabs
    tabActive: '#C8A2D0', // Soft purple active
    tabInactive: '#B8A4D9', // Lavender inactive
    
    // Shadows - Purple glow
    shadowColor: '#C8A2D0',
    shadowOpacity: 0.3,
    elevation: 6,
    
    // Gradients - Purple to pink flows
    gradient: ['#E0C4E8', '#C8A2D0', '#FFB6D9'], // Light purple to pink
    headerGradient: ['#F5F0FF', '#FAF0FF'], // Subtle gradient
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(200, 162, 208, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    
    // Modal glass effect
    modalGlass: {
      backgroundColor: 'rgba(248, 240, 255, 0.15)',
      borderColor: 'rgba(200, 162, 208, 0.3)',
      borderWidth: 1,
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    
    // Card glass effect
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(200, 162, 208, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    
    // Button glass effect
    buttonGlass: {
      backgroundColor: 'rgba(200, 162, 208, 0.2)',
      borderColor: 'rgba(200, 162, 208, 0.4)',
      borderWidth: 1,
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    
    // Special effects
    glow: {
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    
    // Animation colors
    animation: {
      shimmer: ['#E0C4E8', '#C8A2D0', '#E0C4E8'],
      pulse: '#C8A2D0',
      ripple: 'rgba(200, 162, 208, 0.3)',
    }
  },

  // Dark Mode (Magical Night)
  dark: {
    // Background colors - Deep purple night
    background: '#1A1625', // Very dark purple
    surface: 'rgba(35, 28, 45, 0.8)', // Dark purple surface
    card: 'rgba(45, 35, 55, 0.15)', // Dark glassy purple
    
    // Text colors - High contrast light
    text: '#FFFFFF', // Pure white
    textSecondary: '#F0E5FF', // Very light purple-white
    textTertiary: '#E0D0F0', // Light purple-white
    
    // Brand colors - Bright purple & pink
    primary: '#C8A2D0', // Soft purple
    primaryLight: '#E0C4E8', // Light purple
    primaryDark: '#9B7BA8', // Dark purple
    
    // Status colors - High contrast
    success: '#10B981', // Bright green
    warning: '#F59E0B', // Bright amber
    error: '#EF4444', // Bright red
    info: '#C8A2D0', // Purple
    
    // UI colors - Dark purple glass
    border: 'rgba(200, 162, 208, 0.3)', // Purple border
    separator: 'rgba(35, 28, 45, 0.4)', // Dark separator
    overlay: 'rgba(26, 22, 37, 0.9)', // Deep dark overlay
    
    // Prayer/Bible specific - Dark purple tones
    prayerBackground: 'rgba(35, 28, 45, 0.9)', // Dark purple prayer
    bibleBackground: 'rgba(45, 35, 55, 0.9)', // Darker purple bible
    verseBackground: 'rgba(60, 45, 75, 0.2)', // Dark glassy verse
    
    // Tab colors - Dark with purple highlights
    tabBackground: 'rgba(35, 28, 45, 0.7)', // Dark transparent tabs
    tabActive: '#C8A2D0', // Soft purple active
    tabInactive: '#9B7BA8', // Dark purple inactive
    
    // Shadows - Purple glow in dark
    shadowColor: '#C8A2D0',
    shadowOpacity: 0.5,
    elevation: 8,
    
    // Gradients - Dark to purple flows
    gradient: ['#1A1625', '#C8A2D0', '#9B7BA8'], // Dark to purple
    headerGradient: ['#1A1625', '#231C2D'], // Dark gradient
    
    // Glass effect properties - Dark purple glass
    glass: {
      backgroundColor: 'rgba(45, 35, 55, 0.12)',
      borderColor: 'rgba(200, 162, 208, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 18,
      elevation: 10,
    },
    
    // Modal glass effect - Dark purple
    modalGlass: {
      backgroundColor: 'rgba(35, 28, 45, 0.18)',
      borderColor: 'rgba(200, 162, 208, 0.35)',
      borderWidth: 1,
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.6,
      shadowRadius: 25,
      elevation: 12,
    },
    
    // Card glass effect - Subtle dark purple
    cardGlass: {
      backgroundColor: 'rgba(45, 35, 55, 0.1)',
      borderColor: 'rgba(200, 162, 208, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    
    // Button glass effect - Vibrant purple
    buttonGlass: {
      backgroundColor: 'rgba(200, 162, 208, 0.25)',
      borderColor: 'rgba(200, 162, 208, 0.45)',
      borderWidth: 1,
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 7,
    },
    
    // Special effects - Purple magic energy
    glow: {
      shadowColor: '#C8A2D0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    
    // Animation colors - Purple magic
    animation: {
      shimmer: ['#1A1625', '#C8A2D0', '#1A1625'],
      pulse: '#C8A2D0',
      ripple: 'rgba(200, 162, 208, 0.4)',
    }
  }
};


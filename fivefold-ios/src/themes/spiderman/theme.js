// 🕷️ Spiderman Theme - Web Slinger Red & Black
export const spidermanWallpaper = require('./wallpaper1.jpg');

export const spidermanTheme = {
  name: 'Spiderman',
  id: 'spiderman',
  
  // Dark Mode (Main Look)
  dark: {
    // Background colors - Deep black like the suit
    background: '#0A0A0A', // Very dark black
    surface: 'rgba(20, 10, 10, 0.8)', // Dark surface with red undertone
    card: 'rgba(30, 15, 15, 0.15)', // Dark glassy card
    
    // Text colors - High contrast white and red
    text: '#FFFFFF', // Pure white like the eyes
    textSecondary: '#F8FAFC', // Very light gray-white
    textTertiary: '#F1F5F9', // Light gray-white
    
    // Brand colors - Classic Spiderman red
    primary: '#E31E24', // Bright Spiderman red
    primaryLight: '#FF4444', // Lighter red
    primaryDark: '#C70000', // Dark red
    
    // Status colors - High contrast
    success: '#10B981', // Bright green
    warning: '#F59E0B', // Bright amber
    error: '#EF4444', // Bright red
    info: '#E31E24', // Spiderman red
    
    // UI colors - Dark glassy with red accents
    border: 'rgba(227, 30, 36, 0.3)', // Red border
    separator: 'rgba(20, 10, 10, 0.4)', // Dark separator
    overlay: 'rgba(10, 10, 10, 0.9)', // Deep black overlay
    
    // Prayer/Bible specific - Dark with red undertones
    prayerBackground: 'rgba(20, 10, 10, 0.9)', // Dark prayer
    bibleBackground: 'rgba(30, 15, 15, 0.9)', // Darker bible
    verseBackground: 'rgba(40, 20, 20, 0.2)', // Dark glassy verse
    
    // Tab colors - Dark with red highlights
    tabBackground: 'rgba(20, 10, 10, 0.7)', // Dark transparent tabs
    tabActive: '#E31E24', // Spiderman red active
    tabInactive: '#C70000', // Dark red inactive
    
    // Shadows - Red glow
    shadowColor: '#E31E24',
    shadowOpacity: 0.5,
    elevation: 8,
    
    // Gradients - Black to red flows
    gradient: ['#0A0A0A', '#E31E24', '#C70000'], // Black to red
    headerGradient: ['#0A0A0A', '#1A0A0A'], // Dark gradient
    
    // Glass effect properties - Dark red glass
    glass: {
      backgroundColor: 'rgba(30, 15, 15, 0.12)',
      borderColor: 'rgba(227, 30, 36, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 18,
      elevation: 10,
    },
    
    // Modal glass effect - Dark with red
    modalGlass: {
      backgroundColor: 'rgba(20, 10, 10, 0.18)',
      borderColor: 'rgba(227, 30, 36, 0.35)',
      borderWidth: 1,
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.6,
      shadowRadius: 25,
      elevation: 12,
    },
    
    // Card glass effect - Subtle dark red
    cardGlass: {
      backgroundColor: 'rgba(30, 15, 15, 0.1)',
      borderColor: 'rgba(227, 30, 36, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    
    // Button glass effect - Vibrant red
    buttonGlass: {
      backgroundColor: 'rgba(227, 30, 36, 0.25)',
      borderColor: 'rgba(227, 30, 36, 0.45)',
      borderWidth: 1,
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 7,
    },
    
    // Special effects - Red spider energy
    glow: {
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    
    // Animation colors - Red web energy
    animation: {
      shimmer: ['#0A0A0A', '#E31E24', '#0A0A0A'],
      pulse: '#E31E24',
      ripple: 'rgba(227, 30, 36, 0.4)',
    }
  },

  // Light Mode (Alternative Look)
  light: {
    // Background colors - Light with red accents
    background: '#FAFAFA', // Very light gray
    surface: 'rgba(255, 245, 245, 0.8)', // Light red surface
    card: 'rgba(255, 255, 255, 0.85)', // White card
    
    // Text colors - Dark for readability
    text: '#1A1A1A', // Very dark text
    textSecondary: '#4A4A4A', // Medium dark
    textTertiary: '#6B7280', // Light gray
    
    // Brand colors - Spiderman red
    primary: '#E31E24', // Bright Spiderman red
    primaryLight: '#FF4444', // Lighter red
    primaryDark: '#C70000', // Dark red
    
    // Status colors
    success: '#10B981', // Green
    warning: '#F59E0B', // Amber
    error: '#EF4444', // Red
    info: '#E31E24', // Spiderman red
    
    // UI colors - Light with red accents
    border: 'rgba(227, 30, 36, 0.2)', // Light red border
    separator: 'rgba(245, 245, 245, 0.3)', // Light separator
    overlay: 'rgba(0, 0, 0, 0.5)', // Dark overlay
    
    // Prayer/Bible specific - Light red tones
    prayerBackground: 'rgba(255, 245, 245, 0.8)', // Light red prayer
    bibleBackground: 'rgba(255, 240, 240, 0.8)', // Light red bible
    verseBackground: 'rgba(255, 255, 255, 0.2)', // Glassy white
    
    // Tab colors - Light with red
    tabBackground: 'rgba(255, 245, 245, 0.6)', // Light transparent tabs
    tabActive: '#E31E24', // Spiderman red active
    tabInactive: '#C70000', // Dark red inactive
    
    // Shadows - Red glow
    shadowColor: '#E31E24',
    shadowOpacity: 0.3,
    elevation: 6,
    
    // Gradients - Light to red flows
    gradient: ['#FFCACA', '#E31E24', '#C70000'], // Light to red
    headerGradient: ['#FAFAFA', '#FFF5F5'], // Subtle gradient
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(227, 30, 36, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    
    // Modal glass effect
    modalGlass: {
      backgroundColor: 'rgba(255, 245, 245, 0.15)',
      borderColor: 'rgba(227, 30, 36, 0.3)',
      borderWidth: 1,
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    
    // Card glass effect
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(227, 30, 36, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    
    // Button glass effect
    buttonGlass: {
      backgroundColor: 'rgba(227, 30, 36, 0.2)',
      borderColor: 'rgba(227, 30, 36, 0.4)',
      borderWidth: 1,
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    
    // Special effects
    glow: {
      shadowColor: '#E31E24',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    
    // Animation colors
    animation: {
      shimmer: ['#FFCACA', '#E31E24', '#FFCACA'],
      pulse: '#E31E24',
      ripple: 'rgba(227, 30, 36, 0.3)',
    }
  }
};


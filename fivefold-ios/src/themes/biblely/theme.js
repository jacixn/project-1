// 🎨 Biblely Theme - Vibrant & Colorful
export const biblelyWallpapers = [
  { id: 'biblely', name: 'Biblely', source: require('./wallpaper1.jpg'), mode: 'light' },
  { id: 'jesusnlambs', name: 'Jesus & Lambs', source: require('./wallpaper2.jpg'), mode: 'dark' },
  { id: 'classic', name: 'Classic', source: require('./wallpaper3.jpg'), mode: 'dark' },
];

// ============================================
// 🐑 JESUS & LAMBS THEME - Nature & Pastoral
// ============================================
export const jesusNLambsTheme = {
  name: 'Jesus & Lambs',
  id: 'jesusnlambs',
  
  // Dark mode with nature-inspired colors (green meadows, earth tones)
  dark: {
    // Background colors - Deep forest
    background: '#1A2419', // Dark forest green
    surface: 'rgba(35, 50, 35, 0.9)', // Forest surface
    card: 'rgba(45, 60, 45, 0.9)', // Forest card
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#C5D4C5', // Sage gray
    textTertiary: '#8FA88F', // Muted green
    
    // Brand colors - Nature greens
    primary: '#7CB342', // Fresh meadow green
    primaryLight: '#9CCC65', // Light green
    primaryDark: '#558B2F', // Dark green
    
    // Accent colors
    accent: '#A5D6A7', // Soft sage
    secondary: '#81C784', // Pastoral green
    tertiary: '#C8E6C9', // Light mint
    
    // Status colors
    success: '#66BB6A', // Green
    warning: '#FFD54F', // Warm yellow
    error: '#EF5350', // Soft red
    info: '#64B5F6', // Sky blue
    
    // UI colors
    border: 'rgba(124, 179, 66, 0.3)',
    separator: 'rgba(124, 179, 66, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // Prayer/Bible specific
    prayerBackground: 'rgba(35, 50, 35, 0.9)',
    bibleBackground: 'rgba(45, 60, 45, 0.9)',
    verseBackground: 'rgba(124, 179, 66, 0.1)',
    
    // Tab colors
    tabBackground: 'rgba(35, 50, 35, 0.8)',
    tabActive: '#7CB342',
    tabInactive: '#5A7A5A',
    
    // Shadows
    shadowColor: '#7CB342',
    shadowOpacity: 0.3,
    elevation: 8,
    
    // Gradients
    gradient: ['#7CB342', '#A5D6A7', '#81C784'],
    headerGradient: ['#1A2419', '#253525'],
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(124, 179, 66, 0.08)',
      borderColor: 'rgba(124, 179, 66, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    
    modalGlass: {
      backgroundColor: 'rgba(26, 36, 25, 0.2)',
      borderColor: 'rgba(124, 179, 66, 0.3)',
      borderWidth: 1,
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    
    cardGlass: {
      backgroundColor: 'rgba(124, 179, 66, 0.06)',
      borderColor: 'rgba(124, 179, 66, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    
    buttonGlass: {
      backgroundColor: 'rgba(124, 179, 66, 0.15)',
      borderColor: 'rgba(124, 179, 66, 0.35)',
      borderWidth: 1,
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    
    glow: {
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 20,
      elevation: 15,
    },
    
    animation: {
      shimmer: ['#1A2419', '#7CB342', '#1A2419'],
      pulse: '#7CB342',
      ripple: 'rgba(124, 179, 66, 0.3)',
    }
  }
};

// ============================================
// 📜 CLASSIC THEME - Traditional & Timeless
// ============================================
export const classicTheme = {
  name: 'Classic',
  id: 'classic',
  
  // Dark mode with classic biblical colors (deep burgundy/wine, warm neutrals)
  dark: {
    // Background colors - Deep warm charcoal
    background: '#1C1A1E', // Warm charcoal
    surface: 'rgba(40, 35, 42, 0.9)', // Warm dark surface
    card: 'rgba(50, 45, 52, 0.9)', // Warm dark card
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#D4C8C8', // Warm gray
    textTertiary: '#9A8F8F', // Muted warm
    
    // Brand colors - Deep wine/burgundy
    primary: '#8B3A4C', // Deep wine burgundy
    primaryLight: '#A85566', // Lighter burgundy
    primaryDark: '#6B2A3A', // Darker burgundy
    
    // Accent colors
    accent: '#C4A77D', // Muted cream/tan
    secondary: '#6B5B7A', // Muted purple
    tertiary: '#A89080', // Warm taupe
    
    // Status colors
    success: '#6B8E6B', // Muted sage green
    warning: '#C4A77D', // Warm tan
    error: '#A85555', // Muted red
    info: '#6B7A8E', // Muted blue
    
    // UI colors
    border: 'rgba(139, 58, 76, 0.3)',
    separator: 'rgba(139, 58, 76, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // Prayer/Bible specific
    prayerBackground: 'rgba(40, 35, 42, 0.9)',
    bibleBackground: 'rgba(50, 45, 52, 0.9)',
    verseBackground: 'rgba(139, 58, 76, 0.1)',
    
    // Tab colors
    tabBackground: 'rgba(40, 35, 42, 0.8)',
    tabActive: '#8B3A4C',
    tabInactive: '#6A6065',
    
    // Shadows
    shadowColor: '#8B3A4C',
    shadowOpacity: 0.3,
    elevation: 8,
    
    // Gradients
    gradient: ['#8B3A4C', '#6B5B7A', '#C4A77D'],
    headerGradient: ['#1C1A1E', '#252228'],
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(139, 58, 76, 0.08)',
      borderColor: 'rgba(139, 58, 76, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#8B3A4C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    
    modalGlass: {
      backgroundColor: 'rgba(28, 26, 30, 0.2)',
      borderColor: 'rgba(139, 58, 76, 0.3)',
      borderWidth: 1,
      shadowColor: '#8B3A4C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    
    cardGlass: {
      backgroundColor: 'rgba(139, 58, 76, 0.06)',
      borderColor: 'rgba(139, 58, 76, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#8B3A4C',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    
    buttonGlass: {
      backgroundColor: 'rgba(139, 58, 76, 0.15)',
      borderColor: 'rgba(139, 58, 76, 0.35)',
      borderWidth: 1,
      shadowColor: '#8B3A4C',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    
    glow: {
      shadowColor: '#8B3A4C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 20,
      elevation: 15,
    },
    
    animation: {
      shimmer: ['#1C1A1E', '#8B3A4C', '#1C1A1E'],
      pulse: '#8B3A4C',
      ripple: 'rgba(139, 58, 76, 0.3)',
    }
  }
};

// ============================================
// 🍊 BIBLELY THEME - Vibrant Orange & Cream
// ============================================
export const biblelyTheme = {
  name: 'Biblely',
  id: 'biblely',
  wallpapers: biblelyWallpapers,
  
  // Light Mode (Main Look)
  light: {
    // Background colors - Warm cream
    background: '#FFF8E7', // Warm cream
    surface: 'rgba(255, 248, 231, 0.9)', // Cream surface
    card: 'rgba(255, 255, 255, 0.9)', // White card
    
    // Text colors - Deep and readable
    text: '#2D2D2D', // Dark gray
    textSecondary: '#5A5A5A', // Medium gray
    textTertiary: '#8A8A8A', // Light gray
    
    // Brand colors - Vibrant orange (matches logo)
    primary: '#FF6B35', // Vibrant orange
    primaryLight: '#FF8A5B', // Lighter orange
    primaryDark: '#E85A2A', // Darker orange
    
    // Accent colors from wallpaper
    accent: '#FFD93D', // Yellow
    secondary: '#4A90E2', // Blue
    tertiary: '#2ECC71', // Green
    
    // Status colors
    success: '#2ECC71', // Fresh green
    warning: '#FFD93D', // Bright yellow
    error: '#FF6B6B', // Soft red
    info: '#4A90E2', // Sky blue
    
    // UI colors
    border: 'rgba(255, 107, 53, 0.2)', // Orange border
    separator: 'rgba(255, 107, 53, 0.1)', // Light separator
    overlay: 'rgba(0, 0, 0, 0.5)', // Dark overlay
    
    // Prayer/Bible specific
    prayerBackground: 'rgba(255, 248, 231, 0.9)', // Cream prayer
    bibleBackground: 'rgba(255, 255, 255, 0.9)', // White bible
    verseBackground: 'rgba(255, 255, 255, 0.3)', // Glassy white
    
    // Tab colors
    tabBackground: 'rgba(255, 248, 231, 0.7)', // Cream tabs
    tabActive: '#FF6B35', // Orange active
    tabInactive: '#FFAB91', // Light orange inactive
    
    // Shadows
    shadowColor: '#FF6B35',
    shadowOpacity: 0.25,
    elevation: 6,
    
    // Gradients - Colorful flows
    gradient: ['#FF6B35', '#FFD93D', '#4A90E2'], // Orange to yellow to blue
    headerGradient: ['#FFF8E7', '#FFE4D6'], // Warm cream gradient
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(255, 107, 53, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 8,
    },
    
    // Modal glass effect
    modalGlass: {
      backgroundColor: 'rgba(255, 248, 231, 0.2)',
      borderColor: 'rgba(255, 107, 53, 0.25)',
      borderWidth: 1,
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    
    // Card glass effect
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 107, 53, 0.15)',
      borderWidth: 0.5,
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
    
    // Button glass effect
    buttonGlass: {
      backgroundColor: 'rgba(255, 107, 53, 0.15)',
      borderColor: 'rgba(255, 107, 53, 0.3)',
      borderWidth: 1,
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    
    // Special effects
    glow: {
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 15,
    },
    
    // Animation colors
    animation: {
      shimmer: ['#FFF8E7', '#FF6B35', '#FFF8E7'],
      pulse: '#FF6B35',
      ripple: 'rgba(255, 107, 53, 0.3)',
    }
  },

  // Dark Mode
  dark: {
    // Background colors - Dark with warm undertones
    background: '#1A1A1F', // Dark background
    surface: 'rgba(35, 35, 42, 0.9)', // Dark surface
    card: 'rgba(45, 45, 55, 0.9)', // Dark card
    
    // Text colors
    text: '#FFFFFF', // White
    textSecondary: '#B0B0B0', // Light gray
    textTertiary: '#808080', // Medium gray
    
    // Brand colors - Vibrant orange
    primary: '#FF7B45', // Slightly lighter orange for dark mode
    primaryLight: '#FF9A6C', // Light orange
    primaryDark: '#E85A2A', // Darker orange
    
    // Accent colors
    accent: '#FFE066', // Yellow
    secondary: '#5AA3F0', // Blue
    tertiary: '#3EDD85', // Green
    
    // Status colors
    success: '#3EDD85', // Green
    warning: '#FFE066', // Yellow
    error: '#FF7B7B', // Red
    info: '#5AA3F0', // Blue
    
    // UI colors
    border: 'rgba(255, 123, 69, 0.3)', // Orange border
    separator: 'rgba(255, 123, 69, 0.15)', // Light separator
    overlay: 'rgba(0, 0, 0, 0.7)', // Dark overlay
    
    // Prayer/Bible specific
    prayerBackground: 'rgba(35, 35, 42, 0.9)', // Dark prayer
    bibleBackground: 'rgba(45, 45, 55, 0.9)', // Dark bible
    verseBackground: 'rgba(255, 123, 69, 0.1)', // Orange tinted
    
    // Tab colors
    tabBackground: 'rgba(35, 35, 42, 0.8)', // Dark tabs
    tabActive: '#FF7B45', // Orange active
    tabInactive: '#8A6A5A', // Muted orange inactive
    
    // Shadows
    shadowColor: '#FF7B45',
    shadowOpacity: 0.3,
    elevation: 8,
    
    // Gradients
    gradient: ['#FF7B45', '#FFE066', '#5AA3F0'], // Orange to yellow to blue
    headerGradient: ['#1A1A1F', '#252530'], // Dark gradient
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(255, 123, 69, 0.08)',
      borderColor: 'rgba(255, 123, 69, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#FF7B45',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    
    // Modal glass effect
    modalGlass: {
      backgroundColor: 'rgba(26, 26, 31, 0.2)',
      borderColor: 'rgba(255, 123, 69, 0.3)',
      borderWidth: 1,
      shadowColor: '#FF7B45',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    
    // Card glass effect
    cardGlass: {
      backgroundColor: 'rgba(255, 123, 69, 0.06)',
      borderColor: 'rgba(255, 123, 69, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#FF7B45',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    
    // Button glass effect
    buttonGlass: {
      backgroundColor: 'rgba(255, 123, 69, 0.15)',
      borderColor: 'rgba(255, 123, 69, 0.35)',
      borderWidth: 1,
      shadowColor: '#FF7B45',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    
    // Special effects
    glow: {
      shadowColor: '#FF7B45',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 20,
      elevation: 15,
    },
    
    // Animation colors
    animation: {
      shimmer: ['#1A1A1F', '#FF7B45', '#1A1A1F'],
      pulse: '#FF7B45',
      ripple: 'rgba(255, 123, 69, 0.3)',
    }
  }
};

export default biblelyTheme;

/**
 * Theme Manager for Fivefold App
 * Handles theme switching, CSS variable management, and theme persistence
 */

// Theme definitions
const themes = {
  default: {
    name: '🌅 Default Purple',
    colors: {
      '--primary-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      '--secondary-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      '--accent-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      '--card-bg': 'rgba(255, 255, 255, 0.95)',
      '--text-primary': '#2d3748',
      '--text-secondary': '#4a5568',
      '--text-light': '#ffffff',
      '--border-color': 'rgba(255, 255, 255, 0.2)',
      '--shadow': '0 10px 30px rgba(0,0,0,0.1)',
      '--accent-color': '#667eea'
    }
  },
  
  dark: {
    name: '🌙 Dark Mode',
    colors: {
      '--primary-gradient': 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
      '--secondary-gradient': 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
      '--accent-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      '--background': 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
      '--card-bg': 'rgba(45, 55, 72, 0.95)',
      '--text-primary': '#f7fafc',
      '--text-secondary': '#e2e8f0',
      '--text-light': '#ffffff',
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      '--shadow': '0 10px 30px rgba(0,0,0,0.3)',
      '--accent-color': '#667eea'
    }
  },
  
  light: {
    name: '☀️ Light Mode',
    colors: {
      '--primary-gradient': 'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)',
      '--secondary-gradient': 'linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%)',
      '--accent-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      '--background': 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      '--card-bg': 'rgba(255, 255, 255, 0.98)',
      '--text-primary': '#1a202c',
      '--text-secondary': '#2d3748',
      '--text-light': '#667eea',
      '--border-color': 'rgba(0, 0, 0, 0.1)',
      '--shadow': '0 10px 30px rgba(0,0,0,0.08)',
      '--accent-color': '#667eea'
    }
  },
  
  ocean: {
    name: '🌊 Ocean Blue',
    colors: {
      '--primary-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      '--secondary-gradient': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      '--accent-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      '--background': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      '--card-bg': 'rgba(255, 255, 255, 0.95)',
      '--text-primary': '#0f172a',
      '--text-secondary': '#1e293b',
      '--text-light': '#ffffff',
      '--border-color': 'rgba(255, 255, 255, 0.2)',
      '--shadow': '0 10px 30px rgba(14, 165, 233, 0.2)',
      '--accent-color': '#0ea5e9'
    }
  },
  
  forest: {
    name: '🌲 Forest Green',
    colors: {
      '--primary-gradient': 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      '--secondary-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      '--accent-gradient': 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
      '--background': 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      '--card-bg': 'rgba(255, 255, 255, 0.95)',
      '--text-primary': '#0f172a',
      '--text-secondary': '#1e293b',
      '--text-light': '#ffffff',
      '--border-color': 'rgba(255, 255, 255, 0.2)',
      '--shadow': '0 10px 30px rgba(5, 150, 105, 0.2)',
      '--accent-color': '#059669'
    }
  },
  
  sunset: {
    name: '🌅 Sunset Orange',
    colors: {
      '--primary-gradient': 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
      '--secondary-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      '--accent-gradient': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      '--background': 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
      '--card-bg': 'rgba(255, 255, 255, 0.95)',
      '--text-primary': '#0f172a',
      '--text-secondary': '#1e293b',
      '--text-light': '#ffffff',
      '--border-color': 'rgba(255, 255, 255, 0.2)',
      '--shadow': '0 10px 30px rgba(251, 146, 60, 0.2)',
      '--accent-color': '#fb923c'
    }
  }
};

class ThemeManager {
  constructor() {
    this.currentTheme = 'default';
    this.listeners = [];
    this.init();
  }

  init() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('fivefold_theme');
    if (savedTheme && themes[savedTheme]) {
      this.currentTheme = savedTheme;
    }
    
    // Apply the current theme
    this.applyTheme(this.currentTheme);
    
    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    }
  }

  applyTheme(themeName) {
    if (!themes[themeName]) {
      console.warn(`Theme "${themeName}" not found. Using default theme.`);
      themeName = 'default';
    }

    const theme = themes[themeName];
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors['--accent-color']);
    }

    // Save current theme
    this.currentTheme = themeName;
    localStorage.setItem('fivefold_theme', themeName);

    // Notify listeners
    this.notifyListeners(themeName, theme);

    // Add theme class to body for theme-specific styles
    document.body.className = document.body.className.replace(/theme-\w+/, '') + ` theme-${themeName}`;

    // Create a visual transition effect
    this.createThemeTransition();
  }

  createThemeTransition() {
    // Add a brief transition overlay for smooth theme switching
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--background);
      opacity: 0;
      pointer-events: none;
      z-index: 9999;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(overlay);
    
    // Trigger the transition
    requestAnimationFrame(() => {
      overlay.style.opacity = '0.8';
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(overlay);
        }, 300);
      }, 150);
    });
  }

  handleSystemThemeChange(event) {
    // Auto-switch to dark/light theme based on system preference
    const savedTheme = localStorage.getItem('fivefold_theme');
    if (!savedTheme || savedTheme === 'auto') {
      const prefersDark = event.matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  setTheme(themeName) {
    this.applyTheme(themeName);
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getAvailableThemes() {
    return Object.keys(themes).map(key => ({
      id: key,
      name: themes[key].name,
      colors: themes[key].colors
    }));
  }

  getThemeColors(themeName = this.currentTheme) {
    return themes[themeName]?.colors || themes.default.colors;
  }

  // Theme customization
  createCustomTheme(name, colors) {
    themes[name] = {
      name: name,
      colors: { ...themes.default.colors, ...colors }
    };
  }

  // Event system
  addThemeChangeListener(callback) {
    this.listeners.push(callback);
  }

  removeThemeChangeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  notifyListeners(themeName, theme) {
    this.listeners.forEach(callback => {
      try {
        callback(themeName, theme);
      } catch (error) {
        console.error('Theme change listener error:', error);
      }
    });
  }

  // Accessibility features
  enableHighContrast() {
    const root = document.documentElement;
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-primary', '#000000');
    root.style.setProperty('--border-color', '#000000');
    root.classList.add('high-contrast');
  }

  disableHighContrast() {
    document.documentElement.classList.remove('high-contrast');
    this.applyTheme(this.currentTheme); // Reapply current theme
  }

  enableReducedMotion() {
    document.documentElement.classList.add('reduced-motion');
  }

  disableReducedMotion() {
    document.documentElement.classList.remove('reduced-motion');
  }

  // Dynamic theme generation based on time
  getTimeBasedTheme() {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) {
      return 'light'; // Morning
    } else if (hour >= 12 && hour < 17) {
      return 'default'; // Afternoon
    } else if (hour >= 17 && hour < 20) {
      return 'sunset'; // Evening
    } else {
      return 'dark'; // Night
    }
  }

  enableAutoTheme() {
    const timeBasedTheme = this.getTimeBasedTheme();
    this.applyTheme(timeBasedTheme);
    
    // Update theme every hour
    setInterval(() => {
      const newTheme = this.getTimeBasedTheme();
      if (newTheme !== this.currentTheme) {
        this.applyTheme(newTheme);
      }
    }, 3600000); // 1 hour
  }

  // Export/Import theme settings
  exportThemeSettings() {
    return {
      currentTheme: this.currentTheme,
      customThemes: Object.keys(themes).filter(key => 
        !['default', 'dark', 'light', 'ocean', 'forest', 'sunset'].includes(key)
      ).reduce((acc, key) => {
        acc[key] = themes[key];
        return acc;
      }, {})
    };
  }

  importThemeSettings(settings) {
    if (settings.customThemes) {
      Object.entries(settings.customThemes).forEach(([name, theme]) => {
        themes[name] = theme;
      });
    }
    
    if (settings.currentTheme && themes[settings.currentTheme]) {
      this.applyTheme(settings.currentTheme);
    }
  }

  // Performance optimization
  preloadThemeAssets(themeName) {
    // Preload any theme-specific assets (images, fonts, etc.)
    const theme = themes[themeName];
    if (theme && theme.assets) {
      theme.assets.forEach(asset => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = asset.url;
        link.as = asset.type;
        document.head.appendChild(link);
      });
    }
  }
}

// Create and export singleton instance
const themeManager = new ThemeManager();

// CSS for theme transitions and accessibility
const themeCSS = `
  /* Theme transition styles */
  * {
    transition-property: background-color, border-color, color, box-shadow;
    transition-duration: 0.3s;
    transition-timing-function: ease;
  }
  
  /* Reduced motion support */
  .reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* High contrast mode */
  .high-contrast {
    filter: contrast(1.5);
  }
  
  .high-contrast * {
    text-shadow: none !important;
    box-shadow: 0 0 0 1px currentColor !important;
  }
  
  /* Theme-specific body classes */
  .theme-dark {
    color-scheme: dark;
  }
  
  .theme-light {
    color-scheme: light;
  }
`;

// Inject theme CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = themeCSS;
document.head.appendChild(styleSheet);

export default themeManager;

// Export utility functions
export const applyTheme = (themeName) => themeManager.setTheme(themeName);
export const getCurrentTheme = () => themeManager.getCurrentTheme();
export const getAvailableThemes = () => themeManager.getAvailableThemes();
export const addThemeChangeListener = (callback) => themeManager.addThemeChangeListener(callback);
export const removeThemeChangeListener = (callback) => themeManager.removeThemeChangeListener(callback);

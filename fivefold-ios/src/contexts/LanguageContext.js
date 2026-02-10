import React, { createContext, useState, useContext, useEffect } from 'react';
import userStorage from '../utils/userStorage';
import { translations, availableLanguages } from '../translations/languages';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [currentTranslations, setCurrentTranslations] = useState(translations.en);

  // Load saved language on mount
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await userStorage.getRaw('app_language');
      // Only allow English language to be loaded
      if (savedLanguage === 'en' && translations[savedLanguage]) {
        setLanguage(savedLanguage);
        setCurrentTranslations(translations[savedLanguage]);
      } else {
        // Force English if any other language was saved
        setLanguage('en');
        setCurrentTranslations(translations.en);
        await userStorage.setRaw('app_language', 'en');
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (newLanguage) => {
    if (newLanguage === language) return;
    
    // Only allow English language selection
    if (newLanguage !== 'en') {
      console.log('Non-English language selection blocked:', newLanguage);
      return;
    }
    
    setIsChangingLanguage(true);
    
    try {
      // Show loading for smooth transition
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update language
      setLanguage(newLanguage);
      setCurrentTranslations(translations[newLanguage]);
      
      // Save to storage
      await userStorage.setRaw('app_language', newLanguage);
      
      // Extra delay for effect
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  // Translation function
  const t = (key) => {
    return currentTranslations[key] || key;
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        t, 
        changeLanguage, 
        isChangingLanguage,
        availableLanguages,
        selectedLanguage: language
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
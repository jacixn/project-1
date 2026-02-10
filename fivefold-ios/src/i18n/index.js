import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import userStorage from '../utils/userStorage';
import * as Localization from 'expo-localization';

// Import all translation files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import sw from './locales/sw.json';
import tw from './locales/tw.json';
import yo from './locales/yo.json';
import ig from './locales/ig.json';
import ha from './locales/ha.json';
import am from './locales/am.json';
import zu from './locales/zu.json';
import xh from './locales/xh.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  ru: { translation: ru },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  ar: { translation: ar },
  hi: { translation: hi },
  sw: { translation: sw },
  tw: { translation: tw },
  yo: { translation: yo },
  ig: { translation: ig },
  ha: { translation: ha },
  am: { translation: am },
  zu: { translation: zu },
  xh: { translation: xh },
};

// Get initial language
const getInitialLang = async () => {
  const saved = await userStorage.getRaw('app_language');
  if (saved) return saved;
  
  // Get device language
  const deviceLang = Localization.getLocales()[0]?.languageCode || 'en';
  return resources[deviceLang] ? deviceLang : 'en';
};

// Initialize i18n
export const initI18n = async () => {
  const lng = await getInitialLang();
  
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'en',
      compatibilityJSON: 'v3',
      interpolation: {
        escapeValue: false
      }
    });
    
  return i18n;
};

// Function to change language
export const setLanguage = async (lng) => {
  await i18n.changeLanguage(lng);
  await userStorage.setRaw('app_language', lng);
};

export default i18n;


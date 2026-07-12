import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import SheetHeader from '../components/SheetHeader';
import { hapticFeedback } from '../utils/haptics';

// Language picker — native pull-to-dismiss modal stacked over Settings.
// Fully LanguageContext-backed. Only English is selectable today.
const LanguageScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, language, availableLanguages, changeLanguage, isChangingLanguage } = useLanguage();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SheetHeader title={t.language} leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {availableLanguages.map((lang) => {
          const isSelected = language === lang.code;
          const isEnglish = lang.code === 'en';

          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                {
                  backgroundColor: theme.card,
                  marginBottom: 10,
                  padding: 15,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: isEnglish ? 1 : 0.5,
                },
                isSelected && { borderColor: theme.primary, borderWidth: 2 },
              ]}
              onPress={isEnglish ? async () => {
                hapticFeedback.success();
                navigation.goBack();
                setTimeout(async () => { await changeLanguage(lang.code); }, 300);
              } : () => {}}
              activeOpacity={isEnglish ? 0.7 : 1}
              disabled={!isEnglish}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>{lang.flag}</Text>
                <View>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                    {lang.nativeName}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>
                    {lang.name}
                  </Text>
                  {!isEnglish && (
                    <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                      Not available
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isSelected && isEnglish && (
                  <MaterialIcons name="check-circle" size={24} color={theme.primary} style={{ marginRight: 8 }} />
                )}
                {!isEnglish && (
                  <MaterialIcons name="lock" size={20} color={theme.textTertiary} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isChangingLanguage && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 30, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} size="large" />
            <Text style={{ color: theme.text, marginTop: 15 }}>{t.changingLanguage}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default LanguageScreen;

/**
 * Bible Characters Screen
 *
 * The groups sheet: every story group as a card. Picking one pushes a
 * BibleCharacterGroupScreen sheet on top, and picking a character there pushes
 * a BibleCharacterScreen sheet, so backing out of each level is a real native
 * dismiss rather than an internal view swap.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { StaticBackButton, ScrollingTitle } from '../components/ScreenHeader';
import bibleCharactersService from '../services/bibleCharactersService';
import CustomLoadingIndicator from '../components/CustomLoadingIndicator';
import { AnimatedCharacterCard, getCardColors } from '../components/BibleCharacterCards';

const BibleCharactersScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  const [characterGroups, setCharacterGroups] = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(true);

  useEffect(() => {
    const loadCharacterData = async () => {
      try {
        setCharactersLoading(true);
        await bibleCharactersService.refresh();
        const groups = bibleCharactersService.getCharacterGroups();

        const colors = getCardColors(theme);
        setCharacterGroups(groups.map((group, index) => ({
          ...group, color: colors[index % colors.length],
        })));
      } catch (error) {
        console.error('Error loading character data:', error);
      } finally {
        setCharactersLoading(false);
      }
    };
    loadCharacterData();
  }, []);

  const renderContent = () => {
    if (charactersLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <CustomLoadingIndicator color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Loading characters...</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollingTitle title="Bible Characters" topOffset={24} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          {characterGroups.map((group) => (
            <AnimatedCharacterCard
              key={group.id}
              group={group}
              isDark={isDark}
              theme={theme}
              onPress={() => {
                hapticFeedback.light();
                navigation.navigate('BibleCharacterGroup', { group });
              }}
            />
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StaticBackButton onBack={() => navigation.goBack()} topOffset={24} />
      {renderContent()}
    </View>
  );
};

export default BibleCharactersScreen;

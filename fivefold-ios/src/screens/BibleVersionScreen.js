import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import SheetHeader from '../components/SheetHeader';
import userStorage from '../utils/userStorage';
import { pushToCloud } from '../services/userSyncService';
import { hapticFeedback } from '../utils/haptics';
import { bibleVersions } from '../data/bibleVersions';

// Bible Version picker — native pull-to-dismiss modal stacked over Settings.
// Persists through userStorage + broadcasts 'bibleVersionChanged' (same as the
// old inline modal) so the app reloads onto the new version.
const BibleVersionScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('niv');

  useEffect(() => {
    (async () => {
      try {
        const stored = await userStorage.getRaw('selectedBibleVersion');
        if (stored) setSelectedBibleVersion(stored);
      } catch {}
    })();
  }, []);

  const handleBibleVersionSelect = async (versionId) => {
    try {
      const version = bibleVersions.find(v => v.id === versionId);
      if (!version || version.isAvailable === false) return;

      setSelectedBibleVersion(versionId);
      await userStorage.setRaw('selectedBibleVersion', versionId);
      pushToCloud('selectedBibleVersion', versionId);
      hapticFeedback.success();

      // Full app reload to re-render on the new version (same as before).
      DeviceEventEmitter.emit('bibleVersionChanged', versionId);
    } catch (error) {
      console.error('Failed to select Bible version:', error);
      Alert.alert('Error', 'Failed to update Bible version. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SheetHeader title="Bible Version" leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 15 }}>
          Select Bible Version
        </Text>

        {bibleVersions && bibleVersions.map((version) => {
          const isSelected = selectedBibleVersion === version.id;
          const isAvailable = version.isAvailable !== false;

          return (
            <TouchableOpacity
              key={version.id}
              style={[
                {
                  backgroundColor: theme.card,
                  marginBottom: 10,
                  padding: 15,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                },
                isSelected && { borderColor: theme.primary, borderWidth: 2 },
                !isAvailable && { opacity: 0.6 },
              ]}
              onPress={() => { if (isAvailable) handleBibleVersionSelect(version.id); }}
              activeOpacity={isAvailable ? 0.7 : 1}
              disabled={!isAvailable}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                  {version.name}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>
                  {version.abbreviation}
                </Text>
                {!isAvailable && (
                  <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                    Not available
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isSelected && isAvailable && (
                  <MaterialIcons name="check-circle" size={24} color={theme.primary} style={{ marginRight: 8 }} />
                )}
                {!isAvailable && (
                  <MaterialIcons name="lock" size={20} color={theme.textTertiary} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default BibleVersionScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getPrayerStatus, 
  getPrayerStatusColor, 
  getPrayerStatusText,
  getPrayerCardBackground,
  canCompletePrayer 
} from '../utils/prayerTiming';
import { hapticFeedback } from '../utils/haptics';

const NewPrayerCard = ({ userPrayers = [], prayerHistory, onPrayerComplete, onPrayerPress, onManagePrayers }) => {
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for real-time status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatTime = (time) => {
    if (!time) return '--:--';
    
    // If it's already in HH:MM format, return it
    if (time.includes(':') && time.match(/^\d{1,2}:\d{2}$/)) {
      return time;
    }
    
    return '--:--';
  };

  return (
    <>
      <BlurView intensity={18} tint="light" style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🕊️ Today's Prayers</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              {userPrayers.length === 0 ? 'No prayers yet - tap + to add' : 'Tap to begin your prayer time'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.manageButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              hapticFeedback.light();
              onManagePrayers();
            }}
          >
            <MaterialIcons name="settings" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {userPrayers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="schedule" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Prayers Added</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Tap the settings button above to add your first prayer with a custom name and time
            </Text>
          </View>
        ) : (
          <View style={[styles.prayersList, { backgroundColor: theme.surface }]}>
            {userPrayers.map(prayer => {
              // Create a prayer object compatible with the existing status system
              const prayerForStatus = {
                time: prayer.time,
                slot: prayer.id, // Use ID as slot
                name: prayer.name
              };
              
              const prayerStatus = getPrayerStatus(prayer.time, false, prayerHistory, prayer.id);
              const statusColor = getPrayerStatusColor(prayerStatus.status, theme);
              const statusText = getPrayerStatusText(prayerStatus);
              const cardBackground = getPrayerCardBackground(prayerStatus.status, theme);
              const isCompleted = prayerStatus.status === 'completed';
              const canPress = prayerStatus.canComplete || isCompleted || prayerStatus.status === 'missed';
              
              return (
                <View 
                  key={prayer.id}
                  style={[
                    styles.prayerItem, 
                    { 
                      borderBottomColor: theme.border,
                      backgroundColor: cardBackground,
                      opacity: canPress ? 1 : 0.6
                    }
                  ]}
                >
                  {/* Prayer icon */}
                  <View style={[styles.prayerIcon, { backgroundColor: theme.primary + '20' }]}>
                    <MaterialIcons name="schedule" size={20} color={theme.primary} />
                  </View>
                  
                  {/* Prayer info area - clickable for prayer completion */}
                  <TouchableOpacity
                    style={styles.prayerInfo}
                    onPress={() => canPress && onPrayerPress(prayer)}
                    disabled={!canPress}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.prayerName, { color: theme.text }]}>{prayer.name}</Text>
                    <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>{formatTime(prayer.time)}</Text>
                    <Text style={[styles.prayerStatus, { color: statusColor }]}>{statusText}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.prayerActions}>
                    {/* Status indicator on the right */}
                    {isCompleted && (
                      <MaterialIcons name="check-circle" size={20} color={theme.success} />
                    )}
                    {prayerStatus.status === 'missed' && (
                      <MaterialIcons name="error" size={20} color={theme.error} />
                    )}
                    {canPress && !isCompleted && prayerStatus.status !== 'missed' && (
                      <MaterialIcons name="arrow-forward-ios" size={16} color={theme.textSecondary} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {/* Hint text */}
        <Text style={[styles.hintText, { color: theme.textTertiary }]}>
          {userPrayers.length === 0 
            ? 'Add prayers with custom names and times' 
            : 'Tap the settings button to manage prayers'
          }
        </Text>
      </BlurView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  manageButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  prayersList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  prayerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  prayerTime: {
    fontSize: 14,
    marginBottom: 2,
  },
  prayerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  prayerActions: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default NewPrayerCard;


import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const PrayerCard = ({ prayerTimes, prayerHistory, onPrayerComplete }) => {
  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isPrayerCompleted = (slot) => {
    const today = new Date().toDateString();
    return prayerHistory.some(p => p.date === today && p.slot === slot);
  };

  // ✝️ CHRISTIAN PRAYER TIMES - NO MUSLIM NAMES
  const christianPrayers = [
    { 
      name: 'Morning Prayer', 
      time: prayerTimes?.[0]?.time, 
      slot: 'pre_dawn',
      description: 'Early morning devotion'
    },
    { 
      name: 'Sunrise Prayer', 
      time: prayerTimes?.[1]?.time, 
      slot: 'post_sunrise',
      description: 'Dawn thanksgiving'
    },
    { 
      name: 'Midday Prayer', 
      time: prayerTimes?.[2]?.time, 
      slot: 'midday',
      description: 'Noon reflection'
    },
    { 
      name: 'Afternoon Prayer', 
      time: prayerTimes?.[3]?.time, 
      slot: 'pre_sunset',
      description: 'Afternoon praise'
    },
    { 
      name: 'Evening Prayer', 
      time: prayerTimes?.[4]?.time, 
      slot: 'night',
      description: 'Evening gratitude'
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🙏 Christian Prayer Times</Text>
      <Text style={styles.sectionSubtitle}>Five daily moments with Christ</Text>
      
      <View style={styles.prayersList}>
        {christianPrayers.map(({ name, time, slot, description }) => {
          const isCompleted = isPrayerCompleted(slot);
          return (
            <TouchableOpacity 
              key={slot}
              style={[
                styles.prayerItem,
                isCompleted && styles.prayerCompleted
              ]}
              onPress={() => onPrayerComplete(slot)}
              disabled={isCompleted}
            >
              <MaterialIcons 
                name={isCompleted ? 'check-circle' : 'schedule'} 
                size={24} 
                color={isCompleted ? '#4CAF50' : '#667eea'} 
              />
              <View style={styles.prayerInfo}>
                <Text style={styles.prayerName}>{name}</Text>
                <Text style={styles.prayerTime}>{formatTime(time)}</Text>
                <Text style={styles.prayerDescription}>{description}</Text>
              </View>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✝️ +15 pts</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      <Text style={styles.footerText}>✝️ "Pray without ceasing" - 1 Thessalonians 5:17</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  prayersList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prayerCompleted: {
    backgroundColor: '#f0f9ff',
  },
  prayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  prayerTime: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 2,
  },
  prayerDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  completedBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#667eea',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PrayerCard;
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const Dashboard = ({ userStats, prayerTimes, location, onSettingsPress }) => {
  const level = userStats?.level || 1;
  const currentPoints = userStats?.totalPoints || 0;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{currentPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userStats?.currentStreak || 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        
        <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
          <MaterialIcons name="settings" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9ff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default Dashboard;
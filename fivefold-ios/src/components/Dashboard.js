import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getNextPrayerTime } from '../utils/solarCalculations';
import { LiquidGlassStatsCard, LiquidGlassProgressCard } from './LiquidGlassCard';

const Dashboard = ({ userStats, prayerTimes, location, onSettingsPress, onExportPress, onBiblePress }) => {
  const level = Math.floor((userStats?.totalPoints || 0) / 100) + 1;
  const currentPoints = userStats?.totalPoints || 0;
  const nextPrayer = getNextPrayerTime(prayerTimes);
  
  // Calculate daily progress (points toward next level)
  const pointsForCurrentLevel = (level - 1) * 100;
  const pointsForNextLevel = level * 100;
  const progressPercent = Math.min(100, ((currentPoints - pointsForCurrentLevel) / 100) * 100);

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header with Controls */}
      <LiquidGlassStatsCard style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back! 🙏</Text>
        <Text style={styles.subtitle}>Let's make today count with faith and focus.</Text>
        
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={onBiblePress}>
            <Text style={styles.controlButtonText}>📖</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={onSettingsPress}>
            <Text style={styles.controlButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={onExportPress}>
            <Text style={styles.controlButtonText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Text style={styles.controlButtonText}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </LiquidGlassStatsCard>

      {/* Next Prayer */}
      {nextPrayer && (
        <LiquidGlassStatsCard style={styles.nextPrayerCard}>
          <Text style={styles.nextPrayerLabel}>Next Prayer:</Text>
          <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
          <Text style={styles.nextPrayerTime}>at {formatTime(nextPrayer.time)}</Text>
        </LiquidGlassStatsCard>
      )}

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <LiquidGlassStatsCard style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statNumber}>{currentPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </LiquidGlassStatsCard>
        
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statNumber}>{userStats?.currentStreak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📖</Text>
          <Text style={styles.statNumber}>{userStats?.versesRead || 0}</Text>
          <Text style={styles.statLabel}>Verses Read</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statNumber}>Level {level}</Text>
          <Text style={styles.statLabel}>Current Level</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Daily Progress</Text>
        <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 20,
  },
  nextPrayerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  nextPrayerLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  nextPrayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  nextPrayerTime: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
});

export default Dashboard;
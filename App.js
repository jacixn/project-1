import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import components
import Dashboard from './src/components/Dashboard';
import TodoList from './src/components/TodoList';
import ProgressTracker from './src/components/ProgressTracker';
import Settings from './src/components/Settings';
import PrayerCard from './src/components/PrayerCard';

// Import utilities (EXACT same as web version)
import { calculatePrayerTimes } from './src/utils/solarCalculations';
import { 
  getStoredData, 
  saveData, 
  initializeDefaultData,
  createEncryptedBackup,
  restoreFromBackup,
  getStorageInfo
} from './src/utils/localStorage';

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [location, setLocation] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize user data from storage (EXACT same as web version)
  const [userStats, setUserStats] = useState(null);
  const [todos, setTodos] = useState([]);
  const [prayerHistory, setPrayerHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [verseProgress, setVerseProgress] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Location detection (adapted from web version for mobile)
  const getLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied, using default');
        // Default to NYC if location denied (same as web version)
        const defaultLoc = { 
          latitude: 40.7128, 
          longitude: -74.0060,
          isDefault: true,
          timestamp: new Date().toISOString()
        };
        setLocation(defaultLoc);
        await saveData('location', defaultLoc);
        return;
      }

      // Get current location (same logic as web version)
      let currentLocation = await Location.getCurrentPositionAsync({});
      const loc = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: new Date().toISOString()
      };
      setLocation(loc);
      await saveData('location', loc);
    } catch (error) {
      console.log('Location error, using default:', error);
      // Default to NYC if error (same as web version)
      const defaultLoc = { 
        latitude: 40.7128, 
        longitude: -74.0060,
        isDefault: true,
        timestamp: new Date().toISOString()
      };
      setLocation(defaultLoc);
      await saveData('location', defaultLoc);
    }
  };

  // Initialize app data (EXACT same logic as web version)
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize default data if first time user
        await initializeDefaultData();
        
        // Load stored location or get new one (same as web version)
        const storedLocation = await getStoredData('location');
        if (storedLocation) {
          setLocation(storedLocation);
        } else {
          // Ask for location permission (same as web version behavior)
          await getLocationPermission();
        }
        
        // Load all data into state (EXACT same as web version)
        const loadedUserStats = await getStoredData('userStats');
        const loadedTodos = await getStoredData('todos') || [];
        const loadedPrayerHistory = await getStoredData('prayerHistory') || [];
        const loadedSettings = await getStoredData('settings');
        const loadedVerseProgress = await getStoredData('verseProgress');
        
        setUserStats(loadedUserStats);
        setTodos(loadedTodos);
        setPrayerHistory(loadedPrayerHistory);
        setSettings(loadedSettings);
        setVerseProgress(loadedVerseProgress);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initialize();
  }, []);

  // Update current time every second (EXACT same as web version)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Calculate prayer times when location changes (EXACT same as web version)
  useEffect(() => {
    if (location && isInitialized) {
      const times = calculatePrayerTimes(location.latitude, location.longitude, new Date());
      setPrayerTimes(times);
    }
  }, [location, currentTime, isInitialized]);

  // Save data functions (EXACT same as web version)
  const saveUserStats = useCallback(async (newStats) => {
    setUserStats(newStats);
    await saveData('userStats', newStats);
  }, []);

  const saveTodos = useCallback(async (newTodos) => {
    setTodos(newTodos);
    await saveData('todos', newTodos);
  }, []);

  const savePrayerHistory = useCallback(async (newHistory) => {
    setPrayerHistory(newHistory);
    await saveData('prayerHistory', newHistory);
  }, []);

  const saveSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    await saveData('settings', newSettings);
  }, []);

  // Todo management (EXACT same logic as web version)
  const handleAddTodo = useCallback(async (todo) => {
    const newTodos = [...todos, todo];
    await saveTodos(newTodos);
    
    // Update stats (same as web)
    const newStats = { 
      ...userStats, 
      totalTasks: (userStats?.totalTasks || 0) + 1 
    };
    await saveUserStats(newStats);
  }, [todos, userStats, saveTodos, saveUserStats]);

  const handleCompleteTodo = useCallback(async (todoId) => {
    const todoIndex = todos.findIndex(t => t.id === todoId);
    if (todoIndex === -1) return;
    
    const todo = todos[todoIndex];
    const completedTodo = {
      ...todo,
      completed: true,
      completedAt: new Date().toISOString()
    };
    
    const newTodos = [...todos];
    newTodos[todoIndex] = completedTodo;
    await saveTodos(newTodos);
    
    // Update user stats (EXACT same calculation as web)
    const pointsEarned = todo.points || 0;
    const newTotalPoints = (userStats?.totalPoints || 0) + pointsEarned;
    const newCompletedTasks = (userStats?.completedTasks || 0) + 1;
    
    // Level calculation (100 points per level - same as web)
    const newLevel = Math.floor(newTotalPoints / 100) + 1;
    const leveledUp = newLevel > (userStats?.level || 1);
    
    const newStats = {
      ...userStats,
      totalPoints: newTotalPoints,
      completedTasks: newCompletedTasks,
      level: newLevel,
      currentStreak: (userStats?.currentStreak || 0) + 1
    };
    
    await saveUserStats(newStats);
    
    if (leveledUp) {
      Alert.alert('🎉 Level Up!', `Congratulations! You reached level ${newLevel}!`);
    }
  }, [todos, userStats, saveTodos, saveUserStats]);

  // Prayer completion (EXACT same logic as web version)
  const handlePrayerComplete = useCallback(async (prayerSlot) => {
    const today = new Date().toDateString();
    const existingEntry = prayerHistory.find(p => 
      p.date === today && p.slot === prayerSlot
    );
    
    if (existingEntry) return; // Already completed today
    
    const newEntry = {
      date: today,
      slot: prayerSlot,
      completedAt: new Date().toISOString(),
      points: 15 // Standard prayer points
    };
    
    const newHistory = [...prayerHistory, newEntry];
    await savePrayerHistory(newHistory);
    
    // Update user stats (same as web)
    const pointsEarned = 15;
    const newStats = {
      ...userStats,
      totalPoints: (userStats?.totalPoints || 0) + pointsEarned,
      prayersCompleted: (userStats?.prayersCompleted || 0) + 1
    };
    
    await saveUserStats(newStats);
    
    Alert.alert('🙏 Prayer Completed', `+${pointsEarned} points earned!`);
  }, [prayerHistory, userStats, savePrayerHistory, saveUserStats]);

  // Settings management (same as web)
  const handleSettingsChange = useCallback(async (newSettings) => {
    await saveSettings(newSettings);
  }, [saveSettings]);

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#667eea" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>✝️ Loading Biblely...</Text>
          <Text style={styles.subtitle}>Faith & Focus, Every Day</Text>
          <Text style={styles.locationText}>📍 Getting your location for accurate prayer times...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#667eea" barStyle="light-content" />
      
      {/* Header - same as web version */}
      <View style={styles.header}>
        <Text style={styles.title}>✝️ Biblely</Text>
        <Text style={styles.subtitle}>Faith & Focus, Every Day</Text>
      </View>
      
      {/* Main Content - same structure as web */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Dashboard - same as web version */}
        <Dashboard 
          userStats={userStats}
          prayerTimes={prayerTimes}
          location={location}
          onSettingsPress={() => setShowSettings(true)}
        />
        
        {/* Prayer Card - same as web version with REAL prayer times */}
        {prayerTimes && (
          <PrayerCard 
            prayerTimes={prayerTimes}
            prayerHistory={prayerHistory}
            onPrayerComplete={handlePrayerComplete}
          />
        )}
        
        {/* Todo List - same as web version */}
        <TodoList 
          todos={todos}
          onAdd={handleAddTodo}
          onComplete={handleCompleteTodo}
        />
        
        {/* Progress Tracker - same as web version */}
        <ProgressTracker 
          userStats={userStats}
          todos={todos}
          prayerHistory={prayerHistory}
        />
        
      </ScrollView>
      
      {/* Settings Modal - same as web version */}
      {showSettings && (
        <Settings 
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 20,
    textAlign: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
});
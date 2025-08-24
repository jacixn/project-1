import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import PrayerCard from './components/PrayerCard';
import TodoList from './components/TodoList';
import ProgressTracker from './components/ProgressTracker';
import ErrorBoundary from './components/ErrorBoundary';
import Settings from './components/Settings';
import { calculatePrayerTimes } from './utils/solarCalculations';
import { 
  getStoredData, 
  saveData, 
  initializeDefaultData,
  createEncryptedBackup,
  restoreFromBackup,
  getStorageInfo
} from './utils/localStorage';
import aiService from './utils/aiService';
// import themeManager from './utils/themeManager';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [location, setLocation] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize user data from storage
  const [userStats, setUserStats] = useState(() => getStoredData('userStats'));
  const [todos, setTodos] = useState(() => getStoredData('todos') || []);
  const [prayerHistory, setPrayerHistory] = useState(() => getStoredData('prayerHistory') || []);
  const [settings, setSettings] = useState(() => getStoredData('settings'));
  const [verseProgress, setVerseProgress] = useState(() => getStoredData('verseProgress'));
  const [showSettings, setShowSettings] = useState(false);

  // Initialize app data on mount
  useEffect(() => {
    const initialize = async () => {
      // Initialize default data if first time user
      initializeDefaultData();
      
      // AI service ready for configuration
      // User can call enableAI('your-api-key') from console to activate
      
      // Load stored location or get new one
      const storedLocation = getStoredData('location');
      if (storedLocation) {
        setLocation(storedLocation);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date().toISOString()
            };
            setLocation(loc);
            saveData('location', loc);
          },
          (error) => {
            console.log('Location access denied, using default');
            // Default to NYC if location denied
            const defaultLoc = { 
              latitude: 40.7128, 
              longitude: -74.0060,
              isDefault: true,
              timestamp: new Date().toISOString()
            };
            setLocation(defaultLoc);
            saveData('location', defaultLoc);
          }
        );
      }
      
      // Load all data into state
      setUserStats(getStoredData('userStats'));
      setTodos(getStoredData('todos') || []);
      setPrayerHistory(getStoredData('prayerHistory') || []);
      setSettings(getStoredData('settings'));
      setVerseProgress(getStoredData('verseProgress'));
      
      // Initialize theme
      // const savedSettings = getStoredData('settings');
      // if (savedSettings?.theme) {
      //   themeManager.setTheme(savedSettings.theme);
      // }
      
      setIsInitialized(true);
    };
    
    initialize();
  }, []);

  // Calculate prayer times when location changes
  useEffect(() => {
    if (location && isInitialized) {
      const times = calculatePrayerTimes(location.latitude, location.longitude, new Date());
      setPrayerTimes(times);
    }
  }, [location, currentTime, isInitialized]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-save data changes
  useEffect(() => {
    if (isInitialized && userStats) {
      saveData('userStats', userStats);
    }
  }, [userStats, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveData('todos', todos);
    }
  }, [todos, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveData('prayerHistory', prayerHistory);
    }
  }, [prayerHistory, isInitialized]);

  useEffect(() => {
    if (isInitialized && settings) {
      saveData('settings', settings);
    }
  }, [settings, isInitialized]);

  // Update last activity timestamp
  useEffect(() => {
    if (isInitialized) {
      saveData('lastActivity', new Date().toISOString());
    }
  }, [userStats, todos, prayerHistory, isInitialized]);

  const updateUserStats = useCallback((updates) => {
    setUserStats(prev => {
      const newStats = { ...prev, ...updates };
      
      // Calculate level progression
      const newLevel = Math.floor(newStats.points / 100) + 1;
      if (newLevel > prev.level) {
        newStats.level = newLevel;
        // Show level up notification
        if (window.showLevelUpNotification) {
          window.showLevelUpNotification(newLevel);
        }
      }
      
      return newStats;
    });
  }, []);

  const handlePrayerComplete = useCallback((prayerId, verses = []) => {
    try {
      const completedPrayer = {
        id: prayerId,
        timestamp: new Date().toISOString(),
        verses: verses,
        points: 15
      };
      
      // Update stats
      updateUserStats({
        points: (userStats?.points || 0) + 15,
        versesRead: (userStats?.versesRead || 0) + verses.length,
        totalPrayers: (userStats?.totalPrayers || 0) + 1
      });
      
      // Add to prayer history
      setPrayerHistory(prev => [completedPrayer, ...(prev || [])]);
      
      // Update verse progress
      setVerseProgress(prev => ({
        ...prev,
        readVerses: [...((prev && prev.readVerses) || []), ...verses.map(v => v.id || v.reference)]
      }));
    } catch (error) {
      console.error('Error completing prayer:', error);
      // Show user-friendly error message
      alert('There was an issue recording your prayer. Please try again.');
    }
  }, [userStats, updateUserStats]);

  const handleTodoAdd = useCallback((newTodo) => {
    // TodoList already creates a complete todo object, just add it
    setTodos(prev => [newTodo, ...prev]);
  }, []);

  const handleTodoComplete = useCallback((todoId) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) {
        console.warn('Todo not found:', todoId);
        return;
      }
      
      // Update todo status
      setTodos(prev => prev.map(t => 
        t.id === todoId 
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      ));
      
      // Update stats
      updateUserStats({
        points: (userStats?.points || 0) + (todo.points || 10),
        totalTasks: (userStats?.totalTasks || 0) + 1
      });
    } catch (error) {
      console.error('Error completing todo:', error);
      alert('There was an issue completing your task. Please try again.');
    }
  }, [todos, userStats, updateUserStats]);

  const handleTodoDelete = useCallback((todoId) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
  }, []);

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
    saveData('settings', newSettings);
  }, []);

  // const getFontSizeValue = (size) => {
  //   const sizes = {
  //     'small': '14px',
  //     'medium': '16px',
  //     'large': '18px',
  //     'extra-large': '20px'
  //   };
  //   return sizes[size] || sizes.medium;
  // };

  // Data management functions
  const exportData = () => {
    const backup = createEncryptedBackup();
    if (backup) {
      const blob = new Blob([backup], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fivefold-backup-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const importData = (backupString) => {
    const result = restoreFromBackup(backupString);
    if (result.success) {
      // Reload all data
      setUserStats(getStoredData('userStats'));
      setTodos(getStoredData('todos') || []);
      setPrayerHistory(getStoredData('prayerHistory') || []);
      setSettings(getStoredData('settings'));
      setVerseProgress(getStoredData('verseProgress'));
      
      alert(`Successfully restored ${result.restoredCount} data entries!`);
    } else {
      alert(`Import failed: ${result.error}`);
    }
  };

  // Show loading state while initializing
  if (!isInitialized || !userStats) {
    return (
      <div className="App loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing Fivefold...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <header className="app-header" role="banner">
          <h1>✝️ Fivefold</h1>
          <p>Faith & Focus, Every Day</p>
        
        {/* buttons for backup and stuff */}
        <div className="data-controls" role="toolbar" aria-label="App controls">
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="Settings" aria-label="Open settings">
            ⚙️
          </button>
          <button className="btn-icon" onClick={exportData} title="Export Data" aria-label="Export app data">
            📤
          </button>
          <label className="btn-icon" title="Import Data" aria-label="Import app data">
            📥
            <input 
              type="file" 
              accept=".txt"
              style={{ display: 'none' }}
              aria-label="Select backup file to import"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => importData(e.target.result);
                  reader.readAsText(file);
                }
              }}
            />
          </label>
          <button 
            className="btn-icon" 
            onClick={() => {
              const info = getStorageInfo();
              alert(`Storage Info:\n${info?.estimatedSize || 'Unknown'} used\n${info?.totalEntries || 0} entries\n${info?.totalBackups || 0} backups`);
            }}
            title="Storage Info"
          >
            ℹ️
          </button>
        </div>
      </header>
      
      <main className="app-main" role="main">
        <Dashboard 
          userData={userStats} 
          prayerTimes={prayerTimes} 
          location={location}
          settings={settings}
        />
        
        <div className="content-grid">
          <section className="prayer-section" aria-labelledby="prayers-heading">
            <h2 id="prayers-heading">🕊️ Today's Prayers</h2>
            {prayerTimes && (
              <PrayerCard 
                prayerTimes={prayerTimes} 
                onComplete={handlePrayerComplete}
                completedPrayers={prayerHistory}
                verseProgress={verseProgress}
              />
            )}
          </section>
          
          <section className="todo-section" aria-labelledby="tasks-heading">
            <h2 id="tasks-heading">📝 My Tasks</h2>
            <TodoList 
              todos={todos}
              onComplete={handleTodoComplete}
              onAdd={handleTodoAdd}
              onDelete={handleTodoDelete}
            />
          </section>
          
          <section className="progress-section" aria-labelledby="progress-heading">
            <h2 id="progress-heading">📊 My Progress</h2>
            <ProgressTracker 
              userData={userStats} 
              prayerHistory={prayerHistory}
              todos={todos}
              settings={settings}
            />
          </section>
        </div>
      </main>

      {/* Settings panel with AI setup */}
      {showSettings && (
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}

// putting these on window so settings can use them when i fix it
window.enableAI = (apiKey) => {
  if (aiService.setApiKey(apiKey)) {
    console.log('🤖 AI analysis enabled! New todos will use intelligent scoring.');
    return true;
  } else {
    console.log('❌ Invalid API key');
    return false;
  }
};

window.disableAI = () => {
  aiService.removeApiKey();
  console.log('🔧 AI disabled, using local analysis');
};

window.aiStatus = () => {
  const status = aiService.getStatus();
  console.log('AI Status:', status);
  return status;
};

window.exportData = () => {
  const backup = createEncryptedBackup();
  if (backup) {
    const blob = new Blob([backup], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fivefold-backup-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

window.importData = (backupString) => {
  const result = restoreFromBackup(backupString);
  if (result.success) {
    alert(`Successfully restored ${result.restoredCount} data entries!`);
    window.location.reload(); // Reload to apply all changes
  } else {
    alert(`Import failed: ${result.error}`);
  }
};

export default App;
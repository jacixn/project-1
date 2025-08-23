import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import PrayerCard from './components/PrayerCard';
import TodoList from './components/TodoList';
import ProgressTracker from './components/ProgressTracker';
// import Settings from './components/Settings';
import { calculatePrayerTimes } from './utils/solarCalculations';
import { 
  getStoredData, 
  saveData, 
  initializeDefaultData,
  createEncryptedBackup,
  restoreFromBackup,
  getStorageInfo
} from './utils/localStorage';
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

  const updateUserStats = (updates) => {
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
  };

  const handlePrayerComplete = (prayerId, verses = []) => {
    const completedPrayer = {
      id: prayerId,
      timestamp: new Date().toISOString(),
      verses: verses,
      points: 15
    };
    
    // Update stats
    updateUserStats({
      points: userStats.points + 15,
      versesRead: userStats.versesRead + verses.length,
      totalPrayers: userStats.totalPrayers + 1
    });
    
    // Add to prayer history
    setPrayerHistory(prev => [completedPrayer, ...prev]);
    
    // Update verse progress
    setVerseProgress(prev => ({
      ...prev,
      readVerses: [...(prev.readVerses || []), ...verses.map(v => v.id)]
    }));
  };

  const handleTodoAdd = (newTodo) => {
    const todo = {
      ...newTodo,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      completed: false
    };
    setTodos(prev => [todo, ...prev]);
  };

  const handleTodoComplete = (todoId) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // Update todo status
    setTodos(prev => prev.map(t => 
      t.id === todoId 
        ? { ...t, completed: true, completedAt: new Date().toISOString() }
        : t
    ));
    
    // Update stats
    updateUserStats({
      points: userStats.points + (todo.points || 10),
      totalTasks: userStats.totalTasks + 1
    });
  };

  const handleTodoDelete = (todoId) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
  };

  // const handleSettingsChange = (newSettings) => {
  //   setSettings(newSettings);
  //   saveData('settings', newSettings);
    
  //   // Apply theme if changed
  //   if (newSettings.theme && newSettings.theme !== themeManager.getCurrentTheme()) {
  //     themeManager.setTheme(newSettings.theme);
  //   }
    
  //   // Apply display settings
  //   if (newSettings.display) {
  //     if (newSettings.display.reducedMotion) {
  //       themeManager.enableReducedMotion();
  //     } else {
  //       themeManager.disableReducedMotion();
  //     }
      
  //     // Apply font size
  //     document.documentElement.style.setProperty(
  //       '--base-font-size', 
  //       getFontSizeValue(newSettings.display.fontSize)
  //     );
  //   }
  // };

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
    <div className="App">
      <header className="app-header">
        <h1>✨ Fivefold</h1>
        <p>Faith & Focus, Every Day</p>
        
        {/* App Controls */}
        <div className="data-controls">
          <button className="btn-icon" onClick={() => alert('Settings coming soon!')} title="Settings">
            ⚙️
          </button>
          <button className="btn-icon" onClick={exportData} title="Export Data">
            📤
          </button>
          <label className="btn-icon" title="Import Data">
            📥
            <input 
              type="file" 
              accept=".txt"
              style={{ display: 'none' }}
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
      
      <main className="app-main">
        <Dashboard 
          userData={userStats} 
          prayerTimes={prayerTimes} 
          location={location}
          settings={settings}
        />
        
        <div className="content-grid">
          <section className="prayer-section">
            <h2>🕊️ Today's Prayers</h2>
            {prayerTimes && (
              <PrayerCard 
                prayerTimes={prayerTimes} 
                onComplete={handlePrayerComplete}
                completedPrayers={prayerHistory}
                verseProgress={verseProgress}
              />
            )}
          </section>
          
          <section className="todo-section">
            <h2>📝 My Tasks</h2>
            <TodoList 
              todos={todos}
              onComplete={handleTodoComplete}
              onAdd={handleTodoAdd}
              onDelete={handleTodoDelete}
            />
          </section>
          
          <section className="progress-section">
            <h2>📊 My Progress</h2>
            <ProgressTracker 
              userData={userStats} 
              prayerHistory={prayerHistory}
              todos={todos}
              settings={settings}
            />
          </section>
        </div>
      </main>

      {/* Settings Modal - Coming Soon */}
      {/* {showSettings && (
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )} */}
    </div>
  );
}

// Make export/import functions available globally for settings component
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
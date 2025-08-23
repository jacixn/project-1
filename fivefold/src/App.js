import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import PrayerCard from './components/PrayerCard';
import TodoList from './components/TodoList';
import ProgressTracker from './components/ProgressTracker';
import { calculatePrayerTimes } from './utils/solarCalculations';
import { getStoredData, saveData } from './utils/localStorage';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [location, setLocation] = useState(null);
  const [userData, setUserData] = useState(() => getStoredData('userData') || {
    points: 0,
    streak: 0,
    versesRead: 0,
    level: 1,
    completedPrayers: [],
    todos: [],
    badges: []
  });

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(loc);
          saveData('location', loc);
        },
        (error) => {
          console.log('Location access denied, using default');
          // Default to NYC if location denied
          const defaultLoc = { latitude: 40.7128, longitude: -74.0060 };
          setLocation(defaultLoc);
        }
      );
    }
  }, []);

  // Calculate prayer times when location changes
  useEffect(() => {
    if (location) {
      const times = calculatePrayerTimes(location.latitude, location.longitude, new Date());
      setPrayerTimes(times);
    }
  }, [location, currentTime]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Save user data whenever it changes
  useEffect(() => {
    saveData('userData', userData);
  }, [userData]);

  const handlePrayerComplete = (prayerId) => {
    setUserData(prev => ({
      ...prev,
      points: prev.points + 15,
      completedPrayers: [...prev.completedPrayers, { id: prayerId, date: new Date().toISOString() }],
      versesRead: prev.versesRead + 2
    }));
  };

  const handleTodoComplete = (todo) => {
    setUserData(prev => ({
      ...prev,
      points: prev.points + todo.points,
      todos: prev.todos.map(t => t.id === todo.id ? { ...t, completed: true } : t)
    }));
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>✨ Fivefold</h1>
        <p>Faith & Focus, Every Day</p>
      </header>
      
      <main className="app-main">
        <Dashboard userData={userData} prayerTimes={prayerTimes} />
        
        <div className="content-grid">
          <section className="prayer-section">
            <h2>Today's Prayers</h2>
            {prayerTimes && (
              <PrayerCard 
                prayerTimes={prayerTimes} 
                onComplete={handlePrayerComplete}
                completedPrayers={userData.completedPrayers}
              />
            )}
          </section>
          
          <section className="todo-section">
            <h2>My Tasks</h2>
            <TodoList 
              todos={userData.todos}
              onComplete={handleTodoComplete}
              onAdd={(todo) => setUserData(prev => ({ ...prev, todos: [...prev.todos, todo] }))}
            />
          </section>
          
          <section className="progress-section">
            <h2>My Progress</h2>
            <ProgressTracker userData={userData} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
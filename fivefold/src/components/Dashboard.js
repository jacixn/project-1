import React from 'react';
import { FaPray, FaTrophy, FaFire, FaBible } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = ({ userData, prayerTimes }) => {
  const getNextPrayer = () => {
    if (!prayerTimes) return null;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const prayer of prayerTimes) {
      const prayerMinutes = prayer.time.getHours() * 60 + prayer.time.getMinutes();
      if (prayerMinutes > currentTime) {
        return prayer;
      }
    }
    return prayerTimes[0]; // Next day's first prayer
  };

  const nextPrayer = getNextPrayer();
  const progressPercentage = Math.min(((userData?.points || 0) / 100) * 100, 100);

  return (
    <div className="dashboard">
      <div className="dashboard-card welcome-card">
        <h2>Welcome back! 🙏</h2>
        <p>Let's make today count with faith and focus.</p>
        {nextPrayer && (
          <div className="next-prayer">
            <span>Next Prayer: </span>
            <strong>{nextPrayer.name}</strong> at {nextPrayer.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <FaTrophy className="stat-icon gold" />
          <div className="stat-content">
            <span className="stat-value">{userData?.points || 0}</span>
            <span className="stat-label">Points</span>
          </div>
        </div>

        <div className="stat-card">
          <FaFire className="stat-icon orange" />
          <div className="stat-content">
            <span className="stat-value">{userData?.streak || 0}</span>
            <span className="stat-label">Day Streak</span>
          </div>
        </div>

        <div className="stat-card">
          <FaBible className="stat-icon purple" />
          <div className="stat-content">
            <span className="stat-value">{userData?.versesRead || 0}</span>
            <span className="stat-label">Verses Read</span>
          </div>
        </div>

        <div className="stat-card">
          <FaPray className="stat-icon blue" />
          <div className="stat-content">
            <span className="stat-value">Level {userData?.level || 1}</span>
            <span className="stat-label">Current Level</span>
          </div>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-label">
          <span>Daily Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

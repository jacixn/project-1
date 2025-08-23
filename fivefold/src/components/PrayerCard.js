import React, { useState, useEffect } from 'react';
import { FaClock, FaCheck, FaSun, FaMoon, FaCloudSun } from 'react-icons/fa';
import { getVerses } from '../utils/verseManager';
import './PrayerCard.css';

const PrayerCard = ({ prayerTimes, onComplete, completedPrayers }) => {
  const [currentVerses, setCurrentVerses] = useState([]);
  const [activePrayer, setActivePrayer] = useState(null);

  const getPrayerIcon = (prayerName) => {
    if (prayerName.includes('sunrise')) return <FaSun />;
    if (prayerName.includes('sunset')) return <FaCloudSun />;
    if (prayerName.includes('night') || prayerName.includes('dawn')) return <FaMoon />;
    return <FaSun />;
  };

  const isPrayerCompleted = (prayerId) => {
    const today = new Date().toDateString();
    return (completedPrayers || []).some(p => 
      p.id === prayerId && 
      new Date(p.timestamp || p.date).toDateString() === today
    );
  };

  const handlePrayerClick = (prayer) => {
    if (!isPrayerCompleted(prayer.id)) {
      setActivePrayer(prayer);
      const verses = getVerses(2); // Get 2 verses
      setCurrentVerses(verses);
    }
  };

  const handleCompletePrayer = () => {
    if (activePrayer) {
      onComplete(activePrayer.id);
      setActivePrayer(null);
      setCurrentVerses([]);
    }
  };

  if (!prayerTimes) {
    return <div className="prayer-card loading">Loading prayer times...</div>;
  }

  return (
    <div className="prayer-card">
      {!activePrayer ? (
        <div className="prayer-times-list">
          {prayerTimes.map((prayer) => (
            <div 
              key={prayer.id}
              className={`prayer-time-item ${isPrayerCompleted(prayer.id) ? 'completed' : ''}`}
              onClick={() => handlePrayerClick(prayer)}
            >
              <div className="prayer-icon">
                {getPrayerIcon(prayer.name)}
              </div>
              <div className="prayer-info">
                <h3>{prayer.name}</h3>
                <span className="prayer-time">
                  <FaClock /> {prayer.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {isPrayerCompleted(prayer.id) && (
                <div className="prayer-status">
                  <FaCheck /> Completed
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="prayer-active">
          <h3>{activePrayer.name}</h3>
          <div className="verses-container">
            {currentVerses.map((verse, index) => (
              <div key={index} className="verse-card">
                <p className="verse-text">{verse.text}</p>
                <span className="verse-reference">{verse.reference}</span>
              </div>
            ))}
          </div>
          <button className="complete-prayer-btn" onClick={handleCompletePrayer}>
            Complete Prayer ✓
          </button>
          <button className="cancel-btn" onClick={() => setActivePrayer(null)}>
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default PrayerCard;

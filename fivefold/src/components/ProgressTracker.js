import React, { memo } from 'react';
import { FaTrophy, FaMedal, FaAward, FaStar } from 'react-icons/fa';
import './ProgressTracker.css';

const ProgressTracker = ({ userData }) => {
  const userBadges = userData?.badges || [];
  const badges = [
    { id: 'faithful_week', name: 'Faithful Week', icon: <FaTrophy />, description: 'Complete all 5 prayers for 7 days', earned: userBadges.includes('faithful_week') },
    { id: 'early_bird', name: 'Early Bird', icon: <FaStar />, description: 'Complete pre-dawn prayer 5 days', earned: userBadges.includes('early_bird') },
    { id: 'task_master', name: 'Task Master', icon: <FaMedal />, description: 'Complete 20 tasks in a week', earned: userBadges.includes('task_master') },
    { id: 'verse_reader', name: 'Verse Reader', icon: <FaAward />, description: 'Read 100 verses', earned: (userData?.versesRead || 0) >= 100 }
  ];

  const levelThresholds = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];
  const currentLevel = userData.level || 1;
  const currentPoints = userData.points || 0;
  const nextLevelPoints = levelThresholds[currentLevel] || 5000;
  const currentLevelPoints = levelThresholds[currentLevel - 1] || 0;
  const levelProgress = ((currentPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;

  return (
    <div className="progress-tracker">
      <div className="level-section">
        <h3>Level {currentLevel}</h3>
        <div className="level-progress-bar">
          <div className="level-progress-fill" style={{ width: `${levelProgress}%` }} />
        </div>
        <p className="level-points">{currentPoints} / {nextLevelPoints} points</p>
      </div>

      <div className="badges-section">
        <h3>Badges</h3>
        <div className="badges-grid">
          {badges.map(badge => (
            <div key={badge.id} className={`badge ${badge.earned ? 'earned' : 'locked'}`}>
              <div className="badge-icon">
                {badge.icon}
              </div>
              <span className="badge-name">{badge.name}</span>
              <span className="badge-description">{badge.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="weekly-stats">
        <h3>This Week</h3>
        <div className="weekly-stats-grid">
          <div className="weekly-stat">
            <span className="weekly-value">{userData?.streak || 0}</span>
            <span className="weekly-label">Day Streak</span>
          </div>
          <div className="weekly-stat">
            <span className="weekly-value">{userData?.versesRead || 0}</span>
            <span className="weekly-label">Verses Read</span>
          </div>
          <div className="weekly-stat">
            <span className="weekly-value">{userData?.completedPrayers?.length || 0}</span>
            <span className="weekly-label">Prayers Done</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ProgressTracker);

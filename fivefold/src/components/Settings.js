import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = ({ settings, onSettingsChange, onClose }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleNestedSettingChange = (section, key, value) => {
    const newSettings = {
      ...localSettings,
      [section]: {
        ...localSettings[section],
        [key]: value
      }
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const saveSettings = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
    
    // Show success notification
    showNotification('Settings saved successfully! ✅', 'success');
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        theme: 'default',
        notifications: {
          enabled: true,
          sound: true,
          prayer: true,
          tasks: true,
          vibrate: true
        },
        prayer: {
          reminderOffset: 5,
          autoMarkComplete: false,
          showVerses: true,
          versesPerPrayer: 2
        },
        tasks: {
          aiScoring: true,
          showDifficulty: true,
          autoSort: true,
          completionAnimation: true
        },
        display: {
          animations: true,
          reducedMotion: false,
          fontSize: 'medium',
          compactMode: false
        },
        privacy: {
          analytics: false,
          crashReports: true,
          dataCollection: false
        },
        backup: {
          autoBackup: true,
          backupFrequency: 'daily',
          encryptBackups: true
        }
      };
      
      setLocalSettings(defaultSettings);
      setHasChanges(true);
    }
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#667eea'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  const tabs = [
    { id: 'general', name: '⚙️ General', icon: '⚙️' },
    { id: 'prayer', name: '🕊️ Prayer', icon: '🕊️' },
    { id: 'tasks', name: '📝 Tasks', icon: '📝' },
    { id: 'notifications', name: '🔔 Notifications', icon: '🔔' },
    { id: 'display', name: '🎨 Display', icon: '🎨' },
    { id: 'privacy', name: '🔒 Privacy', icon: '🔒' },
    { id: 'backup', name: '💾 Backup', icon: '💾' }
  ];

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>🌟 General Settings</h3>
      
      <div className="setting-group">
        <label className="setting-label">
          <span>Theme</span>
          <select 
            value={localSettings.theme || 'default'}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
            className="setting-select"
          >
            <option value="default">🌅 Default Purple</option>
            <option value="dark">🌙 Dark Mode</option>
            <option value="light">☀️ Light Mode</option>
            <option value="ocean">🌊 Ocean Blue</option>
            <option value="forest">🌲 Forest Green</option>
            <option value="sunset">🌅 Sunset Orange</option>
          </select>
        </label>
        
        <div className="setting-description">
          Choose your preferred visual theme for the app
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">
          <span>Language</span>
          <select 
            value={localSettings.language || 'en'}
            onChange={(e) => handleSettingChange('language', e.target.value)}
            className="setting-select"
          >
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇸 Español</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="ar">🇸🇦 العربية</option>
            <option value="ur">🇵🇰 اردو</option>
          </select>
        </label>
        
        <div className="setting-description">
          Select your preferred language for the interface
        </div>
      </div>
    </div>
  );

  const renderPrayerSettings = () => (
    <div className="settings-section">
      <h3>🕊️ Prayer Settings</h3>
      
      <div className="setting-group">
        <label className="setting-label">
          <span>Reminder Offset (minutes before prayer time)</span>
          <input
            type="number"
            min="0"
            max="60"
            value={localSettings.prayer?.reminderOffset || 5}
            onChange={(e) => handleNestedSettingChange('prayer', 'reminderOffset', parseInt(e.target.value))}
            className="setting-input"
          />
        </label>
        
        <div className="setting-description">
          Get reminded this many minutes before each prayer time
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.prayer?.autoMarkComplete || false}
            onChange={(e) => handleNestedSettingChange('prayer', 'autoMarkComplete', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Auto-mark prayers as complete</span>
        </label>
        
        <div className="setting-description">
          Automatically mark prayers as complete when the time passes
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.prayer?.showVerses !== false}
            onChange={(e) => handleNestedSettingChange('prayer', 'showVerses', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Show Bible verses with prayers</span>
        </label>
        
        <div className="setting-description">
          Display relevant Bible verses during prayer times
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">
          <span>Verses per prayer</span>
          <select 
            value={localSettings.prayer?.versesPerPrayer || 2}
            onChange={(e) => handleNestedSettingChange('prayer', 'versesPerPrayer', parseInt(e.target.value))}
            className="setting-select"
          >
            <option value={1}>1 verse</option>
            <option value={2}>2 verses</option>
            <option value={3}>3 verses</option>
            <option value={5}>5 verses</option>
          </select>
        </label>
        
        <div className="setting-description">
          Number of Bible verses to show with each prayer
        </div>
      </div>
    </div>
  );

  const renderTaskSettings = () => (
    <div className="settings-section">
      <h3>📝 Task Settings</h3>
      
      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.tasks?.aiScoring !== false}
            onChange={(e) => handleNestedSettingChange('tasks', 'aiScoring', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>AI difficulty scoring</span>
        </label>
        
        <div className="setting-description">
          Use AI to automatically score task difficulty and assign points
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.tasks?.showDifficulty !== false}
            onChange={(e) => handleNestedSettingChange('tasks', 'showDifficulty', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Show difficulty labels</span>
        </label>
        
        <div className="setting-description">
          Display difficulty badges (Tiny, Small, Medium, Big, Epic) on tasks
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.tasks?.autoSort !== false}
            onChange={(e) => handleNestedSettingChange('tasks', 'autoSort', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Auto-sort by priority</span>
        </label>
        
        <div className="setting-description">
          Automatically sort tasks by difficulty and deadline
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.tasks?.completionAnimation !== false}
            onChange={(e) => handleNestedSettingChange('tasks', 'completionAnimation', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Completion animations</span>
        </label>
        
        <div className="setting-description">
          Show celebratory animations when completing tasks
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>🔔 Notification Settings</h3>
      
      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.notifications?.enabled !== false}
            onChange={(e) => handleNestedSettingChange('notifications', 'enabled', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Enable notifications</span>
        </label>
        
        <div className="setting-description">
          Allow the app to send you notifications
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.notifications?.prayer !== false}
            onChange={(e) => handleNestedSettingChange('notifications', 'prayer', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Prayer reminders</span>
        </label>
        
        <div className="setting-description">
          Get notified when it's time for prayer
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.notifications?.tasks !== false}
            onChange={(e) => handleNestedSettingChange('notifications', 'tasks', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Task reminders</span>
        </label>
        
        <div className="setting-description">
          Get notified about pending tasks and deadlines
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.notifications?.sound !== false}
            onChange={(e) => handleNestedSettingChange('notifications', 'sound', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Notification sounds</span>
        </label>
        
        <div className="setting-description">
          Play sounds with notifications
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.notifications?.vibrate !== false}
            onChange={(e) => handleNestedSettingChange('notifications', 'vibrate', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Vibration</span>
        </label>
        
        <div className="setting-description">
          Vibrate device for notifications (mobile only)
        </div>
      </div>
    </div>
  );

  const renderDisplaySettings = () => (
    <div className="settings-section">
      <h3>🎨 Display Settings</h3>
      
      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.display?.animations !== false}
            onChange={(e) => handleNestedSettingChange('display', 'animations', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Enable animations</span>
        </label>
        
        <div className="setting-description">
          Show smooth animations and transitions throughout the app
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.display?.reducedMotion || false}
            onChange={(e) => handleNestedSettingChange('display', 'reducedMotion', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Reduced motion</span>
        </label>
        
        <div className="setting-description">
          Minimize animations for accessibility or motion sensitivity
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">
          <span>Font size</span>
          <select 
            value={localSettings.display?.fontSize || 'medium'}
            onChange={(e) => handleNestedSettingChange('display', 'fontSize', e.target.value)}
            className="setting-select"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra Large</option>
          </select>
        </label>
        
        <div className="setting-description">
          Adjust the size of text throughout the app
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.display?.compactMode || false}
            onChange={(e) => handleNestedSettingChange('display', 'compactMode', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Compact mode</span>
        </label>
        
        <div className="setting-description">
          Use a more compact layout to fit more content on screen
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="settings-section">
      <h3>🔒 Privacy Settings</h3>
      
      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.privacy?.analytics || false}
            onChange={(e) => handleNestedSettingChange('privacy', 'analytics', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Anonymous analytics</span>
        </label>
        
        <div className="setting-description">
          Help improve the app by sharing anonymous usage data
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.privacy?.crashReports !== false}
            onChange={(e) => handleNestedSettingChange('privacy', 'crashReports', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Crash reports</span>
        </label>
        
        <div className="setting-description">
          Automatically send crash reports to help fix bugs
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.privacy?.dataCollection || false}
            onChange={(e) => handleNestedSettingChange('privacy', 'dataCollection', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Data collection</span>
        </label>
        
        <div className="setting-description">
          Allow collection of usage patterns to improve features
        </div>
      </div>

      <div className="privacy-info">
        <h4>🛡️ Your Privacy Matters</h4>
        <p>All your personal data (prayers, tasks, progress) is stored locally on your device. 
           We never send your personal information to external servers.</p>
      </div>
    </div>
  );

  const renderBackupSettings = () => (
    <div className="settings-section">
      <h3>💾 Backup Settings</h3>
      
      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.backup?.autoBackup !== false}
            onChange={(e) => handleNestedSettingChange('backup', 'autoBackup', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Automatic backups</span>
        </label>
        
        <div className="setting-description">
          Automatically create backups of your data
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">
          <span>Backup frequency</span>
          <select 
            value={localSettings.backup?.backupFrequency || 'daily'}
            onChange={(e) => handleNestedSettingChange('backup', 'backupFrequency', e.target.value)}
            className="setting-select"
          >
            <option value="hourly">Every hour</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual only</option>
          </select>
        </label>
        
        <div className="setting-description">
          How often to automatically create backups
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={localSettings.backup?.encryptBackups !== false}
            onChange={(e) => handleNestedSettingChange('backup', 'encryptBackups', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Encrypt backups</span>
        </label>
        
        <div className="setting-description">
          Encrypt backup files for additional security
        </div>
      </div>

      <div className="backup-actions">
        <button className="btn-secondary" onClick={() => window.exportData?.()}>
          📤 Export Backup
        </button>
        <button className="btn-secondary" onClick={() => document.getElementById('backup-import').click()}>
          📥 Import Backup
        </button>
        <input 
          id="backup-import" 
          type="file" 
          accept=".txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => window.importData?.(e.target.result);
              reader.readAsText(file);
            }
          }}
        />
      </div>
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'prayer': return renderPrayerSettings();
      case 'tasks': return renderTaskSettings();
      case 'notifications': return renderNotificationSettings();
      case 'display': return renderDisplaySettings();
      case 'privacy': return renderPrivacySettings();
      case 'backup': return renderBackupSettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="settings-overlay" onClick={(e) => e.target.className === 'settings-overlay' && onClose()}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <div className="settings-sidebar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-name">{tab.name.replace(/^.+ /, '')}</span>
              </button>
            ))}
          </div>

          <div className="settings-main">
            {renderCurrentTab()}
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={resetSettings}>
            🔄 Reset to Defaults
          </button>
          
          <div className="footer-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className={`btn-primary ${hasChanges ? 'pulse' : ''}`}
              onClick={saveSettings}
              disabled={!hasChanges}
            >
              💾 Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

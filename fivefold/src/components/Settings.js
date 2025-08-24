import React, { useState, useEffect } from 'react';
import { FaTimes, FaRobot, FaCheck } from 'react-icons/fa';
import aiService from '../utils/aiService';
import './Settings.css';

const Settings = ({ settings, onSettingsChange, onClose }) => {
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    // check if AI is currently enabled
    const status = aiService.getStatus();
    setIsAiEnabled(status.hasApiKey);
  }, []);

  const handleAiToggle = async () => {
    setIsToggling(true);
    
    try {
      if (!isAiEnabled) {
        // turning AI on - ask for API key once
        const apiKey = prompt(
          "To enable AI scoring, please paste your Groq API key:\n\n" +
          "Get one free at: console.groq.com/keys\n" +
          "(This will be saved securely on your device)"
        );
        
        if (apiKey && apiKey.trim()) {
          const success = aiService.setApiKey(apiKey.trim());
          if (success) {
            try {
              // test the key quickly
              await aiService.analyzeTask('test task');
              setIsAiEnabled(true);
              alert('✅ AI enabled! Your tasks will now get smart scoring.');
            } catch (error) {
              aiService.removeApiKey();
              alert('❌ API key test failed. Please check your key and try again.');
            }
          } else {
            alert('❌ Invalid API key format.');
          }
        }
      } else {
        // turning AI off
        if (window.confirm('Turn off AI scoring? You can turn it back on anytime.')) {
          aiService.removeApiKey();
          setIsAiEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error toggling AI:', error);
      alert('Something went wrong. Please try again.');
    }
    
    setIsToggling(false);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="settings-content">
          {/* AI Toggle Section */}
          <div className="settings-section">
            <h3>🤖 Smart Task Scoring</h3>
            <p className="section-description">
              Turn on AI to get super smart task difficulty scoring that actually understands what you're asking it to do!
            </p>

            <div className="ai-toggle-container">
              <div className="ai-status-display">
                {isAiEnabled ? (
                  <div className="ai-status enabled">
                    <FaCheck /> AI Smart Scoring: ON
                  </div>
                ) : (
                  <div className="ai-status disabled">
                    <FaRobot /> AI Smart Scoring: OFF
                  </div>
                )}
              </div>

              <div className="toggle-switch-container">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isAiEnabled}
                    onChange={handleAiToggle}
                    disabled={isToggling}
                  />
                  <span className="toggle-slider">
                    {isToggling ? '...' : (isAiEnabled ? 'ON' : 'OFF')}
                  </span>
                </label>
              </div>
            </div>

            <div className="ai-explanation">
              {isAiEnabled ? (
                <p className="ai-on-message">
                  ✨ Perfect! Your tasks will now get intelligent scoring with detailed reasons.
                </p>
              ) : (
                <p className="ai-off-message">
                  📝 Using simple local scoring. Turn on AI for much smarter analysis! First time setup requires a free API key from console.groq.com/keys
                </p>
              )}
            </div>
          </div>

          {/* App Info Section */}
          <div className="settings-section">
            <h3>📱 About Fivefold</h3>
            <div className="app-info">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Purpose:</strong> Blend daily prayer with productivity</p>
              <p><strong>Privacy:</strong> All data stays on your device</p>
              <p><strong>Storage:</strong> {typeof localStorage !== 'undefined' ? localStorage.length : 0} items stored locally</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
import React, { useState, useEffect } from 'react';
import { FaTimes, FaRobot, FaKey, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import aiService from '../utils/aiService';
import './Settings.css';

const Settings = ({ settings, onSettingsChange, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [aiStatus, setAiStatus] = useState('checking');
  const [testResult, setTestResult] = useState('');
  const [isTestingAI, setIsTestingAI] = useState(false);

  useEffect(() => {
    // check current AI status when settings open
    const status = aiService.getStatus();
    if (status.hasApiKey) {
      setApiKey('*'.repeat(20)); // hide the actual key
      setAiStatus('enabled');
    } else {
      setAiStatus('disabled');
    }
  }, []);

  const handleApiKeySubmit = async () => {
    if (!apiKey || apiKey.startsWith('*')) {
      alert('Please enter a valid API key');
      return;
    }

    setIsTestingAI(true);
    setTestResult('Testing AI connection...');

    try {
      // test the AI with a simple task
      const success = aiService.setApiKey(apiKey);
      if (success) {
        // try a quick test to make sure it actually works
        await aiService.analyzeTask('make coffee');
        setAiStatus('enabled');
        setTestResult('✅ AI is working perfectly! Your tasks will now get smart scoring.');
        setApiKey('*'.repeat(20)); // hide the key after successful setup
      } else {
        setAiStatus('error');
        setTestResult('❌ Invalid API key format');
      }
    } catch (error) {
      setAiStatus('error');
      setTestResult(`❌ AI test failed: ${error.message}`);
    }
    
    setIsTestingAI(false);
  };

  const handleDisableAI = () => {
    aiService.removeApiKey();
    setApiKey('');
    setAiStatus('disabled');
    setTestResult('AI disabled. Tasks will use simple local scoring.');
  };

  const getAiStatusDisplay = () => {
    switch (aiStatus) {
      case 'enabled':
        return { icon: <FaCheck />, text: 'AI Smart Scoring: ON', color: '#4CAF50' };
      case 'disabled':
        return { icon: <FaRobot />, text: 'AI Smart Scoring: OFF', color: '#888' };
      case 'error':
        return { icon: <FaExclamationTriangle />, text: 'AI Error', color: '#f44336' };
      default:
        return { icon: <FaRobot />, text: 'Checking...', color: '#888' };
    }
  };

  const statusDisplay = getAiStatusDisplay();

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
          {/* AI Configuration Section */}
          <div className="settings-section">
            <h3>🤖 Smart Task Scoring</h3>
            <p className="section-description">
              Enable AI to intelligently analyze your tasks and give them accurate difficulty scores.
              This makes your points more fair and interesting!
            </p>

            <div className="ai-status" style={{ color: statusDisplay.color }}>
              {statusDisplay.icon}
              <span>{statusDisplay.text}</span>
            </div>

            {aiStatus !== 'enabled' && (
              <div className="api-key-setup">
                <label htmlFor="api-key">
                  <FaKey /> Groq API Key:
                </label>
                <div className="api-key-input-group">
                  <input
                    id="api-key"
                    type="password"
                    placeholder="Enter your Groq API key here..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                  />
                  <button 
                    onClick={handleApiKeySubmit} 
                    disabled={isTestingAI || !apiKey}
                    className="test-ai-btn"
                  >
                    {isTestingAI ? 'Testing...' : 'Connect'}
                  </button>
                </div>
                
                <div className="api-key-help">
                  <p>
                    <strong>Need an API key?</strong> Get one free at{' '}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                      console.groq.com/keys
                    </a>
                  </p>
                  <p>• Create account → Generate API key → Paste it above</p>
                  <p>• Free tier gives you plenty of task scoring!</p>
                </div>
              </div>
            )}

            {aiStatus === 'enabled' && (
              <div className="ai-enabled-controls">
                <p className="ai-success">
                  🎉 AI is active! Your new tasks will get intelligent scoring with reasons.
                </p>
                <button onClick={handleDisableAI} className="disable-ai-btn">
                  Turn Off AI
                </button>
              </div>
            )}

            {testResult && (
              <div className={`test-result ${aiStatus === 'enabled' ? 'success' : 'error'}`}>
                {testResult}
              </div>
            )}
          </div>

          {/* App Info Section */}
          <div className="settings-section">
            <h3>📱 About Fivefold</h3>
            <div className="app-info">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Purpose:</strong> Blend daily prayer with productivity</p>
              <p><strong>Privacy:</strong> All data stays on your device</p>
              <p><strong>Storage:</strong> {localStorage.length} items stored locally</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="settings-section">
            <h3>🔧 Quick Actions</h3>
            <div className="quick-actions">
              <button 
                onClick={() => {
                  const info = aiService.getStatus();
                  alert(`AI Status: ${info.isAvailable ? 'Available' : 'Not available'}\nRequests made: ${info.requestCount}\nWorking model: ${info.workingModel || 'None'}`);
                }}
                className="info-btn"
              >
                AI Status Info
              </button>
              
              <button 
                onClick={() => {
                  if (window.confirm('This will reload the app. Continue?')) {
                    window.location.reload();
                  }
                }}
                className="reload-btn"
              >
                Refresh App
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
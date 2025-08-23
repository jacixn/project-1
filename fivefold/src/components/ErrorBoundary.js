import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report error to monitoring service (future enhancement)
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // In production, send to error monitoring service
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('fivefold_userId') || 'anonymous'
    };

    // Store locally for now (could send to server in production)
    try {
      const existingErrors = JSON.parse(localStorage.getItem('fivefold_errorReports') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 error reports
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('fivefold_errorReports', JSON.stringify(recentErrors));
    } catch (e) {
      console.error('Failed to store error report:', e);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  clearData = () => {
    if (window.confirm('This will clear all your app data. Are you sure?')) {
      // Clear all Fivefold data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('fivefold_')) {
          localStorage.removeItem(key);
        }
      });
      
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            
            <h2>Oops! Something went wrong</h2>
            
            <p className="error-message">
              We're sorry, but something unexpected happened. 
              Don't worry - your data is safe!
            </p>

            <div className="error-actions">
              <button onClick={this.handleReset} className="btn-primary">
                Try Again
              </button>
              
              <button onClick={this.handleReload} className="btn-secondary">
                Reload Page
              </button>
              
              <button onClick={this.clearData} className="btn-danger">
                Reset App Data
              </button>
            </div>

            <details className="error-details">
              <summary>Technical Details (for developers)</summary>
              
              <div className="error-info">
                <p><strong>Error ID:</strong> {this.state.errorId}</p>
                <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
                
                {this.state.error && (
                  <div className="error-section">
                    <h4>Error:</h4>
                    <pre className="error-text">
                      {this.state.error.name}: {this.state.error.message}
                    </pre>
                  </div>
                )}

                {isDevelopment && this.state.error?.stack && (
                  <div className="error-section">
                    <h4>Stack Trace:</h4>
                    <pre className="error-text">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}

                {isDevelopment && this.state.errorInfo?.componentStack && (
                  <div className="error-section">
                    <h4>Component Stack:</h4>
                    <pre className="error-text">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>

            <div className="error-help">
              <p>If this problem persists:</p>
              <ul>
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Check your internet connection</li>
                <li>Update your browser to the latest version</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

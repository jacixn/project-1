/**
 * Centralized Error Handling Utility
 * 
 * This utility provides consistent error handling across the app
 * and suppresses non-critical errors from showing in the console
 */

class ErrorHandler {
  constructor() {
    this.logErrors = __DEV__; // Only log in development
    this.criticalErrors = [];
  }

  /**
   * Log a silent error (won't show in console, but tracked)
   * Use for expected errors like network failures when offline
   */
  silent(context, error) {
    // Don't log to console - these are expected
    if (this.logErrors) {
      console.log(`ℹ️ ${context}: ${error?.message || error}`);
    }
  }

  /**
   * Log an info message (not an error, just informational)
   */
  info(context, message) {
    if (this.logErrors) {
      console.log(`ℹ️ ${context}: ${message}`);
    }
  }

  /**
   * Log a warning (something unexpected but not critical)
   */
  warn(context, message) {
    if (this.logErrors) {
      console.warn(`⚠️ ${context}: ${message}`);
    }
  }

  /**
   * Log a critical error (these should be fixed)
   */
  critical(context, error) {
    console.error(`🚨 CRITICAL - ${context}:`, error);
    this.criticalErrors.push({
      context,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get all critical errors
   */
  getCriticalErrors() {
    return this.criticalErrors;
  }

  /**
   * Clear critical errors
   */
  clearCriticalErrors() {
    this.criticalErrors = [];
  }

  /**
   * Safe async wrapper that handles errors gracefully
   */
  async safely(fn, fallback = null, context = 'Unknown') {
    try {
      return await fn();
    } catch (error) {
      this.silent(context, error);
      return fallback;
    }
  }

  /**
   * Network error handler (common for GitHub fetches)
   */
  networkError(context, error) {
    // Network errors are expected when offline - don't show as errors
    this.info(context, 'Using cached data (network unavailable)');
  }

  /**
   * Validation error (user input issues)
   */
  validation(context, message) {
    this.warn(context, message);
  }
}

// Export singleton instance
const errorHandler = new ErrorHandler();
export default errorHandler;


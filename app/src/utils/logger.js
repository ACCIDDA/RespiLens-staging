/**
 * Centralized logging utility for RespiLens application
 * Provides consistent error/warning handling and can be configured
 * for different environments (development vs production)
 */

const isDevelopment = import.meta.env.MODE === 'development';

class Logger {
  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error|Object} [error] - Optional error object or additional context
   */
  error(message, error) {
    console.error(`[RespiLens Error] ${message}`, error || '');

    // In production, you might want to send errors to a monitoring service
    // e.g., Sentry, LogRocket, etc.
    if (!isDevelopment && window.errorTracker) {
      window.errorTracker.captureException(error, { message });
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   * @param {Object} [context] - Optional context object
   */
  warn(message, context) {
    if (isDevelopment) {
      console.warn(`[RespiLens Warning] ${message}`, context || '');
    }
  }

  /**
   * Log an info message (development only)
   * @param {string} message - Info message
   * @param {Object} [data] - Optional data object
   */
  info(message, data) {
    if (isDevelopment) {
      console.info(`[RespiLens Info] ${message}`, data || '');
    }
  }

  /**
   * Log a debug message (development only)
   * @param {string} message - Debug message
   * @param {Object} [data] - Optional data object
   */
  debug(message, data) {
    if (isDevelopment) {
      console.log(`[RespiLens Debug] ${message}`, data || '');
    }
  }

  /**
   * Group related log messages (development only)
   * @param {string} label - Group label
   * @param {Function} callback - Function containing grouped logs
   */
  group(label, callback) {
    if (isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;

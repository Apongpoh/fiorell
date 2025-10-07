/**
 * Production Logger Utility
 * Provides structured logging for different environments
 */

interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  eventType?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level,
      message,
      environment: process.env.NODE_ENV,
      ...context,
    };

    return JSON.stringify(baseLog);
  }

  /**
   * Log error messages - always logged in production
   */
  error(message: string, context?: LogContext): void {
    const formatted = this.formatMessage(LogLevel.ERROR, message, context);
    console.error(formatted);
  }

  /**
   * Log warning messages - logged in production
   */
  warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage(LogLevel.WARN, message, context);
    console.warn(formatted);
  }

  /**
   * Log info messages - important business events, logged in production
   */
  info(message: string, context?: LogContext): void {
    const formatted = this.formatMessage(LogLevel.INFO, message, context);
    console.info(formatted);
  }

  /**
   * Log debug messages - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message, context);
      console.log(formatted);
    }
  }

  /**
   * Development-only logging for email verification
   */
  devEmail(
    email: string,
    verificationUrl: string,
    verificationCode: string
  ): void {
    if (this.isDevelopment) {
      console.log("\n=== EMAIL VERIFICATION (Development Mode) ===");
      console.log(`To: ${email}`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log(`Verification Code: ${verificationCode}`);
      console.log("=== Copy the verification URL above to verify email ===\n");
    }
  }

  /**
   * Business event logging - important events that should be tracked
   */
  business(event: string, context: LogContext): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      eventType: "business",
    });
  }

  /**
   * Security event logging - authentication, authorization events
   */
  security(event: string, context: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      eventType: "security",
    });
  }

  /**
   * Payment event logging - subscription and payment events
   */
  payment(event: string, context: LogContext): void {
    this.info(`Payment Event: ${event}`, {
      ...context,
      eventType: "payment",
    });
  }

  /**
   * Performance monitoring
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} completed in ${duration}ms`, {
      ...context,
      duration,
      eventType: "performance",
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export context helper
export const createLogContext = (partial: Partial<LogContext>): LogContext => ({
  requestId: partial.requestId || generateRequestId(),
  ...partial,
});

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export for convenience
export default logger;

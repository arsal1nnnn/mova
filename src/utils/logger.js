/**
 * Mova Production-Minded Application Logger
 *
 * Provides safe, structured logging across web and mobile platforms.
 * - Suppresses debug and info messages in production.
 * - Automatically redacts potential sensitive tokens and auth codes.
 * - Prefixes messages with [Mova] for consistent diagnostic filtering.
 */

const isDev =
  typeof __DEV__ !== 'undefined'
    ? Boolean(__DEV__)
    : process.env.NODE_ENV !== 'production';

// Sensitive credential patterns to redact from log messages
const SENSITIVE_PATTERN =
  /(?:access_token|refresh_token|token|code|password|secret|authorization)=?([^&\s]*)/gi;

function sanitize(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(SENSITIVE_PATTERN, (match, val) => {
    if (!val || val.length <= 4) return match;
    return match.replace(val, '[REDACTED]');
  });
}

function formatArgs(args) {
  return args.map((arg) => {
    if (typeof arg === 'string') {
      return sanitize(arg);
    }
    if (arg instanceof Error) {
      // Create a shallow copy with sanitized message to avoid mutating the original error
      const sanitizedError = new Error(sanitize(arg.message));
      sanitizedError.stack = arg.stack;
      return sanitizedError;
    }
    return arg;
  });
}

export const logger = {
  debug(...args) {
    if (isDev) {
      console.debug('[Mova]', ...formatArgs(args));
    }
  },

  info(...args) {
    if (isDev) {
      console.info('[Mova]', ...formatArgs(args));
    }
  },

  warn(...args) {
    console.warn('[Mova]', ...formatArgs(args));
  },

  error(...args) {
    console.error('[Mova]', ...formatArgs(args));
  },
};

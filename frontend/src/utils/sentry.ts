/**
 * Sentry Error Tracking for Frontend
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/react
 * 2. Set VITE_SENTRY_DSN environment variable
 * 3. Uncomment the Sentry initialization code below
 */

// import * as Sentry from '@sentry/react';

export const initSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.log('⚠️  Sentry DSN not configured. Error tracking disabled.');
    console.log('   To enable: Set VITE_SENTRY_DSN environment variable');
    return;
  }

  // Uncomment when @sentry/react is installed:
  /*
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay()
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  console.log('✅ Sentry error tracking initialized');
  */
};

export const captureException = (error: Error, context?: any) => {
  // Uncomment when @sentry/react is installed:
  /*
  Sentry.captureException(error, {
    extra: context
  });
  */
  
  // Fallback: log to console
  console.error('Error captured:', error.message, context);
};


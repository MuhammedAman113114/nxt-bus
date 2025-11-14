/**
 * Sentry Error Tracking Integration
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/node @sentry/profiling-node
 * 2. Set SENTRY_DSN environment variable
 * 3. Uncomment the Sentry initialization code below
 */

// import * as Sentry from '@sentry/node';
// import { ProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = (app: any) => {
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.log('⚠️  Sentry DSN not configured. Error tracking disabled.');
    console.log('   To enable: Set SENTRY_DSN environment variable');
    return;
  }

  // Uncomment when @sentry/node is installed:
  /*
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Enable Profiling
      new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  console.log('✅ Sentry error tracking initialized');
  */
};

export const captureException = (error: Error, context?: any) => {
  // Uncomment when @sentry/node is installed:
  /*
  Sentry.captureException(error, {
    extra: context
  });
  */
  
  // Fallback: log to console
  console.error('Error captured:', error.message, context);
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  // Uncomment when @sentry/node is installed:
  /*
  Sentry.captureMessage(message, level);
  */
  
  // Fallback: log to console
  console.log(`[${level.toUpperCase()}] ${message}`);
};

// Export Sentry handlers for Express
export const sentryRequestHandler = () => {
  // Uncomment when @sentry/node is installed:
  // return Sentry.Handlers.requestHandler();
  
  // Fallback: no-op middleware
  return (req: any, res: any, next: any) => next();
};

export const sentryTracingHandler = () => {
  // Uncomment when @sentry/node is installed:
  // return Sentry.Handlers.tracingHandler();
  
  // Fallback: no-op middleware
  return (req: any, res: any, next: any) => next();
};

export const sentryErrorHandler = () => {
  // Uncomment when @sentry/node is installed:
  // return Sentry.Handlers.errorHandler();
  
  // Fallback: no-op middleware
  return (err: any, req: any, res: any, next: any) => next(err);
};


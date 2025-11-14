# Sentry Error Tracking Setup

This project is configured to use Sentry for error tracking and monitoring. Follow these steps to enable it.

## 🎯 What's Already Configured

✅ Backend Sentry integration (backend/src/utils/sentry.ts)
✅ Frontend Sentry integration (frontend/src/utils/sentry.ts)
✅ Error boundary with Sentry reporting
✅ Automatic error capture in middleware
✅ Context and user information included in error reports

## 📦 Installation

### Backend

```bash
cd backend
npm install @sentry/node @sentry/profiling-node
```

### Frontend

```bash
cd frontend
npm install @sentry/react
```

## 🔧 Configuration

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project for your application
3. Choose "Node.js" for backend and "React" for frontend
4. Copy the DSN (Data Source Name) provided

### 2. Set Environment Variables

#### Backend (.env)

```env
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
NODE_ENV=production
```

#### Frontend (.env)

```env
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
```

### 3. Uncomment Sentry Code

#### Backend (backend/src/utils/sentry.ts)

Uncomment all the commented Sentry code blocks:
- `import * as Sentry from '@sentry/node'`
- `Sentry.init({ ... })`
- All Sentry handler functions

#### Frontend (frontend/src/utils/sentry.ts)

Uncomment all the commented Sentry code blocks:
- `import * as Sentry from '@sentry/react'`
- `Sentry.init({ ... })`
- `Sentry.captureException(...)`

## ✅ Verification

### Test Backend Error Tracking

```bash
curl http://localhost:3000/api/test-error
```

Check your Sentry dashboard for the error report.

### Test Frontend Error Tracking

1. Open the app in your browser
2. Trigger an error (e.g., click a broken button)
3. Check your Sentry dashboard for the error report

## 📊 What Gets Tracked

### Backend
- ✅ All unhandled exceptions
- ✅ API errors with request context
- ✅ Database errors
- ✅ WebSocket errors
- ✅ User information (email, role)
- ✅ Request details (method, path, body, query)

### Frontend
- ✅ React component errors (via ErrorBoundary)
- ✅ Unhandled promise rejections
- ✅ Network errors
- ✅ User session information
- ✅ Browser and device information
- ✅ URL and navigation context

## 🎛️ Configuration Options

### Sample Rates

Adjust in `sentry.ts` files:

```typescript
// Production: 10% of transactions
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

// Development: 100% of transactions
tracesSampleRate: 1.0,
```

### Environment

Automatically set based on NODE_ENV:
- `development` - Full tracking, all errors
- `production` - Sampled tracking, critical errors only

## 🚫 Without Sentry

If you don't configure Sentry (no DSN provided):
- ✅ App works normally
- ✅ Errors logged to console
- ✅ Winston logging still active
- ⚠️ No centralized error tracking
- ⚠️ No error aggregation
- ⚠️ No alerting

## 📝 Best Practices

1. **Use Different Projects**: Create separate Sentry projects for backend and frontend
2. **Set Environments**: Use different DSNs for dev/staging/production
3. **Add Context**: Include user info and custom context in error reports
4. **Set Alerts**: Configure Sentry alerts for critical errors
5. **Review Regularly**: Check Sentry dashboard weekly for trends

## 🔗 Resources

- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Error Tracking Best Practices](https://docs.sentry.io/product/issues/)


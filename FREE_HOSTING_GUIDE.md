# NXT Bus - Free Hosting Deployment Guide

## 🎯 Overview

Your NXT Bus application can be deployed for **FREE** using a combination of services. Here's how:

## 🏗️ Deployment Strategy

### Architecture
```
Frontend (Vercel/Netlify) → Backend (Railway/Render) → Database (Railway/Render)
```

---

## 🚀 Option 1: Vercel + Railway (Recommended)

### Why This Combo?
- ✅ Both have generous free tiers
- ✅ Easy deployment from GitHub
- ✅ Automatic HTTPS
- ✅ Good performance
- ✅ Simple configuration

### Free Tier Limits
- **Vercel**: Unlimited bandwidth, 100GB/month
- **Railway**: $5 credit/month (enough for small apps)

---

## 📋 Step-by-Step Deployment

### Part 1: Deploy Backend + Database to Railway

#### 1. Sign Up for Railway
- Go to https://railway.app
- Sign up with GitHub
- Get $5 free credit per month

#### 2. Create New Project
```
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your nxt-bus repository
4. Select the backend folder
```

#### 3. Add PostgreSQL Database
```
1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically creates and connects it
```

#### 4. Add Redis
```
1. Click "New" again
2. Select "Database" → "Redis"
3. Automatically connected
```

#### 5. Configure Backend Environment Variables
```
In Railway backend service settings, add:

NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
JWT_SECRET=your-secure-jwt-secret-min-64-chars
REFRESH_TOKEN_SECRET=your-secure-refresh-secret-min-64-chars
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

#### 6. Configure Build Settings
```
Root Directory: /backend
Build Command: npm install && npm run build
Start Command: node dist/index.js
```

#### 7. Deploy
- Railway automatically deploys
- Get your backend URL: `https://your-app.railway.app`

---

### Part 2: Deploy Frontend to Vercel

#### 1. Sign Up for Vercel
- Go to https://vercel.com
- Sign up with GitHub
- Free tier is generous

#### 2. Import Project
```
1. Click "New Project"
2. Import your nxt-bus repository
3. Select the frontend folder
```

#### 3. Configure Build Settings
```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### 4. Add Environment Variables
```
VITE_API_URL=https://your-app.railway.app
```

#### 5. Update Frontend API Configuration

Create/update `frontend/src/config/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiConfig = {
  baseURL: API_URL,
  timeout: 10000,
};
```

Update all API calls to use this config.

#### 6. Deploy
- Vercel automatically builds and deploys
- Get your URL: `https://your-app.vercel.app`

#### 7. Update CORS in Railway
- Go back to Railway backend settings
- Update `CORS_ORIGIN` to your Vercel URL

---

## 🚀 Option 2: Netlify + Render

### Why This Combo?
- ✅ Both 100% free for small apps
- ✅ No credit card required
- ✅ Good for learning/testing

### Free Tier Limits
- **Netlify**: 100GB bandwidth/month
- **Render**: 750 hours/month free (enough for 1 app)

### Deployment Steps

#### Part 1: Deploy Backend to Render

1. **Sign Up**: https://render.com
2. **Create Web Service**
   ```
   - Connect GitHub repo
   - Root Directory: backend
   - Build Command: npm install && npm run build
   - Start Command: node dist/index.js
   - Free tier selected
   ```

3. **Add PostgreSQL**
   ```
   - Create new PostgreSQL database
   - Free tier (expires after 90 days, but can recreate)
   - Copy connection string
   ```

4. **Add Redis** (Limited on free tier)
   ```
   Option A: Use Upstash Redis (free tier)
   - Go to https://upstash.com
   - Create Redis database
   - Get connection details
   
   Option B: Skip Redis for now
   - Comment out Redis code
   - Use in-memory cache
   ```

5. **Environment Variables**
   ```
   NODE_ENV=production
   DATABASE_URL=<from-render-postgres>
   REDIS_HOST=<from-upstash>
   REDIS_PORT=<from-upstash>
   REDIS_PASSWORD=<from-upstash>
   JWT_SECRET=<generate-secure-secret>
   REFRESH_TOKEN_SECRET=<generate-secure-secret>
   CORS_ORIGIN=https://your-app.netlify.app
   ```

#### Part 2: Deploy Frontend to Netlify

1. **Sign Up**: https://netlify.com
2. **Import Project**
   ```
   - Connect GitHub
   - Base directory: frontend
   - Build command: npm run build
   - Publish directory: dist
   ```

3. **Environment Variables**
   ```
   VITE_API_URL=https://your-app.onrender.com
   ```

4. **Deploy**
   - Automatic deployment
   - Get URL: `https://your-app.netlify.app`

---

## 🚀 Option 3: All-in-One Free Platforms

### Fly.io (Free Tier)
- 3 shared VMs free
- Can run full stack
- Requires Docker knowledge

### Deployment:
```bash
# Install flyctl
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Create fly.toml
fly launch

# Deploy
fly deploy
```

### Pros:
- ✅ Full control
- ✅ Can run Docker containers
- ✅ Free PostgreSQL included

### Cons:
- ❌ More complex setup
- ❌ Requires Docker knowledge

---

## 📝 Configuration Files Needed

### For Vercel Deployment

Create `frontend/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend.railway.app/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### For Netlify Deployment

Create `frontend/netlify.toml`:
```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "https://your-backend.onrender.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### For Railway Backend

Create `backend/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 💰 Cost Comparison

### Free Tier Limits

| Platform | Frontend | Backend | Database | Redis |
|----------|----------|---------|----------|-------|
| **Vercel + Railway** | Unlimited | $5/month credit | Included | Included |
| **Netlify + Render** | 100GB/month | 750 hrs/month | 90 days free | Need Upstash |
| **Fly.io** | N/A | 3 VMs free | 3GB free | Need external |

### Recommended for Different Needs

**Learning/Testing**: Netlify + Render (100% free, no card)  
**Small Production**: Vercel + Railway (best performance)  
**Full Control**: Fly.io (requires Docker knowledge)

---

## 🔧 Required Code Changes

### 1. Update Frontend API Configuration

`frontend/src/config/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiConfig = {
  baseURL: API_URL,
  timeout: 10000,
};

export default apiConfig;
```

### 2. Update All API Calls

Replace hardcoded URLs with:
```typescript
import { apiConfig } from './config/api';
import axios from 'axios';

const api = axios.create(apiConfig);

// Use api instead of axios
api.get('/api/routes');
```

### 3. Update Backend CORS

`backend/src/index.ts`:
```typescript
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

### 4. Environment-Specific Database Config

`backend/src/config/database.ts`:
```typescript
const config = {
  // Railway/Render provide DATABASE_URL
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};
```

---

## 🚀 Quick Start: Vercel + Railway

### 1. Prepare Repository
```bash
# Commit all changes
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy Backend (Railway)
```
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Select nxt-bus repo
4. Add PostgreSQL database
5. Add Redis database
6. Configure environment variables
7. Deploy!
```

### 3. Deploy Frontend (Vercel)
```
1. Go to vercel.com
2. New Project → Import from GitHub
3. Select nxt-bus repo
4. Set root directory to "frontend"
5. Add VITE_API_URL environment variable
6. Deploy!
```

### 4. Update CORS
```
Go back to Railway → Backend → Variables
Update CORS_ORIGIN to your Vercel URL
Redeploy backend
```

### 5. Test
```
Visit your Vercel URL
Test all features
Check browser console for errors
```

---

## 🐛 Common Issues

### CORS Errors
**Problem**: Frontend can't connect to backend

**Solution**:
```
1. Check CORS_ORIGIN in backend matches frontend URL
2. Include protocol (https://)
3. No trailing slash
4. Redeploy backend after changes
```

### Database Connection Failed
**Problem**: Backend can't connect to database

**Solution**:
```
1. Check DATABASE_URL is set correctly
2. Enable SSL for production databases
3. Check database is running (Railway/Render dashboard)
```

### Build Fails
**Problem**: Deployment fails during build

**Solution**:
```
1. Check build command is correct
2. Verify all dependencies in package.json
3. Check Node version compatibility
4. Review build logs for specific errors
```

### Environment Variables Not Working
**Problem**: App can't read env variables

**Solution**:
```
Frontend (Vite): Must prefix with VITE_
Backend: No prefix needed
Redeploy after adding variables
```

---

## 📊 Performance Optimization

### For Free Tiers

1. **Enable Caching**
   - Use Redis for frequently accessed data
   - Cache API responses in frontend

2. **Optimize Images**
   - Use WebP format
   - Lazy load images
   - Use CDN (Vercel/Netlify provide this)

3. **Minimize API Calls**
   - Batch requests where possible
   - Use pagination
   - Implement debouncing

4. **Database Optimization**
   - Add indexes to frequently queried columns
   - Use connection pooling
   - Limit query results

---

## 🔐 Security Checklist

- [ ] Use HTTPS (automatic on Vercel/Netlify/Railway)
- [ ] Set strong JWT secrets (64+ characters)
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable database SSL
- [ ] Set secure password policies
- [ ] Implement rate limiting
- [ ] Validate all inputs

---

## 📈 Monitoring

### Free Monitoring Tools

1. **Vercel Analytics** (Free)
   - Page views
   - Performance metrics
   - Error tracking

2. **Railway Metrics** (Built-in)
   - CPU usage
   - Memory usage
   - Request logs

3. **Sentry** (Free tier)
   - Error tracking
   - Performance monitoring
   - 5,000 events/month free

---

## 🎓 Next Steps

1. **Deploy to Free Tier**
   - Test with Railway + Vercel
   - Verify all features work
   - Monitor usage

2. **Optimize**
   - Add caching
   - Optimize queries
   - Reduce API calls

3. **Monitor**
   - Set up error tracking
   - Monitor performance
   - Check usage limits

4. **Scale When Needed**
   - Upgrade to paid tiers if needed
   - Consider dedicated hosting
   - Implement CDN

---

## 💡 Pro Tips

1. **Use GitHub Actions**
   - Automatic deployments on push
   - Run tests before deploy
   - Free for public repos

2. **Database Backups**
   - Railway: Automatic backups
   - Render: Manual backups needed
   - Export data regularly

3. **Custom Domains**
   - Free on Vercel/Netlify
   - Just need to own domain
   - Automatic SSL

4. **Preview Deployments**
   - Vercel/Netlify create preview for each PR
   - Test before merging
   - Share with team

---

## 📞 Support

### Platform Documentation
- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.app
- **Netlify**: https://docs.netlify.com
- **Render**: https://render.com/docs

### Community
- Railway Discord
- Vercel Discord
- Stack Overflow

---

## ✅ Deployment Checklist

### Before Deployment
- [ ] Code pushed to GitHub
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] API endpoints tested locally
- [ ] Frontend builds successfully

### During Deployment
- [ ] Backend deployed and running
- [ ] Database created and connected
- [ ] Redis configured (if using)
- [ ] Frontend deployed
- [ ] Environment variables set
- [ ] CORS configured

### After Deployment
- [ ] All pages load correctly
- [ ] API calls work
- [ ] Authentication works
- [ ] GPS tracking works
- [ ] No console errors
- [ ] Performance acceptable

---

**Ready to deploy for free? Start with Railway + Vercel!**

**Last Updated**: November 13, 2025

# Supabase Setup Guide for nxt-bus

## ✅ Your Supabase Project Details

- **Project URL**: https://qtjfjatgvupymmcgpxal.supabase.co
- **Project Reference**: qtjfjatgvupymmcgpxal
- **API Key**: Already configured in `.env`

## 🔧 Complete Setup Steps

### Step 1: Get Your Database Password

You need the database password you created when setting up the Supabase project.

**If you forgot it:**
1. Go to https://qtjfjatgvupymmcgpxal.supabase.co
2. Click "Project Settings" → "Database"
3. Click "Reset Database Password"
4. Copy the new password

### Step 2: Update the .env File

1. Open `backend/.env`
2. Find these two lines:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.qtjfjatgvupymmcgpxal.supabase.co:5432/postgres
   DB_PASSWORD=[YOUR-PASSWORD]
   ```
3. Replace `[YOUR-PASSWORD]` with your actual database password

**Example:**
If your password is `MySecurePass123`, it should look like:
```
DATABASE_URL=postgresql://postgres:MySecurePass123@db.qtjfjatgvupymmcgpxal.supabase.co:5432/postgres
DB_PASSWORD=MySecurePass123
```

### Step 3: Enable PostGIS Extension

1. Go to https://qtjfjatgvupymmcgpxal.supabase.co
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Paste this SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   
   -- Verify installation
   SELECT PostGIS_version();
   ```
5. Click "Run" (or press Ctrl+Enter)
6. You should see the PostGIS version in the results

### Step 4: Run Database Migrations

Open your terminal in the backend folder and run:

```bash
cd backend
npm run migrate:up
```

This will create all the tables (users, bus_stops, routes, buses, etc.)

### Step 5: Seed Sample Data

```bash
npm run seed
```

This will add:
- 3 test users (passenger, driver, admin)
- 8 bus stops with QR codes
- 3 routes
- 5 buses
- Sample GPS locations

### Step 6: Start the Backend Server

```bash
npm run dev
```

You should see:
```
nxt-bus backend server running on port 3000
✓ Database connected successfully
✓ PostGIS version: ...
```

### Step 7: Test the Connection

Open your browser and go to:
```
http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

## 🎉 You're Done!

Your nxt-bus backend is now connected to Supabase!

## 📊 View Your Data

You can view and manage your data in Supabase:
1. Go to https://qtjfjatgvupymmcgpxal.supabase.co
2. Click "Table Editor" to see all your tables
3. Click "SQL Editor" to run custom queries

## 🔐 Test Credentials

After seeding, you can use these credentials:
- **Passenger**: `passenger@test.com` / `password123`
- **Driver**: `driver@test.com` / `password123`
- **Admin**: `admin@test.com` / `password123`

## ⚠️ Important Notes

1. **Never commit your `.env` file** - it contains your database password
2. **The free tier includes**:
   - 500 MB database space
   - 1 GB file storage
   - 2 GB bandwidth per month
   - Unlimited API requests
3. **For Redis**: We're using localhost for now. If you need cloud Redis, let me know and I'll set up Upstash (also free).

## 🆘 Troubleshooting

**"could not connect to postgres"**
- Check that you replaced `[YOUR-PASSWORD]` in `.env`
- Verify your password is correct
- Make sure your internet connection is working

**"relation does not exist"**
- Run `npm run migrate:up` to create tables

**"PostGIS not found"**
- Run the SQL commands in Step 3 again

Need help? Check the error message and refer back to this guide!

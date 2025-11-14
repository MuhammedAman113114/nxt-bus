@echo off
echo ========================================
echo NXT Bus - Deployment Script
echo ========================================
echo.

echo [1/5] Checking Docker...
docker --version
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running
    echo Please install Docker Desktop and try again
    pause
    exit /b 1
)
echo OK: Docker is available
echo.

echo [2/5] Building backend...
cd backend
docker build -t nxtbus-backend:latest .
if %errorlevel% neq 0 (
    echo ERROR: Backend build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo OK: Backend built successfully
echo.

echo [3/5] Building frontend...
cd frontend
docker build -t nxtbus-frontend:latest .
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo OK: Frontend built successfully
echo.

echo [4/5] Starting services...
docker-compose -f docker-compose.simple.yml up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)
echo OK: Services started
echo.

echo [5/5] Checking health...
timeout /t 10 /nobreak > nul
curl -f http://localhost:3000/health
if %errorlevel% neq 0 (
    echo WARNING: Backend health check failed
    echo Check logs: docker-compose -f docker-compose.simple.yml logs backend
) else (
    echo OK: Backend is healthy
)
echo.

curl -f http://localhost/health
if %errorlevel% neq 0 (
    echo WARNING: Frontend health check failed
    echo Check logs: docker-compose -f docker-compose.simple.yml logs frontend
) else (
    echo OK: Frontend is healthy
)
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Frontend: http://localhost
echo Backend API: http://localhost:3000
echo Health Check: http://localhost:3000/health
echo.
echo View logs: docker-compose -f docker-compose.simple.yml logs -f
echo Stop services: docker-compose -f docker-compose.simple.yml down
echo.
pause

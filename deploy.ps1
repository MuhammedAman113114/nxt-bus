# NXT Bus Deployment Script for Windows
# This script deploys the NXT Bus application using Docker

Write-Host "🚀 NXT Bus Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "✗ .env.production file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.production.example to .env.production and configure it." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Environment file found" -ForegroundColor Green

# Load environment variables
Write-Host ""
Write-Host "Loading environment variables..." -ForegroundColor Yellow
Get-Content .env.production | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($name -and -not $name.StartsWith('#')) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}
Write-Host "✓ Environment variables loaded" -ForegroundColor Green

# Stop existing containers
Write-Host ""
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down 2>$null
Write-Host "✓ Containers stopped" -ForegroundColor Green

# Build images
Write-Host ""
Write-Host "Building Docker images..." -ForegroundColor Yellow
Write-Host "(This may take several minutes on first run)" -ForegroundColor Gray
docker-compose -f docker-compose.prod.yml build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Images built successfully" -ForegroundColor Green

# Start services
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start services!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Services started" -ForegroundColor Green

# Wait for services to be healthy
Write-Host ""
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service status
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml ps

# Run database migrations
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Migration failed or already applied" -ForegroundColor Yellow
} else {
    Write-Host "✓ Migrations completed" -ForegroundColor Green
}

# Health checks
Write-Host ""
Write-Host "Performing health checks..." -ForegroundColor Yellow

Write-Host "  Checking backend..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Backend is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Backend health check failed" -ForegroundColor Red
}

Write-Host "  Checking frontend..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Frontend is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Frontend health check failed" -ForegroundColor Red
}

# Display access information
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your application:" -ForegroundColor White
Write-Host "  Frontend: http://localhost" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor White
Write-Host "  View logs:    docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray
Write-Host "  Stop:         docker-compose -f docker-compose.prod.yml down" -ForegroundColor Gray
Write-Host "  Restart:      docker-compose -f docker-compose.prod.yml restart" -ForegroundColor Gray
Write-Host ""

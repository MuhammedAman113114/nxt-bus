# NXT Bus Status Check Script
# Quick health check for all services

Write-Host "🔍 NXT Bus Status Check" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Docker Status:" -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "  ✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker is not running" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Container Status:" -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "Health Checks:" -ForegroundColor Yellow

# Backend health
Write-Host "  Backend (http://localhost:3000/health)..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
    Write-Host "  ✓ Backend: " -NoNewline -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Compress) -ForegroundColor White
} catch {
    Write-Host "  ✗ Backend: Not responding" -ForegroundColor Red
}

# Frontend health
Write-Host "  Frontend (http://localhost/health)..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Frontend: Healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Frontend: Not responding" -ForegroundColor Red
}

# Database health
Write-Host "  Database..." -ForegroundColor Gray
try {
    $dbCheck = docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database: Ready" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Database: Not ready" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Database: Error checking status" -ForegroundColor Red
}

# Redis health
Write-Host "  Redis..." -ForegroundColor Gray
try {
    $redisCheck = docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping 2>&1
    if ($redisCheck -match "PONG") {
        Write-Host "  ✓ Redis: Connected" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Redis: Not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Redis: Error checking status" -ForegroundColor Red
}

Write-Host ""
Write-Host "Resource Usage:" -ForegroundColor Yellow
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | Select-Object -First 5

Write-Host ""
Write-Host "========================" -ForegroundColor Cyan
Write-Host "Access URLs:" -ForegroundColor White
Write-Host "  Frontend: http://localhost" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

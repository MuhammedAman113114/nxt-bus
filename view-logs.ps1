# NXT Bus Log Viewer
# Easy access to service logs

param(
    [Parameter(Position=0)]
    [ValidateSet('all', 'backend', 'frontend', 'postgres', 'redis')]
    [string]$Service = 'all',
    
    [Parameter()]
    [int]$Lines = 100,
    
    [Parameter()]
    [switch]$Follow
)

Write-Host "📋 NXT Bus Log Viewer" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

if ($Service -eq 'all') {
    Write-Host "Viewing logs for all services..." -ForegroundColor Yellow
    if ($Follow) {
        Write-Host "Press Ctrl+C to stop following logs" -ForegroundColor Gray
        Write-Host ""
        docker-compose -f docker-compose.prod.yml logs -f --tail=$Lines
    } else {
        docker-compose -f docker-compose.prod.yml logs --tail=$Lines
    }
} else {
    Write-Host "Viewing logs for $Service..." -ForegroundColor Yellow
    if ($Follow) {
        Write-Host "Press Ctrl+C to stop following logs" -ForegroundColor Gray
        Write-Host ""
        docker-compose -f docker-compose.prod.yml logs -f --tail=$Lines $Service
    } else {
        docker-compose -f docker-compose.prod.yml logs --tail=$Lines $Service
    }
}

# Test site availability
Write-Host "Checking https://ai.spor3s.ru..." -ForegroundColor Cyan

# Check main page
try {
    $response = Invoke-WebRequest -Uri "https://ai.spor3s.ru" -Method GET -TimeoutSec 10 -UseBasicParsing
    Write-Host "Main page: HTTP $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response size: $($response.Content.Length) bytes" -ForegroundColor Gray
} catch {
    Write-Host "Main page unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

# Check API health
try {
    $health = Invoke-WebRequest -Uri "https://ai.spor3s.ru/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "API Health: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "API Health unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

# Check API init-user
try {
    $body = @{ telegram_id = "test-123" } | ConvertTo-Json
    $init = Invoke-WebRequest -Uri "https://ai.spor3s.ru/api/init-user" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing
    Write-Host "API init-user: HTTP $($init.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "API init-user unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

# Check API products
try {
    $products = Invoke-WebRequest -Uri "https://ai.spor3s.ru/api/products" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "API products: HTTP $($products.StatusCode)" -ForegroundColor Green
    $data = $products.Content | ConvertFrom-Json
    Write-Host "Products count: $($data.products.Count)" -ForegroundColor Gray
} catch {
    Write-Host "API products unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCheck completed" -ForegroundColor Cyan

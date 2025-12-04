# Test domain availability
Write-Host "Testing https://ai.spor3s.ru..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Main page
Write-Host "1. Testing main page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://ai.spor3s.ru" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   Main page: HTTP $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Response size: $($response.Content.Length) bytes" -ForegroundColor Gray
    if ($response.Content.Length -gt 1000) {
        Write-Host "   Content looks good" -ForegroundColor Green
    } else {
        Write-Host "   Content might be empty" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Main page unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: API Health
Write-Host "2. Testing API /api/health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "https://ai.spor3s.ru/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   API Health: HTTP $($health.StatusCode)" -ForegroundColor Green
    Write-Host "   Response: $($health.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   API Health unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: API Products
Write-Host "3. Testing API /api/products..." -ForegroundColor Yellow
try {
    $products = Invoke-WebRequest -Uri "https://ai.spor3s.ru/api/products" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   API Products: HTTP $($products.StatusCode)" -ForegroundColor Green
    $data = $products.Content | ConvertFrom-Json
    if ($data.products) {
        Write-Host "   Products count: $($data.products.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   No products in response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   API Products unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: API Init User
Write-Host "4. Testing API /api/init-user..." -ForegroundColor Yellow
try {
    $body = @{ telegram_id = "test-123" } | ConvertTo-Json
    $init = Invoke-WebRequest -Uri "https://ai.spor3s.ru/api/init-user" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   API Init User: HTTP $($init.StatusCode)" -ForegroundColor Green
    $initData = $init.Content | ConvertFrom-Json
    if ($initData.id) {
        Write-Host "   User ID: $($initData.id)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   API Init User unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Test page
Write-Host "5. Testing /test page..." -ForegroundColor Yellow
try {
    $test = Invoke-WebRequest -Uri "https://ai.spor3s.ru/test" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   Test page: HTTP $($test.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   Test page unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Safe page
Write-Host "6. Testing /safe page..." -ForegroundColor Yellow
try {
    $safe = Invoke-WebRequest -Uri "https://ai.spor3s.ru/safe" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   Safe page: HTTP $($safe.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   Safe page unavailable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing completed!" -ForegroundColor Cyan

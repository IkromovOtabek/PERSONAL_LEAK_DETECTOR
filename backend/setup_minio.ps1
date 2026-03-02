# MinIO Setup Script for Windows PowerShell
# SafeShare uchun MinIO object storage'ni ishga tushirish

Write-Host "=== MinIO Setup for SafeShare ===" -ForegroundColor Cyan
Write-Host ""

# Docker tekshirish
Write-Host "Docker tekshirilmoqda..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "❌ Docker topilmadi!" -ForegroundColor Red
    Write-Host "Iltimos, Docker Desktop'ni o'rnating: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker topildi" -ForegroundColor Green
Write-Host ""

# MinIO container tekshirish
Write-Host "MinIO container tekshirilmoqda..." -ForegroundColor Yellow
$minioContainer = docker ps -a --filter "name=minio" --format "{{.Names}}"

if ($minioContainer -eq "minio") {
    $running = docker ps --filter "name=minio" --format "{{.Names}}"
    if ($running -eq "minio") {
        Write-Host "✅ MinIO allaqachon ishlamoqda" -ForegroundColor Green
        Write-Host ""
        Write-Host "MinIO Console: http://localhost:9001" -ForegroundColor Cyan
        Write-Host "Username: minioadmin" -ForegroundColor Cyan
        Write-Host "Password: minioadmin" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "MinIO container mavjud, lekin to'xtatilgan. Ishga tushirilmoqda..." -ForegroundColor Yellow
        docker start minio
        Write-Host "✅ MinIO ishga tushirildi" -ForegroundColor Green
        exit 0
    }
}

# MinIO'ni ishga tushirish
Write-Host "MinIO container yaratilmoqda..." -ForegroundColor Yellow
docker run -d `
    --name minio `
    -p 9000:9000 `
    -p 9001:9001 `
    -e "MINIO_ROOT_USER=minioadmin" `
    -e "MINIO_ROOT_PASSWORD=minioadmin" `
    minio/minio server /data --console-address ":9001"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ MinIO muvaffaqiyatli ishga tushirildi!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== MinIO Ma'lumotlari ===" -ForegroundColor Cyan
    Write-Host "API Endpoint: http://localhost:9000" -ForegroundColor White
    Write-Host "Console: http://localhost:9001" -ForegroundColor White
    Write-Host "Username: minioadmin" -ForegroundColor White
    Write-Host "Password: minioadmin" -ForegroundColor White
    Write-Host ""
    Write-Host "=== Keyingi Qadamlar ===" -ForegroundColor Cyan
    Write-Host "1. .env faylga quyidagilarni qo'shing:" -ForegroundColor Yellow
    Write-Host "   S3_ENABLED=true" -ForegroundColor White
    Write-Host "   S3_ENDPOINT_URL=http://localhost:9000" -ForegroundColor White
    Write-Host "   S3_ACCESS_KEY_ID=minioadmin" -ForegroundColor White
    Write-Host "   S3_SECRET_ACCESS_KEY=minioadmin" -ForegroundColor White
    Write-Host "   S3_BUCKET_NAME=safeshare" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Backend serverni qayta ishga tushiring" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Browser'da http://localhost:9001 ochib, 'safeshare' bucket yarating (agar avtomatik yaratilmasa)" -ForegroundColor Yellow
} else {
    Write-Host "❌ MinIO'ni ishga tushirishda xatolik!" -ForegroundColor Red
    exit 1
}


#!/bin/bash
# MinIO Setup Script for Linux/Mac
# SafeShare uchun MinIO object storage'ni ishga tushirish

echo "=== MinIO Setup for SafeShare ==="
echo ""

# Docker tekshirish
echo "Docker tekshirilmoqda..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker topilmadi!"
    echo "Iltimos, Docker'ni o'rnating: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker topildi"
echo ""

# MinIO container tekshirish
echo "MinIO container tekshirilmoqda..."
if docker ps -a --format '{{.Names}}' | grep -q "^minio$"; then
    if docker ps --format '{{.Names}}' | grep -q "^minio$"; then
        echo "✅ MinIO allaqachon ishlamoqda"
        echo ""
        echo "MinIO Console: http://localhost:9001"
        echo "Username: minioadmin"
        echo "Password: minioadmin"
        exit 0
    else
        echo "MinIO container mavjud, lekin to'xtatilgan. Ishga tushirilmoqda..."
        docker start minio
        echo "✅ MinIO ishga tushirildi"
        exit 0
    fi
fi

# MinIO'ni ishga tushirish
echo "MinIO container yaratilmoqda..."
docker run -d \
    --name minio \
    -p 9000:9000 \
    -p 9001:9001 \
    -e "MINIO_ROOT_USER=minioadmin" \
    -e "MINIO_ROOT_PASSWORD=minioadmin" \
    minio/minio server /data --console-address ":9001"

if [ $? -eq 0 ]; then
    echo "✅ MinIO muvaffaqiyatli ishga tushirildi!"
    echo ""
    echo "=== MinIO Ma'lumotlari ==="
    echo "API Endpoint: http://localhost:9000"
    echo "Console: http://localhost:9001"
    echo "Username: minioadmin"
    echo "Password: minioadmin"
    echo ""
    echo "=== Keyingi Qadamlar ==="
    echo "1. .env faylga quyidagilarni qo'shing:"
    echo "   S3_ENABLED=true"
    echo "   S3_ENDPOINT_URL=http://localhost:9000"
    echo "   S3_ACCESS_KEY_ID=minioadmin"
    echo "   S3_SECRET_ACCESS_KEY=minioadmin"
    echo "   S3_BUCKET_NAME=safeshare"
    echo ""
    echo "2. Backend serverni qayta ishga tushiring"
    echo ""
    echo "3. Browser'da http://localhost:9001 ochib, 'safeshare' bucket yarating (agar avtomatik yaratilmasa)"
else
    echo "❌ MinIO'ni ishga tushirishda xatolik!"
    exit 1
fi


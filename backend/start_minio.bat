@echo off
echo ========================================
echo MinIO Setup for SafeShare
echo ========================================
echo.

REM Docker Desktop tekshirish
echo Docker Desktop tekshirilmoqda...
docker version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [XATO] Docker Desktop ishlamayapti!
    echo.
    echo Iltimos, quyidagilarni bajaring:
    echo 1. Docker Desktop'ni ishga tushiring
    echo 2. Docker Desktop to'liq yuklanguncha kuting
    echo 3. Keyin bu skriptni qayta ishga tushiring
    echo.
    pause
    exit /b 1
)

echo [OK] Docker topildi
echo.

REM MinIO container tekshirish
echo MinIO container tekshirilmoqda...
docker ps -a --filter "name=minio" --format "{{.Names}}" > temp_minio.txt 2>&1
findstr /C:"minio" temp_minio.txt >nul 2>&1
if errorlevel 1 (
    echo MinIO container topilmadi. Yaratilmoqda...
    goto :create_minio
) else (
    echo MinIO container topildi. Status tekshirilmoqda...
    docker ps --filter "name=minio" --format "{{.Names}}" > temp_minio_running.txt 2>&1
    findstr /C:"minio" temp_minio_running.txt >nul 2>&1
    if errorlevel 1 (
        echo MinIO to'xtatilgan. Ishga tushirilmoqda...
        docker start minio
        if errorlevel 1 (
            echo [XATO] MinIO'ni ishga tushirishda xatolik!
            goto :error
        )
        echo [OK] MinIO ishga tushirildi
    ) else (
        echo [OK] MinIO allaqachon ishlamoqda
    )
    goto :success
)

:create_minio
echo.
echo MinIO container yaratilmoqda...
docker run -d --name minio -p 9000:9000 -p 9001:9001 -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" minio/minio server /data --console-address ":9001"
if errorlevel 1 (
    echo [XATO] MinIO'ni yaratishda xatolik!
    goto :error
)
echo [OK] MinIO muvaffaqiyatli yaratildi va ishga tushirildi

:success
del temp_minio.txt temp_minio_running.txt 2>nul
echo.
echo ========================================
echo MinIO muvaffaqiyatli ishlamoqda!
echo ========================================
echo.
echo MinIO API: http://localhost:9000
echo MinIO Console: http://localhost:9001
echo Username: minioadmin
echo Password: minioadmin
echo.
echo Keyingi qadam:
echo 1. Backend serverni qayta ishga tushiring (start_backend.bat)
echo 2. Browser'da http://localhost:9001 ochib, 'safeshare' bucket yarating
echo    (yoki backend avtomatik yaratadi)
echo.
pause
exit /b 0

:error
del temp_minio.txt temp_minio_running.txt 2>nul
echo.
echo [XATO] MinIO'ni ishga tushirishda muammo yuz berdi!
echo.
echo Iltimos, quyidagilarni tekshiring:
echo 1. Docker Desktop ishlamoqda ekanligini tekshiring
echo 2. Port 9000 va 9001 band emasligini tekshiring
echo 3. Docker Desktop'da boshqa xatoliklar yo'qligini tekshiring
echo.
pause
exit /b 1


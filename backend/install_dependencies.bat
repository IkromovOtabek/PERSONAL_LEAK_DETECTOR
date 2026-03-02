@echo off
echo ========================================
echo Dependencies O'rnatish
echo ========================================
echo.

REM Check if virtual environment is activated
if not defined VIRTUAL_ENV (
    echo [WARNING] Virtual environment faollashtirilmagan!
    echo Virtual environment'ni faollashtirish...
    if exist "venv\Scripts\activate.bat" (
        call venv\Scripts\activate.bat
        echo [OK] Virtual environment faollashtirildi
    ) else (
        echo [ERROR] Virtual environment topilmadi!
        echo Avval virtual environment yarating: python -m venv venv
        pause
        exit /b 1
    )
)

REM Install dependencies
echo [INFO] Dependencies o'rnatilmoqda...
echo Bu biroz vaqt olishi mumkin...
echo.

pip install -r requirements-minimal.txt

if errorlevel 1 (
    echo.
    echo [ERROR] Dependencies o'rnatishda xato!
    pause
    exit /b 1
)

echo.
echo ========================================
echo [OK] Dependencies muvaffaqiyatli o'rnatildi!
echo ========================================
echo.

pause


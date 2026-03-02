@echo off
echo ========================================
echo Personal Leak Detector - Frontend
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
)

REM Start frontend
echo.
echo ========================================
echo [INFO] Starting Frontend Server...
echo [INFO] Server: http://localhost:3000
echo ========================================
echo.
echo Press CTRL+C to stop the server
echo.

call npm start

pause


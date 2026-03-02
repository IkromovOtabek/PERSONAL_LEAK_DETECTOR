@echo off
echo ========================================
echo Personal Leak Detector - Backend
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo [OK] Virtual environment activated
) else (
    echo [WARNING] Virtual environment not found!
    echo Please create it first: python -m venv venv
    pause
    exit /b 1
)

REM Set environment variables
set DATABASE_URL=sqlite:///./pld.db
set SECRET_KEY=dev-secret-key-change-in-production-12345
set REDIS_URL=redis://localhost:6379/0
set ENCRYPTION_KEY=dev-encryption-key-32-bytes-long!
set S3_ENABLED=false

REM Create database tables
echo.
echo [INFO] Initializing database...
python -c "from app.db.database import engine, Base, check_database_connection; Base.metadata.create_all(bind=engine); print('[OK] Database ready!' if check_database_connection() else '[WARNING] Database connection check failed')"
if errorlevel 1 (
    echo [ERROR] Failed to initialize database!
    pause
    exit /b 1
)

REM Start server
echo.
echo ========================================
echo [INFO] Starting Backend Server...
echo [INFO] Server: http://localhost:8000
echo [INFO] API Docs: http://localhost:8000/docs
echo [INFO] Health: http://localhost:8000/health
echo ========================================
echo.
echo Press CTRL+C to stop the server
echo.

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause


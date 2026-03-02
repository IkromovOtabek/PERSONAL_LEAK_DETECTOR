@echo off
echo Starting Personal Leak Detector Backend (Local Mode)
echo.

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment activated.
) else (
    echo WARNING: Virtual environment not found. Using system Python.
)

REM Set environment variables for SQLite
set DATABASE_URL=sqlite:///./pld.db
set SECRET_KEY=dev-secret-key-change-in-production-12345
set REDIS_URL=redis://localhost:6379/0
set ENCRYPTION_KEY=dev-encryption-key-32-bytes-long!
set S3_ENABLED=false

REM Install dependencies if needed
echo Checking dependencies...
python -c "import sqlalchemy" 2>nul
if errorlevel 1 (
    echo [INFO] Dependencies not installed. Installing...
    pip install -r requirements-minimal.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
)

REM Create database if it doesn't exist
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
echo Server starting on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ========================================
echo.
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


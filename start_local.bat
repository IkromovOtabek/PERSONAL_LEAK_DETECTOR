@echo off
echo Starting Personal Leak Detector (Local Mode)
echo.

REM Check if backend venv exists
if not exist "backend\venv" (
    echo Backend virtual environment not found!
    echo Please run local_setup.bat first
    pause
    exit /b 1
)

REM Start backend
set S3_ENABLED=false
echo Starting backend...
start "PLD Backend" cmd /k "cd backend && venv\Scripts\activate && python -c \"from app.db.database import engine, Base; Base.metadata.create_all(bind=engine)\" && uvicorn app.main:app --reload"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend...
start "PLD Frontend" cmd /k "cd frontend && npm start"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit (servers will continue running)...
pause >nul



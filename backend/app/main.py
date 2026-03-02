from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.database import engine, Base
from app.core.exception_handlers import (
    validation_exception_handler,
    pld_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler
)
from app.core.exceptions import PLDException
from app.core.middleware import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
# Barcha modellarni import qilish - SQLAlchemy'da ro'yxatdan o'tkazish uchun
from app.models import *  # noqa: F401, F403
import logging
import os

# Logging sozlash
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI ishga tushirish va to'xtatish uchun lifespan context manager."""
    # Ishga tushirish
    logger.info("Personal Leak Detector API ishga tushmoqda...")
    try:
        # Ma'lumotlar bazasi jadvallarini yaratish (agar mavjud bo'lmasa)
        Base.metadata.create_all(bind=engine)
        logger.info("Ma'lumotlar bazasi jadvallari muvaffaqiyatli yaratildi")
    except Exception as e:
        logger.error(f"Ma'lumotlar bazasi jadvallarini yaratishda xatolik: {e}", exc_info=True)
        # Xatoni ko'tarmaslik - jadvallar allaqachon mavjud bo'lsa ham ilovani ishga tushirishga ruxsat berish
    
    logger.info("Ilova muvaffaqiyatli ishga tushdi")
    logger.info(f"API Hujjat: http://localhost:8000/docs")
    
    yield
    
    # To'xtatish
    logger.info("Ilova to'xtatilmoqda...")
    try:
        # Ma'lumotlar bazasi ulanishlarini yopish
        engine.dispose()
        logger.info("Ma'lumotlar bazasi ulanishlari yopildi")
    except Exception as e:
        logger.error(f"To'xtatish paytida xatolik: {e}", exc_info=True)


app = FastAPI(
    title="Personal Leak Detector API",
    description="Shaxsiy ma'lumotlar sizib chiqishini aniqlash uchun API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Xatolik boshqaruvchilari
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(PLDException, pld_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Xavfsizlik headerlari middleware (barcha javoblarga header qo'shish uchun birinchi bo'lishi kerak)
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting middleware (zanjirning boshida bo'lishi kerak)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60, requests_per_hour=1000)

# Logging middleware
app.add_middleware(LoggingMiddleware)

# Ishonchli host middleware (CORS dan keyin qo'shiladi, shuning uchun CORS birinchi ishlaydi)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# CORS middleware — OPTIONS preflight birinchi qatlamda (oxirgi qo'shilgan = birinchi ishlaydi)
# allow_origins da "*" bo'lsa barcha originlar qabul qilinadi, 400 xatosi bo'lmaydi
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# API router'ni versiya prefiksi bilan qo'shish
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Asosiy endpoint."""
    return {"message": "Personal Leak Detector API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Sog'liqni tekshirish endpoint'i."""
    try:
        # Ma'lumotlar bazasi ulanishini tekshirish
        from app.db.database import engine
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Sog'liqni tekshirish muvaffaqiyatsiz: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# Frontend build mavjud bo'lsa, SPA ni xizmat qilish (/settings, /dashboard va boshqalar uchun index.html)
_FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "build")
if os.path.isdir(_FRONTEND_BUILD_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(_FRONTEND_BUILD_DIR, "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """API bo'lmagan barcha yo'llar uchun index.html qaytaradi (SPA fallback)."""
        if (
            full_path.startswith("api/")
            or full_path.startswith("static/")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path == "openapi.json"
        ):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        index_path = os.path.join(_FRONTEND_BUILD_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not Found")


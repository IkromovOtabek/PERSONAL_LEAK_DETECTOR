"""
Celery configuration for background tasks.
Optional - only used if Celery is installed and Redis is available.
Redis bo'lmasa CELERY_AVAILABLE = False, Gmail tahlil FastAPI background_tasks orqali ishlaydi.
"""
celery_app = None
CELERY_AVAILABLE = False

try:
    from celery import Celery
    from app.core.config import settings

    celery_app = Celery(
        "pld",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
        include=["app.services.scan_service"]
    )

    celery_app.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Asia/Seoul',
        enable_utc=False,
        task_track_started=True,
        task_time_limit=30 * 60,
        task_soft_time_limit=25 * 60,
    )

    # Redis ulanishini tekshirish — Redis ishlamasa Celery o'rniga background_tasks ishlatiladi
    try:
        from redis import Redis
        r = Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        r.close()
        CELERY_AVAILABLE = True
    except Exception:
        CELERY_AVAILABLE = False
except ImportError:
    pass


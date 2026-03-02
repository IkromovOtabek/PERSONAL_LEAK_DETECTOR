# Personal Leak Detector (PLD)

Personal Leak Detector - foydalanuvchining shaxsiy ma'lumotlarining internetda oqib ketganini aniqlovchi tizim.

## Loyiha struktura

```
PERSONAL_LEAK_DETECTOR3/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core config, security
│   │   ├── models/      # Database models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities (detection, OCR, etc.)
│   ├── migrations/      # Alembic migrations
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── docker-compose.yml   # Development setup
└── README.md
```

## Texnologiyalar

### Backend
- FastAPI (Python web framework)
- PostgreSQL (database)
- Redis (job queue)
- Celery (background tasks)
- SQLAlchemy (ORM)
- Alembic (migrations)
- spaCy (NER)
- Tesseract (OCR)
- PyMuPDF (PDF parsing)

### Frontend
- React
- Tailwind CSS
- Axios (HTTP client)

## Boshlash

### Talablar
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### Development

1. **Backend setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Frontend setup:**
```bash
cd frontend
npm install
```

3. **Docker Compose (recommended):**
```bash
# Windows (newer Docker Desktop)
docker compose up -d

# Linux/Mac or older Docker
docker-compose up -d
```

## API Endpoints

- `POST /api/register` - Ro'yxatdan o'tish
- `POST /api/login` - Login
- `GET /api/user` - Foydalanuvchi profili
- `POST /api/sensitive-items` - Sensitive item qo'shish
- `GET /api/scans` - Scanlar ro'yxati
- `POST /api/scan/start` - Yangi scan boshlash
- `GET /api/findings` - Topilmalar
- `POST /api/findings/{id}/resolve` - Topilmani yopish

## Xavfsizlik

- JWT authentication
- Password hashing (bcrypt)
- OAuth token encryption
- HTTPS only
- Rate limiting
- Audit logging

## MVP Roadmap

- ✅ Project structure
- ✅ Authentication system
- ✅ Sensitive items management
- ✅ Detection engine (regex + NER)
- ✅ Email scanning (Gmail OAuth)
- ✅ File upload & OCR
- ✅ Findings dashboard
- ✅ Notifications


# 📋 Personal Leak Detector - Loyixaning Moxiyati

## 🎯 **Loyixaning Maqsadi**
Foydalanuvchilarning **shaxsiy ma'lumotlarini** (emails, phone raqamlar, passwords va boshqalar) internet'da **oqib ketganini aniqlovchi** xavfsizlik tizimi.

---

## 🏗️ **Arxitektura**

```
Frontend (React)      →   API (FastAPI)   →   Database (PostgreSQL/SQLite)
   :3000                    :8000                 :5432
                              ↓
                         Background Jobs
                           (Celery)
                              ↓
                         Redis Queue
                           :6379
```

---

## 🔧 **Backend Texnologiyalari**

### **Web Framework**
- **FastAPI** (0.109.0) - Tez va zamonaviy Python web framework
- **Uvicorn** (0.27.0) - ASGI server

### **Database**
- **SQLAlchemy** (2.0.28) - ORM (Object-Relational Mapping)
- **Alembic** (1.13.1) - Database migrations
- **PostgreSQL** (Docker) - Production database
- **SQLite** - Development (hozirgi)

### **Cache & Job Queue**
- **Redis** (7-alpine) - In-memory data store
- **Celery** (5.3.6) - Async task queue

### **Authentication & Security**
- **python-jose** - JWT tokens
- **passlib[bcrypt]** - Password hashing
- **python-dotenv** - Environment variables
- **cryptography** (42.0.0) - Encryption

### **Email & OAuth**
- **google-auth** - Gmail integration
- **google-auth-oauthlib** - OAuth flow
- **google-api-python-client** - Gmail API

### **File Processing** (Optional)
- PyMuPDF - PDF parsing
- python-docx - Word documents
- Pillow - Image processing
- pytesseract - OCR (Tesseract)

### **NLP & ML** (Optional)
- spaCy - Named Entity Recognition (NER)
- sentence-transformers - Embeddings

### **Storage**
- **boto3** (1.34.0) - S3/MinIO integration

### **Utilities**
- **Pydantic** (2.0+) - Data validation
- **requests** - HTTP client
- **aiohttp** - Async HTTP
- **beautifulsoup4** - HTML parsing
- **python-dateutil** - Date utilities

### **Testing**
- **pytest** - Test framework
- **pytest-asyncio** - Async test support

---

## 🎨 **Frontend Texnologiyalari**

### **Core**
- **React** (18.2.0) - UI library
- **React Router** (6.20.0) - Routing
- **React Query** (3.39.3) - Server state management

### **Styling**
- **Tailwind CSS** (3.3.6) - Utility-first CSS
- **PostCSS** - CSS processing
- **Autoprefixer** - Browser prefixes

### **UI Components**
- **Headless UI** - Accessible components
- **Hero Icons** - SVG icons

### **Internationalization**
- **i18next** (25.6.2) - Multi-language support
- **i18next-browser-languagedetector** - Auto language detection

### **HTTP & Data**
- **Axios** (1.6.2) - HTTP client
- **CryptoJS** (4.2.0) - Frontend encryption

---

## 🐳 **Docker Services**

### **1. PostgreSQL** (Port 5432)
```yaml
- Image: postgres:15-alpine
- Credentials: pld_user:pld_password
- Database: pld_db
- Health check: 10 soniyada bir bor
```

### **2. Redis** (Port 6379)
```yaml
- Image: redis:7-alpine
- Purpose: Task queue, caching
- Persistence: /data volume
```

### **3. Backend** (Port 8000)
```yaml
- FastAPI application
- Uvicorn server
- Auto-reload enabled
- Volume: ./backend:/app
```

### **4. Celery Worker**
```yaml
- Background job processing
- Connects to Redis & PostgreSQL
- Async task execution
```

---

## 📁 **Backend Struktura**

```
backend/
├── app/
│   ├── api/              # REST API endpoints
│   │   └── v1/           # API v1 endpoints
│   ├── core/             # Configuration, exceptions, security
│   │   ├── config.py     # Settings
│   │   ├── security.py   # JWT, password
│   │   └── exceptions.py # Custom exceptions
│   ├── models/           # SQLAlchemy database models
│   ├── schemas/          # Pydantic validation schemas
│   ├── services/         # Business logic (scanning, detection)
│   ├── utils/            # Helpers (OCR, regex, NER)
│   ├── middleware/       # Custom middleware (logging, security headers)
│   ├── db/               # Database connection
│   ├── credentials/      # OAuth credentials
│   └── celery_app.py     # Celery configuration
├── migrations/           # Database migration files (Alembic)
├── main.py               # FastAPI entry point
├── requirements.txt      # Python dependencies
└── Dockerfile            # Docker configuration
```

---

## 📁 **Frontend Struktura**

```
frontend/src/
├── components/   # Reusable React components
├── pages/        # Page components (Layout, Home, Dashboard)
├── services/     # API calls, business logic
├── contexts/     # React context (Auth, Theme)
├── hooks/        # Custom React hooks
├── i18n/         # Language files (uz, en, ru, etc.)
├── utils/        # Helper functions
├── index.css     # Global styles
├── App.js        # Main component
└── index.js      # React entry point
```

---

## 🔐 **Xavfsizlik Xususiyatlari**

✅ **JWT Authentication** - Token-based security  
✅ **Password Hashing** - bcrypt encryption  
✅ **OAuth 2.0** - Gmail integration  
✅ **HTTPS Ready** - Encrypted connections  
✅ **Rate Limiting** - Brute-force protection  
✅ **Audit Logging** - Action tracking  
✅ **CORS** - Cross-Origin requests control  
✅ **Security Headers** - XSS, CSRF protection  
✅ **Encrypted Tokens** - Secure data transmission  

---

## 📊 **Asosiy Features**

| Feature | Tavsif |
|---------|--------|
| **User Authentication** | Ro'yxatdan o'tish, login, JWT tokens |
| **Sensitive Items** | Hushyor ma'lumotlarni saqlash (emails, passwords) |
| **Email Scanning** | Gmail orqali o'chiqlash (OAuth) |
| **File Upload & OCR** | Rasm/PDF dan matnni o'qish (Tesseract) |
| **Leak Detection** | Regex + NER orqali oqib ketgan ma'lumotlarni topish |
| **Dashboard** | Topilmalar ko'rish va tahlil |
| **Notifications** | Real-time alerts |
| **Multi-language** | Uzbek, English, Russian, Korean support |
| **Background Jobs** | Celery bilan async task processing |
| **Cloud Storage** | S3/MinIO integration |

---

## 🌐 **API Endpoints**

### **Authentication**
```
POST   /api/register          # Ro'yxatdan o'tish
POST   /api/login             # Login
POST   /api/logout            # Logout
GET    /api/me                # Current user
```

### **Sensitive Items**
```
POST   /api/sensitive-items   # Yangi item qo'shish
GET    /api/sensitive-items   # Barcha items
PUT    /api/sensitive-items/{id}  # Item tahrirlash
DELETE /api/sensitive-items/{id}  # Item o'chirish
```

### **Scanning**
```
GET    /api/scans             # Barcha scanlar
POST   /api/scan/start        # Yangi scan boshlash
GET    /api/scan/{id}         # Scan status
```

### **Findings**
```
GET    /api/findings          # Barcha topilmalar
GET    /api/findings/{id}     # Topilma details
POST   /api/findings/{id}/resolve  # Topilmani yopish
```

---

## 🚀 **Ishga Tushirish**

### **Docker bilan (Tavsiya):**
```bash
cd "/Users/otabek/Desktop/Project (P)/PERSONAL_LEAK_DETECTOR3"
docker compose up -d
```

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### **Manual Installation:**

**Backend:**
```bash
cd backend

# Virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Dependencies
pip install -r requirements.txt

# Run
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend

# Dependencies
npm install

# Run
npm start
```

---

## 🔄 **Workflow**

1. **User Registration & Login**
   - Email va password bilan ro'yxatdan o'tish
   - JWT token olinadi

2. **Add Sensitive Items**
   - Email, phone raqam, password saqlash

3. **Start Scan**
   - Background job (Celery) boshlash
   - Redis queue-ga qo'shish

4. **Leak Detection**
   - Gmail API orqali matnni o'qish
   - Regex + NER orqali pattern matching
   - OCR orqali rasm/PDF'dan matnni extract qilish

5. **View Results**
   - Dashboard-da topilmalarni ko'rish
   - Findings ko'rsatish va markerlash

---

## 📝 **Environment Variables (.env)**

```env
# Database
DATABASE_URL=sqlite:///./pld.db
# Production: postgresql://user:password@host:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Gmail OAuth
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret

# Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=your-bucket
```

---

## 📦 **Dependencies Summary**

**Backend:** 26 libraries  
**Frontend:** 16 dependencies + 2 devDependencies  
**Python Version:** 3.12+  
**Node.js Version:** 18+  

---

## 🎓 **Graduation Project**

Bu loyiha **graduation project** sifatida qurilgan va quyidagi tuzatmalarni o'z ichiga oladi:
- Complete backend + frontend
- Database design va migrations
- Authentication & security
- Testing suite
- Docker containerization
- Multi-language support
- Production-ready code

---

## 📞 **Support**

**Issues yoki questions uchun:**
- Backend: `backend/` papkasidagi README
- Frontend: `frontend/` papkasidagi README
- Docs: `docs/` papkasidagi hujjatlar

---

**Last Updated:** 28 Yanvar 2026
**Project Status:** ✅ Active Development

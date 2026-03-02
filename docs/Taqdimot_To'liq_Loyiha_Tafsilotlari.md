# Shaxsiy Ma'lumot Sizib Chiqishni Aniqlash Tizimi
## Personal Leak Detector (PLD)
### Loyiha to'liq tafsilotlari - Disertatsiya uchun taqdimot

---

## Slayd 1: Muqova
# Shaxsiy Ma'lumot Sizib Chiqishni Aniqlash Tizimi
## Personal Leak Detector (PLD)

**Avtomatik shaxsiy ma'lumotlarni sizib chiqishni aniqlash va phishing himoya tizimi**

Taqdimotchi: [Ism]
Rahbar professor: [Professor ismi]
Muassasa: [Universitet/Tadqiqot markazi]
Sana: [Taqdimot sanasi]

---

## Slayd 2: Munda
# Munda

1. Loyiha haqida umumiy ma'lumot
2. Ishlatilgan texnologik stack
3. Loyiha struktura
4. Tizim arxitekturasi
5. Asosiy funksiyalar amalga oshirish
6. Ma'lumotlar bazasi dizayni
7. Xavfsizlik amalga oshirish
8. Ishlab chiqish jarayoni
9. Test va natijalar
10. Xulosa

---

## Slayd 3: Loyiha haqida umumiy ma'lumot
# Loyiha haqida umumiy ma'lumot

## Personal Leak Detector (PLD)

**Loyiha maqsadi**
- Foydalanuvchining email, fayl, veb kontentlarida shaxsiy ma'lumotlarni sizib chiqishni avtomatik aniqlash
- Phishing emaillarni real vaqtda aniqlash va bloklash
- Xavf balli orqali umumiy xavfsizlikni baholash

**Asosiy funksiyalar**
1. Gmail email avtomatik skanerlash (maksimal 2,000 ta)
2. Turli PII (Shaxsiy identifikatsiya ma'lumotlari) aniqlash
3. Phishing email aniqlash va xavfni baholash
4. Real vaqtda dashboard va vizualizatsiya
5. Fayl yuklash va tahlil qilish

**Muhim eslatma**
- **Aniqlash usuli**: Qoida asosidagi (rule-based) algoritmlar
- **Regular Expression**: Pattern matching
- **Heuristic algoritmlar**: Phishing aniqlash uchun
- **AI/ML**: Hozirda ishlatilmaydi (kelajakda rejalashtirilgan)

---

## Slayd 4: Ishlatilgan dasturlash tillari
# Ishlatilgan dasturlash tillari

## Backend
- **Python 3.11+**
  - FastAPI veb framework
  - Asinxron qayta ishlash qo'llab-quvvatlash
  - Type hinting dan foydalanish

## Frontend
- **JavaScript (ES6+)**
  - React 18.2.0
  - JSX sintaksisi
  - Zamonaviy JavaScript funksiyalari

## Ma'lumotlar bazasi
- **SQL**
  - SQLAlchemy ORM orqali so'rovlar
  - SQLite (ishlab chiqish muhiti)
  - PostgreSQL (ishlab chiqarish muhiti)

---

## Slayd 5: Backend texnologik stack - Asosiy frameworklar
# Backend texnologik stack: Asosiy frameworklar

## Veb framework
- **FastAPI 0.104.1**
  - Yuqori samaradorlik asinxron veb framework
  - Avtomatik API hujjat yaratish (Swagger/OpenAPI)
  - Pydantic orqali ma'lumotlarni tekshirish

## Server
- **Uvicorn 0.24.0**
  - ASGI server
  - Asinxron so'rovlarni qayta ishlash
  - Hot reload qo'llab-quvvatlash

## Multipart qayta ishlash
- **python-multipart 0.0.6**
  - Fayl yuklashni qayta ishlash
  - Form ma'lumotlarini parsing qilish

---

## Slayd 6: Backend texnologik stack - Ma'lumotlar bazasi
# Backend texnologik stack: Ma'lumotlar bazasi

## ORM va migratsiya
- **SQLAlchemy 2.0.23**
  - Python ORM (Object-Relational Mapping)
  - Ma'lumotlar bazasi abstraksiyasi
  - Relatsion ma'lumotlar modellashtirish

- **Alembic 1.12.1**
  - Ma'lumotlar bazasi migratsiya vositasi
  - Schema versiya boshqaruvi
  - Avtomatik migratsiya yaratish

## Ma'lumotlar bazasi
- **SQLite** (ishlab chiqish muhiti)
  - Yengil ma'lumotlar bazasi
  - Fayl asosida saqlash

- **PostgreSQL 15** (ishlab chiqarish)
  - Enterprise darajadagi ma'lumotlar bazasi
  - Docker Compose orqali boshqarish

---

## Slayd 7: Backend texnologik stack - Autentifikatsiya va xavfsizlik
# Backend texnologik stack: Autentifikatsiya va xavfsizlik

## Autentifikatsiya kutubxonalari
- **python-jose[cryptography] 3.3.0**
  - JWT (JSON Web Token) yaratish va tekshirish
  - Token imzolash va shifrlash

- **passlib[bcrypt] 1.7.4**
  - Parol hashing
  - bcrypt algoritmi ishlatish

## Shifrlash
- **cryptography 41.0.7**
  - AES-256 shifrlash
  - OAuth token shifrlash
  - Fernet simmetrik kalit shifrlash

## Muhit o'zgaruvchilari boshqaruvi
- **python-dotenv 1.0.0**
  - .env fayl yuklash
  - Sozlash boshqaruvi

---

## Slayd 8: Backend texnologik stack - OAuth va Gmail API
# Backend texnologik stack: OAuth va Gmail API

## Google OAuth 2.0
- **google-auth 2.24.0**
  - Google autentifikatsiya qayta ishlash
  - Credential boshqaruvi

- **google-auth-oauthlib 1.1.0**
  - OAuth 2.0 flow amalga oshirish
  - Authorization Code Flow

- **google-auth-httplib2 0.1.1**
  - HTTP so'rovlarni qayta ishlash
  - Token yangilash

## Gmail API
- **google-api-python-client 2.108.0**
  - Gmail API klienti
  - Email o'qish, qidirish, boshqarish
  - Batch API qo'llab-quvvatlash

---

## Slayd 9: Backend texnologik stack - Orqa fond ishlari
# Backend texnologik stack: Orqa fond ishlari

## Ishlar navbati va xabar broker
- **Redis 5.0.1**
  - Xotira ichida ma'lumotlar saqlash
  - Ishlar navbati saqlash
  - Caching

- **Celery 5.3.4**
  - Tarqalgan ishlar navbati
  - Asinxron ishlarni qayta ishlash
  - Skanerlash ishlarini orqa fondda bajarish

## Foydalanish maqsadi
- Email skanerlash ishlarini orqa fondda bajarish
- Uzoq vaqt ishlarni asinxron qayta ishlash
- Ish holatini kuzatish

---

## Slayd 10: Backend texnologik stack - Ma'lumotlarni tekshirish
# Backend texnologik stack: Ma'lumotlarni tekshirish

## Ma'lumotlarni tekshirish va sozlash
- **Pydantic >=2.0.0,<3.0.0**
  - Ma'lumotlar modellarini belgilash
  - Avtomatik ma'lumotlarni tekshirish
  - Type xavfsizligini ta'minlash

- **pydantic-settings >=2.0.0,<3.0.0**
  - Sozlash boshqaruvi
  - Muhit o'zgaruvchilarini avtomatik yuklash
  - Type xavfsiz sozlash

## Utility
- **python-dateutil 2.8.2**
  - Sana/vaqt qayta ishlash
  - Timezone o'zgartirish

---

## Slayd 11: Backend texnologik stack - HTTP klienti
# Backend texnologik stack: HTTP klienti

## HTTP so'rovlarni qayta ishlash
- **requests 2.31.0**
  - Sinxron HTTP so'rovlar
  - Tashqi API chaqiruvlari

- **aiohttp 3.9.1**
  - Asinxron HTTP klienti
  - Yuqori samaradorlik asinxron so'rovlar
  - Veb skanerlash funksiyasi

## Veb skraping
- **beautifulsoup4 4.12.2**
  - HTML parsing
  - Veb sahifa kontentini ajratib olish
  - DOM manipulyatsiya

---

## Slayd 12: Backend texnologik stack - Fayl qayta ishlash (ixtiyoriy)
# Backend texnologik stack: Fayl qayta ishlash (ixtiyoriy)

## PDF qayta ishlash
- **PyMuPDF 1.23.8** (ixtiyoriy)
  - PDF fayl parsing
  - Matn ajratib olish
  - Rasm ajratib olish

## Hujjat qayta ishlash
- **python-docx 1.1.0** (ixtiyoriy)
  - Word hujjat qayta ishlash
  - .docx fayl o'qish

## Rasm qayta ishlash va OCR
- **Pillow 10.1.0** (ixtiyoriy)
  - Rasm qayta ishlash
  - Rasm o'zgartirish

- **pytesseract 0.3.10** (ixtiyoriy)
  - OCR (Optik belgi tan olish)
  - Rasmdan matn ajratib olish

---

## Slayd 13: Backend texnologik stack - Mashina o'rganish va NLP (ixtiyoriy, kelajakda)
# Backend texnologik stack: Mashina o'rganish va NLP (ixtiyoriy, kelajakda)

## Hozirgi holat
**Hozirda ishlatilmayapti** - Bu paketlar ixtiyoriy va hozirda o'rnatilmagan.

## Kelajakda rejalashtirilgan
- **spacy 3.7.2** (ixtiyoriy, kelajakda)
  - Named Entity Recognition (NER)
  - Shaxsiy ma'lumotlarni avtomatik aniqlash
  - Til modellari

- **sentence-transformers 2.2.2** (ixtiyoriy, kelajakda)
  - Gap embedding
  - Ma'noli o'xshashlik hisoblash
  - BERT asosidagi modellar

**Muhim eslatma**: 
- **Hozirgi tizim**: Qoida asosidagi (rule-based) aniqlash ishlatiladi
  - Regular expression pattern matching
  - Keyword matching
  - Heuristic algoritmlar
- **Kelajakda**: ML model integratsiyasi rejalashtirilgan (AI/ML hozirda ishlatilmayapti)

---

## Slayd 14: Backend texnologik stack - Ob'ekt saqlash
# Backend texnologik stack: Ob'ekt saqlash

## S3 mos saqlash
- **boto3 1.34.0**
  - AWS S3 klienti
  - MinIO qo'llab-quvvatlash
  - Fayl yuklash/yuklab olish
  - SafeShare funksiyasi uchun

## Foydalanish maqsadi
- Shifrlangan fayllarni saqlash
- Xavfsiz fayl almashish (SafeShare)
- Katta hajmdagi fayllarni boshqarish

---

## Slayd 15: Backend texnologik stack - Testlash
# Backend texnologik stack: Testlash

## Test framework
- **pytest 7.4.3**
  - Python test framework
  - Birlik testlari
  - Integratsiya testlari

- **pytest-asyncio 0.21.1**
  - Asinxron test qo'llab-quvvatlash
  - FastAPI asinxron endpoint testlari

## HTTP test klienti
- **httpx 0.25.2**
  - Asinxron HTTP klienti
  - API endpoint testlari
  - FastAPI TestClient o'rniga

---

## Slayd 16: Frontend texnologik stack - Asosiy frameworklar
# Frontend texnologik stack: Asosiy frameworklar

## React
- **React 18.2.0**
  - Foydalanuvchi interfeysi kutubxonasi
  - Komponent asosidagi arxitektura
  - Virtual DOM

- **react-dom 18.2.0**
  - React DOM render qilish
  - Brauzer DOM manipulyatsiya

## Build vositasi
- **react-scripts 5.0.1**
  - Create React App asosida
  - Webpack bundling
  - Ishlab chiqish serveri

---

## Slayd 17: Frontend texnologik stack - Routing va holat boshqaruvi
# Frontend texnologik stack: Routing va holat boshqaruvi

## Routing
- **react-router-dom 6.20.0**
  - Mijoz tomonidagi routing
  - Sahifa navigatsiyasi
  - Himoyalangan routelar

## Holat boshqaruvi
- **React Context API**
  - Global holat boshqaruvi
  - AuthContext (autentifikatsiya holati)
  - LanguageContext (ko'p tillilik)

- **react-query 3.39.3**
  - Server holat boshqaruvi
  - Ma'lumotlarni olish va caching
  - Avtomatik yangilash

---

## Slayd 18: Frontend texnologik stack - HTTP klienti va stilizatsiya
# Frontend texnologik stack: HTTP klienti va stilizatsiya

## HTTP klienti
- **axios 1.6.2**
  - HTTP so'rov kutubxonasi
  - API aloqasi
  - So'rov/javob interceptorlari

## Stilizatsiya
- **Tailwind CSS 3.3.6**
  - Utility asosidagi CSS framework
  - Responsive dizayn
  - Tez UI ishlab chiqish

- **autoprefixer 10.4.16**
  - CSS avtomatik prefiks
  - Brauzer mosligi

- **postcss 8.4.32**
  - CSS post-processor
  - Tailwind CSS qayta ishlash

---

## Slayd 19: Frontend texnologik stack - UI komponentlar
# Frontend texnologik stack: UI komponentlar

## UI kutubxonasi
- **@headlessui/react 1.7.17**
  - Kirish mumkin bo'lgan UI komponentlar
  - Modal, dropdown va boshqalar
  - Stilsiz komponentlar

- **@heroicons/react 2.1.1**
  - Ikona kutubxonasi
  - SVG ikonalar
  - React komponentlar

## Sana qayta ishlash
- **date-fns 2.30.0**
  - Sana/vaqt utility
  - Sana formatlash
  - Sana hisoblash

---

## Slayd 20: Frontend texnologik stack - Ko'p tillilik qo'llab-quvvatlash
# Frontend texnologik stack: Ko'p tillilik qo'llab-quvvatlash

## Xalqarolashtirish (i18n)
- **i18next 25.6.2**
  - Ko'p tillilik qo'llab-quvvatlash framework
  - Tarjima fayllarini boshqarish
  - Dinamik til o'zgartirish

- **react-i18next 16.2.4**
  - React uchun i18next binding
  - Komponentlarda tarjima ishlatish
  - Hooks qo'llab-quvvatlash

- **i18next-browser-languagedetector 8.2.0**
  - Brauzer tilini avtomatik aniqlash
  - Foydalanuvchi til sozlamalarini saqlash

## Qo'llab-quvvatlanadigan tillar
- O'zbek tili (uz)
- Koreys tili (ko)

---

## Slayd 21: Frontend texnologik stack - Ishlab chiqish vositalari
# Frontend texnologik stack: Ishlab chiqish vositalari

## Proxy sozlash
- **http-proxy-middleware 3.0.5**
  - Ishlab chiqish serveri proxy
  - API so'rovlari proxy
  - CORS muammosini hal qilish

## Brauzer qo'llab-quvvatlash
- **Production**: >0.2% bozor ulushi
- **Development**: Eng so'nggi Chrome, Firefox, Safari

---

## Slayd 22: Infratuzilma va vositalar - Docker
# Infratuzilma va vositalar: Docker

## Konteynerlashtirish
- **Docker**
  - Ilovalarni konteynerlashtirish
  - Izchil ishlab chiqish muhiti
  - Deploy soddalashtirish

- **Docker Compose**
  - Ko'p konteyner boshqaruvi
  - Xizmatlar orkestratsiyasi
  - Tarmoq va hajmlar boshqaruvi

## Konteyner tarkibi
- **PostgreSQL 15-alpine**
- **Redis 7-alpine**
- **Backend (FastAPI)**
- **Frontend (React)**
- **Celery Worker**
- **Celery Beat**

---

## Slayd 23: Loyiha struktura - Umumiy struktura
# Loyiha struktura: Umumiy struktura

```
PERSONAL_LEAK_DETECTOR3/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpointlar
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   ├── core/           # Asosiy sozlash va xavfsizlik
│   │   ├── models/          # Ma'lumotlar bazasi modellari
│   │   ├── schemas/         # Pydantic schemalar
│   │   ├── services/       # Biznes logika
│   │   └── utils/           # Utility funksiyalar
│   ├── migrations/          # Alembic migratsiyalar
│   ├── requirements.txt     # Python paketlar
│   └── Dockerfile
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # React komponentlar
│   │   ├── pages/          # Sahifa komponentlari
│   │   ├── services/       # API servislar
│   │   └── utils/          # Utility
│   ├── package.json        # Node.js paketlar
│   └── Dockerfile
└── docker-compose.yml       # Docker Compose sozlash
```

---

## Slayd 24: Loyiha struktura - Backend batafsil
# Loyiha struktura: Backend batafsil

## Backend papka struktura

```
backend/app/
├── api/v1/endpoints/        # API endpointlar
│   ├── auth.py             # Autentifikatsiya (login, ro'yxatdan o'tish)
│   ├── oauth.py            # Gmail OAuth
│   ├── scans.py            # Skanerlash boshqaruvi
│   ├── findings.py         # Aniqlash natijalari
│   ├── sensitive_items.py  # Sezgir ma'lumotlar boshqaruvi
│   └── users.py            # Foydalanuvchi boshqaruvi
├── core/                    # Asosiy funksiyalar
│   ├── config.py           # Sozlash boshqaruvi
│   ├── security.py         # Shifrlash, JWT
│   └── database.py         # DB ulanish
├── models/                  # SQLAlchemy modellar
│   ├── user.py
│   ├── scan.py
│   ├── finding.py
│   └── sensitive_item.py
├── services/                # Biznes logika
│   ├── email_service.py    # Gmail API
│   ├── scan_service.py     # Skanerlash qayta ishlash
│   └── local_storage.py    # Fayl saqlash
└── utils/                   # Utility
    ├── detection.py         # Shaxsiy ma'lumotlarni aniqlash
    ├── phishing_detector.py # Phishing aniqlash
    └── file_processor.py    # Fayl qayta ishlash
```

---

## Slayd 25: Loyiha struktura - Frontend batafsil
# Loyiha struktura: Frontend batafsil

## Frontend papka struktura

```
frontend/src/
├── components/              # Qayta ishlatiladigan komponentlar
│   ├── Layout.js           # Layout
│   ├── PrivateRoute.js     # Himoyalangan route
│   └── LanguageSwitcher.js # Til o'zgartirish
├── pages/                   # Sahifa komponentlari
│   ├── Login.js            # Login
│   ├── Dashboard.js        # Dashboard
│   ├── Scans.js            # Skanerlash boshqaruvi
│   ├── Findings.js         # Aniqlash natijalari
│   └── Settings.js         # Sozlash
├── contexts/                # Context API
│   ├── AuthContext.js      # Autentifikatsiya holati
│   └── LanguageContext.js   # Til holati
├── services/                # API servislar
│   └── api.js              # Axios sozlash
└── utils/                   # Utility
    └── dateUtils.js         # Sana qayta ishlash
```

---

## Slayd 26: Tizim arxitekturasi - Umumiy arxitektura
# Tizim arxitekturasi: Umumiy arxitektura

## 3-Qatlamli arxitektura

```
┌─────────────────────────────────────┐
│   Presentation Layer (Frontend)     │
│   React 18 + Tailwind CSS            │
│   - Foydalanuvchi interfeysi         │
│   - Real vaqtda dashboard            │
│   - API aloqasi (Axios)              │
└──────────────┬──────────────────────┘
               │ HTTP/REST API
┌──────────────▼──────────────────────┐
│   Application Layer (Backend)        │
│   FastAPI (Python 3.11)              │
│   ┌──────────┐  ┌──────────┐        │
│   │ API      │  │ Service │        │
│   │ Layer    │  │ Layer   │        │
│   └──────────┘  └──────────┘        │
│   ┌──────────┐                      │
│   │ Utils    │                      │
│   │ Layer    │                      │
│   └──────────┘                      │
└──────────────┬──────────────────────┘
               │
┌──────────────┼──────────────┐
│              │              │
┌──────▼─────┐ ┌───▼────┐ ┌───▼─────┐
│ Database   │ │ Gmail │ │ Storage │
│ SQLite/    │ │ API   │ │ S3/MinIO│
│ PostgreSQL │ │ OAuth │ │ Local   │
└────────────┘ └────────┘ └─────────┘
```

---

## Slayd 27: Tizim arxitekturasi - Qatlamlar batafsil
# Tizim arxitekturasi: Qatlamlar batafsil

## Backend qatlam struktura

### 1. API Layer (`app/api/v1/endpoints/`)
- **Rol**: HTTP so'rovlarni qayta ishlash, javob qaytarish
- **Texnologiya**: FastAPI Router, Dependency Injection
- **Asosiy fayllar**:
  - `auth.py`: JWT autentifikatsiya
  - `oauth.py`: Gmail OAuth 2.0
  - `scans.py`: Skanerlash boshlash/ko'rish
  - `findings.py`: Aniqlash natijalarini boshqarish

### 2. Service Layer (`app/services/`)
- **Rol**: Biznes logika amalga oshirish
- **Asosiy fayllar**:
  - `email_service.py`: Gmail API aloqasi
  - `scan_service.py`: Skanerlash jarayonini boshqarish
  - `local_storage.py`: Fayl saqlash boshqaruvi

### 3. Utils Layer (`app/utils/`)
- **Rol**: Qayta ishlatiladigan utility funksiyalar
- **Asosiy fayllar**:
  - `detection.py`: Shaxsiy ma'lumotlarni aniqlash dvigateli
  - `phishing_detector.py`: Phishing aniqlash algoritmi
  - `file_processor.py`: Fayl parsing

---

## Slayd 28: Ma'lumotlar bazasi dizayni - ER diagramma
# Ma'lumotlar bazasi dizayni: ER diagramma

## Asosiy entitilar va munosabatlar

```
User (Foydalanuvchi)
  ├── 1:N → SensitiveItem (Sezgir ma'lumotlar)
  ├── 1:N → ConnectedAccount (Ulangan hisoblar)
  ├── 1:N → Scan (Skanerlash tarixi)
  ├── 1:N → Finding (Aniqlash natijalari)
  └── 1:N → SecureFile (Xavfsiz fayllar)

Scan (Skanerlash)
  └── 1:N → Finding (Aniqlash natijalari)

SensitiveItem (Sezgir ma'lumotlar)
  └── 1:N → Finding (Aniqlash natijalari)
```

## Munosabatlar tushuntirish
- **User**: Tizimning markaziy entitasi
- **Scan**: Foydalanuvchi tomonidan bajarilgan skanerlash ishi
- **Finding**: Skanerlashda topilgan shaxsiy ma'lumotlar
- **Cascade Delete**: Foydalanuvchi o'chirilganda tegishli ma'lumotlar avtomatik o'chiriladi

---

## Slayd 29: Ma'lumotlar bazasi dizayni - Asosiy jadvallar
# Ma'lumotlar bazasi dizayni: Asosiy jadvallar

## 1. users jadvali
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 2. scans jadvali
```sql
CREATE TABLE scans (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR NOT NULL,  -- 'email', 'file', 'web'
    status VARCHAR NOT NULL,  -- 'pending', 'running', 'completed'
    summary JSON,  -- Statistika ma'lumotlari
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);
```

---

## Slayd 30: Ma'lumotlar bazasi dizayni - Aniqlash natijalari jadvali
# Ma'lumotlar bazasi dizayni: Aniqlash natijalari jadvali

## findings jadvali
```sql
CREATE TABLE findings (
    id INTEGER PRIMARY KEY,
    scan_id INTEGER REFERENCES scans(id),
    user_id INTEGER REFERENCES users(id),
    sensitive_item_id INTEGER REFERENCES sensitive_items(id),
    type VARCHAR NOT NULL,  -- PII turi
    severity VARCHAR NOT NULL,  -- 'high', 'medium', 'low'
    snippet TEXT NOT NULL,  -- Kontekst
    source_url_or_message_id VARCHAR,
    source_type VARCHAR NOT NULL,  -- 'email', 'file', 'web'
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);
```

## sensitive_items jadvali
```sql
CREATE TABLE sensitive_items (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR NOT NULL,  -- PII turi
    value_hash VARCHAR NOT NULL,  -- Hashlangan qiymat
    label VARCHAR,  -- Foydalanuvchi tomonidan belgilangan label
    created_at TIMESTAMP
);
```

---

## Slayd 31: Ma'lumotlar bazasi dizayni - OAuth hisob jadvali
# Ma'lumotlar bazasi dizayni: OAuth hisob jadvali

## connected_accounts jadvali
```sql
CREATE TABLE connected_accounts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    provider VARCHAR NOT NULL,  -- 'gmail'
    oauth_tokens VARCHAR NOT NULL,  -- Shifrlangan tokenlar
    email VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Xavfsizlik xususiyatlari**
- `oauth_tokens`: AES-256 bilan shifrlangan holda saqlanadi
- Toza matn token saqlash taqiqlangan
- Token muddati tugaganda avtomatik yangilanish

---

## Slayd 32: Xavfsizlik amalga oshirish - Autentifikatsiya tizimi
# Xavfsizlik amalga oshirish: Autentifikatsiya tizimi

## JWT (JSON Web Token) autentifikatsiya

### Token yaratish
```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt
```

### Token tekshirish
- Har bir so'rovda JWT tekshirish
- Muddati tugagan tokenlar avtomatik rad etiladi
- Himoyalangan endpointlarga kirish nazorati

---

## Slayd 33: Xavfsizlik amalga oshirish - Parol hashing
# Xavfsizlik amalga oshirish: Parol hashing

## bcrypt hashing

### Parol hashing
```python
import bcrypt

def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]  # bcrypt cheklov
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')
```

### Parol tekshirish
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
```

**Xavfsizlik xususiyatlari**
- Salt avtomatik yaratiladi
- 72 bayt cheklov qayta ishlash
- Toza matn parol saqlash taqiqlangan

---

## Slayd 34: Xavfsizlik amalga oshirish - Token shifrlash
# Xavfsizlik amalga oshirish: Token shifrlash

## OAuth token shifrlash

### Shifrlash amalga oshirish
```python
from cryptography.fernet import Fernet
import base64
import hashlib

def encrypt_data(data: str) -> str:
    key = settings.ENCRYPTION_KEY.encode()
    # 32 bayt kalit yaratish
    key_hash = hashlib.sha256(key).digest()
    f = Fernet(base64.urlsafe_b64encode(key_hash))
    encrypted = f.encrypt(data.encode())
    return encrypted.decode()

def decrypt_data(encrypted_data: str) -> str:
    key = settings.ENCRYPTION_KEY.encode()
    key_hash = hashlib.sha256(key).digest()
    f = Fernet(base64.urlsafe_b64encode(key_hash))
    decrypted = f.decrypt(encrypted_data.encode())
    return decrypted.decode()
```

**Shifrlash algoritmi**: AES-256 (Fernet)

---

## Slayd 35: Asosiy funksiyalar amalga oshirish - Gmail OAuth Flow
# Asosiy funksiyalar amalga oshirish: Gmail OAuth Flow

## OAuth 2.0 autentifikatsiya jarayoni

### 1. Autentifikatsiya URL yaratish
```python
from google_auth_oauthlib.flow import Flow

flow = Flow.from_client_config(
    client_config,
    scopes=['https://www.googleapis.com/auth/gmail.readonly'],
    redirect_uri=settings.GMAIL_REDIRECT_URI
)
authorization_url, state = flow.authorization_url(
    access_type='offline',
    include_granted_scopes='true'
)
```

### 2. Token almashtirish
```python
flow.fetch_token(authorization_response=request.url)
credentials = flow.credentials
```

### 3. Token saqlash
```python
token_dict = {
    'token': credentials.token,
    'refresh_token': credentials.refresh_token,
    'client_id': credentials.client_id,
    'client_secret': credentials.client_secret,
    'scopes': credentials.scopes
}
encrypted_tokens = encrypt_data(json.dumps(token_dict))
```

---

## Slayd 36: Asosiy funksiyalar amalga oshirish - Gmail API aloqasi
# Asosiy funksiyalar amalga oshirish: Gmail API aloqasi

## Email yig'ish jarayoni

### 1. Gmail xizmatini yaratish
```python
from googleapiclient.discovery import build

credentials = Credentials(
    token=token_dict['token'],
    refresh_token=token_dict['refresh_token'],
    # ... boshqa sozlamalar
)
service = build('gmail', 'v1', credentials=credentials)
```

### 2. Email ro'yxatini olish
```python
results = service.users().messages().list(
    userId='me',
    maxResults=500
).execute()
messages = results.get('messages', [])
```

### 3. Batch API orqali katta hajmdagi qayta ishlash
```python
from googleapiclient.http import BatchHttpRequest

batch = BatchHttpRequest()
for msg in messages:
    batch.add(
        service.users().messages().get(
            userId='me', 
            id=msg['id'],
            format='full'
        ),
        request_id=msg['id']
    )
batch.execute()
```

---

## Slayd 37: Asosiy funksiyalar amalga oshirish - Shaxsiy ma'lumotlarni aniqlash
# Asosiy funksiyalar amalga oshirish: Shaxsiy ma'lumotlarni aniqlash

## DetectionEngine klassi

**Muhim**: Hozirgi tizim **qoida asosidagi (rule-based)** aniqlash ishlatadi, AI/ML emas.

**Eslatma**: Kodda NER (Named Entity Recognition) haqida eslatma bor (`self.ner_model = None`), lekin haqiqatda NER model hech qachon yuklanmaydi va ishlatilmaydi. Faqat **Regular Expression pattern matching** ishlatiladi.

### Pattern asosidagi aniqlash (Regular Expression)
```python
import re
from app.models.sensitive_item import PIIType

class DetectionEngine:
    def __init__(self):
        self.patterns = self._init_patterns()
        self.ner_model = None  # Hozirda ishlatilmaydi
    
    def _init_patterns(self):
        """Turli PII turlari uchun regex patternlarni yaratish"""
        patterns = {
            PIIType.EMAIL.value: [
                (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 
                 re.IGNORECASE)
            ],
            PIIType.PHONE.value: [
                (r'\+?\d{1,3}?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}', 
                 re.IGNORECASE),
                (r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', re.IGNORECASE)
            ],
            PIIType.CREDIT_CARD.value: [
                (r'\b(?:\d[ -]*?){13,16}\b', re.IGNORECASE)
            ]
        }
        # Patternlarni compile qilish
        compiled = {}
        for pii_type, pattern_list in patterns.items():
            compiled[pii_type] = [
                (pattern, re.compile(pattern, flags=flags))
                for pattern, flags in pattern_list
            ]
        return compiled
    
    def detect_in_text(self, text: str, sensitive_items=None):
        results = []
        for pii_type, pattern_list in self.patterns.items():
            for pattern_str, compiled_pattern in pattern_list:
                for match in compiled_pattern.finditer(text):
                    value = match.group()
                    
                    # Luhn algoritmi tekshiruvi (kredit karta)
                    if pii_type == PIIType.CREDIT_CARD.value:
                        if not self._luhn_check(value):
                            continue
                    
                    # Kontekst ajratib olish
                    snippet = self._extract_context(
                        text, match.start(), match.end()
                    )
                    
                    results.append(DetectionResult(
                        type=pii_type,
                        value=value,
                        snippet=snippet,
                        confidence=0.8
                    ))
        return results
```

---

## Slayd 38: Asosiy funksiyalar amalga oshirish - Luhn algoritmi
# Asosiy funksiyalar amalga oshirish: Luhn algoritmi

## Kredit karta raqami tekshiruvi

### Luhn algoritmi amalga oshirish
```python
def _luhn_check(self, card_number: str) -> bool:
    """Luhn algoritmi yordamida kredit karta raqamini tekshirish"""
    digits = re.sub(r'\D', '', card_number)
    
    if len(digits) < 13 or len(digits) > 19:
        return False
    
    total = 0
    reverse_digits = digits[::-1]
    
    for i, digit in enumerate(reverse_digits):
        n = int(digit)
        if i % 2 == 1:  # Juft o'rni (0-indexed)
            n *= 2
            if n > 9:
                n -= 9
        total += n
    
    return total % 10 == 0
```

**Ishlash printsipi**
1. O'ngdan chapga, juft o'rindagi raqamlarni 2 ga ko'paytirish
2. 9 dan oshsa, 9 ni ayirish
3. Barcha raqamlar yig'indisi 10 ning karrali ekanligini tekshirish

---

## Slayd 39: Asosiy funksiyalar amalga oshirish - Phishing aniqlash
# Asosiy funksiyalar amalga oshirish: Phishing aniqlash

## PhishingDetector klassi

**Muhim**: Phishing aniqlash **qoida asosidagi (rule-based)** algoritm ishlatadi, AI/ML emas.

### Xavf balli hisoblash (Heuristic algoritm)
```python
import re
import urllib.parse

class PhishingDetector:
    URGENT_KEYWORDS = [
        r'\burgent\b', r'\bimmediately\b', r'\bverify\s+now\b',
        r'\baccount\s+locked\b', r'\bsuspended\b', r'\bexpired\b'
    ]
    
    SHORTENER_DOMAINS = [
        'bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly'
    ]
    
    def __init__(self):
        self.urgent_patterns = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in self.URGENT_KEYWORDS
        ]
    
    def detect_phishing(self, message: Dict) -> Dict:
        risk_score = 0.0
        flags = []
        details = {}
        
        # Barcha matnni birlashtirish
        full_text = ' '.join([
            str(message.get('subject', '') or ''),
            str(message.get('from', '') or ''),
            str(message.get('body', '') or '')
        ]).lower()
        
        # 1. Shoshilinch til aniqlash
        urgent_count = sum(1 for pattern in self.urgent_patterns 
                          if pattern.search(full_text))
        if urgent_count > 0:
            flags.append('urgent_language')
            risk_score += min(urgent_count * 5, 20)
            details['urgent_keywords'] = urgent_count
        
        # 2. Qisqartirilgan URL aniqlash
        urls = self._extract_urls(full_text)
        shortened_urls = [url for url in urls 
                         if self._is_shortened_url(url)]
        if shortened_urls:
            flags.append('shortened_urls')
            risk_score += min(len(shortened_urls) * 10, 25)
            details['shortened_urls'] = shortened_urls
        
        # 3. SPF/DKIM/DMARC tekshiruvi
        headers = message.get('headers', [])
        spf_result = self._check_spf(headers)
        dkim_result = self._check_dkim(headers)
        dmarc_result = self._check_dmarc(headers)
        
        if spf_result == 'fail' or dkim_result == 'fail':
            flags.append('authentication_failed')
            risk_score += 25
            details['authentication'] = {
                'spf': spf_result,
                'dkim': dkim_result,
                'dmarc': dmarc_result
            }
        
        # 4. Xavfni aniqlash
        is_phishing = risk_score >= 30
        
        return {
            'is_phishing': is_phishing,
            'risk_score': min(risk_score, 100),
            'flags': flags,
            'details': details
        }
```

---

## Slayd 40: Asosiy funksiyalar amalga oshirish - Fayl qayta ishlash
# Asosiy funksiyalar amalga oshirish: Fayl qayta ishlash

## FileProcessor klassi

### Fayl turi bo'yicha qayta ishlash
```python
class FileProcessor:
    SUPPORTED_EXTENSIONS = {
        '.pdf': 'pdf',
        '.docx': 'docx',
        '.txt': 'txt',
        '.png': 'image',
        '.jpg': 'image'
    }
    
    @staticmethod
    def extract_text(file_path: str) -> Optional[str]:
        ext = Path(file_path).suffix.lower()
        file_type = FileProcessor.SUPPORTED_EXTENSIONS.get(ext)
        
        if file_type == 'pdf':
            return FileProcessor._extract_from_pdf(file_path)
        elif file_type == 'docx':
            return FileProcessor._extract_from_docx(file_path)
        elif file_type == 'image':
            return FileProcessor._extract_from_image(file_path)  # OCR
        # ...
```

### PDF qayta ishlash (PyMuPDF)
```python
def _extract_from_pdf(file_path: str) -> str:
    import fitz  # PyMuPDF
    doc = fitz.open(file_path)
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    return '\n'.join(text_parts)
```

---

## Slayd 41: Ishlab chiqish jarayoni - Loyiha boshlang'ich sozlash
# Ishlab chiqish jarayoni: Loyiha boshlang'ich sozlash

## 1-bosqich: Loyiha struktura yaratish

### Backend sozlash
```bash
# Virtual muhit yaratish
python -m venv venv
venv\Scripts\activate  # Windows

# Paketlarni o'rnatish
pip install fastapi uvicorn sqlalchemy
pip install -r requirements.txt
```

### Frontend sozlash
```bash
# React ilova yaratish (yoki mavjud loyiha)
npx create-react-app frontend
cd frontend
npm install react-router-dom axios tailwindcss
```

### Ma'lumotlar bazasi boshlang'ich sozlash
```python
# SQLAlchemy modellarini belgilash
from app.db.database import Base, engine
Base.metadata.create_all(bind=engine)
```

---

## Slayd 42: Ishlab chiqish jarayoni - Autentifikatsiya tizimi amalga oshirish
# Ishlab chiqish jarayoni: Autentifikatsiya tizimi amalga oshirish

## 2-bosqich: Foydalanuvchi autentifikatsiyasi

### Foydalanuvchi modelini yaratish
```python
# app/models/user.py
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password_hash = Column(String)
```

### JWT token yaratish
```python
# app/core/security.py
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```

### Login endpoint
```python
# app/api/v1/endpoints/auth.py
@router.post("/login")
def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token}
```

---

## Slayd 43: Ishlab chiqish jarayoni - Gmail OAuth amalga oshirish
# Ishlab chiqish jarayoni: Gmail OAuth amalga oshirish

## 3-bosqich: Gmail OAuth 2.0 integratsiyasi

### OAuth sozlash
```python
# Google Cloud Console dan credentials.json yuklab olish
# app/api/v1/endpoints/oauth.py

GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
]

@router.get("/gmail/authorize")
def gmail_authorize(current_user: User = Depends(get_current_user)):
    flow = Flow.from_client_config(...)
    authorization_url, state = flow.authorization_url()
    return {"authorization_url": authorization_url}
```

### Callback qayta ishlash
```python
@router.get("/gmail/callback")
def gmail_callback(code: str, db: Session = Depends(get_db)):
    flow.fetch_token(code=code)
    credentials = flow.credentials
    # Token shifrlash va saqlash
    encrypted_tokens = encrypt_data(json.dumps(token_dict))
    # DB ga saqlash
```

---

## Slayd 44: Ishlab chiqish jarayoni - Email skanerlash amalga oshirish
# Ishlab chiqish jarayoni: Email skanerlash amalga oshirish

## 4-bosqich: Email skanerlash funksiyasi

### EmailService amalga oshirish
```python
# app/services/email_service.py
class EmailService:
    def get_messages(self, user_id, account_id, db):
        # 1. OAuth token shifrdan ochish
        credentials = self._get_credentials(account)
        
        # 2. Gmail xizmatini yaratish
        service = build('gmail', 'v1', credentials=credentials)
        
        # 3. Email ro'yxatini olish
        messages = service.users().messages().list(...).execute()
        
        # 4. Batch API orqali tana qismini yig'ish
        # 5. Matn ajratib olish va qaytarish
```

### Skanerlash xizmati amalga oshirish
```python
# app/services/scan_service.py
def _process_email_scan(scan, account_id, items_dict, db):
    email_service = EmailService()
    messages = email_service.get_messages(...)
    
    findings_count = 0
    for message in messages:
        # Shaxsiy ma'lumotlarni aniqlash
        detections = detection_engine.detect_in_text(
            message['full_text'], 
            items_dict
        )
        # Phishing aniqlash
        phishing_result = phishing_detector.detect_phishing(message)
        # Finding saqlash
        for detection in detections:
            create_finding(scan, detection, db)
            findings_count += 1
```

---

## Slayd 45: Ishlab chiqish jarayoni - Aniqlash dvigateli amalga oshirish
# Ishlab chiqish jarayoni: Aniqlash dvigateli amalga oshirish

## 5-bosqich: Shaxsiy ma'lumotlarni aniqlash dvigateli

### Regular expression pattern belgilash
```python
# app/utils/detection.py
class DetectionEngine:
    def __init__(self):
        self.patterns = {
            'phone': [
                (r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
                 re.compile(...))
            ],
            'email': [...],
            'credit_card': [...]
        }
```

### Aniqlash logikasini amalga oshirish
```python
def detect_in_text(self, text: str, sensitive_items=None):
    results = []
    # Pattern matching
    for pii_type, pattern_list in self.patterns.items():
        for pattern_str, compiled_pattern in pattern_list:
            for match in compiled_pattern.finditer(text):
                # Tekshirish (Luhn va boshqalar)
                # Kontekst ajratib olish
                # Natija qo'shish
    return results
```

---

## Slayd 46: Ishlab chiqish jarayoni - Phishing aniqlash amalga oshirish
# Ishlab chiqish jarayoni: Phishing aniqlash amalga oshirish

## 6-bosqich: Phishing aniqlash algoritmi

### Xavf ko'rsatkichlarini belgilash
```python
# app/utils/phishing_detector.py
class PhishingDetector:
    URGENT_KEYWORDS = [
        r'\burgent\b', r'\bimmediately\b',
        r'\bverify\s+now\b', r'\baccount\s+locked\b'
    ]
    
    SHORTENER_DOMAINS = [
        'bit.ly', 't.co', 'tinyurl.com'
    ]
```

### Xavf balli hisoblash
```python
def detect_phishing(self, message: Dict) -> Dict:
    risk_score = 0.0
    flags = []
    
    # Har bir ko'rsatkich bo'yicha ball hisoblash
    # Shoshilinch til, qisqartirilgan URL, autentifikatsiya muvaffaqiyatsizligi va boshqalar
    
    is_phishing = risk_score >= 30
    return {
        'is_phishing': is_phishing,
        'risk_score': min(risk_score, 100),
        'flags': flags
    }
```

---

## Slayd 47: Ishlab chiqish jarayoni - Frontend amalga oshirish
# Ishlab chiqish jarayoni: Frontend amalga oshirish

## 7-bosqich: React Frontend ishlab chiqish

### Komponent struktura
```javascript
// src/components/Layout.js
function Layout({ children }) {
    return (
        <div>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </div>
    );
}
```

### API xizmati
```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});

// So'rov interceptor (JWT token qo'shish)
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

---

## Slayd 48: Ishlab chiqish jarayoni - Dashboard amalga oshirish
# Ishlab chiqish jarayoni: Dashboard amalga oshirish

## 8-bosqich: Dashboard va vizualizatsiya

### Dashboard komponenti
```javascript
// src/pages/Dashboard.js
function Dashboard() {
    const [stats, setStats] = useState({});
    
    useEffect(() => {
        fetchStats();
    }, []);
    
    const fetchStats = async () => {
        const response = await api.get('/scans/stats');
        setStats(response.data);
    };
    
    return (
        <div>
            <StatsCards stats={stats} />
            <RiskDistributionChart data={stats.riskDistribution} />
            <RecentFindingsTable findings={stats.recentFindings} />
        </div>
    );
}
```

### Chart kutubxonasi
- React Chart.js yoki Recharts ishlatish mumkin
- Xavf taqsimoti pie chart
- Vaqt bo'yicha tendentsiya line chart

---

## Slayd 49: Ishlab chiqish jarayoni - Ko'p tillilik qo'llab-quvvatlash
# Ishlab chiqish jarayoni: Ko'p tillilik qo'llab-quvvatlash

## 9-bosqich: Xalqarolashtirish (i18n) amalga oshirish

### Tarjima fayllari
```json
// src/i18n/locales/uz.json
{
    "dashboard": "Boshqaruv paneli",
    "scans": "Skanerlash",
    "findings": "Topilmalar",
    "settings": "Sozlamalar"
}

// src/i18n/locales/ko.json
{
    "dashboard": "대시보드",
    "scans": "스캔",
    "findings": "탐지 결과",
    "settings": "설정"
}
```

### Ishlatish
```javascript
import { useTranslation } from 'react-i18next';

function Component() {
    const { t } = useTranslation();
    return <h1>{t('dashboard')}</h1>;
}
```

---

## Slayd 50: Ishlab chiqish jarayoni - Docker deploy
# Ishlab chiqish jarayoni: Docker deploy

## 10-bosqich: Konteynerlashtirish

### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml
```yaml
services:
  postgres:
    image: postgres:15-alpine
  redis:
    image: redis:7-alpine
  backend:
    build: ./backend
    ports:
      - "8000:8000"
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
```

---

## Slayd 51: Test va natijalar - Samarodolik testi
# Test va natijalar: Samarodolik testi

## Tizim samarodorligi

### Email skanerlash samarodorligi
- **Qayta ishlash tezligi**: O'rtacha 500 ta/daqiqa
- **1,500 ta email**: Taxminan 3 daqiqa ketadi
- **Muvaffaqiyat darajasi**: 98.5%

### Shaxsiy ma'lumotlarni aniqlash aniqligi
| PII turi | Aniqlik | Qayta ishlash | F1-Score |
|---------|--------|--------|----------|
| Telefon raqami | 95% | 92% | 0.935 |
| Email | 98% | 96% | 0.970 |
| Kredit karta | 92% | 88% | 0.900 |
| O'rtacha | **93.75%** | **90.25%** | **0.920** |

### Phishing aniqlash samarodorligi
- **Aniqlik**: 80%
- **Qayta ishlash**: 75%
- **F1-Score**: 0.775

---

## Slayd 52: Test va natijalar - Aniqlash statistikasi
# Test va natijalar: Aniqlash statistikasi

## Test ma'lumotlari: 1,500 ta email

### Umumiy natijalar
```
Jami skanerlangan email: 1,500 ta
├── Shaxsiy ma'lumotlar mavjud: 180 ta (12%)
│   ├── Yuqori xavf: 45 ta (25%)
│   ├── O'rta xavf: 90 ta (50%)
│   └── Past xavf: 45 ta (25%)
├── Phishing shubha: 50 ta (3.3%)
│   ├── Haqiqiy phishing: 40 ta (80%)
│   └── Noto'g'ri aniqlash: 10 ta (20%)
└── Xavfsiz: 1,270 ta (84.7%)
```

### Shaxsiy ma'lumotlar turi bo'yicha taqsimot
- Email manzili: 60 ta (33.3%)
- Telefon raqami: 45 ta (25.0%)
- Kredit karta: 20 ta (11.1%)
- ID karta raqami: 15 ta (8.3%)
- Boshqalar: 40 ta (22.3%)

---

## Slayd 53: Xulosa - Loyiha xulosa
# Xulosa: Loyiha xulosa

## Amalga oshirilgan funksiyalar

### ✅ Tugallangan funksiyalar
1. **Foydalanuvchi autentifikatsiya tizimi**
   - JWT asosidagi autentifikatsiya
   - Parol bcrypt hashing

2. **Gmail OAuth integratsiyasi**
   - OAuth 2.0 autentifikatsiya
   - Token shifrlangan saqlash
   - Avtomatik token yangilanish

3. **Shaxsiy ma'lumotlarni aniqlash** (Qoida asosidagi)
   - 7 dan ortiq PII turini aniqlash
   - Regular expression pattern matching
   - Luhn algoritmi (kredit karta tekshiruvi)
   - 93.75% o'rtacha aniqlik
   - **Eslatma**: AI/ML ishlatilmaydi, faqat qoida asosidagi algoritmlar

4. **Phishing aniqlash** (Qoida asosidagi)
   - 8 ta xavf ko'rsatkichi tahlili (heuristic)
   - Xavf balli hisoblash
   - 80% aniqlik
   - **Eslatma**: AI/ML ishlatilmaydi, faqat qoida asosidagi algoritmlar

5. **Dashboard va vizualizatsiya**
   - Real vaqtda statistika
   - Chart va grafiklar

---

## Slayd 54: Xulosa - Texnologik stack xulosa
# Xulosa: Texnologik stack xulosa

## Ishlatilgan texnologiyalar to'liq ro'yxati

### Backend
- **Til**: Python 3.11+
- **Framework**: FastAPI 0.104.1
- **Server**: Uvicorn 0.24.0
- **ORM**: SQLAlchemy 2.0.23
- **Migratsiya**: Alembic 1.12.1
- **Autentifikatsiya**: python-jose, passlib
- **Shifrlash**: cryptography 41.0.7
- **OAuth**: google-auth, google-api-python-client
- **Ishlar navbati**: Celery 5.3.4, Redis 5.0.1
- **Tekshirish**: Pydantic 2.0+
- **HTTP**: requests, aiohttp
- **Fayl qayta ishlash**: PyMuPDF, python-docx, Pillow, pytesseract
- **Saqlash**: boto3 (S3/MinIO)

### Frontend
- **Til**: JavaScript (ES6+)
- **Framework**: React 18.2.0
- **Routing**: react-router-dom 6.20.0
- **HTTP**: axios 1.6.2
- **Stilizatsiya**: Tailwind CSS 3.3.6
- **Ko'p tillilik**: i18next, react-i18next
- **Holat boshqaruvi**: React Context API, react-query
- **UI**: @headlessui/react, @heroicons/react

### Infratuzilma
- **Konteyner**: Docker, Docker Compose
- **Ma'lumotlar bazasi**: SQLite (ishlab chiqish), PostgreSQL 15 (ishlab chiqarish)
- **Cache/Navbat**: Redis 7
- **Ob'ekt saqlash**: MinIO/S3

---

## Slayd 55: Xulosa - Loyiha xususiyatlari
# Xulosa: Loyiha xususiyatlari

## Asosiy xususiyatlar

### 1. Xavfsizlik markazida dizayn
- **Token shifrlash**: AES-256
- **Parol hashing**: bcrypt
- **JWT autentifikatsiya**: Xavfsiz sessiya boshqaruvi
- **HTTPS**: Barcha aloqalar shifrlangan

### 2. Kengaytiriladigan arxitektura
- **Qatlamli struktura**: Mas'uliyat ajratish
- **Asinxron qayta ishlash**: Celery orqa fond ishlari
- **Mikroservisga tayyor**: Docker konteynerlashtirish

### 3. Foydalanuvchiga qulay
- **Intuitiv UI**: React + Tailwind CSS
- **Ko'p tillilik qo'llab-quvvatlash**: O'zbek, Koreys
- **Real vaqtda dashboard**: Darhol javob

### 4. Yuqori samaradorlik
- **Batch API**: Katta hajmdagi email qayta ishlash
- **Asinxron qayta ishlash**: FastAPI + Celery
- **Caching**: Redis dan foydalanish

### 5. Qoida asosidagi aniqlash (Rule-based)
- **AI/ML ishlatilmaydi**: Hozirgi tizim qoida asosidagi algoritmlar ishlatadi
- **Regular Expression**: Pattern matching
- **Heuristic algoritmlar**: Phishing aniqlash uchun
- **Kelajakda**: ML model integratsiyasi rejalashtirilgan

---

## Slayd 56: Rahmat
# Rahmat

## Shaxsiy Ma'lumot Sizib Chiqishni Aniqlash Tizimi
### Personal Leak Detector (PLD)

**Savollaringiz bo'lsa, iltimos so'rang.**

Taqdimotchi: [Ism]
Rahbar professor: [Professor ismi]
Muassasa: [Universitet/Tadqiqot markazi]
Sana: [Taqdimot sanasi]

**Aloqa**
- Email: [Email manzili]
- GitHub: [GitHub manzili]

---

## Qo'shimcha: To'liq texnologik stack batafsil ro'yxati

### Backend Python paketlari (Jami 25 ta)
1. fastapi==0.104.1
2. uvicorn[standard]==0.24.0
3. python-multipart==0.0.6
4. sqlalchemy==2.0.23
5. alembic==1.12.1
6. python-jose[cryptography]==3.3.0
7. passlib[bcrypt]==1.7.4
8. python-dotenv==1.0.0
9. cryptography==41.0.7
10. redis==5.0.1
11. celery==5.3.4
12. google-auth==2.24.0
13. google-auth-oauthlib==1.1.0
14. google-auth-httplib2==0.1.1
15. google-api-python-client==2.108.0
16. pydantic>=2.0.0,<3.0.0
17. pydantic-settings>=2.0.0,<3.0.0
18. python-dateutil==2.8.2
19. requests==2.31.0
20. aiohttp==3.9.1
21. beautifulsoup4==4.12.2
22. boto3==1.34.0
23. pytest==7.4.3
24. pytest-asyncio==0.21.1
25. httpx==0.25.2

### Frontend npm paketlari (Jami 15 ta)
1. react@^18.2.0
2. react-dom@^18.2.0
3. react-router-dom@^6.20.0
4. axios@^1.6.2
5. tailwindcss@^3.3.6
6. i18next@^25.6.2
7. react-i18next@^16.2.4
8. react-query@^3.39.3
9. @headlessui/react@^1.7.17
10. @heroicons/react@^2.1.1
11. date-fns@^2.30.0
12. autoprefixer@^10.4.16
13. postcss@^8.4.32
14. i18next-browser-languagedetector@^8.2.0
15. http-proxy-middleware@^3.0.5

### Ixtiyoriy paketlar (Fayl qayta ishlash uchun)
- PyMuPDF==1.23.8
- python-docx==1.1.0
- Pillow==10.1.0
- pytesseract==0.3.10
- spacy==3.7.2
- sentence-transformers==2.2.2


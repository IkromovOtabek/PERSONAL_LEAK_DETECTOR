# Personal Leak Detector (PLD) - Loyiha Haqida Ma'lumot

## 📋 Loyiha Nima?

**Personal Leak Detector (PLD)** - bu foydalanuvchining shaxsiy ma'lumotlarining internetda (email, fayllar) oqib ketganini avtomatik aniqlovchi tizim.

### Asosiy Maqsad
- Email, fayl va veb kontentlarda shaxsiy ma'lumotlarni avtomatik aniqlash
- Phishing emaillarni real vaqtda aniqlash va bloklash
- Xavfni baholash va foydalanuvchiga xabar berish

---

## 🎯 Asosiy Funksiyalar

### 1. Gmail Email Skanerlash
- **Gmail OAuth 2.0** integratsiyasi
- **Avtomatik skanerlash**: Maksimal 2,000 ta email
- **Batch API**: 50-100 ta so'rov bir vaqtda
- **Qayta ishlash tezligi**: 500 ta/daqiqa
- **Muvaffaqiyat darajasi**: 98.5%

### 2. Shaxsiy Ma'lumotlarni Aniqlash (PII Detection)
**Muhim**: PII Detection funksiyasi mavjud, lekin **faqat xavfli emaillarda** ishlatiladi (optimizatsiya uchun).

**Qanday ishlaydi**:
- Email skanerlashda avval phishing aniqlash qilinadi
- Agar email phishing yoki yuqori xavf (risk >= 20) bo'lsa, unda PII aniqlash qilinadi
- Xavfsiz emaillarda PII aniqlash o'tkazilmaydi (samaradorlik uchun)

**7+ PII turi** aniqlash:
  - Telefon raqami (95% aniqlik)
  - Email manzili (98% aniqlik)
  - Kredit karta raqami (92% aniqlik)
  - Pasport raqami
  - ID karta raqami
  - Foydalanuvchi belgilangan sezgir ma'lumotlar

**Usul**: Qoida asosidagi (rule-based) algoritmlar
  - Regular Expression pattern matching
  - Luhn algoritmi (kredit karta tekshiruvi)

**Kod joylashuvi**: `backend/app/utils/detection.py` - DetectionEngine klassi

### 3. Phishing Aniqlash
- **8 ta xavf ko'rsatkichi** tahlili:
  - Shoshilinch til (max 20 ball)
  - Qisqartirilgan URL (max 25 ball)
  - SPF/DKIM/DMARC muvaffaqiyatsizligi (25 ball)
  - From/Reply-To nomuvofiqlik (15 ball)
  - Hisob ma'lumotlari so'rash (max 25 ball)
- **Aniqlik**: 80%
- **Xavf balli**: Risk Score >= 30 → Phishing

### 4. Fayl Skanerlash
- **Qo'llab-quvvatlanadigan formatlar**:
  - PDF (PyMuPDF)
  - DOCX (python-docx)
  - TXT
  - Rasm (OCR - Tesseract)
- **Jarayon**: Fayl yuklash → Matn ajratib olish → PII aniqlash

### 5. SafeShare (Xavfsiz Fayl Almashish)
- **Xavfsiz fayl almashish**
- **Shifrlangan saqlash**: AES-256
- **Muddatli kirish**: TTL (Time To Live)
- **Avtomatik o'chirish**
- **End-to-end shifrlash**

### 6. Dashboard
- **Real vaqtda statistika**
- **Vizualizatsiya** (grafiklar)
- **Aniqlash natijalari**
- **Xavf baholash**
- **Ko'p tillilik**: O'zbek, Koreys

---

## 🏗️ Tizim Arxitekturasi

### 3-Qatlamli Struktura

```
┌─────────────────────────────────────┐
│   Frontend Layer                   │
│   React 18 + Tailwind CSS          │
│   Dashboard, UI, Vizualizatsiya    │
└─────────────────────────────────────┘
              ↕ HTTP/REST
┌─────────────────────────────────────┐
│   Backend Layer                     │
│   FastAPI (Python 3.11+)            │
│   API, Service, Utils               │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│   Data Layer                        │
│   PostgreSQL / SQLite               │
│   Redis (Cache/Queue)               │
│   MinIO/S3 (Storage)                │
└─────────────────────────────────────┘
```

---

## 💻 Texnologik Stack va Kutubxonalar

### Dasturlash Tillari

#### 1. Python 3.11+ (Backend)
**Nima uchun tanlangan?**
- **Keng kutubxona ekosistemi**: Ma'lumotlar bazasi, shifrlash, OAuth uchun ko'p kutubxonalar
- **Oson o'rganish**: Sintaksisi sodda va tushunarli
- **Kuchli regex qo'llab-quvvatlash**: Shaxsiy ma'lumotlarni aniqlash uchun muhim
- **Asinxron qayta ishlash**: FastAPI orqali yuqori samaradorlik
- **Type hinting**: Kod sifatini yaxshilash
- **Keng qo'llab-quvvatlash**: Katta jamoaviy yordam

#### 2. JavaScript (ES6+) (Frontend)
**Nima uchun tanlangan?**
- **Veb standart**: Barcha brauzerlar qo'llab-quvvatlaydi
- **React ekosistemi**: Katta jamoaviy yordam va kutubxonalar
- **Real vaqtda yangilanish**: DOM manipulyatsiyasi oson
- **Zamonaviy funksiyalar**: Async/await, destructuring, arrow functions
- **Universal**: Frontend va backend (Node.js) da ishlatish mumkin

#### 3. SQL (Ma'lumotlar bazasi)
**Nima uchun tanlangan?**
- **Standart til**: Barcha ma'lumotlar bazalari qo'llab-quvvatlaydi
- **Kuchli so'rovlar**: Murakkab ma'lumotlarni qayta ishlash
- **Relatsion ma'lumotlar**: Jadval orasidagi munosabatlarni boshqarish

---

### Backend Kutubxonalari (Python)

#### Veb Framework va Server

**1. FastAPI 0.104.1**
- **Maqsad**: Asosiy veb framework
- **Nima uchun**: 
  - Yuqori samaradorlik (Node.js va Go bilan raqobatlasha oladi)
  - Avtomatik API hujjat yaratish (Swagger/OpenAPI)
  - Type hinting orqali avtomatik tekshirish
  - Asinxron qayta ishlash qo'llab-quvvatlash
  - Pydantic orqali ma'lumotlarni tekshirish

**2. Uvicorn 0.24.0**
- **Maqsad**: ASGI server
- **Nima uchun**: 
  - FastAPI bilan to'liq integratsiya
  - Asinxron so'rovlarni qayta ishlash
  - Hot reload (ishlab chiqishda qulay)
  - Yuqori samaradorlik

**3. python-multipart 0.0.6**
- **Maqsad**: Fayl yuklash va form ma'lumotlarini qayta ishlash
- **Nima uchun**: 
  - FastAPI uchun zarur
  - Fayl yuklash funksiyalari uchun

#### Ma'lumotlar Bazasi

**4. SQLAlchemy 2.0.23**
- **Maqsad**: ORM (Object-Relational Mapping)
- **Nima uchun**: 
  - Python kod orqali ma'lumotlar bazasiga kirish
  - SQL yozmasdan ma'lumotlar bilan ishlash
  - Turli ma'lumotlar bazalari bilan ishlash (SQLite, PostgreSQL)
  - Relatsion ma'lumotlar modellashtirish

**5. Alembic 1.12.1**
- **Maqsad**: Ma'lumotlar bazasi migratsiya vositasi
- **Nima uchun**: 
  - Schema o'zgarishlarini versiya boshqaruvi
  - Avtomatik migratsiya yaratish
  - Ma'lumotlarni saqlab qolgan holda schema yangilash

#### Autentifikatsiya va Xavfsizlik

**6. python-jose[cryptography] 3.3.0**
- **Maqsad**: JWT (JSON Web Token) yaratish va tekshirish
- **Nima uchun**: 
  - Stateless autentifikatsiya
  - Token imzolash va shifrlash
  - Xavfsiz sessiya boshqaruvi

**7. passlib[bcrypt] 1.7.4**
- **Maqsad**: Parol hashing
- **Nima uchun**: 
  - bcrypt algoritmi - eng xavfsiz parol hashing usuli
  - Avtomatik salt yaratish
  - Parollarni ochiq holda saqlashdan himoya qilish

**8. cryptography 41.0.7**
- **Maqsad**: Shifrlash (AES-256)
- **Nima uchun**: 
  - OAuth tokenlarni shifrlash (Fernet)
  - Fayllarni shifrlash (SafeShare)
  - Ma'lumotlarni xavfsiz saqlash

**9. python-dotenv 1.0.0**
- **Maqsad**: Environment variable boshqaruvi
- **Nima uchun**: 
  - .env fayl orqali sozlamalarni boshqarish
  - Maxfiy ma'lumotlarni koddan ajratish
  - Turli muhitlar uchun sozlamalar

#### OAuth va Gmail API

**10. google-auth 2.24.0**
- **Maqsad**: Google OAuth 2.0 autentifikatsiya
- **Nima uchun**: 
  - Google API'lariga kirish
  - Token yaratish va yangilash
  - Xavfsiz autentifikatsiya

**11. google-auth-oauthlib 1.1.0**
- **Maqsad**: OAuth 2.0 flow boshqaruvi
- **Nima uchun**: 
  - OAuth 2.0 protokoli amalga oshirish
  - Authorization code flow
  - Token almashish

**12. google-auth-httplib2 0.1.1**
- **Maqsad**: HTTP so'rovlar uchun autentifikatsiya
- **Nima uchun**: 
  - Google API so'rovlarida token ishlatish
  - Xavfsiz HTTP aloqalar

**13. google-api-python-client 2.108.0**
- **Maqsad**: Gmail API bilan ishlash
- **Nima uchun**: 
  - Gmail API'ga rasmiy kirish
  - Email o'qish, yuborish, boshqarish
  - Batch API orqali samarali qayta ishlash

#### Orqa Fond Ishlari

**14. Celery 5.3.4**
- **Maqsad**: Background task boshqaruvi
- **Nima uchun**: 
  - Uzoq davom etadigan ishlarni orqa fonda bajarish
  - Email skanerlash kabi og'ir ishlarni asinxron qilish
  - Task navbati boshqaruvi
  - Ko'p worker bilan parallel ishlash

**15. Redis 5.0.1**
- **Maqsad**: Cache va task queue
- **Nima uchun**: 
  - Celery uchun message broker
  - Tez-tez ishlatiladigan ma'lumotlarni cache qilish
  - Yuqori samaradorlik
  - In-memory saqlash

#### Ma'lumotlarni Tekshirish

**16. Pydantic >=2.0.0**
- **Maqsad**: Ma'lumotlarni tekshirish va serializatsiya
- **Nima uchun**: 
  - API so'rovlarini avtomatik tekshirish
  - Type validation
  - JSON serializatsiya
  - FastAPI bilan to'liq integratsiya

**17. pydantic-settings >=2.0.0**
- **Maqsad**: Sozlamalarni boshqarish
- **Nima uchun**: 
  - Environment variable'larni tekshirish
  - Type-safe sozlamalar
  - Avtomatik konvertatsiya

#### HTTP va Tarmoq

**18. requests 2.31.0**
- **Maqsad**: Synchronous HTTP so'rovlar
- **Nima uchun**: 
  - Oddiy HTTP so'rovlar
  - Tashqi API'lar bilan ishlash
  - Oson ishlatish

**19. aiohttp 3.9.1**
- **Maqsad**: Asynchronous HTTP so'rovlar
- **Nima uchun**: 
  - Asinxron HTTP klienti
  - Yuqori samaradorlik
  - Ko'p so'rovlarni parallel qayta ishlash

**20. beautifulsoup4 4.12.2**
- **Maqsad**: HTML parsing
- **Nima uchun**: 
  - HTML kontentni tahlil qilish
  - Email body'dan matn ajratib olish
  - Veb sahifalarni qayta ishlash

#### Ob'ekt Saqlash

**21. boto3 1.34.0**
- **Maqsad**: AWS S3 va MinIO bilan ishlash
- **Nima uchun**: 
  - Fayllarni bulutda saqlash
  - SafeShare funksiyasi uchun
  - S3-compatible API (MinIO ham qo'llab-quvvatlaydi)
  - Kengaytiriladigan saqlash

#### Fayl Qayta Ishlash (Ixtiyoriy)

**22. PyMuPDF (fitz)**
- **Maqsad**: PDF fayllardan matn ajratib olish
- **Nima uchun**: 
  - PDF parsing
  - Matn ekstraksiya
  - Fayl skanerlash funksiyasi uchun

**23. python-docx 1.1.0**
- **Maqsad**: Word dokumentlarini qayta ishlash
- **Nima uchun**: 
  - DOCX fayllardan matn ajratib olish
  - Fayl skanerlash funksiyasi uchun

**24. pytesseract 0.3.10**
- **Maqsad**: OCR (Optical Character Recognition)
- **Nima uchun**: 
  - Rasm fayllardan matn ajratib olish
  - Email'dagi rasmlarni tahlil qilish
  - Fayl skanerlash funksiyasi uchun

**25. Pillow 10.1.0**
- **Maqsad**: Rasm qayta ishlash
- **Nima uchun**: 
  - Rasm fayllarni ochish va qayta ishlash
  - OCR uchun rasm tayyorlash
  - Fayl skanerlash funksiyasi uchun

#### Testlash

**26. pytest 7.4.3**
- **Maqsad**: Unit va integration testlar
- **Nima uchun**: 
  - Kod sifatini tekshirish
  - Xatolarni oldindan aniqlash
  - Test-driven development

**27. pytest-asyncio 0.21.1**
- **Maqsad**: Asinxron testlar
- **Nima uchun**: 
  - FastAPI asinxron funksiyalarini test qilish
  - Async/await testlar

**28. httpx 0.25.2**
- **Maqsad**: HTTP test klienti
- **Nima uchun**: 
  - API endpoint'larni test qilish
  - Integration testlar
  - Asinxron HTTP so'rovlar

#### Utility

**29. python-dateutil 2.8.2**
- **Maqsad**: Sana va vaqt boshqaruvi
- **Nima uchun**: 
  - Sana formatlarini konvertatsiya qilish
  - Vaqt zonalarini boshqarish
  - Sana hisob-kitoblari

---

### Frontend Kutubxonalari (JavaScript/React)

#### Asosiy Framework

**1. React 18.2.0**
- **Maqsad**: UI framework
- **Nima uchun**: 
  - Komponent asosidagi arxitektura
  - Virtual DOM orqali yuqori samaradorlik
  - Katta jamoaviy yordam va kutubxonalar
  - Reusable komponentlar
  - Real vaqtda yangilanish

**2. react-dom 18.2.0**
- **Maqsad**: React komponentlarini DOM'ga render qilish
- **Nima uchun**: 
  - React bilan birga ishlaydi
  - Browser DOM bilan integratsiya

#### Routing

**3. react-router-dom 6.20.0**
- **Maqsad**: SPA (Single Page Application) routing
- **Nima uchun**: 
  - Sahifalar orasida navigatsiya
  - URL boshqaruvi
  - Protected routes (himoyalangan sahifalar)
  - Browser history boshqaruvi

#### HTTP Klienti

**4. axios 1.6.2**
- **Maqsad**: HTTP so'rovlar
- **Nima uchun**: 
  - Backend API bilan aloqa
  - Request/Response interceptors
  - Avtomatik JSON parsing
  - Error handling
  - Request cancellation

#### Stilizatsiya

**5. Tailwind CSS 3.3.6**
- **Maqsad**: Utility-first CSS framework
- **Nima uchun**: 
  - Tez UI yaratish
  - Responsive dizayn
  - Utility classlar orqali oson stilizatsiya
  - Kichik bundle size
  - Zamonaviy dizayn

**6. autoprefixer 10.4.16**
- **Maqsad**: CSS vendor prefix qo'shish
- **Nima uchun**: 
  - Barcha brauzerlar bilan moslik
  - Avtomatik prefix qo'shish

**7. postcss 8.4.32**
- **Maqsad**: CSS qayta ishlash
- **Nima uchun**: 
  - Tailwind CSS uchun zarur
  - CSS transformatsiya
  - Build jarayonida CSS optimallashtirish

#### Ko'p Tillilik

**8. i18next 25.6.2**
- **Maqsad**: Internationalization (i18n) framework
- **Nima uchun**: 
  - Ko'p tillilik qo'llab-quvvatlash
  - Tarjimalarni boshqarish
  - Dinamik til o'zgartirish
  - O'zbek va Koreys tillari

**9. react-i18next 16.2.4**
- **Maqsad**: React uchun i18next integratsiyasi
- **Nima uchun**: 
  - React komponentlarida tarjimalarni ishlatish
  - Hook'lar orqali oson integratsiya
  - Component-based tarjimalar

**10. i18next-browser-languagedetector 8.2.0**
- **Maqsad**: Brauzer tilini avtomatik aniqlash
- **Nima uchun**: 
  - Foydalanuvchi tilini avtomatik aniqlash
  - Yaxshi foydalanuvchi tajribasi

#### UI Komponentlar

**11. @headlessui/react 1.7.17**
- **Maqsad**: Accessible UI komponentlar
- **Nima uchun**: 
  - Accessibility (a11y) standartlariga rioya qilish
  - Keyboard navigation
  - Screen reader qo'llab-quvvatlash
  - Tugmalar, dropdown'lar, modal'lar

**12. @heroicons/react 2.1.1**
- **Maqsad**: SVG icon kutubxonasi
- **Nima uchun**: 
  - Zamonaviy va chiroyli iconlar
  - React komponent sifatida ishlatish
  - Kichik hajm
  - Outline va solid variantlar

#### Holat Boshqaruvi

**13. react-query 3.39.3**
- **Maqsad**: Server state boshqaruvi
- **Nima uchun**: 
  - API ma'lumotlarini cache qilish
  - Avtomatik refetch
  - Loading va error holatlarini boshqarish
  - Optimistic updates

#### Utility

**14. date-fns 2.30.0**
- **Maqsad**: Sana va vaqt boshqaruvi
- **Nima uchun**: 
  - Sana formatlash
  - Sana hisob-kitoblari
  - Vaqt zonalarini boshqarish
  - Kichik hajm (tree-shaking)

#### Development

**15. http-proxy-middleware 3.0.5**
- **Maqsad**: Development proxy
- **Nima uchun**: 
  - CORS muammolarini hal qilish
  - Development'da API proxy
  - Frontend va backend'ni ajratish

**16. react-scripts 5.0.1**
- **Maqsad**: Create React App build vositasi
- **Nima uchun**: 
  - Webpack konfiguratsiyasi
  - Hot reload
  - Build va test skriptlari
  - Zero-config setup

---

### Infratuzilma va Vositalar

#### Konteynerlashtirish

**1. Docker**
- **Maqsad**: Konteynerlashtirish
- **Nima uchun**: 
  - Turli muhitlarda bir xil ishlash
  - Oson deployment
  - Izolyatsiya
  - Resurslarni boshqarish

**2. Docker Compose**
- **Maqsad**: Ko'p konteyner boshqaruvi
- **Nima uchun**: 
  - Backend, Frontend, Database, Redis'ni birga ishga tushirish
  - Oson sozlash
  - Network va volume boshqaruvi

#### Ma'lumotlar Bazasi

**3. SQLite**
- **Maqsad**: Development ma'lumotlar bazasi
- **Nima uchun**: 
  - Oson sozlash (fayl asosida)
  - Qo'shimcha server kerak emas
  - Tez ishlab chiqish
  - Yengil va portativ

**4. PostgreSQL 15**
- **Maqsad**: Production ma'lumotlar bazasi
- **Nima uchun**: 
  - Enterprise darajadagi xavfsizlik
  - Yuqori samaradorlik
  - Katta hajmdagi ma'lumotlarni qo'llab-quvvatlash
  - ACID xususiyatlari
  - Kengaytiriladigan

#### Cache va Navbat

**5. Redis 7**
- **Maqsad**: Cache va message broker
- **Nima uchun**: 
  - Celery uchun task queue
  - Tez-tez ishlatiladigan ma'lumotlarni cache qilish
  - In-memory saqlash (juda tez)
  - Pub/Sub funksiyalari

#### Ob'ekt Saqlash

**6. MinIO**
- **Maqsad**: S3-compatible object storage
- **Nima uchun**: 
  - Local development uchun S3
  - Fayllarni saqlash
  - SafeShare funksiyasi uchun
  - Oson sozlash

**7. AWS S3**
- **Maqsad**: Production object storage
- **Nima uchun**: 
  - Kengaytiriladigan saqlash
  - Yuqori mavjudlik
  - Xavfsizlik
  - Production uchun standart

---

## 🎯 Texnologiyalarni Tanlash Sabablari

### Nima Uchun Bu Texnologiyalar?

#### Backend: Python + FastAPI
- **Yuqori samaradorlik**: Asinxron qayta ishlash orqali
- **Tez ishlab chiqish**: Keng kutubxona ekosistemi
- **Avtomatik hujjat**: Swagger/OpenAPI
- **Type safety**: Type hinting va Pydantic

#### Frontend: React
- **Komponent asosidagi**: Qayta ishlatiladigan kod
- **Katta jamoaviy yordam**: Keng ekosistema
- **Real vaqtda yangilanish**: Virtual DOM
- **Zamonaviy**: Hooks, Context API

#### Ma'lumotlar Bazasi: SQLite + PostgreSQL
- **Development**: SQLite - oson va tez
- **Production**: PostgreSQL - xavfsiz va kuchli
- **ORM**: SQLAlchemy - bir xil kod, turli DB

#### Orqa Fond: Celery + Redis
- **Asinxron ishlar**: Email skanerlash kabi og'ir ishlar
- **Scalability**: Ko'p worker bilan parallel ishlash
- **Reliability**: Task retry va error handling

#### Xavfsizlik: JWT + bcrypt + AES-256
- **JWT**: Stateless autentifikatsiya
- **bcrypt**: Eng xavfsiz parol hashing
- **AES-256**: Kuchli shifrlash algoritmi

---

## 📦 Jami Kutubxonalar Soni

- **Backend Python kutubxonalari**: 29 ta
- **Frontend npm paketlari**: 16 ta
- **Jami**: 45 ta kutubxona/paket

---

## 🔐 Xavfsizlik

### Autentifikatsiya
- **JWT**: Access Token (30 daqiqa muddat)
- **Parol**: bcrypt hashing (avtomatik salt)
- **OAuth**: Google OAuth 2.0

### Shifrlash
- **OAuth Tokenlar**: AES-256 (Fernet)
- **Fayllar**: End-to-end shifrlash
- **Ma'lumotlar**: Shifrlangan saqlash

### Xavfsizlik Choralari
- **HTTPS**: Barcha aloqalar shifrlangan
- **Rate Limiting**: So'rovlar cheklash
- **CORS**: Cross-Origin sozlash
- **Security Headers**: Xavfsizlik sarlavhalari
- **Audit Log**: Barcha amallar yozib olinadi

---

## 📊 Ma'lumotlar Bazasi

### Asosiy Jadval
- **users**: Foydalanuvchi ma'lumotlari
- **connected_accounts**: Ulangan hisoblar (OAuth tokenlar shifrlangan)
- **scans**: Skanerlash tarixi
- **findings**: Aniqlash natijalari
- **sensitive_items**: Foydalanuvchi belgilangan sezgir ma'lumotlar
- **secure_files**: Xavfsiz fayllar
- **audit_logs**: Audit log

### Munosabatlar
```
User 1:N → Scans
User 1:N → SensitiveItems
User 1:N → ConnectedAccounts
Scan 1:N → Findings
SensitiveItem 1:N → Findings
```

---

## 📈 Test Natijalari

### Test Ma'lumotlari
- **1,500 ta email** tahlil qilindi
- **3 ta Gmail hisob**
- **Davr**: 2020-2023 yillar

### Umumiy Natijalar
- **Shaxsiy ma'lumotlar**: 180 ta (12%)
- **Phishing shubha**: 50 ta (3.3%)
- **Xavfsiz**: 1,270 ta (84.7%)

### Samarodolik
- **Qayta ishlash tezligi**: 500 ta/daqiqa
- **PII aniqlash aniqlik**: 93.75%
- **Phishing aniqlash aniqlik**: 80%
- **Email skanerlash muvaffaqiyat**: 98.5%

### PII Turi Bo'yicha Taqsimot
- Email manzili: 33.3%
- Telefon raqami: 25.0%
- Kredit karta: 11.1%
- ID karta: 8.3%
- Pasport: 5.6%
- Boshqalar: 16.7%

---
------------------------------------------------------------------------------
------------------------------------------------------------------------------
## 🖥️ Frontend Sahifalar va Funksiyalar

### 1. Boshqaruv Paneli (Admin Panel)

**Maqsad**: Tizimni boshqarish va monitoring qilish uchun admin funksiyalari.

**Asosiy Funksiyalar**:
- **Foydalanuvchilar Boshqaruvi**:
  - Barcha foydalanuvchilar ro'yxati
  - Foydalanuvchi ma'lumotlarini ko'rish
  - Foydalanuvchi holatini o'zgartirish (faol/nofaol)
  - Admin huquqlarini berish/olib tashlash
  - Foydalanuvchini o'chirish
  - Parolni ko'rsatish/yashirish

- **Kirish Tarixi (Login History)**:
  - Barcha foydalanuvchilarning kirish/yozilish tarixi
  - IP manzil, vaqt, harakat turi
  - Filtrlash va qidirish
  - Audit log ko'rish

- **Statistika**:
  - Jami foydalanuvchilar soni
  - Faol foydalanuvchilar
  - Admin foydalanuvchilar
  - Tasdiqlangan foydalanuvchilar
  - Jami skanlar soni
  - Jami topilmalar soni
  - Xavfli topilmalar

- **Fayllar Boshqaruvi**:
  - SafeShare fayllarini ko'rish
  - Fayl ma'lumotlarini ko'rish
  - Fayllarni o'chirish

**Kirish**: Faqat admin huquqiga ega foydalanuvchilar kirishi mumkin.

**API Endpoints**:
- `GET /api/v1/admin/users` - Foydalanuvchilar ro'yxati
- `GET /api/v1/admin/login-history` - Kirish tarixi
- `GET /api/v1/admin/stats` - Statistika
- `PUT /api/v1/admin/users/{id}` - Foydalanuvchini yangilash
- `DELETE /api/v1/admin/users/{id}` - Foydalanuvchini o'chirish

---

### 2. Monitoring

**Maqsad**: Kompyuter diskidagi zararli fayllarni aniqlash va monitoring qilish.

**Asosiy Funksiyalar**:
- **Disk Skanerlash**:
  - Mavjud disk/partition'larni ko'rsatish
  - Disk tanlash va skanerlash
  - Maksimal chuqurlik: 5 daraja
  - Real vaqtda skanerlash progress

- **Zararli Fayllarni Aniqlash**:
  - Shubhali fayl kengaytmalarini aniqlash (.exe, .bat, .vbs, .js, .jar)
  - Fayl yo'li, hajmi, o'zgartirilgan sana ko'rsatish
  - Zararli fayllar sonini ko'rsatish

- **Fayl Amallari**:
  - Faylni Windows Explorer'da ochish
  - Faylni o'chirish
  - Fayl ma'lumotlarini ko'rish

**Xavfsizlik**: Faqat tizim foydalanuvchisi ruxsati bilan ishlaydi.

**API Endpoints**:
- `GET /api/v1/monitoring/disks` - Disk ro'yxati
- `GET /api/v1/monitoring/scan` - Disk skanerlash
- `POST /api/v1/monitoring/open-file` - Faylni ochish
- `DELETE /api/v1/monitoring/delete-file` - Faylni o'chirish

---

### 3. Skanlar (Scans)

**Maqsad**: Email va fayl skanerlashni boshqarish va natijalarni ko'rish.

**Asosiy Funksiyalar**:
- **Email Skanerlash**:
  - Gmail hisobini tanlash
  - Skanerlashni boshlash
  - Real vaqtda progress ko'rish
  - Skanerlash holatini kuzatish (running, completed, failed, cancelled)

- **Fayl Skanerlash**:
  - Fayl yuklash (PDF, DOCX, TXT, rasm)
  - Avtomatik skanerlash
  - Natijalarni ko'rish

- **Skanlar Ro'yxati**:
  - Barcha skanlar ro'yxati
  - Skan turi (email, file, web)
  - Holat (running, completed, failed, cancelled)
  - Sana va vaqt
  - Topilmalar soni
  - Progress foizi

- **Statistika**:
  - Tugallangan skanlar
  - Ishlayotgan skanlar
  - Muvaffaqiyatsiz skanlar
  - Jami topilmalar

- **Amallar**:
  - Skanerni bekor qilish
  - Skanerni o'chirish
  - Skan tafsilotlarini ko'rish

**API Endpoints**:
- `GET /api/v1/scans/` - Skanlar ro'yxati
- `POST /api/v1/scans/` - Yangi skan boshlash
- `GET /api/v1/scans/{id}` - Skan tafsilotlari
- `POST /api/v1/scans/{id}/cancel` - Skanerni bekor qilish
- `DELETE /api/v1/scans/{id}` - Skanerni o'chirish
- `POST /api/v1/scans/upload` - Fayl yuklash va skanerlash

---

### 4. Topilmalar (Findings)

**Maqsad**: Skanerlash natijalarida topilgan shaxsiy ma'lumotlar va phishing xabarlarni ko'rish va boshqarish.

**Asosiy Funksiyalar**:
- **Topilmalar Ro'yxati**:
  - Barcha topilmalar ro'yxati
  - PII turi (email, phone, credit_card, passport, id_card)
  - Phishing topilmalar
  - Severity (HIGH, MEDIUM, LOW)
  - Holat (resolved/unresolved)

- **Filtrlash**:
  - Severity bo'yicha filtrlash (all, high, medium, low)
  - Holat bo'yicha filtrlash (all, resolved, unresolved)
  - Email hisob bo'yicha filtrlash (agar bir nechta Gmail hisob bo'lsa)
  - Qidiruv

- **Topilma Ma'lumotlari**:
  - Topilgan ma'lumot (masalan, telefon raqami)
  - Kontekst (snippet)
  - Manba (email ID yoki fayl yo'li)
  - Sana va vaqt
  - Gmail'da ochish havolasi (email uchun)

- **Amallar**:
  - Topilmani "yechilgan" deb belgilash
  - Topilmani o'chirish
  - Topilma tafsilotlarini ko'rish

- **Statistika**:
  - Yechilmagan topilmalar
  - Yechilgan topilmalar
  - Jami topilmalar
  - Severity bo'yicha taqsimot

**API Endpoints**:
- `GET /api/v1/findings/` - Topilmalar ro'yxati
- `GET /api/v1/findings/{id}` - Topilma tafsilotlari
- `POST /api/v1/findings/{id}/resolve` - Topilmani yechilgan deb belgilash
- `DELETE /api/v1/findings/{id}` - Topilmani o'chirish

---

### 5. SafeShare (Xavfsiz Fayl Almashish)

**Maqsad**: Shifrlangan fayllarni xavfsiz tarzda almashish.

**Asosiy Funksiyalar**:
- **Fayl Yuklash**:
  - Fayl tanlash (maksimal 10MB)
  - Parol belgilash (ixtiyoriy)
  - Muddat belgilash (TTL - Time To Live, soatda)
  - Maksimal yuklab olishlar soni (1-100)
  - Bir marta yuklab olish rejimi

- **Shifrlash**:
  - End-to-end shifrlash (AES-256-GCM)
  - Client-side shifrlash (fayl brauzerda shifrlanadi)
  - Shifrlangan fayl S3/MinIO'ga yuklanadi
  - Shifrlash kaliti alohida saqlanadi

- **Fayl Ro'yxati**:
  - Barcha yuklangan fayllar ro'yxati
  - Fayl nomi, hajmi, yuklangan sana
  - Qolgan muddat
  - Qolgan yuklab olishlar soni
  - Holat (active, expired, deleted)

- **Havola Yaratish**:
  - Shifrlash kaliti bilan havola yaratish
  - Havolani nusxalash
  - Havolani boshqalarga yuborish

- **Fayl Yuklab Olish**:
  - Havola orqali fayl yuklab olish
  - Parol kiritish (agar belgilangan bo'lsa)
  - Shifrdan ochish (client-side)
  - Avtomatik o'chirish (muddat tugaganda yoki yuklab olishlar soni tugaganda)

- **Amallar**:
  - Faylni o'chirish
  - Fayl ma'lumotlarini ko'rish

**Xavfsizlik**:
- AES-256-GCM shifrlash
- Parol himoyasi (ixtiyoriy)
- Muddatli kirish (TTL)
- Maksimal yuklab olishlar soni cheklovi
- Avtomatik o'chirish

**API Endpoints**:
- `GET /api/v1/secure-files/` - Fayllar ro'yxati
- `POST /api/v1/secure-files/upload-request` - Yuklash so'rovi
- `POST /api/v1/secure-files/upload-complete` - Yuklash yakunlash
- `POST /api/v1/secure-files/download-request` - Yuklab olish so'rovi
- `DELETE /api/v1/secure-files/{token}` - Faylni o'chirish

**Talablar**: S3 yoki MinIO sozlangani kerak.

---

### 6. Sozlamalar (Settings)

**Maqsad**: Foydalanuvchi sozlamalarini va hisob ma'lumotlarini boshqarish.

**Asosiy Funksiyalar**:
- **Gmail Ulash**:
  - Gmail OAuth 2.0 orqali ulash
  - Bir nechta Gmail hisoblarini ulash
  - Ulangan hisoblar ro'yxati
  - Hisob holatini ko'rish (active/inactive)
  - Hisobni uzish (disconnect)

- **Profil Sozlamalari**:
  - Email manzilini o'zgartirish
  - Parolni o'zgartirish
  - Foydalanuvchi ma'lumotlarini yangilash

- **OAuth Hisoblar Boshqaruvi**:
  - Ulangan hisoblar ro'yxati
  - Hisob holatini ko'rish
  - Token holatini ko'rish
  - Hisobni uzish
  - Hisobni qayta ulash

- **Skanerlash**:
  - Gmail hisobini tanlash
  - Skanerlashni boshlash
  - Skanerlash progress'ini ko'rish
  - Skanerlashni bekor qilish

- **Til Sozlamalari**:
  - Til tanlash (O'zbek, Koreys)
  - Til sozlamalarini saqlash

**API Endpoints**:
- `GET /api/v1/auth/me` - Foydalanuvchi profili
- `PUT /api/v1/auth/me` - Profilni yangilash
- `PUT /api/v1/auth/change-password` - Parolni o'zgartirish
- `PUT /api/v1/auth/change-email` - Email o'zgartirish
- `GET /api/v1/oauth/accounts` - Ulangan hisoblar
- `GET /api/v1/oauth/gmail/authorize` - Gmail ulash
- `DELETE /api/v1/oauth/accounts/{id}` - Hisobni uzish

---

## 🚀 Qanday Ishlaydi?

### 1. Foydalanuvchi Ro'yxatdan O'tadi
- Email va parol yaratadi
- Parol bcrypt orqali hash qilinadi

### 2. Gmail Ulash
- Gmail OAuth 2.0 orqali ulash
- Token shifrlanib ma'lumotlar bazasiga saqlanadi
- Token avtomatik yangilanadi (Refresh Token)

### 3. Email Skanerlash
- Foydalanuvchi "Skanerlash boshlash" tugmasini bosadi
- Backend Gmail API orqali email yig'adi
- Batch API orqali katta hajmdagi email qayta ishlanadi
- Har bir email tahlil qilinadi

### 4. Aniqlash
- **PII Aniqlash**: Regex pattern matching
- **Phishing Aniqlash**: Heuristic algoritm
- Natijalar ma'lumotlar bazasiga saqlanadi

### 5. Dashboard
- Foydalanuvchi natijalarni ko'radi
- Grafiklar va statistikalar
- Xavf baholash

---

## 📁 Loyiha Struktura

```
PERSONAL_LEAK_DETECTOR3/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │           ├── auth.py          # Autentifikatsiya
│   │   │           ├── oauth.py         # Gmail OAuth
│   │   │           ├── scans.py         # Skanerlash
│   │   │           ├── findings.py      # Aniqlash natijalari
│   │   │           ├── sensitive_items.py  # Sezgir ma'lumotlar
│   │   │           ├── secure_files.py  # SafeShare
│   │   │           └── admin.py        # Admin panel
│   │   ├── core/        # Core config, security
│   │   ├── models/      # Database models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   │   ├── email_service.py    # Gmail API
│   │   │   ├── scan_service.py     # Skanerlash
│   │   │   └── s3_storage.py       # Fayl saqlash
│   │   └── utils/       # Utilities
│   │       ├── detection.py         # PII aniqlash
│   │       ├── phishing_detector.py  # Phishing aniqlash
│   │       └── file_processor.py     # Fayl qayta ishlash
│   ├── migrations/      # Alembic migrations
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Qayta ishlatiladigan komponentlar
│   │   ├── pages/      # Sahifa komponentlari
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Scans.js
│   │   │   ├── Findings.js
│   │   │   ├── SafeShare.js
│   │   │   └── Settings.js
│   │   ├── services/   # API xizmatlari
│   │   └── i18n/       # Ko'p tillilik
│   └── package.json
├── docker-compose.yml   # Docker sozlash
└── README.md
```

---

## 🔑 API Endpoints

### Autentifikatsiya
- `POST /api/v1/auth/register` - Ro'yxatdan o'tish
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Foydalanuvchi profili

### Gmail OAuth
- `GET /api/v1/oauth/gmail/authorize` - Gmail ulash
- `GET /api/v1/oauth/gmail/callback` - OAuth callback

### Skanerlash
- `POST /api/v1/scans/` - Yangi skanerlash boshlash
- `GET /api/v1/scans/` - Skanerlash ro'yxati
- `GET /api/v1/scans/{id}` - Skanerlash tafsilotlari

### Aniqlash Natijalari
- `GET /api/v1/findings/` - Topilmalar ro'yxati
- `GET /api/v1/findings/{id}` - Topilma tafsilotlari
- `POST /api/v1/findings/{id}/resolve` - Topilmani yopish

### Sezgir Ma'lumotlar
- `GET /api/v1/sensitive-items/` - Sezgir ma'lumotlar ro'yxati
- `POST /api/v1/sensitive-items/` - Sezgir ma'lumot qo'shish
- `DELETE /api/v1/sensitive-items/{id}` - Sezgir ma'lumot o'chirish

### SafeShare
- `POST /api/v1/secure-files/upload-request` - Fayl yuklash so'rovi
- `POST /api/v1/secure-files/upload-complete` - Fayl yuklash yakunlash
- `POST /api/v1/secure-files/download-request` - Fayl yuklab olish so'rovi

---

## ⚙️ Qanday Ishga Tushirish?

### Docker'siz (Oson Usul)

1. **Backend**:
```bash
cd backend
.\start_backend.bat  # Windows
# yoki
.\start_local.bat    # Local mode
```

2. **Frontend**:
```bash
cd frontend
npm start
```

### Docker Bilan

```bash
docker compose up -d
```

### Sozlamalar

1. **Backend**: `backend/.env` faylini yaratish
2. **Gmail OAuth**: Google Cloud Console dan Client ID va Secret olish
3. **Database**: SQLite (default) yoki PostgreSQL

---

## 📊 Loyihaning Afzalliklari

### Mavjud Tizimlar Bilan Taqqoslash

| Ko'rsatkich | Mavjud A | Mavjud B | Bizning Tizim |
|------------|---------|---------|---------------|
| Qayta ishlash tezligi | Qo'lda | 100 ta/daqiqa | **500 ta/daqiqa** |
| Aniqlik | 70% | 85% | **93.75%** |
| Phishing aniqlash | Yo'q | 60% | **80%** |
| Real vaqtda monitoring | Yo'q | Yo'q | **Mavjud** |
| Avtomatlashtirish | Yo'q | Qisman | **To'liq** |

---

## 🎓 Akademik Maqsadlar

### Disertatsiya Uchun
- **Muammo**: Shaxsiy ma'lumotlar sizib chiqish
- **Yechim**: Avtomatik aniqlash tizimi
- **Natija**: 93.75% aniqlik, 80% phishing aniqlash

### Loyihaning Yangiligi
- To'liq avtomatlashtirish
- Gmail integratsiyasi
- Qoida asosidagi yuqori aniqlik
- Real vaqtda monitoring

---

## 🔮 Kelajakdagi Ishlar

### Qisqa Muddatli (3-6 oy)
- ML model integratsiyasi (BERT)
- Real vaqtda monitoring kuchaytirish (WebSocket)
- Avtomatik skanerlash jadvali

### O'rta Muddatli (6-12 oy)
- Mobil ilova (iOS/Android)
- Turli email provayderlar (Outlook, Yahoo)
- Kengaytirilgan tahlil

### Uzoq Muddatli (12 oy+)
- Enterprise funksiyalar
- SIEM integratsiyasi
- Global kengaytirish

---

## 📝 Muhim Eslatmalar

### Aniqlash Usuli
- **Hozirgi tizim**: Qoida asosidagi (rule-based) algoritmlar
- **AI/ML**: Hozirda ishlatilmaydi
- **Kelajakda**: ML model integratsiyasi rejalashtirilgan

### Cheklovlar
- **Faqat Gmail**: Boshqa email provayderlar qo'llab-quvvatlanmaydi
- **Rasm tahlili cheklangan**: OCR funksiyasi cheklangan
- **Ko'p tillilik**: Asosan ingliz tilida

---

## 📞 Qo'shimcha Ma'lumot

- **API Hujjat**: http://localhost:8000/docs (Swagger UI)
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000

---

**Loyiha tayyor va ishlamoqda!** 🎉


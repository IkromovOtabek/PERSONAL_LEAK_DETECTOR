# Shaxsiy Ma'lumotlarni Sizib Chiqishni Aniqlash Tizimi
## Personal Leak Detector (PLD)
### Ideal PPT Struktura - 12-20 Slayd

---

## SLAYD 1: Muqova (1 slayd)

# Shaxsiy Ma'lumotlarni Sizib Chiqishni Avtomatik Aniqlash Tizimi
## Personal Leak Detector (PLD)

**Avtomatik shaxsiy ma'lumotlarni sizib chiqishni aniqlash va phishing himoya tizimi**

Taqdimotchi: [Ism]  
Rahbar professor: [Professor ismi]  
Muassasa: [Universitet/Tadqiqot markazi]  
Sana: [Taqdimot sanasi]

---

## SLAYD 2: Muammo va Zarurat (1 slayd)

# Muammo va Tadqiqot Zarurati

## Muammo
- **2023-yilda**: Millionlab shaxsiy ma'lumotlar sizib chiqish
- **O'rtacha zarar**: $4.45 million har bir hodisa
- **82% sizib chiqish**: Email orqali amalga oshiriladi
- **Phishing hujumlar**: Yiliga 15% ga o'smoqda

## Nega bu muhim?
- An'anaviy himoya vositalari yetarli emas
- Foydalanuvchi o'z ma'lumotlarini qayerda oshkor qilganini bilmaydi
- GDPR va qonunlarga rioya qilish talab qilinadi

---

## SLAYD 3: Loyiha Maqsadi (1 slayd)

# Loyiha Maqsadi

## Asosiy maqsadlar

1. **Avtomatik aniqlash**
   - Gmail email skanerlash (2,000 ta)
   - 7+ PII turini aniqlash
   - Real vaqtda monitoring

2. **Xavfni baholash**
   - Xavf balli (0-100)
   - Phishing aniqlash
   - Darhol xabar berish

3. **Foydalanuvchi qulayligi**
   - Intuitiv dashboard
   - Vizualizatsiya
   - Ko'p tillilik

---

## SLAYD 4: Adabiyotlar va Yangilik (1 slayd)

# Adabiyotlar va Loyihaning Yangiligi

## Mavjud tizimlar cheklovlari
- Qo'lda tekshirish
- Past aniqlik (70-85%)
- Phishing aniqlash yo'q
- Real vaqtda emas

## Bizning yechim
- **To'liq avtomatlashtirish**: 500 ta/daqiqa
- **Yuqori aniqlik**: 93.75%
- **Phishing aniqlash**: 80% aniqlik
- **Real vaqtda monitoring**: Dashboard

---

## SLAYD 5: Tizimning Umumiy Tavsifi (1 slayd)

# Tizim Qanday Ishlaydi?

## Jarayon (4 qadam)

```
1. Foydalanuvchi Gmail ulash
   ↓
2. Email avtomatik skanerlash
   ↓
3. Shaxsiy ma'lumotlar va phishing aniqlash
   ↓
4. Dashboard da natijalar ko'rsatish
```

## Asosiy funksiyalar
- Gmail OAuth integratsiyasi
- Email skanerlash (2,000 ta)
- PII aniqlash (7+ tur)
- Phishing aniqlash
- Real vaqtda dashboard

---

## SLAYD 6: Arxitektura - Umumiy Ko'rinish (1 slayd)

# Tizim Arxitekturasi

## 3-Qatlamli Struktura

```
┌─────────────────────────────────────┐
│   Frontend Layer                    │
│   React 18 + Tailwind CSS           │
│   Dashboard, UI, Vizualizatsiya     │
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

## SLAYD 7: Arxitektura - Texnologiyalar (1 slayd)

# Texnologik Stack

## Backend
- **Python 3.11+**: FastAPI, SQLAlchemy
- **Orqa fond ishlari**: Celery + Redis
- **OAuth**: Google OAuth 2.0
- **Shifrlash**: AES-256, bcrypt

## Frontend
- **React 18.2.0**: UI framework
- **Tailwind CSS**: Stilizatsiya
- **Axios**: HTTP klienti

## Infratuzilma
- **Docker**: Konteynerlashtirish
- **PostgreSQL**: Ma'lumotlar bazasi
- **Redis**: Cache/Navbat
- **MinIO/S3**: Fayl saqlash

---

## SLAYD 8: Algoritm - PII Aniqlash (1 slayd)

# Shaxsiy Ma'lumotlarni Aniqlash Algoritmi

## Qoida Asosidagi Aniqlash (Rule-based)

```
Matn kirish
    ↓
Regex Pattern Matching
    ↓
Luhn Algoritmi (Kredit karta)
    ↓
Kontekst Ajratib Olish
    ↓
Natija Saqlash
```

## Aniqlash Mumkin Bo'lgan PII
- Telefon raqami (95% aniqlik)
- Email manzili (98% aniqlik)
- Kredit karta (92% aniqlik)
- Pasport, ID karta

**O'rtacha aniqlik: 93.75%**

---

## SLAYD 9: Algoritm - Phishing Aniqlash (1 slayd)

# Phishing Aniqlash Algoritmi

## Heuristic Algoritm (Qoida Asosidagi)

## Xavf Ko'rsatkichlari
- Shoshilinch til (max 20 ball)
- Qisqartirilgan URL (max 25 ball)
- SPF/DKIM/DMARC muvaffaqiyatsizligi (25 ball)
- From/Reply-To nomuvofiqlik (15 ball)
- Hisob ma'lumotlari so'rash (max 25 ball)

## Xavf Balli
```
Risk Score >= 30 → Phishing
```

**Aniqlik: 80%**

---

## SLAYD 10: Dastur Modullari - Gmail Scanner (1 slayd)

# Gmail Scanner Moduli

## Funksiyalar
- Gmail OAuth 2.0 integratsiyasi
- Email avtomatik skanerlash
- Batch API (50-100 so'rov)
- Maksimal 2,000 ta email

## Jarayon
```
OAuth Token → Gmail API → Batch Processing → Tahlil
```

## Natijalar
- 500 ta/daqiqa qayta ishlash tezligi
- 98.5% muvaffaqiyat darajasi
- Real vaqtda monitoring

---

## SLAYD 11: Dastur Modullari - File Scanner (1 slayd)

# File Scanner Moduli

## Qo'llab-quvvatlanadigan Fayllar
- PDF (PyMuPDF)
- DOCX (python-docx)
- TXT
- Rasm (OCR - Tesseract)

## Jarayon
```
Fayl Yuklash → Matn Ajratib Olish → PII Aniqlash → Natija
```

## Funksiyalar
- Fayl yuklash va tahlil
- Matn ekstraksiya
- Shaxsiy ma'lumotlarni aniqlash
- Xavfni baholash

---

## SLAYD 12: Dastur Modullari - SafeShare (1 slayd)

# SafeShare Moduli

## Funksiyalar
- Xavfsiz fayl almashish
- Shifrlangan saqlash (AES-256)
- Muddatli kirish (TTL)
- Avtomatik o'chirish

## Jarayon
```
Fayl Yuklash → Shifrlash → S3/MinIO → Link Yaratish → Muddatli Kirish
```

## Xavfsizlik
- End-to-end shifrlash
- Muddatli kirish
- Avtomatik o'chirish
- Audit log

---

## SLAYD 13: Dastur Modullari - Dashboard (1 slayd)

# Dashboard Moduli

## Funksiyalar
- Real vaqtda statistika
- Vizualizatsiya (grafiklar)
- Aniqlash natijalari
- Xavf baholash

## Ko'rsatkichlar
- Skanerlangan email soni
- Aniqlangan PII turlari
- Phishing shubhalar
- Xavf taqsimoti

## Interfeys
- Intuitiv dizayn
- Ko'p tillilik (O'zbek, Koreys)
- Responsive dizayn

---

## SLAYD 14: Ma'lumotlar Bazasi (1 slayd)

# Ma'lumotlar Bazasi Dizayni

## Asosiy Jadval
- **users**: Foydalanuvchi ma'lumotlari
- **connected_accounts**: Ulangan hisoblar (OAuth)
- **scans**: Skanerlash tarixi
- **findings**: Aniqlash natijalari
- **sensitive_items**: Sezgir ma'lumotlar

## Munosabatlar
```
User 1:N → Scans
Scan 1:N → Findings
User 1:N → SensitiveItems
```

## Xususiyatlar
- Shifrlangan OAuth tokenlar
- JSON saqlash (summary)
- Audit log

---

## SLAYD 15: Xavfsizlik (1 slayd)

# Xavfsizlik Amalga Oshirish

## Autentifikatsiya
- **JWT**: Access Token (30 daqiqa)
- **Parol**: bcrypt hashing
- **OAuth**: Google OAuth 2.0

## Shifrlash
- **OAuth Tokenlar**: AES-256 (Fernet)
- **Fayllar**: End-to-end shifrlash
- **Ma'lumotlar**: Shifrlangan saqlash

## Xavfsizlik Choralari
- HTTPS barcha aloqalar
- Rate limiting
- CORS sozlash
- Security headers

---

## SLAYD 16: Natijalar va Test - Umumiy (1 slayd)

# Test Natijalari

## Test Ma'lumotlari
- **1,500 ta email** tahlil qilindi
- **3 ta Gmail hisob**
- **Davr**: 2020-2023 yillar

## Umumiy Natijalar
- Shaxsiy ma'lumotlar: 180 ta (12%)
- Phishing shubha: 50 ta (3.3%)
- Xavfsiz: 1,270 ta (84.7%)

## Samarodolik
- Qayta ishlash: 500 ta/daqiqa
- Aniqlik: 93.75%
- Phishing aniqlash: 80%

---

## SLAYD 17: Natijalar va Test - Statistikalar (1 slayd)

# Batafsil Statistikalar

## PII Turi Bo'yicha
- Email manzili: 33.3%
- Telefon raqami: 25.0%
- Kredit karta: 11.1%
- ID karta: 8.3%
- Boshqalar: 22.3%

## Xavf Taqsimoti
- Past xavf (0-30): 80.0%
- O'rta xavf (31-60): 16.7%
- Yuqori xavf (61-100): 3.3%

## Phishing Aniqlash
- Haqiqiy phishing: 80%
- Noto'g'ri aniqlash: 20%

---

## SLAYD 18: Xulosa (1 slayd)

# Xulosa

## Erishilgan Natijalar
- ✅ Avtomatik shaxsiy ma'lumotlarni aniqlash tizimi
- ✅ 93.75% o'rtacha aniqlik
- ✅ Phishing aniqlash (80% aniqlik)
- ✅ Real vaqtda dashboard

## Loyihaning Yangiligi
- To'liq avtomatlashtirish
- Gmail integratsiyasi
- Qoida asosidagi yuqori aniqlik

## Kelajakdagi Ishlar
- ML model integratsiyasi
- Real vaqtda monitoring kuchaytirish
- Mobil ilova

---

## Qo'shimcha: Diagrammalar va Rasmlar

### Slayd 5 uchun: Tizim Jarayoni Diagrammasi
```
[Foydalanuvchi] 
    ↓ Gmail ulash
[OAuth Autentifikatsiya]
    ↓ Token olish
[Gmail API]
    ↓ Email yig'ish
[Batch Processing]
    ↓ Tahlil
[PII Aniqlash] + [Phishing Aniqlash]
    ↓ Natijalar
[Dashboard]
```

### Slayd 6 uchun: Arxitektura Diagrammasi
```
┌─────────────────────────────────────┐
│   Frontend (React)                  │
│   - Dashboard                       │
│   - UI Components                   │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│   Backend (FastAPI)                 │
│   - API Endpoints                   │
│   - Services                        │
│   - Utils (Detection, Phishing)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Data Layer                        │
│   - PostgreSQL (Database)           │
│   - Redis (Cache/Queue)            │
│   - MinIO/S3 (Storage)              │
└─────────────────────────────────────┘
```

### Slayd 8 uchun: PII Aniqlash Algoritmi
```
Input: Text
    ↓
Regex Pattern Matching
    ├─ Email: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
    ├─ Phone: \+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}
    └─ Credit Card: \b(?:\d[ -]*?){13,16}\b
    ↓
Validation (Luhn for Credit Card)
    ↓
Context Extraction (100 chars)
    ↓
Output: DetectionResult
```

### Slayd 9 uchun: Phishing Aniqlash Algoritmi
```
Input: Email Message
    ↓
Text Combination (subject + from + body)
    ↓
Risk Indicators Check:
    ├─ Urgent Language: +5 per keyword (max 20)
    ├─ Shortened URL: +10 per URL (max 25)
    ├─ SPF/DKIM/DMARC Fail: +25
    ├─ From/Reply-To Mismatch: +15
    └─ Credential Request: +10 per pattern (max 25)
    ↓
Risk Score Calculation
    ↓
Risk Score >= 30 → Phishing
```

### Slayd 14 uchun: ER Diagramma
```
┌──────────┐         ┌──────────┐
│   User   │─────────│  Scan    │
└────┬─────┘   1:N   └────┬─────┘
     │                    │
     │ 1:N                │ 1:N
     │                    │
┌────▼──────────┐    ┌────▼──────────┐
│ SensitiveItem │    │   Finding    │
└───────────────┘    └──────────────┘
     │
     │ 1:N
     │
┌────▼──────────┐
│ConnectedAcct │
└──────────────┘
```

---

## PPT Dizayn Ko'rsatmalari

### Ranglar
- **Asosiy rang**: Ko'k (#2563EB) yoki To'q ko'k (#1E40AF)
- **Ikkinchi rang**: Kulrang (#6B7280)
- **Fon**: Oq yoki Och kulrang (#F9FAFB)
- **Matn**: Qora (#111827)

### Shriftlar
- **Sarlavha**: Bold, 32-36pt
- **Kichik sarlavha**: Bold, 24-28pt
- **Matn**: Regular, 18-20pt
- **Punktlar**: Regular, 16-18pt

### Dizayn Qoidalari
- Har slaydda maksimal 5-7 punkt
- Har punkt 6-10 so'zdan oshmasin
- Ko'proq diagramma, kamroq matn
- Minimalist dizayn
- Ortiqcha ranglardan qochish

---

**Jami: 18 slayd** (ideal 12-20 slayd oralig'ida)


# 🐳 Docker & PostgreSQL — Personal Leak Detector to'liq qo'llanma

Bu hujjat loyihaning **Docker** infratuzilmasi va **PostgreSQL** bazasini tushuntiradi:
nima mavjud, qanday tekshiriladi, qanday boshqariladi.

> **Eslatma:** Barcha buyruqlar VPS'da, loyiha papkasidan turib bajariladi:
> ```bash
> cd /var/www/project/PERSONAL_LEAK_DETECTOR
> ```
> Compose fayli: `docker-compose.prod.yml`. Sozlamalar: `.env.prod` (= `.env`).

---

## 1. Umumiy arxitektura

Loyiha **5 ta Docker konteyner**dan iborat (multi-service):

| Servis | Image | Vazifasi | Tashqi port |
|--------|-------|----------|-------------|
| **backend** | `personal_leak_detector-backend` (FastAPI) | API + login + agent + Gmail | `127.0.0.1:8000` (faqat localhost, nginx proxy qiladi) |
| **postgres** | `postgres:15-alpine` | Asosiy ma'lumotlar bazasi | yo'q (faqat ichki tarmoq) |
| **redis** | `redis:7-alpine` | Celery navbati / kesh | yo'q (faqat ichki tarmoq) |
| **celery_worker** | (backend image) | Fonda Gmail/scan vazifalari | — |
| **celery_beat** | (backend image) | Rejalashtirilgan vazifalar | — |

**Tarmoq:** `personal_leak_detector_default` (konteynerlar bir-biri bilan nom orqali gaplashadi: `postgres`, `redis`).
**Volume'lar (doimiy ma'lumot):** `postgres_data`, `redis_data`, `uploads`, `secure_files`.

```
            Internet (HTTPS)
                  │
              [ Nginx ]  ← SSL, static, proxy
                  │ 127.0.0.1:8000
            ┌─────────────┐
            │  backend    │──┐
            └─────────────┘  │  (ichki tarmoq)
            ┌─────────────┐  │
            │ celery_*    │──┤
            └─────────────┘  │
                  ┌──────────┴──────────┐
            ┌───────────┐          ┌─────────┐
            │ postgres  │          │  redis  │
            │ :5432     │          │ :6379   │
            └───────────┘          └─────────┘
              (postgres_data)        (redis_data)
```

---

## 2. Asosiy tekshiruv buyruqlari

### Barcha konteynerlar holati
```bash
docker compose -f docker-compose.prod.yml ps
```
Kutilgan natija — hammasi `Up`, postgres/redis `(healthy)`:
```
NAME                                     STATUS
personal_leak_detector-backend-1         Up (healthy yoki Up)
personal_leak_detector-postgres-1        Up (healthy)
personal_leak_detector-redis-1           Up (healthy)
personal_leak_detector-celery_worker-1   Up
personal_leak_detector-celery_beat-1     Up
```

### Resurs sarfi (CPU/RAM)
```bash
docker stats --no-stream
```

### Barcha Docker konteynerlar (loyihadan tashqari ham)
```bash
docker ps
```

---

## 3. Loglarni ko'rish

```bash
# Backend loglari (oxirgi 30 qator)
docker compose -f docker-compose.prod.yml logs --tail 30 backend

# Jonli kuzatish (real-time, chiqish: Ctrl+C)
docker compose -f docker-compose.prod.yml logs -f backend

# Barcha servislar
docker compose -f docker-compose.prod.yml logs --tail 50

# Celery (fon vazifalari)
docker compose -f docker-compose.prod.yml logs --tail 30 celery_worker

# PostgreSQL loglari
docker compose -f docker-compose.prod.yml logs --tail 30 postgres
```

**Sog'liq tekshiruvi (backend ishlayaptimi):**
```bash
curl http://127.0.0.1:8000/health
# {"status":"healthy","database":"connected"}
```

---

## 4. PostgreSQL bilan ishlash 🐘

PostgreSQL konteyner ichida ishlaydi, tashqariga port ochilmagan (xavfsizlik).
Unga **konteyner orqali** kiriladi.

### 4.1. psql terminaliga kirish
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db
```
Endi `pld_db=#` so'rovi chiqadi. Chiqish uchun: `\q`

### 4.2. psql ichidagi foydali buyruqlar
```sql
\l              -- barcha bazalar ro'yxati
\dt             -- jadvallar ro'yxati
\d users        -- 'users' jadvali tuzilmasi (ustunlar)
\du             -- foydalanuvchilar (rollar)
\conninfo       -- ulanish ma'lumoti
\q              -- chiqish
```

### 4.3. Loyiha jadvallari
Loyihada quyidagi jadvallar bor:

| Jadval | Mazmuni |
|--------|---------|
| `users` | Foydalanuvchilar (email, parol hash, admin, ...) |
| `sensitive_items` | Foydalanuvchi kuzatadigan maxfiy ma'lumotlar |
| `connected_accounts` | Ulangan Gmail hisoblar (shifrlangan token) |
| `scans` | Skan tarixi |
| `findings` | Topilmalar (leak natijalari) |
| `audit_logs` | Audit jurnali |
| `encrypted_files` | Shifrlangan fayllar |
| `agent_reports` | Lokal agent yuborgan disk-skan hisobotlari |

### 4.4. Tezkor so'rovlar (psql'ga kirmasdan, bitta buyruq bilan)
```bash
# Jadvallar ro'yxati
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db -c "\dt"

# Foydalanuvchilar soni
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db -c "SELECT count(*) FROM users;"

# Barcha foydalanuvchilar (email, admin)
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db -c "SELECT id, email, is_admin, created_at FROM users ORDER BY id;"

# Agent hisobotlari
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db -c "SELECT id, user_id, hostname, created_at FROM agent_reports ORDER BY created_at DESC LIMIT 10;"

# Findings (topilmalar) soni
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db -c "SELECT count(*) FROM findings;"
```

### 4.5. Baza hajmi va statistikasi
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db -c "SELECT pg_size_pretty(pg_database_size('pld_db'));"
```

---

## 5. Redis bilan ishlash

```bash
# Redis CLI'ga kirish
docker compose -f docker-compose.prod.yml exec redis redis-cli

# Ichida:
PING            -- PONG qaytaradi (ishlayapti)
KEYS *          -- barcha kalitlar
DBSIZE          -- kalitlar soni
INFO memory     -- xotira ma'lumoti
exit            -- chiqish
```

---

## 6. Volume'lar (doimiy ma'lumot)

Konteynerlar o'chsa ham ma'lumot **volume'larda** saqlanadi.

```bash
# Loyiha volume'lari ro'yxati
docker volume ls | grep personal_leak_detector

# Volume tafsiloti (qayerda saqlanishi)
docker volume inspect personal_leak_detector_postgres_data
```

| Volume | Nima saqlaydi |
|--------|---------------|
| `personal_leak_detector_postgres_data` | **Butun baza** (eng muhim!) |
| `personal_leak_detector_redis_data` | Redis kesh/navbat |
| `personal_leak_detector_uploads` | Yuklangan fayllar |
| `personal_leak_detector_secure_files` | Shifrlangan fayllar |

> ⚠️ `docker compose down -v` dagi **`-v`** volume'larni **o'chiradi** (baza yo'qoladi!). Oddiy to'xtatishda `-v` ishlatmang.

---

## 7. Backup va Restore (PostgreSQL) 💾

### 7.1. Backup olish (baza nusxasi)
```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U pld_user pld_db > /root/pld_backup_$(date +%F).sql
```
Bu `/root/pld_backup_2026-06-10.sql` faylini yaratadi.

### 7.2. Restore (nusxadan tiklash)
```bash
cat /root/pld_backup_2026-06-10.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U pld_user -d pld_db
```

### 7.3. Avtomatik kunlik backup (ixtiyoriy, cron)
```bash
crontab -e
# Quyidagini qo'shing (har kuni 03:00 da):
0 3 * * * cd /var/www/project/PERSONAL_LEAK_DETECTOR && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U pld_user pld_db > /root/pld_backup_$(date +\%F).sql
```

---

## 8. Boshqarish (start / stop / rebuild)

```bash
# Ishga tushirish (mavjud image'lar bilan)
docker compose -f docker-compose.prod.yml up -d

# To'xtatish (ma'lumot SAQLANADI)
docker compose -f docker-compose.prod.yml stop

# To'xtatish + konteynerlarni o'chirish (volume QOLADI, ma'lumot saqlanadi)
docker compose -f docker-compose.prod.yml down

# Bitta servisni qayta ishga tushirish
docker compose -f docker-compose.prod.yml restart backend

# Kod o'zgargach — qayta build + ishga tushirish
docker compose -f docker-compose.prod.yml up -d --build --force-recreate backend celery_worker celery_beat
```

### Konteyner ichiga kirish (debug uchun)
```bash
# Backend konteyner ichida bash
docker compose -f docker-compose.prod.yml exec backend bash
# Ichida: ls, env, python ... ; chiqish: exit

# Admin yaratish (skript)
docker compose -f docker-compose.prod.yml exec backend python create_admin.py
```

---

## 9. To'liq deploy sikli (kod yangilanganda)

```bash
cd /var/www/project/PERSONAL_LEAK_DETECTOR
git pull

# Backend o'zgarsa:
docker compose -f docker-compose.prod.yml up -d --build --force-recreate backend celery_worker celery_beat

# Frontend o'zgarsa:
cd frontend && npm run build && cd ..
cp agent/pld_agent.py frontend/build/pld_agent.py   # agent skript yangilansa

# Tekshirish:
docker compose -f docker-compose.prod.yml ps
curl http://127.0.0.1:8000/health
```

---

## 10. Muammolarni bartaraf etish (Troubleshooting)

| Belgi | Tekshirish | Yechim |
|-------|-----------|--------|
| Sayt ochilmayapti | `docker compose ... ps` | `Up` emasmi? `logs backend` ni ko'ring |
| Backend qayta-qayta o'chyapti | `logs --tail 50 backend` | Xato matnini o'qing (kod/env) |
| Baza ulanmayapti | `logs postgres` + `/health` | postgres `healthy`mi? `.env` paroli mosmi? |
| `WARN ... variable not set` | `.env` bormi? | `cp .env.prod .env` |
| Disk to'ldi | `df -h` va `docker system df` | `docker system prune` (ehtiyot bo'ling) |
| Eski kod ishlayapti | `git log --oneline -1` | `git pull` + `--build --force-recreate` |

### Foydali tashxis buyruqlari
```bash
docker system df                 # Docker disk sarfi
df -h                            # VPS disk holati
free -h                          # RAM/Swap
docker compose -f docker-compose.prod.yml top    # konteyner jarayonlari
```

> ⚠️ **`docker system prune -a`** ishlatishda ehtiyot bo'ling — ishlatilmayotgan image'larni o'chiradi (qayta build kerak bo'ladi). Volume'larga tegmaydi (`--volumes` qo'shmasangiz).

---

## 11. Tezkor shpargalka (eng ko'p ishlatiladigan)

```bash
cd /var/www/project/PERSONAL_LEAK_DETECTOR

docker compose -f docker-compose.prod.yml ps                          # holat
docker compose -f docker-compose.prod.yml logs -f backend             # loglar
docker compose -f docker-compose.prod.yml restart backend             # restart
docker compose -f docker-compose.prod.yml exec postgres psql -U pld_user -d pld_db   # baza
curl http://127.0.0.1:8000/health                                     # sog'liq
```

---

> 📌 **Xavfsizlik:** `.env.prod` da parollar bor — uni hech kimga bermang, git'ga qo'shmang (allaqachon `.gitignore` da).
> PostgreSQL va Redis tashqi portsiz (faqat ichki tarmoq) — internetdan to'g'ridan-to'g'ri kirib bo'lmaydi.

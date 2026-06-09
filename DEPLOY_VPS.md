# 🚀 Deploy — myleakdetector.org (VPS + Cloudflare)

Personal Leak Detector loyihasini VPS'ga chiqarish va `myleakdetector.org` domeniga ulash.

**Arxitektura:** Docker Compose (backend + postgres + redis + celery) + host Nginx (frontend static + SSL).
Hammasi **bitta domen** ostida: `https://myleakdetector.org` (UI) va `https://myleakdetector.org/api/...` (API).

---

## 0. Talablar (VPS, Ubuntu 22.04+)
```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sh
# Nginx, Certbot, Node (frontend build uchun), git
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx git
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 1. Kodni VPS'ga olish
```bash
sudo mkdir -p /var/www/myleakdetector && sudo chown $USER:$USER /var/www/myleakdetector
cd /var/www/myleakdetector
git clone https://github.com/IkromovOtabek/PERSONAL_LEAK_DETECTOR.git .
```

## 2. Production .env tayyorlash
```bash
cp .env.prod.example .env.prod
# Kalitlarni yarating:
openssl rand -hex 32   # -> SECRET_KEY
openssl rand -hex 16   # -> ENCRYPTION_KEY (yoki o'zingiz 32 belgili matn)
nano .env.prod         # CHANGE_ME larni to'ldiring (DB parol, kalitlar, Gmail OAuth)
```

## 3. Backend + DB + Celery ni ishga tushirish (Docker)
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml ps          # holatni ko'rish
curl http://127.0.0.1:8000/health                      # {"status":"healthy"} bo'lishi kerak
```

## 4. Frontend'ni build qilish (host nginx beradi)
```bash
cd /var/www/myleakdetector/frontend
# API manzilini domenga qarating (axios shu URL + /api ishlatadi):
echo "REACT_APP_API_URL=https://myleakdetector.org" > .env.production
npm install
npm run build        # natija: frontend/build/
cd ..
```

## 5. Nginx sozlash
```bash
sudo cp deploy/nginx-myleakdetector.conf /etc/nginx/sites-available/myleakdetector
sudo ln -s /etc/nginx/sites-available/myleakdetector /etc/nginx/sites-enabled/
sudo nginx -t
```
> ⚠️ Birinchi marta SSL sertifikat yo'q, shuning uchun `nginx -t` ssl qatorida xato berishi mumkin.
> Avval DNS'ni (6-bo'lim) sozlang, keyin certbot sertifikat oladi (7-bo'lim), shundan keyin reload.

---

## 6. ⭐ DNS records — Cloudflare (`myleakdetector.org`)

VPS IP'ni oling:
```bash
curl -4 ifconfig.me
```

Cloudflare dashboard → `myleakdetector.org` → **DNS → Records → Add record**:

| Type | Name (Host) | Content (VPS IP) | Proxy status | TTL  |
|------|-------------|------------------|--------------|------|
| A    | `@`         | `SIZNING_VPS_IP` | 🟠 Proxied   | Auto |
| A    | `www`       | `SIZNING_VPS_IP` | 🟠 Proxied   | Auto |

- `@` = `myleakdetector.org`, `www` = `www.myleakdetector.org`.
- **Subdomen (`api.`) KERAK EMAS** — API bir xil domen ostida `/api` da.
- **SSL/TLS → Overview → "Full (strict)"** ni tanlang (Flexible QO'YMANG — redirect loop beradi).

---

## 7. SSL sertifikat (Let's Encrypt)

🟠 Cloudflare proxy yoqilganda certbot HTTP-01 tekshiruvi to'silishi mumkin. Ikki variant:

**A) Oson:** sertifikat olish vaqtida `www` va `@` ni vaqtincha 🔘 **DNS only** (kulrang) qiling →
```bash
sudo certbot --nginx -d myleakdetector.org -d www.myleakdetector.org
```
→ keyin Cloudflare'da qayta 🟠 **Proxied** qiling.

**B) Toza:** Cloudflare **Origin Certificate** yarating (15 yil), nginx'ga qo'ying, SSL mode "Full (strict)".

So'ng:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Gmail OAuth (agar ishlatilsa)
Google Cloud Console → Credentials → OAuth Client → **Authorized redirect URIs** ga qo'shing:
```
https://myleakdetector.org/api/v1/oauth/gmail/callback
```
Bu qiymat `.env.prod` dagi `GMAIL_REDIRECT_URI` bilan AYNAN bir xil bo'lishi shart.

---

## 9. Tekshirish
```bash
curl -I https://myleakdetector.org           # 200, UI ochiladi
curl https://myleakdetector.org/health        # {"status":"healthy"}
curl https://myleakdetector.org/docs          # FastAPI Swagger
```

---

## 🔄 Yangilanish (keyingi deploy'lar)
```bash
cd /var/www/myleakdetector
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build   # backend
cd frontend && npm install && npm run build && cd ..                            # frontend
sudo systemctl reload nginx
```

## 🛠 Foydali buyruqlar
```bash
docker compose -f docker-compose.prod.yml logs -f backend      # backend loglari
docker compose -f docker-compose.prod.yml logs -f celery_worker
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml down                 # to'xtatish
```

---

## ⚠️ Prod oldidan tavsiyalar (xavfsizlik)
- `backend/app/core/config.py` → `CORS_ORIGINS` dan `"*"` ni olib tashlab, faqat
  `https://myleakdetector.org` qoldiring (`allow_credentials=True` bilan `"*"` xavfli).
- `backend/app/core/config.py` → `ALLOWED_HOSTS` ni `["myleakdetector.org", "www.myleakdetector.org"]` qiling.
- `SECRET_KEY` va `ENCRYPTION_KEY` ni albatta almashtiring (default qiymat bilan qoldirmang).
- `.env.prod` ni hech qachon git'ga qo'shmang (`.gitignore` da `.env*` bor — tekshiring).

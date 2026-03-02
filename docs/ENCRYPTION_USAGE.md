# AES-256 Encryption/Decryption Tizimi

Bu loyiha AES-256-CBC algoritmidan foydalangan holda ikki tomonlama shifrlash tizimini qo'llab-quvvatlaydi.

## 📋 Talablar

### Frontend
- `crypto-js` kutubxonasi (package.json'ga qo'shildi)
- Environment variable: `REACT_APP_ENCRYPTION_KEY` (ixtiyoriy, default: config'dan)

### Backend
- `cryptography` kutubxonasi (allaqachon requirements.txt'da)
- Environment variable: `ENCRYPTION_KEY` (config.py'da mavjud)

## 🔑 Secret Key Sozlash

### Frontend (.env fayl)
```env
REACT_APP_ENCRYPTION_KEY=your-32-byte-secret-key-here!
```

### Backend (.env fayl)
```env
ENCRYPTION_KEY=your-32-byte-secret-key-here!
```

**⚠️ MUHIM:** Frontend va Backend bir xil key ishlatishi kerak!

## 📝 Foydalanish

### 1. String Shifrlash va Yuborish

```javascript
import { sendEncryptedString } from '../services/encryptedApi';

// String shifrlash va yuborish
const plaintext = "Bu maxfiy ma'lumot";
const response = await sendEncryptedString(plaintext);
console.log(response);
```

### 2. Fayl Shifrlash va Yuborish

```javascript
import { sendEncryptedFile } from '../services/encryptedApi';

// Fayl shifrlash va yuborish
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const response = await sendEncryptedFile(file);
console.log(response);
```

### 3. JSON Object Shifrlash va Yuborish

```javascript
import { sendEncryptedJSON } from '../services/encryptedApi';

// JSON object shifrlash va yuborish
const data = {
  name: "John Doe",
  email: "john@example.com",
  secret: "maxfiy ma'lumot"
};
const response = await sendEncryptedJSON(data);
console.log(response);
```

### 4. To'g'ridan-to'g'ri Shifrlash (API'siz)

```javascript
import { encryptString, encryptFile, encryptJSON } from '../utils/encryption';

// String shifrlash
const encrypted = encryptString("Bu maxfiy matn");

// Fayl shifrlash
const file = document.querySelector('input[type="file"]').files[0];
const encryptedFile = await encryptFile(file);

// JSON shifrlash
const encryptedJSON = encryptJSON({ key: "value" });
```

## 🔓 Backend'da Shifrlangan Ma'lumotni Ochish

### Endpoint: `POST /api/v1/encryption/decrypt`

**Request:**
```json
{
  "encrypted_data": "base64-encoded-encrypted-data",
  "metadata": {
    "type": "string",  // "string", "file", yoki "json"
    "filename": "example.pdf",  // faqat file uchun
    "mimeType": "application/pdf"  // faqat file uchun
  },
  "encryption": "AES-256-CBC"
}
```

**Response:**
```json
{
  "success": true,
  "message": "String data decrypted successfully",
  "data_type": "string",
  "metadata": {
    "decrypted_data": "Bu maxfiy matn"
  }
}
```

### Python'da To'g'ridan-to'g'ri Foydalanish

```python
from app.core.encryption import decrypt_string, decrypt_file, decrypt_json, decrypt_payload

# String ochish
encrypted_data = "base64-encoded-data"
decrypted = decrypt_string(encrypted_data)

# Fayl ochish
file_bytes = decrypt_file(encrypted_data)

# JSON ochish
json_data = decrypt_json(encrypted_data)

# Payload ochish (avtomatik type detection)
payload = {
    "encrypted_data": encrypted_data,
    "metadata": {"type": "string"}
}
result = decrypt_payload(payload)
```

## 📄 To'liq Misol: Fayl Yuborish va Qayta Ishlash

### Frontend (React)

```javascript
import React, { useState } from 'react';
import { sendEncryptedFileForScan } from '../services/encryptedApi';

function FileUploadComponent() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      const response = await sendEncryptedFileForScan(file);
      setResult(response);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Yuborilmoqda...' : 'Shifrlash va Yuborish'}
      </button>
      {result && (
        <div>
          <p>Natija: {result.message}</p>
          <p>Fayl hajmi: {result.file_info.size} bytes</p>
        </div>
      )}
    </form>
  );
}
```

### Backend (FastAPI)

```python
from app.api.v1.endpoints.encryption import decrypt_and_scan_file
from app.core.encryption import decrypt_file

# Endpoint allaqachon mavjud: /api/v1/encryption/decrypt-and-scan
# Siz faqat faylni qayta ishlash logikasini qo'shishingiz kerak
```

## 🔒 Xavfsizlik Eslatmalari

1. **Secret Key:** Production'da kuchli, random 32-byte key ishlating
2. **HTTPS:** Har doim HTTPS orqali ma'lumot yuboring
3. **Key Management:** Secret key'ni environment variable sifatida saqlang
4. **IV (Initialization Vector):** Har bir shifrlash uchun yangi IV ishlatiladi (avtomatik)

## 🧪 Test Qilish

### Frontend Test

```javascript
import { encryptString, decryptString } from '../utils/encryption';

const plaintext = "Test ma'lumot";
const encrypted = encryptString(plaintext);
console.log('Shifrlangan:', encrypted);

// Frontend'da decrypt yo'q (faqat backend'da)
// Lekin siz backend'ga yuborib test qilishingiz mumkin
```

### Backend Test

```python
from app.core.encryption import encrypt_string, decrypt_string

plaintext = "Test ma'lumot"
encrypted = encrypt_string(plaintext)  # Bu funksiya yo'q, faqat decrypt mavjud
decrypted = decrypt_string(encrypted)
assert decrypted == plaintext
```

## 📚 API Endpoints

- `POST /api/v1/encryption/decrypt` - Shifrlangan ma'lumotni ochish
- `POST /api/v1/encryption/decrypt-and-scan` - Shifrlangan faylni ochish va skanerlash

## ⚠️ Eslatmalar

1. **Key Uzunligi:** Key 32 byte (256 bit) bo'lishi kerak. Agar qisqa bo'lsa, avtomatik to'ldiriladi.
2. **IV:** Har bir shifrlash uchun yangi IV yaratiladi (xavfsizlik uchun).
3. **Padding:** PKCS7 padding ishlatiladi.
4. **Format:** Shifrlangan ma'lumot base64 formatida yuboriladi.


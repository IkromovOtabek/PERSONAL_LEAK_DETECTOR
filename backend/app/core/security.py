from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings
from app.core.timezone import kst_now
import base64
import hashlib
import bcrypt

# Passlib'ning ichki test parol muammolaridan qochish uchun bcrypt'ni to'g'ridan-to'g'ri ishlatish
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__ident="2b")

def _truncate_password(password: str) -> str:
    """Parolni bcrypt mosligi uchun maksimal 72 baytga qisqartirish."""
    if not password:
        return password
    
    password_bytes = password.encode('utf-8')
    byte_length = len(password_bytes)
    
    # Agar parol allaqachon 72 bayt yoki undan kam bo'lsa, o'z holatida qaytarish
    if byte_length <= 72:
        return password
    
    # 72 baytga qisqartirish
    password_bytes = password_bytes[:72]
    
    # Oxiridagi to'liq bo'lmagan UTF-8 ketma-ketliklarini olib tashlash
    # UTF-8 davom etuvchi baytlar 0x80-0xBF (0b10xxxxxx) bilan boshlanadi
    while password_bytes and (password_bytes[-1] & 0xC0) == 0x80:
        password_bytes = password_bytes[:-1]
    
    # Qayta string'ga decode qilish
    truncated = password_bytes.decode('utf-8', errors='ignore')
    
    # Yakuniy tekshiruv - decode qilgandan keyin hali ham <= 72 bayt ekanligini ta'minlash
    final_bytes = truncated.encode('utf-8')
    if len(final_bytes) > 72:
        # Agar hali ham juda uzun bo'lsa, yanada agressiv qisqartirish
        truncated = final_bytes[:72].decode('utf-8', errors='ignore')
    
    return truncated

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Parolni uning hash'i bilan tekshirish."""
    # Kirish ma'lumotlarini tekshirish
    if not plain_password or not hashed_password:
        return False
    
    # Parolni tozalash (bosh va oxiridagi bo'shliqlarni olib tashlash)
    plain_password = plain_password.strip()
    if not plain_password:
        return False
    
    # Bcrypt 72 bayt chekloviga ega, shuning uchun kerak bo'lsa qisqartiramiz
    plain_password = _truncate_password(plain_password)
    try:
        # Bcrypt'ni to'g'ridan-to'g'ri ishlatish
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        # hashed_password'ning bytes ekanligini ta'minlash
        if isinstance(hashed_password, str):
            hashed_bytes = hashed_password.encode('utf-8')
        else:
            hashed_bytes = hashed_password
        
        # Parolni tekshirish
        result = bcrypt.checkpw(password_bytes, hashed_bytes)
        return bool(result)  # Boolean qaytarishini ta'minlash
    except Exception as e:
        # Debug uchun xatoni log qilish
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"bcrypt tekshiruvi muvaffaqiyatsiz: {str(e)}, passlib fallback'ni sinab ko'rish")
        
        # Agar bcrypt muvaffaqiyatsiz bo'lsa, passlib fallback'iga o'tish
        try:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            result = pwd_context.verify(plain_password, hashed_password)
            return bool(result)  # Boolean qaytarishini ta'minlash
        except Exception as fallback_error:
            # Agar ikkala usul ham muvaffaqiyatsiz bo'lsa, False qaytarish (parol noto'g'ri)
            logger.error(f"Bcrypt va passlib tekshiruvi muvaffaqiyatsiz: {str(fallback_error)}")
            return False

def get_password_hash(password: str) -> str:
    """Parolni hash qilish."""
    # Bcrypt 72 bayt chekloviga ega, shuning uchun kerak bo'lsa qisqartiramiz
    password = _truncate_password(password)
    
    # Passlib'ning ichki test parol muammolaridan qochish uchun bcrypt'ni to'g'ridan-to'g'ri ishlatish
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Salt yaratish va hash qilish
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # String sifatida qaytarish (bcrypt bytes qaytaradi)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT access token yaratish.
    
    Eslatma: JWT exp claim UTC timestamp ishlatadi (epoch'dan boshlab soniyalar).
    Moslikni ta'minlash uchun exp claim uchun KST'ni UTC'ga o'tkazamiz.
    """
    from app.core.timezone import kst_to_utc
    to_encode = data.copy()
    
    # Hozirgi vaqtni KST'da olish
    now_kst = kst_now()
    
    if expires_delta:
        expire_kst = now_kst + expires_delta
    else:
        expire_kst = now_kst + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # JWT exp claim uchun KST'ni UTC'ga o'tkazish (JWT standarti UTC ishlatadi)
    expire_utc = kst_to_utc(expire_kst)
    
    # JWT exp epoch'dan boshlab soniyalarni (UTC) kutadi
    to_encode.update({"exp": int(expire_utc.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """JWT token'ni decode qilish va tekshirish."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode xatosi: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Token decode qilishda kutilmagan xatolik: {str(e)}")
        return None

def get_encryption_key() -> bytes:
    """Settings'dan shifrlash kalitini olish, 32 bayt ekanligini ta'minlash."""
    key = settings.ENCRYPTION_KEY.encode()
    # 32 bayt ekanligini ta'minlash uchun hash qilish
    return base64.urlsafe_b64encode(hashlib.sha256(key).digest())

def encrypt_data(data: str) -> str:
    """Sezgir ma'lumotlarni shifrlash (masalan, OAuth tokenlar)."""
    f = Fernet(get_encryption_key())
    return f.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """Sezgir ma'lumotlarni shifrdan ochish."""
    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted_data.encode()).decode()

def hash_sensitive_value(value: str, salt: Optional[str] = None) -> str:
    """Ixtiyoriy salt bilan sezgir qiymatni hash qilish."""
    if salt is None:
        salt = settings.SECRET_KEY
    return hashlib.sha256((value + salt).encode()).hexdigest()


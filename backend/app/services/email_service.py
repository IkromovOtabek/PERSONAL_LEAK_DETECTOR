"""
Email hisoblariga ulanish va ulardan o'qish uchun email xizmati.
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models.connected_account import ConnectedAccount, ProviderType
from app.core.security import decrypt_data
import json
import base64
import re
import logging

logger = logging.getLogger(__name__)

# Ixtiyoriy Google API importlari
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    Credentials = None
    Request = None
    build = None
    HttpError = None

class EmailService:
    """Email operatsiyalarini boshqarish uchun xizmat."""
    
    def get_messages(self, user_id: int, account_id: str, db: Session, max_results: int = 2000, include_body: bool = True) -> List[Dict]:
        """
        Ulangan email hisobidan xabarlarni olish.
        
        Args:
            user_id: Foydalanuvchi ID'si
            account_id: Ulangan hisob ID'si
            db: Ma'lumotlar bazasi sessiyasi
            max_results: Olinadigan xabarlar maksimal soni (samaradorlik uchun default 1000)
            include_body: Xabar body'sini qo'shish yoki yo'q (default True, tezroq qayta ishlash uchun False qiling)
        
        Returns:
            'id', 'subject', 'body', 'from', 'date' bilan xabar lug'atlari ro'yxati
        """
        account = db.query(ConnectedAccount).filter(
            ConnectedAccount.id == account_id,
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.is_active == True
        ).first()
        
        if not account:
            raise ValueError("Hisob topilmadi yoki faol emas")
        
        if account.provider == ProviderType.GMAIL:
            return self._get_gmail_messages(account, db, max_results=max_results, include_body=include_body)
        else:
            raise ValueError(f"Qo'llab-quvvatlanmaydigan provider: {account.provider}")
    
    def _get_gmail_messages(self, account: ConnectedAccount, db: Session, max_results: int = 2000, include_body: bool = True) -> List[Dict]:
        """
        Optimallashtirilgan batch API yordamida Gmail hisobidan xabarlarni olish.
        Default cheklov samaradorlik uchun 2000 ta xabar (batch so'rovlar bilan optimallashtirilgan).
        Barcha xabarlarni olish uchun max_results=None qiling (tavsiya etilmaydi).
        include_body: Agar False bo'lsa, faqat headerlar olinadi (tezroq, lekin body sezgir ma'lumotlarni aniqlash uchun mavjud bo'lmaydi).
        """
        if not GOOGLE_API_AVAILABLE:
            raise ValueError("Google API kutubxonalari o'rnatilmagan. O'rnatish: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        
        try:
            # Tokenlarni decrypt qilish
            try:
                token_json = decrypt_data(account.oauth_tokens)
                token_dict = json.loads(token_json)
            except Exception as e:
                logger.error(f"Hisob {account.id} uchun tokenlarni decrypt qilishda xatolik: {e}")
                raise ValueError(f"OAuth tokenlarini decrypt qilish muvaffaqiyatsiz: {str(e)}")
            
            # Credential'larni yaratish
            try:
                credentials = Credentials(
                    token=token_dict.get('token'),
                    refresh_token=token_dict.get('refresh_token'),
                    token_uri=token_dict.get('token_uri'),
                    client_id=token_dict.get('client_id'),
                    client_secret=token_dict.get('client_secret'),
                    scopes=token_dict.get('scopes', [])
                )
                
                # Token muddati o'tgan bo'lsa, yangilash
                if credentials.expired and credentials.refresh_token:
                    try:
                        credentials.refresh(Request())
                        # Ma'lumotlar bazasida tokenlarni yangilash
                        from app.core.security import encrypt_data
                        updated_token_dict = {
                            'token': credentials.token,
                            'refresh_token': credentials.refresh_token,
                            'token_uri': credentials.token_uri,
                            'client_id': credentials.client_id,
                            'client_secret': credentials.client_secret,
                            'scopes': credentials.scopes
                        }
                        account.oauth_tokens = encrypt_data(json.dumps(updated_token_dict))
                        db.commit()
                        logger.info(f"Refreshed OAuth token for account {account.id}")
                    except Exception as refresh_error:
                        error_str = str(refresh_error)
                        logger.error(f"Error refreshing token for account {account.id}: {refresh_error}")
                        
                        # invalid_grant xatosi ekanligini tekshirish (token bekor qilingan yoki muddati o'tgan)
                        if 'invalid_grant' in error_str.lower() or 'token has been expired' in error_str.lower() or 'token has been revoked' in error_str.lower():
                            # Hisobni nofaol deb belgilash va aniq xato xabari berish
                            account.is_active = False
                            try:
                                db.commit()
                            except Exception:
                                db.rollback()
                            
                            logger.warning(f"Hisob {account.id} uchun OAuth token muddati tugagan/bekor qilingan. Hisob nofaol deb belgilandi.")
                            raise ValueError(
                                "Gmail hisobingiz bilan bog'lanishda xatolik yuz berdi. "
                                "Token muddati tugagan yoki bekor qilingan. "
                                "Iltimos, Gmail hisobingizni qayta ulang (Settings > OAuth Accounts)."
                            )
                        else:
                            # Boshqa refresh xatolari
                            raise ValueError(f"OAuth token yangilashda xatolik: {error_str}")
            except Exception as e:
                logger.error(f"Error creating credentials for account {account.id}: {e}")
                raise ValueError(f"Failed to create OAuth credentials: {str(e)}")
            
            # Gmail xizmatini yaratish
            try:
                service = build('gmail', 'v1', credentials=credentials)
            except Exception as e:
                logger.error(f"Hisob {account.id} uchun Gmail xizmatini yaratishda xatolik: {e}")
                raise ValueError(f"Gmail xizmatini yaratish muvaffaqiyatsiz: {str(e)}")
            
            # Xabarlarni olish - agar max_results None bo'lsa BARCHA xabarlarni olish, aks holda cheklov ishlatish
            # Optimallashtirilgan: Timeout'lardan qochish uchun listing uchun kichikroq batch o'lcham ishlatish
            all_messages = []
            page_token = None
            list_batch_size = 500  # Listing uchun Gmail API har bir so'rovda maksimal
            
            while True:
                try:
                    # Xabarlar ro'yxatini olish
                    query_params = {
                        'userId': 'me',
                        'maxResults': list_batch_size
                    }
                    if page_token:
                        query_params['pageToken'] = page_token
                    
                    results = service.users().messages().list(**query_params).execute()
                    
                    if 'messages' not in results:
                        break
                    
                    all_messages.extend(results['messages'])
                    
                    # Agar max_results belgilangan va biz uni yetkazgan bo'lsak, to'xtatish
                    if max_results and len(all_messages) >= max_results:
                        all_messages = all_messages[:max_results]
                        break
                    
                    # Yana sahifalar bor-yo'qligini tekshirish
                    page_token = results.get('nextPageToken')
                    if not page_token:
                        break
                except HttpError as e:
                    error_str = str(e)
                    if e.resp.status == 401:
                        logger.error(f"Hisob {account.id} uchun autentifikatsiya xatosi: {e}")
                        
                        # invalid_grant xatosi ekanligini tekshirish
                        if 'invalid_grant' in error_str.lower() or 'token has been expired' in error_str.lower() or 'token has been revoked' in error_str.lower():
                            # Hisobni nofaol deb belgilash
                            account.is_active = False
                            try:
                                db.commit()
                            except Exception:
                                db.rollback()
                            
                            logger.warning(f"API chaqiruvi paytida hisob {account.id} uchun OAuth token muddati tugagan/bekor qilingan. Hisob nofaol deb belgilandi.")
                            raise ValueError(
                                "Gmail hisobingiz bilan bog'lanishda xatolik yuz berdi. "
                                "Token muddati tugagan yoki bekor qilingan. "
                                "Iltimos, Gmail hisobingizni qayta ulang (Settings > OAuth Accounts)."
                            )
                        else:
                            raise ValueError("Gmail autentifikatsiya xatosi. Iltimos, hisobingizni qayta ulang.")
                    elif e.resp.status == 403:
                        logger.error(f"Hisob {account.id} uchun ruxsat rad etildi: {e}")
                        raise ValueError("Gmail API ruxsati rad etildi. Iltimos, OAuth scope'laringizni tekshiring.")
                    else:
                        logger.error(f"Hisob {account.id} uchun Gmail API xatosi: {e}")
                        raise ValueError(f"Gmail API xatosi: {str(e)}")
                except Exception as e:
                    error_str = str(e)
                    logger.error(f"Hisob {account.id} uchun xabarlar ro'yxatini olishda xatolik: {e}")
                    
                    # Xato xabarida invalid_grant xatosi ekanligini tekshirish
                    if 'invalid_grant' in error_str.lower() or 'token has been expired' in error_str.lower() or 'token has been revoked' in error_str.lower():
                        # Hisobni nofaol deb belgilash
                        account.is_active = False
                        try:
                            db.commit()
                        except Exception:
                            db.rollback()
                        
                        logger.warning(f"Hisob {account.id} uchun OAuth token muddati tugagan/bekor qilingan. Hisob nofaol deb belgilandi.")
                        raise ValueError(
                            "Gmail hisobingiz bilan bog'lanishda xatolik yuz berdi. "
                            "Token muddati tugagan yoki bekor qilingan. "
                            "Iltimos, Gmail hisobingizni qayta ulang (Settings > OAuth Accounts)."
                        )
                    else:
                        raise ValueError(f"Xabarlarni olishda xatolik: {error_str}")
            
            # Yaxshi samaradorlik uchun batch so'rovlar yordamida xabarlarni batch'lar bo'yicha qayta ishlash
            messages = []
            batch_size = 50  # Gmail batch API 50-100 ta so'rov bilan eng yaxshi ishlaydi
            
            logger.info(f"Batch API yordamida {len(all_messages)} ta xabarni {batch_size} ta batch'da qayta ishlash")
            
            # Ancha tezroq qayta ishlash uchun batch so'rovlardan foydalanish
            import time
            
            def process_batch_response(request_id, response, exception):
                """Batch so'rov javoblari uchun callback."""
                if exception is not None:
                    logger.warning(f"Xabar {request_id} uchun batch so'rovda xatolik: {exception}")
                    return
                
                try:
                    msg_id = request_id
                    msg_detail = response
                    
                    # Faqat include_body True bo'lsa body ajratib olish
                    body = ''
                    if include_body:
                        try:
                            payload = msg_detail.get('payload', {})
                            body = self._extract_body(payload)
                        except Exception as e:
                            logger.warning(f"Xabar {msg_id} uchun body ajratib olishda xatolik: {e}")
                            body = ''
                    
                    # Metadata'dan xabar ma'lumotlarini ajratib olish
                    payload = msg_detail.get('payload', {})
                    if not payload:
                        logger.warning(f"Xabar {msg_id} uchun bo'sh payload")
                        return
                    
                    headers = payload.get('headers', [])
                    if not headers:
                        logger.warning(f"Xabar {msg_id} uchun headerlar yo'q")
                        return
                    
                    # Headerlarni xavfsiz ajratib olish
                    subject = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'subject'), '')
                    from_email = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'from'), '')
                    to_email = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'to'), '')
                    cc_email = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'cc'), '')
                    date = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'date'), '')
                    # Headerlardan Message-ID ajratib olish (Gmail veb'da ochish uchun)
                    message_id_header = next((h.get('value') for h in headers if h.get('name', '').lower() == 'message-id'), None)
                    
                    # Skanerlash uchun barcha matnni birlashtirish (None qiymatlarni xavfsiz boshqarish)
                    full_text = f"{subject or ''} {from_email or ''} {to_email or ''} {cc_email or ''} {body or ''}"
                    
                    messages.append({
                        'id': msg_id,
                        'threadId': msg_detail.get('threadId'),  # Gmail veb'da ochish uchun thread ID qo'shish
                        'messageId': message_id_header,  # Gmail veb'da ochish uchun Message-ID header qo'shish
                        'subject': subject or '',
                        'from': from_email or '',
                        'to': to_email or '',
                        'cc': cc_email or '',
                        'date': date or '',
                        'body': body or '',
                        'full_text': full_text,  # Skanerlash uchun birlashtirilgan matn
                        'headers': headers  # Phishing aniqlash uchun headerlarni qo'shish
                    })
                except Exception as e:
                    logger.warning(f"Xabar {request_id} uchun batch javobni qayta ishlashda xatolik: {e}")
            
            # Batch so'rovlar yordamida xabarlarni batch'lar bo'yicha qayta ishlash
            for i in range(0, len(all_messages), batch_size):
                batch = all_messages[i:i + batch_size]
                batch_num = i//batch_size + 1
                total_batches = (len(all_messages) + batch_size - 1)//batch_size
                
                logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} messages)")
                
                # Gmail API-specific batch endpoint (legacy https://www.googleapis.com/batch 404 qaytaradi)
                batch_request = service.new_batch_http_request(callback=process_batch_response)
                
                for msg in batch:
                    msg_id = msg.get('id', 'unknown')
                    if not msg_id or msg_id == 'unknown':
                        continue
                    
                    try:
                        # Add request to batch
                        if include_body:
                            batch_request.add(
                                service.users().messages().get(
                                    userId='me',
                                    id=msg_id,
                                    format='full'  # Get full message with body
                                ),
                                request_id=msg_id
                            )
                        else:
                            batch_request.add(
                                service.users().messages().get(
                                    userId='me',
                                    id=msg_id,
                                    format='metadata',  # Only headers, no body
                                    metadataHeaders=['Subject', 'From', 'To', 'Cc', 'Date', 'Message-ID']
                                ),
                                request_id=msg_id
                            )
                    except Exception as e:
                        logger.warning(f"Error adding message {msg_id} to batch: {e}")
                        continue
                
                # Execute batch request with timeout handling
                try:
                    batch_request.execute()
                except Exception as e:
                    logger.error(f"Error executing batch request for batch {batch_num}: {e}")
                    # Fallback to individual requests for this batch if batch fails
                    logger.info(f"Falling back to individual requests for batch {batch_num}")
                    for msg in batch:
                        try:
                            msg_id = msg.get('id', 'unknown')
                            if not msg_id or msg_id == 'unknown':
                                continue
                            
                            if include_body:
                                msg_detail = service.users().messages().get(
                                    userId='me',
                                    id=msg_id,
                                    format='full'
                                ).execute()
                            else:
                                msg_detail = service.users().messages().get(
                                    userId='me',
                                    id=msg_id,
                                    format='metadata',
                                    metadataHeaders=['Subject', 'From', 'To', 'Cc', 'Date', 'Message-ID']
                                ).execute()
                            
                            # Process the message (same logic as batch callback)
                            body = ''
                            if include_body:
                                try:
                                    payload = msg_detail.get('payload', {})
                                    body = self._extract_body(payload)
                                except Exception as e:
                                    logger.warning(f"Error extracting body for message {msg_id}: {e}")
                                    body = ''
                            
                            payload = msg_detail.get('payload', {})
                            if not payload:
                                continue
                            
                            headers = payload.get('headers', [])
                            if not headers:
                                continue
                            
                            subject = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'subject'), '')
                            from_email = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'from'), '')
                            to_email = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'to'), '')
                            cc_email = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'cc'), '')
                            date = next((h.get('value', '') for h in headers if h.get('name', '').lower() == 'date'), '')
                            message_id_header = next((h.get('value') for h in headers if h.get('name', '').lower() == 'message-id'), None)
                            
                            full_text = f"{subject or ''} {from_email or ''} {to_email or ''} {cc_email or ''} {body or ''}"
                            
                            messages.append({
                                'id': msg_id,
                                'threadId': msg_detail.get('threadId'),
                                'messageId': message_id_header,
                                'subject': subject or '',
                                'from': from_email or '',
                                'to': to_email or '',
                                'cc': cc_email or '',
                                'date': date or '',
                                'body': body or '',
                                'full_text': full_text,
                                'headers': headers
                            })
                        except Exception as e:
                            logger.warning(f"Error processing message {msg.get('id', 'unknown')} in fallback: {e}")
                            continue
                
                # Small delay to avoid rate limiting
                if i + batch_size < len(all_messages):
                    time.sleep(0.1)
            
            # Update last_sync
            try:
                from app.core.timezone import kst_now
                account.last_sync = kst_now()
                db.commit()
            except Exception as e:
                logger.warning(f"Error updating last_sync for account {account.id}: {e}")
                db.rollback()
            
            logger.info(f"Successfully fetched {len(messages)} messages for account {account.id}")
            return messages
            
        except ValueError:
            # Re-raise ValueError (already logged)
            raise
        except HttpError as e:
            error_str = str(e)
            logger.error(f"Gmail API HTTP error for account {account.id}: {e}")
            if e.resp.status == 401:
                # Check if it's an invalid_grant error
                if 'invalid_grant' in error_str.lower() or 'token has been expired' in error_str.lower() or 'token has been revoked' in error_str.lower():
                    # Mark account as inactive
                    account.is_active = False
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()
                    
                    logger.warning(f"OAuth token expired/revoked for account {account.id}. Account marked as inactive.")
                    raise ValueError(
                        "Gmail hisobingiz bilan bog'lanishda xatolik yuz berdi. "
                        "Token muddati tugagan yoki bekor qilingan. "
                        "Iltimos, Gmail hisobingizni qayta ulang (Settings > OAuth Accounts)."
                    )
                else:
                    raise ValueError("Gmail autentifikatsiya xatosi. Iltimos, hisobingizni qayta ulang.")
            elif e.resp.status == 403:
                raise ValueError("Gmail API permission denied. Please check your OAuth scopes.")
            else:
                raise ValueError(f"Gmail API error: {str(e)}")
        except Exception as e:
            error_str = str(e)
            logger.error(f"Error fetching Gmail messages for account {account.id}: {e}", exc_info=True)
            
            # Check if it's an invalid_grant error in the exception message
            if 'invalid_grant' in error_str.lower() or 'token has been expired' in error_str.lower() or 'token has been revoked' in error_str.lower():
                # Mark account as inactive
                account.is_active = False
                try:
                    db.commit()
                except Exception:
                    db.rollback()
                
                logger.warning(f"OAuth token expired/revoked for account {account.id}. Account marked as inactive.")
                raise ValueError(
                    "Gmail hisobingiz bilan bog'lanishda xatolik yuz berdi. "
                    "Token muddati tugagan yoki bekor qilingan. "
                    "Iltimos, Gmail hisobingizni qayta ulang (Settings > OAuth Accounts)."
                )
            else:
                raise ValueError(f"Gmail xabarlarini olishda xatolik: {error_str}")
    
    def _extract_body(self, payload: Dict) -> str:
        """Extract body text from Gmail message payload."""
        body = ""
        
        try:
            if 'parts' in payload:
                for part in payload.get('parts', []):
                    try:
                        mime_type = part.get('mimeType', '')
                        if mime_type == 'text/plain':
                            data = part.get('body', {}).get('data')
                            if data:
                                try:
                                    decoded = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                                    body += decoded
                                except Exception as e:
                                    logger.warning(f"Error decoding plain text body: {e}")
                                    continue
                        elif mime_type == 'text/html':
                            data = part.get('body', {}).get('data')
                            if data:
                                try:
                                    html = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                                    # Simple HTML tag removal
                                    body += re.sub(r'<[^>]+>', '', html)
                                except Exception as e:
                                    logger.warning(f"Error decoding HTML body: {e}")
                                    continue
                        elif mime_type.startswith('multipart/'):
                            # Recursively extract from nested parts
                            nested_body = self._extract_body(part)
                            if nested_body:
                                body += nested_body
                    except Exception as e:
                        logger.warning(f"Error processing part: {e}")
                        continue
            else:
                mime_type = payload.get('mimeType', '')
                if mime_type == 'text/plain':
                    data = payload.get('body', {}).get('data')
                    if data:
                        try:
                            body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                        except Exception as e:
                            logger.warning(f"Error decoding plain text body: {e}")
                            body = ''
                elif mime_type == 'text/html':
                    data = payload.get('body', {}).get('data')
                    if data:
                        try:
                            html = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                            # Simple HTML tag removal
                            body = re.sub(r'<[^>]+>', '', html)
                        except Exception as e:
                            logger.warning(f"Error decoding HTML body: {e}")
                            body = ''
        except Exception as e:
            logger.error(f"Error extracting body from payload: {e}")
            body = ''
        
        return body


"""
Skanerlashni qayta ishlash va shaxsiy ma'lumotlarni aniqlash uchun xizmat.
"""
import re
import logging
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.scan import Scan, ScanStatus, ScanType
from app.models.finding import Finding, SeverityType
from app.models.sensitive_item import SensitiveItem
from app.utils.detection import detection_engine
from app.utils.file_processor import FileProcessor
from app.core.security import hash_sensitive_value
from datetime import datetime
from app.core.timezone import kst_now
from typing import List, Dict
import os

try:
    from dateutil import parser as date_parser
except ImportError:
    date_parser = None

logger = logging.getLogger(__name__)

# Celery task decorator (ixtiyoriy)
try:
    from app.celery_app import celery_app, CELERY_AVAILABLE
    if CELERY_AVAILABLE and celery_app:
        @celery_app.task(name="app.services.scan_service.start_scan_task")
        def start_scan_task(scan_id: int, scan_type: str, source_id: str = None) -> Dict:
            return _process_scan(scan_id, scan_type, source_id)
    else:
        def start_scan_task(scan_id: int, scan_type: str, source_id: str = None) -> Dict:
            return _process_scan(scan_id, scan_type, source_id)
except ImportError:
    def start_scan_task(scan_id: int, scan_type: str, source_id: str = None) -> Dict:
        return _process_scan(scan_id, scan_type, source_id)

def _process_scan(scan_id: int, scan_type: str, source_id: str = None) -> Dict:
    """
    Skanerlashni qayta ishlash uchun orqa fond vazifasi.
    
    Args:
        scan_id: Qayta ishlash kerak bo'lgan skanerlash ID'si
        scan_type: Skanerlash turi (email, file, web)
        source_id: Manba identifikatori (email hisob ID'si yoki fayl yo'li)
    """
    db: Session = SessionLocal()
    scan = None
    
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return {"error": "Scan not found"}
        
        # Skanerlash holatini yangilash
        scan.status = ScanStatus.RUNNING
        scan.started_at = kst_now()
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            return {"error": f"Database error: {str(e)}"}
        
        # Foydalanuvchi sezgir ma'lumotlarini olish
        sensitive_items = db.query(SensitiveItem).filter(
            SensitiveItem.user_id == scan.user_id
        ).all()
        
        # Aniqlash uchun dict formatiga o'tkazish
        items_dict = []
        for item in sensitive_items:
            items_dict.append({
                'type': item.type.value,
                'value': item.value_hash,  # Eslatma: Taqqoslash uchun hash ishlatiladi
                'id': item.id
            })
        
        findings_count = 0
        
        if scan_type == ScanType.EMAIL.value:
            result = _process_email_scan(scan, source_id, items_dict, db)
            findings_count = result.get('findings_count', 0)
            # Email hisob ma'lumotlarini summary'ga qo'shish
            if scan.summary is None:
                scan.summary = {}
            scan.summary.update({
                'email': result.get('email', 'Noma\'lum'),
                'account_id': source_id,  # Kelajakda foydalanish uchun account_id'ni saqlash
                'total_messages': result.get('total_messages', 0),
                'dangerous_messages': result.get('dangerous_messages', 0),
                'other_messages': result.get('other_messages', 0)
            })
        elif scan_type == ScanType.FILE.value:
            findings_count = _process_file_scan(scan, source_id, items_dict, db)
        elif scan_type == ScanType.WEB.value:
            findings_count = _process_web_scan(scan, source_id, items_dict, db)
        
        # Skanerlash holatini yangilash
        scan.status = ScanStatus.COMPLETED
        scan.finished_at = kst_now()
        if scan.summary is None:
            scan.summary = {}
        scan.summary.update({
            "total_findings": findings_count,
            "processed_at": kst_now().isoformat()
        })
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            return {"error": f"Database error: {str(e)}"}
        
        return {"status": "completed", "findings_count": findings_count}
        
    except Exception as e:
        # Skanerlash holatini muvaffaqiyatsiz deb belgilash
        if scan:
            try:
                scan.status = ScanStatus.FAILED
                scan.error_message = str(e)
                scan.finished_at = kst_now()
                db.commit()
            except Exception:
                db.rollback()
        return {"error": str(e)}
    finally:
        try:
            db.close()
        except Exception:
            pass

def _process_email_scan(scan: Scan, account_id: str, items_dict: List[Dict], db: Session) -> Dict:
    """Email skanerlashni qayta ishlash - barcha email kontentini to'liq skanerlash va phishing aniqlash."""
    import logging
    from app.services.email_service import EmailService
    from app.utils.phishing_detector import phishing_detector
    from app.models.connected_account import ConnectedAccount
    
    logger = logging.getLogger(__name__)
    
    try:
        # Hisob email'ini olish
        try:
            account = db.query(ConnectedAccount).filter(ConnectedAccount.id == int(account_id)).first()
            if not account:
                logger.error(f"Hisob topilmadi: {account_id}")
                raise ValueError(f"Hisob {account_id} topilmadi")
            account_email = account.email if account else 'Noma\'lum'
            logger.info(f"Hisob {account_id} ({account_email}) uchun email skanerlash boshlanmoqda")
        except ValueError as e:
            logger.error(f"Hisobni olishda xatolik: {e}")
            raise
        except Exception as e:
            logger.error(f"Hisobni olishda kutilmagan xatolik: {e}", exc_info=True)
            raise ValueError(f"Hisobni olish muvaffaqiyatsiz: {str(e)}")
        
        # Samaradorlik uchun optimallashtirilgan cheklov bilan xabarlarni olish
        try:
            email_service = EmailService()
            messages = email_service.get_messages(scan.user_id, account_id, db, max_results=2000)
            logger.info(f"Hisobdan jami {len(messages)} ta xabar olindi")
        except ValueError as e:
            logger.error(f"Xabarlarni olishda xatolik: {e}")
            raise
        except Exception as e:
            logger.error(f"Xabarlarni olishda kutilmagan xatolik: {e}", exc_info=True)
            raise ValueError(f"Xabarlarni olish muvaffaqiyatsiz: {str(e)}")
        
        # Faqat yangi xabarlar: avvalgi skanerlarda allaqachon tahlil qilingan xabarlarni olib tashlash
        already_analyzed_ids = set()
        try:
            rows = db.query(Finding.source_url_or_message_id).filter(
                Finding.user_id == scan.user_id,
                Finding.source_url_or_message_id.like('gmail:%')
            ).distinct().all()
            for (src,) in rows:
                parts = (src or '').replace('gmail:', '', 1).split(':')
                if parts and parts[0]:
                    already_analyzed_ids.add(parts[0].strip())
        except Exception as e:
            logger.warning(f"Allaqachon tahlil qilingan xabarlarni olishda xatolik (davom etiladi): {e}")
        messages = [m for m in messages if str(m.get('id') or '').strip() not in already_analyzed_ids]
        logger.info(f"Faqat yangi xabarlar: {len(messages)} ta (oldingi tahlillardan {len(already_analyzed_ids)} ta xabar o'tkazib yuborildi)")
        
        # Eng eskidan eng yangigacha tartiblash (sana bo'yicha o'sish)
        def _message_date_key(msg):
            s = (msg.get('date') or '').strip()
            if not s:
                return datetime.min
            try:
                if date_parser:
                    return date_parser.parse(s)
                return datetime.min
            except Exception:
                return datetime.min
        messages.sort(key=_message_date_key)
        logger.info("Xabarlar sana bo'yicha tartiblandi (eskidan yangiga)")
        
        findings_count = 0
        processed_count = 0
        phishing_count = 0
        total_messages = len(messages)
        dangerous_messages = 0
        other_messages = 0
        
        # Xavfli xabarlarni ularning xavf ballari bilan saqlash (tartiblash uchun)
        dangerous_findings = []  # (risk_score, finding_data, message_data) tuple'lari ro'yxati
        MAX_DANGEROUS_FINDINGS = 100  # Faqat eng xavfli 100 ta xabarni ko'rsatish
        
        # Progress tracking uchun skanerlash summary'sini davriy yangilash (optimallashtirilgan chastota)
        update_interval = 100  # Har 100 ta xabarda yangilash (yaxshi samaradorlik uchun kamaytirilgan chastota)
        commit_interval = 200  # Har 200 ta finding'da commit qilish (samaradorlik uchun optimallashtirilgan)
        
        for message in messages:
            # Skanerlash bekor qilinganini tekshirish (samaradorlik uchun kamroq tekshirish)
            if processed_count % 50 == 0:  # Har 50 ta xabarda bekor qilishni tekshirish
                db.refresh(scan)
                if scan.status == ScanStatus.CANCELLED:
                    logger.info(f"Skanerlash {scan.id} {processed_count} ta xabarda bekor qilindi")
                    break
            
            processed_count += 1
            
            # Skanerlash summary'sida progress'ni davriy yangilash (optimallashtirilgan)
            if processed_count % update_interval == 0 or processed_count == total_messages:
                try:
                    if scan.summary is None:
                        scan.summary = {}
                    scan.summary['processed_messages'] = processed_count
                    scan.summary['total_messages'] = total_messages
                    scan.summary['progress_percent'] = int((processed_count / total_messages) * 100) if total_messages > 0 else 0
                    db.commit()
                    logger.info(f"Skanerlash progress: {processed_count}/{total_messages} ta xabar ({scan.summary.get('progress_percent', 0)}%)")
                except Exception as e:
                    logger.warning(f"Skanerlash progress'ni yangilashda xatolik: {e}")
                    db.rollback()
            
            # 1. Xabar xavfli ekanligini aniqlash uchun avval phishing aniqlash
            try:
                phishing_result = phishing_detector.detect_phishing(message)
            except Exception as e:
                logger.warning(f"Xabar {message.get('id', 'noma\'lum')} uchun phishing aniqlashda xatolik: {e}")
                phishing_result = {
                    'is_phishing': False,
                    'risk_score': 0.0,
                    'flags': [],
                    'details': {}
                }
            
            # Ushbu xabar uchun umumiy xavf ballini hisoblash
            phishing_risk = phishing_result.get('risk_score', 0.0)
            is_phishing = phishing_result.get('is_phishing', False)
            
            # Faqat xavfli xabarlarda (phishing yoki yuqori xavf) shaxsiy ma'lumotlarni qayta ishlash
            # Bu xavfsiz xabarlar uchun qayta ishlash vaqtini tejaydi
            has_sensitive_data = False
            sensitive_results = []
            
            if is_phishing or phishing_risk >= 20:
                # Faqat xavfli xabarlarda shaxsiy ma'lumotlarni aniqlash
                if 'full_text' in message:
                    text = message['full_text']
                else:
                    text = ' '.join([
                        message.get('subject', ''),
                        message.get('from', ''),
                        message.get('to', ''),
                        message.get('cc', ''),
                        message.get('body', '')
                    ])
                
                # Birlashtirilgan matnda shaxsiy ma'lumotlarni aniqlash
                sensitive_results = detection_engine.detect_in_text(text, items_dict)
                has_sensitive_data = len(sensitive_results) > 0
                
                # Shaxsiy ma'lumotlar uchun xavf balli qo'shish (har bir sezgir element 10 ball qo'shadi)
                if has_sensitive_data:
                    phishing_risk += min(len(sensitive_results) * 10, 30)  # Shaxsiy ma'lumotlar uchun maksimal 30 ball
            
            # Faqat xavfli xabarlarni qayta ishlash (phishing yoki yuqori xavf >= 20)
            is_dangerous = is_phishing or phishing_risk >= 20
            
            if is_dangerous:
                dangerous_messages += 1
                phishing_count += 1
                
                # Ushbu xavfli xabar uchun finding ma'lumotlarini tayyorlash
                from_email = message.get('from', '') or ''
                date = message.get('date', '') or ''
                
                # Agar kerak bo'lsa "Name <email@example.com>" formatidan email ajratib olish
                if from_email and '<' in from_email:
                    email_match = re.search(r'<([^>]+)>', from_email)
                    if email_match:
                        from_email = email_match.group(1)
                
                if not from_email or from_email.strip() == '':
                    from_email = 'Noma\'lum'
                if not date or date.strip() == '':
                    date = 'Noma\'lum'
                
                message_id = message.get('id')
                thread_id = message.get('threadId')
                message_id_header = message.get('messageId')
                source_id = f"gmail:{message_id}" + (f":{thread_id}" if thread_id else "") + (f":{message_id_header}" if message_id_header else "")
                
                # Tartiblash uchun xavf balli bilan xavfli finding'ni saqlash
                dangerous_findings.append({
                    'risk_score': phishing_risk,
                    'is_phishing': is_phishing,
                    'phishing_result': phishing_result,
                    'sensitive_results': sensitive_results,
                    'message': message,
                    'from_email': from_email,
                    'date': date,
                    'source_id': source_id
                })
            else:
                other_messages += 1
                # Xavfsiz xabarlarni o'tkazib yuborish - ularni keyinroq qayta ishlamaslik
                continue
            
        # Xavfli finding'larni xavf balli bo'yicha tartiblash (eng yuqoridan boshlab) va eng yuqori 100 tasini olish
        dangerous_findings.sort(key=lambda x: x['risk_score'], reverse=True)
        top_dangerous = dangerous_findings[:MAX_DANGEROUS_FINDINGS]
        
        logger.info(f"{len(dangerous_findings)} ta xavfli xabar topildi, eng xavfli {len(top_dangerous)} tasi saqlanmoqda")
        
        # Endi faqat eng xavfli finding'larni ma'lumotlar bazasiga saqlash
        for finding_data in top_dangerous:
            phishing_result = finding_data['phishing_result']
            sensitive_results = finding_data['sensitive_results']
            message = finding_data['message']
            from_email = finding_data['from_email']
            date = finding_data['date']
            source_id = finding_data['source_id']
            risk_score = finding_data['risk_score']
            
            # 1. Agar phishing xabar bo'lsa, phishing finding yaratish
            if finding_data['is_phishing'] or risk_score >= 20:
                flags_str = ', '.join(phishing_result.get('flags', []))
                
                snippet = f"Gmail Account: {account_email}\n"
                snippet += f"Subject: {message.get('subject', 'N/A')}\n"
                snippet += f"From: {from_email}\n"
                snippet += f"Date: {date}\n"
                snippet += f"Risk Score: {risk_score:.1f}/100\n"
                snippet += f"Flags: {flags_str}\n"
                
                if message.get('body'):
                    body_preview = message['body'][:200] + '...' if len(message['body']) > 200 else message['body']
                    snippet += f"\nMessage Preview: {body_preview}"
                
                # Xavf balliga asosan severity aniqlash
                if risk_score >= 70:
                    severity = SeverityType.HIGH
                elif risk_score >= 40:
                    severity = SeverityType.MEDIUM
                else:
                    severity = SeverityType.LOW
                
                finding = Finding(
                    scan_id=scan.id,
                    user_id=scan.user_id,
                    type='phishing',
                    severity=severity,
                    snippet=snippet,
                    source_url_or_message_id=source_id,
                    source_type='email',
                    resolved=False
                )
                db.add(finding)
                findings_count += 1
            
            # 2. Ushbu xavfli xabar uchun shaxsiy ma'lumotlar finding'larini qo'shish
            for result in sensitive_results:
                snippet = result.snippet
                snippet = f"Gmail Account: {account_email}\nSubject: {message.get('subject', 'N/A')}\nFrom: {from_email}\nDate: {date}\n{snippet}"
                
                finding = Finding(
                    scan_id=scan.id,
                    user_id=scan.user_id,
                    type=result.type,
                    severity=_determine_severity(result.type),
                    snippet=snippet,
                    source_url_or_message_id=source_id,
                    source_type='email',
                    resolved=False
                )
                db.add(finding)
                findings_count += 1
            
            # Yaxshi samaradorlik uchun finding'larni batch'lar bo'yicha commit qilish
            if findings_count % commit_interval == 0:
                try:
                    db.commit()
                    logger.info(f"{findings_count} ta finding ma'lumotlar bazasiga commit qilindi")
                except Exception as e:
                    logger.error(f"Finding'larni commit qilishda xatolik: {e}")
                    db.rollback()
        
        # Qolgan finding'larni yakuniy commit qilish
        try:
            db.commit()
        except Exception as e:
            logger.error(f"Yakuniy commit'da xatolik: {e}")
            db.rollback()
        
        # Qayta ishlash ma'lumotlari bilan skanerlash summary'sini yangilash
        if scan.summary is None:
            scan.summary = {}
        scan.summary['processed_messages'] = processed_count
        scan.summary['total_findings'] = findings_count
        scan.summary['phishing_detected'] = phishing_count
        scan.summary['total_messages'] = total_messages
        scan.summary['email'] = account_email  # Filtrlash uchun summary'ga email saqlash
        scan.summary['account_id'] = account_id  # Filtrlash uchun summary'ga account_id saqlash
        scan.summary['progress_percent'] = 100  # Tugallangan deb belgilash
        
        try:
            db.commit()
        except Exception as e:
            logger.error(f"Error updating final scan summary: {e}")
            db.rollback()
        
        logger.info(f"Email skanerlash tugallandi: {processed_count}/{total_messages} ta xabardan {findings_count} ta finding")
        
        # Batafsil statistikani qaytarish
        return {
            'findings_count': findings_count,
            'email': account_email,
            'total_messages': total_messages,
            'dangerous_messages': dangerous_messages,
            'other_messages': other_messages
        }
    except ValueError as e:
        # ValueError'ni qayta ko'tarish (allaqachon log qilingan)
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Skanerlash {scan.id} uchun email skanerlashni qayta ishlashda xatolik: {e}", exc_info=True)
        db.rollback()
        raise ValueError(f"Email skanerlashni qayta ishlash muvaffaqiyatsiz: {str(e)}")

def _process_file_scan(scan: Scan, file_path: str, items_dict: List[Dict], db: Session) -> int:
    """Fayl skanerlashni qayta ishlash."""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Fayl topilmadi: {file_path}")
        
        if not FileProcessor.is_supported(file_path):
            raise ValueError(f"Qo'llab-quvvatlanmaydigan fayl turi: {file_path}")
        
        # Fayldan matn ajratib olish
        text = FileProcessor.extract_text(file_path)
        if not text:
            return 0
        
        # Shaxsiy ma'lumotlarni aniqlash
        results = detection_engine.detect_in_text(text, items_dict)
        
        findings_count = 0
        for result in results:
            finding = Finding(
                scan_id=scan.id,
                user_id=scan.user_id,
                type=result.type,
                severity=_determine_severity(result.type),
                snippet=result.snippet,
                source_url_or_message_id=file_path,
                source_type='file',
                resolved=False
            )
            db.add(finding)
            findings_count += 1
        
        db.commit()
        return findings_count
    except Exception as e:
        db.rollback()
        raise

def _process_web_scan(scan: Scan, url: str, items_dict: List[Dict], db: Session) -> int:
    """
    Veb skanerlashni qayta ishlash.
    
    Eslatma: Veb skanerlash funksiyasi hali amalga oshirilmagan.
    Bu kelajakdagi ishlab chiqish uchun placeholder.
    
    Args:
        scan: Scan obyekti
        url: Skanerlash kerak bo'lgan URL
        items_dict: Qidirish kerak bo'lgan sezgir ma'lumotlar ro'yxati
        db: Ma'lumotlar bazasi sessiyasi
    
    Returns:
        Finding'lar soni (hozirda har doim 0)
    """
    logger = logging.getLogger(__name__)
    logger.info(f"URL uchun veb skanerlash so'raldi: {url} (hozirda amalga oshirilmagan)")
    return 0

def _determine_severity(pii_type: str) -> SeverityType:
    """PII turiga asosan severity aniqlash."""
    high_severity_types = ['credit_card', 'passport', 'id_card', 'secret_key', 'token']
    medium_severity_types = ['phone', 'email']
    
    if pii_type in high_severity_types:
        return SeverityType.HIGH
    elif pii_type in medium_severity_types:
        return SeverityType.MEDIUM
    else:
        return SeverityType.LOW


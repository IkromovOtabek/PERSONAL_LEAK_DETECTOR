"""
Email xabarlarini tahlil qilish uchun phishing aniqlash vositasi.
"""
import re
import urllib.parse
from typing import Dict, List, Tuple, Optional
from datetime import datetime

class PhishingDetector:
    """Email xabarlarida phishing va shubhali patternlarni aniqlaydi."""
    
    # Shoshilinch/tahdidli kalit so'zlar
    URGENT_KEYWORDS = [
        r'\burgent\b', r'\bimmediately\b', r'\bverify\s+now\b', r'\baccount\s+locked\b',
        r'\bverify\s+your\s+account\b', r'\bsuspended\b', r'\bexpired\b', r'\baction\s+required\b',
        r'\bverify\s+immediately\b', r'\bclick\s+here\s+now\b', r'\bsecurity\s+alert\b',
        r'\bunauthorized\s+access\b', r'\bverify\s+identity\b', r'\bconfirm\s+now\b'
    ]
    
    # Shubhali URL patternlari
    SHORTENER_DOMAINS = [
        'bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
        'short.link', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'shorte.st'
    ]
    
    # Shubhali fayl kengaytmalari
    SUSPICIOUS_EXTENSIONS = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', '.jar']
    
    # Shubhali MIME turlari
    SUSPICIOUS_MIME_TYPES = [
        'application/x-msdownload', 'application/x-executable', 'application/x-msdos-program',
        'application/x-javascript', 'application/javascript'
    ]
    
    def __init__(self):
        self.urgent_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.URGENT_KEYWORDS]
    
    def detect_phishing(self, message: Dict) -> Dict:
        """
        Email xabarda phishing va shubhali patternlarni aniqlash.
        
        Args:
            message: Email xabar lug'ati ('subject', 'from', 'to', 'cc', 'body', 'headers' bilan)
        
        Returns:
            Aniqlash natijalari bilan lug'at:
            {
                'is_phishing': bool,
                'risk_score': float (0-100),
                'flags': List[str],
                'details': Dict
            }
        """
        flags = []
        risk_score = 0.0
        details = {}
        
        # Tahlil uchun barcha matnni xavfsiz birlashtirish
        try:
            full_text = ' '.join([
                str(message.get('subject', '') or ''),
                str(message.get('from', '') or ''),
                str(message.get('to', '') or ''),
                str(message.get('cc', '') or ''),
                str(message.get('body', '') or '')
            ]).lower()
        except Exception:
            # Agar matn birlashtirish muvaffaqiyatsiz bo'lsa, bo'sh qator ishlatish
            full_text = ''
        
        # 1. Shoshilinch/tahdidli til aniqlash
        urgent_count = sum(1 for pattern in self.urgent_patterns if pattern.search(full_text))
        if urgent_count > 0:
            flags.append('urgent_language')
            risk_score += min(urgent_count * 5, 20)
            details['urgent_keywords'] = urgent_count
        
        # 2. Qisqartirilgan URL aniqlash
        urls = self._extract_urls(full_text)
        shortened_urls = [url for url in urls if self._is_shortened_url(url)]
        if shortened_urls:
            flags.append('shortened_urls')
            risk_score += min(len(shortened_urls) * 10, 25)
            details['shortened_urls'] = shortened_urls
        
        # 3. Shubhali havola patternlari
        suspicious_links = self._check_suspicious_links(urls)
        if suspicious_links:
            flags.append('suspicious_links')
            risk_score += min(len(suspicious_links) * 8, 20)
            details['suspicious_links'] = suspicious_links
        
        # 4. From va Reply-To nomuvofiqlik
        try:
            from_email = message.get('from', '') or ''
            reply_to = self._extract_header(message.get('headers', []), 'Reply-To')
            if from_email and reply_to and from_email != reply_to:
                # Domenlarni ajratib olish
                from_domain = self._extract_domain(from_email)
                reply_domain = self._extract_domain(reply_to)
                if from_domain and reply_domain and from_domain != reply_domain:
                    flags.append('from_reply_mismatch')
                    risk_score += 15
                    details['from_reply_mismatch'] = {
                        'from': from_domain,
                        'reply_to': reply_domain
                    }
        except Exception:
            # Domen ajratib olish muvaffaqiyatsiz bo'lsa, o'tkazib yuborish
            pass
        
        # 5. No-reply yoki shubhali yuboruvchi
        try:
            from_email = message.get('from', '') or ''
            if from_email and ('no-reply' in from_email.lower() or 'noreply' in from_email.lower()):
                flags.append('no_reply_sender')
                risk_score += 5
        except Exception:
            pass
        
        # 6. Shubhali yuboruvchi domeni
        try:
            from_email = message.get('from', '') or ''
            sender_domain = self._extract_domain(from_email)
            if sender_domain and self._is_suspicious_domain(sender_domain):
                flags.append('suspicious_domain')
                risk_score += 20
                details['suspicious_domain'] = sender_domain
        except Exception:
            pass
        
        # 7. Hisob ma'lumotlari so'rash patternlari
        credential_patterns = [
            r'enter\s+your\s+password', r'verify\s+your\s+password', r'confirm\s+your\s+password',
            r'update\s+your\s+account', r'verify\s+your\s+identity', r'confirm\s+your\s+identity',
            r'enter\s+your\s+credit\s+card', r'verify\s+your\s+card', r'update\s+your\s+card'
        ]
        credential_matches = sum(1 for pattern in credential_patterns 
                                if re.search(pattern, full_text, re.IGNORECASE))
        if credential_matches > 0:
            flags.append('credential_request')
            risk_score += min(credential_matches * 10, 25)
            details['credential_requests'] = credential_matches
        
        # 8. Juda yaxshi bo'lib ko'rinadigan takliflar
        offer_patterns = [
            r'you\s+won', r'congratulations', r'you\s+have\s+won', r'claim\s+your\s+prize',
            r'free\s+money', r'click\s+to\s+claim', r'limited\s+time\s+offer'
        ]
        offer_matches = sum(1 for pattern in offer_patterns 
                           if re.search(pattern, full_text, re.IGNORECASE))
        if offer_matches > 0:
            flags.append('suspicious_offers')
            risk_score += min(offer_matches * 8, 20)
            details['suspicious_offers'] = offer_matches
        
        # 9. HTML obfuskatsiya aniqlash
        body = message.get('body', '')
        if self._has_obfuscated_html(body):
            flags.append('obfuscated_html')
            risk_score += 15
            details['obfuscated_html'] = True
        
        # 10. SPF/DKIM/DMARC tekshiruvi (agar headerlar mavjud bo'lsa)
        headers = message.get('headers', [])
        if headers:
            spf_result = self._check_spf(headers)
            dkim_result = self._check_dkim(headers)
            dmarc_result = self._check_dmarc(headers)
            
            if spf_result == 'fail' or dkim_result == 'fail' or dmarc_result == 'fail':
                flags.append('authentication_failed')
                risk_score += 25
                details['authentication'] = {
                    'spf': spf_result,
                    'dkim': dkim_result,
                    'dmarc': dmarc_result
                }
        
        # Phishing ekanligini aniqlash
        is_phishing = risk_score >= 30  # Phishing uchun chegaraviy qiymat
        
        return {
            'is_phishing': is_phishing,
            'risk_score': min(risk_score, 100),
            'flags': flags,
            'details': details
        }
    
    def _extract_urls(self, text: str) -> List[str]:
        """Matndan URL'larni ajratib olish."""
        url_pattern = re.compile(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        )
        return url_pattern.findall(text)
    
    def _is_shortened_url(self, url: str) -> bool:
        """URL qisqartirilgan ekanligini tekshirish."""
        try:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc.lower()
            return any(shortener in domain for shortener in self.SHORTENER_DOMAINS)
        except:
            return False
    
    def _check_suspicious_links(self, urls: List[str]) -> List[str]:
        """Shubhali havola patternlarini tekshirish."""
        suspicious = []
        for url in urls:
            try:
                parsed = urllib.parse.urlparse(url)
                domain = parsed.netloc.lower()
                
                # Homograf domenlarni tekshirish (asosiy tekshiruv)
                if self._has_homograph(domain):
                    suspicious.append(url)
                
                # URL'dagi IP manzillarni tekshirish
                if re.match(r'^\d+\.\d+\.\d+\.\d+$', domain):
                    suspicious.append(url)
            except:
                pass
        return suspicious
    
    def _has_homograph(self, domain: str) -> bool:
        """Asosiy homograf aniqlash (shubhali belgi kombinatsiyalarini qidiradi)."""
        # Aralash skriptlar yoki shubhali belgilarni tekshirish
        suspicious_chars = ['0', 'o', '1', 'l', 'i']
        for char in suspicious_chars:
            if char in domain and domain.count(char) > 2:
                return True
        return False
    
    def _extract_domain(self, email: str) -> Optional[str]:
        """Email manzilidan domenni ajratib olish."""
        if '@' in email:
            return email.split('@')[1].lower()
        return None
    
    def _is_suspicious_domain(self, domain: str) -> bool:
        """Domen shubhali ko'rinishini tekshirish."""
        # Typosquatting patternlarini tekshirish
        suspicious_patterns = [
            r'[0-9]+[a-z]+',  # Raqamlar harflar bilan aralashgan
            r'[a-z]+[0-9]+',  # Harflar raqamlar bilan aralashgan
            r'\.(tk|ml|ga|cf)$',  # Shubhali TLD'lar
        ]
        for pattern in suspicious_patterns:
            if re.search(pattern, domain):
                return True
        return False
    
    def _has_obfuscated_html(self, html: str) -> bool:
        """Obfuskatsiya qilingan HTML'ni tekshirish (base64, hex va boshqalar)."""
        if not html:
            return False
        
        # Base64 kodlangan kontentni tekshirish
        base64_pattern = r'data:text/html;base64,[A-Za-z0-9+/=]+'
        if re.search(base64_pattern, html, re.IGNORECASE):
            return True
        
        # Hex kodlangan kontentni tekshirish
        hex_pattern = r'&#x[0-9a-fA-F]+;'
        if len(re.findall(hex_pattern, html)) > 5:
            return True
        
        return False
    
    def _extract_header(self, headers: List[Dict], name: str) -> str:
        """Headerlar ro'yxatidan header qiymatini ajratib olish."""
        for header in headers:
            if header.get('name', '').lower() == name.lower():
                return header.get('value', '')
        return ''
    
    def _check_spf(self, headers: List[Dict]) -> str:
        """SPF autentifikatsiya natijasini tekshirish."""
        received_spf = self._extract_header(headers, 'Received-SPF')
        if 'pass' in received_spf.lower():
            return 'pass'
        elif 'fail' in received_spf.lower():
            return 'fail'
        elif 'neutral' in received_spf.lower():
            return 'neutral'
        return 'none'
    
    def _check_dkim(self, headers: List[Dict]) -> str:
        """DKIM autentifikatsiya natijasini tekshirish."""
        dkim_signature = self._extract_header(headers, 'DKIM-Signature')
        dkim_auth = self._extract_header(headers, 'Authentication-Results')
        
        if dkim_signature:
            if 'pass' in dkim_auth.lower():
                return 'pass'
            elif 'fail' in dkim_auth.lower():
                return 'fail'
        return 'none'
    
    def _check_dmarc(self, headers: List[Dict]) -> str:
        """DMARC autentifikatsiya natijasini tekshirish."""
        auth_results = self._extract_header(headers, 'Authentication-Results')
        if 'dmarc=pass' in auth_results.lower():
            return 'pass'
        elif 'dmarc=fail' in auth_results.lower():
            return 'fail'
        elif 'dmarc=neutral' in auth_results.lower():
            return 'neutral'
        return 'none'

# Global instance
phishing_detector = PhishingDetector()


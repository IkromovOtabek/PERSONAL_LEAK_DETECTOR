"""
Matndagi shaxsiy ma'lumotlarni aniqlash dvigateli.
Regex patternlar va NER (Named Entity Recognition) ishlatadi (hozirda faqat regex ishlatiladi).
"""
import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from app.models.sensitive_item import PIIType

@dataclass
class DetectionResult:
    """Aniqlash natijasi."""
    type: str
    value: str
    snippet: str
    start_pos: int
    end_pos: int
    confidence: float = 1.0

class DetectionEngine:
    """Shaxsiy ma'lumotlarni aniqlash dvigateli."""
    
    def __init__(self):
        self.patterns = self._init_patterns()
        self.ner_model = None  # Hozirda ishlatilmaydi (kelajakda yuklanadi)
    
    def _init_patterns(self) -> Dict[str, List[Tuple[str, re.Pattern]]]:
        """Turli PII turlari uchun regex patternlarni yaratish."""
        patterns = {
            PIIType.EMAIL.value: [
                (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', re.IGNORECASE)
            ],
            PIIType.PHONE.value: [
                # Xalqaro format
                (r'\+?\d{1,3}?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}', re.IGNORECASE),
                # AQSh format
                (r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', re.IGNORECASE),
            ],
            PIIType.CREDIT_CARD.value: [
                # Kredit karta pattern (13-16 raqam, ixtiyoriy ajratgichlar bilan)
                (r'\b(?:\d[ -]*?){13,16}\b', re.IGNORECASE),
            ],
            PIIType.PASSPORT.value: [
                # Umumiy pasport formatlari
                (r'\b[A-Z]{1,2}\d{6,9}\b', re.IGNORECASE),
                (r'\b\d{9}\b', re.IGNORECASE),
            ],
            PIIType.ID_CARD.value: [
                # ID karta patternlari
                (r'\b\d{8,12}\b', re.IGNORECASE),
            ],
        }
        
        # Patternlarni compile qilish
        compiled = {}
        for pii_type, pattern_list in patterns.items():
            compiled[pii_type] = [
                (pattern, re.compile(pattern, flags=flags))
                for pattern, flags in pattern_list
            ]
        
        return compiled
    
    def _luhn_check(self, card_number: str) -> bool:
        """Luhn algoritmi orqali kredit karta raqamini tekshirish."""
        # Raqam bo'lmagan belgilarni olib tashlash
        digits = re.sub(r'\D', '', card_number)
        if len(digits) < 13 or len(digits) > 19:
            return False
        
        # Luhn algoritmi
        total = 0
        reverse_digits = digits[::-1]
        for i, digit in enumerate(reverse_digits):
            n = int(digit)
            if i % 2 == 1:
                n *= 2
                if n > 9:
                    n -= 9
            total += n
        
        return total % 10 == 0
    
    def _extract_context(self, text: str, start: int, end: int, context_size: int = 100) -> str:
        """Topilgan ma'lumot atrofidagi kontekstni ajratib olish."""
        context_start = max(0, start - context_size)
        context_end = min(len(text), end + context_size)
        return text[context_start:context_end]
    
    def detect_in_text(self, text: str, sensitive_items: Optional[List[Dict]] = None) -> List[DetectionResult]:
        """
        Matnda shaxsiy ma'lumotlarni aniqlash.
        
        Args:
            text: Tahlil qilinadigan matn
            sensitive_items: Foydalanuvchi belgilangan sezgir ma'lumotlar ro'yxati
        
        Returns:
            DetectionResult obyektlari ro'yxati
        """
        results = []
        text_lower = text.lower()
        
        # Pattern asosidagi aniqlash
        for pii_type, pattern_list in self.patterns.items():
            for pattern_str, compiled_pattern in pattern_list:
                for match in compiled_pattern.finditer(text):
                    value = match.group()
                    
                    # Kredit karta uchun qo'shimcha tekshirish
                    if pii_type == PIIType.CREDIT_CARD.value:
                        if not self._luhn_check(value):
                            continue
                    
                    # Kontekst ajratib olish
                    snippet = self._extract_context(text, match.start(), match.end())
                    
                    # Foydalanuvchi sezgir ma'lumotlari bilan mos kelishini tekshirish
                    matches_user_item = False
                    if sensitive_items:
                        for item in sensitive_items:
                            if self._fuzzy_match(value, item.get('value', '')):
                                matches_user_item = True
                                break
                    
                    results.append(DetectionResult(
                        type=pii_type,
                        value=value,
                        snippet=snippet,
                        start_pos=match.start(),
                        end_pos=match.end(),
                        confidence=1.0 if matches_user_item else 0.8
                    ))
        
        # Dublikatlarni olib tashlash (bir xil o'rin, bir xil tur)
        unique_results = []
        seen = set()
        for result in results:
            key = (result.start_pos, result.end_pos, result.type)
            if key not in seen:
                seen.add(key)
                unique_results.append(result)
        
        return unique_results
    
    def _fuzzy_match(self, value1: str, value2: str, threshold: float = 0.8) -> bool:
        """Normalizatsiya qilingan taqqoslash orqali oddiy fuzzy matching."""
        # Normalizatsiya: bo'shliqlar, tire va boshqalarni olib tashlash
        norm1 = re.sub(r'[\s\-\(\)]', '', value1.lower())
        norm2 = re.sub(r'[\s\-\(\)]', '', value2.lower())
        
        if norm1 == norm2:
            return True
        
        # Oddiy o'xshashlik tekshiruvi
        if len(norm1) == 0 or len(norm2) == 0:
            return False
        
        # Biri ikkinchisini o'z ichiga olganini tekshirish (qisman mosliklar uchun)
        if norm1 in norm2 or norm2 in norm1:
            return True
        
        # Kichik farqlar uchun Levenshtein o'xshash tekshiruv
        if abs(len(norm1) - len(norm2)) <= 2:
            matches = sum(c1 == c2 for c1, c2 in zip(norm1, norm2))
            similarity = matches / max(len(norm1), len(norm2))
            return similarity >= threshold
        
        return False
    
    def detect_sensitive_items(self, text: str, user_items: List[Dict]) -> List[DetectionResult]:
        """
        Foydalanuvchi sezgir ma'lumotlarining matnda paydo bo'lishini aniqlash.
        
        Args:
            text: Tahlil qilinadigan matn
            user_items: Hash qilingan qiymatlar bilan foydalanuvchi sezgir ma'lumotlari ro'yxati
        
        Returns:
            DetectionResult obyektlari ro'yxati
        """
        results = []
        text_lower = text.lower()
        
        for item in user_items:
            item_type = item.get('type')
            item_value = item.get('value', '')
            
            if not item_value:
                continue
            
            # Moslik uchun element qiymatini normalizatsiya qilish
            normalized_item = re.sub(r'[\s\-\(\)]', '', item_value.lower())
            
            # Matnda elementni qidirish
            if normalized_item in text_lower:
                # Barcha topilganlarni topish
                start = 0
                while True:
                    pos = text_lower.find(normalized_item, start)
                    if pos == -1:
                        break
                    
                    snippet = self._extract_context(text, pos, pos + len(normalized_item))
                    
                    results.append(DetectionResult(
                        type=item_type,
                        value=text[pos:pos + len(normalized_item)],
                        snippet=snippet,
                        start_pos=pos,
                        end_pos=pos + len(normalized_item),
                        confidence=1.0
                    ))
                    
                    start = pos + 1
        
        return results

# Global instance
detection_engine = DetectionEngine()


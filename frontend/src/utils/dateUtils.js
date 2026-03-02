/**
 * Date utilities for Korea Standard Time (KST, UTC+9).
 */
import { format } from 'date-fns';

// Korea Standard Time (KST) is UTC+9
const KST_OFFSET_HOURS = 9;

/**
 * Convert UTC date to KST (UTC+9)
 * Uses UTC methods to avoid double conversion issues with local timezone
 * @param {Date|string} date - Date to convert (assumed to be in UTC from backend)
 * @returns {Date} Date in KST timezone
 */
function toKST(date) {
  if (!date) return null;
  
  try {
    let dateObj;
    if (typeof date === 'string') {
      // Backend'dan kelgan vaqtlar ISO 8601 formatida bo'lishi kerak
      // FastAPI datetime'ni JSON'ga o'tkazganda, u UTC formatida yuboriladi ('Z' bilan)
      // Lekin ba'zida timezone belgisi bo'lmasligi mumkin
      
      // Agar 'Z' bo'lsa, u allaqachon UTC formatida
      if (date.includes('Z')) {
        dateObj = new Date(date);
      } 
      // Agar timezone offset bo'lsa (+09:00, -05:00), u allaqachon timezone-aware
      else if (date.match(/[+-]\d{2}:\d{2}$/)) {
        dateObj = new Date(date);
      } 
      // Agar timezone belgisi bo'lmasa, UTC deb hisoblaymiz va 'Z' qo'shamiz
      else if (date.includes('T')) {
        // ISO formatida, lekin timezone belgisi yo'q - UTC deb hisoblaymiz
        dateObj = new Date(date + 'Z');
      } 
      // Oddiy format - Date constructor'ga beramiz
      else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    // If dateObj is invalid, return null
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return null;
    }
    
    // ✅ To'g'ri yondashuv: UTC metodlari orqali KST offset qo'shish
    // Bu double conversion muammosini oldini oladi
    // JavaScript Date object har doim UTC timestampni ichida saqlaydi
    // Biz UTC qiymatlarini olamiz va KST offset'ni qo'shamiz
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();
    const hour = dateObj.getUTCHours() + KST_OFFSET_HOURS; // KST offset qo'shish
    const minutes = dateObj.getUTCMinutes();
    const seconds = dateObj.getUTCSeconds();
    const milliseconds = dateObj.getUTCMilliseconds();
    
    // Date.UTC() orqali yangi Date object yaratish
    // Bu har doim to'g'ri KST vaqtini beradi, local timezone'dan qat'iy nazar
    return new Date(Date.UTC(year, month, day, hour, minutes, seconds, milliseconds));
  } catch (error) {
    console.error('Error converting to KST:', error, date);
    return null;
  }
}

/**
 * Format date to KST timezone
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (default: 'd MMM, yyyy HH:mm')
 * @returns {string} Formatted date string in KST
 */
export function formatKST(date, formatStr = 'd MMM, yyyy HH:mm') {
  if (!date) return '';
  
  try {
    const kst = toKST(date);
    if (!kst) return '';
    
    // ✅ Soddalashtirilgan versiya
    // date-fns har doim local timezone'da format qiladi,
    // shuning uchun biz unga KST qiymatlariga ega bo'lgan local Date beramiz
    // toKST() funksiyasi allaqachon to'g'ri KST Date object qaytaradi
    return format(
      new Date(
        kst.getUTCFullYear(),
        kst.getUTCMonth(),
        kst.getUTCDate(),
        kst.getUTCHours(),
        kst.getUTCMinutes(),
        kst.getUTCSeconds()
      ),
      formatStr
    );
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Get current time in KST
 * @returns {Date} Current date in KST timezone
 */
export function getKSTNow() {
  return toKST(new Date());
}


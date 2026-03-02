"""
Monitoring endpoints for disk scanning and malicious file detection.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import platform
import logging
from pathlib import Path

from app.db.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

# Zararli fayl kengaytmalari (faqat bu kengaytmalar zararli deb hisoblanadi)
MALICIOUS_EXTENSIONS = {
    '.exe',  # Windows executable
    '.bat',  # Batch file
    '.js',   # JavaScript (zararli bo'lishi mumkin)
    '.vbs',  # VBScript
    '.scr',  # Screen saver (zararli bo'lishi mumkin)
    '.apk',  # Android application
    '.docm', # Word macro-enabled document
    '.xlsm', # Excel macro-enabled document
}


def is_malicious_file(file_path: str) -> bool:
    """
    Faylning zararli ekanligini tekshirish.
    Faqat belgilangan zararli kengaytmalar tekshiriladi.
    """
    try:
        file_ext = Path(file_path).suffix.lower()
        
        # Agar kengaytma zararli ro'yxatda bo'lsa
        if file_ext in MALICIOUS_EXTENSIONS:
            return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking file {file_path}: {e}")
        return False


def scan_directory(directory: str, max_depth: int = 10, current_depth: int = 0) -> List[dict]:
    """
    Katalogni skan qilish va zararli fayllarni topish.
    """
    malicious_files = []
    
    try:
        if current_depth >= max_depth:
            return malicious_files
        
        if not os.path.exists(directory) or not os.path.isdir(directory):
            return malicious_files
        
        # Permission tekshirish
        if not os.access(directory, os.R_OK):
            logger.warning(f"No read permission for directory: {directory}")
            return malicious_files
        
        for root, dirs, files in os.walk(directory):
            # Depth limit
            depth = root.replace(directory, '').count(os.sep)
            if depth + current_depth >= max_depth:
                dirs[:] = []  # Don't recurse deeper
                continue
            
            for file in files:
                try:
                    file_path = os.path.join(root, file)
                    
                    # Permission tekshirish
                    if not os.access(file_path, os.R_OK):
                        continue
                    
                    if is_malicious_file(file_path):
                        file_stat = os.stat(file_path)
                        malicious_files.append({
                            'path': file_path,
                            'name': file,
                            'size': file_stat.st_size,
                            'modified': file_stat.st_mtime,
                            'extension': Path(file_path).suffix.lower()
                        })
                except (OSError, PermissionError) as e:
                    logger.warning(f"Error accessing file {file}: {e}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error processing file {file}: {e}")
                    continue
            
            # Limit: agar juda ko'p fayl topilsa, to'xtatish
            if len(malicious_files) > 1000:
                break
        
    except (OSError, PermissionError) as e:
        logger.warning(f"Error scanning directory {directory}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error scanning directory {directory}: {e}")
    
    return malicious_files


@router.get("/disks")
async def get_disks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kompyuterdagi barcha disklarni qaytarish.
    """
    try:
        disks = []
        system = platform.system()
        
        if system == "Windows":
            import string
            # Windows uchun C:, D:, E: va hokazo
            for letter in string.ascii_uppercase:
                disk_path = f"{letter}:\\"
                if os.path.exists(disk_path):
                    try:
                        disk_info = {
                            'name': f"{letter}:",
                            'path': disk_path,
                            'label': f"Disk {letter}:",
                            'available': True
                        }
                        
                        # Disk hajmini olish (Windows uchun)
                        try:
                            import shutil
                            total, used, free = shutil.disk_usage(disk_path)
                            disk_info['total_size'] = total
                            disk_info['used_size'] = used
                            disk_info['free_size'] = free
                        except Exception as e:
                            logger.warning(f"Error getting disk usage for {disk_path}: {e}")
                        
                        disks.append(disk_info)
                    except Exception as e:
                        logger.warning(f"Error getting disk info for {disk_path}: {e}")
        
        elif system == "Linux" or system == "Darwin":  # Linux yoki macOS
            # Root directory va mount point'larni topish
            if system == "Linux":
                # /proc/mounts dan mount point'larni olish
                try:
                    with open('/proc/mounts', 'r') as f:
                        for line in f:
                            parts = line.split()
                            if len(parts) >= 2:
                                mount_point = parts[1]
                                if mount_point.startswith('/') and os.path.exists(mount_point):
                                    try:
                                        import shutil
                                        total, used, free = shutil.disk_usage(mount_point)
                                        disks.append({
                                            'name': os.path.basename(mount_point) or mount_point,
                                            'path': mount_point,
                                            'label': mount_point,
                                            'available': True,
                                            'total_size': total,
                                            'used_size': used,
                                            'free_size': free
                                        })
                                    except:
                                        disks.append({
                                            'name': os.path.basename(mount_point) or mount_point,
                                            'path': mount_point,
                                            'label': mount_point,
                                            'available': True
                                        })
                except:
                    # Fallback: faqat root
                    disks.append({
                        'name': 'root',
                        'path': '/',
                        'label': 'Root (/)',
                        'available': True
                    })
            else:  # macOS
                # /Volumes dan disk'larni topish
                volumes_path = '/Volumes'
                if os.path.exists(volumes_path):
                    for item in os.listdir(volumes_path):
                        volume_path = os.path.join(volumes_path, item)
                        if os.path.isdir(volume_path):
                            try:
                                import shutil
                                total, used, free = shutil.disk_usage(volume_path)
                                disks.append({
                                    'name': item,
                                    'path': volume_path,
                                    'label': item,
                                    'available': True,
                                    'total_size': total,
                                    'used_size': used,
                                    'free_size': free
                                })
                            except:
                                disks.append({
                                    'name': item,
                                    'path': volume_path,
                                    'label': item,
                                    'available': True
                                })
        
        return {"disks": disks}
    
    except Exception as e:
        logger.error(f"Error getting disks: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disk'larni olishda xatolik: {str(e)}"
        )


@router.get("/scan")
async def scan_disk(
    disk_path: str,
    max_depth: Optional[int] = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tanlangan diskni skan qilish va zararli fayllarni topish.
    disk_path query parameter sifatida yuboriladi.
    """
    try:
        # URL decode
        import urllib.parse
        disk_path = urllib.parse.unquote(disk_path)
        
        # Xavfsizlik tekshiruvi - faqat disk path'ga ruxsat berish
        if not os.path.exists(disk_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disk topilmadi"
            )
        
        if not os.path.isdir(disk_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu disk emas"
            )
        
        # Skan qilish
        malicious_files = scan_directory(disk_path, max_depth=max_depth or 5)
        
        return {
            "disk_path": disk_path,
            "malicious_files": malicious_files,
            "count": len(malicious_files)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scanning disk {disk_path}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disk skan qilishda xatolik: {str(e)}"
        )


@router.post("/open-file")
async def open_file(
    file_path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Faylni Windows Explorer'da ochish (fayl joylashgan papkani ochish va faylni tanlash).
    Windows'da explorer.exe /select,<file_path> buyrug'i ishlatiladi.
    """
    try:
        import urllib.parse
        import subprocess
        file_path = urllib.parse.unquote(file_path)
        
        # Xavfsizlik tekshiruvi
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fayl topilmadi"
            )
        
        if not os.path.isfile(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu fayl emas"
            )
        
        # Windows Explorer'da fayl joylashgan papkani ochish va faylni tanlash
        system = platform.system()
        if system == "Windows":
            try:
                # Windows uchun: explorer.exe /select,"<file_path>"
                # /select parametri faylni tanlab ko'rsatadi
                normalized_path = os.path.normpath(file_path)
                subprocess.Popen(f'explorer.exe /select,"{normalized_path}"', shell=True)
                logger.info(f"Opened file in Windows Explorer: {file_path}")
            except Exception as e:
                logger.error(f"Error opening file in Windows Explorer: {e}", exc_info=True)
                # Agar explorer ochilmasa, faqat path'ni qaytarish
                pass
        elif system == "Darwin":  # macOS
            try:
                # macOS uchun: open -R "<file_path>"
                subprocess.Popen(['open', '-R', file_path])
                logger.info(f"Opened file in Finder: {file_path}")
            except Exception as e:
                logger.error(f"Error opening file in Finder: {e}", exc_info=True)
        elif system == "Linux":
            try:
                # Linux uchun: xdg-open "<directory>"
                directory = os.path.dirname(file_path)
                subprocess.Popen(['xdg-open', directory])
                logger.info(f"Opened directory in file manager: {directory}")
            except Exception as e:
                logger.error(f"Error opening directory in file manager: {e}", exc_info=True)
        
        # Fayl ma'lumotlarini qaytarish
        file_stat = os.stat(file_path)
        
        return {
            "file_path": file_path,
            "name": os.path.basename(file_path),
            "size": file_stat.st_size,
            "modified": file_stat.st_mtime,
            "directory": os.path.dirname(file_path),
            "message": "Fayl Windows Explorer'da ochildi"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error opening file {file_path}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Faylni ochishda xatolik: {str(e)}"
        )


@router.delete("/delete-file")
async def delete_file(
    file_path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Zararli faylni o'chirish.
    """
    try:
        import urllib.parse
        file_path = urllib.parse.unquote(file_path)
        
        # Xavfsizlik tekshiruvi
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fayl topilmadi"
            )
        
        if not os.path.isfile(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu fayl emas"
            )
        
        # Faylni o'chirish
        try:
            os.remove(file_path)
            logger.info(f"File deleted: {file_path} by user {current_user.id}")
            
            return {
                "success": True,
                "message": "Fayl muvaffaqiyatli o'chirildi",
                "file_path": file_path
            }
        except PermissionError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Faylni o'chirish uchun ruxsat yo'q"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Faylni o'chirishda xatolik: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Faylni o'chirishda xatolik: {str(e)}"
        )


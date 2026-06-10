#!/usr/bin/env python3
"""
Personal Leak Detector — Lokal Agent (MVP)

Bu skript FOYDALANUVCHINING o'z kompyuterida ishlaydi:
  - Disklarni (C:, D: / mount pointlar) topadi
  - Fayllarni maxfiy ma'lumotlar uchun skanlaydi (email, telefon, karta, parol, ...)
  - Natijani myleakdetector.org serveriga (token bilan) yuboradi
  - Foydalanuvchi natijani saytdagi Monitoring sahifasida ko'radi

FAQAT standart kutubxonalar ishlatiladi — pip install KERAK EMAS.

Ishlatish:
  1. Saytda login -> Monitoring -> "Agent token"ni nusxalang
  2. Bu skriptni yuklab oling
  3. Terminalda:
       python pld_agent.py --token <SIZNING_TOKEN>
     (xohlasangiz:  python pld_agent.py --token <TOKEN> --full  -> butun disklarni skanlaydi)
"""
import argparse
import json
import os
import platform
import re
import shutil
import socket
import sys
import urllib.request

DEFAULT_SERVER = "https://myleakdetector.org"

# Skan chegaralari (demo uchun xavfsiz va tez)
MAX_FILES = 3000          # ko'pi bilan shuncha fayl
MAX_FILE_BYTES = 2 * 1024 * 1024   # 2MB dan katta fayllar o'tkazib yuboriladi
MAX_FINDINGS = 500        # ko'pi bilan shuncha topilma yuboriladi
READ_BYTES = 200_000      # har fayldan o'qiladigan maksimal bayt

# Skanlanadigan fayl turlari (matnli)
TEXT_EXTS = {
    ".txt", ".csv", ".log", ".md", ".json", ".xml", ".html", ".htm",
    ".env", ".ini", ".conf", ".cfg", ".yml", ".yaml", ".py", ".js",
    ".ts", ".sql", ".bak", ".note", ".rtf",
}

# O'tkazib yuboriladigan papkalar (tizim/keraksiz)
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", "venv", ".venv", "env",
    "Windows", "Program Files", "Program Files (x86)", "AppData",
    "Library", "System", "Applications", ".cache", "site-packages",
}

# Maxfiy ma'lumot shablonlari (regex)
PATTERNS = {
    "Email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "Telefon (UZ)": re.compile(r"\+998\d{9}"),
    "Karta raqami": re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    "Pasport (UZ)": re.compile(r"\b[A-Z]{2}\d{7}\b"),
    "Parol/Maxfiy kalit": re.compile(r"(?i)(password|parol|secret|api[_-]?key|token)\s*[:=]\s*\S+"),
}


def get_disks():
    """Tizimdagi disklar va ularning hajmini qaytaradi."""
    disks = []
    system = platform.system()
    if system == "Windows":
        import string
        for letter in string.ascii_uppercase:
            path = f"{letter}:\\"
            if os.path.exists(path):
                try:
                    total, used, free = shutil.disk_usage(path)
                    disks.append({"name": f"{letter}:", "path": path,
                                  "total_size": total, "used_size": used, "free_size": free})
                except Exception:
                    disks.append({"name": f"{letter}:", "path": path})
    else:
        roots = ["/"]
        vol = "/Volumes"
        if os.path.isdir(vol):
            roots += [os.path.join(vol, d) for d in os.listdir(vol)]
        for path in roots:
            try:
                total, used, free = shutil.disk_usage(path)
                disks.append({"name": os.path.basename(path) or path, "path": path,
                              "total_size": total, "used_size": used, "free_size": free})
            except Exception:
                pass
    return disks


def scan_roots(full=False):
    """Skanlanadigan boshlang'ich papkalar."""
    if full:
        return [d["path"] for d in get_disks()]
    # Default: foydalanuvchi uy papkasi (tez va xavfsiz)
    return [os.path.expanduser("~")]


def redact(match_text):
    """Topilmani qisman yashirish (xavfsizlik uchun to'liq ko'rsatmaymiz)."""
    s = match_text.strip()
    if len(s) <= 6:
        return s[0] + "***"
    return s[:3] + "***" + s[-2:]


def scan_file(path):
    """Bitta faylni skanlab, topilmalarni qaytaradi."""
    out = []
    try:
        if os.path.getsize(path) > MAX_FILE_BYTES:
            return out
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(READ_BYTES)
    except Exception:
        return out
    for label, rx in PATTERNS.items():
        for m in rx.finditer(content):
            out.append({"path": path, "type": label, "preview": redact(m.group(0))})
            break  # har fayl uchun har turdan bitta namuna yetarli
    return out


def scan_disks(full=False):
    """Disklarni skanlab, topilmalar ro'yxatini qaytaradi."""
    findings = []
    files_seen = 0
    for root in scan_roots(full=full):
        for dirpath, dirnames, filenames in os.walk(root):
            # Tizim/keraksiz papkalarni o'tkazib yuborish
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
            for name in filenames:
                ext = os.path.splitext(name)[1].lower()
                if ext not in TEXT_EXTS:
                    continue
                files_seen += 1
                if files_seen > MAX_FILES:
                    print(f"  (chegaraga yetildi: {MAX_FILES} fayl)")
                    return findings
                fp = os.path.join(dirpath, name)
                findings.extend(scan_file(fp))
                if len(findings) >= MAX_FINDINGS:
                    return findings
    return findings


def send_report(server, token, payload):
    """Natijani serverga yuboradi."""
    url = server.rstrip("/") + "/api/v1/agent/report"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-Agent-Token", token)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.read().decode("utf-8")


def main():
    parser = argparse.ArgumentParser(description="Personal Leak Detector — Lokal Agent")
    parser.add_argument("--token", required=True, help="Saytdagi Monitoring sahifasidan olingan agent token")
    parser.add_argument("--server", default=DEFAULT_SERVER, help=f"Server URL (default: {DEFAULT_SERVER})")
    parser.add_argument("--full", action="store_true", help="Butun disklarni skanlash (sekin). Default: faqat uy papkasi")
    args = parser.parse_args()

    print("=" * 55)
    print(" Personal Leak Detector — Lokal Agent")
    print("=" * 55)
    print(f" Tizim:  {platform.system()} {platform.release()}")
    print(f" Server: {args.server}")
    print(f" Rejim:  {'BUTUN DISKLAR' if args.full else 'Uy papkasi (tez)'}")
    print("-" * 55)

    print(" Disklar aniqlanmoqda...")
    disks = get_disks()
    for d in disks:
        if "total_size" in d:
            gb = d["total_size"] / (1024 ** 3)
            print(f"   {d['name']:<10} {gb:6.1f} GB")
        else:
            print(f"   {d['name']}")

    print(" Fayllar skanlanmoqda (biroz vaqt olishi mumkin)...")
    findings = scan_disks(full=args.full)
    print(f" Topildi: {len(findings)} ta maxfiy ma'lumot belgisi")

    payload = {
        "hostname": socket.gethostname(),
        "platform": f"{platform.system()} {platform.release()}",
        "disks": disks,
        "findings": findings,
    }

    print(" Natija serverga yuborilmoqda...")
    try:
        status, body = send_report(args.server, args.token, payload)
        print(f" ✅ Yuborildi! (HTTP {status})")
        print(" Natijani saytdagi Monitoring sahifasida ko'ring.")
    except urllib.error.HTTPError as e:
        print(f" ❌ Xato (HTTP {e.code}): {e.read().decode('utf-8', 'ignore')}")
        print(" Token to'g'rimi? Muddati o'tmaganmi? Qayta nusxalab ko'ring.")
        sys.exit(1)
    except Exception as e:
        print(f" ❌ Yuborishda xato: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

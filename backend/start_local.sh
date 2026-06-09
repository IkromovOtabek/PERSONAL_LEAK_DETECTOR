#!/bin/sh
#
# Simple local backend runner (macOS/Linux).
# (POSIX sh: bash/zsh/old macOS bash bilan ham ishlaydi)
#
# Usage:
#   sh start_local.sh
#   bash start_local.sh
#   sh start_local.sh 8000
#   HOST=0.0.0.0 PORT=8000 sh start_local.sh
#

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT_DIR"

# Load env vars if present (.env.local preferred)
if [ -f ".env.local" ]; then
  set -a
  . ".env.local"
  set +a
elif [ -f ".env" ]; then
  set -a
  . ".env"
  set +a
fi

# Activate venv if it exists
if [ -f "venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  . "venv/bin/activate"
fi

PORT="${PORT:-${1:-8000}}"
HOST="${HOST:-127.0.0.1}"

exec python -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"


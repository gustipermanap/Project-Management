#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Cek Hak Akses Docker Daemon
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
  else
    echo "Error: Anda tidak memiliki akses ke Docker daemon dan perintah 'sudo' tidak ditemukan."
    exit 1
  fi
fi

echo "Reset SQLite database di container backend..."
$DOCKER_CMD compose exec backend python -m app.create_db --reset
echo "Database sudah di-reset dan seed default sudah dibuat ulang."

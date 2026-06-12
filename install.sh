#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "  Smart Project Aggregator - Installer Script"
echo "=================================================="

# 1. Cek Sistem Operasi
OS_TYPE="$(uname -s)"
if [ "$OS_TYPE" != "Linux" ]; then
  echo "Peringatan: Script ini dioptimalkan untuk sistem operasi Linux."
  echo "Sistem Anda terdeteksi sebagai: $OS_TYPE"
  echo "Pastikan Docker dan Docker Compose berjalan secara manual."
fi

# Fungsi pembantu untuk menginstal Docker secara otomatis
install_docker() {
  echo "Mendeteksi instalasi Docker..."
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker belum terinstal. Memulai instalasi otomatis via get.docker.com..."
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL https://get.docker.com -o get-docker.sh
      sudo sh get-docker.sh
      rm get-docker.sh
    elif command -v wget >/dev/null 2>&1; then
      wget -qO- https://get.docker.com | sudo sh
    else
      echo "Error: curl atau wget tidak ditemukan. Silakan instal Docker secara manual."
      exit 1
    fi
    
    # Jalankan docker service
    echo "Mengaktifkan dan menjalankan Docker service..."
    sudo systemctl enable --now docker || sudo service docker start || true
  else
    echo "Docker sudah terpasang."
  fi
}

# Fungsi pembantu untuk menginstal Docker Compose CLI plugin
install_docker_compose() {
  echo "Mendeteksi instalasi Docker Compose CLI plugin..."
  if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose CLI plugin belum terinstal. Mencoba memasang..."
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update
      sudo apt-get install -y docker-compose-plugin
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y docker-compose-plugin
    elif command -v yum >/dev/null 2>&1; then
      sudo yum install -y docker-compose-plugin
    else
      echo "Mengunduh Docker Compose plugin secara manual ke folder user CLI plugins..."
      DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
      mkdir -p "$DOCKER_CONFIG/cli-plugins"
      curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
      chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"
    fi
  else
    echo "Docker Compose sudah terpasang."
  fi
}

# Jalankan instalasi jika diperlukan
if [ "$OS_TYPE" = "Linux" ]; then
  install_docker
  install_docker_compose
fi

# 2. Cek Hak Akses Docker Daemon
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
  echo "Akses langsung ke Docker Daemon dibatasi oleh sistem."
  if command -v sudo >/dev/null 2>&1; then
    echo "Menggunakan perintah dengan hak akses 'sudo'..."
    DOCKER_CMD="sudo docker"
  else
    echo "Error: Anda tidak memiliki akses ke Docker daemon dan perintah 'sudo' tidak ditemukan."
    exit 1
  fi
fi

# 3. Build dan Jalankan Container
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Membangun dan menjalankan Management Project container..."
$DOCKER_CMD compose up -d --build

# 4. Tampilkan Informasi Akses
HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

echo
echo "=================================================="
echo "          PROSES INSTALASI SELESAI"
echo "=================================================="
echo "Frontend lokal : http://localhost:3333"
echo "Backend lokal  : http://localhost:8291"
if [ -n "${HOST_IP:-}" ]; then
  echo "Frontend LAN   : http://${HOST_IP}:3333"
  echo "Backend LAN    : http://${HOST_IP}:8291"
fi
echo "=================================================="
echo "Login default semua password: password123"
echo "  - Supadmin        : supadmin"
echo "  - Project Manager : pm"
echo "  - Developer 1     : developer1"
echo "  - Developer 2     : developer2"
echo "  - QA Engineer     : qa"
echo "=================================================="

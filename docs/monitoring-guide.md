# Panduan Penggunaan & Pengelolaan Sistem Monitoring

Panduan ini menjelaskan cara menggunakan, mengelola, dan memperluas sistem monitoring berbasis **Prometheus + Grafana + Node Exporter + cAdvisor** yang telah dipasang di server Anda.

---

## 1. Alamat Akses & Kredensial

*   **Grafana Dashboard:** `http://<IP_SERVER_ANDA>:3000`
    *   **Username default:** `admin`
    *   **Password default:** `admin` *(Anda akan diminta menggantinya pada login pertama)*
*   **Prometheus UI:** `http://<IP_SERVER_ANDA>:9090`
    *   Digunakan untuk melihat target penarikan data (*scraping*) dan mencoba query mentah (*PromQL*).

---

## 2. Cara Menggunakan Dashboard Grafana

1.  Buka Grafana di browser Anda.
2.  Login menggunakan akun admin.
3.  Klik ikon **Menu (Garis Tiga)** di kiri atas -> Pilih **Dashboards**.
4.  Klik pada dashboard **Docker Containers & Host Performance**.
5.  Di dashboard ini, Anda akan melihat metrik penting:
    *   **Host Metrics:** Penggunaan CPU, RAM, dan kapasitas harddisk utama server.
    *   **Active Docker Containers:** Jumlah container yang sedang berjalan secara aktif.
    *   **Containers CPU & Memory Usage:** Grafik real-time konsumsi daya CPU dan memori per container.
    *   **Containers Network IO:** Trafik data masuk (Rx) dan keluar (Tx) dari masing-masing container.

---

## 3. Cara Memantau Container Docker Baru

Sistem pemantauan container menggunakan **cAdvisor** yang terhubung langsung ke Docker socket (`/var/run/docker.sock`).
*   **Tidak ada konfigurasi tambahan yang diperlukan.**
*   Setiap kali Anda menjalankan container Docker baru di server ini (menggunakan `docker run` atau `docker compose up`), cAdvisor akan **otomatis mendeteksi** container tersebut secara real-time.
*   Grafik penggunaan CPU, RAM, dan Jaringan untuk container baru tersebut akan langsung muncul di dashboard Grafana.

---

## 4. Cara Menambahkan Server Lain ke dalam Monitoring (Multi-Server)

Jika Anda memiliki server kedua atau ketiga yang ingin dipantau dari satu dashboard Grafana pusat ini, ikuti langkah-langkah berikut:

### Langkah A: Instal Node Exporter di Server Baru
Di server target yang ingin Anda pantau, pasang Node Exporter menggunakan Docker Compose:
1. Buat file `docker-compose.yml` di server baru tersebut:
   ```yaml
   version: '3.8'
   services:
     node-exporter:
       image: prom/node-exporter:v1.6.1
       container_name: node-exporter
       volumes:
         - /proc:/host/proc:ro
         - /sys:/host/sys:ro
         - /:/rootfs:ro
       command:
         - '--path.procfs=/host/proc'
         - '--path.rootfs=/rootfs'
         - '--path.sysfs=/host/sys'
         - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
       ports:
         - "9100:9100"
       restart: unless-stopped
   ```
2. Jalankan perintah `docker compose up -d`. Node Exporter sekarang aktif dan mendengarkan di port `9100` server tersebut.
3. *Pastikan port `9100` di server baru dapat diakses oleh server monitoring utama (atur firewall/security group jika diperlukan).*

### Langkah B: Daftarkan Server Baru di Prometheus Utama
1. Di server utama monitoring, buka file `/root/Project-Management/monitoring/prometheus/prometheus.yml`.
2. Edit bagian `scrape_configs` untuk menambahkan server baru ke dalam job `node-exporter`:
   ```yaml
     - job_name: 'node-exporter'
       static_configs:
         - targets: 
             - 'node-exporter:9100'        # Server saat ini
             - '<IP_SERVER_BARU>:9100'     # Tambahkan IP server baru Anda di sini
   ```
3. Muat ulang konfigurasi Prometheus tanpa mematikan layanan dengan menjalankan perintah ini di terminal server utama:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```
   *(Atau restart kontainer Prometheus: `docker compose restart prometheus`)*

---

## 5. Cara Menambahkan Dashboard Kustom Baru di Grafana

Grafana memiliki ribuan dashboard siap pakai yang dibuat oleh komunitas. Anda tidak perlu mendesain dari awal.

1. Buka situs [Grafana Dashboard Library](https://grafana.com/grafana/dashboards/).
2. Cari dashboard yang Anda butuhkan (misalnya cari: `Node Exporter Full` untuk monitoring server yang sangat mendalam).
3. Catat **Dashboard ID** (contoh ID untuk Node Exporter Full adalah **1860**).
4. Masuk ke Grafana UI Anda -> Klik **Dashboards** -> Pilih **New** (kanan atas) -> **Import**.
5. Masukkan ID **1860** di kolom "Import via grafana.com" -> klik **Load**.
6. Pilih data source **Prometheus** pada pilihan dropdown -> klik **Import**.
7. Dashboard canggih baru Anda sudah siap digunakan!

---

## 6. Cara Mengatur Notifikasi Peringatan (Alerts ke Telegram / Discord)

Anda dapat mengatur agar Grafana mengirim pesan otomatis ketika server kehabisan RAM atau CPU di atas 90%.

### Langkah A: Buat Contact Point (Tujuan Kirim)
1. Di Grafana UI, masuk ke menu **Alerting** -> **Contact points**.
2. Klik **Add contact point**.
3. Beri nama (misal: `Telegram Alert`).
4. Pilih Integration Type (misal: **Telegram** atau **Discord**).
5. Masukkan konfigurasi API (seperti Bot Token & Chat ID untuk Telegram, atau Webhook URL untuk Discord).
6. Klik **Test** untuk mencoba mengirim pesan uji coba, lalu klik **Save contact point**.

### Langkah B: Buat Alert Rule (Aturan Pemicu)
1. Buka grafik yang ingin Anda buatkan alert (misal: grafik Host CPU).
2. Klik opsi menu pada panel tersebut (titik tiga di kanan atas panel) -> Pilih **Edit**.
3. Pilih tab **Alert** di bawah grafik -> Klik **Create alert rule from this panel**.
4. Tentukan kondisi pemicu (contoh: jika nilai rata-rata CPU `> 90` selama `5m`).
5. Di bagian **Notifications**, arahkan ke Contact Point yang telah Anda buat sebelumnya.
6. Klik **Save and exit**. Sistem kini akan otomatis mengawasi dan mengirim notifikasi jika server melampaui batas yang ditentukan.

---

## 7. Perintah Dasar Operasional Monitoring

Jalankan perintah ini di direktori `/root/Project-Management`:

*   **Menghentikan semua layanan monitoring:**
    ```bash
    docker compose down
    ```
    *(Aplikasi Anda yang berjalan di PM2 akan tetap berjalan aman tanpa terganggu)*

*   **Menjalankan kembali layanan monitoring:**
    ```bash
    docker compose up -d prometheus grafana node-exporter cadvisor blackbox-exporter
    ```

*   **Melihat log jika terjadi masalah:**
    ```bash
    docker compose logs -f prometheus
    # atau
    docker compose logs -f grafana
    # atau
    docker compose logs -f blackbox-exporter
    ```

---

## 8. Memantau URL / HTTP Endpoint Lain (Blackbox Exporter)

Untuk memantau konektivitas atau status HTTP URL lain (seperti `http://10.6.5.82:5000/` yang baru saja didaftarkan):

### Cara Menambahkan URL Baru:
1. Buka file `/root/Project-Management/monitoring/prometheus/prometheus.yml`.
2. Temukan bagian `job_name: 'blackbox'` di paling bawah.
3. Tambahkan URL target baru di bawah bagian `targets`:
   ```yaml
     - job_name: 'blackbox'
       metrics_path: /probe
       params:
         module: [http_2xx]
       static_configs:
         - targets:
           - http://10.6.5.82:5000/
           - http://<IP_ATAU_DOMAIN_LAIN>:<PORT>/   # Tambahkan URL baru di sini
   ```
4. Jalankan perintah reload atau restart Prometheus:
   ```bash
   docker restart prometheus
   ```

### Menampilkan Status URL Baru di Grafana:
1. Tambahkan panel **Stat** baru di Grafana.
2. Gunakan query PromQL:
   ```promql
   probe_success{instance="http://<IP_ATAU_DOMAIN_LAIN>:<PORT>/"}
   ```
3. Atur **Value Mappings**:
   - `1` -> `CONNECTED` (Hijau)
   - `0` -> `DISCONNECTED` (Merah)


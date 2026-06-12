# Smart Project Management & Ticketing Platform

Platform manajemen proyek dan tiket (*ticketing*) modern dengan arsitektur **Multi-Component per Task** dan **Smart Status Aggregation Engine** berbasis aturan (*rules*) logika (AND/OR). Platform ini menerapkan **Role-Based Access Control (RBAC)** yang ketat untuk menjaga integritas alur pengembangan sistem (SDLC).

## Stack Teknologi
- **Backend:** FastAPI (Async), Python 3.11, SQLAlchemy 2.0, SQLite3 (aiosqlite)
- **Frontend:** React (Vite), Tailwind CSS
- **Container:** Docker & Docker Compose

---

## Cara Instalasi Cepat

Cukup jalankan satu file script ini di server Linux Anda:

```bash
chmod +x install.sh
./install.sh
```

### Apa yang Dilakukan Script Ini?
1. **Pemeriksaan Dependensi:** Secara otomatis mendeteksi apakah Docker dan Docker Compose CLI plugin sudah terpasang. Jika belum, script akan mengunduh dan memasangnya secara otomatis.
2. **Pengaturan Hak Akses:** Mendeteksi jika user memerlukan hak akses administrator (`sudo`) untuk mengakses Docker daemon secara otomatis.
3. **Membangun Layanan:** Membangun image Docker dan menyalakan container backend dan frontend secara bersamaan.
4. **Inisialisasi Database:** Saat backend menyalakan container pertama kali, database SQLite dibuat dan diisi oleh data uji coba awal (*seed data*).

---

## Alamat Akses Layanan

Setelah instalasi selesai, layanan dapat diakses melalui:

- **Frontend lokal:** [http://localhost:3333](http://localhost:3333)
- **Backend lokal:** [http://localhost:8291](http://localhost:8291)
- **Dokumentasi API (Swagger OpenAPI):** [http://localhost:8291/docs](http://localhost:8291/docs)

*Catatan: Jika diakses dari jaringan lokal (LAN) atau IP publik server, ganti `localhost` dengan IP server Anda (misal: `http://192.168.1.100:3333`).*

---

## Akun Demo Default

Semua akun menggunakan kata sandi default: **`password123`**

| Username | Peran (Role) | Hak Akses Utama |
|---|---|---|
| `supadmin` | Supadmin | Akses penuh sistem (dashboard, kelola pengguna, grup, proyek, status, dan aturan) |
| `pm` | Project Manager | Kelola proyek, komponen, tiket tugas (*task*), aturan otomatisasi, dan penugasan developer |
| `developer1` | Developer | Mengubah status komponen tugas (hanya yang ditugaskan ke dirinya) |
| `developer2` | Developer | Mengubah status komponen tugas (hanya yang ditugaskan ke dirinya) |
| `qa` | QA Engineer | Menyetujui status makro tugas ke *Done* atau menolak (*reject*) kembali ke *Under Revision* |

---

## Operasional Tambahan

### Mereset Database
Jika Anda ingin membersihkan database dan memulai kembali dengan data uji coba bawaan, jalankan script reset berikut:

```bash
chmod +x reset-db.sh
./reset-db.sh
```

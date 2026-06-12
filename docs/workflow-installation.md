# Management Project Workflow dan Instalasi

## Ringkasan

Aplikasi ini adalah platform project management dan ticketing dengan rule engine untuk mengubah status makro task berdasarkan status komponen teknis.

Stack yang dipakai:

- Backend: FastAPI
- Database: SQLite3 async melalui `sqlite+aiosqlite`
- Frontend: React + Vite
- Container: Docker Compose
- Port backend: `8291`
- Port frontend: `3333`

## Cara Install

Jalankan dari root project:

```bash
./install.sh
```

Script akan melakukan build dan start container:

- Frontend lokal: `http://localhost:3333`
- Backend lokal: `http://localhost:8291`
- Frontend LAN: `http://<IP-SERVER>:3333`
- Backend LAN: `http://<IP-SERVER>:8291`

Pastikan firewall server membuka port `3333` dan `8291` jika aplikasi harus diakses dari luar mesin.

## Reset Database Demo

Reset akan menghapus semua data dan membuat ulang seed default:

```bash
./reset-db.sh
```

Database SQLite tersimpan di volume Docker `backend_sqlite_data`, sehingga data tidak hilang saat container restart biasa.

## Akun Default Setelah Install

Semua akun default memakai password:

```text
password123
```

| Username | Group | Akses Utama |
| --- | --- | --- |
| `supadmin` | Supadmin | Akses penuh ke project, task, rule, status, user, dan group |
| `pm` | PM | Kelola project, komponen, task, rule, user, dan assignment developer |
| `developer1` | Developer | Update status komponen task yang ditugaskan |
| `developer2` | Developer | Update status komponen task yang ditugaskan |
| `qa` | QA | Approve status makro ke Done dan reject task |

## Workflow User

1. Supadmin login dengan `supadmin / password123`.
2. Supadmin dapat mengatur group dan permission di menu `Kelola Group`.
3. Supadmin atau group yang punya akses `manage_users` membuat atau mengubah user di menu `Kelola Pengguna`.
4. User ditempatkan ke group tertentu, misalnya PM, Developer, QA, atau group custom.
5. User login dan UI akan menampilkan fitur berdasarkan permission group-nya.

## Workflow Project dan Task

1. User dengan permission `manage_projects` membuat project di menu `Kelola Project`.
2. User dengan permission `manage_components` membuat komponen teknis untuk project.
3. User dengan permission `manage_tasks` membuat task dan memilih komponen teknis yang terlibat.
4. User dengan permission `assign_developers` menetapkan assignee ke komponen task.
5. Developer atau group dengan permission `update_component_status` mengubah status komponen yang ditugaskan.
6. Rule engine mengevaluasi kondisi setiap kali status komponen berubah.
7. Jika rule terpenuhi, status makro task berubah otomatis.
8. QA atau group dengan permission `qa_gate` dapat approve task ke kategori `Done` atau reject task ke `Under Revision`.

## Workflow Rule Engine

Rule engine terdiri dari:

- Operator logika: `AND` atau `OR`
- Target status makro: status akhir yang akan dipasang ke task jika rule terpenuhi
- Kondisi yang diharapkan: daftar komponen yang harus dicek
- Status yang diharapkan: status target untuk setiap komponen dalam kondisi

Contoh:

```text
Operator: AND
Kondisi:
- Frontend harus UI Ready
- Backend harus API Ready
Target status makro:
- Ready for Integration
```

Artinya status makro task berubah ke `Ready for Integration` ketika Frontend sudah `UI Ready` dan Backend sudah `API Ready`.

Rule dapat dibuat, dilihat, diedit, dan dihapus dari menu rule oleh user dengan permission `manage_rules`.

## Permission Group

Permission yang tersedia:

| Permission | Fungsi |
| --- | --- |
| `view_dashboard` | Melihat dashboard dan data utama |
| `manage_projects` | CRUD project |
| `manage_components` | CRUD komponen teknis |
| `manage_tasks` | Buat task dan override status makro |
| `manage_rules` | CRUD rule engine |
| `manage_statuses` | CRUD status |
| `manage_users` | CRUD user dan mengubah group user |
| `manage_groups` | CRUD group dan permission |
| `assign_developers` | Menetapkan assignee komponen task |
| `update_component_status` | Mengubah status komponen task |
| `qa_gate` | Approve ke Done dan reject task |

Supadmin dapat menambah group baru atau mengubah permission group default. Contoh: jika group PM tidak boleh mengelola user, hapus permission `manage_users` dari group PM.

## Endpoint Utama

- Auth: `/api/v1/auth/login`, `/api/v1/auth/me`
- Project: `/api/v1/projects/`
- Status: `/api/v1/statuses/`
- User: `/api/v1/users/`
- Group: `/api/v1/groups/`
- Permission catalog: `/api/v1/groups/permissions`
- Rule: `/api/v1/rules/`
- Task: `/api/v1/tasks/`

Dokumentasi OpenAPI backend tersedia di:

```text
http://localhost:8291/docs
```
######### Catatan Rilis
- Menambahkan validasi peran pada panel "Quick Switch Peran" di UI sehingga hanya peran Supadmin yang dapat mengakses fitur pertukaran peran demi menjaga integritas RBAC.
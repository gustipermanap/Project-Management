# User Manual Management Project

## Tujuan Aplikasi

Management Project digunakan untuk mengelola project, task, komponen teknis, status pekerjaan, rule otomatis, user, dan group akses.

Fitur utama aplikasi:

- Membuat dan mengelola project.
- Membuat task berdasarkan komponen teknis.
- Mengubah status komponen task.
- Mengubah status makro task otomatis melalui rule engine.
- Approve atau reject task oleh QA.
- Mengatur user, group, dan permission akses.

## Akses Aplikasi

Frontend dapat dibuka dari browser:

```text
http://localhost:3333
```

Jika diakses dari komputer lain dalam jaringan:

```text
http://<IP-SERVER>:3333
```

Backend API tersedia di:

```text
http://localhost:8291
```

Dokumentasi API:

```text
http://localhost:8291/docs
```

## Akun Default

Semua akun default memakai password:

```text
password123
```

| Username | Group | Kegunaan |
| --- | --- | --- |
| `supadmin` | Supadmin | Admin penuh untuk semua fitur |
| `pm` | PM | Mengelola project, task, rule, user, dan assignment |
| `developer1` | Developer | Mengubah status komponen task |
| `developer2` | Developer | Mengubah status komponen task |
| `qa` | QA | Approve atau reject task |

## Login

1. Buka halaman frontend.
2. Masukkan username.
3. Masukkan password.
4. Klik `Masuk Sistem`.
5. Setelah login berhasil, dashboard akan muncul sesuai akses group user.

Pada mode demo, tombol quick login dapat dipakai untuk masuk sebagai `supadmin`, `pm`, `developer1`, `developer2`, atau `qa`.

## Dashboard

Dashboard menampilkan task dalam kategori status makro:

| Kolom | Arti |
| --- | --- |
| Backlog & Plan | Task baru atau masih dalam rencana |
| In Progress / Revise | Task sedang dikerjakan atau direvisi |
| Testing / Review | Task masuk tahap review atau testing |
| Done & Released | Task sudah selesai |

Setiap kartu task menampilkan:

- Judul task.
- Deskripsi task.
- Status makro.
- Komponen teknis.
- Status setiap komponen.
- Assignee developer.
- Tombol approve atau reject jika user punya akses QA.

## Mengelola Project

Digunakan oleh user dengan permission `manage_projects`.

Cara membuat project:

1. Klik `Kelola Project`.
2. Klik `Tambah Project`.
3. Isi nama project.
4. Isi deskripsi jika diperlukan.
5. Klik `Simpan`.

Cara mengedit project:

1. Klik `Kelola Project`.
2. Klik `Edit` pada project yang ingin diubah.
3. Ubah nama atau deskripsi.
4. Klik `Simpan`.

Cara menghapus project:

1. Klik `Kelola Project`.
2. Klik `Hapus` pada project.
3. Konfirmasi penghapusan.

Catatan: menghapus project akan menghapus task, komponen, dan rule yang berada di dalam project tersebut.

## Mengelola Status

Digunakan oleh user dengan permission `manage_statuses`.

Status dipakai untuk:

- Status makro task.
- Status komponen task.
- Target status makro pada rule.
- Expected status pada kondisi rule.

Kategori status yang tersedia:

| Kategori | Fungsi |
| --- | --- |
| `Backlog` | Perencanaan awal |
| `In_Progress` | Sedang dikerjakan atau revisi |
| `Review` | Review, testing, atau integrasi |
| `Done` | Selesai |

Cara membuat status:

1. Klik `Kelola Status`.
2. Klik `Tambah Status`.
3. Isi nama status.
4. Pilih kategori.
5. Klik `Simpan`.

Status tidak bisa dihapus jika masih dipakai oleh task atau rule.

## Membuat Task

Digunakan oleh user dengan permission `manage_tasks`.

Cara membuat task:

1. Pilih project aktif dari dropdown `Pilih Project`.
2. Klik `Buat Tiket Task`.
3. Isi judul task.
4. Isi deskripsi detail jika diperlukan.
5. Isi tenggat waktu jika ada.
6. Pilih minimal satu komponen teknis.
7. Klik `Simpan Task`.

Task baru akan memakai status makro awal `Backlog`.

## Assignment Developer

Digunakan oleh user dengan permission `assign_developers`.

Cara assign developer:

1. Buka dashboard project.
2. Cari task yang ingin diatur.
3. Pada komponen teknis task, pilih assignee dari dropdown.
4. Perubahan langsung tersimpan.

User yang dapat dipilih sebagai assignee adalah user yang punya permission `update_component_status`.

## Update Status Komponen

Digunakan oleh user dengan permission `update_component_status`.

Cara update status komponen:

1. Login sebagai developer atau user yang punya akses update komponen.
2. Cari task yang ditugaskan.
3. Pada komponen teknis, pilih status baru.
4. Sistem menyimpan perubahan dan mencatat audit trail.
5. Rule engine otomatis mengevaluasi status makro task.

Developer hanya dapat mengubah komponen yang ditugaskan kepadanya. Jika komponen belum memiliki assignee, developer dapat mengambil assignment saat update pertama.

## Rule Engine

Digunakan oleh user dengan permission `manage_rules`.

Rule engine mengubah status makro task berdasarkan status komponen teknis.

Komponen rule:

| Field | Arti |
| --- | --- |
| Operator Logika | `AND` atau `OR` |
| Target Status Makro | Status makro yang akan dipasang jika rule terpenuhi |
| Kondisi yang Diharapkan | Komponen yang dicek oleh rule |
| Status yang Diharapkan | Status komponen yang harus terpenuhi |

Cara membuat rule:

1. Pilih project aktif.
2. Klik `Buat Rule Agregasi`.
3. Pilih operator logika.
4. Pilih target status makro.
5. Tambahkan satu atau lebih kondisi.
6. Pada setiap kondisi, pilih komponen dan status yang diharapkan.
7. Klik `Simpan Aturan`.

Contoh rule:

```text
Operator: AND
Kondisi:
- Frontend = UI Ready
- Backend = API Ready
Target Status Makro:
- Ready for Integration
```

Artinya task berubah ke `Ready for Integration` jika Frontend sudah `UI Ready` dan Backend sudah `API Ready`.

Cara edit rule:

1. Pada panel `Aturan Otomatisasi`, hover rule yang ingin diubah.
2. Klik tombol edit.
3. Ubah operator, target status makro, atau kondisi.
4. Klik `Simpan Perubahan`.

Cara hapus rule:

1. Pada panel `Aturan Otomatisasi`, hover rule yang ingin dihapus.
2. Klik tombol hapus.
3. Konfirmasi penghapusan.

## QA Approve dan Reject

Digunakan oleh user dengan permission `qa_gate`.

Approve task:

1. Login sebagai QA.
2. Cari task yang akan disetujui.
3. Klik `Approve`.
4. Status makro task berubah ke status kategori `Done`.

Reject task:

1. Login sebagai QA.
2. Cari task yang bermasalah.
3. Klik `Reject`.
4. Pilih komponen yang bermasalah.
5. Isi deskripsi defect atau alasan reject.
6. Klik `Kirim Bug & Rollback`.

Efek reject:

- Status makro task berubah ke `Under Revision`.
- Komponen yang dipilih berubah ke `In Progress`.
- Audit trail mencatat alasan reject.

## Audit Trail

Audit trail menampilkan riwayat perubahan task.

Cara melihat audit trail:

1. Klik kartu task pada dashboard.
2. Panel `Audit Trail Logs` akan menampilkan riwayat perubahan.

Audit trail mencatat:

- User atau sistem yang melakukan perubahan.
- Nilai lama.
- Nilai baru.
- Waktu perubahan.

## Mengelola User

Digunakan oleh user dengan permission `manage_users`.

Cara membuat user:

1. Klik `Kelola Pengguna`.
2. Klik `Tambah User`.
3. Isi username.
4. Isi email.
5. Isi password.
6. Pilih group akses.
7. Klik `Simpan User`.

Cara edit user:

1. Klik `Kelola Pengguna`.
2. Klik `Edit` pada user.
3. Ubah username, email, password, atau group akses.
4. Klik `Simpan Perubahan`.

Cara hapus user:

1. Klik `Kelola Pengguna`.
2. Klik `Hapus` pada user.
3. Konfirmasi penghapusan.

Catatan: user tidak bisa menghapus akun dirinya sendiri.

## Mengelola Group dan Permission

Digunakan oleh user dengan permission `manage_groups`.

Group menentukan fitur apa saja yang dapat diakses user.

Permission yang tersedia:

| Permission | Fungsi |
| --- | --- |
| `view_dashboard` | Melihat dashboard |
| `manage_projects` | CRUD project |
| `manage_components` | CRUD komponen teknis |
| `manage_tasks` | Membuat task dan override status makro |
| `manage_rules` | CRUD rule engine |
| `manage_statuses` | CRUD status |
| `manage_users` | CRUD user dan mengubah group user |
| `manage_groups` | CRUD group dan permission |
| `assign_developers` | Assign developer ke komponen task |
| `update_component_status` | Update status komponen task |
| `qa_gate` | Approve dan reject task |

Cara membuat group:

1. Klik `Kelola Group`.
2. Klik `Tambah Group`.
3. Isi nama group.
4. Isi deskripsi.
5. Centang permission yang diperlukan.
6. Klik `Simpan`.

Cara edit group:

1. Klik `Kelola Group`.
2. Klik `Edit` pada group.
3. Ubah nama, deskripsi, atau permission.
4. Klik `Simpan`.

Cara hapus group:

1. Klik `Kelola Group`.
2. Klik `Hapus` pada group.
3. Konfirmasi penghapusan.

Catatan: group tidak dapat dihapus jika masih digunakan oleh user.

## Logout

Klik tombol keluar pada kanan atas dashboard untuk logout dari sistem.

## Troubleshooting Pengguna

| Masalah | Solusi |
| --- | --- |
| Tidak bisa login | Pastikan username dan password benar |
| Tombol fitur tidak muncul | Cek permission group user |
| Tidak bisa hapus status | Status masih dipakai task atau rule |
| Tidak bisa hapus group | Group masih dipakai user |
| Developer tidak bisa update komponen | Pastikan developer menjadi assignee atau komponen belum punya assignee |
| Frontend tidak bisa terhubung ke backend | Pastikan backend port `8291` aktif dan firewall terbuka |

## Rekomendasi Setelah Install

1. Login sebagai `supadmin`.
2. Ganti password default akun penting.
3. Review permission group default.
4. Buat user operasional sesuai kebutuhan.
5. Buat project, status tambahan, dan rule sesuai workflow tim.

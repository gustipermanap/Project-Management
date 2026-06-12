# Product Requirement Document (PRD)
## Project Name: Smart Project Management & Ticketing Platform
**Version:** 1.0  
**Author:** Senior Full-stack Developer & Architect  
**Status:** Approved / Ready for Development  
**Target Stack:** FastAPI (Async), Pydantic v2, PostgreSQL, React/Angular + Tailwind CSS

---

## 1. Executive Summary & Objective

### 1.1 Latar Belakang
Sistem manajemen proyek konvensional (seperti Jira atau Trello standar) memperlakukan sebuah tiket tugas (*Task*) sebagai satu entitas tunggal dengan satu status global. Namun, dalam siklus hidup pengembangan perangkat lunak (SDLC) yang melibatkan tim multi-disiplin, sebuah fitur sering kali tertahan karena ketidakjelasan status di level teknis (misalnya: Frontend sudah selesai, tetapi API Backend belum siap).

### 1.2 Tujuan
Platform ini dirancang untuk menyelesaikan masalah tersebut dengan memperkenalkan arsitektur **Multi-Component per Task**. Setiap tiket dapat dipecah berdasarkan komponen teknis yang terlibat (Frontend, Backend, QA, DevOps, dll). 

Fitur utama pembeda platform ini adalah **Smart Status Aggregation Engine**, sebuah sistem otomatisasi berbasis logika kondisi (AND/OR) yang menggabungkan status komponen-komponen teknis menjadi satu status makro secara terintegrasi, memberikan visibilitas penuh bagi manajemen secara *real-time*.

---

## 2. Core Epics & User Stories

### 2.1 Epic 1: Multi-Component Task Architecture
* **User Story:** Sebagai PM/Developer, saya ingin sebuah tiket (Task) dapat dibagi menjadi beberapa komponen independen (FE, BE, QA, dll) dengan status, estimasi waktu, dan assignee-nya masing-masing, agar pembagian tugas teknis menjadi lebih jelas dan terukur.

### 2.2 Epic 2: Dynamic Status & Aggregation Engine
* **User Story:** Sebagai Project Manager, saya ingin membuat aturan (*rules*) otomatisasi berbasis logika, sehingga ketika komponen FE berstatus `UI Ready` AND komponen BE berstatus `API Ready`, status makro tiket otomatis berubah menjadi `Ready for Integration`.

### 2.3 Epic 3: Role-Based Access Control (RBAC) & Gatekeeping
* **User Story:** Sebagai Developer, saya hanya ingin fokus mengubah status komponen yang didelegasikan ke saya. Sebagai QA, saya ingin mengendalikan gerbang kualitas dengan hak eksklusif untuk memindahkan status makro ke `Done` atau memicu *rollback/reject* jika ditemukan defect.

---

## 3. Functional Requirements

### 3.1 Target Hak Akses & Matriks Peran (RBAC)
Sistem menerapkan pembatasan hak akses yang ketat demi menjaga integritas alur kerja dan mencegah konflik status:

| Fitur / Aksi | Project Manager (PM) | Developer | Quality Assurance (QA) |
| :--- | :---: | :---: | :---: |
| **Membuat Tiket & Komponen** | ✔️ Ya | ❌ Tidak | ❌ Tidak |
| **Membuat / Edit Aturan Agregasi (*Rules*)** | ✔️ Ya | ❌ Tidak | ❌ Tidak |
| **Mengubah Status Komponen (FE/BE/dst)** | ❌ Tidak | ✔️ Ya (Hanya Tugasnya) | ❌ Tidak |
| **Mengubah Status Makro (Manual)** | ✔️ Ya (Override) | ❌ Tidak | ✔️ Ya (Fase Testing ke Done) |
| **Memicu Status Rollback / Reject** | ❌ Tidak | ❌ Tidak | ✔️ Ya |

### 3.2 Alur Kerja Smart Status Aggregation (Integration Engine)
1. Developer mengubah status komponen spesifik mereka (contoh: Backend ke `API Ready`) melalui API.
2. Setiap mutasi data memicu *event* di sistem backend.
3. Sebuah *asynchronous background worker* dieksekusi untuk mengevaluasi aturan (*Rules*) aktif pada proyek tersebut.
4. **Logic Evaluator:**
   * **Operator AND:** Semua kondisi komponen dalam daftar wajib terpenuhi.
   * **Operator OR:** Salah satu kondisi komponen yang terpenuhi akan memicu perubahan.
5. Ketika kondisi terpenuhi, status makro tiket langsung diperbarui secara otomatis oleh sistem (`SYSTEM_AUTOMATION`) menjadi status target baru (misal: `Ready for Integration Testing`) dan memicu notifikasi *real-time* ke tim QA.

### 3.3 Alur Balik QA (*Rollback & Bug Defect Flow*)
Jika dalam fase pengujian QA menemukan ketidaksesuaian atau *bug*:
1. QA menekan tombol **`Reject / Bug Found`** pada status makro tiket.
2. Sistem menampilkan modal interaktif untuk meminta QA memilih komponen mana yang bermasalah (FE, BE, atau keduanya) serta mengisi deskripsi *bug*.
3. **Sistem Trigger (Automated Response):**
   * Status makro tiket utama otomatis diturunkan menjadi `Under Revision`.
   * Status komponen teknis yang ditunjuk oleh QA otomatis diturunkan kembali ke `In Progress` atau `Bug Fixing`.
   * Log aktivitas (*Audit Trail*) mencatat alasan penolakan secara mendetail untuk dibaca oleh developer terkait.

---

## 4. Technical Architecture & Data Model (Python / FastAPI Focus)

### 4.1 Database Design (Conceptual Schema)
Arsitektur data dirancang secara modular guna mendukung penambahan komponen dinamis dan evaluasi *state machine*:

* **`projects`**: Menyimpan entitas utama proyek.
* **`tasks`**: Menyimpan data makro tiket (`id`, `title`, `description`, `macro_status_id`, `due_date`, `project_id`).
* **`components`**: Master data nama komponen per proyek (`id`, `name`, `project_id` - contoh: Frontend, Backend, Mobile).
* **`statuses`**: Master data status kustom (`id`, `name`, `category` [Backlog, In_Progress, Review, Done]).
* **`task_component_statuses`**: Tabel jembatan status *real-time* per komponen (`task_id`, `component_id`, `status_id`, `assignee_id`).
* **`aggregation_rules`**: Menyimpan aturan otomatisasi (`id`, `project_id`, `operator` ["AND", "OR"], `target_status_id`).
* **`rule_conditions`**: Kondisi spesifik dari aturan (`id`, `rule_id`, `component_id`, `expected_status_id`).
* **`audit_trails`**: Log histori perubahan status untuk transparansi (`id`, `task_id`, `changed_by`, `old_value`, `new_value`, `timestamp`).

### 4.2 Backend Implementation Pattern (FastAPI + Pydantic v2)
Proses evaluasi didesain mengikuti prinsip **SOLID, KISS, dan DRY** menggunakan pola asinkron agar tidak memblokir *request-response cycle* utama aplikasi.

#### A. Pydantic Rules Schema (`app/features/engine/schemas.py`)
```python
from pydantic import BaseModel, Field
from typing import List, Literal

class ConditionSchema(BaseModel):
    component_id: int = Field(..., description="ID Komponen yang dicek (e.g., FE)")
    expected_status_id: int = Field(..., description="ID Status yang diharapkan (e.g., UI Ready)")

class AggregationRuleSchema(BaseModel):
    id: int
    project_id: int
    operator: Literal["AND", "OR"] = Field("AND", description="Logika penggabungan kondisi")
    conditions: List[ConditionSchema] = Field(..., min_items=1)
    target_status_id: int = Field(..., description="Status akhir jika semua kondisi terpenuhi")

    class Config:
        from_attributes = True

##### B. PaginatedListResponseSchema
```python
from fastcrud.core.pagination import PaginatedListResponse
from typing import TypeVar, Generic

T = TypeVar("T")

class PaginatedListResponseSchema(PaginatedListResponse[T], Generic[T]):
    """Response schema untuk pagination."""

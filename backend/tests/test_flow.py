import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.db import async_session_maker
from app.models.models import Task, TaskComponentStatus, Status, Component, Project
from sqlalchemy.future import select

async def test_full_application_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login PM
        print("Menguji login PM...")
        response = await client.post("/api/v1/auth/login", data={"username": "pm", "password": "password123"})
        assert response.status_code == 200, f"Gagal login PM: {response.text}"
        pm_token = response.json()["access_token"]
        pm_headers = {"Authorization": f"Bearer {pm_token}"}

        # 2. Login Developer1
        print("Menguji login Developer...")
        response = await client.post("/api/v1/auth/login", data={"username": "developer1", "password": "password123"})
        assert response.status_code == 200
        dev_token = response.json()["access_token"]
        dev_headers = {"Authorization": f"Bearer {dev_token}"}

        # 3. Login QA
        print("Menguji login QA...")
        response = await client.post("/api/v1/auth/login", data={"username": "qa", "password": "password123"})
        assert response.status_code == 200
        qa_token = response.json()["access_token"]
        qa_headers = {"Authorization": f"Bearer {qa_token}"}

        # 4. Ambil Project
        response = await client.get("/api/v1/projects/", headers=pm_headers)
        assert response.status_code == 200
        projects = response.json()
        assert len(projects) > 0
        project_id = projects[0]["id"]

        # 5. Ambil Components
        response = await client.get(f"/api/v1/components/?project_id={project_id}", headers=pm_headers)
        assert response.status_code == 200
        components = response.json()
        assert len(components) >= 2
        
        comp_map = {c["name"]: c["id"] for c in components}
        fe_id = comp_map["Frontend"]
        be_id = comp_map["Backend"]

        # 6. Ambil Statuses untuk mencari ID status
        response = await client.get("/api/v1/statuses/", headers=pm_headers)
        assert response.status_code == 200
        statuses = response.json()
        status_map = {s["name"]: s["id"] for s in statuses}
        
        backlog_status_id = status_map["Backlog"]
        ui_ready_status_id = status_map["UI Ready"]
        api_ready_status_id = status_map["API Ready"]

        # 7. PM membuat Task
        print("Menguji pembuatan task baru oleh PM...")
        task_payload = {
            "title": "Fitur Checkout Pembayaran",
            "description": "Menambahkan gateway pembayaran Stripe",
            "due_date": "2026-07-01",
            "project_id": project_id,
            "macro_status_id": backlog_status_id,
            "components": [fe_id, be_id]
        }
        response = await client.post("/api/v1/tasks/", json=task_payload, headers=pm_headers)
        assert response.status_code == 201, f"Pembuatan task gagal: {response.text}"
        task = response.json()
        task_id = task["id"]
        assert task["title"] == "Fitur Checkout Pembayaran"
        assert len(task["component_statuses"]) == 2

        # 7.1 PM membuat Task kedua yang bergantung pada Task pertama
        print("Menguji pembuatan task kedua dengan dependensi oleh PM...")
        task_dep_payload = {
            "title": "Kupon Diskon Checkout",
            "description": "Menambahkan sistem kupon diskon untuk checkout",
            "due_date": "2026-07-10",
            "project_id": project_id,
            "macro_status_id": backlog_status_id,
            "components": [fe_id],
            "dependencies": [task_id]
        }
        response = await client.post("/api/v1/tasks/", json=task_dep_payload, headers=pm_headers)
        assert response.status_code == 201, f"Pembuatan task dengan dependensi gagal: {response.text}"
        task_dep = response.json()
        assert task_dep["title"] == "Kupon Diskon Checkout"
        assert len(task_dep["dependencies"]) == 1
        assert task_dep["dependencies"][0]["id"] == task_id
        print("-> Pembuatan task kedua dengan dependensi berhasil [OK]")

        # 8. Dev1 mengupdate status Frontend ke UI Ready
        print("Menguji update status komponen Frontend ke 'UI Ready' oleh Developer...")
        response = await client.put(
            f"/api/v1/tasks/{task_id}/components/{fe_id}/status",
            json={"status_id": ui_ready_status_id},
            headers=dev_headers
        )
        assert response.status_code == 200, f"Gagal update status komponen FE: {response.text}"
        updated_fe = response.json()
        assert updated_fe["status_id"] == ui_ready_status_id
        assert updated_fe["assignee"]["username"] == "developer1"

        # 9. Dev1 mengupdate Backend status ke API Ready
        print("Menguji update status komponen Backend ke 'API Ready' oleh Developer...")
        response = await client.put(
            f"/api/v1/tasks/{task_id}/components/{be_id}/status",
            json={"status_id": api_ready_status_id},
            headers=dev_headers
        )
        assert response.status_code == 200
        updated_be = response.json()
        assert updated_be["status_id"] == api_ready_status_id

        # 10. Ambil Task kembali dan pastikan macro_status sudah berubah menjadi 'Ready for Integration'
        print("Menguji evaluasi aturan otomatisasi (Smart Status Aggregation Engine)...")
        response = await client.get(f"/api/v1/tasks/{task_id}", headers=pm_headers)
        assert response.status_code == 200
        task_reloaded = response.json()
        assert task_reloaded["macro_status"]["name"] == "Ready for Integration"
        print("-> Status Makro otomatis ter-agregasi menjadi: 'Ready for Integration' [OK]")

        # 11. QA melakukan reject karena bug
        print("Menguji penolakan (Reject / Bug Found) oleh QA...")
        reject_payload = {
            "buggy_component_ids": [be_id],
            "description": "API Backend Stripe mengalami timeout ketika dipanggil"
        }
        response = await client.post(
            f"/api/v1/tasks/{task_id}/reject",
            json=reject_payload,
            headers=qa_headers
        )
        assert response.status_code == 200, f"Gagal reject task: {response.text}"
        task_rejected = response.json()
        assert task_rejected["macro_status"]["name"] == "Under Revision"
        
        backend_status = next(cs for cs in task_rejected["component_statuses"] if cs["component_id"] == be_id)
        assert backend_status["status"]["name"] == "In Progress"
        print("-> Status Makro diturunkan ke 'Under Revision' dan Backend diturunkan ke 'In Progress' [OK]")

        # 12. Ambil Audit Trail
        print("Menguji log audit trail task...")
        response = await client.get(f"/api/v1/tasks/{task_id}/audit-trail", headers=pm_headers)
        assert response.status_code == 200
        audit_trail = response.json()
        assert len(audit_trail) >= 4
        print(f"-> Log audit trail tersimpan: {len(audit_trail)} entri.")
        for entry in reversed(audit_trail):
            print(f"   [{entry['timestamp']}] Oleh {entry['changed_by']}: {entry['old_value']} -> {entry['new_value']}")

        print("\n[SUKSES] Semua alur pengujian backend berjalan dengan sempurna!")

if __name__ == "__main__":
    asyncio.run(test_full_application_flow())

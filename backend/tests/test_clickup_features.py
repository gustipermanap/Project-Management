import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

async def test_clickup_features_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login Supadmin
        print("Menguji login PM...")
        response = await client.post("/api/v1/auth/login", data={"username": "pm", "password": "password123"})
        assert response.status_code == 200, f"Gagal login PM: {response.text}"
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Ambil list tasks untuk mencari task_id
        print("Mengambil daftar task...")
        response = await client.get("/api/v1/tasks/", headers=headers)
        assert response.status_code == 200
        tasks = response.json()
        assert len(tasks) > 0, "Seharusnya ada task yang ter-seed"
        task_id = tasks[0]["id"]
        component_id = tasks[0]["component_statuses"][0]["component_id"]
        print(f"-> Menggunakan Task ID: {task_id}, Component ID: {component_id}")

        # ==========================================
        # 3. UJI COMMENTS
        # ==========================================
        print("\nMenguji fitur Comments...")
        # 3.1 Buat komentar
        comment_payload = {"content": "Test komentar dari unit test"}
        response = await client.post(f"/api/v1/tasks/{task_id}/comments", json=comment_payload, headers=headers)
        assert response.status_code == 201
        comment = response.json()
        comment_id = comment["id"]
        assert comment["content"] == "Test komentar dari unit test"
        print("-> Sukses membuat komentar [OK]")

        # 3.2 Ambil list komentar
        response = await client.get(f"/api/v1/tasks/{task_id}/comments", headers=headers)
        assert response.status_code == 200
        comments = response.json()
        assert len(comments) >= 1
        assert any(c["id"] == comment_id for c in comments)
        print("-> Sukses mengambil daftar komentar [OK]")

        # 3.3 Hapus komentar
        response = await client.delete(f"/api/v1/tasks/{task_id}/comments/{comment_id}", headers=headers)
        assert response.status_code == 204
        print("-> Sukses menghapus komentar [OK]")

        # ==========================================
        # 4. UJI CHECKLIST
        # ==========================================
        print("\nMenguji fitur Checklist...")
        # 4.1 Buat checklist item
        checklist_payload = {"name": "Test checklist item"}
        response = await client.post(f"/api/v1/tasks/{task_id}/checklists", json=checklist_payload, headers=headers)
        assert response.status_code == 201
        checklist = response.json()
        checklist_id = checklist["id"]
        assert checklist["name"] == "Test checklist item"
        assert not checklist["is_completed"]
        print("-> Sukses membuat checklist item [OK]")

        # 4.2 Ambil list checklist
        response = await client.get(f"/api/v1/tasks/{task_id}/checklists", headers=headers)
        assert response.status_code == 200
        checklists = response.json()
        assert len(checklists) >= 1
        print("-> Sukses mengambil checklist item [OK]")

        # 4.3 Update/Toggle checklist status
        response = await client.put(f"/api/v1/tasks/{task_id}/checklists/{checklist_id}", json={"is_completed": True}, headers=headers)
        assert response.status_code == 200
        updated = response.json()
        assert updated["is_completed"]
        print("-> Sukses toggle checklist status [OK]")

        # 4.4 Hapus checklist item
        response = await client.delete(f"/api/v1/tasks/{task_id}/checklists/{checklist_id}", headers=headers)
        assert response.status_code == 204
        print("-> Sukses menghapus checklist item [OK]")

        # ==========================================
        # 5. UJI TIME LOGS / TIME TRACKING
        # ==========================================
        print("\nMenguji fitur Time Tracking...")
        
        # 5.1 Login as developer1 (pemilik task component FE)
        response_dev = await client.post("/api/v1/auth/login", data={"username": "developer1", "password": "password123"})
        assert response_dev.status_code == 200
        dev_token = response_dev.json()["access_token"]
        dev_headers = {"Authorization": f"Bearer {dev_token}"}

        # 5.2 Start timer
        start_payload = {"description": "Mulai pengerjaan FE"}
        response = await client.post(f"/api/v1/tasks/{task_id}/components/{component_id}/time-logs/start", json=start_payload, headers=dev_headers)
        assert response.status_code == 200
        active_log = response.json()
        assert active_log["end_time"] is None
        print("-> Sukses menjalankan timer tracker [OK]")

        # 5.3 Stop timer
        stop_payload = {"description": "Berhenti pengerjaan FE"}
        response = await client.post(f"/api/v1/tasks/{task_id}/components/{component_id}/time-logs/stop", json=stop_payload, headers=dev_headers)
        assert response.status_code == 200
        stopped_log = response.json()
        assert stopped_log["end_time"] is not None
        assert stopped_log["duration_seconds"] is not None
        print("-> Sukses memberhentikan timer tracker [OK]")

        # 5.4 Manual log
        manual_payload = {
            "start_time": "2026-06-15T09:00:00Z",
            "end_time": "2026-06-15T11:00:00Z",
            "description": "Log waktu manual dari test"
        }
        response = await client.post(f"/api/v1/tasks/{task_id}/components/{component_id}/time-logs/manual", json=manual_payload, headers=dev_headers)
        assert response.status_code == 200
        manual_log = response.json()
        assert manual_log["duration_seconds"] == 7200
        print("-> Sukses mencatat log waktu manual [OK]")

        # 5.5 Ambil log waktu komponen
        response = await client.get(f"/api/v1/tasks/{task_id}/components/{component_id}/time-logs", headers=dev_headers)
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) >= 2
        print("-> Sukses mengambil log waktu komponen [OK]")

        # 5.6 Ambil semua log waktu task
        response = await client.get(f"/api/v1/tasks/{task_id}/time-logs", headers=dev_headers)
        assert response.status_code == 200
        task_logs = response.json()
        assert len(task_logs) >= 2
        print("-> Sukses mengambil seluruh log waktu task [OK]")

        print("\n[SUKSES] Semua pengujian fitur ClickUp (Comments, Checklist, Time Tracking) berhasil diselesaikan!")

if __name__ == "__main__":
    asyncio.run(test_clickup_features_flow())

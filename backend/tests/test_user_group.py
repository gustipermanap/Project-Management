import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.db import async_session_maker
from app.models.models import User, UserGroup
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

async def test_user_group_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login Supadmin
        print("Menguji login Supadmin...")
        response = await client.post("/api/v1/auth/login", data={"username": "supadmin", "password": "password123"})
        assert response.status_code == 200, f"Gagal login Supadmin: {response.text}"
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Ambil list group awal
        print("Mengambil daftar group...")
        response = await client.get("/api/v1/groups/", headers=headers)
        assert response.status_code == 200
        groups = response.json()
        
        system_group = next(g for g in groups if g["is_system"])
        print(f"-> Ditemukan group sistem: {system_group['name']} (ID: {system_group['id']})")

        # 3. Coba edit nama group sistem (seharusnya GAGAL / 400)
        print("Menguji larangan mengubah nama group sistem...")
        response = await client.put(
            f"/api/v1/groups/{system_group['id']}", 
            json={"name": "New System Name"}, 
            headers=headers
        )
        assert response.status_code == 400, "Seharusnya gagal mengubah nama group sistem"
        print("-> Sukses diblokir dengan benar [OK]")

        # 4. Coba hapus group sistem (seharusnya GAGAL / 400)
        print("Menguji larangan menghapus group sistem...")
        response = await client.delete(
            f"/api/v1/groups/{system_group['id']}", 
            headers=headers
        )
        assert response.status_code == 400, "Seharusnya gagal menghapus group sistem"
        print("-> Sukses diblokir dengan benar [OK]")

        # 5. Membuat group baru
        print("Menguji pembuatan group baru...")
        new_group_payload = {
            "name": "Group Uji Coba",
            "description": "Deskripsi awal group uji coba",
            "permissions": ["view_dashboard", "manage_tasks"]
        }
        response = await client.post("/api/v1/groups/", json=new_group_payload, headers=headers)
        assert response.status_code == 201, f"Gagal membuat group: {response.text}"
        custom_group = response.json()
        custom_group_id = custom_group["id"]
        assert custom_group["name"] == "Group Uji Coba"
        assert custom_group["description"] == "Deskripsi awal group uji coba"
        assert "manage_tasks" in custom_group["permissions"]
        print("-> Pembuatan group baru berhasil [OK]")

        # 6. Mengupdate group baru (mengosongkan deskripsi dan merubah permission)
        print("Menguji update group (clear deskripsi & update permission)...")
        update_group_payload = {
            "description": None,
            "permissions": ["view_dashboard"]
        }
        response = await client.put(f"/api/v1/groups/{custom_group_id}", json=update_group_payload, headers=headers)
        assert response.status_code == 200, f"Gagal update group: {response.text}"
        updated_group = response.json()
        assert updated_group["description"] is None, "Deskripsi seharusnya menjadi null"
        assert updated_group["permissions"] == ["view_dashboard"], "Permission seharusnya ter-update"
        print("-> Update group berhasil [OK]")

        # 7. Membuat user baru dalam group tersebut
        print("Menguji pembuatan user baru dengan group...")
        new_user_payload = {
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "password123",
            "role": "Developer",
            "group_id": custom_group_id
        }
        response = await client.post("/api/v1/users/", json=new_user_payload, headers=headers)
        assert response.status_code == 201, f"Gagal membuat user: {response.text}"
        user = response.json()
        user_id = user["id"]
        assert user["username"] == "testuser"
        assert user["group_id"] == custom_group_id
        assert user["permissions"] == ["view_dashboard"]
        print("-> Pembuatan user berhasil [OK]")

        # 8. Update user (keluarkan dari group secara eksplit dengan group_id = null)
        print("Menguji pengeluaran user dari group secara eksplisit (group_id: null)...")
        update_user_payload = {
            "group_id": None,
            "role": "Developer"
        }
        response = await client.put(f"/api/v1/users/{user_id}", json=update_user_payload, headers=headers)
        assert response.status_code == 200, f"Gagal update user: {response.text}"
        updated_user = response.json()
        assert updated_user["group_id"] is None, "Group ID seharusnya menjadi null"
        assert updated_user["role"] == "Developer", "Role seharusnya Developer"
        # Karena dikeluarkan dari group dan rolenya Developer, permissions-nya harus berisi fallback permissions untuk Developer
        # (yaitu: view_dashboard, update_component_status)
        assert "view_dashboard" in updated_user["permissions"]
        assert "update_component_status" in updated_user["permissions"]
        print("-> Update user (group_id: null & fallback permissions) berhasil [OK]")

        # 9. Hapus group baru (karena sudah kosong)
        print("Menguji penghapusan group...")
        response = await client.delete(f"/api/v1/groups/{custom_group_id}", headers=headers)
        assert response.status_code == 204
        print("-> Hapus group berhasil [OK]")

        # 10. Hapus user
        print("Menguji penghapusan user...")
        response = await client.delete(f"/api/v1/users/{user_id}", headers=headers)
        assert response.status_code == 204
        print("-> Hapus user berhasil [OK]")

        print("\n[SUKSES] Semua pengujian user & group CRUD serta proteksi akses berjalan dengan sukses!")

if __name__ == "__main__":
    asyncio.run(test_user_group_flow())

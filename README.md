# Portal Kampus - Praktikum Keamanan Sistem Informasi

Aplikasi web portal kampus berbasis **JavaScript (Node.js & Express)**.

## 👥 Fitur & Peran Pengguna (Role Sesuai Ketentuan)

| Role | Username | Password | Keterangan & Hak Akses |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin_siakad` | `AdminPassword2024!` | Administrator Akademik. Mengelola akun pengguna (menambah, mengubah, dan menghapus akun mahasiswa & dosen dengan pilihan Program Studi bebas). |
| **Dosen** | `dsn_budi` | `DosenPassword2024!` | Dosen Pengampu. Memeriksa tugas mahasiswa, memberikan penilaian angka/huruf, dan feedback. |
| **Mahasiswa** | `mhs_dimas` | `MhsPassword2024!` | Mahasiswa Aktif. Melihat transkrip nilai, melihat tugas praktikum, dan mengunggah berkas laporan. |

---

## 🛡️ Skenario Uji Kerentanan (Praktikum KSI)
1. **Percobaan Sandi Tanpa Pembatasan (No Rate Limiting / Brute Force)**: Endpoint `POST /api/login`.
2. **Validasi Berkas Lemah (Unrestricted File Upload)**: Endpoint `POST /api/assignments/upload`.

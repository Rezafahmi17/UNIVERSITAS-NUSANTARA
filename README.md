# Portal Kampus Fiktif - Praktikum Keamanan Sistem Informasi (Cyber Campus)

Aplikasi web portal kampus fiktif sederhana berbasis **JavaScript (Node.js & Express)** yang dibangun untuk memenuhi tugas praktikum Keamanan Sistem Informasi.

Portal ini memenuhi seluruh kriteria fungsional dan dilengkapi **2 kerentanan yang sengaja diterapkan** untuk diuji dan dideteksi menggunakan scanner keamanan **Nuclei**:
1. **Percobaan Sandi Tanpa Pembatasan** (*No Rate Limiting / Brute Force Allowed*) pada `POST /api/login` (CWE-307)
2. **Validasi Berkas Lemah** (*Unrestricted File Upload*) pada `POST /api/assignments/upload` (CWE-434)

---

## 👥 Fitur & Peran Pengguna (Role Sesuai Ketentuan)

Seluruh akun dan data bersifat sintetis dan berbeda satu sama lain:

| Role | Username | Password | Keterangan & Hak Akses |
| :--- | :--- | :--- | :--- |
| **Mahasiswa 1** | `mhs_dimas` | `MhsPassword2024!` | Dimas Pratama (NIM: 220101089). Bisa login, melihat nilai, mengunggah berkas tugas praktikum, dan berdiskusi di forum. |
| **Mahasiswa 2** | `mhs_sarah` | `MhsPassword2024!` | Sarah Nur Aini (NIM: 220101142). Bisa login, melihat nilai, mengunggah tugas, dan berdiskusi. |
| **Dosen** | `dosen_budi` | `DosenPassword2024!` | Dr. Budi Santoso, M.Kom. (NIDN: 0412088501). Bisa login, memberi & mengedit nilai mahasiswa, melihat tugas terunggah, serta berdiskusi di forum. |
| **Admin** | `admin_siakad` | `AdminPassword2024!` | Administrator Akademik. Mengelola seluruh akun (tambah, edit, hapus akun mahasiswa & dosen) dan mereset database sintetis. |

---

## 🚀 Cara Menjalankan Aplikasi

Pastikan **Node.js** telah terpasang di komputer Anda.

1. Buka terminal / PowerShell pada folder proyek ini:
   ```bash
   cd "d:\ARCLAMBIS\SEMESTER 5\Keamanan Sistem Informasi\Website Praktikum"
   ```

2. Jalankan server:
   ```bash
   npm start
   ```
   *(Atau `node server.js`)*

3. Buka browser dan akses:
   ```
   http://localhost:3000
   ```

---

## 🛡️ Rincian 2 Kerentanan yang Sengaja Dibuat

### 1. Percobaan Sandi Tanpa Pembatasan (No Rate Limiting / CWE-307)
- **Endpoint:** `POST /api/login`
- **Penyebab:** Server tidak membatasi frekuensi percobaan kata sandi yang salah, tidak ada mekanisme IP lockout, penundaan waktu respon (delay), maupun CAPTCHA.
- **Dampak:** Membuka celah serangan *credential stuffing* atau *brute-force* kata sandi secara berulang-ulang tanpa terblokir.

### 2. Validasi Berkas Lemah (Unrestricted File Upload / CWE-434)
- **Endpoint:** `POST /api/assignments/upload`
- **Penyebab:** Pada fitur mahasiswa mengunggah tugas kuliah, handler file upload (Multer) tidak memeriksa ekstensi berkas (*whitelist*) maupun *magic bytes/MIME-type*.
- **Dampak:** Pengguna dapat mengunggah berbagai macam format berkas termasuk skrip eksekusi (.php, .html, .sh, .svg) yang langsung tersimpan di direktori publik `/uploads/` dan dapat diakses langsung melalui URL.

---

## 🔍 Panduan Pengujian & Scanning dengan Nuclei

Folder `nuclei-templates/` telah disediakan dengan template siap pakai untuk memverifikasi kedua kerentanan tersebut.

### 1. Scan Percobaan Sandi Tanpa Pembatasan:
```bash
nuclei -u http://localhost:3000 -t nuclei-templates/no-rate-limit-login.yaml
```

### 2. Scan Validasi Berkas Lemah:
```bash
nuclei -u http://localhost:3000 -t nuclei-templates/weak-file-upload.yaml
```

### 3. Menjalankan Seluruh Template Sekaligus:
```bash
nuclei -u http://localhost:3000 -t nuclei-templates/
```

---

## 📤 Panduan Upload ke GitHub (Untuk Pengumpulan Tugas)

Untuk mengunggah proyek ini ke GitHub publik agar link-nya bisa diserahkan pada Google Form tugas:

1. Buat repository baru di [GitHub](https://github.com/new) (contoh nama: `praktikum-ksi-portal-kampus`, set ke **Public**).
2. Jalankan perintah berikut di terminal proyek:
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi portal kampus fiktif praktikum KSI"
   git branch -M main
   git remote add origin https://github.com/<USERNAME-ANDA>/<NAMA-REPO-ANDA>.git
   git push -u origin main
   ```
3. Salin URL repositori publik tersebut ke Google Form pada isian **Link repo Github untuk (publik akses)**.

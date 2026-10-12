const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

const INITIAL_DATA = {
  users: [
    {
      id: "usr_adm_01",
      username: "admin_siakad",
      password: "AdminPassword2024!",
      name: "Administrator Sistem Informasi",
      role: "admin",
      email: "admin@cyberkampus.ac.id",
      createdAt: "2024-09-01T08:00:00Z"
    },
    {
      id: "usr_dsn_01",
      username: "dosen_budi",
      password: "DosenPassword2024!",
      name: "Dr. Budi Santoso, M.Kom.",
      role: "dosen",
      nidn: "0412088501",
      email: "budi.santoso@cyberkampus.ac.id",
      prodi: "Teknik Informatika",
      createdAt: "2024-09-01T08:00:00Z"
    },
    {
      id: "usr_mhs_01",
      username: "mhs_dimas",
      password: "MhsPassword2024!",
      name: "Dimas Pratama Putra",
      role: "mahasiswa",
      nim: "220101089",
      email: "dimas.pratama@mhs.cyberkampus.ac.id",
      semester: 5,
      prodi: "Teknik Informatika",
      createdAt: "2024-09-01T08:00:00Z"
    },
    {
      id: "usr_mhs_02",
      username: "mhs_sarah",
      password: "MhsPassword2024!",
      name: "Sarah Nur Aini",
      role: "mahasiswa",
      nim: "220101142",
      email: "sarah.aini@mhs.cyberkampus.ac.id",
      semester: 5,
      prodi: "Teknik Informatika",
      createdAt: "2024-09-01T08:00:00Z"
    }
  ],
  courses: [
    {
      code: "KSI-501",
      name: "Keamanan Sistem Informasi",
      sks: 3,
      lecturerId: "usr_dsn_01",
      lecturerName: "Dr. Budi Santoso, M.Kom."
    },
    {
      code: "KRP-502",
      name: "Kriptografi Terapan",
      sks: 3,
      lecturerId: "usr_dsn_01",
      lecturerName: "Dr. Budi Santoso, M.Kom."
    },
    {
      code: "PWL-503",
      name: "Pemrograman Web Lanjut",
      sks: 3,
      lecturerId: "usr_dsn_02",
      lecturerName: "Hendra Wijaya, M.T."
    },
    {
      code: "JRK-504",
      name: "Keamanan Jaringan Komputer",
      sks: 3,
      lecturerId: "usr_dsn_03",
      lecturerName: "Siti Rahma, M.Kom."
    }
  ],
  grades: [],
  assignments: [
    {
      id: "asg_01",
      title: "Praktikum 01: Audit Autentikasi & Brute-Force",
      courseCode: "KSI-501",
      courseName: "Keamanan Sistem Informasi",
      description: "Unggah laporan hasil simulasi pengujian pembatasan percobaan kata sandi (rate limiting) dan mekanisme mitigasinya.",
      deadline: "2026-10-30T23:59:59Z"
    },
    {
      id: "asg_02",
      title: "Praktikum 02: Validasi Berkas & Upload Scanner",
      courseCode: "KSI-501",
      courseName: "Keamanan Sistem Informasi",
      description: "Unggah berkas pembuktian validasi ekstensi berkas, inspeksi header, dan sanitasi nama dokumen.",
      deadline: "2026-11-15T23:59:59Z"
    }
  ],
  submissions: [],
  forum: []
};

function ensureDbExists() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading db.json, returning initial data", err);
    return INITIAL_DATA;
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function resetDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  return INITIAL_DATA;
}

module.exports = {
  readDb,
  writeDb,
  resetDb,
  INITIAL_DATA
};

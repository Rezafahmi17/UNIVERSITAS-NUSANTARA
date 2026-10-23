const fs = require('fs');
const path = require('path');
const os = require('os');

// Deteksi lingkungan serverless (Netlify Functions / AWS Lambda)
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

const LOCAL_DB_FILE = path.join(__dirname, 'db.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'db.json');

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
      username: "dsn_budi",
      password: "DosenPassword2024!",
      name: "Dr. Budi Santoso, M.Kom.",
      role: "dosen",
      nidn: "0412058001",
      prodi: "Teknik Informatika",
      email: "budi.santoso@cyberkampus.ac.id",
      createdAt: "2024-09-01T08:00:00Z"
    },
    {
      id: "usr_mhs_01",
      username: "mhs_dimas",
      password: "MhsPassword2024!",
      name: "Dimas Arya Pratama",
      role: "mahasiswa",
      nim: "220101001",
      prodi: "Teknik Informatika",
      semester: 5,
      email: "dimas.arya@student.cyberkampus.ac.id",
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
  grades: [
    {
      id: "grd_01",
      studentId: "usr_mhs_01",
      studentName: "Dimas Arya Pratama",
      nim: "220101001",
      courseCode: "KSI-501",
      courseName: "Keamanan Sistem Informasi",
      sks: 3,
      lecturerId: "usr_dsn_01",
      score: 88,
      gradeLetter: "A",
      gradePoint: 4.0,
      feedback: "Hasil simulasi pengujian dan analisis keamanan sangat memuaskan."
    }
  ],
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

let memoryDb = null;

function getDbFile() {
  return isServerless ? TMP_DB_FILE : LOCAL_DB_FILE;
}

function ensureDbExists() {
  const targetFile = getDbFile();
  if (isServerless) {
    if (!fs.existsSync(targetFile)) {
      try {
        if (fs.existsSync(LOCAL_DB_FILE)) {
          const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
          fs.writeFileSync(targetFile, raw, 'utf-8');
        } else {
          fs.writeFileSync(targetFile, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
        }
      } catch (e) {
        if (!memoryDb) memoryDb = JSON.parse(JSON.stringify(INITIAL_DATA));
      }
    }
  } else {
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    }
  }
}

function readDb() {
  ensureDbExists();
  const targetFile = getDbFile();
  try {
    if (fs.existsSync(targetFile)) {
      const raw = fs.readFileSync(targetFile, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryDb = parsed;
      return parsed;
    }
  } catch (err) {
    console.error("Gagal membaca database disk, menggunakan memori:", err.message);
  }

  if (!memoryDb) {
    memoryDb = JSON.parse(JSON.stringify(INITIAL_DATA));
  }
  return memoryDb;
}

function writeDb(data) {
  memoryDb = data;
  const targetFile = getDbFile();
  try {
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Penyimpanan disk gagal (read-only), disimpan di memori sementara:", err.message);
  }
}

function resetDb() {
  memoryDb = JSON.parse(JSON.stringify(INITIAL_DATA));
  const targetFile = getDbFile();
  try {
    fs.writeFileSync(targetFile, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Penyimpanan disk gagal (read-only), reset di memori sementara:", err.message);
  }
  return memoryDb;
}

module.exports = {
  readDb,
  writeDb,
  resetDb,
  INITIAL_DATA
};

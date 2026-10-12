const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { readDb, writeDb, resetDb } = require('./data/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Pastikan direktori uploads tersedia
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Buat berkas sampel contoh tugas di uploads
const samplePdfPath = path.join(UPLOAD_DIR, 'sample_report_dimas.pdf');
if (!fs.existsSync(samplePdfPath)) {
  fs.writeFileSync(samplePdfPath, '%PDF-1.4 Contoh Laporan Praktikum Keamanan Sistem Informasi - Dimas Pratama');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan static files dari public dan uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

// Counter untuk demonstrasi kerentanan Brute-Force / No Rate Limit
let failedLoginCounter = 0;
let totalLoginRequests = 0;

// Konfigurasi Multer untuk Unggah Berkas:
// KERENTANAN 2: VALIDASI BERKAS LEMAH (Unrestricted File Upload)
// - Tidak ada whitelist ekstensi (semua ekstensi diizinkan: .pdf, .php, .html, .svg, .sh, .txt, dll.)
// - Tidak ada pengecekan MIME-Type / Magic Number
// - Berkas disimpan langsung dan dapat diakses publik via /uploads/<nama_file>
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Mempertahankan nama asli berkas atau menggunakan prefix timestamp
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});
const upload = multer({
  storage: storage
  // Sengaja TIDAK ADA fileFilter atau limit ekstensi
});

// ==========================================
// API ROUTES
// ==========================================

// 1. STATUS & AUDIT PRAKTIKUM
app.get('/api/security-status', (req, res) => {
  res.json({
    status: 'online',
    portal: 'Portal Akademik Universitas Nusantara - Cyber Campus',
    intendedVulnerabilities: [
      {
        id: 'no-rate-limit',
        name: 'Percobaan Sandi Tanpa Pembatasan (No Rate Limiting / Brute Force Allowed)',
        endpoint: 'POST /api/login',
        description: 'Endpoint autentikasi tidak membatasi frekuensi percobaan sandi, tidak ada IP lockout, CAPTCHA, maupun header Retry-After.',
        failedAttemptsRecorded: failedLoginCounter,
        totalRequests: totalLoginRequests
      },
      {
        id: 'weak-file-validation',
        name: 'Validasi Berkas Lemah (Unrestricted File Upload)',
        endpoint: 'POST /api/assignments/upload',
        description: 'Endpoint unggah tugas menerima semua tipe berkas tanpa validasi ekstensi atau verifikasi MIME type, berkas langsung dapat diakses pada direktori /uploads/.',
        uploadDirectory: '/uploads'
      }
    ]
  });
});

// 2. AUTENTIKASI:
// KERENTANAN 1: PERCOBAAN SANDI TANPA PEMBATASAN
// Tidak ada express-rate-limit, tidak ada lockout, tidak ada penundaan respon
app.post('/api/login', (req, res) => {
  totalLoginRequests++;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password wajib diisi.'
    });
  }

  const db = readDb();
  const user = db.users.find(u => u.username === username && u.password === password);

  if (!user) {
    failedLoginCounter++;
    // Tidak ada mekanisme blokir, status 401 konsisten
    return res.status(401).json({
      success: false,
      message: 'Kredensial tidak valid. Username atau password salah.',
      attemptCount: failedLoginCounter,
      note: 'Vulnerability Active: Tidak ada pembatasan percobaan login (No rate-limit / no lockout).'
    });
  }

  // Login berhasil
  const userSafe = { ...user };
  delete userSafe.password;

  res.json({
    success: true,
    message: 'Login berhasil.',
    user: userSafe,
    token: `dummy-token-${user.id}-${Date.now()}`
  });
});

// 3. DAFTAR MATA KULIAH
app.get('/api/courses', (req, res) => {
  const db = readDb();
  res.json(db.courses);
});

// 4. MAHASISWA: MELIHAT NILAI
app.get('/api/grades', (req, res) => {
  const { studentId } = req.query;
  const db = readDb();
  
  if (studentId) {
    const studentGrades = db.grades.filter(g => g.studentId === studentId);
    return res.json(studentGrades);
  }
  
  res.json(db.grades);
});

// 5. MAHASISWA: DAFTAR TUGAS
app.get('/api/assignments', (req, res) => {
  const db = readDb();
  res.json(db.assignments);
});

// 6. MAHASISWA & NUCLEI: UNGGAH TUGAS (KERENTANAN 2: VALIDASI BERKAS LEMAH)
app.post('/api/assignments/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Tidak ada berkas yang diunggah.'
    });
  }

  const { assignmentId, studentId, studentName, nim } = req.body;
  const db = readDb();

  const assignment = db.assignments.find(a => a.id === assignmentId) || {
    id: assignmentId || 'asg_custom',
    title: 'Tugas Praktikum Mandiri'
  };

  const newSubmission = {
    id: `sub_${Date.now()}`,
    assignmentId: assignment.id,
    assignmentTitle: assignment.title,
    studentId: studentId || 'usr_mhs_01',
    studentName: studentName || 'Mahasiswa Pengunggah',
    nim: nim || '220101999',
    fileName: req.file.originalname,
    storedFileName: req.file.filename,
    fileUrl: `/uploads/${req.file.filename}`,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    submittedAt: new Date().toISOString(),
    status: 'Menunggu Penilaian',
    score: null,
    notes: 'Belum diperiksa dosen'
  };

  db.submissions.unshift(newSubmission);
  writeDb(db);

  res.status(200).json({
    success: true,
    message: 'Berkas tugas berhasil diunggah (Validasi berkas lemah: ekstensi bebas diterima).',
    vulnerabilityNote: 'Weak File Validation Active: Berkas disimpan tanpa verifikasi ekstensi/MIME.',
    submission: newSubmission
  });
});

// 7. MAHASISWA / DOSEN: DAFTAR PENGUMPULAN TUGAS
app.get('/api/submissions', (req, res) => {
  const { studentId } = req.query;
  const db = readDb();

  if (studentId) {
    return res.json(db.submissions.filter(s => s.studentId === studentId));
  }

  res.json(db.submissions);
});

// 8. FORUM DISKUSI: LIHAT THREAD
app.get('/api/forum', (req, res) => {
  const db = readDb();
  res.json(db.forum);
});

// 9. FORUM DISKUSI: BUAT THREAD BARU
app.post('/api/forum', (req, res) => {
  const { title, content, authorId, authorName, authorRole } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Judul dan konten wajib diisi.' });
  }

  const db = readDb();
  const newThread = {
    id: `thm_${Date.now()}`,
    title,
    content,
    authorId: authorId || 'usr_anonymous',
    authorName: authorName || 'Anonim Kampus',
    authorRole: authorRole || 'mahasiswa',
    createdAt: new Date().toISOString(),
    replies: []
  };

  db.forum.unshift(newThread);
  writeDb(db);

  res.json({ success: true, thread: newThread });
});

// 10. FORUM DISKUSI: BALAS THREAD
app.post('/api/forum/:id/reply', (req, res) => {
  const { id } = req.params;
  const { content, authorId, authorName, authorRole } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Konten balasan tidak boleh kosong.' });
  }

  const db = readDb();
  const thread = db.forum.find(t => t.id === id);

  if (!thread) {
    return res.status(404).json({ success: false, message: 'Topik diskusi tidak ditemukan.' });
  }

  const newReply = {
    id: `rep_${Date.now()}`,
    authorId: authorId || 'usr_anonymous',
    authorName: authorName || 'Pengguna Kampus',
    authorRole: authorRole || 'mahasiswa',
    content,
    createdAt: new Date().toISOString()
  };

  thread.replies.push(newReply);
  writeDb(db);

  res.json({ success: true, reply: newReply });
});

// 11. DOSEN: MEMBERI NILAI (GRADING)
app.post('/api/dosen/grade', (req, res) => {
  const { submissionId, studentId, courseCode, courseName, score, feedback, lecturerId } = req.body;
  const parsedScore = parseFloat(score);

  if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
    return res.status(400).json({ success: false, message: 'Nilai harus berupa angka 0 - 100.' });
  }

  const db = readDb();

  // Hitung grade huruf & bobot
  let gradeLetter = 'E';
  let gradePoint = 0.0;
  if (parsedScore >= 85) { gradeLetter = 'A'; gradePoint = 4.0; }
  else if (parsedScore >= 80) { gradeLetter = 'A-'; gradePoint = 3.75; }
  else if (parsedScore >= 75) { gradeLetter = 'B+'; gradePoint = 3.5; }
  else if (parsedScore >= 70) { gradeLetter = 'B'; gradePoint = 3.0; }
  else if (parsedScore >= 65) { gradeLetter = 'B-'; gradePoint = 2.75; }
  else if (parsedScore >= 60) { gradeLetter = 'C+'; gradePoint = 2.5; }
  else if (parsedScore >= 55) { gradeLetter = 'C'; gradePoint = 2.0; }
  else if (parsedScore >= 40) { gradeLetter = 'D'; gradePoint = 1.0; }

  // Update submission jika submissionId diberikan
  if (submissionId) {
    const sub = db.submissions.find(s => s.id === submissionId);
    if (sub) {
      sub.status = 'Sudah Dinilai';
      sub.score = parsedScore;
      sub.notes = feedback || 'Nilai telah diinput oleh dosen.';
    }
  }

  // Cek apakah nilai untuk mahasiswa dan matakuliah ini sudah ada di daftar nilai
  const targetStudent = db.users.find(u => u.id === studentId);
  const existingGradeIndex = db.grades.findIndex(g => g.studentId === studentId && g.courseCode === courseCode);

  if (existingGradeIndex >= 0) {
    db.grades[existingGradeIndex].score = parsedScore;
    db.grades[existingGradeIndex].gradeLetter = gradeLetter;
    db.grades[existingGradeIndex].gradePoint = gradePoint;
    db.grades[existingGradeIndex].feedback = feedback || db.grades[existingGradeIndex].feedback;
  } else {
    db.grades.push({
      id: `grd_${Date.now()}`,
      studentId: studentId,
      studentName: targetStudent ? targetStudent.name : 'Mahasiswa',
      nim: targetStudent ? targetStudent.nim : '-',
      courseCode: courseCode || 'KSI-501',
      courseName: courseName || 'Keamanan Sistem Informasi',
      sks: 3,
      lecturerId: lecturerId || 'usr_dsn_01',
      score: parsedScore,
      gradeLetter,
      gradePoint,
      feedback: feedback || 'Penilaian tugas & praktikum.'
    });
  }

  writeDb(db);
  res.json({
    success: true,
    message: 'Nilai mahasiswa berhasil disimpan.',
    score: parsedScore,
    gradeLetter,
    gradePoint
  });
});

// 12. ADMIN: KELOLA AKUN (GET, CREATE, UPDATE, DELETE)
app.get('/api/admin/users', (req, res) => {
  const db = readDb();
  // Sembunyikan hash/password pada tampilan umum, namun sertakan untuk tujuan demonstrasi audit sintetis
  const safeUsers = db.users.map(u => ({
    ...u,
    passwordDisplay: u.password // Ditampilkan untuk kemudahan review praktikum
  }));
  res.json(safeUsers);
});

app.post('/api/admin/users', (req, res) => {
  const { username, password, name, role, email, nim, nidn, prodi, semester } = req.body;

  if (!username || !password || !name || !role) {
    return res.status(400).json({ success: false, message: 'Data username, password, nama, dan role wajib diisi.' });
  }

  const db = readDb();
  if (db.users.some(u => u.username === username)) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
  }

  const newUser = {
    id: `usr_${role.substring(0, 3)}_${Date.now()}`,
    username,
    password,
    name,
    role,
    email: email || `${username}@cyberkampus.ac.id`,
    nim: role === 'mahasiswa' ? (nim || '220101999') : undefined,
    nidn: role === 'dosen' ? (nidn || '0400000001') : undefined,
    prodi: prodi || 'Teknik Informatika',
    semester: role === 'mahasiswa' ? (parseInt(semester) || 1) : undefined,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  res.status(201).json({ success: true, message: 'Akun sintetis baru berhasil dibuat.', user: newUser });
});

app.put('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, email, password, nim, nidn, prodi, semester } = req.body;

  const db = readDb();
  const user = db.users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  if (name) user.name = name;
  if (role) user.role = role;
  if (email) user.email = email;
  if (password) user.password = password;
  if (nim !== undefined) user.nim = nim;
  if (nidn !== undefined) user.nidn = nidn;
  if (prodi !== undefined) user.prodi = prodi;
  if (semester !== undefined) user.semester = parseInt(semester);

  writeDb(db);
  res.json({ success: true, message: 'Data akun berhasil diperbarui.', user });
});

app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  // Lindungi akun default admin utama agar tidak terkunci
  if (db.users[userIndex].username === 'admin_siakad') {
    return res.status(400).json({ success: false, message: 'Akun admin utama tidak boleh dihapus.' });
  }

  const deletedUser = db.users.splice(userIndex, 1)[0];
  writeDb(db);

  res.json({ success: true, message: `Akun ${deletedUser.username} berhasil dihapus.` });
});

// 13. ADMIN: RESET DATABASE SYNTHETIC DATA
app.post('/api/admin/reset-db', (req, res) => {
  resetDb();
  failedLoginCounter = 0;
  totalLoginRequests = 0;
  res.json({ success: true, message: 'Data sintetis berhasil di-reset ke nilai default awal.' });
});

// Fallback untuk SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  PORTAL KAMPUS FIKTIF - PRAKTIKUM KEAMANAN SISTEM INFORMASI`);
  console.log(`=======================================================`);
  console.log(`  Server aktif di : http://localhost:${PORT}`);
  console.log(`  Kerentanan 1    : Percobaan Sandi Tanpa Pembatasan (POST /api/login)`);
  console.log(`  Kerentanan 2    : Validasi Berkas Lemah (POST /api/assignments/upload)`);
  console.log(`  Upload Folder   : ${UPLOAD_DIR}`);
  console.log(`=======================================================`);
});

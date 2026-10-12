// State aplikasi
let currentUser = null;
let activeTab = 'dashboard';
let securityData = null;

// Helper DOM
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', async () => {
  initSession();
  await loadSecurityStatus();
  renderApp();
  setupEventListeners();
});

// Sesi Pengguna
function initSession() {
  const saved = localStorage.getItem('siakad_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch (e) {
      currentUser = null;
    }
  }
}

function setSession(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('siakad_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('siakad_user');
  }
  renderApp();
}

// Fetch Status Keamanan & Audit
async function loadSecurityStatus() {
  try {
    const res = await fetch('/api/security-status');
    securityData = await res.json();
    updateSecurityPills();
  } catch (err) {
    console.error('Gagal mengambil status keamanan:', err);
  }
}

function updateSecurityPills() {
  const pillBrute = $('#pill-brute-count');
  if (pillBrute && securityData) {
    const bruteVuln = securityData.intendedVulnerabilities.find(v => v.id === 'no-rate-limit');
    pillBrute.textContent = `${bruteVuln ? bruteVuln.failedAttemptsRecorded : 0} percobaan gagal`;
  }
}

// Setup Event Listeners Global
function setupEventListeners() {
  // Nav buttons
  $('#btn-open-login')?.addEventListener('click', () => openModal('modal-login'));
  $('#btn-logout')?.addEventListener('click', handleLogout);
  $('#btn-open-security')?.addEventListener('click', () => openModal('modal-security'));

  // Close modals on overlay or close button
  $$('.modal-close, .btn-modal-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  $$('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // Login form submit
  $('#form-login')?.addEventListener('submit', handleLoginSubmit);
}

// Buka Modal
function openModal(id) {
  const el = $(`#${id}`);
  if (el) el.classList.add('active');
}

// Tutup Modal
function closeModal(id) {
  const el = $(`#${id}`);
  if (el) el.classList.remove('active');
}

// Handle Login (KERENTANAN 1: Tanpa Rate Limiting)
async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = $('#login-username').value.trim();
  const password = $('#login-password').value;
  const alertBox = $('#login-alert');

  alertBox.style.display = 'none';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      alertBox.className = 'alert alert-success';
      alertBox.textContent = `Login berhasil! Selamat datang, ${data.user.name}.`;
      alertBox.style.display = 'block';

      setTimeout(() => {
        closeModal('modal-login');
        setSession(data.user);
      }, 500);
    } else {
      // Menampilkan catatan kerentanan: tidak ada pembatasan percobaan!
      alertBox.className = 'alert alert-danger';
      alertBox.innerHTML = `<strong>Gagal:</strong> ${data.message}<br><small style="opacity: 0.9;">[Audit]: Percobaan gagal ke-${data.attemptCount || 1} tanpa limitasi (No Rate Limit / Lockout aktif).</small>`;
      alertBox.style.display = 'block';
      await loadSecurityStatus();
    }
  } catch (err) {
    alertBox.className = 'alert alert-danger';
    alertBox.textContent = 'Terjadi kesalahan jaringan atau server.';
    alertBox.style.display = 'block';
  }
}

// Quick Login Helper
window.quickFillLogin = function(username, password) {
  $('#login-username').value = username;
  $('#login-password').value = password;
  $('#form-login').dispatchEvent(new Event('submit'));
};

function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari portal kampus?')) {
    setSession(null);
    activeTab = 'dashboard';
  }
}

// Render Aplikasi Utama
function renderApp() {
  const userRoleBadge = $('#nav-user-badge');
  const userActions = $('#nav-user-actions');
  const guestActions = $('#nav-guest-actions');
  const mainContent = $('#main-content');

  if (!currentUser) {
    userRoleBadge.style.display = 'none';
    userActions.style.display = 'none';
    guestActions.style.display = 'flex';
    renderGuestView(mainContent);
    return;
  }

  // Pengguna Login
  guestActions.style.display = 'none';
  userActions.style.display = 'flex';
  userRoleBadge.style.display = 'inline-flex';
  
  userRoleBadge.className = `badge badge-${currentUser.role}`;
  userRoleBadge.innerHTML = `<span class="dot"></span> ${currentUser.role.toUpperCase()}: ${currentUser.name}`;

  // Render Sesuai Role
  if (currentUser.role === 'mahasiswa') {
    renderMahasiswaView(mainContent);
  } else if (currentUser.role === 'dosen') {
    renderDosenView(mainContent);
  } else if (currentUser.role === 'admin') {
    renderAdminView(mainContent);
  }
}

// VIEW: GUEST / BELUM LOGIN
function renderGuestView(container) {
  container.innerHTML = `
    <div class="hero-banner">
      <div>
        <span class="badge badge-vuln" style="margin-bottom: 8px;">Portal Kampus Fiktif - Praktikum Keamanan Sistem Informasi</span>
        <h2 style="font-size: 1.8rem; margin: 8px 0; color: #ffffff;">Selamat Datang di Cyber Campus Universitas Nusantara</h2>
        <p style="color: var(--text-muted); max-width: 650px;">
          Portal akademik latihan untuk pengujian keamanan sistem informasi. Sistem ini dilengkapi fitur lengkap untuk Mahasiswa, Dosen, dan Admin dengan <strong>2 kerentanan yang sengaja dibuat</strong> untuk evaluasi audit menggunakan scanner seperti Nuclei.
        </p>
      </div>
      <div>
        <button class="btn btn-primary" onclick="openModal('modal-login')">
          <span>Masuk ke Portal</span> ➔
        </button>
      </div>
    </div>

    <!-- Quick Access Akun Sintetis -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">🔐 Akun Sintetis untuk Latihan</div>
          <div class="card-desc">Klik salah satu kartu di bawah ini untuk langsung mengisi dan login secara instan:</div>
        </div>
      </div>
      <div class="quick-login-grid">
        <div class="quick-login-card" onclick="quickFillLogin('mhs_dimas', 'MhsPassword2024!')">
          <div class="quick-login-role" style="color: #818cf8;">Mahasiswa (Dimas Pratama)</div>
          <div class="quick-login-name">NIM: 220101089</div>
          <div class="quick-login-cred">mhs_dimas / MhsPassword2024!</div>
        </div>

        <div class="quick-login-card" onclick="quickFillLogin('mhs_sarah', 'MhsPassword2024!')">
          <div class="quick-login-role" style="color: #818cf8;">Mahasiswa (Sarah Nur Aini)</div>
          <div class="quick-login-name">NIM: 220101142</div>
          <div class="quick-login-cred">mhs_sarah / MhsPassword2024!</div>
        </div>

        <div class="quick-login-card" onclick="quickFillLogin('dosen_budi', 'DosenPassword2024!')">
          <div class="quick-login-role" style="color: #34d399;">Dosen (Dr. Budi Santoso)</div>
          <div class="quick-login-name">NIDN: 0412088501 (Keamanan SI)</div>
          <div class="quick-login-cred">dosen_budi / DosenPassword2024!</div>
        </div>

        <div class="quick-login-card" onclick="quickFillLogin('admin_siakad', 'AdminPassword2024!')">
          <div class="quick-login-role" style="color: #fbbf24;">Administrator Akademik</div>
          <div class="quick-login-name">Kelola Akun & Sistem</div>
          <div class="quick-login-cred">admin_siakad / AdminPassword2024!</div>
        </div>
      </div>
    </div>

    <!-- Informasi Kerentanan Praktikum -->
    <div class="card" style="border-left: 4px solid var(--accent-rose);">
      <div class="card-header">
        <div class="card-title" style="color: var(--accent-rose);">
          🛡️ Kerentanan Sengaja yang Diterapkan (Target Scan Nuclei)
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
        <div>
          <h4 style="color: #ffffff; margin-bottom: 4px;">1. Percobaan Sandi Tanpa Pembatasan</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
            Endpoint <code>POST /api/login</code> tidak membatasi frekuensi login (No rate-limit, no account lockout). Dapat diuji dengan brute-force / fuzzing kredensial tanpa terkena status HTTP 429 atau blokir IP.
          </p>
          <div class="code-box">nuclei -u http://localhost:3000 -t nuclei-templates/no-rate-limit-login.yaml</div>
        </div>
        <div>
          <h4 style="color: #ffffff; margin-bottom: 4px;">2. Validasi Berkas Lemah (Unrestricted Upload)</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
            Endpoint <code>POST /api/assignments/upload</code> pada fitur tugas mahasiswa mengizinkan pengunggahan semua jenis ekstensi berkas (.php, .html, .sh, .svg, dll.) dan berkas disimpan di direktori publik <code>/uploads/</code>.
          </p>
          <div class="code-box">nuclei -u http://localhost:3000 -t nuclei-templates/weak-file-upload.yaml</div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// VIEW: MAHASISWA
// ==========================================
async function renderMahasiswaView(container) {
  // Ambil data nilai dan tugas
  const [gradesRes, assignmentsRes, submissionsRes] = await Promise.all([
    fetch(`/api/grades?studentId=${currentUser.id}`),
    fetch('/api/assignments'),
    fetch(`/api/submissions?studentId=${currentUser.id}`)
  ]);

  const grades = await gradesRes.json();
  const assignments = await assignmentsRes.json();
  const submissions = await submissionsRes.json();

  // Hitung IPK
  let totalSks = 0;
  let totalPoints = 0;
  grades.forEach(g => {
    totalSks += g.sks || 3;
    totalPoints += (g.gradePoint || 0) * (g.sks || 3);
  });
  const ipk = totalSks > 0 ? (totalPoints / totalSks).toFixed(2) : '0.00';

  container.innerHTML = `
    <!-- Banner Mahasiswa -->
    <div class="hero-banner">
      <div class="user-profile-header">
        <div class="avatar-large">${currentUser.name.charAt(0)}</div>
        <div class="user-meta">
          <h2>${currentUser.name}</h2>
          <div class="user-subtext">
            <span>NIM: <strong>${currentUser.nim}</strong></span>
            <span>•</span>
            <span>Program Studi: <strong>${currentUser.prodi}</strong></span>
            <span>•</span>
            <span>Semester: <strong>${currentUser.semester}</strong></span>
          </div>
        </div>
      </div>
      <div class="stat-group">
        <div class="stat-box">
          <div class="val" style="color: var(--accent-cyan);">${ipk}</div>
          <div class="lbl">IPK Semester</div>
        </div>
        <div class="stat-box">
          <div class="val">${totalSks}</div>
          <div class="lbl">Total SKS</div>
        </div>
        <div class="stat-box">
          <div class="val" style="color: var(--accent-emerald);">${submissions.length}</div>
          <div class="lbl">Tugas Terunggah</div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="nav-tab-btn ${activeTab === 'grades' || activeTab === 'dashboard' ? 'active' : ''}" onclick="switchTab('grades')">
        📊 Transkrip & Nilai
      </button>
      <button class="nav-tab-btn ${activeTab === 'upload' ? 'active' : ''}" onclick="switchTab('upload')">
        📤 Unggah Tugas Kuliah
      </button>
      <button class="nav-tab-btn ${activeTab === 'forum' ? 'active' : ''}" onclick="switchTab('forum')">
        💬 Forum Diskusi Kampus
      </button>
    </div>

    <!-- Tab Content -->
    <div id="tab-content">
      ${renderMahasiswaTab(activeTab, { grades, assignments, submissions })}
    </div>
  `;

  attachMahasiswaTabHandlers();
}

function renderMahasiswaTab(tab, data) {
  if (tab === 'upload') {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📤 Unggah Berkas Tugas Mahasiswa</div>
            <div class="card-desc">Pilih tugas praktikum dan unggah dokumen Anda.</div>
          </div>
          <span class="badge badge-vuln" title="Endpoint ini sengaja tidak memvalidasi ekstensi berkas">
            ⚠️ Kerentanan: Validasi Berkas Lemah
          </span>
        </div>

        <div class="alert alert-warning">
          <strong>Perhatian Lab Praktikum:</strong> Sistem ini sengaja membolehkan pengunggahan berkas tanpa filter ekstensi atau verifikasi MIME type untuk keperluan audit Nuclei. Berkas tersimpan langsung di direktori web <code>/uploads/</code>.
        </div>

        <form id="form-upload-assignment" enctype="multipart/form-data">
          <div class="form-group">
            <label class="form-label">Pilih Tugas Mata Kuliah</label>
            <select class="form-control" id="upload-assignment-id" required>
              ${data.assignments.map(a => `
                <option value="${a.id}">${a.courseCode} - ${a.title}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Pilih Berkas Tugas (Mendukung segala format)</label>
            <div class="dropzone" id="dropzone-box">
              <div class="dropzone-icon">📁</div>
              <div style="font-weight: 600; margin-bottom: 4px;" id="dropzone-text">Klik atau tarik berkas ke sini untuk mengunggah</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Format diterima: .pdf, .docx, .zip, .html, .sh, .txt, dll.</div>
              <input type="file" id="upload-file-input" name="file" required>
            </div>
          </div>

          <div id="upload-alert" style="display: none;"></div>

          <button type="submit" class="btn btn-primary" id="btn-submit-upload" style="width: 100%;">
            <span>Unggah Berkas Sekarang</span> 🚀
          </button>
        </form>
      </div>

      <!-- Riwayat Pengumpulan -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 Riwayat Tugas yang Telah Diunggah</div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Judul Tugas</th>
                <th>Nama Berkas</th>
                <th>Waktu Unggah</th>
                <th>Status Penilaian</th>
                <th>Nilai</th>
                <th>Aksi / Tautan</th>
              </tr>
            </thead>
            <tbody>
              ${data.submissions.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada tugas yang dikumpulkan.</td></tr>
              ` : data.submissions.map(s => `
                <tr>
                  <td><strong>${s.assignmentTitle}</strong></td>
                  <td><code>${s.fileName}</code></td>
                  <td>${new Date(s.submittedAt).toLocaleString('id-ID')}</td>
                  <td>
                    <span class="badge ${s.status === 'Sudah Dinilai' ? 'badge-dosen' : 'badge-admin'}">
                      ${s.status}
                    </span>
                  </td>
                  <td><strong>${s.score !== null ? s.score : '-'}</strong></td>
                  <td>
                    <a href="${s.fileUrl}" target="_blank" class="btn btn-secondary btn-sm">
                      Unduh / Lihat Berkas ↗
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (tab === 'forum') {
    return renderForumComponent();
  }

  // Default: grades tab
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">📊 Kartu Hasil Studi & Nilai Akademik</div>
          <div class="card-desc">Daftar mata kuliah dan perolehan nilai semester aktif.</div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Kode MK</th>
              <th>Mata Kuliah</th>
              <th>SKS</th>
              <th>Nilai Angka</th>
              <th>Nilai Huruf</th>
              <th>Bobot</th>
              <th>Catatan Dosen</th>
            </tr>
          </thead>
          <tbody>
            ${data.grades.map(g => `
              <tr>
                <td><code>${g.courseCode}</code></td>
                <td><strong>${g.courseName}</strong></td>
                <td>${g.sks}</td>
                <td><strong>${g.score}</strong></td>
                <td>
                  <span class="badge ${g.score >= 80 ? 'badge-dosen' : 'badge-admin'}">
                    ${g.gradeLetter}
                  </span>
                </td>
                <td>${g.gradePoint.toFixed(2)}</td>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${g.feedback || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function attachMahasiswaTabHandlers() {
  const uploadForm = $('#form-upload-assignment');
  const fileInput = $('#upload-file-input');
  const dropzoneText = $('#dropzone-text');

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        dropzoneText.textContent = `Berkas terpilih: ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024).toFixed(1)} KB)`;
      }
    });
  }

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = $('#upload-alert');
      const submitBtn = $('#btn-submit-upload');
      alertBox.style.display = 'none';

      if (!fileInput.files || fileInput.files.length === 0) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Silakan pilih berkas terlebih dahulu.';
        alertBox.style.display = 'block';
        return;
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('assignmentId', $('#upload-assignment-id').value);
      formData.append('studentId', currentUser.id);
      formData.append('studentName', currentUser.name);
      formData.append('nim', currentUser.nim);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengunggah berkas...';

      try {
        const res = await fetch('/api/assignments/upload', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();

        if (res.ok && result.success) {
          alertBox.className = 'alert alert-success';
          alertBox.innerHTML = `
            <strong>Berhasil Mengunggah!</strong><br>
            Berkas: <code>${result.submission.fileName}</code><br>
            Akses Langsung: <a href="${result.submission.fileUrl}" target="_blank" style="color: #ffffff; text-decoration: underline;">${result.submission.fileUrl}</a><br>
            <small style="opacity: 0.9;">${result.vulnerabilityNote}</small>
          `;
          alertBox.style.display = 'block';
          uploadForm.reset();
          dropzoneText.textContent = 'Klik atau tarik berkas ke sini untuk mengunggah';
          
          setTimeout(() => {
            renderApp();
          }, 1500);
        } else {
          alertBox.className = 'alert alert-danger';
          alertBox.textContent = result.message || 'Gagal mengunggah berkas.';
          alertBox.style.display = 'block';
        }
      } catch (err) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Terjadi kesalahan koneksi saat mengunggah berkas.';
        alertBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Unggah Berkas Sekarang</span> 🚀';
      }
    });
  }

  attachForumHandlers();
}

// ==========================================
// VIEW: DOSEN
// ==========================================
async function renderDosenView(container) {
  const [submissionsRes, gradesRes, usersRes] = await Promise.all([
    fetch('/api/submissions'),
    fetch('/api/grades'),
    fetch('/api/admin/users')
  ]);

  const submissions = await submissionsRes.json();
  const grades = await gradesRes.json();
  const allUsers = await usersRes.json();
  const students = allUsers.filter(u => u.role === 'mahasiswa');

  container.innerHTML = `
    <!-- Banner Dosen -->
    <div class="hero-banner">
      <div class="user-profile-header">
        <div class="avatar-large" style="background: linear-gradient(135deg, #059669, #10b981);">
          ${currentUser.name.charAt(0)}
        </div>
        <div class="user-meta">
          <h2>${currentUser.name}</h2>
          <div class="user-subtext">
            <span>NIDN: <strong>${currentUser.nidn || '0412088501'}</strong></span>
            <span>•</span>
            <span>Program Studi: <strong>${currentUser.prodi || 'Teknik Informatika'}</strong></span>
          </div>
        </div>
      </div>
      <div class="stat-group">
        <div class="stat-box">
          <div class="val" style="color: var(--accent-emerald);">${submissions.length}</div>
          <div class="lbl">Tugas Mahasiswa</div>
        </div>
        <div class="stat-box">
          <div class="val">${students.length}</div>
          <div class="lbl">Mahasiswa Terdaftar</div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs Dosen -->
    <div class="nav-tabs">
      <button class="nav-tab-btn ${activeTab === 'grading' || activeTab === 'dashboard' ? 'active' : ''}" onclick="switchTab('grading')">
        ✍️ Beri & Kelola Nilai
      </button>
      <button class="nav-tab-btn ${activeTab === 'submissions' ? 'active' : ''}" onclick="switchTab('submissions')">
        📁 Pengumpulan Tugas Mahasiswa
      </button>
      <button class="nav-tab-btn ${activeTab === 'forum' ? 'active' : ''}" onclick="switchTab('forum')">
        💬 Forum Diskusi Dosen
      </button>
    </div>

    <div id="tab-content">
      ${renderDosenTab(activeTab, { submissions, grades, students })}
    </div>
  `;

  attachDosenTabHandlers(students);
}

function renderDosenTab(tab, data) {
  if (tab === 'submissions') {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📁 Berkas Tugas yang Dikumpulkan Mahasiswa</div>
            <div class="card-desc">Tinjau dan periksa berkas tugas yang diunggah oleh mahasiswa.</div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mahasiswa</th>
                <th>NIM</th>
                <th>Tugas</th>
                <th>Berkas</th>
                <th>Waktu Unggah</th>
                <th>Nilai Saat Ini</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${data.submissions.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada mahasiswa yang mengunggah tugas.</td></tr>
              ` : data.submissions.map(s => `
                <tr>
                  <td><strong>${s.studentName}</strong></td>
                  <td><code>${s.nim}</code></td>
                  <td>${s.assignmentTitle}</td>
                  <td><code>${s.fileName}</code></td>
                  <td>${new Date(s.submittedAt).toLocaleString('id-ID')}</td>
                  <td>
                    <span class="badge ${s.status === 'Sudah Dinilai' ? 'badge-dosen' : 'badge-admin'}">
                      ${s.score !== null ? s.score : 'Belum Dinilai'}
                    </span>
                  </td>
                  <td>
                    <a href="${s.fileUrl}" target="_blank" class="btn btn-secondary btn-sm" style="margin-right: 6px;">
                      Unduh ↗
                    </a>
                    <button class="btn btn-primary btn-sm" onclick="openGradeModalForSub('${s.id}', '${s.studentId}', '${s.studentName}', '${s.assignmentTitle}', '${s.score || ''}')">
                      Beri Nilai
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (tab === 'forum') {
    return renderForumComponent();
  }

  // Default: grading tab
  return `
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem;">
      <!-- Form Input Nilai -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">✍️ Form Input Nilai</div>
        </div>

        <form id="form-grade-student">
          <div class="form-group">
            <label class="form-label">Pilih Mahasiswa</label>
            <select class="form-control" id="grade-student-id" required>
              ${data.students.map(s => `
                <option value="${s.id}">${s.name} (${s.nim})</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Mata Kuliah</label>
            <select class="form-control" id="grade-course-code" required>
              <option value="KSI-501">KSI-501: Keamanan Sistem Informasi (3 SKS)</option>
              <option value="KRP-502">KRP-502: Kriptografi Terapan (3 SKS)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Nilai Angka (0 - 100)</label>
            <input type="number" class="form-control" id="grade-score" min="0" max="100" placeholder="Contoh: 88" required>
          </div>

          <div class="form-group">
            <label class="form-label">Catatan / Umpan Balik</label>
            <textarea class="form-control" id="grade-feedback" placeholder="Analisis praktikum sangat baik..."></textarea>
          </div>

          <div id="grade-alert" style="display: none;"></div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">
            Simpan Nilai Mahasiswa 💾
          </button>
        </form>
      </div>

      <!-- Rekap Nilai -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📑 Rekapitulasi Nilai Seluruh Mahasiswa</div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mahasiswa</th>
                <th>Mata Kuliah</th>
                <th>Nilai</th>
                <th>Grade</th>
                <th>Bobot</th>
                <th>Catatan Dosen</th>
              </tr>
            </thead>
            <tbody>
              ${data.grades.map(g => `
                <tr>
                  <td><strong>${g.studentName}</strong><br><small style="color: var(--text-dim);">${g.nim}</small></td>
                  <td>${g.courseName}</td>
                  <td><strong>${g.score}</strong></td>
                  <td><span class="badge ${g.score >= 80 ? 'badge-dosen' : 'badge-admin'}">${g.gradeLetter}</span></td>
                  <td>${g.gradePoint.toFixed(2)}</td>
                  <td style="font-size: 0.8rem; color: var(--text-muted);">${g.feedback || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function attachDosenTabHandlers(students) {
  const formGrade = $('#form-grade-student');
  if (formGrade) {
    formGrade.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = $('#grade-student-id').value;
      const courseCode = $('#grade-course-code').value;
      const score = $('#grade-score').value;
      const feedback = $('#grade-feedback').value;
      const alertBox = $('#grade-alert');

      alertBox.style.display = 'none';

      try {
        const res = await fetch('/api/dosen/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            courseCode,
            courseName: courseCode === 'KSI-501' ? 'Keamanan Sistem Informasi' : 'Kriptografi Terapan',
            score,
            feedback,
            lecturerId: currentUser.id
          })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          alertBox.className = 'alert alert-success';
          alertBox.textContent = `Nilai ${score} (${result.gradeLetter}) berhasil disimpan!`;
          alertBox.style.display = 'block';

          setTimeout(() => {
            renderApp();
          }, 1200);
        } else {
          alertBox.className = 'alert alert-danger';
          alertBox.textContent = result.message || 'Gagal menyimpan nilai.';
          alertBox.style.display = 'block';
        }
      } catch (err) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Terjadi kesalahan sistem.';
        alertBox.style.display = 'block';
      }
    });
  }

  attachForumHandlers();
}

window.openGradeModalForSub = function(subId, studentId, studentName, asgTitle, curScore) {
  const scoreInput = prompt(`Masukkan nilai untuk ${studentName} (${asgTitle}):`, curScore || '85');
  if (scoreInput !== null) {
    const feedback = prompt('Catatan evaluasi untuk mahasiswa:', 'Pengerjaan tugas telah ditinjau.');
    fetch('/api/dosen/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: subId,
        studentId: studentId,
        courseCode: 'KSI-501',
        courseName: 'Keamanan Sistem Informasi',
        score: scoreInput,
        feedback: feedback,
        lecturerId: currentUser.id
      })
    }).then(res => res.json()).then(res => {
      if (res.success) {
        alert('Nilai berhasil diupdate!');
        renderApp();
      } else {
        alert(res.message);
      }
    });
  }
};

// ==========================================
// VIEW: ADMIN
// ==========================================
async function renderAdminView(container) {
  const usersRes = await fetch('/api/admin/users');
  const users = await usersRes.json();

  container.innerHTML = `
    <!-- Banner Admin -->
    <div class="hero-banner">
      <div class="user-profile-header">
        <div class="avatar-large" style="background: linear-gradient(135deg, #d97706, #f59e0b);">
          ⚙️
        </div>
        <div class="user-meta">
          <h2>${currentUser.name}</h2>
          <div class="user-subtext">
            <span>Role: <strong>Sistem Administrator</strong></span>
            <span>•</span>
            <span>Status: <strong>Aktif</strong></span>
          </div>
        </div>
      </div>
      <div class="stat-group">
        <div class="stat-box">
          <div class="val" style="color: var(--accent-amber);">${users.length}</div>
          <div class="lbl">Total Akun</div>
        </div>
        <div class="stat-box">
          <div class="val" style="color: var(--accent-rose);">${securityData?.intendedVulnerabilities[0]?.failedAttemptsRecorded || 0}</div>
          <div class="lbl">Percobaan Sandi Gagal</div>
        </div>
      </div>
    </div>

    <!-- Kontrol Admin -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">👥 Kelola Akun Kampus Sintetis</div>
          <div class="card-desc">Tambah, edit, dan hapus akun mahasiswa, dosen, maupun admin.</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="resetDatabase()">
            🔄 Reset Data Sintetis
          </button>
          <button class="btn btn-primary btn-sm" onclick="openModal('modal-add-user')">
            ➕ Tambah Akun Baru
          </button>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Nama Lengkap</th>
              <th>Username</th>
              <th>Password (Demo)</th>
              <th>Identitas (NIM / NIDN)</th>
              <th>Email</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><span class="badge badge-${u.role}">${u.role.toUpperCase()}</span></td>
                <td><strong>${u.name}</strong></td>
                <td><code>${u.username}</code></td>
                <td><code>${u.passwordDisplay || '••••••••'}</code></td>
                <td>${u.nim ? `NIM: ${u.nim}` : (u.nidn ? `NIDN: ${u.nidn}` : '-')}</td>
                <td>${u.email}</td>
                <td>
                  <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}', '${u.username}')">
                    Hapus
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setupAdminHandlers();
}

function setupAdminHandlers() {
  const formAddUser = $('#form-add-user');
  if (formAddUser) {
    formAddUser.onsubmit = async (e) => {
      e.preventDefault();
      const role = $('#new-user-role').value;
      const username = $('#new-user-username').value.trim();
      const password = $('#new-user-password').value;
      const name = $('#new-user-name').value.trim();
      const email = $('#new-user-email').value.trim();
      const nim = $('#new-user-nim').value.trim();
      const nidn = $('#new-user-nidn').value.trim();

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password, name, email, nim, nidn })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Akun baru berhasil ditambahkan!');
        closeModal('modal-add-user');
        formAddUser.reset();
        renderApp();
      } else {
        alert(data.message || 'Gagal menambahkan akun.');
      }
    };
  }
}

window.deleteUser = async function(userId, username) {
  if (confirm(`Apakah Anda yakin ingin menghapus akun ${username}?`)) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        renderApp();
      } else {
        alert(data.message || 'Gagal menghapus akun.');
      }
    } catch (err) {
      alert('Terjadi kesalahan.');
    }
  }
};

window.resetDatabase = async function() {
  if (confirm('Reset seluruh data ke akun & nilai awal bawaan?')) {
    try {
      const res = await fetch('/api/admin/reset-db', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      await loadSecurityStatus();
      renderApp();
    } catch (err) {
      alert('Gagal mereset data.');
    }
  }
};

// ==========================================
// KOMPONEN: FORUM DISKUSI
// ==========================================
function renderForumComponent() {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">💬 Forum Diskusi Akademik Kampus</div>
          <div class="card-desc">Ruang tanya jawab dan diskusi antara mahasiswa dan dosen.</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openModal('modal-new-thread')">
          ➕ Buat Topik Baru
        </button>
      </div>

      <div id="forum-threads-list">
        <p style="color: var(--text-muted);">Memuat topik diskusi...</p>
      </div>
    </div>
  `;
}

async function loadForumThreads() {
  const listEl = $('#forum-threads-list');
  if (!listEl) return;

  try {
    const res = await fetch('/api/forum');
    const threads = await res.json();

    if (threads.length === 0) {
      listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Belum ada topik diskusi.</p>';
      return;
    }

    listEl.innerHTML = threads.map(t => `
      <div class="thread-card">
        <div class="thread-title">${t.title}</div>
        <div class="thread-body">${t.content}</div>
        <div class="thread-meta">
          <span>Oleh: <strong>${t.authorName}</strong></span>
          <span>•</span>
          <span class="badge badge-${t.authorRole}">${t.authorRole.toUpperCase()}</span>
          <span>•</span>
          <span>${new Date(t.createdAt).toLocaleString('id-ID')}</span>
          <span>•</span>
          <span>${t.replies ? t.replies.length : 0} Balasan</span>
        </div>

        <!-- Replies -->
        ${t.replies && t.replies.length > 0 ? `
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);">
            ${t.replies.map(r => `
              <div class="reply-item">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <strong style="font-size: 0.825rem; color: #ffffff;">${r.authorName} (${r.authorRole})</strong>
                  <span style="font-size: 0.72rem; color: var(--text-dim);">${new Date(r.createdAt).toLocaleTimeString('id-ID')}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">${r.content}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Reply input -->
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <input type="text" class="form-control" placeholder="Tulis balasan untuk topik ini..." id="reply-input-${t.id}">
          <button class="btn btn-secondary btn-sm" onclick="submitReply('${t.id}')">Kirim</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = '<p style="color: var(--accent-rose);">Gagal memuat topik diskusi.</p>';
  }
}

function attachForumHandlers() {
  if (activeTab === 'forum') {
    loadForumThreads();
  }

  const formNewThread = $('#form-new-thread');
  if (formNewThread) {
    formNewThread.onsubmit = async (e) => {
      e.preventDefault();
      const title = $('#thread-title').value.trim();
      const content = $('#thread-content').value.trim();

      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        closeModal('modal-new-thread');
        formNewThread.reset();
        loadForumThreads();
      } else {
        alert(data.message || 'Gagal membuat topik.');
      }
    };
  }
}

window.submitReply = async function(threadId) {
  const input = $(`#reply-input-${threadId}`);
  if (!input || !input.value.trim()) return;

  const content = input.value.trim();
  try {
    const res = await fetch(`/api/forum/${threadId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      input.value = '';
      loadForumThreads();
    } else {
      alert(data.message || 'Gagal membalas topik.');
    }
  } catch (err) {
    alert('Terjadi kesalahan.');
  }
};

// Switch Tab
window.switchTab = function(tab) {
  activeTab = tab;
  renderApp();
};

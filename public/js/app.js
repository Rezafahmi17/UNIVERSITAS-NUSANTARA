let currentUser = null;
let activeTab = 'grades';

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('siakad_user');
  if (saved) {
    try { currentUser = JSON.parse(saved); } catch(e) { currentUser = null; }
  }
  render();
});

function setSession(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('siakad_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('siakad_user');
  }
  render();
}

function render() {
  const navActions = document.getElementById('nav-actions');
  const main = document.getElementById('main-content');

  if (!currentUser) {
    navActions.innerHTML = '';
    renderLoginView(main);
    return;
  }

  navActions.innerHTML = `
    <span class="user-tag">${currentUser.name} (${currentUser.role.toUpperCase()})</span>
    <button class="btn btn-secondary btn-sm" onclick="logout()">Keluar</button>
  `;

  if (currentUser.role === 'mahasiswa') {
    renderMahasiswaView(main);
  } else if (currentUser.role === 'dosen') {
    renderDosenView(main);
  } else if (currentUser.role === 'admin') {
    renderAdminView(main);
  }
}

function logout() {
  setSession(null);
  activeTab = 'grades';
}

// ----------------------------------------------------
// HALAMAN DEPAN & LOGIN
// ----------------------------------------------------
function renderLoginView(container) {
  container.innerHTML = `
    <div class="portal-grid">
      <!-- Kolom Informasi Kampus -->
      <div>
        <div class="card">
          <div class="card-title">Pengumuman Akademik</div>

          <div class="announcement-item">
            <h3>Jadwal Pelaksanaan Perkuliahan & Praktikum Semester Ganjil</h3>
            <p>Seluruh mahasiswa diwajibkan memeriksa jadwal perkuliahan dan mengumpulkan tugas praktikum melalui portal akademik.</p>
            <span>Diterbitkan: Biro Administrasi Akademik</span>
          </div>

          <div class="announcement-item">
            <h3>Batas Akhir Pengunggahan Laporan Praktikum</h3>
            <p>Pengumpulan berkas tugas praktikum mandiri dapat dilakukan pada menu Unggah Tugas sebelum batas waktu berakhir.</p>
            <span>Diterbitkan: Tim Dosen Pengampu</span>
          </div>

          <div class="announcement-item">
            <h3>Panduan Akses Portal Mahasiswa & Dosen</h3>
            <p>Gunakan akun yang telah didaftarkan untuk masuk dan mengakses layanan transkrip nilai serta pengumpulan tugas.</p>
            <span>Diterbitkan: UPT Sistem Informasi</span>
          </div>
        </div>
      </div>

      <!-- Kolom Form Login -->
      <div>
        <div class="card">
          <div class="card-title">Masuk ke Portal Akademik</div>

          <form id="login-form">
            <div class="form-group">
              <label class="form-label">Nama Pengguna</label>
              <input type="text" class="form-control" id="login-user" placeholder="Username" required>
            </div>

            <div class="form-group">
              <label class="form-label">Kata Sandi</label>
              <input type="password" class="form-control" id="login-pass" placeholder="Password" required>
            </div>

            <div id="login-alert" class="alert alert-danger" style="display:none;"></div>

            <button type="submit" class="btn btn-primary" style="width:100%;">Masuk</button>
          </form>

        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const alertBox = document.getElementById('login-alert');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSession(data.user);
      } else {
        alertBox.textContent = data.message || 'Username atau password salah.';
        alertBox.style.display = 'block';
      }
    } catch (err) {
      alertBox.textContent = 'Gagal menghubungi server.';
      alertBox.style.display = 'block';
    }
  };
}

function quickLogin(u, p) {
  document.getElementById('login-user').value = u;
  document.getElementById('login-pass').value = p;
  document.getElementById('login-form').dispatchEvent(new Event('submit'));
}

// ----------------------------------------------------
// VIEW: MAHASISWA
// ----------------------------------------------------
async function renderMahasiswaView(container) {
  const [gradesRes, assignmentsRes, submissionsRes] = await Promise.all([
    fetch(`/api/grades?studentId=${currentUser.id}`),
    fetch('/api/assignments'),
    fetch(`/api/submissions?studentId=${currentUser.id}`)
  ]);

  const grades = await gradesRes.json();
  const assignments = await assignmentsRes.json();
  const submissions = await submissionsRes.json();

  container.innerHTML = `
    <div class="card" style="background:#eff6ff; border-color:#bfdbfe;">
      <h2 style="font-size:1.1rem; color:#1e3a8a;">Selamat Datang, ${currentUser.name}</h2>
      <p style="font-size:0.85rem; color:#475569;">NIM: ${currentUser.nim} | Program Studi: ${currentUser.prodi} | Semester: ${currentUser.semester}</p>
    </div>

    <div class="tabs">
      <button class="tab-btn ${activeTab === 'grades' ? 'active' : ''}" onclick="switchTab('grades')">Transkrip Nilai</button>
      <button class="tab-btn ${activeTab === 'upload' ? 'active' : ''}" onclick="switchTab('upload')">Unggah Tugas</button>
      <button class="tab-btn ${activeTab === 'forum' ? 'active' : ''}" onclick="switchTab('forum')">Forum Diskusi</button>
    </div>

    <div id="tab-body">
      ${activeTab === 'upload' ? renderUploadTab(assignments, submissions) :
        activeTab === 'forum' ? renderForumTab() :
        renderGradesTab(grades)}
    </div>
  `;

  if (activeTab === 'upload') attachUploadForm();
  if (activeTab === 'forum') loadForum();
}

function renderGradesTab(grades) {
  return `
    <div class="card">
      <div class="card-title">Kartu Hasil Studi (KHS)</div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Mata Kuliah</th>
              <th>SKS</th>
              <th>Nilai</th>
              <th>Grade</th>
              <th>Bobot</th>
              <th>Catatan Dosen</th>
            </tr>
          </thead>
          <tbody>
            ${grades.map(g => `
              <tr>
                <td>${g.courseCode}</td>
                <td><strong>${g.courseName}</strong></td>
                <td>${g.sks}</td>
                <td>${g.score}</td>
                <td><strong>${g.gradeLetter}</strong></td>
                <td>${g.gradePoint.toFixed(2)}</td>
                <td style="color:#64748b;">${g.feedback || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderUploadTab(assignments, submissions) {
  return `
    <div class="card">
      <div class="card-title">Form Unggah Berkas Tugas</div>

      <form id="upload-form">
        <div class="form-group">
          <label class="form-label">Pilih Mata Kuliah / Tugas</label>
          <select class="form-control" id="asg-id" required>
            ${assignments.map(a => `<option value="${a.id}">${a.courseCode} - ${a.title}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Pilih Berkas Tugas</label>
          <input type="file" class="form-control" id="asg-file" required>
        </div>

        <div id="upload-msg" class="alert" style="display:none;"></div>

        <button type="submit" class="btn btn-primary" id="btn-upload">Unggah Berkas</button>
      </form>
    </div>

    <div class="card">
      <div class="card-title">Daftar Berkas yang Telah Dikumpulkan</div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tugas</th>
              <th>Nama Berkas</th>
              <th>Waktu Unggah</th>
              <th>Status</th>
              <th>Nilai</th>
              <th>Tautan</th>
            </tr>
          </thead>
          <tbody>
            ${submissions.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;">Belum ada tugas dikumpulkan.</td></tr>' :
              submissions.map(s => `
                <tr>
                  <td>${s.assignmentTitle}</td>
                  <td>${s.fileName}</td>
                  <td>${new Date(s.submittedAt).toLocaleDateString('id-ID')}</td>
                  <td>${s.status}</td>
                  <td><strong>${s.score !== null ? s.score : '-'}</strong></td>
                  <td><a href="${s.fileUrl}" target="_blank" class="btn btn-secondary btn-sm">Lihat Berkas</a></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function attachUploadForm() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('asg-file');
    const msg = document.getElementById('upload-msg');
    const btn = document.getElementById('btn-upload');

    if (!fileInput.files.length) return;

    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    fd.append('assignmentId', document.getElementById('asg-id').value);
    fd.append('studentId', currentUser.id);
    fd.append('studentName', currentUser.name);
    fd.append('nim', currentUser.nim);

    btn.disabled = true;
    btn.textContent = 'Mengunggah...';

    try {
      const res = await fetch('/api/assignments/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        msg.className = 'alert alert-success';
        msg.textContent = 'Berkas tugas berhasil diunggah.';
        msg.style.display = 'block';
        setTimeout(() => render(), 1200);
      } else {
        msg.className = 'alert alert-danger';
        msg.textContent = data.message || 'Gagal mengunggah berkas.';
        msg.style.display = 'block';
      }
    } catch(err) {
      msg.className = 'alert alert-danger';
      msg.textContent = 'Terjadi kesalahan jaringan.';
      msg.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Unggah Berkas';
    }
  };
}

// ----------------------------------------------------
// VIEW: DOSEN
// ----------------------------------------------------
async function renderDosenView(container) {
  const [subsRes, usersRes, gradesRes] = await Promise.all([
    fetch('/api/submissions'),
    fetch('/api/admin/users'),
    fetch('/api/grades')
  ]);
  const submissions = await subsRes.json();
  const allUsers = await usersRes.json();
  const grades = await gradesRes.json();
  const students = allUsers.filter(u => u.role === 'mahasiswa');

  container.innerHTML = `
    <div class="card" style="background:#eff6ff; border-color:#bfdbfe;">
      <h2 style="font-size:1.1rem; color:#1e3a8a;">Selamat Datang, ${currentUser.name}</h2>
      <p style="font-size:0.85rem; color:#475569;">NIDN: ${currentUser.nidn || '-'} | Program Studi: ${currentUser.prodi || 'Teknik Informatika'}</p>
    </div>

    <div class="tabs">
      <button class="tab-btn ${activeTab === 'grades' ? 'active' : ''}" onclick="switchTab('grades')">Input Nilai</button>
      <button class="tab-btn ${activeTab === 'submissions' ? 'active' : ''}" onclick="switchTab('submissions')">Tugas Masuk (${submissions.length})</button>
      <button class="tab-btn ${activeTab === 'forum' ? 'active' : ''}" onclick="switchTab('forum')">Forum Diskusi</button>
    </div>

    <div id="tab-body">
      ${activeTab === 'submissions' ? renderDosenSubmissions(submissions) :
        activeTab === 'forum' ? renderForumTab() :
        renderDosenGrades(students, grades)}
    </div>
  `;

  if (activeTab === 'grades') attachDosenGradeForm();
  if (activeTab === 'forum') loadForum();
}

function renderDosenGrades(students, grades) {
  return `
    <div class="card">
      <div class="card-title">Form Penilaian Mahasiswa</div>
      <form id="form-dosen-grade">
        <div class="form-group">
          <label class="form-label">Pilih Mahasiswa</label>
          <select class="form-control" id="dosen-student-id" required>
            ${students.map(s => `<option value="${s.id}">${s.name} (${s.nim})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Mata Kuliah</label>
          <select class="form-control" id="dosen-course-code" required>
            <option value="KSI-501">KSI-501: Keamanan Sistem Informasi</option>
            <option value="KRP-502">KRP-502: Kriptografi Terapan</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nilai Angka (0 - 100)</label>
          <input type="number" class="form-control" id="dosen-score" min="0" max="100" required>
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Evaluasi</label>
          <input type="text" class="form-control" id="dosen-notes" placeholder="Catatan untuk mahasiswa">
        </div>

        <button type="submit" class="btn btn-primary">Simpan Nilai</button>
      </form>
    </div>

    <div class="card">
      <div class="card-title">Rekapitulasi Nilai Mahasiswa</div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mahasiswa</th>
              <th>Mata Kuliah</th>
              <th>Nilai</th>
              <th>Grade</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${grades.map(g => `
              <tr>
                <td><strong>${g.studentName}</strong> (${g.nim})</td>
                <td>${g.courseName}</td>
                <td>${g.score}</td>
                <td><strong>${g.gradeLetter}</strong></td>
                <td style="color:#64748b;">${g.feedback || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function attachDosenGradeForm() {
  const form = document.getElementById('form-dosen-grade');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('dosen-student-id').value;
    const courseCode = document.getElementById('dosen-course-code').value;
    const score = document.getElementById('dosen-score').value;
    const feedback = document.getElementById('dosen-notes').value;

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
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Nilai berhasil disimpan!');
      render();
    } else {
      alert(data.message || 'Gagal menyimpan nilai.');
    }
  };
}

function renderDosenSubmissions(submissions) {
  return `
    <div class="card">
      <div class="card-title">Daftar Pengumpulan Tugas Mahasiswa</div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mahasiswa</th>
              <th>Tugas</th>
              <th>Nama Berkas</th>
              <th>Waktu</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${submissions.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;">Belum ada pengumpulan tugas.</td></tr>' :
              submissions.map(s => `
                <tr>
                  <td><strong>${s.studentName}</strong> (${s.nim})</td>
                  <td>${s.assignmentTitle}</td>
                  <td>${s.fileName}</td>
                  <td>${new Date(s.submittedAt).toLocaleDateString('id-ID')}</td>
                  <td>${s.status}</td>
                  <td><a href="${s.fileUrl}" target="_blank" class="btn btn-secondary btn-sm">Unduh</a></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// VIEW: ADMIN
// ----------------------------------------------------
async function renderAdminView(container) {
  const res = await fetch('/api/admin/users');
  const users = await res.json();

  container.innerHTML = `
    <div class="card" style="background:#eff6ff; border-color:#bfdbfe;">
      <h2 style="font-size:1.1rem; color:#1e3a8a;">Panel Administrator Sistem</h2>
      <p style="font-size:0.85rem; color:#475569;">Pengelolaan Akun Pengguna Portal Akademik</p>
    </div>

    <div class="card">
      <div class="card-title">Tambah Akun Baru</div>
      <form id="form-add-user" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
        <div>
          <label class="form-label">Role</label>
          <select class="form-control" id="adm-role" required>
            <option value="mahasiswa">Mahasiswa</option>
            <option value="dosen">Dosen</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label class="form-label">Nama Lengkap</label>
          <input type="text" class="form-control" id="adm-name" required>
        </div>
        <div>
          <label class="form-label">Username</label>
          <input type="text" class="form-control" id="adm-user" required>
        </div>
        <div>
          <label class="form-label">Password</label>
          <input type="text" class="form-control" id="adm-pass" required>
        </div>
        <div>
          <label class="form-label">NIM / NIDN</label>
          <input type="text" class="form-control" id="adm-id">
        </div>
        <div style="display:flex; align-items:flex-end;">
          <button type="submit" class="btn btn-primary" style="width:100%;">Tambah Akun</button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-title">Daftar Akun Terdaftar</div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Nama</th>
              <th>Username</th>
              <th>Identitas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.role.toUpperCase()}</strong></td>
                <td>${u.name}</td>
                <td>${u.username}</td>
                <td>${u.nim ? 'NIM: ' + u.nim : (u.nidn ? 'NIDN: ' + u.nidn : '-')}</td>
                <td>
                  ${u.username === 'admin_siakad' ? '-' : `
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Hapus</button>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('form-add-user').onsubmit = async (e) => {
    e.preventDefault();
    const role = document.getElementById('adm-role').value;
    const name = document.getElementById('adm-name').value.trim();
    const username = document.getElementById('adm-user').value.trim();
    const password = document.getElementById('adm-pass').value;
    const idVal = document.getElementById('adm-id').value.trim();

    const payload = { role, name, username, password };
    if (role === 'mahasiswa') payload.nim = idVal;
    if (role === 'dosen') payload.nidn = idVal;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    if (res.ok && d.success) {
      alert('Akun berhasil ditambahkan!');
      render();
    } else {
      alert(d.message || 'Gagal membuat akun.');
    }
  };
}

async function deleteUser(id) {
  if (confirm('Hapus akun ini?')) {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    render();
  }
}

// ----------------------------------------------------
// FORUM DISKUSI
// ----------------------------------------------------
function renderForumTab() {
  return `
    <div class="card">
      <div class="card-title">Forum Diskusi Akademik</div>

      <form id="form-forum-new" style="margin-bottom:1.25rem;">
        <div class="form-group">
          <label class="form-label">Judul Topik</label>
          <input type="text" class="form-control" id="forum-title" placeholder="Judul pertanyaan atau diskusi" required>
        </div>
        <div class="form-group">
          <label class="form-label">Pesan</label>
          <textarea class="form-control" id="forum-content" rows="3" placeholder="Tuliskan pertanyaan atau tanggapan Anda..." required></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-sm">Kirim Topik</button>
      </form>

      <div id="forum-list">Memuat diskusi...</div>
    </div>
  `;
}

async function loadForum() {
  const list = document.getElementById('forum-list');
  if (!list) return;

  const res = await fetch('/api/forum');
  const threads = await res.json();

  if (!threads.length) {
    list.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;">Belum ada topik diskusi.</p>';
    return;
  }

  list.innerHTML = threads.map(t => `
    <div class="forum-card">
      <h4>${t.title}</h4>
      <p>${t.content}</p>
      <div class="forum-meta">Oleh: ${t.authorName} (${t.authorRole}) | ${new Date(t.createdAt).toLocaleDateString('id-ID')}</div>

      ${t.replies && t.replies.length ? t.replies.map(r => `
        <div class="forum-reply">
          <strong>${r.authorName}:</strong> ${r.content}
        </div>
      `).join('') : ''}

      <div style="margin-top:8px; display:flex; gap:6px;">
        <input type="text" class="form-control" placeholder="Tulis balasan..." id="reply-${t.id}">
        <button class="btn btn-secondary btn-sm" onclick="sendReply('${t.id}')">Balas</button>
      </div>
    </div>
  `).join('');

  const formNew = document.getElementById('form-forum-new');
  if (formNew) {
    formNew.onsubmit = async (e) => {
      e.preventDefault();
      await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.getElementById('forum-title').value,
          content: document.getElementById('forum-content').value,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role
        })
      });
      loadForum();
      formNew.reset();
    };
  }
}

async function sendReply(threadId) {
  const inp = document.getElementById(`reply-${threadId}`);
  if (!inp || !inp.value.trim()) return;

  await fetch(`/api/forum/${threadId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: inp.value.trim(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role
    })
  });
  loadForum();
}

function switchTab(t) {
  activeTab = t;
  render();
}

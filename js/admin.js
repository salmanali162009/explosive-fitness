/* ===== Loader helpers ===== */
function showLoader() {
  let el = document.getElementById('global-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loader';
    el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(el);
  }
}
function hideLoader() {
  const el = document.getElementById('global-loader');
  if (el) el.remove();
}

/* ===== Firestore helpers ===== */
function getDb() { return window.__firebaseDb__; }

async function getAdminCreds() {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await db.collection('admin').doc('admin123456').get();
    if (snap.exists) return snap.data();
  } catch (_) {}
  return null;
}

/* ===== Firebase ready promise ===== */
let _firebaseReadyResolve;
window.__firebaseReady = new Promise(resolve => { _firebaseReadyResolve = resolve; });
let _authReadyResolve;
window.__adminAuthReady = new Promise(resolve => { _authReadyResolve = resolve; });

/* ===== Auth init ===== */
(function initFirebase() {
  const script = document.createElement('script');
  script.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
  script.onload = () => {
    const s2 = document.createElement('script');
    s2.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
    s2.onload = () => {
      if (!firebase.apps.length) {
        firebase.initializeApp({
          apiKey: "AIzaSyAShEyFGQLpdB7bgtQ2MvXP5izE_HOn_SA",
          authDomain: "first-project-f9684.firebaseapp.com",
          projectId: "first-project-f9684",
          storageBucket: "first-project-f9684.firebasestorage.app",
          messagingSenderId: "658044746307",
          appId: "1:658044746307:web:a2da6961e90079d69a72f6"
        });
      }
      window.__firebaseDb__ = firebase.firestore();
      _firebaseReadyResolve();
      (async () => {
        try {
          const authMod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
          if (authMod && firebase.auth) {
            const auth = firebase.auth();
            const stored = localStorage.getItem('_adminCreds');
            if (stored && !auth.currentUser) {
              const { e, p } = JSON.parse(stored);
              try { await auth.signInWithEmailAndPassword(e, p); }
              catch (err) { if (err.code === 'auth/user-not-found') await auth.createUserWithEmailAndPassword(e, p); }
            }
            await auth.currentUser || await new Promise(r => { const u = auth.onAuthStateChanged(user => { u(); r(user); }); });
          }
        } catch (e) {}
        _authReadyResolve();
        if (window.location.pathname.includes('admin.html')) initAdminDashboard();
      })();
    };
    document.body.appendChild(s2);
  };
  document.body.appendChild(script);
})();

/* ===== ADMIN LOGIN (admin.html overlay) ===== */
(function() {
  const overlay = document.getElementById('admin-login-overlay');
  const dashboard = document.getElementById('admin-dashboard');
  const form = document.getElementById('admin-login-form');
  const errEl = document.getElementById('admin-login-error');

  if (!overlay || !form) return; // not on admin.html

  function showDashboard() {
    overlay.style.display = 'none';
    dashboard.style.display = 'block';
    /* If Firebase is already ready, init dashboard now */
    if (window.__firebaseDb__ && typeof initAdminDashboard === 'function') {
      initAdminDashboard();
    }
  }

  /* Check if already logged in this session */
  if (localStorage.getItem('adminAuth') === 'true') {
    showDashboard();
    return;
  }

  document.getElementById('admin-pass-t')?.addEventListener('click', function() {
    const inp = document.getElementById('admin-pass');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const pass = document.getElementById('admin-pass').value;
    errEl.classList.remove('show');
    showLoader();
    try {
      await window.__firebaseReady;
      const adminData = await getAdminCreds();
      if (adminData && email === adminData.email && pass === adminData.password) {
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('_adminCreds', JSON.stringify({ e: email, p: pass }));
        try {
          const authMod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
          if (authMod && firebase.auth) {
            const auth = firebase.auth();
            try { await auth.signInWithEmailAndPassword(email, pass); }
            catch (err) { if (err.code === 'auth/user-not-found') await auth.createUserWithEmailAndPassword(email, pass); }
            await auth.currentUser || await new Promise(r => { const u = auth.onAuthStateChanged(user => { u(); r(user); }); });
          }
        } catch (authErr) { console.warn('Firebase auth:', authErr.message); }
        _authReadyResolve();
        showDashboard();
      } else {
        errEl.textContent = 'Invalid admin credentials';
        errEl.classList.add('show');
      }
    } finally { hideLoader(); }
  });
})();

/* ===== STANDALONE ADMIN LOGIN PAGE ===== */
(function() {
  if (!window.location.pathname.includes('admin-login.html')) return;
  const form = document.getElementById('admin-login-form');
  const errEl = document.getElementById('admin-login-error');
  if (!form) return;
  document.getElementById('admin-pass-t')?.addEventListener('click', function() {
    const inp = document.getElementById('admin-pass');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const pass = document.getElementById('admin-pass').value;
    errEl.classList.remove('show');
    showLoader();
    try {
      await window.__firebaseReady;
      const adminData = await getAdminCreds();
      if (adminData && email === adminData.email && pass === adminData.password) {
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('_adminCreds', JSON.stringify({ e: email, p: pass }));
        window.location.href = 'admin.html';
      } else {
        errEl.textContent = 'Invalid admin credentials';
        errEl.classList.add('show');
      }
    } finally { hideLoader(); }
  });
})();

/* ===== ADMIN DASHBOARD ===== */
let _adminInitDone = false;
async function initAdminDashboard() {
  if (_adminInitDone) return;
  if (localStorage.getItem('adminAuth') !== 'true') {
    if (!document.getElementById('admin-login-overlay')) {
      window.location.href = 'admin-login.html';
    }
    return;
  }

  _adminInitDone = true;
  await window.__adminAuthReady;
  const db = getDb();
  const usersCol = db.collection('users');
  const attCol = db.collection('attendance');
  let allUsers = [];

  /* Logout */
  document.querySelectorAll('#admin-signout, #admin-logout-top').forEach(el => {
    el?.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('adminAuth'); window.location.href = 'admin-login.html'; });
  });

  /* Tab switching */
  function switchAdminTab(tab) {
    const tabName = tab.dataset.tab;
    document.querySelectorAll('.admin-side nav a, .admin-mobile-nav a').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-side nav a[data-tab="' + tabName + '"], .admin-mobile-nav a[data-tab="' + tabName + '"]').forEach(t => t.classList.add('active'));
    if (tabName === 'users') showUsersTab();
    else if (tabName === 'attendance') showMarkAttendance();
    else if (tabName === 'scan') { document.getElementById('scan-modal').classList.add('show'); document.getElementById('scan-roll').value = ''; document.getElementById('scan-result').className = 'admin-modal-result'; setTimeout(startQrScanner, 300); }
    else if (tabName === 'payments') showPaymentsTab();
  }
  document.querySelectorAll('.admin-side nav a, .admin-mobile-nav a').forEach(tab => {
    tab.addEventListener('click', (e) => { e.preventDefault(); switchAdminTab(tab); });
  });

  /* Search */
  document.getElementById('admin-search')?.addEventListener('input', (e) => {
    renderUsersTable(e.target.value.toLowerCase());
  });

  /* Scan modal & QR scanner */
  let qrScanner = null;
  function stopQrScanner() {
    if (qrScanner) {
      try { qrScanner.stop().catch(() => {}); } catch(e) {}
      qrScanner = null;
    }
  }
  function startQrScanner() {
    if (typeof Html5Qrcode !== 'undefined') {
      const readerEl = document.getElementById('qr-reader');
      if (readerEl) {
        readerEl.innerHTML = '';
        qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            stopQrScanner();
            const match = decodedText.match(/[?&]roll=([^&]+)/i) || decodedText.match(/roll[/:=]\s*(\w+)/i);
            const roll = match ? match[1].toUpperCase() : decodedText.trim().toUpperCase();
            document.getElementById('scan-roll').value = roll;
            markByScan();
          }
        ).catch(() => {});
      }
    }
  }
  document.getElementById('scan-modal-close')?.addEventListener('click', () => { stopQrScanner(); document.getElementById('scan-modal').classList.remove('show'); });
  document.getElementById('scan-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) { stopQrScanner(); document.getElementById('scan-modal').classList.remove('show'); } });
  document.getElementById('scan-btn')?.addEventListener('click', () => markByScan());

  /* Load data */
  const tbody = document.getElementById('admin-users-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px"><div class="ud-loader"></div></td></tr>';
  await loadUsers();

  /* ===== LOAD USERS ===== */
  async function loadUsers() {
    try {
      const snap = await usersCol.get();
      allUsers = [];
      snap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
      updateStats();
      renderUsersTable();
    } catch (err) { console.error(err); }
  }

  function updateStats() {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.membershipStatus === 'active').length;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = allUsers.filter(u => {
      const d = new Date(u.registrationDate || u.createdAt);
      return d >= firstOfMonth;
    }).length;
    const pending = allUsers.filter(u => !isFeePaid(u)).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-new').textContent = newThisMonth;
    document.getElementById('stat-pending').textContent = pending;
  }

  function isFeePaid(u) {
    if (u.membershipStatus !== 'active') return false;
    if (!u.lastPaymentDate) return false;
    const last = new Date(u.lastPaymentDate);
    const now = new Date();
    return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();
  }

  function renderUsersTable(search = '') {
    const tbody = document.getElementById('admin-users-tbody');
    const empty = document.getElementById('admin-empty');
    if (!tbody) return;

    let filtered = allUsers;
    if (search) {
      const q = search.toLowerCase();
      filtered = allUsers.filter(u => (u.fullName || '').toLowerCase().includes(q) || (u.rollNumber || '').toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = filtered.map(u => {
      const status = u.membershipStatus === 'active' ? '<span class="badge active">Active</span>' : '<span class="badge inactive">Inactive</span>';
      const fee = isFeePaid(u) ? '<span class="badge paid">Paid</span>' : '<span class="badge unpaid">Unpaid</span>';
      const joined = u.registrationDate ? new Date(u.registrationDate).toLocaleDateString() : '-';
      return `<tr>
        <td><strong style="display:inline-flex;align-items:center;gap:4px"><span onclick="event.stopPropagation();navigator.clipboard.writeText('${u.rollNumber || ''}').then(()=>toast('Copied!'))" style="cursor:pointer;display:inline-flex;padding:2px;border-radius:4px;transition:background .2s" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background=''" title="Copy roll number"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>${u.rollNumber || '-'}</strong></td>
        <td>${u.fullName || 'Unknown'}</td>
        <td>${u.plan || '-'}</td>
        <td>${status}</td>
        <td>${u.attendanceCount || 0}</td>
        <td>${joined}</td>
        <td>${fee}</td>
        <td class="actions">
          <a href="user-detail.html?uid=${u.id}" class="btn-view">View</a>
        </td>
      </tr>`;
    }).join('');
  }

  window.markMonthFeePaid = async (uid, monthKey) => {
    try {
      const [y, m] = monthKey.split('-');
      const txId = 'FEE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      await usersCol.doc(uid).collection('fees').doc(monthKey).set({
        month: parseInt(m), year: parseInt(y), monthKey,
        paid: true, paidAt: new Date().toISOString(), paidBy: 'admin',
        transactionId: txId, createdAt: new Date().toISOString()
      });
      await usersCol.doc(uid).update({
        lastPaymentDate: new Date().toISOString(),
        membershipStatus: 'active'
      });
      toast(`Fee marked paid for ${monthKey}`);
      await loadUsers();
    } catch (err) { alert('Error: ' + err.message); }
  };

  /* ===== MARK FEE PAID (current month, from table) ===== */
  window.markFeePaid = async (uid) => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await markMonthFeePaid(uid, monthKey);
  };

  /* ===== MARK ATTENDANCE BY SCAN ===== */
  async function markByScan() {
    const roll = document.getElementById('scan-roll').value.trim().toUpperCase();
    const result = document.getElementById('scan-result');
    if (!roll) { result.textContent = 'Enter a roll number'; result.className = 'admin-modal-result fail'; return; }

    try {
      const snap = await usersCol.where('rollNumber', '==', roll).get();
      if (snap.empty) { result.textContent = 'No member found with this roll number'; result.className = 'admin-modal-result fail'; return; }

      const userData = snap.docs[0].data();
      const uid = snap.docs[0].id;
      const today = new Date().toISOString().split('T')[0];

      const existing = await attCol.where('uid', '==', uid).where('date', '==', today).get();
      if (!existing.empty) { result.textContent = `${userData.fullName} — already marked today`; result.className = 'admin-modal-result fail'; return; }

      await attCol.add({
        uid, rollNumber: roll, date: today,
        time: new Date().toLocaleTimeString(), status: 'present',
        markedBy: 'admin', createdAt: new Date().toISOString()
      });
      await usersCol.doc(uid).update({ attendanceCount: (userData.attendanceCount || 0) + 1 });

      result.textContent = `${userData.fullName} — attendance marked!`;
      result.className = 'admin-modal-result ok';
      document.getElementById('scan-roll').value = '';
      await loadUsers();
    } catch (err) { result.textContent = 'Error: ' + err.message; result.className = 'admin-modal-result fail'; }
  }

  /* ===== SHOW MARK ATTENDANCE TAB ===== */
  function showMarkAttendance() {
    document.getElementById('admin-page-title').textContent = 'Mark Attendance';
    document.getElementById('admin-tab-content').innerHTML = `
      <div style="max-width:500px;margin:0 auto;text-align:center;padding:40px;background:var(--surface);border:1px solid var(--glass-border);border-radius:var(--radius-lg)">
        <div style="width:72px;height:72px;border-radius:50%;margin:0 auto 20px;background:var(--primary-dim);color:var(--primary);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:1.2rem;margin-bottom:20px">Mark Member Attendance</h2>
        <div style="display:flex;gap:12px;max-width:360px;margin:0 auto">
          <input type="text" id="mark-roll-input" placeholder="Enter Roll Number" style="flex:1;padding:14px 18px;background:var(--canvas);border:1.5px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text);font-size:1rem;text-align:center;outline:none;text-transform:uppercase">
          <button class="btn btn-primary" id="mark-roll-btn">Mark</button>
        </div>
        <div id="mark-roll-result" style="margin-top:16px;padding:12px;border-radius:var(--radius-sm);font-size:0.85rem;display:none"></div>
      </div>`;

    document.getElementById('mark-roll-btn')?.addEventListener('click', async () => {
      const inp = document.getElementById('mark-roll-input');
      const res = document.getElementById('mark-roll-result');
      const roll = inp.value.trim().toUpperCase();
      if (!roll) { res.style.display = 'block'; res.style.background = 'rgba(239,68,68,0.10)'; res.style.color = '#ef4444'; res.textContent = 'Enter roll number'; return; }

      try {
        const snap = await usersCol.where('rollNumber', '==', roll).get();
        if (snap.empty) { res.style.display = 'block'; res.style.background = 'rgba(239,68,68,0.10)'; res.style.color = '#ef4444'; res.textContent = 'No member found'; return; }

        const u = snap.docs[0].data();
        const uid = snap.docs[0].id;
        const today = new Date().toISOString().split('T')[0];
        const exist = await attCol.where('uid', '==', uid).where('date', '==', today).get();

        if (!exist.empty) { res.style.display = 'block'; res.style.background = 'rgba(239,68,68,0.10)'; res.style.color = '#ef4444'; res.textContent = `${u.fullName} — already marked today`; return; }

        await attCol.add({ uid, rollNumber: roll, date: today, time: new Date().toLocaleTimeString(), status: 'present', markedBy: 'admin', createdAt: new Date().toISOString() });
        await usersCol.doc(uid).update({ attendanceCount: (u.attendanceCount || 0) + 1 });

        res.style.display = 'block'; res.style.background = 'rgba(34,197,94,0.10)'; res.style.color = '#22c55e';
        res.textContent = `${u.fullName} — attendance marked!`;
        inp.value = '';
        await loadUsers();
      } catch (err) { res.style.display = 'block'; res.style.background = 'rgba(239,68,68,0.10)'; res.style.color = '#ef4444'; res.textContent = 'Error: ' + err.message; }
    });
  }

  /* ===== SHOW PAYMENTS TAB ===== */
  function showPaymentsTab() {
    document.getElementById('admin-page-title').textContent = 'Payments';
    const unpaid = allUsers.filter(u => !isFeePaid(u));
    document.getElementById('admin-tab-content').innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Roll #</th><th>Name</th><th>Plan</th><th>Status</th><th>Last Payment</th><th>Action</th></tr></thead>
          <tbody>${unpaid.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary)">All fees are paid this month</td></tr>' :
            unpaid.map(u => `<tr>
        <td><strong style="display:inline-flex;align-items:center;gap:6px"><span onclick="event.stopPropagation();navigator.clipboard.writeText('${u.rollNumber || ''}').then(()=>toast('Copied!'))" style="cursor:pointer;opacity:0.5;display:inline-flex" title="Copy roll number"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>${u.rollNumber || '-'}</strong></td>
              <td>${u.fullName || 'Unknown'}</td>
              <td>${u.plan || '-'}</td>
              <td>${u.membershipStatus === 'active' ? '<span class="badge active">Active</span>' : '<span class="badge inactive">Inactive</span>'}</td>
              <td>${u.lastPaymentDate ? new Date(u.lastPaymentDate).toLocaleDateString() : 'Never'}</td>
              <td><button class="btn-pay" onclick="markFeePaid('${u.id}')">Mark Paid</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ===== USERS TAB ===== */
  function showUsersTab() {
    document.getElementById('admin-page-title').textContent = 'Users Management';
    document.getElementById('admin-tab-content').innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Roll #</th><th>Name</th><th>Plan</th><th>Status</th><th>Attendance</th><th>Joined</th><th>Fee Status</th><th>Actions</th></tr></thead>
          <tbody id="admin-users-tbody"></tbody>
        </table>
        <div id="admin-empty" style="display:none;text-align:center;padding:40px;color:var(--text-tertiary)">No users found</div>
      </div>`;
    renderUsersTable();
  }

  /* Simple toast */
  function toast(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22c55e;color:#000;padding:12px 28px;border-radius:100px;font-weight:600;font-size:0.85rem;z-index:9999;font-family:sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.3)';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
}

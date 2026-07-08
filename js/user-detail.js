/* ===== Auth guard ===== */
if (localStorage.getItem('adminAuth') !== 'true') {
  window.location.href = 'admin-login.html';
}

/* ===== Get UID from URL ===== */
const urlParams = new URLSearchParams(window.location.search);
const UID = urlParams.get('uid');
if (!UID) {
  document.body.innerHTML = '<div style="text-align:center;padding:80px 20px;font-family:sans-serif"><h2>No user specified</h2><a href="admin.html" style="color:#E50914">Back to Admin</a></div>';
}

let adminCreds = null;
try {
  const s = localStorage.getItem('_adminCreds');
  if (s) adminCreds = JSON.parse(s);
} catch (_) {}

let __fireReady = false, __authReady = false;

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
      __fireReady = true;
      boot();
    };
    document.body.appendChild(s2);

    const s3 = document.createElement('script');
    s3.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
    s3.onload = () => {
      firebase.auth().onAuthStateChanged(user => {
        __authReady = true;
        boot();
      });
    };
    document.body.appendChild(s3);
  };
  document.body.appendChild(script);
})();

async function boot() {
  if (!__fireReady || !__authReady) return;

  /* if currentUser is signed in, we're good */
  if (firebase.auth().currentUser) { initPage(); return; }

  /* try to sign in with local creds */
  if (adminCreds) {
    try {
      await firebase.auth().signInWithEmailAndPassword(adminCreds.e, adminCreds.p);
      return;
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        try { await firebase.auth().createUserWithEmailAndPassword(adminCreds.e, adminCreds.p); } catch (_) {}
        return;
      }
    }
  }

  /* fallback: read admin creds from Firestore */
  try {
    const snap = await window.__firebaseDb__.collection('admin').doc('admin123456').get();
    if (snap.exists) {
      const d = snap.data();
      adminCreds = { e: d.email, p: d.password };
      localStorage.setItem('_adminCreds', JSON.stringify(adminCreds));
      await firebase.auth().signInWithEmailAndPassword(adminCreds.e, adminCreds.p);
      return;
    }
  } catch (_) {}

  document.getElementById('detail-loading').textContent = 'Admin access error. Re-login from admin panel.';
}

let currentUserData = null;

async function initPage() {
  const db = window.__firebaseDb__;
  const userDoc = db.collection('users').doc(UID);

  try {
    const snap = await userDoc.get();
    if (!snap.exists) {
      document.getElementById('detail-loading').textContent = 'User not found';
      return;
    }
    const u = snap.data();
    currentUserData = u;
    renderUserInfo(u);

    let feeData = await loadFees(userDoc);
    feeData = await ensureFeeDocs(userDoc, u, feeData);
    renderFees(u, feeData);

    const attData = await loadAttendance(db);
    renderAttendance(attData);

    document.getElementById('detail-loading').style.display = 'none';
    document.getElementById('detail-content').style.display = 'block';

    /* Delete user */
    document.getElementById('delete-user-btn').addEventListener('click', async () => {
      const ok = await showConfirm({ title: 'Delete User', msg: 'Delete this user permanently? This cannot be undone.', danger: true });
      if (!ok) return;
      try {
        await userDoc.delete();
        window.location.href = 'admin.html';
      } catch (err) { alert('Error: ' + err.message); }
    });

    /* Toggle status */
    const toggleBtn = document.getElementById('toggle-status-btn');
    toggleBtn.addEventListener('click', async () => {
      const newStatus = currentUserData.membershipStatus === 'active' ? 'dropout' : 'active';
      const label = newStatus === 'dropout' ? 'Dropout' : 'Active';
      const ok = await showConfirm({ title: 'Change Status', msg: 'Set this user as "' + label + '"?', danger: newStatus === 'dropout' });
      if (!ok) return;
      try {
        await userDoc.update({ membershipStatus: newStatus });
        currentUserData.membershipStatus = newStatus;
        renderUserInfo(currentUserData);
        toast('Status changed to ' + newStatus);
      } catch (err) { alert('Error: ' + err.message); }
    });

  } catch (err) {
    document.getElementById('detail-loading').textContent = 'Error loading data';
    console.error(err);
  }
}

function renderUserInfo(u) {
  document.getElementById('detail-photo').src = u.photoURL || 'assets/images/avatar.svg';
  document.getElementById('detail-name').textContent = u.fullName || 'User Details';
  document.getElementById('u-roll').textContent = u.rollNumber || '-';
  document.getElementById('u-status').textContent = u.membershipStatus || '-';
  const statusEl = document.getElementById('u-status');
  if (u.membershipStatus === 'active') { statusEl.style.color = '#22c55e'; }
  else if (u.membershipStatus === 'dropout') { statusEl.style.color = '#f59e0b'; }
  else { statusEl.style.color = '#ef4444'; }
  document.getElementById('u-plan').textContent = u.plan || '-';
  document.getElementById('u-att-count').textContent = u.attendanceCount || 0;
  document.getElementById('u-name').textContent = u.fullName || '-';
  document.getElementById('u-email').textContent = u.email || '-';
  document.getElementById('u-cnic').textContent = u.cnic || '-';
  document.getElementById('u-gender').textContent = u.gender || '-';
  document.getElementById('u-goal').textContent = u.goal || '-';
  document.getElementById('u-address').textContent = u.address || '-';
  document.getElementById('u-joined').textContent = u.registrationDate ? new Date(u.registrationDate).toLocaleDateString() : '-';
  document.getElementById('u-expiry').textContent = u.membershipExpiry ? new Date(u.membershipExpiry).toLocaleDateString() : '-';

  const toggleBtn = document.getElementById('toggle-status-btn');
  if (toggleBtn) {
    if (u.membershipStatus === 'active') {
      toggleBtn.textContent = 'Mark as Dropout';
      toggleBtn.style.background = 'rgba(245,158,11,0.10)';
      toggleBtn.style.color = '#f59e0b';
    } else {
      toggleBtn.textContent = 'Mark as Active';
      toggleBtn.style.background = 'rgba(34,197,94,0.10)';
      toggleBtn.style.color = '#22c55e';
    }
  }
}

async function loadFees(userDoc) {
  const feeSnap = await userDoc.collection('fees').get();
  const records = {};
  feeSnap.forEach(d => {
    const f = d.data();
    records[f.monthKey] = { ...f, id: d.id };
  });
  return records;
}

async function ensureFeeDocs(userDoc, u, existing) {
  const startDate = new Date(u.registrationDate || u.createdAt || Date.now());
  const now = new Date();
  const iter = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const missing = [];
  while (iter <= now) {
    const mk = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}`;
    if (!existing[mk]) missing.push(mk);
    iter.setMonth(iter.getMonth() + 1);
  }
  if (missing.length === 0) return existing;
  const batch = missing.map(mk => {
    const [y, m] = mk.split('-');
    return userDoc.collection('fees').doc(mk).set({
      month: parseInt(m), year: parseInt(y), monthKey: mk,
      paid: false, createdAt: new Date().toISOString()
    });
  });
  await Promise.all(batch);
  return await loadFees(userDoc);
}

function renderFees(u, feeRecords) {
  const startDate = new Date(u.registrationDate || u.createdAt || Date.now());
  const now = new Date();
  const months = [];
  const iter = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (iter <= now) {
    const mk = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}`;
    months.push(mk);
    iter.setMonth(iter.getMonth() + 1);
  }

  const container = document.getElementById('fee-list');
  if (months.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary)">No fee records</div>';
    return;
  }

  container.innerHTML = months.map(mk => {
    const rec = feeRecords[mk];
    const paid = rec && rec.paid;
    const [y, m] = mk.split('-');
    const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    return `<div class="fee-row">
      <span class="fee-month">${monthName}</span>
      <div class="fee-actions">
        ${paid
          ? `<span class="badge paid">Paid</span><span class="fee-txid">${rec.transactionId || '-'}</span>`
          : `<span class="badge unpaid">Unpaid</span><button class="btn-pay fee-btn" data-month="${mk}">Mark Paid</button>`
        }
      </div>
    </div>`;
  }).join('');

  /* Attach fee button handlers */
  container.querySelectorAll('.fee-btn[data-month]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mk = btn.dataset.month;
      await markMonthFeePaid(window.__firebaseDb__.collection('users').doc(UID), mk, u);
    });
  });
}

async function markMonthFeePaid(userDoc, monthKey, u) {
  try {
    const [y, m] = monthKey.split('-');
    const txId = 'FEE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    await userDoc.collection('fees').doc(monthKey).set({
      month: parseInt(m), year: parseInt(y), monthKey,
      paid: true, paidAt: new Date().toISOString(), paidBy: 'admin',
      transactionId: txId, createdAt: new Date().toISOString()
    });
    await userDoc.update({
      lastPaymentDate: new Date().toISOString(),
      membershipStatus: 'active'
    });
    toast('Fee marked paid for ' + monthKey);
    const feeData = await loadFees(userDoc);
    renderFees(u, feeData);
  } catch (err) { alert('Error: ' + err.message); }
}

async function loadAttendance(db) {
  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
  const cutoff = twentyDaysAgo.toISOString().split('T')[0];
  const attSnap = await db.collection('attendance')
    .where('uid', '==', UID)
    .get();
  const records = [];
  attSnap.forEach(d => {
    const r = d.data();
    if (r.date && r.date >= cutoff) records.push({ id: d.id, ...r });
  });
  records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return records;
}

function renderAttendance(records) {
  const container = document.getElementById('attendance-list');
  if (records.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-tertiary)">No attendance records</div>';
    return;
  }

  let html = '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;font-size:0.70rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm) var(--radius-sm) 0 0"><span>Date</span><span>Time</span><span>Status</span></div>';

  records.forEach(r => {
    const d = r.date ? new Date(r.date + 'T00:00:00').toLocaleDateString() : '-';
    const t = r.time || '-';
    const status = r.status === 'present'
      ? '<span class="badge paid">Present</span>'
      : '<span class="badge inactive">' + (r.status || '-') + '</span>';
    html += `<div class="fee-row"><span>${d}</span><span>${t}</span><span>${status}</span></div>`;
  });

  container.innerHTML = html;
}

function toast(msg) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22c55e;color:#000;padding:12px 28px;border-radius:100px;font-weight:600;font-size:0.85rem;z-index:9999;font-family:sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.3)';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function showConfirm({ title, msg, danger }) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirm-modal');
    const iconEl = document.getElementById('modal-icon');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-msg');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    if (!modal || !confirmBtn || !cancelBtn) { resolve(false); return; }

    iconEl.innerHTML = danger
      ? '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
      : '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    iconEl.style.background = danger ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
    titleEl.textContent = title;
    msgEl.textContent = msg;
    confirmBtn.textContent = danger ? 'Delete' : 'Confirm';
    confirmBtn.style.background = danger ? '#ef4444' : '#f59e0b';
    confirmBtn.style.color = '#fff';
    modal.style.display = 'flex';

    const cleanup = () => { modal.style.display = 'none'; };
    confirmBtn.onclick = () => { cleanup(); resolve(true); };
    cancelBtn.onclick = () => { cleanup(); resolve(false); };
    modal.onclick = (e) => { if (e.target === modal) { cleanup(); resolve(false); } };
  });
}

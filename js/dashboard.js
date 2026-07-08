import { auth, db } from './firebase.js';
import { getUser, logout } from './auth.js';
import { toast, fmtDate } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const t = document.querySelector('.menu-toggle');
  const l = document.querySelector('.nav-links');
  t?.addEventListener('click', () => { t.classList.toggle('active'); l?.classList.toggle('active'); });
  l?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { t?.classList.remove('active'); l?.classList.remove('active'); }));
});

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  if (!user.emailVerified) { toast("Please verify your email (check spam section)", 'fail'); logout(); window.location.href = 'login.html'; return; }

  const { doc, setDoc, getDoc, collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) { window.location.href = 'register.html'; return; }
    const d = snap.data();

    const byId = (id) => document.getElementById(id);

    const name = d.fullName || 'Member';
    if (byId('d-name')) byId('d-name').textContent = name;
    if (byId('d-name2')) byId('d-name2').textContent = name;
    if (byId('d-photo')) byId('d-photo').src = d.photoURL || 'assets/images/avatar.svg';
    if (byId('d-photo-mobile')) byId('d-photo-mobile').src = d.photoURL || 'assets/images/avatar.svg';
    if (byId('d-roll')) byId('d-roll').textContent = d.rollNumber || '';
    if (byId('d-roll2')) byId('d-roll2').textContent = d.rollNumber || '';
    if (byId('d-plan')) byId('d-plan').textContent = d.plan || 'No Plan';
    if (byId('d-status')) {
      const st = d.membershipStatus;
      if (st === 'active') { byId('d-status').textContent = 'Active'; byId('d-status').style.color = '#22c55e'; }
      else if (st === 'dropout') { byId('d-status').textContent = 'Dropout'; byId('d-status').style.color = '#f59e0b'; }
      else { byId('d-status').textContent = 'Inactive'; byId('d-status').style.color = '#E50914'; }
    }
    if (byId('d-since')) byId('d-since').textContent = d.registrationDate ? fmtDate(d.registrationDate) : '';
    if (byId('d-att')) byId('d-att').textContent = d.attendanceCount || 0;
    if (byId('d-att-count')) byId('d-att-count').textContent = (d.attendanceCount || 0) + ' total';
    if (byId('d-plan-s')) byId('d-plan-s').textContent = d.plan || 'No Plan';
    if (byId('d-bmi')) byId('d-bmi').textContent = 'N/A';
    if (byId('d-status-s')) {
      const st = d.membershipStatus;
      if (st === 'active') { byId('d-status-s').textContent = 'Active'; byId('d-status-s').style.color = '#22c55e'; }
      else if (st === 'dropout') { byId('d-status-s').textContent = 'Dropout'; byId('d-status-s').style.color = '#f59e0b'; }
      else { byId('d-status-s').textContent = 'Inactive'; byId('d-status-s').style.color = '#E50914'; }
    }

    const list = byId('d-att-list');
    if (list) {
      const q = query(collection(db, 'attendance'), where('uid', '==', user.uid));
      const snap2 = await getDocs(q);
      const attDocs = [];
      snap2.forEach(d => attDocs.push(d.data()));
      attDocs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const recent5 = attDocs.slice(0, 5);
      if (recent5.length === 0) list.innerHTML = '<div class="dash-empty">No attendance records yet</div>';
      else {
        list.innerHTML = '';
        recent5.forEach(a => {
          const row = document.createElement('div');
          row.className = 'dash-timeline-item';
          const dot = document.createElement('div');
          dot.className = 'dash-timeline-dot';
          const dateEl = document.createElement('span');
          dateEl.className = 'dash-timeline-date';
          dateEl.textContent = fmtDate(a.date);
          const timeEl = document.createElement('span');
          timeEl.className = 'dash-timeline-time';
          timeEl.textContent = a.time || 'Present';
          row.appendChild(dot);
          row.appendChild(dateEl);
          row.appendChild(timeEl);
          list.appendChild(row);
        });
      }
    }

    if (byId('d-emerg')) byId('d-emerg').textContent = d.emergencyContact || 'N/A';
    if (byId('d-email-show')) byId('d-email-show').textContent = d.email || '';

    /* ===== Fee History ===== */
    const feeList = byId('d-fee-list');
    const feeStatus = byId('d-fee-status');
    if (feeList) {
      feeList.innerHTML = '<div class="dash-empty"><div class="ud-loader" style="width:24px;height:24px;margin:0 auto 8px"></div>Loading...</div>';
      try {
        const feeRef = collection(db, 'users', user.uid, 'fees');
        const feeSnap = await getDocs(feeRef);
        const feeRecords = {};
        feeSnap.forEach(doc => { const f = doc.data(); feeRecords[f.monthKey] = f; });

        const startDate = new Date(d.registrationDate || d.createdAt || Date.now());
        const now = new Date();
        const months = [];
        const missing = [];
        const iter = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (iter <= now) {
          const mk = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}`;
          months.push(mk);
          if (!feeRecords[mk]) missing.push(mk);
          iter.setMonth(iter.getMonth() + 1);
        }

        if (missing.length) {
          await Promise.all(missing.map(mk => {
            const [y, m] = mk.split('-');
            return setDoc(doc(db, 'users', user.uid, 'fees', mk), {
              month: parseInt(m), year: parseInt(y), monthKey: mk,
              paid: false, createdAt: new Date().toISOString()
            });
          }));
          missing.forEach(mk => { feeRecords[mk] = { monthKey: mk, paid: false }; });
        }

        const currentMk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const renderFeeRows = (monthKeys, records, currMk, statusEl) => {
          if (statusEl) statusEl.textContent = records[currMk]?.paid ? 'Current' : 'Due';
          return monthKeys.map(mk => {
            const rec = records[mk];
            const paid = rec && rec.paid;
            const [y, m] = mk.split('-');
            const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
            return `<div class="dash-timeline-item">
              <div class="dash-timeline-dot" style="background:${paid ? '#22c55e' : 'rgba(239,68,68,0.3)'}"></div>
              <span class="dash-timeline-date">${label}</span>
              <span class="dash-timeline-time" style="color:${paid ? '#22c55e' : '#ef4444'}">${paid ? 'Paid' : 'Unpaid'}</span>
            </div>`;
          }).reverse().join('') || '<div class="dash-empty">No records</div>';
        };
        feeList.innerHTML = renderFeeRows(months, feeRecords, currentMk, feeStatus);

        const unpaidMks = months.filter(mk => !(feeRecords[mk] && feeRecords[mk].paid));
        const alertEl = document.getElementById('fee-alert');
        const alertMsg = document.getElementById('fee-alert-msg');
        if (alertEl && unpaidMks.length > 0) {
          const [y, m] = unpaidMks[0].split('-');
          const monthLabel = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
          alertMsg.textContent = 'Your ' + monthLabel + ' fee is unpaid. Please pay to keep your membership active.';
          alertEl.style.display = 'flex';
          document.getElementById('fee-alert-close').onclick = () => { alertEl.style.display = 'none'; };
        }
      } catch (e) { feeList.innerHTML = '<div class="dash-empty">Could not load fee history</div>'; }
    }

  } catch (err) { toast('Error loading dashboard', 'fail'); }

  document.querySelectorAll('.dash-signout').forEach(btn => btn.addEventListener('click', async (e) => { e.preventDefault(); await logout(); window.location.href = 'login.html'; }));
  document.getElementById('logout-top')?.addEventListener('click', async (e) => { e.preventDefault(); await logout(); window.location.href = 'login.html'; });
});

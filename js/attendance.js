import { auth, db } from './firebase.js';
import { getUser } from './auth.js';
import { toast, fmtDate } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const rollParam = params.get('roll');
  const uidParam = params.get('uid');

  const user = await getUser();
  const { doc, getDoc, collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

  let targetUid = null;
  let targetData = null;

  if (rollParam) {
    const snap = await getDocs(query(collection(db, 'users'), where('rollNumber', '==', rollParam)));
    if (!snap.empty) { targetData = snap.docs[0].data(); targetUid = snap.docs[0].id; }
  } else if (uidParam) {
    const snap = await getDoc(doc(db, 'users', uidParam));
    if (snap.exists()) { targetData = snap.data(); targetUid = uidParam; }
  } else if (user) {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) { targetData = snap.data(); targetUid = user.uid; }
  }

  const statusEl = document.getElementById('attend-status');

  if (!targetData || !targetUid) {
    if (statusEl) statusEl.innerHTML = '<div class="attend-badge fail">Member not found. Scan a valid QR code.</div>';
    return;
  }

  const $ = (id) => document.getElementById(id);
  if ($('a-photo')) $('a-photo').src = targetData.photoURL || 'assets/images/avatar.svg';
  if ($('a-name')) $('a-name').textContent = targetData.fullName || 'Member';
  if ($('a-roll')) $('a-roll').textContent = targetData.rollNumber || '';
  if ($('a-plan')) $('a-plan').textContent = 'Plan: ' + (targetData.plan || 'N/A');
  if ($('a-date')) $('a-date').textContent = 'Date: ' + fmtDate(new Date());

  const attQ = query(collection(db, 'attendance'), where('uid', '==', targetUid));
  const attSnap = await getDocs(attQ);
  const presentSet = new Set();
  attSnap.forEach(d => { if (d.data().status === 'present') presentSet.add(d.data().date); });

  const histEl = $('a-history');
  const listEl = $('a-history-list');
  if (histEl) histEl.style.display = 'block';

  if (presentSet.size === 0) {
    if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-tertiary);font-size:0.85rem">No attendance records found</div>';
  } else {
    const rawJoin = targetData.registrationDate || targetData.createdAt;
    const join = rawJoin ? new Date(rawJoin) : new Date();
    const joinYear = join.getFullYear();
    const joinMonth = join.getMonth();
    const joinDay = join.getDate();
    const now = new Date();
    const monthHtmls = [];

    const iter = new Date(joinYear, joinMonth, 1);
    while (iter <= now) {
      const year = iter.getFullYear();
      const month = iter.getMonth();
      const isJoinMonth = year === joinYear && month === joinMonth;
      const startDay = isJoinMonth ? joinDay : 1;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthName = iter.toLocaleString('default', { month: 'long', year: 'numeric' });

      let hasAny = false;
      let grid = '';
      for (let d = startDay; d <= daysInMonth; d++) {
        const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const present = presentSet.has(dateStr);
        if (present) hasAny = true;
        const isSun = new Date(year, month, d).getDay() === 0;
        grid += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:44px;padding:6px 0">' +
          '<span style="font-size:0.60rem;color:var(--text-tertiary)">' + d + '</span>' +
          '<div style="position:relative;width:16px;height:16px;border-radius:50%;background:' + (present ? '#22c55e' : isSun ? '#6366f133' : '#ef444433') + ';border:2px solid ' + (present ? '#22c55e' : isSun ? '#6366f188' : '#ef444488') + '">' +
          (isSun ? '<svg viewBox="0 0 16 16" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px"><line x1="2" y1="2" x2="14" y2="14" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/><line x1="14" y1="2" x2="2" y2="14" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/></svg>' : '') +
          '</div>' +
          '</div>';
      }

      if (hasAny) {
        monthHtmls.push(
          '<div style="margin-bottom:24px">' +
          '<h4 style="font-family:var(--font-display);font-weight:700;font-size:0.85rem;margin-bottom:12px;color:var(--text-secondary)">' + monthName + '</h4>' +
          '<div style="display:flex;flex-wrap:wrap;gap:4px">' + grid + '</div>' +
          '</div>'
        );
      }

      iter.setMonth(iter.getMonth() + 1);
    }

    if (listEl) listEl.innerHTML = monthHtmls.join('');
  }
});

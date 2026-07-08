import { auth, db } from './firebase.js';
import { getUser } from './auth.js';
import { toast, fmtDate } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getUser();
  if (!user) { window.location.href = 'login.html'; return; }

  const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) { window.location.href = 'register.html'; return; }
  const d = snap.data();

  const $ = (id) => document.getElementById(id);

  if ($('c-name')) $('c-name').textContent = d.fullName || 'Member';
  if ($('c-roll')) $('c-roll').textContent = d.rollNumber || '';
  if ($('c-plan')) $('c-plan').textContent = d.plan || '';
  if ($('c-photo')) $('c-photo').src = d.photoURL || 'assets/images/avatar.svg';
  if ($('c-join')) $('c-join').textContent = d.registrationDate ? fmtDate(d.registrationDate) : '';
  if ($('c-exp')) $('c-exp').textContent = d.membershipExpiry ? fmtDate(d.membershipExpiry) : '';
  if ($('c-emerg')) $('c-emerg').textContent = 'N/A';
  if ($('c-gym')) $('c-gym').textContent = '+92 300 1234567';

  /* QR Code */
  const qr = $('c-qr');
  const qrData = `https://explosivefitness.com/attendance.html?roll=${d.rollNumber}`;

  if (typeof QRCode !== 'undefined') {
    qr.innerHTML = '';
    new QRCode(qr, { text: qrData, width: 96, height: 96, colorDark: '#E50914', colorLight: '#111111', correctLevel: QRCode.CorrectLevel.H });
  } else {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(qrData)}&color=E50914&bgcolor=111111`;
    img.alt = 'QR';
    qr.appendChild(img);
  }

  /* Download PNG */
  $('dl-png')?.addEventListener('click', () => {
    const card = $('member-card');
    const loadHtml2canvas = (cb) => {
      if (window.html2canvas) { cb(window.html2canvas); return; }
      const s = document.createElement('script');
      s.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
      s.onload = () => cb(window.html2canvas);
      document.body.appendChild(s);
    };
    loadHtml2canvas((html2canvas) => {
      html2canvas(card, { scale: 2, backgroundColor: '#050505', useCORS: true }).then(canvas => {
        const a = document.createElement('a');
        a.download = 'membership-card.png';
        a.href = canvas.toDataURL();
        a.click();
      });
    });
  });

  /* Download PDF */
  $('dl-pdf')?.addEventListener('click', () => {
    const card = $('member-card');
    const loadHtml2canvas = (cb) => {
      if (window.html2canvas) { cb(window.html2canvas); return; }
      const s = document.createElement('script');
      s.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
      s.onload = () => cb(window.html2canvas);
      document.body.appendChild(s);
    };
    loadHtml2canvas((html2canvas) => {
      html2canvas(card, { scale: 2, backgroundColor: '#050505', useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const loadJSPDF = () => {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pw = pdf.internal.pageSize.getWidth();
          const ph = (canvas.height * pw) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pw, ph);
          pdf.save('membership-card.pdf');
        };
        if (window.jspdf) loadJSPDF();
        else {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.onload = loadJSPDF;
          document.body.appendChild(s);
        }
      });
    });
  });

  /* Print */
  $('print-btn')?.addEventListener('click', () => window.print());
});

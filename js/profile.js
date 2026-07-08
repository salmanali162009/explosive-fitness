import { auth, db } from './firebase.js';
import { getUser } from './auth.js';
import { uploadImage } from './cloudinary.js';
import { toast, loading } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getUser();
  if (!user) { window.location.href = 'login.html'; return; }

  const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) { window.location.href = 'register.html'; return; }

  const d = snap.data();
  const $ = (id) => document.getElementById(id);

  if ($('p-photo')) $('p-photo').src = d.photoURL || 'assets/images/avatar.svg';
  if ($('p-name-h')) $('p-name-h').textContent = d.fullName || '';
  if ($('p-name')) $('p-name').value = d.fullName || '';
  if ($('p-roll')) $('p-roll').textContent = d.rollNumber || '';
  if ($('p-email')) $('p-email').textContent = d.email || '';
  if ($('p-phone')) $('p-phone').value = d.phone || '';
  if ($('p-addr')) $('p-addr').value = d.address || '';
  if ($('p-emerg')) $('p-emerg').value = d.emergencyContact || '';
  if ($('p-plan')) $('p-plan').value = d.plan || '';
  if ($('p-goal')) $('p-goal').value = d.goal || '';

  $('p-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loading(true);
    try {
      let photoURL = d.photoURL;
      const file = $('p-img')?.files[0];
      if (file) photoURL = await uploadImage(file);

      await updateDoc(doc(db, 'users', user.uid), {
        fullName: $('p-name').value.trim() || d.fullName,
        phone: $('p-phone').value.trim(),
        address: $('p-addr').value.trim(),
        emergencyContact: $('p-emerg').value.trim(),
        plan: $('p-plan').value,
        goal: $('p-goal').value,
        photoURL
      });

      if ($('p-name-h')) $('p-name-h').textContent = $('p-name').value.trim();
      if (file && $('p-photo')) $('p-photo').src = photoURL;
      toast('Profile updated', 'ok');
    } catch (err) { toast(err.message, 'fail'); } finally { loading(false); }
  });

  /* Upload preview */
  const pFile = document.getElementById('p-img');
  const pZone = document.getElementById('p-upload-zone');
  const pPreview = document.getElementById('p-preview-img');
  pFile?.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => { pPreview.src = e.target.result; pZone.classList.add('has-image'); };
      reader.readAsDataURL(this.files[0]);
    } else { pZone.classList.remove('has-image'); }
  });
  pZone?.addEventListener('dragover', (e) => { e.preventDefault(); pZone.classList.add('drag-over'); });
  pZone?.addEventListener('dragleave', () => { pZone.classList.remove('drag-over'); });
  pZone?.addEventListener('drop', (e) => { e.preventDefault(); pZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) { pFile.files = e.dataTransfer.files; pFile.dispatchEvent(new Event('change')); } });
});

import { auth, db } from './firebase.js';
import { registerUser } from './auth.js';
import { uploadImage } from './cloudinary.js';
import { toast, validateEmail, validateCNIC, validatePassword, nextRoll, loading } from './utils.js';

document.getElementById('reg-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('reg-name').value.trim();
  const cnic = document.getElementById('reg-cnic').value.trim().replace(/-/g, '');
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const gender = document.getElementById('reg-gender').value;
  const goal = document.getElementById('reg-goal').value;
  const plan = document.getElementById('reg-plan').value;
  const address = document.getElementById('reg-address').value.trim();

  if (!name) { toast('Full name required', 'fail'); return; }
  if (!validateCNIC(cnic)) { toast('Invalid CNIC', 'fail'); return; }
  if (!validateEmail(email)) { toast('Invalid email address', 'fail'); return; }
  if (!validatePassword(pass)) { toast('Password: min 6 characters', 'fail'); return; }
  if (!gender) { toast('Select gender', 'fail'); return; }
  if (!goal) { toast('Select fitness goal', 'fail'); return; }
  if (!plan) { toast('Select membership plan', 'fail'); return; }

  loading(true);
  try {
    const user = await registerUser(email, pass);

    let photoURL = null;
    const file = document.getElementById('reg-img')?.files[0];
    if (file) photoURL = await uploadImage(file);

    const { doc, setDoc, getDocs, collection, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

    const snap = await getDocs(query(collection(db, 'users'), orderBy('rollNumber', 'desc'), limit(1)));
    const roll = nextRoll(snap.empty ? null : snap.docs[0].data().rollNumber);

    const exp = new Date();
    const planMap = { 'Starter Monthly': 1, 'Starter Quarterly': 3, 'Starter Yearly': 12, 'Premium Monthly': 1, 'Premium Quarterly': 3, 'Premium Yearly': 12, 'VIP': 12 };
    exp.setMonth(exp.getMonth() + (planMap[plan] || 1));

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid, fullName: name, cnic, email, gender, address, goal, plan, photoURL,
      registrationDate: new Date().toISOString(), membershipStatus: 'active',
      attendanceCount: 0, rollNumber: roll, membershipExpiry: exp.toISOString(),
      createdAt: new Date().toISOString()
    });

    sessionStorage.setItem('v-email', email);
    window.location.href = 'verify.html';
  } catch (err) {
    const map = { 'auth/email-already-in-use': 'Email already registered', 'auth/weak-password': 'Password too weak', 'auth/invalid-email': 'Invalid email' };
    toast(map[err.code] || err.message, 'fail');
  } finally { loading(false); }
});

document.getElementById('reg-pass-t')?.addEventListener('click', function() {
  const inp = document.getElementById('reg-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

/* Upload preview */
const regFile = document.getElementById('reg-img');
const regZone = document.getElementById('reg-upload-zone');
const regPreview = document.getElementById('reg-preview-img');
regFile?.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => { regPreview.src = e.target.result; regZone.classList.add('has-image'); };
    reader.readAsDataURL(this.files[0]);
  } else { regZone.classList.remove('has-image'); }
});
regZone?.addEventListener('dragover', (e) => { e.preventDefault(); regZone.classList.add('drag-over'); });
regZone?.addEventListener('dragleave', () => { regZone.classList.remove('drag-over'); });
regZone?.addEventListener('drop', (e) => { e.preventDefault(); regZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) { regFile.files = e.dataTransfer.files; regFile.dispatchEvent(new Event('change')); } });

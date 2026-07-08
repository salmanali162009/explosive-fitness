import { auth, db } from './firebase.js';
import { loginUser, resetPassword } from './auth.js';
import { toast, loading } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const emailInp = document.getElementById('login-email');
  const passInp = document.getElementById('login-pass');

  const saved = localStorage.getItem('_rem');
  if (saved && emailInp) {
    try { const d = JSON.parse(saved); emailInp.value = d.e || ''; passInp.value = d.p || ''; if (document.getElementById('remember')) document.getElementById('remember').checked = true; } catch(e) {}
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInp.value.trim();
    const pass = passInp.value;
    const rem = document.getElementById('remember')?.checked;

    if (!email) { toast('Enter your email', 'fail'); return; }
    if (!pass) { toast('Enter your password', 'fail'); return; }

    loading(true);
    try {
      const cred = await loginUser(email, pass);
      if (!cred.user.emailVerified) {
        sessionStorage.setItem('v-email', email);
        window.location.href = 'verify.html'; return;
      }
      if (rem) localStorage.setItem('_rem', JSON.stringify({ e: email, p: pass }));
      else localStorage.removeItem('_rem');
      localStorage.removeItem('_v');
      toast('Welcome back', 'ok');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } catch (err) {
      const map = { 'auth/user-not-found': 'No account found', 'auth/wrong-password': 'Incorrect password', 'auth/invalid-email': 'Invalid email', 'auth/user-disabled': 'Account disabled', 'auth/too-many-requests': 'Too many attempts. Try again later.' };
      toast(map[err.code] || 'Login failed', 'fail');
    } finally { loading(false); }
  });

  document.getElementById('forgot-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailInp?.value.trim();
    if (!email) { toast('Enter your email first', 'msg'); return; }
    loading(true);
    try { await resetPassword(email); toast('Reset email sent', 'ok'); } catch (err) { toast(err.code === 'auth/user-not-found' ? 'No account found' : 'Failed to send reset email', 'fail'); } finally { loading(false); }
  });


  const t = document.getElementById('login-pass-t');
  t?.addEventListener('click', () => { passInp.type = passInp.type === 'password' ? 'text' : 'password'; t.textContent = passInp.type === 'password' ? '\u{1F441}' : '\u{1F441}\u200D\u{1F5E8}'; });
});

import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { toast, loading } from './utils.js';

const emailEl = document.getElementById('v-email');
const resendBtn = document.getElementById('v-resend');
const checkBtn = document.getElementById('v-check');
const statusEl = document.getElementById('v-status');

async function checkVerification() {
  loading(true);
  try {
    const u = auth.currentUser;
    if (u) {
      await u.reload();
      if (u.emailVerified) {
        showStatus('Email verified! Redirecting to login...', 'ok');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return true;
      } else {
        showStatus('Email not verified yet. Check your inbox (and spam folder).', 'fail');
      }
    } else {
      showStatus('Session expired. Please go to login and try again.', 'fail');
    }
  } catch (err) {
    showStatus(err.message || 'Error checking verification', 'fail');
  } finally {
    loading(false);
  }
  return false;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (emailEl) emailEl.textContent = user.email;
    await user.reload();
    if (user.emailVerified) {
      showStatus('Email verified! Redirecting to login...', 'ok');
      setTimeout(() => window.location.href = 'login.html', 1200);
      return;
    }
  } else {
    const saved = sessionStorage.getItem('v-email');
    if (saved && emailEl) emailEl.textContent = saved;
    if (emailEl && !emailEl.textContent) emailEl.textContent = 'your email';
  }
});

resendBtn?.addEventListener('click', async () => {
  loading(true);
  try {
    const u = auth.currentUser;
    if (u) {
      const { sendEmailVerification } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
      await sendEmailVerification(u);
      showStatus('Verification email sent!', 'ok');
    } else {
      const email = emailEl.textContent;
      if (email && email !== 'your email') {
        const { sendSignInLinkToEmail } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await sendSignInLinkToEmail(auth, email, { url: window.location.origin + '/login.html', handleCodeInApp: true });
        showStatus('Verification link sent!', 'ok');
      } else {
        showStatus('No user found. Please log in and try again.', 'fail');
      }
    }
  } catch (err) {
    showStatus(err.message || 'Failed to send verification email', 'fail');
  } finally {
    loading(false);
  }
});

checkBtn?.addEventListener('click', checkVerification);

function showStatus(msg, type) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.display = 'block';
  statusEl.style.color = type === 'ok' ? 'var(--success)' : 'var(--danger)';
  statusEl.style.fontSize = '0.85rem';
  statusEl.style.padding = '10px 14px';
  statusEl.style.borderRadius = '8px';
  statusEl.style.background = type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
}

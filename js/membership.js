import { auth, db } from './firebase.js';
import { getUser } from './auth.js';
import { toast, loading } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getUser();

  document.querySelectorAll('.buy-plan').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!user) { toast('Login first', 'msg'); window.location.href = 'login.html'; return; }
      if (!user.emailVerified) { toast('Verify your email first', 'fail'); return; }

      const plan = btn.dataset.plan;
      const price = btn.dataset.price;

      loading(true);
      try {
        const { doc, getDoc, updateDoc, addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) { toast('Register first', 'fail'); window.location.href = 'register.html'; return; }

        const exp = new Date();
        const map = { 'Starter Monthly': 1, 'Starter Quarterly': 3, 'Starter Yearly': 12, 'Premium Monthly': 1, 'Premium Quarterly': 3, 'Premium Yearly': 12, 'VIP': 12 };
        exp.setMonth(exp.getMonth() + (map[plan] || 1));

        await updateDoc(doc(db, 'users', user.uid), { plan, membershipStatus: 'active', membershipExpiry: exp.toISOString(), updatedAt: new Date().toISOString() });

        await addDoc(collection(db, 'payments'), { uid: user.uid, plan, amount: parseFloat(price), status: 'completed', date: new Date().toISOString(), createdAt: new Date().toISOString() });

        toast('Plan purchased successfully', 'ok');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
      } catch (err) { toast(err.message, 'fail'); } finally { loading(false); }
    });
  });
});

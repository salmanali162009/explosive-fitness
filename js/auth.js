import { auth } from './firebase.js';
import { toast } from './utils.js';

export async function registerUser(email, password) {
  const { createUserWithEmailAndPassword, sendEmailVerification } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function loginUser(email, password) {
  const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function googleSignIn() {
  const { signInWithPopup, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  return await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function logout() {
  const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  await signOut(auth);
  localStorage.removeItem('_rem');
}

export async function resetPassword(email) {
  const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  return await sendPasswordResetEmail(auth, email);
}

export function getUser() {
  const u = auth.currentUser;
  if (u) return Promise.resolve(u);
  return new Promise((resolve, reject) => {
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(({ onAuthStateChanged }) => {
      const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(user); }, reject);
    });
  });
}

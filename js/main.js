import { toast } from './utils.js';
import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* Navbar auth state: swap Login ↔ Dashboard */
onAuthStateChanged(auth, (user) => {
  const loginLink = document.querySelector('.nav-links .nav-btn-link');
  if (!loginLink) return;
  if (user) {
    loginLink.href = 'dashboard.html';
    loginLink.textContent = 'Dashboard';
  } else {
    loginLink.href = 'login.html';
    loginLink.textContent = 'Login';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    window.addEventListener('load', () => setTimeout(() => loader.classList.add('hidden'), 400));
    setTimeout(() => loader.classList.add('hidden'), 3000);
  }

  /* Navbar */
  const nav = document.querySelector('.navbar');
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  toggle?.addEventListener('click', () => {
    toggle.classList.toggle('active');
    links?.classList.toggle('active');
  });

  links?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    toggle?.classList.remove('active');
    links?.classList.remove('active');
  }));

  /* Scroll reveal — handles .reveal, .reveal-left, .reveal-right, .reveal-scale */
  const revealClasses = ['reveal', 'reveal-left', 'reveal-right', 'reveal-scale'];
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  revealClasses.forEach(cls => {
    document.querySelectorAll('.' + cls).forEach(el => revealObserver.observe(el));
  });

  /* Counters */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target.dataset.done) return;
      entry.target.dataset.done = '1';
      const raw = entry.target.textContent.replace(/[^0-9.]/g, '');
      const target = parseFloat(raw);
      const suffix = entry.target.textContent.replace(/[0-9.]/g, '');
      const duration = 2000;
      const steps = 60;
      const inc = target / steps;
      let cur = 0;
      const t = setInterval(() => {
        cur += inc;
        if (cur >= target) {
          entry.target.textContent = suffix ? target + suffix : String(target);
          clearInterval(t);
        } else {
          entry.target.textContent = suffix ? Math.round(cur) + suffix : String(Math.round(cur));
        }
      }, duration / steps);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.count-up').forEach(el => counterObserver.observe(el));

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-q')?.addEventListener('click', () => {
      item.classList.toggle('active');
      document.querySelectorAll('.faq-item').forEach(other => {
        if (other !== item) other.classList.remove('active');
      });
    });
  });

  /* Gallery lightbox */
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbClose = document.getElementById('lightbox-close');

  document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
      if (lb && lbImg) { lbImg.src = img.src; lb.classList.add('active'); }
    });
  });
  lbClose?.addEventListener('click', () => lb?.classList.remove('active'));
  lb?.addEventListener('click', (e) => { if (e.target === lb) lb.classList.remove('active'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb?.classList.remove('active'); });

  /* Contact form */
  const cf = document.getElementById('contact-form');
  if (cf) {
    cf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { db } = await import('./firebase.js');
      const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      const name = document.getElementById('c-name').value.trim();
      const email = document.getElementById('c-email').value.trim();
      const msg = document.getElementById('c-msg').value.trim();
      if (!name || !email || !msg) { toast('Please fill all fields', 'fail'); return; }
      try {
        await addDoc(collection(db, 'contactMessages'), { name, email, message: msg, createdAt: new Date().toISOString() });
        toast('Message sent successfully', 'ok');
        cf.reset();
      } catch (err) { toast(err.message, 'fail'); }
    });
  }

  /* Newsletter */
  const nf = document.getElementById('newsletter-form');
  if (nf) {
    nf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { db } = await import('./firebase.js');
      const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      const email = nf.querySelector('input').value.trim();
      if (!email) { toast('Enter your email', 'fail'); return; }
      try {
        await addDoc(collection(db, 'newsletter'), { email, subscribedAt: new Date().toISOString() });
        toast('Subscribed successfully', 'ok');
        nf.reset();
      } catch (err) { toast(err.message, 'fail'); }
    });
  }
});

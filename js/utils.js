const TOAST_TYPES = { ok: 'ok', fail: 'fail', msg: 'msg' };

export function toast(message, type = 'msg') {
  let rack = document.getElementById('toast-rack');
  if (!rack) {
    rack = document.createElement('div');
    rack.id = 'toast-rack';
    rack.className = 'toast-rack';
    document.body.appendChild(rack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-mark">${type === 'ok' ? '\u2713' : type === 'fail' ? '\u2717' : '\u2139'}</span><span>${message}</span><button class="toast-dismiss">&times;</button>`;
  el.querySelector('.toast-dismiss').addEventListener('click', () => dismiss(el));
  rack.appendChild(el);
  setTimeout(() => dismiss(el), 4200);
}

function dismiss(el) {
  el.classList.add('removing');
  setTimeout(() => el.remove(), 300);
}

export function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
export function validatePhone(v) { return /^(\+92|0)?[0-9]{10,11}$/.test(v); }
export function validateCNIC(v) { const clean = v.replace(/-/g, ''); return /^[0-9]{13}$/.test(clean); }
export function validatePassword(v) { return v.length >= 6; }

export function calcAge(dob) {
  const b = new Date(dob), t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}

export function calcBMI(h, w) {
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#0096ff', tips: ['Increase caloric intake with nutrient-dense foods', 'Include protein in every meal', 'Focus on strength training', 'Consult a nutritionist for a plan'] };
  if (bmi < 25) return { label: 'Normal Weight', color: '#00c850', tips: ['Maintain a balanced diet', 'Exercise 4-5 times per week', 'Stay hydrated throughout the day', 'Prioritize quality sleep'] };
  if (bmi < 30) return { label: 'Overweight', color: '#ff8c00', tips: ['Create a moderate caloric deficit', 'Incorporate cardio 4-5 times/week', 'Reduce processed food intake', 'Increase daily water consumption'] };
  return { label: 'Obese', color: '#E50914', tips: ['Consult a healthcare professional', 'Follow a structured diet plan', 'Start with low-impact cardio', 'Seek guidance from a personal trainer'] };
}

export function loading(show = true) {
  let el = document.getElementById('global-loader');
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-loader';
      el.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(el);
    }
  } else {
    if (el) el.remove();
  }
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function nextRoll(last) {
  if (!last) return 'EXP0001';
  const n = parseInt(last.replace('EXP', '')) + 1;
  return 'EXP' + String(n).padStart(4, '0');
}

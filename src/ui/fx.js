// Petits effets : notifications et confettis.

export function toast(message, icon = '✨') {
  const layer = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast__icon">${icon}</span><span></span>`;
  el.lastElementChild.textContent = message;
  layer.appendChild(el);
  setTimeout(() => el.classList.add('is-leaving'), 3200);
  setTimeout(() => el.remove(), 3700);
}

const COLORS = ['#ffd23f', '#ff5d73', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff8a3d'];

export function burst(x, y, { count = 26, emoji = null } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.getElementById('fx');
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    el.className = 'confetti';
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 140;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist - 60}px`);
    el.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    if (emoji && i % 3 === 0) {
      el.textContent = emoji;
      el.classList.add('confetti--emoji');
    } else {
      el.style.background = COLORS[i % COLORS.length];
    }
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

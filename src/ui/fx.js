// Message bref affiché en bas de l'écran.
export function toast(message) {
  const layer = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  layer.replaceChildren(el);
  setTimeout(() => el.classList.add('is-leaving'), 5200);
  setTimeout(() => el.remove(), 5700);
}

// Déplacement au clavier : flèches ou ZQSD (WASD sur un clavier QWERTY : on lit la position physique des touches),
// A / E pour tourner, + / - pour zoomer.
const MOVE = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};
const ROTATE = { KeyQ: -1, KeyE: 1 };
const ZOOM = { Equal: -1, NumpadAdd: -1, Minus: 1, NumpadSubtract: 1, Digit6: 1 };

export function createKeys(onActivity) {
  const down = new Set();
  const typing = (target) => target instanceof Element && target.matches('input, select, textarea, [contenteditable]');
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
    if (e.code in MOVE || e.code in ROTATE || e.code in ZOOM) {
      down.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
      onActivity?.();
    }
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());

  // État lu à chaque image : x, y dans [-1, 1], rotation et zoom dans {-1, 0, 1}.
  return {
    read() {
      let x = 0;
      let y = 0;
      let rotate = 0;
      let zoom = 0;
      for (const code of down) {
        if (MOVE[code]) {
          x += MOVE[code][0];
          y += MOVE[code][1];
        }
        rotate += ROTATE[code] || 0;
        zoom += ZOOM[code] || 0;
      }
      return { x: Math.sign(x), y: Math.sign(y), rotate: Math.sign(rotate), zoom: Math.sign(zoom), active: down.size > 0 };
    },
  };
}

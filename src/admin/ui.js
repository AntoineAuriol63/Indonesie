// Petite boîte à outils du back office : création d'éléments, champs de formulaire liés aux données,
// listes ordonnables, boîtes de dialogue et messages.

const shown = (child) => child != null && child !== false && child !== 0;

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style') for (const [name, v] of Object.entries(value)) el.style.setProperty(name, v);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key in el && key !== 'list' && key !== 'form') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat(Infinity).filter(shown));
  return el;
}
// Remplace le contenu d'un élément (tableaux imbriqués et valeurs vides acceptés, comme pour h).
export function fill(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter(shown));
  return el;
}

export const icon = (name) => h('span', { class: `ico ico--${name}`, 'aria-hidden': 'true' });

export function toast(message, kind = 'ok') {
  const el = h('div', { class: `toast toast--${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
  document.getElementById('toasts').append(el);
  setTimeout(() => el.classList.add('is-leaving'), kind === 'error' ? 7000 : 3200);
  setTimeout(() => el.remove(), kind === 'error' ? 7400 : 3600);
}

// Boîte de dialogue. Renvoie la valeur du bouton choisi (null si on ferme).
export function dialog({ title, body, actions, wide = false }) {
  return new Promise((resolve) => {
    const box = h('dialog', { class: `dialog ${wide ? 'dialog--wide' : ''}` });
    const close = (value) => {
      box.close();
      box.remove();
      resolve(value);
    };
    box.append(
      h('h2', {}, title),
      h('div', { class: 'dialog__body' }, typeof body === 'function' ? body(close) : body),
      h(
        'div',
        { class: 'dialog__actions' },
        (actions || [{ label: 'Fermer', value: null }]).map((a) =>
          h('button', { type: 'button', class: `button ${a.kind ? `button--${a.kind}` : ''}`, onclick: () => close(typeof a.value === 'function' ? a.value() : a.value) }, a.label),
        ),
      ),
    );
    box.addEventListener('cancel', (event) => {
      event.preventDefault();
      close(null);
    });
    document.body.append(box);
    box.showModal();
  });
}
export const confirmDialog = (title, text, label, kind = 'danger') =>
  dialog({ title, body: h('p', {}, text), actions: [{ label: 'Annuler', value: false }, { label, value: true, kind }] });

// Les zones de texte grandissent avec leur contenu.
function autosize(area) {
  const fit = () => {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight + 2}px`;
  };
  area.addEventListener('input', fit);
  requestAnimationFrame(fit);
  new ResizeObserver(() => area.offsetWidth && fit()).observe(area);
}

let uid = 0;
function field(label, control, { hint, wide, half } = {}) {
  control.id ||= `f${++uid}`;
  return h(
    'div',
    { class: `field ${wide ? 'field--wide' : ''} ${half ? 'field--half' : ''}` },
    h('label', { for: control.id }, label),
    control,
    hint && h('p', { class: 'field__hint' }, hint),
  );
}

// Champs liés à un objet : chaque saisie met la donnée à jour et prévient l'éditeur (changed).
export function createForm(changed) {
  const set = (obj, key, value, optional) => {
    if (optional && (value === '' || value == null)) delete obj[key];
    else obj[key] = value;
    changed();
  };
  return {
    changed,
    text: (obj, key, label, o = {}) =>
      field(label, h('input', { type: 'text', value: obj[key] ?? '', placeholder: o.placeholder, maxLength: o.max, oninput: (e) => set(obj, key, e.target.value, o.optional) }), o),
    area(obj, key, label, o = {}) {
      const area = h('textarea', { rows: o.rows || 2, value: obj[key] ?? '', placeholder: o.placeholder, oninput: (e) => set(obj, key, e.target.value, o.optional) });
      autosize(area);
      return field(label, area, { wide: true, ...o });
    },
    // Plusieurs paragraphes dans une seule zone : une ligne vide les sépare.
    paragraphs(obj, key, label, o = {}) {
      const read = (text) => text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
      const area = h('textarea', { rows: 4, value: (obj[key] || []).join('\n\n'), oninput: (e) => set(obj, key, read(e.target.value)) });
      autosize(area);
      return field(label, area, { wide: true, hint: 'Une ligne vide sépare deux paragraphes.', ...o });
    },
    number: (obj, key, label, o = {}) =>
      field(
        label,
        h('input', {
          type: 'number',
          value: obj[key] ?? '',
          min: o.min,
          max: o.max,
          step: o.step || 1,
          inputMode: 'decimal',
          oninput: (e) => set(obj, key, e.target.value === '' ? null : +e.target.value, o.optional),
        }),
        o,
      ),
    select: (obj, key, label, options, o = {}) =>
      field(
        label,
        h(
          'select',
          { onchange: (e) => set(obj, key, o.numeric ? +e.target.value : e.target.value, o.optional) },
          options.map(([value, text]) => h('option', { value, selected: String(obj[key] ?? '') === String(value) }, text)),
        ),
        o,
      ),
    color: (obj, key, label, o = {}) => field(label, h('input', { type: 'color', value: obj[key] || '#1d2b53', oninput: (e) => set(obj, key, e.target.value) }), o),
    check(obj, key, label, o = {}) {
      const box = h('input', { type: 'checkbox', checked: !!obj[key], id: `f${++uid}`, onchange: (e) => set(obj, key, e.target.checked, true) });
      return h('div', { class: 'field field--wide field--check' }, h('label', { for: box.id }, box, h('span', {}, label)), o.hint && h('p', { class: 'field__hint' }, o.hint));
    },
    // Coordonnées en un seul champ, comme on les copie depuis Google Maps : « -8.5069, 115.2625 ».
    coords(obj, label, o = {}) {
      const latKey = o.lat || 'lat';
      const lonKey = o.lon || 'lon';
      const show = () => (Number.isFinite(obj[latKey]) && Number.isFinite(obj[lonKey]) ? `${obj[latKey]}, ${obj[lonKey]}` : '');
      const input = h('input', { type: 'text', value: show(), placeholder: '-8.5069, 115.2625', inputMode: 'text' });
      input.addEventListener('change', () => {
        const numbers = input.value.match(/-?\d+(?:\.\d+)?/g);
        if (!input.value.trim() && o.optional) {
          delete obj[latKey];
          delete obj[lonKey];
          input.setCustomValidity('');
        } else if (numbers?.length === 2 && Math.abs(+numbers[0]) <= 90 && Math.abs(+numbers[1]) <= 180) {
          obj[latKey] = +(+numbers[0]).toFixed(5);
          obj[lonKey] = +(+numbers[1]).toFixed(5);
          input.value = show();
          input.setCustomValidity('');
        } else {
          input.setCustomValidity('Deux nombres attendus : latitude, longitude.');
          input.reportValidity();
          return;
        }
        changed();
      });
      const wrapper = field(label, input, { hint: 'Latitude, longitude. Dans Google Maps : clic droit sur le lieu, puis clic sur les coordonnées pour les copier.', ...o });
      wrapper.refresh = () => (input.value = show());
      return wrapper;
    },
  };
}

// Liste ordonnable d'éléments repliables (activités, jours, photos…).
//   items : le tableau modifié en place ; title(item, i) : texte de l'en-tête ; meta(item, i) : éléments à droite du titre ;
//   body(item, i) : contenu déplié ; create() : nouvel élément ; onChange() : appelé après chaque ajout, retrait ou déplacement.
export function listEditor({ items, title, meta, body, create, addLabel, empty, onChange, numbered = true, removeLabel = 'cet élément' }) {
  const open = new WeakSet();
  const root = h('div', { class: 'list' });
  const rows = h('div', { class: 'list__rows' });
  const move = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    render();
    onChange();
    rows.children[j]?.querySelector('.item__toggle')?.focus();
  };
  function row(item, i) {
    const name = h('span', { class: 'item__title' });
    const side = h('span', { class: 'item__meta' });
    const head = () => {
      name.textContent = title(item, i) || 'Sans titre';
      side.replaceChildren(...(meta ? [meta(item, i)].flat().filter(Boolean) : []));
    };
    head();
    const content = h('div', { class: 'item__body' });
    const el = h('div', { class: 'item' });
    const toggle = h('button', { type: 'button', class: 'item__toggle', 'aria-expanded': 'false' }, numbered && h('span', { class: 'item__n' }, String(i + 1)), name, side);
    const show = (yes) => {
      el.classList.toggle('is-open', yes);
      toggle.setAttribute('aria-expanded', yes);
      if (yes && !content.childElementCount) content.append(...[body(item, i)].flat());
      if (yes) open.add(item);
      else open.delete(item);
    };
    toggle.addEventListener('click', () => show(!el.classList.contains('is-open')));
    el.append(
      h(
        'div',
        { class: 'item__head' },
        toggle,
        h(
          'span',
          { class: 'item__actions' },
          h('button', { type: 'button', class: 'mini', title: 'Monter', 'aria-label': 'Monter', disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
          h('button', { type: 'button', class: 'mini', title: 'Descendre', 'aria-label': 'Descendre', disabled: i === items.length - 1, onclick: () => move(i, 1) }, '↓'),
          h(
            'button',
            {
              type: 'button',
              class: 'mini mini--danger',
              title: 'Supprimer',
              'aria-label': 'Supprimer',
              onclick: async () => {
                if (!(await confirmDialog(`Supprimer ${removeLabel} ?`, `« ${title(item, i) || 'Sans titre'} » sera retiré. La suppression ne devient définitive qu'à l'enregistrement.`, 'Supprimer'))) return;
                items.splice(items.indexOf(item), 1);
                render();
                onChange();
              },
            },
            '✕',
          ),
        ),
      ),
      content,
    );
    el.addEventListener('input', head);
    el.addEventListener('change', head);
    el.refreshHead = head;
    if (open.has(item)) show(true);
    return el;
  }
  function render() {
    rows.replaceChildren(...(items.length ? items.map(row) : [h('p', { class: 'list__empty' }, empty || 'Rien pour le moment.')]));
  }
  root.append(
    rows,
    create &&
      h(
        'button',
        {
          type: 'button',
          class: 'button button--add',
          onclick: () => {
            const item = create();
            items.push(item);
            open.add(item);
            render();
            onChange();
            const last = rows.lastElementChild;
            last.scrollIntoView({ behavior: 'smooth', block: 'center' });
            last.querySelector('.item__body input, .item__body textarea')?.focus({ preventScroll: true });
          },
        },
        `+ ${addLabel}`,
      ),
  );
  render();
  root.refresh = render;
  root.refreshHeads = () => [...rows.children].forEach((el) => el.refreshHead?.());
  root.openItem = (item) => {
    open.add(item);
    render();
    return rows.children[items.indexOf(item)];
  };
  return root;
}

// Liste de textes courts (conseils, lignes de transport) : une zone par ligne.
export function stringList(obj, key, { addLabel, placeholder, onChange }) {
  obj[key] ||= [];
  const root = h('div', { class: 'strings' });
  const render = () => {
    const values = obj[key];
    root.replaceChildren(
      ...values.map((value, i) => {
        const area = h('textarea', { rows: 1, value, placeholder, 'aria-label': `Ligne ${i + 1}`, oninput: (e) => ((values[i] = e.target.value), onChange()) });
        autosize(area);
        const swap = (j) => {
          [values[i], values[j]] = [values[j], values[i]];
          render();
          onChange();
        };
        return h(
          'div',
          { class: 'strings__row' },
          area,
          h('button', { type: 'button', class: 'mini', title: 'Monter', 'aria-label': 'Monter', disabled: i === 0, onclick: () => swap(i - 1) }, '↑'),
          h('button', { type: 'button', class: 'mini', title: 'Descendre', 'aria-label': 'Descendre', disabled: i === values.length - 1, onclick: () => swap(i + 1) }, '↓'),
          h('button', { type: 'button', class: 'mini mini--danger', title: 'Supprimer', 'aria-label': 'Supprimer', onclick: () => (values.splice(i, 1), render(), onChange()) }, '✕'),
        );
      }),
      h(
        'button',
        {
          type: 'button',
          class: 'button button--add',
          onclick: () => {
            values.push('');
            render();
            onChange();
            root.querySelectorAll('textarea')[values.length - 1].focus();
          },
        },
        `+ ${addLabel}`,
      ),
    );
  };
  render();
  return root;
}

export const section = (id, title, ...children) => h('section', { class: 'panel', id }, h('h2', {}, title), ...children);
export const grid = (...children) => h('div', { class: 'grid' }, ...children);
export const note = (text) => h('p', { class: 'note' }, text);

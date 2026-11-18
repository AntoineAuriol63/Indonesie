// Galerie d'une étape : photos de Wikimedia Commons, d'une adresse web, ou envoyées depuis l'appareil.
import { photoOf } from '../data/places.js';
import { uploadPhoto } from './api.js';
import { h, toast } from './ui.js';

export const thumb = (ph, width = 480) => (ph && (ph.file || ph.url) ? photoOf(ph).at(width) : '');

// Accepte le nom du fichier, « File:… » ou l'adresse de sa page sur Commons.
function commonsName(value) {
  const name = value.trim().replace(/^.*(?:File|Fichier):/i, '').replace(/[?#].*$/, '');
  try {
    return decodeURIComponent(name).replace(/_/g, ' ');
  } catch {
    return name.replace(/_/g, ' ');
  }
}

// Auteur et licence d'un fichier de Commons, lus sur Commons.
async function commonsInfo(file) {
  const query = new URLSearchParams({ action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'extmetadata', iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl', format: 'json', origin: '*' });
  let data;
  try {
    data = await (await fetch(`https://commons.wikimedia.org/w/api.php?${query}`)).json();
  } catch {
    throw new Error('Wikimedia Commons ne répond pas. Réessayez dans un instant.');
  }
  const meta = Object.values(data.query.pages)[0].imageinfo?.[0].extmetadata;
  if (!meta) throw new Error(`Fichier introuvable sur Commons : « ${file} ».`);
  return {
    // L'auteur arrive en HTML : on n'en garde que le texte.
    author: new DOMParser().parseFromString(meta.Artist?.value || '', 'text/html').body.textContent.trim(),
    license: meta.LicenseShortName?.value || '',
    licenseUrl: meta.LicenseUrl?.value || '',
  };
}

// Réduit une image à 1600 px de côté au plus et la convertit en JPEG.
async function shrink(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`« ${file.name} » : ce navigateur ne sait pas lire cette image. Essayez un fichier JPEG ou PNG.`);
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = h('canvas', { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

export function photoEditor({ photos, prefix, form }) {
  const root = h('div', { class: 'photos' });
  const cards = h('div', { class: 'photos__grid' });
  const changed = () => form.changed();

  function card(ph, i) {
    const image = h('img', { alt: '', loading: 'lazy', src: thumb(ph) });
    image.addEventListener('error', () => image.classList.add('is-broken'));
    const origin = ph.file ? 'Wikimedia Commons' : /supabase\.co\/storage/.test(ph.url || '') ? 'Envoyée depuis un appareil' : 'Adresse web';
    const swap = (j) => {
      [photos[i], photos[j]] = [photos[j], photos[i]];
      render();
      changed();
    };
    const input = (key, label, placeholder) =>
      h('label', { class: 'photo__field' }, h('span', {}, label), h('input', { type: 'text', value: ph[key] || '', placeholder, oninput: (e) => ((ph[key] = e.target.value), changed()) }));
    return h(
      'figure',
      { class: 'photo' },
      h('div', { class: 'photo__image' }, image, i === 0 && h('span', { class: 'photo__badge' }, 'Photo principale')),
      h(
        'figcaption',
        {},
        h('textarea', {
          rows: 2,
          value: ph.caption || '',
          placeholder: 'Légende : ce que montre la photo',
          'aria-label': 'Légende',
          oninput: (e) => ((ph.caption = e.target.value), changed()),
        }),
        h(
          'details',
          { class: 'photo__more' },
          h('summary', {}, `${origin}${ph.author ? ` · ${ph.author}` : ''}`),
          ph.file ? input('file', 'Fichier sur Commons', 'Nom du fichier.jpg') : input('url', 'Adresse de la photo', 'https://…'),
          input('author', 'Auteur'),
          input('license', 'Licence'),
          input('licenseUrl', 'Lien de la licence', 'https://…'),
        ),
        h(
          'div',
          { class: 'photo__actions' },
          h('button', { type: 'button', class: 'mini', title: 'Avancer', 'aria-label': 'Avancer dans la galerie', disabled: i === 0, onclick: () => swap(i - 1) }, '←'),
          h('button', { type: 'button', class: 'mini', title: 'Reculer', 'aria-label': 'Reculer dans la galerie', disabled: i === photos.length - 1, onclick: () => swap(i + 1) }, '→'),
          h('button', { type: 'button', class: 'mini mini--danger', title: 'Retirer la photo', 'aria-label': 'Retirer la photo', onclick: () => (photos.splice(i, 1), render(), changed()) }, '✕'),
        ),
      ),
    );
  }
  function render() {
    cards.replaceChildren(...(photos.length ? photos.map(card) : [h('p', { class: 'list__empty' }, 'Aucune photo pour le moment.')]));
  }

  // Ajout depuis Commons ou depuis une adresse web : un champ qui s'ouvre sous les boutons.
  const adder = h('div', { class: 'photos__adder' });
  function ask(label, placeholder, add) {
    const input = h('input', { type: 'text', placeholder, 'aria-label': label });
    const go = h('button', { type: 'button', class: 'button button--primary' }, 'Ajouter');
    const submit = async () => {
      if (!input.value.trim()) return input.focus();
      go.disabled = true;
      try {
        await add(input.value.trim());
        adder.replaceChildren();
      } catch (error) {
        toast(error.message, 'error');
        go.disabled = false;
      }
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), submit()));
    adder.replaceChildren(h('label', {}, label), h('div', { class: 'photos__ask' }, input, go, h('button', { type: 'button', class: 'button', onclick: () => adder.replaceChildren() }, 'Annuler')));
    input.focus();
  }
  const push = (ph) => {
    photos.push(ph);
    render();
    changed();
    cards.lastElementChild.querySelector('textarea').focus();
  };
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const uploadButton = h('button', { type: 'button', class: 'button', onclick: () => file.click() }, 'Depuis cet appareil');
  file.addEventListener('change', async () => {
    const chosen = [...file.files];
    file.value = '';
    uploadButton.disabled = true;
    try {
      for (const [n, f] of chosen.entries()) {
        uploadButton.textContent = `Envoi ${n + 1} / ${chosen.length}…`;
        const url = await uploadPhoto(await shrink(f), prefix);
        push({ url, caption: '', author: '', license: '', licenseUrl: '', source: 'Photo personnelle' });
      }
    } catch (error) {
      toast(error.message, 'error');
    }
    uploadButton.disabled = false;
    uploadButton.textContent = 'Depuis cet appareil';
  });

  root.append(
    cards,
    h(
      'div',
      { class: 'photos__add' },
      h('span', {}, 'Ajouter une photo :'),
      h(
        'button',
        {
          type: 'button',
          class: 'button',
          onclick: () =>
            ask('Nom du fichier ou adresse de sa page sur Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:…', async (value) => {
              const name = commonsName(value);
              push({ file: name, caption: '', ...(await commonsInfo(name)) });
            }),
        },
        'Depuis Wikimedia Commons',
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'button',
          onclick: () =>
            ask("Adresse de l'image (elle doit se terminer par .jpg, .png ou .webp, ou afficher l'image seule)", 'https://…', async (value) => {
              if (!/^https:\/\//.test(value)) throw new Error("L'adresse doit commencer par https://");
              push({ url: value, caption: '', author: '', license: '', licenseUrl: '' });
            }),
        },
        'Depuis une adresse web',
      ),
      uploadButton,
      file,
    ),
    adder,
  );
  render();
  return root;
}

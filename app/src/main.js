// Vice Panels wiring: photos in, crop per panel, caption, layout, grade,
// export size — live preview on canvas, PNG export at the exact post size.
// Photos are read locally with object URLs; nothing is uploaded anywhere.
// `?shot=` sets up a fixed scene for screenshots (see shots.js).
import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const layoutInput = document.getElementById('layout');
const gradeInput = document.getElementById('grade');
const sizeInput = document.getElementById('size');
const status = document.getElementById('status');

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };
const PANEL_NAMES = ['Hero', 'Panel 2', 'Panel 3', 'Panel 4'];

const state = {
  photos: [null, null, null, null],
  crops: [0, 1, 2, 3].map(() => ({ zoom: 1, x: 0, y: 0 })),
  title: 'SUNSET HEIST',
  subtitle: 'ONE LAST JOB IN VICE CITY',
  grade: 'sunset',
  layout: 'hero',
};
let mainPhoto = null;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function applySize() {
  const [w, h] = SIZES[sizeInput.value] || SIZES['1080x1080'];
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

export function redraw() {
  applySize();
  state.title = titleInput.value;
  state.subtitle = subtitleInput.value;
  state.grade = gradeInput.value;
  state.layout = layoutInput.value;
  drawCover(canvas, state);
}

// One control card per panel: its own photo, zoom and pan sliders.
function buildPanelCards() {
  const host = document.getElementById('panels');
  state.photos.forEach((_, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.innerHTML =
      `<h3><span>${PANEL_NAMES[i]}</span> — photo &amp; crop</h3>` +
      `<label class="field">Photo <input type="file" accept="image/*" data-panel="${i}"></label>` +
      `<div class="sliders">` +
      `<label>Zoom</label><input type="range" min="1" max="2.5" step="0.05" value="1" data-crop="${i}" data-key="zoom">` +
      `<label>Left–right</label><input type="range" min="-0.5" max="0.5" step="0.05" value="0" data-crop="${i}" data-key="x">` +
      `<label>Up–down</label><input type="range" min="-0.5" max="0.5" step="0.05" value="0" data-crop="${i}" data-key="y">` +
      `</div>` +
      `<div class="row"><button type="button" data-fill="${i}">Use main photo here</button></div>`;
    host.appendChild(card);
  });
  host.addEventListener('change', async (e) => {
    const fileInput = e.target.closest('input[type=file][data-panel]');
    if (fileInput?.files[0]) {
      state.photos[Number(fileInput.dataset.panel)] = await loadImage(URL.createObjectURL(fileInput.files[0]));
      redraw();
    }
  });
  host.addEventListener('input', (e) => {
    const slider = e.target.closest('input[data-crop]');
    if (slider) {
      state.crops[Number(slider.dataset.crop)][slider.dataset.key] = Number(slider.value);
      redraw();
    }
  });
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-fill]');
    if (btn && mainPhoto) {
      state.photos[Number(btn.dataset.fill)] = mainPhoto;
      redraw();
    }
  });
}

async function loadSample(name) {
  return loadImage(`samples/${name}.jpg`);
}

async function fillAllWith(img) {
  state.photos = [img, img, img, img];
  redraw();
}

document.getElementById('mainPhoto').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  mainPhoto = await loadImage(URL.createObjectURL(file));
  await fillAllWith(mainPhoto);
  status.textContent = 'Main photo loaded into all 4 panels — crop each one below.';
});
document.getElementById('samplePier').addEventListener('click', async () => { mainPhoto = await loadSample('pier'); await fillAllWith(mainPhoto); });
document.getElementById('sampleBoulevard').addEventListener('click', async () => { mainPhoto = await loadSample('boulevard'); await fillAllWith(mainPhoto); });
document.getElementById('sampleMix').addEventListener('click', async () => {
  const pier = await loadSample('pier'), blvd = await loadSample('boulevard');
  state.photos = [pier, blvd, pier, blvd];
  redraw();
});
document.getElementById('fillAll').addEventListener('click', async () => {
  if (mainPhoto) { await fillAllWith(mainPhoto); }
  else { status.textContent = 'Load a main photo first (or a sample).'; }
});
[titleInput, subtitleInput, layoutInput, gradeInput, sizeInput].forEach((el) => el.addEventListener('input', redraw));

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[sizeInput.value] || SIZES['1080x1080'];
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved vice-panels-${w}x${h}.png`;
  }, 'image/png');
});

// Scene used by screenshots: loads the named samples into the panels.
export async function applyScene(scene) {
  const names = scene.photos || ['pier'];
  const loaded = [];
  for (const name of names) loaded.push(await loadSample(name));
  state.photos = [0, 1, 2, 3].map((i) => loaded[i % loaded.length]);
  mainPhoto = loaded[0];
  if (scene.title) titleInput.value = scene.title;
  if (scene.subtitle) subtitleInput.value = scene.subtitle;
  if (scene.layout) layoutInput.value = scene.layout;
  if (scene.grade) gradeInput.value = scene.grade;
  if (scene.size) sizeInput.value = scene.size;
  // A little crop variety so panels do not all show the same framing.
  // Positive y pans toward the top of the photo, where faces are.
  state.crops = [{ zoom: 1.05, x: 0, y: 0.5 }, { zoom: 1.15, x: 0, y: 0.5 }, { zoom: 1.1, x: 0, y: 0.5 }, { zoom: 1.2, x: 0, y: 0.5 }];
  redraw();
}

buildPanelCards();
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), applyScene);
} else {
  redraw();
}

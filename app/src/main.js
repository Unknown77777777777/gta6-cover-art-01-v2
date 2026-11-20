// Vice Panels editor: loads photos, wires every control, keeps the live
// preview in step, and exports the cover as a full-resolution PNG.
// Everything runs offline; photos are read on this machine and never sent
// anywhere. Query presets (for deterministic screenshots):
//   ?photo=pier|boulevard  ?caption=...  ?layout=hero|quad|triptych|single
//   ?grade=sunset|neon|dusk  ?size=1080x1080|1080x1350|1920x1080
//   ?shot=editor|cover
import { drawCover, layoutRects, EXPORT_SIZES, LAYOUTS, GRADES } from './render.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

const state = {
  layout: 'hero',
  grade: 'sunset',
  caption: 'Sunset Heist',
  captionSize: 96,
  captionColor: '#ffffff',
  captionPos: 'bottom',
  exportSize: '1920x1080',
  panels: [],
};

// Loaded photos: { name, img }. The two bundled samples come first.
const photos = [];
let selectedPanel = 0;

function freshPanels(layout) {
  const count = layoutRects(layout).length;
  const seed = [0, 1, 0, 1];
  return Array.from({ length: count }, (_, i) => ({
    photo: photos.length > 1 ? seed[i] % photos.length : 0,
    zoom: 1,
    dx: 0,
    dy: 0,
    rot: 0,
  }));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = src;
  });
}

function renderPreview() {
  const [w, h] = EXPORT_SIZES[state.exportSize];
  const pw = 960;
  const ph = Math.round((960 * h) / w);
  if (preview.width !== pw || preview.height !== ph) {
    preview.width = pw;
    preview.height = ph;
  }
  drawCover(pctx, pw, ph, state, photos.map((p) => p.img));
}

function setStatus(msg) {
  $('status').textContent = msg;
}

// --- photo library -------------------------------------------------------
function rebuildLibrary() {
  const lib = $('library');
  lib.textContent = '';
  photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Use ${photo.name} in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    btn.appendChild(thumb);
    btn.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      renderPreview();
      rebuildPanelControls();
    });
    lib.appendChild(btn);
  });
}

async function addPhotoFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
  const img = await loadImage(dataUrl);
  photos.push({ name: file.name, img });
  rebuildLibrary();
  rebuildPanelControls();
  renderPreview();
  setStatus(`Loaded ${file.name}.`);
}

async function loadSample(name) {
  if (photos.some((p) => p.name === name)) return;
  const img = await loadImage(`samples/${name}.jpg`);
  photos.push({ name, img });
}

// --- per-panel controls --------------------------------------------------
function rebuildPanelControls() {
  const wrap = $('panelControls');
  wrap.textContent = '';
  const rects = layoutRects(state.layout);
  rects.forEach((_, i) => {
    const panel = state.panels[i];
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selectedPanel ? ' selected' : '');
    const title = document.createElement('span');
    title.className = 'panel-title';
    title.textContent = `Panel ${i + 1}`;
    row.appendChild(title);

    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    photos.forEach((photo, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = photo.name;
      if (pi === panel.photo) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      panel.photo = Number(select.value);
      renderPreview();
    });
    row.appendChild(select);

    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '3';
    zoom.step = '0.05';
    zoom.value = String(panel.zoom);
    zoom.setAttribute('aria-label', `Zoom for panel ${i + 1}`);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      renderPreview();
    });
    row.appendChild(zoom);

    const rot = document.createElement('input');
    rot.type = 'range';
    rot.min = '-15';
    rot.max = '15';
    rot.step = '1';
    rot.value = String(panel.rot);
    rot.setAttribute('aria-label', `Rotate panel ${i + 1}`);
    rot.addEventListener('input', () => {
      panel.rot = Number(rot.value);
      renderPreview();
    });
    row.appendChild(rot);

    row.addEventListener('click', (e) => {
      if (e.target === row || e.target === title) {
        selectedPanel = i;
        rebuildPanelControls();
        renderPreview();
      }
    });
    wrap.appendChild(row);
  });
}

// --- layout / grade buttons ----------------------------------------------
function wireChoiceGroup(containerId, set) {
  const container = $(containerId);
  container.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      set(btn.dataset.value);
      container.querySelectorAll('button').forEach((b) =>
        b.classList.toggle('active', b === btn));
      renderPreview();
    });
  });
}

function setLayout(layout) {
  if (!LAYOUTS.includes(layout)) return;
  state.layout = layout;
  state.panels = freshPanels(layout);
  selectedPanel = 0;
  rebuildPanelControls();
}

function setGrade(grade) {
  if (!GRADES.includes(grade)) return;
  state.grade = grade;
}

// --- export ---------------------------------------------------------------
async function exportPNG(sizeName) {
  const [w, h] = EXPORT_SIZES[sizeName] || EXPORT_SIZES[state.exportSize];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state, photos.map((p) => p.img));
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function doExport() {
  setStatus('Exporting…');
  const blob = await exportPNG(state.exportSize);
  if (!blob) {
    setStatus('Export failed.');
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-panels-${state.exportSize}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(`Exported vice-panels-${state.exportSize}.png.`);
}

// Screenshot scripts use this to fetch the exact PNG the app writes.
window.__viceExport = async (sizeName) => {
  const blob = await exportPNG(sizeName || state.exportSize);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

// --- pointer editing on the preview ---------------------------------------
function panelAt(clientX, clientY) {
  const r = preview.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * preview.width;
  const y = ((clientY - r.top) / r.height) * preview.height;
  const rects = layoutRects(state.layout);
  for (let i = 0; i < rects.length; i++) {
    const f = rects[i];
    if (x >= f.x * preview.width && x < (f.x + f.w) * preview.width &&
        y >= f.y * preview.height && y < (f.y + f.h) * preview.height) {
      return { index: i, x, y };
    }
  }
  return null;
}

let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  selectedPanel = hit.index;
  rebuildPanelControls();
  drag = { x: e.clientX, y: e.clientY, panel: state.panels[hit.index] };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = preview.getBoundingClientRect();
  const panel = drag.panel;
  panel.dx = Math.max(-0.5, Math.min(0.5, panel.dx + (e.clientX - drag.x) / r.width));
  panel.dy = Math.max(-0.5, Math.min(0.5, panel.dy + (e.clientY - drag.y) / r.height));
  drag.x = e.clientX;
  drag.y = e.clientY;
  renderPreview();
});
preview.addEventListener('pointerup', () => { drag = null; });
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selectedPanel];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  renderPreview();
  rebuildPanelControls();
}, { passive: false });

// --- wire the static controls ---------------------------------------------
$('photoInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      await addPhotoFile(file);
    } catch {
      setStatus(`Could not load ${file.name}.`);
    }
  }
  e.target.value = '';
});
$('captionInput').addEventListener('input', (e) => {
  state.caption = e.target.value;
  renderPreview();
});
$('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  $('captionSizeValue').textContent = `${state.captionSize}px`;
  renderPreview();
});
$('captionColor').addEventListener('input', (e) => {
  state.captionColor = e.target.value;
  renderPreview();
});
$('captionPos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  renderPreview();
});
$('exportSize').addEventListener('change', (e) => {
  state.exportSize = e.target.value;
  renderPreview();
});
$('exportBtn').addEventListener('click', doExport);
wireChoiceGroup('layoutBtns', setLayout);
wireChoiceGroup('gradeBtns', setGrade);

// --- the app object the shot preset runner uses ---------------------------
const app = {
  state,
  photos,
  loadSample,
  setPreset(preset) {
    if (preset.caption !== undefined) {
      state.caption = preset.caption;
      $('captionInput').value = preset.caption;
    }
    if (preset.layout) {
      setLayout(preset.layout);
      document.querySelectorAll('#layoutBtns button').forEach((b) =>
        b.classList.toggle('active', b.dataset.value === preset.layout));
    }
    if (preset.grade) {
      setGrade(preset.grade);
      document.querySelectorAll('#gradeBtns button').forEach((b) =>
        b.classList.toggle('active', b.dataset.value === preset.grade));
    }
    if (preset.size && EXPORT_SIZES[preset.size]) {
      state.exportSize = preset.size;
      $('exportSize').value = preset.size;
    }
  },
  renderPreview,
  renderCoverOnly(sizeName) {
    // Cover-only mode: the preview canvas fills the stage at the cover's
    // own aspect, with the editor chrome hidden by CSS (.shot-cover).
    const [w, h] = EXPORT_SIZES[sizeName] || EXPORT_SIZES[state.exportSize];
    preview.width = Math.min(1280, w);
    preview.height = Math.round((preview.width * h) / w);
    drawCover(pctx, preview.width, preview.height, state, photos.map((p) => p.img));
  },
};

// --- boot ------------------------------------------------------------------
(async () => {
  await loadSample('pier');
  await loadSample('boulevard');
  state.panels = freshPanels(state.layout);
  rebuildLibrary();
  rebuildPanelControls();
  renderPreview();
  const query = new URLSearchParams(location.search);
  if (query.has('shot') || query.has('photo') || query.has('caption') ||
      query.has('layout') || query.has('grade') || query.has('size')) {
    await runShot(query, app);
  } else {
    window.__shotReady = true;
  }
})();

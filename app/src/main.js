// Vice Panels — editor UI. Wires the controls to the cover renderer:
// photo upload + samples, panel pick / zoom / drag-to-pan, caption editing,
// grade and layout switching, live preview, and PNG export in three sizes.
// Photos are read on this machine only (FileReader / same-origin samples);
// the app makes no network request at all.

import { drawCover, panelRects, LAYOUTS, GRADES, TITLE_STYLES } from './cover.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const stageWrap = $('stageWrap');

const EXPORT_SIZES = [
  { key: '1080x1080', label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  { key: '1080x1350', label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  { key: '1920x1080', label: 'Wide · 1920 × 1080', width: 1920, height: 1080 },
];

// Four panel slots; a layout uses the first N of them.
const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'SUNSET DRIVE',
  subtitle: 'BOULEVARD NIGHTS',
  titleStyle: 'sunset',
  photos: [], // { id, name, img }
  panels: [
    { photoId: null, zoom: 1, ox: 0, oy: 0 },
    { photoId: null, zoom: 1, ox: 0, oy: 0 },
    { photoId: null, zoom: 1, ox: 0, oy: 0 },
    { photoId: null, zoom: 1, ox: 0, oy: 0 },
  ],
  selected: 0,
};

let photoSeq = 0;
let lastExport = null;

function photoById(id) {
  return state.photos.find((p) => p.id === id) || null;
}

function panelPhotos() {
  return state.panels.map((panel) => {
    const found = panel.photoId ? photoById(panel.photoId) : null;
    return { photo: found ? found.img : null, zoom: panel.zoom, ox: panel.ox, oy: panel.oy };
  });
}

function renderPreview() {
  const box = stageWrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, Math.floor(box.width * dpr));
  const h = Math.max(240, Math.floor(box.height * dpr));
  drawCover(stage, {
    width: w,
    height: h,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleStyle: state.titleStyle,
    panels: panelPhotos(),
  });
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  const select = $('panelPhoto');
  select.value = panel.photoId || '';
  $('zoomRange').value = String(Math.round(panel.zoom * 100));
  $('zoomLabel').textContent = `${Math.round(panel.zoom * 100)}%`;
  document.querySelectorAll('#thumbs .thumb').forEach((el) => {
    el.classList.toggle('active', el.dataset.photoId === panel.photoId);
  });
  document.querySelectorAll('[data-panel-dot]').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.panelDot) === state.selected);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image ${src}`));
    img.src = src;
  });
}

async function addPhoto(name, src) {
  const img = await loadImage(src);
  const photo = { id: `p${++photoSeq}`, name, img };
  state.photos.push(photo);
  // Fill the first empty visible panel with it; otherwise the selected one.
  const visible = (LAYOUTS[state.layout] || LAYOUTS.hero).panels.length;
  let slot = state.panels.findIndex((p, i) => i < visible && !p.photoId);
  if (slot < 0) slot = state.selected;
  state.panels[slot].photoId = photo.id;
  state.selected = slot;
  renderThumbs();
  renderPreview();
  return photo;
}

function renderThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  for (const photo of state.photos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.dataset.photoId = photo.id;
    btn.title = `Put “${photo.name}” in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      state.panels[state.selected].photoId = photo.id;
      renderPreview();
    });
    box.appendChild(btn);
  }
  $('photoCount').textContent =
    state.photos.length === 0 ? 'No photos yet — add one below.' : `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded.`;

  // Keep the "photo in this panel" select in step 3 in sync with the photos.
  const select = $('panelPhoto');
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Empty panel';
  select.appendChild(empty);
  for (const photo of state.photos) {
    const option = document.createElement('option');
    option.value = photo.id;
    option.textContent = photo.name;
    select.appendChild(option);
  }
  select.value = state.panels[state.selected].photoId || '';
}

function renderOptionButtons(containerId, entries, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const [key, entry] of Object.entries(entries)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.value = key;
    btn.textContent = entry.label;
    if (key === current) btn.classList.add('active');
    btn.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.choice').forEach((el) => el.classList.toggle('active', el.dataset.value === key));
      renderPreview();
    });
    box.appendChild(btn);
  }
}

function renderPanelDots() {
  const box = $('panelDots');
  box.innerHTML = '';
  const count = (LAYOUTS[state.layout] || LAYOUTS.hero).panels.length;
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dot';
    btn.dataset.panelDot = String(i);
    btn.textContent = `Panel ${i + 1}`;
    btn.addEventListener('click', () => {
      state.selected = i;
      renderPreview();
    });
    box.appendChild(btn);
  }
}

function stageRects() {
  const margin = Math.max(6, Math.round(Math.min(stage.width, stage.height) * 0.016));
  const gutter = Math.max(4, Math.round(Math.min(stage.width, stage.height) * 0.012));
  return panelRects(state.layout, stage.width, stage.height, margin, gutter);
}

function pickPanelAt(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * stage.width;
  const y = ((clientY - r.top) / r.height) * stage.height;
  const rects = stageRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const p = rects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function bindStagePointer() {
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const hit = pickPanelAt(e.clientX, e.clientY);
    if (hit < 0) return;
    state.selected = hit;
    const panel = state.panels[hit];
    drag = { x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy, moved: false };
    stage.setPointerCapture(e.pointerId);
    renderPreview();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rects = stageRects();
    const rect = rects[state.selected];
    if (!rect) return;
    const r = stage.getBoundingClientRect();
    const dxPx = ((e.clientX - drag.x) / r.width) * stage.width;
    const dyPx = ((e.clientY - drag.y) / r.height) * stage.height;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
    const panel = state.panels[state.selected];
    const spanX = Math.max(60, rect.w * 0.6);
    const spanY = Math.max(60, rect.h * 0.6);
    panel.ox = Math.max(-1, Math.min(1, drag.ox + (dxPx / spanX) * 1.4));
    panel.oy = Math.max(-1, Math.min(1, drag.oy + (dyPx / spanY) * 1.4));
    renderPreview();
  });
  const endDrag = () => { drag = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[state.selected];
    panel.zoom = Math.max(0.6, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    renderPreview();
  }, { passive: false });
}

async function exportPNG(size) {
  const off = document.createElement('canvas');
  drawCover(off, {
    width: size.width,
    height: size.height,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleStyle: state.titleStyle,
    panels: panelPhotos(),
  });
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  lastExport = { key: size.key, width: size.width, height: size.height, bytes: blob.size, url, blob };
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-panels-${size.key}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  $('exportNote').textContent = `Exported ${size.width} × ${size.height} PNG (${(blob.size / 1024).toFixed(0)} KiB).`;
  return lastExport;
}

function bindControls() {
  renderOptionButtons('layoutChoices', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    if (state.selected >= LAYOUTS[key].panels.length) state.selected = 0;
    renderPanelDots();
  });
  renderOptionButtons('gradeChoices', GRADES, state.grade, (key) => { state.grade = key; });
  renderOptionButtons('titleStyleChoices', TITLE_STYLES, state.titleStyle, (key) => { state.titleStyle = key; });

  renderPanelDots();

  const fileInput = $('fileInput');
  $('addPhotosBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    for (const file of fileInput.files) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await addPhoto(file.name, dataUrl);
    }
    fileInput.value = '';
  });

  for (const btn of document.querySelectorAll('[data-sample]')) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await addPhoto(btn.dataset.sample, `samples/${btn.dataset.sample}`); }
      finally { btn.disabled = false; }
    });
  }

  $('panelPhoto').addEventListener('change', (e) => {
    state.panels[state.selected].photoId = e.target.value || null;
    renderPreview();
  });
  $('zoomRange').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    renderPreview();
  });
  $('fitBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
    renderPreview();
  });
  $('clearBtn').addEventListener('click', () => {
    state.panels[state.selected].photoId = null;
    renderPreview();
  });

  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    renderPreview();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    renderPreview();
  });

  const exportBox = $('exportButtons');
  for (const size of EXPORT_SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'export';
    btn.dataset.export = size.key;
    btn.innerHTML = `<strong>${size.label}</strong><span>PNG download</span>`;
    btn.addEventListener('click', () => exportPNG(size));
    exportBox.appendChild(btn);
  }

  stageWrap.addEventListener('dragover', (e) => { e.preventDefault(); stageWrap.classList.add('dropping'); });
  stageWrap.addEventListener('dragleave', () => stageWrap.classList.remove('dropping'));
  stageWrap.addEventListener('drop', async (e) => {
    e.preventDefault();
    stageWrap.classList.remove('dropping');
    for (const file of e.dataTransfer.files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await addPhoto(file.name, dataUrl);
    }
  });

  window.addEventListener('resize', renderPreview);
}

async function init() {
  bindControls();
  bindStagePointer();
  // Start with the two bundled sample photos so the editor is alive at once.
  try {
    await addPhoto('boulevard.jpg', 'samples/boulevard.jpg');
    await addPhoto('pier.jpg', 'samples/pier.jpg');
  } catch (err) {
    $('exportNote').textContent = `Sample photos could not load: ${err.message}`;
  }
  renderPreview();
}

// Test / automation handle: the app exposes its state and export so a
// headless browser can verify layout, caption, grade and PNG sizes.
window.__vicePanels = {
  state,
  EXPORT_SIZES,
  renderPreview,
  exportPNG,
  addPhoto,
  setCaption(title, subtitle) {
    state.title = title;
    state.subtitle = subtitle;
    $('titleInput').value = title;
    $('subtitleInput').value = subtitle;
    renderPreview();
  },
  setGrade(grade) { state.grade = grade; renderPreview(); },
  setLayout(layout) { state.layout = layout; renderPanelDots(); renderPreview(); },
  get lastExport() { return lastExport; },
};

init();

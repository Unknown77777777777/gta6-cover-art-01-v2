// main.js — Vice Panels editor: loads photos, live preview, export.
// All state lives here; cover.js owns the layout math and canvas draw.
import { GRADES, EXPORT_SIZES, panelRects, renderCover } from './cover.js';

const SAMPLES = [
  { id: 'pier', label: 'Pier sunset', src: 'samples/pier.jpg' },
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
];

const DEFAULT_CAPTION = 'VICE PANELS';

const state = {
  layout: 'hero',
  grade: 'sunset',
  sizeIndex: 2,
  caption: { text: DEFAULT_CAPTION, sizePct: 9, color: '#ffffff', position: 'bottom' },
  panels: [
    { photo: 'pier', zoom: 1, panX: 0, panY: 0, rotate: 0 },
    { photo: 'boulevard', zoom: 1, panX: 0, panY: 0, rotate: 0 },
    { photo: 'pier', zoom: 1, panX: 0, panY: 0, rotate: 0 },
    { photo: 'boulevard', zoom: 1, panX: 0, panY: 0, rotate: 0 },
  ],
};

let selectedPanel = 0;
const photos = new Map(); // id -> { id, label, src, img }
let uploadCount = 0;

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const panelLayer = $('panelLayer');
const captionLayer = $('captionLayer');

// ---------- photos ----------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load photo'));
    img.src = src;
  });
}

async function registerPhoto(entry) {
  const img = await loadImage(entry.src);
  photos.set(entry.id, { ...entry, img });
  return photos.get(entry.id);
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      await registerPhoto(s);
    } catch {
      // A missing sample just leaves that slot empty; the editor stays usable.
    }
  }
}

// ---------- query presets (deterministic screenshots) ----------

function applyQueryPreset() {
  const q = new URLSearchParams(location.search);
  const layout = q.get('layout');
  if (layout && ['hero', 'quad', 'triptych', 'single'].includes(layout)) state.layout = layout;
  const grade = q.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const caption = q.get('caption');
  if (caption !== null) state.caption.text = caption.slice(0, 60);
  const cappos = q.get('cappos');
  if (cappos && ['top', 'middle', 'bottom'].includes(cappos)) state.caption.position = cappos;
  const capcolor = q.get('capcolor');
  if (capcolor && /^#[0-9a-fA-F]{6}$/.test(capcolor)) state.caption.color = capcolor;
  const size = q.get('size');
  if (size) {
    const idx = EXPORT_SIZES.findIndex((s) => `${s.w}x${s.h}` === size);
    if (idx >= 0) state.sizeIndex = idx;
  }
  ['photo', 'photo2', 'photo3', 'photo4'].forEach((key, i) => {
    const v = q.get(key);
    if (v) state.panels[i].photo = v;
  });
  return q.get('shot') || '';
}

// ---------- live preview ----------

function panelTransform(p) {
  const tx = (p.panX * 100).toFixed(1);
  const ty = (p.panY * 100).toFixed(1);
  return `translate(${tx}%, ${ty}%) scale(${p.zoom}) rotate(${p.rotate}deg)`;
}

function renderPreview() {
  const size = EXPORT_SIZES[state.sizeIndex];
  stage.style.aspectRatio = `${size.w} / ${size.h}`;
  const grade = GRADES[state.grade];
  const rects = panelRects(state.layout, state.panels.length);
  panelLayer.innerHTML = '';
  rects.forEach((r, i) => {
    const p = state.panels[i];
    const div = document.createElement('div');
    div.className = 'panel' + (i === selectedPanel ? ' selected' : '');
    div.style.left = `${r.x * 100}%`;
    div.style.top = `${r.y * 100}%`;
    div.style.width = `${r.w * 100}%`;
    div.style.height = `${r.h * 100}%`;
    div.dataset.index = String(i);
    const photo = photos.get(p.photo);
    if (photo) {
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.label;
      img.draggable = false;
      img.style.filter = grade.cssFilter;
      img.style.transform = panelTransform(p);
      div.appendChild(img);
    } else {
      const empty = document.createElement('div');
      empty.className = 'panel-empty';
      empty.textContent = 'No photo — pick one below';
      div.appendChild(empty);
    }
    const veil = document.createElement('div');
    veil.className = 'grade-veil';
    veil.style.background = `linear-gradient(135deg, ${grade.tint[0]}, ${grade.tint[1]})`;
    veil.style.mixBlendMode = grade.blend;
    div.appendChild(veil);
    div.addEventListener('pointerdown', (ev) => onPanelDragStart(ev, i));
    div.addEventListener('click', () => selectPanel(i));
    panelLayer.appendChild(div);
  });
  renderCaption();
  syncControls();
}

function renderCaption() {
  const text = state.caption.text.trim();
  captionLayer.textContent = text.toUpperCase();
  const h = stage.clientHeight || 600;
  captionLayer.style.fontSize = `${Math.max(14, (h * state.caption.sizePct) / 100)}px`;
  captionLayer.style.color = state.caption.color;
  captionLayer.classList.remove('pos-top', 'pos-middle', 'pos-bottom');
  captionLayer.classList.add(`pos-${state.caption.position}`);
  captionLayer.style.display = text ? '' : 'none';
}

// ---------- panel drag / wheel zoom ----------

let drag = null;

function onPanelDragStart(ev, i) {
  selectPanel(i);
  const panelEl = ev.currentTarget;
  const imgEl = panelEl.querySelector('img');
  drag = {
    index: i,
    startX: ev.clientX,
    startY: ev.clientY,
    panX: state.panels[i].panX,
    panY: state.panels[i].panY,
    rect: panelEl.getBoundingClientRect(),
  };
  try {
    panelEl.setPointerCapture(ev.pointerId);
  } catch {
    // Pointer capture is a nicety (synthetic pointers may refuse it);
    // dragging still works through the window move/up listeners below.
  }
  const move = (e2) => {
    if (!drag) return;
    const p = state.panels[drag.index];
    p.panX = clamp(drag.panX + (e2.clientX - drag.startX) / drag.rect.width, -0.6, 0.6);
    p.panY = clamp(drag.panY + (e2.clientY - drag.startY) / drag.rect.height, -0.6, 0.6);
    // Update the dragged image directly: a full re-render mid-drag
    // would destroy the panel element the drag is attached to.
    if (imgEl) imgEl.style.transform = panelTransform(p);
  };
  const up = () => {
    drag = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    renderPreview();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

stage.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const p = state.panels[selectedPanel];
  p.zoom = clamp(p.zoom * (ev.deltaY < 0 ? 1.08 : 0.93), 0.8, 3);
  renderPreview();
}, { passive: false });

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---------- controls ----------

function selectPanel(i) {
  selectedPanel = i;
  // Toggle the outline only: a full re-render here would destroy the
  // panel element mid-drag, so the outline and controls update in place.
  document.querySelectorAll('.panel').forEach((el) => {
    el.classList.toggle('selected', Number(el.dataset.index) === i);
  });
  syncControls();
}

function syncControls() {
  document.querySelectorAll('.layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('.grade-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('.cappos-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.pos === state.caption.position);
  });
  $('exportSize').value = String(state.sizeIndex);
  $('captionText').value = state.caption.text;
  $('capColor').value = state.caption.color;
  $('capSizeRange').value = String(state.caption.sizePct);
  $('capSizeVal').textContent = `${state.caption.sizePct}%`;
  const p = state.panels[selectedPanel];
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${panelRects(state.layout, 4).length}`;
  $('panelPhoto').value = p.photo;
  $('zoomRange').value = String(p.zoom);
  $('zoomVal').textContent = `${p.zoom.toFixed(2)}×`;
  $('panXRange').value = String(p.panX);
  $('panXVal').textContent = `${Math.round(p.panX * 100)}%`;
  $('panYRange').value = String(p.panY);
  $('panYVal').textContent = `${Math.round(p.panY * 100)}%`;
  $('rotRange').value = String(p.rotate);
  $('rotVal').textContent = `${Math.round(p.rotate)}°`;
}

function rebuildPhotoOptions() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  for (const ph of photos.values()) {
    const opt = document.createElement('option');
    opt.value = ph.id;
    opt.textContent = ph.label;
    sel.appendChild(opt);
  }
  const row = $('thumbRow');
  row.innerHTML = '';
  for (const ph of photos.values()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Use ${ph.label} in the selected panel`;
    const im = document.createElement('img');
    im.src = ph.src;
    im.alt = ph.label;
    b.appendChild(im);
    b.addEventListener('click', () => {
      state.panels[selectedPanel].photo = ph.id;
      renderPreview();
    });
    row.appendChild(b);
  }
  const sampleRow = $('sampleRow');
  sampleRow.innerHTML = '';
  for (const s of SAMPLES) {
    if (!photos.has(s.id)) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sample-btn';
    b.textContent = `Sample: ${s.label}`;
    b.addEventListener('click', () => {
      state.panels[selectedPanel].photo = s.id;
      renderPreview();
    });
    sampleRow.appendChild(b);
  }
}

function wireControls() {
  document.querySelectorAll('.layout-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.layout = b.dataset.layout;
      selectedPanel = 0;
      renderPreview();
    });
  });
  document.querySelectorAll('.grade-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.grade = b.dataset.grade;
      renderPreview();
    });
  });
  document.querySelectorAll('.cappos-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.caption.position = b.dataset.pos;
      renderPreview();
    });
  });
  $('captionText').addEventListener('input', (ev) => {
    state.caption.text = ev.target.value.slice(0, 60);
    renderCaption();
  });
  $('capSizeRange').addEventListener('input', (ev) => {
    state.caption.sizePct = Number(ev.target.value);
    renderCaption();
    syncControls();
  });
  $('capColor').addEventListener('input', (ev) => {
    state.caption.color = ev.target.value;
    renderCaption();
  });
  $('exportSize').addEventListener('change', (ev) => {
    state.sizeIndex = Number(ev.target.value);
    renderPreview();
  });
  $('panelPhoto').addEventListener('change', (ev) => {
    state.panels[selectedPanel].photo = ev.target.value;
    renderPreview();
  });
  $('zoomRange').addEventListener('input', (ev) => {
    state.panels[selectedPanel].zoom = Number(ev.target.value);
    renderPreview();
  });
  $('panXRange').addEventListener('input', (ev) => {
    state.panels[selectedPanel].panX = Number(ev.target.value);
    renderPreview();
  });
  $('panYRange').addEventListener('input', (ev) => {
    state.panels[selectedPanel].panY = Number(ev.target.value);
    renderPreview();
  });
  $('rotRange').addEventListener('input', (ev) => {
    state.panels[selectedPanel].rotate = Number(ev.target.value);
    renderPreview();
  });
  $('applyAllBtn').addEventListener('click', () => {
    const photo = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    renderPreview();
  });
  $('fileInput').addEventListener('change', async (ev) => {
    const files = [...ev.target.files];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const src = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(f);
      });
      const id = `up${uploadCount++}`;
      await registerPhoto({ id, label: f.name, src });
    }
    rebuildPhotoOptions();
    renderPreview();
    ev.target.value = '';
  });
  $('exportBtn').addEventListener('click', () => exportCover());
  window.addEventListener('resize', () => renderCaption());
}

// ---------- export ----------

function imagesById() {
  const out = {};
  for (const [id, ph] of photos) out[id] = ph.img;
  return out;
}

function exportCover(sizeIndex = state.sizeIndex) {
  const size = EXPORT_SIZES[sizeIndex];
  const canvas = document.createElement('canvas');
  renderCover(canvas, size.w, size.h, state, imagesById());
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        $('exportStatus').textContent = 'Export failed in this browser.';
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-panels-${size.w}x${size.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      $('exportStatus').textContent = `Exported ${size.w} × ${size.h} PNG.`;
      resolve(blob);
    }, 'image/png');
  });
}

// Test/screenshot hook: export without triggering a download.
window.__viceExport = (sizeIndex = state.sizeIndex) => {
  const size = EXPORT_SIZES[sizeIndex];
  const canvas = document.createElement('canvas');
  renderCover(canvas, size.w, size.h, state, imagesById());
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};

// ---------- boot ----------

async function boot() {
  const shot = applyQueryPreset();
  wireControls();
  const sizeSel = $('exportSize');
  EXPORT_SIZES.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = s.label;
    sizeSel.appendChild(opt);
  });
  await loadSamples();
  rebuildPhotoOptions();
  renderPreview();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = EXPORT_SIZES[state.sizeIndex];
    const canvas = document.createElement('canvas');
    renderCover(canvas, size.w, size.h, state, imagesById());
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const img = $('coverImg');
    img.src = URL.createObjectURL(blob);
    img.alt = `Vice Panels cover, ${size.w} by ${size.h}`;
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    window.__viceReady = true;
  } else {
    window.__viceReady = true;
  }
}

boot();

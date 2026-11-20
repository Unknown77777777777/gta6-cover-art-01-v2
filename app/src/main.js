// Vice Panels — a multi-panel GTA-style cover art maker.
// Static, offline, no libraries: one canvas draws the live preview and every
// exported PNG from the same state. Photos are read on the user's machine only.
const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const libraryEl = document.getElementById('photoLibrary');
const panelRowsEl = document.getElementById('panelRows');

const SAMPLES = {
  boulevard: { id: 'boulevard', name: 'Boulevard', url: './samples/boulevard.jpg' },
  pier: { id: 'pier', name: 'Pier', url: './samples/pier.jpg' },
};

const LAYOUTS = { solo: 1, duo: 2, trio: 3, quad: 4 };

const GRADES = {
  sunset: { name: 'Sunset Vice', filter: 'saturate(1.3) contrast(1.1)', top: '#ffb347', bottom: '#ff2e88', mode: 'soft-light', alpha: 0.55, accent: '#ffd166' },
  neon: { name: 'Neon Nights', filter: 'saturate(1.7) contrast(1.18)', top: '#ff00a8', bottom: '#00e5ff', mode: 'overlay', alpha: 0.5, accent: '#00e5ff' },
  palm: { name: 'Palm Dusk', filter: 'saturate(1.25) contrast(1.06)', top: '#7b2fff', bottom: '#00c9a7', mode: 'soft-light', alpha: 0.6, accent: '#7dffd4' },
  mono: { name: 'Mono Noir', filter: 'grayscale(1) contrast(1.32) brightness(1.06)', top: '#ffffff', bottom: '#000000', mode: 'overlay', alpha: 0.12, accent: '#e8e8e8' },
};

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

const state = {
  layout: 'trio',
  grade: 'sunset',
  title: 'VICE CITY NIGHTS',
  subtitle: 'A STORY IN PANELS',
  captionPos: 'bottom',
  size: '1080x1080',
  photos: [],
  panels: [
    { photoId: 'boulevard', zoom: 1.15, ox: 0, oy: 0 },
    { photoId: 'pier', zoom: 1.15, ox: 0, oy: 0 },
    { photoId: 'boulevard', zoom: 1.3, ox: 0.05, oy: 0 },
    { photoId: 'pier', zoom: 1.3, ox: -0.05, oy: 0 },
  ],
  selectedPanel: 0,
  pickedPhotoId: null,
};

let photoSeq = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image: ' + url));
    img.src = url;
  });
}

/** Splits the cover into panel rectangles for a layout, with a dark gutter. */
export function panelRects(layout, w, h) {
  const g = Math.max(4, Math.round(w * 0.008));
  const full = { x: 0, y: 0, w, h };
  if (layout === 'solo') return [full];
  if (layout === 'duo') {
    const half = (w - g) / 2;
    return [
      { x: 0, y: 0, w: half, h },
      { x: half + g, y: 0, w: half, h },
    ];
  }
  if (layout === 'trio') {
    const leftW = Math.round(w * 0.58);
    const rightX = leftW + g;
    const rightW = w - rightX;
    const halfH = (h - g) / 2;
    return [
      { x: 0, y: 0, w: leftW, h },
      { x: rightX, y: 0, w: rightW, h: halfH },
      { x: rightX, y: halfH + g, w: rightW, h: halfH },
    ];
  }
  const halfW = (w - g) / 2;
  const halfH = (h - g) / 2;
  return [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW + g, y: 0, w: halfW, h: halfH },
    { x: 0, y: halfH + g, w: halfW, h: halfH },
    { x: halfW + g, y: halfH + g, w: halfW, h: halfH },
  ];
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
export function drawPanelPhoto(c, rect, img, panel) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panel.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + panel.oy * rect.h;
  c.drawImage(img, dx, dy, dw, dh);
}

/** Tints one panel with the grade's colour wash. */
export function applyGradeWash(c, rect, grade) {
  const wash = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  c.save();
  c.globalCompositeOperation = grade.mode;
  c.globalAlpha = grade.alpha;
  c.fillStyle = wash;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);
  c.restore();
}

/** Draws the placeholder shown in a panel with no photo yet. */
export function drawEmptyPanel(c, rect, label) {
  const grad = c.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, '#2a1745');
  grad.addColorStop(1, '#120a1e');
  c.fillStyle = grad;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.font = `800 ${Math.round(rect.w * 0.055)}px "Segoe UI", Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Draws the bold poster caption with its scrim, in the grade's accent colour. */
export function drawCaption(c, w, h, grade) {
  const onTop = state.captionPos === 'top';
  const title = state.title.trim();
  const subtitle = state.subtitle.trim();
  if (!title && !subtitle) return;

  const scrimH = h * 0.34;
  const scrim = c.createLinearGradient(0, onTop ? 0 : h - scrimH, 0, onTop ? scrimH : h);
  if (onTop) {
    scrim.addColorStop(0, 'rgba(0,0,0,0.62)');
    scrim.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.62)');
  }
  c.fillStyle = scrim;
  c.fillRect(0, onTop ? 0 : h - scrimH, w, scrimH);

  const padX = w * 0.045;
  const maxTextW = w - padX * 2;
  let titlePx = Math.round(w * 0.088);
  const titleFont = (px) => `italic 900 ${px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.font = titleFont(titlePx);
  if ('letterSpacing' in c) c.letterSpacing = '1px';
  while (title && c.measureText(title.toUpperCase()).width > maxTextW && titlePx > 18) {
    titlePx -= 2;
    c.font = titleFont(titlePx);
  }
  const titleY = onTop ? h * 0.055 + titlePx : h - h * 0.075 - (subtitle ? titlePx * 0.42 : 0);
  c.save();
  c.translate(padX, titleY);
  c.transform(1, 0, -0.06, 1, 0, 0);
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.9)';
  c.lineWidth = Math.max(3, titlePx * 0.09);
  c.shadowColor = 'rgba(0,0,0,0.65)';
  c.shadowBlur = titlePx * 0.14;
  c.shadowOffsetY = titlePx * 0.05;
  c.strokeText(title.toUpperCase(), 0, 0);
  c.fillStyle = '#ffffff';
  c.fillText(title.toUpperCase(), 0, 0);
  c.restore();

  if (subtitle) {
    const subPx = Math.round(titlePx * 0.34);
    c.font = `800 ${subPx}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
    if ('letterSpacing' in c) c.letterSpacing = `${Math.round(subPx * 0.28)}px`;
    c.shadowColor = 'rgba(0,0,0,0.8)';
    c.shadowBlur = subPx * 0.3;
    c.shadowOffsetY = 2;
    c.fillStyle = grade.accent;
    const subY = onTop ? titleY + titlePx * 0.62 : h - h * 0.045;
    c.fillText(subtitle.toUpperCase(), padX, subY);
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
  }
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

/** Draws the whole cover — panels, grade, vignette, caption — onto a context. */
export function drawCover(c, w, h) {
  const grade = GRADES[state.grade];
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#0b0714';
  c.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  const count = LAYOUTS[state.layout];
  for (let i = 0; i < count; i += 1) {
    const rect = rects[i];
    const panel = state.panels[i];
    const photo = state.photos.find((p) => p.id === panel.photoId);
    c.save();
    c.beginPath();
    c.rect(rect.x, rect.y, rect.w, rect.h);
    c.clip();
    if (photo && photo.img) {
      c.filter = grade.filter;
      drawPanelPhoto(c, rect, photo.img, panel);
      c.filter = 'none';
      applyGradeWash(c, rect, grade);
    } else {
      drawEmptyPanel(c, rect, 'PANEL ' + (i + 1));
    }
    c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.lineWidth = Math.max(2, w * 0.002);
    c.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  const vig = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.30)');
  c.fillStyle = vig;
  c.fillRect(0, 0, w, h);
  drawCaption(c, w, h, grade);
}

/** Redraws the live preview at the state's current size. */
export function renderPreview() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, w, h);
  document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('.pos-btn').forEach((b) => b.classList.toggle('active', b.dataset.pos === state.captionPos));
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  syncDeepLink();
}

/** Renders a cover of the given size to a PNG blob for download. */
export function exportCover(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h);
  return new Promise((resolve, reject) => {
    off.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Export failed'));
    }, 'image/png');
  });
}

async function downloadExport(sizeKey) {
  try {
    const blob = await exportCover(sizeKey);
    const [w, h] = SIZES[sizeKey];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${w}x${h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    statusEl.textContent = `Saved vice-panels-${w}x${h}.png`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (err) {
    statusEl.textContent = 'Export failed: ' + err.message;
  }
}

/** Registers a loaded photo, returns its id. */
export function addPhoto(img, name, id) {
  const photo = { id: id || `photo-${++photoSeq}`, name, img };
  state.photos.push(photo);
  renderLibrary();
  renderPanelRows();
  return photo.id;
}

async function loadSample(key) {
  const sample = SAMPLES[key];
  if (!sample) return;
  if (state.photos.some((p) => p.id === sample.id)) {
    state.pickedPhotoId = sample.id;
    renderLibrary();
    return;
  }
  try {
    const img = await loadImage(sample.url);
    addPhoto(img, sample.name, sample.id);
    state.pickedPhotoId = sample.id;
    renderLibrary();
    renderPreview();
  } catch (err) {
    statusEl.textContent = 'Could not load sample: ' + err.message;
  }
}

function renderLibrary() {
  libraryEl.innerHTML = '';
  for (const photo of state.photos) {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name + ' — click, then click a panel to place it';
    if (photo.id === state.pickedPhotoId) thumb.classList.add('picked');
    thumb.addEventListener('click', () => {
      state.pickedPhotoId = photo.id;
      renderLibrary();
    });
    libraryEl.appendChild(thumb);
  }
}

function renderPanelRows() {
  const count = LAYOUTS[state.layout];
  panelRowsEl.innerHTML = '';
  for (let i = 0; i < 4; i += 1) {
    const panel = state.panels[i];
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === state.selectedPanel ? ' selected' : '') + (i >= count ? ' disabled' : '');
    const name = document.createElement('span');
    name.className = 'panel-name';
    name.textContent = 'Panel ' + (i + 1);
    const controls = document.createElement('div');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Photo for panel ' + (i + 1));
    select.disabled = i >= count;
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Empty';
    select.appendChild(empty);
    for (const photo of state.photos) {
      const opt = document.createElement('option');
      opt.value = photo.id;
      opt.textContent = photo.name;
      select.appendChild(opt);
    }
    select.value = panel.photoId || '';
    select.addEventListener('change', () => {
      panel.photoId = select.value || null;
      renderPreview();
    });
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '100';
    zoom.max = '300';
    zoom.value = String(Math.round(panel.zoom * 100));
    zoom.disabled = i >= count;
    zoom.setAttribute('aria-label', 'Zoom for panel ' + (i + 1));
    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'zoom-label';
    zoomLabel.textContent = 'Zoom ' + Math.round(panel.zoom * 100) + '%';
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value) / 100;
      zoomLabel.textContent = 'Zoom ' + zoom.value + '%';
      renderPreview();
    });
    controls.append(select, zoom, zoomLabel);
    row.append(name, controls);
    row.addEventListener('click', () => {
      state.selectedPanel = i;
      renderPanelRows();
    });
    panelRowsEl.appendChild(row);
  }
}

/** Reads the deep link (?layout=&grade=&title=&subtitle=&pos=&size=&photo=). */
export function applyDeepLink() {
  const q = new URLSearchParams(location.search);
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
  if (q.get('title')) state.title = q.get('title');
  if (q.get('subtitle')) state.subtitle = q.get('subtitle');
  if (q.get('pos') === 'top' || q.get('pos') === 'bottom') state.captionPos = q.get('pos');
  if (q.get('size') && SIZES[q.get('size')]) state.size = q.get('size');
  return (q.get('photo') || '').split(',').filter((k) => SAMPLES[k]);
}

/** Writes the current state back into the URL so a cover can be shared. */
export function syncDeepLink() {
  const q = new URLSearchParams();
  q.set('layout', state.layout);
  q.set('grade', state.grade);
  q.set('title', state.title);
  q.set('subtitle', state.subtitle);
  q.set('pos', state.captionPos);
  q.set('size', state.size);
  const sampleIds = state.photos.map((p) => p.id).filter((id) => SAMPLES[id]);
  if (sampleIds.length) q.set('photo', sampleIds.join(','));
  history.replaceState(null, '', location.pathname + '?' + q.toString());
}

function photoAtPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const count = LAYOUTS[state.layout];
  for (let i = 0; i < count; i += 1) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  const i = photoAtPoint(e.clientX, e.clientY);
  if (i < 0) return;
  state.selectedPanel = i;
  if (state.pickedPhotoId) {
    state.panels[i].photoId = state.pickedPhotoId;
    state.pickedPhotoId = null;
    renderLibrary();
    renderPanelRows();
    renderPreview();
  }
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  renderPanelRows();
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[state.selectedPanel];
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const r = rects[state.selectedPanel];
  panel.ox += ((e.clientX - lastX) / rect.width) * (canvas.width / r.w);
  panel.oy += ((e.clientY - lastY) / rect.height) * (canvas.height / r.h);
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
  lastX = e.clientX;
  lastY = e.clientY;
  renderPreview();
});

canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selectedPanel];
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * factor));
  renderPanelRows();
  renderPreview();
}, { passive: false });

document.getElementById('photoInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      const id = addPhoto(img, file.name.replace(/\.[^.]+$/, ''));
      state.pickedPhotoId = id;
    } catch (err) {
      statusEl.textContent = 'Could not load ' + file.name;
    }
  }
  renderLibrary();
  renderPreview();
  e.target.value = '';
});

document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier'));

document.querySelectorAll('.layout-btn').forEach((b) => b.addEventListener('click', () => {
  state.layout = b.dataset.layout;
  state.selectedPanel = 0;
  renderPanelRows();
  renderPreview();
}));
document.querySelectorAll('.grade-btn').forEach((b) => b.addEventListener('click', () => {
  state.grade = b.dataset.grade;
  renderPreview();
}));
document.querySelectorAll('.pos-btn').forEach((b) => b.addEventListener('click', () => {
  state.captionPos = b.dataset.pos;
  renderPreview();
}));
document.querySelectorAll('.size-btn').forEach((b) => b.addEventListener('click', () => {
  state.size = b.dataset.size;
  renderPreview();
}));

document.getElementById('titleInput').addEventListener('input', (e) => {
  state.title = e.target.value;
  renderPreview();
});
document.getElementById('subtitleInput').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  renderPreview();
});

document.getElementById('exportSquare').addEventListener('click', () => downloadExport('1080x1080'));
document.getElementById('exportPortrait').addEventListener('click', () => downloadExport('1080x1350'));
document.getElementById('exportLandscape').addEventListener('click', () => downloadExport('1920x1080'));

// Test hook: lets automated checks drive exports without touching the UI.
window.VicePanels = { state, exportCover, renderPreview, drawCover };

// Boot: deep-link state first, then the requested sample photos, then paint.
const bootSamples = applyDeepLink();
document.getElementById('titleInput').value = state.title;
document.getElementById('subtitleInput').value = state.subtitle;
renderPanelRows();
renderPreview();
Promise.all(bootSamples.map((key) => loadSample(key))).then(() => {
  renderLibrary();
  renderPanelRows();
  renderPreview();
});

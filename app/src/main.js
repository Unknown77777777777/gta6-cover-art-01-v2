// Vice Panels: a multi-panel poster cover maker. All work happens in the browser;
// photos are read locally and never uploaded anywhere.
const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

const GRADES = {
  sunset: { sky: ['#2b0f54', '#8a1d6d', '#ff2e63', '#ff6a3d', '#ffb347'], band: '#160a2e', text: '#ffffff', accent: '#ffd166', tint: 'rgba(255, 90, 60, 0.10)' },
  neon: { sky: ['#05001f', '#1b0a5e', '#ff2e88', '#00e5ff'], band: '#05001f', text: '#eafcff', accent: '#00e5ff', tint: 'rgba(0, 229, 255, 0.10)' },
  palm: { sky: ['#123524', '#1e6f4a', '#f2a541', '#ff7a59'], band: '#0c2418', text: '#fff7e6', accent: '#f2a541', tint: 'rgba(242, 165, 65, 0.10)' },
  noir: { sky: ['#000000', '#2b2b33', '#6e6e7a', '#d9d9de'], band: '#000000', text: '#ffffff', accent: '#d9d9de', tint: 'rgba(255, 255, 255, 0.08)' },
};

// Panel rectangles as fractions of the cover, per layout.
const LAYOUTS = {
  solo: [[0, 0, 1, 1]],
  duo: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
  trio: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5]],
  quad: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
};

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

const state = {
  photos: [], // { name, img }
  layout: 'trio',
  panels: [], // { photo: index into photos or -1, zoom, ox, oy }
  selected: 0,
  grade: 'sunset',
  capPos: 'bottom',
  title: 'VICE CITY NIGHTS',
  subtitle: 'My story, my streets.',
  size: '1080x1080',
};

function freshPanels(layout) {
  return LAYOUTS[layout].map((_, i) => ({
    photo: state.photos.length ? (i % state.photos.length) : -1,
    zoom: 1, ox: 0, oy: 0, manual: false,
  }));
}

function fitRect(img, x, y, w, h, zoom, ox, oy) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  return { dx: x + (w - dw) / 2 + ox * w, dy: y + (h - dh) / 2 + oy * h, dw, dh };
}

function drawSun(c, cx, cy, r, grade) {
  const g = c.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, grade.accent);
  g.addColorStop(1, grade.sky[2] || '#ff2e63');
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.fillStyle = grade.band;
  for (let i = 0; i < 4; i++) {
    const y = cy + r * (0.05 + i * 0.22);
    c.fillRect(cx - r, y, r * 2, r * 0.07);
  }
  c.restore();
}

function wrapText(c, text, x, y, maxW, lineH) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else { cur = t; }
  }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => c.fillText(ln, x, y + i * lineH));
  return lines.length;
}

function drawCover(c, W, H) {
  const grade = GRADES[state.grade];
  const g = c.createLinearGradient(0, 0, W, H);
  grade.sky.forEach((col, i) => g.addColorStop(i / (grade.sky.length - 1), col));
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  const gap = Math.round(W * 0.012);
  const bandH = Math.round(H * (state.title.length > 22 ? 0.24 : 0.20));
  const photoTop = state.capPos === 'top' ? bandH : 0;
  const photoH = H - bandH;

  // Decorative sun peeking behind the panels, top corner.
  drawSun(c, W * 0.86, photoTop + photoH * 0.16, W * 0.09, grade);

  const rects = LAYOUTS[state.layout];
  rects.forEach((r, i) => {
    const px = r[0] * W + gap, py = photoTop + r[1] * photoH + gap;
    const pw = r[2] * W - gap * 2, ph = r[3] * photoH - gap * 2;
    const p = state.panels[i];
    c.save();
    c.beginPath(); c.rect(px, py, pw, ph); c.clip();
    const photo = p && p.photo >= 0 ? state.photos[p.photo] : null;
    if (photo) {
      const f = fitRect(photo.img, px, py, pw, ph, p.zoom, p.ox, p.oy);
      c.drawImage(photo.img, f.dx, f.dy, f.dw, f.dh);
      c.fillStyle = grade.tint; c.fillRect(px, py, pw, ph);
    } else {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(px, py, pw, ph);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.font = `800 ${Math.round(W * 0.028)}px system-ui, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    }
    // Thin bright frame per panel.
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = Math.max(2, W * 0.004);
    c.strokeRect(px, py, pw, ph);
    c.restore();
  });

  // Caption banner.
  const by = state.capPos === 'top' ? 0 : H - bandH;
  c.fillStyle = grade.band; c.fillRect(0, by, W, bandH);
  c.fillStyle = grade.accent; c.fillRect(0, by + (state.capPos === 'top' ? bandH - 6 : 0), W, 6);
  const pad = W * 0.045;
  c.fillStyle = grade.text;
  c.textBaseline = 'alphabetic';
  let titleSize = Math.min(W * 0.105, (W - pad * 2) / Math.max(4, state.title.length) * 1.9);
  c.font = `italic 900 ${Math.round(titleSize)}px system-ui, sans-serif`;
  // Shrink the title until it fits on one line instead of spilling over the banner.
  const titleW = c.measureText(state.title.toUpperCase()).width;
  if (titleW > W - pad * 2) titleSize = Math.max(W * 0.045, Math.floor(titleSize * (W - pad * 2) / titleW * 0.97));
  c.font = `italic 900 ${Math.round(titleSize)}px system-ui, sans-serif`;
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 0; c.shadowOffsetX = Math.round(W * 0.006); c.shadowOffsetY = Math.round(W * 0.006);
  const ty = by + bandH * (state.subtitle ? 0.46 : 0.62);
  const titleLines = wrapText(c, state.title.toUpperCase(), pad, ty, W - pad * 2, titleSize * 1.05);
  c.shadowOffsetX = 0; c.shadowOffsetY = 0;
  if (state.subtitle) {
    c.font = `600 ${Math.round(W * 0.032)}px system-ui, sans-serif`;
    c.fillStyle = grade.accent;
    wrapText(c, state.subtitle, pad, by + bandH * (titleLines > 1 ? 0.94 : 0.82), W - pad * 2, W * 0.04);
  }
}

function render() {
  const [W, H] = SIZES[state.size];
  canvas.width = W; canvas.height = H;
  drawCover(ctx, W, H);
  $('status').textContent = `${state.photos.length} photo(s) · ${state.layout} layout · ${state.grade} grade · ${state.size}`;
}

function rebuildPanelEditors() {
  const host = $('panelEditors');
  host.innerHTML = '';
  state.panels.forEach((p, i) => {
    const box = document.createElement('div');
    box.className = 'paneled' + (i === state.selected ? ' selected' : '');
    const h = document.createElement('h3');
    h.textContent = `Panel ${i + 1}`;
    box.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'grid2';
    const mk = (label, node) => {
      const l = document.createElement('label');
      l.textContent = label; l.appendChild(node); grid.appendChild(l);
    };
    const sel = document.createElement('select');
    const none = document.createElement('option');
    none.value = '-1'; none.textContent = '(empty)'; sel.appendChild(none);
    state.photos.forEach((ph, pi) => {
      const o = document.createElement('option');
      o.value = String(pi); o.textContent = ph.name; sel.appendChild(o);
    });
    sel.value = String(p.photo);
    sel.addEventListener('change', () => { p.photo = Number(sel.value); p.manual = true; render(); });
    mk('Photo', sel);
    const zoom = document.createElement('input');
    zoom.type = 'range'; zoom.min = '1'; zoom.max = '3'; zoom.step = '0.05'; zoom.value = String(p.zoom);
    zoom.addEventListener('input', () => { p.zoom = Number(zoom.value); render(); });
    mk('Zoom', zoom);
    const ox = document.createElement('input');
    ox.type = 'range'; ox.min = '-0.5'; ox.max = '0.5'; ox.step = '0.02'; ox.value = String(p.ox);
    ox.addEventListener('input', () => { p.ox = Number(ox.value); render(); });
    mk('Shift X', ox);
    const oy = document.createElement('input');
    oy.type = 'range'; oy.min = '-0.5'; oy.max = '0.5'; oy.step = '0.02'; oy.value = String(p.oy);
    oy.addEventListener('input', () => { p.oy = Number(oy.value); render(); });
    mk('Shift Y', oy);
    box.appendChild(grid);
    box.addEventListener('click', () => { state.selected = i; rebuildPanelEditors(); render(); });
    host.appendChild(box);
  });
  $('photocount').textContent = state.photos.length
    ? `${state.photos.length} photo(s) loaded: ${state.photos.map((p) => p.name).join(', ')}`
    : 'No photos yet — add one or pick a sample.';
}

function addPhoto(name, img) {
  state.photos.push({ name, img });
  // Spread photos across panels the user has not hand-picked yet, so a second
  // photo actually shows up instead of every panel keeping the first one.
  state.panels.forEach((p, i) => { if (!p.manual) p.photo = i % state.photos.length; });
  rebuildPanelEditors(); render();
}

function loadSample(name) {
  const img = new Image();
  img.onload = () => addPhoto(name + '.jpg', img);
  img.onerror = () => { $('status').textContent = `Could not load sample ${name}.`; };
  img.src = `./samples/${name}.jpg`;
}

function setLayout(layout) {
  state.layout = layout;
  state.panels = freshPanels(layout);
  state.selected = 0;
  document.querySelectorAll('#layouts button').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === layout));
  rebuildPanelEditors(); render();
}

async function exportPNG() {
  const [W, H] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  drawCover(off.getContext('2d'), W, H);
  const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `vice-panels-${state.size}.png`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  window.__lastExport = off.toDataURL('image/png');
  window.__lastExportSize = [W, H];
  $('status').textContent = `Exported ${W} x ${H} PNG (${Math.round(blob.size / 1024)} KiB).`;
  return blob;
}

// ---- wiring ----
$('upload').addEventListener('change', (e) => {
  for (const file of e.target.files) {
    const img = new Image();
    img.onload = () => addPhoto(file.name, img);
    img.src = URL.createObjectURL(file);
  }
  e.target.value = '';
});
document.querySelectorAll('[data-sample]').forEach((b) =>
  b.addEventListener('click', () => loadSample(b.dataset.sample)));
document.querySelectorAll('#layouts button').forEach((b) =>
  b.addEventListener('click', () => setLayout(b.dataset.layout)));
$('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; render(); });
$('capPos').addEventListener('change', (e) => { state.capPos = e.target.value; render(); });
$('expsize').addEventListener('change', (e) => { state.size = e.target.value; render(); });
$('export').addEventListener('click', exportPNG);
$('reset').addEventListener('click', () => {
  state.photos = []; state.panels = freshPanels(state.layout);
  state.title = 'VICE CITY NIGHTS'; state.subtitle = 'My story, my streets.';
  $('title').value = state.title; $('subtitle').value = state.subtitle;
  rebuildPanelEditors(); render();
});

// Drag to pan the selected panel, scroll to zoom it.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}
function panelAt(fx, fy) {
  const [W, H] = SIZES[state.size];
  const bandH = H * 0.20;
  const photoTop = state.capPos === 'top' ? bandH : 0;
  const photoH = H - bandH;
  return LAYOUTS[state.layout].findIndex((rc) =>
    fx >= rc[0] && fx < rc[0] + rc[2] &&
    fy * H >= photoTop + rc[1] * photoH && fy * H < photoTop + (rc[1] + rc[3]) * photoH);
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const idx = panelAt(p.x, p.y);
  if (idx >= 0) {
    state.selected = idx; rebuildPanelEditors();
    drag = { x: p.x, y: p.y, ox: state.panels[idx].ox, oy: state.panels[idx].oy };
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selected];
  panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (p.x - drag.x)));
  panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (p.y - drag.y)));
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; rebuildPanelEditors(); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  render(); rebuildPanelEditors();
}, { passive: false });

// Deep links for sharing a setup and for screenshots: ?photo=pier&caption=...&layout=trio&grade=neon&shot=editor
const q = new URLSearchParams(location.search);
if (q.get('title')) { state.title = q.get('title'); $('title').value = state.title; }
if (q.get('subtitle')) { state.subtitle = q.get('subtitle'); $('subtitle').value = state.subtitle; }
if (q.get('caption')) { state.title = q.get('caption'); $('title').value = state.title; }
if (q.get('grade') && GRADES[q.get('grade')]) { state.grade = q.get('grade'); $('grade').value = state.grade; }
if (q.get('size') && SIZES[q.get('size')]) { state.size = q.get('size'); $('expsize').value = state.size; }
if (q.get('capPos')) { state.capPos = q.get('capPos'); $('capPos').value = state.capPos; }
if (q.get('shot') === 'cover') document.body.classList.add('shot-cover');
const startLayout = q.get('layout') && LAYOUTS[q.get('layout')] ? q.get('layout') : 'trio';
state.panels = freshPanels(startLayout);
state.layout = startLayout;
document.querySelectorAll('#layouts button').forEach((b) =>
  b.classList.toggle('active', b.dataset.layout === startLayout));
rebuildPanelEditors();
render();
const startPhoto = q.get('photo');
if (startPhoto) loadSample(startPhoto);
if (q.get('photo2')) loadSample(q.get('photo2'));
window.__vicePanelsReady = true;

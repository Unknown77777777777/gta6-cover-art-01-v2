// cover.js — pure cover rendering for Vice Panels.
// Computes multi-panel layouts and draws the finished cover onto a
// canvas at any export size. No network, no dependencies.

export const LAYOUTS = ['hero', 'quad', 'triptych', 'single'];

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'sepia(0.38) saturate(1.55) hue-rotate(-14deg) brightness(1.06) contrast(1.06)',
    cssFilter: 'sepia(0.38) saturate(1.55) hue-rotate(-14deg) brightness(1.06) contrast(1.06)',
    tint: ['rgba(255, 122, 26, 0.20)', 'rgba(255, 45, 120, 0.16)'],
    blend: 'overlay',
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.95) hue-rotate(16deg) contrast(1.16) brightness(1.03)',
    cssFilter: 'saturate(1.95) hue-rotate(16deg) contrast(1.16) brightness(1.03)',
    tint: ['rgba(255, 0, 170, 0.22)', 'rgba(0, 229, 255, 0.20)'],
    blend: 'soft-light',
  },
  dusk: {
    label: 'Dusk',
    filter: 'saturate(1.25) hue-rotate(26deg) brightness(0.82) contrast(1.14)',
    cssFilter: 'saturate(1.25) hue-rotate(26deg) brightness(0.82) contrast(1.14)',
    tint: ['rgba(88, 28, 135, 0.30)', 'rgba(10, 8, 32, 0.28)'],
    blend: 'overlay',
  },
};

export const EXPORT_SIZES = [
  { label: '1080 × 1080 (square)', w: 1080, h: 1080 },
  { label: '1080 × 1350 (portrait)', w: 1080, h: 1350 },
  { label: '1920 × 1080 (landscape)', w: 1920, h: 1080 },
];

// Panel rectangles as fractions of the cover (x, y, w, h in 0..1).
// Every layout leaves a thin even gap between panels.
export function panelRects(layout, count) {
  const g = 0.012;
  if (layout === 'single') return [{ x: 0, y: 0, w: 1, h: 1 }];
  if (layout === 'quad') {
    const half = (1 - g) / 2;
    return [
      { x: 0, y: 0, w: half, h: half },
      { x: half + g, y: 0, w: half, h: half },
      { x: 0, y: half + g, w: half, h: half },
      { x: half + g, y: half + g, w: half, h: half },
    ];
  }
  if (layout === 'triptych') {
    const third = (1 - 2 * g) / 3;
    return [
      { x: 0, y: 0, w: third, h: 1 },
      { x: third + g, y: 0, w: third, h: 1 },
      { x: 2 * (third + g), y: 0, w: third, h: 1 },
    ];
  }
  // hero: one big panel plus two small stacked panels.
  const big = 0.66;
  const small = 1 - big - g;
  const halfH = (1 - g) / 2;
  return [
    { x: 0, y: 0, w: big, h: 1 },
    { x: big + g, y: 0, w: small, h: halfH },
    { x: big + g, y: halfH + g, w: small, h: halfH },
  ].slice(0, Math.max(1, count));
}

function drawPhotoInto(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // Cover-fit the photo inside the panel, then apply the panel's
  // zoom, pan and rotation around the panel centre.
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(w / iw, h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const cx = x + w / 2 + (panel.panX || 0) * w;
  const cy = y + h / 2 + (panel.panY || 0) * h;
  ctx.translate(cx, cy);
  ctx.rotate(((panel.rotate || 0) * Math.PI) / 180);
  ctx.filter = grade.filter;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

function paintGrade(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, grade.tint[0]);
  grad.addColorStop(1, grade.tint[1]);
  ctx.save();
  ctx.globalCompositeOperation = grade.blend;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Gentle vignette so the caption stays readable at the edges.
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.42,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.save();
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function paintCaption(ctx, W, H, caption) {
  const text = (caption.text || '').trim();
  if (!text) return;
  const size = Math.round(H * (caption.sizePct || 9) / 100);
  const font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const up = text.toUpperCase();
  const maxW = W * 0.92;
  // Shrink the lettering until it fits the cover width.
  let fit = size;
  while (fit > 12 && ctx.measureText(up).width > maxW) {
    fit = Math.round(fit * 0.94);
    ctx.font = `900 ${fit}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  }
  let cy = H * 0.86;
  if (caption.position === 'top') cy = H * 0.12;
  if (caption.position === 'middle') cy = H * 0.5;
  const cx = W / 2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = Math.round(fit * 0.16);
  ctx.shadowOffsetY = Math.round(fit * 0.05);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, Math.round(fit / 11));
  ctx.strokeStyle = 'rgba(12, 6, 20, 0.92)';
  ctx.strokeText(up, cx, cy);
  ctx.fillStyle = caption.color || '#ffffff';
  ctx.fillText(up, cx, cy);
  ctx.restore();
}

// Draws the whole cover described by `state` onto `canvas` at W x H.
// `images` maps photo id -> loaded HTMLImageElement (or canvas).
// `state` shape: { layout, grade, caption:{text,sizePct,color,position},
//   panels:[{photo,zoom,panX,panY,rotate}, ...] }
export function renderCover(canvas, W, H, state, images) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, W, H);
  const rects = panelRects(state.layout, state.panels.length);
  rects.forEach((frac, i) => {
    const panel = state.panels[i] || state.panels[0];
    const img = images[panel.photo];
    const rect = { x: frac.x * W, y: frac.y * H, w: frac.w * W, h: frac.h * H };
    if (img) drawPhotoInto(ctx, img, rect, panel, grade);
    paintGrade(ctx, rect, grade);
  });
  paintCaption(ctx, W, H, state.caption);
  return canvas;
}

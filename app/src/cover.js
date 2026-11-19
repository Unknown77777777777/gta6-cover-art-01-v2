// Vice Panels cover renderer: draws a multi-panel poster onto any canvas.
// state: { photos[4], crops[{zoom,x,y} x4], title, subtitle, grade, layout }
// grades are our own sunset / neon palettes — no game artwork, logo or font.
// Every font used is the system sans stack (Arial Black / sans-serif).

export const GRADES = {
  sunset: { sky: ['#ff9a3d', '#ff5e7a', '#7b2fbe'], glow: '#ffce4d', tint: 'rgba(255,94,122,0.30)', band: '#160a24' },
  neon: { sky: ['#00e5ff', '#ff2fb3', '#6a00ff'], glow: '#00e5ff', tint: 'rgba(255,47,179,0.30)', band: '#0a0618' },
  dusk: { sky: ['#ffb347', '#ff6b35', '#1b2a6b'], glow: '#ffb347', tint: 'rgba(255,107,53,0.28)', band: '#101a33' },
};

/** Panel rectangles for a layout, in canvas pixels. Returns 4 rects. */
export function panelRects(layout, w, h) {
  const gap = Math.round(Math.min(w, h) * 0.012);
  const x0 = gap, y0 = gap, x1 = w - gap, y1 = h - gap;
  if (layout === 'quad') {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return [
      { x: x0, y: y0, w: mx - x0 - gap / 2, h: my - y0 - gap / 2 },
      { x: mx + gap / 2, y: y0, w: x1 - mx - gap / 2, h: my - y0 - gap / 2 },
      { x: x0, y: my + gap / 2, w: mx - x0 - gap / 2, h: y1 - my - gap / 2 },
      { x: mx + gap / 2, y: my + gap / 2, w: x1 - mx - gap / 2, h: y1 - my - gap / 2 },
    ];
  }
  if (layout === 'triptych') {
    // Two tall columns + a right column split in two; all four sit above the title band.
    const bandTop = y1 - h * 0.16;
    const cw = (x1 - x0 - gap * 2) / 3;
    const rh = (bandTop - y0 - gap) / 2;
    return [
      { x: x0, y: y0, w: cw, h: bandTop - y0 },
      { x: x0 + cw + gap, y: y0, w: cw, h: bandTop - y0 },
      { x: x0 + (cw + gap) * 2, y: y0, w: cw, h: rh },
      { x: x0 + (cw + gap) * 2, y: y0 + rh + gap, w: cw, h: rh },
    ];
  }
  // hero (default): big hero panel + 3 smaller ones. Wide canvases get the
  // hero on the left (tall, so a square photo's face survives) with one wide
  // panel above two portrait ones on the right; other aspects get the hero
  // on top with three panels along the foot.
  if (w >= h * 1.2) {
    const split = x0 + (x1 - x0) * 0.56;
    const midY = y0 + (y1 - y0) * 0.5;
    const rw = (x1 - split - gap) / 2;
    return [
      { x: x0, y: y0, w: split - x0 - gap, h: y1 - y0 },
      { x: split, y: y0, w: x1 - split, h: midY - y0 - gap },
      { x: split, y: midY, w: rw, h: y1 - midY },
      { x: split + rw + gap, y: midY, w: rw, h: y1 - midY },
    ];
  }
  const splitY = y0 + (y1 - y0) * 0.56;
  const sw = (x1 - x0 - gap * 2) / 3;
  return [
    { x: x0, y: y0, w: x1 - x0, h: splitY - y0 - gap },
    { x: x0, y: splitY, w: sw, h: y1 - splitY },
    { x: x0 + sw + gap, y: splitY, w: sw, h: y1 - splitY },
    { x: x0 + (sw + gap) * 2, y: splitY, w: sw, h: y1 - splitY },
  ];
}

function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  }
  return size;
}

function drawPalm(ctx, x, y, s, color) {
  // One small silhouette palm: a leaning trunk, fronds drooping out and down.
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s * 0.045); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.05, y - s * 0.5, x + s * 0.16, y - s * 0.85); ctx.stroke();
  const topX = x + s * 0.16, topY = y - s * 0.85;
  const fronds = [-1, -0.55, -0.15, 0.3, 0.75, 1.15];
  for (const f of fronds) {
    const ex = topX + f * s * 0.42;
    const ey = topY + s * (0.1 + Math.abs(f) * 0.16);
    ctx.beginPath(); ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + f * s * 0.3, topY - s * 0.22, ex, ey); ctx.stroke();
  }
  ctx.restore();
}

function drawPanelPhoto(ctx, rect, photo, crop, grade, index) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (photo) {
    const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * crop.zoom;
    const pw = photo.naturalWidth * base, ph = photo.naturalHeight * base;
    // Pan is clamped to the overflow, so the photo always covers the panel.
    const ox = Math.max(-(pw - w) / 2, Math.min((pw - w) / 2, crop.x * w * 0.55));
    const oy = Math.max(-(ph - h) / 2, Math.min((ph - h) / 2, crop.y * h * 0.55));
    ctx.drawImage(photo, x + (w - pw) / 2 + ox, y + (h - ph) / 2 + oy, pw, ph);
  } else {
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, grade.sky[0]); sky.addColorStop(0.55, grade.sky[1]); sky.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = grade.glow; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.38, Math.min(w, h) * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    drawPalm(ctx, x + w * 0.16, y + h, Math.min(w, h) * 0.55, 'rgba(10,4,20,0.85)');
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `900 ${Math.max(13, Math.min(w, h) * 0.09)}px "Arial Black", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD PHOTO', x + w / 2, y + h * 0.52);
    ctx.font = `700 ${Math.max(10, Math.min(w, h) * 0.055)}px Arial, sans-serif`;
    ctx.fillText(`PANEL ${index + 1}`, x + w / 2, y + h * 0.62);
  }
  // Sunset / neon grade wash, stronger at the bottom of each panel.
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, 'rgba(255,206,77,0.05)');
  wash.addColorStop(0.6, 'rgba(0,0,0,0)');
  wash.addColorStop(1, grade.tint);
  ctx.fillStyle = wash; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
  ctx.strokeRect(x, y, w, h);
}

/** Draws the full multi-panel cover onto `canvas` at its own pixel size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = panelRects(state.layout, w, h);
  ctx.fillStyle = '#0d0518'; ctx.fillRect(0, 0, w, h);
  rects.forEach((r, i) => drawPanelPhoto(ctx, r, state.photos[i] || null, state.crops[i], grade, i));

  // Sun on the hero panel (hero layout only — in the other layouts the hero
  // panel is small and the disc would land on the subject's face).
  if (state.layout === 'hero') {
    const hero = rects[0];
    const sunR = Math.min(hero.w, hero.h) * 0.13;
    const sunX = hero.x + hero.w * 0.84, sunY = hero.y + hero.h * 0.2;
    const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.6);
    glow.addColorStop(0, grade.glow + 'aa'); glow.addColorStop(1, grade.glow + '00');
    ctx.fillStyle = glow; ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
    const disc = ctx.createRadialGradient(sunX - sunR * 0.25, sunY - sunR * 0.25, sunR * 0.1, sunX, sunY, sunR);
    disc.addColorStop(0, '#fff7cf'); disc.addColorStop(0.6, grade.glow); disc.addColorStop(1, grade.sky[0]);
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
  }

  // Title band across the foot of the cover.
  const bandH = Math.round(h * 0.155);
  const bandY = h - bandH;
  ctx.fillStyle = grade.band; ctx.globalAlpha = 0.94; ctx.fillRect(0, bandY, w, bandH); ctx.globalAlpha = 1;
  ctx.fillStyle = grade.glow; ctx.fillRect(0, bandY, w, Math.max(3, h * 0.006));
  const title = (state.title || '').trim().toUpperCase() || 'SUNSET HEIST';
  const sub = (state.subtitle || '').trim().toUpperCase();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const titleSize = fitFont(ctx, title, w * 0.92, bandH * 0.52);
  ctx.lineWidth = Math.max(3, titleSize * 0.09); ctx.strokeStyle = '#12081d';
  ctx.shadowColor = grade.sky[1]; ctx.shadowBlur = titleSize * 0.25;
  ctx.strokeText(title, w / 2, bandY + bandH * (sub ? 0.36 : 0.5));
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, w / 2, bandY + bandH * (sub ? 0.36 : 0.5));
  ctx.shadowBlur = 0;
  if (sub) {
    ctx.font = `700 ${Math.max(12, bandH * 0.16)}px Arial, sans-serif`;
    ctx.fillStyle = grade.glow;
    ctx.fillText(sub.split('').join(' '), w / 2, bandY + bandH * 0.78);
  }
}

// Vice Panels — cover renderer (canvas, no libraries, no network).
// Draws a multi-panel GTA-poster-style cover: photos in panels, a sunset or
// neon colour grade, and big bold caption lettering drawn with system fonts.
// Every function here is original work for the gta6-cover-art-01 entry.

export const LAYOUTS = {
  hero: {
    label: 'Hero + duo',
    panels: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  trio: {
    label: 'Triptych',
    panels: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
  },
  quad: {
    label: 'Four squares',
    panels: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  banner: {
    label: 'Banner + duo',
    panels: [
      [0, 0, 1, 0.58],
      [0, 0.58, 0.5, 0.42],
      [0.5, 0.58, 0.5, 0.42],
    ],
  },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    photoFilter: 'saturate(1.25) contrast(1.08) brightness(1.03)',
    overlay: [
      ['soft-light', 0.55, ['#ff7a1a', '#ff2e88']],
      ['multiply', 0.12, ['#ff8c00', '#ff8c00']],
    ],
    accent: '#ff9a3d',
  },
  neon: {
    label: 'Neon',
    photoFilter: 'saturate(1.6) contrast(1.12)',
    overlay: [
      ['overlay', 0.5, ['#ff2ea6', '#00e5ff']],
      ['soft-light', 0.35, ['#7b2eff', '#00ffa3']],
    ],
    accent: '#ff5ce1',
  },
  noir: {
    label: 'Noir',
    photoFilter: 'grayscale(1) contrast(1.18) brightness(1.05)',
    overlay: [['soft-light', 0.2, ['#14143c', '#14143c']]],
    accent: '#f2f2f2',
  },
  original: {
    label: 'Original',
    photoFilter: 'none',
    overlay: [],
    accent: '#ffb347',
  },
};

export const TITLE_STYLES = {
  sunset: { label: 'Sunset letters', stops: ['#fff3b0', '#ffb347', '#ff2e63'] },
  neon: { label: 'Neon letters', stops: ['#d8fbff', '#7df9ff', '#ff5ce1'] },
  white: { label: 'White letters', stops: ['#ffffff', '#ffe9f4', '#ffc2dd'] },
};

// Panel rectangles in pixels for a layout inside the inner box.
export function panelRects(layoutName, width, height, margin, gutter) {
  const layout = LAYOUTS[layoutName] || LAYOUTS.hero;
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;
  const half = gutter / 2;
  return layout.panels.map(([fx, fy, fw, fh]) => ({
    x: Math.round(margin + fx * innerW + half),
    y: Math.round(margin + fy * innerH + half),
    w: Math.max(1, Math.round(fw * innerW - gutter)),
    h: Math.max(1, Math.round(fh * innerH - gutter)),
  }));
}

// Cover-fit draw of one photo into a panel rect, with zoom and pan offsets
// ox/oy in [-1, 1] (0 = centred). Returns the drawn size for pan math.
function drawPhotoCover(ctx, img, rect, zoom, ox, oy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * Math.max(0.2, zoom);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2);
  const slackY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 + ox * slackX;
  const dy = rect.y + (rect.h - dh) / 2 + oy * slackY;
  ctx.drawImage(img, dx, dy, dw, dh);
  return { dw, dh, slackX, slackY };
}

function drawEmptyPanel(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#2b1740');
  g.addColorStop(1, '#12081f');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const s = Math.min(rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `700 ${Math.round(s * 0.16)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', rect.x + rect.w / 2, rect.y + rect.h / 2 - s * 0.08);
  ctx.font = `700 ${Math.round(s * 0.045)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2 + s * 0.1);
}

function applyGrade(ctx, width, height, grade) {
  for (const [mode, alpha, [top, bottom]] of grade.overlay) {
    const g = ctx.createLinearGradient(0, 0, width * 0.25, height);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  // Vignette: darken the corners so the caption pops.
  const v = ctx.createRadialGradient(
    width / 2, height * 0.42, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  v.addColorStop(0, 'rgba(10,5,20,0)');
  v.addColorStop(1, 'rgba(10,5,20,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
}

function fitTitleSize(ctx, title, maxWidth, startSize) {
  let size = startSize;
  const family = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
  while (size > 12) {
    ctx.font = `900 ${size}px ${family}`;
    if (ctx.measureText(title).width <= maxWidth) break;
    size = Math.floor(size * 0.92);
  }
  return size;
}

function drawCaption(ctx, width, height, title, subtitle, styleName) {
  const style = TITLE_STYLES[styleName] || TITLE_STYLES.sunset;
  // Legibility band behind the caption.
  const band = ctx.createLinearGradient(0, height * 0.58, 0, height);
  band.addColorStop(0, 'rgba(8,4,14,0)');
  band.addColorStop(1, 'rgba(8,4,14,0.66)');
  ctx.fillStyle = band;
  ctx.fillRect(0, height * 0.58, width, height * 0.42);

  const family = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
  const cleanTitle = (title || 'UNTITLED').toUpperCase().trim() || 'UNTITLED';
  const size = fitTitleSize(ctx, cleanTitle, width * 0.92, Math.round(Math.min(width, height) * 0.17));
  const titleY = height - Math.round(height * 0.075) - Math.round(size * 0.28);

  ctx.save();
  ctx.translate(width / 2, titleY);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${size}px ${family}`;
  try { ctx.letterSpacing = `${Math.max(1, Math.round(size * 0.02))}px`; } catch (_) { /* older canvas */ }
  const grad = ctx.createLinearGradient(0, -size, 0, size * 0.12);
  grad.addColorStop(0, style.stops[0]);
  grad.addColorStop(0.55, style.stops[1]);
  grad.addColorStop(1, style.stops[2]);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160818';
  ctx.lineWidth = Math.max(2, size * 0.085);
  ctx.strokeText(cleanTitle, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = Math.round(size * 0.09);
  ctx.shadowOffsetY = Math.round(size * 0.035);
  ctx.fillStyle = grad;
  ctx.fillText(cleanTitle, 0, 0);
  ctx.restore();

  const sub = (subtitle || '').toUpperCase().trim();
  if (sub) {
    const subSize = Math.max(10, Math.round(size * 0.21));
    ctx.save();
    ctx.font = `700 ${subSize}px Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, Math.round(subSize * 0.32))}px`; } catch (_) { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.round(subSize * 0.3);
    ctx.shadowOffsetY = 2;
    const subY = height - Math.round(height * 0.028);
    const tw = ctx.measureText(sub).width;
    const rule = Math.min(width * 0.08, Math.max(0, (width * 0.86 - tw) / 2 - 14));
    if (rule > 12) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.5, subSize * 0.09);
      const cy = subY - subSize * 0.32;
      ctx.beginPath();
      ctx.moveTo(width / 2 - tw / 2 - 14 - rule, cy);
      ctx.lineTo(width / 2 - tw / 2 - 14, cy);
      ctx.moveTo(width / 2 + tw / 2 + 14, cy);
      ctx.lineTo(width / 2 + tw / 2 + 14 + rule, cy);
      ctx.stroke();
    }
    ctx.fillText(sub, width / 2, subY);
    ctx.restore();
  }
}

function drawTag(ctx, width, height, margin, accent) {
  const label = 'VICE PANELS';
  const size = Math.max(11, Math.round(Math.min(width, height) * 0.018));
  ctx.save();
  ctx.font = `800 ${size}px Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.28)}px`; } catch (_) { /* older canvas */ }
  const tw = ctx.measureText(label).width;
  const padX = Math.round(size * 0.9);
  const padY = Math.round(size * 0.55);
  const x = margin + Math.round(size * 0.4);
  const y = margin + Math.round(size * 0.4);
  const w = tw + padX * 2;
  const h = size + padY * 2;
  ctx.fillStyle = 'rgba(10,6,16,0.62)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.round(h / 2));
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x + padX * 0.55, y + h * 0.28, Math.round(size * 0.32), h * 0.44);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX + Math.round(size * 0.5), y + h / 2 + 1);
  ctx.restore();
}

// opts: { width, height, layout, grade, title, subtitle, titleStyle,
//         panels: [{ photo: HTMLImageElement|null, zoom, ox, oy }] }
// Draws the whole cover onto canvas (resized first) and returns it.
export function drawCover(canvas, opts) {
  const width = opts.width;
  const height = opts.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[opts.grade] || GRADES.sunset;

  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, width, height);

  const margin = Math.max(6, Math.round(Math.min(width, height) * 0.016));
  const gutter = Math.max(4, Math.round(Math.min(width, height) * 0.012));
  const rects = panelRects(opts.layout, width, height, margin, gutter);
  const panels = opts.panels || [];

  rects.forEach((rect, i) => {
    const panel = panels[i] || {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.photo && panel.photo.naturalWidth > 0) {
      ctx.filter = grade.photoFilter;
      drawPhotoCover(ctx, panel.photo, rect, panel.zoom || 1, panel.ox || 0, panel.oy || 0);
      ctx.filter = 'none';
    } else {
      drawEmptyPanel(ctx, rect);
    }
    ctx.restore();
  });

  applyGrade(ctx, width, height, grade);

  // Frame: dark outer edge plus a thin accent line.
  ctx.strokeStyle = 'rgba(12,6,18,0.9)';
  ctx.lineWidth = margin;
  ctx.strokeRect(margin / 2, margin / 2, width - margin, height - margin);
  ctx.strokeStyle = grade.accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.5, Math.min(width, height) * 0.0025);
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
  ctx.globalAlpha = 1;

  drawTag(ctx, width, height, margin, grade.accent);
  drawCaption(ctx, width, height, opts.title, opts.subtitle, opts.titleStyle);
  return canvas;
}

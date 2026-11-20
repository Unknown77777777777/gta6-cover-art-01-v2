// Vice Panels cover renderer: draws the multi-panel poster onto any canvas,
// at any resolution. The editor preview and the PNG export share this code,
// so what you see is exactly what the exported file holds.
export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = ['hero', 'quad', 'triptych', 'single'];

export const GRADES = ['sunset', 'neon', 'dusk'];

// Panel rectangles as fractions of the cover, one entry per panel.
export function layoutRects(layout) {
  switch (layout) {
    case 'quad':
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ];
    case 'triptych':
      return [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
      ];
    case 'single':
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    case 'hero':
    default:
      return [
        { x: 0, y: 0, w: 0.62, h: 1 },
        { x: 0.62, y: 0, w: 0.38, h: 0.5 },
        { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
      ];
  }
}

// Colour grade: a canvas filter for the photo plus a tinted overlay drawn
// on top of each panel. All three grades are original colour work.
export function gradeStyle(grade) {
  switch (grade) {
    case 'neon':
      return {
        filter: 'saturate(1.8) contrast(1.14) brightness(1.02)',
        top: 'rgba(255, 0, 190, 0.42)',
        bottom: 'rgba(0, 220, 255, 0.42)',
      };
    case 'dusk':
      return {
        filter: 'saturate(1.2) brightness(0.86) contrast(1.12)',
        top: 'rgba(70, 25, 130, 0.42)',
        bottom: 'rgba(8, 8, 42, 0.54)',
      };
    case 'sunset':
    default:
      return {
        filter: 'saturate(1.30) contrast(1.08) brightness(1.03)',
        top: 'rgba(255, 140, 40, 0.38)',
        bottom: 'rgba(255, 60, 120, 0.30)',
      };
  }
}

// Draw one photo into one panel rect: cover-fit, then the panel's own
// pan (dx, dy as fractions of the panel) and zoom, with optional rotation.
function drawPanelPhoto(ctx, img, rect, panel) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + (panel.dx || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.dy || 0) * rect.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((panel.rot || 0) * Math.PI) / 180);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// Bold poster lettering: system font stack only, uppercased, dark outline
// plus a soft shadow so it reads over any photo.
function drawCaption(ctx, W, H, state) {
  const text = (state.caption || '').trim();
  if (!text) return;
  const size = Math.round((state.captionSize || 96) * (W / 1080));
  const font = `900 ${size}px "Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try {
    ctx.letterSpacing = `${Math.round(size * 0.04)}px`;
  } catch {
    // letterSpacing is a newer canvas property; the caption works without it.
  }
  const pad = Math.round(H * 0.07);
  const y =
    state.captionPos === 'top'
      ? pad + size / 2
      : state.captionPos === 'middle'
        ? H / 2
        : H - pad - size / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, Math.round(size * 0.13));
  ctx.strokeStyle = 'rgba(10, 5, 15, 0.9)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = Math.round(size * 0.18);
  ctx.shadowOffsetY = Math.round(size * 0.05);
  const words = text.toUpperCase();
  ctx.strokeText(words, W / 2, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = state.captionColor || '#ffffff';
  ctx.fillText(words, W / 2, y);
  ctx.restore();
}

// The whole cover: panels with gutters, grade overlays, caption, vignette.
// state: { layout, grade, caption, captionSize, captionColor, captionPos, panels }
// panels: [{ photo, zoom, dx, dy, rot }] aligned with layoutRects(layout).
// images: array of loaded HTMLImageElement, indexed by panel.photo.
export function drawCover(ctx, W, H, state, images) {
  ctx.save();
  ctx.fillStyle = '#0b0b12';
  ctx.fillRect(0, 0, W, H);
  const gap = Math.max(2, Math.round(W * 0.006));
  const rects = layoutRects(state.layout);
  const grade = gradeStyle(state.grade);
  rects.forEach((frac, i) => {
    const rect = {
      x: frac.x * W + (frac.x > 0 ? gap / 2 : 0),
      y: frac.y * H + (frac.y > 0 ? gap / 2 : 0),
      w: frac.w * W - (frac.x > 0 ? gap / 2 : 0) - (frac.x + frac.w < 1 ? gap / 2 : 0),
      h: frac.h * H - (frac.y > 0 ? gap / 2 : 0) - (frac.y + frac.h < 1 ? gap / 2 : 0),
    };
    const panel = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, dx: 0, dy: 0, rot: 0 };
    const img = images[panel.photo] || images[0];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      ctx.filter = grade.filter;
      drawPanelPhoto(ctx, img, rect, panel);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#23232e';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    const tint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    tint.addColorStop(0, grade.top);
    tint.addColorStop(1, grade.bottom);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = Math.max(1, Math.round(W * 0.0015));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  // Soft vignette so the edges fall away like a printed poster.
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  drawCaption(ctx, W, H, state);
  ctx.restore();
}

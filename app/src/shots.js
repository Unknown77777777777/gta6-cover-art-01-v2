// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the cover alone, full-bleed.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the words,
// `layout` / `grade` / `size` the preset. window.__shotReady is set once
// the scene has painted, so a screenshot script can wait on it.
export async function runShot(query, app) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1920x1080';
  await app.loadSample(photo);
  app.setPreset({ caption, layout, grade, size });
  if (query.get('shot') === 'cover') {
    document.body.classList.add('shot-cover');
    app.renderCoverOnly(size);
  } else {
    app.renderPreview();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

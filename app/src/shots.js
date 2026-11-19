// Fixed scenes for screenshots: ?shot=editor shows the app with a sample
// photo loaded; ?shot=cover / ?shot=export shows the exported cover alone.
// Query params: photo / photo2 (sample names), caption, subtitle, layout,
// grade, size. window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, applyScene) {
  if (shot === 'cover' || shot === 'export') document.body.classList.add('shot-cover');
  const photos = [query.get('photo') ?? 'pier'];
  if (query.get('photo2')) photos.push(query.get('photo2'));
  await applyScene({
    photos,
    title: query.get('caption') ?? 'SUNSET HEIST',
    subtitle: query.get('subtitle') ?? 'ONE LAST JOB IN VICE CITY',
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? '1080x1080',
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

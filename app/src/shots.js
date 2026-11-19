// Fixed scenes for the three screenshots. `cover` isolates the canvas, `editor` keeps the whole studio visible.
// `load(sample, caption)` is supplied by main.js; window.__shotReady flips once the painted frame has composite.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  else document.body.dataset.shot = 'editor';
  const photo = query.get('photo') || 'boulevard';
  const caption = query.get('caption') || 'SUNSET HEIST';
  await load(`samples/${photo}.jpg`, caption);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

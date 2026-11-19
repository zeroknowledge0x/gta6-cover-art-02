// Wires the editor. Photos are read locally through object URLs; nothing is uploaded. A `?shot=` query paints a
// fixed screenshot scene instead (./shots.js), otherwise the controls drive a live canvas.
import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const caption = document.getElementById('caption');
const status = document.getElementById('status');

const state = {
  photos: [null, null, null],
  caption: caption ? caption.value : 'SUNSET HEIST',
  layout: 'four',
  grade: 'sunset',
  adjust: [{ zoom: 1, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0 }],
  size: '1080x1080',
};
const urls = [null, null, null];
const keys = ['a', 'b', 'c'];

/** Load an image from a URL into an Image that is ready to draw. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image could not be decoded'));
    img.src = url;
  });
}

function setStatus(text) {
  if (status) status.textContent = text;
}

function syncReadouts() {
  document.querySelectorAll('output[data-for]').forEach((out) => {
    const input = document.getElementById(out.dataset.for);
    if (input) out.textContent = `${Math.round(Number(input.value) * 100)}%`;
  });
}

function redraw() {
  state.caption = caption.value;
  drawCover(canvas, state);
  syncReadouts();
}

function exportPng() {
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed: this browser could not encode the canvas.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-coast-cover-${state.size}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus(`Exported neon-coast-cover-${state.size}.png (${Math.round(blob.size / 1024)} KiB).`);
  }, 'image/png');
}

keys.forEach((key, i) => {
  const fileInput = document.getElementById(`photo-${key}`);
  if (fileInput) {
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        if (urls[i]) URL.revokeObjectURL(urls[i]);
        urls[i] = url;
        state.photos[i] = img;
        setStatus(`Panel ${key.toUpperCase()} loaded locally — ${file.name}.`);
        redraw();
      } catch (err) {
        URL.revokeObjectURL(url);
        setStatus(`Panel ${key.toUpperCase()} could not be decoded.`);
      }
    });
  }
  [['zoom', 'zoom'], ['x', 'x'], ['y', 'y']].forEach(([prop, prefix]) => {
    const slider = document.getElementById(`${prefix}-${key}`);
    if (!slider) return;
    slider.addEventListener('input', () => {
      state.adjust[i][prop] = Number(slider.value);
      redraw();
    });
  });
});

caption.addEventListener('input', redraw);

const layoutSelect = document.getElementById('layout');
layoutSelect.addEventListener('change', (event) => {
  state.layout = event.target.value;
  redraw();
});

const gradeSelect = document.getElementById('grade');
gradeSelect.addEventListener('change', (event) => {
  state.grade = event.target.value;
  redraw();
});

document.querySelectorAll('[data-size]').forEach((button) => {
  button.addEventListener('click', () => {
    state.size = button.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === button));
    const label = document.getElementById('size-label');
    if (label) label.textContent = state.size.replace('x', ' × ');
    redraw();
  });
});

document.getElementById('export').addEventListener('click', exportPng);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (sample, text) => {
    const other = sample.indexOf('pier') >= 0 ? 'samples/boulevard.jpg' : 'samples/pier.jpg';
    const images = await Promise.all([loadImage(sample), loadImage(other)]);
    state.photos[0] = images[0];
    state.photos[1] = images[1];
    state.photos[2] = images[0];
    state.adjust = [
      { zoom: 1, x: 0, y: 0 },
      { zoom: 1.15, x: 0.05, y: 0 },
      { zoom: 1.45, x: 0.15, y: -0.08 },
    ];
    state.caption = text;
    caption.value = text;
    state.grade = /night|midnight|shift/i.test(text) ? 'midnight' : 'sunset';
    gradeSelect.value = state.grade;
    redraw();
  });
} else {
  redraw();
}

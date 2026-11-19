// Neon Coast Cover Studio — the painter. Canvas 2D only: no fonts to fetch, no images but the photos handed in.
// Every texture is generated here from a seeded generator, so a given state always paints the same poster.

const INK = '#0a0710';
const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** A 32-bit linear-congruential generator: deterministic grain and halftone on every machine. */
function seeded(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The panel rectangles for a layout, each tagged with the photo index it draws. */
function layoutPanels(layout, w, h, g) {
  if (layout === 'hero') {
    const hw = Math.round(w * 0.6);
    const rw = w - hw - g;
    const ph = Math.round((h - 2 * g) / 3);
    return [
      { x: 0, y: 0, w: hw, h, source: 0 },
      { x: hw + g, y: 0, w: rw, h: ph, source: 1 },
      { x: hw + g, y: ph + g, w: rw, h: ph, source: 2 },
      { x: hw + g, y: 2 * (ph + g), w: rw, h: h - 2 * (ph + g), source: 0 },
    ];
  }
  if (layout === 'full') {
    return [
      { x: 0, y: 0, w, h, source: 0 },
      { x: 0, y: Math.round(h * 0.78), w, h: Math.round(h * 0.22), source: 1, strip: true },
    ];
  }
  const hh = Math.round(h * 0.62);
  const pw = Math.round((w - 2 * g) / 3);
  const by = hh + g;
  return [
    { x: 0, y: 0, w, h: hh, source: 0 },
    { x: 0, y: by, w: pw, h: h - by, source: 0 },
    { x: pw + g, y: by, w: pw, h: h - by, source: 1 },
    { x: 2 * (pw + g), y: by, w: w - 2 * (pw + g), h: h - by, source: 2 },
  ];
}

/** Cover-fit one photo inside a panel, honouring that photo's zoom and pan. */
function drawFit(ctx, img, p, adj) {
  const zoom = adj && adj.zoom ? adj.zoom : 1;
  const panX = adj ? adj.x : 0;
  const panY = adj ? adj.y : 0;
  const scale = Math.max(p.w / img.naturalWidth, p.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, p.x + (p.w - dw) / 2 + panX * p.w, p.y + (p.h - dh) / 2 + panY * p.h, dw, dh);
}

/** The colour grade is always a linear gradient laid over the photo in this panel. */
function grade(ctx, p, name) {
  const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  if (name === 'neon') {
    g.addColorStop(0, 'rgba(0,238,255,0.16)');
    g.addColorStop(0.55, 'rgba(112,24,204,0.20)');
    g.addColorStop(1, 'rgba(255,20,150,0.50)');
  } else if (name === 'midnight') {
    g.addColorStop(0, 'rgba(58,40,160,0.44)');
    g.addColorStop(0.55, 'rgba(24,40,110,0.42)');
    g.addColorStop(1, 'rgba(3,66,76,0.64)');
  } else if (name === 'bleach') {
    g.addColorStop(0, 'rgba(255,248,225,0.27)');
    g.addColorStop(1, 'rgba(255,232,190,0.14)');
  } else {
    g.addColorStop(0, 'rgba(255,148,40,0)');
    g.addColorStop(0.48, 'rgba(244,84,84,0.20)');
    g.addColorStop(1, 'rgba(178,22,146,0.64)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(p.x, p.y, p.w, p.h);
}

/** A fine, deterministic halftone screen, denser toward the bottom of each panel. */
function halftone(ctx, p, w) {
  const step = Math.max(7, Math.round(w * 0.021));
  const rand = seeded(0x5eed ^ ((p.x * 131 + p.y * 17) | 0));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let y = p.y + step / 2; y < p.y + p.h; y += step) {
    const t = (y - p.y) / p.h;
    for (let x = p.x + step / 2; x < p.x + p.w; x += step) {
      if (rand() < 0.20) continue;
      const r = step * (0.05 + 0.10 * t) * (0.6 + rand() * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Very faint horizontal scanlines tie the panels together as one printed sheet. */
function scanlines(ctx, w, h) {
  const step = Math.max(3, Math.round(h / 360));
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.055;
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

/** Sparse, seeded film grain across the whole poster. */
function grain(ctx, w, h) {
  const rand = seeded(0xc0ffee);
  const n = Math.min(9000, Math.round(w * h / 180));
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * 0.10;
    ctx.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`;
    const s = 1 + rand() * 1.6;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

/** One palm frond, drawn in the top corner indicated by dir (1 left, -1 right). */
function drawFrond(ctx, x, y, dir, w) {
  const s = w * 0.20;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = 'rgba(5,3,12,0.74)';
  ctx.strokeStyle = 'rgba(5,3,12,0.74)';
  ctx.lineWidth = s * 0.035;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 0.18, s * 0.28, s * 0.55, s * 0.30, s * 0.95, s * 0.06);
  ctx.stroke();
  for (let i = 1; i <= 11; i++) {
    const t = i / 12;
    const px = s * (0.06 + 0.86 * t);
    const py = s * (0.02 + 0.30 * Math.sin(Math.PI * t * 0.9));
    const len = s * 0.20 * (1 - Math.abs(t - 0.45));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + len * 0.4, py - len * 0.9, px + len * 0.95, py - len * 1.35);
    ctx.quadraticCurveTo(px + len * 0.55, py - len * 0.45, px, py);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + len * 0.45, py + len * 0.25, px + len * 1.05, py + len * 0.5);
    ctx.quadraticCurveTo(px + len * 0.5, py + len * 0.12, px, py);
    ctx.fill();
  }
  ctx.restore();
}

function vignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h * 0.45, w * 0.18, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(4,2,10,0)');
  v.addColorStop(1, 'rgba(4,2,10,0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** Split a caption into at most two balanced centred lines. */
function splitTitle(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2 || text.length <= 11) return [text];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length;
    const b = words.slice(i).join(' ').length;
    const d = Math.abs(a - b);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function drawLines(ctx, lines, cx, y) {
  lines.forEach((line, i) => ctx.fillText(line, cx, y + i * lines._lead));
}

function spacedText(ctx, text, cx, y, track) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + track; });
  ctx.textAlign = 'center';
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 === 0 ? r : r * 0.44;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function heatMeter(ctx, w, h) {
  const r = Math.max(5, w * 0.0105);
  const gap = r * 2.6;
  const x0 = w / 2 - 2 * gap;
  const y = h - r * 2.4;
  for (let i = 0; i < 5; i++) {
    star(ctx, x0 + i * gap, y, r);
    ctx.fillStyle = i < 4 ? '#ffcf3f' : 'rgba(255,255,255,0.20)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,7,16,0.65)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.stroke();
  }
  ctx.font = `700 ${Math.max(9, r * 0.82)}px "Arial Narrow", Impact, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.textAlign = 'center';
  ctx.fillText('HEAT  04 / 05', w / 2, y - r * 1.7);
}

function badge(ctx, w, h) {
  const bw = w * 0.20;
  const bh = Math.max(18, h * 0.032);
  ctx.save();
  ctx.translate(w * 0.045, h * 0.055);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.fillStyle = '#ff2bd6';
  ctx.fillRect(0, 0, bw, bh);
  ctx.fillStyle = '#16e8ff';
  ctx.fillRect(0, bh * 0.78, bw, bh * 0.22);
  ctx.fillStyle = '#0a0710';
  ctx.font = `900 ${Math.round(bh * 0.54)}px "Arial Narrow", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ORIGINAL COVER', bw / 2, bh * 0.46);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

/** The caption is the hero: chromatic copies, dark stroke, white face, across the seam. */
function typography(ctx, w, h, state, g) {
  const text = String(state.caption || '').trim().toUpperCase() || 'NEON COAST';
  const lines = splitTitle(text);
  const seam = state.layout === 'hero' ? h * 0.55 : state.layout === 'full' ? h * 0.74 : h * 0.62 + g * 0.5;
  const cx = w / 2;
  const font = (s) => `900 ${Math.round(s)}px "Arial Narrow", Impact, sans-serif`;
  let size = h * 0.105;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (;;) {
    ctx.font = font(size);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    if (widest <= w * 0.9 || size <= h * 0.03) break;
    size *= 0.94;
  }
  const lead = size * 0.92;
  lines._lead = lead;
  const firstY = seam - (lines.length - 1) * lead / 2 + size * 0.34;

  ctx.font = `700 ${Math.max(10, size * 0.16)}px "Arial Narrow", Impact, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  spacedText(ctx, 'PRESENTS', cx, firstY - lead * 0.82, size * 0.07);

  ctx.font = font(size);
  const off = Math.max(2, w * 0.004);
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = '#16e8ff';
  drawLines(ctx, lines, cx - off, firstY + off * 0.5);
  ctx.fillStyle = '#ff2bd6';
  drawLines(ctx, lines, cx + off, firstY - off * 0.5);
  ctx.globalAlpha = 1;

  ctx.font = font(size);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.10);
  ctx.strokeStyle = INK;
  lines.forEach((line, i) => ctx.strokeText(line, cx, firstY + i * lead));
  const face = ctx.createLinearGradient(0, firstY - size, 0, firstY + lead);
  face.addColorStop(0, '#ffffff');
  face.addColorStop(1, '#ffe9d2');
  ctx.fillStyle = face;
  drawLines(ctx, lines, cx, firstY);

  badge(ctx, w, h);
  heatMeter(ctx, w, h);
}

/**
 * Paint the complete cover at the canvas's own pixel size.
 * state = { photos: [img, img, img], caption, layout, grade, adjust: [{zoom,x,y} x3], size, fronds }
 */
export function drawCover(canvas, state) {
  const dims = SIZES[state.size] || SIZES['1080x1080'];
  if (canvas.width !== dims[0]) canvas.width = dims[0];
  if (canvas.height !== dims[1]) canvas.height = dims[1];
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);

  const g = Math.max(2, Math.round(w * 0.015));
  const panels = layoutPanels(state.layout, w, h, g);
  const photos = state.photos || [];
  const adjust = state.adjust || [{ zoom: 1, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0 }];

  for (const p of panels) {
    const img = photos[p.source] || photos[0] || null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    if (img && img.naturalWidth) {
      drawFit(ctx, img, p, adjust[p.source] || adjust[0]);
    } else {
      const fallback = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      fallback.addColorStop(0, '#241936');
      fallback.addColorStop(1, '#0d1424');
      ctx.fillStyle = fallback;
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
    grade(ctx, p, state.grade || 'sunset');
    if (p.strip) {
      ctx.fillStyle = 'rgba(10,7,16,0.74)';
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
    halftone(ctx, p, w);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = Math.max(1, w * 0.001);
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  }

  if (state.fronds !== false) {
    drawFrond(ctx, 0, 0, 1, w);
    drawFrond(ctx, w, 0, -1, w);
  }
  grain(ctx, w, h);
  scanlines(ctx, w, h);
  vignette(ctx, w, h);
  typography(ctx, w, h, state, g);
}

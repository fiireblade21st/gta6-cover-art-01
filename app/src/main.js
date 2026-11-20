// Wires the page: up to 4 photos, 4 panel layouts, 4 grades, per-panel crop
// (zoom + pan), editable title/subtitle, live preview, and PNG export in the
// three post sizes: 1080x1080, 1080x1350, 1920x1080. Photos never leave the
// machine: everything runs offline from files under app/. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCoverArt } from './cover.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { LAYOUTS, LAYOUT_IDS, layoutPanels, panelAt } from './panels.js';
import { runShot } from './shots.js';

export const SIZES = {
  square: { label: '1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 × 1350', w: 1080, h: 1350 },
  wide: { label: '1920 × 1080', w: 1920, h: 1080 },
};

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const state = {
  photos: [null, null, null, null],
  panelPhoto: [0, 1, 2, 3],
  transforms: [
    { scale: 1, dx: 0, dy: 0 },
    { scale: 1, dx: 0, dy: 0 },
    { scale: 1, dx: 0, dy: 0 },
    { scale: 1, dx: 0, dy: 0 },
  ],
  layout: 'trio',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'One last score under the neon sun',
  letterStyle: 'sunset',
  size: 'square',
  selectedPanel: 0,
  showSun: true,
};

function redraw() {
  drawCoverArt(canvas, state);
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function setStatus(text) {
  status.textContent = text;
}

/** Resize the preview canvas to the chosen post size and redraw. */
function applySize() {
  const s = SIZES[state.size];
  canvas.width = s.w;
  canvas.height = s.h;
  redraw();
}

/** Render the cover offscreen at w×h and download it as a PNG. */
export function exportPNG(w, h) {
  return new Promise((resolve) => {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCoverArt(off, state);
    off.toBlob((blob) => {
      if (!blob) { setStatus('Export failed.'); resolve(0); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${w}x${h}.png`;
      a.click();
      setStatus(`Saved vice-cover-${w}x${h}.png (${Math.round(blob.size / 1024)} KB)`);
      resolve(blob.size);
    }, 'image/png');
  });
}

// --- Photo slots -----------------------------------------------------------
const SAMPLES = ['pier', 'boulevard', 'sunset', 'neon'];
for (let slot = 0; slot < 4; slot += 1) {
  const input = $(`photo${slot}`);
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[slot] = await loadImage(URL.createObjectURL(file));
    setStatus(`Photo ${slot + 1} loaded.`);
    redraw();
  });
}

$('load-samples').addEventListener('click', async () => {
  for (let slot = 0; slot < 4; slot += 1) {
    state.photos[slot] = await loadImage(`samples/${SAMPLES[slot]}.jpg`);
  }
  setStatus('Sample photos loaded into all 4 slots.');
  redraw();
});

$('fill-all').addEventListener('click', () => {
  state.panelPhoto = [0, 0, 0, 0];
  syncPanelControls();
  setStatus('All panels now use photo 1.');
  redraw();
});

// --- Layout / grade / lettering -------------------------------------------
function buildButtons(containerId, ids, labels, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  ids.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = labels[id];
    b.className = id === current ? 'picked' : '';
    b.addEventListener('click', () => {
      onPick(id);
      buildButtons(containerId, ids, labels, id, onPick);
      redraw();
    });
    box.appendChild(b);
  });
}

buildButtons('layout-btns', LAYOUT_IDS, Object.fromEntries(LAYOUT_IDS.map((id) => [id, LAYOUTS[id].label])),
  state.layout, (id) => { state.layout = id; state.selectedPanel = 0; syncPanelControls(); });
buildButtons('grade-btns', GRADE_IDS, Object.fromEntries(GRADE_IDS.map((id) => [id, GRADES[id].label])),
  state.grade, (id) => { state.grade = id; });

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('letter-style').addEventListener('change', (e) => { state.letterStyle = e.target.value; redraw(); });
$('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  applySize();
  setStatus(`Preview size: ${SIZES[state.size].label}.`);
});

// --- Per-panel crop --------------------------------------------------------
function syncPanelControls() {
  const i = state.selectedPanel;
  $('panel-label').textContent = `Panel ${i + 1} of ${layoutPanels(state.layout).length}`;
  $('panel-photo').value = String(state.panelPhoto[i]);
  const t = state.transforms[i];
  $('zoom').value = String(t.scale);
  $('panx').value = String(t.dx);
  $('pany').value = String(t.dy);
  $('zoom-val').textContent = `${t.scale.toFixed(2)}×`;
  $('panx-val').textContent = t.dx.toFixed(2);
  $('pany-val').textContent = t.dy.toFixed(2);
}

$('panel-photo').addEventListener('change', (e) => {
  state.panelPhoto[state.selectedPanel] = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.transforms[state.selectedPanel].scale = Number(e.target.value);
  syncPanelControls(); redraw();
});
$('panx').addEventListener('input', (e) => {
  state.transforms[state.selectedPanel].dx = Number(e.target.value);
  syncPanelControls(); redraw();
});
$('pany').addEventListener('input', (e) => {
  state.transforms[state.selectedPanel].dy = Number(e.target.value);
  syncPanelControls(); redraw();
});

// Click the preview to pick the panel to crop.
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width;
  const fy = (e.clientY - r.top) / r.height;
  const hit = panelAt(state.layout, fx, fy);
  if (hit >= 0) {
    state.selectedPanel = hit;
    syncPanelControls();
    setStatus(`Editing panel ${hit + 1} — use zoom / pan below.`);
  }
});

// --- Export ----------------------------------------------------------------
document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const s = SIZES[btn.dataset.export];
    exportPNG(s.w, s.h);
  });
});

// Test hook: render each export size headlessly and report PNG byte sizes.
window.__vice = {
  state,
  exportTest: async () => {
    const out = {};
    for (const [key, s] of Object.entries(SIZES)) {
      const off = document.createElement('canvas');
      off.width = s.w; off.height = s.h;
      drawCoverArt(off, state);
      out[key] = off.toDataURL('image/png').length;
    }
    window.__exportTest = out;
    return out;
  },
};

// --- Boot ------------------------------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, loadImage, applySize, redraw, syncPanelControls);
} else {
  applySize();
  syncPanelControls();
  // Load the first sample so the first paint already shows a cover.
  loadImage('samples/pier.jpg').then((img) => {
    state.photos[0] = img;
    redraw();
  }).catch(() => redraw());
}

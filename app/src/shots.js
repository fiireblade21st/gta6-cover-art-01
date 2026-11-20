// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor
// shows the editor with photos loaded. Query params: photo (sample), caption,
// subtitle, layout, grade, letter, size. window.__shotReady is set once painted.
const SAMPLES = { pier: 'pier.jpg', boulevard: 'boulevard.jpg', sunset: 'sunset.jpg', neon: 'neon.jpg' };

export async function runShot(shot, query, state, loadImage, applySize, redraw, syncPanelControls) {
  if (shot === 'cover' || shot === 'portrait') document.body.classList.add('shot-cover');
  state.layout = query.get('layout') ?? (shot === 'quad' ? 'quad' : shot === 'duo' ? 'duo' : shot === 'portrait' ? 'hero' : 'trio');
  state.grade = query.get('grade') ?? (shot === 'quad' ? 'neon' : 'sunset');
  state.letterStyle = query.get('letter') ?? 'sunset';
  state.title = query.get('caption') ?? 'Sunset Heist';
  state.subtitle = query.get('subtitle') ?? 'One last score under the neon sun';
  state.size = query.get('size') ?? (shot === 'portrait' ? 'portrait' : 'square');
  const names = (query.get('photos') ?? query.get('photo') ?? 'pier,boulevard,sunset,neon').split(',');
  for (let i = 0; i < 4; i += 1) {
    const name = names[i % names.length];
    state.photos[i] = await loadImage(`samples/${SAMPLES[name] ?? 'pier.jpg'}`);
  }
  state.panelPhoto = [0, 1, 2, 3];
  applySize();
  syncPanelControls();
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

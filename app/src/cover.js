// Draws the Vice City style cover: photos in panels, a synthwave sun and palm
// silhouettes drawn with canvas paths, a sunset/neon grade, and bold caption
// lettering. Everything is drawn from code and the user's photos — no copied
// artwork, no Rockstar logo, no official font (system sans, weight 900).
import { GRADES } from './grades.js';
import { layoutPanels } from './panels.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cover-fit draw of one photo inside a panel rect, with zoom/pan. */
function drawPanelPhoto(ctx, photo, rect, transform) {
  if (!photo) return;
  const { scale = 1, dx = 0, dy = 0 } = transform || {};
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  const s = base * scale;
  const pw = photo.naturalWidth * s;
  const ph = photo.naturalHeight * s;
  const cx = rect.x + rect.w / 2 + dx * rect.w;
  const cy = rect.y + rect.h / 2 + dy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** A retro striped sun, clipped to the panel rect. */
function drawSun(ctx, rect, grade) {
  const r = Math.min(rect.w, rect.h) * 0.14;
  const cx = rect.x + rect.w * 0.72;
  const cy = rect.y + rect.h * 0.20;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grade.sun;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = grade.sunCore;
  ctx.fill();
  // Horizontal slats cut the lower half of the sun.
  ctx.fillStyle = grade.skyMid;
  for (let i = 0; i < 3; i += 1) {
    const y = cy + r * (0.15 + i * 0.22);
    ctx.fillRect(cx - r, y, r * 2, r * 0.05);
  }
  ctx.restore();
}

/** A palm silhouette: trunk plus seven fronds, drawn from bezier curves. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.16, y - s * 0.95);
  ctx.stroke();
  const topX = x + s * 0.16;
  const topY = y - s * 0.95;
  // Fronds arch up from the crown, then droop down at the tips.
  for (let i = 0; i < 7; i += 1) {
    const a = Math.PI * (0.06 + (i / 6) * 0.88);
    const ex = topX + Math.cos(a) * s * 0.58;
    const ey = topY + s * 0.22 - Math.sin(a) * s * 0.30;
    const mx = topX + Math.cos(a) * s * 0.30;
    const my = topY - s * 0.30;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrain(ctx, w, h, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 700; i += 1) {
    ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  ctx.restore();
}

/** Fit a font size so the text spans at most maxWidth. */
function fitFont(ctx, text, startSize, maxWidth, weight = 900) {
  let size = startSize;
  ctx.font = `${weight} ${size}px 'Arial Black', Arial, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px 'Arial Black', Arial, sans-serif`;
  }
  return size;
}

/**
 * Draws the cover onto `canvas` at its own size.
 * state: { photos[4], panelPhoto[4], transforms[4], layout, grade,
 *          title, subtitle, letterStyle, showSun }
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutPanels(state.layout);
  const px = (r) => ({ x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H });

  // Sky fallback behind every panel.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Photos, one per panel.
  rects.forEach((r, i) => {
    const slot = (state.panelPhoto || [])[i] ?? 0;
    const photo = (state.photos || [])[slot] || null;
    drawPanelPhoto(ctx, photo, px(r), (state.transforms || [])[i]);
  });

  // Sun + palms inside the biggest panel (the hero, or the top trio panel).
  if (state.showSun !== false && rects.length > 0) {
    let big = rects[0];
    rects.forEach((r) => { if (r.w * r.h > big.w * big.h) big = r; });
    const br = px(big);
    drawSun(ctx, br, grade);
    const palmColor = 'rgba(12,4,20,0.85)';
    drawPalm(ctx, br.x + br.w * 0.06, br.y + br.h * 0.98, Math.min(br.w, br.h) * 0.34, palmColor);
    drawPalm(ctx, br.x + br.w * 0.94, br.y + br.h * 0.98, Math.min(br.w, br.h) * 0.26, palmColor);
  }

  // Grade wash + vignette over the whole cover.
  const tint = ctx.createLinearGradient(0, H * 0.25, 0, H);
  tint.addColorStop(0, grade.tintTop);
  tint.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,2,16,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Panel borders: white/colored frame per panel, dark frame around the cover.
  rects.forEach((r) => {
    const p = px(r);
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeStyle = grade.border;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  });
  ctx.lineWidth = Math.max(6, W * 0.012);
  ctx.strokeStyle = grade.gutter;
  ctx.strokeRect(0, 0, W, H);

  // Caption block: dark band, bold title, subtitle, tagline.
  const bandH = H * 0.26;
  const band = ctx.createLinearGradient(0, H - bandH, 0, H);
  band.addColorStop(0, 'rgba(10,2,16,0)');
  band.addColorStop(1, 'rgba(10,2,16,0.78)');
  ctx.fillStyle = band;
  ctx.fillRect(0, H - bandH, W, bandH);

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    const size = fitFont(ctx, title, H * 0.115, W * 0.92);
    const ty = H - H * 0.085;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
    if (state.letterStyle === 'neon') {
      ctx.lineWidth = size * 0.10;
      ctx.strokeStyle = grade.titleStops[0];
      ctx.strokeText(title, W / 2, ty);
      ctx.lineWidth = size * 0.05;
      ctx.strokeStyle = grade.titleStops[1];
      ctx.strokeText(title, W / 2, ty);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, W / 2, ty);
    } else if (state.letterStyle === 'solid') {
      ctx.lineWidth = size * 0.09;
      ctx.strokeStyle = grade.titleStroke;
      ctx.strokeText(title, W / 2, ty);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, W / 2, ty);
    } else {
      // Sunset gradient fill with a dark outline.
      const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
      grade.titleStops.forEach((c, i) => grad.addColorStop(i / (grade.titleStops.length - 1), c));
      ctx.lineWidth = size * 0.09;
      ctx.strokeStyle = grade.titleStroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(title, W / 2, ty);
      ctx.fillStyle = grad;
      ctx.fillText(title, W / 2, ty);
    }
    ctx.restore();
    if (subtitle) {
      const ss = fitFont(ctx, subtitle, H * 0.032, W * 0.86, 700);
      ctx.font = `700 ${ss}px Arial, sans-serif`;
      ctx.fillStyle = grade.subtitle;
      ctx.fillText(subtitle, W / 2, H - H * 0.028);
    }
  }

  // Tagline, top-left corner.
  ctx.textAlign = 'left';
  const tagSize = Math.max(14, H * 0.02);
  ctx.font = `700 ${tagSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('★ VICE CITY', W * 0.025, H * 0.045);

  drawGrain(ctx, W, H, 7);
}

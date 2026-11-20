// Panel layouts for the cover. Each layout splits the cover rectangle into
// panels; every panel shows one photo (or the same photo again) and can be
// cropped and positioned on its own. Coordinates are fractions of the cover.
export const LAYOUTS = {
  hero: { label: 'Hero · 1 panel', panels: 1 },
  duo: { label: 'Duo · 2 panels', panels: 2 },
  trio: { label: 'Trio · 3 panels', panels: 3 },
  quad: { label: 'Quad · 4 panels', panels: 4 },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Rectangles (x, y, w, h as fractions of the cover) for a layout. */
export function layoutPanels(layout, gap = 0.012) {
  const g = gap;
  switch (layout) {
    case 'duo':
      return [
        { x: 0, y: 0, w: 0.5 - g / 2, h: 1 },
        { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 1 },
      ];
    case 'trio':
      return [
        { x: 0, y: 0, w: 1, h: 0.58 },
        { x: 0, y: 0.58 + g, w: 0.5 - g / 2, h: 0.42 - g },
        { x: 0.5 + g / 2, y: 0.58 + g, w: 0.5 - g / 2, h: 0.42 - g },
      ];
    case 'quad':
      return [
        { x: 0, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
        { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
        { x: 0, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
        { x: 0.5 + g / 2, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
      ];
    case 'hero':
    default:
      return [{ x: 0, y: 0, w: 1, h: 1 }];
  }
}

/** Index of the panel containing a point (fractions of the cover), or -1. */
export function panelAt(layout, fx, fy) {
  const rects = layoutPanels(layout);
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    if (fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h) return i;
  }
  return -1;
}

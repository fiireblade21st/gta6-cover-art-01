// Colour grades for the cover art. Every colour here is our own palette:
// a sunset / neon Vice City grade built from gradients, never a copied asset.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#ff7a3c', skyMid: '#ff3d7e', skyBottom: '#2b1038',
    tintTop: 'rgba(255,120,80,0)', tintBottom: 'rgba(200,40,120,0.62)',
    sun: '#ffd23e', sunCore: '#fff3b0',
    titleStops: ['#ffe259', '#ff7a3c', '#ff2e88'],
    titleStroke: '#1c0a24', subtitle: '#ffe9f2',
    border: '#ffffff', gutter: '#14081d',
  },
  neon: {
    label: 'Neon Night',
    skyTop: '#0b1035', skyMid: '#7b1fa2', skyBottom: '#12041f',
    tintTop: 'rgba(0,229,255,0)', tintBottom: 'rgba(123,31,162,0.66)',
    sun: '#00e5ff', sunCore: '#d8fbff',
    titleStops: ['#00e5ff', '#ff2e88', '#ffe259'],
    titleStroke: '#05010d', subtitle: '#c8f6ff',
    border: '#00e5ff', gutter: '#05010d',
  },
  vice: {
    label: 'Vice Pink',
    skyTop: '#ff9a8b', skyMid: '#ff2e88', skyBottom: '#3b0a4d',
    tintTop: 'rgba(255,154,139,0)', tintBottom: 'rgba(255,46,136,0.60)',
    sun: '#ff8fb3', sunCore: '#fff0f5',
    titleStops: ['#ffffff', '#ff9ac4', '#ff2e88'],
    titleStroke: '#2a0630', subtitle: '#ffffff',
    border: '#ffffff', gutter: '#2a0630',
  },
  dusk: {
    label: 'Palm Dusk',
    skyTop: '#2c1a5e', skyMid: '#c94b7c', skyBottom: '#12082a',
    tintTop: 'rgba(201,75,124,0)', tintBottom: 'rgba(18,8,42,0.68)',
    sun: '#ff9e57', sunCore: '#ffe9c9',
    titleStops: ['#ffd23e', '#ff7a3c', '#c94b7c'],
    titleStroke: '#12082a', subtitle: '#ffe9c9',
    border: '#ffd23e', gutter: '#12082a',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

// Prints WCAG contrast ratios for token pairs. Usage: node scripts/contrast.mjs
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const light = { bg: '#fbf7f2', surface: '#ffffff', surface2: '#f6efe8', ink: '#1e1a1d', muted: '#6b6168', primary: '#4a1d3f', primaryFg: '#ffffff', accent: '#f2a33a', accentFg: '#1e1a1d', secondary: '#2f6f6a', secondaryFg: '#ffffff', success: '#2e7d5b', warning: '#946200', danger: '#c2413b', dangerFg: '#ffffff', info: '#3a6ea5' };
const dark = { bg: '#160b14', surface: '#20131e', surface2: '#2a1a27', ink: '#f4ebf1', muted: '#b9a9b4', primary: '#e9c6dd', primaryFg: '#160b14', accent: '#f2a33a', accentFg: '#1e1a1d', secondary: '#7cc4bd', secondaryFg: '#0f2220', success: '#5fc596', warning: '#e3b24a', danger: '#f0847e', dangerFg: '#160b14', info: '#7fb0e3' };

const pairs = (t) => [
  ['ink on bg', t.ink, t.bg], ['ink on surface', t.ink, t.surface], ['muted on bg', t.muted, t.bg], ['muted on surface', t.muted, t.surface],
  ['primary-fg on primary', t.primaryFg, t.primary], ['primary on bg (text)', t.primary, t.bg], ['accent-fg on accent', t.accentFg, t.accent],
  ['secondary-fg on secondary', t.secondaryFg, t.secondary], ['danger-fg on danger', t.dangerFg, t.danger],
  ['success on surface', t.success, t.surface], ['warning on surface', t.warning, t.surface], ['danger on surface', t.danger, t.surface], ['info on surface', t.info, t.surface],
];
for (const [name, t] of [['LIGHT', light], ['DARK', dark]]) {
  console.log(`\n${name}`);
  for (const [label, fg, bg] of pairs(t)) {
    const r = ratio(fg, bg);
    console.log(`${label.padEnd(30)} ${r.toFixed(2)}:1  ${r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large/UI only' : 'FAIL'}`);
  }
}

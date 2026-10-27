#!/usr/bin/env node
/**
 * Erzeugt die Neon-Icons der Map als SVG-Dateien in assets/icons/.
 *
 *   node tools/generate-icons.mjs
 *
 * Jedes Icon ist reine Linienkunst im 64×64-Raster. Der Neon-Effekt entsteht
 * aus drei Lagen derselben Form: weicher Glow, farbige "Röhre", heller Kern.
 * Farben ändern? → PALETTE anpassen und das Skript erneut ausführen.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'icons');

const PALETTE = {
  fund: '#a78bff',
  energie: '#ffd60a',
  mikro: '#00e5ff',
  ki: '#ff3df0',
  robotik: '#39ff88',
  dual: '#ff3b5c',
};
const DISC = '#0a0e22'; // Hintergrund der Stations-Scheiben (für "ausgefüllte" Knoten)

/** Mischt eine Hex-Farbe mit Weiß (t = Anteil Weiß). */
function tint(hex, t = 0.6) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * t);
  const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const f = (v) => +v.toFixed(2);

/** Zahnrad als Pfad: Zähne auf dem Außenradius, Zahnfuß als Kreisbogen. */
function gear(cx, cy, teeth, rOut, rIn, rotation = 0) {
  const step = (Math.PI * 2) / teeth;
  const pt = (r, a) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = rotation + i * step;
    d += `${i === 0 ? 'M' : 'L'}${pt(rIn, a - 0.26 * step)}`;
    d += `L${pt(rOut, a - 0.14 * step)}L${pt(rOut, a + 0.14 * step)}L${pt(rIn, a + 0.26 * step)}`;
    d += `A${rIn} ${rIn} 0 0 1 ${pt(rIn, a + 0.74 * step)}`;
  }
  return `<path d="${d}Z"/>`;
}

/** Kleines neuronales Netz: Verbindungen zuerst, Knoten deckend darüber. */
function neuralNet() {
  const layers = [
    [12, [20, 32, 44]],
    [32, [14, 26, 38, 50]],
    [52, [26, 38]],
  ];
  let lines = '';
  for (let l = 0; l < layers.length - 1; l++) {
    const [x1, ys1] = layers[l];
    const [x2, ys2] = layers[l + 1];
    for (const y1 of ys1) for (const y2 of ys2) lines += `M${x1} ${y1}L${x2} ${y2}`;
  }
  const nodes = layers
    .flatMap(([x, ys]) => ys.map((y) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${DISC}"/>`))
    .join('');
  return `<path d="${lines}" stroke-width="1.6"/>${nodes}`;
}

/* ------------------------------------------------------------------------ */
/* Icon-Definitionen. {c} wird durch die Neonfarbe ersetzt.                  */
/* ------------------------------------------------------------------------ */
const ICONS = {
  /* Fundament */
  mathematik: ['fund', `
    <path d="M31.5 12.5c-1.2-2.4-6.6-3-7.6 2.2L18.1 49.3c-1 5.2-6.4 4.6-7.6 2.2"/>
    <path d="M32 30q3-12 6 0t6 0t6 0t6 0"/>
    <path d="M30 45h26M53 42l3 3-3 3"/>`],
  physik: ['fund', `
    <ellipse cx="32" cy="32" rx="25" ry="9"/>
    <ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(60 32 32)"/>
    <ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(120 32 32)"/>
    <circle cx="32" cy="32" r="3.6" fill="{c}"/>
    <circle cx="57" cy="32" r="2" fill="{c}"/>`],

  /* Ast: Energietechnik */
  maschinen: ['energie', `
    <circle cx="32" cy="32" r="19"/>
    <path d="M23 38V23l9 11 9-11v15"/>
    <path d="M26 45q3-3.5 6 0t6 0"/>
    <path d="M4 32h9M51 32h9"/>`],
  leistungselektronik: ['energie', `
    <rect x="12" y="12" width="40" height="40" rx="4"/>
    <path d="M12 52 52 12"/>
    <path d="M18 21h12M18 27h12"/>
    <path d="M34 43q3-5 6 0t6 0"/>
    <path d="M4 32h8M52 32h8"/>`],
  erneuerbare: ['energie', `
    <circle cx="15" cy="15" r="6"/>
    <path d="M15 3.5v3M15 23.5v3M3.5 15h3M23.5 15h3M6.9 6.9l2.1 2.1M21 21l2.1 2.1M6.9 23.1 9 21M21 9l2.1-2.1"/>
    <path d="M41 58 42 31M45 58 44 31"/>
    <circle cx="43" cy="28" r="2.6"/>
    <path d="M43 25.4Q46.5 17 43 8Q39.5 17 43 25.4"/>
    <path d="M43 25.4Q46.5 17 43 8Q39.5 17 43 25.4" transform="rotate(120 43 28)"/>
    <path d="M43 25.4Q46.5 17 43 8Q39.5 17 43 25.4" transform="rotate(240 43 28)"/>
    <path d="M28 58h30"/>`],
  smartgrid: ['energie', `
    <path d="M30 6 21 58M34 6l9 52"/>
    <path d="M12 16h40M16 27h32"/>
    <path d="M12 16v5M52 16v5M16 27v5M48 27v5"/>
    <path d="M25.6 36.5 38 46M38.4 36.5 26 46M24.4 46h15.2"/>
    <rect x="48" y="45" width="11" height="13" rx="2"/>
    <path d="M51.5 42.5h4M51 53h5M51 49.5h5"/>`],
  energietechnik: ['energie', `
    <path d="M36 5 15 36h14l-4 23 23-33H33z"/>`],

  /* Ast: Mikroelektronik */
  schaltung: ['mikro', `
    <path d="M20 20v26l22-13z"/>
    <path d="M8 26h12M8 40h12M42 33h14"/>
    <path d="M50 33V12H40l-1.5 3-3-6-3 6-3-6-3 6-1.5-3H14v14"/>
    <path d="M23.5 26h4M23.5 40h4M25.5 38v4"/>
    <circle cx="14" cy="26" r="1.7" fill="{c}"/>
    <circle cx="50" cy="33" r="1.7" fill="{c}"/>`],
  halbleiter: ['mikro', `
    <path d="M22.8 50A22 22 0 1 1 41.2 50Z"/>
    <path d="M26 10.5v37M38 10.5v37M12.5 23h39M12.5 37h39"/>`],
  fpga: ['mikro', `
    <rect x="16" y="16" width="32" height="32" rx="3"/>
    <path d="M24 16V8M32 16V8M40 16V8M24 56v-8M32 56v-8M40 56v-8M16 24H8M16 32H8M16 40H8M56 24h-8M56 32h-8M56 40h-8"/>
    <path d="M26 25h5a7 7 0 0 1 0 14h-5z"/>
    <path d="M21 29h5M21 35h5M38 32h5"/>`],
  embedded: ['mikro', `
    <rect x="6" y="12" width="52" height="40" rx="4"/>
    <rect x="23" y="24" width="16" height="16" rx="2"/>
    <path d="M27 24v-4M31 24v-4M35 24v-4M27 40v4M31 40v4M35 40v4"/>
    <path d="M39 28h5l4-4h4M39 36h5l4 4h4M23 32h-8"/>
    <circle cx="13" cy="32" r="2"/>
    <circle cx="11.5" cy="17.5" r="1.4"/><circle cx="52.5" cy="17.5" r="1.4"/>
    <circle cx="11.5" cy="46.5" r="1.4"/><circle cx="52.5" cy="46.5" r="1.4"/>`],
  mikroelektronik: ['mikro', `
    <rect x="15" y="15" width="34" height="34" rx="4"/>
    <rect x="25" y="25" width="14" height="14" rx="1.5"/>
    <path d="M23 15V7M32 15V7M41 15V7M23 57v-8M32 57v-8M41 57v-8M15 23H7M15 32H7M15 41H7M57 23h-8M57 32h-8M57 41h-8"/>
    <path d="M25 25l-5-5M39 25l5-5M25 39l-5 5M39 39l5 5"/>`],

  /* Ast: Künstliche Intelligenz */
  programmierung: ['ki', `
    <rect x="6" y="10" width="52" height="44" rx="5"/>
    <path d="M6 20h52"/>
    <circle cx="12" cy="15" r="1" fill="{c}"/><circle cx="17" cy="15" r="1" fill="{c}"/><circle cx="22" cy="15" r="1" fill="{c}"/>
    <path d="M24 30l-7 7 7 7M40 30l7 7-7 7M35 27l-6 20"/>`],
  signal: ['ki', `
    <path d="M6 22l5-9 5 15 5-11 4 7 5-12 5 18 4-10 5 6 4-4 5 2"/>
    <path d="M8 56h48"/>
    <path d="M13 56v-6M20 56v-14M27 56v-9M34 56v-17M41 56v-7M48 56v-11"/>`],
  ml: ['ki', neuralNet()],
  edgeai: ['ki', `
    <path d="M6 14V7h7M51 7h7v7M58 50v7h-7M13 57H6v-7"/>
    <path d="M11 32c5-8 12.5-12 21-12s16 4 21 12c-5 8-12.5 12-21 12s-16-4-21-12z"/>
    <circle cx="32" cy="32" r="8"/>
    <rect x="29" y="29" width="6" height="6" rx="1"/>`],
  ki: ['ki', `
    <path d="M32 14C29 9 21 9 20 15c-6 0-9 6-6 11-5 3-4 11 1 13-1 6 5 10 10 8 2 4 6 4 7 2V14"/>
    <path d="M32 14c3-5 11-5 12 1 6 0 9 6 6 11 5 3 4 11-1 13 1 6-5 10-10 8-2 4-6 4-7 2"/>
    <path d="M14 26c4 1 7 0 9-3M15 39c4-1 7-4 7-8M25 47c0-4 2-6 5-7"/>
    <path d="M32 24h6l4 4h3M32 33h9l3-3M32 42h6"/>
    <circle cx="46.5" cy="28" r="1.6" fill="{c}"/><circle cx="39.5" cy="42" r="1.6" fill="{c}"/>`],

  /* Ast: Robotik */
  sensorik: ['robotik', `
    <path d="M8 44a24 24 0 0 1 48 0"/>
    <path d="M8 44h5M15 27l3.5 3.5M32 20v5M49 27l-3.5 3.5M56 44h-5"/>
    <path d="M32 44l11-13"/>
    <circle cx="32" cy="44" r="3.2" fill="{c}"/>
    <path d="M16 54h32"/>`],
  regelung: ['robotik', `
    <circle cx="14" cy="24" r="5"/>
    <path d="M10.5 20.5l7 7M17.5 20.5l-7 7"/>
    <path d="M2 24h7M19 24h6M41 24h20"/>
    <path d="M22 21l3 3-3 3M58 21l3 3-3 3"/>
    <rect x="25" y="16" width="16" height="16" rx="2"/>
    <path d="M52 24v22H40"/>
    <rect x="26" y="40" width="14" height="12" rx="2"/>
    <path d="M26 46H14V29M11 32l3-3 3 3"/>
    <circle cx="52" cy="24" r="1.7" fill="{c}"/>`],
  antriebe: ['robotik', `
    ${gear(24, 39, 9, 17, 13, 0.2)}
    <circle cx="24" cy="39" r="5"/>
    ${gear(46, 18, 7, 11.5, 8.5, 0.6)}
    <circle cx="46" cy="18" r="3.2"/>`],
  automatisierung: ['robotik', `
    <path d="M6 56h32"/>
    <path d="M13 56v-5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v5"/>
    <circle cx="23" cy="42" r="4.5"/>
    <path d="M25.5 38.3 36 22.7"/>
    <circle cx="38.5" cy="19" r="4"/>
    <path d="M42.3 20.3 50 24"/>
    <path d="M51 18v12M51 18h6M51 30h6"/>`],
  robotik: ['robotik', `
    <rect x="14" y="22" width="36" height="28" rx="7"/>
    <path d="M32 22v-8"/><circle cx="32" cy="10.5" r="3"/>
    <circle cx="25" cy="34" r="4"/><circle cx="39" cy="34" r="4"/>
    <path d="M26 43h12"/>
    <path d="M14 31H9v10h5M50 31h5v10h-5"/>
    <path d="M25 50v5h14v-5"/>`],

  /* Linie: Duales Studium */
  gehalt: ['dual', `
    <circle cx="32" cy="32" r="22"/>
    <path d="M40.4 24.3A10 10 0 1 0 40.4 39.7"/>
    <path d="M20 29h14M20 35h14"/>`],
  praxis: ['dual', `
    <path d="M10.3 28.2A22 22 0 0 1 51.1 21"/>
    <path d="M52.1 15.1 51.1 21l-5.6-2.1"/>
    <path d="M53.7 35.8A22 22 0 0 1 13 43"/>
    <path d="M12 48.9 13 43l5.6 2.1"/>
    <path d="M24 30c-2-1.5-5-2-8-1.5v11c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-11c-3-.5-6 0-8 1.5zM24 30v11"/>
    <path d="M35 40V31l4.5 3v-3l4.5 3v-8h4v14z"/>`],
  kurse: ['dual', `
    <circle cx="32" cy="22" r="6.5"/>
    <path d="M19 48c0-8.5 5.5-14 13-14s13 5.5 13 14"/>
    <circle cx="15" cy="27" r="4.5"/>
    <path d="M5 46c0-6.5 4-10.5 10-10.5 2.5 0 4.5.7 6 2"/>
    <circle cx="49" cy="27" r="4.5"/>
    <path d="M59 46c0-6.5-4-10.5-10-10.5-2.5 0-4.5.7-6 2"/>`],
  bachelor: ['dual', `
    <path d="M32 13 58 25 32 37 6 25z"/>
    <path d="M16 30v10c0 4 7 7.5 16 7.5S48 44 48 40V30"/>
    <path d="M53 27.5V43"/>
    <path d="M53 43l-2.5 6h5z"/>`],
  karriere: ['dual', `
    <path d="M32 6c8 6 12 16 10 30H22C20 22 24 12 32 6z"/>
    <circle cx="32" cy="21" r="4"/>
    <path d="M22.5 29 15 37v7l8.5-4M41.5 29l7.5 8v7l-8.5-4"/>
    <path d="M27 40c0 6 2 10 5 15 3-5 5-9 5-15"/>`],
};

function iconSvg(colorKey, body) {
  const c = PALETTE[colorKey];
  const shape = body.replaceAll('{c}', c).replace(/\n\s*/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">
<defs>
<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2"/></filter>
<g id="shape" fill="none" stroke-linecap="round" stroke-linejoin="round">${shape}</g>
</defs>
<use href="#shape" stroke="${c}" stroke-width="5" opacity=".55" filter="url(#glow)"/>
<use href="#shape" stroke="${c}" stroke-width="2.8"/>
<use href="#shape" stroke="${tint(c)}" stroke-width="1.1"/>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const [name, [colorKey, body]] of Object.entries(ICONS)) {
  writeFileSync(join(OUT, `${name}.svg`), iconSvg(colorKey, body));
}

// Favicon: Blitz auf dunkler Stationsscheibe
writeFileSync(join(ROOT, 'assets', 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2"/></filter></defs>
<circle cx="32" cy="32" r="29" fill="${DISC}" stroke="${PALETTE.mikro}" stroke-width="3"/>
<path d="M35 11 19 35h11l-3 18 17-25H34z" fill="none" stroke="${PALETTE.energie}" stroke-width="5" opacity=".6" filter="url(#g)" stroke-linejoin="round"/>
<path d="M35 11 19 35h11l-3 18 17-25H34z" fill="none" stroke="${PALETTE.energie}" stroke-width="3" stroke-linejoin="round"/>
</svg>
`);

console.log(`✔ ${Object.keys(ICONS).length} Icons + Favicon geschrieben → ${OUT}`);

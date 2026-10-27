#!/usr/bin/env node
/**
 * Erzeugt die Icons der Map als Inline-Sprite js/icons.js sowie das Favicon.
 *
 *   node tools/generate-icons.mjs
 *
 * Alle Icons sind Linienzeichnungen im 64×64-Raster. Die Farbe kommt per CSS
 * (currentColor), dadurch passen sie sich hellem und dunklem Design an.
 *   class="acc" → Fläche in zarter Akzentfarbe
 *   class="dot" → gefüllter Punkt
 *   class="bg"  → Fläche in Hintergrundfarbe (verdeckt Linien dahinter)
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const f = (v) => +v.toFixed(2);

/** Zahnrad als Pfad: Zähne auf dem Außenradius, Zahnfuß als Kreisbogen. */
function gear(cx, cy, teeth, rOut, rIn, rotation = 0, cls = '') {
  const step = (Math.PI * 2) / teeth;
  const pt = (r, a) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = rotation + i * step;
    d += `${i === 0 ? 'M' : 'L'}${pt(rIn, a - 0.26 * step)}`;
    d += `L${pt(rOut, a - 0.14 * step)}L${pt(rOut, a + 0.14 * step)}L${pt(rIn, a + 0.26 * step)}`;
    d += `A${rIn} ${rIn} 0 0 1 ${pt(rIn, a + 0.74 * step)}`;
  }
  return `<path${cls ? ` class="${cls}"` : ''} d="${d}Z"/>`;
}

/** Kleines neuronales Netz: Verbindungen zuerst, Knoten deckend darüber. */
function neuralNet() {
  const layers = [[12, [20, 32, 44]], [32, [14, 26, 38, 50]], [52, [26, 38]]];
  let lines = '';
  for (let l = 0; l < layers.length - 1; l++) {
    const [x1, ys1] = layers[l];
    const [x2, ys2] = layers[l + 1];
    for (const y1 of ys1) for (const y2 of ys2) lines += `M${x1} ${y1}L${x2} ${y2}`;
  }
  const nodes = layers.flatMap(([x, ys]) => ys.map((y) => `<circle class="bg" cx="${x}" cy="${y}" r="4.2"/>`)).join('');
  return `<path d="${lines}" stroke-width="1.5"/>${nodes}`;
}

/** Windrad (Turm, Nabe, drei Flügel) */
function turbine(x, hubY, groundY, len) {
  const blade = `M${x} ${hubY - 2.4}Q${x + len * 0.17} ${hubY - len * 0.55} ${x} ${hubY - len}Q${x - len * 0.17} ${hubY - len * 0.55} ${x} ${hubY - 2.4}`;
  return `<path d="M${x - 1.6} ${groundY} ${x - 0.6} ${hubY + 3}M${x + 1.6} ${groundY} ${x + 0.6} ${hubY + 3}"/>
    <circle cx="${x}" cy="${hubY}" r="2.4"/>
    <path d="${blade}"/><path d="${blade}" transform="rotate(120 ${x} ${hubY})"/><path d="${blade}" transform="rotate(240 ${x} ${hubY})"/>`;
}

/* ------------------------------------------------------------------------ */
const ICONS = {
  /* ---------- Fundament ---------- */
  mathematik: `
    <path d="M31.5 12.5c-1.2-2.4-6.6-3-7.6 2.2L18.1 49.3c-1 5.2-6.4 4.6-7.6 2.2"/>
    <path d="M32 30q3-12 6 0t6 0t6 0t6 0"/>
    <path d="M30 45h26M53 42l3 3-3 3"/>`,
  physik: `
    <ellipse cx="32" cy="32" rx="25" ry="9"/>
    <ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(60 32 32)"/>
    <ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(120 32 32)"/>
    <circle class="dot" cx="32" cy="32" r="3.6"/>
    <circle class="dot" cx="57" cy="32" r="2"/>`,
  get: `
    <path d="M14 26V18h12l2-4 3 8 3-8 3 8 3-8 2 4h8v12"/>
    <path d="M42 30h12M42 36h12"/>
    <path d="M48 36v10H14v-8"/>
    <circle class="acc" cx="14" cy="32" r="6"/>
    <path d="M14 26v12"/>`,
  messtechnik: `
    <rect class="acc" x="6" y="12" width="52" height="38" rx="4"/>
    <rect class="bg" x="11" y="17" width="31" height="24" rx="2"/>
    <path d="M13 29q3.5-9 7 0t7 0t7 0t7 0"/>
    <circle cx="50" cy="23" r="3"/><circle cx="50" cy="34" r="3"/>
    <path d="M14 50v5M50 50v5"/>`,
  digital: `
    <path class="acc" d="M18 18h12a14 14 0 0 1 0 28H18z"/>
    <path d="M6 25h12M6 39h12M44 32h14"/>
    <path d="M4 12h5v-5h5v5h5"/>`,
  systemtheorie: `
    <rect class="acc" x="22" y="20" width="20" height="24" rx="3"/>
    <path d="M27 36c3 0 3-9 6-9s2 4 5 4"/>
    <path d="M4 32h18M18 29l4 3-4 3M42 32h18M56 29l4 3-4 3"/>
    <path d="M6 26h4v-8h6M46 26c4 0 4-8 8-8h4"/>`,
  bwl: `
    <path d="M8 56h50M10 56V8"/>
    <rect class="acc" x="16" y="42" width="7" height="14"/>
    <rect class="acc" x="27" y="34" width="7" height="22"/>
    <rect class="acc" x="38" y="28" width="7" height="28"/>
    <rect class="acc" x="49" y="20" width="7" height="36"/>
    <path d="M16 30l12-10 8 6 16-14M45 12h7v7"/>`,
  programmierung: `
    <rect class="acc" x="6" y="10" width="52" height="44" rx="5"/>
    <rect class="bg" x="10" y="21" width="44" height="29" rx="2"/>
    <path d="M6 20h52"/>
    <circle class="dot" cx="12" cy="15" r="1"/><circle class="dot" cx="17" cy="15" r="1"/><circle class="dot" cx="22" cy="15" r="1"/>
    <path d="M24 30l-7 7 7 7M40 30l7 7-7 7M35 27l-6 20"/>`,
  regelung: `
    <circle class="acc" cx="14" cy="24" r="5"/>
    <path d="M10.5 20.5l7 7M17.5 20.5l-7 7"/>
    <path d="M2 24h7M19 24h6M41 24h20"/>
    <path d="M22 21l3 3-3 3M58 21l3 3-3 3"/>
    <rect class="acc" x="25" y="16" width="16" height="16" rx="2"/>
    <path d="M52 24v22H40"/>
    <rect x="26" y="40" width="14" height="12" rx="2"/>
    <path d="M26 46H14V29M11 32l3-3 3 3"/>
    <circle class="dot" cx="52" cy="24" r="1.7"/>`,
  embedded: `
    <rect class="acc" x="6" y="12" width="52" height="40" rx="4"/>
    <rect class="bg" x="23" y="24" width="16" height="16" rx="2"/>
    <path d="M27 24v-4M31 24v-4M35 24v-4M27 40v4M31 40v4M35 40v4"/>
    <path d="M39 28h5l4-4h4M39 36h5l4 4h4M23 32h-8"/>
    <circle cx="13" cy="32" r="2"/>
    <circle cx="11.5" cy="17.5" r="1.4"/><circle cx="52.5" cy="17.5" r="1.4"/>
    <circle cx="11.5" cy="46.5" r="1.4"/><circle cx="52.5" cy="46.5" r="1.4"/>`,
  praxis: `
    <path d="M10.3 28.2A22 22 0 0 1 51.1 21"/>
    <path d="M52.1 15.1 51.1 21l-5.6-2.1"/>
    <path d="M53.7 35.8A22 22 0 0 1 13 43"/>
    <path d="M12 48.9 13 43l5.6 2.1"/>
    <path class="acc" d="M24 30c-2-1.5-5-2-8-1.5v11c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-11c-3-.5-6 0-8 1.5zM24 30v11"/>
    <path class="acc" d="M35 40V31l4.5 3v-3l4.5 3v-8h4v14z"/>`,
  bachelor: `
    <path class="acc" d="M32 13 58 25 32 37 6 25z"/>
    <path d="M16 30v10c0 4 7 7.5 16 7.5S48 44 48 40V30"/>
    <path d="M53 27.5V43"/>
    <path class="dot" d="M53 43l-2.5 6h5z"/>`,

  /* ---------- Berufsbilder: Automatisierung & Robotik ---------- */
  fabrik: `
    <path class="acc" d="M6 56V34l10-7v7l10-7v7l10-7v7h16V20h6v36z"/>
    <path d="M12 45h6M24 45h6M36 45h6"/>
    <path d="M14 13 28 8l14 6"/>
    <circle class="dot" cx="14" cy="13" r="2.6"/><circle class="dot" cx="28" cy="8" r="2.6"/><circle class="dot" cx="42" cy="14" r="2.6"/>`,
  roboterarm: `
    <path d="M6 56h32"/>
    <path class="acc" d="M13 56v-5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v5"/>
    <circle class="bg" cx="23" cy="42" r="4.5"/>
    <path d="M25.5 38.3 36 22.7"/>
    <circle class="bg" cx="38.5" cy="19" r="4"/>
    <path d="M42.3 20.3 50 24"/>
    <path d="M51 18v12M51 18h6M51 30h6"/>`,
  inbetrieb: `
    <circle class="acc" cx="27" cy="27" r="19"/>
    <ellipse cx="27" cy="27" rx="8" ry="19"/>
    <path d="M8 27h38M11 17h32M11 37h32"/>
    ${gear(47, 47, 8, 11, 8, 0.2, 'bg')}
    <circle cx="47" cy="47" r="3.5"/>`,
  fts: `
    <rect class="acc" x="6" y="34" width="40" height="12" rx="3"/>
    <circle class="bg" cx="15" cy="48" r="4.5"/><circle class="bg" cx="37" cy="48" r="4.5"/>
    <rect class="bg" x="13" y="16" width="22" height="18" rx="1.5"/>
    <path d="M13 25h22M24 16v9"/>
    <path d="M51 33q4 7 0 14M56 29q8 11 0 22"/>`,
  zwilling: `
    <path class="acc" d="M6 32l11-6 11 6v13l-11 6-11-6z"/>
    <path d="M6 32l11 6 11-6M17 38v13"/>
    <path d="M36 32l11-6 11 6v13l-11 6-11-6zM36 32l11 6 11-6M47 38v13" stroke-dasharray="3 3.5"/>
    <path d="M18 19C23 9 41 9 46 19"/>
    <path d="M40.5 17.6 46 19l1.6-5.5"/>`,

  /* ---------- Mobilität ---------- */
  maschinen: `
    <circle class="acc" cx="32" cy="32" r="19"/>
    <path d="M23 38V23l9 11 9-11v15"/>
    <path d="M26 45q3-3.5 6 0t6 0"/>
    <path d="M4 32h9M51 32h9"/>`,
  adas: `
    <path class="acc" d="M5 43v-6l5-2 6-8h16l7 8 6 1a3 3 0 0 1 2 3v4z"/>
    <path d="M18.5 28.5 15.5 34h9v-5.5zM28.5 28.5V34h8l-4.5-5.5z"/>
    <circle class="bg" cx="14" cy="44" r="4.5"/><circle class="bg" cx="38" cy="44" r="4.5"/>
    <path d="M52 31q4 6 0 12M57 26q7 11 0 22"/>`,
  steuergeraet: `
    <rect class="acc" x="8" y="14" width="36" height="30" rx="3"/>
    <rect class="bg" x="15" y="21" width="14" height="11" rx="1.5"/>
    <path d="M15 38h22M33 21v11"/>
    <path d="M44 20h6v18h-6M50 24h8M50 29h8M50 34h8"/>
    <path d="M6 56h52M18 44v12M34 44v12"/>`,
  schild: `
    <path class="acc" d="M32 6 52 13v15c0 13-8 23-20 29C20 51 12 41 12 28V13z"/>
    <path d="M23 31l7 7 12-14"/>`,
  sensorik: `
    <path class="acc" d="M8 44a24 24 0 0 1 48 0z"/>
    <path d="M8 44h5M15 27l3.5 3.5M32 20v5M49 27l-3.5 3.5M56 44h-5"/>
    <path d="M32 44l11-13"/>
    <circle class="dot" cx="32" cy="44" r="3.2"/>
    <path d="M16 54h32"/>`,

  /* ---------- Energiewende ---------- */
  smartgrid: `
    <path d="M30 6 21 58M34 6l9 52"/>
    <path d="M12 16h40M16 27h32"/>
    <path d="M12 16v5M52 16v5M16 27v5M48 27v5"/>
    <path d="M25.6 36.5 38 46M38.4 36.5 26 46M24.4 46h15.2"/>
    <rect class="acc" x="48" y="45" width="11" height="13" rx="2"/>
    <path d="M51.5 42.5h4M51 53h5M51 49.5h5"/>`,
  leistungselektronik: `
    <rect class="acc" x="12" y="12" width="40" height="40" rx="4"/>
    <path d="M12 52 52 12"/>
    <path d="M18 21h12M18 27h12"/>
    <path d="M34 43q3-5 6 0t6 0"/>
    <path d="M4 32h8M52 32h8"/>`,
  batterie: `
    <rect class="acc" x="8" y="18" width="42" height="28" rx="4"/>
    <path d="M50 26h5v12h-5"/>
    <path d="M32 21 23 34h8l-3 9 11-14h-8l3-8z"/>`,
  hgue: `
    ${turbine(12, 26, 56, 15)}
    <path d="M20 44h24M40 40l4 4-4 4"/>
    <path d="M26 36h12M26 39.5h3M32 39.5h3"/>
    <path class="acc" d="M46 56V38h6v-7h8v25z"/>
    <path d="M4 56h56"/>`,
  gebaeude: `
    <path d="M7 30 32 9l25 21"/>
    <path class="acc" d="M13 25v30h38V25L32 9z"/>
    <rect class="bg" x="27" y="40" width="10" height="15"/>
    <rect class="bg" x="17" y="32" width="8" height="7"/>
    <path class="acc" d="M40 41c0-6 5-9 10-9 0 6-4 9-10 9zM40 41l6-5"/>`,

  /* ---------- Chips & Elektronik ---------- */
  schaltung: `
    <path class="acc" d="M20 20v26l22-13z"/>
    <path d="M8 26h12M8 40h12M42 33h14"/>
    <path d="M50 33V12H40l-1.5 3-3-6-3 6-3-6-3 6-1.5-3H14v14"/>
    <path d="M23.5 26h4M23.5 40h4M25.5 38v4"/>
    <circle class="dot" cx="14" cy="26" r="1.7"/>
    <circle class="dot" cx="50" cy="33" r="1.7"/>`,
  fpga: `
    <rect class="acc" x="16" y="16" width="32" height="32" rx="3"/>
    <path d="M24 16V8M32 16V8M40 16V8M24 56v-8M32 56v-8M40 56v-8M16 24H8M16 32H8M16 40H8M56 24h-8M56 32h-8M56 40h-8"/>
    <path class="bg" d="M26 25h5a7 7 0 0 1 0 14h-5z"/>
    <path d="M21 29h5M21 35h5M38 32h5"/>`,
  emv: `
    <rect class="acc" x="5" y="22" width="14" height="20" rx="2"/>
    <path d="M23 26q4 6 0 12M28 21q7 11 0 22"/>
    <rect class="acc" x="36" y="14" width="5" height="36" rx="1.5"/>
    <rect class="acc" x="46" y="22" width="13" height="20" rx="2"/>
    <path d="M9 28h6M9 33h4M50 28h5M50 33h3"/>`,
  prisma: `
    <path class="acc" d="M32 12 50 46H14z"/>
    <path d="M4 34 22.5 30 42.6 32"/>
    <path d="M42.6 32 60 25M42.6 32 60 33M42.6 32 60 41"/>`,
  herz: `
    <path class="acc" d="M32 52C14 40 8 30 8 22a11 11 0 0 1 24-4 11 11 0 0 1 24 4c0 8-6 18-24 30z"/>
    <path d="M4 32h14l4-8 5 16 5-12 3 4h25"/>`,

  /* ---------- Vernetzte Welt ---------- */
  funkmast: `
    <path d="M32 24 22 58M32 24l10 36M26 46h12M24.5 52l13.5-6"/>
    <circle class="dot" cx="32" cy="20" r="3"/>
    <path d="M24 12a11 11 0 0 0 0 16M40 12a11 11 0 0 1 0 16M17 6a18 18 0 0 0 0 28M47 6a18 18 0 0 1 0 28"/>`,
  parabol: `
    <path class="acc" d="M12 20a26 26 0 0 0 30 30z"/>
    <path d="M20 42 36 26"/>
    <circle class="dot" cx="38" cy="24" r="2.8"/>
    <path d="M24 46l4 10M20 56h16"/>
    <path d="M44 14a10 10 0 0 1 6 6M46 6a17 17 0 0 1 12 12"/>`,
  iot: `
    <path class="acc" d="M20 30h26a8 8 0 0 0 0-16 12 12 0 0 0-23-3 9.5 9.5 0 0 0-3 19z"/>
    <path d="M22 30v11M33 30v15M44 30v11"/>
    <circle class="bg" cx="22" cy="44" r="3.5"/><circle class="bg" cx="33" cy="48" r="3.5"/><circle class="bg" cx="44" cy="44" r="3.5"/>`,
  schloss: `
    <path d="M21 28v-7a11 11 0 0 1 22 0v7"/>
    <rect class="acc" x="13" y="28" width="38" height="28" rx="4"/>
    <circle cx="32" cy="40" r="3.5"/>
    <path d="M32 43.5V50"/>`,

  /* ---------- KI & Daten ---------- */
  ki: `
    <path class="acc" d="M32 14C29 9 21 9 20 15c-6 0-9 6-6 11-5 3-4 11 1 13-1 6 5 10 10 8 2 4 6 4 7 2V14"/>
    <path class="acc" d="M32 14c3-5 11-5 12 1 6 0 9 6 6 11 5 3 4 11-1 13 1 6-5 10-10 8-2 4-6 4-7 2"/>
    <path d="M14 26c4 1 7 0 9-3M15 39c4-1 7-4 7-8M25 47c0-4 2-6 5-7"/>
    <path d="M32 24h6l4 4h3M32 33h9l3-3M32 42h6"/>
    <circle class="dot" cx="46.5" cy="28" r="1.6"/><circle class="dot" cx="39.5" cy="42" r="1.6"/>`,
  ml: neuralNet(),
  vision: `
    <path d="M6 14V7h7M51 7h7v7M58 50v7h-7M13 57H6v-7"/>
    <path class="acc" d="M11 32c5-8 12.5-12 21-12s16 4 21 12c-5 8-12.5 12-21 12s-16-4-21-12z"/>
    <circle class="bg" cx="32" cy="32" r="8"/>
    <rect x="29" y="29" width="6" height="6" rx="1"/>`,
  signal: `
    <path d="M6 22l5-9 5 15 5-11 4 7 5-12 5 18 4-10 5 6 4-4 5 2"/>
    <path d="M8 56h48"/>
    <path d="M13 56v-6M20 56v-14M27 56v-9M34 56v-17M41 56v-7M48 56v-11" stroke-width="4"/>`,
  diamant: `
    <path class="acc" d="M18 14h28l10 12-24 30L8 26z"/>
    <path d="M8 26h48M24 14l-4 12 12 30 12-30-4-12"/>
    <path d="M56 1v9M51.5 5.5h9"/>`,

  /* ---------- Management & Business ---------- */
  gantt: `
    <rect class="acc" x="12" y="10" width="40" height="48" rx="4"/>
    <rect class="bg" x="24" y="6" width="16" height="8" rx="2"/>
    <path d="M19 24h14M25 32h18M21 40h12M29 48h15" stroke-width="4.5"/>`,
  idee: `
    <path class="acc" d="M24 40c-5-4-8-9-8-15a16 16 0 0 1 32 0c0 6-3 11-8 15v6H24z"/>
    <path d="M25 51h14M27 56h10"/>
    <path d="M28 40v-9l4 4 4-4v9"/>
    <path d="M32 2v3M11 10l2 2M53 10l-2 2M4 25h3M57 25h3"/>`,
  beratung: `
    <path class="acc" d="M8 10h30a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H20l-8 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z"/>
    <path class="bg" d="M28 38v-6a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-2v7l-8-7H32a4 4 0 0 1-4-4z"/>
    <path d="M11 18h24M11 24h14M35 37h17M35 42h10"/>`,
  patent: `
    <path class="acc" d="M14 6h24l12 12v38H14z"/>
    <path d="M38 6v12h12"/>
    <path d="M20 24h18M20 31h24M20 38h10"/>
    <path class="bg" d="M35 49l-2 11 6-3 6 3-2-11"/>
    <circle class="bg" cx="39" cy="45" r="7"/>`,
  karriere: `
    <path class="acc" d="M32 6c8 6 12 16 10 30H22C20 22 24 12 32 6z"/>
    <circle class="bg" cx="32" cy="21" r="4"/>
    <path d="M22.5 29 15 37v7l8.5-4M41.5 29l7.5 8v7l-8.5-4"/>
    <path d="M27 40c0 6 2 10 5 15 3-5 5-9 5-15"/>`,

  /* ---------- Duales Studium ---------- */
  gehalt: `
    <circle class="acc" cx="32" cy="32" r="22"/>
    <path d="M40.4 24.3A10 10 0 1 0 40.4 39.7"/>
    <path d="M20 29h14M20 35h14"/>`,
  kurse: `
    <circle class="acc" cx="32" cy="22" r="6.5"/>
    <path d="M19 48c0-8.5 5.5-14 13-14s13 5.5 13 14"/>
    <circle cx="15" cy="27" r="4.5"/>
    <path d="M5 46c0-6.5 4-10.5 10-10.5 2.5 0 4.5.7 6 2"/>
    <circle cx="49" cy="27" r="4.5"/>
    <path d="M59 46c0-6.5-4-10.5-10-10.5-2.5 0-4.5.7-6 2"/>`,
};

/* ---------- Ausgabe ---------- */
const clean = (s) => s.replace(/\n\s*/g, '').trim();
const entries = Object.entries(ICONS).map(([name, body]) => `  ${JSON.stringify(name)}: ${JSON.stringify(clean(body))},`);
writeFileSync(join(ROOT, 'js', 'icons.js'), `/* Automatisch erzeugt von tools/generate-icons.mjs – bitte dort ändern. */
window.EIT_ICONS = {
${entries.join('\n')}
};
`);

// Favicon: Blitz in einer Kartenmarkierung
writeFileSync(join(ROOT, 'assets', 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<circle cx="32" cy="32" r="29" fill="#fbf7ef" stroke="#1c7ed6" stroke-width="4"/>
<path d="M35 10 18 36h12l-4 19 18-27H33z" fill="#ffd43b" stroke="#1b1f3a" stroke-width="3" stroke-linejoin="round"/>
</svg>
`);

console.log(`✔ ${Object.keys(ICONS).length} Icons → js/icons.js, Favicon → assets/favicon.svg`);

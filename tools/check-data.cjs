#!/usr/bin/env node
/**
 * Prüft js/data.js auf typische Fehler beim Bearbeiten: doppelte oder
 * unbekannte IDs, fehlende Icons, Positionen außerhalb der Karte.
 * Läuft vor jeder Veröffentlichung in der GitHub Action.
 *
 *   node tools/check-data.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'js', 'data.js'));
const data = window.EIT_MAP;

const SIZES = ['base', 'station', 'crown', 'perk'];
const errors = [];
const nodes = new Map();

for (const n of data.nodes) {
  if (nodes.has(n.id)) errors.push(`doppelte ID "${n.id}"`);
  nodes.set(n.id, n);
  if (!data.branches[n.branch]) errors.push(`${n.id}: unbekannter Ast "${n.branch}"`);
  if (!SIZES.includes(n.size)) errors.push(`${n.id}: size muss eines von ${SIZES.join(', ')} sein`);
  if (!n.title || !n.text) errors.push(`${n.id}: title oder text fehlt`);
  if (!(n.x >= 0 && n.x <= data.width && n.y >= 0 && n.y <= data.height)) {
    errors.push(`${n.id}: Position (${n.x}, ${n.y}) liegt außerhalb der Karte (${data.width} × ${data.height})`);
  }
  if (!fs.existsSync(path.join(ROOT, 'assets', 'icons', `${n.id}.svg`))) {
    errors.push(`${n.id}: Icon assets/icons/${n.id}.svg fehlt`);
  }
}

const known = (id, where) => {
  if (!nodes.has(id)) errors.push(`${where}: unbekannte ID "${id}"`);
  return nodes.get(id);
};
for (const [branch, def] of Object.entries(data.paths)) {
  for (const id of def.nodes) {
    const n = known(id, `paths.${branch}`);
    if (n && n.branch !== branch) errors.push(`paths.${branch}: "${id}" gehört zum Ast "${n.branch}"`);
  }
}
data.links.forEach(([a, b], i) => { known(a, `links[${i}]`); known(b, `links[${i}]`); });
known(data.layout.bus.from, 'layout.bus.from');
known(data.layout.bus.to, 'layout.bus.to');

if (errors.length) {
  console.error(`✖ ${errors.length} Fehler in js/data.js:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✔ js/data.js ist in Ordnung (${nodes.size} Stationen)`);

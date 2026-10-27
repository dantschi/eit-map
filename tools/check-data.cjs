#!/usr/bin/env node
/**
 * Prüft js/data.js auf typische Fehler beim Bearbeiten: doppelte oder
 * unbekannte IDs, fehlende Icons, ungenutzte Module, falsche Angaben zur
 * Studienrichtung. Läuft vor jeder Veröffentlichung in der GitHub Action.
 *
 *   node tools/check-data.cjs
 */
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'js', 'data.js'));
require(path.join(ROOT, 'js', 'icons.js'));
const data = window.EIT_MAP;
const icons = window.EIT_ICONS;

const errors = [];
const regions = new Map(data.regions.map((r) => [r.id, r]));
const ids = new Map();
const srKeys = Object.keys(data.studienrichtungen);

for (const item of [...data.modules, ...data.jobs]) {
  if (ids.has(item.id)) errors.push(`doppelte ID "${item.id}"`);
  ids.set(item.id, item);
  if (!item.title || !item.text) errors.push(`${item.id}: title oder text fehlt`);
}

/* Regionen und Anordnung */
const placed = data.layout.rows.flatMap((row) => row.regions);
for (const id of placed) if (!regions.has(id)) errors.push(`layout: unbekannte Region "${id}"`);
for (const r of data.regions) {
  const count = placed.filter((id) => id === r.id).length;
  if (count !== 1) errors.push(`Region "${r.id}" ist ${count}× in layout.rows eingetragen (erwartet: 1×)`);
  if (r.sr && !srKeys.includes(r.sr)) errors.push(`Region "${r.id}": unbekannte Studienrichtung "${r.sr}"`);
}

/* Module */
const used = new Set(data.jobs.flatMap((j) => j.modules));
for (const m of data.modules) {
  const region = regions.get(m.region);
  if (!region || region.kind === 'field') errors.push(`${m.id}: Region "${m.region}" ist keine Studien- oder Fundament-Region`);
  if (region?.kind === 'fund' && !icons[m.icon]) errors.push(`${m.id}: Icon "${m.icon}" fehlt in js/icons.js`);
  if (!Array.isArray(m.codes) || !m.codes.length || m.codes.some((c) => !/^T4[A-Z_]*\d+$/.test(c))) {
    errors.push(`${m.id}: codes müssen Modulnummern wie "T4EIT3102" sein`);
  }
  const sr = Object.entries(m.sr || {});
  if (!sr.length) errors.push(`${m.id}: sr (Angebot je Studienrichtung) fehlt`);
  for (const [k, v] of sr) {
    if (!srKeys.includes(k)) errors.push(`${m.id}: unbekannte Studienrichtung "${k}"`);
    if (v !== 'P' && v !== 'W') errors.push(`${m.id}: sr.${k} muss "P" oder "W" sein`);
  }
  if (!used.has(m.id)) errors.push(`${m.id}: wird von keinem Berufsbild genutzt`);
}

/* Berufsbilder */
for (const j of data.jobs) {
  if (regions.get(j.region)?.kind !== 'field') errors.push(`${j.id}: Region "${j.region}" ist kein Berufsfeld`);
  if (!icons[j.icon]) errors.push(`${j.id}: Icon "${j.icon}" fehlt in js/icons.js`);
  if (!j.hint) errors.push(`${j.id}: hint ("Warum jetzt") fehlt`);
  if (!j.modules?.length) errors.push(`${j.id}: keine Module angegeben`);
  for (const id of j.modules || []) {
    if (!ids.has(id) || data.jobs.includes(ids.get(id))) errors.push(`${j.id}: unbekanntes Modul "${id}"`);
  }
}

if (errors.length) {
  console.error(`✖ ${errors.length} Fehler in js/data.js:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✔ js/data.js ist in Ordnung (${data.jobs.length} Berufsbilder, ${data.modules.length} Module)`);

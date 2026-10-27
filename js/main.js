/**
 * Map of Electrical Engineering
 * Baut die Karte aus js/data.js (Inhalte) und js/icons.js (Icons) und steuert
 * Hervorhebungen, Tooltips, den Studienrichtungs-Filter und das Farbschema.
 * Keine Abhängigkeiten, läuft auch direkt per Doppelklick (file://).
 */
(() => {
  'use strict';

  const DATA = window.EIT_MAP;
  const ICONS = window.EIT_ICONS || {};
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const W = DATA.width;
  const H = DATA.height;
  const SR = DATA.studienrichtungen;

  /** Höhe des Titelbereichs je Regionsart (Karteneinheiten) */
  const TITLE_H = { field: 66, study: 62, fund: 46 };
  /** Flüsse mit weniger Modulbezügen werden nicht gezeichnet (Übersichtlichkeit) */
  const FLOW_MIN = 2;
  /** Ab diesem Anteil passender Module gilt ein Berufsbild als passend zur Studienrichtung */
  const FIT_THRESHOLD = 0.45;
  const FIT_STRONG = 0.65;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const regionsById = new Map(DATA.regions.map((r) => [r.id, r]));
  const modulesById = new Map(DATA.modules.map((m) => [m.id, m]));
  const jobsById = new Map(DATA.jobs.map((j) => [j.id, j]));
  const jobsByModule = new Map(DATA.modules.map((m) => [m.id, []]));
  for (const job of DATA.jobs) for (const id of job.modules) jobsByModule.get(id)?.push(job);

  /* ---------------------------------------------------------------------- */
  /* Hilfsfunktionen                                                         */
  /* ---------------------------------------------------------------------- */
  function svgEl(tag, attrs = {}, parent = null) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (parent) parent.appendChild(el);
    return el;
  }

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /** Bedingte Trennstellen (&shy;) aus den Daten fürs Vorlesen entfernen */
  const plain = (s) => s.replace(/­/g, '');

  const icon = (name) =>
    `<svg class="ico" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  const r1 = (v) => Math.round(v * 10) / 10;
  const pct = (v, total) => `${(v / total) * 100}%`;

  const isUnitOnly = (m) => Object.values(m.sr).every((k) => k === 'W');

  /** Wie gut passt ein Berufsbild zu einer Studienrichtung? (0 … 1, Fundament zählt nicht) */
  function fit(job, sr) {
    const own = job.modules.map((id) => modulesById.get(id)).filter((m) => m.region !== 'fund');
    if (!own.length) return 0;
    const score = own.reduce((sum, m) => sum + (m.sr[sr] === 'P' ? 1 : m.sr[sr] === 'W' ? 0.6 : 0), 0);
    return score / own.length;
  }

  /* ---------------------------------------------------------------------- */
  /* Farbschema (hell / dunkel)                                             */
  /* ---------------------------------------------------------------------- */
  function initTheme() {
    const root = document.documentElement;
    const button = document.querySelector('[data-theme-toggle]');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const stored = () => {
      try { return localStorage.getItem('eit-theme'); } catch { return null; }
    };
    const apply = (theme) => {
      root.dataset.theme = theme;
      button?.setAttribute('aria-label', theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c1c1c' : '#3c3c3c');
    };
    apply(root.dataset.theme || (systemDark.matches ? 'dark' : 'light'));
    button?.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('eit-theme', next); } catch { /* privater Modus */ }
    });
    systemDark.addEventListener('change', (e) => {
      if (!stored()) apply(e.matches ? 'dark' : 'light');
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Layout: Regionen aus den Zeilen berechnen, Einträge darin verteilen     */
  /* ---------------------------------------------------------------------- */
  function computeLayout() {
    const { margin, gap, rows } = DATA.layout;
    rows.forEach((row, rowIndex) => {
      const weights = row.weights || row.regions.map(() => 1);
      const total = weights.reduce((a, b) => a + b, 0);
      const avail = W - 2 * margin - gap * (row.regions.length - 1);
      let x = margin;
      row.regions.forEach((id, i) => {
        const w = (avail * weights[i]) / total;
        Object.assign(regionsById.get(id), { box: { x, y: row.y, w, h: row.h }, row: rowIndex });
        x += w + gap;
      });
    });
    for (const region of DATA.regions) {
      const list = region.kind === 'field' ? DATA.jobs : DATA.modules;
      region.items = list.filter((it) => it.region === region.id);
      placeItems(region);
    }
  }

  function placeItems(region) {
    const { x, y, w, h } = region.box;
    const n = region.items.length;
    const cols = Math.min(region.cols, n);
    const rows = Math.ceil(n / cols);
    const padX = 10;
    const top = y + TITLE_H[region.kind];
    const cw = (w - 2 * padX) / cols;
    const ch = (y + h - 10 - top) / rows;
    region.items.forEach((it, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = x + padX + cw * (col + 0.5);
      let cy = top + ch * (row + 0.5);
      if (region.kind !== 'study') cy -= region.kind === 'field' ? 20 : 16; // Abzeichen oben, Beschriftung darunter
      Object.assign(it, { x: cx, y: cy, cellW: cw });
    });
  }

  /** Sankey-Band: gefüllte Fläche zwischen zwei S-Kurven der Breite w */
  function ribbon(ax, ay, bx, by, w) {
    const k = (ay - by) * 0.5;
    const h = w / 2;
    return `M${r1(ax - h)} ${r1(ay)}C${r1(ax - h)} ${r1(ay - k)} ${r1(bx - h)} ${r1(by + k)} ${r1(bx - h)} ${r1(by)}`
      + `L${r1(bx + h)} ${r1(by)}C${r1(bx + h)} ${r1(by + k)} ${r1(ax + h)} ${r1(ay - k)} ${r1(ax + h)} ${r1(ay)}Z`;
  }

  /** S-Kurve mit senkrechten Tangenten von unten (a) nach oben (b) */
  function riseCurve(ax, ay, bx, by) {
    const k = (ay - by) * 0.5;
    return `M${r1(ax)} ${r1(ay)}C${r1(ax)} ${r1(ay - k)} ${r1(bx)} ${r1(by + k)} ${r1(bx)} ${r1(by)}`;
  }

  /* ---------------------------------------------------------------------- */
  /* Flussband: Wie viele Module einer Studienrichtung führen in ein Feld?  */
  /* ---------------------------------------------------------------------- */
  const flowWidth = (w) => Math.min(18, 2 + w * 1.1);

  function computeFlows() {
    const weights = new Map();
    for (const job of DATA.jobs) {
      for (const id of job.modules) {
        const m = modulesById.get(id);
        if (regionsById.get(m.region).kind !== 'study') continue;
        const key = `${m.region}>${job.region}`;
        weights.set(key, (weights.get(key) || 0) + 1);
      }
    }
    const flows = [...weights].filter(([, w]) => w >= FLOW_MIN).map(([key, w]) => {
      const [from, to] = key.split('>');
      return { from, to, w };
    });
    const center = (id) => {
      const b = regionsById.get(id).box;
      return b.x + b.w / 2;
    };
    // Bänder an den Kanten nebeneinander stapeln, sortiert nach dem Gegenüber → wenige Kreuzungen
    const stack = (ends, key, other, edgeY) => {
      for (const id of new Set(flows.map((f) => f[key]))) {
        const list = flows.filter((f) => f[key] === id).sort((p, q) => center(p[other]) - center(q[other]));
        const b = regionsById.get(id).box;
        const total = list.reduce((s, f) => s + flowWidth(f.w), 0) + (list.length - 1) * 3;
        let x = b.x + b.w / 2 - total / 2;
        for (const f of list) {
          f[ends] = [x + flowWidth(f.w) / 2, edgeY(b)];
          x += flowWidth(f.w) + 3;
        }
      }
    };
    stack('start', 'from', 'to', (b) => b.y);
    stack('end', 'to', 'from', (b) => b.y + b.h);
    return flows;
  }

  /* ---------------------------------------------------------------------- */
  /* Karte aufbauen                                                          */
  /* ---------------------------------------------------------------------- */
  function buildMap(map) {
    computeLayout();
    map.style.setProperty('--map-w', W);
    map.style.aspectRatio = `${W} / ${H}`;

    const svg = svgEl('svg', { class: 'map__art', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false' });
    const regionLayer = svgEl('g', { class: 'layer-regions' }, svg);
    const flowLayer = svgEl('g', { class: 'layer-flows' }, svg);
    const linkLayer = svgEl('g', { class: 'layer-links' }, svg);
    map.append(svg);

    /* Regionen: klare Rechtecke, Berufsfelder mit roter Kopflinie */
    const regionEls = new Map();
    for (const region of DATA.regions) {
      const { x, y, w, h } = region.box;
      const g = svgEl('g', { class: `region region--${region.kind}`, 'data-c': region.id }, regionLayer);
      g.style.setProperty('--delay', `${0.15 + (2 - region.row) * 0.3}s`);
      svgEl('rect', { class: 'region__shape', x, y, width: w, height: h }, g);
      if (region.kind === 'field') svgEl('rect', { class: 'region__rule', x, y, width: w, height: 5 }, g);
      regionEls.set(region.id, g);
    }

    /* Flussbänder Studium → Berufsfelder und Fundament → Studium */
    const flows = computeFlows();
    for (const f of flows) {
      const d = riseCurve(f.start[0], f.start[1], f.end[0], f.end[1]);
      f.el = svgEl('g', { class: 'flow' }, flowLayer);
      svgEl('path', { class: 'flow__band', d: ribbon(f.start[0], f.start[1], f.end[0], f.end[1], flowWidth(f.w)) }, f.el);
      svgEl('path', { class: 'flow__pulse', d }, f.el);
      svgEl('title', {}, f.el).textContent = `${f.w} Modulbezüge`;
    }
    const fund = regionsById.get('fund');
    for (const region of DATA.regions.filter((r) => r.kind === 'study')) {
      const x = region.box.x + region.box.w / 2;
      const d = riseCurve(x, fund.box.y, x, region.box.y + region.box.h);
      const el = svgEl('g', { class: 'flow' }, flowLayer);
      svgEl('path', { class: 'flow__band', d: ribbon(x, fund.box.y, x, region.box.y + region.box.h, 12) }, el);
      svgEl('path', { class: 'flow__pulse', d }, el);
      flows.push({ from: 'fund', to: region.id, el });
    }

    /* Regionstitel (Buttons: Klick hebt das Feld bzw. die Studienrichtung hervor) */
    const labelLayer = document.createElement('div');
    labelLayer.className = 'map__labels';
    for (const region of DATA.regions) {
      const { x, y, w } = region.box;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `region-title region-title--${region.kind}`;
      el.dataset.c = region.id;
      el.dataset.region = region.id;
      el.style.left = pct(x, W);
      el.style.top = pct(y, H);
      el.style.width = pct(w, W);
      el.style.setProperty('--delay', `${0.25 + (2 - region.row) * 0.3}s`);
      el.setAttribute('aria-pressed', 'false');
      if (region.kind === 'study' && region.sr) {
        el.innerHTML = `<small>Studienrichtung</small><span>${escapeHtml(SR[region.sr])}</span>`;
      } else if (region.note) {
        el.innerHTML = `<span>${escapeHtml(region.name)}</span><small>${escapeHtml(region.note)}</small>`;
      } else {
        el.innerHTML = `<span>${escapeHtml(region.name)}</span>`;
      }
      labelLayer.append(el);
    }
    map.append(labelLayer);

    /* Berufsbilder und Module als echte Buttons (Tastatur, Screenreader, Touch) */
    const itemLayer = document.createElement('div');
    itemLayer.className = 'map__items';
    const itemEls = new Map();
    const place = (el, it, region, i) => {
      el.style.left = pct(it.x, W);
      el.style.top = pct(it.y, H);
      el.style.setProperty('--w', r1(it.cellW));
      el.style.setProperty('--delay', `${0.35 + (2 - region.row) * 0.3 + i * 0.03}s`);
      el.dataset.c = region.id;
      el.setAttribute('aria-describedby', `desc-${it.id}`);
      itemLayer.append(el);
      itemEls.set(it.id, el);
    };
    for (const region of DATA.regions) {
      region.items.forEach((it, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.dataset.id = it.id;
        if (region.kind === 'field') {
          el.className = 'job';
          el.innerHTML = `<span class="badge">${icon(it.icon)}</span><span class="job__label">${escapeHtml(it.title)}</span>
            <span class="sr-only" id="desc-${it.id}">${escapeHtml(`${it.text} Vorbereitung durch: ${it.modules.map((id) => plain(modulesById.get(id).title)).join(', ')}.`)}</span>`;
        } else if (region.kind === 'fund') {
          el.className = 'mod mod--fund';
          el.innerHTML = `<span class="badge">${icon(it.icon)}</span><span class="mod__label">${escapeHtml(it.title)}</span>
            <span class="sr-only" id="desc-${it.id}">${escapeHtml(it.text)}</span>`;
        } else {
          el.className = `mod${isUnitOnly(it) ? ' mod--wahl' : ''}`;
          const dots = Object.keys(SR)
            .filter((k) => it.sr[k])
            .map((k) => `<i data-c="${k}" class="sr sr--${it.sr[k] === 'P' ? 'p' : 'w'}">${SR[k][0]}</i>`)
            .join('');
          el.innerHTML = `<span class="mod__label">${escapeHtml(it.title)}</span><span class="mod__sr">${dots}</span>
            <span class="sr-only" id="desc-${it.id}">${escapeHtml(`${availability(it)}. ${it.text}`)}</span>`;
        }
        place(el, it, region, i);
      });
    }
    map.append(itemLayer);

    return { svg, linkLayer, regionEls, flows, itemEls, labelLayer };
  }

  /** "Automation: Pflicht · Elektronik: Wahl" */
  function availability(m) {
    if (m.unit) return 'In allen Studienrichtungen wählbar';
    const all = Object.keys(SR).every((k) => m.sr[k] === 'P');
    if (all) return 'Pflicht in allen Studienrichtungen';
    return Object.keys(SR)
      .filter((k) => m.sr[k])
      .map((k) => `${SR[k]}: ${m.sr[k] === 'P' ? 'Pflicht' : 'Wahl'}`)
      .join(' · ');
  }

  /* ---------------------------------------------------------------------- */
  /* Hervorhebung: Verbindungen Modul ↔ Berufsbild                          */
  /* ---------------------------------------------------------------------- */
  function createHighlighter(map, parts) {
    const { linkLayer, itemEls, regionEls, flows, labelLayer } = parts;

    function anchor(it, top) {
      const region = regionsById.get(it.region);
      if (region.kind === 'field') return [it.x, it.y + (top ? -28 : 28)];
      if (region.kind === 'fund') return [it.x, it.y - 26];
      return [it.x, it.y - 13];
    }

    function drawLinks(pairs) {
      linkLayer.replaceChildren();
      pairs.forEach(([m, job], i) => {
        const [sx, sy] = anchor(m, true);
        const [ex, ey] = anchor(job, false);
        const path = svgEl('path', { class: 'link', d: riseCurve(sx, sy, ex, ey), 'data-c': job.region }, linkLayer);
        const len = Math.ceil(path.getTotalLength()) + 2;
        path.style.setProperty('--len', len);
        path.style.setProperty('--delay', `${Math.min(i * 0.035, 0.5)}s`);
      });
      // Startzustand erst berechnen lassen, dann zeichnen – sonst gibt es keinen Übergang
      void linkLayer.getBoundingClientRect();
      linkLayer.classList.add('is-drawn');
    }

    function apply({ items = [], strong = [], regions = [], pairs = [], flowsLit = () => false }) {
      const lit = new Set(items);
      const strongSet = new Set(strong);
      map.classList.add('is-focused');
      for (const [id, el] of itemEls) {
        el.classList.toggle('is-lit', lit.has(id));
        el.classList.toggle('is-strong', strongSet.has(id));
      }
      const regionSet = new Set(regions);
      for (const [id, el] of regionEls) el.classList.toggle('is-lit', regionSet.has(id));
      for (const el of labelLayer.children) el.classList.toggle('is-lit', regionSet.has(el.dataset.region));
      for (const f of flows) f.el.classList.toggle('is-lit', flowsLit(f));
      linkLayer.classList.remove('is-drawn');
      drawLinks(pairs);
    }

    function clear() {
      map.classList.remove('is-focused');
      map.querySelectorAll('.is-lit, .is-strong').forEach((el) => el.classList.remove('is-lit', 'is-strong'));
      linkLayer.replaceChildren();
    }

    function forJob(id) {
      const job = jobsById.get(id);
      const mods = job.modules.map((m) => modulesById.get(m));
      const regions = new Set([job.region, ...mods.map((m) => m.region)]);
      apply({
        items: [id, ...job.modules],
        strong: [id],
        regions: [...regions],
        pairs: mods.map((m) => [m, job]),
        flowsLit: (f) => f.to === job.region && mods.some((m) => m.region === f.from),
      });
    }

    function forModule(id) {
      const mod = modulesById.get(id);
      const jobs = jobsByModule.get(id);
      apply({
        items: [id, ...jobs.map((j) => j.id)],
        strong: [id],
        regions: [mod.region, ...jobs.map((j) => j.region)],
        pairs: jobs.map((j) => [mod, j]),
        flowsLit: (f) => f.from === mod.region && jobs.some((j) => j.region === f.to),
      });
    }

    function forRegion(id) {
      const region = regionsById.get(id);
      if (region.kind === 'field') {
        const pairs = region.items.flatMap((job) => job.modules.map((m) => [modulesById.get(m), job]));
        apply({
          items: [...region.items.map((j) => j.id), ...pairs.map(([m]) => m.id)],
          regions: [id, ...new Set(pairs.map(([m]) => m.region))],
          pairs,
          flowsLit: (f) => f.to === id,
        });
      } else {
        const jobs = new Set(region.items.flatMap((m) => jobsByModule.get(m.id)));
        apply({
          items: [...region.items.map((m) => m.id), ...[...jobs].map((j) => j.id)],
          regions: [id, ...[...jobs].map((j) => j.region)],
          flowsLit: (f) => f.from === id,
        });
      }
    }

    /** Studienrichtung: angebotene Module + Berufsbilder, die dazu passen */
    function forStudienrichtung(sr) {
      const mods = DATA.modules.filter((m) => m.sr[sr]);
      const jobs = DATA.jobs.filter((j) => fit(j, sr) >= FIT_THRESHOLD);
      apply({
        items: [...mods.map((m) => m.id), ...jobs.map((j) => j.id)],
        strong: [...mods.filter((m) => m.sr[sr] === 'P').map((m) => m.id), ...jobs.filter((j) => fit(j, sr) >= FIT_STRONG).map((j) => j.id)],
        regions: [sr, 'fund', ...new Set(jobs.map((j) => j.region))],
        flowsLit: (f) => f.from === sr || f.to === sr,
      });
    }

    return { forJob, forModule, forRegion, forStudienrichtung, clear };
  }

  /* ---------------------------------------------------------------------- */
  /* Tooltip                                                                 */
  /* ---------------------------------------------------------------------- */
  function createTooltip(map) {
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.setAttribute('aria-hidden', 'true'); // Inhalte stehen Screenreadern per aria-describedby zur Verfügung
    map.append(tip);
    const scroller = map.parentElement;
    const topbar = document.querySelector('.navbar');

    const chip = (m) => {
      const region = regionsById.get(m.region);
      const where = region.kind === 'fund' ? 'Fundament' : region.sr ? SR[region.sr] : 'Wahl';
      return `<li data-c="${m.region}"><span>${escapeHtml(m.title)}</span><em>${where}</em></li>`;
    };

    function jobHtml(job) {
      const mods = job.modules.map((id) => modulesById.get(id));
      const order = (m) => (m.region === 'fund' ? 2 : m.region === 'wahl' ? 1 : 0);
      mods.sort((a, b) => order(a) - order(b));
      const fits = Object.keys(SR).filter((k) => fit(job, k) >= FIT_THRESHOLD).map((k) => SR[k]);
      return `
        <span class="tooltip__tag">${escapeHtml(regionsById.get(job.region).name)}</span>
        <strong class="tooltip__title">${escapeHtml(job.title)}</strong>
        <p class="tooltip__text">${escapeHtml(job.text)}</p>
        <p class="tooltip__hint"><b>Warum jetzt:</b> ${escapeHtml(job.hint)}</p>
        <p class="tooltip__sub">Das bringt dich hin</p>
        <ul class="tooltip__chips">${mods.map(chip).join('')}</ul>
        ${fits.length ? `<p class="tooltip__fit">Passt besonders zu: ${fits.join(', ')}</p>` : ''}`;
    }

    function moduleHtml(m) {
      const region = regionsById.get(m.region);
      const jobs = jobsByModule.get(m.id);
      const meta = m.unit
        ? `Wahlunit im Modul „Ausgewählte Themen der Elektro- und Informationstechnik“ (${m.codes[0]}) · ${m.year} Studienjahr`
        : `${m.codes.join(', ')} · ${m.year} Studienjahr`;
      return `
        <span class="tooltip__tag">${escapeHtml(region.kind === 'fund' ? 'Fundament' : region.sr ? `Studienrichtung ${SR[region.sr]}` : region.name)}</span>
        <strong class="tooltip__title">${escapeHtml(m.title)}</strong>
        <p class="tooltip__meta">${escapeHtml(meta)}<br>${escapeHtml(availability(m))}</p>
        <p class="tooltip__text">${escapeHtml(m.text)}</p>
        <p class="tooltip__sub">Führt zu ${jobs.length} Berufsbild${jobs.length === 1 ? '' : 'ern'}</p>
        <ul class="tooltip__chips">${jobs.map((j) => `<li data-c="${j.region}"><span>${escapeHtml(j.title)}</span></li>`).join('')}</ul>`;
    }

    function position(anchor) {
      const mapBox = map.getBoundingClientRect();
      const view = scroller.getBoundingClientRect();
      const target = (anchor.querySelector('.badge') || anchor).getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const gap = 12;
      const minX = Math.max(mapBox.left, view.left, 0) + 8;
      const maxX = Math.min(mapBox.right, view.right, window.innerWidth) - 8;
      const cx = target.left + target.width / 2;
      const x = Math.max(minX, Math.min(cx - tw / 2, maxX - tw));
      const minY = Math.max(view.top, (topbar?.offsetHeight ?? 0) + 8);
      const below = target.top - th - gap < minY;
      const bottomEdge = anchor.getBoundingClientRect().bottom;
      const y = below ? bottomEdge + gap : target.top - th - gap;
      tip.dataset.placement = below ? 'bottom' : 'top';
      tip.style.left = `${x - mapBox.left}px`;
      tip.style.top = `${y - mapBox.top}px`;
      tip.style.setProperty('--arrow-x', `${Math.max(18, Math.min(cx - x, tw - 18))}px`);
    }

    function show(id, anchor) {
      const job = jobsById.get(id);
      const item = job || modulesById.get(id);
      tip.dataset.c = item.region;
      tip.innerHTML = job ? jobHtml(job) : moduleHtml(item);
      position(anchor);
      tip.classList.add('is-visible');
    }

    const hide = () => tip.classList.remove('is-visible');
    return { show, hide, position };
  }

  /* ---------------------------------------------------------------------- */
  /* Interaktion                                                             */
  /* ---------------------------------------------------------------------- */
  function initInteractions(map, parts, tooltip, highlighter) {
    let active = null; // geöffneter Eintrag
    let pinned = false; // per Klick/Tippen festgehalten
    let filter = null; // { type: 'sr' | 'region', id }
    const filterButtons = [...document.querySelectorAll('[data-sr-filter]'), ...parts.labelLayer.children];

    const restoreFilter = () => {
      if (!filter) highlighter.clear();
      else if (filter.type === 'sr') highlighter.forStudienrichtung(filter.id);
      else highlighter.forRegion(filter.id);
    };

    function open(id) {
      if (active && active !== id) parts.itemEls.get(active).classList.remove('is-active');
      active = id;
      const el = parts.itemEls.get(id);
      el.classList.add('is-active');
      if (jobsById.has(id)) highlighter.forJob(id);
      else highlighter.forModule(id);
      tooltip.show(id, el);
    }

    function close() {
      if (active) parts.itemEls.get(active).classList.remove('is-active');
      active = null;
      pinned = false;
      tooltip.hide();
      restoreFilter();
    }

    for (const [id, el] of parts.itemEls) {
      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'touch' && !pinned) open(id);
      });
      el.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'touch' && !pinned) close();
      });
      el.addEventListener('focus', () => {
        if (active !== id) { pinned = false; open(id); }
      });
      el.addEventListener('blur', () => {
        if (!pinned) close();
      });
      el.addEventListener('click', () => {
        if (pinned && active === id) { close(); return; }
        open(id);
        pinned = true;
      });
    }

    document.addEventListener('click', (e) => {
      if (active && !e.target.closest('.job, .mod')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && active) close();
    });
    const reposition = () => active && tooltip.position(parts.itemEls.get(active));
    window.addEventListener('resize', reposition);
    map.parentElement.addEventListener('scroll', reposition, { passive: true });

    /* Filter: Studienrichtung (Legende) oder Region (Regionstitel) */
    function setFilter(next) {
      filter = next && filter && next.type === filter.type && next.id === filter.id ? null : next;
      for (const b of filterButtons) {
        const on = filter && ((b.dataset.srFilter && filter.type === 'sr' && b.dataset.srFilter === filter.id)
          || (b.dataset.region && filter.type === 'region' && b.dataset.region === filter.id));
        b.setAttribute('aria-pressed', String(Boolean(on)));
      }
      if (active) close();
      else restoreFilter();
    }
    for (const b of filterButtons) {
      const next = b.dataset.srFilter ? { type: 'sr', id: b.dataset.srFilter } : { type: 'region', id: b.dataset.region };
      b.addEventListener('click', () => setFilter(next));
      b.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch' || active || filter) return;
        if (next.type === 'sr') highlighter.forStudienrichtung(next.id);
        else highlighter.forRegion(next.id);
      });
      b.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'touch' && !active) restoreFilter();
      });
    }

    /** Von außen (Berufsbild-Karten): Eintrag auf der Karte zeigen */
    return {
      reveal(id) {
        const el = parts.itemEls.get(id);
        if (!el) return;
        if (filter) setFilter(filter); // Filter aufheben
        map.closest('section')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        const scroller = map.parentElement;
        scroller.scrollLeft = el.offsetLeft - scroller.clientWidth / 2;
        setTimeout(() => {
          el.focus({ preventScroll: true });
          open(id);
          pinned = true;
        }, reducedMotion.matches ? 0 : 450);
      },
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Berufsbilder als Karten (übersichtlich auf dem Smartphone)             */
  /* ---------------------------------------------------------------------- */
  function buildJobCards(container, api) {
    const fields = DATA.regions.filter((r) => r.kind === 'field');
    container.innerHTML = fields.map((field) => `
      <section class="field" data-c="${field.id}" aria-labelledby="field-${field.id}">
        <h3 id="field-${field.id}">${escapeHtml(field.name)}</h3>
        <div class="cards">
          ${DATA.jobs.filter((j) => j.region === field.id).map((job) => {
            const own = job.modules.map((id) => modulesById.get(id)).filter((m) => m.region !== 'fund');
            const base = job.modules.length - own.length;
            return `
            <article class="card">
              <span class="badge">${icon(job.icon)}</span>
              <h4>${escapeHtml(job.title)}</h4>
              <p>${escapeHtml(job.text)}</p>
              <p class="card__hint">${escapeHtml(job.hint)}</p>
              <ul class="card__mods" aria-label="Module">
                ${own.map((m) => `<li data-c="${m.region}">${escapeHtml(m.title)}</li>`).join('')}
                ${base ? `<li data-c="fund">+ ${base} Grundlagen</li>` : ''}
              </ul>
              <button class="card__show" type="button" data-show="${job.id}">Auf der Map zeigen</button>
            </article>`;
          }).join('')}
        </div>
      </section>`).join('');
    container.addEventListener('click', (e) => {
      const button = e.target.closest('[data-show]');
      if (button) api.reveal(button.dataset.show);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Aufbau-Animation, sobald die Karte sichtbar wird                       */
  /* ---------------------------------------------------------------------- */
  function initReveal(map) {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      map.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        map.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(map);
  }

  /** Auf schmalen Bildschirmen ist die Karte horizontal scrollbar – mittig starten. */
  function centerScroller(scroller) {
    const center = () => { scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2; };
    center();
    window.matchMedia('(orientation: portrait)').addEventListener('change', center);
  }

  /* ---------------------------------------------------------------------- */
  /* Start                                                                   */
  /* ---------------------------------------------------------------------- */
  initTheme();
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = { jobs: DATA.jobs.length, modules: DATA.modules.length }[el.dataset.count] ?? '';
  });

  const toTop = document.querySelector('[data-to-top]');
  if (toTop) {
    const update = () => toTop.classList.toggle('is-visible', window.scrollY > 600);
    window.addEventListener('scroll', update, { passive: true });
    update();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
  }

  const map = document.getElementById('eit-map');
  if (!map || !DATA) return;

  const parts = buildMap(map);
  const tooltip = createTooltip(map);
  const highlighter = createHighlighter(map, parts);
  const api = initInteractions(map, parts, tooltip, highlighter);
  const cards = document.getElementById('berufe-liste');
  if (cards) buildJobCards(cards, api);
  initReveal(map);
  centerScroller(map.parentElement);
})();

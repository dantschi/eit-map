/**
 * Map of Electrical Engineering
 * Baut die Karte aus js/data.js und steuert Animationen, Tooltips,
 * Pfad-Hervorhebung und das Farbschema. Keine Abhängigkeiten, läuft auch
 * direkt per Doppelklick (file://).
 */
(() => {
  'use strict';

  const DATA = window.EIT_MAP;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const W = DATA.width;
  const H = DATA.height;

  /** Durchmesser der Stations-Scheiben in Karteneinheiten */
  const SIZES = { base: 96, station: 76, crown: 104, perk: 64 };
  /** Aufbau-Animation: Startzeit und Dauer pro Ebene in Sekunden */
  const INTRO_START = 0.3;
  const INTRO_STEP = 0.38;
  const INTRO_END = INTRO_START + 5 * INTRO_STEP + 0.4;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nodesById = new Map(DATA.nodes.map((n) => [n.id, n]));
  const branchNodes = (branch) => DATA.nodes.filter((n) => n.branch === branch).map((n) => n.id);

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

  /** S-Kurve mit senkrechten Tangenten – so wirken die Verbindungen gewachsen. */
  function curveTo(a, b) {
    const dy = (b.y - a.y) * 0.55;
    return `C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`;
  }

  const levelDelay = (level) => INTRO_START + Math.max(0, level - 1) * INTRO_STEP;

  /* ---------------------------------------------------------------------- */
  /* Farbschema (hell / dunkel)                                             */
  /* ---------------------------------------------------------------------- */
  function initTheme() {
    const root = document.documentElement;
    const button = document.querySelector('[data-theme-toggle]');
    const systemLight = window.matchMedia('(prefers-color-scheme: light)');
    const stored = () => {
      try { return localStorage.getItem('eit-theme'); } catch { return null; }
    };

    const apply = (theme) => {
      root.dataset.theme = theme;
      button?.setAttribute('aria-label', theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#05060f' : '#f3f5fc');
    };

    apply(root.dataset.theme || (systemLight.matches ? 'light' : 'dark'));

    button?.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('eit-theme', next); } catch { /* privater Modus */ }
    });
    systemLight.addEventListener('change', (e) => {
      if (!stored()) apply(e.matches ? 'light' : 'dark');
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Karte aufbauen                                                          */
  /* ---------------------------------------------------------------------- */
  function buildDefs(defs) {
    // Weicher Neon-Schein. userSpaceOnUse, damit auch gerade Linien (Höhe 0) leuchten.
    const blur = svgEl('filter', {
      id: 'neon-blur', filterUnits: 'userSpaceOnUse', x: -60, y: -60, width: W + 120, height: H + 120,
    }, defs);
    svgEl('feGaussianBlur', { stdDeviation: 7 }, blur);

    const plinthFill = svgEl('linearGradient', { id: 'plinth-fill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svgEl('stop', { offset: 0, style: 'stop-color: var(--c-fund); stop-opacity: .22' }, plinthFill);
    svgEl('stop', { offset: 1, style: 'stop-color: var(--c-fund); stop-opacity: .03' }, plinthFill);

    const dots = svgEl('pattern', { id: 'plinth-dots', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, defs);
    svgEl('circle', { cx: 8, cy: 8, r: 1.2, style: 'fill: var(--c-fund); fill-opacity: .35' }, dots);

    // Halo der "Elektronen" je Farbe
    for (const branch of Object.keys(DATA.branches)) {
      const halo = svgEl('radialGradient', { id: `halo-${branch}` }, defs);
      svgEl('stop', { offset: 0, style: `stop-color: var(--c-${branch}); stop-opacity: .95` }, halo);
      svgEl('stop', { offset: 1, style: `stop-color: var(--c-${branch}); stop-opacity: 0` }, halo);
    }
  }

  function buildMap(map) {
    map.style.setProperty('--map-w', W);
    map.style.aspectRatio = `${W} / ${H}`;

    // Zwei SVG-Ebenen: der (teure) Weichzeichner-Glow liegt auf einer eigenen
    // Compositing-Ebene, damit die laufenden Animationen ihn nicht neu berechnen.
    const glowSvg = svgEl('svg', { class: 'map__glow', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false' });
    const wireSvg = svgEl('svg', { class: 'map__wires', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false' });
    map.append(glowSvg, wireSvg);

    const defs = svgEl('defs', {}, glowSvg);
    buildDefs(defs);

    const glowLayer = svgEl('g', { class: 'layer-glow', filter: 'url(#neon-blur)' }, glowSvg);
    const decorLayer = svgEl('g', { class: 'layer-decor' }, wireSvg);
    const linkLayer = svgEl('g', { class: 'layer-links' }, wireSvg);
    const coreLayer = svgEl('g', { class: 'layer-core' }, wireSvg);
    const flowLayer = svgEl('g', { class: 'layer-flow' }, wireSvg);
    const padLayer = svgEl('g', { class: 'layer-pads' }, wireSvg);
    const sparkLayer = svgEl('g', { class: 'layer-sparks' }, wireSvg);

    const edges = [];
    function addEdge(d, opts) {
      const attrs = (part) => ({ d, class: `wire wire--${part} wire--${opts.kind}`, 'data-branch': opts.branch });
      const paths = [
        svgEl('path', attrs('glow'), glowLayer),
        svgEl('path', attrs('core'), coreLayer),
        svgEl('path', attrs('flow'), flowLayer),
      ];
      const len = Math.ceil(paths[1].getTotalLength()) + 2;
      for (const p of paths) {
        p.style.setProperty('--len', len);
        p.style.setProperty('--delay', `${opts.delay}s`);
        p.style.setProperty('--dur', `${opts.dur}s`);
      }
      const edge = { paths, ...opts };
      edges.push(edge);
      return edge;
    }

    const { plinth, bus, ground } = DATA.layout;

    /* Sockel des Fundaments */
    const plinthBox = { x: plinth.x, y: plinth.y, width: plinth.w, height: plinth.h, rx: 26, 'data-decor': 'fund' };
    svgEl('rect', { class: 'plinth-glow', ...plinthBox }, glowLayer);
    svgEl('rect', { class: 'plinth', ...plinthBox }, decorLayer);
    svgEl('rect', { class: 'plinth-dots', ...plinthBox }, decorLayer);

    /* Leiterbahn zwischen den Fundament-Knoten – hier docken die Äste an */
    const a = nodesById.get(bus.from);
    const b = nodesById.get(bus.to);
    const r = 18;
    const busEdge = addEdge(
      `M${a.x} ${a.y}V${bus.y + r}Q${a.x} ${bus.y} ${a.x + r} ${bus.y}H${b.x - r}Q${b.x} ${bus.y} ${b.x} ${bus.y + r}V${b.y}`,
      { kind: 'bus', branch: 'fund', delay: 0, dur: INTRO_START },
    );

    /* Grundlinie "Duales Studium" mit Stützen zum Sockel */
    const groundEdge = addEdge(`M${ground.x1} ${ground.y}H${ground.x2}`, { kind: 'ground', branch: 'dual', delay: 0, dur: 1.2 });
    const pillarEdges = ground.pillars.map((x) =>
      addEdge(`M${x} ${plinth.y + plinth.h}V${ground.y}`, { kind: 'pillar', branch: 'fund', delay: 0.2, dur: 0.4 }),
    );
    for (const x of [ground.x1, ground.x2]) {
      svgEl('circle', { class: 'pad', cx: x, cy: ground.y, r: 7, 'data-branch': 'dual', 'data-decor': 'dual' }, padLayer);
    }
    const groundLabel = svgEl('text', { class: 'ground-label', x: ground.x1, y: ground.y - 40, 'data-decor': 'dual' }, decorLayer);
    groundLabel.textContent = `${DATA.branches.dual.name.toUpperCase()} · DHBW STUTTGART`;

    /* Namensschild des Fundaments */
    const plate = svgEl('g', { class: 'nameplate', 'data-decor': 'fund' }, decorLayer);
    const plateY = plinth.y + plinth.h;
    svgEl('rect', { x: plinth.x + plinth.w / 2 - 95, y: plateY - 17, width: 190, height: 34, rx: 17 }, plate);
    const plateText = svgEl('text', { x: plinth.x + plinth.w / 2, y: plateY + 1 }, plate);
    plateText.textContent = DATA.branches.fund.name.toUpperCase();

    /* Die vier Äste */
    const edgeTo = new Map(); // Ziel-Knoten → eingehende Kante
    const firstNodes = [];
    const tracks = [
      { d: `M${ground.x1} ${ground.y}H${ground.x2}`, branch: 'dual', count: 3, speed: 120, size: 2.6 },
    ];
    for (const [branch, def] of Object.entries(DATA.paths)) {
      const socket = { x: def.socket[0], y: def.socket[1], id: null };
      svgEl('circle', { class: 'pad', cx: socket.x, cy: socket.y, r: 6, 'data-branch': branch, 'data-decor': branch }, padLayer);
      let prev = socket;
      let full = `M${socket.x} ${socket.y}`;
      for (const id of def.nodes) {
        const node = nodesById.get(id);
        const segment = curveTo(prev, node);
        full += segment;
        edgeTo.set(id, addEdge(`M${prev.x} ${prev.y}${segment}`, {
          kind: 'branch', branch, from: prev.id, to: id, delay: levelDelay(node.level), dur: INTRO_STEP,
        }));
        prev = node;
      }
      firstNodes.push(def.nodes[0]);
      tracks.push({ d: full, branch, count: 2, speed: 150, size: 3 });
    }

    /* Querverbindungen zwischen den Ästen */
    const links = DATA.links.map(([fromId, toId], i) => {
      const p = nodesById.get(fromId);
      const q = nodesById.get(toId);
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy);
      let nx = dy / len;
      let ny = -dx / len;
      if (ny > 0) { nx = -nx; ny = -ny; } // Bogen immer nach oben
      const bend = 46;
      const cx = (p.x + q.x) / 2 + nx * bend;
      const cy = (p.y + q.y) / 2 + ny * bend;

      const gradId = `link-grad-${i}`;
      const grad = svgEl('linearGradient', { id: gradId, gradientUnits: 'userSpaceOnUse', x1: p.x, y1: p.y, x2: q.x, y2: q.y }, defs);
      svgEl('stop', { offset: 0, style: `stop-color: var(--c-${p.branch})` }, grad);
      svgEl('stop', { offset: 1, style: `stop-color: var(--c-${q.branch})` }, grad);

      const path = svgEl('path', { class: 'link', d: `M${p.x} ${p.y}Q${cx} ${cy} ${q.x} ${q.y}`, stroke: `url(#${gradId})` }, linkLayer);
      path.style.setProperty('--delay', `${INTRO_END - 0.2 + i * 0.15}s`);
      return { path, a: fromId, b: toId };
    });

    /* Stationen als echte Buttons (Tastatur, Screenreader, Touch) */
    const nodeLayer = document.createElement('div');
    nodeLayer.className = 'map__nodes';
    const nodeEls = new Map();
    for (const n of DATA.nodes) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `node node--${n.size}`;
      el.dataset.id = n.id;
      el.dataset.branch = n.branch;
      el.style.left = `${(n.x / W) * 100}%`;
      el.style.top = `${(n.y / H) * 100}%`;
      el.style.setProperty('--size', SIZES[n.size]);
      el.style.setProperty('--delay', `${n.level === 0 ? 0.05 : levelDelay(n.level) + INTRO_STEP * 0.7}s`);
      el.setAttribute('aria-describedby', `desc-${n.id}`);
      const hint = n.hint ? ` ${n.hintLabel || 'Beispiel'}: ${n.hint}` : '';
      el.innerHTML = `
        <span class="node__disc"><img class="node__icon" src="assets/icons/${n.id}.svg" alt="" width="64" height="64" decoding="async"></span>
        <span class="node__label">${escapeHtml(n.title)}</span>
        <span class="sr-only" id="desc-${n.id}">${escapeHtml(n.text + hint)}</span>`;
      nodeLayer.append(el);
      nodeEls.set(n.id, el);
    }
    map.append(nodeLayer);

    return { edges, edgeTo, busEdge, groundEdge, pillarEdges, firstNodes, links, nodeEls, tracks, sparkLayer };
  }

  /* ---------------------------------------------------------------------- */
  /* Hervorhebung: Pfad vom Fundament bis zur Station leuchtet auf          */
  /* ---------------------------------------------------------------------- */
  function createHighlighter(map, parts) {
    const fundNodes = branchNodes('fund');
    const decor = map.querySelectorAll('[data-decor]');

    function apply(litNodes, litEdges, litLinks) {
      map.classList.add('is-focused');
      for (const [id, el] of parts.nodeEls) el.classList.toggle('is-lit', litNodes.has(id));
      for (const e of parts.edges) for (const p of e.paths) p.classList.toggle('is-lit', litEdges.has(e));
      for (const l of parts.links) l.path.classList.toggle('is-lit', litLinks.has(l));
      // Sockel, Beschriftungen und Lötpunkte leuchten mit, wenn ihr Ast beteiligt ist
      const litBranches = new Set([...litNodes].map((id) => nodesById.get(id).branch));
      for (const el of decor) el.classList.toggle('is-lit', litBranches.has(el.dataset.decor));
    }

    function clear() {
      map.classList.remove('is-focused');
      map.querySelectorAll('.is-lit').forEach((el) => el.classList.remove('is-lit'));
    }

    function forNode(id) {
      const node = nodesById.get(id);
      const litNodes = new Set([id]);
      const litEdges = new Set();
      const litLinks = new Set();

      if (node.branch === 'dual') {
        litEdges.add(parts.groundEdge);
        parts.pillarEdges.forEach((e) => litEdges.add(e));
      } else if (node.branch === 'fund') {
        fundNodes.forEach((n) => litNodes.add(n));
        parts.firstNodes.forEach((n) => { litNodes.add(n); litEdges.add(parts.edgeTo.get(n)); });
        litEdges.add(parts.busEdge);
      } else {
        for (let cur = id; parts.edgeTo.has(cur);) {
          const edge = parts.edgeTo.get(cur);
          litEdges.add(edge);
          if (!edge.from) break;
          litNodes.add(edge.from);
          cur = edge.from;
        }
        fundNodes.forEach((n) => litNodes.add(n));
        litEdges.add(parts.busEdge);
        for (const l of parts.links) {
          if (l.a === id || l.b === id) { litLinks.add(l); litNodes.add(l.a); litNodes.add(l.b); }
        }
      }
      apply(litNodes, litEdges, litLinks);
    }

    function forBranch(branch) {
      const litNodes = new Set(branchNodes(branch));
      const litEdges = new Set(parts.edges.filter((e) => e.branch === branch));
      const litLinks = new Set();
      if (branch === 'dual' || branch === 'fund') {
        parts.pillarEdges.forEach((e) => litEdges.add(e));
      }
      if (branch !== 'dual') {
        fundNodes.forEach((n) => litNodes.add(n));
        litEdges.add(parts.busEdge);
      }
      apply(litNodes, litEdges, litLinks);
    }

    return { forNode, forBranch, clear };
  }

  /* ---------------------------------------------------------------------- */
  /* Tooltip                                                                 */
  /* ---------------------------------------------------------------------- */
  function createTooltip(map) {
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.setAttribute('aria-hidden', 'true'); // Inhalt steht Screenreadern per aria-describedby zur Verfügung
    tip.innerHTML = `
      <span class="tooltip__tag"></span>
      <strong class="tooltip__title"></strong>
      <p class="tooltip__text"></p>
      <p class="tooltip__hint"><b></b> <span></span></p>`;
    map.append(tip);
    const tag = tip.querySelector('.tooltip__tag');
    const title = tip.querySelector('.tooltip__title');
    const text = tip.querySelector('.tooltip__text');
    const hint = tip.querySelector('.tooltip__hint');
    const scroller = map.parentElement;
    const topbar = document.querySelector('.topbar');

    function position(anchor) {
      const mapBox = map.getBoundingClientRect();
      const viewBox = scroller.getBoundingClientRect();
      const disc = anchor.querySelector('.node__disc').getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const gap = 14;
      // sichtbarer Bereich = Karte ∩ Scroll-Container ∩ Fenster
      const minX = Math.max(mapBox.left, viewBox.left, 0) + 8;
      const maxX = Math.min(mapBox.right, viewBox.right, window.innerWidth) - 8;
      const cx = disc.left + disc.width / 2;
      const x = Math.max(minX, Math.min(cx - tw / 2, maxX - tw));
      // oben nur, wenn dort Platz ist (nicht unter der Kopfzeile, nicht außerhalb der Karte)
      const minY = Math.max(viewBox.top, (topbar?.offsetHeight ?? 0) + 8);
      const below = disc.top - th - gap < minY;
      const label = anchor.querySelector('.node__label').getBoundingClientRect();
      const y = below ? label.bottom + gap : disc.top - th - gap;

      tip.dataset.placement = below ? 'bottom' : 'top';
      tip.style.left = `${x - mapBox.left}px`;
      tip.style.top = `${y - mapBox.top}px`;
      tip.style.setProperty('--arrow-x', `${Math.max(16, Math.min(cx - x, tw - 16))}px`);
    }

    function show(node, anchor) {
      tip.dataset.branch = node.branch;
      tag.textContent = node.size === 'crown' ? 'Zukunftsfeld' : DATA.branches[node.branch].name;
      title.textContent = node.title;
      text.textContent = node.text;
      hint.hidden = !node.hint;
      hint.querySelector('b').textContent = `${node.hintLabel || 'Beispiel'}:`;
      hint.querySelector('span').textContent = node.hint || '';
      position(anchor);
      tip.classList.add('is-visible');
    }

    const hide = () => tip.classList.remove('is-visible');

    return { show, hide, position };
  }

  /* ---------------------------------------------------------------------- */
  /* Interaktion: Hover, Fokus, Tippen, Legende                             */
  /* ---------------------------------------------------------------------- */
  function initInteractions(map, parts, tooltip, highlighter) {
    let active = null; // id der offenen Station
    let pinned = false; // per Klick/Tippen festgehalten
    let branchPin = null; // per Legende gewählter Ast
    const chips = [...document.querySelectorAll('[data-branch-chip]')];

    const restore = () => (branchPin ? highlighter.forBranch(branchPin) : highlighter.clear());

    function open(id) {
      if (active && active !== id) parts.nodeEls.get(active).classList.remove('is-active');
      active = id;
      const el = parts.nodeEls.get(id);
      el.classList.add('is-active');
      tooltip.show(nodesById.get(id), el);
      highlighter.forNode(id);
    }

    function close() {
      if (active) parts.nodeEls.get(active).classList.remove('is-active');
      active = null;
      pinned = false;
      tooltip.hide();
      restore();
    }

    for (const [id, el] of parts.nodeEls) {
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
      if (active && !e.target.closest('.node')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && active) close();
    });
    const reposition = () => active && tooltip.position(parts.nodeEls.get(active));
    window.addEventListener('resize', reposition);
    map.parentElement.addEventListener('scroll', reposition, { passive: true });

    /* Legende: Hover = Vorschau, Klick = Ast festhalten */
    for (const chip of chips) {
      const branch = chip.dataset.branchChip;
      chip.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'touch' && !active) highlighter.forBranch(branch);
      });
      chip.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'touch' && !active) restore();
      });
      chip.addEventListener('click', () => {
        branchPin = branchPin === branch ? null : branch;
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.branchChip === branchPin)));
        if (!active) restore();
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* "Elektronen", die vom Fundament die Äste hinauflaufen                  */
  /* ---------------------------------------------------------------------- */
  function createSparks(layer, tracks) {
    const items = [];
    for (const t of tracks) {
      const path = svgEl('path', { class: 'track', d: t.d }, layer);
      const len = path.getTotalLength();
      for (let i = 0; i < t.count; i++) {
        const g = svgEl('g', { class: 'spark' }, layer);
        svgEl('circle', { r: t.size * 4, fill: `url(#halo-${t.branch})` }, g);
        svgEl('circle', { r: t.size, class: 'spark__core' }, g);
        items.push({ g, path, len, pos: (i / t.count) * len, speed: t.speed * (0.85 + Math.random() * 0.3) });
      }
    }

    let raf = 0;
    let last = 0;
    function frame(now) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      for (const s of items) {
        s.pos = (s.pos + s.speed * dt) % s.len;
        const p = s.path.getPointAtLength(s.pos);
        s.g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        s.g.style.opacity = Math.min(1, s.pos / 40, (s.len - s.pos) / 40).toFixed(2);
      }
      raf = requestAnimationFrame(frame);
    }

    return {
      start() {
        if (raf) return;
        last = 0;
        layer.classList.add('is-running');
        raf = requestAnimationFrame(frame);
      },
      stop() {
        cancelAnimationFrame(raf);
        raf = 0;
      },
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Aufbau-Animation starten, sobald die Karte sichtbar wird               */
  /* ---------------------------------------------------------------------- */
  function initReveal(map, sparks) {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      map.classList.add('is-visible');
      return;
    }
    let introDone = false;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) { sparks.stop(); return; }
      if (!map.classList.contains('is-visible')) {
        map.classList.add('is-visible');
        setTimeout(() => {
          introDone = true;
          if (visible) sparks.start();
        }, INTRO_END * 1000);
      } else if (introDone) {
        sparks.start();
      }
    }, { threshold: 0.12 });
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

  const map = document.getElementById('eit-map');
  if (!map || !DATA) return;

  const parts = buildMap(map);
  const tooltip = createTooltip(map);
  const highlighter = createHighlighter(map, parts);
  initInteractions(map, parts, tooltip, highlighter);
  initReveal(map, createSparks(parts.sparkLayer, parts.tracks));
  centerScroller(map.parentElement);
})();

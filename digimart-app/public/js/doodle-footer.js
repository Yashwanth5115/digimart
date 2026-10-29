// Digimart doodle footer: a vanilla-JS port of the "Doodle Crew" footer. A giant hand-inked wordmark,
// a crew of characters whose eyes follow the pointer (click one to hear it talk), and falling doodles.
(function () {
  const WORD = 'DIGIMART', FS = 200, TRACK = -0.02;
  const FONT = "'Arial Black','Inter Display',Inter,'Helvetica Neue',Arial,sans-serif";
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const H = 'fill="url(#dcfHatch)" stroke="none"';
  const ART = {
    bird: { k: 1.22, seat: 'top', idle: 'peck', top: -62, eyes: [[3, -30, 4.6, 2.3, 2], [12, -31, 4.6, 2.3, 2]],
      body: `<path class="n" d="M-5 0 L-5 -7 M-9 0 L-1 0 M5 0 L5 -7 M1 0 L9 0"/><path d="M-17 -16 C-26 -18 -31 -14 -33 -9 C-26 -10 -20 -8 -15 -10 Z"/><path d="M-18 -14 C-20 -30 -10 -40 2 -40 C16 -40 22 -28 20 -16 C18 -6 8 -4 0 -4 C-10 -4 -17 -8 -18 -14 Z"/><path d="M-11 -25 C-3 -26 1 -18 -3 -13 C-9 -12 -15 -17 -11 -25 Z" ${H}/><path class="o" d="M19 -30 L29 -27 L19 -23 Z"/><path class="a" d="M-3 -38 L4 -59 L12 -37 Z"/><path class="n thin" d="M-1 -44 L10 -46 M1 -51 L8 -52"/><circle cx="4" cy="-60" r="2.8"/>` },
    mushroom: { k: 1.12, seat: 'front', idle: 'sway', top: -56, eyes: [[-4.5, -16, 0, 1.9, 1.3], [4.5, -16, 0, 1.9, 1.3]],
      body: `<ellipse class="sh" cx="0" cy="2" rx="18" ry="3"/><path class="n" d="M-10 -15 L-17 -9 M10 -15 L17 -11"/><path d="M-10 0 C-12 -10 -10 -22 -8 -28 L8 -28 C10 -22 12 -10 10 0 C4 2 -4 2 -10 0 Z"/><path d="M5 -27 C9 -20 11 -10 10 0 C8 1 6 1.5 4 1.5 C6 -8 6 -18 2 -27 Z" ${H}/><path class="r" d="M-25 -28 C-27 -45 -12 -55 0 -55 C12 -55 27 -45 25 -28 C14 -23 -14 -23 -25 -28 Z"/><circle cx="-12" cy="-40" r="4.2"/><circle cx="6" cy="-46" r="3.4"/><circle cx="15" cy="-34" r="3"/><circle cx="-2" cy="-33" r="2.4"/><path class="n" d="M-2 -10 C-1 -8 1 -8 2 -10"/>` },
    ghost: { k: 1.3, seat: 'behind', idle: 'bob', top: -70, eyes: [[-8, -44, 6.5, 3.2, 3], [9, -44, 6.5, 3.2, 3]],
      body: `<path d="M-23 -14 L-23 -40 C-23 -59 -12 -67 0 -67 C12 -67 23 -59 23 -40 L23 -14 C12 -10 -12 -10 -23 -14 Z"/><path d="M13 -61 C21 -54 23 -46 23 -36 L23 -15 L15 -13 L15 -36 C15 -46 15 -54 13 -61 Z" ${H}/><path class="n thin" d="M-16 -56 C-12 -61 -6 -63 -2 -63"/><path class="k" d="M-5 -33 C-3 -27 4 -27 6 -33 Z"/>`,
      front: `<path d="M-25 -32 C-27 -38 -21 -42 -17 -38 C-15 -42 -10 -41 -10 -36 L-11 -30 C-15 -28 -22 -28 -25 -32 Z"/><path d="M25 -32 C27 -38 21 -42 17 -38 C15 -42 10 -41 10 -36 L11 -30 C15 -28 22 -28 25 -32 Z"/>` },
  };
  const CREW = [
    { kind: 'bird', letter: 1, off: 0.02, says: 'Sell something today!' },
    { kind: 'mushroom', letter: 2, off: 0.12, scale: 0.95, says: 'Restock the rice!' },
    { kind: 'ghost', letter: 6, off: 0, says: 'Boo! Who still owes you money?' },
  ];
  const DOODLES = {
    flame: '<path fill="#ff7a1a" d="M0 14 C-9 14 -12 6 -10 0 C-8 -5 -4 -6 -4 -12 C1 -9 3 -5 2 -1 C4 -3 5 -6 5 -8 C10 -3 11 4 8 9 C6 12 3 14 0 14 Z"/><path fill="#ffd23f" d="M0 11.5 C-4 11.5 -6 8 -5 5 C-4 2 -1 1 -1 -3 C2 -1 4 3 3 6 C4 5 5 4 5 3 C7 6 5 11.5 0 11.5 Z"/>',
    star: '<path fill="#ffd23f" d="M0 -13 L3.6 -4.4 L13 -4 L5.8 2.2 L8.2 12 L0 6.6 L-8.2 12 L-5.8 2.2 L-13 -4 L-3.6 -4.4 Z"/>',
    heart: '<path fill="#ff5c7a" d="M0 11 C-6 6 -13 1 -13 -5 C-13 -10 -8 -13 -4 -11 C-2 -10 -1 -8 0 -6 C1 -8 2 -10 4 -11 C8 -13 13 -10 13 -5 C13 1 6 6 0 11 Z"/>',
    bolt: '<path fill="#ffd23f" d="M3 -14 L-8 2 L-1 2 L-4 14 L8 -3 L1 -3 Z"/>',
    sparkle: '<path fill="#8fdcff" d="M0 -13 C1 -4 4 -1 13 0 C4 1 1 4 0 13 C-1 4 -4 1 -13 0 C-4 -1 -1 -4 0 -13 Z"/>',
  };
  const KINDS = ['flame', 'star', 'heart', 'bolt', 'sparkle', 'flame', 'star', 'heart', 'bolt', 'sparkle'];
  const COLS = [
    ['Shop', [['Inventory', 'inventory'], ['New sale', 'sell'], ['Expenses', 'expenses'], ['History', 'history']]],
    ['Insights', [['Overview', 'overview'], ['Tasks', 'tasks'], ['Assistant', 'assistant'], ['Telugu voice', 'assistant']]],
    ['Digimart', [['About'], ['Contact'], ['Privacy'], ['Terms']]],
  ];

  function measure() {
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = '900 ' + FS + 'px ' + FONT;
      const adv = []; let prev = 0;
      for (let i = 0; i < WORD.length; i++) { const w = ctx.measureText(WORD.slice(0, i + 1)).width; adv.push(w - prev); prev = w; }
      const m = ctx.measureText(WORD);
      return { adv, cap: m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : 0.73 * FS };
    } catch (e) { return est(); }
  }
  function est() { return { adv: [...WORD].map(c => (/[IJ1]/.test(c) ? 0.42 : /[MW]/.test(c) ? 0.98 : 0.76) * FS), cap: 0.73 * FS }; }

  function build(m) {
    const gap = TRACK * FS, xs = [], ws = []; let at = 0;
    m.adv.forEach((a, i) => { xs.push(at); ws.push(a); at += a + (i < m.adv.length - 1 ? gap : 0); });
    const width = at, cap = m.cap;
    const placed = CREW.map((c, i) => {
      const art = ART[c.kind], sc = cap / 144 * art.k * (c.scale || 1);
      const x = xs[c.letter] + ws[c.letter] * (0.5 + c.off);
      const y = art.seat === 'top' ? -cap : art.seat === 'behind' ? -cap + 30 * sc : 0;
      return { i, c, art, sc, x, y };
    });
    let l = 0, r = width, t = -cap;
    placed.forEach(p => { l = Math.min(l, p.x - 40 * p.sc); r = Math.max(r, p.x + 40 * p.sc); t = Math.min(t, p.y + p.art.top * p.sc); });
    const vx = l - 24, vy = t - 24, vw = r - l + 48, vh = -t + 30 + 48;
    const L = WORD.length, letterD = i => 160 + i * 80, crewStart = letterD(L - 1) + 420;
    // ground line + tufts
    const x0 = vx + 6, x1 = vx + vw - 6; let gd = 'M' + x0.toFixed(1) + ' 6', tufts = '';
    for (let k = 1; k <= 14; k++) { const x = x0 + (x1 - x0) * k / 14; gd += ' Q' + (x - (x1 - x0) / 28).toFixed(1) + ' ' + (6 + (hash(k * 3.1) - 0.5) * 5).toFixed(1) + ' ' + x.toFixed(1) + ' ' + (6 + (hash(k * 7.7) - 0.5) * 2).toFixed(1); }
    for (let k = 0; k < 22; k++) { const x = x0 + 20 + hash(k * 11.3) * (x1 - x0 - 40), s = 0.7 + hash(k * 5.9) * 0.6; tufts += 'M' + x.toFixed(1) + ' 6 l' + (2 * s).toFixed(1) + ' ' + (-9 * s).toFixed(1) + ' M' + (x + 3 * s).toFixed(1) + ' 6 l' + s.toFixed(1) + ' ' + (-12 * s).toFixed(1) + ' M' + (x + 6 * s).toFixed(1) + ' 6 l' + (-s).toFixed(1) + ' ' + (-7 * s).toFixed(1) + ' '; }
    const eyeSvg = p => p.art.eyes.map(e => `<g class="eye">${e[2] > 0 ? `<circle cx="${e[0]}" cy="${e[1]}" r="${e[2]}"/>` : ''}<g class="pup" data-ex="${(p.x + e[0] * p.sc).toFixed(1)}" data-ey="${(p.y + e[1] * p.sc).toFixed(1)}" data-max="${e[4]}"><circle class="k" cx="${e[0]}" cy="${e[1]}" r="${e[3]}"/><circle class="gl" cx="${(e[0] + e[3] * 0.35).toFixed(2)}" cy="${(e[1] - e[3] * 0.4).toFixed(2)}" r="${(e[3] * 0.32).toFixed(2)}"/></g></g>`).join('');
    const crew = (p, part) => `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.sc.toFixed(4)})"><g class="dcf-arrive dcf-${p.art.seat}" style="--d:${crewStart + p.i * 130}ms"><g class="ch" data-i="${p.i}" tabindex="0" role="button" aria-label="${p.c.kind}: ${p.c.says}"><g class="dcf-art ${p.art.idle}">${part === 'body' ? p.art.body + eyeSvg(p) : p.art.front || ''}</g></g></g></g>`;
    const letters = [...WORD].map((c, i) => `<g class="dcf-letter" style="--d:${letterD(i)}ms;--r:${((hash(i * 2.3) - 0.5) * 9).toFixed(2)}deg"><g class="dcf-glyph"><text x="${xs[i].toFixed(1)}" y="0" font-size="${FS}" font-weight="900" style="font-family:${FONT}" filter="url(#dcfInk)">${c}</text></g></g>`).join('');
    const svg = `<svg class="dcf-svg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" role="group" aria-label="DIGIMART - meet the crew"><defs><pattern id="dcfHatch" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="4.6" style="stroke:var(--dcf-ink)" stroke-width="1.25"/></pattern><filter id="dcfInk" x="-4%" y="-6%" width="108%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="e"/><feDisplacementMap in="SourceGraphic" in2="e" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough"/><feTurbulence type="fractalNoise" baseFrequency="0.018 0.32" numOctaves="2" seed="4" result="s"/><feColorMatrix in="s" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -16 5.6" result="sa"/><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="9" result="sp"/><feColorMatrix in="sp" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -24 7.0" result="spa"/><feComposite in="sa" in2="spa" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="holes"/><feComposite in="rough" in2="holes" operator="out"/></filter></defs>
<g class="dcf-ground"><path class="dcf-draw" pathLength="1" d="${gd}" style="--d:60ms"/><path class="dcf-fade" d="${tufts}" style="--d:560ms"/></g>
${placed.filter(p => p.art.seat === 'behind').map(p => crew(p, 'body')).join('')}${letters}${placed.filter(p => p.art.seat === 'behind').map(p => crew(p, 'front')).join('')}${placed.filter(p => p.art.seat !== 'behind').map(p => crew(p, 'body')).join('')}</svg>`;
    const bubbles = placed.map(p => `<div class="dcf-bubble" data-b="${p.i}" style="left:${((p.x - vx) / vw * 100).toFixed(2)}%;top:${((p.y + p.art.top * p.sc - 6 - vy) / vh * 100).toFixed(2)}%">${p.c.says}</div>`).join('');
    const doodles = KINDS.map((k, i) => { const s = 22 + hash(i * 4.7) * 14; return `<div class="dcf-doodle" style="left:${((i + hash(i * 9.1) * 0.8) / KINDS.length * 100).toFixed(1)}%;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;animation-duration:${(14 + hash(i * 2.9) * 14).toFixed(1)}s;animation-delay:-${(hash(i * 3.3) * 20).toFixed(1)}s"><svg viewBox="-16 -16 32 32">${DOODLES[k]}</svg></div>`; }).join('');
    const cols = COLS.map(([t, ls]) => `<div><h3 class="dcf-coltitle">${t}</h3><ul>${ls.map(([n, go]) => `<li><a class="dcf-link" href="#"${go ? ` onclick="dcfGo('${go}');return false"` : ''}>${n}</a></li>`).join('')}</ul></div>`).join('');
    const tag = 'A hand-drawn helper for every shop owner.'.split(' ').map((w, k) => `<span class="dcf-word" style="--d:${crewStart + 260 + k * 45}ms">${w} </span>`).join('');
    return `<div class="dcf-top"><div><div class="dcf-brand"><span class="dcf-logo">D</span><span class="dcf-brandname">Digimart</span></div><p class="dcf-blurb">Stock, sales, bills and a Telugu-friendly assistant for your shop. Drawn by hand in Hyderabad.</p></div><nav class="dcf-cols" aria-label="Footer">${cols}</nav></div>
<div class="dcf-world"><div class="dcf-stage"><h2 class="dcf-sr">DIGIMART</h2>${svg}<div class="dcf-bubbles">${bubbles}</div></div><div class="dcf-doodles" aria-hidden="true">${doodles}</div>
<div class="dcf-cta"><p class="dcf-tagline">${tag}</p><div class="dcf-actions"><a class="dcf-btn is-outline" href="#" onclick="dcfGo('sell');return false">Record a sale</a><a class="dcf-btn is-solid" href="#" onclick="dcfGo('assistant');return false">Ask the assistant</a></div></div></div>
<div class="dcf-bar"><p class="dcf-copy">&copy; 2026 Digimart. Made for India's neighbourhood shops.</p><button type="button" class="dcf-totop" onclick="dcfTop()">Back to top &uarr;</button></div>`;
  }

  window.dcfGo = t => { try { switchSection('sv', document.querySelector('[data-section=sv]')); SV.go(t); dcfTop(); } catch (e) {} };
  window.dcfTop = () => { const c = document.getElementById('contentArea'); (c && c.scrollTo ? c : window).scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  function mount() {
    const host = document.getElementById('contentArea');
    if (!host || document.getElementById('dcf')) return;
    const f = document.createElement('footer');
    f.id = 'dcf'; f.className = 'dcf'; f.dataset.play = '0';
    f.innerHTML = build(est());
    host.appendChild(f);
    const redo = () => { f.innerHTML = build(measure()); wire(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redo); else redo();
    window.addEventListener('resize', sizeWorld);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) f.dataset.play = '1'; }), { threshold: 0.12 }).observe(f); else f.dataset.play = '1';
    wire();
  }
  function sizeWorld() { const w = document.querySelector('#dcf .dcf-world'); if (w) w.style.setProperty('--h', w.clientHeight + 'px'); }

  let bound = false, pointer = null, raf = 0, timer = 0;
  function wire() {
    const f = document.getElementById('dcf'); if (!f) return;
    sizeWorld();
    f.querySelectorAll('.ch').forEach(ch => {
      const poke = () => {
        const i = ch.dataset.i; ch.classList.remove('hop'); void ch.getBoundingClientRect(); ch.classList.add('hop');
        f.querySelectorAll('.dcf-bubble').forEach(b => b.classList.toggle('on', b.dataset.b === i));
        clearTimeout(timer); timer = setTimeout(() => f.querySelectorAll('.dcf-bubble').forEach(b => b.classList.remove('on')), 2600);
      };
      ch.addEventListener('click', poke);
      ch.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
    });
    f.querySelectorAll('.dcf-doodle').forEach(d => d.addEventListener('pointerdown', () => { d.classList.add('pop'); setTimeout(() => d.classList.remove('pop'), 1400); }));
    if (bound) return; bound = true;
    document.addEventListener('pointermove', e => {
      pointer = e; if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const svg = document.querySelector('#dcf .dcf-svg'); if (!svg || !pointer) return;
        const m = svg.getScreenCTM(); if (!m) return; const inv = m.inverse();
        const tx = inv.a * pointer.clientX + inv.c * pointer.clientY + inv.e, ty = inv.b * pointer.clientX + inv.d * pointer.clientY + inv.f;
        svg.querySelectorAll('.pup').forEach(p => {
          const dx = tx - +p.dataset.ex, dy = ty - +p.dataset.ey, d = Math.hypot(dx, dy) || 1, max = +p.dataset.max, k = max * Math.min(1, d / 220) / d;
          p.setAttribute('transform', 'translate(' + (dx * k).toFixed(2) + ' ' + (dy * k).toFixed(2) + ')');
        });
      });
    });
  }

  if (typeof module !== 'undefined') module.exports = { build, est };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0));
})();
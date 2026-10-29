// Digimart intro hero: the headline is made of dots that scatter as you scroll down to the work.
(function () {
  const LINES = ['Your shop, all in', 'one place.'];
  const FONT = '"DM Serif Display","Playfair Display",Georgia,"Times New Roman",serif';
  let hero, host, sec, canvas, ctx, parts = [], W = 0, H = 0, dpr = 1, dot = 3, last = -1, cur = 'overview', raf = 0, rt = 0;
  const rnd = n => { const s = Math.sin(n * 91.7 + 13.3) * 43758.5453; return s - Math.floor(s); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function html() {
    return '<div class="ih-blob"></div><span class="ih-pill"><i></i>DIGIMART &middot; YOUR STORE AT A GLANCE</span>' +
      '<div class="ih-text"><canvas class="ih-canvas" aria-hidden="true"></canvas><h1 class="ih-sr">Your shop, all in one place.</h1></div>' +
      '<p class="ih-sub">Sales, stock, expenses and your AI assistant &mdash; all in one calm place. Scroll to scatter the intro and get to work.</p>' +
      '<div class="ih-actions"><a href="#" class="ih-btn solid" data-go="inventory">View inventory</a><a href="#" class="ih-btn" data-go="sell">New sale</a></div>';
  }

  function progress() {
    if (!hero || hero.offsetParent === null) return 0;
    const r = hero.getBoundingClientRect();
    return clamp((80 - r.top) / (r.height * 0.5), 0, 1);
  }

  function draw(t) {
    if (!ctx || !W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const e = t * t * (3 - 2 * t);
    ctx.fillStyle = '#3a2e2a';
    for (let i = 0; i < parts.length; i++) {
      const q = parts[i], k = clamp((e - q.d * 0.25) / 0.75, 0, 1), a = 1 - k;
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillRect(q.x + q.vx * k, q.y + q.vy * k + 260 * k * k, dot, dot);
    }
    ctx.globalAlpha = 1; last = t;
  }

  function layout() {
    if (!canvas) return;
    const box = canvas.parentElement; W = Math.floor(box.clientWidth);
    if (W < 200) return;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = '100px ' + FONT;
    const widest = Math.max.apply(null, LINES.map(t => probe.measureText(t).width)) || 800;
    const fs = clamp(100 * W * 0.9 / widest, 40, 150), lh = fs * 1.22;
    H = Math.round(lh * LINES.length + fs * 0.3);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.fillStyle = '#000'; o.textAlign = 'center'; o.textBaseline = 'alphabetic'; o.font = fs + 'px ' + FONT;
    LINES.forEach((t, i) => o.fillText(t, W / 2, lh * i + fs * 0.92));
    const img = o.getImageData(0, 0, W, H).data, step = Math.max(4, Math.round(fs / 17));
    dot = Math.max(1.6, step * 0.42); parts = [];
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      if (img[(y * W + x) * 4 + 3] > 120) {
        const k = parts.length, a = rnd(k) * Math.PI * 2, s = 60 + rnd(k + 0.5) * 260;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90 - rnd(k + 2) * 120, d: rnd(k + 3) });
      }
    }
    draw(progress());
  }

  function tick() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = progress(); if (t !== last) draw(t); }); }

  function go(t) {
    try { SV.go(t); } catch (e) {}
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function vis() {
    const on = sec.classList.contains('active') && cur === 'overview';
    hero.style.display = on ? '' : 'none';
    if (on) setTimeout(layout, 0);
  }

  function mount() {
    host = document.getElementById('contentArea'); sec = document.getElementById('sec-sv');
    if (!host || !sec || document.getElementById('ih')) return;
    hero = document.createElement('section'); hero.id = 'ih'; hero.className = 'ih'; hero.innerHTML = html();
    host.insertBefore(hero, sec);
    canvas = hero.querySelector('canvas'); ctx = canvas.getContext('2d');
    hero.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.go); }));
    if (window.SV && SV.go) { const og = SV.go; SV.go = function (t, a) { cur = t; vis(); return og.call(SV, t, a); }; }
    new MutationObserver(vis).observe(sec, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('scroll', tick, true); window.addEventListener('scroll', tick);
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
    const fl = document.fonts && document.fonts.load ? document.fonts.load('100px "DM Serif Display"').catch(() => {}) : Promise.resolve();
    layout(); fl.then(layout); vis();
  }

  if (typeof module !== 'undefined') module.exports = { rnd };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 50));
})();
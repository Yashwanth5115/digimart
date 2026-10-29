p = 'frontend/js/smartvyapar.js'
s = open(p, encoding='utf-8').read()
reps = [
("ticks: { color: '#8a8a93', callback: v => inr(v) }", "ticks: { color: '#8a8a93', callback: v => v >= 1000 ? (v / 1000) + 'k' : v }"),
("pointRadius: 3", "pointRadius: 4"),
("shop today.</div></div></div>", "shop today.</div></div><button class=\"btn btn-primary\" onclick=\"window.print()\"><i class=\"fas fa-download\"></i> Export report</button></div>"),
("options: { maintainAspectRatio: false, cutout: '68%',", "plugins: [window.SVLBL], options: { maintainAspectRatio: false, layout: { padding: 36 }, cutout: '66%',"),
("  window.SV = {", """  window.SVLBL = { id: 'svlbl', afterDatasetsDraw(ch) {
    const c = ch.ctx, d = ch.data.datasets[0], tot = d.data.reduce((a, b) => a + b, 0) || 1;
    ch.getDatasetMeta(0).data.forEach((a, i) => {
      const m = (a.startAngle + a.endAngle) / 2, cs = Math.cos(m), sn = Math.sin(m), r = a.outerRadius;
      const x1 = a.x + cs * r, y1 = a.y + sn * r, x2 = a.x + cs * (r + 18), y2 = a.y + sn * (r + 18);
      c.save(); c.strokeStyle = d.backgroundColor[i]; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.fillStyle = '#fafafa'; c.font = '600 12px Inter, sans-serif'; c.textAlign = cs >= 0 ? 'left' : 'right';
      c.fillText(ch.data.labels[i] + ': ' + (d.data[i] / tot * 100).toFixed(1) + '%', x2 + (cs >= 0 ? 6 : -6), y2 + 4); c.restore();
    });
  } };
  window.SV = {"""),
]
for a, b in reps:
    assert s.count(a) == 1, 'not found or already patched: ' + a[:40]
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
css = """
/* Match the reference dashboard */
.dm-grid{gap:24px}.dm-card{border-radius:24px!important;padding:26px!important;background:#0f0f11!important;border:1px solid #1f1f23!important}
.dm-lbl{font-size:14px}.dm-num{font-size:40px;letter-spacing:-.02em;margin:10px 0 14px}.dm-delta{font-size:14px}
.dm-tile{width:54px;height:54px;border-radius:14px;font-size:20px}.dm-hello h2{font-size:32px}.dm-head{font-size:19px;margin-bottom:18px}
.dm-head select{background:#18181b!important;border:1px solid #26262b!important;border-radius:10px!important;padding:8px 14px!important}
div:has(>#svTrend),div:has(>#svMix){background:#09090b;border-radius:16px;padding:18px;height:300px!important}
.dm-leg{display:none}
"""
open('frontend/css/digimart-dark.css', 'a', encoding='utf-8').write(css)
print('patched')

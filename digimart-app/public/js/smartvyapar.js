// Digimart: real dashboard wired to Flask backend (/api/sv/*). Reuses existing shell + CSS.
(function () {
  const API = window.SV_API || `${location.protocol}//${location.hostname}:5005/api/sv`;
  const $ = (s, r = document) => r.querySelector(s);
  const inr = n => '₹' + (+n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function api(path, method = 'GET', body) {
    try {
      const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      return await r.json();
    } catch (e) { return { ok: false, message: 'Backend not reachable. Run launch_web.py' }; }
  }
  const toast = (m, t) => (window.showToast ? showToast(m, t) : alert(m));
  let tab = 'overview', products = [], cart = [];

  function mount() {
    sectionTitles.sv = ['Digimart', 'Sales, stock, expenses & AI assistant for your shop'];
    const nav = $('.sidebar-nav');
    nav.insertAdjacentHTML('afterbegin', `<div class="nav-section"><div class="nav-section-title">Digimart</div>
      <div class="nav-item active" data-section="sv" onclick="switchSection('sv',this);SV.go(tab)"><i class="fas fa-store"></i><span>Digimart</span></div></div>`);
    $('#contentArea').insertAdjacentHTML('afterbegin', '<div class="section" id="sec-sv"></div>');
    document.querySelectorAll('.section.active, .nav-item.active').forEach(e => { if (e.id !== 'sec-sv' && e.dataset.section !== 'sv') e.classList.remove('active'); });
    $('#sec-sv').classList.add('active');
    $('#topbarTitle').textContent = 'Digimart';
    window.SV.go('overview');
  }

  const TABS = [['overview', 'Overview'], ['inventory', 'Inventory'], ['sell', 'New Sale'], ['expenses', 'Expenses'], ['history', 'History'], ['tasks', 'Tasks'], ['assistant', 'Assistant']];
  function shell(inner) {
    $('#sec-sv').innerHTML = `<div class="tabs mb-24" style="flex-wrap:wrap">${TABS.map(([k, l]) => `<button class="tab ${k === tab ? 'active' : ''}" onclick="SV.go('${k}')">${l}</button>`).join('')}</div><div id="sv-body">${inner}</div>`;
  }
  const stat = (l, v, c) => `<div class="stat-card"><div class="text-xs text-muted">${l}</div><div style="font-size:26px;font-weight:700;color:var(--accent-${c})">${v}</div></div>`;
  const field = (id, label, type = 'text', val = '') => `<div class="input-group"><label>${label}</label><input class="input-field" id="${id}" type="${type}" value="${esc(val)}" ${type === 'number' ? 'min="0" step="any"' : ''}></div>`;
  const val = id => $('#' + id).value.trim();

  const views = {
    async overview() {
      const { data: s } = await api('/summary');
      if (!s) return shell('<div class="glass-card">Backend not reachable. Start it with <code>python launch_web.py</code></div>');
      const t = s.trend, y = t.length > 1 ? t[t.length - 2].sales : 0, td = s.today.sales;
      const dl = y ? Math.round((td - y) / y * 100) : null;
      const card = (l, v, d, ic, c) => `<div class="dm-card"><div class="dm-card-top"><div><div class="dm-lbl">${l}</div><div class="dm-num">${v}</div></div><div class="dm-tile ${c}"><i class="fas ${ic}"></i></div></div>${d}</div>`;
      const per = (n, p) => `<div class="dm-card"><div class="dm-lbl">${n}</div><div class="text-sm" style="margin-top:8px">Sales <b>${inr(p.sales)}</b> · Expenses <b>${inr(p.expenses)}</b></div><div class="dm-delta ${p.profit >= 0 ? 'up' : 'down'}" style="margin-top:6px">Est. profit ${inr(p.profit)}</div></div>`;
      const mixC = { cash: '#34d399', upi: '#a78bfa', credit: '#fb923c' }, mix = Object.entries(s.mix || {});
      const ico = { sale: ['fa-check', '#10281e', '#34d399'], expense: ['fa-receipt', '#2a1a0a', '#fb923c'], stock: ['fa-triangle-exclamation', '#2a0f12', '#f87171'] };
      const hr = new Date().getHours(), hi = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
      shell(`<div class="dm-hello"><div><h2>${hi}!</h2><div class="text-sm text-muted">Welcome back, here's what's happening at your shop today.</div></div></div>
      <div class="dm-grid dm-4">${card("Today's Sales", inr(td), `<div class="dm-delta ${dl === null ? 'mute' : dl >= 0 ? 'up' : 'down'}">${dl === null ? 'No sales yesterday' : (dl >= 0 ? '+' : '') + dl + '% from yesterday'}</div>`, 'fa-indian-rupee-sign', 'n')}
        ${card('Bills Generated', s.bills_today, '<div class="dm-delta mute">today</div>', 'fa-file-invoice', 'g')}
        ${card('Pending Payments', inr(s.pending_total), `<div class="dm-delta ${s.pending.length ? 'down' : 'up'}">${s.pending.length} customers owe you</div>`, 'fa-hourglass-half', 'p')}
        ${card('Low Stock Items', s.low_stock.length, `<a href="#" onclick="SV.go('inventory');return false" class="dm-delta ${s.low_stock.length ? 'down' : 'up'}">${s.low_stock.length ? 'View items →' : 'All stocked'}</a>`, 'fa-box', 'o')}</div>
      <div class="dm-grid dm-2"><div class="dm-card"><div class="dm-head">Sales Overview<select id="svRange" onchange="SV.trend(this.value)"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="6m">Last 6 months</option></select></div><div style="height:250px"><canvas id="svTrend"></canvas></div></div>
        <div class="dm-card"><div class="dm-head">Payment Mix <span class="text-xs text-muted">30 days</span></div><div style="height:210px"><canvas id="svMix"></canvas></div><div class="dm-leg">${mix.map(([k]) => `<span><i style="background:${mixC[k] || '#888'}"></i>${esc(k)}</span>`).join('') || 'No sales yet'}</div></div></div>
      <div class="dm-grid dm-2e"><div class="dm-card"><div class="dm-head">Recent Sales <a href="#" class="text-xs text-muted" onclick="SV.go('history');return false">View all</a></div>
        ${s.recent.map(r => `<div class="dm-row"><div class="dm-av">${esc((r.customer || 'W')[0].toUpperCase())}</div><div class="grow">${esc(r.customer || 'Walk-in')}<small>#DM-${String(r.id).padStart(4, '0')} · ${inr(r.total)}</small></div><span class="dm-pill ${r.paid ? (r.payment === 'upi' ? 'upi' : 'paid') : 'pending'}">${r.paid ? esc(r.payment) : 'credit due'}</span></div>`).join('') || '<div class="text-muted text-sm">No sales yet</div>'}</div>
        <div class="dm-card"><div class="dm-head">Recent Activity</div>${s.activity.map(a => { const [i, bg, fg] = ico[a.kind]; return `<div class="dm-row"><div class="dm-dot" style="background:${bg};color:${fg}"><i class="fas ${i}"></i></div><div class="grow">${esc(a.text)}<small>${esc(a.when)}</small></div></div>`; }).join('') || '<div class="text-muted text-sm">Nothing yet</div>'}</div></div>
      <div class="dm-grid" style="grid-template-columns:repeat(3,1fr)">${per('Today', s.today)}${per('This week (7d)', s.week)}${per('This month (30d)', s.month)}</div>
      <div class="dm-grid dm-2e"><div class="dm-card"><div class="dm-head">⚠️ Low stock (${s.low_stock.length})</div>${s.low_stock.map(p => `<div class="text-sm" style="padding:6px 0">${esc(p.name)} <b>${+p.stock} ${esc(p.unit)}</b> left (min ${+p.threshold})</div>`).join('') || '<div class="text-muted text-sm">All stocked</div>'}</div>
        <div class="dm-card"><div class="dm-head">💰 Pending customer payments</div>${s.pending.map(p => `<div class="text-sm" style="padding:6px 0">${esc(p.customer)} ${esc(p.phone || '')}: <b>${inr(p.total)}</b> <button class="btn btn-secondary" onclick="SV.settle(${p.id})">Mark paid</button></div>`).join('') || '<div class="text-muted text-sm">No dues</div>'}</div></div>`);
      if (!window.Chart) return;
      SV._ax = { ticks: { color: '#8a8a93', callback: v => inr(v) }, grid: { color: '#1f1f23' }, border: { display: false } };
      SV._chart = new Chart($('#svTrend'), { type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#e4e4e7', backgroundColor: 'rgba(228,228,231,.08)', fill: true, tension: .35, pointBackgroundColor: '#fff', pointRadius: 3 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => inr(c.parsed.y) } } }, scales: { y: { beginAtZero: true, ...SV._ax }, x: { ticks: { color: '#8a8a93' }, grid: { display: false }, border: { display: false } } } } });
      SV.trend('7d', t.map(x => ({ label: new Date(x.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), sales: x.sales })));
      new Chart($('#svMix'), { type: 'doughnut', data: { labels: mix.map(([k]) => k), datasets: [{ data: mix.map(([, v]) => v), backgroundColor: mix.map(([k]) => mixC[k] || '#888'), borderColor: '#0e0e10', borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.label + ': ' + inr(c.parsed) } } } } });
    },
    async inventory(q = '') {
      const r = await api('/products?q=' + encodeURIComponent(q)); products = r.data || [];
      shell(`<div class="flex gap-8 mb-16"><input class="input-field" id="pq" placeholder="Search products…" value="${esc(q)}" oninput="clearTimeout(SV._t);SV._t=setTimeout(()=>SV.go('inventory',this.value),300)"><button class="btn btn-primary" onclick="SV.productForm()">+ Add Product</button></div>
      <div id="pform"></div><div class="glass-card" style="overflow-x:auto"><table style="width:100%;text-align:left"><tr><th>Product</th><th>Category</th><th>Qty</th><th>Cost</th><th>Price</th><th>Min</th><th></th></tr>
      ${products.map(p => `<tr style="${p.low ? 'color:var(--accent-red)' : ''}"><td>${esc(p.name)} ${p.low ? '⚠️ Low' : ''}</td><td>${esc(p.category)}</td><td>${+p.stock} ${esc(p.unit)}</td><td>${inr(p.cost)}</td><td>${inr(p.price)}</td><td>${+p.threshold}</td><td><button class="btn btn-secondary" onclick="SV.productForm(${p.id})">Edit</button> <button class="btn btn-danger" onclick="SV.delProduct(${p.id})">Delete</button></td></tr>`).join('')}</table></div>`);
      if (q) { const i = $('#pq'); i.focus(); i.setSelectionRange(q.length, q.length); }
    },
    async sell() {
      if (!products.length) products = (await api('/products')).data || [];
      const total = cart.reduce((a, c) => a + c.qty * c.price, 0);
      shell(`<div class="grid-2"><div class="glass-card"><div class="font-bold mb-16">Add items</div>
        <div class="input-group"><label>Product</label><select class="input-field" id="sp">${products.map(p => `<option value="${p.id}">${esc(p.name)} (${+p.stock} ${esc(p.unit)}, ${inr(p.price)})</option>`).join('')}</select></div>
        ${field('sq', 'Quantity', 'number', 1)}<button class="btn btn-secondary" onclick="SV.addLine()">Add to bill</button>
        <hr style="margin:16px 0;opacity:.2">${cart.map((c, i) => `<div class="text-sm" style="padding:4px 0">${esc(c.name)} × ${c.qty} = <b>${inr(c.qty * c.price)}</b> <a href="#" onclick="SV.rmLine(${i});return false">✕</a></div>`).join('') || '<div class="text-muted text-sm">Bill is empty</div>'}
        <div class="font-bold" style="margin-top:12px">Total: ${inr(total)}</div></div>
        <div class="glass-card"><div class="font-bold mb-16">Payment</div><div class="input-group"><label>Method</label><select class="input-field" id="pm"><option value="cash">Cash</option><option value="upi">UPI</option><option value="credit">Credit (udhaar)</option></select></div>
        ${field('cn', 'Customer name (required for credit)')}${field('cp', 'Phone (optional)')}<button class="btn btn-primary" onclick="SV.confirmSale()">Confirm sale</button><div id="sale-result" class="text-sm" style="margin-top:12px"></div></div></div>`);
    },
    async expenses(q = '') {
      const r = await api('/expenses?q=' + encodeURIComponent(q));
      shell(`<div class="grid-2"><div class="glass-card"><div class="font-bold mb-16">Record expense</div>${field('ec', 'Category (Rent, Electricity, Transport…)')}${field('ea', 'Amount (₹)', 'number')}${field('en', 'Note')}<button class="btn btn-primary" onclick="SV.addExpense()">Save expense</button></div>
      <div class="glass-card"><div class="font-bold mb-16">Expense history</div><input class="input-field mb-16" placeholder="Search…" value="${esc(q)}" onchange="SV.go('expenses',this.value)">${(r.data || []).map(e => `<div class="text-sm" style="padding:6px 0">${esc(e.date)} · ${esc(e.category)} <b>${inr(e.amount)}</b> ${esc(e.note)}</div>`).join('') || '<div class="text-muted text-sm">No expenses yet</div>'}</div></div>`);
    },
    async history(q = '') {
      const r = await api('/sales?q=' + encodeURIComponent(q));
      shell(`<input class="input-field mb-16" placeholder="Search by customer, product, payment, date, invoice no…" value="${esc(q)}" onchange="SV.go('history',this.value)"><div class="glass-card" style="overflow-x:auto"><table style="width:100%;text-align:left"><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Pay</th><th>Total</th><th></th></tr>
      ${(r.data || []).map(s => `<tr><td>INV-${String(s.id).padStart(4, '0')}</td><td>${esc(s.date)}</td><td>${esc(s.customer || 'Walk-in')}</td><td>${esc(s.items)}</td><td>${esc(s.payment)}${s.paid ? '' : ' ⏳'}</td><td>${inr(s.total)}</td><td><a class="btn btn-secondary" target="_blank" href="${API}/invoice/${s.id}">View</a> <a class="btn btn-secondary" href="${API}/invoice/${s.id}?download=1">Download</a></td></tr>`).join('')}</table></div>`);
    },
    async tasks() {
      const r = await api('/tasks');
      shell(`<div class="flex gap-8 mb-16"><input class="input-field" id="tt" placeholder="New task…"><button class="btn btn-primary" onclick="SV.addTask()">Add</button></div><div class="glass-card">${(r.data || []).map(t => `<div class="text-sm" style="padding:8px 0;${t.status === 'done' ? 'opacity:.5;text-decoration:line-through' : ''}"><input type="checkbox" ${t.status === 'done' ? 'checked' : ''} onchange="SV.toggleTask(${t.id})"> ${esc(t.title)} ${t.source === 'auto' ? '<span class="text-xs text-muted">· auto</span>' : ''}</div>`).join('') || '<div class="text-muted">No tasks</div>'}</div>`);
    },
    assistant() {
      shell(`<div class="glass-card"><div class="font-bold mb-16">🤖 Business assistant (English / తెలుగు)</div><div id="chat" style="min-height:140px;max-height:360px;overflow:auto" class="text-sm mb-16"></div>
      <div class="flex gap-8"><input class="input-field" id="aq" placeholder="How much did I sell today? / ఈ రోజు ఎంత అమ్మాను?" onkeydown="if(event.key==='Enter')SV.ask()"><button class="btn btn-primary" onclick="SV.ask()">Ask</button></div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-top:12px">${['How much did I sell today?', 'Which products are low on stock?', 'Pending payments?', 'ఈ రోజు లాభం ఎంత?'].map(q => `<button class="btn btn-secondary" onclick="$('#aq').value=this.textContent;SV.ask()">${q}</button>`).join('')}</div></div>`);
    }
  };

  window.SV = {
    async trend(range, pre) {
      const d = pre || (await api('/trend?range=' + range)).data || [];
      if (!SV._chart) return;
      SV._chart.data.labels = d.map(x => x.label); SV._chart.data.datasets[0].data = d.map(x => x.sales); SV._chart.update();
    },
    go(t, arg) { tab = t; return views[t](arg); },
    async settle(id) { await api(`/sales/${id}/settle`, 'POST'); toast('Marked as paid'); SV.go('overview'); },
    productForm(id) {
      const p = products.find(x => x.id === id) || { name: '', category: 'General', unit: 'pcs', stock: '', cost: '', price: '', threshold: 10 };
      $('#pform').innerHTML = `<div class="glass-card mb-16"><div class="grid-4">${field('fn', 'Name', 'text', p.name)}${field('fc', 'Category', 'text', p.category)}${field('fu', 'Unit', 'text', p.unit)}${field('fs', 'Quantity', 'number', p.stock)}${field('fcost', 'Purchase cost ₹', 'number', p.cost)}${field('fp', 'Selling price ₹', 'number', p.price)}${field('ft', 'Low-stock threshold', 'number', p.threshold)}</div><button class="btn btn-primary" onclick="SV.saveProduct(${id || 0})">Save</button></div>`;
    },
    async saveProduct(id) {
      const b = { name: val('fn'), category: val('fc'), unit: val('fu'), stock: val('fs'), cost: val('fcost'), price: val('fp'), threshold: val('ft') };
      const r = await api(id ? '/products/' + id : '/products', id ? 'PUT' : 'POST', b);
      r.ok ? (toast('Product saved'), SV.go('inventory')) : toast(r.message, 'error');
    },
    async delProduct(id) { if (confirm('Remove this product?')) { await api('/products/' + id, 'DELETE'); SV.go('inventory'); } },
    addLine() {
      const p = products.find(x => x.id == $('#sp').value), qty = parseFloat($('#sq').value);
      if (!(qty > 0)) return toast('Enter a quantity greater than 0', 'error');
      const have = cart.filter(c => c.product_id === p.id).reduce((a, c) => a + c.qty, 0);
      if (qty + have > p.stock) return toast(`Only ${p.stock} ${p.unit} of ${p.name} in stock`, 'error');
      cart.push({ product_id: p.id, name: p.name, qty, price: p.price }); SV.go('sell');
    },
    rmLine(i) { cart.splice(i, 1); SV.go('sell'); },
    async confirmSale() {
      const r = await api('/sales', 'POST', { payment: $('#pm').value, customer: val('cn'), phone: val('cp'), items: cart });
      if (!r.ok) return toast(r.message, 'error');
      cart = []; products = []; await SV.go('sell');
      $('#sale-result').innerHTML = `✅ Sale saved (${inr(r.data.total)}). <a target="_blank" href="${API}/invoice/${r.data.id}">View invoice</a> · <a href="${API}/invoice/${r.data.id}?download=1">Download</a><br>${r.data.stock_changes.map(c => `${esc(c.name)}: ${c.before} → <b>${c.after}</b>${c.low ? ' ⚠️ low stock' : ''}`).join('<br>')}`;
    },
    async addExpense() {
      const r = await api('/expenses', 'POST', { category: val('ec'), amount: val('ea'), note: val('en') });
      r.ok ? (toast('Expense saved'), SV.go('expenses')) : toast(r.message, 'error');
    },
    async addTask() { const t = val('tt'); if (t) { await api('/tasks', 'POST', { title: t }); SV.go('tasks'); } },
    async toggleTask(id) { await api('/tasks/' + id, 'PATCH'); SV.go('tasks'); },
    async ask() {
      const q = val('aq'); if (!q) return; $('#aq').value = '';
      const c = $('#chat'); c.insertAdjacentHTML('beforeend', `<div style="padding:6px 0"><b>You:</b> ${esc(q)}</div>`);
      const r = await api('/assistant', 'POST', { question: q });
      c.insertAdjacentHTML('beforeend', `<div style="padding:6px 0"><b>Digimart:</b> ${esc(r.ok ? r.data.answer : r.message)} <span class="text-xs text-muted">${r.ok ? '(' + r.data.source + ')' : ''}</span></div>`);
      c.scrollTop = c.scrollHeight;
    }
  };
  window.$ = window.$ || $;
  document.addEventListener('DOMContentLoaded', mount);
})();

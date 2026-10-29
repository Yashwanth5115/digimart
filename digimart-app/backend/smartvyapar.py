"""Digimart backend: extends the existing Flask app + SQLite DB (localcart.db)."""
import json, os, urllib.request
from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from database import get_db

sv = Blueprint("sv", __name__, url_prefix="/api/sv")
PAY = {"cash", "upi", "credit"}


def ok(data=None, **kw):
    return jsonify({"ok": True, "data": data, **kw})


def err(msg, code=400):
    return jsonify({"ok": False, "message": msg}), code


def init_sv():
    db = get_db()
    for col in ("cost REAL DEFAULT 0", "threshold REAL DEFAULT 10"):
        try:
            db.execute(f"ALTER TABLE inventory ADD COLUMN {col}")
        except Exception:
            pass
    db.executescript("""
    CREATE TABLE IF NOT EXISTS sv_sales(id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, ts TEXT,
        payment TEXT, customer TEXT, phone TEXT, total REAL, paid INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sv_sale_items(id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER,
        product_id INTEGER, name TEXT, qty REAL, price REAL, cost REAL, stock_before REAL, stock_after REAL);
    CREATE TABLE IF NOT EXISTS sv_expenses(id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT,
        category TEXT, amount REAL, note TEXT);
    CREATE TABLE IF NOT EXISTS sv_tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT,
        status TEXT DEFAULT 'open', source TEXT DEFAULT 'manual', created TEXT, UNIQUE(title, status));
    """)
    # Give the seeded demo products sensible cost (~80% of price) once
    db.execute("UPDATE inventory SET cost = ROUND(price*0.8,2) WHERE cost IS NULL OR cost = 0")
    db.commit(); db.close()


def rows(sql, args=()):
    db = get_db(); r = [dict(x) for x in db.execute(sql, args).fetchall()]; db.close(); return r


def num(v, name, allow_zero=False):
    try:
        f = float(v)
    except (TypeError, ValueError):
        raise ValueError(f"{name} must be a number")
    if f < 0 or (f == 0 and not allow_zero):
        raise ValueError(f"{name} must be {'0 or more' if allow_zero else 'greater than 0'}")
    return f


# ---------- Products ----------
@sv.get("/products")
def products():
    q = f"%{request.args.get('q', '').strip()}%"
    return ok(rows("""SELECT id,name,nameTE,category,unit,qty AS stock,cost,price,threshold,
        (qty <= threshold) AS low FROM inventory WHERE name LIKE ? OR category LIKE ? ORDER BY name""", (q, q)))


def _product_args(d):
    name = (d.get("name") or "").strip()
    if not name:
        raise ValueError("Product name is required")
    return (name, d.get("category") or "General", d.get("unit") or "pcs",
            num(d.get("stock"), "Quantity", True), num(d.get("cost"), "Purchase cost", True),
            num(d.get("price"), "Selling price"), num(d.get("threshold", 10), "Low-stock threshold", True))


@sv.post("/products")
def add_product():
    try:
        a = _product_args(request.json or {})
    except ValueError as e:
        return err(str(e))
    db = get_db()
    cur = db.execute("INSERT INTO inventory(name,category,unit,qty,cost,price,threshold) VALUES(?,?,?,?,?,?,?)", a)
    db.commit(); db.close()
    return ok({"id": cur.lastrowid})


@sv.put("/products/<int:pid>")
def edit_product(pid):
    try:
        a = _product_args(request.json or {})
    except ValueError as e:
        return err(str(e))
    db = get_db()
    db.execute("""UPDATE inventory SET name=?,category=?,unit=?,qty=?,cost=?,price=?,threshold=?,
        lastUpdated=CURRENT_TIMESTAMP WHERE id=?""", (*a, pid))
    db.commit(); db.close()
    return ok()


@sv.delete("/products/<int:pid>")
def del_product(pid):
    db = get_db(); db.execute("DELETE FROM inventory WHERE id=?", (pid,)); db.commit(); db.close()
    return ok()


# ---------- Sales ----------
@sv.post("/sales")
def add_sale():
    d = request.json or {}
    pay = (d.get("payment") or "").lower()
    items = d.get("items") or []
    if pay not in PAY:
        return err("Payment method must be cash, UPI or credit")
    if not items:
        return err("Add at least one product")
    cust = (d.get("customer") or "").strip()
    if pay == "credit" and not cust:
        return err("Customer name is required for credit sales")
    db = get_db()
    try:
        lines, total = [], 0
        for it in items:
            p = db.execute("SELECT * FROM inventory WHERE id=?", (it.get("product_id"),)).fetchone()
            if not p:
                raise ValueError("Product not found")
            qty = num(it.get("qty"), f"Quantity for {p['name']}")
            price = num(it.get("price", p["price"]), f"Price for {p['name']}")
            if qty > p["qty"]:
                raise ValueError(f"Only {p['qty']:g} {p['unit']} of {p['name']} in stock")
            lines.append((p, qty, price)); total += qty * price
        now = datetime.now()
        cur = db.execute("INSERT INTO sv_sales(date,ts,payment,customer,phone,total,paid) VALUES(?,?,?,?,?,?,?)",
                         (now.date().isoformat(), now.isoformat(timespec="seconds"), pay, cust,
                          (d.get("phone") or "").strip(), round(total, 2), 0 if pay == "credit" else 1))
        sid = cur.lastrowid
        for p, qty, price in lines:
            db.execute("UPDATE inventory SET qty=qty-?, lastUpdated=CURRENT_TIMESTAMP WHERE id=?", (qty, p["id"]))
            db.execute("INSERT INTO sv_sale_items(sale_id,product_id,name,qty,price,cost,stock_before,stock_after) VALUES(?,?,?,?,?,?,?,?)",
                       (sid, p["id"], p["name"], qty, price, p["cost"] or 0, p["qty"], p["qty"] - qty))
        db.commit()
        changes = [{"name": p["name"], "before": p["qty"], "after": p["qty"] - q, "low": p["qty"] - q <= p["threshold"]}
                   for p, q, _ in lines]
        return ok({"id": sid, "total": round(total, 2), "stock_changes": changes})
    except ValueError as e:
        db.rollback(); return err(str(e))
    finally:
        db.close()


@sv.get("/sales")
def sales():
    q = f"%{request.args.get('q', '').strip()}%"
    out = rows("""SELECT s.*, (SELECT group_concat(name||' x'||qty, ', ') FROM sv_sale_items WHERE sale_id=s.id) AS items
        FROM sv_sales s WHERE customer LIKE ? OR payment LIKE ? OR date LIKE ? OR CAST(id AS TEXT) LIKE ?
        OR EXISTS(SELECT 1 FROM sv_sale_items WHERE sale_id=s.id AND name LIKE ?) ORDER BY id DESC LIMIT 200""",
               (q, q, q, q, q))
    return ok(out)


@sv.post("/sales/<int:sid>/settle")
def settle(sid):
    db = get_db(); db.execute("UPDATE sv_sales SET paid=1 WHERE id=?", (sid,)); db.commit(); db.close()
    return ok()


@sv.get("/invoice/<int:sid>")
def invoice(sid):
    s = rows("SELECT * FROM sv_sales WHERE id=?", (sid,))
    if not s:
        return err("Invoice not found", 404)
    s = s[0]; its = rows("SELECT * FROM sv_sale_items WHERE sale_id=?", (sid,))
    tr = "".join(f"<tr><td>{i['name']}</td><td>{i['qty']:g}</td><td>₹{i['price']:.2f}</td><td>₹{i['qty']*i['price']:.2f}</td></tr>" for i in its)
    status = "PAID" if s["paid"] else "PENDING (CREDIT)"
    html = f"""<!doctype html><meta charset=utf-8><title>Invoice INV-{sid:04d}</title>
<style>body{{font-family:Arial;max-width:640px;margin:30px auto;color:#222}}table{{width:100%;border-collapse:collapse}}
td,th{{padding:8px;border-bottom:1px solid #ddd;text-align:left}}.r{{text-align:right}}h2{{margin:0}}</style>
<h2>Digimart</h2><div>Hyderabad, Telangana</div><hr>
<b>Invoice INV-{sid:04d}</b> &nbsp; {s['date']}<br>Customer: {s['customer'] or 'Walk-in'} {s['phone'] or ''}<br>
Payment: {s['payment'].upper()} &nbsp; Status: <b>{status}</b>
<table><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>{tr}</table>
<h3 class=r>Total: ₹{s['total']:.2f}</h3><p>Thank you! / ధన్యవాదాలు!</p>"""
    h = {"Content-Disposition": f'attachment; filename="INV-{sid:04d}.html"'} if request.args.get("download") else {}
    return Response(html, mimetype="text/html", headers=h)


# ---------- Expenses ----------
@sv.post("/expenses")
def add_expense():
    d = request.json or {}
    try:
        amt = num(d.get("amount"), "Amount")
    except ValueError as e:
        return err(str(e))
    if not (d.get("category") or "").strip():
        return err("Category is required")
    db = get_db()
    db.execute("INSERT INTO sv_expenses(date,category,amount,note) VALUES(?,?,?,?)",
               (d.get("date") or date.today().isoformat(), d["category"].strip(), amt, d.get("note", "")))
    db.commit(); db.close()
    return ok()


@sv.get("/expenses")
def expenses():
    q = f"%{request.args.get('q', '').strip()}%"
    return ok(rows("SELECT * FROM sv_expenses WHERE category LIKE ? OR note LIKE ? OR date LIKE ? ORDER BY id DESC LIMIT 200", (q, q, q)))


# ---------- Summary ----------
def period(days):
    start = (date.today() - timedelta(days=days - 1)).isoformat()
    sales_ = rows("SELECT COALESCE(SUM(total),0) t FROM sv_sales WHERE date>=?", (start,))[0]["t"]
    cogs = rows("""SELECT COALESCE(SUM(i.qty*i.cost),0) c FROM sv_sale_items i JOIN sv_sales s ON s.id=i.sale_id
        WHERE s.date>=?""", (start,))[0]["c"]
    exp = rows("SELECT COALESCE(SUM(amount),0) e FROM sv_expenses WHERE date>=?", (start,))[0]["e"]
    return {"sales": round(sales_, 2), "expenses": round(exp, 2), "profit": round(sales_ - cogs - exp, 2)}


def snapshot():
    low = rows("SELECT name,qty AS stock,unit,threshold FROM inventory WHERE qty<=threshold ORDER BY qty")
    pend = rows("SELECT id,customer,phone,total FROM sv_sales WHERE paid=0 ORDER BY id")
    top = rows("""SELECT i.name, SUM(i.qty) qty FROM sv_sale_items i JOIN sv_sales s ON s.id=i.sale_id
        WHERE s.date>=? GROUP BY i.name ORDER BY qty DESC LIMIT 5""", ((date.today() - timedelta(days=29)).isoformat(),))
    return {"today": period(1), "week": period(7), "month": period(30), "low_stock": low,
            "trend": [{"date": d, "sales": round(sum(r["total"] for r in rows("SELECT total FROM sv_sales WHERE date=?", (d,))), 2)}
                      for d in [(date.today() - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]],
            "bills_today": rows("SELECT COUNT(*) c FROM sv_sales WHERE date=?", (date.today().isoformat(),))[0]["c"],
            "recent": rows("SELECT id,customer,total,payment,paid FROM sv_sales ORDER BY id DESC LIMIT 5"),
            "mix": {r["payment"]: r["t"] for r in rows("SELECT payment, SUM(total) t FROM sv_sales WHERE date>=? GROUP BY payment",
                    ((date.today() - timedelta(days=29)).isoformat(),))},
            "activity": ([{"kind": "sale", "text": f"Sale #DM-{r['id']:04d} · ₹{r['total']:.0f} ({r['payment']})", "when": r["date"]}
                          for r in rows("SELECT id,total,payment,date FROM sv_sales ORDER BY id DESC LIMIT 3")]
                         + [{"kind": "expense", "text": f"Expense: {r['category']} ₹{r['amount']:.0f}", "when": r["date"]}
                            for r in rows("SELECT category,amount,date FROM sv_expenses ORDER BY id DESC LIMIT 2")]
                         + [{"kind": "stock", "text": f"{p['name']} running low ({p['stock']:g} left)", "when": "now"} for p in low[:2]]),
            "pending": pend, "pending_total": round(sum(p["total"] for p in pend), 2), "top_products": top}


@sv.get("/trend")
def trend():
    r, today, out = request.args.get("range", "7d"), date.today(), []
    q = "SELECT COALESCE(SUM(total),0) t FROM sv_sales WHERE date LIKE ?"
    if r == "6m":
        for i in range(5, -1, -1):
            m, yr = (today.month - 1 - i) % 12 + 1, today.year + (today.month - 1 - i) // 12
            out.append({"label": date(yr, m, 1).strftime("%b"), "sales": rows(q, (f"{yr}-{m:02d}%",))[0]["t"]})
    else:
        for i in range(29 if r == "30d" else 6, -1, -1):
            d = today - timedelta(days=i)
            out.append({"label": d.strftime("%d %b"), "sales": rows(q, (d.isoformat(),))[0]["t"]})
    return ok(out)


@sv.get("/summary")
def summary():
    return ok(snapshot())


# ---------- Tasks ----------
def sync_tasks(s):
    db = get_db()
    for p in s["low_stock"]:
        db.execute("INSERT OR IGNORE INTO sv_tasks(title,source,created) VALUES(?,?,?)",
                   (f"Restock {p['name']} (only {p['stock']:g} {p['unit']} left)", "auto", date.today().isoformat()))
    for p in s["pending"]:
        db.execute("INSERT OR IGNORE INTO sv_tasks(title,source,created) VALUES(?,?,?)",
                   (f"Collect ₹{p['total']:.0f} from {p['customer']} (INV-{p['id']:04d})", "auto", date.today().isoformat()))
    db.commit(); db.close()


@sv.get("/tasks")
def tasks():
    sync_tasks(snapshot())
    return ok(rows("SELECT * FROM sv_tasks ORDER BY status='done', id DESC"))


@sv.post("/tasks")
def add_task():
    t = ((request.json or {}).get("title") or "").strip()
    if not t:
        return err("Task title is required")
    db = get_db(); db.execute("INSERT OR IGNORE INTO sv_tasks(title,source,created) VALUES(?,?,?)", (t, "manual", date.today().isoformat()))
    db.commit(); db.close(); return ok()


@sv.patch("/tasks/<int:tid>")
def toggle_task(tid):
    db = get_db(); db.execute("UPDATE sv_tasks SET status=CASE status WHEN 'open' THEN 'done' ELSE 'open' END WHERE id=?", (tid,))
    db.commit(); db.close(); return ok()


# ---------- Assistant (Sarvam AI, with offline fallback) ----------
def fallback_answer(q, s):
    t, ql = s["today"], q.lower()
    has = lambda *w: any(x in ql or x in q for x in w)
    if has("low", "stock", "స్టాక్", "తక్కువ"):
        return "Low stock: " + (", ".join(f"{p['name']} ({p['stock']:g})" for p in s["low_stock"]) or "none") + " / తక్కువ స్టాక్ ఉన్నవి పైన ఉన్నాయి."
    if has("pending", "credit", "బాకీ", "due", "baki"):
        return f"Pending customer payments: ₹{s['pending_total']:.0f} from {len(s['pending'])} bills / బాకీ ₹{s['pending_total']:.0f}."
    if has("profit", "లాభం"):
        return f"Estimated profit today: ₹{t['profit']:.0f} / ఈ రోజు లాభం ₹{t['profit']:.0f}."
    if has("expense", "ఖర్చు"):
        return f"Expenses today: ₹{t['expenses']:.0f} / ఈ రోజు ఖర్చు ₹{t['expenses']:.0f}."
    if has("top", "best", "ఎక్కువ"):
        return "Top sellers (30 days): " + (", ".join(p["name"] for p in s["top_products"]) or "no sales yet")
    return f"Today you sold ₹{t['sales']:.0f} / ఈ రోజు అమ్మకాలు ₹{t['sales']:.0f}. Week: ₹{s['week']['sales']:.0f}, Month: ₹{s['month']['sales']:.0f}."


@sv.post("/assistant")
def assistant():
    q = ((request.json or {}).get("question") or "").strip()
    if not q:
        return err("Ask a question")
    s = snapshot(); sync_tasks(s)
    key = os.environ.get("SARVAM_API_KEY", "").strip()
    if not key:
        return ok({"answer": fallback_answer(q, s), "source": "offline"})
    sysmsg = ("You are Digimart, a business assistant for a small grocery shop in Hyderabad. Answer ONLY from the JSON data. "
              "Reply in the user's language (English or Telugu), briefly, with ₹ amounts. Suggest 1-3 concrete tasks when useful.\n"
              "DATA: " + json.dumps(s, ensure_ascii=False))
    body = json.dumps({"model": os.environ.get("SARVAM_MODEL", "sarvam-m"), "temperature": 0.2,
                       "messages": [{"role": "system", "content": sysmsg}, {"role": "user", "content": q}]}).encode()
    req = urllib.request.Request(os.environ.get("SARVAM_URL", "https://api.sarvam.ai/v1/chat/completions"), body,
                                 {"Content-Type": "application/json", "api-subscription-key": key})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            ans = json.loads(r.read())["choices"][0]["message"]["content"]
        return ok({"answer": ans, "source": "sarvam"})
    except Exception as e:
        return ok({"answer": fallback_answer(q, s), "source": "offline", "note": f"Sarvam unavailable: {e}"})

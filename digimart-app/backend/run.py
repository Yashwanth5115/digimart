import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import get_db, init_db
from smartvyapar import sv, init_sv


def load_env():  # tiny .env reader so SARVAM_API_KEY never lives in code
    f = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(f):
        for line in open(f, encoding='utf-8'):
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"\''))


load_env()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.register_blueprint(sv)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"ok": True, "status": "online"})

@app.route('/inventory', methods=['GET'])
def get_inventory():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory")
        rows = cursor.fetchall()
        
        inventory_list = []
        for row in rows:
            inventory_list.append({
                "id": row["id"],
                "name": row["name"],
                "nameTE": row["nameTE"],
                "unit": row["unit"],
                "price": row["price"],
                "stock": row["qty"],
                "category": row["category"],
                "expiry": row["expiry"],
                "sku": row["sku"],
                "description": row["description"],
                "lastUpdated": row["lastUpdated"]
            })
        conn.close()
        
        return jsonify({
            "ok": True,
            "data": inventory_list,
            "message": "Inventory fetched successfully"
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.route('/inventory/add', methods=['POST'])
def add_inventory():
    try:
        data = request.json
        if not data or not data.get("name"):
            return jsonify({"ok": False, "message": "Product name is required"}), 400
        
        name = data.get("name")
        price = data.get("price", 0)
        stock = data.get("stock", 0)
        category = data.get("category", "General")
        sku = data.get("sku", "")
        expiry = data.get("expiry", None)
        desc = data.get("description", "")
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO inventory (name, price, qty, category, sku, expiry, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, price, stock, category, sku, expiry, desc))
        conn.commit()
        
        new_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            "ok": True,
            "data": {
                "id": new_id,
                "name": name,
                "price": price,
                "stock": stock,
                "category": category
            },
            "message": f"{name} added successfully"
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.route('/login', methods=['POST'])
def login():
    # Simple mock login for hackathon
    data = request.json or {}
    username = data.get("username", "admin")
    password = data.get("password", "")
    return jsonify({
        "ok": True,
        "data": {
            "token": "lc_mock_token_12345",
            "user": {
                "username": username,
                "role": "Store Owner"
            }
        },
        "message": "Login successful"
    })


@app.route('/register', methods=['POST'])
def register():
    # Mock registration for hackathon
    data = request.json or {}
    username = data.get("username", "")
    password = data.get("password", "")
    if not username or len(username) < 3:
        return jsonify({"ok": False, "message": "Username must be at least 3 characters"}), 400
    if not password or len(password) < 6:
        return jsonify({"ok": False, "message": "Password must be at least 6 characters"}), 400
    return jsonify({
        "ok": True,
        "data": {
            "token": f"lc_mock_token_{username}_reg",
            "user": {
                "username": username,
                "role": "Store Owner"
            }
        },
        "message": f"Account created successfully! Welcome, {username}"
    })


@app.route('/transactions', methods=['POST'])
def add_transaction():
    try:
        data = request.json
        if not data or "id" not in data:
            return jsonify({"ok": False, "message": "Transaction data is incomplete"}), 400
        
        txn_id = data.get("id")
        date = data.get("date")
        hour = data.get("hour")
        subtotal = data.get("subtotal", 0)
        discount = data.get("discount", 0)
        discountType = data.get("discountType", "percent")
        total = data.get("total", 0)
        customerName = data.get("customerName", "")
        items = data.get("items", [])
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Insert into transactions table
        cursor.execute('''
            INSERT INTO transactions (id, date, hour, subtotal, discount, discountType, total, customerName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (txn_id, date, hour, subtotal, discount, discountType, total, customerName))
        
        # Insert items
        for item in items:
            cursor.execute('''
                INSERT INTO transaction_items (txn_id, item_name, qty, price, unit, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (txn_id, item.get("name"), item.get("qty"), item.get("price"), item.get("unit"), item.get("subtotal")))
            
            # Deduct stock
            if item.get("id"):
                cursor.execute('UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ?', (item.get("qty"), item.get("id")))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "ok": True,
            "message": f"Transaction {txn_id} saved and stock updated"
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.route('/transactions', methods=['GET'])
def get_transactions():
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Get all transactions
        cursor.execute("SELECT * FROM transactions ORDER BY date DESC")
        txn_rows = cursor.fetchall()
        
        txns = []
        for t in txn_rows:
            txn_id = t["id"]
            # Get items for this transaction
            cursor.execute("SELECT * FROM transaction_items WHERE txn_id = ?", (txn_id,))
            item_rows = cursor.fetchall()
            items = []
            for i in item_rows:
                items.append({
                    "name": i["item_name"],
                    "qty": i["qty"],
                    "price": i["price"],
                    "unit": i["unit"],
                    "subtotal": i["subtotal"]
                })
            
            txns.append({
                "id": t["id"],
                "date": t["date"],
                "hour": t["hour"],
                "subtotal": t["subtotal"],
                "discount": t["discount"],
                "discountType": t["discountType"],
                "total": t["total"],
                "customerName": t["customerName"],
                "items": items
            })
        
        conn.close()
        return jsonify({
            "ok": True,
            "data": txns,
            "message": "Transactions fetched successfully"
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.route('/voice/process', methods=['POST', 'OPTIONS'])
def process_voice_command():
    if request.method == 'OPTIONS':
        return jsonify({"ok": True}), 200
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "") or ""
        source = data.get("source", "unknown") or "unknown"
        if text:
            print(f"[Voice Assistant] Command: '{text}' (Source: {source})")
        return jsonify({
            "ok": True,
            "message": "Command received",
            "data": {
                "text": text,
                "source": source
            }
        })
    except Exception as e:
        print(f"[Voice Assistant Error] {e}")
        return jsonify({"ok": False, "message": "Voice processing error"}), 500


if __name__ == '__main__':
    # Ensure database is initialized before starting the app
    init_db()
    init_sv()
    
    # Run the server on port 5005
    port = int(os.environ.get("APP_PORT", 5005))
    host = os.environ.get("APP_HOST", "0.0.0.0")
    
    print(f"Starting backend server on {host}:{port}")
    app.run(host=host, port=port, debug=True)

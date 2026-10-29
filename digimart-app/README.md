Digimart (formerly Smart Kirana) is an innovative web application designed to modernize and streamline the daily operations of local neighborhood grocery stores (Kiranas). By digitizing inventory and store management, it empowers small business owners to operate more efficiently. A standout feature of this platform is its custom integrated voice engine (voice-engine.js), which enables hands-free operations and intuitive voice-based commands, significantly enhancing accessibility for busy shopkeepers. Additionally, the application is built as a Progressive Web App (PWA) utilizing service workers (sw.js) and a web manifest, ensuring reliable offline capabilities and a native app-like experience on mobile devices.

Tech Stack:
Frontend: Built entirely with core web technologies including HTML5, CSS3 (with dedicated mobile responsive designs like mobile.css), and Vanilla JavaScript (powering the voice engine, data filtering, and UI interactions).

Backend & Scripting: Utilizes Python (evidenced by scripts like launch_web.py) potentially for local server-side logic or automation, alongside a dedicated backend directory.

Deployment: The application is deployed and hosted on Vercel (smart-kirana-alpha.vercel.app) for fast and reliable web access.


## Digimart (added)
Dashboard for a small shop: overview (daily/weekly/monthly), inventory with low-stock flags, multi-item sales (cash/UPI/credit), expenses, downloadable invoices, searchable history, auto-generated tasks, and an English/Telugu assistant.
- Backend: `backend/smartvyapar.py` (Flask blueprint at `/api/sv/*`, same SQLite DB). Frontend: `frontend/js/smartvyapar.js` ("Digimart" in the sidebar).
- Run: `pip install -r backend/requirements.txt && python launch_web.py`
- Assistant: copy `backend/.env.example` to `backend/.env` and set `SARVAM_API_KEY`. Without a key it answers from your data with built-in rules.
- `public/` is the Vercel copy of `frontend/`; the Flask backend must run separately (set `window.SV_API` for a hosted backend).

### Pages
- `/` (frontend/index.html): landing page with live dashboard preview
- `/dashboard.html`: the full Digimart app (sign in via `/login.html`)

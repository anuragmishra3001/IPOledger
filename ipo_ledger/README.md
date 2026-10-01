# IPO Ledger

Private IPO money ledger. Flask + SQLite. Runs only on your own computer.

## Run
    pip install -r requirements.txt
    python app.py
Open http://127.0.0.1:5000 and create your account on first run.

## Using it
- Create an IPO, open it, type a name, pick Friend or Family, enter amounts like `14852, 853, 1000`.
- Each amount is saved as its own line; person, column and IPO totals update automatically.
- Search from the home page (IPO or person name) or inside one IPO.

## Security built in
- Login required; passwords stored hashed; 5 wrong tries locks login for 5 minutes; auto logout after 30 idle minutes.
- Server listens on 127.0.0.1 only (not reachable from other devices).
- All SQL uses parameters (no SQL injection); CSRF tokens on every form; strict security headers; pages are never cached.
- Money stored as whole paise (no rounding errors).
- Keep `ledger.db` and `.secret_key` private and back them up. Never put them on a public or shared folder.

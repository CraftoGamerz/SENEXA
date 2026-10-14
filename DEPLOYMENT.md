# Publish SENEXA

The files in this folder belong at the root of your GitHub repository. The frontend can run on GitHub Pages. The Python gateway runs on your own computer or factory server. GitHub Pages does not execute Python or store sensor telemetry.

## 1. Run the app locally

Install Node.js 22.12 or later (Node 24 also works), then run:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. The demo works immediately without Firebase setup. It includes simulated readings, persistent machine records, alerts and maintenance workflows. Use Sign in for Google, anonymous or email authentication. Use the local exploration option for profession onboarding without an account.

## 2. Configure your Firebase project

Project: `senexa-df0dd`.

1. Open https://console.firebase.google.com/project/senexa-df0dd/authentication/providers
2. Enable **Google**, **Anonymous**, and **Email/Password**. Google also requires a support email.
3. In Authentication > Settings > Authorized domains, add **craftogamerz.github.io**. Keep `localhost`. If you use the IP-based development URL, add `127.0.0.1` too. Domains have no protocol, port or path.
4. Open Firestore Database. If it does not exist, create it in production mode and choose an appropriate region.
5. Open the Rules tab, paste the contents of `firestore.rules`, then Publish. These rules restrict each workspace to its authenticated owner. Do not replace them with an allow-all rule.
6. Alternatively, from this repository, sign in with the Firebase CLI and deploy only the rules:

```sh
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project senexa-df0dd
```

7. Sign in to the app, go to Settings, choose **Save to cloud**, make a local change and use **Load snapshot** to verify the saved state. Loading replaces the current local workspace after confirmation. Demo and gateway snapshots cannot be loaded into the wrong data mode.

Cloud snapshots are explicit saves, not collaborative editing. No automatic merge is performed. Telemetry and gateway tokens are excluded. Anonymous accounts are temporary identities; export a backup before signing out or clearing browser data. Google or email accounts are preferable for lasting access. Profession selection personalizes context but grants no extra access permissions.

Verified during development on 14 October 2026: the Firebase project configuration responded, anonymous account creation/deletion succeeded, and Firestore returned 403 for an authenticated test read. The authorized domains then included localhost and the Firebase hosting domains, but not the GitHub Pages domain. Google popup sign-in needs your interactive account selection and domain configuration.

## 3. Publish on GitHub Pages

The included `.github/workflows/deploy.yml` tests the code, builds the frontend and deploys the `dist` folder. It runs on pushes to `main` or `master` and can be run manually.

1. Push these source files to `CraftoGamerz/SENEXA` on `main`.
2. In the GitHub repository, open Settings > Pages.
3. Set **Source** to **GitHub Actions**. Do not publish the source directory using the old branch-based Pages method.
4. Open Actions and wait for **Test and deploy SENEXA** to finish.
5. Open the URL shown by the deployment. A repository site normally uses `https://craftogamerz.github.io/SENEXA/`; use the exact URL reported by GitHub because repository path casing can matter.

For a new local clone, your commands are:

```sh
git add .
git commit -m "Build SENEXA factory intelligence workspace"
git branch -M main
git remote add origin https://github.com/CraftoGamerz/SENEXA.git
git push -u origin main
```

If `origin` already exists, use `git remote set-url origin https://github.com/CraftoGamerz/SENEXA.git` instead of adding it again. Use your own authenticated GitHub account and commit identity. No extra GitHub Actions secret is needed for Pages; the workflow uses GitHub's built-in token and Pages permissions.

## 4. Run the local gateway

Install Python 3.12. Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r gateway/requirements.lock.txt
.venv\Scripts\python.exe -m uvicorn gateway.app:app --host 127.0.0.1 --port 8000
```

Linux/macOS:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r gateway/requirements.lock.txt
.venv/bin/python -m uvicorn gateway.app:app --host 127.0.0.1 --port 8000
```

On first startup, the gateway creates a random bearer token in `gateway/data/access-token.txt` unless `SENEXA_GATEWAY_TOKEN` is already set. Copy it into Edge & models > Gateway access token. Set the URL to `http://127.0.0.1:8000`, connect, then start the gateway simulator. The token remains in browser memory only and must be entered again after reload. The gateway stores readings and model state locally in `gateway/data`, which Git ignores.

To use the entire app over Ethernet without internet:

1. Run `npm run build` on a connected setup machine. Fonts, icons and scripts are bundled locally.
2. Start the gateway with `--host 0.0.0.0` instead of `127.0.0.1`.
3. On another factory device, open `http://YOUR_EDGE_PC_IP:8000` and set the gateway URL to that same address.
4. Allow port 8000 on the trusted factory network as appropriate. Prefer HTTPS for untrusted networks.
5. Local viewing and detection do not require Firebase sign-in. Google/email login and cloud synchronization require internet access.

Browsers restrict HTTPS Pages sites from accessing insecure HTTP LAN hosts. Serve the app from the gateway's LAN address, or give your gateway a valid HTTPS endpoint. CORS cannot override mixed-content restrictions. Cross-origin setups must add the exact frontend origin to `SENEXA_ALLOWED_ORIGINS`. The production service worker caches the web bundle after installation; the gateway's local hosting is the reliable option for a first visit without internet.

## 5. Continuous deployment with Docker

Copy `.env.example` to `.env` and replace the placeholder token with a cryptographically random value. Never commit `.env`. Then:

```sh
docker compose up --build -d
```

Docker serves the built app and gateway together on port 8000 and restarts the process after a crash or reboot while Docker is running. Telemetry and model files persist in a Docker volume. For unattended factory operation, also configure the host to start Docker automatically and provide appropriate power protection. Docker builds and physical Ethernet/MQTT hardware were not exercised in the development environment.

## 6. Connect actual sensors

Sensors or a device bridge send HTTP readings to `POST /api/readings` with `Authorization: Bearer YOUR_GATEWAY_TOKEN`. Register matching machine IDs in the app. See `gateway/API.md` for payloads.

For MQTT, install a broker such as Mosquitto, configure authentication and device permissions, then set `SENEXA_MQTT_HOST`, port, TLS and broker credentials in the gateway process environment. The bridge subscribes to `senexa/+/telemetry` by default. Each message contains one Reading object with `source: "sensor"`. The optional external HTTP simulator is `gateway/simulator.py`; its output always uses `source: "simulator"`.

Machine feedback records the latest actual sample as normal, fault-confirmed or inconclusive. A real training run requires at least 40 distinct technician-reviewed normal sensor readings for the selected machine. Demo training uses 300 synthetic readings and is labelled accordingly. A candidate must pass its normal-sample sanity gate before manual promotion. These checks do not establish field accuracy or failure prediction performance.

## Secrets and configuration

| Item | Where it belongs |
|---|---|
| Firebase web configuration/API key | `src/firebase.ts`; public client configuration, not an admin credential |
| Firestore authorization | `firestore.rules`, deployed to Firebase |
| Gateway bearer token | Local environment, ignored `.env`, or ignored token file |
| MQTT password | Gateway process environment only |
| Firebase service-account JSON | Not needed for this app; never put it in the frontend or repository |
| GitHub push credentials | Git Credential Manager or your own GitHub login |
| External AI API key | Not needed; Markdown export sends no data automatically |

Never put a server secret into a `VITE_` variable. Vite exposes those variables in the public frontend bundle.

## Validation commands

```sh
npm test
npm run build
python -m pytest gateway/test_gateway.py -q
```

For browser tests, run the Vite server and a test gateway on port 8001 with `SENEXA_GATEWAY_TOKEN=senexa-e2e-local-test-token` and a separate temporary `SENEXA_DATA_DIR`. Then run `npm run test:e2e`. This test token is only for local tests. On Windows the tests use installed Microsoft Edge. On Linux run `npx playwright install chromium` first.

Official references: [Vite Pages deployment](https://vite.dev/guide/static-deploy.html), [Firebase authentication](https://firebase.google.com/docs/auth/web/start), [Firestore rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/), [Isolation Forest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html).

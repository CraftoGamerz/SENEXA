# SENEXA

Industrial performance intelligence for the factory floor.

SENEXA is a React and TypeScript workspace for machine monitoring, anomaly review and maintenance. It runs as a GitHub Pages demo or connects to a local Python gateway over the factory LAN.

## Start here

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. See [DEPLOYMENT.md](DEPLOYMENT.md) for Firebase, GitHub Pages, LAN hosting, secrets and Docker instructions.

## Included

- Minimal responsive SaaS dashboard, bundled fonts, Lucide icons and light/dark themes.
- Dynamic simulated telemetry, time-window controls, trends, condition distribution and machine inspection.
- Google, anonymous and email Firebase authentication, password reset and private workspace snapshots.
- Profession onboarding and an animated, explicitly simulated sensor-pairing walkthrough.
- Machine registration, search, status filters, anomaly acknowledgement and deduplicated work orders.
- Engineer assignment, due dates, progress, notes and separately recorded technician outcomes.
- Filtered CSV records, classified datasets and Markdown AI briefs with data provenance and limitations.
- Searchable explanations for complex monitoring and ML terms.
- Local browser persistence, per-account isolation, separate demo/live workspaces and validated backup/restore.
- FastAPI gateway, SQLite telemetry storage, HTTP ingestion, optional MQTT bridge and an external simulator.
- Real local Isolation Forest training, validation, explicit promotion and rollback.
- Production offline app shell, local LAN hosting, Docker deployment and GitHub Pages Actions workflow.

## Architecture

```text
Sensor / simulator -> HTTP or MQTT -> Local gateway -> SQLite + local detection
                                             |
                                      LAN dashboard
                                             |
                                Optional Firebase workspace sync
```

The browser demo runs without a gateway. The gateway simulator generates labelled synthetic samples. Physical sensors use the same ingestion contract with their own source label. The app does not automatically send data to an external AI service.

## Source layout

```text
src/                 React app, domain validation, reports and Firebase adapter
public/              Favicon and production service worker
 gateway/            FastAPI service, simulator, API contract and tests
 e2e/                Browser workflow tests
 firestore.rules     Owner-only snapshot permissions
 .github/workflows/  Tested GitHub Pages deployment
 legacy/             Preserved original prototype
```

## Quality checks

```sh
npm test
npm run build
python -m pytest gateway/test_gateway.py -q
```

Browser tests cover maintenance, persistence, mobile navigation, gateway integration, onboarding and filtered exports. Instructions for running them are in DEPLOYMENT.md. Production auth requires enabled providers and authorized domains. Firestore requires the supplied rules to be deployed by the project owner.

## Scope and evidence

All showcase values are simulated. Condition indices and threshold classifications are heuristics, not failure probabilities. The local model sanity gate reports only its held-out normal-sample flag rate. It does not establish field accuracy, savings or remaining life. Inspection outcomes remain distinct from model outputs. No payment, multi-user organization sharing, industrial actuation or third-party messaging provider is included.

Built by CompileX for SENEXA.

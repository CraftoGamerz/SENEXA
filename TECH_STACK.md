# Technology stack

## Existing product (verified from index.html)
HTML5, CSS3, JavaScript ES6. Chart.js 4.4.1. Font Awesome 6.5.1. Google Fonts: Space Grotesk, DM Sans, JetBrains Mono (hosted stylesheet, no pinned font revision). GitHub Pages static deployment. No package manifest, build tool, backend, database, real auth or test framework. Browser version is environment dependent.

## Proposed future architecture
Sensors -> MQTT gateway -> validated telemetry storage -> calibrated detection -> operator review/work order. Backend/database/auth/ML versions are unselected and must be documented before implementing them. Do not imply production compatibility has been tested.

## Presentation build
Bundled runtime 26.1011.11113, @oai/artifact-tool 2.8.93, Node.js 24.19.0, Lucide static 0.468.0 (recorded in .build/runtime-versions.json). Native PPTX objects, source branding assets, Playwright browser screenshots. Microsoft PowerPoint native PDF export, with slide PNG inspection. No modifications to product runtime.

## Revision 4 architecture proposal
An Ethernet LAN connects gateways to an on-site edge PC with local MQTT broker, storage, application service and ML runtime. Serve all web assets locally. Candidate component: Mosquitto (deployment version to be selected before implementation). Continuous inference and scheduled retraining are separate services. Do not claim every model supports online partial updates. Library versions for this proposed implementation remain unselected; no application code is being implemented in this deck revision. Sources: https://mosquitto.org/man/mosquitto-conf-5.html and https://scikit-learn.org/stable/computing/scaling_strategies.html.


Revision 5 authoring uses bundled runtime 26.1013.11914 and artifact-tool. Product stack is unchanged. Reference PDF cloud/technology alternatives are conceptual, not selected deployment dependencies.


## Phase 6 selected implementation stack
Node 24.15.0; React/React DOM 19.1.1; Vite 7.1.7; @vitejs/plugin-react 5.0.4; TypeScript 5.9.2; Firebase JS 12.3.0; Recharts 3.2.1; Lucide React 0.468.0; Vitest 3.2.4; Playwright 1.55.1; DM Sans/Space Grotesk via local font packages. Exact font/type packages recorded in package-lock.json. CSS custom properties (no extra Tailwind dependency needed).
Python 3.12: FastAPI 0.115.12, uvicorn 0.34.2, pydantic 2.11.5, numpy 2.2.6, scikit-learn 1.6.1, paho-mqtt 2.1.0, pytest 8.3.5, httpx 0.28.1. SQLite uses Python stdlib for a single-site gateway; PostgreSQL/Timescale remains a scaling option, not a required service. Firebase Auth + Firestore are optional cloud services. GitHub Pages hosts static app; local gateway also serves dist. TLS termination required for remote deployments. MQTT broker is separately configured; HTTP ingestion works without it. Lockfiles pin resolved dependencies.


Validation updates: Vite 7.3.7, Vitest 5.0.4, grpc-js override 1.14.6 address registry audit findings. FastAPI updated to 0.143.1 with compatible current Starlette. Resolved Python versions recorded in gateway/requirements.lock.txt after validation. Anonymous authentication uses Firebase signInAnonymously; no extra dependency.

Final validated runtime: Node 24.15.0, Python 3.12.14, Vite 7.3.7, Vitest 5.0.4, FastAPI 0.143.1, Starlette 0.50.0. package-lock.json and gateway/requirements.lock.txt record exact dependencies. CI uses Node 22 and Python 3.12.

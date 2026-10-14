# Backend structure

## Current verified implementation
No backend, schema, database or API endpoints. Data arrays for machines/anomalies/alerts and maintenance populate browser views. Randomized values drive displayed telemetry/charts. Login/signup and hardware pairing are simulations. CSV export serializes browser records. Settings save displays a toast.

## Proposed future requirements (not implemented)
Authenticated organization-scoped access, device identity and credentials, timestamped readings with units and validation, machine baselines, alert deduplication, technician-reviewed maintenance records. Data ownership and authorization must be designed before pilot. No schemas or API payloads are invented for this presentation task.

## Business logic evidence
The concept depicts Isolation Forest, Autoencoder, Statistical Thresholding and LSTM with a 3-of-4 critical-alert rule. Current code renders preset/synthetic outputs instead of running these models. Pilot should compare a simple threshold baseline against learned models, measure false alerts and useful lead time, and add complexity only with evidence.

## Revision 4 proposed local business logic
Continuous path: validate and timestamp readings, retain locally, extract features, score with the current model, deduplicate alerts and create maintenance work items. Supervise services with auto-start/watchdog and plan UPS protection. Learning path: collect history and confirmed technician outcomes, periodically retrain locally, compare against a held-out baseline and promote only after validation; retain last working model for rollback. Keep local alarms independent of remote messaging. Deployment requires local power and LAN availability. This is proposed behavior, not a reported implementation.

Pilot model assumption: begin with local Isolation Forest plus threshold rules. Compare against the threshold baseline before expanding the ensemble.


Revision 5: No software changes. Diagrams depict proposed validation, local storage, feature extraction/inference and technician-reviewed model promotion. No new endpoints or schemas.


## Phase 6 data and API contract
Browser Workspace v1: name:string, industry:string, machines:Machine[], alerts:Alert[], orders:WorkOrder[], thresholds:{vibration,temperature,current}, updatedAt:string. Machine: id,name,type,zone, installedAt strings. Reading: machineId,timestamp ISO, vibration mm/s >=0 <=100, temperature C -40..250, current A 0..1000, rpm 0..100000, source simulator|sensor. Alert: id,machineId,title,severity warning|critical,status open|acknowledged,createdAt,reason. Order: id,machineId,title,assignee,dueDate,status open|in-progress|completed,notes,alertId nullable. Arrays bounded; all untrusted JSON validated.
Firestore /users/{uid}/workspaces/main: version:1,payload:map,updatedAt:server timestamp. Owner-only read/write via Firebase Auth UID; rules deny all other paths. Local work per UID; cloud snapshots explicitly synchronized. Credentials and gateway tokens never in snapshots.
Gateway REST /api/health; bearer-token protected /api/snapshot, POST /api/readings (list <=1000), PUT /api/thresholds, POST /api/simulator/start|stop, GET /api/models, POST /api/models/train|promote|rollback, POST /api/feedback. Snapshot includes readings and latest machine warnings; frontend maps to its own asset registry. SQLite readings/history/feedback; per-process lock, bounded retention. MQTT optional bridge accepts same Reading JSON with configured broker credentials. No direct browser raw TCP/MQTT.
Training uses reviewed normal sensor samples, or explicitly labelled synthetic baseline in showcase. Hold out normal samples to measure nuisance flag rate, retain candidate and last model, explicit promotion only after sanity gate. This is not field accuracy. Threshold fallback always available. Environment bearer token required; CORS exact allowlist; unconfigured startup generates a local token. No arbitrary outbound URLs or webhook dispatch. No industrial actuation.


Schema expansion: Workspace.profile={displayName,profession}; profession describes owner|manager|engineer|operator, not authorization. WorkOrder.outcome=unreviewed|normal|fault-confirmed|inconclusive. Legacy v1 payloads receive safe defaults during validation. Firestore owner-only rules allow validated profile fields. AI export labels a threshold rule classification separately from technician confirmation. Predictions are recommended inspection actions, not validated forecasts.

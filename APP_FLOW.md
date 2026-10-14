# Application flow

## Current observed app
Landing with simulated console -> login/signup modal -> organization selection -> animated sensor pairing -> six navigation pages: Dashboard, Machines, Anomalies, Analytics, Maintenance, Settings. Machine and anomaly details open modals. Search/filter/sort/export and theme controls are implemented in browser JavaScript.

## States and edge cases
Login/signup changes UI only, without an authenticated session. Organization selection gates Next. Pairing uses timed animation, then enables dashboard entry. Filters/search can return an empty state. Simulated telemetry changes periodically. Settings Save displays a toast but does not establish persisted backend configuration. CDN/network failure can prevent fonts/icons/charts from loading. Reload resets in-memory state. No verified live sensor, server, database, inference service or notification delivery.

## Presentation navigation
Fixed linear six-slide sequence in PRD. Website and repository hyperlinks are external evidence. No demonstration video supplied (user supplied repository URL instead).

## Proposed offline flow
Sensors feed a gateway through the local Ethernet LAN. The on-site service stores readings, runs a local model, raises dashboard alerts and queues maintenance work continuously. Operators open the locally hosted dashboard by LAN address. Bundle fonts/chart/icon assets locally. Internet is optional for remote synchronization; external messaging waits for connectivity. On network or power failure, show stale-data status and recover buffered readings after reconnection.


Revision 5 presentation flow: Slide 2 workshop pain and MSME benefits; slide 3 six-step sense-to-action flow plus actual demo evidence; slide 4 grouped LAN architecture and reviewed learning feedback; slide 5 comparison; slide 6 pilot/evaluation/cost and closing USP. Website is the only external product link.


## Phase 6 application flow
Default: demo dashboard with seeded assets and visible demo banner. Hash navigation supports GitHub Pages refresh. Sidebar screens Overview, Assets, Alerts, Analytics, Work orders, Edge & models, Settings. Global search filters assets/alerts. Asset drawer shows four metrics and recent trend. Add asset and create/edit work forms validate required fields. Alerts can be acknowledged or converted into a deduplicated order. Orders advance Open -> In progress -> Completed with notes. Settings persist workspace, thresholds, theme and browser notification preference. Backup/restore validates version/shape.
Sign in modal: email signup/login, Google popup, password reset. Authentication errors remain visible and never silently become success. Signed-in users get a separate local namespace, and explicitly load or save a private Firestore workspace; demo data is never automatically uploaded. Sign-out returns to independent demo state. Cloud failures leave local work intact. Live mode requires a tested gateway URL/token, rejects unreachable/invalid responses and displays stale data after 15s. Switching away clears live readings and never blends sources. Gateway controls simulator, model training/promotion/rollback. Empty telemetry and zero results have explanations. LAN use serves built assets from the gateway for internet-independent operation. Browser notifications require permission; analytics is opt-in.


Expanded onboarding: after first Google/email/anonymous auth, profession/profile and factory details -> demo sensor pairing animation (vibration, temperature, current, RPM) -> workspace. Skip pairing is supported. Local demo also offers onboarding without cloud login. Settings can reopen onboarding. Help opens searchable glossary. Report controls export the current filtered view as CSV or a Markdown AI analysis brief. Work-order form records technician outcome separately from workflow completion. Empty/filter states and source changes propagate across analytics and exports.

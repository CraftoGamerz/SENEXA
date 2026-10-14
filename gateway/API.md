# Local gateway API

The gateway runs with a single worker because simulator/model state is process-local. SQLite and model artifacts survive restarts. All `/api` routes except `/api/health` require `Authorization: Bearer <token>`. Browser calls also obey the configured origin allowlist.

## Readings

`POST /api/readings` takes an array of 1 to 1,000 readings. Duplicate machine/timestamp pairs are ignored. Timestamps must contain a timezone and cannot be more than 60 seconds ahead of the gateway clock.

```json
[
  {
    "machineId": "CNC-01",
    "timestamp": "2026-10-14T12:00:00Z",
    "vibration": 1.8,
    "temperature": 52.1,
    "current": 14.5,
    "rpm": 2840,
    "source": "sensor"
  }
]
```

Use current timestamps for live tests. Units: mm/s, degrees Celsius, amperes and RPM. Accepted ranges are vibration 0..100, temperature -40..250, current 0..1000, RPM 0..100000. Unknown fields, invalid sources and nonfinite numbers are rejected. The source can be `sensor` or `simulator`. MQTT only accepts `sensor` messages.

`GET /api/snapshot` returns recent readings, machine alerts, simulator state, active model and configured thresholds. The UI polls every four seconds and marks readings older than 15 seconds as offline. Recent reads are bounded to 3,000 rows, storage to 30 days and 200,000 rows. Data older than the retention limit is discarded. This is a single-site pilot configuration.

## Routes

| Method and route | Body | Result |
|---|---|---|
| GET `/api/health` | None | Service/version status |
| GET `/api/snapshot` | None | Readings, alerts, thresholds and source state |
| POST `/api/readings` | Reading array | Accepted count and duplicate policy |
| PUT `/api/thresholds` | `{"vibration":5.5,"temperature":80,"current":30}` | Stored global limits |
| POST `/api/simulator/start` | `{}` | Starts synthetic sampling every 3 seconds |
| POST `/api/simulator/stop` | `{}` | Stops new synthetic readings; history remains labelled |
| GET `/api/models` | None | Active, previous and candidate metadata |
| POST `/api/models/train` | `{"demo":false,"machineId":"CNC-01"}` | Candidate plus held-out normal flag rate |
| POST `/api/models/promote` | `{}` | Promotes a passed candidate, preserves previous |
| POST `/api/models/rollback` | `{}` | Restores previous model |
| POST `/api/feedback` | `{"machineId":"CNC-01","outcome":"normal","notes":"Inspection complete"}` | Review tied to latest sample |

Feedback outcomes are `normal`, `fault-confirmed` or `inconclusive`. Only distinct normal sensor samples contribute to real training. Demo training uses a synthetic baseline and does not validate machine performance. Isolation Forest is scoped to the selected machine; the initial runtime holds one active model at a time. Threshold rules apply across machines. Machine-specific limits and multiple concurrent deployed models are future extensions.

Errors use JSON `detail`, with 401 for invalid tokens, 404 for missing machine feedback targets, 409 for invalid promotion/rollback state and 422 for validation failures. The gateway never controls industrial equipment or claims a confirmed diagnosis from a sensor reading alone.

## Cloud and local responsibilities

The gateway stores telemetry, reviewed samples and model files. The browser stores asset metadata, work orders, alerts and profession settings. Firebase optionally stores an owner-scoped snapshot of those browser workspace records. The current gateway is not a collaborative work-order server and does not send email, SMS or WhatsApp messages. Browser notifications work when the browser is running and permission has been granted.

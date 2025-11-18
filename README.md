Getting Started
- Prerequisites: Node.js 18+, npm, MongoDB (local or Atlas), Redis.
- Install deps:
	```powershell
	cd "telemetry-ingestor"
	npm install
	```
- Configure environment: copy `.env.example` to `.env` and set values:
	```dotenv
	MONGO_URI=
	REDIS_URL=
	ALERT_WEBHOOK_URL=https://webhook.site/<your-uuid>
	INGEST_TOKEN=secret123
	# PORT=3000
	```
	- Webhook URL (required): create a unique URL at https://webhook.site and paste it.
- Run the app (dev):
	```powershell
	npm run start:dev
	```
API
- Base URL: `http://localhost:3000/api/v1`

- POST `/telemetry` (single or array)
	- Body (single example):
		```json
		{
			"deviceId": "dev-002",
			"siteId": "site-A",
			"ts": "2025-09-01T10:00:30.000Z",
			"metrics": { "temperature": 51.2, "humidity": 55 }
		}
		```
	- Array wrapper also supported:
		```json
		{ "items": [ { "deviceId": "dev-002", "siteId": "site-A", "ts": "2025-09-01T10:00:30.000Z", "metrics": { "temperature": 51.2, "humidity": 55 } } ] }
		```
	- Validates DTO, persists to Mongo, caches `latest:<deviceId>` in Redis, and triggers alerts on thresholds.
	- Auth: include header `Authorization: Bearer secret123` when `INGEST_TOKEN` is set.

- GET `/devices/:deviceId/latest`
	- Returns the latest reading for a device. Redis-first, Mongo fallback.

- GET `/sites/:siteId/summary?from=ISO&to=ISO`
	- Returns `{ count, avgTemperature, maxTemperature, avgHumidity, maxHumidity, uniqueDevices }` for the window.

- GET `/health`
	- Returns `{ mongo: 'ok'|'down', redis: 'ok'|'down' }`.

Alerts
- Rules:
	- Temperature > 50 → `HIGH_TEMPERATURE`
	- Humidity > 90 → `HIGH_HUMIDITY`
- Payload sent to `ALERT_WEBHOOK_URL`:
	```json
	{ "deviceId": "...", "siteId": "...", "ts": "...", "reason": "HIGH_TEMPERATURE|HIGH_HUMIDITY", "value": 0 }
	```
- Dedup: per device + reason for 60 seconds via Redis.
- Timeout: webhook POST has a 3s timeout.

Quick Verification (PowerShell)
```powershell
# 0) Health
Invoke-RestMethod http://localhost:3000/api/v1/health

# 1) Ingest (requires token if INGEST_TOKEN is set)
$h = @{ Authorization = 'Bearer secret123' }
$body = @{ deviceId='dev-002'; siteId='site-A'; ts='2025-09-01T10:00:30.000Z'; metrics=@{ temperature=51.2; humidity=55 } } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/telemetry -Headers $h -ContentType 'application/json' -Body $body

# 2) Latest
Invoke-RestMethod http://localhost:3000/api/v1/devices/dev-002/latest

# 3) Summary
$from = '2025-09-01T00:00:00.000Z'
$to   = '2025-09-02T00:00:00.000Z'
Invoke-RestMethod "http://localhost:3000/api/v1/sites/site-A/summary?from=$from&to=$to"
```

Running Tests
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Smoke test: `powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1`

AI Assistance (what was used)
- Generated DTOs, Mongoose schema, and Nest modules wiring (Config, Redis, Telemetry).
- Implemented ingest flow with Mongo persist, Redis cache, alert dedup + webhook POST.
- Added global validation, payload limits, health endpoint, and optional bearer auth.
- Wrote PowerShell-first smoke test.
- Refined dependency injection (AlertModule export/import) and fixed build issues.
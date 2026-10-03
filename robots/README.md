# AICore Robotics Ops — SIMULATION demo

Static, bilingual (Arabic RTL default / French) demo of a human-supervised robot-fleet console. **All robot/fleet data is fictional (SIMULATION).** Only items carrying the green **LIVE / حي** badge are real (listed below). No robots, customers or deployments exist. Runs entirely in the browser: no build step, no backend. **Network calls:** the only requests the pages ever make are (1) the public Open-Meteo weather API (`api.open-meteo.com`, no key) for the LIVE weather panels, and (2) *optionally*, only if you type your own project URL and publishable key into the sensor dialog, your own Supabase REST endpoint for a cabinet-temperature sensor. No analytics, no CDN, no fonts/scripts from third parties, no camera upload.

- Open `index.html` (or serve the folder: `python3 -m http.server`). Deep link: `?lang=fr`.
- Pages (hash routes): `#/dashboard`, `#/missions`, `#/alerts`, `#/audit`, `#/roadmap`.
- All UI text lives in `assets/js/i18n.js`; fictional sites/plans/templates in `assets/js/data.js`; logic in `assets/js/app.js`.
- Relative asset paths only, so it works from a sub-folder (`/robots/` on GitHub Pages).
- Fonts (Inter, Tajawal, Space Grotesk) are bundled locally under SIL OFL (`assets/fonts/OFL.txt`).

AICore Digital LLC · https://aicoredigital.com · elycheikh@aicoredigital.com · +1 804 485 3384

## 3D version (`3d/`)

`3d/` is a Three.js (r160, vendored in `3d/vendor/`, no CDN) version of the same simulation, built for presenting on a big screen (Zoom / projector): a procedural VSAT ground station, two procedural quadruped robots (R-01 / R-02), human-in-the-loop missions, a rule-based Arabic/French/English command box (no AI, no backend; the camera detector is a separate, opt-in, in-browser model), simulated alerts and printable reports.
Languages: AR (default, RTL) / FR / EN (`?lang=ar|fr|en`). Served at `/robots/3d/`. Needs to be served over http(s) (ES modules), e.g. `python3 -m http.server`.
Presenter guide (Arabic) is kept outside the repo. All timestamps (header clock, audit log, CSV, reports) use one clock: browser local time with a visible timezone label.

## LIVE vs SIMULATION (legend shown in both apps)

Green **LIVE / حي** badge = real data; the pink **SIMULATION** tag = everything else. Nothing invented is ever presented as real.

| Feature | Where | Real? | Source / notes |
|---|---|---|---|
| Weather per site (temperature, wind, gusts, humidity, cloud cover, precipitation) for Nouakchott, Nouadhibou, Atar | 2D dashboard, 3D "LIVE" tab + live bar | **LIVE** | Open-Meteo `current` fields, refreshed every 10 min. Offline/failed/older than 30 min → "LIVE data unavailable" (no numbers). |
| High-wind advisory → "dish wind-load check" drafted mission | both | LIVE input | Rule: wind ≥ threshold (default 40 km/h, editable) or gusts ≥ threshold + 20 km/h. Demo rule of thumb, not a manufacturer limit. The mission is only a draft until a human approves. |
| Dish pointing (azimuth, elevation, LNB skew, range) for Nouakchott → geostationary longitude chosen from a generic list | 3D "LIVE" tab, 3D dish moves to it | **LIVE-computed** | `assets/js/geo.js`, WGS-84 look-angle geometry, no network. "Computed from geometry (real formula), not from a real antenna." City-centre coordinates, no refraction/magnetic declination. |
| "Dish drift check" mission template | 3D Missions tab | LIVE-computed | Operator types a measured azimuth; |deviation| > 0.5° → alert + drafted mission pending approval. |
| Camera person/vehicle/animal detection | 3D "LIVE" tab | **LIVE** (device camera) | TensorFlow.js + COCO-SSD lite, vendored in `3d/vendor/` (≈ 10.7 MB, loaded only after "Start camera"). Video never leaves the device. Person for N consecutive frames → "Person detected at gate (camera)" alert → drafted observe-only patrol pending approval. Accuracy not validated for security use. |
| Cabinet temperature sensor | 3D "LIVE" tab, cabinet label, thermal inspection | **LIVE** only when a fresh row arrives from your Supabase table | Optional (see `esp32/` in the source folder, not in the website repo). Key and URL are stored in the browser's localStorage only. A "Simulate sensor" toggle exists and is always labelled SIMULATED. |
| Robots, fleet, missions, scripted alerts, battery, reports | everything else | SIMULATION | fictional |

Query parameters for testing only: `?wxms=<ms>` weather refresh, `?snms=<ms>` sensor poll, `?camn=<frames>`, `?camgap=<ms>`.

Tests that ship with the maintainers (not in this folder): numeric geometry test against an independent library (pymap3d) for 98 cases; Playwright suites for 2D/3D, weather (real and mocked), camera (fake video device), sensor (mocked REST).

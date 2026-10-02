# AICore Robotics Ops — SIMULATION demo

Static, bilingual (Arabic RTL default / French) demo of a human-supervised robot-fleet console. **All data is fictional.** No robots, customers or deployments exist. Runs entirely in the browser: no build step, no backend, no external requests.

- Open `index.html` (or serve the folder: `python3 -m http.server`). Deep link: `?lang=fr`.
- Pages (hash routes): `#/dashboard`, `#/missions`, `#/alerts`, `#/audit`, `#/roadmap`.
- All UI text lives in `assets/js/i18n.js`; fictional sites/plans/templates in `assets/js/data.js`; logic in `assets/js/app.js`.
- Relative asset paths only, so it works from a sub-folder (`/robots/` on GitHub Pages).
- Fonts (Inter, Tajawal, Space Grotesk) are bundled locally under SIL OFL (`assets/fonts/OFL.txt`).

AICore Digital LLC · https://aicoredigital.com · elycheikh@aicoredigital.com · +1 804 485 3384

## 3D version (`3d/`)

`3d/` is a Three.js (r160, vendored in `3d/vendor/`, no CDN) version of the same simulation, built for presenting on a big screen (Zoom / projector): a procedural VSAT ground station, two procedural quadruped robots (R-01 / R-02), human-in-the-loop missions, a rule-based Arabic/French/English command box (no AI, no backend), simulated alerts and printable reports.
Languages: AR (default, RTL) / FR / EN (`?lang=ar|fr|en`). Served at `/robots/3d/`. Needs to be served over http(s) (ES modules), e.g. `python3 -m http.server`.
Presenter guide (Arabic) is kept outside the repo. All timestamps (header clock, audit log, CSV, reports) use one clock: browser local time with a visible timezone label.

# AICore Robotics Ops — SIMULATION demo

Static, bilingual (Arabic RTL default / French) demo of a human-supervised robot-fleet console. **All data is fictional.** No robots, customers or deployments exist. Runs entirely in the browser: no build step, no backend, no external requests.

- Open `index.html` (or serve the folder: `python3 -m http.server`). Deep link: `?lang=fr`.
- Pages (hash routes): `#/dashboard`, `#/missions`, `#/alerts`, `#/audit`, `#/roadmap`.
- All UI text lives in `assets/js/i18n.js`; fictional sites/plans/templates in `assets/js/data.js`; logic in `assets/js/app.js`.
- Relative asset paths only, so it works from a sub-folder (`/robots/` on GitHub Pages).
- Fonts (Inter, Tajawal, Space Grotesk) are bundled locally under SIL OFL (`assets/fonts/OFL.txt`).

AICore Digital LLC · https://aicoredigital.com · elycheikh@aicoredigital.com · +1 804 485 3384

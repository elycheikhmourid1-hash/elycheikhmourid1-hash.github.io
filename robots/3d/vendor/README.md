# Vendored third-party code (no CDN at runtime)

- `three.module.min.js` — three.js r160 (`three@0.160.0`, `build/three.module.min.js`), MIT licence (`LICENSE-three.txt`). Fetched once at build time with `npm pack three@0.160.0`; unmodified.
- `OrbitControls.js` — `three@0.160.0/examples/jsm/controls/OrbitControls.js`. Only change: the bare import `from 'three'` was rewritten to `from './three.module.min.js'` so no import map / build step is needed.

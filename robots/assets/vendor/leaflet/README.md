# Leaflet 1.9.4 (vendored, no CDN at runtime)

- `leaflet.js` and `leaflet.css` — Leaflet 1.9.4, BSD-2-Clause (`LICENSE`). Fetched from `https://unpkg.com/leaflet@1.9.4/dist/`.
- `images/` — default marker and layers icons the stylesheet references (`marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`, `layers.png`, `layers-2x.png`).
- The only change to `leaflet.js` is removal of the `sourceMappingURL` comment so the browser does not request a missing `.map` file.

The demo draws its own EXAMPLE / robot / alert markers with `divIcon`. Tile images are not stored here: the map asks OpenStreetMap or Esri only for the tiles currently on screen.

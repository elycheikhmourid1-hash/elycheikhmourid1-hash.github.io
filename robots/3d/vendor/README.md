# Vendored third-party code (no CDN at runtime)

- `three.module.min.js` — three.js r160 (`three@0.160.0`, `build/three.module.min.js`), MIT licence (`LICENSE-three.txt`). Fetched once at build time with `npm pack three@0.160.0`; unmodified.
- `OrbitControls.js` — `three@0.160.0/examples/jsm/controls/OrbitControls.js`. Only change: the bare import `from 'three'` was rewritten to `from './three.module.min.js'` so no import map / build step is needed.

## Camera detection (LIVE feature) — all local, no CDN
- `tfjs/tf.min.js` — TensorFlow.js 4.22.0 (`@tensorflow/tfjs@4.22.0`, `dist/tf.min.js`), Apache-2.0, unmodified.
- `coco-ssd/coco-ssd.min.js` — `@tensorflow-models/coco-ssd@2.2.3` (`dist/coco-ssd.min.js`), Apache-2.0, unmodified.
- `coco-ssd/model/` — the **SSDLite-MobileNet-v2** COCO detector shipped with coco-ssd (`lite_mobilenet_v2`, 80 classes), same graph, same weights **re-stored as float16** (tfjs weight quantization, done at build time with a small script) so the folder is 9.0 MB instead of 18.6 MB. On two test photos the detections matched the original (same classes, scores within 0.01, boxes within a few px); the float16 copy is what is served, the original is not shipped.
  Sizes: `tf.min.js` 1.47 MB + `coco-ssd.min.js` 9 KB + model 9.0 MB (`model.json` 258 KB + 3 weight shards) = **≈ 10.7 MB**, loaded only after the user presses "Start camera".
- `LICENSE-Apache-2.0.txt` — licence text for the three items above. The COCO-SSD weights come from Google's public tfjs-models release (COCO dataset classes).

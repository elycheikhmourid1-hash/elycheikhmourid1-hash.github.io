/* AICore Robotics Ops 3D — LIVE features (browser only):
   1. LIVE weather (Open-Meteo, assets/js/weather.js)           2. LIVE-computed GEO dish pointing (assets/js/geo.js, no network)
   3. Camera person/vehicle/animal detection (TensorFlow.js + COCO-SSD, vendored in ./vendor, video never leaves the device)
   4. Optional cabinet-temperature feed from the user's own Supabase project (REST polling, settings in localStorage only) + SIMULATED toggle.
   Everything here is either real (badge "LIVE / حي") or clearly labelled SIMULATED. */
export function createLive(h) {
  const { t, esc, ltr, $, $$ } = h;
  const WX = window.WX, GEO = window.GEO;
  const qs = new URLSearchParams(location.search);
  const LS = { sat: 'aicore-robots-sat', url: 'aicore-sn-url', key: 'aicore-sn-key', dev: 'aicore-sn-dev', cab: 'aicore-sn-cab', thr: 'aicore-sn-thr' };
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  const LIVE_B = '<span class="live-badge"><i></i>LIVE / حي</span>';
  const LIVE_S = '<span class="live-badge sm"><i></i>LIVE / حي</span>';
  const SIM_S = '<span class="sim-tag sm">SIMULATED</span>';
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);

  /* ================= 1. weather ================= */
  const armed = { wind: false, rain: false };
  function renderWeather() {
    const host = $('#wx-cards'); if (!host) return;
    host.innerHTML = WX.SITES.map(s => WX.renderCard(s.id, t, esc, { clock: h.fClock })).join('');
    const thr = $('#wx-thr'); if (thr && document.activeElement !== thr) thr.value = WX.windThreshold();
    const rth = $('#wx-rain'); if (rth && document.activeElement !== rth) rth.value = WX.rainThreshold();
    renderAdvisory();
    renderBar();
  }
  function renderAdvisory() {
    const el = $('#wx-adv'); if (!el) return;
    const g = WX.get('nkc');
    if (!g.ok) { el.textContent = ''; return; }
    const parts = [];
    if (WX.rainExceeded(g.v, WX.rainThreshold())) parts.push(t('lv_rain_hot'));
    else parts.push(t('lv_rain_ok', { v: WX.f1(g.v.rain), thr: String(WX.rainThreshold()) }));
    if (WX.windExceeded(g.v, WX.windThreshold())) parts.push(t('lv_wind_hot'));
    el.textContent = parts.join(' ');
  }
  function checkWind() {
    const g = WX.get('nkc'); if (!g.ok) return;
    const thr = WX.windThreshold(), hot = WX.windExceeded(g.v, thr);
    if (hot && !armed.wind) { armed.wind = true; h.raiseLiveAlert('wind', { w: Math.round(g.v.wind), g: g.v.gust == null ? '—' : Math.round(g.v.gust), thr, site: 'nkc', obs: g.obs }); }
    else if (!hot) armed.wind = false;
  }
  /* Rain-fade advisory from live Nouakchott precipitation. The drafted mission stays pending — raiseLiveAlert does not start the robot. */
  function checkRain() {
    const g = WX.get('nkc'); if (!g.ok) return;
    const thr = WX.rainThreshold(), hot = WX.rainExceeded(g.v, thr);
    if (hot && !armed.rain) { armed.rain = true; h.raiseLiveAlert('rain', { rain: WX.f1(g.v.rain), thr, w: Math.round(g.v.wind || 0), site: 'nkc', obs: g.obs, flags: { rain: true } }); }
    else if (!hot) armed.rain = false;
  }

  /* ================= 2. dish pointing ================= */
  let satLon = (() => { const v = parseFloat(ls.get(LS.sat)); return GEO.SAT_LONS.includes(v) ? v : GEO.SAT_EXAMPLE_LON; })();
  const look = () => GEO.lookAngles(GEO.STATION.lat, GEO.STATION.lon, satLon);
  const satLabel = l => GEO.lonLabel(l) + (GEO.SAT_EXAMPLES[l] === 'badr8' ? ' — ' + t('name_badr') : '');
  function applyPointing() {
    const p = look(); const SC = h.SC();
    if (SC && SC.setDishPointing) SC.setDishPointing(p.az, p.visible ? p.el : 0);
    const html = p.visible ? '<span class="live-badge sm"><i></i>LIVE</span> ' + esc(satLabel(satLon)) + ' · Az ' + ltr(f1(p.az) + '°') + ' El ' + ltr(f1(p.el) + '°') : esc(t('lv_pt_below'));
    const dp = $('#lbl-dish .dp'); if (dp) dp.innerHTML = html;
    const sr = $('#sat-readout .sr-pt'); if (sr) sr.innerHTML = html;
    return p;
  }
  function renderPointing() {
    const sel = $('#sat-sel'); if (!sel) return;
    if (!sel.options.length || sel.dataset.lang !== h.lang()) {
      sel.innerHTML = GEO.SAT_LONS.slice().sort((a, b) => a - b).map(l => '<option value="' + l + '">' + esc(satLabel(l)) + '</option>').join(''); sel.dataset.lang = h.lang();
    }
    sel.value = String(satLon);
    const p = applyPointing();
    $('#pt-out').innerHTML = p.visible
      ? '<div><dt>' + esc(t('lv_pt_az')) + '</dt><dd>' + ltr(f1(p.az) + '°') + ' <span class="muted">' + ltr(GEO.compass(p.az)) + '</span></dd></div><div><dt>' + esc(t('lv_pt_el')) + '</dt><dd>' + ltr(f1(p.el) + '°') + '</dd></div>' +
        '<div><dt>' + esc(t('lv_pt_skew')) + '</dt><dd>' + ltr((p.skew > 0 ? '+' : '') + f1(p.skew) + '°') + '</dd></div><div><dt>' + esc(t('lv_pt_range')) + '</dt><dd>' + ltr(Math.round(p.range).toLocaleString('en-US') + ' km') + '</dd></div>'
      : '<div class="wide bad-t"><dd>' + esc(t('lv_pt_below')) + '</dd></div>';
    renderBar();
  }
  function setSat(l) { if (!GEO.SAT_LONS.includes(l)) return; satLon = l; ls.set(LS.sat, String(l)); renderPointing(); renderDrift(); h.afterPointing && h.afterPointing(); }
  /* drift check: operator-entered azimuth vs computed */
  let driftVal = '';
  function runDrift(raw) {
    const out = $('#drift-out'); const m = parseFloat(String(raw).replace(',', '.'));
    if (!isFinite(m) || m < 0 || m > 360) { out.className = 'drift-out bad-t'; out.textContent = t('lv_dr_invalid'); return null; }
    const p = look(), r = GEO.driftCheck(m, p.az), d = (r.deviation > 0 ? '+' : '') + f1(r.deviation);
    if (r.exceeded) {
      out.className = 'drift-out bad-t'; out.textContent = t('lv_dr_bad', { d });
      h.raiseLiveAlert('drift', { measured: m, computed: p.az, dev: r.deviation, sat: satLabel(satLon), satLon, flags: { drift: true } });
    } else { out.className = 'drift-out ok-t'; out.textContent = t('lv_dr_ok', { d }); }
    return r;
  }
  function renderDrift() {
    const ref = $('#drift-ref'); if (!ref) return; const p = look();
    ref.textContent = p.visible ? t('lv_dr_ref', { az: f1(p.az), sat: satLabel(satLon) }) : t('lv_pt_below');
  }

  /* ================= 3. camera ================= */
  const CAM_N = Math.max(1, parseInt(qs.get('camn'), 10) || 5);                         // consecutive frames with a person before the alert
  const CAM_GAP = Math.max(100, parseInt(qs.get('camgap'), 10) || 250);                 // ms between inferences
  const CAM_COOLDOWN = 60000;
  const VEH = new Set(['bicycle', 'car', 'motorcycle', 'bus', 'truck']), ANI = new Set(['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']);
  const cam = { state: 'idle', err: '', stream: null, model: null, running: false, frames: 0, persons: 0, veh: 0, ani: 0, streak: 0, lastAlert: 0, alerts: 0, inferences: 0, backend: '', lastClasses: [], loadMs: 0 };
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('failed to load ' + src)); document.head.appendChild(s); }); }
  const vend = p => new URL('vendor/' + p, document.baseURI).href;
  function setCamState(st, err) { cam.state = st; cam.err = err || ''; renderCam(); }
  function renderCam() {
    const stEl = $('#cam-status'); if (!stEl) return;
    const msg = { idle: t('lv_cam_idle'), loading: t('lv_cam_loading'), running: t('lv_cam_run'), denied: t('lv_cam_denied'), insecure: t('lv_cam_insecure'), error: t('lv_cam_err', { e: cam.err }) }[cam.state];
    stEl.textContent = msg; stEl.dataset.state = cam.state;
    const on = cam.state === 'running' || cam.state === 'loading';
    $('#cam-start').disabled = on; $('#cam-stop').disabled = !on; $('#cam-badge').hidden = cam.state !== 'running'; $('#cam-box').hidden = !on;
    $('#cam-counts').textContent = cam.state === 'running' ? t('lv_cam_counts', { p: cam.persons, v: cam.veh, a: cam.ani }) : '';
    $('#cam-frames').textContent = t('lv_cam_frames', { n: CAM_N });
    renderBar();
  }
  async function startCam() {
    if (cam.state === 'running' || cam.state === 'loading') return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || (!window.isSecureContext)) { setCamState('insecure'); return; }
    setCamState('loading');
    try {
      cam.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) { cam.stream = null; setCamState(/Permission|NotAllowed|NotFound|Devices not found/i.test(String(e && (e.name + e.message))) ? 'denied' : 'error', String(e && e.message || e)); return; }
    const v = $('#cam-video'); v.srcObject = cam.stream; v.muted = true;
    try { await v.play(); } catch (e) { /* autoplay of a muted stream normally works */ }
    try {
      if (!cam.model) {
        const t0 = performance.now();
        if (!window.tf) await loadScript(vend('tfjs/tf.min.js'));
        if (!window.cocoSsd) await loadScript(vend('coco-ssd/coco-ssd.min.js'));
        try { await window.tf.setBackend('webgl'); } catch (e) { /* fall through to cpu */ }
        if (window.tf.getBackend() !== 'webgl') await window.tf.setBackend('cpu');
        await window.tf.ready(); cam.backend = window.tf.getBackend();
        cam.model = await window.cocoSsd.load({ modelUrl: vend('coco-ssd/model/model.json') });
        cam.loadMs = Math.round(performance.now() - t0);
      }
    } catch (e) { stopCam(true); setCamState('error', String(e && e.message || e)); return; }
    if (!cam.stream) return;                                  // stopped while the model was loading
    cam.running = true; cam.streak = 0; setCamState('running'); camLoop();
  }
  function stopCam(silent) {
    cam.running = false;
    if (cam.stream) { cam.stream.getTracks().forEach(tr => tr.stop()); cam.stream = null; }
    const v = $('#cam-video'); if (v) { v.pause(); v.srcObject = null; }
    const c = $('#cam-ov'); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    cam.persons = cam.veh = cam.ani = 0; cam.streak = 0;
    if (!silent) setCamState('idle');
  }
  async function camLoop() {
    if (!cam.running) return;
    const v = $('#cam-video'), c = $('#cam-ov'), t0 = performance.now();
    try {
      if (v.readyState >= 2 && v.videoWidth) {
        const preds = await cam.model.detect(v, 20, 0.5);
        if (!cam.running) return;
        cam.inferences++; cam.lastClasses = preds.map(p => p.class);
        if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
        const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.lineWidth = Math.max(2, c.width / 220); g.font = Math.max(12, c.width / 38) + 'px sans-serif';
        let p = 0, ve = 0, an = 0, strongPerson = false;
        preds.forEach(d => {
          const kind = d.class === 'person' ? 'p' : VEH.has(d.class) ? 'v' : ANI.has(d.class) ? 'a' : null; if (!kind) return;
          if (kind === 'p') { p++; if (d.score >= 0.6) strongPerson = true; } else if (kind === 'v') ve++; else an++;
          const col = kind === 'p' ? '#ff4d8d' : kind === 'v' ? '#22d3ee' : '#fbbf24', [x, y, w, hh] = d.bbox;
          g.strokeStyle = col; g.strokeRect(x, y, w, hh); g.fillStyle = col; const label = d.class + ' ' + Math.round(d.score * 100) + '%'; const tw = g.measureText(label).width + 8;
          g.fillRect(x, Math.max(0, y - parseInt(g.font, 10) - 4), tw, parseInt(g.font, 10) + 4); g.fillStyle = '#000'; g.fillText(label, x + 4, Math.max(parseInt(g.font, 10), y - 4));
        });
        cam.persons = p; cam.veh = ve; cam.ani = an;
        cam.streak = strongPerson ? cam.streak + 1 : 0;
        if (cam.streak >= CAM_N && Date.now() - cam.lastAlert > CAM_COOLDOWN) { cam.lastAlert = Date.now(); cam.alerts++; cam.streak = 0; h.raiseLiveAlert('person', { n: CAM_N }); }
        $('#cam-counts').textContent = t('lv_cam_counts', { p, v: ve, a: an }); renderBar();
      }
    } catch (e) { stopCam(true); setCamState('error', String(e && e.message || e)); return; }
    setTimeout(camLoop, Math.max(30, CAM_GAP - (performance.now() - t0)));
  }

  /* ================= 4. sensor feed (Supabase REST) ================= */
  const SN_POLL = Math.max(300, parseInt(qs.get('snms'), 10) || 5000), SN_FRESH_MS = 90000;
  const sn = { cfg: null, state: 'off', err: '', reading: null, timer: 0, sim: false, simVal: 38, armed: false, polls: 0, busy: false };
  function snConfig() {
    const url = (ls.get(LS.url) || '').trim().replace(/\/+$/, ''), key = (ls.get(LS.key) || '').trim();
    return url && key ? { url, key, dev: (ls.get(LS.dev) || '').trim() } : null;
  }
  const snCab = () => { const c = ls.get(LS.cab); return ['A', 'B', 'C'].includes(c) ? c : 'B'; };
  const snThr = () => { const v = parseFloat(ls.get(LS.thr)); return isFinite(v) && v > 0 ? v : 45; };
  function validUrl(u) { try { const x = new URL(u); return x.protocol === 'https:' || (x.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(x.hostname)); } catch (e) { return false; } }
  /* current reading used by the 3D scene / thermal inspection: { temp, hum, kind:'live'|'sim', dev, ts } or null */
  function current() {
    if (sn.sim) return { temp: sn.simVal, hum: null, kind: 'sim', dev: 'SIMULATED', ts: Date.now() };
    const r = sn.reading; if (!r || !sn.cfg) return null;
    return Date.now() - r.ts <= SN_FRESH_MS ? { temp: r.temp, hum: r.hum, kind: 'live', dev: r.dev, ts: r.ts } : null;
  }
  async function pollSensor() {
    if (!sn.cfg || sn.sim || sn.busy) return;
    sn.busy = true; const c = sn.cfg;
    const url = c.url + '/rest/v1/sensor_readings?select=id,device_id,temp_c,humidity,created_at&order=created_at.desc&limit=1' + (c.dev ? '&device_id=eq.' + encodeURIComponent(c.dev) : '');
    const headers = { apikey: c.key, Accept: 'application/json' };
    if (/^eyJ/.test(c.key)) headers.Authorization = 'Bearer ' + c.key;                  // legacy JWT anon keys; new sb_publishable_ keys go in `apikey` only
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(url, { headers, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal }); clearTimeout(to);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json(); sn.polls++;
      if (!Array.isArray(rows) || !rows.length) { sn.reading = null; sn.state = 'empty'; }
      else {
        const row = rows[0], temp = Number(row.temp_c), ts = Date.parse(row.created_at);
        if (!isFinite(temp) || !isFinite(ts)) throw new Error('bad row');
        sn.reading = { temp, hum: row.humidity == null ? null : Number(row.humidity), ts, dev: String(row.device_id || ''), id: row.id };
        sn.state = Date.now() - ts <= SN_FRESH_MS ? 'live' : 'stale';
      }
      sn.err = '';
    } catch (e) { sn.state = 'error'; sn.err = e && e.name === 'AbortError' ? 'timeout' : String(e && e.message || e); }
    sn.busy = false; onSensorUpdate();
  }
  function startSensor() {
    clearInterval(sn.timer); sn.timer = 0; sn.cfg = snConfig();
    if (!sn.cfg) { sn.state = sn.sim ? 'sim' : 'off'; sn.reading = null; onSensorUpdate(); return; }
    if (!sn.sim) { sn.state = 'connecting'; pollSensor(); }
    sn.timer = setInterval(pollSensor, SN_POLL); onSensorUpdate();
  }
  function onSensorUpdate() {
    const cur = current();
    if (cur) {
      const thr = snThr();
      if (cur.temp >= thr && !sn.armed) { sn.armed = true; h.raiseLiveAlert('cabtemp', { cab: snCab(), temp: cur.temp, thr, real: cur.kind === 'live', dev: cur.dev, src: cur.kind === 'live' ? 'al_src_live' : 'al_src_sim', flags: { hot: cur.temp >= thr } }); }
      else if (cur.temp < thr - 2) sn.armed = false;
    }
    renderSensor(); refreshCabLabel();
  }
  function renderSensor() {
    const st = $('#sn-status'); if (!st) return;
    const cur = current(), cfg = !!sn.cfg;
    let msg;
    if (sn.sim) msg = t('lv_sn_sim') + ' — ' + t('lv_sn_simtag');
    else if (!cfg) msg = t('lv_sn_off');
    else if (sn.state === 'connecting') msg = t('lv_sn_connecting');
    else if (sn.state === 'error') msg = t('lv_sn_error', { e: sn.err });
    else if (sn.state === 'empty') msg = t('lv_sn_empty');
    else if (sn.state === 'stale') msg = t('lv_sn_stale', { s: SN_FRESH_MS / 1000 });
    else msg = t('lv_sn_live') + ' · ' + t('lv_sn_poll');
    st.textContent = msg; st.dataset.state = sn.sim ? 'sim' : cfg ? sn.state : 'off';
    const rd = $('#sn-reading');
    rd.innerHTML = cur ? (cur.kind === 'live' ? LIVE_B : '<span class="sim-tag">SIMULATED / محاكاة</span>') + ' ' + esc(t('lv_sn_cabtag', { c: snCab() })) + ': ' + ltr(f1(cur.temp) + ' °C') + (cur.hum != null ? ' · ' + ltr(f1(cur.hum) + ' %') : '') +
      (cur.kind === 'live' ? ' · ' + esc(t('lv_sn_reading', { v: f1(cur.temp), h: cur.hum == null ? '—' : f1(cur.hum), age: Math.max(0, Math.round((Date.now() - cur.ts) / 1000)), d: cur.dev || '—' })) : '') : '';
    $('#sn-badge').innerHTML = cur ? (cur.kind === 'live' ? LIVE_B : '<span class="sim-tag">SIMULATED</span>') : '';
    const thr = $('#sn-thr'); if (thr && document.activeElement !== thr) thr.value = snThr();
    $('#sn-cab').value = snCab();
    renderBar();
  }
  function ctHTML(temp, kind) { return esc(f1(temp) + ' °C') + (kind === 'live' ? ' ' + LIVE_S : kind === 'sim' ? ' ' + SIM_S : ''); }
  /* persistent in-scene label for the monitored cabinet */
  function refreshCabLabel() {
    ['A', 'B', 'C'].forEach(c => { const e = $('#lbl-cab-' + c + ' .ct'); if (e && e.dataset.live) { e.hidden = true; delete e.dataset.live; } });
    const cur = current(); if (!cur) return;
    const e = $('#lbl-cab-' + snCab() + ' .ct'); if (!e || h.fxActive()) return;
    e.hidden = false; e.dataset.live = cur.kind; e.className = 'ct ' + (cur.temp >= snThr() ? 'bad' : 'good'); e.innerHTML = ctHTML(cur.temp, cur.kind);
  }

  /* ================= live bar (visible in presentation mode too) ================= */
  function renderBar() {
    const host = $('#lb-chips'); if (!host) return;
    const g = WX.get('nkc'), p = look(), cur = current();
    const chips = [];
    chips.push(g.ok ? '<span class="lb-chip" data-k="wx">' + LIVE_S + '<b>' + esc(t('lv_wx_site_nkc')) + '</b> ' + ltr(WX.f1(g.v.temp) + ' °C') + ' · ' + esc(t('lv_wx_wind')) + ' ' + ltr(WX.f0(g.v.wind) + ' km/h') + '</span>'
      : '<span class="lb-chip" data-k="wx"><span class="na-badge sm">' + esc(g.status === 'loading' ? t('lv_wx_loading') : t('lv_wx_unavail')) + '</span></span>');
    chips.push('<span class="lb-chip" data-k="dish">' + LIVE_S + '<b>' + esc(t('lv_bar_dish')) + '</b> ' + ltr(satLabel(satLon)) + ' · ' + (p.visible ? 'Az ' + ltr(f1(p.az) + '°') + ' El ' + ltr(f1(p.el) + '°') : esc(t('lv_pt_below'))) + '</span>');
    if (cam.state === 'running') chips.push('<span class="lb-chip" data-k="cam">' + LIVE_S + '<b>' + esc(t('lv_bar_cam')) + '</b> ' + esc(t('lv_cam_counts', { p: cam.persons, v: cam.veh, a: cam.ani })) + '</span>');
    if (cur) chips.push('<span class="lb-chip" data-k="sn">' + (cur.kind === 'live' ? LIVE_S : SIM_S) + '<b>' + esc(t('lv_bar_sn')) + ' ' + esc(snCab()) + '</b> ' + ltr(f1(cur.temp) + ' °C') + '</span>');
    host.innerHTML = chips.join('');
  }

  /* ================= wiring ================= */
  function bind() {
    $('#sat-sel').addEventListener('change', e => setSat(parseFloat(e.target.value)));
    $('#wx-refresh').addEventListener('click', () => { h.toast(t('lv_wx_refreshing')); WX.fetchNow().then(() => h.toast(WX.get('nkc').ok ? t('lv_wx_refreshed') : t('lv_wx_unavail'))); });
    $('#wx-thr').addEventListener('change', e => { WX.setWindThreshold(e.target.value); h.toast(t('lv_saved')); e.target.value = WX.windThreshold(); checkWind(); renderWeather(); });
    const rainIn = $('#wx-rain'); if (rainIn) rainIn.addEventListener('change', e => { WX.setRainThreshold(e.target.value); h.toast(t('lv_saved')); e.target.value = WX.rainThreshold(); checkRain(); renderWeather(); });
    $('#cam-start').addEventListener('click', startCam);
    $('#cam-stop').addEventListener('click', () => stopCam());
    $('#sn-cab').addEventListener('change', e => { ls.set(LS.cab, e.target.value); h.toast(t('lv_saved')); sn.armed = false; onSensorUpdate(); });
    $('#sn-thr').addEventListener('change', e => { const v = parseFloat(e.target.value); h.toast(t('lv_saved')); if (v > 0) ls.set(LS.thr, String(v)); e.target.value = snThr(); sn.armed = false; onSensorUpdate(); });
    $('#sn-sim').addEventListener('change', e => { sn.sim = e.target.checked; $('#sn-sim-wrap').hidden = !sn.sim; sn.armed = false; if (!sn.sim && sn.cfg) pollSensor(); onSensorUpdate(); });
    $('#sn-sim-val').addEventListener('input', e => { sn.simVal = parseFloat(e.target.value); $('#sn-sim-out').textContent = f1(sn.simVal); if (sn.sim) onSensorUpdate(); });
    const dlg = $('#sn-dlg'), err = $('#sn-dlg-err');
    $('#sn-settings').addEventListener('click', () => {
      $('#sn-url').value = ls.get(LS.url) || ''; $('#sn-key').value = ''; $('#sn-key').placeholder = ls.get(LS.key) ? '•••••••• (saved)' : 'sb_publishable_… / eyJ…'; $('#sn-dev').value = ls.get(LS.dev) || '';
      err.hidden = true; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    });
    $('#sn-close').addEventListener('click', () => dlg.close());
    $('#sn-form').addEventListener('submit', e => {
      e.preventDefault();
      const url = $('#sn-url').value.trim().replace(/\/+$/, ''), key = $('#sn-key').value.trim() || ls.get(LS.key) || '';
      if (!validUrl(url) || key.length < 12) { err.textContent = t('lv_sn_invalid'); err.hidden = false; return; }
      ls.set(LS.url, url); ls.set(LS.key, key); ls.set(LS.dev, $('#sn-dev').value.trim());
      dlg.close(); sn.armed = false; startSensor();
    });
    $('#sn-clear').addEventListener('click', () => { [LS.url, LS.key, LS.dev].forEach(ls.del); sn.reading = null; sn.armed = false; dlg.close(); startSensor(); });
    WX.onChange(() => { renderWeather(); checkWind(); checkRain(); });
    setInterval(() => { renderWeather(); renderSensor(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && sn.cfg && !sn.sim) pollSensor(); });
  }

  function render() { renderWeather(); renderPointing(); renderDrift(); renderCam(); renderSensor(); }
  function init() {
    bind();
    const cabSel = $('#sn-cab'); cabSel.value = snCab();
    const q = parseInt(qs.get('wxms'), 10); WX.start(q ? { refreshMs: q } : {});
    startSensor(); render();
    window.addEventListener('pagehide', () => stopCam(true));
  }
  return {
    init, render, setSat, runDrift, startCam, stopCam, refreshCabLabel, ctHTML, applyPointing, checkWind,
    pointing() { const p = look(); return { satLon, az: p.az, el: p.el, skew: p.skew, range: p.range, visible: p.visible }; },
    driftText() { return $('#drift-out') && $('#drift-out').textContent; },
    cabReading(cab) { const cur = current(); return cur && cab === snCab() ? { temp: cur.temp, kind: cur.kind, dev: cur.dev } : null; },
    sensorCab: snCab, sensorThr: snThr,
    checkRain, resetArm() { armed.wind = false; armed.rain = false; sn.armed = false; },
    sensorState() { return { state: sn.state, sim: sn.sim, polls: sn.polls, err: sn.err, cfg: !!sn.cfg, current: current() }; },
    cameraState() { return { state: cam.state, err: cam.err, inferences: cam.inferences, persons: cam.persons, veh: cam.veh, ani: cam.ani, alerts: cam.alerts, backend: cam.backend, loadMs: cam.loadMs, classes: cam.lastClasses.slice(), streak: cam.streak }; },
    setDriftValue(v) { driftVal = v; }, getDriftValue() { return driftVal; }
  };
}

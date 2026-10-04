/* AICore Robotics Ops — LIVE weather (Open-Meteo). The ONLY network call of this module; no API key, no cookies, no tracking.
   https://open-meteo.com/ — "current" conditions for three Mauritanian cities, refreshed every 10 minutes.
   If the request fails or the browser is offline NOTHING is invented: get() returns { ok:false } and the UI shows "LIVE data unavailable".
   Works in the browser (window.WX) and in Node (module.exports) for tests. */
(function (root, factory) {
  var g = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = g; else root.WX = g;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
  var SITES = [
    { id: 'nkc', lat: 18.0735, lon: -15.9582 },     // Nouakchott
    { id: 'nou', lat: 20.9310, lon: -17.0347 },     // Nouadhibou
    { id: 'atr', lat: 20.5170, lon: -13.0490 }      // Atar
  ];
  var CURRENT = 'temperature_2m,relative_humidity_2m,cloud_cover,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m';
  var REFRESH_MS = 10 * 60 * 1000, STALE_MS = 30 * 60 * 1000, TIMEOUT_MS = 12000;
  var LS_THR = 'aicore-robots-wind-thr';
  var LS_RAIN = 'aicore-robots-rain-thr';
  var DEFAULT_WIND_KMH = 40, GUST_MARGIN_KMH = 20, DEFAULT_RAIN_MM = 0.5;

  var st = { status: 'idle', fetchedAt: 0, data: {}, error: '', refreshMs: REFRESH_MS, timer: 0, listeners: [], inflight: null, count: 0 };
  function emit() { st.listeners.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }
  function onChange(f) { st.listeners.push(f); }

  function buildUrl() {
    return ENDPOINT + '?latitude=' + SITES.map(function (s) { return s.lat; }).join(',') + '&longitude=' + SITES.map(function (s) { return s.lon; }).join(',') +
      '&current=' + CURRENT + '&wind_speed_unit=kmh&temperature_unit=celsius&precipitation_unit=mm&timeformat=unixtime';
  }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function parse(json) {
    var arr = Array.isArray(json) ? json : [json], out = {};
    SITES.forEach(function (s, i) {
      var c = arr[i] && arr[i].current;
      if (!c) return;
      var v = { temp: num(c.temperature_2m), hum: num(c.relative_humidity_2m), cloud: num(c.cloud_cover), rain: num(c.precipitation), wind: num(c.wind_speed_10m), gust: num(c.wind_gusts_10m), dir: num(c.wind_direction_10m), obs: num(c.time) };
      if (v.temp == null && v.wind == null) return;            // nothing usable → treat as missing, never fabricate
      out[s.id] = v;
    });
    return out;
  }
  function fetchNow() {
    if (st.inflight) return st.inflight;
    st.status = st.fetchedAt ? st.status : 'loading'; emit();
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null, to = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : 0;
    st.inflight = fetch(buildUrl(), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var d = parse(j); if (!Object.keys(d).length) throw new Error('empty response');
        st.data = d; st.fetchedAt = Date.now(); st.status = 'ok'; st.error = ''; st.count++;
      })
      .catch(function (e) { st.error = String(e && e.message || e); st.status = st.fetchedAt ? 'stale' : 'error'; })
      .then(function () { clearTimeout(to); st.inflight = null; emit(); });
    return st.inflight;
  }
  function start(opts) {
    opts = opts || {};
    if (opts.refreshMs) st.refreshMs = opts.refreshMs;
    if (st.timer) clearInterval(st.timer);
    fetchNow();
    st.timer = setInterval(fetchNow, st.refreshMs);
    if (root.addEventListener) {
      root.addEventListener('online', fetchNow);
      if (root.document) root.document.addEventListener('visibilitychange', function () { if (!root.document.hidden && Date.now() - st.fetchedAt > st.refreshMs) fetchNow(); });
    }
  }
  /* get(): live values or { ok:false }. Values older than 30 min are never shown. */
  function get(id) {
    var d = st.data[id], age = st.fetchedAt ? Date.now() - st.fetchedAt : Infinity;
    if (!d || age > STALE_MS) return { ok: false, status: st.status === 'loading' ? 'loading' : 'unavailable', error: st.error };
    return { ok: true, v: d, fetchedAt: st.fetchedAt, ageMin: Math.floor(age / 60000), stale: st.status === 'stale', obs: d.obs ? d.obs * 1000 : st.fetchedAt };
  }
  function windThreshold() {
    var v = NaN; try { v = parseFloat(localStorage.getItem(LS_THR)); } catch (e) { /* ignore */ }
    return isFinite(v) && v > 0 ? v : DEFAULT_WIND_KMH;
  }
  function setWindThreshold(v) { v = parseFloat(v); if (!(v > 0)) return windThreshold(); try { localStorage.setItem(LS_THR, String(v)); } catch (e) { /* ignore */ } emit(); return v; }
  /* Advisory rule (demo rule of thumb, NOT a manufacturer limit): sustained wind >= thr OR gusts >= thr + 20 km/h. */
  function windExceeded(v, thr) {
    thr = thr == null ? windThreshold() : thr;
    if (!v) return false;
    return (v.wind != null && v.wind >= thr) || (v.gust != null && v.gust >= thr + GUST_MARGIN_KMH);
  }
  function rainThreshold() {
    var v = NaN; try { v = parseFloat(localStorage.getItem(LS_RAIN)); } catch (e) { /* ignore */ }
    return isFinite(v) && v >= 0 ? v : DEFAULT_RAIN_MM;
  }
  function setRainThreshold(v) { v = parseFloat(v); if (!(v >= 0)) return rainThreshold(); try { localStorage.setItem(LS_RAIN, String(v)); } catch (e) { /* ignore */ } emit(); return v; }
  /* Advisory rule (demo rule of thumb, NOT a link budget): current precipitation >= thr (mm). C-band resists rain; Ku is more sensitive — the UI says so. */
  function rainExceeded(v, thr) {
    thr = thr == null ? rainThreshold() : thr;
    return !!(v && v.rain != null && v.rain >= thr);
  }
  function compass(deg) { if (deg == null) return ''; return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }
  function f0(x) { return x == null ? '—' : String(Math.round(x)); }
  function f1(x) { return x == null ? '—' : (Math.round(x * 10) / 10).toFixed(1); }


  /* Shared card renderer (2D dashboard + 3D live tab). t = translate fn, esc = html escaper, fmt = { clock: ts -> 'HH:MM:SS TZ' }. */
  function liveBadge(t) { return '<span class="live-badge" title="' + t('lv_live_title') + '"><i></i>LIVE / حي</span>'; }
  function renderCard(id, t, esc, fmt) {
    var g = get(id), name = t('lv_wx_site_' + id), thr = windThreshold();
    if (!g.ok) {
      return '<article class="wx-card wx-off" data-wx="' + id + '" data-live="0"><header><b>' + esc(name) + '</b><span class="na-badge">' + esc(g.status === 'loading' ? t('lv_wx_loading') : t('lv_wx_unavail')) + '</span></header>' +
        '<p class="tiny muted">' + esc(g.status === 'loading' ? t('lv_wx_src') : t('lv_wx_unavail_d')) + '</p></article>';
    }
    var v = g.v, hi = windExceeded(v, thr), rainHi = rainExceeded(v, rainThreshold());
    function row(k, val, cls) { return '<div' + (cls ? ' class="' + cls + '"' : '') + '><dt>' + esc(t(k)) + '</dt><dd><bdi class="ltr">' + val + '</bdi></dd></div>'; }
    var windTxt = f0(v.wind) + ' km/h' + (v.dir != null ? ' · ' + compass(v.dir) + ' ' + f0(v.dir) + '°' : '');
    return '<article class="wx-card' + (hi || rainHi ? ' wx-hi' : '') + '" data-wx="' + id + '" data-live="1"><header><b>' + esc(name) + '</b>' + liveBadge(t) + '</header><dl class="wx-grid">' +
      row('lv_wx_temp', f1(v.temp) + ' °C') + row('lv_wx_wind', windTxt, hi ? 'hi' : '') + row('lv_wx_gust', f0(v.gust) + ' km/h', hi && v.gust != null && v.gust >= thr + GUST_MARGIN_KMH ? 'hi' : '') +
      row('lv_wx_hum', f0(v.hum) + ' %') + row('lv_wx_cloud', f0(v.cloud) + ' %') + row('lv_wx_rain', f1(v.rain) + ' mm', rainHi ? 'hi' : '') + '</dl>' +
      '<p class="wx-foot tiny muted">' + esc(t('lv_wx_obs')) + ' <bdi class="ltr">' + esc(fmt.clock(g.obs)) + '</bdi> · ' + esc(g.stale ? t('lv_wx_stale', { m: g.ageMin }) : t('lv_wx_ago', { m: g.ageMin })) + '</p></article>';
  }

  return { renderCard: renderCard, liveBadge: liveBadge, SITES: SITES, ENDPOINT: ENDPOINT, REFRESH_MS: REFRESH_MS, STALE_MS: STALE_MS, DEFAULT_WIND_KMH: DEFAULT_WIND_KMH, GUST_MARGIN_KMH: GUST_MARGIN_KMH, DEFAULT_RAIN_MM: DEFAULT_RAIN_MM,
    start: start, fetchNow: fetchNow, get: get, onChange: onChange, buildUrl: buildUrl, parse: parse, windThreshold: windThreshold, setWindThreshold: setWindThreshold,
    windExceeded: windExceeded, rainThreshold: rainThreshold, setRainThreshold: setRainThreshold, rainExceeded: rainExceeded, compass: compass, f0: f0, f1: f1, state: st };
});

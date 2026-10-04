/* AICore Robotics Ops — demo. Simulation (fictional sites/robots) + LIVE weather. Runs in the browser; the ONLY network call is Open-Meteo (assets/js/weather.js). No storage of operator data. */
(function () {
  'use strict';
  var D = window.DATA, I = window.I18N, WX = window.WX;
  /* site -> LIVE weather city (the demo sites are fictional; the weather is real for the nearest city) */
  var WX_OF = { gs: 'nkc', wh: 'nkc', tw: 'atr', en: 'nou' }, WX_DISH_SITES = ['gs', 'tw'];
  var NS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lang = 'ar', S = null, samples = {}, rafId = 0, lastFrame = 0;

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(k, v) {
    var s = (I[lang] && I[lang][k] != null) ? I[lang][k] : (I.ar[k] != null ? I.ar[k] : k);
    return v ? s.replace(/\{(\w+)\}/g, function (m, n) { return v[n] != null ? v[n] : m; }) : s;
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fTime(ts) { var d = new Date(ts); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
  /* ONE clock everywhere (header, cards, audit log, CSV, report): browser local time + a visible timezone label. */
  var TZF = (window.Intl && Intl.DateTimeFormat) ? new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }) : null;
  function tzAbbr(ts) { try { var p = TZF.formatToParts(new Date(ts)).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return p ? p.value : 'UTC'; } catch (e) { return 'UTC'; } }
  function tzName() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
  function fClock(ts) { return fTime(ts) + ' ' + tzAbbr(ts); }
  function fDT(ts) { var d = new Date(ts); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + fClock(ts); }
  function ltr(s) { return '<bdi class="ltr">' + esc(s) + '</bdi>'; }
  function svgEl(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function siteDef(id) { return D.sites.filter(function (s) { return s.id === id; })[0]; }
  function tplDef(id) { return D.templates.filter(function (s) { return s.id === id; })[0]; }
  function opName(id, short) { return t('op_' + id + (short ? '_s' : '')); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function toast(msg) {
    var box = $('#toast'), e = document.createElement('div');
    e.className = 'toast-i'; e.textContent = msg; box.appendChild(e);
    setTimeout(function () { e.classList.add('out'); setTimeout(function () { e.remove(); }, 300); }, 3600);
  }

  /* ---------- state ---------- */
  function freshState() {
    return {
      op: S ? S.op : 'o1', sim: 0, nextM: 1001, nextA: 201, alertIdx: 0, sel: S ? S.sel : 'gs', auFilter: 'all',
      robots: JSON.parse(JSON.stringify(D.robots)), missions: [], alerts: [], log: []
    };
  }
  function addLog(actor, action, args, ts) { S.log.unshift({ ts: ts || Date.now(), actor: actor, action: action, args: args || {} }); }

  function logText(e, html) {
    var a = e.args || {}, f = html ? function (x) { return ltr(x); } : function (x) { return x; };
    var vars = {
      id: f(a.id || ''), id2: f(a.id2 || ''), robot: f(a.robot || ''),
      site: a.site ? t('site.' + a.site) : '', tpl: a.tpl ? t('tpl.' + a.tpl + '.name') : '',
      type: a.type ? t((a.site === 'gs' && (I[lang]['al.' + a.type + '.gs.title'] != null || I.ar['al.' + a.type + '.gs.title'] != null)) ? 'al.' + a.type + '.gs.title' : 'al.' + a.type + '.title') : ''
    };
    return t('a.' + e.action, vars);
  }
  function actorText(a) {
    if (a === 'system') return t('actor.system');
    if (a.indexOf('op:') === 0) return opName(a.slice(3), true);
    if (a.indexOf('robot:') === 0) return a.slice(6);
    return a;
  }
  function actorKind(a) { return a === 'system' ? 'system' : a.indexOf('robot:') === 0 ? 'robot' : 'human'; }

  /* ---------- robots / routes ---------- */
  function buildRoutes() {
    var host = $('#routes');
    Object.keys(D.plans).forEach(function (id) {
      var path = svgEl('path', { d: D.plans[id].route }); host.appendChild(path);
      var len = path.getTotalLength(), n = 400, pts = [];
      for (var i = 0; i <= n; i++) { var p = path.getPointAtLength(len * i / n); pts.push([p.x, p.y]); }
      samples[id] = { len: len, pts: pts, n: n };
    });
  }
  function pointAt(siteId, d) {
    var s = samples[siteId], f = (d % s.len) / s.len * s.n, i = Math.floor(f), r = f - i, a = s.pts[i], b = s.pts[Math.min(i + 1, s.n)];
    return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
  }
  function missionOf(robotId) { return S.missions.filter(function (m) { return m.status === 'running' && m.robot === robotId; })[0]; }
  function pickRobot(siteId, prefer) {
    var list = S.robots.filter(function (r) { return r.site === siteId && (r.state === 'patrol' || r.state === 'docked' || r.state === 'charging') && r.batt >= 25; });
    var pr = list.filter(function (r) { return r.id === prefer; })[0];
    return pr || list.sort(function (a, b) { return b.batt - a.batt; })[0] || null;
  }
  function anyRobot(siteId) { return S.robots.filter(function (r) { return r.site === siteId; })[0]; }

  /* ---------- missions ---------- */
  function genFindings(tpl, alertType, m) {
    var ok = function (k, v) { return { k: k, v: v, attn: false }; };
    var wx = (m && m.wx) || {};
    if (alertType === 'wind') {
      return [{ k: 'f.wind', v: { s: (wx.wind != null ? wx.wind : '—') + ' km/h' }, attn: true },
        { k: 'f.cband', v: { s: rnd(0.1, 0.4).toFixed(1) + '°' }, attn: false },
        ok('f.mount', { k: 'v.tight' }), ok('f.cables', { k: 'v.intact' })];
    }
    if (alertType === 'rain' || tpl === 'rainfade') {
      return [{ k: 'f.rain', v: { s: (wx.rain != null ? wx.rain : '—') + ' mm' }, attn: true },
        { k: 'f.ku', v: { k: 'v.ku_sensitive' }, attn: true },
        { k: 'f.cband', v: { k: 'v.cband_ok' }, attn: false }];
    }
    if (tpl === 'pointing' || alertType === 'pointing' || alertType === 'ku') {
      var azBad = alertType === 'pointing' || alertType === 'dish';
      return [{ k: 'f.cband', v: { s: (azBad ? rnd(1.4, 2.6) : rnd(0.1, 0.4)).toFixed(1) + '°' }, attn: azBad },
        { k: 'f.ku', v: { k: alertType === 'ku' ? 'v.ku_check' : 'v.intact' }, attn: alertType === 'ku' },
        ok('f.mount', { k: 'v.tight' }), ok('f.cables', { k: 'v.intact' })];
    }
    if (alertType === 'hpa') {
      return [{ k: 'f.hpa', v: { s: Math.round(rnd(61, 67)) + ' °C' }, attn: true }, ok('f.cables', { k: 'v.intact' })];
    }
    if (alertType === 'idu') {
      return [{ k: 'f.idu', v: { s: rnd(7.6, 9.8).toFixed(1) + ' dB' }, attn: true }, ok('f.ku', { k: 'v.intact' })];
    }
    if (alertType === 'ups') {
      return [{ k: 'f.ups', v: { s: Math.round(rnd(188, 199)) + ' V' }, attn: true }, ok('f.cables', { k: 'v.intact' })];
    }
    if (tpl === 'antenna') {
      var bad = alertType === 'dish';
      return [{ k: 'f.azimuth', v: { s: (bad ? rnd(1.4, 2.6) : rnd(0.1, 0.4)).toFixed(1) + '°' }, attn: bad }, ok('f.mount', { k: 'v.tight' }), ok('f.cables', { k: 'v.intact' })];
    }
    if (tpl === 'thermal') {
      var hot = alertType === 'overheat';
      return [ok('f.cabA', { s: Math.round(rnd(38, 44)) + ' °C' }), { k: 'f.cabB', v: { s: Math.round(hot ? rnd(59, 66) : rnd(39, 46)) + ' °C' }, attn: hot }, ok('f.pdu', { s: Math.round(rnd(36, 42)) + ' °C' })];
    }
    if (tpl === 'perimeter') {
      var open = alertType === 'door';
      return [ok('f.fence', { k: 'v.intact' }), ok('f.gate1', { k: 'v.closed' }), ok('f.gate2', { k: 'v.closed' }), { k: 'f.door', v: { k: open ? 'v.open' : 'v.closed' }, attn: open }];
    }
    if (tpl === 'gauges') {
      return [ok('f.fuel', { s: Math.round(rnd(58, 84)) + ' %' }), ok('f.press', { s: rnd(5.8, 6.4).toFixed(1) + ' bar' }), ok('f.energy', { s: Math.round(rnd(1100, 1400)) + ' kWh' })];
    }
    var intr = alertType === 'intruder';
    return [ok('f.thermalcam', { k: 'v.active' }), { k: 'f.motion', v: { k: intr ? 'v.person' : 'v.none' }, attn: intr }, ok('f.fence', { k: 'v.intact' })];
  }
  function mkMission(tpl, site, src, alertId, alertType, robotId) {
    var m = { id: 'M-' + (S.nextM++), tpl: tpl, site: site, robot: robotId, src: src, alertId: alertId || null, alertType: alertType || null,
      status: 'awaiting', tProposed: Date.now(), tDecided: null, by: null, tStart: null, tEnd: null, elapsed: 0, total: tplDef(tpl).total, findings: null };
    S.missions.unshift(m); return m;
  }
  function proposeMission(tpl, site) {
    var r = pickRobot(site) || anyRobot(site);
    var m = mkMission(tpl, site, 'manual', null, null, r.id);
    addLog('system', 'propose', { id: m.id, tpl: tpl, site: site, robot: r.id }, m.tProposed);
    return m;
  }
  function startMission(m, by) {
    var r = pickRobot(m.site, m.robot);
    if (!r) { addLog('system', 'noaction', { site: m.site }); toast(t('no_robot_avail')); return false; }
    m.robot = r.id; m.status = 'running'; m.tDecided = m.tStart = Date.now(); m.by = by;
    r.state = 'mission';
    addLog('robot:' + r.id, 'start', { id: m.id, site: m.site }, m.tStart);
    return true;
  }
  function approveMission(id) {
    var m = S.missions.filter(function (x) { return x.id === id; })[0]; if (!m || m.status !== 'awaiting') return;
    var by = 'op:' + S.op;
    if (!startMission(m, by)) return;
    // log order: approval first, then robot start
    var st = S.log.shift();
    addLog(by, 'approve', { id: m.id, tpl: m.tpl, site: m.site }, m.tDecided);
    S.log.unshift(st);
    toast(t('toast_approved')); afterChange();
  }
  function rejectMission(id) {
    var m = S.missions.filter(function (x) { return x.id === id; })[0]; if (!m || m.status !== 'awaiting') return;
    m.status = 'rejected'; m.tDecided = Date.now(); m.by = 'op:' + S.op;
    addLog(m.by, 'reject', { id: m.id, tpl: m.tpl, site: m.site }, m.tDecided);
    toast(t('toast_rejected')); afterChange();
  }
  function completeMission(m) {
    m.status = 'done'; m.tEnd = Date.now(); m.elapsed = m.total; m.findings = genFindings(m.tpl, m.alertType, m);
    var r = S.robots.filter(function (x) { return x.id === m.robot; })[0];
    if (r) r.state = r.batt < 30 ? 'returning' : 'patrol';
    addLog('robot:' + m.robot, 'complete', { id: m.id }, m.tEnd);
    addLog('system', 'report', { id: m.id }, m.tEnd);
    toast(t('toast_done'));
  }

  /* ---------- alerts ---------- */
  function raiseAlert(typeId, siteId, silent, ts) {
    var at = D.alertTypes.filter(function (a) { return a.id === typeId; })[0];
    if (!siteId) { var c = at.sites; siteId = c[Math.floor(Math.random() * c.length)]; }
    var r = pickRobot(siteId) || anyRobot(siteId);
    var v = typeId === 'overheat' || typeId === 'hpa' ? Math.round(rnd(58, 67)) : typeId === 'door' ? Math.round(rnd(4, 12)) : (typeId === 'dish' || typeId === 'pointing') ? rnd(1.4, 2.6).toFixed(1) : typeId === 'idu' ? rnd(7.6, 9.8).toFixed(1) : typeId === 'ups' ? Math.round(rnd(188, 199)) : '';
    var a = { id: 'A-' + (S.nextA++), type: typeId, site: siteId, sev: at.sev, ts: ts || Date.now(), v: v, robot: r.id, tpl: at.tpl, status: 'open', missionId: null, by: null, tDecided: null };
    S.alerts.unshift(a);
    addLog('system', 'alert', { id: a.id, type: typeId, site: siteId }, a.ts);
    addLog('system', 'draft', { id: a.id, tpl: at.tpl, robot: r.id }, a.ts);
    if (!silent) toast(t('toast_alert'));
    return a;
  }
  function approveAlert(id) {
    var a = S.alerts.filter(function (x) { return x.id === id; })[0]; if (!a || a.status !== 'open') return;
    var m = a.missionId && S.missions.filter(function (x) { return x.id === a.missionId; })[0];
    var created = false;
    if (!m || m.status !== 'awaiting') { m = mkMission(a.tpl, a.site, 'alert', a.id, a.type, a.robot); created = true; }
    if (!startMission(m, 'op:' + S.op)) { if (created) { S.missions.shift(); S.nextM--; } return; }
    S.log.shift(); // drop robot 'start' so the human decision is logged first
    a.status = 'dispatched'; a.missionId = m.id; a.by = 'op:' + S.op; a.tDecided = Date.now();
    addLog(a.by, 'dispatch', { id: a.id, robot: m.robot, id2: m.id }, a.tDecided);
    addLog('robot:' + m.robot, 'start', { id: m.id, site: m.site }, m.tStart);
    toast(t('toast_approved')); afterChange();
  }
  function dismissAlert(id) {
    var a = S.alerts.filter(function (x) { return x.id === id; })[0]; if (!a || a.status !== 'open') return;
    a.status = 'dismissed'; a.by = 'op:' + S.op; a.tDecided = Date.now();
    if (a.missionId) {
      var m = S.missions.filter(function (x) { return x.id === a.missionId; })[0];
      if (m && m.status === 'awaiting') { m.status = 'rejected'; m.tDecided = a.tDecided; m.by = a.by; addLog(a.by, 'reject', { id: m.id, tpl: m.tpl, site: m.site }, a.tDecided); }
    }
    addLog(a.by, 'dismiss', { id: a.id }, a.tDecided); toast(t('toast_dismissed')); afterChange();
  }

  /* ---------- LIVE weather advisories (Open-Meteo -> drafted task that stays awaiting human approval) ---------- */
  function raiseLiveAdvisory(type, siteId, fields) {
    var r = pickRobot(siteId) || anyRobot(siteId); if (!r) return null;
    var tpl = type === 'rain' ? 'rainfade' : (siteId === 'gs' ? 'pointing' : 'antenna');
    var a = { id: 'A-' + (S.nextA++), type: type, site: siteId, sev: 'medium', ts: Date.now(), v: fields.v, thr: String(fields.thr), robot: r.id, tpl: tpl, status: 'open', missionId: null, by: null, tDecided: null, live: true, wx: fields.wx };
    S.alerts.unshift(a);
    addLog('system', 'alert', { id: a.id, type: type, site: siteId }, a.ts);
    var m = mkMission(tpl, siteId, 'alert', a.id, type, r.id);
    m.live = true; m.wx = fields.wx; a.missionId = m.id;
    addLog('system', 'propose', { id: m.id, tpl: tpl, site: siteId, robot: r.id }, m.tProposed);
    addLog('system', 'draft', { id: a.id, tpl: tpl, robot: r.id }, a.ts);
    toast(t('toast_alert')); return a;
  }
  function checkWind() {
    if (!S) return;
    var thr = WX.windThreshold(), changed = false;
    WX_DISH_SITES.forEach(function (sid) {
      var g = WX.get(WX_OF[sid]); S.windArm = S.windArm || {};
      if (!g.ok) return;
      var hot = WX.windExceeded(g.v, thr);
      if (hot && !S.windArm[sid]) {
        S.windArm[sid] = true;
        raiseLiveAdvisory('wind', sid, { v: String(Math.round(Math.max(g.v.wind || 0, 0))), thr: thr, wx: { wind: WX.f0(g.v.wind), gust: g.v.gust == null ? '—' : WX.f0(g.v.gust), rain: WX.f1(g.v.rain), thr: thr } });
        changed = true;
      } else if (!hot) S.windArm[sid] = false;
    });
    if (changed) afterChange();
  }
  /* Rain-fade advisory only for the illustrative GEO scenario (Nouakchott). Stays a pending mission — the robot does not move. */
  function checkRain() {
    if (!S) return;
    var thr = WX.rainThreshold(), g = WX.get('nkc'); S.rainArm = S.rainArm || {};
    if (!g.ok) return;
    var hot = WX.rainExceeded(g.v, thr);
    if (hot && !S.rainArm.gs) {
      S.rainArm.gs = true;
      raiseLiveAdvisory('rain', 'gs', { v: WX.f1(g.v.rain), thr: thr, wx: { rain: WX.f1(g.v.rain), wind: WX.f0(g.v.wind), gust: g.v.gust == null ? '—' : WX.f0(g.v.gust), thr: thr } });
      afterChange();
    } else if (!hot) S.rainArm.gs = false;
  }
  function checkAdvisories() { checkWind(); checkRain(); }

  /* ---------- LIVE weather rendering ---------- */
  function renderWeather() {
    var host = $('#wx-cards'); if (!host) return;
    var fmt = { clock: fClock };
    host.innerHTML = WX.SITES.map(function (s) { return WX.renderCard(s.id, t, esc, fmt); }).join('');
    var thr = $('#wx-thr'); if (thr && document.activeElement !== thr) thr.value = WX.windThreshold();
    var rth = $('#wx-rain'); if (rth && document.activeElement !== rth) rth.value = WX.rainThreshold();
    renderPlanWx();
    renderAdvisoryStatus();
  }
  /* LIVE-computed look angles for the illustrative GEO site. Same calculator as the 3D page (assets/js/geo.js). */
  var LS_SAT = 'aicore-robots-sat';
  function currentSatLon() {
    var v = NaN;
    try { v = parseFloat(localStorage.getItem(LS_SAT)); } catch (e) { /* ignore */ }
    return GEO.SAT_LONS.indexOf(v) >= 0 ? v : GEO.SAT_EXAMPLE_LON;
  }
  function satLabel(l) { return GEO.lonLabel(l) + (GEO.SAT_EXAMPLES[l] === 'badr8' ? ' — ' + t('name_badr') : ''); }
  function renderPointing() {
    var sel = $('#sat-sel'); if (!sel || !window.GEO) return;
    var lon = currentSatLon();
    if (!sel.options.length || sel.getAttribute('data-lang') !== lang) {
      sel.innerHTML = GEO.SAT_LONS.slice().sort(function (a, b) { return a - b; }).map(function (l) {
        return '<option value="' + l + '">' + esc(satLabel(l)) + '</option>';
      }).join('');
      sel.setAttribute('data-lang', lang);
    }
    sel.value = String(lon);
    var p = GEO.lookAngles(GEO.STATION.lat, GEO.STATION.lon, lon);
    var host = $('#pt-out'); if (!host) return;
    host.innerHTML = p.visible
      ? '<div><dt>' + esc(t('lv_pt_az')) + '</dt><dd>' + ltr(WX.f1(p.az) + '°') + '</dd></div>' +
        '<div><dt>' + esc(t('lv_pt_el')) + '</dt><dd>' + ltr(WX.f1(p.el) + '°') + '</dd></div>' +
        '<div><dt>' + esc(t('lv_pt_skew')) + '</dt><dd>' + ltr((p.skew > 0 ? '+' : '') + WX.f1(p.skew) + '°') + '</dd></div>' +
        '<div><dt>' + esc(t('lv_pt_range')) + '</dt><dd>' + ltr(Math.round(p.range).toLocaleString('en-US') + ' km') + '</dd></div>'
      : '<div><dd>' + esc(t('lv_pt_below')) + '</dd></div>';
  }
  function renderAdvisoryStatus() {
    var el = $('#wx-adv'); if (!el) return;
    var g = WX.get('nkc');
    if (!g.ok) { el.textContent = ''; return; }
    var parts = [];
    if (WX.rainExceeded(g.v, WX.rainThreshold())) parts.push(t('lv_rain_hot'));
    else parts.push(t('lv_rain_ok', { v: WX.f1(g.v.rain), thr: String(WX.rainThreshold()) }));
    if (WX.windExceeded(g.v, WX.windThreshold())) parts.push(t('lv_wind_hot'));
    el.textContent = parts.join(' ');
  }
  function renderPlanWx() {
    var host = $('#plan-wx'); if (!host || !S) return;
    var id = WX_OF[S.sel], g = WX.get(id);
    host.innerHTML = g.ok
      ? '<span class="live-badge"><i></i>LIVE / حي</span> <span class="muted">' + esc(t('lv_wx_site_' + id)) + '</span> ' + ltr(WX.f1(g.v.temp) + ' °C') + ' · ' + ltr(WX.f0(g.v.wind) + ' km/h') + ' · ' + ltr(WX.f0(g.v.hum) + ' %')
      : '<span class="na-badge">' + esc(t('lv_wx_unavail')) + '</span>';
  }

  /* ---------- seed ---------- */
  function seed() {
    var now = Date.now();
    addLog('system', 'boot', {}, now - 7200000);
    var m = mkMission('thermal', 'tw', 'manual', null, null, 'R-03');
    m.tProposed = now - 6900000;
    addLog('system', 'propose', { id: m.id, tpl: 'thermal', site: 'tw', robot: 'R-03' }, m.tProposed);
    m.status = 'done'; m.tDecided = m.tStart = now - 6800000; m.tEnd = now - 6780000; m.elapsed = m.total; m.by = 'op:o2'; m.findings = genFindings('thermal', null);
    addLog('op:o2', 'approve', { id: m.id, tpl: 'thermal', site: 'tw' }, m.tDecided);
    addLog('robot:R-03', 'start', { id: m.id, site: 'tw' }, m.tStart);
    addLog('robot:R-03', 'complete', { id: m.id }, m.tEnd);
    addLog('system', 'report', { id: m.id }, m.tEnd + 1000);
    var m2 = mkMission('perimeter', 'wh', 'manual', null, null, 'R-05'); m2.tProposed = now - 300000;
    addLog('system', 'propose', { id: m2.id, tpl: 'perimeter', site: 'wh', robot: 'R-05' }, m2.tProposed);
    raiseAlert('overheat', 'gs', true, now - 90000);
  }

  /* ---------- simulation tick (1 Hz) ---------- */
  function tick() {
    S.sim++;
    S.robots.forEach(function (r) {
      if (r.state === 'patrol') { r.batt -= 0.05; if (r.batt < 25) r.state = 'returning'; }
      else if (r.state === 'mission') r.batt -= 0.15;
      else if (r.state === 'charging' || r.state === 'docked') { r.batt = Math.min(100, r.batt + 0.25); r.state = r.batt >= 100 ? 'docked' : 'charging'; }
      else if (r.state === 'returning') r.batt -= 0.03;
      if (r.batt < 5) r.batt = 5;
    });
    var done = false;
    S.missions.forEach(function (m) {
      if (m.status === 'running') { m.elapsed += 1; if (m.elapsed >= m.total) { completeMission(m); done = true; } }
    });
    if (S.sim % 75 === 0 && S.alerts.filter(function (a) { return a.status === 'open'; }).length < 3) { nextAlert(true); }
    $('#clock').textContent = fClock(Date.now());
    if (done) afterChange(); else { updateProgress(); renderKpis(); renderRobotList(); }
    if (reduced) { stepRobots(1); updatePositions(); }
  }
  function nextAlert(auto) {
    var types = D.alertTypes, ty = types[S.alertIdx++ % types.length];
    raiseAlert(ty.id); afterChange();
  }

  /* ---------- rendering: shared ---------- */
  function afterChange() { renderStatus(); renderKpis(); renderRobotList(); renderBoard(); renderAlerts(); renderAudit(); renderNavDots(); renderPlanHead(); }

  function siteStatus(id) {
    if (S.alerts.some(function (a) { return a.site === id && a.status === 'open'; })) return 'att';
    if (S.missions.some(function (m) { return m.site === id && m.status === 'running'; })) return 'mis';
    return 'ok';
  }
  function stName(s) { return t(s === 'att' ? 'st_attention' : s === 'mis' ? 'st_mission' : 'st_normal'); }

  function renderNavDots() {
    var pend = S.missions.filter(function (m) { return m.status === 'awaiting'; }).length, al = S.alerts.filter(function (a) { return a.status === 'open'; }).length;
    $('#nb-missions').hidden = !pend; $('#nb-missions').textContent = pend;
    $('#nb-alerts').hidden = !al; $('#nb-alerts').textContent = al;
  }

  function renderKpis() {
    var online = S.robots.length, run = S.missions.filter(function (m) { return m.status === 'running'; }).length;
    var pend = S.missions.filter(function (m) { return m.status === 'awaiting'; }).length + S.alerts.filter(function (a) { return a.status === 'open'; }).length;
    var al = S.alerts.filter(function (a) { return a.status === 'open'; }).length;
    var items = [['i-robot', online, 'kpi_robots', 'cyan'], ['i-mission', run, 'kpi_missions', 'purple'], ['i-shield', pend, 'kpi_pending', 'pink'], ['i-alert', al, 'kpi_alerts', 'warn']];
    $('#kpis').innerHTML = items.map(function (k) {
      return '<div class="kpi k-' + k[3] + '"><svg class="ico"><use href="#' + k[0] + '"/></svg><b>' + k[1] + '</b><span>' + esc(t(k[2])) + '</span></div>';
    }).join('');
  }

  function rolesHTML() {
    var items = [['i-robot', 'ro1'], ['i-shield', 'ro2'], ['i-log', 'ro3'], ['i-globe', 'ro4']];
    return '<section class="card roles" aria-labelledby="ro-h-x"><h2 class="sec" id="ro-h-x">' + esc(t('ro_title')) + '</h2><div class="roles-grid">' +
      items.map(function (i) { return '<div class="role"><svg class="ico"><use href="#' + i[0] + '"/></svg><div><h3>' + esc(t(i[1] + '_t')) + '</h3><p>' + esc(t(i[1] + '_b')) + '</p></div></div>'; }).join('') + '</div></section>';
  }

  /* ---------- dashboard: map + plan ---------- */
  function buildMap() {
    var svg = $('#map'); svg.setAttribute('aria-label', t('map_aria'));
    var h = '<defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a24aff" stop-opacity=".28"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".14"/></linearGradient>' +
      '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    for (var i = 1; i < 8; i++) h += '<line class="grat" x1="' + i * 80 + '" y1="0" x2="' + i * 80 + '" y2="640"/><line class="grat" x1="0" y1="' + i * 80 + '" x2="640" y2="' + i * 80 + '"/>';
    h += '<polygon class="land" points="' + D.outline.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
    // symbolic links
    var g = function (id) { return siteDef(id).at; };
    [['gs', 'wh'], ['gs', 'tw'], ['tw', 'en'], ['gs', 'en']].forEach(function (l) {
      var a = g(l[0]), b = g(l[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 24;
      var d = 'M' + a[0] + ' ' + a[1] + ' Q' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1];
      h += '<path class="link" d="' + d + '"/><path class="link pulse" d="' + d + '"/>';
    });
    D.sites.forEach(function (s) {
      var x = s.at[0], y = s.at[1];
      if (s.id === 'gs' || s.id === 'wh') h += '<line class="leader" x1="' + s.geo[0] + '" y1="' + s.geo[1] + '" x2="' + x + '" y2="' + y + '"/>';
    });
    h += '<circle class="city" cx="' + D.sites[0].geo[0] + '" cy="' + D.sites[0].geo[1] + '" r="3.5"/>';
    D.sites.forEach(function (s) {
      var x = s.at[0], y = s.at[1], nm = t('site.' + s.id);
      h += '<g class="msite s-ok" data-site="' + s.id + '" tabindex="0" role="button" aria-label="' + esc(nm) + '">' +
        '<rect class="hit" x="' + (x - 64) + '" y="' + (y - 26) + '" width="128" height="' + (s.ly + 34) + '"/><rect class="foot" x="' + (x - 34) + '" y="' + (y - 24) + '" width="68" height="48" rx="12"/>' +
        '<path class="mroute" d="' + D.plans[s.id].route + '" transform="translate(' + x + ' ' + y + ') scale(.16) translate(-200 -130)"/>' +
        '<circle class="ring" cx="' + x + '" cy="' + y + '" r="8"/><circle class="pin" cx="' + x + '" cy="' + y + '" r="4.5"/>' +
        '<text class="mlabel" x="' + (x + s.lx) + '" y="' + (y + s.ly) + '" text-anchor="middle">' + esc(nm) + '</text></g>';
    });
    S.robots.forEach(function (r) { h += '<g class="mbot" id="mr-' + r.id + '"><circle r="4.2" class="mbot-c"/></g>'; });
    h += '<text class="sea" x="30" y="180">' + (lang === 'ar' ? 'المحيط الأطلسي' : lang === 'en' ? 'Atlantic Ocean' : 'Océan Atlantique') + '</text>';
    svg.innerHTML = h;
    $$('.msite', svg).forEach(function (el) {
      el.addEventListener('click', function () { selectSite(el.getAttribute('data-site')); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSite(el.getAttribute('data-site')); } });
    });
    renderStatus();
  }
  function renderStatus() {
    $$('#map .msite').forEach(function (el) {
      var id = el.getAttribute('data-site'), st = siteStatus(id);
      el.setAttribute('class', 'msite s-' + st + (S.sel === id ? ' sel' : ''));
      el.setAttribute('aria-label', t('site.' + id) + ' — ' + stName(st));
    });
  }
  function selectSite(id) { S.sel = id; renderPlan(); renderStatus(); renderSiteTabs(); renderRobotList(); }
  function renderSiteTabs() {
    $('#site-tabs').innerHTML = D.sites.map(function (s) {
      var st = siteStatus(s.id);
      return '<button type="button" class="stab st-' + st + '" data-site="' + s.id + '" aria-pressed="' + (S.sel === s.id) + '"><i></i>' + esc(t('site.' + s.id)) + '</button>';
    }).join('');
    $$('#site-tabs button').forEach(function (b) { b.addEventListener('click', function () { selectSite(b.getAttribute('data-site')); }); });
  }
  function renderPlanHead() {
    var st = siteStatus(S.sel);
    $('#plan-head').innerHTML = '<div><b>' + esc(t('site.' + S.sel)) + '</b><span class="muted tiny"> · ' + esc(t('sitetype.' + S.sel)) + '</span></div><span class="chip c-' + st + '">' + esc(stName(st)) + '</span><div class="wx-mini" id="plan-wx"></div>';
    renderPlanWx();
    $$('#site-tabs .stab').forEach(function (b) { b.className = 'stab st-' + siteStatus(b.getAttribute('data-site')); b.setAttribute('aria-pressed', b.getAttribute('data-site') === S.sel); });
  }
  function renderPlan() {
    var pl = D.plans[S.sel], svg = $('#plan');
    svg.setAttribute('aria-label', t('plan_aria') + ' — ' + t('site.' + S.sel));
    var h = '<rect class="p-bg" x="0" y="0" width="400" height="260"/>' + pl.shapes + '<path class="p-route" d="' + pl.route + '"/>';
    pl.pois.forEach(function (p) {
      var key = 'poi.' + p[2], lab = t(key);
      var openType = function (types) { return S.alerts.some(function (a) { return a.site === S.sel && a.status === 'open' && types.indexOf(a.type) >= 0; }); };
      var warn = (p[2] === 'cabinet' && openType(['overheat'])) ||
        (p[2] === 'dish' && openType(['dish'])) ||
        (p[2] === 'geo_c' && openType(['dish', 'pointing', 'wind'])) ||
        (p[2] === 'ku' && openType(['ku', 'rain'])) ||
        (p[2] === 'hpa' && openType(['hpa', 'overheat'])) ||
        (p[2] === 'idu' && openType(['idu'])) ||
        (p[2] === 'ups' && openType(['ups'])) ||
        (p[2] === 'gate' && openType(['intruder', 'door']));
      var ly = p[1] > 215 ? p[1] - 9 : p[1] + 15;
      h += '<g class="poi' + (p[2] === 'dock' ? ' dock' : '') + (warn ? ' warn' : '') + '"><circle class="poi-r" cx="' + p[0] + '" cy="' + p[1] + '" r="9"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="4"/>' +
        '<text x="' + p[0] + '" y="' + ly + '" text-anchor="middle">' + esc(lab) + '</text></g>';
    });
    S.robots.filter(function (r) { return r.site === S.sel; }).forEach(function (r) {
      h += '<g class="pbot" id="pr-' + r.id + '"><circle class="pbot-glow" r="15"/>' +
        '<g class="pbot-b"><rect x="-10" y="-5" width="20" height="10" rx="4"/><circle cx="11" cy="-2" r="3.6"/><path d="M-6 5v5M-2 5v5M3 5v5M7 5v5" /></g><text y="-12" text-anchor="middle">' + r.id + '</text></g>';
    });
    svg.innerHTML = h; updatePositions();
  }
  function stateChip(r) {
    var m = r.state === 'mission' ? 'c-mis' : r.state === 'returning' ? 'c-att' : r.state === 'patrol' ? 'c-ok' : 'c-dim';
    return '<span class="chip ' + m + '">' + esc(t('rs_' + r.state)) + '</span>';
  }
  function renderRobotList() {
    var list = S.robots.filter(function (r) { return r.site === S.sel; });
    $('#robot-list').innerHTML = list.length ? list.map(function (r) {
      var b = Math.round(r.batt), cls = b < 30 ? 'low' : b < 55 ? 'mid' : '';
      var ms = missionOf(r.id);
      return '<div class="robot"><svg class="ico"><use href="#i-robot"/></svg><div class="rb-main"><div class="rb-t"><b>' + r.id + '</b> ' + stateChip(r) + (ms ? ' <span class="tiny muted">' + ltr(ms.id) + '</span>' : '') + '</div>' +
        '<div class="tiny muted">' + esc(t('robot_type')) + '</div></div>' +
        '<div class="batt ' + cls + '" role="img" aria-label="' + esc(t('battery')) + ' ' + b + '%"><span style="width:' + b + '%"></span><em>' + b + '%</em></div></div>';
    }).join('') : '<p class="muted">' + esc(t('no_robot')) + '</p>';
  }
  function updatePositions() {
    S.robots.forEach(function (r) {
      var p = pointAt(r.site, r.d), pe = $('#pr-' + r.id), me = $('#mr-' + r.id), s = siteDef(r.site);
      if (pe) { pe.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')'); pe.setAttribute('data-state', r.state); }
      if (me) { me.setAttribute('transform', 'translate(' + (s.at[0] + (p[0] - 200) * 0.16).toFixed(1) + ' ' + (s.at[1] + (p[1] - 130) * 0.16).toFixed(1) + ')'); me.setAttribute('data-state', r.state); }
    });
  }
  function stepRobots(dt) {
    S.robots.forEach(function (r) {
      var len = samples[r.site].len;
      if (r.state === 'patrol') r.d = (r.d + 14 * dt) % len;
      else if (r.state === 'mission') r.d = (r.d + 30 * dt) % len;
      else if (r.state === 'returning') { r.d += 30 * dt; if (r.d >= len) { r.d = 0; r.state = 'charging'; } }
      else r.d = 0;
    });
  }
  function frame(ts) {
    rafId = requestAnimationFrame(frame);
    var dt = Math.min(0.1, (ts - lastFrame) / 1000); lastFrame = ts;
    stepRobots(dt); updatePositions();
  }
  function startLoop() { if (reduced || rafId) return; lastFrame = performance.now(); rafId = requestAnimationFrame(frame); }
  function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  /* ---------- missions view ---------- */
  function renderTemplates() {
    $('#tpl-grid').innerHTML = D.templates.map(function (tp) {
      var opts = tp.sites.map(function (s) { return '<option value="' + s + '">' + esc(t('site.' + s)) + '</option>'; }).join('');
      return '<article class="card tpl"><div class="tpl-ic"><svg class="ico"><use href="#' + tp.icon + '"/></svg></div><h3>' + esc(t('tpl.' + tp.id + '.name')) + '</h3>' +
        '<p class="muted small">' + esc(t('tpl.' + tp.id + '.desc')) + '</p>' +
        '<p class="tiny muted">4 ' + esc(t('mi_steps')) + '</p>' +
        '<label class="fld"><span class="tiny">' + esc(t('mi_site')) + '</span><select data-tpl-site="' + tp.id + '">' + opts + '</select></label>' +
        '<button class="btn btn-primary btn-block" type="button" data-propose="' + tp.id + '"><svg class="ico"><use href="#i-plus"/></svg>' + esc(t('mi_propose')) + '</button></article>';
    }).join('');
    $$('[data-propose]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-propose'), site = $('[data-tpl-site="' + id + '"]').value;
        proposeMission(id, site); toast(t('toast_proposed')); afterChange();
      });
    });
  }
  function stepsHTML(m) {
    var cur = Math.min(3, Math.floor(m.elapsed / (m.total / 4)));
    return '<ol class="steps">' + [1, 2, 3, 4].map(function (i) {
      var cls = m.status === 'done' ? 'done' : m.status === 'running' ? (i - 1 < cur ? 'done' : i - 1 === cur ? 'now' : '') : '';
      return '<li class="' + cls + '">' + esc(t('tpl.' + m.tpl + '.s' + i)) + '</li>';
    }).join('') + '</ol>';
  }
  function missionCard(m) {
    var h = '<article class="card mcard m-' + m.status + '" data-m="' + m.id + '"><header><b>' + esc(t('tpl.' + m.tpl + '.name')) + '</b>' + ltr(m.id) + '</header>' +
      '<p class="small muted">' + esc(t('site.' + m.site)) + ' · ' + esc(t('robot')) + ' ' + ltr(m.robot) + ' · ' + esc(t(m.src === 'alert' ? 'src_alert' : 'src_manual')) + '</p>' +
      (m.live && m.status === 'awaiting' ? '<p class="tiny"><span class="live-badge"><i></i>LIVE / حي</span> ' + esc(t('lv_pending_live')) + '</p>' : '');
    if (m.status === 'awaiting') {
      h += stepsHTML(m) + '<p class="hint tiny">' + esc(t('hint_awaiting')) + '</p><div class="acts"><button class="btn btn-primary" type="button" data-approve="' + m.id + '"><svg class="ico"><use href="#i-check"/></svg>' + esc(t('approve')) + '</button>' +
        '<button class="btn btn-ghost" type="button" data-reject="' + m.id + '"><svg class="ico"><use href="#i-x"/></svg>' + esc(t('reject')) + '</button></div>';
    } else if (m.status === 'running') {
      h += stepsHTML(m) + '<div class="bar"><span data-mp="' + m.id + '" style="width:' + Math.round(m.elapsed / m.total * 100) + '%"></span></div><p class="tiny muted">' + esc(t('approved_by')) + ': ' + esc(actorText(m.by)) + ' · ' + ltr(fClock(m.tDecided)) + '</p>';
    } else if (m.status === 'done') {
      h += '<p class="tiny muted">' + esc(t('approved_by')) + ': ' + esc(actorText(m.by)) + ' · ' + ltr(fClock(m.tDecided)) + '</p><div class="acts"><button class="btn btn-ghost" type="button" data-report="' + m.id + '"><svg class="ico"><use href="#i-print"/></svg>' + esc(t('view_report')) + '</button></div>';
    } else {
      h += '<p class="tiny muted">' + esc(t('rejected_by')) + ': ' + esc(actorText(m.by)) + ' · ' + ltr(fClock(m.tDecided)) + '</p>';
    }
    return h + '</article>';
  }
  function renderBoard() {
    var cols = [['awaiting', 'ms_awaiting'], ['running', 'ms_running'], ['done', 'ms_done'], ['rejected', 'ms_rejected']];
    $('#board').innerHTML = cols.map(function (c) {
      var list = S.missions.filter(function (m) { return m.status === c[0]; });
      return '<section class="col col-' + c[0] + '" aria-label="' + esc(t(c[1])) + '"><h3>' + esc(t(c[1])) + ' <span class="count">' + list.length + '</span></h3>' +
        (list.length ? list.map(missionCard).join('') : '<p class="empty muted small">' + esc(t('mi_none')) + '</p>') + '</section>';
    }).join('');
    $$('[data-approve]').forEach(function (b) { b.addEventListener('click', function () { approveMission(b.getAttribute('data-approve')); }); });
    $$('[data-reject]').forEach(function (b) { b.addEventListener('click', function () { rejectMission(b.getAttribute('data-reject')); }); });
    $$('[data-report]').forEach(function (b) { b.addEventListener('click', function () { openReport(b.getAttribute('data-report'), b); }); });
  }
  function updateProgress() {
    S.missions.forEach(function (m) {
      if (m.status !== 'running') return;
      var bar = $('[data-mp="' + m.id + '"]'); if (!bar) return;
      bar.style.width = Math.round(m.elapsed / m.total * 100) + '%';
      var card = bar.closest('.mcard'), cur = Math.min(3, Math.floor(m.elapsed / (m.total / 4)));
      $$('.steps li', card).forEach(function (li, i) { li.className = i < cur ? 'done' : i === cur ? 'now' : ''; });
    });
  }

  /* ---------- alerts view ---------- */
  function alertCard(a) {
    var open = a.status === 'open', robot = a.robot;
    var alPrefix = (a.site === 'gs' && (I[lang]['al.' + a.type + '.gs.title'] != null || I.ar['al.' + a.type + '.gs.title'] != null)) ? 'al.' + a.type + '.gs.' : 'al.' + a.type + '.';
    var alVars = { v: a.v, thr: a.thr || '', site: t('lv_wx_site_' + (WX_OF[a.site] || 'nkc')), robot: robot };
    var h = '<article class="card alert sev-' + a.sev + (open ? '' : ' closed') + (a.live ? ' is-live' : '') + '" data-a="' + a.id + '"><header>' + (a.live ? '<span class="live-badge"><i></i>LIVE / حي</span>' : '<span class="sim-tag">' + esc(t('lv_sim_tag')) + '</span>') + '<span class="chip sev">' + esc(t('sev.' + a.sev)) + '</span><b>' + esc(t(alPrefix + 'title')) + '</b>' +
      '<span class="tiny muted">' + esc(t('site.' + a.site)) + ' · ' + ltr(fClock(a.ts)) + ' · ' + ltr(a.id) + '</span></header>' +
      '<p class="small">' + esc(t(alPrefix + 'detail', alVars)) + '</p>' +
      '<div class="draft"><h4><svg class="ico"><use href="#i-bolt"/></svg>' + esc(t('al_draft')) + '</h4><p>' + esc(t(alPrefix + 'draft', alVars)) + '</p>';
    if (open) h += '<p class="tiny muted">' + esc(t('al_draft_note')) + '</p><div class="acts"><button class="btn btn-primary" type="button" data-aa="' + a.id + '"><svg class="ico"><use href="#i-check"/></svg>' + esc(t('al_approve')) + '</button>' +
      '<button class="btn btn-ghost" type="button" data-ad="' + a.id + '">' + esc(t('al_dismiss')) + '</button></div>';
    else h += '<p class="tiny ' + (a.status === 'dispatched' ? 'ok-t' : 'muted') + '">' + esc(t(a.status === 'dispatched' ? 'al_st_dispatched' : 'al_st_dismissed')) + ' — ' + esc(actorText(a.by)) + ' · ' + ltr(fClock(a.tDecided)) + (a.missionId ? ' · ' + ltr(a.missionId) : '') + '</p>';
    return h + '</div></article>';
  }
  function renderAlerts() {
    var open = S.alerts.filter(function (a) { return a.status === 'open'; }), closed = S.alerts.filter(function (a) { return a.status !== 'open'; });
    $('#alerts').innerHTML = '<h2 class="sec">' + esc(t('al_open')) + ' <span class="count">' + open.length + '</span></h2>' +
      (open.length ? open.map(alertCard).join('') : '<p class="empty muted">' + esc(t('al_none')) + '</p>') +
      (closed.length ? '<h2 class="sec">' + esc(t('al_closed')) + ' <span class="count">' + closed.length + '</span></h2>' + closed.map(alertCard).join('') : '');
    $$('[data-aa]').forEach(function (b) { b.addEventListener('click', function () { approveAlert(b.getAttribute('data-aa')); }); });
    $$('[data-ad]').forEach(function (b) { b.addEventListener('click', function () { dismissAlert(b.getAttribute('data-ad')); }); });
  }

  /* ---------- audit view ---------- */
  function renderAudit() {
    var fs = [['all', 'au_all'], ['system', 'au_system'], ['robot', 'au_robot'], ['human', 'au_human']];
    $('#au-filter').innerHTML = fs.map(function (f) { return '<button type="button" class="chip-b" data-f="' + f[0] + '" aria-pressed="' + (S.auFilter === f[0]) + '">' + esc(t(f[1])) + '</button>'; }).join('');
    $$('#au-filter button').forEach(function (b) { b.addEventListener('click', function () { S.auFilter = b.getAttribute('data-f'); renderAudit(); }); });
    var rows = S.log.filter(function (e) { return S.auFilter === 'all' || actorKind(e.actor) === S.auFilter; });
    $('#au-table').innerHTML = '<thead><tr><th scope="col">' + esc(t('au_time')) + '</th><th scope="col">' + esc(t('au_actor')) + '</th><th scope="col">' + esc(t('au_action')) + '</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (e) {
        return '<tr class="k-' + actorKind(e.actor) + '"><td data-l="' + esc(t('au_time')) + '">' + ltr(fDT(e.ts)) + '</td><td data-l="' + esc(t('au_actor')) + '"><span class="actor">' + esc(actorText(e.actor)) + '</span></td><td data-l="' + esc(t('au_action')) + '">' + logText(e, true) + '</td></tr>';
      }).join('') : '<tr><td colspan="3" class="muted">' + esc(t('au_empty')) + '</td></tr>') + '</tbody>';
  }
  function downloadBlob(name, type, content) {
    var b = new Blob([content], { type: type }), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
  }
  function exportCsv() {
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var lines = [[t('au_time'), t('au_actor'), t('au_action')].map(q).join(',')].concat(S.log.slice().reverse().map(function (e) { return [fDT(e.ts), actorText(e.actor), logText(e, false)].map(q).join(','); }));
    downloadBlob('aicore-robotics-audit-simulation.csv', 'text/csv;charset=utf-8', '\ufeff' + lines.join('\r\n'));
  }

  /* ---------- report ---------- */
  var lastFocus = null, openRid = null;
  function reportBody(m) {
    var site = t('site.' + m.site), attn = m.findings.some(function (f) { return f.attn; });
    var fv = function (v) { return v.k ? t(v.k) : v.s; };
    return '<div class="rp-sim">SIMULATION / عرض تجريبي - بيانات افتراضية</div>' +
      '<header class="rp-h"><div><div class="rp-brand">AICore Robotics Ops</div><h1 id="rp-h">' + esc(t('rp_title')) + ' ' + ltr(m.id) + '</h1></div><div class="rp-date">' + ltr(fDT(m.tEnd)) + '</div></header>' +
      '<h2>' + esc(t('rp_meta')) + '</h2><table class="rp-t"><tbody>' +
      '<tr><th scope="row">' + esc(t('mi_title')) + '</th><td>' + esc(t('tpl.' + m.tpl + '.name')) + '</td></tr>' +
      '<tr><th scope="row">' + esc(t('site')) + '</th><td>' + esc(site) + '</td></tr>' +
      '<tr><th scope="row">' + esc(t('robot')) + '</th><td>' + ltr(m.robot) + ' — ' + esc(t('robot_type')) + '</td></tr></tbody></table>' +
      '<h2>' + esc(t('rp_summary')) + '</h2><p class="rp-sum ' + (attn ? 'attn' : 'ok') + '">' + esc(t(attn ? 'rp_sum_attn' : 'rp_sum_ok')) + '</p>' +
      '<h2>' + esc(t('rp_find')) + '</h2><table class="rp-t rp-f"><thead><tr><th>' + esc(t('rp_item')) + '</th><th>' + esc(t('rp_value')) + '</th><th>' + esc(t('rp_status')) + '</th></tr></thead><tbody>' +
      m.findings.map(function (f) { return '<tr><td>' + esc(t(f.k)) + '</td><td>' + (f.v.s ? ltr(f.v.s) : esc(fv(f.v))) + '</td><td class="' + (f.attn ? 'attn' : 'ok') + '">' + esc(t(f.attn ? 'rp_attn' : 'rp_ok')) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h2>' + esc(t('rp_steps')) + '</h2><ol class="rp-steps">' + [1, 2, 3, 4].map(function (i) { return '<li>' + esc(t('tpl.' + m.tpl + '.s' + i)) + '</li>'; }).join('') + '</ol>' +
      '<h2>' + esc(t('rp_chain')) + '</h2><table class="rp-t"><tbody>' +
      '<tr><th scope="row">' + esc(t('rp_proposed')) + '</th><td>' + esc(t('actor.system')) + ' · ' + ltr(fDT(m.tProposed)) + '</td></tr>' +
      '<tr><th scope="row">' + esc(t('rp_approved')) + '</th><td>' + esc(actorText(m.by)) + ' · ' + ltr(fDT(m.tDecided)) + '</td></tr>' +
      '<tr><th scope="row">' + esc(t('rp_started')) + '</th><td>' + ltr(fDT(m.tStart)) + '</td></tr>' +
      '<tr><th scope="row">' + esc(t('rp_completed')) + '</th><td>' + ltr(fDT(m.tEnd)) + '</td></tr></tbody></table>' +
      (m.site === 'gs' ? '<h2>' + esc(t('dp_assets')) + '</h2><ul>' + ['name_dish', 'name_ku', 'name_hpa', 'name_idu', 'name_ups', 'name_badr'].map(function (k) { return '<li>' + esc(t(k)) + (k === 'name_badr' ? ' — ' + esc(t('dp_badr_note')) : '') + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="rp-disc">' + esc(t('geo_note')) + '<br>' + esc(t('rp_disclaimer')) + '<br>' + esc(t('rp_clock', { tz: tzAbbr(m.tEnd) + (tzName() ? ' (' + tzName() + ')' : '') })) + '</p><p class="rp-foot">AICore Digital LLC · Richmond, VA · aicoredigital.com · +1 804 485 3384</p>';
  }
  function openReport(id, opener) {
    var m = S.missions.filter(function (x) { return x.id === id; })[0]; if (!m || m.status !== 'done') return;
    openRid = id; lastFocus = opener || document.activeElement;
    $('#paper').innerHTML = reportBody(m);
    var ov = $('#report'); ov.hidden = false; document.body.classList.add('rp-open'); ov.scrollTop = 0; $('#rp-close').focus();
  }
  function closeReport() { $('#report').hidden = true; document.body.classList.remove('rp-open'); openRid = null; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
  var PAPER_CSS = 'body{font:15px/1.6 system-ui,Tahoma,Arial,sans-serif;color:#111;margin:24px auto;max-width:780px;padding:0 16px}h1{font-size:22px;margin:4px 0}h2{font-size:15px;margin:20px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 9px;text-align:start;font-size:14px}th{background:#f2f2f6}.rp-sim{border:2px dashed #b00;color:#b00;text-align:center;font-weight:700;padding:6px;margin-bottom:14px}.rp-h{display:flex;justify-content:space-between;align-items:flex-end}.rp-brand{font-weight:700;color:#7a1fd0}.attn{color:#b45309;font-weight:700}.ok{color:#047857}.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}.rp-disc{font-size:12px;color:#555;margin-top:18px}.rp-foot{font-size:12px;color:#777}';
  function downloadReport() {
    if (!openRid) return;
    var doc = '<!doctype html><html lang="' + lang + '" dir="' + (lang === 'ar' ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(t('rp_title')) + ' ' + openRid + ' (SIMULATION)</title><style>' + PAPER_CSS + '</style></head><body>' + $('#paper').innerHTML + '</body></html>';
    downloadBlob('mission-' + openRid + '-report-simulation.html', 'text/html;charset=utf-8', doc);
  }

  /* ---------- roadmap ---------- */
  function renderRoadmap() {
    var fit = [['i-robot', 'fit_hw', 'fit_hw_b', 'dim'], ['i-shield', 'fit_int', 'fit_int_b', 'seek'], ['i-bolt', 'fit_sw', 'fit_sw_b', 'us'], ['i-check', 'fit_op', 'fit_op_b', 'op']];
    var ph = [1, 2, 3].map(function (n) {
      return '<article class="card phase ph' + n + (n === 1 ? ' now' : '') + '"><div class="ph-n">' + n + '</div><span class="chip ' + (n === 1 ? 'c-ok' : n === 2 ? 'c-mis' : 'c-dim') + '">' + esc(t('ph' + n + '_tag')) + '</span><h3>' + esc(t('ph' + n + '_t')) + '</h3><ul>' +
        [1, 2, 3, 4].map(function (i) { return '<li>' + esc(t('ph' + n + '_' + i)) + '</li>'; }).join('') + '</ul></article>';
    }).join('');
    $('#roadmap').innerHTML = '<h2 class="sec">' + esc(t('fit_title')) + '</h2><div class="fit">' +
      fit.map(function (f, i) { return '<div class="fit-i f-' + f[3] + '"><svg class="ico"><use href="#' + f[0] + '"/></svg><b>' + esc(t(f[1])) + '</b><span class="small muted">' + esc(t(f[2])) + '</span></div>' + (i < fit.length - 1 ? '<i class="fit-ar" aria-hidden="true"></i>' : ''); }).join('') + '</div>' +
      '<div class="phases">' + ph + '</div>' +
      '<section class="card partner"><div><h2>' + esc(t('partner_t')) + '</h2><p>' + esc(t('partner_b')) + '</p></div><a class="btn btn-wa" href="' + waHref() + '" target="_blank" rel="noopener"><svg class="ico"><use href="#i-wa"/></svg>' + esc(t('partner_cta')) + '</a></section>' + '<div id="roles-road"></div>';
    $('#roles-road').innerHTML = rolesHTML();
  }
  function waHref() { return D.whatsapp + '?text=' + encodeURIComponent(t('ct_wa_text')); }

  /* ---------- routing / language ---------- */
  var routes = ['dashboard', 'missions', 'alerts', 'audit', 'roadmap'];
  function route() {
    var r = (location.hash.replace(/^#\/?/, '') || 'dashboard'); if (routes.indexOf(r) < 0) r = 'dashboard';
    S.route = r;
    $$('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== r; });
    $$('#nav a').forEach(function (a) { if (a.getAttribute('data-route') === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (r === 'dashboard') { startLoop(); updatePositions(); } else stopLoop();
    window.scrollTo(0, 0);
  }
  function applyStatic() {
    var L = I[lang];
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = L.page_title;
    $$('[data-i18n]').forEach(function (e) { e.textContent = t(e.getAttribute('data-i18n')); });
    $$('[data-i18n-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.getAttribute('data-i18n-aria'))); });
    $('#lang-t').textContent = L.lang_btn; $('#lang').setAttribute('aria-label', L.lang_aria);
    $('#wa').href = waHref();
    $$('[data-3d]').forEach(function (e) { e.href = '3d/?lang=' + lang; });
    var sel = $('#op'); sel.innerHTML = D.ops.map(function (o) { return '<option value="' + o + '">' + esc(opName(o)) + '</option>'; }).join(''); sel.value = S.op;
    sel.setAttribute('aria-label', t('operator'));
  }
  function renderAll() {
    applyStatic(); buildMap(); renderSiteTabs(); renderPlanHead(); renderPlan(); renderRobotList(); renderKpis();
    $('#roles-dash').innerHTML = rolesHTML(); $('#roles-audit').innerHTML = rolesHTML();
    renderTemplates(); renderBoard(); renderAlerts(); renderAudit(); renderRoadmap(); renderNavDots(); renderWeather(); renderPointing();
    if (openRid) { var m = S.missions.filter(function (x) { return x.id === openRid; })[0]; if (m) $('#paper').innerHTML = reportBody(m); }
  }
  function setLang(l) {
    lang = l; try { localStorage.setItem('aicore-robots-lang', l); } catch (e) {}
    renderAll();
  }

  /* ---------- init ---------- */
  function resetDemo() { S = freshState(); seed(); renderAll(); route(); toast(t('toast_reset')); checkAdvisories(); }
  function init() {
    var q = /[?&]lang=(ar|fr|en)/.exec(location.search), saved = null;
    try { saved = localStorage.getItem('aicore-robots-lang'); } catch (e) {}
    lang = q ? q[1] : (saved === 'fr' || saved === 'ar' || saved === 'en' ? saved : 'ar');
    S = freshState(); buildRoutes(); seed(); renderAll();
    $('#lang').addEventListener('click', function () { setLang(lang === 'ar' ? 'fr' : lang === 'fr' ? 'en' : 'ar'); });
    var geoBanner = $('#geo-banner'), geoChip = $('#geo-chip');
    if (geoChip && geoBanner) geoChip.addEventListener('click', function () {
      var open = geoBanner.classList.toggle('is-open');
      geoChip.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('#op').addEventListener('change', function (e) { S.op = e.target.value; toast(t('lv_op_set', { n: opName(S.op, true) })); });
    $('#wx-refresh').addEventListener('click', function () { toast(t('lv_wx_refreshing')); WX.fetchNow().then(function () { toast(WX.get('nkc').ok ? t('lv_wx_refreshed') : t('lv_wx_unavail')); }); });
    $('#wx-thr').addEventListener('change', function (e) { WX.setWindThreshold(e.target.value); toast(t('lv_saved')); e.target.value = WX.windThreshold(); checkWind(); renderWeather(); });
    $('#wx-rain').addEventListener('change', function (e) { WX.setRainThreshold(e.target.value); toast(t('lv_saved')); e.target.value = WX.rainThreshold(); checkRain(); renderWeather(); });
    $('#sat-sel').addEventListener('change', function (e) {
      var v = parseFloat(e.target.value);
      if (GEO.SAT_LONS.indexOf(v) < 0) return;
      try { localStorage.setItem(LS_SAT, String(v)); } catch (err) { /* ignore */ }
      renderPointing();
    });
    WX.onChange(function () { renderWeather(); checkAdvisories(); });
    setInterval(renderWeather, 30000);
    var q2 = /[?&]wxms=(\d+)/.exec(location.search); WX.start(q2 ? { refreshMs: +q2[1] } : {});
    $('#reset').addEventListener('click', resetDemo);
    $('#sim-alert').addEventListener('click', function () { nextAlert(false); });
    $('#csv').addEventListener('click', exportCsv);
    $('#rp-print').addEventListener('click', function () { window.print(); });
    $('#rp-dl').addEventListener('click', downloadReport);
    $('#rp-close').addEventListener('click', closeReport);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#report').hidden) closeReport(); });
    window.addEventListener('hashchange', route);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopLoop(); else if (S.route === 'dashboard') startLoop(); });
    route(); setInterval(tick, 1000); $('#clock').textContent = fClock(Date.now());
    window.__demo = { state: function () { return S; }, lang: function () { return lang; } }; // read-only handle for the test script
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

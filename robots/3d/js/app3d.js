/* AICore Robotics Ops 3D — SIMULATION + LIVE. Application logic: human-in-the-loop missions, rule-based command parser UI,
   simulated alerts, audit log, reports. 100% client-side. Network calls: Open-Meteo weather (assets/js/weather.js); map tiles
   (OpenStreetMap or Esri) only while the Map view is open, current view only; and, if the user configures it, their own Supabase
   sensor table (live3d.js). Camera video stays on the device. EXAMPLE pins, robots and tasks stay fictional (SIMULATION). */
import { LAYOUT } from './layout.js';

const I = window.I18N3D, NLP = window.NLP3D;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ltr = s => '<bdi class="ltr">' + esc(s) + '</bdi>';
const qs = new URLSearchParams(location.search);
const SPEED = Math.max(0.5, Math.min(8, parseFloat(qs.get('speed')) || 1));   // hidden test aid, default 1
const LS_LANG = 'aicore-robots-lang';
const SUPPORTED = ['ar', 'fr', 'en'];
let lang = 'ar';
{ let saved = null; try { saved = localStorage.getItem(LS_LANG); } catch (e) { /* ignore */ }
  const ql = qs.get('lang'); lang = SUPPORTED.includes(ql) ? ql : SUPPORTED.includes(saved) ? saved : 'ar'; }

function t(k, v, L) {
  const d = I[L || lang], s = (d && d[k] != null) ? d[k] : (I.en[k] != null ? I.en[k] : k);
  return v ? s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)) : s;
}

/* ---------- ONE clock for the whole page: browser local time + visible timezone abbreviation ---------- */
const TZF = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' });
const p2 = n => (n < 10 ? '0' : '') + n;
function tzAbbr(ts) { try { const p = TZF.formatToParts(new Date(ts)).find(x => x.type === 'timeZoneName'); return p ? p.value : 'UTC'; } catch (e) { return 'UTC'; } }
function fT(ts) { const d = new Date(ts); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
function fDT(ts) { const d = new Date(ts); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + fT(ts) + ' ' + tzAbbr(ts); }
function fISO(ts) { const d = new Date(ts), o = -d.getTimezoneOffset(), a = Math.abs(o);
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + fT(ts) + (o >= 0 ? '+' : '-') + p2(Math.floor(a / 60)) + ':' + p2(a % 60); }
function fClock(ts) { return fT(ts) + ' ' + tzAbbr(ts); }

function rngFor(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const between = (r, a, b) => a + r() * (b - a);
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);

/* ---------- state ---------- */
const ROLES = ['operator', 'engineer'];
let S, SC = null, webgl = false, fbPos = {}, LV = null;
const ROBOT_IDS = ['R-01', 'R-02'];
function freshState() {
  return {
    role: S ? S.role : 'operator', tab: S ? S.tab : 'missions', epoch: S ? S.epoch + 1 : 1, nextM: 1001, nextA: 301, nextD: 1, nextTok: 1,
    missions: [], alerts: [], log: [], lastCmd: null, feed: S ? S.feed : (qs.get('feed') !== '0'), report: null, sinceAlert: 0,
    robots: { 'R-01': { id: 'R-01', batt: 82, state: 'docked', mission: null }, 'R-02': { id: 'R-02', batt: 58, state: 'docked', mission: null } },
    cap: '', progress: 0
  };
}
function addLog(actor, action, args, ts) { S.log.unshift({ ts: ts || Date.now(), actor, action, args: args || {} }); }
const roleName = (r, L) => t('role_' + r, null, L);
function actorText(a, L) { if (a === 'system') return t('actor_system', null, L); if (a.startsWith('role:')) return roleName(a.slice(5), L); if (a.startsWith('robot:')) return a.slice(6); return a; }
function actorKind(a) { return a === 'system' ? 'system' : a.startsWith('robot:') ? 'robot' : 'human'; }
function kindName(k, L) { return t('k_' + k, null, L); }

/* ---------- mission model ---------- */
function mkToken(m) {
  let h = 2166136261; const s = m.kind + (m.target || '') + (m.text || '') + m.num;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return 'DRAFT-' + String(S.nextTok++).padStart(4, '0') + '-' + h.toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
}
function preferredRobot(kind) {
  const order = kind === 'night' ? ['R-02', 'R-01'] : ['R-01', 'R-02'];
  return order.find(id => S.robots[id].state === 'docked' && S.robots[id].batt >= 25) || order[0];
}
function newMission(o) {
  const m = Object.assign({ id: 'M-' + (S.nextM++), num: S.nextM, kind: 'dish', target: null, flags: { drift: false, hot: false }, src: 'template', alertId: null, text: '', sev: null,
    status: 'awaiting', tProposed: Date.now(), tDecided: null, by: null, tStart: null, tInspect: null, tEnd: null, findings: null, readings: null }, o);
  m.robot = preferredRobot(m.kind); m.token = mkToken(m);
  S.missions.unshift(m); return m;
}
const CAB_ROLE = { A: 'name_idu', B: 'name_hpa', C: 'name_ups' };
const cabRole = (c, L) => t(CAB_ROLE[c] || 'name_idu', null, L);
const cabAsset = (c, L) => c ? t('asset_cab', { c, role: cabRole(c, L) }, L) : t('asset_cabs', null, L);
const dishLike = k => k === 'dish' || k === 'rain';
function threatOf(m) {
  if (m.sev) return m.sev;
  if (m.kind === 'rain') return 'medium';
  if (m.kind === 'dish') return m.flags.drift ? 'medium' : 'low';
  if (m.kind === 'thermal') return m.flags.hot ? 'high' : (m.target === 'B' ? 'medium' : 'low');
  return m.kind === 'night' ? 'medium' : 'low';
}
function plan(m, L) {
  const c = m.target || '';
  const asset = m.kind === 'rain' ? t('asset_ku', null, L) : m.kind === 'dish' ? t('asset_dish', null, L) : m.kind === 'thermal' ? (m.target ? cabAsset(c, L) : t('asset_cabs', null, L)) : m.kind === 'perimeter' ? t('asset_fence', null, L) : t('asset_fence_night', null, L);
  const an = m.kind === 'rain' ? 'an_rain' : m.kind === 'dish' ? (m.flags.wind ? 'an_dish_wind' : m.flags.drift ? 'an_dish_drift' : 'an_dish') : m.kind === 'thermal' ? (m.ctx && m.ctx.temp != null ? 'an_thermal_sensor' : m.flags.hot ? 'an_thermal_hot' : m.target ? 'an_thermal_cab' : 'an_thermal') : m.kind === 'perimeter' ? 'an_perimeter' : (m.flags.cam ? 'an_night_cam' : 'an_night');
  const payload = { dish: ['zoom'], rain: ['zoom'], thermal: ['thermal', 'ultra'], perimeter: ['zoom', 'ultra'], night: ['thermal', 'zoom'] }[m.kind];
  const pathKey = dishLike(m.kind) ? 'dish' : m.kind;
  return { threat: threatOf(m), asset, analysis: t(an, { c, v: m.ctx && m.ctx.temp != null ? f1(m.ctx.temp) : '', w: m.ctx && m.ctx.w != null ? m.ctx.w : '' }, L), path: t('path_' + pathKey, { c: c || 'A–C', r: m.robot }, L), payload: payload.map(p => t('pl_' + p, null, L)).join(' + ') };
}
function auditTrail(m, L) {
  const out = [m.status === 'awaiting' ? t('audit_draft_pending', { tok: m.token }, L) : t('audit_draft_done', { tok: m.token }, L)];
  if (m.status === 'running' || m.status === 'done') out.push(t('audit_approved', { who: actorText(m.by, L), time: fClock(m.tDecided) }, L));
  if (m.status === 'rejected') out.push(t('audit_rejected', { who: actorText(m.by, L), time: fClock(m.tDecided) }, L));
  if (m.status === 'done') out.push(t('audit_done', { time: fClock(m.tEnd) }, L));
  return out;
}
function cardFields(m, L) {
  const p = plan(m, L);
  return '<dl class="card-f">' +
    '<div><dt>' + esc(t('f_threat', null, L)) + '</dt><dd><span class="threat th-' + p.threat + '">' + esc(t('th_' + p.threat, null, L)) + '</span></dd></div>' +
    '<div><dt>' + esc(t('f_asset', null, L)) + '</dt><dd>' + esc(p.asset) + '</dd></div>' +
    '<div class="wide"><dt>' + esc(t('f_analysis', null, L)) + '</dt><dd>' + esc(p.analysis) + '</dd></div>' +
    '<div class="wide"><dt>' + esc(t('f_path', null, L)) + '</dt><dd>' + esc(p.path) + '</dd></div>' +
    '<div><dt>' + esc(t('f_payload', null, L)) + '</dt><dd>' + esc(p.payload) + '</dd></div>' +
    '<div class="wide"><dt>' + esc(t('f_audit', null, L)) + '</dt><dd>' + auditTrail(m, L).map(x => '<span class="at">' + esc(x) + '</span>').join('') + '</dd></div></dl>';
}

function propose(o) {
  const m = newMission(o);
  addLog('system', o.src === 'command' ? 'cmd_draft' : o.src === 'alert' ? 'alert_draft' : 'propose', { id: m.id, kind: m.kind, target: m.target || '', robot: m.robot, text: m.text, tok: m.token, alert: m.alertId || '' });
  toast(t('toast_proposed'));
  afterChange();
  if (window.matchMedia('(max-width: 900px)').matches) { const v = $('#view'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  return m;
}
function approve(id) {
  const m = S.missions.find(x => x.id === id); if (!m || m.status !== 'awaiting') return;
  const order = m.kind === 'night' ? ['R-02', 'R-01'] : ['R-01', 'R-02'];
  const rid = (S.robots[m.robot].state === 'docked' && S.robots[m.robot].batt >= 25) ? m.robot : order.find(x => S.robots[x].state === 'docked' && S.robots[x].batt >= 25);
  if (!rid) { toast(t('toast_norobot')); return; }
  m.robot = rid; m.status = 'running'; m.by = 'role:' + S.role;
  m.tDecided = m.tStart = Date.now();
  m.readings = makeReadings(m);
  S.robots[rid].mission = m.id; S.robots[rid].state = 'walking';
  addLog(m.by, 'approve', { id: m.id, kind: m.kind, robot: rid }, m.tDecided);
  addLog('robot:' + rid, 'start', { id: m.id }, m.tStart);
  toast(t('toast_approved'));
  afterChange(); run(m);
}
function reject(id) {
  const m = S.missions.find(x => x.id === id); if (!m || m.status !== 'awaiting') return;
  m.status = 'rejected'; m.by = 'role:' + S.role; m.tDecided = Date.now();
  addLog(m.by, 'reject', { id: m.id, kind: m.kind, robot: m.robot }, m.tDecided);
  toast(t('toast_rejected')); afterChange();
}

/* ---------- readings / findings (deterministic per mission) ---------- */
function makeReadings(m) {
  const r = rngFor(m.num * 7919 + 13), ok = (k, v) => ({ k, v, attn: false });
  const f = [];
  if (dishLike(m.kind)) {
    /* the look angles come from the real geometry (assets/js/geo.js); the robot's "measurement" error is simulated unless the operator entered a real measured azimuth */
    const pt = LV ? LV.pointing() : null, ctx = m.ctx || {};
    const baseAz = pt ? pt.az : between(r, 178, 186), baseEl = pt ? pt.el : between(r, 40.5, 43.5);
    let err, az;
    if (m.flags.drift && ctx.dev != null) { err = Math.abs(ctx.dev); az = ctx.measured; }
    else { err = m.flags.drift ? between(r, 1.4, 2.6) : between(r, 0.1, 0.4); az = baseAz + (r() < 0.5 ? -err : err); }
    m.az = { az: az.toFixed(1), el: baseEl.toFixed(1), err: err.toFixed(1), ref: baseAz.toFixed(1) };
    f.push({ k: 'f_azerr', v: m.az.err + '°', attn: err > 0.5 }, ok('f_azimuth', m.az.az + '°'), ok('f_elev', m.az.el + '°'));
    if (m.flags.wind) f.push({ k: 'f_windload', v: (ctx.w != null ? ctx.w + ' km/h' : '—') + (ctx.g != null && ctx.g !== '—' ? ' / ' + ctx.g + ' km/h' : ''), attn: false, live: true });
    if (m.kind === 'rain' || m.flags.rain) {
      if (ctx.rain != null) f.push({ k: 'f_rain', v: ctx.rain + ' mm', attn: true, live: true });
      f.push({ k: 'f_ku', v: 'v_ku_sensitive', attn: true, simNote: true });
      f.push({ k: 'f_cband', v: 'v_cband_ok', attn: false, simNote: true });
    }
    f.push(ok('f_mount', 'v_tight'), ok('f_cables', 'v_intact'));
  } else if (m.kind === 'thermal') {
    const tm = { A: Math.round(between(r, 38, 44)), B: Math.round(m.flags.hot ? between(r, 61, 67) : between(r, 46, 52)), C: Math.round(between(r, 37, 45)) };
    const rd = LV && LV.cabReading(m.target || LV.sensorCab()) || (LV && !m.target ? LV.cabReading(LV.sensorCab()) : null);
    m.tempKinds = {};
    if (rd) { const c = LV.sensorCab(); tm[c] = Math.round(rd.temp * 10) / 10; m.tempKinds[c] = rd.kind; }
    m.temps = m.target ? { [m.target]: tm[m.target] } : tm;
    Object.keys(m.temps).forEach(c => { const kind = m.tempKinds[c] || null, lim = kind ? LV.sensorThr() : 55; f.push({ k: 'f_cab' + c, v: m.temps[c] + ' °C', attn: m.temps[c] >= lim, live: kind === 'live', simSensor: kind === 'sim' }); });
    f.push(ok('f_vents', 'v_clear'));
  } else {
    f.push(ok('f_fence', 'v_intact'), ok('f_gate', 'v_closed'));
    if (m.kind === 'night') f.push(ok('f_thermalcam', 'v_active'), ok('f_motion', m.flags.cam ? 'v_cam_person' : 'v_none'));
  }
  return f;
}

/* ---------- route planning (metres, same coordinates as the 3D scene) ---------- */
const CABX = { A: -8, B: -5.5, C: -3 };
function routeFor(m) {
  const rid = m.robot, d = LAYOUT.docks[rid], dock = { x: d.x, z: d.z }, Y = LAYOUT.dockYaw;
  const rev = a => a.slice().reverse().concat([dock]);
  if (dishLike(m.kind)) {
    const out = [{ x: -8.6, z: 1.8 }, { x: -3, z: 1.2 }, { x: 3.7, z: -0.9 }], face = Math.atan2(2.1, 3.3);
    return [{ t: 'walk', pts: out, face, cap: 'cap_to_dish', st: 'walking' }, { t: 'pause', secs: 5.5, fx: 'dish', cap: 'cap_az' }, { t: 'walk', pts: rev(out.slice(0, -1)), face: Y, cap: 'cap_return', st: 'returning' }];
  }
  if (m.kind === 'thermal') {
    const tx = m.target ? CABX[m.target] : -5.5, tz = m.target ? -2.3 : -1.8, out = [{ x: -8.6, z: 1.8 }, { x: tx, z: tz }];
    return [{ t: 'walk', pts: out, face: Math.PI / 2, cap: 'cap_to_cab', st: 'walking' }, { t: 'pause', secs: 5.5, fx: 'thermal', cap: 'cap_thermal' }, { t: 'walk', pts: rev(out.slice(0, -1)), face: Y, cap: 'cap_return', st: 'returning' }];
  }
  const back = rid === 'R-01' ? [{ x: -7.5, z: 7.4 }, { x: -7.5, z: 3.5 }, dock] : [{ x: -7.5, z: 7.4 }, { x: -7.5, z: 0.2 }, dock];
  if (m.kind === 'perimeter') {
    const loop = [{ x: -12.4, z: 2 }, { x: -12.4, z: -7.4 }, { x: 12.4, z: -7.4 }, { x: 12.4, z: 7.4 }, { x: 0, z: 7.4 }];
    return [{ t: 'walk', pts: loop, face: -Math.PI / 2, cap: 'cap_fence', st: 'walking' }, { t: 'pause', secs: 3, fx: 'gate', cap: 'cap_gate' }, { t: 'walk', pts: back, face: Y, cap: 'cap_return', st: 'returning' }];
  }
  const first = [{ x: -7.5, z: 7.4 }, { x: 0, z: 7.4 }], rest = [{ x: 12.4, z: 7.4 }, { x: 12.4, z: -7.4 }, { x: -12.4, z: -7.4 }, { x: -12.4, z: 2 }];
  return [{ t: 'walk', pts: first, face: -Math.PI / 2, cap: 'cap_night', st: 'walking', night: true }, { t: 'pause', secs: 3, fx: 'gate', cap: 'cap_gate', night: true },
    { t: 'walk', pts: rest, face: null, cap: 'cap_night2', st: 'walking', night: true }, { t: 'walk', pts: [dock], face: Y, cap: 'cap_return', st: 'returning', night: true }];
}
const WALK_SPEED = 2.6;
function estSecs(steps, start) {
  let px = start.x, pz = start.z, tot = 0;
  steps.forEach(s => { if (s.t === 'pause') s.est = s.secs; else { let L = 0; s.pts.forEach(p => { L += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; }); s.est = L / WALK_SPEED; } tot += s.est; });
  return tot;
}

/* ---------- movement backend: Three.js scene or timer fallback ---------- */
function walk(rid, pts, o) {
  if (SC) return SC.walk(rid, pts, { speed: WALK_SPEED, onProgress: o.onProgress, finalYaw: o.finalYaw });
  return new Promise(res => {
    let p = fbPos[rid], i = 0, done = 0, total = 0, px = p.x, pz = p.z; pts.forEach(q => { total += Math.hypot(q.x - px, q.z - pz); px = q.x; pz = q.z; });
    const ep = S.epoch, iv = setInterval(() => {
      if (S.epoch !== ep) { clearInterval(iv); return; }
      let step = WALK_SPEED * SPEED * 0.04;
      while (step > 0 && i < pts.length) { const dx = pts[i].x - p.x, dz = pts[i].z - p.z, d = Math.hypot(dx, dz); if (d <= step) { p.x = pts[i].x; p.z = pts[i].z; step -= d; done += d; i++; } else { p.x += dx / d * step; p.z += dz / d * step; done += step; step = 0; } }
      p.yaw = o.finalYaw; o.onProgress && o.onProgress(Math.min(1, done / Math.max(0.1, total)));
      if (i >= pts.length) { clearInterval(iv); res(true); }
    }, 40);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(m) {
  const ep = S.epoch, rid = m.robot, rb = S.robots[rid], steps = routeFor(m), start = LAYOUT.docks[rid];
  const total = estSecs(steps, start); let doneEst = 0;
  const alive = () => S.epoch === ep;
  if (SC && steps.some(s => s.night)) SC.setNight(true);
  for (const s of steps) {
    if (!alive()) return;
    S.cap = s.cap; S.capMission = m.id;
    if (s.t === 'walk') {
      rb.state = s.st; SC && SC.setMode(rid, 'walk'); renderRobotBits(); renderHud();
      await walk(rid, s.pts, { finalYaw: s.face, onProgress: f => { setProgress(m, (doneEst + f * s.est) / total); } });
      if (!alive()) return;
      doneEst += s.est;
    } else {
      rb.state = 'inspecting'; renderRobotBits(); renderHud();
      m.tInspect = m.tInspect || Date.now();
      startFx(m, s.fx, rid);
      addLog('robot:' + rid, 'inspect', { id: m.id, fx: s.fx }, Date.now());
      renderAudit();
      const t0 = performance.now(), dur = s.secs * 1000 / SPEED;
      while (performance.now() - t0 < dur) { await sleep(120); if (!alive()) return; setProgress(m, (doneEst + Math.min(1, (performance.now() - t0) / dur) * s.est) / total); }
      stopFx(rid); doneEst += s.est;
    }
  }
  if (!alive()) return;
  complete(m);
}
function setProgress(m, f) { m.progress = Math.max(m.progress || 0, Math.min(1, f)); S.progress = m.progress; const w = Math.round(m.progress * 100) + '%'; $$('[data-mp="' + m.id + '"]').forEach(b => { b.style.width = w; }); $$('[data-mpt="' + m.id + '"]').forEach(b => { b.textContent = w; }); }

/* visual effects bound to the inspection pause */
function startFx(m, fx, rid) {
  if (SC) SC.setMode(rid, 'scan');
  if (fx === 'dish') { if (SC) { SC.setBeam(rid); SC.setLocked(true); } showAz(m); }
  else if (fx === 'thermal') { if (SC) SC.setHeat(m.temps); showHeat(m); }
  else if (fx === 'gate') { showGate(); }
}
function stopFx(rid) {
  if (SC) { SC.setMode(rid, 'walk'); SC.setBeam(null); SC.setLocked(false); SC.setHeat(null); }
  hideFx();
}
function complete(m) {
  const rid = m.robot, rb = S.robots[rid];
  m.status = 'done'; m.tEnd = Date.now(); m.progress = 1; m.findings = m.readings;
  rb.state = 'docked'; rb.mission = null; S.cap = ''; if (SC) { SC.setMode(rid, 'docked'); SC.setNight(false); }
  addLog('robot:' + rid, 'complete', { id: m.id }, m.tEnd);
  addLog('system', 'report', { id: m.id }, m.tEnd);
  toast(t('toast_done')); afterChange();
  openReport({ type: 'mission', id: m.id });
}

/* ---------- alerts (SIMULATED, generic device names, not real logs) ---------- */
const ALERT_DEFS = {
  snr: { device: 'MODEM-SIM-01', kind: 'dish', sev: 'medium', flags: { drift: false, hot: false }, assetKey: 'name_idu' },
  track: { device: 'ACU-SIM-01', kind: 'dish', sev: 'medium', flags: { drift: true, hot: false }, assetKey: 'name_dish' },
  pa: { device: 'BUC-SIM-A', kind: 'thermal', target: 'B', sev: 'high', flags: { drift: false, hot: true }, assetKey: 'name_hpa' },
  pdu: { device: 'PDU-SIM-02', kind: 'thermal', target: 'C', sev: 'high', flags: { drift: false, hot: false }, assetKey: 'name_ups' }
};
/* LIVE alert types — created only from real inputs (Open-Meteo wind, geometry vs operator-entered azimuth, on-device camera, cabinet sensor). Never part of the simulated feed. */
Object.assign(ALERT_DEFS, {
  wind: { device: 'OPEN-METEO', kind: 'dish', sev: 'medium', flags: { drift: false, hot: false, wind: true }, live: true, assetKey: 'name_dish' },
  rain: { device: 'OPEN-METEO', kind: 'rain', sev: 'medium', flags: { drift: false, hot: false, rain: true }, live: true, assetKey: 'name_ku' },
  drift: { device: 'GEO-CALC', kind: 'dish', sev: 'medium', flags: { drift: true, hot: false }, live: true, assetKey: 'name_dish' },
  person: { device: 'CAM-LOCAL', kind: 'night', sev: 'high', flags: { drift: false, hot: false, cam: true }, live: true },
  cabtemp: { device: 'SENSOR', kind: 'thermal', sev: 'high', flags: { drift: false, hot: true }, live: true }
});
const ALERT_ORDER = ['snr', 'pa', 'track', 'pdu'];
const isLiveAlert = a => !!a.live;
const assetOf = (kind, target, L, assetKey) => assetKey ? t(assetKey, null, L) : kind === 'rain' ? t('name_ku', null, L) : kind === 'dish' ? t('name_dish', null, L) : kind === 'thermal' ? cabAsset(target, L) : kind === 'perimeter' ? t('asset_fence', null, L) : t('asset_fence_night', null, L);
function liveLine(a) {
  const d = a.data || {};
  switch (a.type) {
    case 'wind': return 'WIND=' + d.w + ' km/h  GUST=' + d.g + ' km/h  THRESH=' + d.thr + ' km/h  SRC=open-meteo.com  EVT=WIND_ADVISORY  ASSET=GEO dish (C-band)';
    case 'rain': return 'PRECIP=' + d.rain + ' mm  THRESH=' + d.thr + ' mm  WIND=' + d.w + ' km/h  SRC=open-meteo.com  EVT=RAIN_FADE_ADVISORY  NOTE=C-band resists rain; Ku-band feed/LNB more sensitive';
    case 'drift': return 'AZ_ENTERED=' + f1(d.measured) + ' deg  AZ_COMPUTED=' + f1(d.computed) + ' deg  DEV=' + (d.dev > 0 ? '+' : '') + f1(d.dev) + ' deg  LIMIT=0.50 deg  SRC=geometry+operator input';
    case 'person': return 'CLASS=person  FRAMES=' + d.n + '  SRC=on-device camera (COCO-SSD)  EVT=GATE_PERSON';
    default: return 'CAB_' + d.cab + '_TEMP=' + f1(d.temp) + ' C  THRESH=' + d.thr + ' C  SRC=' + (d.real ? 'sensor device ' + (d.dev || '?') : 'SIMULATED toggle') + '  EVT=CAB_OVER_TEMP';
  }
}
function alertLine(a) {
  const r = rngFor(a.num * 104729 + 7);
  switch (a.type) {
    case 'snr': return 'RX_SNR=' + between(r, 7.5, 9.8).toFixed(1) + ' dB  THRESH=11.0 dB  EVT=LINK_MARGIN_LOW';
    case 'track': return 'TRACK_ERR=' + between(r, 1.4, 2.6).toFixed(2) + ' deg  LIMIT=0.50 deg  EVT=AZ_DRIVE_DRIFT';
    case 'pa': return 'PA_TEMP=' + Math.round(between(r, 68, 74)) + ' C  LIMIT=65 C  EVT=PA_OVER_TEMP';
    default: return 'VIN=' + Math.round(between(r, 188, 199)) + ' V  NOMINAL=230 V  EVT=INPUT_UNDERVOLT';
  }
}
function raiseLiveAlert(type, data) {
  if (!S) return null;
  const a = { id: 'A-' + S.nextA, num: S.nextA, type, ts: Date.now(), status: 'open', missionId: null, by: null, data: data || {}, live: !(type === 'cabtemp' && !(data && data.real)) };
  S.nextA++; S.alerts.unshift(a); a.line = liveLine(a);
  addLog('system', 'alert', { id: a.id, type }, a.ts);
  toast(t('toast_alert'));
  draftFromAlert(a.id, true);                       // drafts a mission that stays PENDING human approval — no robot moves
  return a;
}
function raiseAlert(type, silent) {
  type = ALERT_DEFS[type] ? type : ALERT_ORDER[S.nextA % 4];
  const a = { id: 'A-' + S.nextA, num: S.nextA, type, ts: Date.now(), status: 'open', missionId: null, by: null };
  S.nextA++; S.alerts.unshift(a); a.line = alertLine(a);
  addLog('system', 'alert', { id: a.id, type }, a.ts);
  if (!silent) { toast(t('toast_alert')); afterChange(); }
  return a;
}
function draftFromAlert(id, quiet) {
  const a = S.alerts.find(x => x.id === id); if (!a || a.status !== 'open') return;
  const d = ALERT_DEFS[a.type], dat = a.data || {};
  const m = newMission({ kind: d.kind, target: dat.cab || d.target || null, flags: Object.assign({}, d.flags, dat.flags || {}), src: 'alert', alertId: a.id, sev: d.sev, ctx: dat });
  a.status = 'drafted'; a.missionId = m.id; a.by = a.live ? 'system' : 'role:' + S.role;
  addLog('system', 'alert_draft', { id: m.id, kind: m.kind, target: m.target || '', robot: m.robot, text: '', tok: m.token, alert: a.id });
  if (quiet) { afterChange(); return; }
  toast(t('toast_proposed')); S.tab = 'missions'; afterChange(); selectTab('missions');
}
function dismissAlert(id) {
  const a = S.alerts.find(x => x.id === id); if (!a || a.status !== 'open') return;
  a.status = 'dismissed'; a.by = 'role:' + S.role; addLog(a.by, 'dismiss', { id: a.id }); afterChange();
}

/* ---------- rendering helpers ---------- */
function toast(msg) {
  const box = $('#toast'), e = document.createElement('div'); e.className = 'toast-i'; e.textContent = msg; box.appendChild(e);
  setTimeout(() => { e.classList.add('out'); setTimeout(() => e.remove(), 300); }, 3800);
}
function logText(e, html, L) {
  const a = e.args || {}, f = html ? ltr : (x => x);
  const v = { id: f(a.id || ''), robot: f(a.robot || ''), kind: a.kind ? kindName(a.kind, L) : '', tok: f(a.tok || ''), text: a.text ? '“' + a.text + '”' : '', alert: f(a.alert || ''), type: a.type ? t('al_' + a.type, null, L) : '',
    asset: a.target ? cabAsset(a.target, L) : '', fx: a.fx ? t('fx_' + a.fx, null, L) : '' };
  return t('a_' + e.action, v, L);
}
function robotStateText(rb) { return t('rs_' + rb.state); }
function battClass(b) { return b < 30 ? 'low' : b < 55 ? 'mid' : ''; }

function renderRobotBits() {
  ROBOT_IDS.forEach(id => {
    const rb = S.robots[id], b = Math.round(rb.batt), el = $('#lbl-' + id);
    if (el) {
      el.querySelector('.rs').textContent = robotStateText(rb); el.dataset.state = rb.state;
      el.querySelector('.bt span').style.width = b + '%'; el.querySelector('.bt').className = 'bt ' + battClass(b); el.querySelector('.bp').textContent = b + '%';
    }
  });
  renderFleet();
}
function renderFleet() {
  const host = $('#fleet'); if (!host) return;
  host.innerHTML = ROBOT_IDS.map(id => {
    const rb = S.robots[id], b = Math.round(rb.batt);
    return '<div class="robot" data-state="' + rb.state + '"><svg class="ico"><use href="#i-robot"/></svg><b>' + id + '</b><span class="chip st-' + rb.state + '">' + esc(robotStateText(rb)) + '</span>' +
      '<span class="bt ' + battClass(b) + '" role="img" aria-label="' + esc(t('battery')) + ' ' + b + '%"><span style="width:' + b + '%"></span></span><span class="bp">' + b + '%</span></div>';
  }).join('');
}

function statusChip(m) { return '<span class="chip ms-' + m.status + '">' + esc(t('ms_' + m.status)) + '</span>'; }
function missionLive(m) { const a = m.alertId && S.alerts.find(x => x.id === m.alertId); return !!(a && a.live); }
function missionItem(m) {
  const live = missionLive(m);
  let h = '<article class="mcard m-' + m.status + '" data-m="' + m.id + '"><header><b>' + esc(kindName(m.kind)) + '</b>' + ltr(m.id) + (live ? '<span class="live-badge sm"><i></i>LIVE / حي</span>' : '') + statusChip(m) + '</header>' +
    '<p class="small muted">' + esc(t('robot')) + ' ' + ltr(m.robot) + ' · ' + esc(t('src_' + m.src)) + (m.text ? ' · “' + esc(m.text) + '”' : '') + '</p>';
  if (m.status === 'awaiting') {
    h += cardFields(m) + (live ? '<p class="tiny"><span class="live-badge sm"><i></i>LIVE / حي</span> ' + esc(t('lv_pending_live')) + '</p>' : '') + '<p class="hint">' + esc(t('hint_awaiting', { r: m.robot })) + '</p><div class="acts"><button class="btn btn-ok" type="button" data-approve="' + m.id + '"><svg class="ico"><use href="#i-check"/></svg>' + esc(t('approve')) + '</button>' +
      '<button class="btn btn-ghost" type="button" data-reject="' + m.id + '"><svg class="ico"><use href="#i-x"/></svg>' + esc(t('reject')) + '</button></div>';
  } else if (m.status === 'running') {
    h += '<div class="bar"><span data-mp="' + m.id + '" style="width:' + Math.round((m.progress || 0) * 100) + '%"></span></div><p class="small">' + esc(t(S.cap || 'cap_to_dish')) + ' · <b data-mpt="' + m.id + '">' + Math.round((m.progress || 0) * 100) + '%</b></p>' +
      '<p class="tiny muted">' + esc(t('approved_by')) + ': ' + esc(actorText(m.by)) + ' · ' + ltr(fClock(m.tDecided)) + '</p>';
  } else if (m.status === 'done') {
    h += '<p class="tiny muted">' + esc(t('approved_by')) + ': ' + esc(actorText(m.by)) + ' · ' + ltr(fClock(m.tDecided)) + '</p><div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-report="' + m.id + '"><svg class="ico"><use href="#i-print"/></svg>' + esc(t('view_report')) + '</button></div>';
  } else h += '<p class="tiny muted">' + esc(t('rejected_by')) + ': ' + esc(actorText(m.by)) + ' · ' + ltr(fClock(m.tDecided)) + '</p>';
  return h + '</article>';
}
function bindMissionButtons(root) {
  $$('[data-approve]', root).forEach(b => b.addEventListener('click', () => approve(b.getAttribute('data-approve'))));
  $$('[data-reject]', root).forEach(b => b.addEventListener('click', () => reject(b.getAttribute('data-reject'))));
  $$('[data-report]', root).forEach(b => b.addEventListener('click', () => openReport({ type: 'mission', id: b.getAttribute('data-report') })));
}
function renderQueue() {
  const order = { awaiting: 0, running: 1, done: 2, rejected: 3 };
  const list = S.missions.slice().sort((a, b) => order[a.status] - order[b.status]);
  $('#queue-count').textContent = list.length;
  $('#queue').innerHTML = list.length ? list.map(missionItem).join('') : '<p class="muted empty">' + esc(t('queue_none')) + '</p>';
  bindMissionButtons($('#queue'));
}
function renderTemplates() {
  const icons = { dish: 'i-dish', rain: 'i-dish', thermal: 'i-therm', perimeter: 'i-fence', night: 'i-moon' };
  $('#tpl-grid').innerHTML = ['dish', 'rain', 'thermal', 'perimeter', 'night'].map(k =>
    '<article class="tpl"><div class="tpl-h"><svg class="ico"><use href="#' + icons[k] + '"/></svg><h3>' + esc(kindName(k)) + '</h3></div><p class="small muted">' + esc(t('kd_' + k)) + '</p>' +
    (k === 'thermal' ? '<label class="fld"><span class="tiny">' + esc(t('tpl_cab')) + '</span><select data-tpl-cab><option value="">' + esc(t('tpl_cab_all')) + '</option><option>A</option><option>B</option><option>C</option></select></label>' : '') +
    '<button class="btn btn-primary btn-block" type="button" data-propose="' + k + '"><svg class="ico"><use href="#i-plus"/></svg>' + esc(t('propose')) + '</button></article>').join('');
  if (LV) {
    const host = $('#tpl-grid'), c = document.createElement('article'); c.className = 'tpl tpl-drift'; const dv = LV.getDriftValue();
    c.innerHTML = '<div class="tpl-h"><svg class="ico"><use href="#i-dish"/></svg><h3>' + esc(t('k_drift')) + '</h3></div><p class="small muted">' + esc(t('kd_drift')) + '</p>' +
      '<p class="tiny"><span class="live-badge"><i></i>LIVE / حي</span> <span id="drift-ref"></span></p>' +
      '<label class="fld"><span class="tiny">' + esc(t('lv_dr_meas')) + '</span><input type="number" id="drift-meas" min="0" max="360" step="0.1" inputmode="decimal" value="' + esc(dv) + '"></label>' +
      '<button class="btn btn-primary btn-block" type="button" id="drift-run"><svg class="ico"><use href="#i-plus"/></svg>' + esc(t('lv_dr_run')) + '</button>' +
      '<p class="small drift-out" id="drift-out" role="status"></p><p class="tiny muted">' + esc(t('lv_dr_foot')) + '</p>';
    host.appendChild(c);
    $('#drift-meas').addEventListener('input', e => LV.setDriftValue(e.target.value));
    $('#drift-run').addEventListener('click', () => LV.runDrift($('#drift-meas').value));
    $('#drift-meas').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); LV.runDrift($('#drift-meas').value); } });
    LV.render && LV.render();
  }
  $$('[data-propose]').forEach(b => b.addEventListener('click', () => {
    const k = b.getAttribute('data-propose'), sel = $('[data-tpl-cab]'), target = k === 'thermal' && sel && sel.value ? sel.value : null;
    propose({ kind: k, target, src: 'template' });
  }));
}

/* ---------- HUD ---------- */
function renderHud() {
  const hud = $('#hud'); if (!hud) return;
  const pend = S.missions.filter(m => m.status === 'awaiting').slice().reverse(), run = S.missions.find(m => m.status === 'running'), done = S.missions.find(m => m.status === 'done');
  const roleSel = '<label class="role"><span>' + esc(t('role_label')) + '</span><select id="role">' + ROLES.map(r => '<option value="' + r + '"' + (r === S.role ? ' selected' : '') + '>' + esc(roleName(r)) + '</option>').join('') + '</select></label>';
  let main;
  if (pend.length) {
    const m = pend[0];
    main = '<div class="hud-l"><div class="hud-t"><span class="chip warn">' + esc(t('hud_pending')) + '</span><b>' + esc(kindName(m.kind)) + '</b> ' + ltr(m.id) + (pend.length > 1 ? ' <span class="muted">' + esc(t('hud_more', { n: pend.length - 1 })) + '</span>' : '') + '</div>' +
      '<div class="hud-card">' + cardFields(m) + '</div><p class="hint">' + esc(t('hint_awaiting', { r: m.robot })) + '</p></div>' +
      '<div class="hud-r">' + roleSel + '<div class="acts"><button class="btn btn-ok btn-lg" id="hud-approve" type="button" data-hid="' + m.id + '"><svg class="ico"><use href="#i-check"/></svg>' + esc(t('approve')) + '</button>' +
      '<button class="btn btn-ghost btn-lg" id="hud-reject" type="button" data-hid="' + m.id + '"><svg class="ico"><use href="#i-x"/></svg>' + esc(t('reject')) + '</button></div></div>';
  } else if (run) {
    main = '<div class="hud-l"><div class="hud-t"><span class="chip run">' + esc(t('hud_running')) + '</span><b>' + esc(kindName(run.kind)) + '</b> ' + ltr(run.id) + ' · ' + ltr(run.robot) + '</div>' +
      '<div class="hud-cap" id="hud-cap">' + esc(t(S.cap || 'cap_to_dish')) + '</div><div class="bar big"><span data-mp="' + run.id + '" style="width:' + Math.round((run.progress || 0) * 100) + '%"></span></div>' +
      '<p class="small muted">' + esc(t('approved_by')) + ': ' + esc(actorText(run.by)) + ' · ' + ltr(fClock(run.tDecided)) + ' · <b data-mpt="' + run.id + '">' + Math.round((run.progress || 0) * 100) + '%</b></p></div><div class="hud-r">' + roleSel + '</div>';
  } else {
    main = '<div class="hud-l"><div class="hud-t"><span class="chip ok">' + esc(t('hud_idle')) + '</span>' + (done ? '<b>' + esc(t('hud_last', { k: kindName(done.kind) })) + '</b> ' + ltr(done.id) : '') + '</div><p class="hud-idle">' + esc(t('hud_idle_msg')) + '</p></div>' +
      '<div class="hud-r">' + roleSel + (done ? '<button class="btn btn-ghost" id="hud-report" type="button" data-hid="' + done.id + '"><svg class="ico"><use href="#i-print"/></svg>' + esc(t('view_report')) + '</button>' : '') + '</div>';
  }
  const quick = '<div class="hud-quick"><div class="qb">' + ['dish', 'rain', 'thermal', 'perimeter', 'night'].map(k => '<button class="btn btn-primary btn-sm" type="button" data-quick="' + k + '">' + esc(kindName(k)) + '</button>').join('') + '</div>' +
    '<form class="qf" id="q-form" autocomplete="off"><input id="q-cmd" type="text" maxlength="160" placeholder="' + esc(t('cmd_ph')) + '" aria-label="' + esc(t('cmd_label')) + '"><button class="btn btn-ghost" type="submit">' + esc(t('cmd_go')) + '</button></form></div>';
  const oq = $('#q-cmd'), keep = oq ? { v: oq.value, f: document.activeElement === oq } : null;
  hud.innerHTML = quick + '<div class="hud-main">' + main + '</div>';
  if (keep) { const nq = $('#q-cmd'); nq.value = keep.v; if (keep.f) nq.focus(); }
  const ap = $('#hud-approve'); if (ap) ap.addEventListener('click', () => approve(ap.dataset.hid));
  const rj = $('#hud-reject'); if (rj) rj.addEventListener('click', () => reject(rj.dataset.hid));
  const hr = $('#hud-report'); if (hr) hr.addEventListener('click', () => openReport({ type: 'mission', id: hr.dataset.hid }));
  const rs = $('#role'); if (rs) rs.addEventListener('change', e => { S.role = e.target.value; toast(t('lv_role_set', { n: t('role_' + S.role) })); });
  $$('[data-quick]', hud).forEach(b => b.addEventListener('click', () => propose({ kind: b.dataset.quick, src: 'template' })));
  const qf = $('#q-form'); if (qf) qf.addEventListener('submit', e => { e.preventDefault(); const v = $('#q-cmd').value; if (v.trim()) { runCommand(v); } });
}

/* ---------- command tab ---------- */
function runCommand(text) {
  const r = NLP.parse(text);
  if (!r.ok) { S.lastCmd = { unknown: true, text }; addLog('system', 'cmd_unknown', { text }); renderCmd(); renderAudit(); selectTab('command'); return null; }
  const m = propose({ kind: r.kind, target: r.target, flags: r.flags, src: 'command', text });
  m.matched = r.matched; S.lastCmd = { id: m.id, text };
  renderCmd(); selectTab('command'); return m;
}
function renderCmd() {
  const chips = (t('cmd_chips_list').split('|')).map(x => '<button type="button" class="chip-b" data-ex="' + esc(x) + '">' + esc(x) + '</button>').join('');
  $('#cmd-chips').innerHTML = chips;
  $$('#cmd-chips [data-ex]').forEach(b => b.addEventListener('click', () => { $('#cmd').value = b.dataset.ex; runCommand(b.dataset.ex); }));
  const out = $('#cmd-out'), lc = S.lastCmd;
  if (!lc) { out.innerHTML = ''; return; }
  if (lc.unknown) { out.innerHTML = '<div class="unknown"><b>' + esc(t('cmd_unknown_t')) + '</b><p>' + esc(t('cmd_unknown_b')) + '</p></div>'; return; }
  const m = S.missions.find(x => x.id === lc.id); if (!m) { out.innerHTML = ''; return; }
  out.innerHTML = '<div class="mcard cmd-card m-' + m.status + '" data-m="' + m.id + '"><header><b>' + esc(t('cmd_card_t')) + '</b>' + ltr(m.id) + statusChip(m) + '</header>' +
    '<p class="small muted">“' + esc(lc.text) + '” → ' + esc(kindName(m.kind)) + (m.matched && m.matched.length ? ' · ' + esc(t('cmd_matched')) + ': ' + m.matched.map(ltr).join(', ') : '') + '</p>' + cardFields(m) +
    (m.status === 'awaiting' ? '<p class="hint">' + esc(t('hint_awaiting', { r: m.robot })) + '</p><div class="acts"><button class="btn btn-ok" type="button" data-approve="' + m.id + '"><svg class="ico"><use href="#i-check"/></svg>' + esc(t('approve')) + '</button><button class="btn btn-ghost" type="button" data-reject="' + m.id + '"><svg class="ico"><use href="#i-x"/></svg>' + esc(t('reject')) + '</button></div>' :
      m.status === 'running' ? '<div class="bar"><span data-mp="' + m.id + '" style="width:' + Math.round((m.progress || 0) * 100) + '%"></span></div>' : m.status === 'done' ? '<div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-report="' + m.id + '"><svg class="ico"><use href="#i-print"/></svg>' + esc(t('view_report')) + '</button></div>' : '') +
    '</div><p class="tiny muted">' + esc(t('cmd_sim_note')) + '</p>';
  bindMissionButtons(out);
}

/* ---------- alerts tab ---------- */
function alertCard(a) {
  const d = ALERT_DEFS[a.type], open = a.status === 'open', sevc = d.sev, live = isLiveAlert(a);
  const m = a.missionId && S.missions.find(x => x.id === a.missionId), dat = a.data || {};
  const vars = { w: dat.w, g: dat.g, thr: dat.thr, rain: dat.rain, m: dat.measured != null ? f1(dat.measured) : '', c: dat.computed != null ? f1(dat.computed) : (dat.cab || ''), sat: dat.sat, d: dat.dev != null ? (dat.dev > 0 ? '+' : '') + f1(dat.dev) : '', n: dat.n, v: dat.temp != null ? f1(dat.temp) : '', src: dat.src ? t(dat.src) : '' };
  const tag = live ? '<span class="live-badge"><i></i>LIVE / حي</span>' : '<span class="chip sim-chip">SIMULATED</span>';
  return '<article class="alert sev-' + sevc + (open ? '' : ' closed') + (live ? ' is-live' : '') + '" data-a="' + a.id + '" data-type="' + a.type + '"><header>' + tag + '<span class="chip th-' + sevc + '">' + esc(t('th_' + sevc)) + '</span><b>' + esc(t('al_' + a.type)) + '</b></header>' +
    '<p class="tiny muted">' + ltr(a.id) + ' · ' + ltr(fClock(a.ts)) + ' · ' + esc(t('al_device')) + ': ' + ltr(d.device) + ' · ' + esc(t('f_asset')) + ': ' + esc(assetOf(d.kind, dat.cab || d.target, lang, d.assetKey)) + '</p>' +
    '<pre class="logline" dir="ltr">[' + (live ? 'LIVE' : 'SIMULATED') + '] ' + esc(fClock(a.ts)) + ' ' + esc(d.device) + ' ' + esc(a.line) + '</pre><p class="small">' + esc(t('al_' + a.type + '_d', vars)) + '</p>' +
    (open ? '<div class="acts"><button class="btn btn-primary btn-sm" type="button" data-draft="' + a.id + '"><svg class="ico"><use href="#i-bolt"/></svg>' + esc(t('al_draftbtn')) + '</button><button class="btn btn-ghost btn-sm" type="button" data-dismiss="' + a.id + '">' + esc(t('al_dismiss')) + '</button></div>'
      : '<p class="tiny ' + (a.status === 'drafted' ? 'ok-t' : 'muted') + '">' + esc(t('al_st_' + a.status)) + (m ? ' · ' + ltr(m.id) : '') + '</p>') + '</article>';
}
function renderAlerts() {
  const open = S.alerts.filter(a => a.status === 'open'), rest = S.alerts.filter(a => a.status !== 'open');
  $('#alerts').innerHTML = (open.length ? open.map(alertCard).join('') : '<p class="muted empty">' + esc(t('al_none')) + '</p>') + (rest.length ? '<h3 class="sub">' + esc(t('al_closed')) + '</h3>' + rest.map(alertCard).join('') : '');
  $$('[data-draft]').forEach(b => b.addEventListener('click', () => draftFromAlert(b.dataset.draft)));
  $$('[data-dismiss]').forEach(b => b.addEventListener('click', () => dismissAlert(b.dataset.dismiss)));
  const n = open.length; $('#nb-alerts').hidden = !n; $('#nb-alerts').textContent = n;
}

/* ---------- audit ---------- */
function renderAudit() {
  $('#au-table').innerHTML = '<thead><tr><th scope="col">' + esc(t('au_time')) + '</th><th scope="col">' + esc(t('au_actor')) + '</th><th scope="col">' + esc(t('au_action')) + '</th></tr></thead><tbody>' +
    S.log.map(e => '<tr class="k-' + actorKind(e.actor) + '"><td>' + ltr(fT(e.ts)) + '</td><td><span class="actor">' + esc(actorText(e.actor)) + '</span></td><td>' + logText(e, true) + '</td></tr>').join('') + '</tbody>' +
    '<caption>' + esc(t('au_tz', { tz: tzAbbr(Date.now()), name: Intl.DateTimeFormat().resolvedOptions().timeZone || '' })) + '</caption>';
}
function download(name, type, content) {
  const b = new Blob([content], { type }), u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500);
}
function exportCsv() {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"', tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const head = [t('au_time') + ' (' + tzAbbr(Date.now()) + ')', 'ISO 8601', t('au_actor'), t('au_action'), 'SIMULATION'].map(q).join(',');
  const rows = S.log.slice().reverse().map(e => [fDT(e.ts), fISO(e.ts), actorText(e.actor), logText(e, false), 'SIMULATION / عرض تجريبي - بيانات افتراضية'].map(q).join(','));
  download('aicore-robotics3d-audit-simulation.csv', 'text/csv;charset=utf-8', '\ufeff' + [head].concat(rows).join('\r\n') + '\r\n' + q('# ' + t('au_tz', { tz: tzAbbr(Date.now()), name: tz })));
}

/* ---------- about tab ---------- */
function renderAbout() {
  $('#about').innerHTML = '<h2 class="sec">' + esc(t('about_title')) + '</h2><p class="banner">' + esc(t('sim_statement')) + '</p>' +
    '<h3 class="sub">' + esc(t('road_title')) + '</h3><ul class="road">' + [1, 2, 3, 4].map(i => '<li>' + esc(t('road_' + i)) + '</li>').join('') + '</ul>' +
    '<h3 class="sub">' + esc(t('roles_title')) + '</h3><ul class="road">' + [1, 2, 3].map(i => '<li>' + esc(t('role_' + i)) + '</li>').join('') + '</ul>' +
    '<h3 class="sub">' + esc(t('ct_title')) + '</h3><p>' + esc(t('ct_name')) + ' — AICore Digital LLC · Richmond, VA</p><ul class="ct">' +
    '<li><a href="https://wa.me/18044853384" target="_blank" rel="noopener">WhatsApp <bdi class="ltr">wa.me/18044853384</bdi></a></li><li><a href="mailto:elycheikh@aicoredigital.com"><bdi class="ltr">elycheikh@aicoredigital.com</bdi></a></li><li><a href="https://aicoredigital.com" target="_blank" rel="noopener"><bdi class="ltr">aicoredigital.com</bdi></a></li></ul>';
}

/* ---------- reports ---------- */
const PAPER_CSS = 'body{font:15px/1.65 system-ui,Tahoma,Arial,sans-serif;color:#111;margin:24px auto;max-width:800px;padding:0 16px}h1{font-size:22px;margin:4px 0}h2{font-size:15px;margin:20px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 9px;text-align:start;font-size:14px;vertical-align:top}th{background:#f2f2f6}.rp-sim{border:2px dashed #b00;color:#b00;text-align:center;font-weight:700;padding:6px;margin-bottom:14px}.rp-h{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.rp-brand{font-weight:700;color:#7a1fd0}.attn{color:#b45309;font-weight:700}.ok{color:#047857}.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}.rp-disc{font-size:12px;color:#444;margin-top:18px;border-top:1px solid #ccc;padding-top:8px}.rp-foot{font-size:12px;color:#555}.sec-l{margin-top:26px;border-top:3px double #999;padding-top:10px}pre{background:#f4f4f8;padding:6px 8px;direction:ltr;text-align:left;white-space:pre-wrap;font-size:12.5px;margin:4px 0}ul,ol{padding-inline-start:22px}';
const SIMTXT = 'SIMULATION / عرض تجريبي - بيانات افتراضية';
function paperHead(title, id, ts, L) {
  return '<div class="rp-sim">' + SIMTXT + '</div><header class="rp-h"><div><div class="rp-brand">AICore Robotics Ops 3D</div><h1 id="rp-h">' + esc(title) + ' ' + ltr(id) + '</h1></div><div class="rp-date">' + ltr(fDT(ts)) + '</div></header>';
}
function paperFoot(L) {
  return '<p class="rp-disc">' + esc(t('geo_note', null, L)) + '<br>' + esc(t('rp_disclaimer', null, L)) + '<br>' + esc(t('roadmap_note', null, L)) + '</p><p class="rp-foot">' + esc(t('ct_name', null, L)) + ' · AICore Digital LLC · Richmond, VA · aicoredigital.com · elycheikh@aicoredigital.com · wa.me/18044853384<br>' + esc(t('rp_clock', { tz: tzAbbr(Date.now()), name: Intl.DateTimeFormat().resolvedOptions().timeZone || '' }, L)) + '</p>';
}
const LIVE_TAG = ' <span class="live-badge sm"><i></i>LIVE / حي</span>', SIMS_TAG = ' <span class="sim-tag sm">SIMULATED</span>';
const findingVal = (f, L) => ((typeof f.v === 'string' && f.v.indexOf('v_') === 0) ? esc(t(f.v, null, L)) : ltr(f.v)) + (f.live ? LIVE_TAG : (f.simSensor || f.simNote) ? SIMS_TAG : '');
function missionReportInner(m, L) {
  const p = plan(m, L), fv = v => (typeof v === 'string' && v.indexOf('v_') === 0) ? t(v, null, L) : ltr(v), attn = m.findings.some(f => f.attn);
  return paperHead(t('rp_title', null, L), m.id, m.tEnd, L) +
    '<h2>' + esc(t('rp_meta', null, L)) + '</h2><table><tbody>' +
    '<tr><th scope="row">' + esc(t('rp_mission', null, L)) + '</th><td>' + esc(kindName(m.kind, L)) + ' (' + esc(t('src_' + m.src, null, L)) + (m.text ? ': “' + esc(m.text) + '”' : '') + ')</td></tr>' +
    '<tr><th scope="row">' + esc(t('f_asset', null, L)) + '</th><td>' + esc(p.asset) + ' — ' + esc(t('site_name', null, L)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('robot', null, L)) + '</th><td>' + ltr(m.robot) + ' — ' + esc(t('robot_type', null, L)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('f_threat', null, L)) + '</th><td>' + esc(t('th_' + p.threat, null, L)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('f_payload', null, L)) + '</th><td>' + esc(p.payload) + '</td></tr></tbody></table>' +
    '<h2>' + esc(t('rp_summary', null, L)) + '</h2><p class="' + (attn ? 'attn' : 'ok') + '">' + esc(t(attn ? 'rp_sum_attn' : 'rp_sum_ok', null, L)) + '</p>' +
    '<h2>' + esc(t('rp_find', null, L)) + '</h2><table><thead><tr><th>' + esc(t('rp_item', null, L)) + '</th><th>' + esc(t('rp_value', null, L)) + '</th><th>' + esc(t('rp_status', null, L)) + '</th></tr></thead><tbody>' +
    m.findings.map(f => '<tr><td>' + esc(t(f.k, null, L)) + '</td><td>' + findingVal(f, L) + '</td><td class="' + (f.attn ? 'attn' : 'ok') + '">' + esc(t(f.attn ? 'rp_attn' : 'rp_ok', null, L)) + '</td></tr>').join('') + '</tbody></table>' +
    '<h2>' + esc(t('rp_chain', null, L)) + '</h2><table><tbody>' +
    '<tr><th scope="row">' + esc(t('rp_proposed', null, L)) + '</th><td>' + esc(t('actor_system', null, L)) + ' · ' + ltr(fDT(m.tProposed)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('rp_approved', null, L)) + '</th><td>' + esc(actorText(m.by, L)) + ' · ' + ltr(fDT(m.tDecided)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('rp_started', null, L)) + '</th><td>' + ltr(fDT(m.tStart)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('rp_inspected', null, L)) + '</th><td>' + ltr(fDT(m.tInspect || m.tEnd)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('rp_completed', null, L)) + '</th><td>' + ltr(fDT(m.tEnd)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('f_audit', null, L)) + '</th><td>' + ltr(m.token) + '</td></tr></tbody></table>' + paperFoot(L);
}
const REC = { snr: 'rec_snr', track: 'rec_track', pa: 'rec_pa', pdu: 'rec_pdu', wind: 'rec_wind', rain: 'rec_rain', drift: 'rec_drift', person: 'rec_person', cabtemp: 'rec_cabtemp' };
function dispatchSection(L, id, ts) {
  const open = S.alerts.filter(a => a.status === 'open' || a.status === 'drafted'), last = S.missions.find(m => m.status === 'done');
  const rows = open.length ? open.map(a => { const d = ALERT_DEFS[a.type]; return '<tr><td>' + ltr(a.id) + '</td><td>' + ltr(fDT(a.ts)) + '</td><td>' + esc(d.device) + '</td><td><pre>[' + (a.live ? 'LIVE' : 'SIMULATED') + '] ' + esc(a.line) + '</pre></td><td>' + esc(t('th_' + d.sev, null, L)) + '</td></tr>'; }).join('') : '<tr><td colspan="5">' + esc(t('al_none', null, L)) + '</td></tr>';
  const recs = Array.from(new Set(open.map(a => a.type))).map(k => '<li>' + esc(t(REC[k], null, L)) + '</li>').join('') || '<li>' + esc(t('rec_none', null, L)) + '</li>';
  const findings = last ? '<table><thead><tr><th>' + esc(t('rp_item', null, L)) + '</th><th>' + esc(t('rp_value', null, L)) + '</th><th>' + esc(t('rp_status', null, L)) + '</th></tr></thead><tbody>' + last.findings.map(f => '<tr><td>' + esc(t(f.k, null, L)) + '</td><td>' + findingVal(f, L) + '</td><td class="' + (f.attn ? 'attn' : 'ok') + '">' + esc(t(f.attn ? 'rp_attn' : 'rp_ok', null, L)) + '</td></tr>').join('') + '</tbody></table><p class="tiny">' + esc(kindName(last.kind, L)) + ' ' + ltr(last.id) + ' · ' + ltr(fDT(last.tEnd)) + ' · ' + esc(t('approved_by', null, L)) + ': ' + esc(actorText(last.by, L)) + '</p>' : '<p>' + esc(t('dp_nomission', null, L)) + '</p>';
  const assets = ['name_dish', 'name_ku', 'name_hpa', 'name_idu', 'name_ups', 'name_badr'].map(k => '<li>' + esc(t(k, null, L)) + (k === 'name_badr' ? ' — ' + esc(t('dp_badr_note', null, L)) : '') + '</li>').join('');
  return '<div dir="' + (L === 'ar' ? 'rtl' : 'ltr') + '" lang="' + L + '"><h2 class="dsec">' + esc(t('dp_title', null, L)) + ' ' + ltr(id) + '</h2>' +
    '<table><tbody><tr><th scope="row">' + esc(t('dp_to', null, L)) + '</th><td>' + esc(t('dp_to_v', null, L)) + '</td></tr><tr><th scope="row">' + esc(t('dp_site', null, L)) + '</th><td>' + esc(t('site_name', null, L)) + '</td></tr>' +
    '<tr><th scope="row">' + esc(t('dp_prep', null, L)) + '</th><td>' + esc(roleName(S.role, L)) + ' · ' + ltr(fDT(ts)) + '</td></tr><tr><th scope="row">' + esc(t('dp_status', null, L)) + '</th><td>' + esc(t('dp_status_v', null, L)) + '</td></tr></tbody></table>' +
    '<h2>' + esc(t('dp_assets', null, L)) + '</h2><ul>' + assets + '</ul><p class="tiny">' + esc(t('geo_note', null, L)) + '</p>' +
    '<h2>' + esc(t('dp_alerts', null, L)) + '</h2><table><thead><tr><th>ID</th><th>' + esc(t('au_time', null, L)) + '</th><th>' + esc(t('al_device', null, L)) + '</th><th>' + esc(t('dp_event', null, L)) + '</th><th>' + esc(t('f_threat', null, L)) + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<h2>' + esc(t('dp_insp', null, L)) + '</h2>' + findings + '<h2>' + esc(t('dp_rec', null, L)) + '</h2><ul>' + recs + '</ul>' +
    '<h2>' + esc(t('dp_res', null, L)) + '</h2><p>' + esc(t('dp_res_v', null, L)) + '</p></div>';
}
function dispatchInner(rep) {
  let h = paperHead(t('dp_h1', null, 'en'), rep.id, rep.ts, 'en') + dispatchSection('en', rep.id, rep.ts);
  if (lang !== 'en') h += '<div class="sec-l"></div>' + dispatchSection(lang, rep.id, rep.ts);
  return h + paperFoot(lang);
}
function openReport(rep) {
  if (rep.type === 'mission') { const m = S.missions.find(x => x.id === rep.id); if (!m || m.status !== 'done') return; }
  if (rep.type === 'dispatch' && !rep.id) { rep.id = 'DR-' + String(S.nextD++).padStart(3, '0'); rep.ts = Date.now(); addLog('role:' + S.role, 'dispatch', { id: rep.id }, rep.ts); renderAudit(); }
  S.report = rep; paintReport();
  const ov = $('#report'); ov.hidden = false; document.body.classList.add('rp-open'); ov.scrollTop = 0; $('#rp-close').focus();
}
function paintReport() {
  const rep = S.report; if (!rep) return;
  const paper = $('#paper');
  if (rep.type === 'mission') { const m = S.missions.find(x => x.id === rep.id); paper.innerHTML = missionReportInner(m, lang); paper.dir = lang === 'ar' ? 'rtl' : 'ltr'; paper.lang = lang; }
  else { paper.innerHTML = dispatchInner(rep); paper.dir = 'ltr'; paper.lang = 'en'; }
}
function closeReport() { $('#report').hidden = true; document.body.classList.remove('rp-open'); S.report = null; }
function downloadReport() {
  if (!S.report) return;
  const title = S.report.type === 'mission' ? t('rp_title') + ' ' + S.report.id : t('dp_h1', null, 'en') + ' ' + S.report.id;
  const doc = '<!doctype html><html lang="' + lang + '" dir="' + (lang === 'ar' && S.report.type === 'mission' ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + ' (SIMULATION)</title><style>' + PAPER_CSS + '</style></head><body>' + $('#paper').innerHTML + '</body></html>';
  download((S.report.type === 'mission' ? 'mission-' : 'dispatch-') + S.report.id + '-report-simulation.html', 'text/html;charset=utf-8', doc);
}

/* ---------- in-scene HTML labels ---------- */
let azBox, heatLegend;
function buildLabels() {
  const host = $('#labels'); host.innerHTML = '';
  ROBOT_IDS.forEach(id => {
    const el = document.createElement('div'); el.className = 'lbl lbl-robot'; el.id = 'lbl-' + id;
    el.innerHTML = '<div class="lr-top"><b>' + id + '</b><span class="rs"></span></div><div class="lr-bt"><span class="bt"><span></span></span><span class="bp"></span></div>';
    host.appendChild(el); if (SC) SC.addLabel(el, () => SC.robotAnchor(id));
  });
  ['A', 'B', 'C'].forEach(c => {
    const el = document.createElement('div'); el.className = 'lbl lbl-cab'; el.id = 'lbl-cab-' + c; el.innerHTML = '<span class="cn">' + c + '</span><span class="ct" hidden></span><span class="cl"></span>';
    host.appendChild(el); if (SC) SC.addLabel(el, () => SC.cabAnchor(c));
  });
  const dz = document.createElement('div'); dz.className = 'lbl lbl-dish'; dz.id = 'lbl-dish'; dz.innerHTML = '<span class="dn"></span><span class="dp"></span><span class="da" hidden></span>'; host.appendChild(dz);
  if (SC) SC.addLabel(dz, () => SC.dishAnchor);
  const ku = document.createElement('div'); ku.className = 'lbl lbl-ku'; ku.id = 'lbl-ku'; ku.innerHTML = '<span class="kn"></span>'; host.appendChild(ku);
  if (SC) SC.addLabel(ku, () => SC.kuAnchor);
  const gz = document.createElement('div'); gz.className = 'lbl lbl-gate'; gz.id = 'lbl-gate'; gz.innerHTML = '<span class="gn"></span><span class="ga" hidden></span>'; host.appendChild(gz);
  if (SC) SC.addLabel(gz, () => SC.gateAnchor);
  azBox = $('#lbl-dish .da'); heatLegend = $('#heat-legend');
}
function relabel() {
  ['A', 'B', 'C'].forEach(c => { $('#lbl-cab-' + c + ' .cl').textContent = c + ' · ' + cabRole(c); });
  $('#lbl-dish .dn').textContent = t('lbl_dish');
  const ku = $('#lbl-ku .kn'); if (ku) ku.textContent = t('lbl_ku');
  $('#lbl-gate .gn').textContent = t('lbl_gate');
  const sd = $('#sat-readout .sr-dish'); if (sd) sd.textContent = t('lbl_dish');
  const sk = $('#sat-readout .sr-ku'); if (sk) sk.textContent = t('lbl_ku');
}
function showAz(m) { azBox.hidden = false; azBox.className = 'da ' + (parseFloat(m.az.err) > 0.5 ? 'bad' : 'good'); azBox.innerHTML = '<b>' + esc(t('az_reading')) + '</b> ' + ltr(m.az.az + '°') + (m.az.ref ? ' <span class="muted tiny">(' + esc(t('lv_dp')) + ' ' + ltr(m.az.ref + '°') + ')</span>' : '') + '<br>' + esc(t('f_azerr')) + ' ' + ltr(m.az.err + '°') + ' ' + (parseFloat(m.az.err) > 0.5 ? '⚠' : '✓'); azBox.dataset.mid = m.id; }
function showHeat(m) {
  heatLegend.hidden = false;
  Object.keys(m.temps).forEach(c => { const e = $('#lbl-cab-' + c + ' .ct'), kind = (m.tempKinds || {})[c] || null; delete e.dataset.live; e.hidden = false; const lim = kind && LV ? LV.sensorThr() : 55;
    if (kind && LV) e.innerHTML = LV.ctHTML(m.temps[c], kind); else e.textContent = m.temps[c] + ' °C'; e.className = 'ct ' + (m.temps[c] >= lim ? 'bad' : 'good'); });
}
function showGate() { const e = $('#lbl-gate .ga'); e.hidden = false; e.textContent = t('gate_closed'); }
function hideFx() { azBox.hidden = true; heatLegend.hidden = true; $$('.lbl-cab .ct').forEach(e => { e.hidden = true; delete e.dataset.live; }); $('#lbl-gate .ga').hidden = true; if (LV) LV.refreshCabLabel(); }

/* ---------- 2D fallback (no WebGL) ---------- */
function drawFallback() {
  const cv = $('#fb-canvas'); if (!cv || $('#fallback').hidden) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, sx = x => W / 2 + x * 29, sz = z => H / 2 + z * 26;
  g.clearRect(0, 0, W, H); g.fillStyle = '#0b0b1c'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#a24aff'; g.lineWidth = 3; g.strokeRect(sx(-14), sz(-9), 28 * 29, 18 * 26);
  g.fillStyle = '#c084fc'; g.beginPath(); g.arc(sx(7), sz(-3), 40, 0, 7); g.fill();
  g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(sx(LAYOUT.dish.x + 2.5), sz(LAYOUT.dish.z + 1.7), 10, 0, 7); g.fill();
  g.font = '700 16px sans-serif'; g.textAlign = 'center'; g.fillText('Ku', sx(LAYOUT.dish.x + 2.5), sz(LAYOUT.dish.z + 1.7) - 16);
  ['A', 'B', 'C'].forEach(c => { g.fillStyle = '#3b4080'; g.fillRect(sx(LAYOUT.cab[c].x) - 18, sz(LAYOUT.cab[c].z) - 14, 36, 28); g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText(c, sx(LAYOUT.cab[c].x), sz(LAYOUT.cab[c].z) + 8); });
  ROBOT_IDS.forEach(id => { const p = fbPos[id]; g.fillStyle = id === 'R-01' ? '#c084fc' : '#22d3ee'; g.beginPath(); g.arc(sx(p.x), sz(p.z), 14, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 20px sans-serif'; g.textAlign = 'center'; g.fillText(id + ' ' + Math.round(S.robots[id].batt) + '%', sx(p.x), sz(p.z) - 22); });
}

/* ---------- tabs / chrome ---------- */
function selectTab(id) {
  S.tab = id;
  $$('#tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id));
  $$('.tabpanel').forEach(p => { p.hidden = p.id !== 'p-' + id; });
  if (id === 'missions') $('#nb-missions').hidden = true; else updateDots();
}
function updateDots() { const n = S.missions.filter(m => m.status === 'awaiting').length; const d = $('#nb-missions'); d.textContent = n; d.hidden = !n || S.tab === 'missions'; }
function updateDriftAmp() {
  if (!SC) return;
  const drifting = S.alerts.some(a => a.status === 'open' && a.type === 'track') || S.missions.some(m => m.status === 'awaiting' && m.kind === 'dish' && m.flags.drift);
  SC.setDriftAmp(drifting ? 0.06 : 0.012);
}
function afterChange() { renderQueue(); renderHud(); renderAlerts(); renderAudit(); renderCmd(); renderRobotBits(); updateDots(); updateDriftAmp(); syncMap3d(); }

/* ---------- real map (Leaflet). Pins are EXAMPLE; approval reuses mission/alert actions. Tasks live on the illustrative station pin. ---------- */
let mvApi = null, mapOn = false;
function mapTaskHtml(pointId) {
  if (pointId !== 'gs') return '<p class="small">' + esc(t('map_no_task')) + '</p>';
  const awaiting = S.missions.filter(m => m.status === 'awaiting');
  if (awaiting.length) {
    const m = awaiting[0], live = missionLive(m);
    return '<p class="tiny">' + (live ? '<span class="live-badge"><i></i>LIVE / حي</span>' : '<span class="sim-tag">' + esc(t('lv_sim_tag')) + '</span>') + '</p>' +
      '<p><b>' + esc(kindName(m.kind)) + '</b> ' + ltr(m.id) + '</p>' +
      '<p class="small muted">' + esc(t('robot')) + ' ' + ltr(m.robot) + '</p>' +
      '<p class="hint tiny">' + esc(t('hint_awaiting', { r: m.robot })) + '</p>' +
      '<div class="acts"><button class="btn btn-ok btn-sm" type="button" data-mv-approve="' + m.id + '"><svg class="ico"><use href="#i-check"/></svg>' + esc(t('approve')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-mv-reject="' + m.id + '"><svg class="ico"><use href="#i-x"/></svg>' + esc(t('reject')) + '</button></div>' +
      (awaiting.length > 1 ? '<p class="tiny muted">' + esc(t('map_more', { n: awaiting.length - 1 })) + '</p>' : '');
  }
  const open = S.alerts.filter(a => a.status === 'open');
  if (open.length) {
    const a = open[0], live = isLiveAlert(a), d = ALERT_DEFS[a.type] || {}, dat = a.data || {};
    const vars = { w: dat.w, g: dat.g, thr: dat.thr, rain: dat.rain, m: dat.measured != null ? f1(dat.measured) : '', c: dat.computed != null ? f1(dat.computed) : (dat.cab || ''), sat: dat.sat, d: dat.dev != null ? (dat.dev > 0 ? '+' : '') + f1(dat.dev) : '', n: dat.n, v: dat.temp != null ? f1(dat.temp) : '', src: dat.src ? t(dat.src) : '' };
    return '<p class="tiny">' + (live ? '<span class="live-badge"><i></i>LIVE / حي</span>' : '<span class="sim-tag">' + esc(t('lv_sim_tag')) + '</span>') + ' ' + esc(t('th_' + (d.sev || 'medium'))) + '</p>' +
      '<p><b>' + esc(t('al_' + a.type)) + '</b> ' + ltr(a.id) + '</p>' +
      '<p class="small">' + esc(t('al_' + a.type + '_d', vars)) + '</p>' +
      '<div class="acts"><button class="btn btn-primary btn-sm" type="button" data-mv-draft="' + a.id + '"><svg class="ico"><use href="#i-bolt"/></svg>' + esc(t('al_draftbtn')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-mv-dismiss="' + a.id + '">' + esc(t('al_dismiss')) + '</button></div>' +
      (open.length > 1 ? '<p class="tiny muted">' + esc(t('map_more', { n: open.length - 1 })) + '</p>' : '');
  }
  return '<p class="small">' + esc(t('map_no_task')) + '</p>';
}
function renderMapDetail() {
  const host = $('#map-detail'); if (!host || !window.MapView) return;
  const id = mvApi ? mvApi.selected() : 'gs';
  const p = MapView.point(id) || MapView.POINTS[0];
  host.innerHTML = '<h2 class="mv-h"><span class="mv-ex">EXAMPLE</span> ' + esc(t('map_pt_' + p.id)) + '</h2>' +
    '<p class="tiny"><span class="sim-tag">' + esc(t('lv_sim_tag')) + '</span></p>' +
    '<h3 class="mv-h3">' + esc(t('map_task_h')) + '</h3>' + mapTaskHtml(p.id) +
    MapView.liveHtml({ t, esc, ltr, lat: p.lat, lon: p.lon });
  paintMapLayer();
  refreshSheetTitle();
}
function paintMapLayer() {
  const sat = mvApi && mvApi.mode() === 'sat';
  const layer = $('#map-layer'), back = $('#map-back');
  if (layer) {
    layer.textContent = t(sat ? 'map_streets' : 'map_sat');
    layer.setAttribute('aria-pressed', sat ? 'true' : 'false');
    layer.setAttribute('aria-label', t('map_layer_aria'));
  }
  if (back) back.textContent = t('map_back');
}
function mapAlertIds() { return S.alerts.some(a => a.status === 'open') ? ['gs'] : []; }
function syncMap3d() {
  if (!mapOn) return;
  renderMapDetail();
  if (!mvApi) return;
  mvApi.setAlertPoints(mapAlertIds());
  mvApi.redrawLabels();
}
function ensureMap3d() {
  if (!window.MapView || !$('#geo-map-canvas')) return;
  if (!mvApi) {
    mvApi = MapView.create({
      el: '#geo-map-canvas', failEl: '#geo-map-fail', t,
      onSelect: (id, fromUser) => {
        renderMapDetail();
        if (fromUser && window.matchMedia('(max-width: 640px)').matches && sheetKind !== 'point') openSheet('point');
      },
      onBase: () => paintMapLayer()
    });
  }
  mvApi.start();
  mvApi.setAlertPoints(mapAlertIds());
  mvApi.redrawLabels();
  renderMapDetail();
  setTimeout(() => { if (mvApi) mvApi.invalidate(); }, 80);
}
function setMapMode(on) {
  mapOn = !!on;
  document.body.classList.toggle('map-on', mapOn);
  const host = $('#geo-map'); if (host) host.hidden = !mapOn;
  const chip = $('#m-map'), cam = $('#cam-map');
  if (chip) chip.setAttribute('aria-pressed', mapOn ? 'true' : 'false');
  if (cam) cam.setAttribute('aria-pressed', mapOn ? 'true' : 'false');
  if (mapOn) ensureMap3d();
  else {
    if (mvApi) mvApi.stop();
    if (sheetKind === 'point') closeSheet();
  }
}
function toggleMap() { setMapMode(!mapOn); }

function applyStatic() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.title = t('page_title');
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.getAttribute('data-i18n')); });
  $$('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', t(e.getAttribute('data-i18n-aria'))));
  $$('[data-i18n-ph]').forEach(e => e.setAttribute('placeholder', t(e.getAttribute('data-i18n-ph'))));
  $$('#langs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  $('#to2d').href = '../?lang=' + lang;
  $('#pres-t').textContent = t(document.body.classList.contains('pres') ? 'pres_off' : 'pres_on');
  $('#fs-t').textContent = t(document.fullscreenElement ? 'fs_off' : 'fs_on');
  $('#wa').title = 'WhatsApp';
}
/* Narrow screens: one chip opens one bottom sheet. Panels are moved, never stacked. */
const SHEET_SEL = { live: '#livebar', sat: '#sat-readout', info: '#geo-banner', tasks: '#hud', point: '#map-detail' };
const sheetHome = {};
let sheetKind = null;
function park(sel) {
  const el = $(sel); if (!el) return null;
  if (!sheetHome[sel]) sheetHome[sel] = { parent: el.parentNode, next: el.nextSibling };
  return el;
}
function restoreSheetNode(sel) {
  const el = $(sel), home = sheetHome[sel]; if (!el || !home || el.parentNode === home.parent) return;
  if (home.next && home.next.parentNode === home.parent) home.parent.insertBefore(el, home.next);
  else home.parent.appendChild(el);
}
function closeSheet() {
  if (sheetKind) restoreSheetNode(SHEET_SEL[sheetKind]);
  sheetKind = null;
  const sh = $('#m-sheet'); if (sh) sh.hidden = true;
  $$('.m-chip').forEach(b => { if (b.id !== 'm-map') b.setAttribute('aria-pressed', 'false'); });
}
function openSheet(kind) {
  if (!window.matchMedia('(max-width: 640px)').matches) return;
  if (!SHEET_SEL[kind]) return;
  if (sheetKind === kind) { closeSheet(); return; }
  if (sheetKind) restoreSheetNode(SHEET_SEL[sheetKind]);
  const el = park(SHEET_SEL[kind]); if (!el) return;
  sheetKind = kind;
  $('#m-sheet-b').appendChild(el);
  el.hidden = false;
  $('#m-sheet').hidden = false;
  $$('.m-chip').forEach(b => { if (b.id !== 'm-map') b.setAttribute('aria-pressed', b.dataset.sheet === kind ? 'true' : 'false'); });
  refreshSheetTitle();
  const x = $('#m-sheet-x'); if (x) x.focus();
}
function refreshSheetTitle() {
  if (!sheetKind || !$('#m-sheet') || $('#m-sheet').hidden) return;
  if (sheetKind === 'point') {
    const id = mvApi ? mvApi.selected() : 'gs';
    $('#m-sheet-t').textContent = t('map_pt_' + id);
    return;
  }
  const chip = $('.m-chip[data-sheet="' + sheetKind + '"] span');
  if (chip) $('#m-sheet-t').textContent = chip.textContent;
}
function bindSheets() {
  $$('.m-chip').forEach(b => b.addEventListener('click', () => { if (b.id === 'm-map') toggleMap(); else openSheet(b.dataset.sheet); }));
  const x = $('#m-sheet-x'); if (x) x.addEventListener('click', closeSheet);
  const mq = window.matchMedia('(max-width: 640px)');
  const onMq = () => { if (!mq.matches) closeSheet(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
}
function renderAll() { applyStatic(); renderTemplates(); if (LV) LV.render(); renderQueue(); renderHud(); renderCmd(); renderAlerts(); renderAudit(); renderAbout(); relabel(); renderRobotBits(); updateDots(); selectTab(S.tab); if (S.report) paintReport(); refreshSheetTitle(); syncMap3d(); }
function setLang(l) { lang = l; try { localStorage.setItem(LS_LANG, l); } catch (e) { /* ignore */ } const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u); renderAll(); }

function setPres(on) {
  document.body.classList.toggle('pres', on); $('#pres').setAttribute('aria-pressed', on); $('#pres-t').textContent = t(on ? 'pres_off' : 'pres_on');
  if (on && SC && !SC.cinematic) { /* leave camera as the presenter set it */ }
}
function toggleFs() {
  if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}
function setCine(on) { if (!SC) return; SC.setCinematic(on); $('#cam-cine').setAttribute('aria-pressed', on); }
function followToggle() {
  if (!SC) return; const on = !SC.following;
  const rid = (S.missions.find(m => m.status === 'running') || {}).robot || 'R-01';
  SC.follow(on ? rid : null); $('#cam-follow').setAttribute('aria-pressed', on);
}

function resetDemo() {
  S = freshState(); fbPos = {}; ROBOT_IDS.forEach(id => { fbPos[id] = { x: LAYOUT.docks[id].x, z: LAYOUT.docks[id].z, yaw: 0 }; });
  if (SC) { SC.resetRobots(); SC.setBeam(null); SC.setHeat(null); SC.setNight(false); SC.setLocked(false); }
  hideFx(); seed(); closeReport(); renderAll();
  if (LV) { LV.resetArm(); LV.checkWind(); LV.checkRain(); LV.applyPointing(); }
}
function seed() {
  const now = Date.now();
  addLog('system', 'boot', {}, now);
  raiseAlert('snr', true);
}

/* ---------- 1 Hz simulation tick ---------- */
function tick() {
  $('#clock').textContent = fClock(Date.now());
  ROBOT_IDS.forEach(id => {
    const rb = S.robots[id];
    if (rb.state === 'docked') rb.batt = Math.min(100, rb.batt + 0.35);
    else rb.batt = Math.max(5, rb.batt - (rb.state === 'inspecting' ? 0.1 : 0.22) * Math.min(SPEED, 3));
  });
  renderRobotBits();
  S.sinceAlert++;
  if (S.feed && S.sinceAlert >= 90 && S.alerts.filter(a => a.status === 'open').length < 4 && !document.hidden) { S.sinceAlert = 0; raiseAlert(); }
  if (!webgl) drawFallback();
}

/* ---------- init ---------- */
async function init() {
  S = freshState(); ROBOT_IDS.forEach(id => { fbPos[id] = { x: LAYOUT.docks[id].x, z: LAYOUT.docks[id].z, yaw: 0 }; });
  const view = $('#view');
  try {
    const mod = await import('./scene.js');
    SC = await mod.createScene(view, { speed: SPEED, ariaLabel: t('scene_aria') });
    webgl = true;
    SC.onFollowChange = () => $('#cam-follow').setAttribute('aria-pressed', 'false');
  } catch (e) {
    SC = null; webgl = false; $('#fallback').hidden = false; console.info('3D unavailable, using 2D fallback:', e && e.message);
    $$('#camtools button').forEach(b => { if (b.id !== 'cam-map') b.disabled = true; });
  }
  try {
    const mod = await import('./live3d.js');
    LV = mod.createLive({ toast, t, esc, ltr, $, $$, lang: () => lang, fClock, SC: () => SC, raiseLiveAlert, fxActive: () => !$('#heat-legend').hidden, afterPointing: () => { if (mapOn) renderMapDetail(); } });
  } catch (e) { LV = null; console.error('live module failed', e); }
  buildLabels(); seed(); renderAll();
  if (LV) { LV.init(); LV.applyPointing(); }
  if (webgl) SC.speedMul = SPEED;
  /* events */
  bindSheets();
  const camMap = $('#cam-map'); if (camMap) camMap.addEventListener('click', toggleMap);
  const mapLayer = $('#map-layer'); if (mapLayer) mapLayer.addEventListener('click', () => { if (mvApi) mvApi.toggleBase(); });
  const mapBack = $('#map-back'); if (mapBack) mapBack.addEventListener('click', () => setMapMode(false));
  const mapDetail = $('#map-detail');
  if (mapDetail) mapDetail.addEventListener('click', e => {
    const n = e.target.closest('[data-mv-approve],[data-mv-reject],[data-mv-draft],[data-mv-dismiss]'); if (!n) return;
    if (n.hasAttribute('data-mv-approve')) approve(n.getAttribute('data-mv-approve'));
    else if (n.hasAttribute('data-mv-reject')) reject(n.getAttribute('data-mv-reject'));
    else if (n.hasAttribute('data-mv-draft')) draftFromAlert(n.getAttribute('data-mv-draft'), true);
    else dismissAlert(n.getAttribute('data-mv-dismiss'));
  });
  if (window.WX) WX.onChange(() => { if (mapOn) renderMapDetail(); });
  $$('#langs button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $$('#tabs [role=tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));
  $('#pres').addEventListener('click', () => setPres(!document.body.classList.contains('pres')));
  $('#fs').addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', () => { $('#fs-t').textContent = t(document.fullscreenElement ? 'fs_off' : 'fs_on'); $('#fs').setAttribute('aria-pressed', !!document.fullscreenElement); });
  $$('#camtools [data-cam]').forEach(b => b.addEventListener('click', () => { if (SC) { SC.flyTo(b.dataset.cam); $('#cam-follow').setAttribute('aria-pressed', 'false'); } }));
  $('#cam-cine').addEventListener('click', () => setCine(!(SC && SC.cinematic)));
  $('#cam-follow').addEventListener('click', followToggle);
  $('#cmd-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#cmd').value; if (v.trim()) runCommand(v); });
  $('#al-sim').addEventListener('click', () => raiseAlert());
  $('#al-dispatch').addEventListener('click', () => openReport({ type: 'dispatch' }));
  $('#al-feed').addEventListener('change', e => { S.feed = e.target.checked; });
  $('#al-feed').checked = S.feed;
  $('#csv').addEventListener('click', exportCsv);
  $('#reset').addEventListener('click', () => { resetDemo(); toast(t('toast_reset')); });
  $('#rp-print').addEventListener('click', () => window.print());
  $('#rp-dl').addEventListener('click', downloadReport);
  $('#rp-close').addEventListener('click', closeReport);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#report').hidden) { closeReport(); return; }
    if (e.key === 'Escape' && sheetKind) { closeSheet(); return; }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target || {}).tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p') setPres(!document.body.classList.contains('pres'));
    else if (k === 'f') toggleFs();
    else if (k === 'c') setCine(!(SC && SC.cinematic));
    else if (SC && k === '1') SC.flyTo('overview'); else if (SC && k === '2') SC.flyTo('dish'); else if (SC && k === '3') SC.flyTo('cabinets');
  });
  if (qs.get('pres') === '1') setPres(true);
  if (qs.get('cine') === '1') setCine(true);
  if (qs.get('map') === '1') setMapMode(true);
  setInterval(tick, 1000); tick();
  window.__demo3d = { live: () => LV, wx: window.WX, geo: window.GEO, state: () => S, lang: () => lang, webgl: () => webgl, parse: NLP.parse, scene: () => SC, speed: SPEED, tz: () => tzAbbr(Date.now()), fDT, setPres };
  document.body.dataset.ready = '1';
}
init();

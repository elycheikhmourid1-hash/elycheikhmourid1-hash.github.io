// Security / RLS test for the Mawid backend. Works against the local emulation or live Supabase:
//   SB_URL=... SB_KEY=... STAFF_EMAIL=... STAFF_PASS=... [INTRUDER_EMAIL=... INTRUDER_PASS=...] node security-test.mjs
const URL_ = (process.env.SB_URL || 'http://127.0.0.1:8787/sb').replace(/\/$/, '');
const KEY = process.env.SB_KEY || 'sb_publishable_localtest_0000000000';
const STAFF = [process.env.STAFF_EMAIL || 'reception@local.test', process.env.STAFF_PASS || 'LocalPass-123'];
const INTR = process.env.INTRUDER_EMAIL ? [process.env.INTRUDER_EMAIL, process.env.INTRUDER_PASS] : (process.env.SB_URL ? null : ['intruder@local.test', 'Intruder-123']);
let fails = 0, passes = 0;
function ok(c, msg, extra) { if (c) { passes++; console.log('  ✓', msg); } else { fails++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } }
function H(jwt) { const h = { apikey: KEY, 'Content-Type': 'application/json' }; if (jwt) h.Authorization = 'Bearer ' + jwt; else if (/^eyJ/.test(KEY)) h.Authorization = 'Bearer ' + KEY; return h; }
async function call(method, p, body, jwt, extraH) {
  const r = await fetch(URL_ + p, { method, headers: Object.assign(H(jwt), extraH || {}), body: body ? JSON.stringify(body) : undefined });
  let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch (e) { j = t; }
  return { s: r.status, j };
}
const rpc = (n, a, jwt) => call('POST', '/rest/v1/rpc/' + n, a, jwt);
async function login([e, p]) { const r = await call('POST', '/auth/v1/token?grant_type=password', { email: e, password: p }); return r.j && r.j.access_token; }
function ref() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return 'RDV-' + s; }
function tok() { return require_crypto().randomBytes(18).toString('hex'); }
import crypto from 'crypto'; function require_crypto() { return crypto; }
function nkcDate(add) { const d = new Date(Date.now() + add * 86400000); return d.toISOString().slice(0, 10); }
function nextOpen(from) { let i = from; for (;;) { const d = new Date(Date.now() + i * 86400000); if (d.getUTCDay() !== 5) return nkcDate(i); i++; } }

const created = [];
(async () => {
  console.log('Target:', URL_);
  const day = nextOpen(3), fri = (() => { for (let i = 1; i < 9; i++) { const d = new Date(Date.now() + i * 86400000); if (d.getUTCDay() === 5) return nkcDate(i); } })();
  console.log('anon: direct table access');
  let r = await call('GET', '/rest/v1/bookings?select=*');
  ok(r.s === 401 || r.s === 403 || (Array.isArray(r.j) && r.j.length === 0), 'anon cannot list bookings', r);
  r = await call('POST', '/rest/v1/bookings', { ref: ref(), name: 'Hack', phone: '22222222', service: 'general', appt_date: day, appt_time: '09:00' });
  ok(r.s >= 400, 'anon cannot insert into bookings directly', r);
  r = await call('GET', '/rest/v1/booking_secrets?select=*');
  ok(r.s >= 400 || (Array.isArray(r.j) && !r.j.length), 'anon cannot read booking_secrets', r);
  r = await call('GET', '/rest/v1/booking_events?select=*');
  ok(r.s >= 400 || (Array.isArray(r.j) && !r.j.length), 'anon cannot read booking_events', r);
  r = await call('GET', '/rest/v1/staff?select=*');
  ok(r.s >= 400 || (Array.isArray(r.j) && !r.j.length), 'anon cannot read staff', r);
  r = await rpc('is_staff', {});
  ok(r.s >= 400 || r.j === false, 'anon is_staff() not callable / false', r);

  console.log('anon: create_booking RPC');
  const b1 = { p_ref: ref(), p_token: tok(), p_name: 'TEST Sécurité', p_phone: '00000091', p_lang: 'fr', p_service: 'general', p_date: day, p_time: '09:30', p_note: 'test automatique', p_deposit: false };
  r = await rpc('create_booking', b1);
  ok(r.s === 200 && r.j[0] && r.j[0].status === 'pending', 'create_booking works for anon', r); created.push(b1.p_ref);
  r = await rpc('create_booking', Object.assign({}, b1, { p_ref: ref(), p_token: tok(), p_phone: '00000092' }));
  ok(r.s >= 400 && /slot_taken/.test(JSON.stringify(r.j)), 'same slot twice → slot_taken', r);
  r = await rpc('create_booking', Object.assign({}, b1, { p_token: tok(), p_time: '10:00' }));
  ok(r.s >= 400 && /ref_taken/.test(JSON.stringify(r.j)), 'same booking number twice → ref_taken', r);
  r = await rpc('create_booking', Object.assign({}, b1, { p_ref: ref(), p_date: fri, p_time: '10:00' }));
  ok(r.s >= 400 && /closed_day/.test(JSON.stringify(r.j)), 'Friday → closed_day', r);
  r = await rpc('create_booking', Object.assign({}, b1, { p_ref: ref(), p_date: nkcDate(-1) }));
  ok(r.s >= 400 && /bad_date/.test(JSON.stringify(r.j)), 'past date → bad_date', r);
  r = await rpc('create_booking', Object.assign({}, b1, { p_ref: ref(), p_time: '03:00' }));
  ok(r.s >= 400 && /bad_time/.test(JSON.stringify(r.j)), 'time outside clinic slots → bad_time', r);
  r = await rpc('create_booking', Object.assign({}, b1, { p_ref: ref(), p_token: 'short', p_time: '11:00' }));
  ok(r.s >= 400 && /bad_token/.test(JSON.stringify(r.j)), 'short token → bad_token', r);
  r = await rpc('create_booking', Object.assign({}, b1, { p_ref: ref(), p_phone: '123', p_time: '11:00' }));
  ok(r.s >= 400, 'invalid phone rejected', r);

  console.log('anon: get_bookings / taken_slots');
  r = await rpc('get_bookings', { p_items: [{ ref: b1.p_ref, token: b1.p_token }] });
  ok(r.s === 200 && r.j.length === 1 && r.j[0].status === 'pending' && !('token_hash' in r.j[0]) && !('id' in r.j[0]), 'own booking readable with ref + token (no id/token in output)', r);
  r = await rpc('get_bookings', { p_items: [{ ref: b1.p_ref, token: tok() }] });
  ok(r.s === 200 && r.j.length === 0, 'wrong token → nothing', r);
  r = await rpc('get_bookings', { p_items: [{ ref: b1.p_ref, phone: '+222 00 00 00 91' }] });
  ok(r.s === 200 && r.j.length === 1, 'ref + phone also works', r);
  r = await rpc('get_bookings', { p_items: [{ ref: b1.p_ref }] });
  ok(r.s === 200 && r.j.length === 0, 'ref alone → nothing', r);
  r = await rpc('get_bookings', { p_items: [{ ref: b1.p_ref, phone: '00000000' }] });
  ok(r.s === 200 && r.j.length === 0, 'ref + wrong phone → nothing', r);
  r = await rpc('taken_slots', { p_from: day, p_to: day });
  ok(r.s === 200 && r.j.some(x => x.appt_time === '09:30') && r.j.every(x => Object.keys(x).length === 2), 'taken_slots returns only date/time', r);

  if (INTR) {
    console.log('authenticated but NOT staff');
    const ij = await login(INTR);
    ok(!!ij, 'intruder can log in (test user)');
    r = await call('GET', '/rest/v1/bookings?select=id,ref', null, ij);
    ok(r.s === 200 && r.j.length === 0, 'non-staff user sees no bookings', r);
    r = await call('PATCH', '/rest/v1/bookings?ref=eq.' + b1.p_ref, { status: 'rejected' }, ij, { Prefer: 'return=representation' });
    ok((r.s === 200 && r.j.length === 0) || r.s >= 400, 'non-staff user cannot update', r);
    r = await call('DELETE', '/rest/v1/bookings?ref=eq.' + b1.p_ref, null, ij, { Prefer: 'return=representation' });
    ok((r.s === 200 && r.j.length === 0) || r.s >= 400, 'non-staff user cannot delete', r);
  }

  console.log('staff');
  const bad = await login([STAFF[0], 'wrong-password']);
  ok(!bad, 'wrong password refused');
  const sj = await login(STAFF);
  ok(!!sj, 'staff login works');
  r = await rpc('is_staff', {}, sj); ok(r.j === true, 'is_staff() = true', r);
  r = await call('GET', '/rest/v1/bookings?select=id,ref,status&ref=eq.' + b1.p_ref, null, sj);
  ok(r.s === 200 && r.j.length === 1, 'staff can list bookings', r);
  const id = r.j[0] && r.j[0].id;
  r = await call('PATCH', '/rest/v1/bookings?id=eq.' + id, { ref: 'RDV-HACKED' }, sj, { Prefer: 'return=representation' });
  ok(r.s >= 400, 'staff cannot change booking number (column privilege)', r);
  r = await call('PATCH', '/rest/v1/bookings?id=eq.' + id, { name: 'X' }, sj, { Prefer: 'return=representation' });
  ok(r.s >= 400, 'staff cannot rewrite patient name', r);
  r = await call('PATCH', '/rest/v1/bookings?id=eq.' + id, { status: 'confirmed', staff_note: 'Merci, à bientôt', appt_time: '10:30' }, sj, { Prefer: 'return=representation' });
  ok(r.s === 200 && r.j[0].status === 'confirmed' && r.j[0].decided_by && r.j[0].orig_time === '09:30' && r.j[0].appt_time === '10:30', 'staff confirms + reschedules (decided_by, orig_time set)', r);
  r = await call('PATCH', '/rest/v1/bookings?id=eq.' + id, { status: 'maybe' }, sj, { Prefer: 'return=representation' });
  ok(r.s >= 400, 'invalid status rejected', r);
  r = await rpc('get_bookings', { p_items: [{ ref: b1.p_ref, token: b1.p_token }] });
  ok(r.j[0] && r.j[0].status === 'confirmed' && r.j[0].staff_note === 'Merci, à bientôt' && r.j[0].appt_time === '10:30', 'patient sees confirmed + note + new time', r);
  r = await rpc('taken_slots', { p_from: day, p_to: day });
  ok(r.j.some(x => x.appt_time === '10:30') && !r.j.some(x => x.appt_time === '09:30'), 'slot moved in taken_slots', r);
  r = await call('GET', '/rest/v1/booking_events?select=action,actor&booking_id=eq.' + id, null, sj);
  ok(r.s === 200 && r.j.some(e => e.action === 'created') && r.j.some(e => e.action === 'confirmed') && r.j.some(e => e.action === 'rescheduled'), 'audit events recorded', r);

  console.log('cleanup');
  for (const rf of created) { r = await call('DELETE', '/rest/v1/bookings?ref=eq.' + rf, null, sj, { Prefer: 'return=representation' }); ok(r.s === 200 && r.j.length === 1, 'staff deletes test booking ' + rf, r); }
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exitCode = fails ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });

/* AICore Mawʿid — tiny Supabase client (fetch only, no library).
 * Patients: RPC functions with the public key (create_booking, get_bookings, taken_slots).
 * Staff: e-mail + password (Supabase Auth), then REST on the bookings table (RLS: staff only). */
(function (global) {
  'use strict';
  var C = global.MAWID_CONFIG || {};
  var BASE = String(C.supabaseUrl || '').replace(/\/+$/, '');
  var KEY = String(C.supabaseKey || '');
  var enabled = !!(BASE && KEY);
  var TIMEOUT = 12000;
  var SESSION_KEY = 'mawid_staff_session_v1';
  var COLS = 'id,ref,status,name,phone,lang,service,appt_date,appt_time,orig_date,orig_time,note,deposit,staff_note,decided_by,decided_at,created_at,updated_at';

  function ApiError(message, status, code) { this.message = message; this.status = status || 0; this.code = code || ''; }
  ApiError.prototype = Object.create(Error.prototype);

  function headers(jwt, extra) {
    var h = { apikey: KEY, 'Content-Type': 'application/json', Accept: 'application/json' };
    if (jwt) h.Authorization = 'Bearer ' + jwt;
    else if (/^eyJ/.test(KEY)) h.Authorization = 'Bearer ' + KEY; // legacy anon JWT key
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  function req(method, path, body, jwt, extra) {
    if (!enabled) return Promise.reject(new ApiError('not_configured', 0, 'not_configured'));
    var ctrl = global.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
    var opts = { method: method, headers: headers(jwt, extra), cache: 'no-store' };
    if (body !== undefined) opts.body = JSON.stringify(body);
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(BASE + path, opts).then(function (r) {
      clearTimeout(timer);
      return r.text().then(function (txt) {
        var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = txt; }
        if (!r.ok) {
          var msg = (j && (j.message || j.error_description || j.msg || j.error)) || ('http_' + r.status);
          throw new ApiError(String(msg), r.status, (j && j.code) || '');
        }
        return j;
      });
    }, function (e) {
      clearTimeout(timer);
      throw new ApiError('network', 0, 'network');
    });
  }
  function rpc(name, args, jwt) { return req('POST', '/rest/v1/rpc/' + name, args || {}, jwt); }

  /* ---------- patient side ---------- */
  function newToken() {
    var a = new Uint8Array(24), s = '';
    if (global.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < a.length; j++) s += ('0' + a[j].toString(16)).slice(-2);
    return s; // 48 hex chars (192 bits)
  }
  function createBooking(b, token) {
    return rpc('create_booking', {
      p_ref: b.ref, p_token: token, p_name: b.name, p_phone: b.phone, p_lang: b.lang || 'ar',
      p_service: b.service, p_date: b.date, p_time: b.time, p_note: b.note || '',
      p_deposit: !!(b.deposit === true || (b.deposit && b.deposit.status === 'awaiting'))
    }).then(function (rows) { return rows && rows[0]; });
  }
  /** items: [{ref, token} | {ref, phone}] → rows */
  function getBookings(items) { return rpc('get_bookings', { p_items: items }); }
  function takenSlots(from, to) { return rpc('taken_slots', { p_from: from, p_to: to }); }

  /* ---------- staff auth ---------- */
  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function saveSession(s) {
    if (!s) { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} return null; }
    var o = { access_token: s.access_token, refresh_token: s.refresh_token,
      expires_at: s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)),
      email: (s.user && s.user.email) || s.email || '' };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(o)); } catch (e) {}
    return o;
  }
  function login(email, password) {
    return req('POST', '/auth/v1/token?grant_type=password', { email: email, password: password }).then(saveSession);
  }
  var refreshing = null;
  function token() {
    var s = loadSession();
    if (!s) return Promise.reject(new ApiError('no_session', 401, 'no_session'));
    if (s.expires_at - 90 > Date.now() / 1000) return Promise.resolve(s.access_token);
    if (!refreshing) {
      refreshing = req('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token })
        .then(function (n) { refreshing = null; return saveSession(Object.assign({ email: s.email }, n)).access_token; },
          function (e) { refreshing = null; if (e.status >= 400 && e.status < 500) saveSession(null); throw e; });
    }
    return refreshing;
  }
  function logout() {
    var s = loadSession(); saveSession(null);
    if (s && enabled) return req('POST', '/auth/v1/logout', {}, s.access_token).catch(function () {});
    return Promise.resolve();
  }
  function isStaff() { return token().then(function (jwt) { return rpc('is_staff', {}, jwt); }); }
  function staffName() {
    return token().then(function (jwt) { return req('GET', '/rest/v1/staff?select=name&limit=1', undefined, jwt); })
      .then(function (rows) { return (rows && rows[0] && rows[0].name) || ''; });
  }
  function listBookings() {
    return token().then(function (jwt) {
      return req('GET', '/rest/v1/bookings?select=' + COLS + '&order=created_at.desc&limit=500', undefined, jwt);
    });
  }
  function updateBooking(id, patch) {
    return token().then(function (jwt) {
      return req('PATCH', '/rest/v1/bookings?id=eq.' + encodeURIComponent(id) + '&select=' + COLS, patch, jwt, { Prefer: 'return=representation' });
    }).then(function (rows) {
      if (!rows || !rows.length) throw new ApiError('not_allowed', 403, 'not_allowed');
      return rows[0];
    });
  }
  function deleteBooking(id) {
    return token().then(function (jwt) {
      return req('DELETE', '/rest/v1/bookings?id=eq.' + encodeURIComponent(id), undefined, jwt, { Prefer: 'return=minimal' });
    });
  }

  global.API = {
    enabled: enabled, ApiError: ApiError, newToken: newToken,
    createBooking: createBooking, getBookings: getBookings, takenSlots: takenSlots,
    session: loadSession, login: login, logout: logout, isStaff: isStaff, staffName: staffName,
    listBookings: listBookings, updateBooking: updateBooking, deleteBooking: deleteBooking
  };
})(window);

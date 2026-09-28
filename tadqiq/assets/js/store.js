/* AICore Tadqiq — state (localStorage), actions and audit log.
 * Every action records who did it and when. The system only prepares; decisions are human. */
(function (global) {
  'use strict';
  var C = Core, KEY = 'tadqiq_demo_v1', state = null, cache = null;
  I18N.add('ar', { ev_review_start: 'بدء المراجعة' });
  I18N.add('fr', { ev_review_start: 'Début de l’instruction' });

  function save() { cache = null; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function log(by, action, file, d, ts) {
    state.log.push({ id: uid(), ts: ts || new Date().toISOString(), by: by, action: action, file: file || null, d: d || null });
  }
  function plus(iso, min) { return new Date(new Date(iso).getTime() + min * 60000).toISOString(); }

  function seed(keepUser) {
    var user = keepUser || (state && state.user) || 'mariem';
    state = { v: 1, seededOn: C.todayKey(), files: Seed.build(), log: [], settings: JSON.parse(JSON.stringify(C.DEFAULT_SETTINGS)), user: user, seq: 143, lastSeen: {} };
    state.files.forEach(function (f) {
      var r = C.run(f, state.files, state.settings);
      log('system', 'received', f.id, { k: 'src_' + f.source }, f.receivedAt);
      log('system', 'extracted', f.id, { k: 'd_fields', v: { n: r.fields.length } }, plus(f.receivedAt, 1));
      log('system', 'checked', f.id, { k: 'd_checks', v: { n: r.checksRun, f: r.flags.length } }, plus(f.receivedAt, 1));
      log('system', 'drafted', f.id, { k: 'd_drafts' }, plus(f.receivedAt, 2));
    });
    Seed.HISTORY.forEach(function (h) {
      var f = file(h.file);
      h.ev.forEach(function (e) {
        var ts = Seed.ago(e[2]), type = e[0];
        if (type.indexOf('decision_') === 0) f.decisions.push({ type: type.slice(9), by: e[1], at: ts, reason: e[3] });
        if (type === 'msg_open') f.msg = { lang: f.lang, openedBy: e[1], openedAt: ts };
        if (type === 'msg_sent') { f.msg.sentBy = e[1]; f.msg.sentAt = ts; }
        log(e[1], type, f.id, e[3] || null, ts);
      });
    });
    state.log.sort(function (a, b) { return a.ts < b.ts ? -1 : 1; });
    save();
  }
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || state.v !== 1 || state.seededOn !== C.todayKey()) seed();
    return state;
  }
  function files() { return state.files; }
  function file(id) { return state.files.find(function (f) { return f.id === id; }); }
  function settings() { return state.settings; }
  function result(f) {
    cache = cache || {};
    var k = f.id + I18N.lang;
    if (!cache[k]) cache[k] = C.run(f, state.files, state.settings);
    return cache[k];
  }
  function openFlags(f) {
    var r = result(f);
    return r.flags.filter(function (fl) { return !(f.reviews || {})[C.flagKey(fl)]; });
  }
  function act(fn) { var r = fn(); save(); return r; }
  var STATUS_OF = { approve: 'approved', reject: 'rejected', docs: 'incomplete', escalate: 'compliance' };

  var A = {
    startReview: function (id, by) { return act(function () { var f = file(id); if (f.status !== 'new') return; f.status = 'review'; f.assigned = by; log(by, 'review_start', id); }); },
    decide: function (id, by, type, reason) {
      return act(function () {
        var f = file(id), at = new Date().toISOString();
        f.decisions.push({ type: type, by: by, at: at, reason: reason });
        f.status = STATUS_OF[type]; f.assigned = f.assigned || by;
        if (type === 'escalate') f.compliance = null;
        log(by, 'decision_' + type, id, reason, at);
      });
    },
    reviewFlag: function (id, key, code, by, status, note) {
      return act(function () { var f = file(id); f.reviews = f.reviews || {}; f.reviews[key] = { status: status, by: by, at: new Date().toISOString(), note: note, code: code }; log(by, status === 'confirmed' ? 'flag_confirm' : 'flag_clear', id, { k: 'fx_' + code, note: note }); });
    },
    reopenFlag: function (id, key, code, by) { return act(function () { var f = file(id); delete f.reviews[key]; log(by, 'flag_reopen', id, { k: 'fx_' + code }); }); },
    saveMemo: function (id, by, text) { return act(function () { var f = file(id); f.memo = { text: text, by: by, at: new Date().toISOString(), lang: I18N.lang }; log(by, 'memo_edit', id); }); },
    resetMemo: function (id) { return act(function () { file(id).memo = null; }); },
    msgOpen: function (id, by, lang) { return act(function () { var f = file(id); f.msg = Object.assign(f.msg || {}, { lang: lang, openedBy: by, openedAt: new Date().toISOString() }); log(by, 'msg_open', id, { k: 'msg_' + lang }); }); },
    msgSent: function (id, by, lang) { return act(function () { var f = file(id); f.msg = Object.assign(f.msg || {}, { lang: lang, sentBy: by, sentAt: new Date().toISOString() }); log(by, 'msg_sent', id, { k: 'msg_' + lang }); }); },
    compliance: function (id, by, op, note) {
      return act(function () {
        var f = file(id), at = new Date().toISOString();
        f.compliance = { op: op, by: by, at: at, note: note };
        if (op === 'reject') { f.status = 'rejected'; f.decisions.push({ type: 'reject', by: by, at: at, reason: note, comp: true }); }
        else f.status = 'review';
        log(by, 'comp_' + op, id, note, at);
      });
    },
    reopen: function (id, by) { return act(function () { var f = file(id); f.status = 'review'; log(by, 'reopen', id); }); },
    setSettings: function (by, s) { return act(function () { Object.assign(state.settings, s); log(by, 'settings', null, { k: 'd_settings', v: { dti: s.dti, cash: C.num(s.cash) } }); }); },
    addFile: function (f, by) {
      return act(function () {
        f.id = 'TDQ-0' + (state.seq++); f.receivedAt = new Date().toISOString(); f.status = 'new';
        f.reviews = {}; f.decisions = []; f.memo = null; f.msg = null; f.compliance = null;
        state.files.unshift(f); cache = null;
        var r = C.run(f, state.files, state.settings);
        log(by, 'sim', f.id);
        log('system', 'received', f.id, { k: 'src_' + f.source });
        log('system', 'extracted', f.id, { k: 'd_fields', v: { n: r.fields.length } });
        log('system', 'checked', f.id, { k: 'd_checks', v: { n: r.checksRun, f: r.flags.length } });
        log('system', 'drafted', f.id, { k: 'd_drafts' });
        return f;
      });
    },
    setUser: function (id) { return act(function () { if (state.user !== id) { state.user = id; log(id, 'role', null, { k: C.staff(id).role === 'compliance' ? 'role_compliance' : 'role_credit' }); } }); },
    reset: function () { var u = state.user; seed(u); log(u, 'reset'); save(); }
  };
  I18N.add('ar', { d_settings: 'نسبة التحمل {dti}% · عتبة النقد {cash}' });
  I18N.add('fr', { d_settings: 'Endettement {dti} % · seuil espèces {cash}' });

  global.Store = { load: load, save: save, files: files, file: file, settings: settings, result: result, openFlags: openFlags, A: A, get state() { return state; }, KEY: KEY };
})(window);

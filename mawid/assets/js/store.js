/* AICore Mawʿid — data store (localStorage), demo seed, actions + audit log
 * DEMO ONLY: all names, phone numbers and payments are fictional.
 * Every state change goes through act() which writes an audit-log entry
 * with the named staff member and a timestamp (human-in-the-loop proof). */
(function (global) {
  'use strict';
  var KEY = 'mawid_demo_v1';

  var CLINIC = {
    waNumber: '22200000000',          // placeholder clinic WhatsApp (fake)
    phoneDisplay: '+222 00 00 00 00',
    depositAmount: 500,
    merchants: [
      { name: 'Bankily', number: '00 00 00 11' },
      { name: 'Sedad', number: '00 00 00 22' },
      { name: 'Masrvi', number: '00 00 00 33' }
    ]
  };

  var SERVICES = [
    { id: 'general', price: 1000, icon: 'stethoscope' },
    { id: 'cleaning', price: 2500, icon: 'sparkle' },
    { id: 'filling', price: 2000, icon: 'tooth' },
    { id: 'extraction', price: 1800, icon: 'pliers' },
    { id: 'ortho', price: 1500, icon: 'braces' },
    { id: 'emergency', price: 1200, icon: 'alert' }
  ];

  var STAFF = [
    { id: 'mariem', ar: 'مريم', fr: 'Mariem', role: 'reception', color: '#118A8F' },
    { id: 'sidi', ar: 'سيدي', fr: 'Sidi', role: 'reception', color: '#D97B29' },
    { id: 'ahmed', ar: 'د. أحمد', fr: 'Dr Ahmed', role: 'owner', color: '#4B5FA8' }
  ];

  var MORNING = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
  var EVENING = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
  var SLOTS = MORNING.concat(EVENING);

  /* ---------- date helpers (local time) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
  function todayKey() { return dateKey(new Date()); }
  function isClosed(k) { return parseKey(k).getDay() === 5; } // Friday closed
  function nextOpenDay(k) { var n = addDays(k, 1); while (isClosed(n)) n = addDays(n, 1); return n; }
  function at(k, hhmm) { var d = parseKey(k); var p = hhmm.split(':'); d.setHours(+p[0], +p[1], 0, 0); return d; }
  function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }

  /* ---------- formatting ---------- */
  function L() { return global.I18N ? I18N.lang : 'ar'; }
  function fmtDate(k, lang, opts) {
    return new Intl.DateTimeFormat(I18N.locale(lang), opts || { weekday: 'long', day: 'numeric', month: 'long' }).format(parseKey(k));
  }
  function fmtDateShort(k, lang) { return fmtDate(k, lang, { weekday: 'short', day: 'numeric', month: 'short' }); }
  function fmtStamp(iso, lang) {
    var d = new Date(iso);
    var dk = dateKey(d), tk = todayKey();
    var time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (dk === tk) return I18N.t('today', null, lang) + ' ' + time;
    if (dk === addDays(tk, -1)) return ((lang || L()) === 'fr' ? 'Hier' : 'أمس') + ' ' + time;
    return fmtDate(dk, lang, { day: 'numeric', month: 'short' }) + ' ' + time;
  }
  function money(n, lang) {
    lang = lang || L();
    var s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? '\u202f' : ',');
    return s + ' ' + I18N.t('currency', null, lang);
  }
  function phoneDisplay(p) { // p = 8 digits
    return '+222 ' + p.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }
  function staffName(id, lang) {
    if (id === 'patient') return I18N.t('actor_patient', null, lang);
    if (id === 'system') return I18N.t('actor_system', null, lang);
    var s = STAFF.find(function (x) { return x.id === id; });
    return s ? s[(lang || L())] : id;
  }
  function service(id) { return SERVICES.find(function (s) { return s.id === id; }) || SERVICES[0]; }

  /* ---------- persistence ---------- */
  var state = null;
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { state = null; }
    if (!state || state.version !== 1 || state.seedDay !== todayKey()) { seed(); }
    return state;
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  function nextRef() {
    state.refCounter = (state.refCounter || 1040) + 1 + Math.floor(Math.random() * 3);
    return 'AM-' + state.refCounter;
  }

  function addLog(actor, action, booking, details, ts) {
    var e = { id: uid(), ts: ts || new Date().toISOString(), actor: actor, action: action,
      ref: booking ? booking.ref : null, bookingId: booking ? booking.id : null,
      name: booking ? booking.name : null, details: details || null };
    state.log.push(e);
    return e;
  }

  /* ---------- demo seed ---------- */
  function seed() {
    var PAT = [
      ['محمد الأمين ولد أحمد', 'ar'], ['فاطمة منت محمد', 'ar'], ['Aïssata Sy', 'fr'], ['سيدي محمد ولد إبراهيم', 'ar'],
      ['خديجة منت سالم', 'ar'], ['Mamadou Ba', 'fr'], ['الشيخ ولد عبد الله', 'ar'], ['توت منت المختار', 'ar'],
      ['Fatimetou Mint Ely', 'fr'], ['أحمدو ولد محمود', 'ar'], ['آمنة منت اعلي', 'ar'], ['Moussa Diallo', 'fr'],
      ['عبد الرحمن ولد الشيخ', 'ar'], ['زينب منت أحمد سالم', 'ar'], ['Khadijetou Mint Brahim', 'fr'], ['يحيى ولد الحسن', 'ar'],
      ['النانة منت محمد فال', 'ar'], ['Oumar Kane', 'fr'], ['لالة منت بوبكر', 'ar'], ['سيد أحمد ولد الداه', 'ar'],
      ['Coumba Sow', 'fr'], ['أم كلثوم منت الشيخ', 'ar'], ['الحسين ولد محمد الأمين', 'ar'], ['Mohamed Salem Ould Cheikh', 'fr'],
      ['مكفولة منت أحمد', 'ar'], ['إسلمو ولد سيدي المختار', 'ar'], ['Hawa Ndiaye', 'fr'], ['عيشة منت سيدي', 'ar'],
      ['محمد ولد اسويدي', 'ar'], ['Djibril Wane', 'fr'], ['أم الخيري منت الطالب', 'ar'], ['بنت الشيخ منت أحمدو', 'ar'],
      ['Aminata Diop', 'fr'], ['محمد فال ولد الحاج', 'ar'], ['اعل سالم ولد باب', 'ar'], ['Salif Camara', 'fr'],
      ['مريم منت الداه', 'ar'], ['حمادي ولد سيد أحمد', 'ar']
    ];
    var NOTES_AR = ['عندي وجع ف ضرسي من البارح', 'ابغيت انجيب معاي ولدي، عندو 8 سنين', 'سنّي مكسور ويوجعني كثير',
      'أول مرة نجي للعيادة', 'إذا ممكن بعد العصر', 'تنظيف دوري كل ستة أشهر', 'مراجعة بعد الحشوة'];
    var NOTES_FR = ['Douleur depuis deux jours', 'Contrôle de l’appareil dentaire', 'Première visite', 'Gencives qui saignent'];

    // deterministic pseudo-random
    var s = 20260927;
    function rnd() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }

    state = { version: 1, seedDay: todayKey(), refCounter: 1040, bookings: [], log: [] };
    var T = todayKey();
    var now = new Date();
    var pi = 0;
    var used = {};
    function takeSlot(day, pref) {
      var list = pref === 'm' ? MORNING : pref === 'e' ? EVENING : SLOTS;
      for (var i = 0; i < 40; i++) {
        var sl = pick(list);
        if (!used[day + sl]) { used[day + sl] = 1; return sl; }
      }
      return list.find(function (x) { return !used[day + x] && (used[day + x] = 1); });
    }
    function iso(d) { return d.toISOString(); }
    function minutes(d, m) { return new Date(d.getTime() + m * 60000); }
    function clampPast(d, maxBackMin) { return d > now ? new Date(now.getTime() - (5 + rnd() * (maxBackMin || 60)) * 60000) : d; }

    function make(day, slot, opts) {
      var p = PAT[pi++ % PAT.length];
      var svc = opts.svc || pick(['general', 'general', 'cleaning', 'filling', 'extraction', 'ortho', 'emergency', 'cleaning']);
      var created = at(addDays(day, -(1 + Math.floor(rnd() * 3))), pad(8 + Math.floor(rnd() * 13)) + ':' + pad(Math.floor(rnd() * 60)));
      created = clampPast(created, opts.recent ? 600 : 1500);
      var hasNote = rnd() < 0.45;
      var b = {
        id: uid(), ref: nextRef(), name: p[0], lang: p[1],
        phone: '000000' + pad(pi), service: svc, date: day, time: slot,
        note: hasNote ? pick(p[1] === 'fr' ? NOTES_FR : NOTES_AR) : '',
        status: 'pending', createdAt: iso(created), source: 'web',
        decision: null, proposal: null, deposit: { status: 'none' },
        reminder: null, attendance: null
      };
      state.bookings.push(b);
      addLog('patient', 'created', b, null, b.createdAt);
      return b;
    }
    function decide(b, staff, status, extra) {
      var t = minutes(new Date(b.createdAt), 12 + Math.floor(rnd() * 80));
      t = clampPast(t, 20);
      b.status = status;
      b.decision = { by: staff, at: iso(t), reason: extra && extra.reason || null };
      addLog(staff, status === 'confirmed' ? 'confirmed' : status === 'refused' ? 'refused' : 'cancelled', b,
        extra && extra.reason ? { reason: extra.reason } : null, iso(t));
      if (status !== 'cancelled') addLog(staff, 'wa_opened', b, { kind: status === 'confirmed' ? 'confirm' : 'refuse' }, iso(minutes(t, 1)));
      return t;
    }
    function deposit(b, staff, verified) {
      b.deposit = { status: 'awaiting', amount: CLINIC.depositAmount, requestedBy: staff };
      if (verified) {
        var vt = clampPast(minutes(new Date(b.decision ? b.decision.at : b.createdAt), 90 + Math.floor(rnd() * 240)), 30);
        b.deposit.status = 'verified'; b.deposit.verifiedBy = verified; b.deposit.verifiedAt = iso(vt);
        b.deposit.method = pick(['Bankily', 'Bankily', 'Bankily', 'Sedad', 'Masrvi']);
        addLog(verified, 'deposit_verified', b, { method: b.deposit.method, amount: CLINIC.depositAmount }, b.deposit.verifiedAt);
      }
    }
    function remind(b, staff) {
      var rt = clampPast(at(addDays(b.date, -1), '18:' + pad(10 + Math.floor(rnd() * 40))), 30);
      b.reminder = { by: staff, at: iso(rt) };
      addLog(staff, 'reminder_sent', b, null, b.reminder.at);
    }
    function attend(b, staff, val) {
      var t = minutes(at(b.date, b.time), 10 + Math.floor(rnd() * 25));
      b.attendance = { value: val, by: staff, at: iso(t) };
      addLog(staff, val === 'attended' ? 'attended' : 'noshow', b, null, iso(t));
    }

    // Past 7 days
    var pastPlan = ['A', 'A', 'N', 'A', 'R', 'A', 'A', 'C', 'A', 'N', 'A', 'A', 'R', 'A', 'A', 'N', 'A', 'A', 'A', 'A'];
    var k = 0;
    for (var d = -7; d <= -1; d++) {
      var day = addDays(T, d);
      if (isClosed(day)) continue;
      var count = (d % 2 === 0) ? 4 : 3;
      for (var j = 0; j < count && k < pastPlan.length; j++, k++) {
        var code = pastPlan[k];
        var b = make(day, takeSlot(day, j % 2 ? 'e' : 'm'), {});
        var st = pick(['mariem', 'mariem', 'sidi']);
        if (code === 'R') { decide(b, st, 'refused', { reason: pick(['r_full', 'r_doctor', 'r_duplicate']) }); continue; }
        decide(b, st, 'confirmed');
        if (code === 'C') { b.status = 'cancelled'; b.decision.cancelledAt = iso(minutes(new Date(b.decision.at), 300)); addLog(st, 'cancelled', b, null, b.decision.cancelledAt); continue; }
        if (rnd() < 0.4) deposit(b, st, pick(['mariem', 'sidi', 'ahmed']));
        if (rnd() < 0.75) remind(b, pick(['mariem', 'sidi']));
        attend(b, pick(['mariem', 'sidi']), code === 'N' ? 'noshow' : 'attended');
      }
    }

    // Today (morning ones already happened)
    if (!isClosed(T)) {
      var todays = [['m', 'A'], ['m', 'A'], ['m', 'N'], ['e', ''], ['e', '']];
      todays.forEach(function (x, i) {
        var b = make(T, takeSlot(T, x[0]), { svc: i === 0 ? 'cleaning' : null });
        decide(b, i % 2 ? 'sidi' : 'mariem', 'confirmed');
        if (i === 1 || i === 4) deposit(b, 'mariem', 'sidi');
        if (i === 3) deposit(b, 'mariem', null);
        remind(b, 'sidi');
        if (x[1] && at(T, b.time) < now) attend(b, 'mariem', x[1] === 'A' ? 'attended' : 'noshow');
      });
    }

    // Next open day ("tomorrow") — reminders to send
    var N1 = nextOpenDay(T);
    ['m', 'm', 'm', 'e', 'e', 'e'].forEach(function (p, i) {
      var b = make(N1, takeSlot(N1, p), { svc: ['general', 'cleaning', 'ortho', 'filling', 'general', 'extraction'][i] });
      decide(b, i % 2 ? 'sidi' : 'mariem', 'confirmed');
      if (i === 1) deposit(b, 'mariem', 'ahmed');
      if (i === 3) deposit(b, 'sidi', null);
      if (i < 2) remind(b, 'sidi');
    });

    // Following days — confirmed + a couple pending
    var N2 = nextOpenDay(N1), N3 = nextOpenDay(N2);
    [[N2, 'm'], [N2, 'e'], [N3, 'm']].forEach(function (x, i) {
      var b = make(x[0], takeSlot(x[0], x[1]), {});
      decide(b, 'mariem', 'confirmed');
      if (i === 0) deposit(b, 'mariem', null);
    });

    // New requests awaiting review (created in the last hours)
    var pend = [
      [N1, 'e', 'emergency', ['سنّي مكسور ويوجعني كثير', 'Dent cassée, douleur forte'], true],
      [N1, 'm', 'general', ['عندي وجع ف ضرسي من البارح', 'Douleur à une molaire depuis hier'], false],
      [N2, 'm', 'cleaning', null, true],
      [N2, 'e', 'ortho', ['مراجعة التقويم', 'Contrôle de l’appareil dentaire'], false],
      [N3, 'e', 'filling', ['إذا ممكن بعد العصر', 'De préférence en fin d’après-midi'], false],
      [N3, 'm', 'general', ['ابغيت انجيب معاي ولدي، عندو 8 سنين', 'Je viendrai avec mon fils de 8 ans'], false]
    ];
    pend.forEach(function (x, i) {
      var b = make(x[0], takeSlot(x[0], x[1]), { svc: x[2], recent: true });
      b.note = x[3] ? x[3][b.lang === 'fr' ? 1 : 0] : '';
      if (x[4]) b.deposit = { status: 'awaiting', amount: CLINIC.depositAmount, requestedBy: 'patient' };
      // spread "received" times across last few hours
      var c = new Date(now.getTime() - (25 + i * 47 + Math.floor(rnd() * 20)) * 60000);
      b.createdAt = c.toISOString();
      var le = state.log.find(function (e) { return e.bookingId === b.id && e.action === 'created'; });
      if (le) le.ts = b.createdAt;
    });
    // one "proposed another time" awaiting patient reply
    var pb = state.bookings.filter(function (b) { return b.status === 'pending'; })[4];
    if (pb) {
      var ns = SLOTS.find(function (sl) { return !used[N3 + sl]; });
      used[N3 + ns] = 1;
      var pt = new Date(new Date(pb.createdAt).getTime() + 9 * 60000);
      if (pt > now) pt = new Date(now.getTime() - 3 * 60000);
      pb.status = 'proposed';
      pb.proposal = { date: N3, time: ns, oldDate: pb.date, oldTime: pb.time, by: 'sidi', at: pt.toISOString() };
      addLog('sidi', 'proposed', pb, { date: N3, time: ns }, pt.toISOString());
      addLog('sidi', 'wa_opened', pb, { kind: 'propose' }, new Date(pt.getTime() + 60000).toISOString());
    }

    state.log.sort(function (a, b) { return a.ts < b.ts ? -1 : 1; });
    save();
  }

  /* ---------- queries ---------- */
  function all() { return state.bookings; }
  function get(id) { return state.bookings.find(function (b) { return b.id === id; }); }
  function effTime(b) { return b.status === 'proposed' && b.proposal ? { date: b.proposal.date, time: b.proposal.time } : { date: b.date, time: b.time }; }
  function isTaken(date, time, excludeId) {
    return state.bookings.some(function (b) {
      if (b.id === excludeId) return false;
      if (b.status === 'refused' || b.status === 'cancelled') return false;
      var e = effTime(b);
      return e.date === date && e.time === time;
    });
  }
  function slotsFor(date, excludeId) {
    var now = new Date();
    return SLOTS.map(function (sl) {
      return { time: sl, period: MORNING.indexOf(sl) >= 0 ? 'm' : 'e', taken: isTaken(date, sl, excludeId), past: at(date, sl) <= now };
    });
  }

  /* ---------- actions (each writes the audit log) ---------- */
  function act(fn) { var r = fn(); save(); return r; }

  var A = {
    create: function (data) {
      return act(function () {
        if (isTaken(data.date, data.time)) throw new Error('taken');
        var b = {
          id: uid(), ref: nextRef(), name: data.name.trim(), lang: data.lang || 'ar', phone: data.phone,
          service: data.service, date: data.date, time: data.time, note: (data.note || '').trim(),
          status: 'pending', createdAt: new Date().toISOString(), source: 'web', decision: null, proposal: null,
          deposit: data.deposit ? { status: 'awaiting', amount: CLINIC.depositAmount, requestedBy: 'patient' } : { status: 'none' },
          reminder: null, attendance: null
        };
        state.bookings.push(b);
        addLog('patient', 'created', b);
        return b;
      });
    },
    confirm: function (id, staff, opts) {
      return act(function () {
        var b = get(id);
        b.status = 'confirmed';
        b.decision = { by: staff, at: new Date().toISOString() };
        addLog(staff, 'confirmed', b);
        if (opts && opts.deposit && b.deposit.status === 'none') {
          b.deposit = { status: 'awaiting', amount: CLINIC.depositAmount, requestedBy: staff };
          addLog(staff, 'deposit_requested', b, { amount: CLINIC.depositAmount });
        }
        return b;
      });
    },
    acceptProposal: function (id, staff) {
      return act(function () {
        var b = get(id);
        b.date = b.proposal.date; b.time = b.proposal.time;
        b.status = 'confirmed';
        b.decision = { by: staff, at: new Date().toISOString() };
        addLog(staff, 'confirmed', b, { fromProposal: true });
        return b;
      });
    },
    refuse: function (id, staff, reason) {
      return act(function () {
        var b = get(id);
        b.status = 'refused';
        b.decision = { by: staff, at: new Date().toISOString(), reason: reason };
        addLog(staff, 'refused', b, { reason: reason });
        return b;
      });
    },
    propose: function (id, staff, date, time) {
      return act(function () {
        var b = get(id);
        b.status = 'proposed';
        b.proposal = { date: date, time: time, oldDate: b.date, oldTime: b.time, by: staff, at: new Date().toISOString() };
        addLog(staff, 'proposed', b, { date: date, time: time });
        return b;
      });
    },
    cancel: function (id, staff) {
      return act(function () {
        var b = get(id);
        b.status = 'cancelled';
        b.decision = Object.assign({}, b.decision || {}, { cancelledBy: staff, cancelledAt: new Date().toISOString() });
        addLog(staff, 'cancelled', b);
        return b;
      });
    },
    waOpened: function (id, staff, kind) {
      return act(function () { var b = get(id); addLog(staff, 'wa_opened', b, { kind: kind }); return b; });
    },
    reminderSent: function (id, staff) {
      return act(function () {
        var b = get(id);
        b.reminder = { by: staff, at: new Date().toISOString() };
        addLog(staff, 'reminder_sent', b);
        return b;
      });
    },
    requestDeposit: function (id, staff) {
      return act(function () {
        var b = get(id);
        b.deposit = { status: 'awaiting', amount: CLINIC.depositAmount, requestedBy: staff };
        addLog(staff, 'deposit_requested', b, { amount: CLINIC.depositAmount });
        return b;
      });
    },
    verifyDeposit: function (id, staff) {
      return act(function () {
        var b = get(id);
        b.deposit.status = 'verified'; b.deposit.verifiedBy = staff; b.deposit.verifiedAt = new Date().toISOString();
        addLog(staff, 'deposit_verified', b, { amount: b.deposit.amount || CLINIC.depositAmount });
        return b;
      });
    },
    attendance: function (id, staff, value) {
      return act(function () {
        var b = get(id);
        b.attendance = { value: value, by: staff, at: new Date().toISOString() };
        addLog(staff, value, b);
        return b;
      });
    },
    login: function (staff) { return act(function () { addLog(staff, 'login', null); }); },
    reset: function (staff) {
      seed();
      if (staff) { addLog(staff, 'reset', null); save(); }
    }
  };

  /* ---------- WhatsApp drafts (the system drafts, a human sends) ---------- */
  function msgVars(b, lang, staff) {
    var e = effTime(b);
    return {
      name: b.name, ref: b.ref, clinic: I18N.t('clinicName', null, lang), clinicShort: I18N.t('clinicShort', null, lang),
      address: I18N.t('clinicAddress', null, lang), service: I18N.t('svc_' + b.service, null, lang),
      date: fmtDate(e.date, lang), time: e.time, staff: staff ? staffName(staff, lang) : '',
      amount: money(CLINIC.depositAmount, lang)
    };
  }
  function draft(kind, b, lang, staff, extra) {
    lang = lang || b.lang || 'ar';
    var v = msgVars(b, lang, staff);
    if (kind === 'confirm') {
      var s = I18N.t('wa_confirm', v, lang);
      if (b.deposit && b.deposit.status === 'awaiting') {
        s = s.replace(/\n— /, I18N.t('wa_confirm_deposit', v, lang) + '\n— ');
      }
      return s;
    }
    if (kind === 'refuse') { v.reason = I18N.t((extra && extra.reason) || (b.decision && b.decision.reason) || 'r_other', null, lang); return I18N.t('wa_refuse', v, lang); }
    if (kind === 'propose') {
      var p = b.proposal || extra;
      v.date = fmtDate(p.date, lang); v.time = p.time; v.oldDate = fmtDate(p.oldDate || b.date, lang); v.oldTime = p.oldTime || b.time;
      return I18N.t('wa_propose', v, lang);
    }
    if (kind === 'reminder') {
      return I18N.t(b.date === addDays(todayKey(), 1) ? 'wa_reminder' : 'wa_reminder_day', v, lang);
    }
    if (kind === 'patient_request') return I18N.t('wa_patient_request', v, lang);
    return '';
  }
  function waLink(phone, text) {
    var num = phone ? (phone.length === 8 ? '222' + phone : phone) : '';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  global.Store = {
    KEY: KEY, CLINIC: CLINIC, SERVICES: SERVICES, STAFF: STAFF, SLOTS: SLOTS, MORNING: MORNING, EVENING: EVENING,
    load: load, save: save, state: function () { return state; }, all: all, get: get, effTime: effTime,
    isTaken: isTaken, slotsFor: slotsFor, A: A, draft: draft, waLink: waLink,
    dateKey: dateKey, parseKey: parseKey, addDays: addDays, todayKey: todayKey, isClosed: isClosed, nextOpenDay: nextOpenDay,
    at: at, daysBetween: daysBetween, fmtDate: fmtDate, fmtDateShort: fmtDateShort, fmtStamp: fmtStamp, money: money,
    phoneDisplay: phoneDisplay, staffName: staffName, service: service, pad: pad
  };
})(window);

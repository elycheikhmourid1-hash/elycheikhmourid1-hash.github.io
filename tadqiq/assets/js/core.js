/* AICore Tadqiq — core: dates, formatting, staff, settings, fictional list, checks engine, drafts.
 * DEMO: all people, IDs, phones and lists are fictional. No decision is ever automated. */
(function (global) {
  'use strict';
  function L() { return global.I18N ? I18N.lang : 'ar'; }
  function tt(k, v, l) { return I18N.t(k, v, l); }

  /* ---------- dates ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +(p[2] || 1)); }
  function todayKey() { return dateKey(new Date()); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
  function addYears(k, n) { var d = parseKey(k); d.setFullYear(d.getFullYear() + n); return dateKey(d); }
  function D(n) { return addDays(todayKey(), n); }
  function yearsBetween(a, b) { var x = parseKey(a), y = parseKey(b); var n = y.getFullYear() - x.getFullYear(); if (y.getMonth() < x.getMonth() || (y.getMonth() === x.getMonth() && y.getDate() < x.getDate())) n--; return n; }
  function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
  function fmtD(k) { if (!k) return '—'; var p = String(k).split('-'); return (p[2] ? p[2] + '/' : '') + p[1] + '/' + p[0]; }
  function fmtStamp(iso, lang) {
    var d = new Date(iso); lang = lang || L();
    var now = new Date(), day = dateKey(d), tk = todayKey();
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (day === tk) return tt('today', null, lang) + ' ' + hm;
    if (day === addDays(tk, -1)) return tt('yesterday', null, lang) + ' ' + hm;
    return fmtD(day) + ' ' + hm;
  }
  function ago(iso, lang) {
    var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return tt('just_now', null, lang);
    if (m < 60) return tt('ago_min', { n: m }, lang);
    if (m < 60 * 24) return tt('ago_hour', { n: Math.round(m / 60) }, lang);
    return tt('ago_day', { n: Math.round(m / 1440) }, lang);
  }
  var MONTHS = {
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  };
  function monthLabel(k, lang) { var d = parseKey(k); return MONTHS[lang || L()][d.getMonth()] + ' ' + d.getFullYear(); }

  /* ---------- formatting ---------- */
  function num(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function money(n, lang) {
    lang = lang || L();
    if (n == null || isNaN(n)) return '—';
    var s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? '\u202F' : ',');
    return lang === 'fr' ? s + ' MRU' : s + ' أوقية';
  }
  function phoneDisplay(p) { p = String(p || ''); return '\u2066+222 ' + p.replace(/(\d{2})(?=\d)/g, '$1 ') + '\u2069'; }
  function nniDisplay(n) { return String(n || ''); }
  function pct(x) { return Math.round(x * 100) + '%'; }

  /* ---------- staff ---------- */
  var STAFF = [
    { id: 'mariem', ar: 'مريم منت أحمد', fr: 'Mariem Mint Ahmed', role: 'credit', color: '#0E7480', g: 'f' },
    { id: 'mohamed', ar: 'محمد ولد سالم', fr: 'Mohamed Ould Salem', role: 'credit', color: '#C96F1F', g: 'm' },
    { id: 'ghalia', ar: 'الغالية منت محمود', fr: 'Ghalia Mint Mahmoud', role: 'compliance', color: '#6B4FA0', g: 'f' }
  ];
  function staff(id) { return STAFF.find(function (s) { return s.id === id; }); }
  function staffName(id, lang) { if (id === 'system') return tt('system', null, lang); var s = staff(id); return s ? s[lang || L()] : '—'; }
  function roleLabel(id, lang) {
    if (id === 'system') return tt('system', null, lang);
    var s = staff(id); if (!s) return '';
    if (s.role === 'compliance') return tt('role_compliance', null, lang);
    return tt(s.g === 'm' ? 'role_credit_m' : 'role_credit', null, lang);
  }

  /* ---------- settings (example values, configurable) ---------- */
  var DEFAULT_SETTINGS = { dti: 40, cash: 300000, struct: 80, guar: 200000, margin: 12, expiringDays: 30, minHireAge: 16, lowConf: 75 };

  /* ---------- fictional PEP / sanctions test list ---------- */
  var WATCHLIST = [
    { id: 'L-001', ar: 'الشيخ ولد بوبكر ولد المختار', lat: 'Cheikh Ould Boubacar Ould Mokhtar', type: 'PEP', dob: '1969-01-01', note: { ar: 'منتخب محلي سابق – شخصية وهمية للاختبار', fr: 'Ancien élu local – personnage fictif de test' } },
    { id: 'L-002', ar: 'يعقوب ولد الوهم', lat: 'Yacoub Ould El Wahm', type: 'SANC', dob: '1980-06-06', note: { ar: 'اسم وهمي على قائمة عقوبات تجريبية', fr: 'Nom fictif sur une liste de sanctions de test' } },
    { id: 'L-003', ar: 'زينب منت التجربة', lat: 'Zeineb Mint Tejriba', type: 'PEP', dob: '1972-03-03', note: { ar: 'مسؤولة سابقة – شخصية وهمية للاختبار', fr: 'Ancienne responsable – personnage fictif de test' } },
    { id: 'L-004', ar: 'جان إكزامبل', lat: 'Jean Exemple', type: 'SANC', dob: '1966-09-09', note: { ar: 'اسم وهمي على قائمة عقوبات تجريبية', fr: 'Nom fictif sur une liste de sanctions de test' } }
  ];

  /* ---------- names ---------- */
  function normAr(s) {
    return String(s || '').replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/\s+/g, ' ').trim();
  }
  function normLat(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').replace(/\bmohammed\b|\bmed\b/g, 'mohamed').replace(/\s+/g, ' ').trim();
  }
  function tokens(s, lat) { return (lat ? normLat(s) : normAr(s)).split(' ').filter(Boolean); }
  function similarity(a, b, lat) {
    var A = tokens(a, lat), B = tokens(b, lat); if (!A.length || !B.length) return 0;
    var used = {}, m = 0;
    A.forEach(function (x) { for (var i = 0; i < B.length; i++) { if (!used[i] && B[i] === x) { used[i] = 1; m++; break; } } });
    return (2 * m) / (A.length + B.length);
  }
  function initials(name) { var p = String(name || '').trim().split(/\s+/), w = (p[0] || '?'); if (/^ال./.test(w)) w = w.slice(2); return w.charAt(0); }

  /* ---------- engine ---------- */
  var CHECKS = ['ID', 'DATES', 'NAME', 'DTI', 'CASH', 'LIST', 'DUP', 'DOCS', 'CONF'];
  var SEV_RANK = { high: 3, medium: 2, low: 1 };
  var DOC_ORDER = ['id', 'income', 'statement', 'application', 'guarantor'];

  function incomeDocKey(f) { return f.docs.payslip ? 'payslip' : f.docs.incomeCert ? 'incomeCert' : null; }
  function income(f) {
    var d = f.docs;
    if (d.payslip) return { v: d.payslip.net, src: 'payslip' };
    if (d.incomeCert) return { v: d.incomeCert.net, src: 'incomeCert' };
    return { v: f.applicant.income || 0, src: 'application' };
  }
  function installment(f, S) {
    if (f.type !== 'loan' || !f.request) return 0;
    var a = +f.request.amount || 0, n = +f.request.term || 1;
    return Math.round(a * (1 + (S.margin / 100) * n / 12) / n);
  }
  function dti(f, S) {
    if (f.type !== 'loan') return null;
    var inc = income(f).v; if (!inc) return null;
    return (installment(f, S) + (+f.applicant.otherDebt || 0)) / inc;
  }
  function requiredDocs(f, S) {
    var r = ['id', 'income', 'application'];
    if (f.type === 'loan') { r.splice(2, 0, 'statement'); if (+f.request.amount > S.guar) r.push('guarantor'); }
    return r;
  }
  function hasDoc(f, k) { return k === 'income' ? !!incomeDocKey(f) : !!f.docs[k]; }
  function docCount(f) { return Object.keys(f.docs).filter(function (k) { return f.docs[k]; }).length; }
  function slotDocKey(f, slot) { return slot === 'income' ? (incomeDocKey(f) || 'income') : slot; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }

  function fields(f) {
    var d = f.docs, out = [], ov = f.conf || {};
    function add(key, value, doc, raw) {
      if (value == null || value === '') return;
      var c = ov[key] != null ? ov[key] : 88 + (hash(f.id + key) % 12);
      out.push({ key: key, value: value, doc: doc, conf: c, raw: raw });
    }
    var lang = L();
    if (d.id) {
      add('name', d.id.nameAr, 'id'); add('nameLat', d.id.nameLat, 'id'); add('nni', d.id.nni, 'id');
      add('dob', fmtD(d.id.dob), 'id'); add('expiry', fmtD(d.id.expiry), 'id');
    }
    if (d.payslip) { add('employer', d.payslip.employer[lang], 'payslip'); add('hire', fmtD(d.payslip.hireDate), 'payslip'); add('income', money(d.payslip.net), 'payslip'); add('docDate', monthLabel(d.payslip.period), 'payslip'); }
    else if (d.incomeCert) { add('employer', d.incomeCert.activity[lang], 'incomeCert'); add('hire', fmtD(d.incomeCert.since), 'incomeCert'); add('income', money(d.incomeCert.net), 'incomeCert'); add('docDate', fmtD(d.incomeCert.date), 'incomeCert'); }
    if (d.application) {
      if (f.type === 'loan') { add('amount', money(d.application.amount), 'application'); add('term', tt('term_months', { n: d.application.term }), 'application'); add('purpose', d.application.purpose[lang], 'application'); }
      else { add('product', d.application.product[lang], 'application'); }
      add('phone', phoneDisplay(d.application.phone), 'application');
      if (!d.payslip && !d.incomeCert && f.applicant.income) add('income', money(f.applicant.income), 'application');
      if (f.applicant.otherDebt) add('otherDebt', money(f.applicant.otherDebt), 'application');
    }
    if (d.statement) {
      var cash = d.statement.tx.filter(function (x) { return x.cash && x.amt > 0; }).reduce(function (s, x) { return s + x.amt; }, 0);
      add('cash', money(cash), 'statement'); add('stmtDate', fmtD(d.statement.issuedOn), 'statement');
    }
    if (d.guarantor) { add('guarantor', d.guarantor.nameAr, 'guarantor'); add('gNni', d.guarantor.nni, 'guarantor'); }
    return out;
  }

  function run(f, all, S) {
    S = S || DEFAULT_SETTINGS; all = all || [];
    var d = f.docs, flags = [], status = {}, today = todayKey();
    function flag(code, check, sev, vars, docs, flds) { flags.push({ code: code, check: check, sev: sev, v: vars || {}, docs: docs || [], fields: flds || [] }); }
    CHECKS.forEach(function (c) { status[c] = 'ok'; });

    // 1. ID validity
    if (!d.id) status.ID = 'na';
    else if (d.id.expiry < today) flag('ID_EXPIRED', 'ID', 'high', { expiry: d.id.expiry, days: daysBetween(d.id.expiry, today) }, ['id'], ['id.expiry']);
    else if (daysBetween(today, d.id.expiry) <= S.expiringDays) flag('ID_EXPIRING', 'ID', 'low', { expiry: d.id.expiry, days: daysBetween(today, d.id.expiry) }, ['id'], ['id.expiry']);

    // 2. dates
    var dob = d.id ? d.id.dob : f.applicant.dob;
    var hire = d.payslip ? d.payslip.hireDate : d.incomeCert ? d.incomeCert.since : null;
    var hireDoc = d.payslip ? 'payslip' : 'incomeCert';
    if (dob && hire && hire < addYears(dob, S.minHireAge)) flag('DATE_HIRE', 'DATES', 'high', { dob: dob, hire: hire, age: Math.max(0, yearsBetween(dob, hire)), min: S.minHireAge, doc: hireDoc }, ['id', hireDoc], ['id.dob', hireDoc + '.hire']);
    if (dob && yearsBetween(dob, today) < 18) flag('DATE_AGE', 'DATES', 'high', { dob: dob, age: yearsBetween(dob, today) }, ['id'], ['id.dob']);
    var fut = [];
    if (d.statement && d.statement.issuedOn > today) fut.push({ doc: 'statement', date: d.statement.issuedOn, fld: 'statement.issued' });
    if (d.incomeCert && d.incomeCert.date > today) fut.push({ doc: 'incomeCert', date: d.incomeCert.date, fld: 'incomeCert.date' });
    if (d.application && d.application.date > today) fut.push({ doc: 'application', date: d.application.date, fld: 'application.date' });
    if (d.id && d.id.issue > today) fut.push({ doc: 'id', date: d.id.issue, fld: 'id.issue' });
    if (fut.length) flag('DATE_FUTURE', 'DATES', 'medium', { items: fut }, fut.map(function (x) { return x.doc; }), fut.map(function (x) { return x.fld; }));
    if (!dob && !hire && !fut.length) status.DATES = 'na';

    // 3. names + NNI across documents
    if (d.id) {
      var mism = [];
      [['payslip', 'nameLat', true], ['statement', 'nameLat', true], ['incomeCert', 'nameAr', false], ['application', 'nameAr', false]].forEach(function (x) {
        var doc = d[x[0]]; if (!doc || !doc[x[1]]) return;
        var ref = x[2] ? d.id.nameLat : d.id.nameAr;
        var s = similarity(ref, doc[x[1]], x[2]);
        if (s < 0.999) mism.push({ doc: x[0], idName: ref, docName: doc[x[1]], score: s });
      });
      if (mism.length) flag('NAME_MISMATCH', 'NAME', mism.some(function (m) { return m.score < 0.5; }) ? 'high' : 'medium', { items: mism }, ['id'].concat(mism.map(function (m) { return m.doc; })), ['id.name'].concat(mism.map(function (m) { return m.doc + '.name'; })));
      var nm = [];
      if (d.application && d.application.nni && d.application.nni !== d.id.nni) nm.push({ doc: 'application', nni: d.application.nni });
      if (d.payslip && d.payslip.nni && d.payslip.nni !== d.id.nni) nm.push({ doc: 'payslip', nni: d.payslip.nni });
      if (nm.length) flag('NNI_MISMATCH', 'NAME', 'high', { idNni: d.id.nni, items: nm }, ['id'].concat(nm.map(function (m) { return m.doc; })), ['id.nni'].concat(nm.map(function (m) { return m.doc + '.nni'; })));
    } else status.NAME = 'na';

    // 4. DTI
    var r = dti(f, S), inc = income(f);
    if (r == null) status.DTI = 'na';
    else if (r * 100 > S.dti) flag('DTI_HIGH', 'DTI', r * 100 > S.dti + 15 ? 'high' : 'medium', { ratio: r, max: S.dti, inst: installment(f, S), income: inc.v, src: inc.src, other: +f.applicant.otherDebt || 0 }, [inc.src], [inc.src + (inc.src === 'application' ? '.income' : '.net')]);

    // 5. cash deposits
    if (!d.statement) status.CASH = 'na';
    else {
      var cash = d.statement.tx.filter(function (x) { return x.cash && x.amt > 0; });
      var over = cash.filter(function (x) { return x.amt >= S.cash; });
      var near = cash.filter(function (x) { return x.amt >= S.cash * S.struct / 100 && x.amt < S.cash; });
      var total = cash.reduce(function (s, x) { return s + x.amt; }, 0);
      if (over.length) flag('CASH_OVER', 'CASH', 'medium', { items: over, thr: S.cash, total: total, income: inc.v }, ['statement'], over.map(function (x) { return 'statement.tx.' + x.d + '.' + x.amt; }));
      if (near.length >= 2) {
        near.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
        var span = daysBetween(near[0].d, near[near.length - 1].d);
        if (span <= 14) flag('CASH_STRUCT', 'CASH', 'high', { items: near, thr: S.cash, span: span, total: total, income: inc.v, pctv: S.struct }, ['statement'], near.map(function (x) { return 'statement.tx.' + x.d + '.' + x.amt; }));
      }
    }

    // 6. watch list (fictional)
    var people = [{ who: 'applicant', ar: d.id ? d.id.nameAr : f.applicant.ar, lat: d.id ? d.id.nameLat : f.applicant.lat, dob: dob }];
    if (d.guarantor) people.push({ who: 'guarantor', ar: d.guarantor.nameAr, lat: '', dob: null });
    people.forEach(function (p) {
      WATCHLIST.forEach(function (w) {
        var s = Math.max(similarity(p.ar, w.ar, false), p.lat ? similarity(p.lat, w.lat, true) : 0);
        if (s >= 0.75) flag('LIST_MATCH', 'LIST', 'high', { who: p.who, name: p.ar || p.lat, entry: w, score: s, dob: p.dob, dobMatch: p.dob ? p.dob === w.dob : null }, [p.who === 'guarantor' ? 'guarantor' : 'id'], [p.who === 'guarantor' ? 'guarantor.name' : 'id.name']);
      });
    });

    // 7. duplicates
    var nni = d.id ? d.id.nni : f.applicant.nni, phone = d.application ? d.application.phone : f.applicant.phone;
    var dn = all.filter(function (o) { return o.id !== f.id && nni && ((o.docs.id && o.docs.id.nni === nni) || o.applicant.nni === nni); });
    if (dn.length) {
      var diffName = dn.some(function (o) { return similarity(o.applicant.lat, f.applicant.lat, true) < 0.7; });
      flag('DUP_NNI', 'DUP', diffName ? 'high' : 'medium', { nni: nni, items: dn.map(function (o) { return { id: o.id, name: o.applicant[L() === 'fr' ? 'lat' : 'ar'], nameAr: o.applicant.ar, nameLat: o.applicant.lat, status: o.status }; }), diff: diffName }, ['id'], ['id.nni']);
    }
    var dp = all.filter(function (o) { return o.id !== f.id && phone && (o.applicant.phone === phone) && dn.indexOf(o) < 0; });
    if (dp.length) flag('DUP_PHONE', 'DUP', 'medium', { phone: phone, items: dp.map(function (o) { return { id: o.id, nameAr: o.applicant.ar, nameLat: o.applicant.lat, status: o.status }; }) }, ['application'], ['application.phone']);

    // 8. missing documents
    var miss = requiredDocs(f, S).filter(function (k) { return !hasDoc(f, k); });
    if (miss.length) flag('MISSING_DOCS', 'DOCS', miss.indexOf('id') >= 0 ? 'high' : 'medium', { items: miss }, [], []);

    // 9. extraction confidence
    var low = fields(f).filter(function (x) { return x.conf < S.lowConf; });
    if (low.length) flag('LOW_CONF', 'CONF', 'low', { items: low }, low.map(function (x) { return x.doc; }), low.map(function (x) { return x.doc + '.' + x.key; }));

    flags.forEach(function (fl) { if (status[fl.check] === 'ok' || SEV_RANK[fl.sev] > SEV_RANK[status[fl.check]] || status[fl.check] === 'na') status[fl.check] = fl.sev; });
    flags.sort(function (a, b) { return SEV_RANK[b.sev] - SEV_RANK[a.sev]; });
    var counts = { high: 0, medium: 0, low: 0 };
    flags.forEach(function (fl) { counts[fl.sev]++; });
    return { flags: flags, status: status, counts: counts, missing: miss, dti: r, installment: installment(f, S), income: inc, fields: fields(f), checksRun: CHECKS.filter(function (c) { return status[c] !== 'na'; }).length };
  }

  /* ---------- flag texts ---------- */
  function dn(k, lang) { return tt('doc_' + k, null, lang); }
  function whoL(w, lang) { return w === 'guarantor' ? (lang === 'fr' ? 'la caution' : 'الكفيل') : (lang === 'fr' ? 'le demandeur' : 'مقدم الطلب'); }
  var FT = {
    ID_EXPIRED: {
      ar: { t: 'بطاقة التعريف منتهية الصلاحية', e: function (v) { return ['تاريخ انتهاء الصلاحية على البطاقة: ' + fmtD(v.expiry), 'انتهت منذ ' + v.days + ' يوماً (مقارنة بتاريخ اليوم ' + fmtD(todayKey()) + ')']; }, w: 'التحقق من هوية العميل يتطلب وثيقة سارية. قبول بطاقة منتهية يُضعف ملف «اعرف عميلك» وقد يُلاحَظ عند التفتيش.', a: 'اطلب بطاقة سارية أو وصل تجديد رسمي قبل أي قرار.' },
      fr: { t: 'Carte d’identité expirée', e: function (v) { return ['Date d’expiration sur la carte : ' + fmtD(v.expiry), 'Expirée depuis ' + v.days + ' jours (aujourd’hui : ' + fmtD(todayKey()) + ')']; }, w: 'L’identification du client exige une pièce valide. Accepter une carte expirée fragilise le dossier KYC et peut être relevé lors d’une inspection.', a: 'Demandez une carte valide ou un récépissé officiel de renouvellement avant toute décision.' }
    },
    ID_EXPIRING: {
      ar: { t: 'بطاقة التعريف تنتهي قريباً', e: function (v) { return ['تنتهي في ' + fmtD(v.expiry) + ' (بعد ' + v.days + ' يوماً)']; }, w: 'قد تنتهي صلاحية الوثيقة أثناء مدة العلاقة، فيلزم تحديث الملف.', a: 'سجّل تذكيراً بتحديث البطاقة، ولا يمنع ذلك المتابعة.' },
      fr: { t: 'Carte d’identité bientôt expirée', e: function (v) { return ['Expire le ' + fmtD(v.expiry) + ' (dans ' + v.days + ' jours)']; }, w: 'La pièce expirera pendant la relation ; le dossier devra être mis à jour.', a: 'Prévoyez un rappel de mise à jour ; cela n’empêche pas de poursuivre.' }
    },
    DATE_HIRE: {
      ar: { t: 'تاريخ توظيف غير منطقي', e: function (v) { return ['تاريخ الميلاد (بطاقة التعريف): ' + fmtD(v.dob), 'تاريخ التوظيف / بدء النشاط (' + dn(v.doc, 'ar') + '): ' + fmtD(v.hire), 'العمر عند التوظيف: ' + v.age + ' سنة – أقل من ' + v.min + ' سنة']; }, w: 'تاريخ مستحيل أو خاطئ قد يدل على خطأ في الكتابة، أو على وثيقة معدَّلة أو لا تخص هذا الشخص.', a: 'تحقق من الوثيقة الأصلية واطلب شهادة عمل تبيّن التاريخ الصحيح.' },
      fr: { t: 'Date d’embauche incohérente', e: function (v) { return ['Date de naissance (carte) : ' + fmtD(v.dob), 'Date d’embauche / début d’activité (' + dn(v.doc, 'fr') + ') : ' + fmtD(v.hire), 'Âge à l’embauche : ' + v.age + ' ans – moins de ' + v.min + ' ans']; }, w: 'Une date impossible peut signaler une faute de frappe, une pièce modifiée ou une pièce qui n’appartient pas à cette personne.', a: 'Vérifiez l’original et demandez une attestation de travail indiquant la date exacte.' }
    },
    DATE_AGE: {
      ar: { t: 'عمر مقدم الطلب أقل من 18 سنة', e: function (v) { return ['تاريخ الميلاد: ' + fmtD(v.dob) + ' (العمر ' + v.age + ' سنة)']; }, w: 'لا يمكن التعاقد مع قاصر دون إجراءات خاصة.', a: 'تحقق من تاريخ الميلاد ومن الأهلية القانونية.' },
      fr: { t: 'Demandeur âgé de moins de 18 ans', e: function (v) { return ['Date de naissance : ' + fmtD(v.dob) + ' (' + v.age + ' ans)']; }, w: 'Un mineur ne peut pas contracter sans procédure spécifique.', a: 'Vérifiez la date de naissance et la capacité juridique.' }
    },
    DATE_FUTURE: {
      ar: { t: 'وثيقة مؤرخة بتاريخ لاحق لليوم', e: function (v) { return v.items.map(function (x) { return dn(x.doc, 'ar') + ': مؤرخة ' + fmtD(x.date) + ' – بعد تاريخ اليوم ' + fmtD(todayKey()); }); }, w: 'لا يمكن إصدار وثيقة في المستقبل. قد يكون خطأً في الإدخال أو وثيقة مُعدّة مسبقاً أو معدَّلة.', a: 'اطلب نسخة مصحّحة من الجهة المصدرة، ولا تعتمد الأرقام الواردة فيها قبل ذلك.' },
      fr: { t: 'Pièce datée dans le futur', e: function (v) { return v.items.map(function (x) { return dn(x.doc, 'fr') + ' : datée du ' + fmtD(x.date) + ' – postérieure à aujourd’hui (' + fmtD(todayKey()) + ')'; }); }, w: 'Une pièce ne peut pas être émise dans le futur : erreur de saisie, pièce préparée à l’avance ou modifiée.', a: 'Demandez une version corrigée à l’émetteur et n’utilisez pas ses montants d’ici là.' }
    },
    NAME_MISMATCH: {
      ar: { t: 'اختلاف الاسم بين الوثائق', e: function (v) { return v.items.map(function (x) { return 'البطاقة: «' + x.idName + '» ↔ ' + dn(x.doc, 'ar') + ': «' + x.docName + '» (تطابق ' + pct(x.score) + ')'; }); }, w: 'قد يكون مجرد اختلاف في كتابة الاسم، وقد تكون الوثيقة لشخص آخر. التأكد من أن كل الوثائق تخص الشخص نفسه أساس ملف KYC.', a: 'قارن بالوثائق الأصلية، واطلب توضيحاً أو وثيقة مصحّحة إذا لزم.' },
      fr: { t: 'Nom différent selon les pièces', e: function (v) { return v.items.map(function (x) { return 'Carte : « ' + x.idName + ' » ↔ ' + dn(x.doc, 'fr') + ' : « ' + x.docName + ' » (concordance ' + pct(x.score) + ')'; }); }, w: 'Simple variante d’orthographe, ou pièce appartenant à une autre personne. S’assurer que toutes les pièces concernent la même personne est la base du KYC.', a: 'Comparez avec les originaux ; demandez une explication ou une pièce corrigée si nécessaire.' }
    },
    NNI_MISMATCH: {
      ar: { t: 'اختلاف الرقم الوطني بين الوثائق', e: function (v) { return ['البطاقة: ' + v.idNni].concat(v.items.map(function (x) { return dn(x.doc, 'ar') + ': ' + x.nni; })); }, w: 'الرقم الوطني معرّف فريد؛ اختلافه يعني خطأ أو وثيقة لشخص آخر.', a: 'لا تتابع قبل التحقق من الرقم الصحيح من البطاقة الأصلية.' },
      fr: { t: 'NNI différent selon les pièces', e: function (v) { return ['Carte : ' + v.idNni].concat(v.items.map(function (x) { return dn(x.doc, 'fr') + ' : ' + x.nni; })); }, w: 'Le NNI est un identifiant unique ; une différence signale une erreur ou la pièce d’une autre personne.', a: 'Ne poursuivez pas avant d’avoir vérifié le NNI sur la carte originale.' }
    },
    DTI_HIGH: {
      ar: { t: 'القسط مرتفع مقارنة بالدخل', e: function (v) { return ['القسط الشهري التقديري: ' + money(v.inst, 'ar') + (v.other ? ' + التزامات أخرى ' + money(v.other, 'ar') : ''), 'صافي الدخل الشهري: ' + money(v.income, 'ar') + ' (' + (v.src === 'application' ? 'مصرّح به في الاستمارة' : dn(v.src, 'ar')) + ')', 'نسبة التحمل: ' + pct(v.ratio) + ' – الحد في الإعدادات ' + v.max + '% (مثال قابل للتعديل)']; }, w: 'نسبة تحمل مرتفعة تزيد خطر التعثر وتثقل العميل بدين لا يستطيع سداده.', a: 'ناقش مع العميل مبلغاً أقل أو مدة أطول، أو اطلب دخلاً إضافياً موثقاً.' },
      fr: { t: 'Mensualité élevée par rapport au revenu', e: function (v) { return ['Mensualité estimée : ' + money(v.inst, 'fr') + (v.other ? ' + autres charges ' + money(v.other, 'fr') : ''), 'Revenu net mensuel : ' + money(v.income, 'fr') + ' (' + (v.src === 'application' ? 'déclaré sur le formulaire' : dn(v.src, 'fr')) + ')', 'Taux d’endettement : ' + pct(v.ratio) + ' – seuil paramétré ' + v.max + ' % (exemple configurable)']; }, w: 'Un endettement élevé augmente le risque d’impayé et surendette le client.', a: 'Discutez d’un montant plus faible ou d’une durée plus longue, ou d’un revenu complémentaire justifié.' }
    },
    CASH_OVER: {
      ar: { t: 'إيداع نقدي يتجاوز عتبة التنبيه', e: function (v) { return v.items.map(function (x) { return fmtD(x.d) + ': إيداع نقدي ' + money(x.amt, 'ar'); }).concat(['عتبة التنبيه: ' + money(v.thr, 'ar') + ' (إعداد تجريبي قابل للتعديل)', 'مجموع الإيداعات النقدية في الكشف: ' + money(v.total, 'ar') + ' مقابل دخل شهري ' + money(v.income, 'ar')]); }, w: 'الإيداعات النقدية الكبيرة تستدعي معرفة مصدر الأموال، خاصة إذا لم تتناسب مع الدخل المصرّح به.', a: 'اسأل عن مصدر الأموال ووثّق الجواب، وأحِل الملف للامتثال إذا لم يكن مقنعاً.' },
      fr: { t: 'Versement en espèces au-delà du seuil', e: function (v) { return v.items.map(function (x) { return fmtD(x.d) + ' : versement espèces ' + money(x.amt, 'fr'); }).concat(['Seuil d’alerte : ' + money(v.thr, 'fr') + ' (paramètre d’exemple, configurable)', 'Total des versements espèces du relevé : ' + money(v.total, 'fr') + ' pour un revenu mensuel de ' + money(v.income, 'fr')]); }, w: 'Les versements importants en espèces imposent de connaître l’origine des fonds, surtout s’ils ne cadrent pas avec le revenu déclaré.', a: 'Demandez l’origine des fonds, documentez la réponse et transmettez à la conformité si elle n’est pas convaincante.' }
    },
    CASH_STRUCT: {
      ar: { t: 'إيداعات نقدية متكررة قرب العتبة (تجزئة محتملة)', e: function (v) { return v.items.map(function (x) { return fmtD(x.d) + ': ' + money(x.amt, 'ar'); }).concat([v.items.length + ' إيداعات بين ' + v.pctv + '% و100% من العتبة خلال ' + v.span + ' أيام', 'المجموع ' + money(v.total, 'ar') + ' – أي ' + Math.round(v.total / Math.max(1, v.income)) + ' أضعاف الدخل الشهري المصرّح به']); }, w: 'تقسيم المبالغ لتبقى تحت عتبة التصريح نمط معروف في غسل الأموال. التنبيه لا يعني وجود مخالفة، لكنه يستوجب مراجعة الامتثال.', a: 'لا تقرّر وحدك: أحِل الملف لمسؤول الامتثال مع ملاحظاتك.' },
      fr: { t: 'Versements espèces répétés juste sous le seuil (fractionnement possible)', e: function (v) { return v.items.map(function (x) { return fmtD(x.d) + ' : ' + money(x.amt, 'fr'); }).concat([v.items.length + ' versements entre ' + v.pctv + ' % et 100 % du seuil en ' + v.span + ' jours', 'Total ' + money(v.total, 'fr') + ' – soit ' + Math.round(v.total / Math.max(1, v.income)) + ' fois le revenu mensuel déclaré']); }, w: 'Fractionner les montants pour rester sous un seuil déclaratif est un schéma connu de blanchiment. L’alerte ne prouve rien, mais elle exige une revue conformité.', a: 'Ne décidez pas seul : transmettez à la conformité avec vos observations.' }
    },
    LIST_MATCH: {
      ar: { t: 'تطابق محتمل مع قائمة الاختبار (وهمية)', e: function (v) { return ['الاسم (' + whoL(v.who, 'ar') + '): «' + v.name + '»', 'القائمة: «' + v.entry.ar + '» – ' + (v.entry.type === 'PEP' ? 'شخص معرض سياسياً' : 'عقوبات') + ' · ' + v.entry.note.ar, 'درجة التطابق بالاسم: ' + pct(v.score) + (v.dobMatch == null ? '' : v.dobMatch ? ' · تاريخ الميلاد مطابق' : ' · تاريخ الميلاد مختلف (' + fmtD(v.dob) + ' مقابل ' + fmtD(v.entry.dob) + ') – قد يكون تشابه أسماء'), 'القائمة المستعملة في هذا العرض وهمية بالكامل وليست قائمة رسمية.']; }, w: 'الأشخاص المعرضون سياسياً والمدرجون في قوائم العقوبات يستوجبون يقظة معززة أو منع التعامل. تشابه الأسماء شائع، لذلك يحسم الإنسان وليس النظام.', a: 'أحِل الملف لمسؤول الامتثال ليؤكد التطابق أو يستبعده بملاحظة مكتوبة.' },
      fr: { t: 'Correspondance possible avec la liste de test (fictive)', e: function (v) { return ['Nom (' + whoL(v.who, 'fr') + ') : « ' + v.name + ' »', 'Liste : « ' + v.entry.lat + ' » – ' + (v.entry.type === 'PEP' ? 'PPE' : 'sanctions') + ' · ' + v.entry.note.fr, 'Concordance du nom : ' + pct(v.score) + (v.dobMatch == null ? '' : v.dobMatch ? ' · date de naissance identique' : ' · date de naissance différente (' + fmtD(v.dob) + ' vs ' + fmtD(v.entry.dob) + ') – homonymie possible'), 'La liste utilisée dans cette démo est entièrement fictive ; ce n’est pas une liste officielle.']; }, w: 'Les PPE et les personnes sous sanctions exigent une vigilance renforcée ou un refus. Les homonymies sont fréquentes : c’est l’humain qui tranche, pas le système.', a: 'Transmettez à la conformité pour confirmer ou écarter la correspondance par une note écrite.' }
    },
    DUP_NNI: {
      ar: { t: 'الرقم الوطني مستعمل في ملف آخر', e: function (v) { return ['الرقم الوطني ' + v.nni + ' موجود أيضاً في:'].concat(v.items.map(function (x) { return x.id + ' – «' + x.nameAr + '» (' + tt('st_' + x.status, null, 'ar') + ')'; })).concat(v.diff ? ['الاسم في الملف الآخر مختلف'] : []); }, w: 'رقم وطني واحد بأسماء مختلفة قد يدل على انتحال هوية أو خطأ إدخال. وبالاسم نفسه قد يعني طلباً مكرراً بعد رفض.', a: 'افتح الملف الآخر وقارن الصور والوثائق قبل المتابعة.' },
      fr: { t: 'NNI présent dans un autre dossier', e: function (v) { return ['Le NNI ' + v.nni + ' figure aussi dans :'].concat(v.items.map(function (x) { return x.id + ' – « ' + x.nameLat + ' » (' + tt('st_' + x.status, null, 'fr') + ')'; })).concat(v.diff ? ['Le nom dans l’autre dossier est différent'] : []); }, w: 'Un même NNI sous des noms différents peut signaler une usurpation d’identité ou une erreur ; sous le même nom, une nouvelle demande après refus.', a: 'Ouvrez l’autre dossier et comparez photos et pièces avant de poursuivre.' }
    },
    DUP_PHONE: {
      ar: { t: 'رقم الهاتف مستعمل في ملف آخر', e: function (v) { return ['الهاتف ' + phoneDisplay(v.phone) + ' موجود أيضاً في:'].concat(v.items.map(function (x) { return x.id + ' – «' + x.nameAr + '»'; })); }, w: 'قد يكون رقماً عائلياً مشتركاً، وقد يدل على ملفات يديرها شخص واحد.', a: 'اسأل العميل عن صلته بصاحب الملف الآخر ووثّق الجواب.' },
      fr: { t: 'Téléphone présent dans un autre dossier', e: function (v) { return ['Le numéro ' + phoneDisplay(v.phone) + ' figure aussi dans :'].concat(v.items.map(function (x) { return x.id + ' – « ' + x.nameLat + ' »'; })); }, w: 'Numéro familial partagé, ou dossiers gérés par une même personne.', a: 'Demandez au client son lien avec l’autre titulaire et documentez la réponse.' }
    },
    MISSING_DOCS: {
      ar: { t: 'وثائق مطلوبة ناقصة', e: function (v) { return v.items.map(function (k) { return '✕ ' + dn(k, 'ar'); }); }, w: 'لا يكتمل التحقق دون الوثائق المطلوبة، ويصعب تبرير القرار عند المراجعة.', a: 'جهّز رسالة للعميل من تبويب «الرسالة» لطلبها.' },
      fr: { t: 'Pièces obligatoires manquantes', e: function (v) { return v.items.map(function (k) { return '✕ ' + dn(k, 'fr'); }); }, w: 'Sans les pièces requises, la vérification est incomplète et la décision difficile à justifier en cas de contrôle.', a: 'Préparez un message au client depuis l’onglet « Message ».' }
    },
    LOW_CONF: {
      ar: { t: 'حقول مقروءة بثقة منخفضة', e: function (v) { return v.items.map(function (x) { return tt('fl_' + x.key, null, 'ar') + ' (' + dn(x.doc, 'ar') + '): «' + x.value + '» – ثقة ' + x.conf + '%'; }); }, w: 'الكتابة اليدوية أو الصور غير الواضحة قد تُقرأ خطأ.', a: 'قارن القيمة بالوثيقة بنظرك وصحّحها إن لزم.' },
      fr: { t: 'Champs lus avec une faible confiance', e: function (v) { return v.items.map(function (x) { return tt('fl_' + x.key, null, 'fr') + ' (' + dn(x.doc, 'fr') + ') : « ' + x.value + ' » – confiance ' + x.conf + ' %'; }); }, w: 'L’écriture manuscrite ou une photo floue peuvent être mal lues.', a: 'Comparez visuellement la valeur avec la pièce et corrigez si besoin.' }
    }
  };
  function flagText(fl, lang) { var x = FT[fl.code][lang || L()]; return { title: x.t, evidence: x.e(fl.v), why: x.w, action: x.a }; }
  function flagTitle(code, lang) { return FT[code] ? FT[code][lang || L()].t : code; }
  function flagKey(fl) { return fl.code + (fl.v && fl.v.entry ? ':' + fl.v.entry.id + ':' + fl.v.who : ''); }
  var FLAG_FAMILY = { ID_EXPIRED: 'ID', ID_EXPIRING: 'ID', DATE_HIRE: 'DATE', DATE_AGE: 'DATE', DATE_FUTURE: 'DATE', NAME_MISMATCH: 'NAME', NNI_MISMATCH: 'NAME', DTI_HIGH: 'DTI', CASH_OVER: 'CASH', CASH_STRUCT: 'CASH', LIST_MATCH: 'LIST', DUP_NNI: 'DUP', DUP_PHONE: 'DUP', MISSING_DOCS: 'DOCS', LOW_CONF: 'CONF' };
  var AML_CODES = ['CASH_OVER', 'CASH_STRUCT', 'LIST_MATCH', 'DUP_NNI', 'NNI_MISMATCH', 'NAME_MISMATCH', 'DATE_FUTURE', 'DATE_HIRE'];

  /* ---------- customer message items ---------- */
  var ITEMS = {
    id: { ar: 'صورة واضحة لبطاقة التعريف الوطنية (الوجهان)', hs: 'صورة بطاقة التعريف (الوجهين)', fr: 'une copie lisible de votre carte d’identité (recto-verso)' },
    idExpired: { ar: 'بطاقة تعريف سارية المفعول، لأن البطاقة المرسلة منتهية الصلاحية', hs: 'بطاقة تعريف صالحة، ذيك اللي ارسلت فاتت صلاحيتها', fr: 'une carte d’identité en cours de validité (celle reçue est expirée)' },
    income: { ar: 'إثبات الدخل: كشف راتب حديث أو شهادة دخل', hs: 'ورقة الدخل: كشف الراتب ولا شهادة الدخل', fr: 'un justificatif de revenus récent (bulletin de paie ou attestation)' },
    statement: { ar: 'كشف حساب بنكي أو كشف محفظة لآخر 3 أشهر', hs: 'كشف الحساب ولا المحفظة متاع آخر 3 أشهر', fr: 'un relevé bancaire ou de portefeuille mobile des 3 derniers mois' },
    application: { ar: 'استمارة الطلب موقّعة', hs: 'استمارة الطلب موقّعة', fr: 'le formulaire de demande signé' },
    guarantor: { ar: 'وثيقة الكفالة موقّعة مع صورة بطاقة تعريف الكفيل', hs: 'ورقة الكفالة موقّعة ومعاها صورة بطاقة الكفيل', fr: 'l’acte de caution signé, avec la copie de la carte du garant' },
    future: { ar: 'نسخة مصحّحة من {doc} (التاريخ المكتوب عليها لاحق لتاريخ اليوم)', hs: '{doc} مصحّحة، التاريخ اللي فيها ما جا بعد', fr: 'une version corrigée de : {doc} (la date indiquée est postérieure à aujourd’hui)' },
    name: { ar: 'توضيح لاختلاف كتابة الاسم بين البطاقة و{doc}، أو نسخة مصحّحة', hs: 'ورقة تبيّن الاسم، لأن الاسم فـ{doc} ماهو كيف اللي فالبطاقة', fr: 'une explication de la différence d’orthographe du nom entre la carte et : {doc}, ou une pièce corrigée' },
    hire: { ar: 'شهادة عمل تبيّن تاريخ التوظيف الصحيح', hs: 'شهادة خدمة فيها تاريخ دخولك للخدمة الصحيح', fr: 'une attestation de travail indiquant la date d’embauche exacte' }
  };
  function msgItems(f, res, ml) {
    var dl = ml === 'fr' ? 'fr' : 'ar', out = [];
    res.missing.forEach(function (k) { out.push(ITEMS[k][ml]); });
    res.flags.forEach(function (fl) {
      if (fl.code === 'ID_EXPIRED') out.push(ITEMS.idExpired[ml]);
      if (fl.code === 'DATE_FUTURE') fl.v.items.forEach(function (x) { out.push(ITEMS.future[ml].replace('{doc}', dn(x.doc, dl))); });
      if (fl.code === 'NAME_MISMATCH') out.push(ITEMS.name[ml].replace('{doc}', dn(fl.v.items[0].doc, dl)));
      if (fl.code === 'DATE_HIRE') out.push(ITEMS.hire[ml]);
    });
    return out;
  }
  function firstName(f, ml) {
    if (ml === 'fr') return f.applicant.lat;
    var p = f.applicant.ar.split(' ');
    return p.length > 2 && /^(محمد|سيدي|أحمد|الشيخ)$/.test(p[0]) ? p[0] + ' ' + p[1] : p[0];
  }
  function customerMessage(f, res, ml, officer) {
    var items = msgItems(f, res, ml), off = staffName(officer, ml === 'fr' ? 'fr' : 'ar'), ref = f.id;
    var list = items.map(function (x) { return '• ' + x; }).join('\n');
    var fem = f.applicant.gender === 'F';
    if (ml === 'fr') {
      var civ = fem ? 'Madame' : 'Monsieur';
      if (!items.length) return 'Bonjour ' + civ + ' ' + f.applicant.lat + ',\nIci ' + off + ', d’Al Mithal Microfinance.\nVotre dossier n° ' + ref + ' est complet et en cours d’étude par notre équipe. Nous revenons vers vous très bientôt.\nCordialement.';
      return 'Bonjour ' + civ + ' ' + f.applicant.lat + ',\nIci ' + off + ', d’Al Mithal Microfinance.\nNous avons bien reçu votre dossier n° ' + ref + ', merci. Pour poursuivre son étude, merci de nous transmettre :\n' + list + '\nVous pouvez les envoyer ici sur WhatsApp (photo nette) ou les déposer en agence.\nCordialement.';
    }
    if (ml === 'hs') {
      if (!items.length) return 'السلام عليكم ' + firstName(f, ml) + '، كيف حالك؟\nمعاك ' + off + ' من مؤسسة المثال للتمويل الأصغر.\nملفك رقم ' + ref + ' كامل، وهو الحين عند الموظفين يشوفوه. ما تبطى علينا إن شاء الله ونتصلو بيك.\nشكراً ياسر.';
      return 'السلام عليكم ' + firstName(f, ml) + '، كيف حالك؟\nمعاك ' + off + ' من مؤسسة المثال للتمويل الأصغر.\nملفك رقم ' + ref + ' وصلنا، الله يجازيك بالخير. غير باقي فيه ذي الأوراق:\n' + list + '\nصوّرهم تصويرة زينة وارسلهم هون فالواتساب، ولا جيبهم للوكالة.\nومنين يوصلونا نكمّلو دراسة ملفك إن شاء الله. شكراً ياسر.';
    }
    if (!items.length) return 'السلام عليكم ' + firstName(f, ml) + '،\nمعكم ' + off + ' من مؤسسة المثال للتمويل الأصغر.\nملفكم رقم ' + ref + ' مكتمل، وهو الآن قيد الدراسة لدى فريقنا. سنتواصل معكم قريباً إن شاء الله.\nمع خالص الشكر.';
    return 'السلام عليكم ' + firstName(f, ml) + '،\nمعكم ' + off + ' من مؤسسة المثال للتمويل الأصغر.\nوصلنا ملفكم رقم ' + ref + '، شكراً لكم. لاستكمال دراسته نحتاج منكم:\n' + list + '\nيمكنكم إرسالها هنا على واتساب (صورة واضحة) أو إحضارها إلى الوكالة.\nمع خالص الشكر.';
  }
  function waLink(phone, text) { return 'https://wa.me/222' + String(phone).replace(/\D/g, '') + '?text=' + encodeURIComponent(text); }

  /* ---------- credit memo ---------- */
  function memo(f, res, S, lang) {
    lang = lang || L();
    var fr = lang === 'fr', a = f.applicant, d = f.docs, T = function (k, v) { return tt(k, v, lang); };
    var nm = fr ? (d.id ? d.id.nameLat : a.lat) : (d.id ? d.id.nameAr : a.ar);
    var dob = d.id ? d.id.dob : a.dob;
    var L1 = [];
    L1.push((f.type === 'loan' ? T('memo_title') : T('memo_account_title')).toUpperCase());
    L1.push((fr ? 'Dossier : ' : 'الملف: ') + f.id + ' · ' + T('type_' + f.type) + ' · ' + T('received') + ' ' + (fr ? 'via ' : 'عبر ') + T('src_' + f.source) + ' ' + fmtD(f.receivedAt.slice(0, 10)));
    L1.push((fr ? 'Institution : ' : 'المؤسسة: ') + T('instName') + ' (' + (fr ? 'fictive' : 'وهمية') + ')');
    L1.push('');
    L1.push(fr ? '1) CLIENT' : '1) العميل');
    L1.push((fr ? 'Nom : ' : 'الاسم: ') + nm + ' · ' + (fr ? 'NNI : ' : 'الرقم الوطني: ') + (d.id ? d.id.nni : a.nni));
    if (dob) L1.push((fr ? 'Né(e) le : ' : 'تاريخ الميلاد: ') + fmtD(dob) + (fr ? ' (' + yearsBetween(dob, todayKey()) + ' ans)' : ' (العمر ' + yearsBetween(dob, todayKey()) + ' سنة)'));
    L1.push((fr ? 'Activité : ' : 'المهنة / النشاط: ') + a.job[lang] + (a.employer ? ' – ' + a.employer[lang] : ''));
    L1.push((fr ? 'Téléphone : ' : 'الهاتف: ') + phoneDisplay(a.phone));
    L1.push('');
    if (f.type === 'loan') {
      L1.push(fr ? '2) DEMANDE' : '2) الطلب');
      L1.push((fr ? 'Montant : ' : 'المبلغ: ') + money(f.request.amount, lang) + ' · ' + (fr ? 'Durée : ' : 'المدة: ') + T('term_months', { n: f.request.term }) + ' · ' + (fr ? 'Objet : ' : 'الغرض: ') + f.request.purpose[lang]);
      L1.push((fr ? 'Mensualité estimée : ' : 'القسط التقديري: ') + money(res.installment, lang) + (fr ? ' / mois (marge d’exemple ' + S.margin + ' %/an)' : ' شهرياً (هامش مثال ' + S.margin + '% سنوياً)'));
      L1.push('');
      L1.push(fr ? '3) CAPACITÉ DE REMBOURSEMENT' : '3) القدرة على السداد');
      L1.push((fr ? 'Revenu net mensuel : ' : 'صافي الدخل الشهري: ') + money(res.income.v, lang) + ' (' + (res.income.src === 'application' ? (fr ? 'déclaré' : 'مصرّح به') : T('doc_' + res.income.src)) + ')');
      if (a.otherDebt) L1.push((fr ? 'Autres charges : ' : 'التزامات أخرى: ') + money(a.otherDebt, lang));
      L1.push((fr ? 'Taux d’endettement : ' : 'نسبة التحمل: ') + (res.dti == null ? '—' : pct(res.dti)) + (fr ? ' (seuil paramétré : ' + S.dti + ' %)' : ' (الحد في الإعدادات: ' + S.dti + '%)'));
      L1.push('');
      L1.push(fr ? '4) GARANTIES' : '4) الضمانات');
      if (d.guarantor) L1.push((fr ? 'Caution : ' : 'الكفيل: ') + d.guarantor.nameAr + ' · ' + (fr ? 'NNI ' : 'الرقم الوطني ') + d.guarantor.nni + ' · ' + d.guarantor.relation[lang] + ' · ' + (fr ? 'revenu ' : 'الدخل ') + money(d.guarantor.income, lang));
      else L1.push(+f.request.amount > S.guar ? (fr ? 'Caution requise – non fournie' : 'الكفالة مطلوبة – غير مرفقة') : (fr ? 'Aucune caution requise pour ce montant' : 'لا تُشترط كفالة لهذا المبلغ'));
      L1.push('');
    } else {
      L1.push(fr ? '2) COMPTE DEMANDÉ' : '2) الحساب المطلوب');
      L1.push((fr ? 'Produit : ' : 'المنتج: ') + f.request.product[lang] + ' · ' + (fr ? 'Mouvements mensuels attendus : ' : 'الحركة الشهرية المتوقعة: ') + money(f.request.expected, lang));
      L1.push((fr ? 'Revenu net mensuel : ' : 'صافي الدخل الشهري: ') + money(res.income.v, lang));
      L1.push('');
    }
    var n = f.type === 'loan' ? 5 : 3;
    L1.push(n + (fr ? ') RÉSULTATS DES CONTRÔLES AUTOMATIQUES (pistes à vérifier, pas des verdicts)' : ') نتائج الفحص الآلي (للتحقق، وليست أحكاماً)'));
    if (!res.flags.length) L1.push(fr ? '– Aucune alerte.' : '– لا تنبيهات.');
    res.flags.forEach(function (fl) {
      var x = flagText(fl, lang), rv = (f.reviews || {})[flagKey(fl)];
      L1.push('– [' + T('sev_' + fl.sev) + '] ' + x.title + ' : ' + x.evidence[0] + (rv ? ' → ' + (rv.status === 'confirmed' ? T('flag_confirmed_by', { name: staffName(rv.by, lang), time: fmtStamp(rv.at, lang) }) : T('flag_cleared_by', { name: staffName(rv.by, lang), time: fmtStamp(rv.at, lang) })) : ''));
    });
    var ok = CHECKS.filter(function (c) { return res.status[c] === 'ok'; }).map(function (c) { return T('ck_' + c); });
    if (ok.length) L1.push((fr ? 'Sans observation : ' : 'بلا ملاحظات: ') + ok.join(fr ? ' ; ' : '، '));
    L1.push('');
    L1.push((n + 1) + (fr ? ') PIÈCES' : ') الوثائق'));
    var att = Object.keys(d).filter(function (k) { return d[k]; }).map(function (k) { return T('doc_' + k); });
    L1.push((fr ? 'Fournies : ' : 'مرفقة: ') + (att.join(fr ? ', ' : '، ') || '—'));
    if (res.missing.length) L1.push((fr ? 'Manquantes : ' : 'ناقصة: ') + res.missing.map(function (k) { return T('doc_' + k); }).join(fr ? ', ' : '، '));
    if (f.compliance) { L1.push(''); L1.push(T('comp_given', { op: T('comp_' + f.compliance.op) }) + ' – ' + staffName(f.compliance.by, lang) + ' · ' + fmtStamp(f.compliance.at, lang) + (f.compliance.note ? ' : ' + f.compliance.note : '')); }
    L1.push('');
    L1.push((n + 2) + (fr ? ') AVIS ET RECOMMANDATION DU CHARGÉ DE CRÉDIT' : ') رأي موظف الائتمان وتوصيته'));
    L1.push(fr ? '[À rédiger par l’agent]' : '[يكتبها الموظف]');
    L1.push('');
    L1.push(fr ? 'Brouillon préparé automatiquement le ' + fmtStamp(new Date().toISOString(), lang) + '. Il ne contient aucune décision : la décision revient au chargé de crédit.' : 'أعدّ النظام هذه المسودة آلياً بتاريخ ' + fmtStamp(new Date().toISOString(), lang) + '، ولا تتضمن أي قرار. القرار لموظف الائتمان.');
    return L1.join('\n');
  }

  global.Core = {
    pad: pad, dateKey: dateKey, parseKey: parseKey, todayKey: todayKey, addDays: addDays, addYears: addYears, D: D, yearsBetween: yearsBetween, daysBetween: daysBetween,
    fmtD: fmtD, fmtStamp: fmtStamp, ago: ago, monthLabel: monthLabel, money: money, num: num, pct: pct, phoneDisplay: phoneDisplay, nniDisplay: nniDisplay,
    STAFF: STAFF, staff: staff, staffName: staffName, roleLabel: roleLabel, DEFAULT_SETTINGS: DEFAULT_SETTINGS, WATCHLIST: WATCHLIST,
    similarity: similarity, initials: initials, CHECKS: CHECKS, SEV_RANK: SEV_RANK, DOC_ORDER: DOC_ORDER,
    run: run, fields: fields, installment: installment, dti: dti, income: income, requiredDocs: requiredDocs, hasDoc: hasDoc, docCount: docCount, slotDocKey: slotDocKey, incomeDocKey: incomeDocKey,
    flagText: flagText, flagTitle: flagTitle, flagKey: flagKey, FLAG_FAMILY: FLAG_FAMILY, AML_CODES: AML_CODES,
    customerMessage: customerMessage, msgItems: msgItems, waLink: waLink, memo: memo, hash: hash
  };
})(window);

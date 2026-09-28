/* AICore Tadqiq — main app (index.html). Hash routes:
 * #/inbox · #/file/ID/tab · #/new · #/compliance · #/audit · #/reports · #/about · #/more
 * Human-in-the-loop: the system reads, checks and drafts; a named officer decides. DEMO: localStorage only. */
(function () {
  'use strict';
  var S = Store, C = Core, root = document.getElementById('root');
  I18N.add('ar', {
    ck_na: 'لا ينطبق', dec_credit_only: 'قرار الائتمان من صلاحية موظف الائتمان. يمكنك مراجعة التنبيهات وتأكيدها أو استبعادها من تبويب «الفحوصات».',
    open_other: 'فتح {id}', fields_from_doc: 'حقول مستخرجة من هذه الوثيقة', doc_required: 'مطلوبة',
    reason_label: 'السبب', comp_note: 'ملاحظة الامتثال (إلزامية)', comp_note_ph: 'مثال: تشابه أسماء – تاريخ الميلاد ومكان الميلاد مختلفان…',
    decided_badge: 'قرار', flag_hl_all: 'الحقول المظللة بالأحمر مرتبطة بتنبيهات', sim_badge: 'محاكاة',
    kpi_live: 'مباشر', stat_files: 'ملفات', role_now: 'الدور الحالي', choose: 'اختيار',
    more_share_btn: 'فتح صفحة المشاركة', lang_ar: 'العربية', lang_fr: 'Français', whatsapp: 'واتساب',
    ab_ctx_title: 'لماذا الآن؟', ab_pilot_cta: 'اطلب عرضاً لمؤسستك', cv_aml: 'تنبيهات تخص الامتثال',
    k_dti_max: 'الحد المعتمد {n}%', audit_hitl: 'النظام يقرأ ويفحص ويُعدّ المسودات فقط. كل قبول أو رفض أو إحالة في هذا السجل صادر عن موظف مسمّى.', role_s_credit: 'ائتمان', role_s_comp: 'امتثال', sim_loan: 'طلب قرض', sim_account: 'فتح حساب', none: '—', escalation_reason: 'سبب الإحالة'
  });
  I18N.add('fr', {
    ck_na: 'Sans objet', dec_credit_only: 'La décision de crédit relève du chargé de crédit. Vous pouvez revoir, confirmer ou écarter les alertes depuis l’onglet « Contrôles ».',
    open_other: 'Ouvrir {id}', fields_from_doc: 'Champs extraits de cette pièce', doc_required: 'Requise',
    reason_label: 'Motif', comp_note: 'Note conformité (obligatoire)', comp_note_ph: 'Ex. : homonymie – date et lieu de naissance différents…',
    decided_badge: 'Décision', flag_hl_all: 'Les champs surlignés en rouge sont liés à des alertes', sim_badge: 'Simulation',
    kpi_live: 'En direct', stat_files: 'dossiers', role_now: 'Rôle actuel', choose: 'Choisir',
    more_share_btn: 'Ouvrir la page de partage', lang_ar: 'العربية', lang_fr: 'Français', whatsapp: 'WhatsApp',
    ab_ctx_title: 'Pourquoi maintenant ?', ab_pilot_cta: 'Demander une démo pour votre institution', cv_aml: 'Alertes relevant de la conformité',
    k_dti_max: 'plafond {n} %', audit_hitl: 'Le système lit, contrôle et prépare les brouillons. Chaque acceptation, refus ou transmission de ce journal vient d’un agent nommé.', role_s_credit: 'Crédit', role_s_comp: 'Conformité', sim_loan: 'Crédit', sim_account: 'Compte', none: '—', escalation_reason: 'Motif de transmission'
  });

  S.load();
  var app = { route: 'inbox', fileId: null, tab: 'checks', filter: 'all', type: 'all', q: '', docSel: null, hl: null, audit: { f: 'all', user: '', q: '' }, msgLang: {}, msgDraft: {}, dec: { type: null, reason: '', ack: false }, sim: null };
  var TABS = ['checks', 'docs', 'data', 'memo', 'msg', 'decision'];
  var ROUTES = ['inbox', 'file', 'new', 'compliance', 'audit', 'reports', 'about', 'more'];

  function me() { return S.state.user; }
  function meObj() { return C.staff(me()); }
  function isComp() { return meObj().role === 'compliance'; }
  function lang() { return I18N.lang; }
  function nameOf(f) { return lang() === 'fr' ? f.applicant.lat : f.applicant.ar; }
  function altName(f) { return lang() === 'fr' ? f.applicant.ar : f.applicant.lat; }
  function txt(x) { return x == null ? '' : typeof x === 'object' ? (x[lang()] || x.ar || '') : x; }
  var AV = ['#0E7480', '#C96F1F', '#3D5BA9', '#15945F', '#8A4FA0', '#B7791F', '#0A4E61', '#C9403F'];
  function avatarFor(f, cls) { return '<span class="avatar ' + (cls || '') + '" style="background:' + AV[C.hash(f.id) % AV.length] + '">' + UI.esc(C.initials(nameOf(f))) + '</span>'; }
  function staffAvatar(id, cls) { var s = C.staff(id); return '<span class="avatar ' + (cls || '') + '" style="background:' + (s ? s.color : '#8AA') + '">' + (s ? UI.esc(C.initials(s[lang()])) : '·') + '</span>'; }
  var ST = { new: ['info', 'sparkle'], review: ['warn', 'eye'], incomplete: ['accent', 'note'], compliance: ['pur', 'shield'], approved: ['ok', 'check'], rejected: ['bad', 'x'] };
  function statusChip(s) { return '<span class="chip ' + ST[s][0] + '">' + UI.icon(ST[s][1]) + t('st_' + s) + '</span>'; }
  var SRC_IC = { whatsapp: 'wa', email: 'mail', branch: 'store' };
  function srcChip(s) { return '<span class="chip gray src-' + s + '">' + UI.icon(SRC_IC[s]) + t('src_' + s) + '</span>'; }
  var SEV_CLS = { high: 'bad', medium: 'warn', low: 'info' };
  function sevChip(sev) { return '<span class="chip ' + SEV_CLS[sev] + ' sev">' + UI.icon(sev === 'low' ? 'info' : 'alert') + t('sev_' + sev) + '</span>'; }
  function ckLi(r, c, pop) {
    var st = r.status[c], cls = st === 'ok' ? 'ok' : st === 'na' ? 'na' : SEV_CLS[st];
    return '<li class="ck ' + cls + (pop ? ' pop' : '') + '">' + UI.icon(st === 'ok' ? 'check' : st === 'na' ? 'info' : 'alert') + '<span>' + t('ck_' + c) + '</span><em>' + (st === 'ok' ? '✓' : st === 'na' ? t('ck_na') : t('sev_' + st)) + '</em></li>';
  }
  function flagSummary(f) {
    var r = S.result(f), o = S.openFlags(f), c = { high: 0, medium: 0, low: 0 };
    o.forEach(function (x) { c[x.sev]++; });
    var h = '';
    if (c.high) h += '<span class="chip bad">' + UI.icon('alert') + t('sev_count_high', { n: c.high }) + '</span>';
    if (c.medium) h += '<span class="chip warn">' + UI.icon('alert') + t('sev_count_medium', { n: c.medium }) + '</span>';
    if (!c.high && !c.medium) h += '<span class="chip ok">' + UI.icon('check') + t('no_major_flags') + '</span>';
    if (c.low) h += '<span class="chip info">' + t('sev_count_low', { n: c.low }) + '</span>';
    if (r.missing.length) h += '<span class="chip accent">' + UI.icon('note') + t('missing_n', { n: r.missing.length }) + '</span>';
    return h;
  }
  function pendingCount() { return S.files().filter(function (f) { return ['new', 'review', 'incomplete'].indexOf(f.status) >= 0; }).length; }
  function compCount() { return S.files().filter(function (f) { return f.status === 'compliance'; }).length; }

  /* ---------------- routing ---------------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/');
    var r = h[0] || 'inbox';
    if (ROUTES.indexOf(r) < 0) r = 'inbox';
    if (r === 'file') {
      if (!S.file(h[1])) { r = 'inbox'; }
      else {
        if (app.fileId !== h[1]) { app.docSel = null; app.hl = null; app.dec = { type: null, reason: '', ack: false }; }
        app.fileId = h[1]; app.tab = TABS.indexOf(h[2]) >= 0 ? h[2] : 'checks';
      }
    }
    app.route = r;
  }
  var lastRoute = '';
  window.addEventListener('hashchange', function () {
    var prev = lastRoute; parseHash(); render();
    var key = app.route + (app.route === 'file' ? app.fileId : '');
    if (prev !== key) window.scrollTo(0, 0);
    else { var st = document.querySelector('.subtabs'), fh = document.querySelector('.file-head'); if (st && fh && window.scrollY > st.offsetTop - 30) window.scrollTo(0, Math.max(0, st.offsetTop - 34)); }
  });
  window.addEventListener('storage', function (e) { if (e.key === S.KEY) { S.load(); render(); } });

  /* ---------------- shell ---------------- */
  function render() {
    I18N.applyDir(); UI.refreshBanner();
    lastRoute = app.route + (app.route === 'file' ? app.fileId : '');
    var navKey = app.route === 'file' ? 'inbox' : app.route;
    document.title = t('product') + ' – ' + t('nav_' + (app.route === 'file' ? 'file' : app.route)) + ' (' + t('demoBanner') + ')';
    var pend = pendingCount(), comp = compCount();
    var main = [['inbox', 'inbox', pend], ['new', 'plus', 0], ['compliance', 'shield', comp], ['audit', 'list', 0]];
    function navHtml(items) {
      return items.map(function (n) {
        return '<a class="nav-item' + (navKey === n[0] ? ' active' : '') + '" href="#/' + n[0] + '" data-nav="' + n[0] + '">' + UI.icon(n[1]) +
          '<span>' + t('nav_' + n[0]) + '</span>' + (n[2] ? '<span class="badge">' + n[2] + '</span>' : '') + '</a>';
      }).join('');
    }
    var u = meObj();
    root.innerHTML =
      '<div class="app">' +
        '<header class="appbar"><div class="appbar-top">' +
          '<a class="brand" href="#/inbox">' + UI.LOGO + '<div class="grow"><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div></a>' +
          '<div class="appbar-actions">' +
            '<button class="pill-btn" id="langBtn" type="button" title="' + t('langSwitch') + '">' + UI.icon('globe') + '<span>' + (lang() === 'ar' ? 'FR' : 'ع') + '</span></button>' +
            '<button class="staff-chip" id="roleBtn" type="button" title="' + t('switch_role') + '">' + staffAvatar(u.id) + '<span class="sc-txt"><b>' + u[lang()] + '</b><small>' + C.roleLabel(u.id) + '</small><em>' + t(u.role === 'compliance' ? 'role_s_comp' : 'role_s_credit') + '</em></span></button>' +
          '</div></div>' +
          '<div class="clinic-line">' + UI.icon('building') + '<span>' + t('instName') + '</span><span class="fict">' + t('instFict') + '</span></div>' +
        '</header>' +
        '<nav class="side-nav">' + navHtml(main.concat([['reports', 'chart', 0], ['about', 'help', 0], ['more', 'menu', 0]])) +
          '<div class="side-foot"><b>' + t('tagline') + '</b><br>' + t('footer') + '</div></nav>' +
        '<main class="container" id="view"></main>' +
        '<nav class="bottom-nav">' + navHtml(main.concat([['more', 'menu', 0]])) + '</nav>' +
      '</div>';
    if (app.route === 'reports' || app.route === 'about') root.querySelectorAll('.bottom-nav [data-nav="more"]').forEach(function (a) { a.classList.add('active'); });
    document.getElementById('langBtn').onclick = function () { I18N.setLang(lang() === 'ar' ? 'fr' : 'ar'); render(); };
    document.getElementById('roleBtn').onclick = roleModal;
    var v = document.getElementById('view');
    ({ inbox: viewInbox, file: viewFile, new: viewNew, compliance: viewCompliance, audit: viewAudit, reports: viewReports, about: viewAbout, more: viewMore })[app.route](v);
    v.insertAdjacentHTML('beforeend', '<footer class="footer"><div class="tagline">' + t('tagline') + '</div><div><b>' + t('product') + '</b> · ' + t('footer') + '</div></footer>');
  }

  function roleModal() {
    UI.modal({
      title: t('switch_role'), sub: t('switch_role_sub'),
      body: C.STAFF.map(function (s) {
        return '<button class="staff-opt' + (s.id === me() ? ' cur' : '') + '" data-staff="' + s.id + '" type="button">' + staffAvatar(s.id, 'lg') +
          '<span><b>' + s[lang()] + '</b><small>' + C.roleLabel(s.id) + '</small></span>' + (s.id === me() ? '<span class="chip ok" style="margin-inline-start:auto">' + UI.icon('check') + '</span>' : UI.icon('chevron', 'chev')) + '</button>';
      }).join('') + '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('file_hitl') + '</span></div>',
      onOpen: function (w, close) {
        w.querySelectorAll('[data-staff]').forEach(function (b) {
          b.onclick = function () { S.A.setUser(b.dataset.staff); close(); render(); UI.toast(t('now_acting', { name: C.staffName(b.dataset.staff) })); };
        });
      }
    });
  }
  function switchTo(id) { S.A.setUser(id); render(); UI.toast(t('now_acting', { name: C.staffName(id) })); }

  /* ---------------- inbox ---------------- */
  function fileCard(f) {
    var amt = f.type === 'loan' ? C.money(f.request.amount) : txt(f.request.product);
    return '<a class="card fc' + (f.status === 'new' ? ' new' : '') + '" href="#/file/' + f.id + '" data-id="' + f.id + '">' +
      '<div class="fc-top">' + avatarFor(f, 'lg') +
        '<div class="grow"><div class="fc-name" dir="auto">' + UI.esc(nameOf(f)) + '</div>' +
        '<div class="fc-meta"><span class="ltr num">' + f.id + '</span><span>·</span><span>' + t('type_' + f.type) + '</span></div></div>' +
        statusChip(f.status) + '</div>' +
      '<div class="fc-row">' + srcChip(f.source) + '<span class="fc-ago">' + UI.icon('clock') + C.ago(f.receivedAt) + '</span><b class="fc-amt num">' + UI.esc(amt) + '</b></div>' +
      '<div class="fc-flags">' + flagSummary(f) + '</div>' +
    '</a>';
  }
  function viewInbox(v) {
    var all = S.files();
    var counts = { all: all.length };
    all.forEach(function (f) { counts[f.status] = (counts[f.status] || 0) + 1; });
    var q = app.q.trim().toLowerCase();
    var list = all.filter(function (f) {
      if (app.filter !== 'all' && f.status !== app.filter) return false;
      if (app.type !== 'all' && f.type !== app.type) return false;
      if (q && (f.applicant.ar + ' ' + f.applicant.lat + ' ' + f.applicant.nni + ' ' + f.id).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var order = { new: 0, review: 1, incomplete: 2, compliance: 3, approved: 4, rejected: 5 };
    list.sort(function (a, b) { return (order[a.status] - order[b.status]) || (a.receivedAt < b.receivedAt ? 1 : -1); });
    v.innerHTML =
      '<div class="page-head"><div><h2>' + t('inbox_title') + '</h2><p>' + t('inbox_sub') + '</p></div>' +
        '<a class="btn btn-accent btn-sm" href="#/new">' + UI.icon('plus') + '<span>' + t('nav_new') + '</span></a></div>' +
      '<div class="hitl-strip">' + UI.icon('shield') + '<span>' + t('inbox_hitl', { pending: pendingCount() }) + '</span></div>' +
      '<div class="filters" id="stFilters">' + ['all', 'new', 'review', 'incomplete', 'compliance', 'approved', 'rejected'].map(function (s) {
        return '<button class="fchip' + (app.filter === s ? ' on' : '') + '" data-f="' + s + '">' + t('st_' + s) + ' <span class="fc-n">' + (counts[s] || 0) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="filter-row"><div class="search-box">' + UI.icon('search') + '<input class="input" id="q" type="search" placeholder="' + t('search_ph') + '" value="' + UI.esc(app.q) + '"></div>' +
        '<select class="select" id="typeSel"><option value="all">' + t('type_all') + '</option><option value="loan"' + (app.type === 'loan' ? ' selected' : '') + '>' + t('type_loan') + '</option><option value="account"' + (app.type === 'account' ? ' selected' : '') + '>' + t('type_account') + '</option></select></div>' +
      '<div class="list-grid" id="fileList">' + (list.length ? list.map(fileCard).join('') : '<div class="card empty">' + UI.icon('inbox') + '<div>' + t('no_files') + '</div></div>') + '</div>';
    v.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { app.filter = b.dataset.f; render(); }; });
    var qi = v.querySelector('#q');
    qi.oninput = function () { app.q = qi.value; var pos = qi.selectionStart; render(); var n = document.getElementById('q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
    v.querySelector('#typeSel').onchange = function () { app.type = this.value; render(); };
  }

  /* ---------------- file detail ---------------- */
  function viewFile(v) {
    var f = S.file(app.fileId);
    if (f.status === 'new' && !isComp()) { S.A.startReview(f.id, me()); }
    var r = S.result(f), o = S.openFlags(f), set = S.settings();
    var loan = f.type === 'loan';
    var dtiCls = r.dti == null ? '' : r.dti * 100 > set.dti + 15 ? 'bad' : r.dti * 100 > set.dti ? 'warn' : 'ok';
    var stats = loan ?
      [[t('k_amount'), C.money(f.request.amount), t('term_months', { n: f.request.term })], [t('k_installment'), C.money(r.installment), t('k_income') + ': ' + C.money(r.income.v)], [t('k_dti'), r.dti == null ? '—' : C.pct(r.dti), t('k_dti_max', { n: set.dti }), dtiCls]] :
      [[t('k_product'), txt(f.request.product), ''], [t('k_income'), C.money(r.income.v), t(r.income.src === 'application' ? 'doc_application' : 'doc_' + r.income.src)]];
    var oc = { high: 0, medium: 0, low: 0 }; o.forEach(function (x) { oc[x.sev]++; });
    stats.push([t('k_flags'), String(o.length), (oc.high ? t('sev_count_high', { n: oc.high }) + (oc.medium ? ' · ' : '') : '') + (oc.medium ? t('sev_count_medium', { n: oc.medium }) : (oc.high ? '' : t('no_major_flags'))), oc.high ? 'bad' : oc.medium ? 'warn' : 'ok']);
    var tabCount = { checks: r.flags.length, docs: C.docCount(f), msg: C.msgItems(f, r, 'ar').length };
    v.innerHTML =
      '<a class="back-link" href="#/inbox">' + UI.icon('chevron', 'back') + '<span>' + t('back_files') + '</span></a>' +
      '<section class="card file-head">' +
        '<div class="fh-top">' + avatarFor(f, 'lg') + '<div class="grow"><h2 dir="auto">' + UI.esc(nameOf(f)) + '</h2><div class="fh-alt" dir="auto">' + UI.esc(altName(f)) + '</div></div></div>' +
        '<div class="fh-chips"><span class="chip gray ltr num">' + f.id + '</span><span class="chip">' + UI.icon(loan ? 'coins' : 'wallet') + t('type_' + f.type) + '</span>' + srcChip(f.source) + statusChip(f.status) + '</div>' +
        '<div class="fh-stats">' + stats.map(function (s) { return '<div class="fh-stat ' + (s[3] || '') + '"><small>' + s[0] + '</small><b class="num">' + UI.esc(s[1]) + '</b><span>' + UI.esc(s[2]) + '</span></div>'; }).join('') + '</div>' +
        '<div class="fh-line">' + UI.icon('inbox') + '<span>' + t('received') + ' ' + C.fmtStamp(f.receivedAt) + ' · ' + t('src_' + f.source) + '</span>' + (f.assigned ? '<span class="sep">·</span><span>' + t('assigned') + ': <b>' + C.staffName(f.assigned) + '</b></span>' : '') + '</div>' +
        '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('file_hitl') + '</span></div>' +
      '</section>' +
      '<nav class="subtabs" role="tablist">' + TABS.map(function (k) {
        var n = tabCount[k];
        return '<a class="subtab' + (app.tab === k ? ' active' : '') + '" role="tab" href="#/file/' + f.id + '/' + k + '" data-tab="' + k + '">' + t('tab_' + k) + (n ? '<span class="cnt' + (k === 'checks' && oc.high ? ' hot' : '') + '">' + n + '</span>' : '') + '</a>';
      }).join('') + '</nav>' +
      '<div id="tabBody"></div>';
    var body = v.querySelector('#tabBody');
    ({ checks: tabChecks, docs: tabDocs, data: tabData, memo: tabMemo, msg: tabMsg, decision: tabDecision })[app.tab](body, f, r);
    var nav = v.querySelector('.subtabs'), act = v.querySelector('.subtab.active');
    if (nav && act) { var ar = act.getBoundingClientRect(), nr = nav.getBoundingClientRect(); if (ar.left < nr.left || ar.right > nr.right) nav.scrollLeft += (ar.left - nr.left) - 20; }
  }
  function go(tab) { location.hash = '#/file/' + app.fileId + '/' + tab; }

  /* -- checks tab -- */
  function flagCard(f, fl) {
    var x = C.flagText(fl), key = C.flagKey(fl), rv = (f.reviews || {})[key];
    var extra = '';
    if (fl.code === 'DUP_NNI' || fl.code === 'DUP_PHONE') extra = fl.v.items.map(function (it) { return '<a class="btn btn-ghost btn-sm" href="#/file/' + it.id + '">' + UI.icon('external') + '<span>' + t('open_other', { id: '\u2066' + it.id + '\u2069' }) + '</span></a>'; }).join('');
    var docBtn = fl.docs.length ? '<button class="btn btn-ghost btn-sm" data-act="see-doc" data-doc="' + fl.docs[fl.docs.length - 1] + '">' + UI.icon('eye') + '<span>' + t('see_doc') + '</span></button>' : '';
    var msgBtn = fl.code === 'MISSING_DOCS' || fl.code === 'ID_EXPIRED' || fl.code === 'DATE_FUTURE' ? '<button class="btn btn-soft btn-sm" data-act="go-msg">' + UI.icon('wa') + '<span>' + t('go_message') + '</span></button>' : '';
    return '<article class="card flag sev-' + fl.sev + (rv ? ' reviewed ' + rv.status : '') + '" data-key="' + UI.esc(key) + '" data-code="' + fl.code + '" data-file="' + f.id + '">' +
      '<div class="flag-top">' + sevChip(fl.sev) + '<h3>' + UI.esc(x.title) + '</h3></div>' +
      '<div class="flag-sec"><div class="flag-lab">' + UI.icon('search') + t('evidence') + '</div><ul class="evi">' + x.evidence.map(function (e) { return '<li dir="auto">' + UI.esc(e) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="flag-why"><b>' + UI.icon('help') + t('why') + '</b><p>' + UI.esc(x.why) + '</p></div>' +
      '<div class="flag-why act"><b>' + UI.icon('usercheck') + t('suggested') + '</b><p>' + UI.esc(x.action) + '</p></div>' +
      (rv ? '<div class="rv-stamp ' + rv.status + '">' + UI.icon(rv.status === 'confirmed' ? 'check' : 'ban') + '<div class="grow"><b>' + t(rv.status === 'confirmed' ? 'flag_confirmed_by' : 'flag_cleared_by', { name: C.staffName(rv.by), time: C.fmtStamp(rv.at) }) + '</b><div dir="auto">«' + UI.esc(rv.note) + '»</div></div><button class="btn btn-ghost btn-sm" data-act="flag-reopen">' + t('flag_reopen') + '</button></div>' : '') +
      '<div class="flag-actions">' + docBtn + msgBtn + extra +
        (rv ? '' : '<button class="btn btn-sm btn-ok-soft" data-act="flag-confirm">' + UI.icon('check') + '<span>' + t('flag_confirm') + '</span></button><button class="btn btn-sm btn-ghost" data-act="flag-clear">' + UI.icon('ban') + '<span>' + t('flag_clear') + '</span></button>') +
      '</div>' +
    '</article>';
  }
  function bindFlags(container) {
    container.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var card = b.closest('[data-key]'); if (!card) return;
      var a = b.dataset.act, file = S.file(card.dataset.file);
      if (a === 'see-doc') { app.fileId = file.id; app.docSel = b.dataset.doc; app.hl = card.dataset.key; location.hash = '#/file/' + file.id + '/docs'; return; }
      if (a === 'go-msg') { location.hash = '#/file/' + file.id + '/msg'; return; }
      if (a === 'flag-confirm' || a === 'flag-clear') return flagModal(file, card.dataset.key, card.dataset.code, a === 'flag-confirm' ? 'confirmed' : 'cleared');
      if (a === 'flag-reopen') { S.A.reopenFlag(file.id, card.dataset.key, card.dataset.code, me()); render(); }
    });
  }
  function flagModal(f, key, code, status) {
    UI.modal({
      title: t(status === 'confirmed' ? 'flag_confirm' : 'flag_clear'), sub: C.flagTitle(code) + ' · ' + f.id,
      body: '<label class="field"><span class="label">' + t('flag_note_label') + '</span><textarea class="textarea" id="fNote" placeholder="' + t('flag_note_ph') + '"></textarea></label><div class="err-msg hidden" id="fErr">' + t('flag_note_err') + '</div>' +
        '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('flag_review_body', { name: C.staffName(me()) }) + '</span></div>',
      actions: [{ label: t('a_cancel') }, { label: t(status === 'confirmed' ? 'flag_confirm' : 'flag_clear'), cls: status === 'confirmed' ? 'btn-ok' : 'btn-primary', icon: status === 'confirmed' ? 'check' : 'ban', id: 'fSave', onClick: function (close) {
        var n = document.getElementById('fNote').value.trim();
        if (n.length < 4) { document.getElementById('fErr').classList.remove('hidden'); return; }
        S.A.reviewFlag(f.id, key, code, me(), status, n); close(); UI.toast(t(status === 'confirmed' ? 'ev_flag_confirm' : 'ev_flag_clear')); render();
      } }],
      onOpen: function (w) { setTimeout(function () { var n = w.querySelector('#fNote'); if (n) n.focus(); }, 50); }
    });
  }
  function tabChecks(el, f, r) {
    el.innerHTML =
      '<div class="checks-sum card"><div class="row" style="flex-wrap:wrap;gap:6px"><b class="grow cs-title">' + UI.icon('cpu') + '<span>' + t('checks_run', { n: r.checksRun, d: C.docCount(f) }) + '</span></b>' +
        (r.counts.high ? '<span class="chip bad">' + t('sev_count_high', { n: r.counts.high }) + '</span>' : '') + (r.counts.medium ? '<span class="chip warn">' + t('sev_count_medium', { n: r.counts.medium }) + '</span>' : '') + (r.counts.low ? '<span class="chip info">' + t('sev_count_low', { n: r.counts.low }) + '</span>' : '') +
      '</div><ul class="cklist">' + C.CHECKS.map(function (c) { return ckLi(r, c); }).join('') + '</ul></div>' +
      '<div class="flags" id="flags">' + (r.flags.length ? r.flags.map(function (fl) { return flagCard(f, fl); }).join('') : '<div class="card empty">' + UI.icon('check') + '<div>' + t('sim_none') + '</div></div>') + '</div>' +
      '<a class="btn btn-primary btn-block" href="#/file/' + f.id + '/decision" style="margin-top:14px">' + UI.icon('scale') + '<span>' + t('tab_decision') + '</span></a>';
    bindFlags(el.querySelector('#flags'));
  }

  /* -- documents tab -- */
  function docSlots(f) {
    var req = C.requiredDocs(f, S.settings()), slots = [];
    C.DOC_ORDER.forEach(function (slot) {
      var present = C.hasDoc(f, slot);
      if (!present && req.indexOf(slot) < 0) return;
      slots.push({ slot: slot, key: C.slotDocKey(f, slot), present: present });
    });
    return slots;
  }
  function confCls(c) { var lc = S.settings().lowConf; return c >= 90 ? 'ok' : c >= lc ? 'warn' : 'bad'; }
  function tabDocs(el, f, r) {
    var slots = docSlots(f), o = S.openFlags(f);
    var flaggedDocs = {}; o.forEach(function (fl) { fl.docs.forEach(function (d) { flaggedDocs[d] = 1; }); });
    if (!app.docSel || !slots.some(function (s) { return s.key === app.docSel; })) app.docSel = (slots.find(function (s) { return s.present && flaggedDocs[s.key]; }) || slots[0]).key;
    var sel = slots.find(function (s) { return s.key === app.docSel; });
    var hl = [];
    r.flags.forEach(function (fl) { if (!app.hl || C.flagKey(fl) === app.hl) hl = hl.concat(fl.fields); });
    var stage = sel.present ? Docs.render(f, sel.key, hl) :
      '<div class="doc-missing">' + UI.icon(Docs.ICON[sel.slot]) + '<b>' + t('doc_' + sel.key) + ' – ' + t('doc_missing') + '</b><p>' + t('doc_missing_long') + '</p><button class="btn btn-soft btn-sm" data-act="go-msg">' + UI.icon('wa') + '<span>' + t('go_message') + '</span></button></div>';
    var flds = r.fields.filter(function (x) { return x.doc === sel.key; });
    var hasHl = sel.present && hl.some(function (k) { return k.indexOf(sel.key + '.') === 0; });
    el.innerHTML =
      '<div class="doc-chips" role="tablist">' + slots.map(function (s) {
        var st = !s.present ? 'missing' : flaggedDocs[s.key] ? 'flagged' : 'ok';
        return '<button class="doc-chip ' + st + (s.key === app.docSel ? ' on' : '') + '" data-doc="' + s.key + '">' + UI.icon(Docs.ICON[s.slot]) + '<span>' + t('doc_' + s.key) + '</span><i>' + (st === 'missing' ? '✕' : st === 'flagged' ? '!' : '✓') + '</i></button>';
      }).join('') + '</div>' +
      '<div class="doc-stage" id="docStage">' + stage + '</div>' +
      (sel.present ? '<div class="doc-cap">' + UI.icon('info') + '<span>' + t('doc_src', { src: t('src_' + f.source), time: C.fmtStamp(f.receivedAt) }) + ' · ' + t('doc_note') + (hasHl ? ' <b class="hl-legend">' + t('flag_hl_all') + '</b>' : '') + '</span></div>' : '') +
      (flds.length ? '<section class="card"><div class="card-title">' + UI.icon('scan') + t('fields_from_doc') + '</div><dl class="kv">' + flds.map(function (x) { return '<dt>' + t('fl_' + x.key) + '</dt><dd><span dir="auto">' + UI.esc(x.value) + '</span> <span class="conf-pill ' + confCls(x.conf) + '">' + x.conf + '%</span></dd>'; }).join('') + '</dl></section>' : '');
    el.querySelectorAll('[data-doc]').forEach(function (b) { b.onclick = function () { app.docSel = b.dataset.doc; app.hl = null; tabDocs(el, f, r); }; });
    var gm = el.querySelector('[data-act="go-msg"]'); if (gm) gm.onclick = function () { go('msg'); };
    var hlEl = el.querySelector('.doc-stage .hl');
    if (hlEl && app.hl) { var st = el.querySelector('.doc-stage'); st.scrollTop = Math.max(0, hlEl.offsetTop - 60); }
  }

  /* -- data tab -- */
  function tabData(el, f, r) {
    el.innerHTML = '<section class="card"><div class="card-title">' + UI.icon('scan') + t('tab_data') + '</div><p class="muted small" style="margin-bottom:10px">' + t('data_note') + '</p>' +
      '<div class="dtable" role="table"><div class="dt-row dt-head" role="row"><span>' + t('th_field') + '</span><span>' + t('th_value') + '</span><span>' + t('th_source') + '</span><span>' + t('th_conf') + '</span></div>' +
      r.fields.map(function (x) {
        var cc = confCls(x.conf);
        return '<div class="dt-row" role="row"><span class="dt-f">' + t('fl_' + x.key) + '</span><span class="dt-v" dir="auto">' + UI.esc(x.value) + '</span>' +
          '<span class="dt-s"><button class="linkish" data-doc="' + x.doc + '">' + UI.icon(Docs.ICON[x.doc]) + '<span>' + t('doc_' + x.doc) + '</span></button></span>' +
          '<span class="dt-c"><span class="confbar ' + cc + '"><i style="width:' + x.conf + '%"></i></span><b class="' + cc + '">' + x.conf + '%</b>' + (cc === 'bad' ? '<em>' + t('conf_check') + '</em>' : '') + '</span></div>';
      }).join('') + '</div></section>';
    el.querySelectorAll('[data-doc]').forEach(function (b) { b.onclick = function () { app.docSel = b.dataset.doc; app.hl = null; go('docs'); }; });
  }

  /* -- memo tab -- */
  function tabMemo(el, f, r) {
    var text = f.memo ? f.memo.text : C.memo(f, r, S.settings(), lang());
    el.innerHTML = '<section class="card memo-card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px"><div class="card-title" style="margin:0">' + UI.icon('note') + (f.type === 'loan' ? t('memo_title') : t('memo_account_title')) + '</div>' +
      (f.memo ? '<span class="chip ok">' + UI.icon('edit') + t('memo_edited', { name: C.staffName(f.memo.by), time: C.fmtStamp(f.memo.at) }) + '</span>' : '<span class="chip accent">' + UI.icon('cpu') + t('memo_auto') + '</span>') + '</div>' +
      '<div class="hitl-note" style="margin:0 0 10px">' + UI.icon('shield') + '<span>' + t('memo_note') + '</span></div>' +
      '<textarea class="textarea memo-text" id="memoText" dir="' + (lang() === 'ar' ? 'rtl' : 'ltr') + '" spellcheck="false">' + UI.esc(text) + '</textarea>' +
      '<div class="memo-actions"><button class="btn btn-primary" id="memoSave">' + UI.icon('check') + '<span>' + t('memo_save') + '</span></button>' +
        '<button class="btn btn-ghost" id="memoCopy">' + UI.icon('copy') + '<span>' + t('memo_copy') + '</span></button>' +
        '<button class="btn btn-ghost" id="memoRegen">' + UI.icon('refresh') + '<span>' + t('memo_regen') + '</span></button></div></section>';
    var ta = el.querySelector('#memoText');
    function fit() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 4, 1600) + 'px'; }
    setTimeout(fit, 0); ta.addEventListener('input', fit);
    el.querySelector('#memoSave').onclick = function () { S.A.saveMemo(f.id, me(), ta.value); UI.toast(t('memo_saved')); render(); };
    el.querySelector('#memoCopy').onclick = function () { UI.copyText(ta.value).then(function () { UI.toast(t('a_copied')); }); };
    el.querySelector('#memoRegen').onclick = function () {
      if (!f.memo) { ta.value = C.memo(f, r, S.settings(), lang()); fit(); return; }
      UI.modal({ title: t('memo_regen'), body: '<p>' + t('memo_regen_q') + '</p>', actions: [{ label: t('a_cancel') }, { label: t('memo_regen'), cls: 'btn-primary', icon: 'refresh', id: 'regenOk', onClick: function (close) { S.A.resetMemo(f.id); close(); render(); } }] });
    };
  }

  /* -- message tab -- */
  function nowHM() { var d = new Date(); return C.pad(d.getHours()) + ':' + C.pad(d.getMinutes()); }
  function tabMsg(el, f, r) {
    var ml = app.msgLang[f.id] || f.lang || 'ar';
    var dk = f.id + ':' + ml;
    var text = app.msgDraft[dk] != null ? app.msgDraft[dk] : C.customerMessage(f, r, ml, me());
    var items = C.msgItems(f, r, ml);
    var link = C.waLink(f.applicant.phone, text);
    var m = f.msg || {};
    el.innerHTML = '<section class="card"><div class="card-title">' + UI.icon('wa') + t('msg_title') + '</div>' +
      '<p class="muted small">' + t(items.length ? 'msg_sub_missing' : 'msg_sub_none') + '</p>' +
      '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin:12px 0 10px"><b class="small">' + t('msg_lang') + '</b><div class="seg" id="mlSeg">' +
        ['ar', 'hs', 'fr'].map(function (x) { return '<button data-ml="' + x + '" class="' + (x === ml ? 'on' : '') + '">' + t('msg_' + x) + '</button>'; }).join('') + '</div></div>' +
      (ml === 'hs' ? '<div class="hs-note">' + UI.icon('info') + '<span>' + t('msg_hs_note') + '</span></div>' : '') +
      '<div id="waPrev">' + UI.waBubble(text, { to: nameOf(f), phone: C.phoneDisplay(f.applicant.phone), time: nowHM() }) + '</div>' +
      '<details class="draft-edit"' + (app.msgDraft[dk] != null ? ' open' : '') + '><summary class="btn btn-ghost btn-sm">' + UI.icon('edit') + '<span>' + t('msg_edit') + '</span></summary><textarea class="textarea" id="msgText" dir="' + (ml === 'fr' ? 'ltr' : 'rtl') + '">' + UI.esc(text) + '</textarea></details>' +
      '<div class="msg-actions"><a class="btn btn-wa" id="waOpen" href="' + UI.esc(link) + '" target="_blank" rel="noopener">' + UI.icon('wa') + '<span>' + t('msg_open_wa') + '</span></a>' +
        '<button class="btn btn-ghost" id="msgCopy">' + UI.icon('copy') + '<span>' + t('msg_copy') + '</span></button>' +
        '<button class="btn btn-ok" id="msgSent">' + UI.icon('check') + '<span>' + t('msg_mark_sent') + '</span></button></div>' +
      (m.openedAt || m.sentAt ? '<div class="bk-trail">' + (m.openedAt ? '<div>' + UI.icon('wa') + '<span>' + t('msg_opened_by', { name: C.staffName(m.openedBy), time: C.fmtStamp(m.openedAt) }) + '</span></div>' : '') + (m.sentAt ? '<div>' + UI.icon('check') + '<span>' + t('msg_sent_by', { name: C.staffName(m.sentBy), time: C.fmtStamp(m.sentAt) }) + '</span></div>' : '') + '</div>' : '') +
      '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('msg_never_auto') + '</span></div></section>';
    el.querySelectorAll('[data-ml]').forEach(function (b) { b.onclick = function () { app.msgLang[f.id] = b.dataset.ml; tabMsg(el, f, r); }; });
    var ta = el.querySelector('#msgText');
    ta.oninput = function () {
      app.msgDraft[dk] = ta.value;
      el.querySelector('#waPrev').innerHTML = UI.waBubble(ta.value, { to: nameOf(f), phone: C.phoneDisplay(f.applicant.phone), time: nowHM() });
      el.querySelector('#waOpen').href = C.waLink(f.applicant.phone, ta.value);
    };
    el.querySelector('#waOpen').addEventListener('click', function () { S.A.msgOpen(f.id, me(), ml); setTimeout(function () { if (app.route === 'file' && app.tab === 'msg') tabMsg(el, S.file(f.id), r); }, 60); });
    el.querySelector('#msgCopy').onclick = function () { UI.copyText(ta.value).then(function () { UI.toast(t('a_copied')); }); };
    el.querySelector('#msgSent').onclick = function () { S.A.msgSent(f.id, me(), ml); UI.toast(t('ev_msg_sent')); tabMsg(el, S.file(f.id), r); };
  }

  /* -- decision tab -- */
  var QUICK = { approve: ['r_ok_complete', 'r_ok_cleared'], reject: ['r_rej_dti', 'r_rej_docs'], docs: ['r_docs_missing', 'r_docs_expired'], escalate: ['r_esc_cash', 'r_esc_list', 'r_esc_dup'] };
  var DEC = [['approve', 'check', 'ok'], ['reject', 'x', 'bad'], ['docs', 'note', 'accent'], ['escalate', 'shield', 'pur']];
  function history(f) {
    var items = f.decisions.map(function (d) { return { at: d.at, html: '<b>' + t(d.comp ? 'ev_comp_reject' : 'ev_decision_' + d.type) + '</b> – ' + C.staffName(d.by) + ' · ' + C.fmtStamp(d.at) + '<div class="muted" dir="auto">' + UI.esc(txt(d.reason)) + '</div>' }; });
    if (f.compliance && f.compliance.op !== 'reject') items.push({ at: f.compliance.at, html: '<b>' + t('ev_comp_' + f.compliance.op) + '</b> – ' + C.staffName(f.compliance.by) + ' · ' + C.fmtStamp(f.compliance.at) + '<div class="muted" dir="auto">' + UI.esc(txt(f.compliance.note)) + '</div>' });
    if (!items.length) return '';
    items.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    return '<section class="card"><div class="card-title">' + UI.icon('list') + t('dec_history') + '</div><div class="hist">' + items.map(function (i) { return '<div class="hist-i">' + i.html + '</div>'; }).join('') + '</div></section>';
  }
  function tabDecision(el, f, r) {
    var o = S.openFlags(f), highOpen = o.filter(function (x) { return x.sev === 'high'; }).length;
    var last = f.decisions[f.decisions.length - 1];
    var h = '';
    if (f.status === 'approved' || f.status === 'rejected') {
      var ok = f.status === 'approved';
      h += '<section class="card dec-record ' + (ok ? 'ok' : 'bad') + '" id="decRecord"><div class="dr-ico">' + UI.icon(ok ? 'check' : 'x') + '</div><div class="grow">' +
        '<small>' + t('dec_recorded') + '</small><h3>' + t(last && last.comp ? 'ev_comp_reject' : 'ev_decision_' + (last ? last.type : ok ? 'approve' : 'reject')) + '</h3>' +
        '<div class="dr-who">' + (last ? staffAvatar(last.by) + '<span>' + t('dec_by', { name: C.staffName(last.by), time: C.fmtStamp(last.at) }) + '</span>' : '') + '</div>' +
        '<div class="dr-reason" dir="auto"><b>' + t('reason_label') + ':</b> ' + UI.esc(last ? txt(last.reason) : '') + '</div>' +
        '<div class="dr-auto">' + UI.icon('cpu') + '<span>' + t('dec_no_auto') + ': <b>' + t('no') + '</b></span></div></div></section>' +
        (!isComp() ? '<button class="btn btn-ghost btn-block" id="reopenBtn" style="margin-top:10px">' + UI.icon('refresh') + '<span>' + t('dec_reopen') + '</span></button>' : '');
    } else if (f.status === 'compliance' && isComp()) {
      h += compPanel(f);
    } else if (f.status === 'compliance') {
      var esc = f.decisions.filter(function (d) { return d.type === 'escalate'; }).pop();
      h += '<section class="card"><div class="dec-banner pur">' + UI.icon('shield') + '<span>' + t('dec_waiting_comp') + '</span></div>' +
        (esc ? '<div class="bk-note" style="margin-top:10px">' + UI.icon('note') + '<span dir="auto"><b>' + t('cv_escalated_by', { name: C.staffName(esc.by), time: C.fmtStamp(esc.at) }) + '</b><br>' + UI.esc(txt(esc.reason)) + '</span></div>' : '') +
        '<button class="btn btn-primary btn-block" id="toComp" style="margin-top:12px">' + UI.icon('users') + '<span>' + t('comp_switch') + '</span></button></section>';
    } else if (isComp()) {
      h += '<section class="card"><div class="dec-banner">' + UI.icon('info') + '<span>' + t('dec_credit_only') + '</span></div></section>';
    } else {
      if (f.compliance) h += '<div class="bk-note comp-back">' + UI.icon('shield') + '<span dir="auto"><b>' + t('comp_given', { op: t('comp_' + f.compliance.op) }) + '</b> – ' + C.staffName(f.compliance.by) + ' · ' + C.fmtStamp(f.compliance.at) + '<br>' + UI.esc(txt(f.compliance.note)) + '</span></div>';
      h += '<section class="card dec-panel" id="decPanel"><div class="card-title">' + UI.icon('scale') + t('dec_title') + '</div>' +
        '<div class="dec-banner">' + UI.icon('shield') + '<span>' + t('dec_banner') + '</span></div>' +
        '<div class="dec-grid">' + DEC.map(function (d) {
          return '<button type="button" class="dec-opt ' + d[2] + (app.dec.type === d[0] ? ' on' : '') + '" data-type="' + d[0] + '">' + UI.icon(d[1]) + '<b>' + t('dec_' + d[0]) + '</b><small>' + t('dec_' + d[0] + '_d') + '</small></button>';
        }).join('') + '</div>' +
        (highOpen ? '<div class="warn-box">' + UI.icon('alert') + '<span>' + t('dec_open_high', { n: highOpen }) + '</span></div>' : '') +
        '<div id="quick" class="quick">' + quickHtml() + '</div>' +
        '<label class="field"><span class="label">' + t('dec_reason') + '</span><textarea class="textarea" id="decReason" placeholder="' + t('dec_reason_ph') + '">' + UI.esc(app.dec.reason) + '</textarea></label>' +
        '<label class="check" style="margin-top:10px"><input type="checkbox" id="decAck"' + (app.dec.ack ? ' checked' : '') + '><span>' + t('dec_ack') + '</span></label>' +
        '<div class="err-msg hidden" id="decErr"></div>' +
        '<button class="btn btn-primary btn-block" id="decSubmit" style="margin-top:12px">' + staffAvatar(me()) + '<span>' + t('dec_submit', { name: C.staffName(me()) }) + '</span></button></section>';
    }
    h += history(f);
    el.innerHTML = h;
    var rb = el.querySelector('#reopenBtn'); if (rb) rb.onclick = function () { S.A.reopen(f.id, me()); render(); };
    var tc = el.querySelector('#toComp'); if (tc) tc.onclick = function () { switchTo('ghalia'); };
    if (el.querySelector('#compPanel')) bindComp(el, f);
    var p = el.querySelector('#decPanel'); if (!p) return;
    function bindQuick() { p.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { var ta = p.querySelector('#decReason'); ta.value = (ta.value.trim() ? ta.value.trim() + ' – ' : '') + t(b.dataset.q); app.dec.reason = ta.value; }; }); }
    p.querySelectorAll('.dec-opt').forEach(function (b) { b.onclick = function () { app.dec.type = b.dataset.type; p.querySelectorAll('.dec-opt').forEach(function (x) { x.classList.toggle('on', x === b); }); p.querySelector('#quick').innerHTML = quickHtml(); bindQuick(); }; });
    bindQuick();
    p.querySelector('#decReason').oninput = function () { app.dec.reason = this.value; };
    p.querySelector('#decAck').onchange = function () { app.dec.ack = this.checked; };
    p.querySelector('#decSubmit').onclick = function () {
      var err = p.querySelector('#decErr'), reason = p.querySelector('#decReason').value.trim();
      function fail(k) { err.textContent = t(k); err.classList.remove('hidden'); }
      if (!app.dec.type) return fail('dec_err_type');
      if (reason.length < 8) return fail('dec_err_reason');
      if (!p.querySelector('#decAck').checked) return fail('dec_err_ack');
      var type = app.dec.type;
      S.A.decide(f.id, me(), type, reason);
      app.dec = { type: null, reason: '', ack: false };
      UI.toast(t('toast_decided'));
      if (type === 'docs') go('msg'); else render();
    };
  }
  function quickHtml() {
    if (!app.dec.type) return '';
    return '<span class="small muted">' + t('dec_quick') + ':</span>' + QUICK[app.dec.type].map(function (k) { return '<button type="button" class="fchip sm" data-q="' + k + '">' + t(k) + '</button>'; }).join('');
  }
  function compPanel(f) {
    var esc = f.decisions.filter(function (d) { return d.type === 'escalate'; }).pop();
    return '<section class="card dec-panel" id="compPanel"><div class="card-title">' + UI.icon('shield') + t('comp_title') + '</div>' +
      '<div class="dec-banner pur">' + UI.icon('shield') + '<span>' + t('comp_banner') + '</span></div>' +
      (esc ? '<div class="bk-note" style="margin-top:10px">' + UI.icon('note') + '<span dir="auto"><b>' + t('escalation_reason') + ' – ' + t('cv_escalated_by', { name: C.staffName(esc.by), time: C.fmtStamp(esc.at) }) + '</b><br>' + UI.esc(txt(esc.reason)) + '</span></div>' : '') +
      '<div class="dec-grid three">' + [['ok', 'check', 'ok'], ['edd', 'eye', 'accent'], ['reject', 'x', 'bad']].map(function (d) {
        return '<button type="button" class="dec-opt ' + d[2] + '" data-op="' + d[0] + '">' + UI.icon(d[1]) + '<b>' + t('comp_' + d[0]) + '</b><small>' + t('comp_' + d[0] + '_d') + '</small></button>';
      }).join('') + '</div>' +
      '<label class="field" style="margin-top:12px"><span class="label">' + t('comp_note') + '</span><textarea class="textarea" id="compNote" placeholder="' + t('comp_note_ph') + '"></textarea></label>' +
      '<div class="err-msg hidden" id="compErr"></div>' +
      '<button class="btn btn-primary btn-block" id="compSubmit" style="margin-top:12px">' + staffAvatar(me()) + '<span>' + t('comp_submit', { name: C.staffName(me()) }) + '</span></button></section>';
  }
  function bindComp(el, f) {
    var p = el.querySelector('#compPanel'), op = null;
    p.querySelectorAll('[data-op]').forEach(function (b) { b.onclick = function () { op = b.dataset.op; p.querySelectorAll('[data-op]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    p.querySelector('#compSubmit').onclick = function () {
      var err = p.querySelector('#compErr'), note = p.querySelector('#compNote').value.trim();
      if (!op) { err.textContent = t('dec_err_type'); err.classList.remove('hidden'); return; }
      if (note.length < 8) { err.textContent = t('dec_err_reason'); err.classList.remove('hidden'); return; }
      S.A.compliance(f.id, me(), op, note); UI.toast(t('ev_comp_' + op)); render();
    };
  }

  /* ---------------- compliance view ---------------- */
  function viewCompliance(v) {
    var files = S.files(), esc = files.filter(function (f) { return f.status === 'compliance'; });
    var openAml = 0, reviewed = 0;
    files.forEach(function (f) { reviewed += Object.keys(f.reviews || {}).length; });
    esc.forEach(function (f) { openAml += S.openFlags(f).filter(function (fl) { return C.AML_CODES.indexOf(fl.code) >= 0; }).length; });
    var other = files.filter(function (f) { return ['new', 'review', 'incomplete'].indexOf(f.status) >= 0 && S.openFlags(f).some(function (fl) { return fl.sev === 'high'; }); });
    var done = S.state.log.filter(function (e) { return /^comp_|^flag_(confirm|clear)/.test(e.action); }).slice(-6).reverse();
    v.innerHTML =
      '<div class="page-head"><div><h2>' + t('cv_title') + '</h2><p>' + t('cv_sub') + '</p></div></div>' +
      (!isComp() ? '<div class="card role-hint"><div class="row" style="gap:10px;flex-wrap:wrap">' + UI.icon('info') + '<span class="grow">' + t('cv_role_hint') + '</span><button class="btn btn-primary btn-sm" id="toComp">' + staffAvatar('ghalia') + '<span>' + t('comp_switch') + '</span></button></div></div>' : '') +
      '<div class="kpis three">' +
        '<div class="card kpi hl"><div class="k-l">' + UI.icon('shield') + t('cv_escalated') + '</div><div class="k-v">' + esc.length + '</div></div>' +
        '<div class="card kpi"><div class="k-l">' + UI.icon('alert') + t('cv_open_flags') + '</div><div class="k-v">' + openAml + '</div></div>' +
        '<div class="card kpi"><div class="k-l">' + UI.icon('check') + t('cv_reviewed') + '</div><div class="k-v">' + reviewed + '</div></div></div>' +
      '<div class="section-label">' + t('cv_queue') + '</div>' +
      (esc.length ? esc.map(compCard).join('') : '<div class="card empty">' + UI.icon('check') + '<div>' + t('cv_empty') + '</div></div>') +
      (other.length ? '<div class="section-label">' + t('cv_other') + '</div><div class="card" style="padding:4px 0">' + other.map(function (f) {
        var hi = S.openFlags(f).filter(function (fl) { return fl.sev === 'high'; });
        return '<a class="more-item" href="#/file/' + f.id + '">' + avatarFor(f) + '<span class="grow"><b dir="auto">' + UI.esc(nameOf(f)) + '</b><small>' + f.id + ' · ' + hi.map(function (fl) { return C.flagTitle(fl.code); }).join(' · ') + '</small></span>' + statusChip(f.status) + '</a>';
      }).join('') + '</div>' : '') +
      (done.length ? '<div class="section-label">' + t('cv_done') + '</div><div class="card log">' + done.map(logItem).join('') + '</div>' : '');
    var tc = v.querySelector('#toComp'); if (tc) tc.onclick = function () { switchTo('ghalia'); };
    v.querySelectorAll('.comp-card').forEach(function (card) { bindFlags(card); });
  }
  function compCard(f) {
    var r = S.result(f), esc = f.decisions.filter(function (d) { return d.type === 'escalate'; }).pop();
    var aml = r.flags.filter(function (fl) { return C.AML_CODES.indexOf(fl.code) >= 0; });
    return '<article class="card comp-card" data-file="' + f.id + '"><div class="fc-top">' + avatarFor(f, 'lg') + '<div class="grow"><div class="fc-name" dir="auto">' + UI.esc(nameOf(f)) + '</div><div class="fc-meta"><span class="ltr num">' + f.id + '</span><span>·</span><span>' + t('type_' + f.type) + '</span>' + (f.type === 'loan' ? '<span>·</span><b class="num">' + C.money(f.request.amount) + '</b>' : '') + '</div></div>' + statusChip(f.status) + '</div>' +
      (esc ? '<div class="bk-note">' + UI.icon('note') + '<span dir="auto"><b>' + t('cv_escalated_by', { name: C.staffName(esc.by), time: C.fmtStamp(esc.at) }) + '</b><br>' + UI.esc(txt(esc.reason)) + '</span></div>' : '') +
      '<div class="section-label sm">' + t('cv_aml') + '</div>' +
      '<div class="flags compact">' + aml.map(function (fl) { return flagCard(f, fl); }).join('') + '</div>' +
      '<div class="bk-actions"><a class="btn btn-ghost" href="#/file/' + f.id + '/checks">' + UI.icon('eye') + '<span>' + t('cv_open_file') + '</span></a><a class="btn btn-primary" href="#/file/' + f.id + '/decision">' + UI.icon('scale') + '<span>' + t('cv_give_opinion') + '</span></a></div></article>';
  }

  /* ---------------- new file / live simulation ---------------- */
  var PRESETS = {
    clean: { type: 'loan', source: 'whatsapp', lat: 'Amna Mint El Hacen', name: 'آمنة منت الحسن', name2: 'آمنة منت الحسن', nni: '0000000150', phone: '00000050', dob: '1991-02-11', expiry: C.D(1500), employer: 'صيدلية المثال (وهمية)', hire: '2015-03-01', income: 28000, debt: 0, amount: 100000, term: 18, cash: '', stmtDate: C.D(-1), docs: { id: 1, income: 1, statement: 1, application: 1, guarantor: 0 } },
    expired: { type: 'loan', source: 'branch', lat: 'Mohamed El Amine Ould Ely', name: 'محمد الأمين ولد اعل', name2: 'محمد الأمين ولد اعل', nni: '0000000151', phone: '00000051', dob: '1980-08-08', expiry: C.D(-120), employer: 'تجارة الخضروات', hire: '2008-01-01', income: 20000, debt: 3000, amount: 300000, term: 24, cash: '', stmtDate: C.D(-2), docs: { id: 1, income: 1, statement: 1, application: 1, guarantor: 1 } },
    dates: { type: 'loan', source: 'email', lat: 'El Hacen Ould Mohamed', name: 'الحسن ولد محمد', name2: 'الحسين ولد محمد', nni: '0000000152', phone: '00000052', dob: '1998-01-20', expiry: C.D(2200), employer: 'ورشة المثال للنجارة (وهمية)', hire: '2010-06-01', income: 24000, debt: 0, amount: 80000, term: 12, cash: '', stmtDate: C.D(6), docs: { id: 1, income: 1, statement: 1, application: 1, guarantor: 0 } },
    cash: { type: 'loan', source: 'branch', lat: 'Yacoub Ould El Wahm', name: 'يعقوب ولد الوهم', name2: 'يعقوب ولد الوهم', nni: '0000000153', phone: '00000039', dob: '1980-06-06', expiry: C.D(1800), employer: 'تجارة مواد البناء', hire: '2006-01-01', income: 30000, debt: 0, amount: 120000, term: 12, cash: '280000, 285000, 295000', stmtDate: C.D(-1), docs: { id: 1, income: 1, statement: 1, application: 1, guarantor: 0 } }
  };
  var TR = { 'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'ch', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'g', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'ة': 'a', 'و': 'ou', 'ي': 'i', 'ى': 'a', 'ئ': 'i', 'ؤ': 'ou', 'ء': '' };
  function translit(s) {
    if (!/[\u0600-\u06FF]/.test(s)) return s;
    return s.split(/\s+/).map(function (w) {
      if (w === 'ولد') return 'Ould'; if (w === 'منت') return 'Mint';
      var o = w.replace(/^ال/, 'el-').split('').map(function (c) { return TR[c] != null ? TR[c] : /[\u064B-\u065F]/.test(c) ? '' : c; }).join('');
      return o.charAt(0).toUpperCase() + o.slice(1);
    }).join(' ');
  }
  function latOf(name) { var k = Object.keys(PRESETS).find(function (x) { return PRESETS[x].name === name; }); return k ? PRESETS[k].lat : translit(name); }
  function simFile(fm) {
    var loan = fm.type === 'loan', lat = latOf(fm.name);
    var ADDR = { ar: 'حي المثال، زنقة 00، نواكشوط (عنوان وهمي)', fr: 'Quartier Al Mithal, rue 00, Nouakchott (adresse fictive)' };
    var f = {
      id: 'TDQ-SIM', type: fm.type, source: fm.source, status: 'new', receivedAt: new Date().toISOString(), lang: lang() === 'fr' ? 'fr' : 'ar', assigned: null,
      applicant: { ar: fm.name, lat: lat, gender: /منت|mint/i.test(fm.name) ? 'F' : 'M', nni: fm.nni, dob: fm.dob, phone: fm.phone, address: ADDR, job: { ar: fm.employer, fr: fm.employer }, employer: null, income: +fm.income || 0, otherDebt: +fm.debt || 0 },
      request: loan ? { amount: +fm.amount || 0, term: +fm.term || 12, purpose: { ar: 'غرض تجريبي (محاكاة)', fr: 'Objet de test (simulation)' } } : { product: { ar: 'حساب ادخار', fr: 'Compte épargne' }, expected: +fm.income || 0 },
      docs: {}, reviews: {}, decisions: []
    };
    var POB = { ar: 'نواكشوط', fr: 'Nouakchott' };
    if (fm.docs.id) f.docs.id = { nameAr: fm.name, nameLat: lat, nni: fm.nni, dob: fm.dob, pob: POB, sex: f.applicant.gender, issue: C.addYears(fm.expiry || C.D(1000), -10), expiry: fm.expiry || C.D(1000) };
    if (fm.docs.income) f.docs.incomeCert = { nameAr: fm.name2 || fm.name, activity: { ar: fm.employer, fr: fm.employer }, since: fm.hire, net: +fm.income || 0, date: C.D(-5), issuer: { ar: 'جهة إصدار وهمية', fr: 'Émetteur fictif' } };
    if (fm.docs.statement && loan) {
      var tx = [], cash = String(fm.cash || '').split(/[,،;\s]+/).map(function (x) { return +x; }).filter(function (x) { return x > 0; });
      [-80, -50, -20].forEach(function (d) { tx.push({ d: C.D(d), ar: 'تحويل وارد', fr: 'Transfert reçu', amt: Math.round((+fm.income || 10000) * 0.9), cash: false }); tx.push({ d: C.D(d + 5), ar: 'سحب لدى وكيل', fr: 'Retrait agent', amt: -Math.round((+fm.income || 10000) * 0.4), cash: false }); });
      cash.forEach(function (a, i) { tx.push({ d: C.D(-12 + i * 3), ar: 'إيداع نقدي في الوكالة', fr: 'Versement espèces agence', amt: a, cash: true }); });
      tx.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      f.docs.statement = { nameLat: lat, account: 'WLT-SIM', provider: { ar: 'محفظة المثال الرقمية (وهمية)', fr: 'Portefeuille Al Mithal (fictif)' }, from: C.D(-90), to: C.D(-2), issuedOn: fm.stmtDate || C.D(-1), opening: 8000, tx: tx };
    }
    if (fm.docs.application) f.docs.application = loan ? { nameAr: fm.name, nni: fm.nni, phone: fm.phone, amount: +fm.amount || 0, term: +fm.term || 12, purpose: f.request.purpose, date: C.D(0) } : { nameAr: fm.name, nni: fm.nni, phone: fm.phone, product: f.request.product, expected: +fm.income || 0, date: C.D(0) };
    if (fm.docs.guarantor && loan) f.docs.guarantor = { nameAr: 'كفيل تجريبي (وهمي)', nni: '0000000999', phone: '00000099', relation: { ar: 'قريب', fr: 'Parent' }, job: { ar: 'موظف', fr: 'Employé' }, income: 30000, date: C.D(0) };
    return f;
  }
  function viewNew(v) {
    if (!app.sim) app.sim = { fm: JSON.parse(JSON.stringify(PRESETS.clean)), ran: false, running: false, preset: null, token: 0 };
    var s = app.sim, fm = s.fm, loan = fm.type === 'loan';
    function inp(id, label, val, type, extra) { return '<label class="field"><span class="label">' + label + '</span><input class="input" id="s_' + id + '" type="' + (type || 'text') + '" value="' + UI.esc(val == null ? '' : val) + '"' + (extra || '') + '></label>'; }
    v.innerHTML =
      '<div class="page-head"><div><h2>' + t('new_title') + '</h2><p>' + t('new_sub') + '</p></div></div>' +
      '<div class="sim-layout"><div class="sim-left">' +
      '<section class="card"><div class="card-title">' + UI.icon('play') + t('preset_title') + '</div><div class="preset-grid">' +
        [['clean', 'check', 'ok'], ['expired', 'idcard', 'bad'], ['dates', 'calendar', 'warn'], ['cash', 'coins', 'pur']].map(function (p) {
          return '<button class="preset ' + p[2] + (s.preset === p[0] ? ' on' : '') + '" data-preset="' + p[0] + '">' + UI.icon(p[1]) + '<b>' + t('p_' + p[0]) + '</b><small>' + t('p_' + p[0] + '_d') + '</small></button>';
        }).join('') + '</div></section>' +
      '<section class="card sim-form" id="simForm"><div class="card-title">' + UI.icon('edit') + t('form_title') + '</div>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><div class="seg" id="typeSeg"><button type="button" data-ty="loan" class="' + (loan ? 'on' : '') + '">' + t('sim_loan') + '</button><button type="button" data-ty="account" class="' + (!loan ? 'on' : '') + '">' + t('sim_account') + '</button></div>' +
        '<select class="select sm" id="s_source" aria-label="' + t('f_source') + '">' + ['whatsapp', 'email', 'branch'].map(function (x) { return '<option value="' + x + '"' + (fm.source === x ? ' selected' : '') + '>' + t('src_' + x) + '</option>'; }).join('') + '</select></div>' +
        '<div class="fgrid2">' +
          inp('name', t('f_name'), fm.name, 'text', ' dir="auto" placeholder="' + t('f_name_ph') + '"') +
          '<label class="field"><span class="label">' + t('f_name2') + '</span><input class="input" id="s_name2" dir="auto" value="' + UI.esc(fm.name2) + '"><span class="tiny muted">' + t('f_name2_hint') + '</span></label>' +
          inp('nni', t('f_nni'), fm.nni, 'text', ' dir="ltr" inputmode="numeric" maxlength="10"') +
          inp('phone', t('f_phone') + ' (+222)', fm.phone, 'text', ' dir="ltr" inputmode="numeric" maxlength="8"') +
          inp('dob', t('f_dob'), fm.dob, 'date') + inp('expiry', t('f_expiry'), fm.expiry, 'date') +
          inp('employer', t('f_employer'), fm.employer, 'text', ' dir="auto"') + inp('hire', t('f_hire'), fm.hire, 'date') +
          inp('income', t('f_income'), fm.income, 'number', ' min="0" step="500"') + inp('debt', t('f_debt'), fm.debt, 'number', ' min="0" step="500"') +
          (loan ? inp('amount', t('f_amount'), fm.amount, 'number', ' min="0" step="5000"') + inp('term', t('f_term'), fm.term, 'number', ' min="3" max="60"') +
            inp('stmtDate', t('f_stmt_date'), fm.stmtDate, 'date') +
            '<label class="field span2"><span class="label">' + t('f_cash') + '</span><input class="input" id="s_cash" dir="ltr" placeholder="' + t('f_cash_ph') + '" value="' + UI.esc(fm.cash) + '"></label>' : '') +
        '</div>' +
        '<div class="label" style="margin-top:12px">' + t('f_docs') + '</div><div class="doc-toggles">' +
          ['id', 'income', 'statement', 'application', 'guarantor'].filter(function (k) { return loan || (k !== 'guarantor' && k !== 'statement'); }).map(function (k) {
            return '<label class="dtog"><input type="checkbox" data-doc="' + k + '"' + (fm.docs[k] ? ' checked' : '') + '>' + UI.icon(Docs.ICON[k]) + '<span>' + t('doc_' + k) + '</span></label>';
          }).join('') + '</div>' +
        '<div class="err-msg hidden" id="simErr">' + t('err_required') + '</div>' +
        '<button type="button" class="btn btn-accent btn-block" id="runBtn" style="margin-top:14px">' + UI.icon('play') + '<span>' + t(s.ran ? 'rerun' : 'run_checks') + '</span></button>' +
      '</section></div>' +
      '<div class="sim-right"><section class="card sim-proc" id="simProc"><div class="card-title">' + UI.icon('cpu') + t('sim_steps') + '</div><ol class="steps" id="steps"></ol><div class="sim-docs" id="simDocs"></div></section>' +
      '<section class="card hidden" id="simRes"></section></div></div>';

    v.querySelectorAll('[data-preset]').forEach(function (b) { b.onclick = function () { s.fm = JSON.parse(JSON.stringify(PRESETS[b.dataset.preset])); s.preset = b.dataset.preset; s.ran = false; s.token++; render(); runSim(true); }; });
    v.querySelectorAll('[data-ty]').forEach(function (b) { b.onclick = function () { readForm(); s.fm.type = b.dataset.ty; render(); if (s.ran) liveUpdate(); }; });
    var form = v.querySelector('#simForm'), deb;
    form.addEventListener('input', function () { readForm(); s.preset = null; v.querySelectorAll('.preset').forEach(function (p) { p.classList.remove('on'); }); if (s.ran && !s.running) { clearTimeout(deb); deb = setTimeout(liveUpdate, 200); } });
    form.addEventListener('change', function () { readForm(); if (s.ran && !s.running) liveUpdate(); });
    v.querySelector('#runBtn').onclick = function () { readForm(); runSim(true); };
    drawSteps(s.ran ? 5 : -1);
    if (s.ran) liveUpdate(true);
  }
  function readForm() {
    var fm = app.sim.fm;
    ['name', 'name2', 'nni', 'phone', 'dob', 'expiry', 'employer', 'hire', 'income', 'debt', 'amount', 'term', 'stmtDate', 'cash', 'source'].forEach(function (k) { var e = document.getElementById('s_' + k); if (e) fm[k] = e.value.trim(); });
    document.querySelectorAll('.doc-toggles [data-doc]').forEach(function (c) { fm.docs[c.dataset.doc] = c.checked ? 1 : 0; });
  }
  var STEP_KEYS = ['read', 'extract', 'check', 'draft', 'human'];
  function simRun() { var f = simFile(app.sim.fm); return { f: f, r: C.run(f, S.files(), S.settings()) }; }
  function drawSteps(done, active) {
    var el = document.getElementById('steps'); if (!el) return;
    var x = simRun(), f = x.f, r = x.r;
    var vars = { read: { n: C.docCount(f) }, extract: { n: r.fields.length }, check: { n: r.checksRun } };
    el.innerHTML = STEP_KEYS.map(function (k, i) {
      var st = i < done ? 'done' : i === active ? 'active' : '';
      if (k === 'human' && done >= 5) st = 'wait';
      return '<li class="step ' + st + '" data-step="' + k + '"><span class="st-ico">' + (st === 'done' ? UI.icon('check') : st === 'active' ? '<i class="spin"></i>' : st === 'wait' ? UI.icon('user') : (i + 1)) + '</span><div class="grow"><b>' + t('s_' + k) + '</b><small>' + t('s_' + k + '_d', vars[k]) + '</small>' + (k === 'check' && (i < done || i === active) ? '<ul class="ck-live" id="ckLive"></ul>' : '') + '</div></li>';
    }).join('');
  }
  function simValid(fm) { return fm.name && fm.name.length >= 3 && /^\d{10}$/.test(fm.nni) && fm.dob && (+fm.income > 0); }
  function fillCk(r, pop) { var ul = document.getElementById('ckLive'); if (ul) ul.innerHTML = C.CHECKS.map(function (c) { return ckLi(r, c, pop); }).join(''); }
  function runSim(animate) {
    var s = app.sim; readForm();
    var err = document.getElementById('simErr');
    if (!simValid(s.fm)) { if (err) err.classList.remove('hidden'); return; }
    if (err) err.classList.add('hidden');
    var tok = ++s.token; s.running = true; s.ran = false;
    var btn = document.getElementById('runBtn'); if (btn) { btn.disabled = true; btn.querySelector('span').textContent = t('running'); }
    var res = document.getElementById('simRes'); if (res) res.classList.add('hidden');
    var x = simRun(), f = x.f, r = x.r;
    var docsEl = document.getElementById('simDocs');
    if (docsEl) { docsEl.className = 'sim-docs'; docsEl.innerHTML = Object.keys(f.docs).map(function (k) { return '<div class="sd"><div class="sd-paper"><i></i><i></i><i></i><i></i><span class="scanline"></span></div><small>' + t('doc_' + k) + '</small></div>'; }).join(''); }
    var W = animate ? 1 : 0, seq = [], shown = 0;
    seq.push([0, function () { drawSteps(0, 0); if (docsEl) docsEl.classList.add('scanning'); scrollProc(); }]);
    seq.push([1300 * W, function () { drawSteps(1, 1); if (docsEl) { docsEl.classList.remove('scanning'); docsEl.classList.add('read'); } }]);
    seq.push([1100 * W, function () { drawSteps(2, 2); }]);
    C.CHECKS.forEach(function (c) {
      seq.push([300 * W, function () { var ul = document.getElementById('ckLive'); if (!ul) return; shown++; ul.insertAdjacentHTML('beforeend', ckLi(r, c, true)); }]);
    });
    seq.push([600 * W, function () { drawSteps(3, 3); fillCk(r); }]);
    seq.push([1000 * W, function () { drawSteps(5); fillCk(r); s.running = false; s.ran = true; s.sig = JSON.stringify(s.fm); var b = document.getElementById('runBtn'); if (b) { b.disabled = false; b.querySelector('span').textContent = t('rerun'); } showResult(true); }]);
    var acc = 0;
    seq.forEach(function (x) { acc += x[0]; setTimeout(function () { if (tok !== s.token || app.route !== 'new') return; x[1](); }, acc); });
  }
  function scrollProc() { if (window.innerWidth < 960) { var p = document.getElementById('simProc'); if (p) window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - 40, behavior: 'smooth' }); } }
  function liveUpdate(force) { var sig = JSON.stringify(app.sim.fm); if (!simValid(app.sim.fm) || (!force && sig === app.sim.sig && document.getElementById('simAdd'))) return; app.sim.sig = sig; drawSteps(5); fillCk(simRun().r); showResult(false, true); }
  function showResult(scroll, flash) {
    var el = document.getElementById('simRes'); if (!el) return;
    var r = simRun().r;
    el.classList.remove('hidden');
    el.innerHTML = '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px"><div class="card-title" style="margin:0">' + UI.icon('flag') + t('sim_result') + '</div><span class="chip gray live-dot">' + t('sim_live') + '</span></div>' +
      (r.flags.length ? '<ul class="res-list">' + r.flags.map(function (fl) { var x = C.flagText(fl); return '<li class="res sev-' + fl.sev + '">' + sevChip(fl.sev) + '<div><b>' + UI.esc(x.title) + '</b><small dir="auto">' + UI.esc(x.evidence[0]) + '</small></div></li>'; }).join('') + '</ul>' : '<div class="empty" style="padding:18px">' + UI.icon('check') + '<div>' + t('sim_none') + '</div></div>') +
      '<div class="await-box">' + UI.icon('user') + '<div><b>' + t('s_human') + '</b><small>' + t('s_human_d') + '</small></div></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="simAdd">' + UI.icon('inbox') + '<span>' + t('sim_add') + '</span></button>';
    if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    el.querySelector('#simAdd').onclick = function () {
      var nf = simFile(app.sim.fm);
      S.A.addFile(nf, me()); UI.toast(t('sim_added', { id: '\u2066' + nf.id + '\u2069' }));
      app.sim = null; location.hash = '#/file/' + nf.id + '/checks';
    };
    if (scroll && window.innerWidth < 960) setTimeout(function () { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' }); }, 150);
  }

  /* ---------------- audit ---------------- */
  var LOG_IC = { received: ['inbox', 'c-sys'], extracted: ['scan', 'c-sys'], checked: ['cpu', 'c-sys'], drafted: ['note', 'c-sys'], review_start: ['eye', 'c-info'], decision_approve: ['check', 'c-ok'], decision_reject: ['x', 'c-bad'], decision_docs: ['note', 'c-acc'], decision_escalate: ['shield', 'c-pur'],
    flag_confirm: ['alert', 'c-bad'], flag_clear: ['ban', 'c-ok'], flag_reopen: ['refresh', 'c-info'], memo_edit: ['edit', 'c-info'], msg_open: ['wa', 'c-wa'], msg_sent: ['send', 'c-wa'], comp_ok: ['check', 'c-pur'], comp_edd: ['eye', 'c-pur'], comp_reject: ['x', 'c-pur'], reopen: ['refresh', 'c-info'], role: ['users', 'c-sys'], reset: ['refresh', 'c-sys'], settings: ['settings', 'c-sys'], sim: ['plus', 'c-info'] };
  function evLabel(a, l) { return t('ev_' + a, null, l); }
  function detailText(e, l) {
    var d = e.d; if (!d) return '';
    if (typeof d === 'string') return d;
    if (d.k) { var s = d.k.indexOf('fx_') === 0 ? C.flagTitle(d.k.slice(3), l) : t(d.k, d.v, l); return s + (d.note ? ' – «' + d.note + '»' : ''); }
    return d[l || lang()] || d.ar || '';
  }
  function fileLabel(id, l) { var f = S.file(id); return f ? id + ' · ' + ((l || lang()) === 'fr' ? f.applicant.lat : f.applicant.ar) : (id || ''); }
  function catOf(a) { return /^decision_|^comp_|^reopen/.test(a) ? 'decision' : /^flag_/.test(a) ? 'flag' : /^msg_/.test(a) ? 'msg' : /^(received|extracted|checked|drafted)$/.test(a) ? 'system' : 'other'; }
  function logItem(e) {
    var ic = LOG_IC[e.action] || ['info', 'c-sys'], s = C.staff(e.by);
    return '<div class="log-item"><span class="log-ico ' + ic[1] + '">' + UI.icon(ic[0]) + '</span><div class="log-main"><b>' + evLabel(e.action) + '</b>' +
      (e.file ? '<div class="l2"><a href="#/file/' + e.file + '" dir="auto">' + UI.esc(fileLabel(e.file)) + '</a></div>' : '') +
      (e.d ? '<div class="l2 muted" dir="auto">' + UI.esc(detailText(e)) + '</div>' : '') +
      '<div class="l3"><span class="who"><i style="background:' + (s ? s.color : '#9AB') + '"></i>' + C.staffName(e.by) + '</span> · ' + C.roleLabel(e.by) + '</div></div><span class="log-when">' + C.fmtStamp(e.ts) + '</span></div>';
  }
  function filteredLog() {
    var q = app.audit.q.trim().toLowerCase();
    return S.state.log.filter(function (e) {
      if (app.audit.f !== 'all' && catOf(e.action) !== app.audit.f) return false;
      if (app.audit.user && e.by !== app.audit.user) return false;
      if (q && (evLabel(e.action) + ' ' + fileLabel(e.file, 'ar') + ' ' + fileLabel(e.file, 'fr') + ' ' + C.staffName(e.by) + ' ' + detailText(e)).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).slice().reverse();
  }
  function viewAudit(v) {
    var log = S.state.log, human = log.filter(function (e) { return /^decision_|^comp_/.test(e.action); }).length, sys = log.filter(function (e) { return e.by === 'system'; }).length;
    var list = filteredLog(), groups = {}, order = [];
    list.forEach(function (e) { var dk = C.dateKey(new Date(e.ts)); if (!groups[dk]) { groups[dk] = []; order.push(dk); } groups[dk].push(e); });
    v.innerHTML =
      '<div class="page-head"><div><h2>' + t('audit_title') + '</h2><p>' + t('audit_sub') + '</p></div><button class="btn btn-primary btn-sm" id="csvBtn">' + UI.icon('download') + '<span>' + t('audit_export') + '</span></button></div>' +
      '<section class="card hitl-card"><div class="card-title">' + UI.icon('shield') + t('tagline') + '</div><p>' + t('audit_hitl') + '</p>' +
        '<div class="hitl-stats"><div><b>' + human + '</b><small>' + t('audit_human') + '</small></div><div><b>' + sys + '</b><small>' + t('audit_system') + '</small></div><div class="zero"><b>0</b><small>' + t('audit_auto') + '</small></div></div></section>' +
      '<div class="filters" style="margin-top:12px">' + ['all', 'decision', 'flag', 'msg', 'system', 'other'].map(function (k) { return '<button class="fchip' + (app.audit.f === k ? ' on' : '') + '" data-af="' + k + '">' + t('af_' + k) + '</button>'; }).join('') + '</div>' +
      '<div class="filter-row"><div class="search-box">' + UI.icon('search') + '<input class="input" id="aq" type="search" placeholder="' + t('search_ph') + '" value="' + UI.esc(app.audit.q) + '"></div>' +
        '<select class="select" id="auSel"><option value="">' + t('audit_all_users') + '</option><option value="system"' + (app.audit.user === 'system' ? ' selected' : '') + '>' + t('system') + '</option>' + C.STAFF.map(function (s) { return '<option value="' + s.id + '"' + (app.audit.user === s.id ? ' selected' : '') + '>' + s[lang()] + '</option>'; }).join('') + '</select></div>' +
      (order.length ? order.map(function (k) { return '<div class="log-day">' + (k === C.todayKey() ? t('today') : k === C.addDays(C.todayKey(), -1) ? t('yesterday') : C.fmtD(k)) + '</div><div class="card log">' + groups[k].map(logItem).join('') + '</div>'; }).join('') : '<div class="card empty">' + UI.icon('list') + '<div>' + t('audit_empty') + '</div></div>');
    v.querySelectorAll('[data-af]').forEach(function (b) { b.onclick = function () { app.audit.f = b.dataset.af; render(); }; });
    var aq = v.querySelector('#aq'); aq.oninput = function () { app.audit.q = aq.value; var p = aq.selectionStart; render(); var n = document.getElementById('aq'); n.focus(); try { n.setSelectionRange(p, p); } catch (e) {} };
    v.querySelector('#auSel').onchange = function () { app.audit.user = this.value; render(); };
    v.querySelector('#csvBtn').onclick = exportCsv;
  }
  function exportCsv() {
    var l = lang();
    var rows = [[t('csv_when'), t('csv_who'), t('csv_role'), t('csv_action'), t('csv_file'), t('csv_detail')]];
    filteredLog().slice().reverse().forEach(function (e) {
      var d = new Date(e.ts);
      rows.push([C.dateKey(d) + ' ' + C.pad(d.getHours()) + ':' + C.pad(d.getMinutes()) + ':' + C.pad(d.getSeconds()), C.staffName(e.by, l), C.roleLabel(e.by, l), evLabel(e.action, l), fileLabel(e.file, l), detailText(e, l)]);
    });
    var csv = '\uFEFF' + rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tadqiq-audit-' + C.todayKey() + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    UI.toast(t('exported'));
  }

  /* ---------------- reports ---------------- */
  function viewReports(v) {
    var weeks = [[26, 9, 6], [30, 8, 9], [27, 10, 7], [34, 9, 11]];
    var flagsT = [['DOCS', 58], ['DTI', 27], ['NAME', 16], ['ID', 14], ['DATE', 9], ['CASH', 8], ['DUP', 6], ['LIST', 4]];
    var officers = [['mariem', 71], ['mohamed', 64], ['ghalia', 19]];
    var max = Math.max.apply(null, weeks.map(function (w) { return w[0] + w[1] + w[2]; }));
    var fmax = flagsT[0][1];
    var files = S.files(), sc = {};
    files.forEach(function (f) { sc[f.status] = (sc[f.status] || 0) + 1; });
    var colors = { new: '#3D5BA9', review: '#B7791F', incomplete: '#E58B3A', compliance: '#6B4FA0', approved: '#15945F', rejected: '#C9403F' };
    var total = files.length, acc = 0, R = 42, CIRC = 2 * Math.PI * R;
    var segs = Object.keys(colors).filter(function (k) { return sc[k]; }).map(function (k) { var len = sc[k] / total * CIRC, s = '<circle r="' + R + '" cx="59" cy="59" fill="none" stroke="' + colors[k] + '" stroke-width="16" stroke-dasharray="' + len.toFixed(2) + ' ' + (CIRC - len).toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '" transform="rotate(-90 59 59)"/>'; acc += len; return s; }).join('');
    v.innerHTML =
      '<div class="page-head"><div><h2>' + t('rep_title') + ' <span class="demo-tag">' + t('rep_demo') + '</span></h2><p>' + t('rep_sub') + '</p></div></div>' +
      '<div class="kpis">' +
        '<div class="card kpi hl"><div class="k-l">' + UI.icon('inbox') + t('rep_processed') + '</div><div class="k-v">186</div><div class="k-s">' + t('rep_demo') + '</div></div>' +
        '<div class="card kpi"><div class="k-l">' + UI.icon('clock') + t('rep_avg') + '</div><div class="k-v">' + t('rep_min', { n: 14 }) + '</div><div class="k-s">' + t('rep_demo') + '</div></div>' +
        '<div class="card kpi"><div class="k-l">' + UI.icon('note') + t('rep_incomplete') + '</div><div class="k-v">31%</div><div class="k-s">' + t('rep_demo') + '</div></div>' +
        '<div class="card kpi"><div class="k-l">' + UI.icon('alert') + t('rep_flags') + '</div><div class="k-v">142</div><div class="k-s">' + t('rep_demo') + '</div></div></div>' +
      '<div class="rep-grid" style="margin-top:12px">' +
        '<section class="card"><div class="card-title">' + UI.icon('chart') + t('rep_per_week') + '<span class="demo-tag">' + t('rep_demo') + '</span></div><div class="bars">' + weeks.map(function (w, i) {
          var tot = w[0] + w[1] + w[2], hgt = Math.round(tot / max * 100);
          return '<div class="bar"><span class="bv">' + tot + '</span><div class="stackbar" style="height:' + hgt + '%"><i style="flex:' + w[0] + ';background:var(--ok)"></i><i style="flex:' + w[1] + ';background:var(--bad)"></i><i style="flex:' + w[2] + ';background:var(--brand-200)"></i></div><span class="bl">' + t('rep_week', { n: i + 1 }) + '</span></div>';
        }).join('') + '</div><div class="legend"><span><i style="background:var(--ok)"></i>' + t('rep_approved') + '</span><span><i style="background:var(--bad)"></i>' + t('rep_rejected') + '</span><span><i style="background:var(--brand-200)"></i>' + t('rep_other') + '</span></div></section>' +
        '<section class="card"><div class="card-title">' + UI.icon('flag') + t('rep_flags_type') + '<span class="demo-tag">' + t('rep_demo') + '</span></div>' + flagsT.map(function (x, i) {
          return '<div class="hbar wide' + (i === 0 ? ' top' : '') + '"><span class="hl">' + t('fk_' + x[0]) + '</span><span class="ht"><i style="width:' + Math.round(x[1] / fmax * 100) + '%"></i></span><span class="hv">' + x[1] + '</span></div>';
        }).join('') + '</section>' +
        '<section class="card"><div class="card-title">' + UI.icon('inbox') + t('rep_status') + '<span class="chip ok live-dot">' + t('kpi_live') + '</span></div><div class="donut-wrap"><svg class="donut" viewBox="0 0 118 118">' + segs + '<text x="59" y="60" text-anchor="middle" font-size="22" font-weight="800" fill="#073B4C">' + total + '</text><text x="59" y="76" text-anchor="middle" font-size="10" fill="#62777D">' + t('stat_files') + '</text></svg>' +
          '<div class="donut-legend">' + Object.keys(colors).map(function (k) { return '<div><i style="background:' + colors[k] + '"></i><span>' + t('st_' + k) + '</span><b>' + (sc[k] || 0) + '</b></div>'; }).join('') + '</div></div></section>' +
        '<section class="card"><div class="card-title">' + UI.icon('users') + t('rep_officer') + '<span class="demo-tag">' + t('rep_demo') + '</span></div>' + officers.map(function (x) {
          return '<div class="hbar wide"><span class="hl">' + C.staffName(x[0]) + '</span><span class="ht"><i style="width:' + Math.round(x[1] / 71 * 100) + '%;background:' + C.staff(x[0]).color + '"></i></span><span class="hv">' + x[1] + '</span></div>';
        }).join('') + '</section>' +
      '</div><p class="muted small rep-note">' + UI.icon('info') + '<span>' + t('rep_note') + '</span></p>';
  }

  /* ---------------- about ---------------- */
  function viewAbout(v) {
    var steps = [['inbox', 's1'], ['scan', 's2'], ['alert', 's3'], ['note', 's4'], ['usercheck', 's5']];
    v.innerHTML =
      '<section class="card about-hero"><div class="ah-brand">' + UI.LOGO + '<span>' + t('product') + '</span></div><h2>' + t('ab_hero') + '</h2><p>' + t('ab_hero_sub') + '</p><div class="tag-line">' + t('tagline') + '</div></section>' +
      '<div class="section-label">' + t('ab_how') + '</div>' +
      '<div class="how">' + steps.map(function (s, i) { return '<div class="how-step' + (i === 4 ? ' human' : '') + '"><span class="n">' + (i + 1) + '</span>' + UI.icon(s[0]) + '<b>' + t('ab_' + s[1]) + '</b><small>' + t('ab_' + s[1] + '_d') + '</small></div>'; }).join('') + '</div>' +
      '<div class="about-grid">' +
        '<section class="card"><div class="card-title">' + UI.icon('usercheck') + t('ab_hitl') + '</div><p>' + t('ab_hitl_d') + '</p></section>' +
        '<section class="card"><div class="card-title">' + UI.icon('lock') + t('ab_train') + '</div><p>' + t('ab_train_d') + '</p></section>' +
        '<section class="card span2"><div class="card-title">' + UI.icon('server') + t('ab_host') + '</div><p>' + t('ab_host_d') + '</p>' +
          '<div class="arch"><div class="arch-box in">' + UI.icon('wa') + '<b>' + t('ab_arch_in') + '</b><small>' + t('ab_arch_in_d') + '</small></div><div class="arch-arrow">' + UI.icon('chevron', 'fwd') + '</div>' +
            '<div class="arch-wall"><span class="wall-lab">' + UI.icon('lock') + t('ab_arch_wall') + '</span><div class="arch-row"><div class="arch-box srv">' + UI.icon('server') + '<b>' + t('ab_arch_srv') + '</b><small>' + t('ab_arch_srv_d') + '</small></div><div class="arch-arrow">' + UI.icon('chevron', 'fwd') + '</div>' +
            '<div class="arch-box staff">' + UI.icon('users') + '<b>' + t('ab_arch_staff') + '</b><small>' + t('ab_arch_staff_d') + '</small></div><div class="arch-arrow">' + UI.icon('chevron', 'fwd') + '</div>' +
            '<div class="arch-box core">' + UI.icon('database') + '<b>' + t('ab_arch_core') + '</b><small>' + t('ab_arch_core_d') + '</small></div></div></div></div></section>' +
        '<section class="card"><div class="card-title">' + UI.icon('shield') + t('ab_kyc') + '</div><p>' + t('ab_kyc_d') + '</p><div class="ctx"><b>' + t('ab_ctx_title') + '</b><p>' + t('ab_context') + '</p></div><div class="warn-box soft">' + UI.icon('info') + '<span>' + t('ab_disclaimer') + '</span></div></section>' +
        '<section class="card"><div class="card-title">' + UI.icon('sparkle') + t('ab_demo') + '</div><p>' + t('ab_demo_d') + '</p></section>' +
        '<section class="card saved span2"><div class="card-title">' + UI.icon('calendar') + t('ab_pilot') + '</div><p>' + t('ab_pilot_d') + '</p><p class="small" style="margin-top:8px"><b>' + t('ab_contact') + '</b><br>' + t('ab_founder') + '</p></section>' +
      '</div>';
  }

  /* ---------------- more ---------------- */
  function viewMore(v) {
    var s = S.settings();
    function sInp(id, label, val) { return '<label class="field"><span class="label">' + label + '</span><input class="input" type="number" id="set_' + id + '" value="' + val + '" dir="ltr"></label>'; }
    v.innerHTML =
      '<div class="page-head"><div><h2>' + t('more_title') + '</h2></div></div>' +
      '<section class="card" style="padding:4px 0">' +
        '<a class="more-item" href="#/reports"><span class="mi">' + UI.icon('chart') + '</span><span class="grow"><b>' + t('nav_reports') + '</b><small>' + t('more_reports_d') + '</small></span>' + UI.icon('chevron', 'chev') + '</a>' +
        '<a class="more-item" href="#/about"><span class="mi">' + UI.icon('help') + '</span><span class="grow"><b>' + t('nav_about') + '</b><small>' + t('more_about_d') + '</small></span>' + UI.icon('chevron', 'chev') + '</a>' +
        '<a class="more-item" href="share.html"><span class="mi">' + UI.icon('qr') + '</span><span class="grow"><b>' + t('more_share') + '</b><small>' + t('more_share_d') + '</small></span>' + UI.icon('chevron', 'chev') + '</a>' +
        '<button class="more-item" id="mRole"><span class="mi">' + staffAvatar(me()) + '</span><span class="grow"><b>' + t('more_role') + ': ' + C.staffName(me()) + '</b><small>' + C.roleLabel(me()) + ' · ' + t('switch_role') + '</small></span>' + UI.icon('chevron', 'chev') + '</button>' +
        '<button class="more-item" id="mLang"><span class="mi">' + UI.icon('globe') + '</span><span class="grow"><b>' + t('more_lang') + '</b><small>' + (lang() === 'ar' ? 'العربية ← Français' : 'Français → العربية') + '</small></span>' + UI.icon('chevron', 'chev') + '</button>' +
        '<button class="more-item danger" id="mReset"><span class="mi">' + UI.icon('refresh') + '</span><span class="grow"><b>' + t('more_reset') + '</b><small>' + t('more_reset_d') + '</small></span></button>' +
      '</section>' +
      '<section class="card" id="settingsCard"><div class="card-title">' + UI.icon('settings') + t('more_settings') + ' <span class="demo-tag">' + t('set_example') + '</span></div><p class="muted small" style="margin-bottom:10px">' + t('more_settings_d') + '</p>' +
        '<div class="fgrid2">' + sInp('dti', t('set_dti'), s.dti) + sInp('cash', t('set_cash'), s.cash) + sInp('struct', t('set_struct'), s.struct) + sInp('guar', t('set_guar'), s.guar) + sInp('margin', t('set_margin'), s.margin) + '</div>' +
        '<button class="btn btn-primary btn-block" id="setSave" style="margin-top:12px">' + UI.icon('refresh') + '<span>' + t('set_save') + '</span></button></section>';
    v.querySelector('#mRole').onclick = roleModal;
    v.querySelector('#mLang').onclick = function () { I18N.setLang(lang() === 'ar' ? 'fr' : 'ar'); render(); };
    v.querySelector('#mReset').onclick = function () {
      UI.modal({ title: t('more_reset'), body: '<p>' + t('reset_q') + '</p>', actions: [{ label: t('a_cancel') }, { label: t('more_reset'), cls: 'btn-bad-solid', icon: 'refresh', id: 'resetOk', onClick: function (close) { S.A.reset(); app.sim = null; app.msgDraft = {}; app.filter = 'all'; close(); UI.toast(t('reset_done')); if (location.hash !== '#/inbox') location.hash = '#/inbox'; else render(); } }] });
    };
    v.querySelector('#setSave').onclick = function () {
      var g = function (id) { return +document.getElementById('set_' + id).value; };
      var ns = { dti: g('dti') || 40, cash: g('cash') || 300000, struct: Math.min(99, g('struct') || 80), guar: g('guar') || 200000, margin: g('margin') >= 0 ? g('margin') : 12 };
      S.A.setSettings(me(), ns); UI.toast(t('set_saved')); render();
    };
  }

  parseHash();
  render();
  window.__app = app;
})();

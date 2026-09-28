/* AICore Mawʿid — demo receptionist dashboard (demo.html, fictional data)
 * Human-in-the-loop: the system drafts, a named staff member decides and sends.
 * DEMO: localStorage only, fictional data, no WhatsApp API — wa.me links only. */
(function () {
  'use strict';
  var S = Store, root = document.getElementById('root');
  var STAFF_KEY = 'mawid_staff';
  S.load();

  var app = { staff: localStorage.getItem(STAFF_KEY), route: 'requests', tab: 'pending', audit: { f: 'all', staff: '', q: '' }, flashId: null };

  function staffObj(id) { return S.STAFF.find(function (s) { return s.id === id; }); }
  function avatar(id, cls) { var s = staffObj(id); return '<span class="avatar ' + (cls || '') + '" style="background:' + (s ? s.color : '#8AA') + '">' + (s ? S.staffName(id).replace('د. ', '').replace('Dr ', '')[0] : '?') + '</span>'; }
  function nowHM() { var d = new Date(); return S.pad(d.getHours()) + ':' + S.pad(d.getMinutes()); }
  function T() { return S.todayKey(); }
  function reminderDay() { return S.nextOpenDay(T()); }
  function dayLabel(k) { if (k === T()) return t('today'); if (k === S.addDays(T(), 1)) return t('tomorrow'); return S.fmtDate(k); }

  /* ---------------- routing ---------------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/');
    var r = h[0] || 'requests';
    if (['requests', 'reminders', 'audit', 'reports', 'more'].indexOf(r) < 0) r = 'requests';
    app.route = r;
    if (r === 'requests' && ['pending', 'confirmed', 'refused', 'today'].indexOf(h[1]) >= 0) app.tab = h[1];
  }
  window.addEventListener('hashchange', function () { parseHash(); render(); window.scrollTo(0, 0); });

  /* ---------------- shell ---------------- */
  function render() {
    I18N.applyDir();
    UI.refreshBanner();
    document.title = t('product') + ' – ' + (app.staff ? t('nav_' + app.route) : t('login_title')) + ' (' + t('demoBanner') + ')';
    if (!app.staff || !staffObj(app.staff)) return renderLogin();
    var pendingN = S.all().filter(function (b) { return b.status === 'pending' || b.status === 'proposed'; }).length;
    var remN = remindersList().filter(function (b) { return !b.reminder; }).length;
    var navs = [
      ['requests', 'inbox', pendingN], ['reminders', 'bell', remN], ['audit', 'shield', 0], ['reports', 'chart', 0], ['more', 'menu', 0]
    ];
    function navHtml() {
      return navs.map(function (n) {
        return '<a class="nav-item' + (app.route === n[0] ? ' active' : '') + '" href="#/' + n[0] + '" data-nav="' + n[0] + '">' + UI.icon(n[1]) +
          '<span>' + t('nav_' + n[0]) + '</span>' + (n[2] ? '<span class="badge">' + n[2] + '</span>' : '') + '</a>';
      }).join('');
    }
    root.innerHTML =
      '<div class="app">' +
        '<header class="appbar"><div class="appbar-top">' +
          '<div class="brand">' + UI.LOGO + '<div class="grow"><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div></div>' +
          '<div class="appbar-actions">' +
            '<button class="pill-btn" id="langBtn" type="button">' + UI.icon('globe') + '<span>' + (I18N.lang === 'ar' ? 'FR' : 'ع') + '</span></button>' +
            '<button class="staff-chip" id="staffBtn" type="button" title="' + t('switch_user') + '">' + avatar(app.staff) + '<span>' + S.staffName(app.staff) + '</span></button>' +
          '</div></div>' +
          '<div class="clinic-line">' + UI.icon('tooth') + '<span>' + t('clinicName') + '</span></div>' +
        '</header>' +
        '<nav class="side-nav">' + navHtml() + '<div class="side-foot"><b>' + t('tagline') + '</b><br>' + t('footer') + '</div></nav>' +
        '<main class="container" id="view"></main>' +
        '<nav class="bottom-nav">' + navHtml() + '</nav>' +
      '</div>';
    document.getElementById('langBtn').onclick = function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); };
    document.getElementById('staffBtn').onclick = function () { localStorage.removeItem(STAFF_KEY); app.staff = null; render(); };
    var v = document.getElementById('view');
    ({ requests: viewRequests, reminders: viewReminders, audit: viewAudit, reports: viewReports, more: viewMore })[app.route](v);
    v.insertAdjacentHTML('beforeend', '<footer class="footer"><div class="tagline">' + t('tagline') + '</div><div><b>AICore موعد</b> · ' + t('footer') + '</div></footer>');
    if (app.flashId) {
      var el = v.querySelector('[data-id="' + app.flashId + '"]');
      if (el) { el.classList.add('flash'); }
      app.flashId = null;
    }
  }

  function renderLogin() {
    root.innerHTML =
      '<div class="login-wrap">' +
        '<header class="appbar login-hero">' +
          '<div class="appbar-top"><div class="brand">' + UI.LOGO + '<div><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div></div>' +
          '<button class="pill-btn" id="langBtn" type="button">' + UI.icon('globe') + '<span>' + t('langSwitch') + '</span></button></div>' +
          '<div class="tag">' + t('tagline') + '</div>' +
          '<div class="clinic-line">' + UI.icon('tooth') + '<span>' + t('clinicName') + '</span></div>' +
        '</header>' +
        '<section class="card login-card">' +
          '<div class="card-title">' + UI.icon('lock') + t('login_title') + '</div>' +
          '<p class="muted small" style="margin-bottom:12px">' + t('login_sub') + '</p>' +
          S.STAFF.map(function (s) {
            return '<button class="staff-opt" data-staff="' + s.id + '" type="button">' + avatar(s.id, 'lg') +
              '<span><b>' + s[I18N.lang] + '</b><small>' + t('role_' + s.role) + '</small></span>' + UI.icon('chevron', 'chev') + '</button>';
          }).join('') +
          '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('login_note') + '</span></div>' +
        '</section>' +
        '<div class="container" style="padding-top:4px"><a class="btn btn-ghost btn-block" href="book.html">' + UI.icon('calendar') + '<span>' + t('more_book') + '</span></a></div>' +
        '<footer class="footer" style="margin-top:auto"><div><b>AICore موعد</b> · ' + t('footer') + '</div></footer>' +
      '</div>';
    document.getElementById('langBtn').onclick = function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); };
    root.querySelectorAll('.staff-opt').forEach(function (b) {
      b.onclick = function () { app.staff = b.dataset.staff; localStorage.setItem(STAFF_KEY, app.staff); S.A.login(app.staff); render(); UI.toast(t('hello') + ' ' + S.staffName(app.staff)); };
    });
  }

  /* ---------------- booking card ---------------- */
  function whenBox(date, time) {
    var d = S.parseKey(date);
    var w1 = date === T() ? t('today') : date === S.addDays(T(), 1) ? t('tomorrow') : new Intl.DateTimeFormat(I18N.locale(), { weekday: 'short' }).format(d);
    return '<div class="bk-when"><div class="w1">' + w1 + '</div><div class="w2">' + time + '</div><div class="w3">' + new Intl.DateTimeFormat(I18N.locale(), { day: 'numeric', month: 'short' }).format(d) + '</div></div>';
  }
  function statusChip(b) {
    var m = { pending: ['warn', 'clock'], proposed: ['accent', 'calswap'], confirmed: ['ok', 'calcheck'], refused: ['bad', 'x'], cancelled: ['gray', 'x'] }[b.status];
    return '<span class="chip ' + m[0] + '">' + UI.icon(m[1]) + t('st_' + b.status) + '</span>';
  }
  function depChip(b) {
    if (!b.deposit || b.deposit.status === 'none') return '';
    if (b.deposit.status === 'verified') return '<span class="chip ok">' + UI.icon('wallet') + (I18N.lang === 'fr' ? 'Acompte vérifié' : 'العربون مدفوع') + '</span>';
    return '<span class="chip warn">' + UI.icon('wallet') + t('dep_awaiting') + '</span>';
  }
  function trail(b) {
    var lines = [];
    lines.push([UI.icon('inbox'), t('received') + ' · ' + S.fmtStamp(b.createdAt)]);
    if (b.decision && b.decision.by) lines.push([UI.icon(b.status === 'refused' ? 'x' : 'check'), t('decided_by', { action: t(b.status === 'refused' ? 'ev_refused' : 'ev_confirmed'), staff: S.staffName(b.decision.by), time: S.fmtStamp(b.decision.at) })]);
    if (b.proposal && b.status === 'proposed') lines.push([UI.icon('calswap'), t('decided_by', { action: t('ev_proposed'), staff: S.staffName(b.proposal.by), time: S.fmtStamp(b.proposal.at) })]);
    if (b.decision && b.decision.cancelledBy) lines.push([UI.icon('x'), t('decided_by', { action: t('ev_cancelled'), staff: S.staffName(b.decision.cancelledBy), time: S.fmtStamp(b.decision.cancelledAt) })]);
    if (b.reminder) lines.push([UI.icon('bell'), t('rem_sent_by', { staff: S.staffName(b.reminder.by), time: S.fmtStamp(b.reminder.at) })]);
    if (b.attendance) lines.push([UI.icon(b.attendance.value === 'attended' ? 'usercheck' : 'userx'), t('decided_by', { action: t('att_' + b.attendance.value), staff: S.staffName(b.attendance.by), time: S.fmtStamp(b.attendance.at) })]);
    return '<div class="bk-trail">' + lines.map(function (l) { return '<div>' + l[0] + '<span>' + l[1] + '</span></div>'; }).join('') + '</div>';
  }
  function depRow(b) {
    if (b.status !== 'confirmed') return '';
    var d = b.deposit || { status: 'none' };
    if (d.status === 'verified') return '<div class="dep-row verified"><span class="dep-l">' + UI.icon('check') + '<span>' + t('dep_verified', { staff: S.staffName(d.verifiedBy), time: S.fmtStamp(d.verifiedAt) }) + '</span></span><b class="num">' + S.money(d.amount || 500) + '</b></div>';
    if (d.status === 'awaiting') return '<div class="dep-row awaiting"><span class="dep-l">' + UI.icon('wallet') + '<span>' + t('dep_awaiting') + ' · ' + S.money(d.amount || 500) + '</span></span><button class="btn btn-sm btn-accent" data-act="verify">' + UI.icon('check') + '<span>' + t('a_verify') + '</span></button></div>';
    return '';
  }
  function bkCard(b, opts) {
    opts = opts || {};
    var e = S.effTime(b);
    var svc = S.service(b.service);
    var h = '<article class="card bk' + (b.status === 'pending' ? ' new' : '') + '" data-id="' + b.id + '">' +
      '<div class="bk-top">' + whenBox(b.date, b.time) +
        '<div class="grow"><div class="bk-name" dir="auto">' + UI.esc(b.name) + '</div>' +
        '<div class="bk-meta"><span>' + UI.icon(svc.icon) + t('svc_' + b.service) + '</span><span class="ltr">' + UI.icon('phone') + S.phoneDisplay(b.phone) + '</span><span class="ltr num">' + b.ref + '</span></div></div>' +
        (b.status === 'confirmed' && b.date >= T() && !b.attendance ? '<button class="icon-btn" data-act="cancel" title="' + t('a_cancel') + '">' + UI.icon('x') + '</button>' : '') +
      '</div>' +
      (b.note ? '<div class="bk-note">' + UI.icon('note') + '<span dir="auto">' + UI.esc(b.note) + '</span></div>' : '') +
      '<div class="bk-chips">' + statusChip(b) + depChip(b) +
        (b.attendance ? '<span class="chip ' + (b.attendance.value === 'attended' ? 'ok' : 'bad') + '">' + UI.icon(b.attendance.value === 'attended' ? 'usercheck' : 'userx') + t('att_' + b.attendance.value) + '</span>' : '') +
        (b.status === 'confirmed' && b.reminder ? '<span class="chip info">' + UI.icon('bell') + t('rem_sent') + '</span>' : '') +
        '<span class="chip gray">' + (b.lang === 'fr' ? 'FR' : 'ع') + '</span>' +
      '</div>';
    if (b.status === 'proposed' && b.proposal) {
      h += '<div class="dep-row awaiting" style="margin-top:10px"><span class="dep-l">' + UI.icon('calswap') + '<span>' + S.fmtDate(b.proposal.date) + ' · <b class="ltr">' + b.proposal.time + '</b></span></span></div>';
    }
    h += depRow(b);
    if (b.status === 'pending') {
      h += '<div class="bk-actions">' +
        '<button class="btn btn-ok" data-act="confirm">' + UI.icon('check') + '<span>' + t('a_confirm') + '</span></button>' +
        '<button class="btn btn-soft" data-act="propose">' + UI.icon('calswap') + '<span>' + t('a_propose') + '</span></button>' +
        '<button class="btn btn-bad" data-act="refuse">' + UI.icon('x') + '<span>' + t('a_refuse') + '</span></button></div>';
    } else if (b.status === 'proposed') {
      h += '<div class="bk-actions">' +
        '<button class="btn btn-ok" data-act="accept">' + UI.icon('check') + '<span>' + t('a_accept_proposal') + '</span></button>' +
        '<button class="btn btn-wa btn-sm" data-act="draft-propose">' + UI.icon('wa') + '<span>' + t('a_wa_draft') + '</span></button>' +
        '<button class="btn btn-bad btn-sm" data-act="refuse">' + UI.icon('x') + '<span>' + t('a_refuse') + '</span></button></div>';
    } else if (b.status === 'confirmed') {
      if (b.date <= T() && !b.attendance) {
        h += '<div class="att-row"><button class="btn btn-sm btn-ok" data-act="attended">' + UI.icon('usercheck') + '<span>' + t('a_attended') + '</span></button>' +
          '<button class="btn btn-sm btn-bad" data-act="noshow">' + UI.icon('userx') + '<span>' + t('a_noshow') + '</span></button></div>';
      } else if (b.date > T() || opts.showWa) {
        h += '<div class="bk-actions"><button class="btn btn-sm btn-ghost" data-act="draft-confirm">' + UI.icon('wa') + '<span>' + t('a_wa_draft') + '</span></button>' +
          (b.deposit && b.deposit.status === 'none' ? '<button class="btn btn-sm btn-ghost" data-act="reqdep">' + UI.icon('wallet') + '<span>' + t('a_request_deposit') + '</span></button>' : '') + '</div>';
      }
    }
    h += trail(b) + '</article>';
    return h;
  }

  function bindCards(container) {
    container.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-act]'); if (!btn) return;
      var card = btn.closest('[data-id]'); if (!card) return;
      var b = S.get(card.dataset.id); if (!b) return;
      var a = btn.dataset.act;
      if (a === 'confirm') return confirmModal(b);
      if (a === 'refuse') return refuseModal(b);
      if (a === 'propose') return proposeModal(b);
      if (a === 'accept') { S.A.acceptProposal(b.id, app.staff); UI.toast(t('toast_confirmed')); app.flashId = b.id; render(); return draftModal('confirm', b); }
      if (a === 'draft-propose') return draftModal('propose', b);
      if (a === 'draft-confirm') return draftModal('confirm', b);
      if (a === 'verify') return verifyModal(b);
      if (a === 'reqdep') { S.A.requestDeposit(b.id, app.staff); app.flashId = b.id; render(); return draftModal('confirm', b); }
      if (a === 'attended') { S.A.attendance(b.id, app.staff, 'attended'); UI.toast(t('toast_attendance')); app.flashId = b.id; return render(); }
      if (a === 'noshow') return noshowModal(b);
      if (a === 'cancel') return cancelModal(b);
    });
  }

  /* ---------------- modals ---------------- */
  function miniSummary(b) {
    return '<div class="card" style="box-shadow:none;background:var(--brand-50);border-color:var(--brand-100);padding:12px"><div class="bk-top">' + whenBox(b.date, b.time) +
      '<div class="grow"><div class="bk-name" dir="auto">' + UI.esc(b.name) + '</div><div class="bk-meta"><span>' + t('svc_' + b.service) + '</span><span class="ltr">' + b.ref + '</span></div>' +
      '<div class="small muted">' + S.fmtDate(b.date) + '</div></div></div></div>';
  }
  function confirmModal(b) {
    var hasDep = b.deposit && b.deposit.status !== 'none';
    UI.modal({
      title: t('m_confirm_title'),
      body: miniSummary(b) +
        '<label class="check" style="margin-top:12px"><input type="checkbox" id="mDep"' + (hasDep ? ' checked disabled' : '') + '><span>' + t('m_confirm_deposit') + '</span></label>' +
        '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('m_confirm_body', { staff: S.staffName(app.staff) }) + '</span></div>',
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_confirm'), cls: 'btn-ok', icon: 'check', id: 'mConfirmBtn', onClick: function (close, ev, el) {
          var dep = document.getElementById('mDep').checked && !hasDep;
          S.A.confirm(b.id, app.staff, { deposit: dep });
          close(); UI.toast(t('toast_confirmed')); app.flashId = b.id; render();
          setTimeout(function () { draftModal('confirm', S.get(b.id)); }, 220);
        } }
      ]
    });
  }
  function refuseModal(b) {
    var reasons = ['r_full', 'r_doctor', 'r_duplicate', 'r_other'];
    UI.modal({
      title: t('m_refuse_title'),
      body: miniSummary(b) + '<div class="label" style="margin-top:12px">' + t('m_refuse_reason') + '</div>' +
        '<select class="select" id="mReason">' + reasons.map(function (r) { return '<option value="' + r + '">' + t(r) + '</option>'; }).join('') + '</select>' +
        '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('m_confirm_body', { staff: S.staffName(app.staff) }) + '</span></div>',
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_refuse'), cls: 'btn-bad-solid', icon: 'x', id: 'mRefuseBtn', onClick: function (close) {
          var r = document.getElementById('mReason').value;
          S.A.refuse(b.id, app.staff, r);
          close(); UI.toast(t('toast_refused')); render();
          setTimeout(function () { draftModal('refuse', S.get(b.id), { reason: r }); }, 220);
        } }
      ]
    });
  }
  function slotPicker(container, excludeId, onPick) {
    var days = [], d = T();
    if (!S.isClosed(d)) days.push(d);
    while (days.length < 8) { d = S.addDays(d, 1); if (!S.isClosed(d)) days.push(d); }
    var cur = { date: days[0], time: null };
    function draw() {
      container.innerHTML = '<div class="days">' + days.map(function (k) {
        var dt = S.parseKey(k);
        return '<button type="button" class="day' + (k === cur.date ? ' sel' : '') + '" data-d="' + k + '"><div class="dw">' + (k === T() ? t('today') : new Intl.DateTimeFormat(I18N.locale(), { weekday: 'short' }).format(dt)) +
          '</div><div class="dn">' + dt.getDate() + '</div><div class="dm">' + new Intl.DateTimeFormat(I18N.locale(), { month: 'short' }).format(dt) + '</div></button>';
      }).join('') + '</div><div class="slots" style="margin-top:6px">' + S.slotsFor(cur.date, excludeId).map(function (s) {
        return '<button type="button" class="slot' + (cur.time === s.time ? ' sel' : '') + '" data-t="' + s.time + '"' + (s.taken || s.past ? ' disabled' : '') + '>' + s.time + '</button>';
      }).join('') + '</div>';
    }
    container.addEventListener('click', function (e) {
      var dd = e.target.closest('.day'), ss = e.target.closest('.slot');
      if (dd) { cur.date = dd.dataset.d; cur.time = null; draw(); onPick(null); }
      if (ss && !ss.disabled) { cur.time = ss.dataset.t; draw(); onPick({ date: cur.date, time: cur.time }); }
    });
    draw();
  }
  function proposeModal(b) {
    var pickedSlot = null;
    UI.modal({
      title: t('m_propose_title'), sub: t('m_propose_body'),
      body: miniSummary(b) + '<div id="mPicker" style="margin-top:12px"></div>',
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_propose'), cls: 'btn-primary', icon: 'calswap', id: 'mProposeBtn', onClick: function (close) {
          if (!pickedSlot) { UI.toast(t('err_time'), 'err'); return; }
          S.A.propose(b.id, app.staff, pickedSlot.date, pickedSlot.time);
          close(); UI.toast(t('toast_proposed')); app.flashId = b.id; render();
          setTimeout(function () { draftModal('propose', S.get(b.id)); }, 220);
        } }
      ],
      onOpen: function (w) { slotPicker(w.querySelector('#mPicker'), b.id, function (p) { pickedSlot = p; }); }
    });
  }
  function verifyModal(b) {
    UI.modal({
      title: t('m_verify_title'),
      body: miniSummary(b) + '<p style="margin-top:12px">' + t('m_verify_body', { amount: '<b>' + S.money(b.deposit.amount || 500) + '</b>', ref: '<b class="ltr">' + b.ref + '</b>' }) + '</p>' +
        '<div class="hitl-note">' + UI.icon('shield') + '<span>' + (I18N.lang === 'fr' ? 'Aucune connexion bancaire : la vérification est faite par une personne, et consignée à son nom.' : 'لا يوجد ربط بنكي: التحقق يتم يدوياً من موظف ويُسجَّل باسمه.') + '</span></div>',
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('m_verify_yes'), cls: 'btn-ok', icon: 'check', id: 'mVerifyBtn', onClick: function (close) {
          S.A.verifyDeposit(b.id, app.staff); close(); UI.toast(t('toast_verified')); app.flashId = b.id; render();
        } }
      ]
    });
  }
  function noshowModal(b) {
    UI.modal({
      title: t('m_noshow_title'), body: '<p>' + t('m_noshow_body', { name: '<b dir="auto">' + UI.esc(b.name) + '</b>', time: '<b class="ltr">' + b.time + '</b>' }) + '</p>',
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_noshow'), cls: 'btn-bad-solid', icon: 'userx', id: 'mNoshowBtn', onClick: function (close) {
          S.A.attendance(b.id, app.staff, 'noshow'); close(); UI.toast(t('toast_noshow')); app.flashId = b.id; render();
        } }
      ]
    });
  }
  function cancelModal(b) {
    UI.modal({
      title: t('a_cancel'), body: miniSummary(b),
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_cancel'), cls: 'btn-bad-solid', icon: 'x', onClick: function (close) { S.A.cancel(b.id, app.staff); close(); UI.toast(t('ev_cancelled')); render(); } }
      ]
    });
  }

  /** The system drafts; a named human reviews and taps send in WhatsApp. */
  function draftModal(kind, b, extra, opts) {
    opts = opts || {};
    var lang = b.lang || 'ar';
    var text = S.draft(kind, b, lang, app.staff, extra);
    var edited = false;
    var body = document.createElement('div');
    function drawBody() {
      body.innerHTML =
        '<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="small muted">' + t('m_draft_lang') + '</span>' +
        '<div class="seg"><button type="button" data-l="ar" class="' + (lang === 'ar' ? 'on' : '') + '">العربية</button><button type="button" data-l="fr" class="' + (lang === 'fr' ? 'on' : '') + '">Français</button></div></div>' +
        UI.waBubble(text, { to: b.name, phone: S.phoneDisplay(b.phone), time: nowHM() }) +
        '<div class="draft-edit hidden"><textarea class="textarea" dir="auto" id="draftText"></textarea></div>' +
        '<div class="hitl-note">' + UI.icon('shield') + '<span>' + (I18N.lang === 'fr' ? 'Aucun envoi automatique : WhatsApp s’ouvre avec ce texte, et c’est vous qui appuyez sur Envoyer. L’ouverture est consignée au journal.' : 'لا إرسال آلي: يُفتح واتساب بهذا النص وأنت من يضغط "إرسال". يُسجَّل فتح الرسالة في السجل.') + '</span></div>';
      body.querySelector('#draftText').value = text;
    }
    drawBody();
    var m = UI.modal({
      title: t('m_draft_title'), sub: t('m_draft_sub'), body: body, cls: 'draft-modal',
      actions: [
        { label: t('a_edit'), cls: 'btn-ghost btn-sm', icon: 'edit', onClick: function () {
          var ed = body.querySelector('.draft-edit'); ed.classList.toggle('hidden');
          body.querySelector('.wa-screen').classList.toggle('hidden');
        } },
        { label: t('a_open_wa'), cls: 'btn-wa', icon: 'wa', id: 'waSendBtn', href: S.waLink(b.phone, text), onClick: function (close) {
          if (kind === 'reminder') S.A.waOpened(b.id, app.staff, 'reminder'); else S.A.waOpened(b.id, app.staff, kind);
          UI.toast(t('toast_wa_opened'));
          setTimeout(function () { close(); if (opts.after) opts.after(); else render(); }, 400);
        } }
      ]
    });
    var link = m.el.querySelector('#waSendBtn');
    function refreshLink() { link.href = S.waLink(b.phone, text); }
    body.addEventListener('click', function (e) {
      var l = e.target.closest('[data-l]'); if (!l) return;
      lang = l.dataset.l; text = S.draft(kind, S.get(b.id), lang, app.staff, extra); edited = false; drawBody(); refreshLink();
    });
    body.addEventListener('input', function (e) {
      if (e.target.id === 'draftText') { text = e.target.value; edited = true; body.querySelector('.wa-bubble').innerHTML = UI.esc(text).replace(/\n/g, '<br>') + '<span class="wa-time">' + nowHM() + ' ✓✓</span>'; refreshLink(); }
    });
    return m;
  }

  /* ---------------- views: requests ---------------- */
  function viewRequests(v) {
    var all = S.all();
    var groups = {
      pending: all.filter(function (b) { return b.status === 'pending' || b.status === 'proposed'; }).sort(function (a, b) { return (a.status === 'proposed') - (b.status === 'proposed') || (a.createdAt < b.createdAt ? 1 : -1); }),
      confirmed: all.filter(function (b) { return b.status === 'confirmed'; }),
      refused: all.filter(function (b) { return b.status === 'refused' || b.status === 'cancelled'; }).sort(function (a, b) { var x = (a.decision && (a.decision.cancelledAt || a.decision.at)) || '', y = (b.decision && (b.decision.cancelledAt || b.decision.at)) || ''; return x < y ? 1 : -1; }),
      today: all.filter(function (b) { return b.status === 'confirmed' && b.date === T(); }).sort(function (a, b) { return a.time < b.time ? -1 : 1; })
    };
    var tabs = [['pending', groups.pending.length], ['confirmed', groups.confirmed.filter(function (b) { return b.date >= T(); }).length], ['refused', groups.refused.length], ['today', groups.today.length]];
    var h = '<div class="page-head"><div><h2>' + t('hello') + ' ' + S.staffName(app.staff) + ' 👋</h2><p>' + S.fmtDate(T()) + ' · ' + t('tagline') + '</p></div></div>' +
      '<div class="tabs" role="tablist">' + tabs.map(function (x) {
        return '<a class="tab' + (app.tab === x[0] ? ' active' : '') + '" href="#/requests/' + x[0] + '" data-tab="' + x[0] + '">' + t('tab_' + x[0]) + '<span class="cnt">' + x[1] + '</span></a>';
      }).join('') + '</div><div id="list"></div>';
    v.innerHTML = h;
    var list = v.querySelector('#list');
    var g = groups[app.tab];
    if (app.tab === 'confirmed') {
      var up = g.filter(function (b) { return b.date >= T(); }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
      var past = g.filter(function (b) { return b.date < T(); }).sort(function (a, b) { return (a.date + a.time) > (b.date + b.time) ? -1 : 1; });
      list.innerHTML = '<div class="section-label">' + t('upcoming') + ' · ' + up.length + '</div><div class="list-grid">' + up.map(function (b) { return bkCard(b); }).join('') + '</div>' +
        '<div class="section-label">' + t('past') + ' · ' + past.length + '</div><div class="list-grid">' + past.map(function (b) { return bkCard(b); }).join('') + '</div>';
    } else if (app.tab === 'today') {
      var att = g.filter(function (b) { return b.attendance && b.attendance.value === 'attended'; }).length;
      var ns = g.filter(function (b) { return b.attendance && b.attendance.value === 'noshow'; }).length;
      list.innerHTML = g.length ? '<div class="row" style="gap:6px;margin-bottom:12px;flex-wrap:wrap"><span class="chip">' + UI.icon('calendar') + g.length + ' ' + t('tab_confirmed') + '</span><span class="chip ok">' + UI.icon('usercheck') + att + ' ' + t('att_attended') + '</span><span class="chip bad">' + UI.icon('userx') + ns + ' ' + t('att_noshow') + '</span></div>' +
        '<div class="tl">' + g.map(function (b) {
          var cls = b.attendance ? (b.attendance.value === 'attended' ? ' done' : ' ns') : '';
          return '<div class="tl-item' + cls + '"><div class="tl-time">' + b.time + '</div><div class="tl-line"></div>' + bkCard(b) + '</div>';
        }).join('') + '</div>' : empty('calendar', t('empty_today'));
    } else {
      list.innerHTML = g.length ? '<div class="list-grid">' + g.map(function (b) { return bkCard(b); }).join('') + '</div>' : empty('inbox', app.tab === 'pending' ? t('empty_pending') : t('empty_generic'));
    }
    bindCards(list);
  }
  function empty(ic, msg) { return '<div class="empty">' + UI.icon(ic) + '<div>' + msg + '</div></div>'; }

  /* ---------------- views: reminders ---------------- */
  function remindersList() {
    var d = reminderDay();
    return S.all().filter(function (b) { return b.status === 'confirmed' && b.date === d; }).sort(function (a, b) { return a.time < b.time ? -1 : 1; });
  }
  function viewReminders(v) {
    var d = reminderDay(), list = remindersList();
    var done = list.filter(function (b) { return b.reminder; }).length;
    var h = '<div class="page-head"><div><h2>' + t('rem_title') + '</h2><p>' + t('rem_sub', { day: '<b>' + dayLabel(d) + ' – ' + S.fmtDate(d) + '</b>' }) + '</p></div></div>' +
      '<section class="card"><div class="row" style="justify-content:space-between"><b style="white-space:nowrap">' + t('rem_progress', { done: done, total: list.length }) + '</b>' +
      (done < list.length ? '<button class="btn btn-wa btn-sm" id="sendAll">' + UI.icon('send', 'flip') + '<span>' + t('rem_send_all') + '</span></button>' : '<span class="chip ok">' + UI.icon('check') + t('rem_all_done') + '</span>') + '</div>' +
      '<div class="rem-progress"><i style="width:' + (list.length ? Math.round(done / list.length * 100) : 0) + '%"></i></div></section>';
    if (!list.length) h += empty('bell', t('rem_empty'));
    h += '<div class="list-grid" style="margin-top:12px" id="remList">' + list.map(function (b) {
      var text = S.draft('reminder', b, b.lang, app.staff);
      return '<article class="card bk" data-id="' + b.id + '"><div class="bk-top">' + whenBox(b.date, b.time) +
        '<div class="grow"><div class="bk-name" dir="auto">' + UI.esc(b.name) + '</div><div class="bk-meta"><span>' + t('svc_' + b.service) + '</span><span class="ltr">' + UI.icon('phone') + S.phoneDisplay(b.phone) + '</span></div></div>' +
        (b.reminder ? '<span class="chip ok">' + UI.icon('check') + t('rem_sent') + '</span>' : '<span class="chip warn">' + UI.icon('clock') + t('rem_not_sent') + '</span>') + '</div>' +
        '<div class="msg-preview" dir="auto">' + UI.esc(text) + '</div>' +
        (b.reminder ? '<div class="bk-trail"><div>' + UI.icon('bell') + '<span>' + t('rem_sent_by', { staff: S.staffName(b.reminder.by), time: S.fmtStamp(b.reminder.at) }) + '</span></div></div>' :
          '<div class="bk-actions"><a class="btn btn-wa btn-sm" data-rem="open" target="_blank" rel="noopener" href="' + S.waLink(b.phone, text) + '">' + UI.icon('wa') + '<span>' + t('a_open_wa') + '</span></a>' +
          '<button class="btn btn-ghost btn-sm" data-rem="mark">' + UI.icon('check') + '<span>' + t('rem_mark_sent') + '</span></button></div>') +
        '</article>';
    }).join('') + '</div>';
    v.innerHTML = h;
    var sa = v.querySelector('#sendAll'); if (sa) sa.onclick = sendAllFlow;
    v.querySelector('#remList').addEventListener('click', function (e) {
      var pv = e.target.closest('.msg-preview'); if (pv) { pv.classList.toggle('open'); return; }
      var a = e.target.closest('[data-rem]'); if (!a) return;
      var b = S.get(a.closest('[data-id]').dataset.id);
      if (a.dataset.rem === 'open') {
        S.A.waOpened(b.id, app.staff, 'reminder'); UI.toast(t('toast_wa_opened'));
        var mk = a.parentNode.querySelector('[data-rem="mark"]'); mk.classList.remove('btn-ghost'); mk.classList.add('btn-primary');
      } else { S.A.reminderSent(b.id, app.staff); UI.toast(t('toast_reminder_marked')); app.flashId = b.id; render(); }
    });
  }
  function sendAllFlow() {
    var queue = remindersList().filter(function (b) { return !b.reminder; });
    var i = 0, n = queue.length;
    var body = document.createElement('div');
    var m = UI.modal({ title: t('rem_flow_title'), body: body, onClose: function () { render(); } });
    function step() {
      if (i >= n) {
        body.innerHTML = '<div class="empty">' + UI.icon('check') + '<div><b>' + t('rem_flow_finish') + '</b></div></div><button class="btn btn-primary btn-block" id="flowClose">' + t('a_close') + '</button>';
        body.querySelector('#flowClose').onclick = m.close; return;
      }
      var b = queue[i], text = S.draft('reminder', b, b.lang, app.staff);
      body.innerHTML = '<div class="row" style="justify-content:space-between;margin-bottom:8px"><b>' + t('rem_flow_step', { i: i + 1, n: n }) + '</b><span class="small muted ltr">' + b.time + ' · ' + b.ref + '</span></div>' +
        '<div class="rem-progress" style="margin:0 0 12px"><i style="width:' + Math.round(i / n * 100) + '%"></i></div>' +
        UI.waBubble(text, { to: b.name, phone: S.phoneDisplay(b.phone), time: nowHM() }) +
        '<div class="stack" style="margin-top:12px"><a class="btn btn-wa btn-block" id="flowOpen" target="_blank" rel="noopener" href="' + S.waLink(b.phone, text) + '">' + UI.icon('wa') + '<span>' + t('rem_flow_open') + '</span></a>' +
        '<button class="btn btn-primary btn-block" id="flowDone" disabled>' + UI.icon('check') + '<span>' + t('rem_flow_done') + '</span></button>' +
        '<button class="btn btn-ghost btn-block btn-sm" id="flowSkip">' + t('rem_flow_skip') + '</button></div>';
      body.querySelector('#flowOpen').onclick = function () { S.A.waOpened(b.id, app.staff, 'reminder'); body.querySelector('#flowDone').disabled = false; };
      body.querySelector('#flowDone').onclick = function () { S.A.reminderSent(b.id, app.staff); UI.toast(t('toast_reminder_marked')); i++; step(); };
      body.querySelector('#flowSkip').onclick = function () { i++; step(); };
    }
    step();
  }

  /* ---------------- views: audit ---------------- */
  var EV_ICON = { created: 'inbox', confirmed: 'calcheck', refused: 'x', proposed: 'calswap', cancelled: 'x', wa_opened: 'wa', reminder_sent: 'bell', deposit_requested: 'wallet', deposit_verified: 'wallet', attended: 'usercheck', noshow: 'userx', login: 'user', reset: 'refresh' };
  var FILTERS = { all: null, created: ['created'], confirmed: ['confirmed'], refused: ['refused', 'cancelled'], reminder_sent: ['reminder_sent', 'wa_opened'], deposit_verified: ['deposit_verified', 'deposit_requested'], noshow: ['noshow', 'attended'] };
  function logDetails(e) {
    var d = e.details || {};
    if (e.action === 'refused' && d.reason) return t(d.reason);
    if (e.action === 'proposed' && d.date) return S.fmtDate(d.date) + ' · ' + d.time;
    if (e.action === 'wa_opened' && d.kind) return t('evd_wa_' + d.kind);
    if ((e.action === 'deposit_verified' || e.action === 'deposit_requested') && d.amount) return S.money(d.amount) + (d.method ? ' · ' + d.method : '');
    if (e.action === 'confirmed' && d.fromProposal) return t('ev_proposed') + ' ✓';
    return '';
  }
  function filteredLog() {
    var f = FILTERS[app.audit.f], q = app.audit.q.trim().toLowerCase();
    return S.state().log.filter(function (e) {
      if (f && f.indexOf(e.action) < 0) return false;
      if (app.audit.staff && e.actor !== app.audit.staff) return false;
      if (q && !((e.name || '').toLowerCase().indexOf(q) >= 0 || (e.ref || '').toLowerCase().indexOf(q) >= 0)) return false;
      return true;
    }).slice().sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
  }
  function viewAudit(v) {
    var log = S.state().log;
    var human = log.filter(function (e) { return S.STAFF.some(function (s) { return s.id === e.actor; }) && e.action !== 'login'; }).length;
    var waN = log.filter(function (e) { return e.action === 'wa_opened' || e.action === 'reminder_sent'; }).length;
    v.innerHTML = '<div class="page-head"><div><h2>' + t('audit_title') + '</h2><p>' + (I18N.lang === 'fr' ? 'Qui a fait quoi, et quand' : 'من فعل ماذا ومتى') + '</p></div>' +
      '<button class="btn btn-ghost btn-sm" id="csvBtn">' + UI.icon('download') + '<span>' + t('audit_export') + '</span></button></div>' +
      '<section class="card hitl-card"><div class="card-title">' + UI.icon('shield') + t('audit_hitl') + '</div><p>' + t('audit_sub') + '</p>' +
      '<div class="hitl-stats"><div><b>' + human + '</b><small>' + (I18N.lang === 'fr' ? 'décisions humaines' : 'قرار بشري موقّع') + '</small></div>' +
      '<div><b>' + waN + '</b><small>' + (I18N.lang === 'fr' ? 'messages ouverts par l’équipe' : 'رسالة فتحها موظف') + '</small></div>' +
      '<div><b>0</b><small>' + (I18N.lang === 'fr' ? 'envois automatiques' : 'إرسال آلي') + '</small></div></div></section>' +
      '<div class="filters" style="margin-top:14px">' + Object.keys(FILTERS).map(function (k) {
        return '<button class="fchip' + (app.audit.f === k ? ' on' : '') + '" data-f="' + k + '">' + (k === 'all' ? t('audit_all') : t('ev_' + k)) + '</button>';
      }).join('') + '</div>' +
      '<div class="filter-row"><select class="select" id="staffF"><option value="">' + t('audit_filter_staff') + '</option>' +
        S.STAFF.map(function (s) { return '<option value="' + s.id + '"' + (app.audit.staff === s.id ? ' selected' : '') + '>' + s[I18N.lang] + '</option>'; }).join('') +
        '<option value="patient"' + (app.audit.staff === 'patient' ? ' selected' : '') + '>' + t('actor_patient') + '</option></select>' +
      '<div class="search-box">' + UI.icon('search') + '<input class="input" id="qF" placeholder="' + t('audit_search') + '" value="' + UI.esc(app.audit.q) + '"></div></div>' +
      '<div id="logList"></div>';
    var limit = 60;
    function drawList() {
      var allItems = filteredLog(), items = allItems.slice(0, limit);
      var html = '<div class="small muted" style="margin:0 4px 4px">' + t('audit_count', { n: allItems.length }) + '</div>';
      var lastDay = null, open = false;
      items.forEach(function (e) {
        var dk = S.dateKey(new Date(e.ts));
        if (dk !== lastDay) {
          if (open) html += '</div>';
          html += '<div class="log-day">' + dayLabel(dk) + (dk === T() || dk === S.addDays(T(), 1) ? ' · ' + S.fmtDate(dk) : '') + '</div><div class="card log">';
          open = true; lastDay = dk;
        }
        var st = staffObj(e.actor);
        var d = new Date(e.ts);
        var det = logDetails(e);
        html += '<div class="log-item"><div class="log-ico c-' + e.action + '">' + UI.icon(EV_ICON[e.action] || 'info') + '</div>' +
          '<div class="log-main"><b>' + t('ev_' + e.action) + '</b>' +
          '<div class="l2"><span class="who"><i style="background:' + (st ? st.color : '#9AB') + '"></i>' + S.staffName(e.actor) + '</span>' +
          (e.name ? ' · <span dir="auto">' + UI.esc(e.name) + '</span>' : '') + (e.ref ? ' · <span class="ltr num">' + e.ref + '</span>' : '') + '</div>' +
          (det ? '<div class="l3">' + UI.esc(det) + '</div>' : '') + '</div>' +
          '<div class="log-when">' + S.pad(d.getHours()) + ':' + S.pad(d.getMinutes()) + '</div></div>';
      });
      if (open) html += '</div>';
      if (!items.length) html += empty('search', t('empty_generic'));
      if (allItems.length > items.length) html += '<button class="btn btn-ghost btn-block" id="moreLog" style="margin-top:12px">' + (I18N.lang === 'fr' ? 'Afficher plus' : 'عرض المزيد') + ' (' + (allItems.length - items.length) + ')</button>';
      v.querySelector('#logList').innerHTML = html;
      var ml = v.querySelector('#moreLog'); if (ml) ml.onclick = function () { limit += 60; drawList(); };
    }
    drawList();
    v.querySelectorAll('.fchip').forEach(function (b) { b.onclick = function () { app.audit.f = b.dataset.f; v.querySelectorAll('.fchip').forEach(function (x) { x.classList.toggle('on', x === b); }); drawList(); }; });
    v.querySelector('#staffF').onchange = function () { app.audit.staff = this.value; drawList(); };
    v.querySelector('#qF').oninput = function () { app.audit.q = this.value; drawList(); };
    v.querySelector('#csvBtn').onclick = function () {
      var rows = [['timestamp', 'actor', 'action', 'ref', 'patient', 'details']].concat(filteredLog().map(function (e) {
        return [e.ts, S.staffName(e.actor, 'fr'), e.action, e.ref || '', e.name || '', logDetails(e)];
      }));
      var csv = '\ufeff' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'mawid-audit-log-DEMO-' + T() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    };
  }

  /* ---------------- views: reports ---------------- */
  var ASSUMED_NOSHOW = 20; // % — demo assumption, adjustable per clinic
  function computeStats() {
    var all = S.all(), t0 = S.addDays(T(), -6);
    var inWin = function (k) { return k >= t0 && k <= T(); };
    var req = all.filter(function (b) { return inWin(S.dateKey(new Date(b.createdAt))); });
    var conf = req.filter(function (b) { return b.status === 'confirmed'; }).length;
    var refd = req.filter(function (b) { return b.status === 'refused' || b.status === 'cancelled'; }).length;
    var pend = req.filter(function (b) { return b.status === 'pending' || b.status === 'proposed'; }).length;
    var appts = all.filter(function (b) { return b.status === 'confirmed' && inWin(b.date); });
    var att = appts.filter(function (b) { return b.attendance && b.attendance.value === 'attended'; });
    var ns = appts.filter(function (b) { return b.attendance && b.attendance.value === 'noshow'; });
    var revenue = att.reduce(function (s, b) { return s + S.service(b.service).price; }, 0);
    var deps = all.filter(function (b) { return b.deposit && b.deposit.status === 'verified' && inWin(S.dateKey(new Date(b.deposit.verifiedAt))); });
    var reminded = all.filter(function (b) { return b.reminder && inWin(S.dateKey(new Date(b.reminder.at))); });
    var avg = reminded.length ? reminded.reduce(function (s, b) { return s + S.service(b.service).price; }, 0) / reminded.length : 1500;
    var perDay = [];
    for (var i = 6; i >= 0; i--) {
      var k = S.addDays(T(), -i);
      var dayB = all.filter(function (b) { return b.date === k; });
      perDay.push({ k: k, conf: dayB.filter(function (b) { return b.status === 'confirmed'; }).length, ref: dayB.filter(function (b) { return b.status === 'refused' || b.status === 'cancelled'; }).length, pend: dayB.filter(function (b) { return b.status === 'pending' || b.status === 'proposed'; }).length });
    }
    var hours = {};
    all.forEach(function (b) { if (b.status === 'refused' || b.status === 'cancelled') return; var h = b.time.slice(0, 2); hours[h] = (hours[h] || 0) + 1; });
    return { req: req.length, conf: conf, refd: refd, pend: pend, att: att.length, ns: ns.length, nsRate: (att.length + ns.length) ? Math.round(ns.length / (att.length + ns.length) * 100) : 0,
      revenue: revenue, depN: deps.length, depAmt: deps.reduce(function (s, b) { return s + (b.deposit.amount || 500); }, 0), reminded: reminded.length, avg: avg,
      saved: Math.round(reminded.length * ASSUMED_NOSHOW / 100 * avg / 100) * 100, perDay: perDay, hours: hours };
  }
  var SHORT_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  function viewReports(v) {
    var s = computeStats();
    var max = Math.max.apply(null, s.perDay.map(function (d) { return d.conf + d.ref + d.pend; }).concat([1]));
    var bars = s.perDay.map(function (d) {
      var tot = d.conf + d.ref + d.pend, H = 110;
      var wd = I18N.lang === 'fr' ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(S.parseKey(d.k)).replace('.', '') : SHORT_AR[S.parseKey(d.k).getDay()];
      return '<div class="bar' + (d.k === T() ? ' today' : '') + '"><span class="bv">' + (tot || '') + '</span><div class="stackbar" style="height:' + Math.max(tot / max * H, tot ? 6 : 2) + 'px">' +
        '<i style="height:' + (tot ? d.conf / tot * 100 : 0) + '%;background:var(--brand-600)"></i><i style="height:' + (tot ? d.pend / tot * 100 : 0) + '%;background:var(--accent)"></i><i style="height:' + (tot ? d.ref / tot * 100 : 100) + '%;background:' + (tot ? '#E88B8A' : 'var(--line)') + '"></i></div>' +
        '<span class="bl">' + wd + '</span><span class="bl" style="margin-top:-4px">' + S.parseKey(d.k).getDate() + '</span></div>';
    }).join('');
    var hk = Object.keys(s.hours).sort();
    var hmax = Math.max.apply(null, hk.map(function (k) { return s.hours[k]; }).concat([1]));
    var topH = hk.reduce(function (a, k) { return s.hours[k] > (s.hours[a] || 0) ? k : a; }, hk[0]);
    var hbars = hk.map(function (k) { return '<div class="hbar' + (k === topH ? ' top' : '') + '"><span class="hl">' + k + ':00</span><span class="ht"><i style="width:' + (s.hours[k] / hmax * 100) + '%"></i></span><span class="hv">' + s.hours[k] + '</span></div>'; }).join('');
    var tot = s.conf + s.refd + s.pend || 1, C = 2 * Math.PI * 42;
    var seg = [[s.conf, 'var(--brand-600)'], [s.pend, 'var(--accent)'], [s.refd, '#E88B8A']], off = 0;
    var donut = '<svg class="donut" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" stroke-width="14"/>' + seg.map(function (x) {
      var len = x[0] / tot * C; var c = '<circle cx="50" cy="50" r="42" fill="none" stroke="' + x[1] + '" stroke-width="14" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 50 50)"/>'; off += len; return c;
    }).join('') + '<text x="50" y="47" text-anchor="middle" font-size="20" font-weight="800" fill="#eeeef6" font-family="Space Grotesk, Inter">' + Math.round(s.conf / tot * 100) + '%</text><text x="50" y="64" text-anchor="middle" font-size="10" fill="#9b9db4" font-family="Inter, Tajawal">' + t('k_confirmed') + '</text></svg>';
    v.innerHTML = '<div class="page-head"><div><h2>' + t('rep_title') + '</h2><p>' + t('rep_sub') + '</p></div></div>' +
      '<div class="kpis">' +
        kpi('inbox', t('k_requests'), s.req, t('k_pending') + ': ' + s.pend) +
        kpi('calcheck', t('k_confirmed'), s.conf, t('k_refused') + ': ' + s.refd) +
        kpi('userx', t('k_noshow'), s.nsRate + '%', t('att_noshow') + ': ' + s.ns + ' · ' + t('k_attended') + ': ' + s.att) +
        kpi('wallet', t('k_deposits'), s.depN, S.money(s.depAmt)) +
        '<div class="card kpi hl span2"><div class="k-l">' + UI.icon('coins') + t('k_revenue') + '<span class="demo-tag">DEMO</span></div><div class="k-v">' + S.money(s.revenue) + '</div><div class="k-s">' + s.att + ' × ' + (I18N.lang === 'fr' ? 'rendez-vous honorés · tarifs fictifs' : 'موعد تم حضوره · أسعار وهمية') + '</div></div>' +
        '<div class="card kpi saved span2"><div class="k-l">' + UI.icon('trend') + t('saved_result') + '<span class="demo-tag">' + (I18N.lang === 'fr' ? 'CALCUL DÉMO' : 'حساب تجريبي') + '</span></div><div class="big num">≈ ' + S.money(s.saved) + '</div>' +
          '<div class="formula">' + t('saved_body', { n: s.reminded, rate: ASSUMED_NOSHOW, avg: S.money(s.avg) }) + '</div><div class="tiny muted" style="margin-top:4px">' + t('saved_note', { rate: ASSUMED_NOSHOW }) + '</div></div>' +
      '</div>' +
      '<div class="row" style="gap:8px;margin:12px 0;flex-wrap:wrap"><button class="btn btn-primary grow" id="copySum">' + UI.icon('copy') + '<span>' + t('copy_summary') + '</span></button></div>' +
      '<div class="rep-grid">' +
        '<section class="card"><div class="card-title">' + UI.icon('chart') + t('ch_per_day') + '</div><div class="bars">' + bars + '</div>' +
          '<div class="legend"><span><i style="background:var(--brand-600)"></i>' + t('rep_legend_conf') + '</span><span><i style="background:var(--accent)"></i>' + t('rep_legend_pend') + '</span><span><i style="background:#E88B8A"></i>' + t('rep_legend_ref') + '</span></div></section>' +
        '<section class="card"><div class="card-title">' + UI.icon('clock') + t('ch_hours') + '</div>' + hbars + '</section>' +
        '<section class="card"><div class="card-title">' + UI.icon('calcheck') + t('ch_split') + '</div><div class="donut-wrap">' + donut + '<div class="donut-legend grow">' +
          '<div><i style="background:var(--brand-600)"></i>' + t('rep_legend_conf') + '<b>' + s.conf + '</b></div><div><i style="background:var(--accent)"></i>' + t('rep_legend_pend') + '<b>' + s.pend + '</b></div><div><i style="background:#E88B8A"></i>' + t('rep_legend_ref') + '<b>' + s.refd + '</b></div></div></div></section>' +
      '</div>';
    v.querySelector('#copySum').onclick = summaryModal;
  }
  function kpi(ic, l, val, sub) { return '<div class="card kpi"><div class="k-l">' + UI.icon(ic) + l + '</div><div class="k-v">' + val + '</div><div class="k-s">' + sub + '</div></div>'; }
  function dailySummary(lang) {
    var all = S.all(), k = T();
    var today = all.filter(function (b) { return b.status === 'confirmed' && b.date === k; });
    var rem = S.all().filter(function (b) { return b.status === 'confirmed' && b.date === reminderDay(); });
    var deps = all.filter(function (b) { return b.deposit && b.deposit.status === 'verified' && S.dateKey(new Date(b.deposit.verifiedAt)) === k; });
    var att = today.filter(function (b) { return b.attendance && b.attendance.value === 'attended'; });
    return t('sum_text', {
      date: S.fmtDate(k, lang), clinic: t('clinicName', null, lang),
      newReq: all.filter(function (b) { return S.dateKey(new Date(b.createdAt)) === k; }).length,
      todayConf: today.length, att: att.length, ns: today.filter(function (b) { return b.attendance && b.attendance.value === 'noshow'; }).length,
      pending: all.filter(function (b) { return b.status === 'pending' || b.status === 'proposed'; }).length,
      depN: deps.length, depAmt: S.money(deps.length * 500, lang), remSent: rem.filter(function (b) { return b.reminder; }).length, remTotal: rem.length,
      rev: S.money(att.reduce(function (s, b) { return s + S.service(b.service).price; }, 0), lang)
    }, lang);
  }
  function summaryModal() {
    var lang = I18N.lang, text = dailySummary(lang);
    UI.copyText(text).then(function () { UI.toast(t('a_copied')); });
    var body = document.createElement('div');
    function draw() { body.innerHTML = '<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="small muted">' + t('m_draft_lang') + '</span><div class="seg"><button data-l="ar" class="' + (lang === 'ar' ? 'on' : '') + '">العربية</button><button data-l="fr" class="' + (lang === 'fr' ? 'on' : '') + '">Français</button></div></div><pre class="summary-pre" id="sumText">' + UI.esc(text) + '</pre>'; }
    draw();
    var m = UI.modal({ title: t('sum_title'), sub: t('a_copied') + ' ✓', body: body, actions: [
      { label: t('a_copy'), cls: 'btn-ghost', icon: 'copy', onClick: function () { UI.copyText(text).then(function () { UI.toast(t('a_copied')); }); } },
      { label: t('share_summary'), cls: 'btn-wa', icon: 'wa', id: 'sumWa', href: 'https://wa.me/?text=' + encodeURIComponent(text) }
    ] });
    body.addEventListener('click', function (e) { var l = e.target.closest('[data-l]'); if (!l) return; lang = l.dataset.l; text = dailySummary(lang); draw(); m.el.querySelector('#sumWa').href = 'https://wa.me/?text=' + encodeURIComponent(text); });
  }

  /* ---------------- views: more ---------------- */
  function viewMore(v) {
    v.innerHTML = '<div class="page-head"><div><h2>' + t('more_title') + '</h2></div></div>' +
      '<section class="card" style="padding:0">' +
        '<a class="more-item" href="book.html" target="_blank"><span class="mi">' + UI.icon('calendar') + '</span><span class="grow"><b>' + t('more_book') + '</b><small>' + t('more_book_d') + '</small></span>' + UI.icon('external') + '</a>' +
        '<a class="more-item" href="share.html"><span class="mi">' + UI.icon('qr') + '</span><span class="grow"><b>' + t('more_share') + '</b><small>' + t('more_share_d') + '</small></span>' + UI.icon('chevron', 'chev') + '</a>' +
        '<button class="more-item" id="langItem"><span class="mi">' + UI.icon('globe') + '</span><span class="grow"><b>' + t('langSwitch') + '</b><small>العربية · Français</small></span></button>' +
        '<button class="more-item" id="switchItem"><span class="mi">' + UI.icon('user') + '</span><span class="grow"><b>' + t('switch_user') + '</b><small>' + S.staffName(app.staff) + ' · ' + t('role_' + staffObj(app.staff).role) + '</small></span>' + UI.icon('logout', 'flip') + '</button>' +
        '<button class="more-item danger" id="resetItem"><span class="mi">' + UI.icon('refresh') + '</span><span class="grow"><b>' + t('more_reset') + '</b><small>' + t('more_reset_d') + '</small></span></button>' +
      '</section>' +
      '<section class="card"><div class="card-title">' + UI.icon('info') + t('more_about') + '</div><p class="small">' + t('more_about_d') + '</p>' +
      '<div class="hitl-note">' + UI.icon('shield') + '<span><b>' + t('tagline') + '</b></span></div></section>';
    v.querySelector('#langItem').onclick = function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); };
    v.querySelector('#switchItem').onclick = function () { localStorage.removeItem(STAFF_KEY); app.staff = null; render(); };
    v.querySelector('#resetItem').onclick = function () {
      UI.modal({ title: t('more_reset'), body: '<p>' + t('more_reset_confirm') + '</p>', actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('more_reset'), cls: 'btn-bad-solid', icon: 'refresh', id: 'resetYes', onClick: function (close) { S.A.reset(app.staff); close(); UI.toast(t('toast_reset')); location.hash = '#/requests/pending'; render(); } }
      ] });
    };
  }

  /* live update when a patient books from book.html in another tab */
  window.addEventListener('storage', function (e) {
    if (e.key !== S.KEY) return;
    var before = S.all().length;
    S.load();
    if (S.all().length > before) UI.toast(t('toast_booked'));
    render();
  });

  parseHash();
  render();
})();

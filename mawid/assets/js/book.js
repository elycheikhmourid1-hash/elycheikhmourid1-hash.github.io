/* AICore Mawʿid — patient booking page (book.html) */
(function () {
  'use strict';
  Store.load();
  var S = Store, $ = function (id) { return document.getElementById(id); };
  var sel = { service: null, date: null, time: null };
  var lastBooking = null;

  function firstAvailableDay() {
    var d = S.todayKey();
    for (var i = 0; i < 14; i++) {
      if (!S.isClosed(d) && S.slotsFor(d).some(function (s) { return !s.taken && !s.past; })) return d;
      d = S.addDays(d, 1);
    }
    return null;
  }

  function renderHeader() {
    $('brand').innerHTML = UI.LOGO + '<div class="grow"><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div>';
    $('langBtn').innerHTML = UI.icon('globe') + '<span>' + t('langSwitch') + '</span>';
    $('clinicLine').innerHTML = UI.icon('tooth') + '<span>' + t('clinicName') + '</span>';
    $('heroTitle').textContent = t('book_title');
    $('heroSub').textContent = t('book_intro');
    document.title = t('product') + ' – ' + t('book_title') + ' · ' + t('clinicShort') + ' (' + t('demoBanner') + ')';
  }

  function renderServices() {
    $('svcGrid').innerHTML = S.SERVICES.map(function (s) {
      return '<button type="button" class="svc' + (sel.service === s.id ? ' sel' : '') + '" data-id="' + s.id + '">' +
        '<span class="svc-ico">' + UI.icon(s.icon) + '</span><b>' + t('svc_' + s.id) + '</b><small>' + t('svc_' + s.id + '_d') + '</small>' +
        '<span class="price">' + S.money(s.price) + '</span></button>';
    }).join('');
  }

  function renderDays() {
    var html = '', d = S.todayKey();
    for (var i = 0; i < 14; i++) {
      var closed = S.isClosed(d);
      var dt = S.parseKey(d);
      var wd = i === 0 ? t('today') : i === 1 ? t('tomorrow') : new Intl.DateTimeFormat(I18N.locale(), { weekday: 'short' }).format(dt);
      html += '<button type="button" class="day' + (closed ? ' closed' : '') + (sel.date === d ? ' sel' : '') + '" data-d="' + d + '"' + (closed ? ' disabled' : '') + '>' +
        '<div class="dw">' + wd + '</div><div class="dn">' + dt.getDate() + '</div><div class="dm">' +
        (closed ? t('closed') : new Intl.DateTimeFormat(I18N.locale(), { month: 'short' }).format(dt)) + '</div></button>';
      d = S.addDays(d, 1);
    }
    $('days').innerHTML = html;
  }

  function renderSlots() {
    var w = $('slotsWrap');
    if (!sel.date) { w.innerHTML = '<p class="muted small">' + t('pick_date_first') + '</p>'; return; }
    var slots = S.slotsFor(sel.date);
    w.innerHTML = '';
    if (!slots.some(function (s) { return !s.taken && !s.past; })) { w.innerHTML = '<p class="muted small">' + t('no_slots') + '</p>'; }
    function group(p, label, ic) {
      return '<div class="period">' + UI.icon(ic) + label + '</div><div class="slots">' + slots.filter(function (s) { return s.period === p; }).map(function (s) {
        var dis = s.taken || s.past;
        if (dis && sel.time === s.time) sel.time = null;
        return '<button type="button" class="slot' + (sel.time === s.time ? ' sel' : '') + '" data-t="' + s.time + '"' + (dis ? ' disabled title="' + t('slot_taken') + '"' : '') + '>' + s.time + '</button>';
      }).join('') + '</div>';
    }
    w.innerHTML += group('m', t('slots_morning'), 'sparkle') + group('e', t('slots_evening'), 'clock') +
      '<div class="slot-legend"><span><i></i>' + (I18N.lang === 'fr' ? 'Libre' : 'متاح') + '</span><span><i class="t"></i>' + t('slot_taken') + '</span><span><i class="s"></i>' + (I18N.lang === 'fr' ? 'Votre choix' : 'اختيارك') + '</span></div>';
  }

  function renderSummary() {
    var parts = [];
    if (sel.service) parts.push('<b>' + t('svc_' + sel.service) + '</b>');
    if (sel.date) parts.push('<span>' + S.fmtDate(sel.date) + '</span>');
    if (sel.time) parts.push('<b class="ltr">' + sel.time + '</b>');
    $('summaryLine').innerHTML = UI.icon('calendar') + (parts.length ? parts.join(' · ') : '<span>' + t('book_intro').split('.')[0] + '</span>');
    $('submitBtn').innerHTML = UI.icon('send', 'flip') + '<span>' + t('submit') + '</span>';
    $('consent').innerHTML = UI.icon('shield') + '<span>' + t('f_consent') + '</span>';
  }

  function renderAll() {
    renderHeader(); I18N.translateDom(); UI.refreshBanner();
    renderServices(); renderDays(); renderSlots(); renderSummary();
    if (lastBooking) renderSuccess(lastBooking);
  }

  function showErr(id, key) { var e = $(id); if (key) { e.textContent = t(key); e.classList.remove('hidden'); } else e.classList.add('hidden'); }

  // events
  $('svcGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.svc'); if (!b) return;
    sel.service = b.dataset.id; renderServices(); renderSummary(); showErr('errService');
  });
  $('days').addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (!b || b.disabled) return;
    sel.date = b.dataset.d; sel.time = null; renderDays(); renderSlots(); renderSummary(); showErr('errDate');
  });
  $('slotsWrap').addEventListener('click', function (e) {
    var b = e.target.closest('.slot'); if (!b || b.disabled) return;
    sel.time = b.dataset.t; renderSlots(); renderSummary(); showErr('errTime');
  });
  $('fPhone').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '').slice(0, 8);
    this.value = v.replace(/(\d{2})(?=\d)/g, '$1 ');
  });
  $('langBtn').addEventListener('click', function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); renderAll(); });

  $('bookForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('fName').value.trim(), phone = $('fPhone').value.replace(/\D/g, ''), ok = true, firstBad = null;
    function bad(id, key, sec) { showErr(id, key); ok = false; if (!firstBad) firstBad = sec; }
    if (!sel.service) bad('errService', 'err_service', 'secService'); else showErr('errService');
    if (!sel.date) bad('errDate', 'err_date', 'secDate'); else showErr('errDate');
    if (!sel.time) bad('errTime', 'err_time', 'secTime'); else showErr('errTime');
    if (name.length < 3) { bad('errName', 'err_name', 'secInfo'); $('fName').classList.add('err'); } else { showErr('errName'); $('fName').classList.remove('err'); }
    if (phone.length !== 8) { bad('errPhone', 'err_phone', 'secInfo'); $('fPhone').classList.add('err'); } else { showErr('errPhone'); $('fPhone').classList.remove('err'); }
    if (!ok) { $(firstBad).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    try {
      lastBooking = S.A.create({ name: name, phone: phone, service: sel.service, date: sel.date, time: sel.time, note: $('fNote').value, deposit: $('fDeposit').checked, lang: I18N.lang });
    } catch (err) {
      sel.time = null; renderSlots(); showErr('errTime', 'err_taken'); $('secTime').scrollIntoView({ behavior: 'smooth' }); return;
    }
    renderSuccess(lastBooking);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function renderSuccess(b) {
    $('formView').classList.add('hidden');
    var v = $('successView'); v.classList.remove('hidden');
    var waText = S.draft('patient_request', b, I18N.lang);
    var merchantColors = { Bankily: '#E4572E', Sedad: '#2A6FDB', Masrvi: '#0E9F6E' };
    v.innerHTML =
      '<section class="card success-hero">' +
        '<div class="success-icon">' + UI.icon('clock') + '</div>' +
        '<h2>' + t('success_title') + '</h2>' +
        '<p id="successMsg">' + t('success_msg') + '</p>' +
        '<div class="ref-box"><small>' + t('your_ref') + '</small><b id="refCode">' + b.ref + '</b></div>' +
      '</section>' +
      '<section class="card"><div class="card-title">' + UI.icon('calendar') + t('summary') + '<span class="chip warn" style="margin-inline-start:auto">' + UI.icon('clock') + t('pending_review') + '</span></div>' +
        '<dl class="kv"><dt>' + t('service') + '</dt><dd>' + t('svc_' + b.service) + '</dd>' +
        '<dt>' + t('step_date') + '</dt><dd>' + S.fmtDate(b.date) + '</dd>' +
        '<dt>' + t('step_time') + '</dt><dd class="ltr">' + b.time + '</dd>' +
        '<dt>' + t('f_name') + '</dt><dd dir="auto">' + UI.esc(b.name) + '</dd>' +
        '<dt>' + t('phone') + '</dt><dd class="ltr">' + S.phoneDisplay(b.phone) + '</dd></dl>' +
        '<a class="btn btn-wa btn-block" style="margin-top:14px" id="waBtn" target="_blank" rel="noopener" href="' + S.waLink(S.CLINIC.waNumber, waText) + '">' + UI.icon('wa') + '<span>' + t('send_wa') + '</span></a>' +
        '<p class="muted tiny" style="margin-top:6px;text-align:center">' + t('wa_hint') + '</p>' +
      '</section>' +
      '<section class="card" id="depositCard"><div class="card-title">' + UI.icon('wallet') + t('deposit_title') + '</div>' +
        '<p class="small" style="margin-bottom:10px">' + t('deposit_body', { amount: '<b>' + S.money(S.CLINIC.depositAmount) + '</b>' }) + '</p>' +
        S.CLINIC.merchants.map(function (m) {
          return '<div class="merchant"><span class="mname"><span class="mlogo" style="background:' + merchantColors[m.name] + '">' + m.name[0] + '</span>' + m.name + '</span>' +
            '<span class="tiny muted">' + t('deposit_merchant') + ' <span class="mnum">' + m.number + '</span></span></div>';
        }).join('') +
        '<div class="dep-row awaiting" style="margin-top:10px"><span class="dep-l">' + UI.icon('note') + t('deposit_ref') + '</span><b class="ltr" style="font-size:16px;letter-spacing:1px">' + b.ref + '</b></div>' +
        '<p class="muted tiny" style="margin-top:8px">' + t('deposit_note') + '</p>' +
      '</section>' +
      '<button class="btn btn-ghost btn-block" style="margin-top:12px" id="againBtn" type="button">' + UI.icon('calendar') + '<span>' + t('book_another') + '</span></button>';
    $('againBtn').addEventListener('click', function () {
      lastBooking = null; sel = { service: null, date: firstAvailableDay(), time: null };
      $('bookForm').reset(); v.classList.add('hidden'); $('formView').classList.remove('hidden'); renderAll(); window.scrollTo(0, 0);
    });
  }

  sel.date = firstAvailableDay();
  var qs = new URLSearchParams(location.search);
  if (qs.get('service')) sel.service = qs.get('service');
  renderAll();
})();

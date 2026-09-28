/* AICore Mawʿid — patient booking page (book.html)
 * Live mode (config.js set): the booking is saved in Supabase through create_booking(); the patient
 * keeps a local copy + secret token to follow its status. Offline/demo mode: localStorage only. */
(function () {
  'use strict';
  Store.load();
  var S = Store, $ = function (id) { return document.getElementById(id); };
  var LIVE = !!(window.API && API.enabled);
  var sel = { service: null, date: null, time: null };
  var lastBooking = null;
  var submitting = false;
  var taken = null; // live mode: { 'YYYY-MM-DD HH:MM': 1 } from the server (null = unknown)

  /* Slots: live mode uses the server's taken slots (no names); demo mode uses the local demo data. */
  function slotsFor(date) {
    if (!LIVE) return S.slotsFor(date);
    var now = new Date();
    return S.SLOTS.map(function (sl) {
      return { time: sl, period: S.MORNING.indexOf(sl) >= 0 ? 'm' : 'e', taken: !!(taken && taken[date + ' ' + sl]), past: S.at(date, sl) <= now };
    });
  }
  function loadTaken() {
    if (!LIVE) return Promise.resolve();
    var from = S.todayKey(), to = S.addDays(from, 14);
    return API.takenSlots(from, to).then(function (rows) {
      taken = {};
      (rows || []).forEach(function (r) { taken[r.appt_date + ' ' + r.appt_time] = 1; });
      if (sel.date && sel.time && taken[sel.date + ' ' + sel.time]) sel.time = null;
      if (!lastBooking) { renderDays(); renderSlots(); renderSummary(); }
    }, function () { /* offline: keep every slot open; the server re-checks on save */ });
  }

  function firstAvailableDay() {
    var d = S.todayKey();
    for (var i = 0; i < 14; i++) {
      if (!S.isClosed(d) && slotsFor(d).some(function (s) { return !s.taken && !s.past; })) return d;
      d = S.addDays(d, 1);
    }
    return null;
  }

  function renderHeader() {
    $('brand').innerHTML = UI.LOGO + '<div class="grow"><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div>';
    $('langBtn').innerHTML = UI.icon('globe') + '<span>' + t('langSwitch') + '</span>';
    var mb = $('myBtn'); if (mb) { var n = Notify.myList().length; mb.setAttribute('aria-label', t('my_bookings')); mb.title = t('my_bookings'); mb.innerHTML = UI.icon('calendar') + '<span class="pill-lbl">' + t('my_bookings') + '</span>' + (n ? '<span class="badge">' + n + '</span>' : ''); }
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
    var slots = slotsFor(sel.date);
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
    $('submitBtn').innerHTML = submitting ? '<span class="spin light"></span><span>' + t('save_saving') + '</span>' : UI.icon('send', 'flip') + '<span>' + t('submit') + '</span>';
    $('submitBtn').disabled = submitting;
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
    if (submitting) return;
    var name = $('fName').value.trim(), phone = $('fPhone').value.replace(/\D/g, ''), ok = true, firstBad = null;
    function bad(id, key, sec) { showErr(id, key); ok = false; if (!firstBad) firstBad = sec; }
    if (!sel.service) bad('errService', 'err_service', 'secService'); else showErr('errService');
    if (!sel.date) bad('errDate', 'err_date', 'secDate'); else showErr('errDate');
    if (!sel.time) bad('errTime', 'err_time', 'secTime'); else showErr('errTime');
    if (name.length < 3) { bad('errName', 'err_name', 'secInfo'); $('fName').classList.add('err'); } else { showErr('errName'); $('fName').classList.remove('err'); }
    if (phone.length !== 8) { bad('errPhone', 'err_phone', 'secInfo'); $('fPhone').classList.add('err'); } else { showErr('errPhone'); $('fPhone').classList.remove('err'); }
    if (!ok) { $(firstBad).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var honey = ($('fWebsite') && $('fWebsite').value) || '';
    var data = { ref: Notify.newRef(), name: name, phone: phone, service: sel.service, date: sel.date, time: sel.time, note: $('fNote').value.trim(), deposit: $('fDeposit').checked, lang: I18N.lang };
    if (!LIVE) {
      var b0;
      try { b0 = S.A.create(data); } catch (err) { return slotTaken(); }
      b0.sync = 'demo';
      return finish(b0, honey);
    }
    if (honey) { // bot: pretend success, store nothing
      return finish(Object.assign({}, data, { createdAt: new Date().toISOString(), status: 'pending', sync: 'demo' }), honey);
    }
    var b = Object.assign({}, data, { token: API.newToken(), createdAt: new Date().toISOString(), status: 'pending', sync: 'pending' });
    submitting = true; renderSummary();
    Notify.myAdd(b);
    Notify.pushOne(b).then(function (res) {
      submitting = false; renderSummary();
      if (res === 'conflict') {
        Notify.myRemove(b.ref);
        if (taken) taken[b.date + ' ' + b.time] = 1;
        return slotTaken();
      }
      b.sync = res === 'saved' ? 'saved' : 'pending';
      finish(b, honey);
    });
  });

  function slotTaken() {
    sel.time = null; renderSlots(); renderSummary(); showErr('errTime', 'err_taken');
    $('secTime').scrollIntoView({ behavior: 'smooth' });
    loadTaken();
  }

  function finish(b, honey) {
    lastBooking = b;
    b.notify = 'sending';
    if (!honey) {
      if (LIVE) Notify.myUpdate(b.ref, { notify: 'sending', sync: b.sync });
      else Notify.myAdd(b);
    }
    renderSuccess(b);
    renderHeader();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    Notify.send(b, honey).then(function (r) {
      b.notify = r.ok ? 'ok' : 'fail';
      if (!honey) Notify.myUpdate(b.ref, { notify: b.notify });
      if (lastBooking === b) renderNotify(b);
    });
    if (b.sync === 'pending') retryLoop(b);
  }

  /* offline at booking time: keep retrying quietly while the page is open */
  function retryLoop(b) {
    var tries = 0;
    (function again() {
      if (lastBooking !== b || tries++ > 20) return;
      setTimeout(function () {
        if (lastBooking !== b) return;
        Notify.pushOne(Notify.myGet(b.ref) || b).then(function (res) {
          if (res === 'saved' || res === 'conflict') { b.sync = res; renderSave(b); if (res === 'conflict') renderSuccess(b); }
          else again();
        });
      }, Math.min(30000, 4000 * tries));
    })();
  }

  function renderSave(b) {
    var el = $('saveLine'); if (!el) return;
    var st = b.sync === 'saved' ? 'ok' : b.sync === 'demo' ? 'demo' : b.sync === 'conflict' ? 'fail' : 'fail';
    el.className = 'notify-line ' + st;
    el.innerHTML = UI.icon(st === 'ok' ? 'check' : st === 'demo' ? 'info' : 'alert') +
      '<span>' + t(b.sync === 'saved' ? 'save_ok' : b.sync === 'demo' ? 'save_demo' : b.sync === 'conflict' ? 'sync_conflict' : 'save_fail') + '</span>';
  }

  function renderNotify(b) {
    var el = $('notifyLine'); if (!el) return;
    var st = b.notify || 'sending';
    el.className = 'notify-line ' + st;
    el.innerHTML = (st === 'sending' ? '<span class="spin"></span>' : UI.icon(st === 'ok' ? 'check' : 'alert')) +
      '<span>' + t(st === 'ok' ? 'notif_ok' : st === 'fail' ? 'notif_fail' : 'notif_sending') + '</span>';
    var wa = $('waOwnerBtn');
    if (wa) wa.classList.toggle('btn-pulse', st === 'fail');
  }

  function renderSuccess(b) {
    $('formView').classList.add('hidden');
    var v = $('successView'); v.classList.remove('hidden');
    var merchantColors = { Bankily: '#E4572E', Sedad: '#2A6FDB', Masrvi: '#0E9F6E' };
    v.innerHTML =
      '<section class="card success-hero">' +
        '<div class="success-icon">' + UI.icon('clock') + '</div>' +
        '<h2>' + t('success_title') + '</h2>' +
        '<p id="successMsg">' + t('success_msg') + '</p>' +
        '<div class="ref-box"><small>' + t('booking_no') + '</small><b id="refCode">' + b.ref + '</b></div>' +
        '<div class="notify-line" id="saveLine" role="status" aria-live="polite"></div>' +
        '<div class="notify-line sending" id="notifyLine" role="status" aria-live="polite"></div>' +
      '</section>' +
      '<section class="card trk-card" id="trackCard"><div class="card-title">' + UI.icon('calendar') + t('summary') + '<span style="margin-inline-start:auto">' + Notify.statusChip(b) + '</span></div>' +
        Notify.trackerHtml(b) +
        Notify.detailsHtml(b) +
        '<a class="btn btn-wa btn-block" style="margin-top:14px" id="waOwnerBtn" target="_blank" rel="noopener" href="' + Notify.waOwnerLink(b) + '">' + UI.icon('wa') + '<span>' + t('send_wa_owner') + '</span></a>' +
        '<p class="muted tiny" style="margin-top:6px;text-align:center">' + t('wa_hint') + '</p>' +
        '<a class="btn btn-soft btn-block" style="margin-top:10px" id="myLink" href="mes-rendez-vous.html">' + UI.icon('calendar') + '<span>' + t('view_my') + '</span></a>' +
        '<p class="muted tiny" style="margin-top:8px;text-align:center">' + t(LIVE ? 'trk_live_note' : 'trk_offline_note') + '</p>' +
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
    renderSave(b);
    renderNotify(b);
    $('againBtn').addEventListener('click', function () {
      lastBooking = null; sel = { service: null, date: firstAvailableDay(), time: null };
      $('bookForm').reset(); v.classList.add('hidden'); $('formView').classList.remove('hidden'); renderAll(); window.scrollTo(0, 0);
    });
  }

  sel.date = firstAvailableDay();
  var qs = new URLSearchParams(location.search);
  if (qs.get('service') && S.SERVICES.some(function (x) { return x.id === qs.get('service'); })) sel.service = qs.get('service');
  renderAll();
  loadTaken();
  if (LIVE) Notify.syncPending();
})();

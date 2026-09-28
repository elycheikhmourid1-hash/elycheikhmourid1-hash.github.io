/* AICore Mawʿid — "Mes rendez-vous / مواعيدي": the patient's bookings saved on this phone.
 * Live mode: statuses are refreshed from the clinic's server (get_bookings with the secret token)
 * every few seconds while the page is visible. Offline: last known state from localStorage. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var LIVE = !!(window.API && API.enabled);
  var POLL = Math.max(5000, (window.MAWID_CONFIG && MAWID_CONFIG.pollPatientMs) || 15000);
  var net = { state: LIVE ? 'loading' : 'demo', at: null }; // loading | ok | offline | demo
  var flash = {};
  var timer = null;

  function renderHeader() {
    $('brand').innerHTML = '<a href="book.html" class="brand-link">' + UI.LOGO + '<div class="grow"><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div></a>';
    $('langBtn').innerHTML = UI.icon('globe') + '<span>' + t('langSwitch') + '</span>';
    $('clinicLine').innerHTML = UI.icon('tooth') + '<span>' + t('clinicName') + '</span>';
    $('heroTitle').textContent = t('my_bookings_title');
    $('heroSub').textContent = t('my_bookings_intro');
    document.title = t('product') + ' – ' + t('my_bookings_title') + ' · ' + t('clinicShort');
  }

  function hm(d) { return Store.pad(d.getHours()) + ':' + Store.pad(d.getMinutes()); }
  function syncBar() {
    if (!LIVE) return '<div class="sync-bar demo">' + UI.icon('info') + '<span>' + t('trk_offline_note') + '</span></div>';
    if (net.state === 'offline') return '<div class="sync-bar off" role="status">' + UI.icon('alert') + '<span>' + t('sync_offline') + '</span>' +
      '<button class="btn btn-sm btn-ghost" type="button" data-refresh>' + UI.icon('refresh') + '<span>' + t('refresh') + '</span></button></div>';
    return '<div class="sync-bar ok" role="status"><span class="live-dot"></span><span>' + t('sync_live') + (net.at ? ' · ' + t('sync_updated', { time: '<b class="ltr">' + hm(net.at) + '</b>' }) : '') + '</span>' +
      '<button class="icon-btn" type="button" data-refresh title="' + UI.esc(t('refresh')) + '" aria-label="' + UI.esc(t('refresh')) + '">' + UI.icon('refresh') + '</button></div>';
  }

  function card(b) {
    var created = b.createdAt ? Store.fmtStamp(b.createdAt) : '';
    var k = Notify.statusKey(b);
    return '<section class="card trk-card st-' + k + (flash[b.ref] ? ' flash' : '') + '" data-ref="' + UI.esc(b.ref) + '">' +
      '<div class="my-head"><div class="grow"><div class="my-sub">' + t('booking_no') + '</div><div class="my-ref">' + UI.esc(b.ref) + '</div></div>' +
        Notify.statusChip(b) + '</div>' +
      Notify.trackerHtml(b) +
      Notify.extraHtml(b) +
      (b.sync === 'pending' ? '<div class="sync-note">' + UI.icon('alert') + '<span>' + t('sync_local') + '</span></div>' : '') +
      Notify.detailsHtml(b) +
      (created ? '<p class="muted tiny" style="margin-top:10px">' + UI.icon('send', 'flip') + ' ' + t('booked_on') + ' · ' + created + '</p>' : '') +
      '<div class="my-actions">' +
        (k === 'rejected' || b.sync === 'conflict' ? '<a class="btn btn-primary btn-sm" href="book.html">' + UI.icon('calendar') + '<span>' + t('book_another') + '</span></a>' : '') +
        '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + Notify.waOwnerLink(b) + '">' + UI.icon('wa') + '<span>' + t('send_wa_owner') + '</span></a>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-remove="' + UI.esc(b.ref) + '">' + UI.icon('x') + '<span>' + t('remove') + '</span></button>' +
      '</div>' +
    '</section>';
  }

  function findCard() {
    if (!LIVE) return '';
    return '<details class="card find-card"' + (Notify.myList().length ? '' : ' open') + '><summary class="card-title">' + UI.icon('search') + t('find_title') + '</summary>' +
      '<form id="findForm" novalidate><p class="muted small" style="margin-bottom:10px">' + t('find_body') + '</p>' +
      '<label class="field"><span class="label">' + t('booking_no') + '</span><input class="input ltr-input" id="findRef" autocomplete="off" autocapitalize="characters" maxlength="10" placeholder="' + t('find_ref_ph') + '"></label>' +
      '<label class="field"><span class="label">' + t('f_phone') + '</span><div class="phone-group"><span class="prefix">+222</span><input class="input" id="findPhone" inputmode="numeric" maxlength="11" placeholder="00 00 00 00"></div></label>' +
      '<div class="err-msg hidden" id="findErr"></div>' +
      '<button class="btn btn-soft btn-block" style="margin-top:12px" type="submit" id="findBtn">' + UI.icon('search') + '<span>' + t('find_btn') + '</span></button></form></details>';
  }

  function render() {
    renderHeader(); I18N.translateDom(); UI.refreshBanner();
    var list = Notify.myList();
    var v = $('listView');
    var openFind = v.querySelector('.find-card[open]') ? true : null;
    if (!list.length) {
      v.innerHTML = syncBar() + '<section class="card my-empty">' + UI.icon('calendar') + '<p style="font-weight:700">' + t('my_empty') + '</p>' +
        '<a class="btn btn-primary btn-block" style="margin-top:14px" href="book.html">' + UI.icon('calendar') + '<span>' + t('my_book_now') + '</span></a></section>' + findCard();
    } else {
      v.innerHTML = syncBar() + list.map(card).join('') +
        '<p class="muted tiny" style="margin-top:12px;text-align:center">' + UI.icon('info') + ' ' + t(LIVE ? 'trk_live_note' : 'trk_offline_note') + '</p>' +
        '<a class="btn btn-ghost btn-block" style="margin-top:12px" href="book.html">' + UI.icon('calendar') + '<span>' + t('book_another') + '</span></a>' + findCard();
    }
    if (openFind) { var d = v.querySelector('.find-card'); if (d) d.open = true; }
    flash = {};
  }

  function refresh() {
    if (!LIVE) return Promise.resolve();
    clearTimeout(timer);
    return Notify.refreshStatuses().then(function (r) {
      net.state = r.ok ? 'ok' : 'offline';
      if (r.ok) net.at = new Date();
      (r.changed || []).forEach(function (ref) { flash[ref] = 1; });
      var busy = document.activeElement && document.activeElement.closest && document.activeElement.closest('#findForm');
      if (!busy) render(); else { var sb = document.querySelector('.sync-bar'); if (sb) sb.outerHTML = syncBar(); }
      schedule();
    });
  }
  function schedule() { clearTimeout(timer); if (!document.hidden) timer = setTimeout(refresh, POLL); }

  $('listView').addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove]');
    if (b) { if (window.confirm(t('remove_confirm'))) { Notify.myRemove(b.getAttribute('data-remove')); render(); } return; }
    if (e.target.closest('[data-refresh]')) refresh();
  });
  $('listView').addEventListener('input', function (e) {
    if (e.target.id === 'findPhone') { var v = e.target.value.replace(/\D/g, '').slice(0, 8); e.target.value = v.replace(/(\d{2})(?=\d)/g, '$1 '); }
    if (e.target.id === 'findRef') { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); }
  });
  $('listView').addEventListener('submit', function (e) {
    if (e.target.id !== 'findForm') return;
    e.preventDefault();
    var ref = $('findRef').value.trim().toUpperCase(), phone = $('findPhone').value.replace(/\D/g, ''), err = $('findErr');
    if (/^[A-Z0-9]{6}$/.test(ref)) ref = 'RDV-' + ref;
    function fail(k) { err.textContent = t(k); err.classList.remove('hidden'); }
    if (!/^RDV-[A-Z0-9]{6}$/.test(ref) || phone.length !== 8) return fail('find_notfound');
    $('findBtn').disabled = true;
    API.getBookings([{ ref: ref, phone: phone }]).then(function (rows) {
      $('findBtn').disabled = false;
      if (!rows || !rows[0]) return fail('find_notfound');
      var r = rows[0];
      Notify.myAdd(Object.assign({ ref: r.ref, token: '', phone: r.phone, name: r.name, service: r.service, lang: r.lang, note: r.note, createdAt: r.created_at, notify: 'ok' }, Notify.fromServer(r)));
      flash[r.ref] = 1; net.state = 'ok'; net.at = new Date();
      render(); UI.toast(t('find_ok'));
    }, function () { $('findBtn').disabled = false; fail('find_offline'); });
  });
  $('langBtn').addEventListener('click', function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); });
  window.addEventListener('storage', function (e) { if (e.key === Notify.CFG.myKey) render(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); else clearTimeout(timer); });
  window.addEventListener('online', refresh);
  render();
  refresh();
})();

/* AICore Mawʿid — "Mes rendez-vous / مواعيدي": the patient's bookings saved on this device (localStorage) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function renderHeader() {
    $('brand').innerHTML = '<a href="book.html" style="display:contents;color:inherit;text-decoration:none">' + UI.LOGO + '<div class="grow"><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div></a>';
    $('langBtn').innerHTML = UI.icon('globe') + '<span>' + t('langSwitch') + '</span>';
    $('clinicLine').innerHTML = UI.icon('tooth') + '<span>' + t('clinicName') + '</span>';
    $('heroTitle').textContent = t('my_bookings_title');
    $('heroSub').textContent = t('my_bookings_intro');
    document.title = t('product') + ' – ' + t('my_bookings_title') + ' · ' + t('clinicShort') + ' (' + t('demoBanner') + ')';
  }

  function card(b) {
    var created = b.createdAt ? Store.fmtStamp(b.createdAt) : '';
    return '<section class="card trk-card" data-ref="' + UI.esc(b.ref) + '">' +
      '<div class="my-head"><div class="grow"><div class="my-sub">' + t('booking_no') + '</div><div class="my-ref">' + UI.esc(b.ref) + '</div></div>' +
        '<span class="chip warn">' + UI.icon('clock') + t('trk_plan') + '</span></div>' +
      Notify.trackerHtml(b.step || 1) +
      Notify.detailsHtml(b) +
      (created ? '<p class="muted tiny" style="margin-top:10px">' + UI.icon('send', 'flip') + ' ' + t('booked_on') + ' · ' + created + '</p>' : '') +
      '<div class="my-actions">' +
        '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + Notify.waOwnerLink(b) + '">' + UI.icon('wa') + '<span>' + t('send_wa_owner') + '</span></a>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-remove="' + UI.esc(b.ref) + '">' + UI.icon('x') + '<span>' + t('remove') + '</span></button>' +
      '</div>' +
    '</section>';
  }

  function render() {
    renderHeader(); I18N.translateDom(); UI.refreshBanner();
    var list = Notify.myList();
    var v = $('listView');
    if (!list.length) {
      v.innerHTML = '<section class="card my-empty">' + UI.icon('calendar') + '<p style="font-weight:700">' + t('my_empty') + '</p>' +
        '<a class="btn btn-primary btn-block" style="margin-top:14px" href="book.html">' + UI.icon('calendar') + '<span>' + t('my_book_now') + '</span></a></section>';
      return;
    }
    v.innerHTML = list.map(card).join('') +
      '<p class="muted tiny" style="margin-top:12px;text-align:center">' + UI.icon('info') + ' ' + t('trk_offline_note') + '</p>' +
      '<a class="btn btn-ghost btn-block" style="margin-top:12px" href="book.html">' + UI.icon('calendar') + '<span>' + t('book_another') + '</span></a>';
  }

  $('listView').addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove]'); if (!b) return;
    if (window.confirm(t('remove_confirm'))) { Notify.myRemove(b.getAttribute('data-remove')); render(); }
  });
  $('langBtn').addEventListener('click', function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); });
  window.addEventListener('storage', function (e) { if (e.key === Notify.CFG.myKey) render(); });
  render();
})();

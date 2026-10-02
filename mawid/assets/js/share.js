/* AICore Mawʿid — printable QR poster (share.html). QR generated client-side (qrcode-generator, MIT). */
(function () {
  'use strict';
  var S = Store, $ = function (id) { return document.getElementById(id); };
  var URL_KEY = 'mawid_public_url';
  var defaultUrl = location.href.replace(/share\.html.*$/, 'book.html').split('#')[0];
  var bookUrl = localStorage.getItem(URL_KEY) || defaultUrl;
  var mode = 'book';
  function waText() { return 'السلام عليكم، أريد حجز موعد في عيادة الأمل\nBonjour, je souhaite prendre rendez-vous (clinique Al Amal)'; }
  function waUrl() { return S.waLink(S.CLINIC.waNumber, waText()); }

  function qrSvg(text) {
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var q = qrcode(0, 'Q'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace('<path ', '<path fill="#1e1240" ');
  }

  function render() {
    I18N.applyDir(); UI.refreshBanner();
    document.title = t('product') + ' – ' + t('more_share') + ' (' + t('demoBanner') + ')';
    var target = mode === 'book' ? bookUrl : waUrl();
    $('controls').innerHTML =
      '<div class="row" style="justify-content:space-between;margin-bottom:12px"><a class="btn btn-ghost btn-sm" href="' + (/\/mawid\/(index\.html)?([?#]|$)/.test(document.referrer || '') ? 'index.html' : 'demo.html#/more') + '">' + UI.icon('chevron', 'back') + '<span>' + t('share_back') + '</span></a>' +
      '<div class="row"><button class="btn btn-ghost btn-sm" id="langBtn">' + UI.icon('globe') + '<span>' + t('langSwitch') + '</span></button>' +
      '<button class="btn btn-primary btn-sm" id="printBtn">' + UI.icon('print') + '<span>' + t('share_print') + '</span></button></div></div>' +
      '<section class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><b class="small">' + t('share_mode') + '</b>' +
      '<div class="seg"><button data-m="book" class="' + (mode === 'book' ? 'on' : '') + '">' + t('share_mode_book') + '</button><button data-m="wa" class="' + (mode === 'wa' ? 'on' : '') + '">' + t('share_mode_wa') + '</button></div></div>' +
      '<label class="field" style="margin-top:10px"><span class="label small">' + t('share_link_label') + '</span><input class="input" id="urlIn" dir="ltr" value="' + UI.esc(bookUrl) + '"></label>' +
      '<p class="tiny muted" style="margin-top:4px">' + t('share_url_hint') + '</p></section>';

    $('poster').innerHTML =
      '<div class="demo-stamp">DÉMO · تجريبي</div>' +
      '<div class="poster-top">' + UI.LOGO + '<h1>عيادة الأمل لطب الأسنان</h1><div class="fr">Clinique dentaire Al Amal</div><span class="city">نواكشوط · Nouakchott</span></div>' +
      '<div class="poster-body">' +
        '<div class="poster-title">احجز موعدك عبر واتساب</div><div class="poster-title-fr">Prenez rendez-vous sur WhatsApp</div>' +
        '<div class="qr-box" id="qrBox" title="' + UI.esc(target) + '">' + qrSvg(target) + '</div>' +
        '<div class="qr-cap">امسح الرمز بكاميرا هاتفك<span class="fr">Scannez le code avec l’appareil photo</span></div>' +
        '<div class="p-steps">' +
          '<div class="p-step"><span class="n">1</span><b>امسح الرمز</b><small>Scannez</small></div>' +
          '<div class="p-step"><span class="n">2</span><b>اختر الخدمة والوقت</b><small>Choisissez l’heure</small></div>' +
          '<div class="p-step"><span class="n">3</span><b>نؤكد لك على واتساب</b><small>Confirmation WhatsApp</small></div>' +
        '</div>' +
        '<div class="p-contact"><div class="l">أو راسلنا مباشرة · <span dir="ltr">ou écrivez-nous</span></div>' +
          '<div class="num">' + UI.icon('wa') + S.CLINIC.phoneDisplay + '</div><div class="link">wa.me/' + S.CLINIC.waNumber + '</div></div>' +
        '<div class="p-hours">' + t('clinicHours', null, 'ar') + '<span class="fr">' + t('clinicHours', null, 'fr') + '</span></div>' +
        '<div class="p-human">' + UI.icon('shield') + '<span>كل موعد يؤكده موظف من العيادة · <span dir="ltr">Chaque RDV est confirmé par l’équipe</span></span></div>' +
      '</div>' +
      '<div class="poster-foot"><span><b>AICore موعد</b> · by AICore Digital · aicoredigital.com</span><span>نموذج تجريبي – بيانات وهمية · Démo – données fictives</span></div>';

    $('links').innerHTML = '<section class="card"><div class="card-title">' + UI.icon('wa') + t('share_wa_label') + '</div>' +
      '<div class="linkbox"><input class="input" readonly id="waLinkIn" value="' + UI.esc(waUrl()) + '"><button class="btn btn-ghost btn-sm" data-copy="waLinkIn">' + UI.icon('copy') + '</button>' +
      '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + UI.esc(waUrl()) + '">' + UI.icon('external') + '</a></div>' +
      '<div class="card-title" style="margin-top:14px">' + UI.icon('calendar') + t('share_link_label') + '</div>' +
      '<div class="linkbox"><input class="input" readonly id="bookLinkIn" value="' + UI.esc(bookUrl) + '"><button class="btn btn-ghost btn-sm" data-copy="bookLinkIn">' + UI.icon('copy') + '</button>' +
      '<a class="btn btn-soft btn-sm" target="_blank" href="' + UI.esc(bookUrl) + '">' + UI.icon('external') + '</a></div></section>' +
      '<footer class="footer"><div class="tagline">' + t('tagline') + '</div><div><b>AICore موعد</b> · ' + t('footer') + '</div></footer>';
    bind();
  }
  function bind() {
    $('langBtn').onclick = function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); };
    $('printBtn').onclick = function () { window.print(); };
    document.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; render(); }; });
    $('urlIn').onchange = function () { bookUrl = this.value.trim() || defaultUrl; localStorage.setItem(URL_KEY, bookUrl); render(); };
    document.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { UI.copyText($(b.dataset.copy).value).then(function () { UI.toast(t('a_copied')); }); }; });
  }
  render();
})();

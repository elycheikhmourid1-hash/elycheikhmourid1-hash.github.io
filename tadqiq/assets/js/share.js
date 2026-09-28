/* AICore Tadqiq — printable QR poster (share.html). QR generated client-side (qrcode-generator, MIT). No network calls. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var URL_KEY = 'tadqiq_public_url';
  var DEFAULT_URL = 'https://elycheikhmourid1-hash.github.io/tadqiq/';
  var demoUrl = localStorage.getItem(URL_KEY) || DEFAULT_URL;

  function qrSvg(text) {
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var q = qrcode(0, 'Q'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace('<path ', '<path fill="#052B38" ');
  }

  function render() {
    I18N.applyDir(); UI.refreshBanner();
    document.title = t('product') + ' – ' + t('share_title') + ' (' + t('demoBanner') + ')';
    $('controls').innerHTML =
      '<div class="row" style="justify-content:space-between;margin-bottom:12px"><a class="btn btn-ghost btn-sm" href="index.html#/more">' + UI.icon('chevron', 'back') + '<span>' + t('share_back') + '</span></a>' +
      '<div class="row"><button class="btn btn-ghost btn-sm" id="langBtn">' + UI.icon('globe') + '<span>' + t('langSwitch') + '</span></button>' +
      '<button class="btn btn-primary btn-sm" id="printBtn">' + UI.icon('print') + '<span>' + t('share_print') + '</span></button></div></div>' +
      '<section class="card"><div class="card-title">' + UI.icon('qr') + t('share_title') + '</div>' +
      '<label class="field"><span class="label small">' + t('share_link_label') + '</span><input class="input" id="urlIn" dir="ltr" value="' + UI.esc(demoUrl) + '"></label>' +
      '<p class="tiny muted" style="margin-top:4px">' + t('share_url_hint') + '</p></section>';

    $('poster').innerHTML =
      '<div class="demo-stamp">DÉMO · تجريبي</div>' +
      '<div class="poster-top">' + UI.LOGO + '<h1>AICore تدقيق</h1><div class="fr">AICore Instruction</div><span class="city">مكتب مراجعة ملفات العملاء والقروض تحت إشراف بشري</span></div>' +
      '<div class="poster-body">' +
        '<div class="poster-title">جرّب النموذج على هاتفك</div><div class="poster-title-fr">Essayez la démo sur votre téléphone</div>' +
        '<div class="qr-box" id="qrBox" title="' + UI.esc(demoUrl) + '">' + qrSvg(demoUrl) + '</div>' +
        '<div class="qr-cap">امسح الرمز بكاميرا هاتفك<span class="fr">Scannez le code avec l’appareil photo</span></div>' +
        '<div class="p-steps">' +
          '<div class="p-step"><span class="n">1</span><b>النظام يقرأ الملف</b><small>Le système lit le dossier</small></div>' +
          '<div class="p-step"><span class="n">2</span><b>يُظهر التنبيهات ويُعدّ المسودات</b><small>Il signale et prépare</small></div>' +
          '<div class="p-step"><span class="n">3</span><b>موظفك يقرّر</b><small>Votre agent décide</small></div>' +
        '</div>' +
        '<div class="p-contact"><div class="l">مؤسسة وهمية للعرض · <span dir="ltr">institution fictive</span></div>' +
          '<div class="num" style="font-size:17px;letter-spacing:0">' + UI.icon('building') + '<span>مؤسسة المثال للتمويل الأصغر</span></div><div class="link">Al Mithal Microfinance – Nouakchott (fictive)</div></div>' +
        '<div class="p-hours">يعمل على خوادم المؤسسة نفسها · النموذج يعمل في المتصفح ببيانات وهمية<span class="fr">Hébergé sur les serveurs de l’institution · la démo tourne dans le navigateur avec des données fictives</span></div>' +
        '<div class="p-human">' + UI.icon('shield') + '<span>النظام يرتّب، وموظفك يقرّر · <span dir="ltr">Le système prépare, votre agent décide</span></span></div>' +
      '</div>' +
      '<div class="poster-foot"><span><b>AICore تدقيق</b> · by AICore Digital · aicoredigital.com</span><span>نموذج تجريبي – بيانات وهمية · Démo – données fictives</span></div>';

    $('links').innerHTML = '<section class="card"><div class="card-title">' + UI.icon('external') + t('share_link_label') + '</div>' +
      '<div class="linkbox"><input class="input" readonly id="demoLinkIn" value="' + UI.esc(demoUrl) + '"><button class="btn btn-ghost btn-sm" data-copy="demoLinkIn" title="' + t('share_copy') + '">' + UI.icon('copy') + '</button></div>' +
      '<p class="tiny muted" style="margin-top:8px">' + t('share_url_hint') + '</p></section>' +
      '<footer class="footer"><div class="tagline">' + t('tagline') + '</div><div><b>' + t('product') + '</b> · ' + t('footer') + '</div></footer>';
    bind();
  }
  function bind() {
    $('langBtn').onclick = function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); };
    $('printBtn').onclick = function () { window.print(); };
    $('urlIn').onchange = function () { demoUrl = this.value.trim() || DEFAULT_URL; localStorage.setItem(URL_KEY, demoUrl); render(); };
    document.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { UI.copyText($(b.dataset.copy).value).then(function () { UI.toast(t('a_copied')); }); }; });
  }
  render();
})();

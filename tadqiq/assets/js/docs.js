/* AICore Tadqiq — generated SPECIMEN documents (HTML/SVG). Not images of real documents. */
(function (global) {
  'use strict';
  var C = Core, esc = function (s) { return UI.esc(s); };
  var WM = '<div class="wm" aria-hidden="true">' + new Array(7).join('<span>SPECIMEN – نموذج</span>') + '</div>';
  var STAMP = function (txt) { return '<div class="stamp"><span>' + txt + '</span><b>SPECIMEN</b></div>'; };
  var SIG = '<svg class="sig" viewBox="0 0 120 40" aria-hidden="true"><path d="M6 28c10-18 18-20 20-8s-6 14 2 6 14-22 18-10-4 16 6 8 12-14 18-8 4 10 14 4 14-6 30-4" fill="none" stroke="#1F3FA0" stroke-width="2" stroke-linecap="round"/></svg>';
  var PHOTO = '<svg viewBox="0 0 60 72" aria-hidden="true"><rect width="60" height="72" fill="#DDE7EA"/><circle cx="30" cy="27" r="13" fill="#9FB3BA"/><path d="M6 72c2-16 12-24 24-24s22 8 24 24z" fill="#9FB3BA"/></svg>';
  var EMBLEM = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="#0A6E57" stroke-width="2" stroke-dasharray="3 2"/><circle cx="20" cy="20" r="11" fill="#E4F1EA" stroke="#0A6E57" stroke-width="1.5"/><text x="20" y="23.5" font-size="8" text-anchor="middle" fill="#0A6E57" font-family="Cairo">نموذج</text></svg>';

  function H(hl) { return function (k) { return hl && hl.indexOf(k) >= 0 ? ' hl' : ''; }; }

  function idCard(f, d, hl) {
    var h = H(hl), mrzName = (d.nameLat || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z ]/g, '').split(' ').join('<');
    return '<div class="paper idcard" dir="rtl">' + WM +
      '<div class="id-top"><div class="id-ar">الجمهورية الإسلامية الموريتانية<b>بطاقة التعريف الوطنية</b></div><div class="id-emb">' + EMBLEM + '</div>' +
      '<div class="id-fr" dir="ltr">République Islamique de Mauritanie<b>Carte d’identité nationale</b></div></div>' +
      '<div class="id-body"><div class="id-photo">' + PHOTO + '<span>SPECIMEN</span></div><div class="id-fields">' +
        '<div class="idf' + h('id.name') + '"><small>الاسم الكامل · Nom et prénom</small><b>' + esc(d.nameAr) + '</b><span dir="ltr">' + esc(d.nameLat) + '</span></div>' +
        '<div class="idf-row"><div class="idf' + h('id.dob') + '"><small>تاريخ الميلاد · Né(e) le</small><b dir="ltr">' + C.fmtD(d.dob) + '</b></div><div class="idf"><small>مكان الميلاد · Lieu</small><b>' + esc(d.pob.ar) + '</b></div><div class="idf"><small>الجنس · Sexe</small><b>' + (d.sex === 'F' ? 'أنثى · F' : 'ذكر · M') + '</b></div></div>' +
        '<div class="idf-row"><div class="idf' + h('id.issue') + '"><small>تاريخ الإصدار · Délivrée le</small><b dir="ltr">' + C.fmtD(d.issue) + '</b></div><div class="idf' + h('id.expiry') + '"><small>صالحة حتى · Expire le</small><b dir="ltr">' + C.fmtD(d.expiry) + '</b></div></div>' +
      '</div></div>' +
      '<div class="id-nni idf' + h('id.nni') + '"><small>الرقم الوطني للتعريف · NNI</small><b dir="ltr">' + esc(d.nni) + '</b></div>' +
      '<div class="id-mrz" dir="ltr">IDMRT' + esc(d.nni) + '&lt;&lt;SPECIMEN&lt;&lt;&lt;&lt;&lt;&lt;<br>' + esc(mrzName).replace(/</g, '&lt;') + '&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>' +
    '</div>';
  }

  function payslip(f, d, hl) {
    var h = H(hl), base = Math.round(d.gross * 0.8), transp = Math.round(d.gross * 0.1), prime = d.gross - base - transp;
    var cnss = Math.round(d.gross * 0.01), its = d.gross - d.net - cnss;
    var fm = function (n) { return C.money(n, 'fr').replace(' MRU', ''); };
    return '<div class="paper a4" dir="ltr">' + WM +
      '<div class="ps-head"><div><b class="org">' + esc(d.employer.fr) + '</b><small>Nouakchott – adresse fictive · NIF 00000000</small></div><div class="ps-title">BULLETIN DE PAIE<small dir="rtl">كشف الراتب</small></div></div>' +
      '<div class="ps-period' + h('payslip.period') + '">Période : <b>' + C.monthLabel(d.period, 'fr') + '</b></div>' +
      '<table class="kvt"><tr class="' + h('payslip.name') + '"><th>Nom et prénom</th><td>' + esc(d.nameLat) + '</td></tr>' +
        '<tr><th>Matricule</th><td>' + esc(d.matricule) + '</td></tr><tr class="' + h('payslip.nni') + '"><th>NNI</th><td>' + esc(d.nni) + '</td></tr>' +
        '<tr><th>Emploi</th><td>' + esc(d.position) + '</td></tr><tr class="' + h('payslip.hire') + '"><th>Date d’embauche</th><td>' + C.fmtD(d.hireDate) + '</td></tr></table>' +
      '<table class="lines"><thead><tr><th>Rubrique</th><th>Gains</th><th>Retenues</th></tr></thead><tbody>' +
        '<tr><td>Salaire de base</td><td>' + fm(base) + '</td><td></td></tr><tr><td>Indemnité de transport</td><td>' + fm(transp) + '</td><td></td></tr><tr><td>Prime de rendement</td><td>' + fm(prime) + '</td><td></td></tr>' +
        '<tr class="sub"><td>Salaire brut</td><td>' + fm(d.gross) + '</td><td></td></tr><tr><td>Cotisation sociale (fictive)</td><td></td><td>' + fm(cnss) + '</td></tr><tr><td>Impôt sur salaire (fictif)</td><td></td><td>' + fm(its) + '</td></tr>' +
      '</tbody><tfoot><tr class="' + h('payslip.net') + '"><td>NET À PAYER</td><td colspan="2">' + C.money(d.net, 'fr') + '</td></tr></tfoot></table>' +
      '<div class="ps-foot"><small>Document généré pour démonstration – aucune valeur.</small>' + STAMP(esc(d.employer.fr.replace(/\s*\(.*\)/, ''))) + '</div>' +
    '</div>';
  }

  function incomeCert(f, d, hl) {
    var h = H(hl), fem = f.applicant.gender === 'F';
    return '<div class="paper a4" dir="rtl">' + WM +
      '<div class="ic-head"><b class="org">' + esc(d.issuer.ar) + '</b><small dir="ltr">' + esc(d.issuer.fr) + '</small></div>' +
      '<div class="doc-title">شهادة دخل<small dir="ltr">Attestation de revenus</small></div>' +
      '<p class="ic-body">نشهد نحن ' + esc(d.issuer.ar) + ' بأن ' + (fem ? 'السيدة' : 'السيد') + ' <span class="fv' + h('incomeCert.name') + '">' + esc(d.nameAr) + '</span>، ' + (fem ? 'الحاملة' : 'الحامل') + ' للرقم الوطني <span class="fv" dir="ltr">' + esc(f.applicant.nni) + '</span>، ' + (fem ? 'تمارس' : 'يمارس') + ' نشاط <span class="fv">' + esc(d.activity.ar) + '</span> منذ <span class="fv' + h('incomeCert.hire') + '" dir="ltr">' + C.fmtD(d.since) + '</span>، وأن ' + (fem ? 'دخلها' : 'دخله') + ' الشهري الصافي يقدَّر بـ <span class="fv' + h('incomeCert.net') + '">' + C.money(d.net, 'ar') + '</span>.</p>' +
      '<p class="ic-body small">سُلّمت هذه الشهادة بطلب من المعني للإدلاء بها عند الحاجة.</p>' +
      '<div class="ic-foot"><div class="' + h('incomeCert.date').trim() + ' fv-date">حُرّر في نواكشوط بتاريخ <b dir="ltr">' + C.fmtD(d.date) + '</b></div>' + STAMP('ختم وهمي') + '</div>' +
    '</div>';
  }

  function statement(f, d, hl) {
    var h = H(hl), bal = d.opening, rows = '', cr = 0, db = 0;
    var fm = function (n) { return C.money(n, 'fr').replace(' MRU', ''); };
    d.tx.forEach(function (x) {
      bal += x.amt; if (x.amt > 0) cr += x.amt; else db -= x.amt;
      rows += '<tr class="' + (x.cash ? 'cash' : '') + h('statement.tx.' + x.d + '.' + x.amt) + '"><td>' + C.fmtD(x.d) + '</td><td>' + esc(x.fr) + (x.cash ? ' <i class="esp">ESP</i>' : '') + '</td><td>' + (x.amt < 0 ? fm(-x.amt) : '') + '</td><td>' + (x.amt > 0 ? fm(x.amt) : '') + '</td></tr>';
    });
    return '<div class="paper a4" dir="ltr">' + WM +
      '<div class="ps-head"><div><b class="org">' + esc(d.provider.fr) + '</b><small dir="rtl">' + esc(d.provider.ar) + '</small></div><div class="ps-title">RELEVÉ DE COMPTE<small dir="rtl">كشف حساب</small></div></div>' +
      '<table class="kvt"><tr class="' + h('statement.name') + '"><th>Titulaire</th><td>' + esc(d.nameLat) + '</td></tr><tr><th>N° de compte</th><td>' + esc(d.account) + '</td></tr>' +
        '<tr><th>Période</th><td>' + C.fmtD(d.from) + ' → ' + C.fmtD(d.to) + '</td></tr><tr class="' + h('statement.issued') + '"><th>Édité le</th><td>' + C.fmtD(d.issuedOn) + '</td></tr></table>' +
      '<table class="lines tx"><thead><tr><th>Date</th><th>Libellé</th><th>Débit</th><th>Crédit</th></tr></thead><tbody>' +
        '<tr class="sub"><td></td><td>Solde initial</td><td></td><td>' + fm(d.opening) + '</td></tr>' + rows +
      '</tbody><tfoot><tr><td></td><td>Totaux / Solde final</td><td>' + fm(db) + '</td><td>' + fm(bal) + '</td></tr></tfoot></table>' +
      '<div class="ps-foot"><small>ESP = versement en espèces · Relevé fictif généré pour la démo.</small></div>' +
    '</div>';
  }

  function application(f, d, hl) {
    var h = H(hl), loan = f.type === 'loan', a = f.applicant;
    function box(lab, val, key, ltr) { return '<div class="fbox' + (key ? h(key) : '') + '"><small>' + lab + '</small><span class="hand"' + (ltr ? ' dir="ltr"' : '') + '>' + val + '</span></div>'; }
    return '<div class="paper a4" dir="rtl">' + WM +
      '<div class="ic-head"><b class="org">مؤسسة المثال للتمويل الأصغر (وهمية)</b><small dir="ltr">Al Mithal Microfinance (fictive) – Nouakchott</small></div>' +
      '<div class="doc-title">' + (loan ? 'استمارة طلب تمويل' : 'استمارة فتح حساب') + '<small dir="ltr">' + (loan ? 'Demande de financement' : 'Demande d’ouverture de compte') + '</small></div>' +
      '<div class="fgrid">' +
        box('الاسم الكامل · Nom', esc(d.nameAr), 'application.name') +
        box('الرقم الوطني · NNI', esc(d.nni), 'application.nni', true) +
        box('الهاتف · Tél.', C.phoneDisplay(d.phone), 'application.phone', true) +
        box('المهنة · Profession', esc(a.job.ar)) +
        '<div class="fbox wide"><small>العنوان · Adresse</small><span class="hand">' + esc(a.address.ar) + '</span></div>' +
        (loan ? box('المبلغ المطلوب · Montant', C.money(d.amount, 'ar'), 'application.amount') + box('المدة · Durée', d.term + ' شهراً', 'application.term') +
          '<div class="fbox wide' + h('application.purpose') + '"><small>الغرض من التمويل · Objet</small><span class="hand">' + esc(d.purpose.ar) + '</span></div>'
          : box('نوع الحساب · Type de compte', esc(d.product.ar), 'application.product') + box('الحركة الشهرية المتوقعة · Mouvements', C.money(d.expected, 'ar'))) +
        box('الدخل الشهري المصرّح · Revenu déclaré', C.money(a.income, 'ar'), 'application.income') +
        (a.otherDebt ? box('التزامات شهرية أخرى · Autres charges', C.money(a.otherDebt, 'ar')) : '') +
      '</div>' +
      '<div class="app-foot"><div class="' + h('application.date').trim() + '">التاريخ · Date: <b class="hand" dir="ltr">' + C.fmtD(d.date) + '</b></div><div class="sigbox"><small>توقيع مقدم الطلب · Signature</small>' + SIG + '</div></div>' +
    '</div>';
  }

  function guarantor(f, d, hl) {
    var h = H(hl), amt = f.request && f.request.amount;
    return '<div class="paper a4" dir="rtl">' + WM +
      '<div class="ic-head"><b class="org">مؤسسة المثال للتمويل الأصغر (وهمية)</b><small dir="ltr">Al Mithal Microfinance (fictive)</small></div>' +
      '<div class="doc-title">تعهد بالكفالة<small dir="ltr">Engagement de caution</small></div>' +
      '<p class="ic-body">أنا الموقّع أدناه <span class="fv' + h('guarantor.name') + '">' + esc(d.nameAr) + '</span>، الحامل للرقم الوطني <span class="fv' + h('guarantor.nni') + '" dir="ltr">' + esc(d.nni) + '</span>، المهنة: <span class="fv">' + esc(d.job.ar) + '</span>، دخلي الشهري: <span class="fv">' + C.money(d.income, 'ar') + '</span>، ' +
      'أتعهد بكفالة <span class="fv">' + esc(f.applicant.ar) + '</span> (' + esc(d.relation.ar) + ') في التمويل المطلوب بمبلغ <span class="fv">' + C.money(amt, 'ar') + '</span> لدى مؤسسة المثال للتمويل الأصغر، وبالسداد في حال تعثّره.</p>' +
      '<p class="ic-body small">هاتف الكفيل: <span dir="ltr">' + C.phoneDisplay(d.phone) + '</span></p>' +
      '<div class="app-foot"><div>التاريخ: <b class="hand" dir="ltr">' + C.fmtD(d.date) + '</b></div><div class="sigbox"><small>توقيع الكفيل · Signature de la caution</small>' + SIG + '</div></div>' +
    '</div>';
  }

  var R = { id: idCard, payslip: payslip, incomeCert: incomeCert, statement: statement, application: application, guarantor: guarantor };
  function render(f, key, hl) { var d = f.docs[key]; if (!d || !R[key]) return ''; return R[key](f, d, hl || []); }
  var ICON = { id: 'idcard', payslip: 'receipt', incomeCert: 'receipt', income: 'receipt', statement: 'list', application: 'note', guarantor: 'handshake' };

  global.Docs = { render: render, ICON: ICON };
})(window);

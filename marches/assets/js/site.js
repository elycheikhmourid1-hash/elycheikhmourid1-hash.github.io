/* AICore Marchés — Observatoire demo. Pure JS + inline SVG, no external dependencies. */
(function () {
  'use strict';
  var O = window.OBS, AR = window.I18N_AR || {};
  var LS = 'aicore-marches-lang';
  var lang = (new URLSearchParams(location.search).get('lang')) || (function () { try { return localStorage.getItem(LS); } catch (e) { return null; } })() || 'fr';
  if (lang !== 'ar') lang = 'fr';

  function fmt(n) { if (n === null || n === undefined || n === '') return '—'; if (typeof n !== 'number') return n; return n.toLocaleString(lang === 'ar' ? 'en-US' : 'fr-FR').replace(/\u202f|\u00a0|,(?=\d{3}\b)/g, lang === 'ar' ? '\u2009' : '\u2009'); }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function P(n) { return lang === 'ar' ? n + '%' : n + '\u202f%'; }
  function d(iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function T(fr, ar) { return lang === 'ar' ? ar : fr; }

  var rd = O.pdf_readability, dl = O.deadlines, ch = O.chains;
  var V = {
    snapshot_date: d(O.snapshot_date), win_start: d(O.window.start), win_end: d(O.window.end),
    portal_total: fmt(O.portal_total_notices), portal_first: d(O.portal_first_notice),
    n_notices: fmt(O.n_notices), n_procedures: fmt(O.n_procedures), n_authorities: fmt(O.n_authorities),
    n_calls: fmt(O.by_family.call || 0), per_week_median: fmt(O.per_week_median),
    top10_share_pct: null, pct_image_only: null,
    fund_cov: fmt(O.funders.procedures_with_detail), ft_n: fmt(O.funders_text.calls_with_text), fund_total: fmt(O.funders.procedures_with_call),
    pdf_checked: fmt(rd.checked), chain_total: fmt(ch.procedures_with_prov_award_in_window)
  };
  function dyn() { V.top10_share_pct = P(Math.round(O.top10_share * 100)); V.pct_image_only = P(pct(rd.image_only, rd.checked)); }
  function fill(tpl) { return tpl.replace(/\{([a-z0-9_]+)\}/g, function (m, k) { return V[k] !== undefined && V[k] !== null ? V[k] : m; }); }

  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
  nodes.forEach(function (el) { el.setAttribute('data-fr', el.innerHTML); });

  /* ---------- labels ---------- */
  var FAM = {
    call: ["Avis d'appel (AAO, AMI…)", 'إعلانات الدعوة إلى المنافسة'], addendum: ['Additifs et reports', 'ملاحق وتأجيلات'],
    opening: ["PV d'ouverture", 'محاضر فتح العروض'], evaluation: ['Évaluation et listes restreintes', 'التقييم واللوائح المحصورة'],
    award_prov: ['Attribution provisoire', 'المنح المؤقت'], award_final: ['Attribution définitive', 'المنح النهائي'],
    other: ['Autres (infructueux, annulation…)', 'أخرى (عدم الجدوى، الإلغاء…)']
  };
  var FAM_COL = { call: '#0E7480', addendum: '#7CC6C3', opening: '#3D5BA9', evaluation: '#9AA9D6', award_prov: '#F4A259', award_final: '#C96F1F', other: '#B8C4C6' };
  var FUND_AR = {
    "Budget de l'État": 'ميزانية الدولة', 'IDA / Banque mondiale': 'المؤسسة الدولية للتنمية / البنك الدولي', 'BAD / FAD': 'البنك الإفريقي للتنمية / الصندوق الإفريقي',
    'AFD': 'الوكالة الفرنسية للتنمية', 'Union européenne': 'الاتحاد الأوروبي', 'BID': 'البنك الإسلامي للتنمية', 'Fonds arabes / du Golfe': 'صناديق عربية وخليجية',
    'Autres partenaires': 'شركاء آخرون', 'Financement extérieur (non précisé)': 'تمويل خارجي (غير محدد)', 'Non renseigné': 'غير مذكور'
  };

  /* ---------- charts ---------- */
  function hbars(el, rows, opt) {
    opt = opt || {};
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1, total = opt.total;
    el.innerHTML = rows.map(function (r) {
      var val = total ? P(Math.round(100 * r.v / total)) : fmt(r.v);
      return '<div class="hbar"><div class="lab" title="' + esc(r.l) + '">' + esc(r.l) + '</div><div class="track"><div class="fill" style="width:' +
        (100 * r.v / max).toFixed(1) + '%' + (r.c ? ';background:' + r.c : '') + '"></div></div><div class="val">' + val + '</div></div>';
    }).join('');
  }
  function weekChart(el) {
    var w = O.per_week, W = 640, H = 230, pl = 34, pb = 34, pt = 22, n = w.length;
    var max = Math.max.apply(null, w.map(function (x) { return x.n; }));
    var step = Math.ceil(max / 4 / 10) * 10 || 10, top = step * 4, bw = (W - pl - 8) / n;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(T('Avis par semaine', 'الإعلانات أسبوعيًا')) + '" style="direction:ltr">';
    for (var g = 0; g <= 4; g++) {
      var y = pt + (H - pt - pb) * (1 - g / 4);
      s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="#E2EBEC"/>';
      s += '<text x="' + (pl - 6) + '" y="' + (y + 4) + '" font-size="11" fill="#62777D" text-anchor="end">' + g * step + '</text>';
    }
    var med = O.per_week_median, ym = pt + (H - pt - pb) * (1 - med / top);
    w.forEach(function (x, i) {
      var h = (H - pt - pb) * x.n / top, X = pl + i * bw + bw * 0.16, Y = H - pb - h;
      s += '<rect x="' + X.toFixed(1) + '" y="' + Y.toFixed(1) + '" width="' + (bw * 0.68).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="url(#gb)"><title>' + d(x.week) + ' : ' + x.n + '</title></rect>';
      s += '<text x="' + (X + bw * 0.34).toFixed(1) + '" y="' + (Y - 5).toFixed(1) + '" font-size="11" font-weight="700" fill="#073B4C" text-anchor="middle">' + x.n + '</text>';
      if (i % 2 === 0) s += '<text x="' + (X + bw * 0.34).toFixed(1) + '" y="' + (H - pb + 16) + '" font-size="10.5" fill="#62777D" text-anchor="middle">' + d(x.week).slice(0, 5) + '</text>';
    });
    s += '<line x1="' + pl + '" x2="' + W + '" y1="' + ym + '" y2="' + ym + '" stroke="#E58B3A" stroke-dasharray="5 4" stroke-width="1.5"/>';
    s += '<text x="' + (pl + 4) + '" y="' + (pt - 8) + '" font-size="11" font-weight="700" fill="#C96F1F" text-anchor="start">— — ' + esc(T('médiane ', 'الوسيط ')) + med + '</text>';
    s += '<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#118A8F"/><stop offset="1" stop-color="#0A5C6E"/></linearGradient></defs></svg>';
    el.innerHTML = s;
  }
  function donut(el) {
    var keys = ['call', 'addendum', 'opening', 'evaluation', 'award_prov', 'award_final', 'other'];
    var tot = keys.reduce(function (a, k) { return a + (O.by_family[k] || 0); }, 0), R = 52, C = 2 * Math.PI * R, off = 0;
    var s = '<svg viewBox="0 0 140 140" role="img" aria-label="' + esc(T('Répartition par étape', 'التوزيع حسب المرحلة')) + '"><g transform="rotate(-90 70 70)">';
    keys.forEach(function (k) {
      var v = O.by_family[k] || 0; if (!v) return; var L = C * v / tot;
      s += '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="' + FAM_COL[k] + '" stroke-width="22" stroke-dasharray="' + L.toFixed(2) + ' ' + (C - L).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"><title>' + esc(FAM[k][lang === 'ar' ? 1 : 0]) + ' : ' + v + '</title></circle>';
      off += L;
    });
    s += '</g><text x="70" y="68" text-anchor="middle" font-size="22" font-weight="900" fill="#073B4C">' + fmt(tot) + '</text><text x="70" y="86" text-anchor="middle" font-size="11" fill="#62777D">' + esc(T('avis', 'إعلان')) + '</text></svg>';
    var leg = '<div class="legend" style="flex-direction:column;gap:4px;margin:0">' + keys.filter(function (k) { return O.by_family[k]; }).map(function (k) {
      return '<span><i style="background:' + FAM_COL[k] + '"></i>' + esc(FAM[k][lang === 'ar' ? 1 : 0]) + ' · <b class="num">' + P(pct(O.by_family[k], tot)) + '</b></span>';
    }).join('') + '</div>';
    el.innerHTML = '<div>' + s + '</div>' + leg;
  }
  function rows(el, list) { el.innerHTML = list.map(function (r) { return '<div class="stat-row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join(''); }
  function days(q) { return q && q.n ? fmt(q.median) + T(' j', ' يومًا') : '—'; }
  function iqr(q) { return q && q.n ? ' <span class="muted tiny">(' + T('IQR ', 'المدى الربيعي ') + q.p25 + '–' + q.p75 + ' · n=' + q.n + ')</span>' : ''; }

  function render() {
    weekChart(document.getElementById('chWeek'));
    donut(document.getElementById('chStage'));
    var mt = O.by_market_type, tt = Object.keys(mt).reduce(function (a, k) { return a + mt[k]; }, 0);
    hbars(document.getElementById('chType'), Object.keys(mt).map(function (k) { return { l: lang === 'ar' ? (O.market_type_ar[k] || k) : k, v: mt[k] }; }), { total: tt });
    var pr = O.by_procedure, pk = Object.keys(pr).sort(function (a, b) { return pr[b] - pr[a]; }), top6 = pk.slice(0, 6), rest = pk.slice(6).reduce(function (a, k) { return a + pr[k]; }, 0);
    var prow = top6.map(function (k) { return { l: lang === 'ar' ? (O.procedure_ar[k] || k) : k, v: pr[k] }; });
    if (rest) prow.push({ l: T('Autres modes', 'طرق أخرى'), v: rest, c: '#B8C4C6' });
    hbars(document.getElementById('chProc'), prow);
    var fm = O.funders.mix, ft = Object.keys(fm).reduce(function (a, k) { return a + fm[k]; }, 0);
    hbars(document.getElementById('chFund'), Object.keys(fm).map(function (k) { return { l: lang === 'ar' ? (FUND_AR[k] || k) : k, v: fm[k], c: k === 'Non renseigné' ? '#B8C4C6' : null }; }), { total: ft });
    var FT_AR = { 'IDA / Banque mondiale': 'المؤسسة الدولية للتنمية / البنك الدولي', "Budget de l'État": 'ميزانية الدولة', 'BAD / FAD': 'البنك الإفريقي للتنمية / الصندوق الإفريقي', 'AFD': 'الوكالة الفرنسية للتنمية', 'Fonds arabes / du Golfe': 'صناديق عربية / خليجية', 'BID': 'البنك الإسلامي للتنمية', 'Union européenne': 'الاتحاد الأوروبي' };
    var fx = O.funders_text.mentions;
    hbars(document.getElementById('chFund2'), Object.keys(fx).map(function (k) { return { l: lang === 'ar' ? (FT_AR[k] || k) : k, v: fx[k] }; }), {});
    hbars(document.getElementById('chAuth'), O.top_authorities.map(function (a) { return { l: lang === 'ar' ? (a.ar || a.fr).replace(/''/g, '') : a.fr, v: a.n }; }));
    // readability
    var pt = pct(rd.text_layer, rd.checked), pi = 100 - pt;
    document.getElementById('readMeter').innerHTML = '<div style="width:' + pt + '%;background:var(--brand-600)"></div><div style="width:' + pi + '%;background:var(--accent)"></div>';
    document.getElementById('readLegend').innerHTML = '<span><i style="background:var(--brand-600)"></i>' + T('Texte exploitable', 'نص قابل للاستغلال') + ' · <b>' + P(pt) + '</b> (' + fmt(rd.text_layer) + ')</span><span><i style="background:var(--accent)"></i>' + T('Image scannée', 'صورة ممسوحة') + ' · <b>' + P(pi) + '</b> (' + fmt(rd.image_only) + ')</span>';
    // deadlines
    var q = dl.days_pub_to_deadline;
    rows(document.getElementById('dlStats'), [
      [T('Date limite extraite automatiquement', 'أجل مستخرج آليًا'), fmt(dl.extracted) + ' / ' + fmt(dl.calls) + ' · ' + P(pct(dl.extracted, dl.calls))],
      [T('Délai médian publication → date limite, AAO national', 'المدة الوسيطة بين النشر والأجل، مناقصة وطنية'), days(q['AAO national']) + iqr(q['AAO national'])],
      [T('Idem, AAO international', 'نفسها، مناقصة دولية'), days(q['AAO international']) + iqr(q['AAO international'])],
      [T("Idem, avis à manifestation d'intérêt", 'نفسها، إبداء الاهتمام'), days(q['AMI']) + iqr(q['AMI'])]
    ]);
    // chain timeline
    var tl = [[T('Appel', 'الدعوة'), '1'], [T('Ouverture', 'فتح العروض'), '2'], [T('Attribution provisoire', 'المنح المؤقت'), '3']];
    document.getElementById('chainTl').innerHTML = tl.map(function (s, i) {
      var gap = i === 1 ? days(ch.call_to_opening_days) : (i === 2 ? days(ch.opening_to_prov_award_days) : '&nbsp;');
      return '<div class="tl-step"><div class="dotn">' + s[1] + '</div><div class="t">' + s[0] + '</div><div class="tl-gap num">' + (i ? '+' + gap : '&nbsp;') + '</div></div>';
    }).join('');
    rows(document.getElementById('chainStats'), [
      [T('Chaîne complète visible (appel + ouverture + attribution)', 'سلسلة كاملة ظاهرة (دعوة + فتح + منح)'), fmt(ch.with_call_and_opening_on_portal) + ' / ' + fmt(ch.procedures_with_prov_award_in_window)],
      [T("Dont procédures d'appel d'offres ouvert", 'منها إجراءات المناقصة المفتوحة'), fmt(ch.open_tender_with_call_and_opening) + ' / ' + fmt(ch.open_tender_procedures)],
      [T('Médiane appel → attribution provisoire', 'الوسيط من الدعوة إلى المنح المؤقت'), days(ch.call_to_prov_award_days) + iqr(ch.call_to_prov_award_days)],
      [T('Médiane attribution provisoire → définitive', 'الوسيط من المنح المؤقت إلى النهائي'), days(ch.prov_to_final_award_days) + iqr(ch.prov_to_final_award_days)]
    ]);
    rows(document.getElementById('dqStats'), [
      [T('PDF sans couche texte (image seule)', 'ملفات PDF دون طبقة نصية (صورة فقط)'), P(pct(rd.image_only, rd.checked))],
      [T('Avis d\'appel sans date limite détectable automatiquement', 'إعلانات دعوة دون أجل قابل للرصد آليًا'), P(pct(dl.not_extracted, dl.calls))],
      [T('Même document publié plusieurs fois pour une même étape (souvent un par lot)', 'الوثيقة نفسها منشورة أكثر من مرة للمرحلة نفسها (غالبًا مرة لكل حصة)'), fmt(O.probable_duplicates)],
      [T("Additifs et reports pour 100 avis d'appel", 'ملاحق وتأجيلات لكل 100 إعلان دعوة'), fmt(O.addenda_per_100_calls)],
      [T("Attributions provisoires sans lien automatique vers l'appel et l'ouverture", 'منح مؤقت دون ربط آلي بإعلان الدعوة ومحضر الفتح'), P(100 - pct(ch.with_call_and_opening_on_portal, ch.procedures_with_prov_award_in_window))]
    ]);
  }

  function apply() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' ? 'مرصد الصفقات العمومية — عرض تجريبي · أيكور ديجيتال' : 'Observatoire des marchés publics — démonstration · AICore Digital';
    dyn();
    nodes.forEach(function (el) { var k = el.getAttribute('data-i18n'); var src = (lang === 'ar' && AR[k]) ? AR[k] : el.getAttribute('data-fr'); el.innerHTML = fill(src); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-v]'), function (el) { el.textContent = V[el.getAttribute('data-v')]; });
    document.getElementById('langLabel').textContent = lang === 'ar' ? 'Français' : 'العربية';
    render();
  }
  document.getElementById('langBtn').addEventListener('click', function () {
    lang = lang === 'ar' ? 'fr' : 'ar';
    try { localStorage.setItem(LS, lang); } catch (e) { }
    apply();
  });
  apply();
})();

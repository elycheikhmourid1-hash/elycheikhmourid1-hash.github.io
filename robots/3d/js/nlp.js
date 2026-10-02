/* AICore Robotics Ops 3D — deterministic, rule-based command parser (SIMULATION).
   No AI model, no network, no API keys: plain keyword rules in Arabic / French / English. */
(function (root) {
  'use strict';

  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');            // Arabic diacritics + tatweel
    s = s.replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');       // French accents
    s = s.replace(/[’'`´]/g, ' ').replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }
  var isAr = function (w) { return /[\u0600-\u06ff]/.test(w); };

  /* Each entry is a stem. Latin stems match at the start of a word; Arabic stems match anywhere (Arabic attaches prefixes). */
  var LEX = {
    dish: ['dish', 'antenna', 'antena', 'parabol', 'vsat', 'satellite', 'azimuth', 'tracking', 'pointing', 'reflector', 'antenne', 'pointage', 'azimut',
      'طبق', 'صحن', 'هوايي', 'انتين', 'انتن', 'سمت', 'تتبع', 'قمر', 'بارابول'],
    drift: ['drift', 'misalign', 'tracking error', 'off target', 'derive', 'desalign', 'ecart', 'decal', 'انحراف', 'انحرف', 'ازاحه', 'زاغ', 'خطا في التتبع'],
    cabinet: ['cabinet', 'rack', 'thermal', 'heat', 'hot', 'overheat', 'temperature', 'temp ', 'buc', 'pdu', 'armoire', 'baie', 'thermique', 'chaud', 'chaleur', 'surchauff',
      'خزان', 'راك', 'حرار', 'ساخن', 'سخون', 'ارتفاع'],
    hot: ['hot', 'overheat', 'too hot', 'chaud', 'surchauff', 'brul', 'ساخن', 'سخون', 'ارتفاع', 'حار'],
    perimeter: ['patrol', 'perimeter', 'fence', 'gate', 'security', 'round', 'patrouille', 'ronde', 'perimetre', 'cloture', 'portail', 'securite',
      'دوري', 'محيط', 'سياج', 'بواب', 'جول', 'حراس'],
    night: ['night', 'nocturn', 'after dark', 'nuit', 'ليل']
  };
  var CAB_WORD = ['cabinet', 'rack', 'armoire', 'baie', 'خزان', 'راك'];

  function has(s, stems) {
    var hit = [];
    stems.forEach(function (w) {
      var ok = isAr(w) ? s.indexOf(w) >= 0 : (' ' + s).indexOf(' ' + w) >= 0;
      if (ok) hit.push(w.trim());
    });
    return hit;
  }
  function firstPos(s, stems) {
    var p = 1e9;
    stems.forEach(function (w) { var i = isAr(w) ? s.indexOf(w) : (' ' + s).indexOf(' ' + w) - 1; if (i >= 0 && i < p) p = i; });
    return p;
  }

  function cabinetLetter(s) {
    var toks = s.split(' '), L = null, i, w;
    var map = { a: 'A', b: 'B', c: 'C', 'ا': 'A', 'ب': 'B', 'ج': 'C' };
    for (i = 0; i < toks.length; i++) {
      w = toks[i];
      var isCab = CAB_WORD.some(function (c) { return isAr(c) ? w.indexOf(c) >= 0 : w.indexOf(c) === 0; });
      if (isCab) {
        var nx = toks[i + 1], nx2 = toks[i + 2];
        if (nx && map[nx]) return map[nx];
        if (nx && /^(number|no|n|numero|رقم)$/.test(nx) && nx2 && map[nx2]) return map[nx2];
      }
    }
    for (i = 0; i < toks.length; i++) if (toks[i] === 'b' || toks[i] === 'c' || toks[i] === 'ب' || toks[i] === 'ج') L = map[toks[i]];
    return L;
  }

  function parse(text) {
    var s = norm(text);
    if (s.length < 2) return { ok: false, text: text };
    var d = has(s, LEX.dish), c = has(s, LEX.cabinet), p = has(s, LEX.perimeter), n = has(s, LEX.night);
    var drift = has(s, LEX.drift), hot = has(s, LEX.hot), letter = cabinetLetter(s);
    var hasCabWord = has(s, CAB_WORD).length > 0;
    var kind = null;
    if (n.length) kind = 'night';
    else {
      var sc = { dish: d.length, thermal: c.length + (letter ? 2 : 0), perimeter: p.length };
      if (hasCabWord) sc.thermal += 1;
      var best = 0, order = [['dish', firstPos(s, LEX.dish)], ['thermal', firstPos(s, LEX.cabinet)], ['perimeter', firstPos(s, LEX.perimeter)]];
      order.sort(function (a, b) { return a[1] - b[1]; });
      order.forEach(function (o) { if (sc[o[0]] > best) { best = sc[o[0]]; kind = o[0]; } });
      if (drift.length && !kind) kind = 'dish';
    }
    if (!kind) return { ok: false, text: text };
    var flags = { drift: false, hot: false }, target = null, matched = [];
    if (kind === 'dish') { flags.drift = drift.length > 0; matched = d.concat(drift); }
    if (kind === 'thermal') {
      flags.hot = hot.length > 0; target = letter || (flags.hot ? 'B' : null);
      matched = c.concat(letter ? [letter] : []);
    }
    if (kind === 'perimeter') matched = p;
    if (kind === 'night') matched = n.concat(p);
    var seen = {}; matched = matched.filter(function (w) { if (seen[w]) return false; seen[w] = 1; return true; });
    return { ok: true, kind: kind, target: target, flags: flags, matched: matched, text: text };
  }

  var api = { parse: parse, norm: norm };
  root.NLP3D = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

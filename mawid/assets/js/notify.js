/* AICore Mawʿid — owner notification + patient tracking ("Mes rendez-vous / مواعيدي")
 * - Sends each new web booking to the clinic owner by e-mail through FormSubmit.co (AJAX, no backend,
 *   no secret key: the endpoint below is FormSubmit's public alias for the owner's inbox).
 * - Saves the patient's own bookings in this browser (localStorage) so the tracker survives a reload.
 * DEMO: statuses cannot change remotely yet (no backend); the clinic confirms on WhatsApp. */
(function (global) {
  'use strict';

  var CFG = {
    // FormSubmit alias of the owner's inbox (activated for .../mawid/book.html). Public by design.
    endpoint: 'https://formsubmit.co/ajax/27129d49a1518489239f5e121f7008f2',
    ownerWa: '18044853384',            // +1 804 485 3384 (WhatsApp fallback)
    timeoutMs: 15000,
    myKey: 'mawid_my_bookings_v1'
  };

  // Extra bilingual strings (merged into the shared dictionary)
  var EXTRA = {
    ar: {
      my_bookings: 'مواعيدي',
      my_bookings_title: 'مواعيدي',
      my_bookings_intro: 'مواعيدك المحفوظة على هذا الهاتف وحالة كل طلب.',
      my_empty: 'لا توجد مواعيد محفوظة على هذا الهاتف بعد.',
      my_book_now: 'احجز موعداً',
      booking_no: 'رقم الحجز',
      doctor: 'الطبيب', doctor_name: 'د. أحمد', specialty_dent: 'طب الأسنان',
      clinic: 'العيادة', when: 'الموعد', at_time: 'الساعة',
      trk_plan: 'التخطيط', trk_book: 'الحجز', trk_pay: 'الدفع', trk_receipt: 'الإيصال',
      trk_status_plan: 'جارٍ تخطيط الموعد…',
      trk_status_hint: 'ستتواصل معك العيادة على واتساب لتأكيد الموعد.',
      trk_offline_note: 'نموذج تجريبي: الحالة محفوظة على هذا الهاتف فقط ولا تتحدّث تلقائياً بعد.',
      notif_sending: 'جارٍ إشعار العيادة…',
      notif_ok: 'تم إشعار العيادة بطلبك ✓',
      notif_fail: 'تعذّر إشعار العيادة تلقائياً. أرسل الطلب عبر واتساب من فضلك.',
      send_wa_owner: 'إرسال عبر واتساب',
      view_my: 'عرض مواعيدي',
      remove: 'حذف من هذا الهاتف',
      remove_confirm: 'حذف هذا الموعد من هذا الهاتف؟',
      booked_on: 'أُرسل الطلب'
    },
    fr: {
      my_bookings: 'Mes rendez-vous',
      my_bookings_title: 'Mes rendez-vous',
      my_bookings_intro: 'Vos rendez-vous enregistrés sur ce téléphone et l’état de chaque demande.',
      my_empty: 'Aucun rendez-vous enregistré sur ce téléphone pour l’instant.',
      my_book_now: 'Prendre rendez-vous',
      booking_no: 'N° de réservation',
      doctor: 'Médecin', doctor_name: 'Dr Ahmed', specialty_dent: 'Chirurgien-dentiste',
      clinic: 'Clinique', when: 'Rendez-vous', at_time: 'à',
      trk_plan: 'Planification', trk_book: 'Réservation', trk_pay: 'Paiement', trk_receipt: 'Reçu',
      trk_status_plan: 'Planification du RDV en cours…',
      trk_status_hint: 'La clinique vous contactera sur WhatsApp pour confirmer le rendez-vous.',
      trk_offline_note: 'Démo : l’état est enregistré sur ce téléphone uniquement et ne se met pas encore à jour à distance.',
      notif_sending: 'Envoi de la demande à la clinique…',
      notif_ok: 'La clinique a été notifiée ✓',
      notif_fail: 'La notification automatique a échoué. Merci d’envoyer la demande par WhatsApp.',
      send_wa_owner: 'Envoyer via WhatsApp',
      view_my: 'Voir mes rendez-vous',
      remove: 'Retirer de ce téléphone',
      remove_confirm: 'Retirer ce rendez-vous de ce téléphone ?',
      booked_on: 'Demande envoyée'
    }
  };
  if (global.I18N) { Object.keys(EXTRA).forEach(function (l) { Object.assign(I18N.dict[l], EXTRA[l]); }); }

  /* ---------- booking number ---------- */
  function newRef() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '', buf = new Uint32Array(6);
    if (global.crypto && crypto.getRandomValues) crypto.getRandomValues(buf); else for (var i = 0; i < 6; i++) buf[i] = Math.floor(Math.random() * 1e9);
    for (var j = 0; j < 6; j++) s += A[buf[j] % A.length];
    return 'RDV-' + s;
  }

  /* ---------- "my bookings" (this device) ---------- */
  function myList() {
    try { var l = JSON.parse(localStorage.getItem(CFG.myKey) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }
  function mySave(list) { try { localStorage.setItem(CFG.myKey, JSON.stringify(list)); } catch (e) {} }
  function myAdd(b) {
    var list = myList().filter(function (x) { return x.ref !== b.ref; });
    list.unshift({ ref: b.ref, name: b.name, phone: b.phone, service: b.service, date: b.date, time: b.time,
      note: b.note || '', lang: b.lang, deposit: !!(b.deposit && b.deposit.status === 'awaiting'),
      createdAt: b.createdAt, step: 1, notify: b.notify || 'sending' });
    mySave(list.slice(0, 30));
  }
  function myUpdate(ref, patch) {
    var list = myList();
    list.forEach(function (x) { if (x.ref === ref) Object.assign(x, patch); });
    mySave(list);
  }
  function myRemove(ref) { mySave(myList().filter(function (x) { return x.ref !== ref; })); }

  /* ---------- tracker UI ---------- */
  var STEPS = ['trk_plan', 'trk_book', 'trk_pay', 'trk_receipt'];
  var STEP_ICONS = ['calendar', 'calcheck', 'wallet', 'note'];
  function trackerHtml(step) {
    step = step || 1;
    return '<ol class="trk" aria-label="' + UI.esc(t('trk_status_plan')) + '">' + STEPS.map(function (k, i) {
      var n = i + 1, cls = n < step ? 'done' : n === step ? 'done current' : '';
      return '<li class="trk-step ' + cls + '"' + (n === step ? ' aria-current="step"' : '') + '>' +
        '<span class="trk-dot">' + UI.icon(n <= step ? 'check' : STEP_ICONS[i]) + '</span>' +
        '<span class="trk-label">' + t(k) + '</span></li>';
    }).join('') + '</ol>' +
    '<div class="trk-status"><span class="trk-pulse"></span><b>' + t('trk_status_plan') + '</b></div>' +
    '<p class="muted tiny trk-hint">' + t('trk_status_hint') + '</p>';
  }

  function detailsHtml(b) {
    return '<dl class="kv trk-kv">' +
      '<dt>' + t('doctor') + '</dt><dd>' + t('doctor_name') + ' · <span class="muted">' + t('specialty_dent') + '</span></dd>' +
      '<dt>' + t('service') + '</dt><dd>' + t('svc_' + b.service) + '</dd>' +
      '<dt>' + t('clinic') + '</dt><dd>' + t('clinicName') + '</dd>' +
      '<dt>' + t('when') + '</dt><dd>' + Store.fmtDate(b.date) + ' · <span class="ltr">' + b.time + '</span></dd>' +
      '<dt>' + t('f_name') + '</dt><dd dir="auto">' + UI.esc(b.name) + '</dd>' +
      '<dt>' + t('phone') + '</dt><dd class="ltr">' + Store.phoneDisplay(b.phone) + '</dd>' +
    '</dl>';
  }

  /* ---------- message text (e-mail + WhatsApp) ---------- */
  function svcBoth(id) { return I18N.t('svc_' + id, null, 'fr') + ' / ' + I18N.t('svc_' + id, null, 'ar'); }
  function waText(b) {
    return 'حجز جديد — Mawid / Nouveau rendez-vous\n' +
      'N° / رقم الحجز: ' + b.ref + '\n' +
      'Patient / المريض: ' + b.name + '\n' +
      'Tél / الهاتف: ' + Store.phoneDisplay(b.phone) + '\n' +
      'Soin / الخدمة: ' + svcBoth(b.service) + '\n' +
      'Médecin / الطبيب: Dr Ahmed / د. أحمد\n' +
      'RDV / الموعد: ' + Store.fmtDate(b.date, 'fr') + ' — ' + b.time + '\n' +
      (b.note ? 'Note / ملاحظة: ' + b.note + '\n' : '') +
      '(' + I18N.t('clinicShort', null, 'fr') + ' · démo AICore Mawid)';
  }
  function waOwnerLink(b) { return 'https://wa.me/' + CFG.ownerWa + '?text=' + encodeURIComponent(waText(b)); }

  function payload(b, honey) {
    var created = new Date(b.createdAt || Date.now());
    var local = '';
    try { local = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'medium' }).format(created) + ' (' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'local') + ')'; } catch (e) { local = created.toString(); }
    var nkc = '';
    try { nkc = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nouakchott' }).format(created) + ' (Nouakchott)'; } catch (e) {}
    return {
      _subject: 'Nouveau rendez-vous — Mawid / حجز جديد · ' + b.ref,
      _template: 'table',
      _captcha: 'false',
      _honey: honey || '',
      'N° RDV / رقم الحجز': b.ref,
      'Patient / المريض': b.name,
      'Téléphone / الهاتف': Store.phoneDisplay(b.phone),
      'WhatsApp patient': 'https://wa.me/222' + b.phone,
      'Soin / الخدمة': svcBoth(b.service),
      'Médecin / الطبيب': 'Dr Ahmed — Chirurgien-dentiste / د. أحمد — طبيب أسنان',
      'Clinique / العيادة': I18N.t('clinicName', null, 'fr'),
      'Date / التاريخ': Store.fmtDate(b.date, 'fr') + ' · ' + Store.fmtDate(b.date, 'ar') + ' (' + b.date + ')',
      'Heure / الساعة': b.time,
      'Remarque / ملاحظة': b.note || '—',
      'Acompte / عربون': (b.deposit && b.deposit.status === 'awaiting') ? 'Oui / نعم' : 'Non / لا',
      'Langue / اللغة': b.lang === 'fr' ? 'Français' : 'العربية',
      'Horodatage / وقت الإرسال': created.toISOString() + ' — ' + local + (nkc ? ' — ' + nkc : ''),
      'Statut / الحالة': 'Planification du RDV en cours / جارٍ تخطيط الموعد',
      'Page': location.origin + location.pathname
    };
  }

  /** Send the booking to the owner. Resolves {ok:boolean, skipped?:boolean}. Never rejects. */
  function send(b, honey) {
    if (honey) return Promise.resolve({ ok: true, skipped: true }); // bot: pretend success, send nothing
    if (!global.fetch) return Promise.resolve({ ok: false });
    var ctrl = global.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, CFG.timeoutMs);
    var opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload(b, honey)),
      // FormSubmit ties activation to the form page URL: always send the canonical booking-page URL (no query string).
      referrer: new URL('book.html', location.href).href,
      referrerPolicy: 'unsafe-url'
    };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(CFG.endpoint, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        clearTimeout(timer);
        return { ok: r.ok && (j.success === true || j.success === 'true') };
      });
    }).catch(function () { clearTimeout(timer); return { ok: false }; });
  }

  global.Notify = { CFG: CFG, newRef: newRef, send: send, payload: payload, waText: waText, waOwnerLink: waOwnerLink,
    myList: myList, myAdd: myAdd, myUpdate: myUpdate, myRemove: myRemove, trackerHtml: trackerHtml, detailsHtml: detailsHtml };
})(window);

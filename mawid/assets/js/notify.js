/* AICore Mawʿid — owner notification + patient tracking ("Mes rendez-vous / مواعيدي")
 * - Sends each new web booking to the clinic owner by e-mail through FormSubmit.co (AJAX, no backend,
 *   no secret key: the endpoint below is FormSubmit's public alias for the owner's inbox).
 * - Saves the patient's own bookings in this browser (localStorage) so the tracker survives a reload.
 * - With a backend (config.js), pushes bookings to Supabase and refreshes their status (see api.js). */
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
      trk_status_hint: 'سيراجع موظف العيادة طلبك، وستتحدّث الحالة هنا تلقائياً.',
      trk_status_confirmed: 'تم تأكيد موعدك',
      trk_hint_confirmed: 'يرجى الحضور قبل الموعد بعشر دقائق. للتغيير أو الإلغاء راسل العيادة على واتساب.',
      trk_status_rejected: 'تعذّر تأكيد هذا الموعد',
      trk_hint_rejected: 'يمكنك اختيار وقت آخر أو مراسلة العيادة على واتساب.',
      trk_status_done: 'انتهت الزيارة – شكراً لك',
      trk_hint_done: 'نتمنى لك دوام الصحة والعافية.',
      trk_pay_wait: 'بانتظار العربون',
      trk_offline_note: 'وضع تجريبي: الحالة محفوظة على هذا الهاتف فقط ولا تتحدّث تلقائياً.',
      trk_live_note: 'الحالة تتحدّث تلقائياً عندما يراجع موظف العيادة طلبك.',
      st2_pending: 'قيد الانتظار', st2_confirmed: 'تم التأكيد', st2_rejected: 'مرفوض', st2_done: 'تمت الزيارة', st2_local: 'غير متزامن',
      status_label: 'الحالة',
      clinic_msg: 'رسالة من العيادة',
      new_time: 'موعد جديد', was_time: 'بدلاً من',
      sync_live: 'متصل · تحديث تلقائي', sync_updated: 'آخر تحديث {time}',
      sync_offline: 'تعذّر الاتصال بخادم العيادة. نعرض آخر حالة محفوظة على هذا الهاتف، وسنعيد المحاولة.',
      sync_local: 'لم يصل هذا الطلب إلى خادم العيادة بعد. سنعيد المحاولة تلقائياً، ويمكنك أيضاً إرساله عبر واتساب.',
      sync_conflict: 'حُجز هذا الوقت قبل وصول طلبك. اختر وقتاً آخر من فضلك.',
      save_saving: 'جارٍ حفظ طلبك لدى العيادة…',
      save_ok: 'تم حفظ طلبك لدى العيادة',
      save_fail: 'تعذّر الحفظ على الخادم. الطلب محفوظ على هذا الهاتف وسنعيد المحاولة تلقائياً.',
      save_demo: 'وضع تجريبي: الطلب محفوظ على هذا الهاتف فقط.',
      find_title: 'حجزت من هاتف آخر؟',
      find_body: 'أدخل رقم الحجز ورقم الهاتف المستعمل عند الحجز.',
      find_ref_ph: 'RDV-XXXXXX', find_btn: 'بحث',
      find_notfound: 'لم نجد حجزاً بهذه المعلومات.', find_ok: 'تمت إضافة الموعد إلى هذا الهاتف',
      find_offline: 'البحث يتطلب الاتصال بخادم العيادة.',
      refresh: 'تحديث',
      banner_live: 'نسخة تجريبية حيّة – العيادة وهمية، والطلبات تُحفظ فعلاً',
      notif_sending: 'جارٍ إشعار العيادة…',
      notif_ok: 'تم إشعار العيادة بطلبك',
      notif_fail: 'تعذّر إشعار العيادة تلقائياً. أرسل الطلب عبر واتساب من فضلك.',
      send_wa_owner: 'إرسال عبر واتساب',
      view_my: 'تتبّع حالة موعدي',
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
      trk_status_hint: 'Un membre de l’équipe vérifie votre demande ; l’état se met à jour ici automatiquement.',
      trk_status_confirmed: 'Votre rendez-vous est confirmé',
      trk_hint_confirmed: 'Merci d’arriver 10 minutes en avance. Pour modifier ou annuler, écrivez à la clinique sur WhatsApp.',
      trk_status_rejected: 'Ce rendez-vous n’a pas pu être confirmé',
      trk_hint_rejected: 'Vous pouvez choisir un autre créneau ou écrire à la clinique sur WhatsApp.',
      trk_status_done: 'Consultation terminée — merci !',
      trk_hint_done: 'Nous vous souhaitons une bonne santé.',
      trk_pay_wait: 'Acompte en attente',
      trk_offline_note: 'Mode démo : l’état est enregistré sur ce téléphone uniquement et ne se met pas à jour.',
      trk_live_note: 'L’état se met à jour automatiquement dès que la clinique traite votre demande.',
      st2_pending: 'En attente', st2_confirmed: 'Confirmé', st2_rejected: 'Refusé', st2_done: 'Terminé', st2_local: 'Non synchronisé',
      status_label: 'Statut',
      clinic_msg: 'Message de la clinique',
      new_time: 'Nouvel horaire', was_time: 'au lieu de',
      sync_live: 'En ligne · mise à jour automatique', sync_updated: 'Mis à jour à {time}',
      sync_offline: 'Serveur de la clinique injoignable. Dernier état enregistré sur ce téléphone ; nouvelle tentative automatique.',
      sync_local: 'Cette demande n’est pas encore arrivée sur le serveur de la clinique. Nouvelle tentative automatique ; vous pouvez aussi l’envoyer par WhatsApp.',
      sync_conflict: 'Ce créneau a été pris avant l’arrivée de votre demande. Merci d’en choisir un autre.',
      save_saving: 'Enregistrement de votre demande auprès de la clinique…',
      save_ok: 'Demande enregistrée auprès de la clinique',
      save_fail: 'Enregistrement en ligne impossible. La demande est gardée sur ce téléphone ; nouvelle tentative automatique.',
      save_demo: 'Mode démo : demande gardée sur ce téléphone uniquement.',
      find_title: 'Réservé depuis un autre téléphone ?',
      find_body: 'Saisissez le n° de réservation et le numéro de téléphone utilisé.',
      find_ref_ph: 'RDV-XXXXXX', find_btn: 'Rechercher',
      find_notfound: 'Aucune réservation trouvée avec ces informations.', find_ok: 'Rendez-vous ajouté à ce téléphone',
      find_offline: 'La recherche nécessite une connexion au serveur de la clinique.',
      refresh: 'Actualiser',
      banner_live: 'Pilote en ligne – clinique fictive, demandes réellement enregistrées',
      notif_sending: 'Envoi de la demande à la clinique…',
      notif_ok: 'La clinique a été notifiée',
      notif_fail: 'La notification automatique a échoué. Merci d’envoyer la demande par WhatsApp.',
      send_wa_owner: 'Envoyer via WhatsApp',
      view_my: 'Suivre mon rendez-vous',
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
    list.unshift({ ref: b.ref, token: b.token || '', phone: b.phone, name: b.name, service: b.service, date: b.date, time: b.time,
      orig_date: b.orig_date || null, orig_time: b.orig_time || null, note: b.note || '', lang: b.lang,
      deposit: !!(b.deposit === true || (b.deposit && b.deposit.status === 'awaiting')),
      createdAt: b.createdAt, status: b.status || 'pending', staff_note: b.staff_note || '',
      sync: b.sync || (global.API && API.enabled ? 'pending' : 'demo'), notify: b.notify || 'sending' });
    mySave(list.slice(0, 30));
  }
  function myGet(ref) { return myList().find(function (x) { return x.ref === ref; }) || null; }
  function myUpdate(ref, patch) {
    var list = myList();
    list.forEach(function (x) { if (x.ref === ref) Object.assign(x, patch); });
    mySave(list);
  }
  function myRemove(ref) { mySave(myList().filter(function (x) { return x.ref !== ref; })); }

  /* ---------- backend sync (graceful: localStorage stays the source of truth offline) ---------- */
  function fromServer(r) {
    return { status: r.status, date: r.appt_date, time: r.appt_time, orig_date: r.orig_date, orig_time: r.orig_time,
      staff_note: r.staff_note || '', deposit: !!r.deposit, updatedAt: r.updated_at, decidedAt: r.decided_at, sync: 'saved' };
  }
  /** Push one local booking to the server. Resolves 'saved' | 'conflict' | 'pending' (network/other error). */
  var inflight = {};
  function pushOne(item) {
    if (!global.API || !API.enabled) return Promise.resolve('demo');
    if (inflight[item.ref]) return inflight[item.ref];
    var run = function () {
      var cur = myGet(item.ref); // another tab may have pushed it meanwhile
      if (cur && cur.sync === 'saved') return Promise.resolve('saved');
      return pushOnce(cur || item);
    };
    var p = (global.navigator && navigator.locks && navigator.locks.request)
      ? navigator.locks.request('mawid-push', run).catch(function () { return 'pending'; })
      : run();
    inflight[item.ref] = p;
    p.then(function () { delete inflight[item.ref]; }, function () { delete inflight[item.ref]; });
    return p;
  }
  function pushOnce(item) {
    if (!item.token) { item.token = API.newToken(); myUpdate(item.ref, { token: item.token }); }
    return API.createBooking(item, item.token).then(function (row) {
      myUpdate(item.ref, { sync: 'saved', status: (row && row.status) || 'pending' });
      return 'saved';
    }, function (e) {
      var m = e && e.message;
      if (m === 'slot_taken' || m === 'past_slot' || m === 'closed_day' || m === 'bad_date') { myUpdate(item.ref, { sync: 'conflict' }); return 'conflict'; }
      if (m === 'ref_taken') { // maybe saved already (lost response): check with our token
        return API.getBookings([{ ref: item.ref, token: item.token }]).then(function (rows) {
          if (rows && rows[0]) { myUpdate(item.ref, fromServer(rows[0])); return 'saved'; }
          myUpdate(item.ref, { sync: 'conflict' }); return 'conflict';
        }, function () { return 'pending'; });
      }
      return 'pending';
    });
  }
  function syncPending() {
    var todo = myList().filter(function (x) { return x.sync === 'pending'; });
    return todo.reduce(function (p, it) { return p.then(function () { return pushOne(it); }); }, Promise.resolve());
  }
  /** Refresh statuses of saved bookings. Resolves {ok:boolean, changed:[refs]} */
  function refreshStatuses() {
    if (!global.API || !API.enabled) return Promise.resolve({ ok: false, demo: true, changed: [] });
    return syncPending().then(function () {
      var saved = myList().filter(function (x) { return x.sync === 'saved' && (x.token || x.phone); });
      if (!saved.length) return { ok: true, changed: [] };
      var items = saved.map(function (x) { return x.token ? { ref: x.ref, token: x.token } : { ref: x.ref, phone: x.phone }; });
      return API.getBookings(items).then(function (rows) {
        var changed = [];
        (rows || []).forEach(function (r) {
          var cur = myGet(r.ref); if (!cur) return;
          if (cur.status !== r.status || cur.date !== r.appt_date || cur.time !== r.appt_time || (cur.staff_note || '') !== (r.staff_note || '')) changed.push(r.ref);
          myUpdate(r.ref, fromServer(r));
        });
        return { ok: true, changed: changed };
      });
    }).catch(function () { return { ok: false, changed: [] }; });
  }

  /* ---------- status + tracker UI ---------- */
  var STATUS = {
    pending: { chip: 'warn', icon: 'clock' },
    confirmed: { chip: 'ok', icon: 'calcheck' },
    rejected: { chip: 'bad', icon: 'x' },
    done: { chip: 'info', icon: 'check' },
    local: { chip: 'gray', icon: 'alert' }
  };
  function statusKey(b) {
    if (b.sync === 'pending' || b.sync === 'conflict') return 'local';
    return STATUS[b.status] ? b.status : 'pending';
  }
  function statusChip(b) {
    var k = statusKey(b), m = STATUS[k];
    return '<span class="chip ' + m.chip + ' st-chip" data-status="' + k + '">' + UI.icon(m.icon) + t('st2_' + k) + '</span>';
  }
  var STEPS = ['trk_plan', 'trk_book', 'trk_pay', 'trk_receipt'];
  var STEP_ICONS = ['calendar', 'calcheck', 'wallet', 'note'];
  /** b: booking {status, deposit, sync} (a number is accepted for the legacy demo = pending) */
  function trackerHtml(b) {
    if (typeof b !== 'object' || !b) b = { status: 'pending' };
    var st = b.sync === 'conflict' ? 'rejected' : (b.status || 'pending');
    var reached = st === 'done' ? 4 : st === 'confirmed' ? 2 : 1;
    var failed = st === 'rejected' ? 2 : 0;
    var txt = st === 'confirmed' ? 'trk_status_confirmed' : st === 'rejected' ? 'trk_status_rejected' : st === 'done' ? 'trk_status_done' : 'trk_status_plan';
    var hint = b.sync === 'conflict' ? 'sync_conflict' : st === 'confirmed' ? 'trk_hint_confirmed' : st === 'rejected' ? 'trk_hint_rejected' : st === 'done' ? 'trk_hint_done' : 'trk_status_hint';
    return '<ol class="trk trk-' + st + '" aria-label="' + UI.esc(t(txt)) + '">' + STEPS.map(function (k, i) {
      var n = i + 1, cls = '';
      if (n === failed) cls = 'failed current';
      else if (n < reached) cls = 'done';
      else if (n === reached && !failed) cls = 'done current';
      else if (n === 1 && failed) cls = 'done';
      if (n === 3 && st === 'confirmed' && b.deposit) cls += ' waiting';
      var ico = n === failed ? 'x' : (cls.indexOf('done') >= 0 ? 'check' : STEP_ICONS[i]);
      return '<li class="trk-step ' + cls + '"' + (cls.indexOf('current') >= 0 ? ' aria-current="step"' : '') + '>' +
        '<span class="trk-dot">' + UI.icon(ico) + '</span>' +
        '<span class="trk-label">' + t(k) + (n === 3 && st === 'confirmed' && b.deposit ? '<small>' + t('trk_pay_wait') + '</small>' : '') + '</span></li>';
    }).join('') + '</ol>' +
    '<div class="trk-status st-' + st + '" role="status" aria-live="polite">' + (st === 'pending' ? '<span class="trk-pulse"></span>' : UI.icon(STATUS[st] ? STATUS[st].icon : 'clock')) + '<b>' + t(txt) + '</b></div>' +
    '<p class="muted tiny trk-hint">' + t(hint) + '</p>';
  }
  function extraHtml(b) {
    var h = '';
    if (b.orig_date && b.orig_time && (b.orig_date !== b.date || b.orig_time !== b.time)) {
      h += '<div class="resched">' + UI.icon('calswap') + '<span><b>' + t('new_time') + ':</b> ' + Store.fmtDate(b.date) + ' · <b class="ltr">' + UI.esc(b.time) + '</b>' +
        ' <span class="muted">(' + t('was_time') + ' ' + Store.fmtDateShort(b.orig_date) + ' <span class="ltr">' + UI.esc(b.orig_time) + '</span>)</span></span></div>';
    }
    if (b.staff_note) h += '<div class="clinic-note">' + UI.icon('msg') + '<div><small>' + t('clinic_msg') + '</small><p dir="auto">' + UI.esc(b.staff_note) + '</p></div></div>';
    return h;
  }

  function detailsHtml(b) {
    return '<dl class="kv trk-kv">' +
      '<dt>' + t('doctor') + '</dt><dd>' + t('doctor_name') + ' · <span class="muted">' + t('specialty_dent') + '</span></dd>' +
      '<dt>' + t('service') + '</dt><dd>' + t('svc_' + b.service) + '</dd>' +
      '<dt>' + t('clinic') + '</dt><dd>' + t('clinicName') + '</dd>' +
      '<dt>' + t('when') + '</dt><dd>' + Store.fmtDate(b.date) + ' · <span class="ltr">' + UI.esc(b.time) + '</span></dd>' +
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
    myList: myList, myAdd: myAdd, myGet: myGet, myUpdate: myUpdate, myRemove: myRemove, fromServer: fromServer,
    pushOne: pushOne, syncPending: syncPending, refreshStatuses: refreshStatuses,
    statusKey: statusKey, statusChip: statusChip, trackerHtml: trackerHtml, extraHtml: extraHtml, detailsHtml: detailsHtml };
})(window);

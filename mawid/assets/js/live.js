/* AICore Mawʿid — live receptionist desk (index.html)
 * Supabase Auth (e-mail + password) → list every booking (RLS: staff only), filter, accept / reject /
 * reschedule / mark done, then open a prefilled WhatsApp message to the patient (a human presses Send).
 * The list refreshes every few seconds while the tab is visible. */
(function () {
  'use strict';
  var S = Store, root = document.getElementById('root');
  var CFG = window.MAWID_CONFIG || {};
  var POLL = Math.max(4000, CFG.pollStaffMs || 8000);
  var CACHE_KEY = 'mawid_staff_cache_v1';

  var EXTRA = {
    ar: {
      lv_title: 'طلبات الحجز', lv_lang: 'لغة المريض', wa_hint: 'تم حفظ القرار، والمريض يراه في صفحة «مواعيدي». هذه الرسالة لا تُرسل تلقائياً: راجعها ثم اضغط «فتح واتساب».', lv_sub: 'كل طلب يصل من صفحة الحجز يظهر هنا مباشرة.',
      lv_login_title: 'دخول موظفي الاستقبال', lv_login_sub: 'استعمل البريد وكلمة المرور التي أعطتك إياها العيادة.',
      lv_email: 'البريد الإلكتروني', lv_password: 'كلمة المرور', lv_login_btn: 'دخول',
      lv_login_err: 'البريد أو كلمة المرور غير صحيحة.', lv_login_net: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت.',
      lv_not_staff: 'هذا الحساب غير مسجّل كموظف استقبال.', lv_session_end: 'انتهت الجلسة، سجّل الدخول من جديد.',
      lv_login_note: 'حساب لكل موظف، وكل قرار يُسجَّل باسمه ووقته على الخادم.',
      lv_logout: 'خروج', lv_live: 'مباشر', lv_offline: 'غير متصل',
      lv_synced: 'آخر تحديث {time}', lv_offline_msg: 'تعذّر الاتصال بالخادم. نعرض آخر نسخة محمّلة، وسنعيد المحاولة تلقائياً.',
      lv_noconfig_title: 'الخادم غير مُعدّ بعد', lv_noconfig_body: 'أضف رابط مشروع Supabase والمفتاح العام في assets/js/config.js لتفعيل اللوحة الحيّة. في الأثناء يمكنك تجربة اللوحة التجريبية ببيانات وهمية.',
      lv_demo: 'اللوحة التجريبية (بيانات وهمية)', lv_book: 'صفحة الحجز للمرضى', lv_poster: 'ملصق QR للاستقبال',
      f_all: 'الكل', f_pending: 'قيد الانتظار', f_confirmed: 'مؤكدة', f_rejected: 'مرفوضة', f_done: 'تمت',
      w_all: 'كل التواريخ', w_today: 'اليوم', w_upcoming: 'القادمة', w_past: 'السابقة',
      lv_search: 'بحث بالاسم أو الهاتف أو رقم الحجز',
      k_pending: 'بانتظار القرار', k_today: 'مؤكدة اليوم', k_week: 'مؤكدة قادمة',
      lv_empty: 'لا توجد طلبات هنا.', lv_empty_pending: 'لا طلبات جديدة. ستظهر هنا فور وصولها.',
      a_accept: 'قبول', a_reject: 'رفض', a_resched: 'تغيير الوقت', a_done: 'تمت الزيارة', a_reopen: 'إعادة فتح', a_delete: 'حذف', a_wa: 'واتساب',
      m_accept_title: 'تأكيد الموعد', m_reject_title: 'رفض الطلب', m_resched_title: 'تغيير وقت الموعد',
      m_note: 'ملاحظة للمريض (اختياري)', m_note_ph: 'مثال: أحضر بطاقة التأمين',
      m_change_time: 'تغيير الوقت', m_keep_time: 'الإبقاء على الوقت المطلوب',
      m_reason: 'السبب', m_hitl: 'سيُسجَّل القرار باسمك ({staff}) مع الوقت، ثم تُجهَّز رسالة واتساب لترسلها بنفسك.',
      m_delete_confirm: 'حذف هذا الحجز نهائياً من الخادم؟',
      t_accepted: 'تم التأكيد', t_rejected: 'تم تسجيل الرفض', t_resched: 'تم تغيير الوقت', t_done: 'تم تسجيل الزيارة', t_reopened: 'أُعيد الطلب إلى الانتظار', t_deleted: 'تم الحذف',
      t_new: 'طلب جديد: {name}', t_err: 'تعذّر الحفظ: {msg}', t_slot_taken: 'هذا الوقت محجوز لطلب آخر.',
      wa_title: 'رسالة واتساب للمريض', wa_open: 'فتح واتساب', wa_copy: 'نسخ', wa_copied: 'تم النسخ', wa_lang: 'لغة الرسالة',
      lv_received: 'وصل {time}', lv_decided: '{action} بواسطة {who} · {time}', lv_moved: 'نُقل من {from}',
      lvw_confirm: 'السلام عليكم {name} 👋\nتم تأكيد موعدك في {clinic} ✅\n📅 {date}\n🕘 الساعة {time}\n🦷 {service}\nرقم الحجز: {ref}{moved}{note}\nتابع حالة موعدك: {link}\nيرجى الحضور قبل الموعد بعشر دقائق.\n— {clinicShort}',
      lvw_reject: 'السلام عليكم {name}،\nنعتذر، لم نتمكن من تأكيد موعدك يوم {date} الساعة {time}.{note}\nيمكنك اختيار وقت آخر من هنا: {bookLink}\nرقم الحجز: {ref}\n— {clinicShort}',
      lvw_pending: 'السلام عليكم {name}،\nوصلنا طلب موعدك ({service}) يوم {date} الساعة {time}، وسنؤكده لك قريباً.\nرقم الحجز: {ref}\nتابع الحالة: {link}\n— {clinicShort}',
      lvw_done: 'السلام عليكم {name}،\nشكراً لزيارتكم {clinic}. نتمنى لكم دوام الصحة 🌿\n— {clinicShort}',
      lvw_moved: '\n⚠️ تم تغيير الموعد (كان {old}).', lvw_note: '\n📝 {note}'
    },
    fr: {
      lv_title: 'Demandes de rendez-vous', lv_lang: 'Langue du patient', wa_hint: 'Décision enregistrée : le patient la voit sur « Mes rendez-vous ». Ce message n’est pas envoyé automatiquement : relisez-le puis touchez « Ouvrir WhatsApp ».', lv_sub: 'Chaque demande envoyée depuis la page de réservation apparaît ici en direct.',
      lv_login_title: 'Connexion accueil', lv_login_sub: 'Utilisez l’e-mail et le mot de passe fournis par la clinique.',
      lv_email: 'E-mail', lv_password: 'Mot de passe', lv_login_btn: 'Se connecter',
      lv_login_err: 'E-mail ou mot de passe incorrect.', lv_login_net: 'Serveur injoignable. Vérifiez la connexion.',
      lv_not_staff: 'Ce compte n’est pas autorisé pour l’accueil.', lv_session_end: 'Session expirée, reconnectez-vous.',
      lv_login_note: 'Un compte par personne ; chaque décision est enregistrée sur le serveur avec son nom et l’heure.',
      lv_logout: 'Déconnexion', lv_live: 'En direct', lv_offline: 'Hors ligne',
      lv_synced: 'Mis à jour à {time}', lv_offline_msg: 'Serveur injoignable. Dernière liste chargée affichée ; nouvelle tentative automatique.',
      lv_noconfig_title: 'Serveur pas encore configuré', lv_noconfig_body: 'Renseignez l’URL du projet Supabase et la clé publique dans assets/js/config.js pour activer le tableau de bord en direct. En attendant, essayez la démo avec des données fictives.',
      lv_demo: 'Démo (données fictives)', lv_book: 'Page de réservation patients', lv_poster: 'Affiche QR',
      f_all: 'Tous', f_pending: 'En attente', f_confirmed: 'Confirmés', f_rejected: 'Refusés', f_done: 'Terminés',
      w_all: 'Toutes dates', w_today: 'Aujourd’hui', w_upcoming: 'À venir', w_past: 'Passés',
      lv_search: 'Rechercher nom, téléphone ou n° RDV',
      k_pending: 'À décider', k_today: 'Confirmés aujourd’hui', k_week: 'Confirmés à venir',
      lv_empty: 'Aucune demande ici.', lv_empty_pending: 'Aucune nouvelle demande. Elles apparaîtront ici dès leur arrivée.',
      a_accept: 'Accepter', a_reject: 'Refuser', a_resched: 'Changer l’heure', a_done: 'Terminé', a_reopen: 'Rouvrir', a_delete: 'Supprimer', a_wa: 'WhatsApp',
      m_accept_title: 'Confirmer le rendez-vous', m_reject_title: 'Refuser la demande', m_resched_title: 'Changer l’heure du rendez-vous',
      m_note: 'Note pour le patient (facultatif)', m_note_ph: 'Ex. : apportez votre carte d’assurance',
      m_change_time: 'Changer l’heure', m_keep_time: 'Garder l’horaire demandé',
      m_reason: 'Motif', m_hitl: 'La décision est enregistrée à votre nom ({staff}) avec l’heure, puis un message WhatsApp est préparé : c’est vous qui l’envoyez.',
      m_delete_confirm: 'Supprimer définitivement cette réservation du serveur ?',
      t_accepted: 'Rendez-vous confirmé', t_rejected: 'Refus enregistré', t_resched: 'Horaire modifié', t_done: 'Consultation enregistrée', t_reopened: 'Demande remise en attente', t_deleted: 'Supprimé',
      t_new: 'Nouvelle demande : {name}', t_err: 'Échec de l’enregistrement : {msg}', t_slot_taken: 'Ce créneau est déjà pris par une autre demande.',
      wa_title: 'Message WhatsApp au patient', wa_open: 'Ouvrir WhatsApp', wa_copy: 'Copier', wa_copied: 'Copié', wa_lang: 'Langue du message',
      lv_received: 'Reçu {time}', lv_decided: '{action} par {who} · {time}', lv_moved: 'déplacé depuis {from}',
      lvw_confirm: 'Bonjour {name} 👋\nVotre rendez-vous à la {clinic} est confirmé ✅\n📅 {date}\n🕘 {time}\n🦷 {service}\nN° de réservation : {ref}{moved}{note}\nSuivre votre rendez-vous : {link}\nMerci d’arriver 10 minutes en avance.\n— {clinicShort}',
      lvw_reject: 'Bonjour {name},\nNous ne pouvons malheureusement pas confirmer votre rendez-vous du {date} à {time}.{note}\nVous pouvez choisir un autre créneau ici : {bookLink}\nN° de réservation : {ref}\n— {clinicShort}',
      lvw_pending: 'Bonjour {name},\nNous avons bien reçu votre demande ({service}) pour le {date} à {time}. Nous vous confirmons très vite.\nN° de réservation : {ref}\nSuivi : {link}\n— {clinicShort}',
      lvw_done: 'Bonjour {name},\nMerci de votre visite à la {clinic}. Nous vous souhaitons une bonne santé 🌿\n— {clinicShort}',
      lvw_moved: '\n⚠️ Horaire modifié (au lieu de {old}).', lvw_note: '\n📝 {note}'
    }
  };
  Object.keys(EXTRA).forEach(function (l) { Object.assign(I18N.dict[l], EXTRA[l]); });

  var app = {
    bookings: loadCache(), staffName: '', filter: 'pending', when: 'all', q: '',
    net: 'loading', lastSync: null, known: null, flash: {}, timer: null, loginMsg: ''
  };

  function loadCache() { try { var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return Array.isArray(c) ? c : []; } catch (e) { return []; } }
  function saveCache() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(app.bookings)); } catch (e) {} }
  function clearCache() { try { localStorage.removeItem(CACHE_KEY); } catch (e) {} }
  function esc(s) { return UI.esc(s); }
  function T() { return S.todayKey(); }
  function hm(d) { return S.pad(d.getHours()) + ':' + S.pad(d.getMinutes()); }
  function langBtn() { return '<button class="pill-btn" id="langBtn" type="button">' + UI.icon('globe') + '<span>' + t('langSwitch') + '</span></button>'; }
  function brand() { return '<div class="brand">' + UI.LOGO + '<div class="grow"><div class="brand-name">' + t('product') + '</div><div class="brand-sub">' + t('subtitle') + '</div></div></div>'; }
  function bindLang() { var b = document.getElementById('langBtn'); if (b) b.onclick = function () { I18N.setLang(I18N.lang === 'ar' ? 'fr' : 'ar'); render(); }; }
  function footer() { return '<footer class="footer"><div class="tagline">' + t('tagline') + '</div><div><b>AICore موعد</b> · ' + t('footer') + '</div></footer>'; }

  /* ---------------- shells ---------------- */
  function render() {
    I18N.applyDir();
    if (!API.enabled) return renderNoConfig();
    if (!API.session()) return renderLogin();
    renderMain();
  }

  function heroShell(inner) {
    root.innerHTML = '<div class="login-wrap"><header class="appbar login-hero"><div class="appbar-top">' + brand() + langBtn() + '</div>' +
      '<div class="tag">' + t('tagline') + '</div><div class="clinic-line">' + UI.icon('tooth') + '<span>' + t('clinicName') + '</span></div></header>' +
      inner + footer() + '</div>';
    bindLang();
  }

  function renderNoConfig() {
    document.title = t('product') + ' – ' + t('lv_noconfig_title');
    heroShell('<section class="card login-card"><div class="card-title">' + UI.icon('alert') + t('lv_noconfig_title') + '</div>' +
      '<p class="muted small">' + t('lv_noconfig_body') + '</p>' +
      '<a class="btn btn-primary btn-block" style="margin-top:14px" href="demo.html">' + UI.icon('chart') + '<span>' + t('lv_demo') + '</span></a>' +
      '<a class="btn btn-ghost btn-block" style="margin-top:10px" href="book.html">' + UI.icon('calendar') + '<span>' + t('lv_book') + '</span></a></section>');
  }

  function renderLogin() {
    stopPoll();
    document.title = t('product') + ' – ' + t('lv_login_title');
    heroShell('<section class="card login-card"><div class="card-title">' + UI.icon('lock') + t('lv_login_title') + '</div>' +
      '<p class="muted small" style="margin-bottom:12px">' + t('lv_login_sub') + '</p>' +
      '<form id="loginForm" novalidate>' +
      '<label class="field"><span class="label">' + t('lv_email') + '</span><input class="input ltr-input" id="lEmail" type="email" autocomplete="username" inputmode="email" required></label>' +
      '<label class="field"><span class="label">' + t('lv_password') + '</span><input class="input ltr-input" id="lPass" type="password" autocomplete="current-password" required></label>' +
      '<div class="err-msg' + (app.loginMsg ? '' : ' hidden') + '" id="lErr" role="alert">' + esc(app.loginMsg ? t(app.loginMsg) : '') + '</div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:14px" type="submit" id="lBtn">' + UI.icon('lock') + '<span>' + t('lv_login_btn') + '</span></button></form>' +
      '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('lv_login_note') + '</span></div></section>' +
      '<div class="container" style="padding-top:4px"><a class="btn btn-ghost btn-block" href="book.html">' + UI.icon('calendar') + '<span>' + t('lv_book') + '</span></a>' +
      '<a class="btn btn-ghost btn-block" style="margin-top:8px" href="demo.html">' + UI.icon('chart') + '<span>' + t('lv_demo') + '</span></a></div>');
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var em = document.getElementById('lEmail').value.trim(), pw = document.getElementById('lPass').value, btn = document.getElementById('lBtn'), er = document.getElementById('lErr');
      function fail(k) { er.textContent = t(k); er.classList.remove('hidden'); btn.disabled = false; }
      if (!em || !pw) return fail('lv_login_err');
      btn.disabled = true; btn.innerHTML = '<span class="spin light"></span><span>' + t('lv_login_btn') + '</span>';
      API.login(em, pw).then(function () { return API.isStaff(); }).then(function (okStaff) {
        if (okStaff !== true) { API.logout(); throw { message: 'not_staff' }; }
        app.loginMsg = ''; app.known = null; app.bookings = []; render();
      }).catch(function (err) {
        btn.innerHTML = UI.icon('lock') + '<span>' + t('lv_login_btn') + '</span>';
        fail(err && err.message === 'not_staff' ? 'lv_not_staff' : err && err.status === 0 ? 'lv_login_net' : 'lv_login_err');
      });
    });
  }

  function renderMain() {
    var counts = { all: app.bookings.length, pending: 0, confirmed: 0, rejected: 0, done: 0 };
    app.bookings.forEach(function (b) { counts[b.status] = (counts[b.status] || 0) + 1; });
    var today = T();
    var kToday = app.bookings.filter(function (b) { return b.status === 'confirmed' && b.appt_date === today; }).length;
    var kNext = app.bookings.filter(function (b) { return b.status === 'confirmed' && b.appt_date > today; }).length;
    document.title = (counts.pending ? '(' + counts.pending + ') ' : '') + t('product') + ' – ' + t('lv_title');
    var live = app.net === 'offline'
      ? '<span class="live-pill off">' + UI.icon('alert') + '<span>' + t('lv_offline') + '</span></span>'
      : '<span class="live-pill"><span class="live-dot"></span><span>' + t('lv_live') + '</span></span>';
    var sess = API.session() || {};
    root.innerHTML =
      '<div class="app live-app">' +
        '<header class="appbar"><div class="appbar-top">' + brand() +
          '<div class="appbar-actions">' + live + langBtn() +
            '<button class="pill-btn icon-only" id="logoutBtn" type="button" title="' + esc(t('lv_logout') + ' · ' + (app.staffName || sess.email || '')) + '" aria-label="' + esc(t('lv_logout')) + '">' + UI.icon('logout', 'flip') + '</button>' +
          '</div></div>' +
          '<div class="clinic-line">' + UI.icon('tooth') + '<span>' + t('clinicName') + '</span>' + (app.staffName || sess.email ? '<span class="who-chip">' + UI.icon('user') + esc(app.staffName || sess.email) + '</span>' : '') + '</div>' +
        '</header>' +
        '<main class="container live-main" id="view">' +
          '<div class="page-head"><div><h2>' + t('lv_title') + '</h2><p id="syncLine">' + syncText() + '</p></div>' +
            '<button class="icon-btn" id="refreshBtn" type="button" title="' + esc(t('refresh')) + '" aria-label="' + esc(t('refresh')) + '">' + UI.icon('refresh') + '</button></div>' +
          (app.net === 'offline' ? '<div class="sync-bar off" role="status">' + UI.icon('alert') + '<span>' + t('lv_offline_msg') + '</span></div>' : '') +
          '<div class="kpis live-kpis">' +
            kpi('clock', t('k_pending'), counts.pending, counts.pending ? 'hl' : '') + kpi('calcheck', t('k_today'), kToday, '') + kpi('calendar', t('k_week'), kNext, '') +
          '</div>' +
          '<div class="tabs live-tabs" role="tablist">' + ['pending', 'confirmed', 'rejected', 'done', 'all'].map(function (f) {
            return '<button class="tab' + (app.filter === f ? ' active' : '') + '" role="tab" aria-selected="' + (app.filter === f) + '" data-f="' + f + '"><span>' + t('f_' + f) + '</span><span class="cnt">' + (counts[f] || 0) + '</span></button>';
          }).join('') + '</div>' +
          '<div class="filter-row live-filter"><div class="search-box">' + UI.icon('search') + '<input class="input" id="qInput" type="search" value="' + esc(app.q) + '" placeholder="' + esc(t('lv_search')) + '"></div></div>' +
          '<div class="filters">' + ['all', 'today', 'upcoming', 'past'].map(function (w) {
            return '<button class="fchip' + (app.when === w ? ' on' : '') + '" type="button" data-w="' + w + '">' + t('w_' + w) + '</button>';
          }).join('') + '</div>' +
          '<div class="list-grid" id="list">' + listHtml() + '</div>' +
          '<div class="desk-links"><a class="btn btn-ghost btn-sm" href="book.html" target="_blank" rel="noopener">' + UI.icon('calendar') + '<span>' + t('lv_book') + '</span></a>' +
          '<a class="btn btn-ghost btn-sm" href="share.html">' + UI.icon('qr') + '<span>' + t('lv_poster') + '</span></a></div>' +
          footer() +
        '</main>' +
      '</div>';
    bindLang();
    document.getElementById('logoutBtn').onclick = function () { API.logout(); clearCache(); app.bookings = []; app.known = null; app.staffName = ''; render(); };
    document.getElementById('refreshBtn').onclick = function () { poll(true); };
    root.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { app.filter = b.dataset.f; renderMain(); }; });
    root.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { app.when = b.dataset.w; renderMain(); }; });
    var q = document.getElementById('qInput');
    q.addEventListener('input', function () { app.q = q.value; document.getElementById('list').innerHTML = listHtml(); });
    document.getElementById('list').addEventListener('click', onListClick);
    app.flash = {};
    if (!app.timer) poll();
  }

  function kpi(ic, label, v, cls) {
    return '<div class="card kpi ' + cls + '"><div class="k-l">' + UI.icon(ic) + '<span>' + esc(label) + '</span></div><div class="k-v">' + v + '</div></div>';
  }
  function syncText() {
    if (app.net === 'loading') return '<span class="spin"></span> ' + t('lv_sub');
    return t('lv_sub') + (app.lastSync ? ' <span class="nowrap">' + t('lv_synced', { time: '<b class="ltr">' + hm(app.lastSync) + '</b>' }) + '</span>' : '');
  }

  /* ---------------- list ---------------- */
  function visible() {
    var today = T(), q = app.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    var list = app.bookings.filter(function (b) {
      if (app.filter !== 'all' && b.status !== app.filter) return false;
      if (app.when === 'today' && b.appt_date !== today) return false;
      if (app.when === 'upcoming' && b.appt_date < today) return false;
      if (app.when === 'past' && b.appt_date >= today) return false;
      if (q) {
        var hay = (b.name + ' ' + b.ref).toLowerCase();
        if (hay.indexOf(q) < 0 && !(qd.length >= 3 && b.phone.indexOf(qd) >= 0)) return false;
      }
      return true;
    });
    var byAppt = app.filter === 'pending' || app.filter === 'confirmed';
    list.sort(function (a, b) {
      if (byAppt) { var ka = a.appt_date + a.appt_time, kb = b.appt_date + b.appt_time; return ka < kb ? -1 : ka > kb ? 1 : 0; }
      return a.created_at < b.created_at ? 1 : -1;
    });
    return list;
  }
  function listHtml() {
    var l = visible();
    if (!l.length) {
      return '<div class="empty card">' + UI.icon(app.filter === 'pending' ? 'inbox' : 'search') + '<p>' + t(app.filter === 'pending' && !app.q ? 'lv_empty_pending' : 'lv_empty') + '</p></div>';
    }
    return l.map(card).join('');
  }
  function whenBox(date, time) {
    var d = S.parseKey(date);
    var w1 = date === T() ? t('today') : date === S.addDays(T(), 1) ? t('tomorrow') : new Intl.DateTimeFormat(I18N.locale(), { weekday: 'short' }).format(d);
    return '<div class="bk-when"><div class="w1">' + w1 + '</div><div class="w2">' + esc(time) + '</div><div class="w3">' + new Intl.DateTimeFormat(I18N.locale(), { day: 'numeric', month: 'short' }).format(d) + '</div></div>';
  }
  function svcIcon(id) { return (S.SERVICES.find(function (s) { return s.id === id; }) || S.SERVICES[0]).icon; }
  function card(b) {
    var st = b.status;
    var h = '<article class="card bk live-bk st-' + st + (st === 'pending' ? ' new' : '') + (app.flash[b.id] ? ' flash' : '') + '" data-id="' + esc(b.id) + '">' +
      '<div class="bk-top">' + whenBox(b.appt_date, b.appt_time) +
        '<div class="grow"><div class="bk-name" dir="auto">' + esc(b.name) + '</div>' +
        '<div class="bk-meta"><span>' + UI.icon(svcIcon(b.service)) + t('svc_' + b.service) + '</span><span class="ltr">' + UI.icon('phone') + S.phoneDisplay(b.phone) + '</span><span class="ltr num ref-mono">' + esc(b.ref) + '</span></div></div>' +
        '<button class="icon-btn" data-act="delete" title="' + esc(t('a_delete')) + '" aria-label="' + esc(t('a_delete')) + '">' + UI.icon('trash') + '</button>' +
      '</div>' +
      (b.note ? '<div class="bk-note">' + UI.icon('note') + '<span dir="auto">' + esc(b.note) + '</span></div>' : '') +
      (b.staff_note ? '<div class="clinic-note small-note">' + UI.icon('msg') + '<div><small>' + t('clinic_msg') + '</small><p dir="auto">' + esc(b.staff_note) + '</p></div></div>' : '') +
      '<div class="bk-chips">' + Notify.statusChip(b) +
        (b.deposit ? '<span class="chip warn">' + UI.icon('wallet') + t('dep_awaiting') + '</span>' : '') +
        (b.orig_date ? '<span class="chip accent">' + UI.icon('calswap') + t('lv_moved', { from: S.fmtDateShort(b.orig_date) + ' ' + esc(b.orig_time) }) + '</span>' : '') +
        '<span class="chip gray" title="' + esc(t('lv_lang')) + '">' + UI.icon('globe') + (b.lang === 'fr' ? 'Français' : 'عربي') + '</span></div>';
    h += '<div class="bk-actions">';
    if (st === 'pending') {
      h += '<button class="btn btn-ok" data-act="accept">' + UI.icon('check') + '<span>' + t('a_accept') + '</span></button>' +
        '<button class="btn btn-bad" data-act="reject">' + UI.icon('x') + '<span>' + t('a_reject') + '</span></button>' +
        '<button class="btn btn-sm btn-soft" data-act="resched">' + UI.icon('calswap') + '<span>' + t('a_resched') + '</span></button>';
    } else if (st === 'confirmed') {
      h += '<button class="btn btn-sm btn-ok" data-act="done">' + UI.icon('usercheck') + '<span>' + t('a_done') + '</span></button>' +
        '<button class="btn btn-sm btn-soft" data-act="resched">' + UI.icon('calswap') + '<span>' + t('a_resched') + '</span></button>' +
        '<button class="btn btn-sm btn-bad" data-act="reject">' + UI.icon('x') + '<span>' + t('a_reject') + '</span></button>';
    } else if (st === 'rejected') {
      h += '<button class="btn btn-sm btn-soft" data-act="reopen">' + UI.icon('refresh') + '<span>' + t('a_reopen') + '</span></button>';
    }
    h += '<a class="btn btn-sm btn-wa" data-act="wa" target="_blank" rel="noopener" href="' + esc(waLink(b, b.lang)) + '">' + UI.icon('wa') + '<span>' + t('a_wa') + '</span></a></div>';
    var trail = ['<div>' + UI.icon('inbox') + '<span>' + t('lv_received', { time: S.fmtStamp(b.created_at) }) + '</span></div>'];
    if (b.decided_at && b.decided_by) trail.push('<div>' + UI.icon(st === 'rejected' ? 'x' : 'check') + '<span>' + t('lv_decided', { action: t('st2_' + st), who: esc(b.decided_by), time: S.fmtStamp(b.decided_at) }) + '</span></div>');
    h += '<div class="bk-trail">' + trail.join('') + '</div></article>';
    return h;
  }

  /* ---------------- WhatsApp messages ---------------- */
  function trackLink() { return new URL('mes-rendez-vous.html', location.href).href; }
  function bookLink() { return new URL('book.html', location.href).href; }
  function msg(b, lang, kind) {
    kind = kind || (b.status === 'confirmed' ? 'confirm' : b.status === 'rejected' ? 'reject' : b.status === 'done' ? 'done' : 'pending');
    var v = {
      name: b.name, ref: b.ref, clinic: I18N.t('clinicName', null, lang), clinicShort: I18N.t('clinicShort', null, lang),
      service: I18N.t('svc_' + b.service, null, lang), date: S.fmtDate(b.appt_date, lang), time: b.appt_time,
      link: trackLink(), bookLink: bookLink(), moved: '', note: ''
    };
    if (b.orig_date && kind === 'confirm') v.moved = I18N.t('lvw_moved', { old: S.fmtDate(b.orig_date, lang) + ' ' + b.orig_time }, lang);
    if (b.staff_note) v.note = I18N.t('lvw_note', { note: b.staff_note }, lang);
    return I18N.t('lvw_' + kind, v, lang);
  }
  function waLink(b, lang, text) { return 'https://wa.me/222' + b.phone + '?text=' + encodeURIComponent(text || msg(b, lang || b.lang)); }

  function draftModal(b) {
    var lang = b.lang === 'fr' ? 'fr' : 'ar';
    var body = '<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="small muted">' + t('wa_lang') + '</span>' +
      '<div class="seg" id="waSeg"><button type="button" data-l="ar"' + (lang === 'ar' ? ' class="on"' : '') + '>العربية</button><button type="button" data-l="fr"' + (lang === 'fr' ? ' class="on"' : '') + '>Français</button></div></div>' +
      '<textarea class="textarea wa-edit" id="waText" dir="auto" rows="10"></textarea>' +
      '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('wa_hint') + '</span></div>';
    var m = UI.modal({
      title: t('wa_title'), sub: b.name + ' · +222 ' + S.phoneDisplay(b.phone).replace('+222 ', ''), body: body,
      actions: [
        { label: t('wa_copy'), cls: 'btn-ghost', icon: 'copy', onClick: function () { UI.copyText(document.getElementById('waText').value); UI.toast(t('wa_copied')); } },
        { label: t('wa_open'), cls: 'btn-wa', icon: 'wa', id: 'waGo', href: waLink(b, lang) }
      ]
    });
    var ta = document.getElementById('waText'), go = document.getElementById('waGo');
    function set(l) { lang = l; ta.value = msg(b, l); ta.dir = l === 'ar' ? 'rtl' : 'ltr'; go.href = waLink(b, l, ta.value); m.el.querySelectorAll('#waSeg button').forEach(function (x) { x.classList.toggle('on', x.dataset.l === l); }); }
    ta.addEventListener('input', function () { go.href = waLink(b, lang, ta.value); });
    m.el.querySelector('#waSeg').addEventListener('click', function (e) { var x = e.target.closest('[data-l]'); if (x) set(x.dataset.l); });
    set(lang);
  }

  /* ---------------- actions ---------------- */
  function find(id) { return app.bookings.find(function (b) { return b.id === id; }); }
  function replace(row) {
    var i = app.bookings.findIndex(function (b) { return b.id === row.id; });
    if (i >= 0) app.bookings[i] = row; else app.bookings.unshift(row);
    app.flash[row.id] = 1; saveCache();
  }
  function errMsg(e) {
    if (e && /bookings_slot_active|duplicate key/.test(e.message || '')) return t('t_slot_taken');
    if (e && e.status === 0) return t('lv_login_net');
    return t('t_err', { msg: (e && e.message) || '?' });
  }
  function save(b, patch, toastKey, thenDraft) {
    return API.updateBooking(b.id, patch).then(function (row) {
      replace(row); renderMain(); UI.toast(t(toastKey));
      if (thenDraft) setTimeout(function () { draftModal(row); }, 200);
      return row;
    }, function (e) {
      if (e && (e.status === 401 || e.message === 'no_session')) return sessionEnded();
      UI.toast(errMsg(e), 'err'); throw e;
    });
  }

  function takenMap(excludeId) {
    var m = {};
    app.bookings.forEach(function (x) { if (x.id !== excludeId && (x.status === 'pending' || x.status === 'confirmed')) m[x.appt_date + ' ' + x.appt_time] = 1; });
    return m;
  }
  function pickerHtml(b) {
    var days = [], d = T();
    for (var i = 0; days.length < 14 && i < 30; i++) { if (!S.isClosed(d)) days.push(d); d = S.addDays(d, 1); }
    if (days.indexOf(b.appt_date) < 0 && b.appt_date >= T()) days.unshift(b.appt_date);
    return '<div class="picker"><select class="select" id="pDate">' + days.map(function (k) {
      return '<option value="' + k + '"' + (k === b.appt_date ? ' selected' : '') + '>' + S.fmtDate(k) + '</option>';
    }).join('') + '</select><select class="select ltr-input" id="pTime"></select></div>';
  }
  function bindPicker(b) {
    var ds = document.getElementById('pDate'), ts = document.getElementById('pTime');
    function fill() {
      var tk = takenMap(b.id), now = new Date(), cur = ts.value || b.appt_time;
      ts.innerHTML = S.SLOTS.map(function (sl) {
        var dis = tk[ds.value + ' ' + sl] || S.at(ds.value, sl) <= now;
        return '<option value="' + sl + '"' + (dis ? ' disabled' : '') + (sl === cur && !dis ? ' selected' : '') + '>' + sl + (tk[ds.value + ' ' + sl] ? ' ✕' : '') + '</option>';
      }).join('');
      if (ts.selectedOptions[0] && ts.selectedOptions[0].disabled) { var f = ts.querySelector('option:not([disabled])'); if (f) f.selected = true; }
    }
    ds.addEventListener('change', function () { ts.value = ''; fill(); });
    fill();
    return function () { return { date: ds.value, time: ts.value }; };
  }
  function miniSummary(b) {
    return '<div class="mini-sum"><div class="bk-top">' + whenBox(b.appt_date, b.appt_time) +
      '<div class="grow"><div class="bk-name" dir="auto">' + esc(b.name) + '</div><div class="bk-meta"><span>' + t('svc_' + b.service) + '</span><span class="ltr">' + esc(b.ref) + '</span></div>' +
      '<div class="small muted">' + S.fmtDate(b.appt_date) + ' · <span class="ltr">' + esc(b.appt_time) + '</span></div></div></div>' +
      (b.note ? '<div class="bk-note">' + UI.icon('note') + '<span dir="auto">' + esc(b.note) + '</span></div>' : '') + '</div>';
  }
  function hitl() { return '<div class="hitl-note">' + UI.icon('shield') + '<span>' + t('m_hitl', { staff: esc(app.staffName || (API.session() || {}).email || '') }) + '</span></div>'; }

  function acceptModal(b) {
    var getSlot = null;
    UI.modal({
      title: t('m_accept_title'),
      body: miniSummary(b) +
        '<label class="check soft" style="margin-top:12px"><input type="checkbox" id="mMove"><span>' + t('m_change_time') + '</span></label>' +
        '<div id="mPick" class="hidden" style="margin-top:8px">' + pickerHtml(b) + '</div>' +
        '<label class="field" style="margin-top:12px"><span class="label">' + t('m_note') + '</span><textarea class="textarea" id="mNote" maxlength="300" dir="auto" placeholder="' + esc(t('m_note_ph')) + '">' + esc(b.staff_note || '') + '</textarea></label>' + hitl(),
      onOpen: function () {
        getSlot = bindPicker(b);
        document.getElementById('mMove').addEventListener('change', function () { document.getElementById('mPick').classList.toggle('hidden', !this.checked); });
      },
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_accept'), cls: 'btn-ok', icon: 'check', id: 'mAcceptBtn', onClick: function (close, ev, el) {
          var patch = { status: 'confirmed', staff_note: document.getElementById('mNote').value.trim() };
          if (document.getElementById('mMove').checked) { var s = getSlot(); if (s.time && (s.date !== b.appt_date || s.time !== b.appt_time)) { patch.appt_date = s.date; patch.appt_time = s.time; } }
          el.disabled = true;
          save(b, patch, 't_accepted', true).then(close, function () { el.disabled = false; });
        } }
      ]
    });
  }
  function rejectModal(b) {
    var reasons = ['r_full', 'r_doctor', 'r_duplicate', 'r_other'], pick = 'r_full';
    UI.modal({
      title: t('m_reject_title'),
      body: miniSummary(b) + '<div class="label" style="margin-top:12px">' + t('m_reason') + '</div>' +
        '<div class="filters wrap" id="mReasons">' + reasons.map(function (r) { return '<button type="button" class="fchip' + (r === pick ? ' on' : '') + '" data-r="' + r + '">' + t(r) + '</button>'; }).join('') + '</div>' +
        '<label class="field" style="margin-top:8px"><span class="label">' + t('m_note') + '</span><textarea class="textarea" id="mNote" maxlength="300" dir="auto"></textarea></label>' + hitl(),
      onOpen: function (wrap) {
        var note = wrap.querySelector('#mNote');
        function fillNote() { note.value = I18N.t(pick, null, b.lang).replace(/^./, function (c) { return c.toUpperCase(); }); }
        fillNote();
        wrap.querySelector('#mReasons').addEventListener('click', function (e) {
          var x = e.target.closest('[data-r]'); if (!x) return; pick = x.dataset.r;
          wrap.querySelectorAll('#mReasons .fchip').forEach(function (c) { c.classList.toggle('on', c === x); }); fillNote();
        });
      },
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_reject'), cls: 'btn-bad-solid', icon: 'x', id: 'mRejectBtn', onClick: function (close, ev, el) {
          el.disabled = true;
          save(b, { status: 'rejected', staff_note: document.getElementById('mNote').value.trim() }, 't_rejected', true).then(close, function () { el.disabled = false; });
        } }
      ]
    });
  }
  function reschedModal(b) {
    var getSlot = null;
    UI.modal({
      title: t('m_resched_title'),
      body: miniSummary(b) + '<div style="margin-top:12px">' + pickerHtml(b) + '</div>' +
        '<label class="field" style="margin-top:12px"><span class="label">' + t('m_note') + '</span><textarea class="textarea" id="mNote" maxlength="300" dir="auto">' + esc(b.staff_note || '') + '</textarea></label>' + hitl(),
      onOpen: function () { getSlot = bindPicker(b); },
      actions: [
        { label: t('a_back'), cls: 'btn-ghost' },
        { label: t('a_save'), cls: 'btn-primary', icon: 'check', id: 'mReschedBtn', onClick: function (close, ev, el) {
          var s = getSlot(); if (!s.time) return;
          el.disabled = true;
          save(b, { appt_date: s.date, appt_time: s.time, staff_note: document.getElementById('mNote').value.trim() }, 't_resched', true).then(close, function () { el.disabled = false; });
        } }
      ]
    });
  }

  function onListClick(ev) {
    var btn = ev.target.closest('[data-act]'); if (!btn) return;
    var cardEl = btn.closest('[data-id]'); if (!cardEl) return;
    var b = find(cardEl.dataset.id); if (!b) return;
    var a = btn.dataset.act;
    if (a === 'wa') return; // plain link: one tap opens WhatsApp with the prefilled message
    if (a === 'accept') return acceptModal(b);
    if (a === 'reject') return rejectModal(b);
    if (a === 'resched') return reschedModal(b);
    if (a === 'done') return save(b, { status: 'done' }, 't_done', false).catch(function () {});
    if (a === 'reopen') return save(b, { status: 'pending' }, 't_reopened', false).catch(function () {});
    if (a === 'delete') {
      if (!window.confirm(t('m_delete_confirm') + '\n' + b.ref + ' · ' + b.name)) return;
      API.deleteBooking(b.id).then(function () {
        app.bookings = app.bookings.filter(function (x) { return x.id !== b.id; }); saveCache(); renderMain(); UI.toast(t('t_deleted'));
      }, function (e) { UI.toast(errMsg(e), 'err'); });
    }
  }

  /* ---------------- live refresh ---------------- */
  function sessionEnded() { API.logout(); clearCache(); app.bookings = []; app.known = null; app.loginMsg = 'lv_session_end'; render(); }
  function stopPoll() { clearTimeout(app.timer); app.timer = null; }
  function schedule() { clearTimeout(app.timer); app.timer = document.hidden ? null : setTimeout(poll, POLL); }
  function modalOpen() { return !!document.querySelector('.modal-wrap'); }
  function poll(manual) {
    clearTimeout(app.timer); app.timer = -1;
    if (!app.staffName) API.staffName().then(function (n) { if (n) { app.staffName = n; if (!modalOpen()) renderMain(); } }, function () {});
    return API.listBookings().then(function (rows) {
      rows = rows || [];
      if (app.known) {
        rows.forEach(function (r) {
          if (!app.known[r.id]) { app.flash[r.id] = 1; if (r.status === 'pending') UI.toast(t('t_new', { name: r.name })); }
          else if (app.known[r.id] !== r.updated_at) app.flash[r.id] = 1;
        });
      }
      app.known = {}; rows.forEach(function (r) { app.known[r.id] = r.updated_at; });
      app.bookings = rows; app.net = 'ok'; app.lastSync = new Date(); saveCache();
      if (!modalOpen() && !(document.activeElement && document.activeElement.id === 'qInput')) renderMain();
      else { var l = document.getElementById('list'); if (l) l.innerHTML = listHtml(); var sl = document.getElementById('syncLine'); if (sl) sl.innerHTML = syncText(); }
      schedule();
    }, function (e) {
      if (e && (e.status === 401 || e.message === 'no_session' || /JWT/i.test(e.message || ''))) return sessionEnded();
      app.net = 'offline';
      if (!modalOpen()) renderMain();
      schedule();
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && API.enabled && API.session()) poll(); else stopPoll(); });
  window.addEventListener('online', function () { if (API.enabled && API.session()) poll(); });

  render();
})();

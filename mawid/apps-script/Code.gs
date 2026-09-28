/**
 * AICore Mawʿid — Google Sheets + Apps Script version (supervised booking desk)
 * AICore موعد — مكتب المواعيد على واتساب تحت إشراف بشري
 * "النظام يرتّب، وموظفك يقرّر" · "Le système organise, votre équipe décide."
 *
 * by AICore Digital · aicoredigital.com
 *
 * WHAT THIS DOES
 *  - Bookings arrive in the "Bookings" tab (from a linked Google Form via onFormSubmit,
 *    from the optional doPost web endpoint, or typed by staff).
 *  - Staff select a row and use the "AICore موعد" menu to Confirm / Refuse / Mark paid /
 *    Mark attended / Mark no-show. Every action records the staff e-mail + timestamp in
 *    the row AND appends a line to the "Log" tab (audit log = human-in-the-loop proof).
 *  - Confirm/Refuse build a prefilled wa.me link. NOTHING is sent automatically:
 *    a human opens the link and presses "Send" in WhatsApp.
 *  - "Build tomorrow's reminders" lists tomorrow's confirmed appointments with one-tap
 *    wa.me links (in a generated "Reminders" tab + a dialog). Staff then mark each as sent.
 *  - "Daily summary" produces a WhatsApp-ready text for the clinic owner.
 *
 * Tabs: Bookings, Log, Staff (+ a generated "Reminders" tab).
 * Run "Setup sheets" once from the menu. See SETUP.md.
 *
 * DEMO/TEMPLATE: not tested against a live Google account by AICore in this package.
 * Review before use with real patient data (consent, access control, data retention).
 */

/* ============================== CONFIG ============================== */
var CONFIG = {
  TZ: 'Africa/Nouakchott',                 // GMT, no DST
  CLINIC_AR: 'عيادة الأمل لطب الأسنان',
  CLINIC_FR: 'Clinique dentaire Al Amal',
  CLINIC_WA: '22200000000',                // clinic WhatsApp number, digits only (placeholder)
  ADDRESS_AR: 'شارع التجربة رقم 00، تفرغ زينة، نواكشوط (عنوان وهمي)',
  ADDRESS_FR: 'Rue de la Démo n° 00, Tevragh Zeina, Nouakchott (adresse fictive)',
  COUNTRY_CODE: '222',
  DEPOSIT_MRU: 500,
  CLOSED_WEEKDAY: 5,                       // 5 = Friday (0 = Sunday)
  REQUIRE_STAFF_LIST: true,                // only e-mails listed (Active = TRUE) in "Staff" may act
  OWNER_EMAIL: ''                          // optional: for sendDailySummaryEmail()
};

var SHEETS = { BOOKINGS: 'Bookings', LOG: 'Log', STAFF: 'Staff', REMINDERS: 'Reminders' };

var BOOKING_HEADERS = [
  'Ref', 'CreatedAt', 'Name', 'Phone', 'Lang', 'Service', 'Date', 'Time', 'Note', 'Status',
  'DecidedBy', 'DecidedAt', 'Deposit', 'DepositVerifiedBy', 'DepositVerifiedAt',
  'ReminderSentBy', 'ReminderSentAt', 'Attendance', 'AttendanceBy', 'AttendanceAt', 'WhatsAppLink'
];
var LOG_HEADERS = ['Timestamp', 'Actor', 'Action', 'Ref', 'Details'];
var STAFF_HEADERS = ['Email', 'Name', 'Role', 'Active'];

var STATUS = { PENDING: 'Pending', CONFIRMED: 'Confirmed', REFUSED: 'Refused', CANCELLED: 'Cancelled' };
var DEPOSIT = { NONE: 'None', AWAITING: 'Awaiting payment', VERIFIED: 'Paid – verified' };

var SERVICES = {
  general:    { ar: 'فحص عام',          fr: 'Consultation générale', price: 1000 },
  cleaning:   { ar: 'تنظيف الأسنان',     fr: 'Détartrage',            price: 2500 },
  filling:    { ar: 'حشو وعلاج تسوس',    fr: 'Soins et caries',       price: 2000 },
  extraction: { ar: 'خلع ضرس',           fr: 'Extraction',            price: 1800 },
  ortho:      { ar: 'تقويم الأسنان',     fr: 'Orthodontie',           price: 1500 },
  emergency:  { ar: 'حالة طارئة',        fr: 'Urgence',               price: 1200 }
};

/* ============================== MENU ============================== */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AICore موعد')
    .addItem('✅ Confirm selected booking · تأكيد', 'confirmSelected')
    .addItem('❌ Refuse selected booking · رفض', 'refuseSelected')
    .addItem('💳 Mark deposit paid (verified) · تحقق من الدفع', 'markPaidSelected')
    .addSeparator()
    .addItem('🙋 Mark attended · حضر', 'markAttendedSelected')
    .addItem('🚫 Mark no-show · لم يحضر', 'markNoShowSelected')
    .addSeparator()
    .addItem('🔔 Build tomorrow’s reminders · تذكيرات الغد', 'buildTomorrowReminders')
    .addItem('✉️ Mark reminder sent (selected) · تسجيل إرسال التذكير', 'markReminderSentSelected')
    .addSeparator()
    .addItem('📋 Daily summary · ملخص اليوم', 'showDailySummary')
    .addSeparator()
    .addItem('⚙️ Setup sheets (first run)', 'setupSheets')
    .addItem('🧪 Add demo booking (fictional)', 'addDemoBooking')
    .addToUi();
}

/* ============================== SETUP ============================== */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.TZ);
  ensureSheet_(ss, SHEETS.BOOKINGS, BOOKING_HEADERS);
  ensureSheet_(ss, SHEETS.LOG, LOG_HEADERS);
  var staff = ensureSheet_(ss, SHEETS.STAFF, STAFF_HEADERS);
  var me = Session.getActiveUser().getEmail();
  if (staff.getLastRow() < 2 && me) {
    staff.appendRow([me, 'Owner', 'owner', true]);
  }
  var b = ss.getSheetByName(SHEETS.BOOKINGS);
  var statusCol = col_('Status');
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList([STATUS.PENDING, STATUS.CONFIRMED, STATUS.REFUSED, STATUS.CANCELLED], true).build();
  b.getRange(2, statusCol, Math.max(b.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  b.getRange(2, col_('Date'), Math.max(b.getMaxRows() - 1, 1), 1).setNumberFormat('yyyy-mm-dd');
  b.getRange(2, col_('Phone'), Math.max(b.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  b.getRange(2, col_('Time'), Math.max(b.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  log_(actorOrSystem_(), 'setup', '', 'Sheets initialised');
  SpreadsheetApp.getUi().alert('AICore موعد', 'Sheets ready: Bookings, Log, Staff.\nAdd your staff e-mails in "Staff" (Active = TRUE).', SpreadsheetApp.getUi().ButtonSet.OK);
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#073B4C').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ============================== STAFF / AUTH ============================== */
/**
 * Returns the acting staff member {email, name}. Throws if not allowed.
 * NOTE: Session.getActiveUser() returns the e-mail of the person clicking the menu
 * (after they authorise the script). In some consumer-account setups it can be empty;
 * we then ask for a name and log it as "unverified:<name>".
 */
function currentStaff_() {
  var email = Session.getActiveUser().getEmail();
  var staff = readStaff_();
  if (email) {
    var s = staff.filter(function (x) { return x.email.toLowerCase() === email.toLowerCase(); })[0];
    if (s && s.active) return { email: email, name: s.name || email };
    if (!CONFIG.REQUIRE_STAFF_LIST) return { email: email, name: email };
    throw new Error('Not in Staff list (or inactive): ' + email + '\nغير مسجّل في قائمة الموظفين.');
  }
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('AICore موعد', 'Your name (e-mail not available) · اسمك:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) throw new Error('Cancelled');
  return { email: 'unverified:' + r.getResponseText().trim(), name: r.getResponseText().trim() };
}

function readStaff_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.STAFF);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, STAFF_HEADERS.length).getValues().map(function (r) {
    return { email: String(r[0]).trim(), name: String(r[1]).trim(), role: String(r[2]).trim(), active: r[3] === true || String(r[3]).toUpperCase() === 'TRUE' };
  }).filter(function (s) { return s.email; });
}

function actorOrSystem_() {
  try { return Session.getActiveUser().getEmail() || 'system'; } catch (e) { return 'system'; }
}

/* ============================== HELPERS ============================== */
function col_(header) {
  var i = BOOKING_HEADERS.indexOf(header);
  if (i < 0) throw new Error('Unknown column ' + header);
  return i + 1;
}
function bookingsSheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.BOOKINGS);
  if (!sh) throw new Error('Run "Setup sheets" first.');
  return sh;
}
function now_() { return new Date(); }
function fmtStamp_(d) { return Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd HH:mm'); }

/** Normalise a Date cell or 'YYYY-MM-DD' string to 'YYYY-MM-DD' in clinic time zone. */
function dateKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd');
  return String(v || '').trim().slice(0, 10);
}
/** Normalise a time cell (Date or 'HH:mm') to 'HH:mm'. */
function timeKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CONFIG.TZ, 'HH:mm');
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})[:h.](\d{2})/);
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : s;
}
function addDaysKey_(key, n) {
  var p = key.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n, 12));
  return Utilities.formatDate(d, 'GMT', 'yyyy-MM-dd');
}
function todayKey_() { return Utilities.formatDate(now_(), CONFIG.TZ, 'yyyy-MM-dd'); }
function weekdayOf_(key) { var p = key.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)).getUTCDay(); }
function nextOpenDay_(key) { var d = addDaysKey_(key, 1); while (weekdayOf_(d) === CONFIG.CLOSED_WEEKDAY) d = addDaysKey_(d, 1); return d; }

function prettyDate_(key, lang) {
  var p = key.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
  var daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغشت', 'شتمبر', 'أكتوبر', 'نوفمبر', 'دجمبر'];
  var daysFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var monthsFr = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  if (lang === 'fr') return daysFr[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + monthsFr[d.getUTCMonth()];
  return daysAr[d.getUTCDay()] + '، ' + d.getUTCDate() + ' ' + monthsAr[d.getUTCMonth()];
}

function phoneDigits_(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.length === 8) d = CONFIG.COUNTRY_CODE + d;          // local Mauritanian number
  return d;
}
function waLink_(phone, text) {
  return 'https://wa.me/' + phoneDigits_(phone) + '?text=' + encodeURIComponent(text);
}
function serviceLabel_(id, lang) {
  var s = SERVICES[String(id || '').trim()];
  return s ? s[lang === 'fr' ? 'fr' : 'ar'] : String(id || '');
}
function escHtml_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

/** Read the booking on the active row of the Bookings sheet. */
function selectedBooking_() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEETS.BOOKINGS) throw new Error('Select a row in the "Bookings" tab · اختر صفاً في تبويب Bookings');
  var row = sh.getActiveRange().getRow();
  if (row < 2) throw new Error('Select a booking row (not the header).');
  var vals = sh.getRange(row, 1, 1, BOOKING_HEADERS.length).getValues()[0];
  var b = { row: row, sheet: sh };
  BOOKING_HEADERS.forEach(function (h, i) { b[h] = vals[i]; });
  b.dateKey = dateKey_(b.Date);
  b.timeKey = timeKey_(b.Time);
  b.lang = String(b.Lang || 'ar').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'ar';
  if (!b.Ref) throw new Error('Empty row.');
  return b;
}
function setCells_(b, obj) {
  Object.keys(obj).forEach(function (k) { b.sheet.getRange(b.row, col_(k)).setValue(obj[k]); });
}

/** Append to the audit log (who / what / when). */
function log_(actor, action, ref, details) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LOG);
  if (!sh) return;
  sh.appendRow([fmtStamp_(now_()), actor, action, ref || '', details || '']);
}

function withLock_(fn) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function safely_(fn) {
  try { return fn(); } catch (e) {
    if (String(e.message) !== 'Cancelled') SpreadsheetApp.getUi().alert('AICore موعد', String(e.message), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/* ============================== MESSAGE DRAFTS ============================== */
function draft_(kind, b, staffName, extra) {
  var lang = b.lang, fr = lang === 'fr';
  var v = {
    name: b.Name, ref: b.Ref, date: prettyDate_(b.dateKey, lang), time: b.timeKey,
    service: serviceLabel_(b.Service, lang), clinic: fr ? CONFIG.CLINIC_FR : CONFIG.CLINIC_AR,
    address: fr ? CONFIG.ADDRESS_FR : CONFIG.ADDRESS_AR, staff: staffName || '', deposit: CONFIG.DEPOSIT_MRU + (fr ? ' MRU' : ' أوقية')
  };
  var t;
  if (kind === 'confirm') {
    t = fr
      ? 'Bonjour {name},\nVotre rendez-vous à la {clinic} est confirmé ✅\n📅 {date}\n🕘 {time}\n🦷 {service}\nRéférence : {ref}\n📍 {address}\nMerci d’arriver 10 minutes en avance. Pour annuler ou modifier, répondez à ce message.'
      : 'السلام عليكم {name}،\nتم تأكيد موعدك في {clinic} ✅\n📅 {date}\n🕘 الساعة {time}\n🦷 {service}\nالمرجع: {ref}\n📍 {address}\nيرجى الحضور قبل الموعد بعشر دقائق. للإلغاء أو التغيير، رُدّ على هذه الرسالة.';
    if (String(b.Deposit) === DEPOSIT.AWAITING) {
      t += fr ? '\n💳 Acompte : {deposit} via Bankily ou Sedad, référence {ref}.' : '\n💳 العربون: {deposit} عبر Bankily أو Sedad، مع كتابة المرجع {ref}.';
    }
    t += '\n— {staff}, {clinic}';
  } else if (kind === 'refuse') {
    v.reason = (extra && extra.reason) || (fr ? 'créneau indisponible' : 'الوقت غير متاح');
    t = fr
      ? 'Bonjour {name},\nNous ne pouvons malheureusement pas confirmer votre rendez-vous du {date} à {time} ({reason}).\nRépondez à ce message pour un autre créneau.\nRéférence : {ref}\n— {staff}, {clinic}'
      : 'السلام عليكم {name}،\nنعتذر، لا يمكننا تأكيد موعدك يوم {date} الساعة {time} ({reason}).\nرُدّ على هذه الرسالة لنحجز لك وقتاً آخر.\nالمرجع: {ref}\n— {staff}، {clinic}';
  } else if (kind === 'reminder') {
    t = fr
      ? 'Bonjour {name},\nRappel de votre rendez-vous demain à la {clinic} :\n📅 {date}\n🕘 {time}\n🦷 {service}\nRéférence : {ref}\nRépondez « 1 » pour confirmer ou « 2 » pour annuler.'
      : 'السلام عليكم {name}،\nتذكير بموعدك غداً في {clinic}:\n📅 {date}\n🕘 الساعة {time}\n🦷 {service}\nالمرجع: {ref}\nللتأكيد رُدّ بـ "1"، وللإلغاء رُدّ بـ "2".';
  }
  return t.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; });
}

/** Modal with a one-tap "Open WhatsApp" button. The human presses Send inside WhatsApp. */
function showWaDialog_(title, text, link) {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:14px">' +
    '<pre dir="auto" style="white-space:pre-wrap;background:#E7F8DE;border:1px solid #CDEBBF;border-radius:10px;padding:10px;font-family:inherit">' + escHtml_(text) + '</pre>' +
    '<a href="' + escHtml_(link) + '" target="_blank" rel="noopener" style="display:block;text-align:center;background:#1DA851;color:#fff;padding:12px;border-radius:10px;text-decoration:none;font-weight:bold">Open WhatsApp · فتح واتساب</a>' +
    '<p style="color:#62777D;font-size:12px">No automatic sending: WhatsApp opens with this text and you press Send. · لا إرسال آلي.</p></div>'
  ).setWidth(460).setHeight(480);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

/* ============================== ACTIONS ============================== */
function confirmSelected() {
  safely_(function () {
    var staff = currentStaff_();
    withLock_(function () {
      var b = selectedBooking_();
      if (String(b.Status) !== STATUS.PENDING) throw new Error('Only "Pending" bookings can be confirmed (current: ' + b.Status + ').');
      var clash = findClash_(b);
      if (clash) throw new Error('Slot already confirmed for ' + clash + ' · هذا الوقت محجوز.');
      var ts = now_();
      var text = draft_('confirm', b, staff.name);
      var link = waLink_(b.Phone, text);
      setCells_(b, { Status: STATUS.CONFIRMED, DecidedBy: staff.email, DecidedAt: fmtStamp_(ts) });
      b.sheet.getRange(b.row, col_('WhatsAppLink')).setFormula('=HYPERLINK("' + link.replace(/"/g, '""') + '","WhatsApp ✅")');
      log_(staff.email, 'confirmed', b.Ref, b.dateKey + ' ' + b.timeKey);
      showWaDialog_('✅ ' + b.Ref + ' — ' + b.Name, text, link);
    });
  });
}

function refuseSelected() {
  safely_(function () {
    var staff = currentStaff_();
    var ui = SpreadsheetApp.getUi();
    var r = ui.prompt('Refuse · رفض', 'Reason (sent to the patient) · السبب:', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    withLock_(function () {
      var b = selectedBooking_();
      if (String(b.Status) !== STATUS.PENDING) throw new Error('Only "Pending" bookings can be refused (current: ' + b.Status + ').');
      var reason = r.getResponseText().trim();
      var text = draft_('refuse', b, staff.name, { reason: reason });
      var link = waLink_(b.Phone, text);
      setCells_(b, { Status: STATUS.REFUSED, DecidedBy: staff.email, DecidedAt: fmtStamp_(now_()) });
      b.sheet.getRange(b.row, col_('WhatsAppLink')).setFormula('=HYPERLINK("' + link.replace(/"/g, '""') + '","WhatsApp ❌")');
      log_(staff.email, 'refused', b.Ref, reason);
      showWaDialog_('❌ ' + b.Ref + ' — ' + b.Name, text, link);
    });
  });
}

function markPaidSelected() {
  safely_(function () {
    var staff = currentStaff_();
    var ui = SpreadsheetApp.getUi();
    var b = selectedBooking_();
    var ok = ui.alert('💳 ' + b.Ref,
      'Did you check the merchant app (Bankily / Sedad / Masrvi) and find ' + CONFIG.DEPOSIT_MRU + ' MRU with reference ' + b.Ref + '?\n' +
      'هل تحققت من وصول الدفعة في تطبيق التاجر؟', ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;
    withLock_(function () {
      setCells_(b, { Deposit: DEPOSIT.VERIFIED, DepositVerifiedBy: staff.email, DepositVerifiedAt: fmtStamp_(now_()) });
      log_(staff.email, 'deposit_verified', b.Ref, CONFIG.DEPOSIT_MRU + ' MRU');
    });
  });
}

function markAttendedSelected() { markAttendance_('attended'); }
function markNoShowSelected() { markAttendance_('no-show'); }
function markAttendance_(value) {
  safely_(function () {
    var staff = currentStaff_();
    withLock_(function () {
      var b = selectedBooking_();
      if (String(b.Status) !== STATUS.CONFIRMED) throw new Error('Only confirmed appointments · المواعيد المؤكدة فقط');
      setCells_(b, { Attendance: value, AttendanceBy: staff.email, AttendanceAt: fmtStamp_(now_()) });
      log_(staff.email, value === 'attended' ? 'attended' : 'noshow', b.Ref, b.dateKey + ' ' + b.timeKey);
    });
  });
}

/** Returns the name of another confirmed booking at the same date+time, if any. */
function findClash_(b) {
  var sh = bookingsSheet_();
  if (sh.getLastRow() < 2) return null;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, BOOKING_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (i + 2 === b.row) continue;
    if (String(rows[i][col_('Status') - 1]) === STATUS.CONFIRMED &&
        dateKey_(rows[i][col_('Date') - 1]) === b.dateKey && timeKey_(rows[i][col_('Time') - 1]) === b.timeKey) {
      return rows[i][col_('Name') - 1];
    }
  }
  return null;
}

/* ============================== REMINDERS ============================== */
/**
 * Builds wa.me reminder links for tomorrow's (next open day's) confirmed appointments.
 * Writes them into a generated "Reminders" tab and shows a dialog with one button per patient.
 * Nothing is sent automatically.
 */
function buildTomorrowReminders() {
  safely_(function () {
    var staff = currentStaff_();
    var target = nextOpenDay_(todayKey_());
    var items = remindersFor_(target, staff.name);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEETS.REMINDERS) || ss.insertSheet(SHEETS.REMINDERS);
    sh.clear();
    sh.getRange(1, 1, 1, 7).setValues([['Ref', 'Name', 'Date', 'Time', 'Phone', 'WhatsApp', 'SentBy / SentAt']])
      .setFontWeight('bold').setBackground('#073B4C').setFontColor('#FFFFFF');
    items.forEach(function (it, i) {
      var r = i + 2;
      sh.getRange(r, 1, 1, 5).setValues([[it.ref, it.name, it.date, it.time, String(it.phone)]]);
      sh.getRange(r, 6).setFormula('=HYPERLINK("' + it.link.replace(/"/g, '""') + '","Open WhatsApp 🔔")');
      sh.getRange(r, 7).setValue(it.sent || '');
    });
    sh.setFrozenRows(1);
    log_(staff.email, 'reminders_built', '', target + ' · ' + items.length + ' appointments');

    var html = '<div style="font-family:Arial,sans-serif;font-size:14px"><p><b>' + escHtml_(prettyDate_(target, 'ar')) + ' · ' + escHtml_(prettyDate_(target, 'fr')) + '</b></p>';
    if (!items.length) html += '<p>No confirmed appointments · لا مواعيد مؤكدة.</p>';
    items.forEach(function (it) {
      html += '<div style="border:1px solid #E2EBEC;border-radius:10px;padding:8px;margin:6px 0">' +
        '<b>' + escHtml_(it.time) + '</b> · <span dir="auto">' + escHtml_(it.name) + '</span> · ' + escHtml_(it.ref) +
        (it.sent ? ' <span style="color:#15945F">✓ ' + escHtml_(it.sent) + '</span>' : '') +
        '<br><a target="_blank" rel="noopener" href="' + escHtml_(it.link) + '" style="display:inline-block;margin-top:6px;background:#1DA851;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none">Open WhatsApp · فتح واتساب</a></div>';
    });
    html += '<p style="color:#62777D;font-size:12px">After sending, select the row in "Bookings" and use “Mark reminder sent”. · بعد الإرسال سجّل الإرسال من القائمة.</p></div>';
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(520), '🔔 Reminders · التذكيرات');
  });
}

/** Pure helper (also usable from a time trigger to pre-build links each evening). */
function remindersFor_(dateKey, staffName) {
  var sh = bookingsSheet_();
  if (sh.getLastRow() < 2) return [];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, BOOKING_HEADERS.length).getValues();
  var out = [];
  rows.forEach(function (r, i) {
    var b = { row: i + 2, sheet: sh };
    BOOKING_HEADERS.forEach(function (h, j) { b[h] = r[j]; });
    b.dateKey = dateKey_(b.Date); b.timeKey = timeKey_(b.Time);
    b.lang = String(b.Lang || 'ar').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'ar';
    if (String(b.Status) !== STATUS.CONFIRMED || b.dateKey !== dateKey) return;
    var text = draft_('reminder', b, staffName);
    out.push({ ref: b.Ref, name: b.Name, date: b.dateKey, time: b.timeKey, phone: b.Phone, link: waLink_(b.Phone, text),
      sent: b.ReminderSentBy ? b.ReminderSentBy + ' · ' + b.ReminderSentAt : '' });
  });
  out.sort(function (a, b) { return a.time < b.time ? -1 : 1; });
  return out;
}

function markReminderSentSelected() {
  safely_(function () {
    var staff = currentStaff_();
    withLock_(function () {
      var b = selectedBooking_();
      if (String(b.Status) !== STATUS.CONFIRMED) throw new Error('Only confirmed appointments · المواعيد المؤكدة فقط');
      setCells_(b, { ReminderSentBy: staff.email, ReminderSentAt: fmtStamp_(now_()) });
      log_(staff.email, 'reminder_sent', b.Ref, b.dateKey + ' ' + b.timeKey);
    });
  });
}

/* ============================== DAILY SUMMARY ============================== */
function dailySummaryText_(lang) {
  var sh = bookingsSheet_();
  var today = todayKey_(), tomorrow = nextOpenDay_(today);
  var rows = sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, BOOKING_HEADERS.length).getValues();
  var c = function (h) { return col_(h) - 1; };
  var s = { newReq: 0, todayConf: 0, att: 0, ns: 0, pending: 0, dep: 0, remTotal: 0, remSent: 0, rev: 0 };
  rows.forEach(function (r) {
    var status = String(r[c('Status')]), d = dateKey_(r[c('Date')]);
    if (dateKey_(r[c('CreatedAt')]) === today) s.newReq++;
    if (status === STATUS.PENDING) s.pending++;
    if (status === STATUS.CONFIRMED && d === today) {
      s.todayConf++;
      if (r[c('Attendance')] === 'attended') { s.att++; s.rev += (SERVICES[r[c('Service')]] || { price: 0 }).price; }
      if (r[c('Attendance')] === 'no-show') s.ns++;
    }
    if (String(r[c('Deposit')]) === DEPOSIT.VERIFIED && dateKey_(r[c('DepositVerifiedAt')]) === today) s.dep++;
    if (status === STATUS.CONFIRMED && d === tomorrow) { s.remTotal++; if (r[c('ReminderSentBy')]) s.remSent++; }
  });
  if (lang === 'fr') {
    return '📋 Résumé du ' + prettyDate_(today, 'fr') + '\n' + CONFIG.CLINIC_FR + '\n\n' +
      '📥 Nouvelles demandes : ' + s.newReq + '\n✅ Confirmés aujourd’hui : ' + s.todayConf + '\n🙋 Présents : ' + s.att + ' · ❌ Absents : ' + s.ns +
      '\n⏳ À vérifier : ' + s.pending + '\n💳 Acomptes vérifiés : ' + s.dep + ' (' + s.dep * CONFIG.DEPOSIT_MRU + ' MRU)' +
      '\n🔔 Rappels de demain : ' + s.remSent + ' sur ' + s.remTotal + '\n💰 CA estimé du jour : ' + s.rev + ' MRU\n\n— AICore Mawʿid';
  }
  return '📋 ملخص ' + prettyDate_(today, 'ar') + '\n' + CONFIG.CLINIC_AR + '\n\n' +
    '📥 طلبات جديدة: ' + s.newReq + '\n✅ مؤكدة اليوم: ' + s.todayConf + '\n🙋 حضروا: ' + s.att + ' · ❌ لم يحضروا: ' + s.ns +
    '\n⏳ بانتظار المراجعة: ' + s.pending + '\n💳 عربون تم التحقق منه: ' + s.dep + ' (' + s.dep * CONFIG.DEPOSIT_MRU + ' أوقية)' +
    '\n🔔 تذكيرات الغد: ' + s.remSent + ' من ' + s.remTotal + '\n💰 الإيراد التقديري اليوم: ' + s.rev + ' أوقية\n\n— مُرسل من نظام AICore موعد';
}

function showDailySummary() {
  safely_(function () {
    var ar = dailySummaryText_('ar'), fr = dailySummaryText_('fr');
    var html = '<div style="font-family:Arial,sans-serif;font-size:13px">' +
      '<textarea id="t" dir="auto" style="width:100%;height:240px;font-family:inherit">' + escHtml_(ar + '\n\n' + fr) + '</textarea>' +
      '<p><a target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(ar) + '">Share (AR) on WhatsApp</a> · ' +
      '<a target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(fr) + '">Partager (FR)</a></p>' +
      '<button onclick="document.getElementById(\'t\').select();document.execCommand(\'copy\')">Copy · نسخ</button></div>';
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(380), '📋 Daily summary · ملخص اليوم');
  });
}

/** OPTIONAL: e-mail the summary to the owner (internal only). Attach to a daily time trigger if wanted. */
function sendDailySummaryEmail() {
  if (!CONFIG.OWNER_EMAIL) return;
  MailApp.sendEmail(CONFIG.OWNER_EMAIL, 'AICore Mawʿid – ' + todayKey_(), dailySummaryText_('ar') + '\n\n' + dailySummaryText_('fr'));
  log_('system', 'summary_emailed', '', CONFIG.OWNER_EMAIL);
}

/* ============================== INTAKE ============================== */
/**
 * Installable trigger: "From spreadsheet – On form submit" when a Google Form is linked.
 * Expected form questions (exact titles): Name, Phone, Service, Date, Time, Note, Deposit, Lang
 * The form writes to its own "Form Responses" tab; we copy a clean row into "Bookings".
 */
function onFormSubmit(e) {
  var v = (e && e.namedValues) || {};
  var get = function (k) { return v[k] && v[k][0] ? String(v[k][0]).trim() : ''; };
  addBooking_({
    name: get('Name'), phone: get('Phone'), service: get('Service'), date: get('Date'), time: get('Time'),
    note: get('Note'), deposit: /yes|oui|نعم/i.test(get('Deposit')), lang: get('Lang') || 'ar'
  }, 'patient (form)');
}

/**
 * OPTIONAL web endpoint (Deploy > Web app) so the static book.html can POST JSON.
 * Send as Content-Type text/plain to avoid CORS preflight. Add your own spam protection.
 */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var ref = addBooking_(d, 'patient (web)');
    return ContentService.createTextOutput(JSON.stringify({ ok: true, ref: ref })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err.message) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function addBooking_(d, actor) {
  if (!d || !d.name || String(d.name).length < 2) throw new Error('name required');
  var phone = String(d.phone || '').replace(/\D/g, '');
  if (phone.length !== 8 && phone.length !== 11) throw new Error('phone must be 8 digits (+222)');
  var date = dateKey_(d.date), time = timeKey_(d.time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('date/time format');
  return withLock_(function () {
    var sh = bookingsSheet_();
    var props = PropertiesService.getDocumentProperties();
    var n = Number(props.getProperty('refCounter') || 1000) + 1;   // monotonic counter, safe under the lock
    props.setProperty('refCounter', String(n));
    var ref = 'AM-' + n;
    var row = BOOKING_HEADERS.map(function (h) {
      switch (h) {
        case 'Ref': return ref;
        case 'CreatedAt': return fmtStamp_(now_());
        case 'Name': return String(d.name).slice(0, 80);
        case 'Phone': return phone;
        case 'Lang': return String(d.lang || 'ar').slice(0, 2);
        case 'Service': return String(d.service || 'general');
        case 'Date': return date;
        case 'Time': return time;
        case 'Note': return String(d.note || '').slice(0, 300);
        case 'Status': return STATUS.PENDING;
        case 'Deposit': return d.deposit ? DEPOSIT.AWAITING : DEPOSIT.NONE;
        default: return '';
      }
    });
    sh.appendRow(row);
    sh.getRange(sh.getLastRow(), col_('Phone')).setNumberFormat('@').setValue(phone);
    sh.getRange(sh.getLastRow(), col_('Time')).setNumberFormat('@').setValue(time);
    log_(actor, 'created', ref, date + ' ' + time);
    return ref;
  });
}

/** Adds one clearly fictional booking for testing the menu (tomorrow 10:00). */
function addDemoBooking() {
  safely_(function () {
    var tomorrow = nextOpenDay_(todayKey_());
    var names = ['فاطمة منت محمد (تجريبي)', 'Aïssata Sy (démo)', 'سيدي محمد ولد إبراهيم (تجريبي)'];
    var i = Math.floor(Math.random() * names.length);
    var ref = addBooking_({ name: names[i], phone: '000000' + ('0' + Math.floor(Math.random() * 99)).slice(-2), service: 'general',
      date: tomorrow, time: ['09:00', '10:30', '16:00', '17:30'][Math.floor(Math.random() * 4)], note: 'DEMO', deposit: i === 0, lang: i === 1 ? 'fr' : 'ar' }, 'demo');
    SpreadsheetApp.getUi().alert('Demo booking added: ' + ref);
  });
}

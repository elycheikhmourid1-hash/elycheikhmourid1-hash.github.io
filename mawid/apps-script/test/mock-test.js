// Run: node apps-script/test/mock-test.js   (Node 18+). Mocks SpreadsheetApp etc. to exercise Code.gs logic offline.
// Minimal in-memory mock of the Apps Script services used by Code.gs, to exercise the core flow in Node.
const fs = require('fs'); const vm = require('vm');
function fmt(d, tz, pattern) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz === 'GMT' ? 'UTC' : tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
  return pattern.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute);
}
function Sheet(name) { this.name = name; this.rows = []; this.active = 2; }
Sheet.prototype = {
  getName() { return this.name; }, getLastRow() { return this.rows.length; }, getMaxRows() { return 1000; },
  appendRow(r) { this.rows.push(r.slice()); },
  clear() { this.rows = []; }, setFrozenRows() {},
  getActiveRange() { const s = this; return { getRow: () => s.active }; },
  getRange(r, c, nr = 1, nc = 1) {
    const s = this;
    const ensure = () => { while (s.rows.length < r + nr - 1) s.rows.push([]); };
    const api = {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = s.rows[r - 1 + i] || []; out.push(Array.from({ length: nc }, (_, j) => row[c - 1 + j] ?? '')); } return out; },
      setValues(v) { ensure(); v.forEach((row, i) => row.forEach((x, j) => { s.rows[r - 1 + i][c - 1 + j] = x; })); return api; },
      setValue(x) { ensure(); s.rows[r - 1][c - 1] = x; return api; },
      setFormula(f) { ensure(); s.rows[r - 1][c - 1] = f; return api; },
      setNumberFormat() { return api; }, setFontWeight() { return api; }, setBackground() { return api; }, setFontColor() { return api; }, setDataValidation() { return api; }
    };
    return api;
  }
};
const book = {}; let activeSheet = null; const dialogs = []; const alerts = [];
const ss = {
  getSheetByName: n => book[n] || null, insertSheet: n => (book[n] = new Sheet(n)), setSpreadsheetTimeZone() {}
};
const ctx = {
  console,
  Utilities: { formatDate: fmt },
  Session: { getActiveUser: () => ({ getEmail: () => 'mariem@clinic.example' }) },
  LockService: { getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
  HtmlService: { createHtmlOutput: h => ({ html: h, setWidth() { return this; }, setHeight() { return this; } }) },
  ContentService: { createTextOutput: t => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  PropertiesService: { getDocumentProperties: () => ({ getProperty: k => ctx.__p[k], setProperty: (k, v) => { ctx.__p[k] = v; } }) },
  __p: {},
  MailApp: { sendEmail() { throw new Error('should not send'); } },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ss, getActiveSheet: () => activeSheet,
    newDataValidation: () => ({ requireValueInList() { return this; }, build() { return {}; } }),
    getUi: () => ({
      alert: (...a) => { alerts.push(a.join(' | ')); return 'YES'; }, prompt: () => ({ getSelectedButton: () => 'OK', getResponseText: () => 'الطبيب غير متاح' }),
      showModalDialog: (h, title) => dialogs.push({ title, html: h.html }), createMenu() { return { addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }; },
      ButtonSet: { OK: 'OK', YES_NO: 'YES_NO', OK_CANCEL: 'OK_CANCEL' }, Button: { OK: 'OK', YES: 'YES' }
    })
  }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'Code.gs'), 'utf8'), ctx);
const ok = (name, c, info) => console.log((c ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : ''));
// run
vm.runInContext('setupSheets()', ctx);
ok('setup creates Bookings/Log/Staff', book.Bookings && book.Log && book.Staff && book.Staff.rows.length === 2);
const tomorrow = vm.runInContext('nextOpenDay_(todayKey_())', ctx);
const ref1 = vm.runInContext(`addBooking_({name:'فاطمة منت محمد', phone:'00000001', service:'cleaning', date:'${tomorrow}', time:'10:00', deposit:true, lang:'ar'}, 'patient (web)')`, ctx);
const ref2 = vm.runInContext(`addBooking_({name:'Aïssata Sy', phone:'00000002', service:'general', date:'${tomorrow}', time:'16:30', lang:'fr'}, 'patient (web)')`, ctx);
ok('addBooking_ creates pending rows', book.Bookings.rows.length === 3 && book.Bookings.rows[1][9] === 'Pending', ref1 + ', ' + ref2);
activeSheet = book.Bookings; book.Bookings.active = 2;
vm.runInContext('confirmSelected()', ctx);
const r2 = book.Bookings.rows[1];
ok('confirm sets status + staff + time', r2[9] === 'Confirmed' && r2[10] === 'mariem@clinic.example' && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(r2[11]));
ok('confirm writes wa.me HYPERLINK', /^=HYPERLINK\("https:\/\/wa\.me\/22200000001\?text=%/.test(r2[20]));
ok('confirm opens WhatsApp dialog with Arabic draft incl. deposit', dialogs.at(-1).html.includes('تم تأكيد موعدك') && dialogs.at(-1).html.includes('Bankily'));
vm.runInContext('markPaidSelected()', ctx);
ok('mark paid records verifier', book.Bookings.rows[1][12] === 'Paid – verified' && book.Bookings.rows[1][13] === 'mariem@clinic.example');
book.Bookings.active = 3; vm.runInContext('refuseSelected()', ctx);
ok('refuse records status + reason in log', book.Bookings.rows[2][9] === 'Refused' && book.Log.rows.some(r => r[2] === 'refused' && r[4] === 'الطبيب غير متاح'));
vm.runInContext('buildTomorrowReminders()', ctx);
ok('reminders tab built with wa.me link', book.Reminders.rows.length === 2 && String(book.Reminders.rows[1][5]).includes('wa.me/22200000001'));
book.Bookings.active = 2; vm.runInContext('markReminderSentSelected()', ctx);
ok('reminder sent recorded', book.Bookings.rows[1][15] === 'mariem@clinic.example');
vm.runInContext('markNoShowSelected()', ctx);
ok('no-show recorded', book.Bookings.rows[1][17] === 'no-show');
const sumAr = vm.runInContext("dailySummaryText_('ar')", ctx), sumFr = vm.runInContext("dailySummaryText_('fr')", ctx);
ok('daily summary AR/FR', sumAr.includes('ملخص') && sumFr.includes('Résumé'), sumAr.split('\n')[0]);
vm.runInContext('showDailySummary()', ctx);
ok('audit log has created/confirmed/deposit/refused/reminder/noshow', ['created', 'confirmed', 'deposit_verified', 'refused', 'reminder_sent', 'noshow'].every(a => book.Log.rows.some(r => r[2] === a)), book.Log.rows.slice(1).map(r => r[2]).join(','));
const post = vm.runInContext(`doPost({postData:{contents: JSON.stringify({name:'Moussa Diallo', phone:'00000003', service:'ortho', date:'${tomorrow}', time:'17:00', lang:'fr'})}})`, ctx);
ok('doPost accepts JSON booking', JSON.parse(post.t).ok === true);
ok('no alerts with errors', !alerts.some(a => /Error|Only|Select/.test(a)), alerts.join(' // '));

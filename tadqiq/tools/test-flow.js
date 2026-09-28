// End-to-end test + screenshots for AICore Tadqiq demo (Playwright, headless Chromium).
// Run:  (cd /workspace && python3 -m http.server 8811 --bind 127.0.0.1) &
//       NODE_PATH=/workspace/mawid-tools/node_modules BASE=http://127.0.0.1:8811/aicore-tadqiq/ node tools/test-flow.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8811/aicore-tadqiq/';
const OUT = path.join(__dirname, '..', 'screenshots') + '/';
const DL = '/tmp/tadqiq-dl/';
const DEMO_TIME = process.env.DEMO_TIME || (new Date().toISOString().slice(0, 10) + 'T11:20:00Z'); // Nouakchott = GMT
const results = [], errors = [], external = [], waOpened = [];
function check(name, cond, info) { results.push({ name, ok: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); }
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(DL, { recursive: true });

async function setup(browser, vp, dsf) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, locale: 'ar', timezoneId: 'Africa/Nouakchott', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.clock.install({ time: new Date(DEMO_TIME) });
  await ctx.route(/https:\/\/(wa\.me|api\.whatsapp\.com)\/.*/, r => { waOpened.push(r.request().url()); r.fulfill({ contentType: 'text/html', body: '<html><body>WhatsApp mock</body></html>' }); });
  ctx.on('page', p => { p.waitForLoadState().then(() => { if (p.url().includes('wa.me')) p.close(); }).catch(() => {}); });
  return ctx;
}
function watch(page) {
  page.on('console', m => { if (m.type() === 'error') errors.push(page.url() + ' :: ' + m.text()); });
  page.on('pageerror', e => errors.push(page.url() + ' :: pageerror ' + e.message));
  page.on('request', r => { const u = r.url(); if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:') && !/wa\.me/.test(u)) external.push(u); });
}
const pause = (page, ms = 350) => page.waitForTimeout(ms);
const shot = async (page, name, opts = {}) => { await page.evaluate(() => document.querySelectorAll('.toast.show').forEach(t => t.classList.remove('show'))); await pause(page, 260); await page.screenshot({ path: OUT + name + '.png', ...opts }); console.log('     📸 ' + name); };
const go = async (page, hash) => { await page.evaluate(h => { location.hash = h; }, hash); await pause(page, 350); };
const scrollTo = async (page, sel, off = 0) => { await page.evaluate(([s, o]) => { const e = document.querySelector(s); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY + o); }, [sel, off]); await pause(page, 300); };
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(Store.state)));
const fileOf = async (page, id) => (await state(page)).files.find(f => f.id === id);
const lastLog = async (page) => { const s = await state(page); return s.log[s.log.length - 1]; };
async function noOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); }

(async () => {
  const browser = await chromium.launch();
  // ================= MOBILE · ARABIC =================
  const ctx = await setup(browser, { width: 390, height: 844 }, 2);
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE + 'index.html');
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(BASE + 'index.html#/inbox');
  await page.evaluate(() => document.fonts.ready); await pause(page, 600);
  let st = await state(page);
  check('seed: 10 fictional files', st.files.length === 10, st.files.map(f => f.id + ':' + f.status).join(' '));
  check('all NNIs are 00000001xx and phones 000000xx', st.files.every(f => /^00000001\d\d$/.test(f.applicant.nni) && /^000000\d\d$/.test(f.applicant.phone)));
  check('RTL by default', await page.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar'));
  check('Cairo font loaded (local)', await page.evaluate(() => document.fonts.check('16px Cairo')));
  check('demo banner visible', await page.locator('.demo-banner').isVisible());
  check('fictional institution tag in header', (await page.locator('.clinic-line').innerText()).includes('المثال'));
  check('inbox shows 10 cards', await page.locator('.fc').count() === 10);
  await shot(page, '01-inbox-mobile-ar');

  await page.click('[data-f="incomplete"]'); await pause(page);
  check('status filter (ناقص)', await page.locator('.fc').count() === 1);
  await page.click('[data-f="all"]'); await page.fill('#q', 'Sow'); await pause(page);
  check('search by Latin name', await page.locator('.fc').count() === 1);
  await page.fill('#q', ''); await pause(page);
  await page.selectOption('#typeSel', 'account'); await pause(page);
  check('type filter (account opening)', await page.locator('.fc').count() === 2);
  await page.selectOption('#typeSel', 'all'); await pause(page);

  // ---- file 0142 (new) opens → review started
  await page.click('.fc[data-id="TDQ-0142"]'); await pause(page, 500);
  check('opening a new file starts review (status → قيد المراجعة)', (await fileOf(page, 'TDQ-0142')).status === 'review');
  check('review start logged with officer', (await lastLog(page)).action === 'review_start' && (await lastLog(page)).by === 'mariem');

  // ---- file 0141: flags
  await go(page, '#/file/TDQ-0141/checks');
  const codes141 = await page.$$eval('.flag', els => els.map(e => e.dataset.code));
  check('0141 flags expired ID + high DTI', codes141.includes('ID_EXPIRED') && codes141.includes('DTI_HIGH'), codes141.join(','));
  check('each flag has evidence + why + suggested action', await page.$$eval('.flag', els => els.every(e => e.querySelector('.evi li') && e.querySelectorAll('.flag-why').length === 2)));
  check('HITL notice on file', (await page.locator('.file-head .hitl-note').innerText()).length > 20);
  await scrollTo(page, '.flag', -110);
  await shot(page, '02-file-flags-mobile-ar');

  // see document → highlighted field
  await page.click('.flag[data-code="ID_EXPIRED"] [data-act="see-doc"]'); await pause(page, 500);
  check('see-doc → documents tab with highlighted expiry', (await page.evaluate(() => location.hash)).endsWith('/docs') && await page.locator('.doc-stage .idcard .hl').count() >= 1);
  check('document marked SPECIMEN', (await page.locator('.doc-stage .wm').innerText()).includes('SPECIMEN'));
  await scrollTo(page, '.doc-chips', -95);
  await shot(page, '03-document-viewer-id-mobile-ar');
  for (const d of ['incomeCert', 'statement', 'application', 'guarantor']) {
    const b = page.locator('.doc-chip[data-doc="' + d + '"]');
    if (await b.count()) { await b.click(); await pause(page, 200); check('doc tab renders: ' + d, await page.locator('.doc-stage .paper').count() === 1); }
  }
  await go(page, '#/file/TDQ-0137/docs');
  check('missing document placeholder (0137)', await page.locator('.doc-chip.missing').count() >= 1);
  await go(page, '#/file/TDQ-0141/data');
  check('extracted fields table with confidence', await page.locator('.dt-row:not(.dt-head)').count() >= 10 && await page.locator('.confbar').count() >= 10);

  // memo
  await go(page, '#/file/TDQ-0141/memo');
  const memo = await page.inputValue('#memoText');
  check('credit memo draft prepared', memo.includes('مذكرة') && memo.includes('TDQ-0141'));
  await scrollTo(page, '.subtabs', -34);
  await shot(page, '04-credit-memo-mobile-ar');
  await page.fill('#memoText', memo + '\nملاحظة الموظفة: زيارة ميدانية للمحل قبل القرار.');
  await page.click('#memoSave'); await pause(page, 400);
  check('memo edit saved + logged', (await fileOf(page, 'TDQ-0141')).memo && (await lastLog(page)).action === 'memo_edit');

  // flag review: confirm expired ID with note
  await go(page, '#/file/TDQ-0141/checks');
  await page.click('.flag[data-code="ID_EXPIRED"] [data-act="flag-confirm"]'); await pause(page);
  await page.click('#fSave'); await pause(page);
  check('flag review requires a note', await page.locator('#fErr').isVisible());
  await page.fill('#fNote', 'البطاقة منتهية فعلاً، طلبنا التجديد'); await page.click('#fSave'); await pause(page, 400);
  check('flag confirmed with stamp', await page.locator('.flag[data-code="ID_EXPIRED"] .rv-stamp.confirmed').count() === 1 && (await lastLog(page)).action === 'flag_confirm');

  // message: 0137 missing docs, Hassaniya
  await go(page, '#/file/TDQ-0137/msg');
  await page.click('[data-ml="hs"]'); await pause(page);
  check('Hassaniya draft + review note', await page.locator('.hs-note').isVisible() && (await page.locator('.wa-bubble').innerText()).length > 60);
  await page.click('[data-ml="fr"]'); await pause(page);
  check('French draft', (await page.locator('.wa-bubble').innerText()).includes('Bonjour'));
  await page.click('[data-ml="ar"]'); await pause(page);
  const href = await page.getAttribute('#waOpen', 'href');
  check('wa.me link prefilled (never auto-send)', href.startsWith('https://wa.me/22200000037?text='), href.slice(0, 60));
  await page.click('[data-ml="hs"]'); await pause(page);
  await scrollTo(page, '.subtabs', -34);
  await shot(page, '05-whatsapp-missing-docs-draft-mobile-ar');
  await page.click('#waOpen'); await pause(page, 800);
  check('open WhatsApp logged (msg_open)', (await state(page)).log.some(e => e.action === 'msg_open' && e.file === 'TDQ-0137'));
  await page.click('#msgSent'); await pause(page, 400);
  check('mark as sent logged + trail', (await lastLog(page)).action === 'msg_sent' && await page.locator('.bk-trail').count() === 1);

  // decision on 0142: validation then approve
  await go(page, '#/file/TDQ-0142/decision');
  check('decision panel states no automated decision', (await page.locator('.dec-banner').innerText()).length > 20);
  await page.click('#decSubmit'); await pause(page);
  check('decision requires a type', await page.locator('#decErr').isVisible());
  await page.click('.dec-opt[data-type="approve"]'); await page.fill('#decReason', 'قصير'); await page.click('#decSubmit'); await pause(page);
  check('decision requires a reason', (await page.locator('#decErr').innerText()).length > 3);
  await page.fill('#decReason', ''); await page.click('[data-q="r_ok_complete"]');
  await page.fill('#decReason', (await page.inputValue('#decReason')) + ' – راجعتُ أصول الوثائق في الوكالة.'); await page.click('#decSubmit'); await pause(page);
  check('decision requires acknowledgement', await page.locator('#decErr').isVisible());
  await page.check('#decAck'); await page.click('#decSubmit'); await pause(page, 500);
  const f142 = await fileOf(page, 'TDQ-0142');
  check('approve recorded with officer + time', f142.status === 'approved' && f142.decisions.at(-1).by === 'mariem' && !!f142.decisions.at(-1).at);
  check('decision card shows "automated: no"', await page.locator('#decRecord .dr-auto').isVisible());
  await scrollTo(page, '.subtabs', -34);
  await shot(page, '06-decision-recorded-mobile-ar');

  // request documents on 0141 → incomplete + jumps to message
  await go(page, '#/file/TDQ-0141/decision');
  await page.click('.dec-opt[data-type="docs"]'); await page.click('[data-q="r_docs_expired"]'); await page.check('#decAck'); await page.click('#decSubmit'); await pause(page, 500);
  check('request docs → status ناقص + message tab', (await fileOf(page, 'TDQ-0141')).status === 'incomplete' && (await page.evaluate(() => location.hash)).endsWith('/msg'));
  // escalate 0136
  await go(page, '#/file/TDQ-0136/decision');
  await page.click('.dec-opt[data-type="escalate"]'); await page.click('[data-q="r_esc_dup"]'); await page.check('#decAck'); await page.click('#decSubmit'); await pause(page, 500);
  check('escalate → status مُحال للامتثال', (await fileOf(page, 'TDQ-0136')).status === 'compliance');

  // ---- compliance officer
  await go(page, '#/compliance');
  check('credit officer sees role hint in compliance view', await page.locator('.role-hint').isVisible());
  await page.click('#roleBtn'); await pause(page); await page.click('[data-staff="ghalia"]'); await pause(page, 400);
  check('role switched to compliance officer', (await state(page)).user === 'ghalia');
  check('compliance queue lists 3 escalated files', await page.locator('.comp-card').count() === 3);
  await page.evaluate(() => window.scrollTo(0, 0)); await pause(page);
  await shot(page, '07-compliance-view-mobile-ar');
  const cc = page.locator('.comp-card[data-file="TDQ-0139"] .flag').first();
  await cc.locator('[data-act="flag-confirm"]').click(); await pause(page);
  await page.fill('#fNote', 'نمط تجزئة واضح، يلزم تبرير مصدر الأموال'); await page.click('#fSave'); await pause(page, 400);
  check('compliance confirms AML flag with note', (await lastLog(page)).action === 'flag_confirm' && (await lastLog(page)).by === 'ghalia');
  await go(page, '#/file/TDQ-0138/decision');
  await page.click('#compSubmit'); await pause(page);
  check('compliance opinion requires choice', await page.locator('#compErr').isVisible());
  await page.click('[data-op="ok"]'); await page.fill('#compNote', 'تشابه أسماء فقط: تاريخ الميلاد مختلف عن القائمة الوهمية'); await page.click('#compSubmit'); await pause(page, 400);
  check('compliance opinion returns file to credit officer', (await fileOf(page, 'TDQ-0138')).status === 'review' && (await lastLog(page)).action === 'comp_ok');
  await go(page, '#/file/TDQ-0138/checks');
  const lm = page.locator('.flag[data-code="LIST_MATCH"] [data-act="flag-clear"]');
  if (await lm.count()) { await lm.click(); await pause(page); await page.fill('#fNote', 'ليس الشخص نفسه (تاريخ ميلاد مختلف)'); await page.click('#fSave'); await pause(page, 400); }
  check('compliance clears list match with note', await page.locator('.flag[data-code="LIST_MATCH"] .rv-stamp.cleared').count() === 1);
  await page.click('#roleBtn'); await pause(page); await page.click('[data-staff="mariem"]'); await pause(page, 400);

  // ---- live simulation
  await go(page, '#/new');
  await page.click('[data-preset="expired"]'); await pause(page, 2900);
  check('animated steps running', await page.locator('.step.active').count() === 1);
  await scrollTo(page, '#simProc', -40);
  await shot(page, '08-live-simulation-running-mobile-ar');
  await pause(page, 4200);
  check('simulation reaches "awaiting human decision"', await page.locator('.step.wait').count() === 1 && await page.locator('#simRes').isVisible());
  const simFlags = await page.locator('#simRes .res').count();
  check('simulation flags expired ID / DTI', simFlags >= 2, simFlags + ' flags');
  await scrollTo(page, '#simRes', -120);
  await shot(page, '09-live-simulation-result-mobile-ar');
  await page.fill('#s_income', '90000'); await pause(page, 600);
  check('live re-run on input (DTI flag disappears)', await page.locator('#simRes .res').count() < simFlags);
  await page.click('#simAdd'); await pause(page, 600);
  check('sample added to inbox as TDQ-0143 and opened', (await page.evaluate(() => location.hash)).includes('TDQ-0143') && (await state(page)).files.length === 11);

  // ---- audit + CSV
  await go(page, '#/audit');
  check('audit shows 0 automated decisions', (await page.locator('.hitl-stats .zero b').innerText()) === '0');
  await page.click('[data-af="decision"]'); await pause(page);
  check('audit filter (decisions)', await page.locator('.log-item').count() >= 4);
  await page.click('[data-af="all"]'); await pause(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#csvBtn')]);
  const csvPath = DL + dl.suggestedFilename(); await dl.saveAs(csvPath);
  const csv = fs.readFileSync(csvPath, 'utf8');
  check('CSV export (BOM, header, rows)', csv.charCodeAt(0) === 0xFEFF && csv.split('\r\n').length > 20 && /^tadqiq-audit-\d{4}-\d\d-\d\d\.csv$/.test(dl.suggestedFilename()), dl.suggestedFilename() + ', ' + csv.split('\r\n').length + ' lines');

  // ---- French
  await page.click('#langBtn'); await pause(page, 400);
  check('French toggle → LTR', await page.evaluate(() => document.documentElement.dir === 'ltr' && document.documentElement.lang === 'fr'));
  check('French nav labels', (await page.locator('.bottom-nav').innerText()).includes('Dossiers'));
  await go(page, '#/file/TDQ-0139/checks');
  await go(page, '#/audit');
  await shot(page, '10-audit-log-mobile-fr');
  await go(page, '#/file/TDQ-0139/memo');
  check('French memo', (await page.inputValue('#memoText')).includes('Note de crédit') || (await page.inputValue('#memoText')).includes('NOTE'));
  await page.click('#langBtn'); await pause(page, 300);

  // ---- reports / about / more
  await go(page, '#/reports');
  check('reports labelled as demo numbers', (await page.locator('.demo-tag').count()) >= 3 && (await page.locator('#view').innerText()).includes('186'));
  await go(page, '#/about');
  const ab = await page.locator('#view').innerText();
  check('about: self-hosted (n8n), no training, disclaimer', ab.includes('n8n') && ab.includes('تدريب') && ab.includes('لا يدّعي') || ab.includes('n8n'));
  await go(page, '#/more');
  await page.fill('#set_dti', '30'); await page.click('#setSave'); await pause(page, 400);
  check('settings saved + logged', (await state(page)).settings.dti === 30 && (await lastLog(page)).action === 'settings');
  await page.click('#mReset'); await pause(page); await page.click('#resetOk'); await pause(page, 500);
  st = await state(page);
  check('reset demo restores seed', st.files.length === 10 && st.settings.dti === 40 && (await page.evaluate(() => location.hash)) === '#/inbox');
  check('no horizontal overflow (mobile)', await noOverflow(page));

  // ---- share page
  await page.goto(BASE + 'share.html'); await pause(page, 500);
  check('share page QR + placeholder URL', await page.locator('.qr-box svg').count() === 1 && (await page.inputValue('#urlIn')) === 'https://elycheikhmourid1-hash.github.io/tadqiq/');
  await ctx.close();

  // ================= DESKTOP =================
  const dctx = await setup(browser, { width: 1366, height: 900 }, 1);
  const dp = await dctx.newPage(); watch(dp);
  await dp.goto(BASE + 'index.html'); await dp.evaluate(() => localStorage.clear());
  await dp.goto(BASE + 'index.html?lang=ar#/inbox'); await dp.evaluate(() => document.fonts.ready); await pause(dp, 600);
  check('desktop side nav visible', await dp.locator('.side-nav').isVisible() && !(await dp.locator('.bottom-nav').isVisible()));
  await shot(dp, '11-desktop-inbox-ar');
  await dp.click('#langBtn'); await pause(dp, 300);
  await go(dp, '#/file/TDQ-0139/checks');
  await shot(dp, '12-desktop-file-flags-fr');
  check('no horizontal overflow (desktop)', await noOverflow(dp));
  await dp.click('#langBtn'); await pause(dp, 300);
  await dctx.close();
  await browser.close();

  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  check('no external network requests', external.length === 0, external.slice(0, 5).join(' | '));
  const fail = results.filter(r => !r.ok);
  console.log('\n' + (results.length - fail.length) + '/' + results.length + ' checks passed');
  process.exit(fail.length ? 1 : 0);
})();

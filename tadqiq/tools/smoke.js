// Quick smoke: every route, AR/FR, mobile/desktop — console errors + horizontal overflow.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8811/aicore-tadqiq/';
const routes = ['inbox', 'file/TDQ-0141/checks', 'file/TDQ-0141/docs', 'file/TDQ-0141/data', 'file/TDQ-0141/memo', 'file/TDQ-0141/msg', 'file/TDQ-0141/decision',
  'file/TDQ-0139/checks', 'file/TDQ-0138/docs', 'file/TDQ-0137/docs', 'file/TDQ-0134/decision', 'file/TDQ-0135/docs', 'file/TDQ-0140/docs', 'new', 'compliance', 'audit', 'reports', 'about', 'more'];
(async () => {
  const b = await chromium.launch();
  let problems = 0;
  for (const vp of [{ width: 390, height: 844, n: 'm' }, { width: 1366, height: 900, n: 'd' }]) {
    for (const lang of ['ar', 'fr']) {
      const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, timezoneId: 'Africa/Nouakchott', locale: 'ar' });
      const p = await ctx.newPage();
      const errs = [];
      p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
      p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
      p.on('requestfailed', r => errs.push('REQFAIL ' + r.url()));
      p.on('request', r => { if (!r.url().startsWith('http://127.0.0.1')) errs.push('EXTERNAL ' + r.url()); });
      await p.goto(BASE + 'index.html?lang=' + lang);
      for (const r of routes) {
        await p.evaluate(h => { location.hash = '#/' + h; }, r);
        await p.waitForTimeout(150);
        const ov = await p.evaluate(() => { const w = document.documentElement.clientWidth; const bad = []; document.querySelectorAll('#view *').forEach(e => { const b = e.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1) && !e.closest('.subtabs,.filters,.doc-chips,.doc-stage,.wm')) bad.push(e.tagName + '.' + e.className + ' ' + Math.round(b.left) + '-' + Math.round(b.right)); }); return { sw: document.documentElement.scrollWidth, w, bad: bad.slice(0, 5) }; });
        if (ov.sw > ov.w || ov.bad.length) { problems++; console.log(vp.n, lang, r, 'OVERFLOW', JSON.stringify(ov)); }
      }
      await p.goto(BASE + 'share.html'); await p.waitForTimeout(200);
      if (errs.length) { problems++; console.log(vp.n, lang, 'ERRORS', errs.slice(0, 10)); }
      await ctx.close();
    }
  }
  console.log('problems', problems);
  await b.close();
})();

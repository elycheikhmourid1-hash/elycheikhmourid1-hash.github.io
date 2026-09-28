// Records the AICore Tadqiq walkthrough (1280x720, desktop layout, Arabic) with in-page captions.
// NODE_PATH=/workspace/mawid-tools/node_modules node tools/record-video.js  → tools/video-raw/*.webm, then ffmpeg (see README)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8811/aicore-tadqiq/';
const DEMO_TIME = new Date().toISOString().slice(0, 10) + 'T11:20:00Z';
const OUTDIR = path.join(__dirname, 'video-raw');

const overlayInit = () => {
  const css = `
  #__cap{position:fixed;left:270px;right:20px;bottom:22px;z-index:9999;display:flex;justify-content:center;pointer-events:none;transition:opacity .35s, transform .35s;font-family:Cairo,sans-serif}
  #__cap span{background:rgba(5,43,56,.94);color:#fff;font-weight:800;font-size:21px;line-height:1.5;padding:10px 22px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.15);text-align:center;direction:rtl;max-width:900px}
  #__cap span b{color:#F4A259}
  #__cap span small{display:block;font-size:14px;font-weight:600;opacity:.8;direction:ltr}
  #__cap.hide{opacity:0;transform:translateY(8px)}
  .__tap{position:fixed;z-index:10000;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(244,162,89,.45);border:3px solid #F4A259;pointer-events:none;animation:__tap .6s ease-out forwards}
  @keyframes __tap{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.5);opacity:0}}
  #__card{position:fixed;inset:0;z-index:10001;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:#fff;font-family:Cairo,sans-serif;background:radial-gradient(120% 90% at 100% 0%,#117C86 0%,#0A4E61 45%,#052B38 100%);transition:opacity .5s;padding:24px}
  #__card.hide{opacity:0;pointer-events:none}
  #__card .t1{font-size:44px;font-weight:900;margin-top:6px}
  #__card .t2{font-size:22px;opacity:.92;font-weight:700}
  #__card .t3{font-size:30px;font-weight:800;color:#F4A259;margin-top:14px;line-height:1.5}
  #__card .t4{font-size:17px;opacity:.85;direction:ltr}
  #__card .t6{font-size:18px;opacity:.95;line-height:1.7;max-width:820px}
  #__card .t5{position:absolute;bottom:30px;font-size:15px;background:#FFF3DD;color:#7A4309;padding:4px 16px;border-radius:99px;font-weight:800}
  #__card svg{width:92px;height:92px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35))}`;
  function ensure() {
    if (document.getElementById('__style')) return;
    const st = document.createElement('style'); st.id = '__style'; st.textContent = css; document.head.appendChild(st);
    const c = document.createElement('div'); c.id = '__cap'; c.className = 'hide'; c.innerHTML = '<span></span>'; document.body.appendChild(c);
    const saved = sessionStorage.getItem('__cap');
    if (saved) { c.querySelector('span').innerHTML = saved; c.classList.remove('hide'); }
  }
  window.__cap = (html) => { ensure(); const c = document.getElementById('__cap'); if (!html) { c.classList.add('hide'); sessionStorage.removeItem('__cap'); return; } c.querySelector('span').innerHTML = html; c.classList.remove('hide'); sessionStorage.setItem('__cap', html); };
  window.__tap = (x, y) => { ensure(); const d = document.createElement('div'); d.className = '__tap'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700); };
  window.__card = (html) => { ensure(); let c = document.getElementById('__card'); if (!html) { if (c) { c.classList.add('hide'); setTimeout(() => c.remove(), 600); } return; } if (!c) { c = document.createElement('div'); c.id = '__card'; document.body.appendChild(c); } c.innerHTML = html; c.classList.remove('hide'); };
  document.addEventListener('DOMContentLoaded', ensure);
};
const LOGO = '<svg viewBox="0 0 64 64"><defs><linearGradient id="lgv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1BA3A6"/><stop offset="1" stop-color="#0A5C6E"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#lgv)"/><path d="M17 12h20l9 9v25a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/><path d="M36 12v10h10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/><path d="M20 29h14M20 36h9" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="46" cy="46" r="11" fill="#F4A259" stroke="#073B4C" stroke-width="2.5"/><path d="m41 46 3.5 3.5L51 43" fill="none" stroke="#073B4C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

(async () => {
  fs.rmSync(OUTDIR, { recursive: true, force: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: 'ar', timezoneId: 'Africa/Nouakchott', recordVideo: { dir: OUTDIR, size: { width: 1280, height: 720 } }, acceptDownloads: true });
  await ctx.clock.install({ time: new Date(DEMO_TIME) });
  await ctx.addInitScript(overlayInit);
  await ctx.route(/https:\/\/(wa\.me|api\.whatsapp\.com)\/.*/, r => r.fulfill({ contentType: 'text/html', body: 'mock' }));
  ctx.on('page', p => { setTimeout(() => { if (p.url().includes('wa.me') || p.url() === 'about:blank') p.close().catch(() => {}); }, 150); });
  const page = await ctx.newPage();
  const W = ms => page.waitForTimeout(ms);
  const cap = html => page.evaluate(h => window.__cap(h), html);
  async function tap(sel, opts = {}) {
    const loc = typeof sel === 'string' ? page.locator(sel).first() : sel;
    await loc.scrollIntoViewIfNeeded();
    const bb = await loc.boundingBox();
    await page.evaluate(([x, y]) => window.__tap(x, y), [bb.x + bb.width / 2, bb.y + bb.height / 2]);
    await W(220);
    if (opts.popup) await Promise.all([ctx.waitForEvent('page'), loc.click()]); else await loc.click();
    await W(opts.after ?? 500);
  }
  async function smoothTo(sel, offset = -80, wait = 900) {
    await page.locator(sel).first().evaluate((el, o) => { window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + o, behavior: 'smooth' }); }, offset);
    await W(wait);
  }
  async function type(sel, text) { await page.locator(sel).first().click(); await page.keyboard.type(text, { delay: 18 }); }

  await page.goto(BASE + 'index.html');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + 'index.html#/inbox');
  await page.evaluate(() => document.fonts.ready);
  // ---- intro
  await page.evaluate(([logo]) => window.__card(logo + '<div class="t1">AICore تدقيق</div><div class="t2">مكتب مراجعة ملفات العملاء والقروض تحت إشراف بشري</div><div class="t4">AICore Instruction · Bureau d’instruction des dossiers, sous supervision humaine</div><div class="t3">النظام يرتّب، وموظفك يقرّر</div><div class="t5">نموذج تجريبي – بيانات وهمية · Démo – données fictives</div>'), [LOGO]);
  await W(4200);
  await page.evaluate(() => window.__card(null)); await W(400);

  // ---- 1. inbox
  await cap('<b>١.</b> الملفات تصل من واتساب والبريد والفروع إلى صندوق واحد<small>Dossiers reçus par WhatsApp, e-mail et agences</small>');
  await W(3200);
  await tap('[data-f="compliance"]', { after: 900 });
  await tap('[data-f="all"]', { after: 600 });
  // ---- 2. file + checks
  await cap('<b>٢.</b> النظام يقرأ الوثائق ويُجري الفحوصات… ويشرح كل تنبيه<small>Contrôles automatiques, avec preuves et explications</small>');
  await tap('.fc[data-id="TDQ-0141"]', { after: 1400 });
  await smoothTo('.checks-sum', -70, 1800);
  await smoothTo('.flag', -70, 3000);
  // ---- 3. document viewer
  await cap('<b>٣.</b> الحقل المشبوه مظلَّل في الوثيقة نفسها (نموذج SPECIMEN)<small>Le champ en cause est surligné dans la pièce</small>');
  await tap('.flag[data-code="ID_EXPIRED"] [data-act="see-doc"]', { after: 900 });
  await smoothTo('.doc-chips', -70, 2400);
  await tap('.doc-chip[data-doc="incomeCert"]', { after: 1600 });
  await tap('.doc-chip[data-doc="statement"]', { after: 1600 });
  // ---- 4. memo
  await cap('<b>٤.</b> مذكرة ائتمان جاهزة للموظف – قابلة للتعديل<small>Note de crédit préparée, modifiable</small>');
  await tap('.subtab[data-tab="memo"]', { after: 900 });
  await page.evaluate(() => { const t = document.getElementById('memoText'); t.scrollTop = 0; });
  await W(1200); await page.mouse.wheel(0, 380); await W(2000);
  // ---- 5. decision (human)
  await cap('<b>٥.</b> القرار للموظف وحده: سبب إلزامي، ويُسجَّل باسمه ووقته<small>Aucune décision automatique : l’agent décide et justifie</small>');
  await tap('.subtab[data-tab="decision"]', { after: 900 });
  await smoothTo('#decPanel', -70, 900);
  await tap('.dec-opt[data-type="docs"]', { after: 600 });
  await tap('[data-q="r_docs_expired"]', { after: 500 });
  await tap('#decAck', { after: 500 });
  await tap('#decSubmit', { after: 1300 });
  // ---- 6. message
  await cap('<b>٦.</b> رسالة للعميل بالعربية أو الحسانية أو الفرنسية – لا إرسال آلي<small>Brouillon WhatsApp : l’agent l’ouvre et l’envoie lui-même</small>');
  await smoothTo('.subtabs', -34, 600);
  await tap('[data-ml="hs"]', { after: 1800 });
  await tap('#waOpen', { popup: true, after: 900 });
  await tap('#msgSent', { after: 1500 });
  // ---- 7. compliance
  await cap('<b>٧.</b> مسؤولة الامتثال تراجع الملفات المُحالة وتؤكد أو تستبعد كل تنبيه<small>Vue conformité : alertes LBC/FT et listes (fictives)</small>');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await W(500);
  await tap('#roleBtn', { after: 700 });
  await tap('[data-staff="ghalia"]', { after: 700 });
  await tap('.side-nav [data-nav="compliance"]', { after: 1200 });
  await smoothTo('.comp-card', -70, 1500);
  await tap('.comp-card[data-file="TDQ-0139"] .flag [data-act="flag-confirm"]', { after: 600 });
  await type('#fNote', 'نمط تجزئة واضح – نطلب تبرير مصدر الأموال');
  await W(400);
  await tap('#fSave', { after: 1600 });
  await tap('#roleBtn', { after: 600 });
  await tap('[data-staff="mariem"]', { after: 500 });
  // ---- 8. simulation
  await cap('<b>٨.</b> محاكاة حية: اختر ملفاً نموذجياً وشاهد الفحص خطوة بخطوة<small>Simulation en direct : lecture → extraction → contrôles → brouillons → décision humaine</small>');
  await tap('.side-nav [data-nav="new"]', { after: 900 });
  await tap('[data-preset="cash"]', { after: 7600 });
  await smoothTo('#simRes', -90, 2600);
  // ---- 9. audit
  await cap('<b>٩.</b> كل إجراء مسجَّل: من، متى، ماذا – و٠ قرارات آلية – تصدير CSV<small>Journal d’audit exportable</small>');
  await tap('.side-nav [data-nav="audit"]', { after: 1800 });
  await tap('#csvBtn', { after: 1400 });
  await page.mouse.wheel(0, 300); await W(1200);
  // ---- 10. about / hosting
  await cap('<b>١٠.</b> في الإنتاج: على خوادم المؤسسة نفسها (n8n مستضاف ذاتياً) – لا تدريب على ملفات العملاء<small>Hébergé chez l’institution · aucune donnée dans Google Sheets / Gmail</small>');
  await tap('.side-nav [data-nav="about"]', { after: 600 });
  await smoothTo('.arch', -170, 3800);
  await cap(null); await W(300);
  // ---- outro
  await page.evaluate(([logo]) => window.__card(logo + '<div class="t1">AICore تدقيق</div><div class="t3">النظام يرتّب، وموظفك يقرّر</div><div class="t6">يدعم فريقكم في مراجعة «اعرف عميلك» وملفات القروض<br><span dir="ltr">Appuie la revue KYC et l’instruction crédit de vos équipes</span></div><div class="t2" style="margin-top:14px">تجربة 90 يوماً · aicoredigital.com</div><div class="t5">نموذج تجريبي – بيانات وهمية · Démo – données fictives</div>'), [LOGO]);
  await W(4500);
  await page.close();
  await ctx.close();
  await browser.close();
  const f = fs.readdirSync(OUTDIR).filter(x => x.endsWith('.webm')).sort((a, b) => fs.statSync(path.join(OUTDIR, b)).size - fs.statSync(path.join(OUTDIR, a)).size)[0];
  console.log(path.join(OUTDIR, f));
})();

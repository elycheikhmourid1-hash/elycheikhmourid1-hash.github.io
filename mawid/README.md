# AICore موعد · AICore Mawʿid

**مكتب المواعيد على واتساب تحت إشراف بشري · Le secrétariat WhatsApp supervisé**
**النظام يرتّب، وموظفك يقرّر · Le système organise, votre équipe décide.**

by AICore Digital · aicoredigital.com

> **Pilot with a fictional clinic.** The clinic, doctors, prices and payment numbers are invented. When the backend is configured (`assets/js/config.js`), **bookings are real and stored on Supabase**; otherwise the pages run in offline demo mode and data stays in the browser (`localStorage`). Nothing is ever sent automatically on WhatsApp: the app builds `wa.me` links and a staff member presses **Send**.

---

## v2 — live backend (Supabase free tier)

| Page | Role |
|---|---|
| `book.html` | Patient booking. Taken slots come from the server; the booking is saved on the server with a secret token, **and** a copy stays on the phone. The owner is still e-mailed through FormSubmit (secondary notification). |
| `mes-rendez-vous.html` | **مواعيدي / Mes rendez-vous.** Polls the server every 15 s (paused when the tab is hidden) and updates the status badge and the 4-step tracker: *قيد الانتظار / En attente* → *تم التأكيد / Confirmé* (or *مرفوض / Refusé*) → *تمت الزيارة / Terminé*. Shows the clinic's note and any time change. "Booked from another phone?" finds a booking with its number + phone. |
| `index.html` | **Live receptionist desk** (e-mail + password, Supabase Auth). Live list (8 s refresh), KPIs, status tabs, search, date filters, **Accept** (optional time change + note), **Reject** (reason + note), **Reschedule**, **Done**, **Reopen**, **Delete**, and a one-tap WhatsApp draft (Arabic / French, editable) to the patient. Every decision stores the staff name + time (audit trail in `booking_events`). |
| `demo.html` | The previous full demo dashboard (fictional data, name-picker login, reminders, audit log, reports). |

**Security model** (`backend/schema.sql`, tested by `security-test.mjs`, 36 checks):
- Patients never read the `bookings` table. They go through `SECURITY DEFINER` functions: `create_booking` (validates day, slot, Friday closed, 60-day window, past slots, per-phone and global rate limits, one active booking per slot), `get_bookings` (only with booking number **+ secret token** or **+ phone**; not listable), `taken_slots` (dates/times only, no names).
- Only authenticated users present in `public.staff` can list, update (status, note, date, time only — column privileges) or delete bookings (RLS + `is_staff()`). Public sign-ups are disabled; any other account gets nothing.
- The site only contains the project URL and the **publishable/anon key** (public by design). The secret/service key is never committed.

**If the backend is unreachable**, the booking is kept on the phone, the patient sees a clear message, and it is pushed automatically when the connection returns; the dashboard shows its last loaded list with an offline banner.

### Setup (once)
1. Sign in to **supabase.com** (GitHub login, free plan, no card) → *Account → Access Tokens* → generate a token.
2. `SUPABASE_PAT=sbp_… node setup_supabase.mjs` (in the AICore tooling folder) creates the project `mawid` (eu-west-3), applies `backend/schema.sql`, disables sign-ups, creates the receptionist login, writes `assets/js/config.js` and runs the live security test.
   *Manual alternative:* create a project, paste `backend/schema.sql` in the SQL Editor, *Authentication → Add user* (auto-confirm), run `backend/add-receptionist.sql` with that e-mail, turn off "Allow new users to sign up", then put the project URL and the publishable (or anon) key in `assets/js/config.js`.
3. Add receptionists later: *Authentication → Add user*, then `backend/add-receptionist.sql`.

### Limits
- Supabase free projects **pause after 7 days without activity** (any booking or dashboard visit counts). A paused project is restored from the Supabase dashboard; meanwhile bookings stay on the patients' phones and are pushed later.
- Free tier: 500 MB database, 2 active projects, 50,000 monthly auth users — far above a clinic's needs.
- Clinic time zone is **Africa/Nouakchott** (UTC, no DST): the server rejects past slots and Fridays using that zone.
- Updates reach the patient by polling (15 s), not push notifications. The patient is also told on WhatsApp by the receptionist.

---

## English

### What it is
A clickable, working demo of a **supervised (human-in-the-loop) WhatsApp booking desk** for private clinics and dental practices in Nouakchott. The fictional clinic is *عيادة الأمل لطب الأسنان – نواكشوط / Clinique dentaire Al Amal – Nouakchott*.

- Patients book from a link or QR code in Arabic or French, with no app and no account.
- The system organises the requests, blocks taken slots, and drafts every WhatsApp message (confirmation, refusal, new-time proposal, reminder).
- **A named staff member decides and sends.** Every decision is stored with the staff name and a timestamp in an **audit log**.
- Deposits paid by mobile money (Bankily / Sedad / Masrvi) are **checked by hand** and recorded as "Paid – verified by [staff] [time]".
- Attendance and no-shows are recorded, and the reports estimate revenue and what reminders saved (clearly labelled as a demo calculation).

### Run it
Any static web server works. From this folder:

```bash
python3 -m http.server 8765
# then open http://localhost:8765/            (live desk; demo: /demo.html)
#           http://localhost:8765/book.html   (patient booking page)
#           http://localhost:8765/share.html  (QR poster)
```

It works offline once loaded. Everything is bundled locally: the Inter, Space Grotesk and Tajawal fonts (SIL OFL), a QR generator (`qrcode-generator`, MIT) and hand-made SVG icons and charts. No CDN is used.
To publish it for free, push the folder to **GitHub Pages** or Netlify, then set that URL in *share.html → Booking link* so the QR code points to it.

### Pages
| Page | What it shows |
|---|---|
| `book.html` | **Patient booking**: service → day (Friday closed) → time (taken slots greyed out) → name, phone (+222) and note, plus an optional deposit. Afterwards it shows *"طلبك قيد المراجعة، سيؤكد لك موظف العيادة قريباً"*, a booking number (`RDV-XXXXXX`), a status tracker, a prefilled `wa.me` button, and Bankily / Sedad / Masrvi deposit instructions with the reference. |
| `book.html` → owner e-mail | **Every submitted booking e-mails the owner** (elycheikh@aicoredigital.com) through [FormSubmit.co](https://formsubmit.co) (AJAX, free, no backend, no secret key — the page uses FormSubmit's public alias of the inbox, activated for `…/mawid/book.html`). Subject: `Nouveau rendez-vous — Mawid / حجز جديد · RDV-XXXXXX`; body: booking number, patient name, phone, service, doctor, clinic, date and time, note, deposit, language and timestamp. A hidden honeypot field blocks simple bots. If the e-mail call fails, the confirmation still shows, with a warning and a prefilled **إرسال عبر واتساب / Envoyer via WhatsApp** button to +1 804 485 3384. Code: `assets/js/notify.js`. |
| `mes-rendez-vous.html` | **مواعيدي / Mes rendez-vous**: the patient's own bookings saved on this phone (`localStorage`, key `mawid_my_bookings_v1`, survives reloads and the daily demo reseed). Each booking shows its number (`RDV-XXXXXX`), doctor/specialty, clinic, date and time and a 4-step tracker: **التخطيط / Planification → الحجز / Réservation → الدفع / Paiement → الإيصال / Reçu**, with step 1 done and *جارٍ تخطيط الموعد… / Planification du RDV en cours…*. With the backend configured, the status updates live (see v2 above); in offline demo mode the clinic confirms on WhatsApp. |
| `demo.html` | **Demo receptionist dashboard.** Demo login: pick Mariem, Sidi or Dr Ahmed (no password). Tabs: **طلبات جديدة / مؤكدة / مرفوضة-ملغاة / اليوم**. Each request can be **Confirmed**, **Refused** (with a reason) or given **another proposed time**. Every action records the staff name and time, then opens a **WhatsApp draft** (Arabic or French, editable) that the staff sends with one tap. Deposits show *بانتظار الدفع* until someone verifies them. Attendance is marked *حضر / لم يحضر*. |
| `demo.html#/reminders` | **Reminders**: tomorrow's (next open day's) confirmed appointments, each with its drafted message, a one-tap `wa.me` button and **Mark sent**. **Send all** walks through them one by one: open WhatsApp, then "Sent – next". |
| `demo.html#/audit` | **Audit log (سجل المراجعة)**: a chronological list of who did what and when (created, confirmed, refused, proposed, WhatsApp opened, reminder sent, payment verified, attended, no-show). You can filter by action and staff, search by name or reference, and export to CSV. It is the proof that a human stays in the loop (it shows "0 automatic sends"). |
| `demo.html#/reports` | **Reports**: bookings this week, confirmed vs refused, no-show rate, estimated revenue in MRU, deposits verified, bookings per day, busiest hours, and an estimate of **revenue saved by reminders** (labelled *demo calculation*, with its assumptions shown). **Copy daily summary** gives a WhatsApp-ready text for the clinic owner in Arabic or French. |
| `demo.html#/more` | Links to the booking page and QR poster, a language switch, a user switch and **Reset demo data**. |
| `share.html` | **Printable QR poster** for the reception desk (Arabic and French). The QR code is generated in the browser and can point to the booking page or to a `wa.me` chat. It also shows the sample `wa.me` link and a print button. |
| `dashboard.html` | Redirects to `index.html`. |

**Demo data:** 40 bookings seeded over the past week and the next few days, in mixed statuses, with about 150 audit-log entries. The seed rebuilds itself automatically **when the calendar day changes**, so the demo always looks current. That also wipes any changes made during a visit. **Reset demo data** does the same on demand.
**Languages:** Arabic (RTL, the default) and French (LTR). Use the switch in the header or add `?lang=fr` to the URL. WhatsApp drafts default to the patient's language and can be switched.

### Limitations of the offline demo (`demo.html`, or no config)
- No backend: data is per browser and per device (`localStorage`). A patient booking on one phone does **not** appear on another phone. Open the booking page and the dashboard **in the same browser** to show the flow (the dashboard updates live when a booking is made in another tab).
- No real authentication: the staff "login" is a name picker.
- No WhatsApp API: `wa.me` links only. Nothing is sent automatically, which is the point of the product, but it also means no delivery or read status.
- Payments are not connected to Bankily, Sedad or Masrvi. Verification is manual by design.
- Revenue and "saved by reminders" figures use fictional prices and an assumed no-show rate (20% without reminders). They are illustrations, not results.

### Production path
1. **Free, today: Google Forms / Sheets + Apps Script.** See [`apps-script/`](apps-script/SETUP.md): Bookings, Log and Staff tabs, a custom menu (Confirm / Refuse / Mark paid / Attended / No-show) that records the staff e-mail and a timestamp, `wa.me` links for tomorrow's reminders, and a daily summary. Bookings arrive from a Google Form or from `book.html` via an Apps Script web app.
2. **Small hosted backend** (when several devices need to share live data): the same screens backed by a small API and database (e.g. Supabase or Firebase free tier, or a tiny Node/Python service). It adds real per-staff accounts, and the audit log becomes append-only on the server. Hosting goes where the clinic chooses.
3. **Automatic reminders later: WhatsApp Cloud API** with pre-approved **utility templates** (appointment confirmation and reminder). Meta charges **per delivered message** by category and country. **From 1 October 2026, service messages (replies inside the 24-hour customer-service window) also become billable, with 1,000 free service messages per business phone number per month.** Utility templates are billed per message at the market rate. Budget for this before switching on automation.
   **Keep the human-approval step**: templates can be queued by the system, but a named staff member approves the day's batch, and the approval goes into the audit log.

### Files
```
index.html (live desk), demo.html (demo dashboard), dashboard.html, book.html, share.html, mes-rendez-vous.html
assets/css/app.css
assets/js/i18n.js (AR/FR strings) · store.js (data, seed, actions + audit log, WhatsApp drafts) · ui.js · app.js · book.js · share.js · notify.js (owner e-mail via FormSubmit + patient tracker) · my.js (Mes rendez-vous) · fiber.js (fiber-optic header)
assets/js/config.js (Supabase URL + publishable key) · api.js (fetch-only Supabase client) · live.js (live desk)
assets/vendor/qrcode.js (MIT) · assets/fonts/{Inter,SpaceGrotesk,Tajawal}-*.woff2 + OFL.txt · assets/img/logo.svg
backend/schema.sql (tables, RLS, RPCs) · backend/add-receptionist.sql
apps-script/Code.gs · apps-script/SETUP.md · apps-script/test/mock-test.js
screenshots/ · demo-video.mp4
```

---

## العربية

### ما هو؟
**AICore موعد** نموذج تجريبي يعمل فعلياً لـ**مكتب مواعيد على واتساب تحت إشراف بشري**، موجّه للعيادات الخاصة وعيادات الأسنان في نواكشوط. العيادة في النموذج وهمية: *عيادة الأمل لطب الأسنان – نواكشوط*.

- المريض يحجز من رابط أو رمز QR بالعربية أو الفرنسية، دون تطبيق ودون حساب.
- النظام يرتّب الطلبات، ويمنع حجز الأوقات المأخوذة، ويجهّز كل رسالة واتساب: التأكيد والرفض واقتراح وقت آخر والتذكير.
- **موظف مسمّى هو من يقرّر ويرسل.** كل قرار يُحفظ مع اسم الموظف ووقت القرار في **سجل المراجعة**.
- العربون المدفوع عبر Bankily أو Sedad أو Masrvi **يُتحقَّق منه يدوياً** ويُسجَّل هكذا: "مدفوع – تحقق منه: [الموظف] [الوقت]".
- يُسجَّل الحضور والغياب، وتعرض التقارير تقديراً للإيراد ولما وفّرته التذكيرات، مع توضيح أنه حساب تجريبي.

### التشغيل
```bash
python3 -m http.server 8765
```
ثم افتح `http://localhost:8765/` للوحة الموظفين، و`book.html` لصفحة الحجز، و`share.html` لملصق QR.
كل الملفات محلية (الخط والمكتبات)، لذلك يعمل النموذج دون إنترنت بعد أول تحميل. للنشر المجاني يمكن استعمال GitHub Pages، ثم وضع الرابط المنشور في صفحة الملصق.

### الصفحات
- **صفحة الحجز (`book.html`)**: الخدمة، ثم اليوم (الجمعة مغلق)، ثم الوقت (المحجوز رمادي)، ثم الاسم والهاتف والملاحظة. بعد الإرسال تظهر رسالة "طلبك قيد المراجعة، سيؤكد لك موظف العيادة قريباً" مع رقم مرجعي وزر واتساب جاهز وتعليمات العربون.
- **لوحة الاستقبال المباشرة (`index.html`)**: دخول بالبريد وكلمة المرور، قائمة مباشرة، قبول/رفض/تغيير الوقت مع ملاحظة، ورسالة واتساب جاهزة للمريض. والمريض يرى الحالة في «مواعيدي».
- **اللوحة التجريبية (`demo.html`)**: دخول تجريبي باختيار الاسم. تبويبات: طلبات جديدة، مؤكدة، مرفوضة/ملغاة، اليوم. أمام كل طلب: تأكيد أو رفض أو اقتراح وقت آخر، ويُسجَّل الاسم والوقت ثم تظهر مسودة واتساب يرسلها الموظف بضغطة. وفيها أيضاً التحقق من العربون وتسجيل الحضور والغياب.
- **التذكيرات**: مواعيد الغد مع رسائل جاهزة وزر واتساب وزر "تسجيل كمُرسل"، وخيار "إرسال الكل واحداً تلو الآخر".
- **سجل المراجعة**: من فعل ماذا ومتى، مع فلترة وبحث وتصدير CSV. هذا هو دليل الإشراف البشري ("0 إرسال آلي").
- **التقارير**: الحجوزات والتأكيد والرفض ونسبة الغياب والإيراد التقديري بالأوقية وأكثر الساعات ازدحاماً وما وفّرته التذكيرات (حساب تجريبي)، مع زر نسخ ملخص اليوم لواتساب صاحب العيادة.
- **ملصق QR (`share.html`)**: ملصق قابل للطباعة بالعربية والفرنسية لمكتب الاستقبال.

### تنبيهات مهمة
- **نموذج تجريبي، وكل البيانات وهمية.** التخزين في المتصفح فقط (localStorage)، والبيانات تختلف من جهاز لآخر. تتجدد البيانات تلقائياً مع كل يوم جديد، ويمكن إعادتها يدوياً من زر "إعادة البيانات التجريبية".
- **لا يوجد ربط بواجهة واتساب البرمجية.** روابط wa.me تفتح واتساب برسالة جاهزة، والموظف يضغط "إرسال". لا يُرسل أي شيء آلياً.
- لا ربط بنكي: التحقق من الدفع يدوي عن قصد.

### طريق النسخة الحقيقية
1. **مجاناً الآن**: Google Forms وSheets مع Apps Script (راجع مجلد `apps-script/`). فيه قائمة مخصصة للتأكيد والرفض وتسجيل الدفع مع بريد الموظف والوقت، وروابط تذكيرات الغد، وملخص يومي.
2. **خادم صغير مستضاف** عندما تحتاج عدة أجهزة لمشاركة البيانات، مع حسابات حقيقية للموظفين.
3. **لاحقاً: تذكيرات آلية عبر WhatsApp Cloud API** بقوالب "utility" معتمدة. Meta تحتسب السعر لكل رسالة، **وابتداءً من 1 أكتوبر 2026 تصبح رسائل الخدمة مدفوعة أيضاً، مع 1,000 رسالة خدمة مجانية شهرياً لكل رقم.** **مع الإبقاء على خطوة الموافقة البشرية**: موظف مسمّى يعتمد دفعة الرسائل، ويُسجَّل ذلك في السجل.

---
*AICore Digital LLC, Richmond, VA · aicoredigital.com. Fonts: Inter, Space Grotesk, Tajawal (SIL Open Font License 1.1). QR: qrcode-generator by Kazuhiko Arase (MIT).*

# AICore تدقيق · AICore Instruction

**مكتب مراجعة ملفات العملاء والقروض تحت إشراف بشري · Bureau d'instruction des dossiers clients et crédits, sous supervision humaine**
**النظام يرتّب، وموظفك يقرّر · Le système organise, votre équipe décide.**

by AICore Digital · aicoredigital.com

> ⚠️ **DEMO – FICTIONAL DATA · نموذج تجريبي – بيانات وهمية · Démo – données fictives**
> The institution *مؤسسة المثال للتمويل الأصغر – نواكشوط / Al Mithal Microfinance – Nouakchott* is fictional, and so is every person, NNI (`00000001xx`), phone number (`+222 00 00 00 xx`), address, watch-list entry and document. Every document is generated as HTML/SVG and stamped **SPECIMEN – نموذج**. Data lives only in the browser's `localStorage`. There is no server, no network call (fonts and the QR library are bundled locally) and **no automatic decision or sending**.

---

## English

### What it is
A clickable, working demo of **supervised automation for KYC and credit-file review** in microfinance institutions and banks. The system reads the incoming files, extracts the fields with a confidence score, runs the checks, and prepares a credit memo and a message to the customer. **A named officer always decides**, and every action goes into an exportable audit log.

The production story: the same workflow runs **self-hosted on the institution's own servers** (for example a self-hosted n8n with a document-reading service). Customer data never goes through Google Sheets, Gmail or any public service, and client files are **not used to train models**. This demo runs entirely in the browser with fictional data.

### Run it
Any static web server works. From the parent folder:

```bash
python3 -m http.server 8811
# open http://localhost:8811/aicore-tadqiq/            (app)
#      http://localhost:8811/aicore-tadqiq/share.html  (QR poster)
```

All paths are relative, so the demo also works under a sub-path such as `/tadqiq/` on GitHub Pages. The intended publish URL (not published yet) is `https://elycheikhmourid1-hash.github.io/tadqiq/`.

### Screens
| Route | What it shows |
|---|---|
| `#/inbox` | **Incoming files** from WhatsApp, e-mail or a branch, with the statuses جديد / قيد المراجعة / ناقص / مُحال للامتثال / مقبول / مرفوض. You can filter, search and filter by type. There are 10 seeded files: loan applications and account openings. |
| `#/file/ID/checks` | **Automatic checks** with a severity, the evidence, "why this matters" and a suggested action for each flag. The checks cover: expired or expiring ID, impossible dates (hired before age 16, a document dated in the future), name or NNI mismatch across documents, installment vs income (DTI above an example threshold), cash deposits above or just under a reporting threshold (an example setting that can be configured), a match against a **fictional** PEP/sanctions list, a duplicate applicant (same NNI or phone), missing documents, and low reading confidence. The officer confirms or clears each flag, and a note is required. |
| `#/file/ID/docs` | **Document viewer** with tabs: national ID, payslip or income certificate, bank or wallet statement, application form, guarantor. Fields linked to a flag are outlined in red. Missing documents show as placeholders. |
| `#/file/ID/data` | **Extracted fields** table (AR/FR) with the value, the source document and the confidence. |
| `#/file/ID/memo` | **Draft credit memo** (مذكرة ائتمان / note de crédit), editable. It is saved with the officer's name and can be regenerated. |
| `#/file/ID/msg` | **Draft message to the customer** asking for the missing or corrected documents, in Arabic, Hassaniya-style Arabic or French. It offers **Open WhatsApp** (a `wa.me` link with the text prefilled, never sent automatically), copy, and **mark as sent**. |
| `#/file/ID/decision` | **Decision panel**: قبول / رفض / طلب وثائق / إحالة لمسؤول الامتثال. A reason and a confirmation tick are both required. The decision is recorded with the officer and the time, and the record card states *automated decision: no*. |
| `#/compliance` | **Compliance officer view.** Switch role in the header to الغالية منت محمود. It shows the escalated files and their AML/list flags. The officer confirms or clears each flag with a note, then gives an opinion (no objection / enhanced due diligence / refuse). |
| `#/new` | **Live simulation**: preset sample files or your own data. An animated stepper runs reading → extracting → checking → drafts ready → awaiting human decision. The checks re-run live as you edit, and the sample can be added to the inbox. |
| `#/audit` | **Audit log** of every action with who, when and what. It has filters and search, **CSV export** (UTF-8 with BOM, so it opens in Excel), and a counter of *0 automatic decisions*. |
| `#/reports` | Files processed, flags by type, average review time, share of incomplete files. These are **demo numbers**, clearly labelled. A live donut shows the statuses of the files in the browser. |
| `#/about` | How it works, human in the loop, hosting on the institution's servers (with a diagram), no training on client files, and the KYC/AML context (BCM Instruction 03/GR/2026, UMEF training, MENAFATF evaluation). The wording is "supports your team's KYC review": **no claim of certification or legal compliance**. |
| `#/more` | Reports, about, the share/QR page, role, language, **example thresholds** (DTI, cash threshold, structuring %, guarantor amount, margin: all configurable and re-applied to every file) and **Reset demo**. |
| `share.html` | Printable **QR poster** that points to the placeholder URL. You can edit the URL and it is stored locally. |

**Languages:** Arabic (RTL, the default) and French (LTR). Use the header toggle or add `?lang=fr` to the URL.
**Persistence:** `localStorage` (`tadqiq_demo_v1`). The seed rebuilds itself when the calendar day changes. **Reset demo** does the same on demand.

### Tests
`tools/test-flow.js` runs the full end-to-end flow in headless Chromium with 68 checks, and also generates `screenshots/`. `tools/smoke.js` covers every route in AR and FR at 390×844 and 1366×900, checking for console errors, horizontal overflow and external requests. `tools/record-video.js` records the demo video.

```bash
NODE_PATH=/path/to/node_modules node tools/test-flow.js
```

### Limitations
- No backend and no authentication. The officer "login" is a role picker, and the data is per browser.
- Document reading is simulated: the "extracted" values and confidence scores are seeded or computed from the form, not read by a real OCR model.
- The PEP/sanctions list is **fictional**. A real deployment would use the institution's licensed lists.
- The Hassaniya-style drafts are approximate and must be reviewed by staff (the UI says so).
- Thresholds are **example settings**, not regulatory values.
- Report figures are illustrative demo numbers.

---

## العربية

**AICore تدقيق** نموذج تجريبي لمكتب مراجعة ملفات العملاء والقروض في مؤسسات التمويل الأصغر والبنوك. يقرأ النظام الوثائق ويستخرج الحقول، ثم يُجري الفحوصات: صلاحية البطاقة، ومنطقية التواريخ، وتطابق الأسماء، ونسبة التحمل، والإيداعات النقدية، والقوائم الوهمية، والتكرار، والوثائق الناقصة. بعد ذلك يُعدّ مذكرة الائتمان ورسالة العميل. **القرار دائماً للموظف**، ويُسجَّل كل إجراء باسم صاحبه ووقته في سجل قابل للتصدير.

في النسخة الفعلية يعمل النظام **على خوادم المؤسسة نفسها** (مثلاً n8n مستضاف ذاتياً)، ولا تمر بيانات العملاء عبر Google Sheets أو Gmail، ولا تُستعمل ملفاتهم لتدريب أي نموذج. أما هذا النموذج فيعمل في المتصفح فقط، وكل بياناته وهمية. النظام يساعد فريقكم في مراجعة «اعرف عميلك» ولا يدّعي أي اعتماد أو مطابقة قانونية.

## Français

**AICore Instruction** est une démo de bureau d'instruction des dossiers clients et crédits pour les institutions de microfinance et les banques. Le système lit les pièces et extrait les champs, puis contrôle la validité de la pièce d'identité, la cohérence des dates, la concordance des noms, le taux d'endettement, les versements en espèces, les listes fictives, les doublons et les pièces manquantes. Il prépare ensuite la note de crédit et le message au client. **La décision revient toujours à l'agent**, et chaque action est journalisée avec son auteur et l'heure, avec un export CSV.

En production, la solution est **hébergée sur les serveurs de l'institution** (par exemple n8n auto-hébergé). Les données clients ne passent ni par Google Sheets ni par Gmail, et les dossiers clients ne servent pas à entraîner des modèles. La démo tourne entièrement dans le navigateur, avec des données fictives. Elle appuie la revue KYC de vos équipes, sans prétendre à une certification ni à une conformité réglementaire.

---
Fonts: Cairo (SIL Open Font License, `assets/fonts/OFL.txt`). QR: qrcode-generator (MIT). Icons and charts: hand-made SVG.

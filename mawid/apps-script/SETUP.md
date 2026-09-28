# AICore Mawʿid: Google Sheets + Apps Script version

**AICore موعد: مكتب المواعيد على واتساب تحت إشراف بشري**
*Le système organise, votre équipe décide.*

This is the free "production-lite" version of the demo's core flow. It runs on Google Sheets with Apps Script. A clinic needs only a free Google account and WhatsApp (the regular app or WhatsApp Business) on the reception phone.

> ⚠️ This is a template. AICore wrote it and checked it offline (`node --check` plus a mocked unit test in `test/mock-test.js`), but it has **not** been run inside a live Google account. Before any real patient data goes in, test it with fictional data, review who can open the spreadsheet, and write down the patient consent and retention rules.

## What you get

| Tab | Purpose |
|---|---|
| **Bookings** | One row per booking request. The columns follow the web demo: Ref, CreatedAt, Name, Phone, Lang, Service, Date, Time, Note, Status, DecidedBy, DecidedAt, Deposit, DepositVerifiedBy, DepositVerifiedAt, ReminderSentBy, ReminderSentAt, Attendance, AttendanceBy, AttendanceAt, WhatsAppLink |
| **Log** | The audit log. Each row records who did what and when: `created`, `confirmed`, `refused`, `deposit_verified`, `reminders_built`, `reminder_sent`, `attended`, `noshow`. |
| **Staff** | The staff allowed to act: Email, Name, Role, Active (TRUE/FALSE). |
| *Reminders* | Created automatically by the menu. It lists tomorrow's appointments with one-tap wa.me links. |

The spreadsheet gets a custom **"AICore موعد"** menu with these items:

- ✅ **Confirm selected booking**: sets the Status, your e-mail and a timestamp, and logs the action. It then opens a dialog with a prefilled **wa.me** confirmation (Arabic or French, following the row's `Lang`). You press **Send** in WhatsApp yourself.
- ❌ **Refuse selected booking**: asks for a reason, records it, logs it and drafts the WhatsApp message.
- 💳 **Mark deposit paid (verified)**: asks "did you check Bankily / Sedad / Masrvi?" first, then records who verified the payment and when.
- 🙋 **Mark attended** / 🚫 **Mark no-show**
- 🔔 **Build tomorrow's reminders**: lists the next open day's confirmed appointments (Friday is closed by default) with one wa.me button each.
- ✉️ **Mark reminder sent (selected)**
- 📋 **Daily summary**: gives you a WhatsApp-ready summary in Arabic and French that you can copy or share.
- ⚙️ **Setup sheets (first run)** and 🧪 **Add demo booking (fictional)**

Nothing is ever sent to a patient automatically. The system drafts each message, and a named person sends it.

## Setup (about 10 minutes)

1. Create a new Google Sheet, e.g. `AICore Mawid – Clinique Al Amal`.
2. Open **Extensions → Apps Script**. Delete the sample code, paste the full contents of `Code.gs`, and save.
3. Edit the `CONFIG` block at the top: clinic name, the clinic's WhatsApp number (digits only, e.g. `222XXXXXXXX`), address, deposit amount and closed weekday.
4. Reload the spreadsheet. The **AICore موعد** menu appears after a few seconds.
5. Run **AICore موعد → ⚙️ Setup sheets (first run)**. Google asks you to authorise the script. This is your own script, so review the permissions and accept.
   It creates the Bookings, Log and Staff tabs and adds you to Staff.
6. In **Staff**, add one row per receptionist (e.g. Mariem, Sidi) with the Google e-mail they will use, and set `Active` to `TRUE`.
   Share the spreadsheet (Editor) **only** with those people.
7. Try it with **🧪 Add demo booking**. Select the new row in Bookings, run **✅ Confirm**, and check the Log tab.

### Getting bookings in (pick one)

**A. Google Form (simplest, free)**
1. Create a Google Form with these exact question titles: `Name`, `Phone`, `Service`, `Date`, `Time`, `Note`, `Deposit`, `Lang`.
   - `Service`: dropdown with `general, cleaning, filling, extraction, ortho, emergency` (you can label them in Arabic or French in the description).
   - `Date`: date question. `Time`: dropdown with the clinic's slots (`09:00`, `09:30`, …).
2. In the Form, go to **Responses → Link to Sheets** and choose *this* spreadsheet. A "Form Responses" tab appears; leave it as it is.
3. In Apps Script, open **Triggers (⏰) → Add trigger** → function `onFormSubmit`, event source *From spreadsheet*, event type *On form submit*.
4. Put the Form link (or a QR code of it) in the clinic's WhatsApp profile, status and reception poster.

**B. The static booking page (`book.html`) → Apps Script web app**
1. Apps Script: **Deploy → New deployment → Web app** (Execute as: *Me*; Who has access: *Anyone*).
2. From the booking page, `POST` JSON as `text/plain` to the web-app URL, for example:
   `fetch(URL, {method:'POST', body: JSON.stringify({name, phone, service, date, time, note, deposit, lang})})`
3. Add basic spam protection before going live, such as a simple shared token, rate limiting or a honeypot field.

### Optional automation (still human-approved)

- **Time trigger, daily at 18:00**: `buildTomorrowReminders` needs the UI, so run it from the menu. Instead, a trigger can call `remindersFor_()` and store the links, or a trigger on `sendDailySummaryEmail` can e-mail the *owner* an internal summary (set `CONFIG.OWNER_EMAIL`).
- Patient messages stay manual: staff tap the wa.me link and press Send.

## Notes and limits

- `Session.getActiveUser().getEmail()` identifies whoever clicks the menu once they have authorised the script. In some consumer-account setups it can come back empty. The script then asks for a name and logs it as `unverified:<name>`. For strict identity, use Google Workspace accounts from a single domain.
- Apps Script quotas on free accounts are far above what a single clinic needs.
- wa.me links open the regular WhatsApp or WhatsApp Business app. They cost nothing and use no WhatsApp API. See the README for the WhatsApp Cloud API path, which covers automatic reminders and is paid per message.
- Test the logic offline: `node apps-script/test/mock-test.js` (it mocks SpreadsheetApp, Session and the other services).

by AICore Digital · aicoredigital.com

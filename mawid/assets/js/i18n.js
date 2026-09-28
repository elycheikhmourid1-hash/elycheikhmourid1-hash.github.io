/* AICore Mawʿid — i18n (Arabic RTL default, French LTR)
 * DEMO build · fictional data · by AICore Digital · aicoredigital.com */
(function (global) {
  'use strict';

  var DICT = {
    ar: {
      product: 'AICore موعد',
      subtitle: 'مكتب المواعيد على واتساب تحت إشراف بشري',
      tagline: 'النظام يرتّب، وموظفك يقرّر',
      footer: 'by AICore Digital · aicoredigital.com',
      demoBanner: 'نموذج تجريبي – بيانات وهمية',
      clinicName: 'عيادة الأمل لطب الأسنان – نواكشوط',
      clinicShort: 'عيادة الأمل لطب الأسنان',
      clinicAddress: 'شارع التجربة رقم 00، تفرغ زينة، نواكشوط (عنوان وهمي)',
      clinicHours: 'من السبت إلى الخميس: من 09:00 إلى 13:00 ومن 16:00 إلى 20:00 · الجمعة: مغلق',
      langSwitch: 'Français',
      currency: 'أوقية',

      // services
      svc_general: 'فحص عام', svc_general_d: 'كشف وتشخيص',
      svc_cleaning: 'تنظيف الأسنان', svc_cleaning_d: 'إزالة الجير والتلميع',
      svc_filling: 'حشو وعلاج تسوس', svc_filling_d: 'علاج الأسنان المتضررة',
      svc_extraction: 'خلع ضرس', svc_extraction_d: 'خلع بسيط',
      svc_ortho: 'تقويم الأسنان', svc_ortho_d: 'استشارة أولى',
      svc_emergency: 'حالة طارئة', svc_emergency_d: 'ألم شديد أو كسر',

      // booking page
      book_title: 'احجز موعدك',
      book_intro: 'اختر الخدمة والوقت المناسب. سيراجع موظف العيادة طلبك ويؤكده لك على واتساب.',
      step_service: 'الخدمة', step_date: 'اليوم', step_time: 'الوقت', step_info: 'معلوماتك',
      closed: 'مغلق', today: 'اليوم', tomorrow: 'غداً',
      slots_morning: 'الفترة الصباحية', slots_evening: 'الفترة المسائية',
      slot_taken: 'محجوز', no_slots: 'لا توجد أوقات متاحة في هذا اليوم',
      pick_date_first: 'اختر اليوم أولاً',
      f_name: 'الاسم الكامل', f_name_ph: 'مثال: فاطمة منت محمد',
      f_phone: 'رقم الهاتف (واتساب)', f_phone_ph: '00 00 00 00',
      f_note: 'ملاحظة (اختياري)', f_note_ph: 'مثال: عندي ألم في الضرس من البارح',
      f_deposit: 'أرغب في دفع عربون 500 أوقية عبر Bankily أو Sedad (اختياري)',
      f_consent: 'لن يُعتمد موعدك إلا بعد مراجعته وتأكيده من موظف العيادة.',
      submit: 'إرسال طلب الحجز',
      summary: 'ملخص الطلب',
      err_service: 'اختر الخدمة', err_date: 'اختر اليوم', err_time: 'اختر الوقت',
      err_name: 'اكتب اسمك (3 أحرف على الأقل)', err_phone: 'رقم الهاتف يجب أن يتكون من 8 أرقام',
      err_taken: 'عذراً، تم حجز هذا الوقت للتو. اختر وقتاً آخر.',
      success_title: 'تم استلام طلبك',
      success_msg: 'طلبك قيد المراجعة، سيؤكد لك موظف العيادة قريباً',
      your_ref: 'رقمك المرجعي',
      send_wa: 'أرسل الطلب للعيادة عبر واتساب',
      wa_hint: 'يفتح واتساب برسالة جاهزة تحتوي رقمك المرجعي.',
      deposit_title: 'دفع العربون (اختياري)',
      deposit_body: 'لتثبيت موعدك يمكنك دفع عربون {amount} عبر تطبيقك المصرفي، مع كتابة المرجع في خانة الملاحظة:',
      deposit_merchant: 'رقم التاجر',
      deposit_ref: 'المرجع',
      deposit_note: 'سيتحقق موظف العيادة من الدفع يدوياً ويؤكده لك. أرقام التاجر هنا وهمية.',
      book_another: 'حجز موعد آخر',
      pending_review: 'قيد المراجعة',

      // wa messages
      wa_patient_request: 'السلام عليكم، أرسلت طلب حجز في {clinic}.\nالمرجع: {ref}\nالخدمة: {service}\nالموعد المطلوب: {date} الساعة {time}\nالاسم: {name}',
      wa_confirm: 'السلام عليكم {name} 👋\nتم تأكيد موعدك في {clinic} ✅\n📅 {date}\n🕘 الساعة {time}\n🦷 {service}\nالمرجع: {ref}\n📍 {address}\nيرجى الحضور قبل الموعد بعشر دقائق. للإلغاء أو التغيير، رُدّ على هذه الرسالة.\n— {staff}، {clinicShort}',
      wa_confirm_deposit: '\n💳 العربون: {amount} عبر Bankily أو Sedad، مع كتابة المرجع {ref}.',
      wa_refuse: 'السلام عليكم {name}،\nنعتذر، لا يمكننا تأكيد موعدك يوم {date} الساعة {time} ({reason}).\nيسعدنا حجز وقت آخر لك، رُدّ على هذه الرسالة أو احجز من جديد.\nالمرجع: {ref}\n— {staff}، {clinicShort}',
      wa_propose: 'السلام عليكم {name}،\nالوقت الذي طلبته ({oldDate} {oldTime}) غير متاح.\nنقترح عليك: 📅 {date} الساعة {time}.\nهل يناسبك؟ رُدّ بـ "نعم" للتأكيد.\nالمرجع: {ref}\n— {staff}، {clinicShort}',
      wa_reminder: 'السلام عليكم {name} 🌿\nتذكير بموعدك غداً في {clinic}:\n📅 {date}\n🕘 الساعة {time}\n🦷 {service}\nالمرجع: {ref}\nللتأكيد رُدّ بـ "1"، وللإلغاء رُدّ بـ "2".\n— {clinicShort}',
      wa_reminder_day: 'السلام عليكم {name} 🌿\nتذكير بموعدك في {clinic}:\n📅 {date}\n🕘 الساعة {time}\n🦷 {service}\nالمرجع: {ref}\nللتأكيد رُدّ بـ "1"، وللإلغاء رُدّ بـ "2".\n— {clinicShort}',

      // login
      login_title: 'دخول الموظفين',
      login_sub: 'اختر اسمك للدخول (تجريبي – بدون كلمة مرور)',
      login_note: 'في النسخة الحقيقية: حساب لكل موظف، وكل قرار يُسجَّل باسمه.',
      role_reception: 'الاستقبال', role_owner: 'الطبيب المسؤول',
      switch_user: 'تغيير المستخدم',
      hello: 'مرحباً',

      // nav
      nav_requests: 'الطلبات', nav_reminders: 'التذكيرات', nav_audit: 'السجل', nav_reports: 'التقارير', nav_more: 'المزيد',
      tab_pending: 'طلبات جديدة', tab_confirmed: 'مؤكدة', tab_refused: 'مرفوضة/ملغاة', tab_today: 'اليوم',

      // statuses
      st_pending: 'بانتظار المراجعة', st_proposed: 'اقتُرح وقت آخر – بانتظار رد المريض', st_confirmed: 'مؤكد', st_refused: 'مرفوض', st_cancelled: 'ملغى',
      att_attended: 'حضر', att_noshow: 'لم يحضر',
      dep_none: 'بدون عربون', dep_awaiting: 'بانتظار الدفع', dep_verified: 'مدفوع – تحقق منه: {staff} {time}',

      // actions
      a_confirm: 'تأكيد', a_refuse: 'رفض', a_propose: 'اقتراح وقت آخر',
      a_accept_proposal: 'المريض وافق – تأكيد', a_cancel: 'إلغاء الموعد',
      a_verify: 'تحقق من الدفع', a_request_deposit: 'طلب عربون',
      a_attended: 'حضر', a_noshow: 'لم يحضر', a_undo: 'تراجع',
      a_open_wa: 'فتح واتساب وإرسال', a_close: 'إغلاق', a_back: 'رجوع', a_save: 'حفظ',
      a_edit: 'تعديل النص', a_copy: 'نسخ', a_copied: 'تم النسخ',
      a_wa_draft: 'مسودة واتساب',

      requested: 'طُلب', received: 'وصل', note: 'ملاحظة', phone: 'الهاتف', service: 'الخدمة',
      by: 'بواسطة', at: 'في', ref: 'المرجع',
      decided_by: '{action} بواسطة {staff} · {time}',
      empty_pending: 'لا توجد طلبات جديدة 🎉', empty_generic: 'لا يوجد شيء هنا',
      empty_today: 'لا مواعيد مؤكدة اليوم',
      upcoming: 'القادمة', past: 'السابقة',

      // modals
      m_confirm_title: 'تأكيد الموعد',
      m_confirm_body: 'سيتم تسجيل التأكيد باسمك: {staff}. بعدها يجهّز النظام رسالة واتساب وتضغط أنت على "إرسال".',
      m_confirm_deposit: 'طلب عربون 500 أوقية (Bankily / Sedad)',
      m_refuse_title: 'رفض الطلب',
      m_refuse_reason: 'السبب',
      r_full: 'الوقت محجوز بالكامل', r_doctor: 'الطبيب غير متاح', r_duplicate: 'طلب مكرر', r_other: 'سبب آخر',
      m_propose_title: 'اقتراح وقت آخر',
      m_propose_body: 'اختر وقتاً بديلاً. سيُجهَّز لك نص واتساب لإرساله للمريض.',
      m_verify_title: 'تأكيد استلام العربون',
      m_verify_body: 'افتح تطبيق التاجر (Bankily / Sedad / Masrvi) وتأكد من وصول {amount} بالمرجع {ref}. هل وجدت الدفعة؟',
      m_verify_yes: 'نعم، وصلت الدفعة',
      m_draft_title: 'رسالة جاهزة للإرسال',
      m_draft_sub: 'النظام جهّز الرسالة. راجعها ثم اضغط للإرسال من واتساب العيادة.',
      m_draft_lang: 'لغة الرسالة',
      m_noshow_title: 'تسجيل غياب',
      m_noshow_body: 'تسجيل أن {name} لم يحضر موعد {time}؟',
      toast_confirmed: 'تم التأكيد وتسجيله باسمك', toast_refused: 'تم تسجيل الرفض',
      toast_proposed: 'تم تسجيل الاقتراح', toast_verified: 'تم تسجيل التحقق من الدفع',
      toast_attendance: 'تم تسجيل الحضور', toast_noshow: 'تم تسجيل الغياب',
      toast_wa_opened: 'فُتح واتساب بالرسالة الجاهزة – سُجّل في السجل',
      toast_reminder_marked: 'تم تسجيل إرسال التذكير',
      toast_reset: 'تمت إعادة البيانات التجريبية',
      toast_booked: 'وصل طلب جديد',

      // reminders
      rem_title: 'تذكيرات المواعيد',
      rem_sub: 'مواعيد {day} المؤكدة. النظام جهّز الرسائل، وأنت ترسلها بضغطة وتسجّل الإرسال.',
      rem_send_all: 'إرسال الكل واحداً تلو الآخر',
      rem_sent: 'أُرسل', rem_not_sent: 'لم يُرسل بعد',
      rem_mark_sent: 'تسجيل كمُرسل',
      rem_sent_by: 'أُرسل بواسطة {staff} · {time}',
      rem_progress: '{done} من {total} أُرسلت',
      rem_all_done: 'تم إرسال كل التذكيرات',
      rem_empty: 'لا مواعيد مؤكدة لهذا اليوم',
      rem_flow_title: 'إرسال التذكيرات',
      rem_flow_step: 'التذكير {i} من {n}',
      rem_flow_open: '1. افتح واتساب',
      rem_flow_done: '2. تم الإرسال – التالي',
      rem_flow_skip: 'تخطي',
      rem_flow_finish: 'انتهى! كل التذكيرات سُجّلت.',

      // audit
      audit_title: 'سجل المراجعة',
      audit_hitl: 'دليل الإشراف البشري',
      audit_sub: 'كل خطوة مسجلة: من فعل ماذا ومتى. لا يُرسل النظام أي رسالة ولا يعتمد أي موعد دون قرار موظف مسمّى.',
      audit_all: 'الكل', audit_filter_staff: 'كل الموظفين', audit_search: 'بحث بالاسم أو المرجع',
      audit_export: 'تصدير CSV',
      audit_count: '{n} عملية',
      actor_patient: 'المريض (صفحة الحجز)', actor_system: 'النظام',
      ev_created: 'طلب حجز جديد', ev_confirmed: 'تأكيد موعد', ev_refused: 'رفض طلب', ev_proposed: 'اقتراح وقت آخر',
      ev_cancelled: 'إلغاء موعد', ev_wa_opened: 'فتح رسالة واتساب', ev_reminder_sent: 'إرسال تذكير',
      ev_deposit_requested: 'طلب عربون', ev_deposit_verified: 'تحقق من الدفع', ev_attended: 'تسجيل حضور', ev_noshow: 'تسجيل غياب',
      ev_login: 'تسجيل دخول', ev_reset: 'إعادة البيانات',
      evd_wa_confirm: 'رسالة تأكيد', evd_wa_refuse: 'رسالة رفض', evd_wa_propose: 'رسالة اقتراح', evd_wa_reminder: 'تذكير',

      // reports
      rep_title: 'التقارير',
      rep_sub: 'آخر 7 أيام · محسوبة من بيانات النموذج التجريبي',
      k_requests: 'طلبات هذا الأسبوع', k_confirmed: 'مؤكدة', k_refused: 'مرفوضة/ملغاة', k_noshow: 'نسبة الغياب',
      k_revenue: 'الإيراد التقديري', k_deposits: 'عربون تم التحقق منه',
      k_pending: 'بانتظار المراجعة', k_attended: 'حضروا',
      ch_per_day: 'الحجوزات حسب اليوم', ch_hours: 'أكثر الساعات ازدحاماً', ch_split: 'مؤكدة مقابل مرفوضة',
      saved_title: 'ما وفّرته التذكيرات (حساب تجريبي)',
      saved_body: '{n} تذكير أُرسل × {rate}% غياب متوقع بدون تذكير × {avg} متوسط سعر الموعد',
      saved_note: 'افتراضات للتوضيح فقط: نسبة الغياب بدون تذكير ({rate}%) ومتوسط السعر قابلة للتعديل حسب العيادة.',
      saved_result: 'تقدير الإيراد المحفوظ',
      copy_summary: 'نسخ ملخص اليوم لواتساب',
      share_summary: 'إرسال الملخص لصاحب العيادة',
      sum_title: 'ملخص اليوم',
      sum_text: '📋 ملخص {date}\n{clinic}\n\n📥 طلبات جديدة: {newReq}\n✅ مؤكدة اليوم: {todayConf}\n🙋 حضروا: {att} · ❌ لم يحضروا: {ns}\n⏳ بانتظار المراجعة: {pending}\n💳 عربون تم التحقق منه: {depN} ({depAmt})\n🔔 تذكيرات الغد: {remSent} من {remTotal} أُرسلت\n💰 الإيراد التقديري اليوم: {rev}\n\n— مُرسل من نظام AICore موعد (نموذج تجريبي – بيانات وهمية)',
      rep_legend_conf: 'مؤكدة', rep_legend_ref: 'مرفوضة/ملغاة', rep_legend_pend: 'قيد المراجعة',

      // more
      more_title: 'المزيد',
      more_book: 'صفحة الحجز للمرضى', more_book_d: 'ما يراه المريض من رابط واتساب أو رمز QR',
      more_share: 'ملصق QR للاستقبال', more_share_d: 'رمز QR ورابط wa.me قابل للطباعة',
      more_reset: 'إعادة البيانات التجريبية', more_reset_d: 'حذف كل التغييرات وإعادة الحجوزات الوهمية',
      more_reset_confirm: 'إعادة كل البيانات التجريبية؟ ستُحذف التغييرات.',
      more_about: 'عن النموذج',
      more_about_d: 'نموذج تجريبي يعمل في المتصفح فقط (localStorage). لا يتصل بواتساب ولا يرسل أي رسالة تلقائياً: روابط wa.me تفتح واتساب برسالة جاهزة، والموظف هو من يضغط إرسال.',
      open: 'فتح',

      // share
      share_title: 'احجز موعدك عبر واتساب',
      share_scan: 'امسح الرمز بالكاميرا',
      share_steps: 'امسح الرمز ← اختر الوقت ← يؤكد لك موظفنا على واتساب',
      share_or: 'أو راسلنا مباشرة',
      share_link_label: 'رابط الحجز',
      share_wa_label: 'رابط واتساب',
      share_print: 'طباعة الملصق',
      share_mode: 'الرمز يفتح',
      share_mode_book: 'صفحة الحجز',
      share_mode_wa: 'محادثة واتساب',
      share_url_hint: 'غيّر الرابط إلى عنوان صفحة الحجز المنشورة (مثلاً على GitHub Pages).',
      share_wa_text: 'السلام عليكم، أريد حجز موعد في عيادة الأمل',
      share_back: 'رجوع للوحة التحكم',
      share_human: 'كل موعد يؤكده موظف من العيادة'
    },

    fr: {
      product: 'AICore Maw‘id',
      subtitle: 'Le secrétariat WhatsApp supervisé',
      tagline: 'Le système organise, votre équipe décide.',
      footer: 'by AICore Digital · aicoredigital.com',
      demoBanner: 'Démo – données fictives',
      clinicName: 'Clinique dentaire Al Amal – Nouakchott',
      clinicShort: 'Clinique dentaire Al Amal',
      clinicAddress: 'Rue de la Démo n° 00, Tevragh Zeina, Nouakchott (adresse fictive)',
      clinicHours: 'Samedi – jeudi : 09h00–13h00 et 16h00–20h00 · Vendredi : fermé',
      langSwitch: 'العربية',
      currency: 'MRU',

      svc_general: 'Consultation générale', svc_general_d: 'Examen et diagnostic',
      svc_cleaning: 'Détartrage', svc_cleaning_d: 'Nettoyage et polissage',
      svc_filling: 'Soins et caries', svc_filling_d: 'Traitement des dents abîmées',
      svc_extraction: 'Extraction', svc_extraction_d: 'Extraction simple',
      svc_ortho: 'Orthodontie', svc_ortho_d: 'Première consultation',
      svc_emergency: 'Urgence', svc_emergency_d: 'Douleur forte ou dent cassée',

      book_title: 'Prendre rendez-vous',
      book_intro: 'Choisissez le soin et l’horaire. Un membre de l’équipe vérifie votre demande et vous confirme sur WhatsApp.',
      step_service: 'Soin', step_date: 'Jour', step_time: 'Heure', step_info: 'Vos coordonnées',
      closed: 'Fermé', today: 'Aujourd’hui', tomorrow: 'Demain',
      slots_morning: 'Matin', slots_evening: 'Après-midi / soir',
      slot_taken: 'Pris', no_slots: 'Aucun horaire disponible ce jour',
      pick_date_first: 'Choisissez d’abord un jour',
      f_name: 'Nom complet', f_name_ph: 'Ex. : Fatimetou Mint Mohamed',
      f_phone: 'Téléphone (WhatsApp)', f_phone_ph: '00 00 00 00',
      f_note: 'Remarque (facultatif)', f_note_ph: 'Ex. : douleur à une molaire depuis hier',
      f_deposit: 'Je souhaite payer un acompte de 500 MRU via Bankily ou Sedad (facultatif)',
      f_consent: 'Votre rendez-vous n’est valable qu’après vérification et confirmation par l’équipe.',
      submit: 'Envoyer la demande',
      summary: 'Récapitulatif',
      err_service: 'Choisissez un soin', err_date: 'Choisissez un jour', err_time: 'Choisissez une heure',
      err_name: 'Indiquez votre nom (3 lettres minimum)', err_phone: 'Le numéro doit comporter 8 chiffres',
      err_taken: 'Désolé, ce créneau vient d’être pris. Choisissez-en un autre.',
      success_title: 'Demande reçue',
      success_msg: 'Votre demande est en cours de vérification, un membre de la clinique vous confirmera bientôt.',
      your_ref: 'Votre référence',
      send_wa: 'Envoyer la demande à la clinique sur WhatsApp',
      wa_hint: 'Ouvre WhatsApp avec un message prêt contenant votre référence.',
      deposit_title: 'Acompte (facultatif)',
      deposit_body: 'Pour garantir votre rendez-vous, vous pouvez payer un acompte de {amount} depuis votre application, en indiquant la référence :',
      deposit_merchant: 'N° marchand',
      deposit_ref: 'Référence',
      deposit_note: 'La clinique vérifie le paiement manuellement et vous le confirme. Numéros marchands fictifs.',
      book_another: 'Nouveau rendez-vous',
      pending_review: 'En vérification',

      wa_patient_request: 'Bonjour, j’ai envoyé une demande de rendez-vous à la {clinic}.\nRéférence : {ref}\nSoin : {service}\nCréneau demandé : {date} à {time}\nNom : {name}',
      wa_confirm: 'Bonjour {name} 👋\nVotre rendez-vous à la {clinic} est confirmé ✅\n📅 {date}\n🕘 {time}\n🦷 {service}\nRéférence : {ref}\n📍 {address}\nMerci d’arriver 10 minutes en avance. Pour annuler ou modifier, répondez à ce message.\n— {staff}, {clinicShort}',
      wa_confirm_deposit: '\n💳 Acompte : {amount} via Bankily ou Sedad, référence {ref}.',
      wa_refuse: 'Bonjour {name},\nNous ne pouvons malheureusement pas confirmer votre rendez-vous du {date} à {time} ({reason}).\nNous serons ravis de vous proposer un autre créneau : répondez à ce message ou refaites une demande.\nRéférence : {ref}\n— {staff}, {clinicShort}',
      wa_propose: 'Bonjour {name},\nLe créneau demandé ({oldDate} {oldTime}) n’est pas disponible.\nNous vous proposons : 📅 {date} à {time}.\nCela vous convient-il ? Répondez « oui » pour confirmer.\nRéférence : {ref}\n— {staff}, {clinicShort}',
      wa_reminder: 'Bonjour {name} 🌿\nRappel de votre rendez-vous demain à la {clinic} :\n📅 {date}\n🕘 {time}\n🦷 {service}\nRéférence : {ref}\nRépondez « 1 » pour confirmer ou « 2 » pour annuler.\n— {clinicShort}',
      wa_reminder_day: 'Bonjour {name} 🌿\nRappel de votre rendez-vous à la {clinic} :\n📅 {date}\n🕘 {time}\n🦷 {service}\nRéférence : {ref}\nRépondez « 1 » pour confirmer ou « 2 » pour annuler.\n— {clinicShort}',

      login_title: 'Accès équipe',
      login_sub: 'Choisissez votre nom (démo – sans mot de passe)',
      login_note: 'En production : un compte par personne, chaque décision est enregistrée à son nom.',
      role_reception: 'Accueil', role_owner: 'Médecin responsable',
      switch_user: 'Changer d’utilisateur',
      hello: 'Bonjour',

      nav_requests: 'Demandes', nav_reminders: 'Rappels', nav_audit: 'Journal', nav_reports: 'Rapports', nav_more: 'Plus',
      tab_pending: 'Nouvelles', tab_confirmed: 'Confirmées', tab_refused: 'Refusées/annulées', tab_today: 'Aujourd’hui',

      st_pending: 'À vérifier', st_proposed: 'Autre horaire proposé – attente patient', st_confirmed: 'Confirmé', st_refused: 'Refusé', st_cancelled: 'Annulé',
      att_attended: 'Présent', att_noshow: 'Absent',
      dep_none: 'Sans acompte', dep_awaiting: 'Paiement en attente', dep_verified: 'Payé – vérifié par : {staff} {time}',

      a_confirm: 'Confirmer', a_refuse: 'Refuser', a_propose: 'Proposer un autre horaire',
      a_accept_proposal: 'Patient d’accord – confirmer', a_cancel: 'Annuler le RDV',
      a_verify: 'Vérifier le paiement', a_request_deposit: 'Demander un acompte',
      a_attended: 'Présent', a_noshow: 'Absent', a_undo: 'Annuler',
      a_open_wa: 'Ouvrir WhatsApp et envoyer', a_close: 'Fermer', a_back: 'Retour', a_save: 'Enregistrer',
      a_edit: 'Modifier le texte', a_copy: 'Copier', a_copied: 'Copié',
      a_wa_draft: 'Brouillon WhatsApp',

      requested: 'Demandé', received: 'Reçu', note: 'Remarque', phone: 'Téléphone', service: 'Soin',
      by: 'par', at: 'à', ref: 'Réf.',
      decided_by: '{action} par {staff} · {time}',
      empty_pending: 'Aucune nouvelle demande 🎉', empty_generic: 'Rien pour le moment',
      empty_today: 'Aucun rendez-vous confirmé aujourd’hui',
      upcoming: 'À venir', past: 'Passés',

      m_confirm_title: 'Confirmer le rendez-vous',
      m_confirm_body: 'La confirmation sera enregistrée à votre nom : {staff}. Le système prépare ensuite le message WhatsApp, et c’est vous qui appuyez sur « Envoyer ».',
      m_confirm_deposit: 'Demander un acompte de 500 MRU (Bankily / Sedad)',
      m_refuse_title: 'Refuser la demande',
      m_refuse_reason: 'Motif',
      r_full: 'créneau complet', r_doctor: 'médecin indisponible', r_duplicate: 'demande en double', r_other: 'autre motif',
      m_propose_title: 'Proposer un autre horaire',
      m_propose_body: 'Choisissez un créneau de remplacement. Un message WhatsApp sera préparé pour le patient.',
      m_verify_title: 'Confirmer la réception de l’acompte',
      m_verify_body: 'Ouvrez l’application marchand (Bankily / Sedad / Masrvi) et vérifiez la réception de {amount} avec la référence {ref}. Avez-vous trouvé le paiement ?',
      m_verify_yes: 'Oui, paiement reçu',
      m_draft_title: 'Message prêt à envoyer',
      m_draft_sub: 'Le système a préparé le message. Relisez-le, puis envoyez-le depuis le WhatsApp de la clinique.',
      m_draft_lang: 'Langue du message',
      m_noshow_title: 'Marquer absent',
      m_noshow_body: 'Enregistrer que {name} ne s’est pas présenté(e) à {time} ?',
      toast_confirmed: 'Confirmé et enregistré à votre nom', toast_refused: 'Refus enregistré',
      toast_proposed: 'Proposition enregistrée', toast_verified: 'Vérification du paiement enregistrée',
      toast_attendance: 'Présence enregistrée', toast_noshow: 'Absence enregistrée',
      toast_wa_opened: 'WhatsApp ouvert avec le message – consigné au journal',
      toast_reminder_marked: 'Envoi du rappel enregistré',
      toast_reset: 'Données de démo réinitialisées',
      toast_booked: 'Nouvelle demande reçue',

      rem_title: 'Rappels de rendez-vous',
      rem_sub: 'Rendez-vous confirmés de {day}. Le système prépare les messages ; vous les envoyez d’un geste et l’envoi est consigné.',
      rem_send_all: 'Tout envoyer, un par un',
      rem_sent: 'Envoyé', rem_not_sent: 'Pas encore envoyé',
      rem_mark_sent: 'Marquer comme envoyé',
      rem_sent_by: 'Envoyé par {staff} · {time}',
      rem_progress: '{done} sur {total} envoyés',
      rem_all_done: 'Tous les rappels sont envoyés',
      rem_empty: 'Aucun rendez-vous confirmé ce jour-là',
      rem_flow_title: 'Envoi des rappels',
      rem_flow_step: 'Rappel {i} sur {n}',
      rem_flow_open: '1. Ouvrir WhatsApp',
      rem_flow_done: '2. Envoyé – suivant',
      rem_flow_skip: 'Passer',
      rem_flow_finish: 'Terminé ! Tous les rappels sont consignés.',

      audit_title: 'Journal d’audit',
      audit_hitl: 'Preuve de supervision humaine',
      audit_sub: 'Chaque étape est tracée : qui a fait quoi, et quand. Le système n’envoie aucun message et ne valide aucun rendez-vous sans la décision d’une personne nommée.',
      audit_all: 'Tout', audit_filter_staff: 'Toute l’équipe', audit_search: 'Rechercher nom ou référence',
      audit_export: 'Exporter CSV',
      audit_count: '{n} opérations',
      actor_patient: 'Patient (page de réservation)', actor_system: 'Système',
      ev_created: 'Nouvelle demande', ev_confirmed: 'RDV confirmé', ev_refused: 'Demande refusée', ev_proposed: 'Autre horaire proposé',
      ev_cancelled: 'RDV annulé', ev_wa_opened: 'Message WhatsApp ouvert', ev_reminder_sent: 'Rappel envoyé',
      ev_deposit_requested: 'Acompte demandé', ev_deposit_verified: 'Paiement vérifié', ev_attended: 'Présence notée', ev_noshow: 'Absence notée',
      ev_login: 'Connexion', ev_reset: 'Réinitialisation',
      evd_wa_confirm: 'message de confirmation', evd_wa_refuse: 'message de refus', evd_wa_propose: 'message de proposition', evd_wa_reminder: 'rappel',

      rep_title: 'Rapports',
      rep_sub: '7 derniers jours · calculés sur les données de démo',
      k_requests: 'Demandes cette semaine', k_confirmed: 'Confirmées', k_refused: 'Refusées/annulées', k_noshow: 'Taux d’absence',
      k_revenue: 'Chiffre d’affaires estimé', k_deposits: 'Acomptes vérifiés',
      k_pending: 'À vérifier', k_attended: 'Présents',
      ch_per_day: 'Rendez-vous par jour', ch_hours: 'Heures les plus chargées', ch_split: 'Confirmées vs refusées',
      saved_title: 'Ce que les rappels ont sauvé (calcul de démo)',
      saved_body: '{n} rappels envoyés × {rate} % d’absence attendue sans rappel × {avg} prix moyen',
      saved_note: 'Hypothèses indicatives : le taux d’absence sans rappel ({rate} %) et le prix moyen sont à ajuster pour chaque clinique.',
      saved_result: 'Revenu préservé estimé',
      copy_summary: 'Copier le résumé du jour (WhatsApp)',
      share_summary: 'Envoyer le résumé au responsable',
      sum_title: 'Résumé du jour',
      sum_text: '📋 Résumé du {date}\n{clinic}\n\n📥 Nouvelles demandes : {newReq}\n✅ Confirmés aujourd’hui : {todayConf}\n🙋 Présents : {att} · ❌ Absents : {ns}\n⏳ À vérifier : {pending}\n💳 Acomptes vérifiés : {depN} ({depAmt})\n🔔 Rappels de demain : {remSent} sur {remTotal} envoyés\n💰 CA estimé du jour : {rev}\n\n— AICore Mawʿid (démo – données fictives)',
      rep_legend_conf: 'Confirmées', rep_legend_ref: 'Refusées/annulées', rep_legend_pend: 'À vérifier',

      more_title: 'Plus',
      more_book: 'Page de réservation patient', more_book_d: 'Ce que voit le patient via le lien WhatsApp ou le QR code',
      more_share: 'Affiche QR pour l’accueil', more_share_d: 'QR code et lien wa.me imprimables',
      more_reset: 'Réinitialiser la démo', more_reset_d: 'Efface les modifications et recharge les rendez-vous fictifs',
      more_reset_confirm: 'Réinitialiser toutes les données de démo ? Les modifications seront perdues.',
      more_about: 'À propos de la démo',
      more_about_d: 'Démo fonctionnant uniquement dans le navigateur (localStorage). Aucune connexion à WhatsApp, aucun envoi automatique : les liens wa.me ouvrent WhatsApp avec un message prêt, et c’est l’équipe qui appuie sur Envoyer.',
      open: 'Ouvrir',

      share_title: 'Prenez rendez-vous sur WhatsApp',
      share_scan: 'Scannez le code avec votre appareil photo',
      share_steps: 'Scannez → choisissez l’heure → notre équipe vous confirme sur WhatsApp',
      share_or: 'ou écrivez-nous directement',
      share_link_label: 'Lien de réservation',
      share_wa_label: 'Lien WhatsApp',
      share_print: 'Imprimer l’affiche',
      share_mode: 'Le QR ouvre',
      share_mode_book: 'la page de réservation',
      share_mode_wa: 'la discussion WhatsApp',
      share_url_hint: 'Remplacez par l’adresse publiée de la page de réservation (ex. GitHub Pages).',
      share_wa_text: 'Bonjour, je souhaite prendre rendez-vous à la clinique Al Amal',
      share_back: 'Retour au tableau de bord',
      share_human: 'Chaque rendez-vous est confirmé par un membre de l’équipe'
    }
  };

  var LANG_KEY = 'mawid_lang';

  function getLang() {
    var l = null;
    try { l = localStorage.getItem(LANG_KEY); } catch (e) {}
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'ar' || q === 'fr') { l = q; try { localStorage.setItem(LANG_KEY, q); } catch (e) {} }
    return l === 'fr' ? 'fr' : 'ar';
  }

  var I18N = {
    lang: getLang(),
    dict: DICT,
    t: function (key, vars, lang) {
      var d = DICT[lang || I18N.lang] || DICT.ar;
      var s = d[key];
      if (s == null) s = DICT.ar[key];
      if (s == null) return key;
      if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
      return s;
    },
    setLang: function (l) {
      I18N.lang = l === 'fr' ? 'fr' : 'ar';
      try { localStorage.setItem(LANG_KEY, I18N.lang); } catch (e) {}
      I18N.applyDir();
    },
    applyDir: function () {
      var h = document.documentElement;
      h.lang = I18N.lang;
      h.dir = I18N.lang === 'ar' ? 'rtl' : 'ltr';
    },
    locale: function (lang) { return (lang || I18N.lang) === 'fr' ? 'fr-FR' : 'ar-MR-u-nu-latn'; },
    /** Translate every [data-i18n] / [data-i18n-ph] element under root */
    translateDom: function (root) {
      (root || document).querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = I18N.t(el.getAttribute('data-i18n')); });
      (root || document).querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', I18N.t(el.getAttribute('data-i18n-ph'))); });
      (root || document).querySelectorAll('[data-i18n-title]').forEach(function (el) { el.setAttribute('title', I18N.t(el.getAttribute('data-i18n-title'))); });
    }
  };

  I18N.applyDir();
  global.I18N = I18N;
  global.t = I18N.t;
})(window);

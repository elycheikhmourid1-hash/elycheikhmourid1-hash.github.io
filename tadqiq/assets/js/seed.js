/* AICore Tadqiq — fictional seed files (Al Mithal Microfinance – fictional institution).
 * Every name, NNI (00000001xx), phone (+222 00 00 00 xx), address and amount is invented. */
(function (global) {
  'use strict';
  var C = Core, D = C.D;
  function ago(min) { return new Date(Date.now() - min * 60000).toISOString(); }
  function monthKey(offset) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return C.dateKey(d); }
  var ADDR = { ar: 'حي المثال، زنقة 00، نواكشوط (عنوان وهمي)', fr: 'Quartier Al Mithal, rue 00, Nouakchott (adresse fictive)' };
  var POB = { ar: 'نواكشوط', fr: 'Nouakchott' };
  var WALLET = { ar: 'محفظة المثال الرقمية (وهمية)', fr: 'Portefeuille Al Mithal (fictif)' };

  function tx(d, ar, fr, amt, cash) { return { d: d, ar: ar, fr: fr, amt: amt, cash: !!cash }; }
  function statement(nameLat, n, o) {
    o = o || {};
    var list = [];
    [-88, -58, -28].forEach(function (x, i) {
      if (o.salary) list.push(tx(D(x), 'تحويل راتب – ' + o.salary.ar, 'Virement salaire – ' + o.salary.fr, o.salaryAmt));
      else list.push(tx(D(x + 2), 'تحويل وارد – مبيعات', 'Transfert reçu – ventes', o.salesAmt || 15000 + i * 2500));
      list.push(tx(D(x + 3), 'دفع فاتورة كهرباء', 'Paiement facture électricité', -(1800 + i * 150)));
      list.push(tx(D(x + 9), 'سحب لدى وكيل', 'Retrait agent', -(o.withdraw || 6000)));
      list.push(tx(D(x + 15), 'شراء لدى تاجر', 'Achat marchand', -(2400 + i * 300)));
      if (o.smallCash) list.push(tx(D(x + 20), 'إيداع نقدي في الوكالة', 'Versement espèces agence', o.smallCash, true));
    });
    (o.cash || []).forEach(function (c) { list.push(tx(D(c[0]), 'إيداع نقدي في الوكالة', 'Versement espèces agence', c[1], true)); });
    (o.cash || []).forEach(function (c, i) { if (i % 2 === 1) list.push(tx(D(c[0] + 1), 'تحويل صادر', 'Transfert émis', -Math.round(c[1] * 0.9))); });
    list.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    return { nameLat: nameLat, account: 'WLT-000000' + n, provider: WALLET, from: D(-90), to: D(-2), issuedOn: o.issuedOn || D(-1), opening: o.opening || 12500, tx: list };
  }

  function build() {
    var F = [];
    // 1 — clean loan (WhatsApp, new)
    F.push({
      id: 'TDQ-0142', type: 'loan', source: 'whatsapp', status: 'new', receivedAt: ago(25), lang: 'hs', assigned: null,
      applicant: { ar: 'فاطمة منت محمد الأمين', lat: 'Fatimetou Mint Mohamed Lemine', gender: 'F', nni: '0000000142', dob: '1990-05-14', phone: '00000042', address: ADDR, job: { ar: 'معلمة', fr: 'Enseignante' }, employer: { ar: 'مدرسة المثال الخاصة (وهمية)', fr: 'École privée Al Mithal (fictive)' }, income: 18500, otherDebt: 0 },
      request: { amount: 90000, term: 18, purpose: { ar: 'تجهيز ورشة خياطة منزلية', fr: 'Équipement d’un atelier de couture à domicile' } },
      docs: {
        id: { nameAr: 'فاطمة منت محمد الأمين', nameLat: 'Fatimetou Mint Mohamed Lemine', nni: '0000000142', dob: '1990-05-14', pob: POB, sex: 'F', issue: D(-1650), expiry: D(1998) },
        payslip: { nameLat: 'Fatimetou Mint Mohamed Lemine', nni: '0000000142', employer: { ar: 'مدرسة المثال الخاصة (وهمية)', fr: 'École privée Al Mithal (fictive)' }, position: 'Enseignante', matricule: 'EMP-00142', period: monthKey(-1), gross: 21000, net: 18500, hireDate: '2016-10-01' },
        statement: statement('Fatimetou Mint Mohamed Lemine', '142', { salary: { ar: 'مدرسة المثال', fr: 'École Al Mithal' }, salaryAmt: 18500, withdraw: 7000 }),
        application: { nameAr: 'فاطمة منت محمد الأمين', nni: '0000000142', phone: '00000042', amount: 90000, term: 18, purpose: { ar: 'تجهيز ورشة خياطة منزلية', fr: 'Équipement d’un atelier de couture à domicile' }, date: D(0) }
      },
      conf: { purpose: 71 }
    });
    // 2 — expired ID + high DTI (branch, in review)
    F.push({
      id: 'TDQ-0141', type: 'loan', source: 'branch', status: 'review', receivedAt: ago(190), lang: 'ar', assigned: 'mariem',
      applicant: { ar: 'سيدي محمد ولد أحمدو', lat: 'Sidi Mohamed Ould Ahmedou', gender: 'M', nni: '0000000141', dob: '1984-11-02', phone: '00000041', address: ADDR, job: { ar: 'تاجر مواد غذائية', fr: 'Commerçant (denrées alimentaires)' }, employer: null, income: 32000, otherDebt: 4000 },
      request: { amount: 400000, term: 24, purpose: { ar: 'توسيع محل تجاري', fr: 'Extension du commerce' } },
      docs: {
        id: { nameAr: 'سيدي محمد ولد أحمدو', nameLat: 'Sidi Mohamed Ould Ahmedou', nni: '0000000141', dob: '1984-11-02', pob: POB, sex: 'M', issue: D(-3700), expiry: D(-47) },
        incomeCert: { nameAr: 'سيدي محمد ولد أحمدو', activity: { ar: 'تجارة المواد الغذائية بالتقسيط', fr: 'Commerce de détail de denrées alimentaires' }, since: '2011-03-01', net: 32000, date: D(-10), issuer: { ar: 'رابطة تجار سوق المثال (وهمية)', fr: 'Association des commerçants du marché Al Mithal (fictive)' } },
        statement: statement('Sidi Mohamed Ould Ahmedou', '141', { salesAmt: 21000, withdraw: 9000, smallCash: 30000 }),
        application: { nameAr: 'سيدي محمد ولد أحمدو', nni: '0000000141', phone: '00000041', amount: 400000, term: 24, purpose: { ar: 'توسيع محل تجاري', fr: 'Extension du commerce' }, date: D(0) },
        guarantor: { nameAr: 'أحمد ولد محمد فال', nni: '0000000901', phone: '00000091', relation: { ar: 'أخ', fr: 'Frère' }, job: { ar: 'موظف', fr: 'Employé' }, income: 25000, date: D(0) }
      }
    });
    // 3 — impossible hire date + name mismatch (email, new)
    F.push({
      id: 'TDQ-0140', type: 'loan', source: 'email', status: 'new', receivedAt: ago(60 * 21), lang: 'ar', assigned: null,
      applicant: { ar: 'محمد ولد الشيخ سيدي', lat: 'Mohamed Ould Cheikh Sidi', gender: 'M', nni: '0000000140', dob: '1994-03-08', phone: '00000040', address: ADDR, job: { ar: 'أمين مخزن', fr: 'Magasinier' }, employer: { ar: 'شركة المثال للخدمات اللوجستية (وهمية)', fr: 'Société Al Mithal Logistique (fictive)' }, income: 26000, otherDebt: 0 },
      request: { amount: 150000, term: 18, purpose: { ar: 'شراء دراجة نارية للتوصيل', fr: 'Achat d’une moto de livraison' } },
      docs: {
        id: { nameAr: 'محمد ولد الشيخ سيدي', nameLat: 'Mohamed Ould Cheikh Sidi', nni: '0000000140', dob: '1994-03-08', pob: POB, sex: 'M', issue: D(-900), expiry: D(2750) },
        payslip: { nameLat: 'Mohamedou Ould Cheikh', nni: '0000000140', employer: { ar: 'شركة المثال للخدمات اللوجستية (وهمية)', fr: 'Société Al Mithal Logistique (fictive)' }, position: 'Magasinier', matricule: 'EMP-00140', period: monthKey(-1), gross: 29500, net: 26000, hireDate: '2005-09-01' },
        statement: statement('Mohamed Ould Cheikh Sidi', '140', { salary: { ar: 'المثال اللوجستية', fr: 'Al Mithal Logistique' }, salaryAmt: 26000 }),
        application: { nameAr: 'محمدن ولد الشيخ', nni: '0000000140', phone: '00000040', amount: 150000, term: 18, purpose: { ar: 'شراء دراجة نارية للتوصيل', fr: 'Achat d’une moto de livraison' }, date: D(-1) }
      }
    });
    // 4 — cash structuring (branch, escalated to compliance)
    F.push({
      id: 'TDQ-0139', type: 'loan', source: 'branch', status: 'compliance', receivedAt: ago(60 * 26), lang: 'hs', assigned: 'mariem',
      applicant: { ar: 'عيشة منت اباه', lat: 'Aïcha Mint Abbah', gender: 'F', nni: '0000000139', dob: '1979-07-21', phone: '00000039', address: ADDR, job: { ar: 'تاجرة ملاحف', fr: 'Commerçante (voiles « melhfa »)' }, employer: null, income: 45000, otherDebt: 0 },
      request: { amount: 250000, term: 24, purpose: { ar: 'شراء بضاعة للمحل', fr: 'Achat de marchandises' } },
      docs: {
        id: { nameAr: 'عيشة منت اباه', nameLat: 'Aïcha Mint Abbah', nni: '0000000139', dob: '1979-07-21', pob: POB, sex: 'F', issue: D(-1200), expiry: D(2400) },
        incomeCert: { nameAr: 'عيشة منت اباه', activity: { ar: 'بيع الملاحف بالجملة ونصف الجملة', fr: 'Vente de voiles (melhfa) en gros et demi-gros' }, since: '2009-01-15', net: 45000, date: D(-20), issuer: { ar: 'رابطة تجار سوق المثال (وهمية)', fr: 'Association des commerçants du marché Al Mithal (fictive)' } },
        statement: statement('Aicha Mint Abbah', '139', { salesAmt: 38000, withdraw: 12000, cash: [[-13, 280000], [-10, 290000], [-7, 275000], [-4, 350000]], opening: 41000 }),
        application: { nameAr: 'عيشة منت اباه', nni: '0000000139', phone: '00000039', amount: 250000, term: 24, purpose: { ar: 'شراء بضاعة للمحل', fr: 'Achat de marchandises' }, date: D(-1) },
        guarantor: { nameAr: 'لالة منت اباه', nni: '0000000902', phone: '00000092', relation: { ar: 'أخت', fr: 'Sœur' }, job: { ar: 'تاجرة', fr: 'Commerçante' }, income: 30000, date: D(-1) }
      }
    });
    // 5 — fictional PEP list match (email, escalated)
    F.push({
      id: 'TDQ-0138', type: 'loan', source: 'email', status: 'compliance', receivedAt: ago(60 * 30), lang: 'ar', assigned: 'mohamed',
      applicant: { ar: 'الشيخ ولد بوبكر ولد المختار', lat: 'Cheikh Ould Boubacar Ould Mokhtar', gender: 'M', nni: '0000000138', dob: '1975-02-10', phone: '00000038', address: ADDR, job: { ar: 'مقاول بناء', fr: 'Entrepreneur en bâtiment' }, employer: null, income: 60000, otherDebt: 0 },
      request: { amount: 300000, term: 24, purpose: { ar: 'شراء معدات بناء', fr: 'Achat de matériel de chantier' } },
      docs: {
        id: { nameAr: 'الشيخ ولد بوبكر ولد المختار', nameLat: 'Cheikh Ould Boubacar Ould Mokhtar', nni: '0000000138', dob: '1975-02-10', pob: POB, sex: 'M', issue: D(-2000), expiry: D(1600) },
        incomeCert: { nameAr: 'الشيخ ولد بوبكر ولد المختار', activity: { ar: 'مقاولات البناء الصغيرة', fr: 'Petits travaux de bâtiment' }, since: '2004-06-01', net: 60000, date: D(-15), issuer: { ar: 'غرفة المثال للحرفيين (وهمية)', fr: 'Chambre des artisans Al Mithal (fictive)' } },
        statement: statement('Cheikh Ould Boubacar Ould Mokhtar', '138', { salesAmt: 52000, withdraw: 15000 }),
        application: { nameAr: 'الشيخ ولد بوبكر ولد المختار', nni: '0000000138', phone: '00000038', amount: 300000, term: 24, purpose: { ar: 'شراء معدات بناء', fr: 'Achat de matériel de chantier' }, date: D(-2) },
        guarantor: { nameAr: 'محمد محمود ولد بوبكر', nni: '0000000903', phone: '00000093', relation: { ar: 'ابن عم', fr: 'Cousin' }, job: { ar: 'موظف', fr: 'Employé' }, income: 40000, date: D(-2) }
      }
    });
    // 6 — missing documents (WhatsApp, incomplete)
    F.push({
      id: 'TDQ-0137', type: 'loan', source: 'whatsapp', status: 'incomplete', receivedAt: ago(60 * 28), lang: 'hs', assigned: 'mariem',
      applicant: { ar: 'خديجة منت سيدي', lat: 'Khadijetou Mint Sidi', gender: 'F', nni: '0000000137', dob: '1996-12-03', phone: '00000037', address: ADDR, job: { ar: 'بائعة كسكس ومأكولات', fr: 'Vendeuse de couscous et plats' }, employer: null, income: 15000, otherDebt: 0 },
      request: { amount: 60000, term: 12, purpose: { ar: 'شراء أواني ومعدات طبخ', fr: 'Achat d’ustensiles de cuisine' } },
      docs: {
        id: { nameAr: 'خديجة منت سيدي', nameLat: 'Khadijetou Mint Sidi', nni: '0000000137', dob: '1996-12-03', pob: POB, sex: 'F', issue: D(-600), expiry: D(3000) },
        application: { nameAr: 'خديجة منت سيدي', nni: '0000000137', phone: '00000037', amount: 60000, term: 12, purpose: { ar: 'شراء أواني ومعدات طبخ', fr: 'Achat d’ustensiles de cuisine' }, date: D(-1) }
      },
      conf: { income: 73 }
    });
    // 7 — duplicate NNI with a rejected file (email, in review)
    F.push({
      id: 'TDQ-0136', type: 'loan', source: 'email', status: 'review', receivedAt: ago(60 * 5), lang: 'fr', assigned: 'mohamed',
      applicant: { ar: 'ممادو كان', lat: 'Mamadou Kane', gender: 'M', nni: '0000000133', dob: '1988-06-19', phone: '00000036', address: ADDR, job: { ar: 'تقني شبكات', fr: 'Technicien réseau' }, employer: { ar: 'شركة المثال لخدمات الاتصال (وهمية)', fr: 'Al Mithal Télécom Services (fictive)' }, income: 52000, otherDebt: 0 },
      request: { amount: 200000, term: 12, purpose: { ar: 'ترميم منزل', fr: 'Rénovation du logement' } },
      docs: {
        id: { nameAr: 'ممادو كان', nameLat: 'Mamadou Kane', nni: '0000000133', dob: '1988-06-19', pob: { ar: 'روصو', fr: 'Rosso' }, sex: 'M', issue: D(-400), expiry: D(3200) },
        payslip: { nameLat: 'Mamadou Kane', nni: '0000000133', employer: { ar: 'شركة المثال لخدمات الاتصال (وهمية)', fr: 'Al Mithal Télécom Services (fictive)' }, position: 'Technicien réseau', matricule: 'EMP-00136', period: monthKey(-1), gross: 60500, net: 52000, hireDate: '2014-02-01' },
        statement: statement('Mamadou Kane', '136', { salary: { ar: 'المثال للاتصال', fr: 'Al Mithal Télécom' }, salaryAmt: 52000, withdraw: 14000 }),
        application: { nameAr: 'ممادو كان', nni: '0000000133', phone: '00000036', amount: 200000, term: 12, purpose: { ar: 'ترميم منزل', fr: 'Rénovation du logement' }, date: D(0) }
      }
    });
    // 8 — account opening, income certificate dated in the future (WhatsApp, new)
    F.push({
      id: 'TDQ-0135', type: 'account', source: 'whatsapp', status: 'new', receivedAt: ago(50), lang: 'fr', assigned: null,
      applicant: { ar: 'أميناتا صو', lat: 'Aminata Sow', gender: 'F', nni: '0000000135', dob: '1992-09-30', phone: '00000035', address: ADDR, job: { ar: 'خياطة', fr: 'Couturière' }, employer: null, income: 22000, otherDebt: 0 },
      request: { product: { ar: 'حساب ادخار', fr: 'Compte épargne' }, expected: 20000 },
      docs: {
        id: { nameAr: 'أميناتا صو', nameLat: 'Aminata Sow', nni: '0000000135', dob: '1992-09-30', pob: { ar: 'كيهيدي', fr: 'Kaédi' }, sex: 'F', issue: D(-800), expiry: D(2900) },
        incomeCert: { nameAr: 'أميناتا صو', activity: { ar: 'خياطة الملابس التقليدية', fr: 'Couture de vêtements traditionnels' }, since: '2015-05-01', net: 22000, date: D(9), issuer: { ar: 'تعاونية المثال للخياطات (وهمية)', fr: 'Coopérative des couturières Al Mithal (fictive)' } },
        application: { nameAr: 'أميناتا صو', nni: '0000000135', phone: '00000035', product: { ar: 'حساب ادخار', fr: 'Compte épargne' }, expected: 20000, date: D(0) }
      }
    });
    // 9 — account opening, approved
    F.push({
      id: 'TDQ-0134', type: 'account', source: 'branch', status: 'approved', receivedAt: ago(60 * 52), lang: 'ar', assigned: 'mariem',
      applicant: { ar: 'أحمد سالم ولد اعبيد', lat: 'Ahmed Salem Ould Ebeid', gender: 'M', nni: '0000000134', dob: '1986-01-15', phone: '00000034', address: ADDR, job: { ar: 'محاسب', fr: 'Comptable' }, employer: { ar: 'مكتب المثال للمحاسبة (وهمي)', fr: 'Cabinet comptable Al Mithal (fictif)' }, income: 34000, otherDebt: 0 },
      request: { product: { ar: 'حساب جارٍ', fr: 'Compte courant' }, expected: 40000 },
      docs: {
        id: { nameAr: 'أحمد سالم ولد اعبيد', nameLat: 'Ahmed Salem Ould Ebeid', nni: '0000000134', dob: '1986-01-15', pob: POB, sex: 'M', issue: D(-1500), expiry: D(2100) },
        payslip: { nameLat: 'Ahmed Salem Ould Ebeid', nni: '0000000134', employer: { ar: 'مكتب المثال للمحاسبة (وهمي)', fr: 'Cabinet comptable Al Mithal (fictif)' }, position: 'Comptable', matricule: 'EMP-00134', period: monthKey(-1), gross: 39000, net: 34000, hireDate: '2012-09-01' },
        application: { nameAr: 'أحمد سالم ولد اعبيد', nni: '0000000134', phone: '00000034', product: { ar: 'حساب جارٍ', fr: 'Compte courant' }, expected: 40000, date: D(-2) }
      }
    });
    // 10 — rejected loan (DTI), shares NNI with #7
    F.push({
      id: 'TDQ-0133', type: 'loan', source: 'branch', status: 'rejected', receivedAt: ago(60 * 24 * 7), lang: 'fr', assigned: 'mohamed',
      applicant: { ar: 'موسى صار', lat: 'Moussa Sarr', gender: 'M', nni: '0000000133', dob: '1983-04-04', phone: '00000033', address: ADDR, job: { ar: 'بائع', fr: 'Vendeur' }, employer: { ar: 'مخبزة المثال (وهمية)', fr: 'Boulangerie Al Mithal (fictive)' }, income: 24000, otherDebt: 6000 },
      request: { amount: 350000, term: 24, purpose: { ar: 'شراء سيارة أجرة', fr: 'Achat d’un taxi' } },
      docs: {
        id: { nameAr: 'موسى صار', nameLat: 'Moussa Sarr', nni: '0000000133', dob: '1983-04-04', pob: POB, sex: 'M', issue: D(-2500), expiry: D(1100) },
        payslip: { nameLat: 'Moussa Sarr', nni: '0000000133', employer: { ar: 'مخبزة المثال (وهمية)', fr: 'Boulangerie Al Mithal (fictive)' }, position: 'Vendeur', matricule: 'EMP-00133', period: monthKey(-1), gross: 27000, net: 24000, hireDate: '2010-04-01' },
        statement: statement('Moussa Sarr', '133', { salary: { ar: 'مخبزة المثال', fr: 'Boulangerie Al Mithal' }, salaryAmt: 24000 }),
        application: { nameAr: 'موسى صار', nni: '0000000133', phone: '00000033', amount: 350000, term: 24, purpose: { ar: 'شراء سيارة أجرة', fr: 'Achat d’un taxi' }, date: D(-7) },
        guarantor: { nameAr: 'عمر صار', nni: '0000000904', phone: '00000094', relation: { ar: 'أخ', fr: 'Frère' }, job: { ar: 'سائق', fr: 'Chauffeur' }, income: 20000, date: D(-7) }
      }
    });
    F.forEach(function (f) { f.reviews = {}; f.decisions = []; f.memo = null; f.msg = null; f.compliance = null; });
    return F;
  }

  /* human history for decided / escalated files (appended by Store.seed) */
  var HISTORY = [
    { file: 'TDQ-0141', ev: [['review_start', 'mariem', 170]] },
    { file: 'TDQ-0139', ev: [['review_start', 'mariem', 60 * 24], ['decision_escalate', 'mariem', 125, { ar: 'إيداعات نقدية متكررة قرب العتبة تفوق كثيراً الدخل المصرّح به. أطلب رأي الامتثال قبل أي قرار.', fr: 'Versements espèces répétés près du seuil, très supérieurs au revenu déclaré. Je demande l’avis conformité avant toute décision.' }]] },
    { file: 'TDQ-0138', ev: [['review_start', 'mohamed', 60 * 28], ['decision_escalate', 'mohamed', 60 * 26, { ar: 'الاسم يطابق شخصاً على قائمة الاختبار (معرض سياسياً). تاريخ الميلاد مختلف، أحتاج تأكيد الامتثال.', fr: 'Le nom correspond à une PPE de la liste de test ; date de naissance différente. Confirmation conformité nécessaire.' }]] },
    { file: 'TDQ-0137', ev: [['review_start', 'mariem', 60 * 27], ['decision_docs', 'mariem', 60 * 26, { ar: 'ينقص إثبات الدخل وكشف الحساب.', fr: 'Manquent le justificatif de revenus et le relevé de compte.' }], ['msg_open', 'mariem', 60 * 26 - 2], ['msg_sent', 'mariem', 60 * 26 - 3]] },
    { file: 'TDQ-0136', ev: [['review_start', 'mohamed', 60 * 4]] },
    { file: 'TDQ-0134', ev: [['review_start', 'mariem', 60 * 50], ['memo_edit', 'mariem', 60 * 49], ['decision_approve', 'mariem', 60 * 48, { ar: 'ملف مكتمل، الوثائق مطابقة، ولا تنبيهات.', fr: 'Dossier complet, pièces concordantes, aucune alerte.' }]] },
    { file: 'TDQ-0133', ev: [['review_start', 'mohamed', 60 * 24 * 7 - 60], ['decision_reject', 'mohamed', 60 * 24 * 6, { ar: 'القسط والالتزامات تتجاوز الدخل الشهري (نسبة التحمل 100%).', fr: 'Mensualité et charges supérieures au revenu mensuel (endettement 100 %).' }], ['msg_open', 'mohamed', 60 * 24 * 6 - 5]] }
  ];

  global.Seed = { build: build, HISTORY: HISTORY, ago: ago };
})(window);

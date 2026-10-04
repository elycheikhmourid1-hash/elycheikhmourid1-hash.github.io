/* Map view strings (AR / FR / EN). Merged into I18N and I18N3D.
   EXAMPLE pins and robots are a simulation. Weather and look-angles are not. */
(function () {
  'use strict';
  var L = {
    ar: {
      nav_map: 'خريطة', m_map: 'خريطة', map_view_title: 'خريطة',
      map_lead: 'بلاط حقيقي لشوارع نواكشوط. النقاط المكتوبة EXAMPLE والروبوتات والمهام محاكاة — هذا العرض لا يراقب أي محطة ولا أي مشغّل.',
      map_pt_gs: 'محطة توضيحية', map_pt_wh: 'مستودع توضيحي', map_pt_ex1: 'موقع مثال أ', map_pt_ex2: 'موقع مثال ب',
      map_task_h: 'مهمة بانتظار الموافقة', map_wx_h: 'الطقس', map_pt_h: 'زاوية التوجيه',
      map_point_chip: 'مهمة', map_no_task: 'لا مهمة معلّقة عند نقطة EXAMPLE هذه. ليست موقعاً مراقَباً.',
      map_alert: 'تنبيه', map_more: 'ومهام أخرى بانتظارك: {n}',
      map_wx_note: 'الطقس LIVE من Open-Meteo لوسط نواكشوط، وليس حسّاساً على هذه النقطة المثال.',
      map_pt_note: 'الزوايا محسوبة لهذه النقطة المثال (معادلة حقيقية)، وليست قراءة من هوائي حقيقي.',
      map_pt_below: 'تحت الأفق من إحداثيات هذه النقطة المثال.',
      map_fail: 'تعذّر تحميل البلاط. تحقق من الاتصال.',
      map_streets: 'شوارع', map_sat: 'أقمار', map_back: 'المشهد ثلاثي الأبعاد',
      map_layer_aria: 'التبديل بين الشوارع وصور الأقمار', map_aria: 'خريطة نواكشوط: نقاط EXAMPLE وروبوتات محاكاة',
      map_flag: 'EXAMPLE', map_pin_gs: 'محطة', map_pin_wh: 'مستودع', map_pin_ex1: 'أ', map_pin_ex2: 'ب'
    },
    fr: {
      nav_map: 'Carte', m_map: 'Carte', map_view_title: 'Carte',
      map_lead: 'Tuiles réelles des rues de Nouakchott. Les points marqués EXAMPLE, les robots et les tâches sont une simulation — cette démo ne surveille aucune station ni aucun opérateur.',
      map_pt_gs: 'Station illustrative', map_pt_wh: 'Entrepôt illustratif', map_pt_ex1: 'Site exemple A', map_pt_ex2: 'Site exemple B',
      map_task_h: 'Tâche en attente d’accord', map_wx_h: 'Météo', map_pt_h: 'Angle de visée',
      map_point_chip: 'Tâche', map_no_task: 'Aucune tâche en attente sur ce point EXAMPLE. Ce n’est pas un site surveillé.',
      map_alert: 'Alerte', map_more: 'Autres tâches en attente : {n}',
      map_wx_note: 'Météo LIVE Open-Meteo pour le centre-ville de Nouakchott, pas un capteur sur ce point exemple.',
      map_pt_note: 'Angles calculés pour ce point exemple (vraie formule), pas une lecture d’une antenne réelle.',
      map_pt_below: 'Sous l’horizon depuis les coordonnées de ce point exemple.',
      map_fail: 'Tuiles indisponibles. Vérifiez la connexion.',
      map_streets: 'Rues', map_sat: 'Satellite', map_back: 'Scène 3D',
      map_layer_aria: 'Basculer entre les rues et l’imagerie satellite', map_aria: 'Carte de Nouakchott : points EXAMPLE et robots simulés',
      map_flag: 'EXAMPLE', map_pin_gs: 'Stn', map_pin_wh: 'Ent', map_pin_ex1: 'A', map_pin_ex2: 'B'
    },
    en: {
      nav_map: 'Map', m_map: 'Map', map_view_title: 'Map',
      map_lead: 'Real street tiles of Nouakchott. Pins marked EXAMPLE, robots and tasks are a simulation — this demo does not monitor any station or operator.',
      map_pt_gs: 'Illustrative station', map_pt_wh: 'Illustrative warehouse', map_pt_ex1: 'Example site A', map_pt_ex2: 'Example site B',
      map_task_h: 'Task waiting for approval', map_wx_h: 'Weather', map_pt_h: 'Look angle',
      map_point_chip: 'Task', map_no_task: 'No pending task at this EXAMPLE point. It is not a monitored site.',
      map_alert: 'Alert', map_more: 'Other tasks still waiting: {n}',
      map_wx_note: 'LIVE weather is Open-Meteo for Nouakchott city centre, not a sensor on this example point.',
      map_pt_note: 'Angles are computed for this example point (real formula), not a reading from a real antenna.',
      map_pt_below: 'Below the horizon from this example point’s coordinates.',
      map_fail: 'Map tiles could not be loaded. Check the connection.',
      map_streets: 'Streets', map_sat: 'Satellite', map_back: '3D scene',
      map_layer_aria: 'Switch between streets and satellite imagery', map_aria: 'Map of Nouakchott: EXAMPLE points and simulated robots',
      map_flag: 'EXAMPLE', map_pin_gs: 'Stn', map_pin_wh: 'Wh', map_pin_ex1: 'A', map_pin_ex2: 'B'
    }
  };
  [window.I18N, window.I18N3D].forEach(function (T) {
    if (!T) return;
    Object.keys(L).forEach(function (l) {
      if (!T[l]) return;
      var o = L[l], k;
      for (k in o) T[l][k] = o[k];
    });
  });
})();

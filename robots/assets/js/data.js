/* AICore Robotics Ops — fictional demo data (sites, plans, templates, alert types). No real sites, no real telemetry. */
window.DATA = (function () {
  /* Projection for the stylised map (lon/lat -> SVG units, viewBox 0 0 640 640). Not geodetic-accurate by design. */
  var K = 46;
  function proj(lon, lat) { return [(lon + 17.6) * K + 20, (27.4 - lat) * K + 20]; }
  var outline = [[-17.05, 20.77], [-16.95, 21.33], [-13.17, 21.33], [-12.0, 23.45], [-8.67, 27.29], [-8.67, 25.99], [-4.83, 24.99],
    [-5.6, 22.5], [-5.9, 19.5], [-5.3, 17.5], [-4.8, 16.6], [-5.5, 15.6], [-7.5, 15.3], [-9.4, 15.5], [-11.4, 15.7], [-12.2, 14.75],
    [-13.4, 16.1], [-14.3, 16.55], [-15.5, 16.5], [-16.5, 16.05], [-16.2, 17.4], [-16.05, 18.1], [-16.3, 19.4], [-16.8, 20.2]].map(function (p) { return proj(p[0], p[1]); });

  var sites = [
    { id: 'gs', kind: 'gs', geo: proj(-15.98, 18.08), at: [150, 408], lx: 0, ly: 40 },
    { id: 'tw', kind: 'tw', geo: proj(-13.05, 20.5), at: proj(-13.05, 20.5), lx: 0, ly: 40 },
    { id: 'en', kind: 'en', geo: proj(-17.03, 20.93), at: [62, 314], lx: 40, ly: 40 },
    { id: 'wh', kind: 'wh', geo: proj(-15.98, 18.08), at: [150, 490], lx: 0, ly: 40 }
  ];

  /* Site plans: viewBox 0 0 400 260. route = closed patrol loop starting at the charging dock. */
  var plans = {
    gs: {
      route: 'M50 40 L345 40 L345 215 L190 215 L175 128 L50 128 Z',
      shapes: '<rect class="p-fence" x="16" y="16" width="368" height="228" rx="10"/><rect class="p-bld" x="36" y="150" width="120" height="70" rx="6"/>' +
        '<circle class="p-dish" cx="290" cy="88" r="30"/><circle class="p-dish-in" cx="290" cy="88" r="10"/><circle class="p-dish" cx="332" cy="176" r="20"/><circle class="p-dish-in" cx="332" cy="176" r="7"/>' +
        '<rect class="p-cab" x="52" y="164" width="18" height="26" rx="3"/><rect class="p-cab" x="76" y="164" width="18" height="26" rx="3"/><rect class="p-cab" x="100" y="164" width="18" height="26" rx="3"/>',
      pois: [[290, 88, 'geo_c'], [332, 176, 'ku'], [61, 155, 'hpa'], [85, 178, 'idu'], [168, 198, 'ups'], [200, 244, 'gate'], [50, 40, 'dock']]
    },
    tw: {
      route: 'M60 40 L340 40 L362 70 L362 190 L340 215 L60 215 L38 190 L38 70 Z',
      shapes: '<rect class="p-fence" x="16" y="16" width="368" height="228" rx="10"/><path class="p-tower" d="M200 52 L224 150 L176 150 Z M188 100 H212 M192 125 H208"/>' +
        '<rect class="p-cab" x="100" y="160" width="22" height="30" rx="3"/><rect class="p-cab" x="278" y="160" width="22" height="30" rx="3"/><rect class="p-bld" x="300" y="56" width="50" height="40" rx="5"/>',
      pois: [[200, 52, 'tower'], [111, 198, 'cabinet'], [325, 76, 'gen'], [200, 244, 'gate'], [60, 40, 'dock']]
    },
    en: {
      route: 'M45 40 L262 40 L262 150 L370 150 L370 225 L45 225 Z',
      shapes: '<rect class="p-fence" x="16" y="16" width="368" height="228" rx="10"/>' +
        '<g class="p-panel"><rect x="70" y="62" width="40" height="22" rx="2"/><rect x="116" y="62" width="40" height="22" rx="2"/><rect x="162" y="62" width="40" height="22" rx="2"/><rect x="208" y="62" width="40" height="22" rx="2"/>' +
        '<rect x="70" y="92" width="40" height="22" rx="2"/><rect x="116" y="92" width="40" height="22" rx="2"/><rect x="162" y="92" width="40" height="22" rx="2"/><rect x="208" y="92" width="40" height="22" rx="2"/>' +
        '<rect x="70" y="122" width="40" height="22" rx="2"/><rect x="116" y="122" width="40" height="22" rx="2"/><rect x="162" y="122" width="40" height="22" rx="2"/><rect x="208" y="122" width="40" height="22" rx="2"/></g>' +
        '<rect class="p-bld" x="298" y="56" width="70" height="50" rx="5"/><rect class="p-cab" x="310" y="68" width="16" height="26" rx="3"/><rect class="p-cab" x="332" y="68" width="16" height="26" rx="3"/>',
      pois: [[159, 103, 'panel'], [333, 56, 'cabinet'], [330, 188, 'meter'], [200, 244, 'gate'], [45, 40, 'dock']]
    },
    wh: {
      route: 'M34 34 L366 34 L366 222 L34 222 Z',
      shapes: '<rect class="p-fence" x="16" y="16" width="368" height="228" rx="10"/><rect class="p-bld" x="62" y="62" width="276" height="130" rx="8"/>' +
        '<g class="p-shelf"><rect x="82" y="80" width="236" height="12" rx="2"/><rect x="82" y="104" width="236" height="12" rx="2"/><rect x="82" y="128" width="236" height="12" rx="2"/><rect x="82" y="152" width="236" height="12" rx="2"/></g>',
      pois: [[200, 98, 'shelf'], [340, 150, 'meter'], [200, 244, 'gate'], [34, 34, 'dock']]
    }
  };

  var robots = [
    { id: 'R-01', site: 'gs', state: 'patrol', batt: 78, d: 120 },
    { id: 'R-02', site: 'gs', state: 'charging', batt: 41, d: 0 },
    { id: 'R-03', site: 'tw', state: 'patrol', batt: 66, d: 300 },
    { id: 'R-04', site: 'en', state: 'patrol', batt: 83, d: 90 },
    { id: 'R-05', site: 'wh', state: 'charging', batt: 34, d: 0 }
  ];

  var templates = [
    { id: 'antenna', icon: 'i-dish', sites: ['gs', 'tw'], total: 20 },
    { id: 'pointing', icon: 'i-dish', sites: ['gs'], total: 20 },
    { id: 'rainfade', icon: 'i-dish', sites: ['gs'], total: 18 },
    { id: 'thermal', icon: 'i-therm', sites: ['gs', 'tw', 'en'], total: 20 },
    { id: 'perimeter', icon: 'i-fence', sites: ['gs', 'tw', 'en', 'wh'], total: 24 },
    { id: 'gauges', icon: 'i-gauge', sites: ['gs', 'en', 'wh'], total: 20 },
    { id: 'night', icon: 'i-moon', sites: ['gs', 'tw', 'en', 'wh'], total: 24 }
  ];

  var alertTypes = [
    { id: 'overheat', sev: 'high', tpl: 'thermal', sites: ['gs', 'tw', 'en'] },
    { id: 'door', sev: 'medium', tpl: 'perimeter', sites: ['gs', 'tw', 'en', 'wh'] },
    { id: 'dish', sev: 'medium', tpl: 'antenna', sites: ['gs', 'tw'] },
    { id: 'pointing', sev: 'medium', tpl: 'pointing', sites: ['gs'] },
    { id: 'ku', sev: 'medium', tpl: 'pointing', sites: ['gs'] },
    { id: 'hpa', sev: 'high', tpl: 'thermal', sites: ['gs'] },
    { id: 'idu', sev: 'medium', tpl: 'gauges', sites: ['gs'] },
    { id: 'ups', sev: 'medium', tpl: 'gauges', sites: ['gs'] },
    { id: 'intruder', sev: 'critical', tpl: 'night', sites: ['gs', 'tw', 'en', 'wh'] }
  ];

  return { proj: proj, outline: outline, sites: sites, plans: plans, robots: robots, templates: templates, alertTypes: alertTypes,
    ops: ['o1', 'o2'], whatsapp: 'https://wa.me/18044853384' };
})();

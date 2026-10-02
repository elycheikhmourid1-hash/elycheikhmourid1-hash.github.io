/* AICore Robotics Ops — GEO look-angle geometry (pure client-side maths, NO network).
   Computes azimuth / elevation / LNB skew from an earth station to a geostationary satellite at a given orbital longitude.
   This is a real formula (WGS-84 station position, GEO radius 42 164.17 km, vector method; the textbook closed form is included
   as a cross-check). It is computed from geometry only — it is NOT a measurement from a real antenna. No refraction / no magnetic declination.
   Works in the browser (window.GEO) and in Node (module.exports) so the same code is unit-tested. */
(function (root, factory) {
  var g = factory();
  if (typeof module === 'object' && module.exports) module.exports = g; else root.GEO = g;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var A = 6378.137, F = 1 / 298.257223563, E2 = F * (2 - F);      // WGS-84
  var R_GEO = 42164.169;                                          // geostationary orbit radius from Earth's centre, km
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  /* Nouakchott (city-centre coordinates, same as the weather query). Replace with surveyed site coordinates for real use. */
  var STATION = { id: 'nkc', lat: 18.0735, lon: -15.9582, h: 0 };
  /* Generic orbital longitudes only (degrees east positive). No operator / satellite names on purpose. */
  var SAT_LONS = [-30, -15, -5, 0, 5, 13, 20, 30.5, 39, 52];

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function unit(a) { var n = Math.sqrt(dot(a, a)); return [a[0] / n, a[1] / n, a[2] / n]; }
  function perp(v, a) { var k = dot(v, a); return [v[0] - k * a[0], v[1] - k * a[1], v[2] - k * a[2]]; }

  function stationECEF(latDeg, lonDeg, hKm, spherical) {
    var p = latDeg * D2R, l = lonDeg * D2R, h = hKm || 0, e2 = spherical ? 0 : E2;
    var N = A / Math.sqrt(1 - e2 * Math.sin(p) * Math.sin(p));
    return [(N + h) * Math.cos(p) * Math.cos(l), (N + h) * Math.cos(p) * Math.sin(l), (N * (1 - e2) + h) * Math.sin(p)];
  }

  /* Vector method: ECEF line of sight rotated into the station's local East-North-Up frame. */
  function lookAngles(latDeg, lonDeg, satLonDeg, opts) {
    opts = opts || {};
    var p = latDeg * D2R, l = lonDeg * D2R;
    var st = stationECEF(latDeg, lonDeg, opts.h || 0, opts.spherical);
    var sat = [R_GEO * Math.cos(satLonDeg * D2R), R_GEO * Math.sin(satLonDeg * D2R), 0];
    var d = sub(sat, st), range = Math.sqrt(dot(d, d)), a = unit(d);
    var east = [-Math.sin(l), Math.cos(l), 0];
    var north = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
    var up = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
    var e = dot(d, east), n = dot(d, north), u = dot(d, up);
    var az = norm360(Math.atan2(e, n) * R2D), el = Math.atan2(u, Math.sqrt(e * e + n * n)) * R2D;
    /* LNB / feed skew: angle between the local "vertical" reference and the satellite's N-S polarisation axis, both taken
       perpendicular to the line of sight. Positive = clockwise when viewed from behind the dish, looking toward the satellite. */
    var r = unit(perp(up, a)), pv = unit(perp([0, 0, 1], a));
    var skew = Math.atan2(dot(a, cross(r, pv)), dot(r, pv)) * R2D;
    skew = skew > 90 ? skew - 180 : skew <= -90 ? skew + 180 : skew;   // polarisation is a line, not an arrow: fold into (-90, 90]
    return { az: az, el: el, skew: skew, range: range, visible: el > 0 };
  }

  /* Textbook closed form on a spherical Earth (used as an independent cross-check of the vector method). */
  function closedForm(latDeg, lonDeg, satLonDeg) {
    var phi = latDeg * D2R, dl = norm180(satLonDeg - lonDeg) * D2R;
    var cg = Math.cos(phi) * Math.cos(dl), sg = Math.sqrt(1 - cg * cg), rr = A / R_GEO;
    var el = Math.atan2(cg - rr, sg) * R2D;
    var Aa = Math.atan(Math.tan(Math.abs(dl)) / Math.sin(Math.abs(phi))) * R2D, az;
    if (latDeg >= 0) az = dl >= 0 ? 180 - Aa : 180 + Aa; else az = dl >= 0 ? Aa : 360 - Aa;
    var skew = Math.atan(Math.sin(dl) / Math.tan(phi)) * R2D;       // magnitude; sign convention differs between sources
    return { az: az, el: el, skewAbs: Math.abs(skew) };
  }

  /* Drift check: operator-entered measured azimuth vs computed azimuth (shortest signed angle). */
  function azDeviation(measuredDeg, computedDeg) { return norm180(measuredDeg - computedDeg); }
  var DRIFT_LIMIT_DEG = 0.5;
  function driftCheck(measuredDeg, computedDeg, limit) {
    var dev = azDeviation(measuredDeg, computedDeg), lim = limit == null ? DRIFT_LIMIT_DEG : limit;
    return { deviation: dev, abs: Math.abs(dev), limit: lim, exceeded: Math.abs(dev) > lim };
  }

  function lonLabel(lon) { var a = Math.abs(lon); return lon === 0 ? '0°' : (Number.isInteger(a) ? String(a) : a.toFixed(1)) + '°' + (lon > 0 ? 'E' : 'W'); }
  function compass(az) { var n = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']; return n[Math.round(norm360(az) / 22.5) % 16]; }

  return { STATION: STATION, SAT_LONS: SAT_LONS, lookAngles: lookAngles, closedForm: closedForm, azDeviation: azDeviation, driftCheck: driftCheck,
    DRIFT_LIMIT_DEG: DRIFT_LIMIT_DEG, lonLabel: lonLabel, compass: compass, norm360: norm360, norm180: norm180, R_GEO: R_GEO };
});

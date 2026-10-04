/* Shared Leaflet map (2D + 3D). Vendored Leaflet, no CDN.
   One base layer at a time, current view only (keepBuffer 1, no prefetch of the other layer or of extra zoom levels).
   EXAMPLE pins, robots and alerts are simulated. The host fills LIVE weather and computed look-angles. */
(function () {
  'use strict';
  var CENTER = [18.0735, -15.9582];
  var OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var OSM_ATTR = '© OpenStreetMap contributors';
  var ESRI_ATTR = 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';
  var POINTS = [
    { id: 'gs', lat: 18.0862, lon: -15.9724, kind: 'station' },
    { id: 'wh', lat: 18.0614, lon: -15.9348, kind: 'site' },
    { id: 'ex1', lat: 18.1048, lon: -15.9486, kind: 'site' },
    { id: 'ex2', lat: 18.0496, lon: -15.9892, kind: 'site' }
  ];
  var ROUTES = {
    'R-01': { route: ['gs', 'ex1', 'wh', 'ex2'], period: 46 },
    'R-02': { route: ['wh', 'ex2', 'gs', 'ex1'], period: 58 }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pointById(id) {
    for (var i = 0; i < POINTS.length; i++) if (POINTS[i].id === id) return POINTS[i];
    return null;
  }
  function satLon() {
    var v = NaN;
    try { v = parseFloat(localStorage.getItem('aicore-robots-sat')); } catch (e) { /* ignore */ }
    return (window.GEO && GEO.SAT_LONS.indexOf(v) >= 0) ? v : (window.GEO ? GEO.SAT_EXAMPLE_LON : 26);
  }

  /* LIVE weather chip + computed look-angles for one example point. */
  function liveHtml(h) {
    var t = h.t, e = h.esc || esc, ltr = h.ltr || function (s) { return s; };
    var wx = window.WX && WX.get('nkc');
    var wxHtml;
    if (wx && wx.ok) {
      wxHtml = '<p class="mv-live"><span class="live-badge"><i></i>LIVE / حي</span> <b>' + e(t('lv_wx_site_nkc')) + '</b> ' +
        ltr(WX.f1(wx.v.temp) + ' °C') + ' · ' + e(t('lv_wx_wind')) + ' ' + ltr(WX.f0(wx.v.wind) + ' km/h') + '</p>' +
        '<p class="tiny muted">' + e(t('map_wx_note')) + '</p>';
    } else {
      wxHtml = '<p class="mv-live"><span class="na-badge">' + e(t(wx && wx.status === 'loading' ? 'lv_wx_loading' : 'lv_wx_unavail')) + '</span></p>' +
        '<p class="tiny muted">' + e(t('map_wx_note')) + '</p>';
    }
    var ptHtml = '';
    if (window.GEO) {
      var lon = satLon();
      var p = GEO.lookAngles(h.lat, h.lon, lon);
      var label = GEO.lonLabel(lon) + (GEO.SAT_EXAMPLES[lon] === 'badr8' ? ' — ' + t('name_badr') : '');
      ptHtml = '<p class="mv-live"><span class="live-badge"><i></i>LIVE / حي</span> <b>' + e(t('lv_bar_dish')) + '</b> ' + ltr(label) + '</p>';
      if (p.visible) {
        function cell(k, val) {
          return '<div><dt>' + e(t(k)) + '</dt><dd>' + ltr(val) + '</dd></div>';
        }
        ptHtml += '<dl class="pt-grid">' +
          cell('lv_pt_az', p.az.toFixed(1) + '°') +
          cell('lv_pt_el', p.el.toFixed(1) + '°') +
          cell('lv_pt_skew', p.skew.toFixed(1) + '°') +
          cell('lv_pt_range', Math.round(p.range) + ' km') + '</dl>';
      } else ptHtml += '<p class="small">' + e(t('map_pt_below')) + '</p>';
      ptHtml += '<p class="tiny muted">' + e(t('map_pt_note')) + '</p>';
    }
    return '<h3 class="mv-h3">' + e(t('map_wx_h')) + '</h3>' + wxHtml +
      '<h3 class="mv-h3">' + e(t('map_pt_h')) + '</h3>' + ptHtml +
      '<p class="tiny muted mv-disc">' + e(t('geo_note')) + '</p>';
  }

  function create(opts) {
    opts = opts || {};
    var el = typeof opts.el === 'string' ? document.querySelector(opts.el) : opts.el;
    var map = null, base = null, mode = 'osm', markers = {}, robots = {}, alerts = {}, line = null;
    var raf = 0, running = false, fails = 0, failTimer = 0, selected = 'gs';
    var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    function t(k) { return opts.t ? opts.t(k) : k; }
    function failNode() {
      if (!opts.failEl) return null;
      return typeof opts.failEl === 'string' ? document.querySelector(opts.failEl) : opts.failEl;
    }
    function showFail(on) {
      var node = failNode(); if (!node) return;
      node.hidden = !on;
      if (on) node.textContent = t('map_fail');
    }
    function tileOpts(attr) {
      return {
        maxZoom: 19,
        attribution: attr,
        keepBuffer: 1,
        updateWhenIdle: true,
        updateWhenZooming: false,
        detectRetina: false
      };
    }
    function watch(layer) {
      layer.on('tileerror', function () {
        fails++;
        clearTimeout(failTimer);
        failTimer = setTimeout(function () {
          if (fails >= 2 || (navigator && navigator.onLine === false)) showFail(true);
        }, 900);
      });
      layer.on('tileload', function () {
        fails = 0;
        clearTimeout(failTimer);
        showFail(false);
      });
    }
    function setBase(which) {
      if (!map || !window.L) return mode;
      mode = which === 'sat' ? 'sat' : 'osm';
      if (base) { map.removeLayer(base); base.off(); base = null; }
      base = L.tileLayer(mode === 'sat' ? ESRI : OSM, tileOpts(mode === 'sat' ? ESRI_ATTR : OSM_ATTR));
      watch(base);
      base.addTo(map);
      if (opts.onBase) opts.onBase(mode);
      return mode;
    }
    function shortPt(id) {
      var s = t('map_pin_' + id);
      return s === 'map_pin_' + id ? id : s;
    }
    function markHtml(cls, text) {
      return '<div class="mv-mark ' + cls + '"><span class="mv-name">' + esc(text) + '</span><i class="mv-pip"></i></div>';
    }
    function markIcon(cls, text, anchor) {
      return L.divIcon({ className: 'mv-icon', html: markHtml(cls, text), iconSize: [16, 16], iconAnchor: anchor || [8, 8] });
    }
    function applySel() {
      Object.keys(markers).forEach(function (k) {
        var node = markers[k].getElement();
        if (node) node.classList.toggle('is-sel', k === selected);
      });
    }
    function select(id, fromUser) {
      if (!pointById(id)) id = 'gs';
      selected = id;
      applySel();
      if (opts.onSelect) opts.onSelect(id, !!fromUser);
      if (fromUser) nudgeSelected();
      layoutLabels();
    }
    function addMarkers() {
      POINTS.forEach(function (p) {
        var m = L.marker([p.lat, p.lon], { icon: markIcon(p.kind === 'station' ? 'is-station' : 'is-site', shortPt(p.id)), keyboard: true, title: 'EXAMPLE — ' + t('map_pt_' + p.id), alt: 'EXAMPLE' });
        m.on('click', function () { select(p.id, true); });
        m.addTo(map);
        markers[p.id] = m;
      });
      var ring = POINTS.map(function (p) { return [p.lat, p.lon]; });
      ring.push(ring[0]);
      line = L.polyline(ring, { color: '#22d3ee', weight: 2, opacity: 0.8, dashArray: '7 9', interactive: false }).addTo(map);
    }
    function ensureRobots() {
      ['R-01', 'R-02'].forEach(function (id) {
        if (robots[id]) return;
        var m = L.marker(CENTER, { icon: markIcon('is-bot ' + (id === 'R-02' ? 'is-r2' : 'is-r1'), id), keyboard: true, zIndexOffset: 400, title: id + ' SIMULATION', alt: id });
        m.on('click', function () { select(nextStop(id), true); });
        m.addTo(map);
        robots[id] = m;
      });
    }
    function phase(spec) {
      if (reduced) return 0.37;
      return ((Date.now() / 1000) % spec.period) / spec.period;
    }
    function nextStop(id) {
      var spec = ROUTES[id]; if (!spec) return 'gs';
      var n = spec.route.length, i = Math.floor(phase(spec) * n) % n;
      return spec.route[(i + 1) % n];
    }
    function coord(spec) {
      var n = spec.route.length, x = phase(spec) * n, i = Math.floor(x) % n, f = x - Math.floor(x);
      var a = pointById(spec.route[i]), b = pointById(spec.route[(i + 1) % n]);
      return [a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f];
    }
    function frame() {
      if (!running || !map) return;
      Object.keys(ROUTES).forEach(function (id) {
        if (robots[id]) robots[id].setLatLng(coord(ROUTES[id]));
      });
      layoutLabels();
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    function labelBox(pt, text, below) {
      var w = Math.max(26, String(text).length * 7.2 + 14);
      var h = 18;
      return { x: pt.x - w / 2, y: below ? pt.y + 14 : pt.y - 14 - h, w: w, h: h };
    }
    function boxesHit(a, b) {
      return a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;
    }
    function obstacleBoxes() {
      var root = map.getContainer().getBoundingClientRect();
      var out = [];
      var nodes = map.getContainer().querySelectorAll('.leaflet-control, .mv-layer, .mv-back, .mv-fail, .mv-dock, .mv-sheet');
      Array.prototype.forEach.call(nodes, function (node) {
        if (node.classList && node.classList.contains('leaflet-marker-icon')) return;
        var st = window.getComputedStyle(node);
        if (st.display === 'none' || st.visibility === 'hidden' || node.hidden) return;
        var r = node.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        out.push({ x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height });
      });
      ['.map-detail', '.sim-badge', '#m-sheet', '#m-dock'].forEach(function (sel) {
        var node = document.querySelector(sel);
        if (!node || (node.closest && node.closest('.leaflet-container'))) return;
        var st = window.getComputedStyle(node);
        if (st.display === 'none' || st.visibility === 'hidden' || node.hidden) return;
        var r = node.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (r.right < root.left || r.left > root.right || r.bottom < root.top || r.top > root.bottom) return;
        out.push({ x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height });
      });
      return out;
    }
    function layoutLabels() {
      if (!map) return;
      var z = map.getZoom();
      var blocked = obstacleBoxes();
      var placed = blocked.slice();
      var list = [];
      POINTS.forEach(function (p) {
        if (markers[p.id]) list.push({ marker: markers[p.id], id: p.id, text: shortPt(p.id), kind: 'site', pri: p.id === selected ? 3 : 1, below: false });
      });
      ['R-01', 'R-02'].forEach(function (id, i) {
        if (robots[id]) list.push({ marker: robots[id], id: id, text: id, kind: 'bot', pri: 2, below: i === 1 });
      });
      Object.keys(alerts).forEach(function (id) {
        if (alerts[id]) list.push({ marker: alerts[id], id: 'al-' + id, text: '', kind: 'alert', pri: 0, below: false });
      });
      list.sort(function (a, b) { return b.pri - a.pri; });
      list.forEach(function (it) {
        var el = it.marker.getElement(); if (!el) return;
        var name = el.querySelector('.mv-name'); if (!name) return;
        var show = !!it.text && (it.pri >= 3 || it.kind === 'bot' || (it.kind === 'site' && z >= 15));
        if (!show) { name.hidden = true; return; }
        var pt = map.latLngToContainerPoint(it.marker.getLatLng());
        var box = labelBox(pt, it.text, it.below);
        var flip = labelBox(pt, it.text, !it.below);
        var clear = function (b) { return !placed.some(function (o) { return boxesHit(b, o); }); };
        if (!clear(box) && clear(flip)) { box = flip; it.below = !it.below; }
        else if (!clear(box)) { name.hidden = true; return; }
        name.hidden = false;
        name.classList.toggle('is-below', !!it.below);
        placed.push(box);
      });
    }
    function nudgeSelected() {
      if (!map || !window.matchMedia('(max-width: 640px)').matches) return;
      var p = pointById(selected); if (!p) return;
      var pt = map.latLngToContainerPoint([p.lat, p.lon]);
      var target = map.getSize().y * 0.28;
      if (Math.abs(pt.y - target) > 6) map.panBy([0, pt.y - target], { animate: false });
      layoutLabels();
    }
    function redrawLabels() {
      if (!map) return;
      POINTS.forEach(function (p) {
        if (!markers[p.id]) return;
        markers[p.id].setIcon(markIcon(p.kind === 'station' ? 'is-station' : 'is-site', shortPt(p.id)));
      });
      ['R-01', 'R-02'].forEach(function (id) {
        if (robots[id]) robots[id].setIcon(markIcon('is-bot ' + (id === 'R-02' ? 'is-r2' : 'is-r1'), id));
      });
      applySel();
      Object.keys(alerts).forEach(function (id) {
        alerts[id].setIcon(alertIcon());
      });
      var node = failNode();
      if (node && !node.hidden) node.textContent = t('map_fail');
      layoutLabels();
    }
    function alertIcon() {
      return markIcon('is-alert', '', [-4, 8]);
    }
    function setAlertPoints(ids) {
      if (!map) return;
      var want = {};
      (ids || []).forEach(function (id) { if (pointById(id)) want[id] = true; });
      Object.keys(alerts).forEach(function (id) {
        if (!want[id]) { map.removeLayer(alerts[id]); delete alerts[id]; }
      });
      Object.keys(want).forEach(function (id) {
        if (alerts[id]) return;
        var p = pointById(id);
        var m = L.marker([p.lat, p.lon], { icon: alertIcon(), keyboard: true, zIndexOffset: 280, title: t('map_alert') + ' SIMULATION' });
        m.on('click', function () { select(id, true); });
        m.addTo(map);
        alerts[id] = m;
      });
      layoutLabels();
    }
    function init() {
      if (map || !el || !window.L) return false;
      var link = document.querySelector('link[data-leaflet]');
      if (link && L.Icon && L.Icon.Default) {
        try { L.Icon.Default.imagePath = link.href.replace(/leaflet\.css(?:\?.*)?$/, 'images'); } catch (e) { /* ignore */ }
      }
      var z = window.matchMedia('(max-width: 640px)').matches ? 12 : 13;
      map = L.map(el, {
        center: CENTER,
        zoom: z,
        minZoom: 12,
        maxZoom: 19,
        maxBounds: L.latLngBounds([17.90, -16.22], [18.26, -15.72]),
        maxBoundsViscosity: 0.85,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true
      });
      if (map.attributionControl) {
        map.attributionControl.setPrefix('Leaflet');
        map.attributionControl.setPosition('topleft');
      }
      if (el.getAttribute) el.setAttribute('aria-label', t('map_aria'));
      setBase('osm');
      addMarkers();
      ensureRobots();
      if (navigator && navigator.onLine === false) showFail(true);
      window.addEventListener('offline', function () { showFail(true); });
      map.on('zoomend moveend', layoutLabels);
      select(selected, false);
      return true;
    }
    function start() {
      if (!map) init();
      if (!map) return;
      running = true;
      cancelAnimationFrame(raf);
      if (reduced) frame();
      else raf = requestAnimationFrame(frame);
      setTimeout(function () { if (map) map.invalidateSize(); }, 50);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    return {
      init: init,
      start: start,
      stop: stop,
      invalidate: function () { if (map) map.invalidateSize(); },
      setBase: setBase,
      toggleBase: function () { return setBase(mode === 'osm' ? 'sat' : 'osm'); },
      mode: function () { return mode; },
      select: function (id) { select(id, false); },
      selected: function () { return selected; },
      point: pointById,
      setAlertPoints: setAlertPoints,
      redrawLabels: redrawLabels,
      nudge: nudgeSelected
    };
  }

  window.MapView = { create: create, liveHtml: liveHtml, CENTER: CENTER, POINTS: POINTS, point: pointById };
})();

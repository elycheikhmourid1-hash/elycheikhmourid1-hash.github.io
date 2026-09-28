/* AICore Mawʿid — fiber-optic header glow + page constellation (aicoredigital.com look).
 * Canvas strands + travelling pulses in the header; a sparse drifting node network behind the page. No libraries.
 * DPR capped at 2, ~30 fps, paused while the tab is hidden.
 * prefers-reduced-motion: one static frame, no loop. */
(function () {
  'use strict';

  var DPR_CAP = 2;
  var FRAME_MS = 1000 / 30;
  var SAMPLES = 48;

  /* Unit-space cubic curves. Hero band is richer; the dashboard bar is slimmer. */
  var HERO = [
    { a: [-0.06, 0.78], c1: [0.22, 0.18], c2: [0.58, 1.02], b: [1.08, 0.30], colors: ['#a855f7', '#22d3ee'], w: 1.7, speed: 0.11, phase: 0.04 },
    { a: [-0.05, 0.40], c1: [0.30, 0.92], c2: [0.64, 0.04], b: [1.06, 0.68], colors: ['#67e8f9', '#c026d3'], w: 1.35, speed: 0.15, phase: 0.42 },
    { a: [1.06, 0.16], c1: [0.72, 0.58], c2: [0.28, -0.02], b: [-0.08, 0.56], colors: ['#8b5cf6', '#06b6d4'], w: 1.2, speed: 0.09, phase: 0.22 },
    { a: [-0.10, 0.94], c1: [0.34, 0.38], c2: [0.72, 0.86], b: [1.10, 0.46], colors: ['#d946ef', '#67e8f9'], w: 1.5, speed: 0.13, phase: 0.70 },
    { a: [0.12, -0.06], c1: [0.22, 0.48], c2: [0.74, 0.32], b: [0.96, 1.06], colors: ['#22d3ee', '#a855f7'], w: 1.05, speed: 0.17, phase: 0.55 },
    { a: [-0.02, 0.14], c1: [0.40, 0.36], c2: [0.62, 0.78], b: [1.04, 0.90], colors: ['#c084fc', '#22d3ee'], w: 1.15, speed: 0.12, phase: 0.86 }
  ];
  var SLIM = [
    { a: [-0.06, 0.68], c1: [0.28, 0.12], c2: [0.66, 0.92], b: [1.06, 0.32], colors: ['#a855f7', '#22d3ee'], w: 1.2, speed: 0.12, phase: 0.10 },
    { a: [-0.04, 0.28], c1: [0.36, 0.86], c2: [0.70, 0.08], b: [1.05, 0.62], colors: ['#67e8f9', '#c026d3'], w: 1.0, speed: 0.16, phase: 0.48 },
    { a: [1.05, 0.22], c1: [0.62, 0.74], c2: [0.24, 0.16], b: [-0.06, 0.72], colors: ['#8b5cf6', '#06b6d4'], w: 0.95, speed: 0.10, phase: 0.74 },
    { a: [-0.08, 0.48], c1: [0.38, 0.18], c2: [0.68, 0.82], b: [1.08, 0.42], colors: ['#d946ef', '#67e8f9'], w: 0.85, speed: 0.14, phase: 0.30 }
  ];

  function cubic(p0, p1, p2, p3, n) {
    var pts = new Array(n + 1);
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      var uu = u * u, tt = t * t;
      pts[i] = {
        x: uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + tt * t * p3[0],
        y: uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + tt * t * p3[1]
      };
    }
    return pts;
  }

  function strandsFrom(spec) {
    return spec.map(function (c) {
      return {
        pts: cubic(c.a, c.c1, c.c2, c.b, SAMPLES),
        colors: c.colors,
        w: c.w,
        speed: c.speed,
        phase: c.phase
      };
    });
  }

  var heroStrands = strandsFrom(HERO);
  var slimStrands = strandsFrom(SLIM);

  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = !!(reducedQuery && reducedQuery.matches);
  var instances = [];
  var raf = 0;
  var running = false;
  var lastTs = 0;
  var scanning = false;

  function isSlim(header) {
    return !!(header.parentElement && header.parentElement.classList.contains('app'));
  }

  function pointAt(pts, t) {
    var x = ((t % 1) + 1) % 1;
    var f = x * (pts.length - 1);
    var i = f | 0;
    var g = f - i;
    var a = pts[i];
    var b = pts[i + 1] || a;
    return { x: a.x + (b.x - a.x) * g, y: a.y + (b.y - a.y) * g };
  }

  function resize(inst) {
    var rect = inst.header.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    if (inst.w === w && inst.h === h && inst.dpr === dpr) return;
    inst.w = w;
    inst.h = h;
    inst.dpr = dpr;
    inst.canvas.width = Math.round(w * dpr);
    inst.canvas.height = Math.round(h * dpr);
    inst.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function strokeStrand(ctx, pts, w, h, style, width) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x * w, pts[0].y * h);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * w, pts[i].y * h);
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawPulse(ctx, x, y, color, radius) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#fbf7ff';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.4, radius * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function draw(inst, time) {
    var ctx = inst.ctx;
    var w = inst.w;
    var h = inst.h;
    if (!ctx || w < 2 || h < 2) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var strands = inst.slim ? slimStrands : heroStrands;
    var pulseR = inst.slim ? 7 : 11;
    for (var s = 0; s < strands.length; s++) {
      var strand = strands[s];
      var pts = strand.pts;
      var g = ctx.createLinearGradient(pts[0].x * w, pts[0].y * h, pts[pts.length - 1].x * w, pts[pts.length - 1].y * h);
      g.addColorStop(0, strand.colors[0]);
      g.addColorStop(1, strand.colors[1]);
      ctx.globalAlpha = inst.slim ? 0.12 : 0.16;
      strokeStrand(ctx, pts, w, h, g, strand.w * (inst.slim ? 4.2 : 5.4));
      ctx.globalAlpha = inst.slim ? 0.5 : 0.62;
      strokeStrand(ctx, pts, w, h, g, strand.w);
      ctx.globalAlpha = inst.slim ? 0.35 : 0.5;
      strokeStrand(ctx, pts, w, h, 'rgba(245, 236, 255, .9)', Math.max(0.6, strand.w * 0.28));
      ctx.globalAlpha = 1;
      var travel = reduced ? strand.phase : strand.phase + time * strand.speed;
      for (var p = 0; p < 2; p++) {
        var at = pointAt(pts, travel + p * 0.5);
        drawPulse(ctx, at.x * w, at.y * h, strand.colors[p], pulseR);
      }
    }
  }


  /* ---------- page constellation (thin glowing network lines, like aicoredigital.com) ---------- */
  var net = { canvas: null, ctx: null, nodes: [], w: 0, h: 0, dpr: 1 };
  var NET_LINK = 120;
  function netResize() {
    if (!net.canvas) return;
    var w = window.innerWidth, h = window.innerHeight, dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    if (w === net.w && h === net.h && dpr === net.dpr) return;
    var keep = net.nodes.length && w === net.w; // mobile URL bar show/hide: keep the nodes, no jump
    net.w = w; net.h = h; net.dpr = dpr;
    net.canvas.width = Math.round(w * dpr); net.canvas.height = Math.round(h * dpr);
    net.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (keep) return;
    var target = Math.max(14, Math.min(46, Math.floor(w * h / 17000)));
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    net.nodes = [];
    for (var i = 0; i < target; i++) net.nodes.push({ x: rnd() * w, y: rnd() * h, vx: (rnd() - 0.5) * 0.16, vy: (rnd() - 0.5) * 0.16, c: rnd() < 0.3 });
  }
  function netDraw(step) {
    var c = net.ctx, w = net.w, h = net.h, n = net.nodes;
    if (!c) return;
    c.clearRect(0, 0, w, h);
    for (var i = 0; i < n.length; i++) {
      var a = n[i];
      if (step) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < -10) a.x = w + 10; if (a.x > w + 10) a.x = -10;
        if (a.y < -10) a.y = h + 10; if (a.y > h + 10) a.y = -10;
      }
    }
    c.lineWidth = 1;
    for (var p = 0; p < n.length; p++) {
      for (var q = p + 1; q < n.length; q++) {
        var dx = n[p].x - n[q].x, dy = n[p].y - n[q].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < NET_LINK) {
          var al = (1 - d / NET_LINK) * 0.34;
          c.strokeStyle = (n[p].c || n[q].c) ? 'rgba(34, 211, 238, ' + al.toFixed(3) + ')' : 'rgba(150, 110, 235, ' + al.toFixed(3) + ')';
          c.beginPath(); c.moveTo(n[p].x, n[p].y); c.lineTo(n[q].x, n[q].y); c.stroke();
        }
      }
    }
    for (var k = 0; k < n.length; k++) {
      c.beginPath(); c.arc(n[k].x, n[k].y, n[k].c ? 1.7 : 1.4, 0, Math.PI * 2);
      c.fillStyle = n[k].c ? 'rgba(103, 232, 249, .8)' : 'rgba(168, 85, 247, .75)'; c.fill();
    }
  }
  function netMount() {
    if (net.canvas || !document.body || document.body.classList.contains('page-share')) return;
    net.canvas = document.createElement('canvas');
    net.canvas.className = 'netbg';
    net.canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(net.canvas, document.body.firstChild);
    net.ctx = net.canvas.getContext('2d', { alpha: true });
    netResize(); netDraw(false);
  }

  function onScreen(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return r.bottom > 0 && r.top < vh;
  }

  function tick(ts) {
    if (!running) return;
    if (document.hidden) { running = false; return; }
    if (lastTs && ts - lastTs < FRAME_MS) {
      raf = requestAnimationFrame(tick);
      return;
    }
    lastTs = ts;
    var time = ts / 1000;
    var live = false;
    if (net.ctx) { netDraw(true); live = true; }
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (!inst.canvas.isConnected) continue;
      if (!onScreen(inst.header)) continue;
      live = true;
      draw(inst, time);
    }
    if (!live) { running = false; return; }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (reduced || running || document.hidden || (!instances.length && !net.ctx)) return;
    running = true;
    lastTs = 0;
    raf = requestAnimationFrame(tick);
  }

  function paintStill() {
    netResize(); netDraw(false);
    for (var i = 0; i < instances.length; i++) {
      resize(instances[i]);
      draw(instances[i], 0);
    }
  }

  function mount(header) {
    if (header.querySelector('canvas.fiber')) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'fiber';
    canvas.setAttribute('aria-hidden', 'true');
    header.insertBefore(canvas, header.firstChild);
    var inst = {
      header: header,
      canvas: canvas,
      ctx: canvas.getContext('2d', { alpha: true }),
      slim: isSlim(header),
      w: 0,
      h: 0,
      dpr: 0,
      ro: null
    };
    instances.push(inst);
    resize(inst);
    if (window.ResizeObserver) {
      inst.ro = new ResizeObserver(function () {
        resize(inst);
        if (reduced) draw(inst, 0);
      });
      inst.ro.observe(header);
    }
    if (reduced) draw(inst, 0);
  }

  function prune() {
    var next = [];
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (inst.canvas.isConnected) next.push(inst);
      else if (inst.ro) inst.ro.disconnect();
    }
    instances = next;
  }

  function scan() {
    if (scanning) return;
    scanning = true;
    try {
      var bars = document.querySelectorAll('.appbar');
      for (var i = 0; i < bars.length; i++) mount(bars[i]);
      prune();
      if (reduced) paintStill();
      else start();
    } finally {
      scanning = false;
    }
  }

  function boot() {
    if (!document.body) return;
    netMount();
    scan();
    if (window.MutationObserver) {
      var mo = new MutationObserver(scan);
      mo.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('resize', function () {
      netResize();
      if (reduced) paintStill();
      else start();
    });
    window.addEventListener('scroll', function () {
      if (!reduced && !document.hidden) start();
    }, { passive: true, capture: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduced) start();
    });
    if (reducedQuery && reducedQuery.addEventListener) {
      reducedQuery.addEventListener('change', function () {
        reduced = !!reducedQuery.matches;
        if (reduced) {
          running = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          paintStill();
        } else start();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

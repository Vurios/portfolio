/* Kim De Guzman — portfolio
   Kuro, the black pixel cat that lives inside the content column.

   Original artwork: a procedural pixel rig drawn on a low-resolution canvas
   and scaled with nearest-neighbour sampling, so every pose is code rather
   than a sprite sheet. Pupils are a separate layer drawn over the body pose.
   The waypoint/idle timing follows the oneko.js pattern (adryd325, MIT); the
   rig-plus-pose structure is in the spirit of rio-desktop-pet (MIT).
   No dependencies. The page works without it. */
(function () {
  "use strict";

  var host = document.querySelector(".content");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var small = window.innerWidth < 1024;
  var canDrag = !coarse && !small && !reduceMotion;

  // Logical pixel grid and on-screen scale
  var W = 48;
  var H = 58;
  var SCALE = small ? 1.25 : 2;
  var CX = 24; // horizontal centre
  var BY = 55; // baseline: where the paws touch the floor

  /* ============================================================ RIG ==== */
  function ink() {
    return "#0a0a0a";
  }
  function light() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "#ffffff" : "#f4f4f5";
  }

  function ell(c, cx, cy, rx, ry) {
    var x0 = Math.ceil(-rx), x1 = Math.floor(rx), y0 = Math.ceil(-ry), y1 = Math.floor(ry);
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) c.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
      }
    }
  }
  // Scanline-filled triangle: hard pixels, no anti-aliasing
  function tri(c, ax, ay, bx, by, qx, qy) {
    var pts = [[ax, ay], [bx, by], [qx, qy]];
    var yMin = Math.ceil(Math.min(ay, by, qy)), yMax = Math.floor(Math.max(ay, by, qy));
    for (var y = yMin; y <= yMax; y++) {
      var xs = [];
      for (var i = 0; i < 3; i++) {
        var p0 = pts[i], p1 = pts[(i + 1) % 3];
        if ((y >= p0[1] && y < p1[1]) || (y >= p1[1] && y < p0[1])) {
          xs.push(p0[0] + ((y - p0[1]) * (p1[0] - p0[0])) / (p1[1] - p0[1]));
        }
      }
      if (xs.length < 2) continue;
      var x0 = Math.ceil(Math.min(xs[0], xs[1])), x1 = Math.floor(Math.max(xs[0], xs[1]));
      if (x1 >= x0) c.fillRect(x0, y, x1 - x0 + 1, 1);
    }
  }
  function cap(c, x0, y0, x1, y1, r) {
    var dx = x1 - x0, dy = y1 - y0;
    var steps = Math.ceil(Math.hypot(dx, dy)) + 1;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      ell(c, x0 + dx * t, y0 + dy * t, r, r);
    }
  }
  function px(c, x, y) {
    c.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function defaultPose() {
    return {
      facing: 1,
      bob: 0,
      headUp: 0, // + lifts the head, - lowers it (groom)
      ear: 0, // + perks, - flattens (startle, held)
      step: 0, // walk amount
      legPhase: 0,
      tail: 0, // sway -1..1
      dangle: 0, // paws hang (held / falling)
      paw: 0, // right front paw raised 0..1
      pawSwing: 0, // wave/lick offset
      closed: 0, // eyes closed
      happy: 0, // ^ ^ eyes
      wide: 0, // startled eyes
      pupilX: 0,
      pupilY: 0,
      sx: 1,
      sy: 1,
      tilt: 0,
      lift: 0
    };
  }

  // Body silhouette, relative to the paws at (0,0), y negative upward.
  function drawSilhouette(c, p) {
    c.fillStyle = "#000";
    var bob = p.bob;
    ell(c, 0, -10 + bob, 9.5, 8.5); // body
    var liftA = p.step * 1.6;
    var lf = Math.max(0, Math.sin(p.legPhase * Math.PI * 2)) * liftA;
    var rf = Math.max(0, Math.sin(p.legPhase * Math.PI * 2 + Math.PI)) * liftA;
    var dangle = p.dangle * 3;
    ell(c, -5.5, -1.5 - lf + dangle, 3.5, 2); // left paw
    if (p.paw < 0.05) {
      ell(c, 5.5, -1.5 - rf + dangle, 3.5, 2); // right paw down
    } else {
      // right paw raised: a short arm up beside the head
      var ax = 7, ay = -8 + bob;
      var tipX = 11 + p.pawSwing, tipY = -20 * p.paw - 6 + bob + Math.abs(p.pawSwing) * 0.3;
      cap(c, ax, ay, tipX, tipY, 2.6);
      ell(c, tipX, tipY, 3, 2.4);
    }
    // tail
    var wag = p.tail;
    var tx = 9, ty = -9 + bob;
    var pts = [
      [tx, ty],
      [tx + 5, ty - 1 + wag * 0.5],
      [tx + 8, ty - 6 + wag * 1.5],
      [tx + 6, ty - 11 + wag * 2.5],
      [tx + 2, ty - 12 + wag * 3]
    ];
    for (var i = 0; i < pts.length - 1; i++) cap(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2);
    // head
    var hy = -27 + bob - p.headUp;
    ell(c, 0, hy, 12, 11);
    // ears
    var e = p.ear;
    tri(c, -10, hy - 4, -12 - e * 0.5, hy - 14 - e, -3, hy - 10);
    ell(c, -11.5 - e * 0.5, hy - 13 - e, 1.4, 1.4);
    tri(c, 10, hy - 4, 12 + e * 0.5, hy - 14 - e, 3, hy - 10);
    ell(c, 11.5 + e * 0.5, hy - 13 - e, 1.4, 1.4);
  }

  // Face without pupils: eye whites, mouth, whiskers
  function drawFace(c, p) {
    var hy = -27 + p.bob - p.headUp;
    var L = light();
    var ex = 5, ey = hy + 1;
    c.fillStyle = L;
    if (p.closed > 0.5) {
      for (var s = -1; s <= 1; s += 2) {
        px(c, s * ex - 2, ey + 1);
        px(c, s * ex - 1, ey + 2);
        px(c, s * ex, ey + 2);
        px(c, s * ex + 1, ey + 2);
        px(c, s * ex + 2, ey + 1);
      }
    } else if (p.happy > 0.5) {
      for (var h = -1; h <= 1; h += 2) {
        px(c, h * ex - 2, ey + 1);
        px(c, h * ex - 1, ey);
        px(c, h * ex, ey - 1);
        px(c, h * ex + 1, ey);
        px(c, h * ex + 2, ey + 1);
      }
    } else {
      var r = p.wide > 0.5 ? 1.25 : 1;
      ell(c, -ex, ey, 2.6 * r, 3.2 * r);
      ell(c, ex, ey, 2.6 * r, 3.2 * r);
    }
    // mouth
    px(c, -2, hy + 6);
    px(c, -1, hy + 7);
    px(c, 0, hy + 6);
    px(c, 1, hy + 7);
    px(c, 2, hy + 6);
    // whiskers
    for (var w = 0; w < 2; w++) {
      var yy = hy + 3 + w * 3;
      for (var k = 0; k < 4; k++) {
        px(c, -12 - k, yy + (w ? k * 0.4 : -k * 0.4));
        px(c, 12 + k, yy + (w ? k * 0.4 : -k * 0.4));
      }
    }
  }

  // Pupils: their own layer over the body pose
  function drawPupils(c, p) {
    if (p.closed > 0.5 || p.happy > 0.5) return;
    var hy = -27 + p.bob - p.headUp;
    var ex = 5, ey = hy + 1;
    var ox = Math.max(-1.3, Math.min(1.3, p.pupilX));
    var oy = Math.max(-1.3, Math.min(1.3, p.pupilY));
    var r = p.wide > 0.5 ? 0.8 : 1;
    c.fillStyle = ink();
    ell(c, -ex + ox, ey + oy, 1.4 * r, 2 * r);
    ell(c, ex + ox, ey + oy, 1.4 * r, 2 * r);
    c.fillStyle = light();
    px(c, -ex + ox - 1, ey + oy - 1);
    px(c, ex + ox - 1, ey + oy - 1);
  }

  // Face-only crop for the favicon: head, ears, eyes, whiskers
  function drawFaceOnly(c, size) {
    var s = size / 32;
    c.setTransform(s, 0, 0, s, 16 * s, 19 * s);
    var p = defaultPose();
    var m = document.createElement("canvas");
    m.width = 32;
    m.height = 32;
    var mc = m.getContext("2d");
    mc.setTransform(1, 0, 0, 1, 16, 19);
    mc.fillStyle = "#000";
    ell(mc, 0, 0, 12, 11);
    tri(mc, -10, -4, -12, -14, -3, -10);
    ell(mc, -11.5, -13, 1.4, 1.4);
    tri(mc, 10, -4, 12, -14, 3, -10);
    ell(mc, 11.5, -13, 1.4, 1.4);
    var o = document.createElement("canvas");
    o.width = 32;
    o.height = 32;
    var oc = o.getContext("2d");
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (dx || dy) oc.drawImage(m, dx, dy);
    oc.globalCompositeOperation = "source-in";
    oc.fillStyle = "#ffffff";
    oc.fillRect(0, 0, 32, 32);
    c.setTransform(s, 0, 0, s, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(o, 0, 0);
    c.drawImage(m, 0, 0);
    c.setTransform(s, 0, 0, s, 16 * s, 19 * s);
    c.fillStyle = "#ffffff";
    ell(c, -5, 1, 2.6, 3.2);
    ell(c, 5, 1, 2.6, 3.2);
    c.fillStyle = "#0a0a0a";
    ell(c, -5, 1, 1.4, 2);
    ell(c, 5, 1, 1.4, 2);
    c.fillStyle = "#ffffff";
    px(c, -6, 0);
    px(c, 4, 0);
    px(c, -2, 6);
    px(c, -1, 7);
    px(c, 0, 6);
    px(c, 1, 7);
    px(c, 2, 6);
    void p;
  }

  /* ========================================================= CANVASES == */
  function buffer(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  var canvas = document.createElement("canvas");
  canvas.className = "kuro";
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width = W * SCALE + "px";
  canvas.style.height = H * SCALE + "px";
  canvas.setAttribute("aria-hidden", "true");
  var ctx = canvas.getContext("2d");
  var mask = buffer(W, H), mctx = mask.getContext("2d");
  var outline = buffer(W, H), octx = outline.getContext("2d");
  var face = buffer(W, H), fctx = face.getContext("2d");
  var pupilLayer = buffer(W, H), pctx = pupilLayer.getContext("2d");

  function renderPose(p, target) {
    var c = target || ctx;
    [mctx, octx, fctx, pctx].forEach(function (b) {
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.clearRect(0, 0, W, H);
    });
    function rig(b) {
      b.setTransform(p.facing, 0, 0, 1, CX, BY);
    }
    rig(mctx);
    drawSilhouette(mctx, p);
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (dx || dy) octx.drawImage(mask, dx, dy);
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = light();
    octx.fillRect(0, 0, W, H);
    octx.globalCompositeOperation = "source-over";
    rig(fctx);
    drawFace(fctx, p);
    rig(pctx);
    drawPupils(pctx, p);

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.imageSmoothingEnabled = false;
    c.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    c.translate(CX, BY - p.lift);
    c.rotate(p.tilt);
    c.scale(p.sx, p.sy);
    c.drawImage(outline, -CX, -BY);
    c.drawImage(mask, -CX, -BY);
    c.drawImage(face, -CX, -BY);
    c.drawImage(pupilLayer, -CX, -BY);
  }

  // Exposed for the reference-sheet renderer and the favicon export
  window.Kuro = { W: W, H: H, SCALE: SCALE, defaultPose: defaultPose, renderPose: renderPose, drawFaceOnly: drawFaceOnly };
  if (document.documentElement.hasAttribute("data-kuro-sheet")) return; // sheet page drives the rig itself
  if (!host) return;

  /* =========================================================== MOUNT ==== */
  host.appendChild(canvas);
  var bubble = document.createElement("div");
  bubble.className = "kuro-bubble";
  bubble.setAttribute("aria-hidden", "true");
  host.appendChild(bubble);

  var fx = buffer(W * SCALE, H * SCALE + 40); // hearts float above the head
  void fx;

  /* ========================================================== STATE ==== */
  var pose = defaultPose();
  var T = { step: 0, ear: 0, headUp: 0, paw: 0, dangle: 0, closed: 0, happy: 0, wide: 0 };
  var A = { step: 0, ear: 0, headUp: 0, paw: 0, dangle: 0, closed: 0, happy: 0, wide: 0 };
  var S = {
    state: "idle",
    x: 0, // paw centre, container px
    y: 0, // baseline, container px
    tx: 0,
    ty: 0,
    until: 0,
    idleSince: 0,
    walked: 0,
    blinkAt: 0,
    earAt: 0,
    cornerAt: 0,
    bubbleAt: 0,
    hoverMs: 0,
    petAt: 0,
    startleAt: 0,
    jumpV: 0,
    squash: { sx: 1, sy: 1, vx: 0, vy: 0 },
    shake: { flips: 0, sign: 0, at: 0 },
    wobbleUntil: 0,
    msg: 0,
    hearts: []
  };
  var pointer = { x: -1, y: -1, vx: 0, vy: 0, at: 0 };
  var grab = null;
  var SPEED = small ? 48 : 70;
  var halfW = (W * SCALE) / 2;
  var bodyH = 42 * SCALE;

  var MESSAGES = [
    "Hi, I'm Kuro!",
    "Welcome to Kim's portfolio!",
    "Feel free to look around!",
    "Check out the projects section!",
    "Nice to meet you :)",
    "Kim builds civic tech. I supervise.",
    "Drag me if you're bored!",
    "Scroll on, there's more below."
  ];

  function hostRect() {
    return host.getBoundingClientRect();
  }
  // The slice of the container the reader can see right now (container px)
  function visibleBox() {
    var r = hostRect();
    var top = Math.max(0, -r.top) + 8;
    var bottom = Math.min(r.height, window.innerHeight - r.top) - 8;
    return { x0: halfW + 4, x1: Math.max(halfW + 4, r.width - halfW - 4), y0: top + bodyH, y1: Math.max(top + bodyH, bottom) };
  }
  function placeCanvas() {
    canvas.style.transform = "translate(" + (S.x - halfW).toFixed(1) + "px, " + (S.y - BY * SCALE).toFixed(1) + "px)";
  }

  var TEXTY = "p, h1, h2, h3, h4, li, a, button, figcaption, span, label, input, textarea, .pill, .label, .meta";
  function coversText(x, y) {
    var r = hostRect();
    var pts = [
      [x, y - 8 * SCALE],
      [x, y - 28 * SCALE],
      [x - 10 * SCALE, y - 18 * SCALE],
      [x + 10 * SCALE, y - 18 * SCALE]
    ];
    for (var i = 0; i < pts.length; i++) {
      var els = document.elementsFromPoint(r.left + pts[i][0], r.top + pts[i][1]);
      for (var j = 0; j < els.length; j++) {
        if (els[j] === canvas || els[j] === bubble) continue;
        if (els[j].closest && els[j].closest(TEXTY)) return true;
        break;
      }
    }
    return false;
  }

  function pickWaypoint() {
    var b = visibleBox();
    var radius = small ? 150 : 280;
    for (var i = 0; i < 16; i++) {
      var x = Math.max(b.x0, Math.min(b.x1, S.x + (Math.random() * 2 - 1) * radius));
      var y = Math.max(b.y0, Math.min(b.y1, S.y + (Math.random() * 2 - 1) * radius));
      if (Math.hypot(x - S.x, y - S.y) < 50) continue;
      if (coversText(x, y)) continue;
      return { x: x, y: y };
    }
    return null;
  }
  function pickCorner() {
    var b = visibleBox();
    var corners = [
      [b.x0, b.y0],
      [b.x1, b.y0],
      [b.x0, b.y1],
      [b.x1, b.y1]
    ];
    corners.sort(function () {
      return Math.random() - 0.5;
    });
    for (var i = 0; i < corners.length; i++) if (!coversText(corners[i][0], corners[i][1])) return { x: corners[i][0], y: corners[i][1] };
    return null;
  }

  function resetTargets() {
    T.step = T.ear = T.headUp = T.paw = T.dangle = T.closed = T.happy = T.wide = 0;
  }
  function setState(st, ms) {
    S.state = st;
    S.until = performance.now() + (ms || 0);
    resetTargets();
    if (st === "walk") T.step = 1;
    if (st === "held") {
      T.dangle = 1;
      T.ear = -2;
    }
    if (st === "groom") {
      T.paw = 1;
      T.headUp = -3;
      T.closed = 1;
    }
    if (st === "curious") {
      T.ear = 2;
      T.headUp = 1.5;
    }
    if (st === "wave") T.paw = 1;
    if (st === "happy") {
      T.happy = 1;
      T.ear = 1.5;
    }
    if (st === "startle") {
      T.wide = 1;
      T.ear = -2.5;
    }
    if (st === "idle") S.idleSince = performance.now();
  }
  function startIdle(ms) {
    setState("idle", ms || 1600 + Math.random() * 3800);
  }
  function walkTo(pt, after) {
    S.tx = pt.x;
    S.ty = pt.y;
    S.after = after || "idle";
    pose.facing = pt.x >= S.x ? 1 : -1;
    setState("walk");
  }
  function kick(sx, sy) {
    S.squash.sx = sx;
    S.squash.sy = sy;
  }

  /* --------------------------------------------------------- bubble ---- */
  var bubbleUntil = 0;
  function say(text, ms) {
    bubble.textContent = text;
    bubble.classList.add("is-on");
    bubbleUntil = performance.now() + (ms || 3200);
  }
  function placeBubble() {
    var r = hostRect();
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var x = S.x - bw / 2;
    x = Math.max(0, Math.min(r.width - bw, x));
    var top = S.y - 44 * SCALE - bh - 6;
    var viewTop = -r.top + 8;
    var below = false;
    if (top < viewTop) {
      top = S.y + 6;
      below = true;
    }
    bubble.classList.toggle("is-below", below);
    // tail points at the head
    var tailX = Math.max(10, Math.min(bw - 10, S.x - x));
    bubble.style.setProperty("--tail-x", tailX + "px");
    bubble.style.transform = "translate(" + x.toFixed(1) + "px, " + top.toFixed(1) + "px)";
  }

  /* ---------------------------------------------------------- input ---- */
  document.addEventListener(
    "pointermove",
    function (e) {
      var now = performance.now();
      var dt = Math.max(1, now - pointer.at);
      if (pointer.x >= 0) {
        pointer.vx = pointer.vx * 0.5 + (((e.clientX - pointer.x) / dt) * 16) * 0.5;
        pointer.vy = pointer.vy * 0.5 + (((e.clientY - pointer.y) / dt) * 16) * 0.5;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = now;
      if (grab) dragMove(e);
      else maybeStartle(now);
    },
    { passive: true }
  );

  function catCenter() {
    var r = hostRect();
    return { x: r.left + S.x, y: r.top + S.y - 26 * SCALE };
  }
  function maybeStartle(now) {
    if (reduceMotion || S.state === "held" || S.state === "startle" || now - S.startleAt < 4000) return;
    var speed = Math.hypot(pointer.vx, pointer.vy);
    if (speed < 42) return;
    var cc = catCenter();
    if (Math.hypot(pointer.x - cc.x, pointer.y - cc.y) < 110) {
      S.startleAt = now;
      S.jumpV = -7;
      pose.facing = pointer.x < cc.x ? -1 : 1;
      setState("startle", 700);
      bubble.classList.remove("is-on");
    }
  }

  function hitCat(cx, cy) {
    var rect = canvas.getBoundingClientRect();
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return false;
    var lx = (cx - rect.left) * (W / rect.width);
    var ly = (cy - rect.top) * (H / rect.height);
    try {
      return mctx.getImageData(Math.floor(lx), Math.floor(ly), 1, 1).data[3] > 0;
    } catch (err) {
      return true;
    }
  }

  var swallowClick = false;
  if (canDrag) {
    document.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button !== 0 || !hitCat(e.clientX, e.clientY)) return;
        e.preventDefault();
        swallowClick = true;
        var r = hostRect();
        grab = { dx: e.clientX - r.left - S.x, dy: e.clientY - r.top - (S.y - 20 * SCALE), feet: S.y };
        S.shake.flips = 0;
        setState("held");
        bubble.classList.remove("is-on");
        kick(1, 1);
      },
      { capture: true }
    );
    document.addEventListener(
      "click",
      function (e) {
        if (swallowClick) {
          e.preventDefault();
          e.stopPropagation();
          swallowClick = false;
        }
      },
      { capture: true }
    );
    var release = function () {
      if (!grab) return;
      grab = null;
      S.jumpV = Math.max(-4, Math.min(6, pointer.vy * 0.4));
      setState("drop", 900);
    };
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
  }

  function dragMove(e) {
    var r = hostRect();
    var hx = e.clientX - r.left - grab.dx;
    var hy = e.clientY - r.top - grab.dy;
    var b = visibleBox();
    S.x = Math.max(b.x0, Math.min(b.x1, hx));
    S.y = Math.max(b.y0, Math.min(r.height - 4, hy + 20 * SCALE));
    var now = performance.now();
    var sign = pointer.vx > 6 ? 1 : pointer.vx < -6 ? -1 : 0;
    if (sign && sign !== S.shake.sign) {
      if (S.shake.sign !== 0 && now - S.shake.at < 240) S.shake.flips += 1;
      else S.shake.flips = 0;
      S.shake.sign = sign;
      S.shake.at = now;
      if (S.shake.flips >= 3) {
        S.wobbleUntil = now + 1000;
        S.shake.flips = 0;
      }
    }
  }

  /* ----------------------------------------------------------- loop ---- */
  var last = performance.now();
  var raf = null;
  function ease(cur, tgt, k) {
    return cur + (tgt - cur) * k;
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (var key in T) if (Object.prototype.hasOwnProperty.call(T, key)) A[key] = ease(A[key], T[key], key === "closed" || key === "happy" || key === "wide" ? 0.5 : 0.18);

    var st = S.state;

    if (st === "idle") {
      if (now > S.earAt) {
        T.ear = Math.random() < 0.5 ? 2 : 0;
        S.earAt = now + 1200 + Math.random() * 2800;
        window.setTimeout(function () {
          if (S.state === "idle") T.ear = 0;
        }, 220);
      }
      if (now > S.until) {
        var roll = Math.random();
        if (roll < 0.22) setState("groom", 2200 + Math.random() * 1200);
        else if (roll < 0.34) setState("curious", 1400 + Math.random() * 1000);
        else if (roll < 0.42 && now - S.cornerAt > 60000) {
          var corner = pickCorner();
          if (corner) {
            S.cornerAt = now;
            walkTo(corner, "corner");
          } else startIdle();
        } else {
          var wp = pickWaypoint();
          if (wp) walkTo(wp, "idle");
          else startIdle();
        }
      }
      // periodic bubble
      if (now > S.bubbleAt && bubbleUntil < now) {
        say(MESSAGES[S.msg % MESSAGES.length]);
        S.msg += 1;
        S.bubbleAt = now + 12000 + Math.random() * 14000;
      }
    } else if (st === "walk") {
      var dx = S.tx - S.x, dy = S.ty - S.y;
      var d = Math.hypot(dx, dy);
      var step = Math.min(d, SPEED * dt);
      if (d > 0.5) {
        S.x += (dx / d) * step;
        S.y += (dy / d) * step;
        S.walked += step;
        pose.legPhase = (S.walked / 22) % 1;
      }
      if (d <= 1) {
        if (S.after === "corner") {
          pose.facing = S.x < hostRect().width / 2 ? 1 : -1; // look back into the page
          startIdle(6000 + Math.random() * 6000);
        } else startIdle();
      }
    } else if (st === "groom") {
      pose.pawSwing = Math.sin(now / 90) * 1.5; // lick, lick
      if (now > S.until) startIdle(900 + Math.random() * 1500);
    } else if (st === "curious") {
      if (now > S.until) startIdle(600);
    } else if (st === "wave") {
      pose.pawSwing = Math.sin(now / 110) * 2.2;
      if (now > S.until) startIdle();
    } else if (st === "happy") {
      if (now > S.until) startIdle(800);
    } else if (st === "startle") {
      if (now > S.until) startIdle(1200);
    } else if (st === "held") {
      var vv = Math.hypot(pointer.vx, pointer.vy);
      var stretch = Math.min(0.55, vv / 60 + Math.max(0, (S.y - grab.feet) / 900));
      pose.sy = ease(pose.sy, 1 + stretch + 0.06, 0.3);
      pose.sx = ease(pose.sx, 1 - stretch * 0.45, 0.3);
      pose.tilt = ease(pose.tilt, Math.max(-0.5, Math.min(0.5, (pointer.vx / 110) * pose.facing)), 0.25);
      if (Math.abs(pointer.vx) > 4) pose.facing = pointer.vx > 0 ? 1 : -1;
    } else if (st === "drop") {
      if (now > S.until) startIdle();
    }

    // little vertical hop used by startle and the drop landing
    if (S.jumpV !== 0 || pose.lift > 0) {
      pose.lift -= S.jumpV;
      S.jumpV += 0.9;
      if (pose.lift <= 0) {
        pose.lift = 0;
        if (S.jumpV > 2) kick(1.22, 0.8);
        S.jumpV = 0;
      }
    }
    pose.pawSwing = st === "groom" || st === "wave" ? pose.pawSwing : 0;

    // petting: cursor resting on the cat
    if (!reduceMotion && canDrag && st !== "held" && pointer.x >= 0 && hitCat(pointer.x, pointer.y) && Math.hypot(pointer.vx, pointer.vy) < 6) {
      S.hoverMs += dt * 1000;
      if (S.hoverMs > 1300 && now - S.petAt > 6000 && st !== "happy") {
        S.petAt = now;
        setState("happy", 1700);
        kick(1.08, 0.94);
        for (var hh = 0; hh < 5; hh++) S.hearts.push({ x: (Math.random() - 0.5) * 24, y: -30 - Math.random() * 6, v: 0.35 + Math.random() * 0.3, t: 0, d: 1100 + Math.random() * 500 });
        if (Math.random() < 0.5) say("purr...", 1800);
      }
    } else {
      S.hoverMs = 0;
    }

    // blink
    if (now > S.blinkAt && st !== "groom" && st !== "happy") {
      T.closed = 1;
      S.blinkAt = now + 2500 + Math.random() * 4000;
      window.setTimeout(function () {
        if (S.state !== "groom") T.closed = 0;
      }, 130);
    }

    // squash spring
    var q = S.squash;
    q.vx += (1 - q.sx) * 0.25;
    q.vy += (1 - q.sy) * 0.25;
    q.vx *= 0.7;
    q.vy *= 0.7;
    q.sx += q.vx;
    q.sy += q.vy;
    if (st !== "held") {
      pose.sx = ease(pose.sx, q.sx, 0.5);
      pose.sy = ease(pose.sy, q.sy, 0.5);
      pose.tilt = ease(pose.tilt, 0, 0.2);
    }
    if (S.wobbleUntil > now) pose.tilt += Math.sin(now / 45) * 0.18 * ((S.wobbleUntil - now) / 1000);

    // breathing, bob, tail
    var breathe = Math.sin(now / 650) * 0.4;
    pose.bob = breathe + (A.step > 0.1 ? -Math.abs(Math.sin(pose.legPhase * Math.PI * 2)) * 1.4 * A.step : 0);
    pose.tail = Math.sin(now / (st === "walk" ? 160 : st === "happy" ? 120 : 420)) * (st === "happy" ? 1.4 : 1);
    pose.step = A.step;
    pose.ear = A.ear;
    pose.headUp = A.headUp;
    pose.paw = A.paw;
    pose.dangle = A.dangle;
    pose.closed = A.closed;
    pose.happy = A.happy;
    pose.wide = A.wide;

    // pupils track the cursor; look down at the hand while held
    if (st === "held") {
      pose.pupilX = 0;
      pose.pupilY = 1.2;
    } else if (st === "curious") {
      pose.pupilX = 1.2 * pose.facing;
      pose.pupilY = -0.6;
    } else if (pointer.x >= 0) {
      var cc = catCenter();
      var ddx = pointer.x - cc.x, ddy = pointer.y - cc.y;
      var dd = Math.hypot(ddx, ddy) || 1;
      var reach = Math.min(1, dd / 140);
      pose.pupilX = (ddx / dd) * 1.3 * reach * pose.facing;
      pose.pupilY = (ddy / dd) * 1.3 * reach;
    }

    placeCanvas();
    renderPose(pose);
    drawHearts(now, dt);

    if (bubbleUntil > now && st !== "held") placeBubble();
    else if (bubble.classList.contains("is-on")) bubble.classList.remove("is-on");

    raf = window.requestAnimationFrame(frame);
  }

  function drawHearts(now, dt) {
    if (!S.hearts.length) return;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.translate(CX, BY);
    ctx.fillStyle = light();
    var keep = [];
    for (var i = 0; i < S.hearts.length; i++) {
      var h = S.hearts[i];
      h.t += dt * 1000;
      if (h.t > h.d) continue;
      var y = h.y - (h.t / h.d) * 14;
      var x = h.x + Math.sin(h.t / 160) * 1.5;
      // tiny pixel heart
      px(ctx, x - 1, y);
      px(ctx, x + 1, y);
      px(ctx, x - 2, y + 1);
      px(ctx, x - 1, y + 1);
      px(ctx, x, y + 1);
      px(ctx, x + 1, y + 1);
      px(ctx, x + 2, y + 1);
      px(ctx, x - 1, y + 2);
      px(ctx, x, y + 2);
      px(ctx, x + 1, y + 2);
      px(ctx, x, y + 3);
      keep.push(h);
    }
    S.hearts = keep;
  }

  /* ---------------------------------------------------------- start ---- */
  function initialSpot() {
    var b = visibleBox();
    var hero = host.querySelector(".hero");
    var y = hero ? Math.min(b.y1, hero.offsetTop + hero.offsetHeight - 6) : b.y1;
    var xs = small ? [b.x1, b.x1 - 60, b.x0] : [b.x1, b.x1 - 80, b.x1 - 160, b.x0];
    for (var i = 0; i < xs.length; i++) if (!coversText(xs[i], y)) return { x: xs[i], y: y };
    return { x: b.x1, y: y };
  }
  var s0 = initialSpot();
  S.x = s0.x;
  S.y = s0.y;
  pose.facing = -1;
  S.blinkAt = performance.now() + 1500;
  S.bubbleAt = performance.now() + 2500;
  placeCanvas();
  renderPose(pose);
  canvas.classList.add("is-ready");

  window.addEventListener("resize", function () {
    small = window.innerWidth < 1024;
    var b = visibleBox();
    S.x = Math.max(b.x0, Math.min(b.x1, S.x));
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    }
  });

  if (reduceMotion) {
    // Sits still; eyes follow the cursor; says hello once
    setState("idle", Infinity);
    say(MESSAGES[0], 4000);
    (function still() {
      var now = performance.now();
      if (pointer.x >= 0) {
        var cc = catCenter();
        var ddx = pointer.x - cc.x, ddy = pointer.y - cc.y;
        var d = Math.hypot(ddx, ddy) || 1;
        pose.pupilX = (ddx / d) * 1.3 * pose.facing;
        pose.pupilY = (ddy / d) * 1.3;
      }
      renderPose(pose);
      if (bubbleUntil > now) placeBubble();
      else bubble.classList.remove("is-on");
      window.setTimeout(still, 200);
    })();
    return;
  }

  // Say hello with a little wave first
  setState("wave", 1800);
  say(MESSAGES[0], 3000);
  S.msg = 1;
  S.bubbleAt = performance.now() + 12000;
  raf = window.requestAnimationFrame(frame);
})();

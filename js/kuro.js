/* Kim De Guzman — portfolio
   Kuro, the black pixel cat that lives inside the content column.

   Original artwork: a chunky procedural pixel rig (36x30 logical px, drawn
   on a low-resolution canvas and scaled with nearest-neighbour sampling), so
   every pose is code rather than a sprite sheet. Pupils are a separate layer
   drawn over the body pose. The waypoint/idle timing follows the oneko.js
   pattern (adryd325, MIT). No dependencies. The page works without it. */
(function () {
  "use strict";

  var host = document.querySelector(".content");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var small = window.innerWidth < 1024;
  var canDrag = !coarse && !small && !reduceMotion;

  // Logical pixel grid and on-screen scale. Chunky: 4 screen px per pixel.
  var W = 36;
  var H = 30;
  var SCALE = small ? 3 : 4;
  var CX = 20; // horizontal centre (tail room behind)
  var BY = 27; // baseline: where the paws touch the floor

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
      headUp: 0, // + lifts the head block, - lowers it (groom, crouch)
      ear: 0, // + perks, - flattens
      step: 0, // walk amount
      legPhase: 0,
      tail: 0, // sway -1..1
      dangle: 0, // paws hang (held)
      paw: 0, // front paw raised (wave / groom)
      pawSwing: 0,
      knead: 0, // paws pressing alternately
      kneadPhase: 0,
      arch: 0, // stretch: back rises, head drops
      crouch: 0, // hunt: low and forward
      peek: 0, // only the face and front paws show
      closed: 0, // eyes shut
      squint: 0, // relaxed purr eyes
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

  // Inclusive integer rectangle, relative to the paws at (0,0); y is negative upward
  function R(c, x0, y0, x1, y1) {
    c.fillRect(Math.round(Math.min(x0, x1)), Math.round(Math.min(y0, y1)), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1);
  }

  // Body silhouette. Facing right: the head is the front (+x) of one loaf.
  function drawSilhouette(c, p) {
    c.fillStyle = "#000";
    var b = Math.round(p.bob);
    var hu = Math.round(p.headUp);
    var arch = Math.round(p.arch * 3);
    var cr = p.crouch;
    var top = -13 + b + Math.round(cr * 3); // loaf top
    var headTop = -16 + b - hu + Math.round(cr * 2);
    var backX = -9, frontX = 11;
    if (p.peek > 0.5) backX = 1; // only the face block

    // loaf: rounded by trimming the corners
    R(c, backX + 1, top, frontX - 1, -2);
    R(c, backX, top + 1, frontX, -3);
    // stretch: the back rises into an arch
    if (arch > 0) {
      R(c, backX + 1, top - arch, backX + 7, top);
      R(c, backX + 2, top - arch - 1, backX + 6, top - arch);
    }
    // head block (front, taller)
    R(c, 0, headTop, frontX - 1, top);
    R(c, 1, headTop - 1, frontX - 2, headTop);
    // ears: back ear and front ear, flatten with negative ear
    var e = Math.round(p.ear);
    var earY = headTop - 1 - e;
    R(c, 1, earY - 1, 3, earY - 1);
    R(c, 2, earY - 2, 2, earY - 2 - (e > 0 ? 1 : 0));
    R(c, 7, earY - 1, 9, earY - 1);
    R(c, 8, earY - 2, 8, earY - 2 - (e > 0 ? 1 : 0));
    if (e < -1) {
      // flattened: wider, lower stubs instead
      R(c, 0, headTop - 1, 3, headTop - 1);
      R(c, 7, headTop - 1, 10, headTop - 1);
    }
    // feet: two bumps, alternate while walking or kneading
    var lf = 0, rf = 0, kf = 0, kb = 0;
    if (p.step > 0.05) {
      lf = Math.max(0, Math.sin(p.legPhase * Math.PI * 2)) * 1.5 * p.step;
      rf = Math.max(0, Math.sin(p.legPhase * Math.PI * 2 + Math.PI)) * 1.5 * p.step;
    }
    if (p.knead > 0.05) {
      kf = Math.round(Math.max(0, Math.sin(p.kneadPhase * Math.PI * 2)) * 2 * p.knead);
      kb = Math.round(Math.max(0, Math.sin(p.kneadPhase * Math.PI * 2 + Math.PI)) * 2 * p.knead);
    }
    var dangle = Math.round(p.dangle * 2);
    if (p.peek < 0.5) R(c, -6 - kb, -2 - Math.round(lf) + dangle, -4 - kb, 0 + dangle);
    if (p.paw < 0.05) {
      R(c, 5 + kf, -2 - Math.round(rf) + dangle, 7 + kf, 0 + dangle);
    } else {
      // front paw raised beside the face
      var ty = Math.round(-9 - p.paw * 6 + p.pawSwing);
      R(c, 12, ty, 14, -2);
      R(c, 13, ty - 1, 15, ty);
    }
    // tail: curls up behind
    if (p.peek < 0.5) {
      var wag = Math.round(p.tail * 1.5);
      var t0y = -8 + b;
      R(c, backX - 2, t0y, backX, t0y + 1);
      R(c, backX - 4, t0y - 1 + wag, backX - 2, t0y);
      R(c, backX - 5, t0y - 4 + wag, backX - 4, t0y - 1 + wag);
      R(c, backX - 4, t0y - 7 + wag * 2, backX - 3, t0y - 4 + wag);
    }
  }

  // Eye whites, inner-ear highlights (no pupils here)
  function drawFace(c, p) {
    var b = Math.round(p.bob);
    var hu = Math.round(p.headUp);
    var cr = p.crouch;
    var headTop = -16 + b - hu + Math.round(cr * 2);
    var L = light();
    c.fillStyle = L;
    // inner ear highlights (skip when flattened)
    if (p.ear > -1) {
      var e = Math.round(p.ear);
      var earY = headTop - 1 - e;
      px(c, 2, earY - 1);
      px(c, 8, earY - 1);
    }
    var ey = headTop + 6; // eye row
    var exs = [3, 8];
    for (var i = 0; i < 2; i++) {
      var x = exs[i];
      if (p.closed > 0.5) {
        R(c, x, ey + 2, x + 1, ey + 2);
      } else if (p.squint > 0.5) {
        R(c, x, ey + 1, x + 1, ey + 1);
      } else if (p.happy > 0.5) {
        px(c, x, ey + 2);
        px(c, x + 1, ey + 1);
        px(c, x + 2, ey + 2);
      } else if (p.wide > 0.5) {
        R(c, x, ey - 1, x + 1, ey + 3);
      } else {
        R(c, x, ey, x + 1, ey + 2);
      }
    }
  }

  // Pupils: their own layer over the body pose
  function drawPupils(c, p) {
    if (p.closed > 0.5 || p.squint > 0.5 || p.happy > 0.5) return;
    var b = Math.round(p.bob);
    var hu = Math.round(p.headUp);
    var cr = p.crouch;
    var headTop = -16 + b - hu + Math.round(cr * 2);
    var ey = headTop + 6;
    var ox = p.pupilX > 0.4 ? 1 : 0; // eyes are 2 px wide: the pupil sits left or right
    var oy = Math.max(-1, Math.min(1, Math.round(p.pupilY)));
    if (p.wide > 0.5) oy = Math.max(-1, Math.min(2, oy));
    c.fillStyle = ink();
    var exs = [3, 8];
    for (var i = 0; i < 2; i++) px(c, exs[i] + ox, ey + 1 + oy);
  }

  // Face-only crop for the favicon: head block, ears, eyes
  function drawFaceOnly(c, size) {
    var g = document.createElement("canvas");
    g.width = 16;
    g.height = 16;
    var gc = g.getContext("2d");
    var rows = [
      "0000000000000000",
      "0001000000010000",
      "0011100000111000",
      "0012110001121100",
      "0012221111222100",
      "0122222222222210",
      "1222222222222221",
      "1222222222222221",
      "1223322222332221",
      "1223322222332221",
      "1222222222222221",
      "1222222222222221",
      "0122222222222210",
      "0122222222222210",
      "0011112222111100",
      "0000001111100000"
    ];
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var ch = rows[y].charAt(x);
        if (ch === "0") continue;
        gc.fillStyle = ch === "2" ? "#0a0a0a" : "#ffffff";
        gc.fillRect(x, y, 1, 1);
      }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(g, 0, 0, size, size);
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
  var T = { step: 0, ear: 0, headUp: 0, paw: 0, dangle: 0, closed: 0, happy: 0, wide: 0, squint: 0, knead: 0, arch: 0, crouch: 0, peek: 0 };
  var A = { step: 0, ear: 0, headUp: 0, paw: 0, dangle: 0, closed: 0, happy: 0, wide: 0, squint: 0, knead: 0, arch: 0, crouch: 0, peek: 0 };
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
    huntAt: 0,
    jumpV: 0,
    squash: { sx: 1, sy: 1, vx: 0, vy: 0 },
    shake: { flips: 0, sign: 0, at: 0 },
    wobbleUntil: 0,
    msg: 0,
    hearts: []
  };
  var pointer = { x: -1, y: -1, vx: 0, vy: 0, at: 0 };
  var lastActivity = performance.now();
  var lastScroll = 0;
  var scrollNote = null;
  var grab = null;
  var SPEED = small ? 48 : 70;
  var halfW = (W * SCALE) / 2;
  var bodyH = 22 * SCALE;

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
      [x, y - 6 * SCALE],
      [x, y - 14 * SCALE],
      [x - 10 * SCALE, y - 8 * SCALE],
      [x + 10 * SCALE, y - 8 * SCALE]
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
    var oy = Math.max(b.y0, Math.min(b.y1, S.y)); // origin clamped into view
    for (var i = 0; i < 16; i++) {
      var x = Math.max(b.x0, Math.min(b.x1, S.x + (Math.random() * 2 - 1) * radius));
      var y = Math.max(b.y0, Math.min(b.y1, oy + (Math.random() * 2 - 1) * radius));
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
    for (var k in T) if (Object.prototype.hasOwnProperty.call(T, k)) T[k] = 0;
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
    if (st === "purr") {
      T.squint = 1;
      T.ear = 1;
    }
    if (st === "hunt") {
      T.crouch = 1;
      T.ear = -1;
      T.wide = 1;
      T.headUp = -1;
    }
    if (st === "pounce") {
      T.step = 1;
      T.wide = 1;
      T.ear = 1;
    }
    if (st === "stretch") {
      T.arch = 1;
      T.headUp = -2;
      T.closed = 1;
    }
    if (st === "knead") {
      T.knead = 1;
      T.squint = 1;
      T.headUp = -1;
    }
    if (st === "peek") {
      T.peek = 1;
      T.ear = 1;
    }
    if (st === "idle") S.idleSince = performance.now();
  }
  function startIdle(ms) {
    setState("idle", ms || 1600 + Math.random() * 3800);
  }
  function walkTo(pt, after) {
    S.tx = pt.x;
    S.ty = pt.y;
    if (S.state === "peek") T.peek = 0;
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
    var top = S.y - 20 * SCALE - bh - 6;
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
    return { x: r.left + S.x + 6 * SCALE * pose.facing, y: r.top + S.y - 9 * SCALE };
  }
  function maybeStartle(now) {
    lastActivity = now;
    if (S.state === "peek") leavePeek();
    if (reduceMotion || S.state === "held" || S.state === "startle" || S.state === "hunt" || S.state === "pounce") return;
    var speed = Math.hypot(pointer.vx, pointer.vy);
    if (speed < 38) return;
    var cc = catCenter();
    var d = Math.hypot(pointer.x - cc.x, pointer.y - cc.y);
    if (d < 100 && now - S.startleAt > 4000) {
      S.startleAt = now;
      S.jumpV = -7;
      pose.facing = pointer.x < cc.x ? -1 : 1;
      setState("startle", 700);
      bubble.classList.remove("is-on");
    } else if (d >= 100 && d < 340 && now - S.huntAt > 9000 && (S.state === "idle" || S.state === "walk")) {
      // Mouse hunt: crouch, then pounce toward where the cursor was
      S.huntAt = now;
      var r = hostRect();
      var b = visibleBox();
      S.tx = Math.max(b.x0, Math.min(b.x1, pointer.x - r.left));
      S.ty = Math.max(b.y0, Math.min(b.y1, pointer.y - r.top + 10 * SCALE));
      pose.facing = S.tx >= S.x ? 1 : -1;
      setState("hunt", 520);
      bubble.classList.remove("is-on");
    }
  }
  function leavePeek() {
    if (S.state !== "peek") return;
    var b = visibleBox();
    walkTo({ x: Math.max(b.x0, Math.min(b.x1, S.x + (S.x < hostRect().width / 2 ? 90 : -90))), y: S.y }, "idle");
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

  /* ---------------------------------------------------- scroll paper --- */
  var paper = document.createElement("div");
  paper.className = "kuro-paper";
  paper.setAttribute("aria-hidden", "true");
  paper.innerHTML = '<span class="kuro-paper__text"></span>';
  host.appendChild(paper);
  var paperText = paper.querySelector(".kuro-paper__text");
  var PAPER_NOTES = ["scroll log: kneading along...", "still here. keep going!", "projects are further down.", "you scroll, I knead."];
  var paperIdx = 0;
  function placePaper() {
    var r = hostRect();
    var pw = paper.offsetWidth;
    var x = Math.max(0, Math.min(r.width - pw, S.x - pw / 2));
    paper.style.transform = "translate(" + x.toFixed(1) + "px, " + (S.y + 4).toFixed(1) + "px)";
  }
  if (!reduceMotion) {
    window.addEventListener(
      "scroll",
      function () {
        var now = performance.now();
        lastActivity = now;
        if (S.state === "peek") leavePeek();
        var vb = visibleBox();
        var onScreen = S.y >= vb.y0 - 10 && S.y <= vb.y1 + 10;
        if (!onScreen) {
          // He scrolled out of view: come back before doing anything else
          if (S.state === "idle" || S.state === "knead" || S.state === "curious" || S.state === "groom") {
            paper.classList.remove("is-open");
            var wp0 = pickWaypoint();
            if (wp0) walkTo(wp0, "idle");
          }
        } else if (S.state === "idle" || S.state === "knead" || S.state === "curious" || S.state === "groom") {
          if (S.state !== "knead") {
            setState("knead", 0);
            paperText.textContent = PAPER_NOTES[paperIdx++ % PAPER_NOTES.length];
            paper.classList.add("is-open");
            bubble.classList.remove("is-on");
          }
          S.until = now + 1500;
        }
        lastScroll = now;
      },
      { passive: true }
    );
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
    for (var key in T) if (Object.prototype.hasOwnProperty.call(T, key)) A[key] = ease(A[key], T[key], key === "closed" || key === "happy" || key === "wide" || key === "squint" || key === "peek" ? 0.5 : 0.18);

    var st = S.state;

    if (st === "idle") {
      if (now > S.earAt) {
        T.ear = Math.random() < 0.5 ? 2 : 0;
        S.earAt = now + 1200 + Math.random() * 2800;
        window.setTimeout(function () {
          if (S.state === "idle") T.ear = 0;
        }, 220);
      }
      if (!reduceMotion && now - lastActivity > 45000 && S.state === "idle") {
        // Peek mode: nobody is around, tuck against the nearest edge
        var bb = visibleBox();
        var edgeX = S.x < hostRect().width / 2 ? bb.x0 - 6 * SCALE : bb.x1 + 6 * SCALE;
        pose.facing = edgeX < S.x ? -1 : 1;
        walkTo({ x: edgeX, y: S.y }, "peek");
        lastActivity = now + 3600000; // until real activity resets it
      } else if (now > S.until) {
        var roll = Math.random();
        if (roll < 0.1) setState("stretch", 1300);
        else if (roll < 0.28) setState("groom", 2200 + Math.random() * 1200);
        else if (roll < 0.4) setState("curious", 1400 + Math.random() * 1000);
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
        } else if (S.after === "peek") {
          pose.facing = S.x < hostRect().width / 2 ? 1 : -1; // face into the page
          setState("peek", 0);
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
    } else if (st === "hunt") {
      pose.tail = Math.sin(now / 60) * 0.8; // twitch
      if (now > S.until) {
        S.jumpV = -5;
        setState("pounce", 900);
      }
    } else if (st === "pounce") {
      var pdx = S.tx - S.x, pdy = S.ty - S.y;
      var pd = Math.hypot(pdx, pdy);
      var pstep = Math.min(pd, SPEED * 3.2 * dt);
      if (pd > 0.5) {
        S.x += (pdx / pd) * pstep;
        S.y += (pdy / pd) * pstep;
        S.walked += pstep;
        pose.legPhase = (S.walked / 16) % 1;
      }
      if (pd <= 1 || now > S.until) {
        kick(1.2, 0.85);
        startIdle(1400);
      }
    } else if (st === "purr") {
      if (!(pointer.x >= 0 && hitCat(pointer.x, pointer.y))) startIdle(900);
      if (Math.random() < 0.02) S.hearts.push({ x: (Math.random() - 0.5) * 20, y: -14 - Math.random() * 4, v: 0.3, t: 0, d: 1100 + Math.random() * 400 });
    } else if (st === "stretch") {
      if (now > S.until) startIdle(700);
    } else if (st === "knead") {
      pose.kneadPhase = (now / 420) % 1;
      if (now - lastScroll > 1500) {
        paper.classList.remove("is-open");
        startIdle(900);
      }
    } else if (st === "peek") {
      // stays tucked until the visitor moves or scrolls
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
      if (S.hoverMs > 1300 && now - S.petAt > 6000 && st !== "happy" && st !== "purr") {
        S.petAt = now;
        setState("happy", 900);
        window.setTimeout(function () {
          if (S.state === "happy") setState("purr", 0);
        }, 900);
        kick(1.08, 0.94);
        for (var hh = 0; hh < 5; hh++) S.hearts.push({ x: (Math.random() - 0.5) * 20, y: -16 - Math.random() * 4, v: 0.35 + Math.random() * 0.3, t: 0, d: 1100 + Math.random() * 500 });
        if (Math.random() < 0.5) say("purr...", 1800);
      }
    } else {
      S.hoverMs = 0;
    }

    // blink
    if (now > S.blinkAt && st !== "groom" && st !== "happy" && st !== "purr" && st !== "stretch" && st !== "knead") {
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
    pose.squint = A.squint;
    pose.knead = A.knead;
    pose.arch = A.arch;
    pose.crouch = A.crouch;
    pose.peek = A.peek;

    // pupils track the cursor; look down at the hand while held
    if (st === "held") {
      pose.pupilX = 0;
      pose.pupilY = 1;
    } else if (st === "curious") {
      pose.pupilX = 1;
      pose.pupilY = -1;
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

    if (paper.classList.contains("is-open")) placePaper();
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

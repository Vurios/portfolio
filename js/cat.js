/* Kim De Guzman — portfolio
   A black pixel cat that lives on the floor of the viewport. It potters
   left and right, sits, blinks, naps, watches the cursor, chases a fast
   mouse, and can be picked up: it stretches like mochi while held, then
   drops with a bounce (fling it and it tumbles off the walls).

   Original artwork: a procedural pixel rig drawn on a low-resolution canvas
   and scaled with nearest-neighbour sampling, so every pose is code, not a
   sprite sheet. The rig-plus-pose approach and the eased pose channels are
   modelled on rio-desktop-pet (vatsal191201, MIT); the idle/walk timing on
   oneko.js (adryd325, MIT). Everything here is written for this site.
   No dependencies. The page works without it. */
(function () {
  "use strict";

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

  /* ----------------------------------------------------------- canvas */
  var canvas = document.createElement("canvas");
  canvas.className = "cat";
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width = W * SCALE + "px";
  canvas.style.height = H * SCALE + "px";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  // Offscreen buffers at logical resolution: silhouette mask, its dilated
  // outline, and the face. Squash, stretch, and tilt are applied only when
  // these are composited onto the display canvas, so pixels stay crisp.
  function buffer() {
    var c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  }
  var mask = buffer();
  var mctx = mask.getContext("2d");
  var outline = buffer();
  var octx = outline.getContext("2d");
  var face = buffer();
  var fctx = face.getContext("2d");

  function ink() {
    return "#0a0a0a";
  }
  function light() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "#ffffff" : "#f4f4f5";
  }

  /* --------------------------------------------------------- raster helpers */
  function ell(c, cx, cy, rx, ry) {
    var x0 = Math.ceil(-rx), x1 = Math.floor(rx), y0 = Math.ceil(-ry), y1 = Math.floor(ry);
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) c.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
      }
    }
  }
  function tri(c, ax, ay, bx, by, qx, qy) {
    c.beginPath();
    c.moveTo(Math.round(ax), Math.round(ay));
    c.lineTo(Math.round(bx), Math.round(by));
    c.lineTo(Math.round(qx), Math.round(qy));
    c.closePath();
    c.fill();
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

  /* ------------------------------------------------------------ the rig */
  // Draws the black silhouette relative to the paws (0,0); y grows upward
  // as negative values. Everything is parametric on `p` (the pose).
  function drawSilhouette(c, p, t) {
    c.fillStyle = "#000";
    var bob = p.bob;
    // body: a chubby rounded blob
    ell(c, 0, -10 + bob, 9.5, 8.5);
    // feet: shuffle while walking, hang while held
    var lift = p.step * 1.6;
    var lf = Math.max(0, Math.sin(p.legPhase * Math.PI * 2)) * lift;
    var rf = Math.max(0, Math.sin(p.legPhase * Math.PI * 2 + Math.PI)) * lift;
    var dangle = p.dangle * 3;
    ell(c, -5.5, -1.5 - lf + dangle, 3.5, 2);
    ell(c, 5.5, -1.5 - rf + dangle, 3.5, 2);
    // tail: curls up beside the body and sways
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
    // head: big and round, slightly forward of the body
    var hy = -27 + bob + p.headUp;
    ell(c, 0, hy, 12, 11);
    // ears: rounded triangles, twitch by `ear`
    var e = p.ear;
    tri(c, -10, hy - 4, -12, hy - 14 - e, -3, hy - 10);
    ell(c, -11.5, hy - 13 - e, 1.4, 1.4);
    tri(c, 10, hy - 4, 12, hy - 14 - e, 3, hy - 10);
    ell(c, 11.5, hy - 13 - e, 1.4, 1.4);
  }

  function drawFace(c, p, t) {
    var hy = -27 + p.bob + p.headUp;
    var L = light();
    var K = ink();
    var ex = 5, ey = hy + 1;
    if (p.sleep > 0.5 || p.blink > 0.5) {
      // closed eyes: little arcs
      c.fillStyle = L;
      for (var s = -1; s <= 1; s += 2) {
        px(c, s * ex - 2, ey + 1);
        px(c, s * ex - 1, ey + 2);
        px(c, s * ex, ey + 2);
        px(c, s * ex + 1, ey + 2);
        px(c, s * ex + 2, ey + 1);
      }
    } else {
      c.fillStyle = L;
      ell(c, -ex, ey, 2.6, 3.2);
      ell(c, ex, ey, 2.6, 3.2);
      c.fillStyle = K;
      var ox = Math.max(-1.3, Math.min(1.3, p.pupilX));
      var oy = Math.max(-1.3, Math.min(1.3, p.pupilY));
      ell(c, -ex + ox, ey + oy, 1.4, 2);
      ell(c, ex + ox, ey + oy, 1.4, 2);
      c.fillStyle = L;
      px(c, -ex + ox - 1, ey + oy - 1);
      px(c, ex + ox - 1, ey + oy - 1);
    }
    // mouth: a tiny "w"
    c.fillStyle = L;
    px(c, -2, hy + 6);
    px(c, -1, hy + 7);
    px(c, 0, hy + 6);
    px(c, 1, hy + 7);
    px(c, 2, hy + 6);
    // whiskers
    c.fillStyle = L;
    for (var w = 0; w < 2; w++) {
      var yy = hy + 3 + w * 3;
      for (var k = 0; k < 4; k++) {
        px(c, -12 - k, yy + (w ? k * 0.4 : -k * 0.4));
        px(c, 12 + k, yy + (w ? k * 0.4 : -k * 0.4));
      }
    }
    // sleeping z's
    if (p.sleep > 0.5) {
      c.fillStyle = L;
      var phase = (t / 900) % 1;
      for (var z = 0; z < 2; z++) {
        var zp = (phase + z * 0.5) % 1;
        var zx = 14 + zp * 6;
        var zy = hy - 10 - zp * 12;
        if (zp < 0.85) {
          px(c, zx, zy);
          px(c, zx + 1, zy);
          px(c, zx + 2, zy);
          px(c, zx + 1, zy + 1);
          px(c, zx, zy + 2);
          px(c, zx + 1, zy + 2);
          px(c, zx + 2, zy + 2);
        }
      }
    }
  }

  function render(p, t) {
    var w = canvas.width, h = canvas.height;
    [mctx, octx, fctx].forEach(function (c) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);
    });
    // Logical rig transform: origin at the paws, facing mirror only
    function rig(c) {
      c.setTransform(p.facing, 0, 0, 1, CX, BY);
    }
    rig(mctx);
    drawSilhouette(mctx, p, t);
    // Outline: the mask stamped in the 8 neighbouring positions, tinted light
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        octx.drawImage(mask, dx, dy);
      }
    }
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = light();
    octx.fillRect(0, 0, W, H);
    octx.globalCompositeOperation = "source-over";
    rig(fctx);
    drawFace(fctx, p, t);

    // Composite with squash/stretch about the paws and any tilt
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.translate(CX, BY - p.lift);
    ctx.rotate(p.tilt);
    ctx.scale(p.sx, p.sy);
    ctx.drawImage(outline, -CX, -BY);
    ctx.drawImage(mask, -CX, -BY);
    ctx.drawImage(face, -CX, -BY);
  }

  /* --------------------------------------------------------- pose + state */
  var pose = {
    facing: 1,
    bob: 0,
    sx: 1,
    sy: 1,
    lift: 0,
    tilt: 0,
    step: 0,
    legPhase: 0,
    tail: 0,
    ear: 0,
    headUp: 0,
    blink: 0,
    sleep: 0,
    dangle: 0,
    pupilX: 0,
    pupilY: 0
  };
  // Target channels ease toward these
  var T = { step: 0, sleep: 0, dangle: 0, ear: 0, headUp: 0 };
  var A = { step: 0, sleep: 0, dangle: 0, ear: 0, headUp: 0 };

  var S = {
    state: "idle",
    x: 0, // paw centre, viewport px
    y: 0, // baseline, viewport px
    vx: 0,
    vy: 0,
    targetX: 0,
    until: 0,
    idleSince: 0,
    walked: 0,
    blinkAt: 0,
    earAt: 0,
    squash: { sx: 1, sy: 1, vx: 0, vy: 0 },
    shake: { flips: 0, sign: 0, at: 0 },
    wobbleUntil: 0
  };
  var pointer = { x: -1, y: -1, vx: 0, vy: 0, at: 0 };
  var grab = null;
  var SPEED = small ? 55 : 80; // px/s walking
  var halfW = (W * SCALE) / 2;
  var bodyH = 40 * SCALE;

  function floorY() {
    return window.innerHeight - 4;
  }
  function edgeMin() {
    return halfW + 6;
  }
  function edgeMax() {
    return window.innerWidth - halfW - 6;
  }

  function placeCanvas() {
    canvas.style.transform =
      "translate(" + (S.x - halfW).toFixed(1) + "px, " + (S.y - BY * SCALE).toFixed(1) + "px)";
  }

  // Does the cat standing at x cover text or controls? Sample a few points
  // over the body and reject if any hits a text-bearing element.
  var TEXTY = "p, h1, h2, h3, h4, li, a, button, figcaption, span, label, input, textarea, .pill, .label, .meta";
  function coversText(x) {
    var pts = [
      [x, floorY() - 10],
      [x, floorY() - 30],
      [x - 14, floorY() - 20],
      [x + 14, floorY() - 20]
    ];
    for (var i = 0; i < pts.length; i++) {
      var els = document.elementsFromPoint(pts[i][0], pts[i][1]);
      for (var j = 0; j < els.length; j++) {
        if (els[j] === canvas) continue;
        if (els[j].closest && els[j].closest(TEXTY)) return true;
        break;
      }
    }
    return false;
  }

  function pickWalkTarget() {
    var radius = small ? 160 : 320;
    for (var tries = 0; tries < 14; tries++) {
      var x = S.x + (Math.random() * 2 - 1) * radius;
      x = Math.max(edgeMin(), Math.min(edgeMax(), x));
      if (Math.abs(x - S.x) < 40) continue;
      if (coversText(x)) continue;
      return x;
    }
    return null;
  }

  function setState(st, ms) {
    S.state = st;
    S.until = performance.now() + (ms || 0);
    T.step = 0;
    T.sleep = 0;
    T.dangle = 0;
    T.headUp = 0;
    T.ear = 0;
    if (st === "walk" || st === "chase") T.step = 1;
    if (st === "sleep") T.sleep = 1;
    if (st === "held") {
      T.dangle = 1;
      T.ear = -1.5;
    }
    if (st === "fall") T.dangle = 1;
    if (st === "idle") S.idleSince = performance.now();
  }

  function startIdle() {
    setState("idle", 1800 + Math.random() * 4200);
  }

  function startWalk() {
    var x = pickWalkTarget();
    if (x === null) return startIdle();
    S.targetX = x;
    pose.facing = x >= S.x ? 1 : -1;
    setState("walk");
  }

  function kick(sx, sy) {
    S.squash.sx = sx;
    S.squash.sy = sy;
  }

  /* --------------------------------------------------------------- input */
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
    },
    { passive: true }
  );

  function hitCat(e) {
    var rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return false;
    var lx = (e.clientX - rect.left) * (W / rect.width);
    var ly = (e.clientY - rect.top) * (H / rect.height);
    try {
      var a = mctx.getImageData(Math.floor(lx), Math.floor(ly), 1, 1).data[3];
      return a > 0;
    } catch (err) {
      return true;
    }
  }

  var swallowClick = false;
  if (canDrag) {
    document.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button !== 0 || !hitCat(e)) return;
        e.preventDefault();
        swallowClick = true;
        grab = { dx: e.clientX - S.x, dy: e.clientY - (S.y - 20 * SCALE), lastX: e.clientX, lastY: e.clientY };
        S.vx = S.vy = 0;
        S.shake.flips = 0;
        setState("held");
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
      // Throw with the pointer's velocity
      S.vx = Math.max(-40, Math.min(40, pointer.vx));
      S.vy = Math.max(-30, Math.min(30, pointer.vy));
      setState("fall");
    };
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
  }

  function dragMove(e) {
    // The head follows the hand; the body stretches toward it
    var hx = e.clientX - grab.dx;
    var hy = e.clientY - grab.dy;
    S.x = Math.max(edgeMin(), Math.min(edgeMax(), hx));
    S.y = Math.max(bodyH, Math.min(floorY(), hy + 20 * SCALE));
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

  /* ---------------------------------------------------------------- loop */
  var last = performance.now();
  var raf = null;

  function ease(cur, tgt, k) {
    return cur + (tgt - cur) * k;
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var t = now;

    // eased channels
    A.step = ease(A.step, T.step, 0.2);
    A.sleep = ease(A.sleep, T.sleep, 0.08);
    A.dangle = ease(A.dangle, T.dangle, 0.2);
    A.ear = ease(A.ear, T.ear, 0.15);
    A.headUp = ease(A.headUp, T.headUp, 0.15);

    var st = S.state;
    var near = pointer.x >= 0 ? Math.hypot(pointer.x - S.x, pointer.y - (S.y - 27 * SCALE)) : 9999;

    if (st === "idle") {
      // look around, twitch an ear now and then, blink, maybe nap
      if (now > S.earAt) {
        T.ear = Math.random() < 0.5 ? 2 : 0;
        S.earAt = now + 900 + Math.random() * 2500;
        window.setTimeout(function () {
          T.ear = 0;
        }, 220);
      }
      if (now > S.until) {
        var idleFor = now - S.idleSince;
        if (idleFor > 14000 && Math.random() < 0.35) setState("sleep", 9000 + Math.random() * 9000);
        else startWalk();
      }
      // a fast cursor swinging past gets a chase
      if (Math.abs(pointer.vx) > 30 && Math.abs(pointer.x - S.x) > 120 && pointer.y > S.y - 260) {
        S.targetX = Math.max(edgeMin(), Math.min(edgeMax(), pointer.x));
        pose.facing = S.targetX >= S.x ? 1 : -1;
        setState("chase", 1600);
      }
    } else if (st === "walk" || st === "chase") {
      var speed = st === "chase" ? SPEED * 2.6 : SPEED;
      var dx = S.targetX - S.x;
      var move = Math.min(Math.abs(dx), speed * dt) * Math.sign(dx);
      S.x += move;
      S.walked += Math.abs(move);
      pose.legPhase = (S.walked / 22) % 1;
      if (Math.abs(dx) < 1.5 || (st === "chase" && now > S.until)) {
        if (st === "chase") kick(1.12, 0.88);
        startIdle();
      }
    } else if (st === "sleep") {
      if (now > S.until || near < 90) {
        kick(1.08, 0.92);
        startIdle();
      }
    } else if (st === "held") {
      // mochi stretch: elongate toward the hand, skew by hand velocity
      var vv = Math.hypot(pointer.vx, pointer.vy);
      var stretch = Math.min(0.5, vv / 70);
      pose.sy = ease(pose.sy, 1 + stretch + 0.08, 0.3);
      pose.sx = ease(pose.sx, 1 - stretch * 0.45, 0.3);
      pose.tilt = ease(pose.tilt, Math.max(-0.5, Math.min(0.5, (pointer.vx / 120) * pose.facing)), 0.25);
      if (Math.abs(pointer.vx) > 4) pose.facing = pointer.vx > 0 ? 1 : -1;
    } else if (st === "fall") {
      S.vy += 1.6; // gravity (px per frame-ish)
      S.x += S.vx;
      S.y += S.vy;
      S.vx *= 0.995;
      // walls
      if (S.x < edgeMin()) {
        S.x = edgeMin();
        S.vx = -S.vx * 0.55;
      }
      if (S.x > edgeMax()) {
        S.x = edgeMax();
        S.vx = -S.vx * 0.55;
      }
      var spin = Math.hypot(S.vx, S.vy) > 12;
      pose.tilt += spin ? S.vx * 0.012 : -pose.tilt * 0.15;
      if (S.y >= floorY()) {
        S.y = floorY();
        if (Math.abs(S.vy) > 5) {
          S.vy = -S.vy * 0.42;
          S.vx *= 0.7;
          kick(1.3, 0.7); // oof
        } else {
          S.vy = 0;
          S.vx = 0;
          pose.tilt = 0;
          kick(1.2, 0.8);
          startIdle();
        }
      }
    }

    // keep on the floor unless airborne or held
    if (st !== "held" && st !== "fall") S.y = floorY();

    // blink
    if (st !== "sleep" && now > S.blinkAt) {
      pose.blink = 1;
      S.blinkAt = now + 2500 + Math.random() * 4000;
      window.setTimeout(function () {
        pose.blink = 0;
      }, 120);
    }

    // squash spring (landing, wake-ups)
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
      if (st !== "fall") pose.tilt = ease(pose.tilt, 0, 0.2);
    }

    // shake wobble
    if (S.wobbleUntil > now) {
      var k = (S.wobbleUntil - now) / 1000;
      pose.tilt += Math.sin(now / 45) * 0.18 * k;
    }

    // breathing, walking bob, tail
    var breathe = st === "sleep" ? Math.sin(t / 900) * 0.8 : Math.sin(t / 650) * 0.4;
    pose.bob = breathe + (A.step > 0.1 ? -Math.abs(Math.sin(pose.legPhase * Math.PI * 2)) * 1.4 * A.step : 0);
    pose.tail = Math.sin(t / (st === "walk" || st === "chase" ? 160 : st === "sleep" ? 1400 : 420)) * (st === "sleep" ? 0.4 : 1);
    pose.step = A.step;
    pose.sleep = A.sleep;
    pose.dangle = A.dangle;
    pose.ear = A.ear;
    pose.headUp = A.headUp;

    // eyes follow the cursor (or look down at the hand while held)
    if (st === "held") {
      pose.pupilX = 0;
      pose.pupilY = 1.2;
    } else if (pointer.x >= 0 && st !== "sleep") {
      var ex = S.x, ey = S.y - 27 * SCALE;
      var ddx = pointer.x - ex, ddy = pointer.y - ey;
      var d = Math.hypot(ddx, ddy) || 1;
      var reach = Math.min(1, d / 140);
      pose.pupilX = (ddx / d) * 1.3 * reach * pose.facing;
      pose.pupilY = (ddy / d) * 1.3 * reach;
    }

    placeCanvas();
    render(pose, t);
    raf = window.requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------------- start */
  function initialX() {
    // Desktop: far right, where the column has run out of text. Phones: far
    // left, away from the back-to-top control.
    var x = small ? edgeMin() + 4 : edgeMax() - 4;
    if (!coversText(x)) return x;
    // otherwise walk inward until a clear spot shows up
    for (var i = 1; i < 12; i++) {
      var cand = small ? x + i * 30 : x - i * 30;
      if (!coversText(cand)) return cand;
    }
    return x;
  }

  S.x = initialX();
  S.y = floorY();
  S.blinkAt = performance.now() + 1500;
  pose.facing = small ? 1 : -1;
  placeCanvas();
  render(pose, performance.now());
  canvas.classList.add("cat--ready");

  window.addEventListener("resize", function () {
    small = window.innerWidth < 1024;
    S.x = Math.max(edgeMin(), Math.min(edgeMax(), S.x));
    if (S.state !== "held" && S.state !== "fall") S.y = floorY();
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
    // Sits still; eyes and the odd blink only
    setState("idle", Infinity);
    (function still() {
      var now = performance.now();
      if (pointer.x >= 0) {
        var ddx = pointer.x - S.x, ddy = pointer.y - (S.y - 27 * SCALE);
        var d = Math.hypot(ddx, ddy) || 1;
        pose.pupilX = (ddx / d) * 1.3 * pose.facing;
        pose.pupilY = (ddy / d) * 1.3;
      }
      render(pose, now);
      window.setTimeout(still, 200);
    })();
    return;
  }

  setState("idle", 2500);
  raf = window.requestAnimationFrame(frame);
})();

/* Kim De Guzman — portfolio
   Kuro state machine + DOM wiring. Drawing lives in js/kuro-render.js
   (window.KuroRender); this file owns behaviour: which pixel frame to show
   and when, the speech bubble and scroll note, and every cursor / scroll /
   drag listener.

   States: idle, walk, wave, groom (wash), scratch, curious, stretch, yawn,
   sleep, wake, startle, hunt, pounce, held, drop, happy, purr, knead, peek,
   claw. The idle chain (sit -> wash / scratch / yawn -> nap) and waking
   with an alert "!" follow the classic desktop-pet cat; waypoint timing
   follows the oneko.js pattern (adryd325, MIT). No dependencies. The page
   works without it. */
(function () {
  "use strict";

  var Render = window.KuroRender;
  if (!Render) return; // js/kuro-render.js failed to load; the page still works

  var host = document.querySelector(".content");
  if (!host) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var small = window.innerWidth < 1024;
  var canDrag = !coarse && !small && !reduceMotion;

  // Screen px per logical px on the 32x32 grid: 160px box on desktop,
  // 96px on phones.
  var SCALE = small ? 3 : 5;
  var CX = Render.CX, BY = Render.BY, PAD = Render.PAD;

  /* =========================================================== MOUNT ==== */
  var layers = Render.mount(SCALE);
  host.appendChild(layers.bodyCanvas);
  host.appendChild(layers.eyeCanvas);

  var bubble = document.createElement("div");
  bubble.className = "kuro-bubble";
  bubble.setAttribute("aria-hidden", "true");
  host.appendChild(bubble);

  var paper = document.createElement("div");
  paper.className = "kuro-paper";
  paper.setAttribute("aria-hidden", "true");
  paper.innerHTML = '<span class="kuro-paper__text"></span>';
  host.appendChild(paper);
  var paperText = paper.querySelector(".kuro-paper__text");

  /* ========================================================== STATE ==== */
  var pose = Render.defaultPose();
  var S = {
    state: "idle",
    x: 0, // paw centre, container px
    y: 0, // paw baseline, container px
    tx: 0,
    ty: 0,
    after: "idle",
    until: 0,
    walked: 0,
    blinkUntil: 0,
    blinkAt: 0,
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
  var grab = null;
  var SPEED = small ? 60 : 95; // px per second walking
  var halfW = CX * SCALE;
  var bodyH = 30 * SCALE;

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
  var PAPER_NOTES = ["scroll log: kneading along...", "still here. keep going!", "projects are further down.", "you scroll, I knead."];
  var paperIdx = 0;

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
  function placeLayers() {
    var t = "translate(" + (S.x - (PAD + CX) * SCALE).toFixed(1) + "px, " + (S.y - (PAD + BY) * SCALE).toFixed(1) + "px)";
    layers.bodyCanvas.style.transform = t;
    layers.eyeCanvas.style.transform = t;
  }

  var TEXTY = "p, h1, h2, h3, h4, li, a, button, figcaption, span, label, input, textarea, .pill, .label, .meta";
  function coversText(x, y) {
    var r = hostRect();
    var pts = [
      [x, y - 4 * SCALE],
      [x, y - 14 * SCALE],
      [x, y - 24 * SCALE],
      [x - 8 * SCALE, y - 12 * SCALE],
      [x + 8 * SCALE, y - 12 * SCALE]
    ];
    for (var i = 0; i < pts.length; i++) {
      var els = document.elementsFromPoint(r.left + pts[i][0], r.top + pts[i][1]);
      for (var j = 0; j < els.length; j++) {
        if (els[j] === layers.bodyCanvas || els[j] === layers.eyeCanvas || els[j] === bubble || els[j] === paper) continue;
        if (els[j].closest && els[j].closest(TEXTY)) return true;
        break;
      }
    }
    return false;
  }

  function pickWaypoint() {
    var b = visibleBox();
    var radius = small ? 150 : 300;
    var oy = Math.max(b.y0, Math.min(b.y1, S.y));
    for (var i = 0; i < 16; i++) {
      var x = Math.max(b.x0, Math.min(b.x1, S.x + (Math.random() * 2 - 1) * radius));
      var y = Math.max(b.y0, Math.min(b.y1, oy + (Math.random() * 2 - 1) * radius));
      if (Math.hypot(x - S.x, y - S.y) < 60) continue;
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

  /* ==================================================== STATE MACHINE === */
  function setState(st, ms) {
    S.state = st;
    S.until = performance.now() + (ms || 0);
    S.since = performance.now();
  }
  function startIdle(ms) {
    setState("idle", ms || 1600 + Math.random() * 3600);
  }
  function walkTo(pt, after) {
    S.tx = pt.x;
    S.ty = pt.y;
    S.after = after || "idle";
    setState("walk");
  }
  function kick(sx, sy) {
    S.squash.sx = sx;
    S.squash.sy = sy;
  }
  function wake() {
    setState("wake", 650);
    kick(1.08, 0.94);
  }

  // Which pixel frame each state shows. `alt(ms)` flips between the
  // "_a" and "_b" frames of a two-frame cycle.
  function alt(now, ms) {
    return Math.floor(now / ms) % 2 === 0 ? "_a" : "_b";
  }
  function runFrame(dx, dy) {
    var parity = Math.floor(S.walked / (2.6 * SCALE)) % 2 === 0 ? "_a" : "_b";
    if (Math.abs(dy) > Math.abs(dx) * 1.3) return (dy < 0 ? "run_up" : "run_down") + parity;
    if (Math.abs(dx) > 0.5) pose.facing = dx > 0 ? 1 : -1;
    return "run_side" + parity;
  }

  /* --------------------------------------------------------- bubble ---- */
  var bubbleUntil = 0;
  function say(text, ms) {
    bubble.textContent = text;
    bubbleUntil = performance.now() + (ms || 3200);
    bubbleSide.at = 0; // decide afresh for each new message
    placeBubble();
    if (bubbleUntil) bubble.classList.add("is-on");
  }
  // Would a bubble at (x, top) in container px sit on top of page text?
  function bubbleCoversText(x, top, bw, bh) {
    var r = hostRect();
    var pts = [
      [x + 4, top + 4],
      [x + bw - 4, top + 4],
      [x + 4, top + bh - 4],
      [x + bw - 4, top + bh - 4],
      [x + bw / 2, top + bh / 2]
    ];
    for (var i = 0; i < pts.length; i++) {
      var els = document.elementsFromPoint(r.left + pts[i][0], r.top + pts[i][1]);
      for (var j = 0; j < els.length; j++) {
        if (els[j] === bubble || els[j] === paper || els[j] === layers.bodyCanvas || els[j] === layers.eyeCanvas) continue;
        if (els[j].closest && els[j].closest(TEXTY)) return true;
        break;
      }
    }
    return false;
  }
  // Above his head by default; below his paws near the top of the view or
  // when that spot is clear and the upper one is not. If both would cover
  // text, the bubble stays hidden rather than block what you are reading.
  var bubbleSide = { at: 0, below: false };
  function placeBubble() {
    var r = hostRect();
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var x = S.x - bw / 2;
    x = Math.max(0, Math.min(r.width - bw, x));
    var above = S.y - 29 * SCALE - bh - 6;
    var below = S.y + 6;
    var now = performance.now();
    if (now >= bubbleSide.at) {
      // re-decide the side at most every 250ms; hit-testing is not free
      bubbleSide.at = now + 250;
      var viewTop = -r.top + 8;
      bubbleSide.below = false;
      if (above < viewTop || bubbleCoversText(x, above, bw, bh)) {
        bubbleSide.below = true;
        if (bubbleCoversText(x, below, bw, bh)) {
          bubble.classList.remove("is-on");
          bubbleUntil = 0;
          return;
        }
      }
    }
    var isBelow = bubbleSide.below;
    var top = isBelow ? below : above;
    bubble.classList.toggle("is-below", isBelow);
    var tailX = Math.max(10, Math.min(bw - 10, S.x - x));
    bubble.style.setProperty("--tail-x", tailX + "px");
    bubble.style.transform = "translate(" + x.toFixed(1) + "px, " + top.toFixed(1) + "px)";
  }
  function placePaper() {
    var r = hostRect();
    var pw = paper.offsetWidth;
    var x = Math.max(0, Math.min(r.width - pw, S.x - pw / 2));
    paper.style.transform = "translate(" + x.toFixed(1) + "px, " + (S.y + 4).toFixed(1) + "px)";
  }

  /* ---------------------------------------------------- hit test -------- */
  // The canvases are pointer-events:none; listeners live on document and
  // alpha-test the body canvas, so real links underneath always get clicks.
  function overKuro(cx, cy) {
    return Render.hitTest(layers.bodyCanvas, cx, cy);
  }
  function catCenter() {
    var r = hostRect();
    var side = /^(run_side|crouch|stretch)/.test(pose.frame);
    return { x: r.left + S.x + (side ? 6 * SCALE * pose.facing : 0), y: r.top + S.y - 18 * SCALE };
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
      else maybeReact(now);
      if (reduceMotion) updateEyesOnly();
    },
    { passive: true }
  );

  function maybeReact(now) {
    lastActivity = now;
    if (reduceMotion) return;
    var cc = catCenter();
    var d = Math.hypot(pointer.x - cc.x, pointer.y - cc.y);
    if (S.state === "peek") return leavePeek();
    if (S.state === "sleep" || S.state === "yawn") {
      if (d < 220) wake(); // the cursor comes close: wakes with a start
      return;
    }
    if (S.state === "held" || S.state === "startle" || S.state === "hunt" || S.state === "pounce" || S.state === "wake") return;
    var speed = Math.hypot(pointer.vx, pointer.vy);
    if (speed < 38) return;
    if (d < 110 && now - S.startleAt > 4000) {
      // Startle: a fast cursor passing close by
      S.startleAt = now;
      S.jumpV = -2.2;
      pose.facing = pointer.x < cc.x ? -1 : 1;
      setState("startle", 750);
      bubble.classList.remove("is-on");
    } else if (d >= 110 && d < 380 && now - S.huntAt > 9000 && /^(idle|walk|curious|groom|scratch|stretch|drop)$/.test(S.state)) {
      // Mouse hunt: crouch, tail twitching, then pounce where the cursor was
      S.huntAt = now;
      var r = hostRect();
      var b = visibleBox();
      S.tx = Math.max(b.x0, Math.min(b.x1, pointer.x - r.left));
      S.ty = Math.max(b.y0, Math.min(b.y1, pointer.y - r.top + 12 * SCALE));
      pose.facing = S.tx >= S.x ? 1 : -1;
      setState("hunt", 600);
      bubble.classList.remove("is-on");
    }
  }
  function leavePeek() {
    if (S.state !== "peek") return;
    var b = visibleBox();
    walkTo({ x: Math.max(b.x0, Math.min(b.x1, S.x + (S.x < hostRect().width / 2 ? 110 : -110))), y: S.y }, "idle");
  }

  var swallowClick = false;
  if (canDrag) {
    document.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button !== 0 || !overKuro(e.clientX, e.clientY)) return;
        e.preventDefault();
        swallowClick = true;
        var r = hostRect();
        grab = { dx: e.clientX - r.left - S.x, dy: e.clientY - r.top - (S.y - 22 * SCALE), feet: S.y };
        S.shake.flips = 0;
        setState("held");
        bubble.classList.remove("is-on");
        paper.classList.remove("is-open");
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
      S.jumpV = Math.max(-1.5, Math.min(2, pointer.vy * 0.12));
      pose.lift = 3;
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
    S.y = Math.max(b.y0, Math.min(r.height - 4, hy + 22 * SCALE));
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
  if (!reduceMotion) {
    window.addEventListener(
      "scroll",
      function () {
        var now = performance.now();
        lastActivity = now;
        lastScroll = now;
        if (S.state === "peek") return leavePeek();
        if (S.state === "sleep" || S.state === "yawn") return wake();
        var vb = visibleBox();
        var onScreen = S.y >= vb.y0 - 10 && S.y <= vb.y1 + 10;
        var calm = S.state === "idle" || S.state === "knead" || S.state === "curious" || S.state === "groom" || S.state === "scratch";
        if (!onScreen) {
          // Scrolled out of view: come back before doing anything else
          if (calm) {
            paper.classList.remove("is-open");
            var wp0 = pickWaypoint();
            if (wp0) walkTo(wp0, "idle");
          }
        } else if (calm) {
          if (S.state !== "knead") {
            setState("knead", 0);
            paperText.textContent = PAPER_NOTES[paperIdx++ % PAPER_NOTES.length];
            paper.classList.add("is-open");
            bubble.classList.remove("is-on");
          }
        }
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
    if (now - pointer.at > 60) {
      // the mouse is resting: let its measured speed settle
      pointer.vx *= 0.8;
      pointer.vy *= 0.8;
    }
    var st = S.state;
    var eyeMode = "open";
    var mark = null;
    var fr = "sit";
    pose.pivotY = BY;

    if (st === "idle") {
      if (!reduceMotion && now - lastActivity > 45000) {
        // Peek mode: nobody around, tuck against the nearest column edge
        var bb = visibleBox();
        var edgeX = S.x < hostRect().width / 2 ? bb.x0 - 8 * SCALE : bb.x1 + 8 * SCALE;
        walkTo({ x: edgeX, y: S.y }, "peek");
        lastActivity = now + 3600000; // until real activity resets it
      } else if (now > S.until) {
        var roll = Math.random();
        if (roll < 0.1) setState("stretch", 1400);
        else if (roll < 0.24) setState("groom", 2400 + Math.random() * 1200);
        else if (roll < 0.34) setState("scratch", 1300 + Math.random() * 700);
        else if (roll < 0.44) setState("curious", 1400 + Math.random() * 1000);
        else if (roll < 0.5) setState("yawn", 1300);
        else if (roll < 0.52 && now - S.cornerAt > 60000) {
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
      if (now > S.bubbleAt && bubbleUntil < now) {
        say(MESSAGES[S.msg % MESSAGES.length]);
        S.msg += 1;
        S.bubbleAt = now + 12000 + Math.random() * 14000;
      }
      fr = "sit";
    } else if (st === "walk" || st === "pounce") {
      var speed = st === "pounce" ? SPEED * 3.4 : SPEED;
      var dx = S.tx - S.x, dy = S.ty - S.y;
      var d = Math.hypot(dx, dy);
      var step = Math.min(d, speed * dt);
      if (d > 0.5) {
        S.x += (dx / d) * step;
        S.y += (dy / d) * step;
        S.walked += step;
      }
      fr = runFrame(dx, dy);
      if (st === "pounce") eyeMode = "wide";
      if (d <= 1 || (st === "pounce" && now > S.until)) {
        if (st === "pounce") {
          kick(1.2, 0.84);
          startIdle(1400);
        } else if (S.after === "corner") {
          setState("claw", 1600);
        } else if (S.after === "peek") {
          pose.facing = S.x < hostRect().width / 2 ? 1 : -1;
          setState("peek", 0);
        } else startIdle();
      }
    } else if (st === "wave") {
      fr = "wave" + alt(now, 220);
      if (now > S.until) startIdle();
    } else if (st === "groom") {
      fr = "wash" + alt(now, 280);
      if (now > S.until) startIdle(900 + Math.random() * 1500);
    } else if (st === "scratch") {
      fr = "scratch" + alt(now, 110);
      if (now > S.until) startIdle(900);
    } else if (st === "curious") {
      fr = "alert";
      if (now > S.until) startIdle(600);
    } else if (st === "stretch") {
      fr = "stretch";
      if (now > S.until) startIdle(700);
    } else if (st === "yawn") {
      fr = "yawn";
      if (now > S.until) setState("sleep", 8000 + Math.random() * 9000);
    } else if (st === "sleep") {
      fr = "sleep" + alt(now, 900);
      mark = "z";
      if (now > S.until) wake();
    } else if (st === "wake") {
      fr = "alert";
      eyeMode = "wide";
      mark = "!";
      if (now > S.until) startIdle(900);
    } else if (st === "startle") {
      fr = "alert";
      eyeMode = "wide";
      mark = "!";
      if (now > S.until) startIdle(1200);
    } else if (st === "hunt") {
      fr = "crouch" + alt(now, 90);
      eyeMode = "wide";
      if (now > S.until) {
        S.jumpV = -1.4;
        setState("pounce", 900);
      }
    } else if (st === "held") {
      fr = "held";
      pose.pivotY = 3; // hangs from the scruff, so the stretch goes downward
      var vv = Math.hypot(pointer.vx, pointer.vy);
      var stretch = Math.min(0.55, vv / 60 + Math.max(0, (S.y - grab.feet) / 900));
      pose.sy = ease(pose.sy, 1 + stretch + 0.06, 0.3);
      pose.sx = ease(pose.sx, 1 - stretch * 0.45, 0.3);
      pose.tilt = ease(pose.tilt, Math.max(-0.5, Math.min(0.5, pointer.vx / 110)), 0.25);
    } else if (st === "drop") {
      fr = "sit";
      if (now > S.until) startIdle();
    } else if (st === "happy") {
      fr = "sit";
      eyeMode = "happy";
      if (now > S.until) setState("purr", 0);
    } else if (st === "purr") {
      fr = "sit";
      eyeMode = "squint";
      if (!(pointer.x >= 0 && overKuro(pointer.x, pointer.y))) startIdle(900);
      if (Math.random() < 0.025) spawnHeart();
    } else if (st === "knead") {
      fr = "knead" + alt(now, 300);
      eyeMode = "squint";
      if (now - lastScroll > 1500) {
        paper.classList.remove("is-open");
        startIdle(900);
      }
    } else if (st === "peek") {
      fr = "peek";
    } else if (st === "claw") {
      fr = "claw" + alt(now, 120);
      if (now > S.until) {
        pose.facing = S.x < hostRect().width / 2 ? 1 : -1; // turn back to the page
        startIdle(6000 + Math.random() * 6000);
      }
    }

    // hop (startle, pounce take-off, drop landing), in grid cells
    if (S.jumpV !== 0 || pose.lift > 0) {
      pose.lift -= S.jumpV;
      S.jumpV += 0.35;
      if (pose.lift <= 0) {
        pose.lift = 0;
        if (S.jumpV > 0.8) kick(1.22, 0.8);
        S.jumpV = 0;
      }
    }

    // petting: cursor resting on the cat for ~1.3s
    if (!reduceMotion && canDrag && st !== "held" && pointer.x >= 0 && overKuro(pointer.x, pointer.y) && Math.hypot(pointer.vx, pointer.vy) < 6) {
      S.hoverMs += dt * 1000;
      if (S.hoverMs > 1300 && now - S.petAt > 6000 && st !== "happy" && st !== "purr") {
        S.petAt = now;
        setState("happy", 900);
        kick(1.08, 0.94);
        for (var hh = 0; hh < 5; hh++) spawnHeart();
        if (Math.random() < 0.5) say("purr...", 1800);
      }
    } else {
      S.hoverMs = 0;
    }

    // blink now and then while sitting with eyes open
    if (eyeMode === "open" && fr === "sit") {
      if (now > S.blinkAt) {
        S.blinkUntil = now + 140;
        S.blinkAt = now + 2600 + Math.random() * 4000;
      }
      if (now < S.blinkUntil) eyeMode = "blink";
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

    pose.frame = fr;
    pose.eyeMode = eyeMode;
    pose.mark = mark;
    pose.markPhase = (now / 2400) % 1;
    updatePupils(st);

    placeLayers();
    layers.drawBody(pose, SCALE);
    layers.drawEyes(pose, SCALE);
    drawHearts(dt);

    if (paper.classList.contains("is-open")) placePaper();
    if (bubbleUntil > now && st !== "held") placeBubble();
    else if (bubble.classList.contains("is-on")) bubble.classList.remove("is-on");

    raf = window.requestAnimationFrame(frame);
  }

  // Eye follow: pupils track the cursor in every state with open eyes;
  // look down at the hand while held, up and forward while curious.
  function updatePupils(st) {
    if (st === "held") {
      pose.pupilX = 0;
      pose.pupilY = 1;
    } else if (st === "curious") {
      pose.pupilX = pose.facing;
      pose.pupilY = -1;
    } else if (pointer.x >= 0) {
      var cc = catCenter();
      var ddx = pointer.x - cc.x, ddy = pointer.y - cc.y;
      var dd = Math.hypot(ddx, ddy) || 1;
      var reach = Math.min(1, dd / 60);
      pose.pupilX = (ddx / dd) * 1.4 * reach;
      pose.pupilY = (ddy / dd) * 1.4 * reach;
    }
  }

  // Reduced motion: no rAF loop at all. The body is drawn once; only the
  // eye canvas redraws, directly from the pointermove listener.
  function updateEyesOnly() {
    updatePupils(S.state);
    layers.drawEyes(pose, SCALE);
  }

  // Pixel hearts drift up beside the head while purring
  function spawnHeart() {
    var side = Math.random() < 0.5 ? -1 : 1;
    S.hearts.push({ x: side * (4 + Math.random() * 7), y: 1 + Math.random() * 3, t: 0, d: 1100 + Math.random() * 500 });
  }
  function drawHearts(dt) {
    if (!S.hearts.length) return;
    var ctx = layers.bodyCtx;
    ctx.setTransform(SCALE, 0, 0, SCALE, PAD * SCALE, PAD * SCALE);
    ctx.fillStyle = Render.COLORS.MARK;
    var cells = [
      [-1, 0], [1, 0],
      [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
      [-1, 2], [0, 2], [1, 2],
      [0, 3]
    ];
    var keep = [];
    for (var i = 0; i < S.hearts.length; i++) {
      var h = S.hearts[i];
      h.t += dt * 1000;
      if (h.t > h.d) continue;
      var y = h.y - (h.t / h.d) * 9;
      var x = CX + h.x + Math.sin(h.t / 160) * 1.2;
      for (var c = 0; c < cells.length; c++) ctx.fillRect(Math.round(x + cells[c][0]), Math.round(y + cells[c][1]), 1, 1);
      keep.push(h);
    }
    S.hearts = keep;
  }

  /* ---------------------------------------------------------- start ---- */
  function initialSpot() {
    var b = visibleBox();
    var hero = host.querySelector(".hero");
    var y = hero ? Math.min(b.y1, hero.offsetTop + hero.offsetHeight - 6) : b.y1;
    var xs = small ? [b.x1, b.x1 - 60, b.x0] : [b.x1, b.x1 - 90, b.x1 - 180, b.x0];
    for (var i = 0; i < xs.length; i++) if (!coversText(xs[i], y)) return { x: xs[i], y: y };
    return { x: b.x1, y: y };
  }
  var s0 = initialSpot();
  S.x = s0.x;
  S.y = s0.y;
  pose.facing = -1;
  S.blinkAt = performance.now() + 1500;
  S.bubbleAt = performance.now() + 2500;
  placeLayers();
  layers.drawBody(pose, SCALE);
  layers.drawEyes(pose, SCALE);
  layers.bodyCanvas.classList.add("is-ready");
  layers.eyeCanvas.classList.add("is-ready");

  window.addEventListener("resize", function () {
    var b = visibleBox();
    S.x = Math.max(b.x0, Math.min(b.x1, S.x));
    placeLayers();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf && !reduceMotion) {
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    }
  });

  if (reduceMotion) {
    // Static: drawn once, says hello once, then only the eye layer redraws
    // from the pointermove listener above. No rAF loop.
    setState("idle", Infinity);
    say(MESSAGES[0], 4000);
    placeBubble();
    window.setTimeout(function () {
      bubble.classList.remove("is-on");
    }, 4000);
    return;
  }

  // Say hello with a wave first
  setState("wave", 1800);
  say(MESSAGES[0], 3000);
  S.msg = 1;
  S.bubbleAt = performance.now() + 12000;
  raf = window.requestAnimationFrame(frame);
})();

/* Kim De Guzman — portfolio
   A small black cat that lives inside the content column: it wanders to
   random spots near the reader, sits and idles, follows the cursor with its
   eyes, and can be picked up and stretched like mochi.

   Original artwork drawn as SVG so the pupils and tail animate as parts.
   The roam / idle timing loop follows the pattern of oneko.js
   (adryd325/oneko.js, MIT); everything else is written for this site.
   No dependencies. The page works without it. */
(function () {
  "use strict";

  var host = document.querySelector(".content");
  if (!host) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var small = window.innerWidth < 1024;
  var canDrag = !coarse && !small && !reduceMotion;
  var SIZE = small ? 44 : 64;

  /* ----------------------------------------------------------- artwork */
  // One silhouette drawn twice: a light, thick-stroked copy underneath for
  // the outline, then the black fill on top. Pupils and whiskers sit above.
  function silhouette(cls) {
    return (
      '<g class="' + cls + '">' +
      // tail: curls up from behind the body
      '<path class="cat__tail" d="M45 53 C58 54 63 43 56 38 C51 35 48 40 51 42" />' +
      // body
      '<path class="cat__body" d="M18 57 C17 44 24 37 32 37 C40 37 47 44 46 57 Z" />' +
      // feet
      '<ellipse cx="25" cy="57" rx="5.5" ry="3" />' +
      '<ellipse cx="39" cy="57" rx="5.5" ry="3" />' +
      // ears (rounded triangles)
      '<path d="M17 24 L15 7 C14.8 5.4 16.6 4.6 17.8 5.7 L30 15 Z" />' +
      '<path d="M47 24 L49 7 C49.2 5.4 47.4 4.6 46.2 5.7 L34 15 Z" />' +
      // head
      '<circle cx="32" cy="25" r="16" />' +
      "</g>"
    );
  }

  var svg =
    '<svg class="cat__svg" viewBox="0 0 64 64" width="' + SIZE + '" height="' + SIZE + '" aria-hidden="true" focusable="false">' +
    silhouette("cat__outline") +
    silhouette("cat__fill") +
    // eyes
    '<g class="cat__eyes">' +
    '<circle class="cat__eye" cx="25.5" cy="26" r="3.8" />' +
    '<circle class="cat__eye" cx="38.5" cy="26" r="3.8" />' +
    '<g class="cat__pupils">' +
    '<circle class="cat__pupil" cx="25.5" cy="26" r="2.2" />' +
    '<circle class="cat__pupil" cx="38.5" cy="26" r="2.2" />' +
    '<circle class="cat__glint" cx="26.4" cy="25.1" r="0.8" />' +
    '<circle class="cat__glint" cx="39.4" cy="25.1" r="0.8" />' +
    "</g>" +
    "</g>" +
    // whiskers
    '<g class="cat__whiskers">' +
    '<path d="M9 28 L16 29 M9.5 32 L16 31.5" />' +
    '<path d="M55 28 L48 29 M54.5 32 L48 31.5" />' +
    "</g>" +
    "</svg>";

  var cat = document.createElement("div");
  cat.className = "cat";
  cat.innerHTML = svg;
  cat.setAttribute("aria-hidden", "true");
  if (canDrag) cat.classList.add("cat--draggable");
  host.appendChild(cat);

  var pupils = cat.querySelector(".cat__pupils");
  var body = cat.querySelector(".cat__svg");

  /* ------------------------------------------------------------ state */
  var pos = { x: 0, y: 0 }; // container coordinates (top-left of the cat)
  var target = null;
  var facing = 1; // 1 = right, -1 = left
  var idleUntil = 0;
  var mode = "idle"; // idle | walk | held | settle
  var SPEED = small ? 1.4 : 2.2; // px per frame
  var pointer = { x: -1, y: -1 };
  var raf = null;

  function hostRect() {
    return host.getBoundingClientRect();
  }

  // The part of the container the reader can see right now
  function visibleBox() {
    var r = hostRect();
    var top = Math.max(0, -r.top);
    var bottom = Math.min(r.height, window.innerHeight - r.top);
    return { x0: 0, x1: Math.max(0, r.width - SIZE), y0: top, y1: Math.max(top, bottom - SIZE) };
  }

  function overlapsInteractive(x, y) {
    var r = hostRect();
    var cx = r.left + x + SIZE / 2;
    var cy = r.top + y + SIZE / 2;
    var els = document.elementsFromPoint(cx, cy);
    for (var i = 0; i < els.length; i++) {
      if (els[i] === cat || cat.contains(els[i])) continue;
      if (els[i].closest && els[i].closest("a, button, [tabindex], input, textarea, select")) return true;
      break;
    }
    return false;
  }

  function place(x, y) {
    pos.x = x;
    pos.y = y;
    cat.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
  }

  function setFacing(dir) {
    if (dir === facing) return;
    facing = dir;
    body.style.transform = "scaleX(" + facing + ")";
  }

  function pickTarget() {
    var box = visibleBox();
    // Keep the wander radius modest so the cat feels like it is pottering
    // about, not sprinting across the page
    var radius = small ? 140 : 260;
    for (var tries = 0; tries < 12; tries++) {
      var x = Math.min(box.x1, Math.max(box.x0, pos.x + (Math.random() * 2 - 1) * radius));
      var y = Math.min(box.y1, Math.max(box.y0, pos.y + (Math.random() * 2 - 1) * radius));
      if (Math.hypot(x - pos.x, y - pos.y) < 60) continue;
      if (overlapsInteractive(x, y)) continue;
      return { x: x, y: y };
    }
    return null;
  }

  function startIdle() {
    mode = "idle";
    target = null;
    cat.classList.remove("cat--walk");
    // Sit for a while: short pauses mostly, a long nap now and then
    idleUntil = performance.now() + 2200 + Math.random() * 4800 + (Math.random() < 0.2 ? 6000 : 0);
  }

  function startWalk() {
    target = pickTarget();
    if (!target) return startIdle();
    mode = "walk";
    cat.classList.add("cat--walk");
    setFacing(target.x >= pos.x ? 1 : -1);
  }

  /* -------------------------------------------------------- eye follow */
  function updateEyes() {
    if (pointer.x < 0) return;
    var r = cat.getBoundingClientRect();
    var ex = r.left + r.width / 2;
    var ey = r.top + r.height * 0.4;
    var dx = pointer.x - ex;
    var dy = pointer.y - ey;
    var d = Math.hypot(dx, dy) || 1;
    var reach = Math.min(1, d / 160); // pupils drift further the farther the cursor is
    var max = 1.5; // viewBox units
    var px = (dx / d) * max * reach * facing; // compensate for the flipped body
    var py = (dy / d) * max * reach;
    pupils.style.transform = "translate(" + px.toFixed(2) + "px, " + py.toFixed(2) + "px)";
  }

  document.addEventListener(
    "pointermove",
    function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (mode !== "held") updateEyes();
    },
    { passive: true }
  );

  /* -------------------------------------------------------- mochi drag */
  var grab = null; // { dx, dy, lastX, lastY, lastT, vx, vy, flips, lastSign }
  var spring = { sx: 1, sy: 1, skew: 0, vsx: 0, vsy: 0, vskew: 0 };
  var wobbleUntil = 0;

  function applyStretch(sx, sy, skew) {
    body.style.transform =
      "scaleX(" + facing + ") skewX(" + skew.toFixed(2) + "deg) scale(" + sx.toFixed(3) + ", " + sy.toFixed(3) + ")";
  }

  if (canDrag) {
    cat.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      cat.setPointerCapture(e.pointerId);
      var r = hostRect();
      grab = {
        dx: e.clientX - r.left - pos.x,
        dy: e.clientY - r.top - pos.y,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
        vx: 0,
        vy: 0,
        flips: 0,
        lastSign: 0,
        flipT: 0
      };
      mode = "held";
      target = null;
      cat.classList.remove("cat--walk");
      cat.classList.add("cat--held");
      pupils.style.transform = "translate(0px, 1.2px)"; // looks down, a little worried
    });

    cat.addEventListener("pointermove", function (e) {
      if (!grab) return;
      var now = performance.now();
      var dt = Math.max(1, now - grab.lastT);
      var vx = ((e.clientX - grab.lastX) / dt) * 16;
      var vy = ((e.clientY - grab.lastY) / dt) * 16;
      grab.vx = grab.vx * 0.6 + vx * 0.4;
      grab.vy = grab.vy * 0.6 + vy * 0.4;
      grab.lastX = e.clientX;
      grab.lastY = e.clientY;
      grab.lastT = now;

      // Shake detection: quick left-right reversals
      var sign = grab.vx > 4 ? 1 : grab.vx < -4 ? -1 : 0;
      if (sign && sign !== grab.lastSign) {
        if (grab.lastSign !== 0 && now - grab.flipT < 260) grab.flips += 1;
        else grab.flips = 0;
        grab.lastSign = sign;
        grab.flipT = now;
      }
      if (grab.flips >= 3) {
        wobbleUntil = now + 900;
        cat.classList.add("cat--wobble");
        grab.flips = 0;
      }

      var r = hostRect();
      var x = e.clientX - r.left - grab.dx;
      var y = e.clientY - r.top - grab.dy;
      x = Math.max(0, Math.min(r.width - SIZE, x));
      y = Math.max(0, Math.min(r.height - SIZE, y));
      place(x, y);

      // Stretch toward the direction of motion, capped so it stays cute
      var stretch = Math.min(0.35, Math.hypot(grab.vx, grab.vy) / 90);
      var sy = 1 + stretch;
      var sx = 1 - stretch * 0.55;
      var skew = Math.max(-16, Math.min(16, -grab.vx * 1.6 * facing));
      spring.sx = sx;
      spring.sy = sy;
      spring.skew = skew;
      applyStretch(sx, sy, skew);
    });

    var release = function (e) {
      if (!grab) return;
      try {
        cat.releasePointerCapture(e.pointerId);
      } catch (err) {}
      grab = null;
      cat.classList.remove("cat--held");
      mode = "settle";
      // give the spring a kick from the current stretch so it bounces back
      spring.vsx = 0;
      spring.vsy = 0;
      spring.vskew = 0;
      idleUntil = performance.now() + 1800;
    };
    cat.addEventListener("pointerup", release);
    cat.addEventListener("pointercancel", release);
  }

  function settleStep() {
    // Damped spring back to rest: scale 1, skew 0
    var k = 0.18;
    var damp = 0.72;
    spring.vsx += (1 - spring.sx) * k;
    spring.vsy += (1 - spring.sy) * k;
    spring.vskew += (0 - spring.skew) * k;
    spring.vsx *= damp;
    spring.vsy *= damp;
    spring.vskew *= damp;
    spring.sx += spring.vsx;
    spring.sy += spring.vsy;
    spring.skew += spring.vskew;
    applyStretch(spring.sx, spring.sy, spring.skew);
    var done =
      Math.abs(spring.sx - 1) < 0.004 &&
      Math.abs(spring.sy - 1) < 0.004 &&
      Math.abs(spring.skew) < 0.2 &&
      Math.abs(spring.vsy) < 0.004;
    if (done) {
      spring.sx = spring.sy = 1;
      spring.skew = 0;
      body.style.transform = "scaleX(" + facing + ")";
      startIdle();
    }
  }

  /* ------------------------------------------------------------- loop */
  function frame(now) {
    if (mode === "walk" && target) {
      var dx = target.x - pos.x;
      var dy = target.y - pos.y;
      var d = Math.hypot(dx, dy);
      if (d <= SPEED) {
        place(target.x, target.y);
        startIdle();
      } else {
        place(pos.x + (dx / d) * SPEED, pos.y + (dy / d) * SPEED);
      }
      updateEyes();
    } else if (mode === "idle") {
      if (now >= idleUntil) {
        // Only wander while the cat is on screen, so it does not run off
        var r = cat.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) startWalk();
        else idleUntil = now + 1500;
      }
    } else if (mode === "settle") {
      settleStep();
    }
    if (wobbleUntil && now > wobbleUntil) {
      wobbleUntil = 0;
      cat.classList.remove("cat--wobble");
    }
    raf = window.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ start */
  function initialSpot() {
    // Start beside the hero text, on the reader's side of the column
    var hero = host.querySelector(".hero");
    var box = visibleBox();
    var x = Math.min(box.x1, Math.max(0, hostRect().width * 0.42));
    var y = hero ? Math.max(0, hero.offsetTop + hero.offsetHeight - SIZE - 8) : 40;
    if (small) {
      x = Math.max(0, hostRect().width - SIZE - 8);
    }
    return { x: x, y: y };
  }

  var start = initialSpot();
  place(start.x, start.y);
  body.style.transform = "scaleX(1)";
  cat.classList.add("cat--ready");

  if (reduceMotion) {
    // Sits still; the eyes may still glance at the cursor
    mode = "idle";
    idleUntil = Infinity;
    return;
  }

  // Keep the cat inside the column if the layout changes size
  window.addEventListener("resize", function () {
    var r = hostRect();
    place(Math.min(pos.x, Math.max(0, r.width - SIZE)), Math.min(pos.y, Math.max(0, r.height - SIZE)));
  });

  // Pause the loop when the tab is hidden
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      raf = window.requestAnimationFrame(frame);
    }
  });

  startIdle();
  idleUntil = performance.now() + 1500;
  raf = window.requestAnimationFrame(frame);
})();

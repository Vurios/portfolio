/* Kim De Guzman — portfolio
   Kuro: a black cat who lives on the page. He sits on the page itself, so
   he scrolls with it and stays where he was left. Three modes, one click
   (or tap) each: wander (strolls to quiet spots on his own, never onto
   text or links, never toward your cursor), follow (chases the cursor) and
   stay (sits put). Dropping him after a drag also means "stay here". Rest
   the cursor on him to pet him, fling it past him to startle him.

   The idle / sleep / scratch behaviour and the sprite layout come from
   oneko.js by adryd (https://github.com/adryd325/oneko.js). Movement here
   is continuous (every animation frame) instead of oneko's 100ms hops.

   Sprite sheet: assets/kuro/jess.png — 256x128, 8 columns x 4 rows of
   32x32 cells, in oneko's standard layout (see spriteSets below).

   ---------------------------------------------------------------------------
   oneko.js is released under the MIT License:

   Copyright © 2022 adryd

   Permission is hereby granted, free of charge, to any person obtaining a
   copy of this software and associated documentation files (the
   "Software"), to deal in the Software without restriction, including
   without limitation the rights to use, copy, modify, merge, publish,
   distribute, sublicense, and/or sell copies of the Software, and to permit
   persons to whom the Software is furnished to do so, subject to the
   following conditions:

   The above copyright notice and this permission notice shall be included
   in all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
   OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
   NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
   OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
   USE OR OTHER DEALINGS IN THE SOFTWARE.
   --------------------------------------------------------------------------- */
(function () {
  "use strict";

  var SPRITE = "assets/kuro/jess.png";
  var STORE = "kuro";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var mobile = coarse || window.innerWidth < 1024;
  var SCALE = mobile ? 1.5 : 2; // screen px per sprite px (64px cat on desktop)
  var CELL = 32 * SCALE;
  var HALF = CELL / 2;
  var canFollow = !mobile && !reduceMotion; // following needs a hovering cursor
  var WANDER_SPEED = mobile ? 70 : 100; // px per second
  var FOLLOW_SPEED = 170;
  var HOLD_MS = 450; // press and hold this long to pick him up without moving

  // A click (tap) moves him on to the next mode
  var MODES = canFollow ? ["wander", "follow", "stay"] : ["wander", "stay"];
  var MODE_LINES = {
    wander: "Off exploring!",
    follow: "Following! Click to stop.",
    stay: "I'll stay here."
  };

  /* ------------------------------------------------ oneko sprite map ---- */
  // [x, y] cell offsets, negative, exactly as in oneko.js
  var spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
    scratchWallN: [[0, 0], [0, -1]],
    scratchWallS: [[-7, -1], [-6, -2]],
    scratchWallE: [[-2, -2], [-2, -3]],
    scratchWallW: [[-4, 0], [-4, -1]],
    tired: [[-3, -2]],
    sleeping: [[-2, 0], [-2, -1]],
    N: [[-1, -2], [-1, -3]],
    NE: [[0, -2], [0, -3]],
    E: [[-3, 0], [-3, -1]],
    SE: [[-5, -1], [-5, -2]],
    S: [[-6, -3], [-7, -2]],
    SW: [[-5, -3], [-6, -1]],
    W: [[-4, -2], [-4, -3]],
    NW: [[-1, 0], [-1, -1]]
  };

  /* ------------------------------------------------------- elements ---- */
  var el = document.createElement("div");
  el.className = "kuro";
  el.setAttribute("aria-hidden", "true");
  var sprite = document.createElement("div");
  sprite.className = "kuro__sprite";
  sprite.style.width = CELL + "px";
  sprite.style.height = CELL + "px";
  sprite.style.backgroundImage = "url(" + SPRITE + ")";
  sprite.style.backgroundSize = 256 * SCALE + "px " + 128 * SCALE + "px";
  el.appendChild(sprite);
  document.body.appendChild(el);

  var bubble = document.createElement("div");
  bubble.className = "kuro-bubble";
  bubble.setAttribute("aria-hidden", "true");
  document.body.appendChild(bubble);

  var topbar = document.querySelector(".topbar");

  /* ---------------------------------------------------------- state ---- */
  var saved = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(STORE)) || {};
  } catch (e) {
    saved = {};
  }

  var pos = { x: 0, y: 0 }; // centre of the cat, in page (document) px
  var mode = MODES.indexOf(saved.mode) >= 0 ? saved.mode : "wander";
  var cursor = { x: null, y: null, vx: 0, vy: 0, at: 0 }; // viewport px
  var moving = false;
  var wanderTarget = null;
  var wanderAt = performance.now() + 7000; // first stroll after saying hello
  var ticks = 0;
  var idleTime = 0;
  var idleAnimation = null;
  var idleAnimationFrame = 0;
  var alertTicks = 0; // show the alert pose for this many ticks
  var petTicks = 0; // content, eyes-closed pose after being petted
  var cell = [3, 3]; // current sprite cell (column, row), for hit-testing
  var walkClock = 0;
  var hoverMs = 0;
  var nearMs = 0;
  var petAt = -Infinity;
  var startleAt = 0;
  var held = null;
  var press = null;
  var holdTimer = 0;
  var settling = false;

  /* ------------------------------------------------------ geometry ---- */
  // He lives in page coordinates, so he scrolls with the page and stays
  // where he was left; only following makes him chase the viewport.
  var pageW = 0, pageH = 0;
  function measure() {
    pageW = document.documentElement.clientWidth;
    pageH = Math.max(document.body.offsetHeight, window.innerHeight);
  }
  function topInset() {
    return topbar ? Math.max(0, topbar.getBoundingClientRect().bottom) : 0;
  }
  function pageBounds() {
    return { x0: HALF, x1: pageW - HALF, y0: HALF, y1: pageH - HALF };
  }
  // The part of the page on screen right now
  function viewBounds() {
    var sy = window.scrollY;
    return { x0: HALF, x1: pageW - HALF, y0: sy + topInset() + HALF, y1: sy + window.innerHeight - HALF };
  }
  function clampTo(p, b) {
    return { x: Math.max(b.x0, Math.min(b.x1, p.x)), y: Math.max(b.y0, Math.min(b.y1, p.y)) };
  }
  function inView() {
    var b = viewBounds();
    return pos.y > b.y0 - CELL && pos.y < b.y1 + CELL;
  }
  function cursorPage() {
    return { x: cursor.x + window.scrollX, y: cursor.y + window.scrollY };
  }
  function place() {
    el.style.transform = "translate3d(" + Math.round(pos.x - HALF) + "px, " + Math.round(pos.y - HALF) + "px, 0)";
  }
  function setSprite(name, frame) {
    var s = spriteSets[name][frame % spriteSets[name].length];
    cell = [-s[0], -s[1]];
    sprite.style.backgroundPosition = s[0] * CELL + "px " + s[1] * CELL + "px";
  }
  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }
  function save() {
    try {
      window.localStorage.setItem(
        STORE,
        JSON.stringify({
          px: Math.round(pos.x),
          py: Math.round(pos.y),
          vx: pos.x / pageW,
          vy: (pos.y - window.scrollY) / window.innerHeight,
          mode: mode,
          hinted: !!saved.hinted
        })
      );
    } catch (e) {}
  }

  /* ------------------------------------- what is under a point ---- */
  var TEXTY = "p, h1, h2, h3, h4, li, a, button, figcaption, span, label, input, textarea, .pill, .label, .meta";
  var BUSY = TEXTY + ", img, svg, video, canvas, iframe, select";
  function isKuro(node) {
    return node === bubble || el.contains(node) || (node.classList && node.classList.contains("kuro-heart"));
  }
  function firstUnder(x, y) {
    var els = document.elementsFromPoint(x, y);
    for (var i = 0; i < els.length; i++) if (!isKuro(els[i])) return els[i];
    return null;
  }
  function hits(x, y, selector) {
    var n = firstUnder(x, y);
    return !!(n && n.closest && n.closest(selector));
  }
  // Would he sit on something you might want to read or click?
  function spotBusy(p) {
    var cx = p.x - window.scrollX, cy = p.y - window.scrollY;
    var r = HALF * 0.7;
    var pts = [[0, 0], [-r, -r], [r, -r], [-r, r], [r, r]];
    for (var i = 0; i < pts.length; i++) {
      var x = cx + pts[i][0], y = cy + pts[i][1];
      if (x < 0 || y < topInset() || x > window.innerWidth || y > window.innerHeight) return true;
      if (hits(x, y, BUSY)) return true;
    }
    return false;
  }

  /* ------------------------------------------------ oneko: idle ---- */
  function idle() {
    idleTime += 1;

    if (petTicks > 0) {
      petTicks -= 1;
      setSprite("tired", 0); // eyes closed, content
      return;
    }

    // every ~20 seconds
    if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation == null) {
      var b = viewBounds();
      var available = ["sleeping", "scratchSelf"];
      if (pos.x < b.x0 + 32) available.push("scratchWallW");
      if (pos.y < b.y0 + 32) available.push("scratchWallN");
      if (pos.x > b.x1 - 32) available.push("scratchWallE");
      if (pos.y > b.y1 - 32) available.push("scratchWallS");
      idleAnimation = available[Math.floor(Math.random() * available.length)];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) resetIdleAnimation();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        // two ticks per frame: a lazier scratch than oneko's
        setSprite(idleAnimation, Math.floor(idleAnimationFrame / 2));
        if (idleAnimationFrame > 19) resetIdleAnimation();
        break;
      default:
        setSprite("idle", 0);
        maybeChatter();
        return;
    }
    idleAnimationFrame += 1;
  }

  /* ------------------------------------------------ targets ---- */
  function currentTarget() {
    if (mode === "follow" && cursor.x !== null) return clampTo(cursorPage(), pageBounds());
    if (mode === "wander") return wanderTarget;
    return null;
  }
  // A stroll to a quiet spot on screen: not on text, links or images, and
  // not near your cursor. Null when there is nowhere good right now.
  function pickWander() {
    var b = viewBounds();
    var cp = cursor.x === null ? null : cursorPage();
    var reach = mobile ? 320 : 600;
    for (var i = 0; i < 24; i++) {
      var p = { x: b.x0 + Math.random() * (b.x1 - b.x0), y: b.y0 + Math.random() * (b.y1 - b.y0) };
      var d = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (d < 100 || d > reach) continue;
      if (cp && Math.hypot(p.x - cp.x, p.y - cp.y) < 180) continue;
      if (spotBusy(p)) continue;
      return p;
    }
    return null;
  }
  // Sitting on text or a link while your cursor works nearby: after a
  // moment he gets up and moves somewhere quieter. Heading straight for
  // him (to click or pet him) is quick enough that he stays.
  function keepOutOfTheWay() {
    if (cursor.x === null || petTicks || !inView()) {
      nearMs = 0;
      return;
    }
    var cp = cursorPage();
    var near = Math.hypot(cp.x - pos.x, cp.y - pos.y) < 150 && !overKuro(cursor.x, cursor.y);
    nearMs = near ? nearMs + 500 : 0;
    if (nearMs < 1500) return;
    nearMs = 0;
    if (!spotBusy(pos)) return;
    var p = pickWander();
    if (p) {
      wanderTarget = p;
      resetIdleAnimation();
    }
  }

  /* ------------------------------------ logic tick (oneko cadence) ---- */
  function tick() {
    ticks += 1;
    if (ticks % 10 === 0) measure();
    if (held || settling || press) return;

    if (alertTicks > 0) {
      alertTicks -= 1;
      moving = false;
      setSprite("alert", 0);
      return;
    }

    var now = performance.now();
    var t = currentTarget();
    var dist = t ? Math.hypot(pos.x - t.x, pos.y - t.y) : 0;
    var arrive = mode === "follow" ? 24 * SCALE : 4;

    if (!t || dist < arrive) {
      moving = false;
      if (wanderTarget) {
        wanderTarget = null;
        wanderAt = now + 8000 + Math.random() * 8000;
      }
      idle();
      if (mode === "wander" && idleAnimation == null && petTicks === 0) {
        if (now > wanderAt) {
          wanderAt = now + 4000; // try again later if nowhere is free
          if (inView()) wanderTarget = pickWander();
        } else if (ticks % 5 === 0) {
          keepOutOfTheWay();
        }
      }
      return;
    }

    // wandering toward where your cursor now is: pick somewhere else
    if (mode === "wander" && cursor.x !== null && ticks % 5 === 0) {
      var cp = cursorPage();
      if (Math.hypot(cp.x - t.x, cp.y - t.y) < 140) {
        wanderTarget = pickWander();
        if (!wanderTarget) {
          moving = false;
          return;
        }
      }
    }

    resetIdleAnimation();

    if (idleTime > 1) {
      setSprite("alert", 0);
      // count down after being alerted before moving
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      moving = false;
      return;
    }
    moving = true;
  }

  /* --------------------------------- smooth movement (every frame) ---- */
  function step(dt) {
    if (!moving || held || settling || press) return;
    var t = currentTarget();
    if (!t) {
      moving = false;
      return;
    }
    var dx = t.x - pos.x, dy = t.y - pos.y;
    var dist = Math.hypot(dx, dy);
    var speed = mode === "follow" ? FOLLOW_SPEED : WANDER_SPEED;
    var arrive = mode === "follow" ? 24 * SCALE : 4;
    if (dist <= arrive) {
      moving = false;
      return;
    }
    var move = Math.min(dist, speed * dt);
    pos.x += (dx / dist) * move;
    pos.y += (dy / dist) * move;

    // oneko's eight directions, two frames each, stepping every 110ms
    var direction = -dy / dist > 0.5 ? "N" : "";
    direction += -dy / dist < -0.5 ? "S" : "";
    direction += -dx / dist > 0.5 ? "W" : "";
    direction += -dx / dist < -0.5 ? "E" : "";
    walkClock += dt;
    setSprite(direction || "S", Math.floor(walkClock / 0.11));
    place();
  }

  /* ------------------------------------------------ speech bubble ---- */
  // Short lines, so the bubble stays one line on any screen
  var MESSAGES = [
    "Hi, I'm Kuro!",
    "Welcome in!",
    "Have a look around.",
    "Check the projects!",
    "Nice to meet you :)",
    "Kim builds tech.",
    "Drag me anywhere!",
    mobile ? "Nice view from here." : "Pet me, I purr.",
    "Certs? All real."
  ];
  var msgIndex = 0;
  var bubbleUntil = 0;
  var nextChatter = performance.now() + 12000;

  function coversText(x, top, bw, bh) {
    var pts = [
      [x + 4, top + 4],
      [x + bw - 4, top + 4],
      [x + 4, top + bh - 4],
      [x + bw - 4, top + bh - 4],
      [x + bw / 2, top + bh / 2]
    ];
    for (var i = 0; i < pts.length; i++) {
      if (hits(pts[i][0], pts[i][1], TEXTY)) return true;
    }
    return false;
  }

  var side = { at: 0, below: false, hidden: false };
  // Above him by default; below him near the top of the screen or when the
  // upper spot would sit on text. If both would, it stays hidden rather
  // than cover what you are reading. Always kept 6px inside the page width
  // so the border is never cut off.
  function placeBubble() {
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var margin = 6;
    var sx = window.scrollX, sy = window.scrollY;
    var x = Math.max(margin, Math.min(pageW - bw - margin, pos.x - bw / 2));
    var above = pos.y - HALF - bh - 10;
    var below = pos.y + HALF + 10;
    var top = sy + topInset() + margin;
    var bottom = sy + window.innerHeight - margin;
    var now = performance.now();
    if (now >= side.at) {
      side.at = now + 250;
      side.hidden = false;
      side.below = above < top || coversText(x - sx, above - sy, bw, bh);
      if (side.below && (below + bh > bottom || coversText(x - sx, below - sy, bw, bh))) {
        // neither side is clear of text: stay above if it fits at all
        side.below = above < top;
        side.hidden = side.below;
      }
    }
    if (side.hidden) {
      bubble.classList.remove("is-on");
      return;
    }
    bubble.classList.add("is-on");
    bubble.classList.toggle("is-below", side.below);
    bubble.style.setProperty("--tail-x", Math.max(10, Math.min(bw - 10, pos.x - x)) + "px");
    bubble.style.transform = "translate3d(" + Math.round(x) + "px, " + Math.round(side.below ? below : above) + "px, 0)";
  }
  function say(text, ms) {
    bubble.textContent = text;
    bubbleUntil = performance.now() + (ms || 3000);
    side.at = 0;
    placeBubble();
  }
  function hideBubble() {
    bubbleUntil = 0;
    bubble.classList.remove("is-on");
  }
  // A new line every 12-20s while he sits idle on screen
  function maybeChatter() {
    var now = performance.now();
    if (now < nextChatter || bubbleUntil || !inView()) return;
    say(MESSAGES[msgIndex++ % MESSAGES.length]);
    nextChatter = now + 12000 + Math.random() * 8000;
  }

  /* --------------------------------------- sprite alpha (hit test) ---- */
  var sheet = null;
  var img = new Image();
  img.onload = function () {
    var c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    var cx = c.getContext("2d");
    cx.drawImage(img, 0, 0);
    try {
      sheet = cx.getImageData(0, 0, c.width, c.height);
    } catch (e) {
      sheet = null;
    }
    installFavicon(c);
  };
  img.src = SPRITE;

  // Is this viewport point on an opaque pixel of the current frame?
  function overKuro(x, y) {
    var r = sprite.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
    if (!sheet) return true;
    var sx = cell[0] * 32 + Math.min(31, Math.floor(((x - r.left) / r.width) * 32));
    var sy = cell[1] * 32 + Math.min(31, Math.floor(((y - r.top) / r.height) * 32));
    return sheet.data[(sy * sheet.width + sx) * 4 + 3] > 0;
  }

  /* ------------------------------------------------ cursor tracking ---- */
  function trackCursor(e) {
    var now = performance.now();
    var dt = Math.max(1, now - cursor.at);
    if (cursor.x !== null) {
      cursor.vx = cursor.vx * 0.5 + ((e.clientX - cursor.x) / dt) * 16 * 0.5;
      cursor.vy = cursor.vy * 0.5 + ((e.clientY - cursor.y) / dt) * 16 * 0.5;
    }
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    cursor.at = now;
    if (!held && !press) maybeStartle(now);
  }

  // A fast flick of the cursor right past him makes him jump
  function maybeStartle(now) {
    if (mode === "follow" || moving || now - startleAt < 3000) return;
    var speed = Math.hypot(cursor.vx, cursor.vy);
    if (speed < 45) return;
    var cp = cursorPage();
    if (Math.hypot(cp.x - pos.x, cp.y - pos.y) > 130) return;
    startleAt = now;
    resetIdleAnimation();
    petTicks = 0;
    alertTicks = 6;
    setSprite("alert", 0);
  }

  /* ------------------------------------------------- petting ---- */
  function checkPetting(dt) {
    if (mobile || held || press || moving || cursor.x === null) {
      hoverMs = 0;
      return;
    }
    var still = performance.now() - cursor.at > 80 || Math.hypot(cursor.vx, cursor.vy) < 6;
    if (still && overKuro(cursor.x, cursor.y)) {
      hoverMs += dt * 1000;
      if (hoverMs > 1200 && performance.now() - petAt > 5000) {
        petAt = performance.now();
        hoverMs = 0;
        resetIdleAnimation();
        petTicks = 16;
        say("purr...", 1800);
        for (var i = 0; i < 4; i++) window.setTimeout(spawnHeart, i * 180);
      }
    } else {
      hoverMs = 0;
    }
  }
  function spawnHeart() {
    var h = document.createElement("span");
    h.className = "kuro-heart";
    h.setAttribute("aria-hidden", "true");
    var x = pos.x - 5 + (Math.random() * 2 - 1) * CELL * 0.35;
    h.style.left = Math.round(Math.max(0, Math.min(pageW - 12, x))) + "px";
    h.style.top = Math.round(pos.y - HALF - 6) + "px";
    document.body.appendChild(h);
    h.addEventListener("animationend", function () {
      h.remove();
    });
  }

  /* ---------------------------- click for modes / mochi drag ---- */
  // The cat element is pointer-events:none, so links under it always work.
  // Document-level listeners react only when a press lands on one of his
  // opaque pixels: a quick click switches mode, press-and-move (or
  // press-and-hold) picks him up, and wherever you drop him he stays.
  var stretch = { sx: 1, sy: 1, skew: 0, vsx: 0, vsy: 0, vskew: 0 };
  var swallowClick = false;
  function applyStretch() {
    sprite.style.transform = "skewX(" + stretch.skew.toFixed(2) + "deg) scale(" + stretch.sx.toFixed(3) + ", " + stretch.sy.toFixed(3) + ")";
  }

  function setMode(next) {
    mode = next;
    wanderTarget = null;
    wanderAt = performance.now() + 6000;
    moving = false;
    saved.hinted = true;
    save();
  }
  function onTap() {
    setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
    say(MODE_LINES[mode], 2600);
    resetIdleAnimation();
    petTicks = 0;
    alertTicks = 4;
    setSprite("alert", 0);
  }

  if (!reduceMotion) {
    document.addEventListener(
      "pointerdown",
      function (e) {
        if ((e.pointerType === "mouse" && e.button !== 0) || !overKuro(e.clientX, e.clientY)) return;
        e.preventDefault();
        swallowClick = true;
        press = { x: e.clientX, y: e.clientY, type: e.pointerType };
        try {
          // keep the moves coming even when the pointer leaves the window
          document.documentElement.setPointerCapture(e.pointerId);
        } catch (err) {}
        window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(function () {
          if (press && !held) pickUp(press.x, press.y);
        }, HOLD_MS);
      },
      { capture: true }
    );
    // A finger that lands on him drags him instead of scrolling the page
    document.addEventListener(
      "touchstart",
      function (e) {
        var t = e.touches[0];
        if (e.touches.length === 1 && overKuro(t.clientX, t.clientY)) e.preventDefault();
      },
      { capture: true, passive: false }
    );
    document.addEventListener(
      "touchmove",
      function (e) {
        if (press || held) e.preventDefault();
      },
      { capture: true, passive: false }
    );
    ["selectstart", "dragstart"].forEach(function (type) {
      document.addEventListener(
        type,
        function (e) {
          if (press || held) e.preventDefault();
        },
        { capture: true }
      );
    });
    document.addEventListener(
      "click",
      function (e) {
        if (!swallowClick) return;
        e.preventDefault();
        e.stopPropagation();
        swallowClick = false;
      },
      { capture: true }
    );
    // Dragging listens to pointermove: once pointerdown is cancelled the
    // browser stops sending mousemove while the button is down.
    document.addEventListener(
      "pointermove",
      function (e) {
        if (e.pointerType === "mouse") trackCursor(e);
        if (held) {
          dragTo(e.clientX, e.clientY);
          return;
        }
        if (!press) return;
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < (press.type === "mouse" ? 6 : 10)) return;
        pickUp(press.x, press.y);
        dragTo(e.clientX, e.clientY);
      },
      { passive: true }
    );
    document.addEventListener("pointerup", function () {
      window.clearTimeout(holdTimer);
      if (held) drop();
      else if (press) onTap();
      press = null;
      // a touch whose touchstart was cancelled never sends a click
      window.setTimeout(function () {
        swallowClick = false;
      }, 60);
    });
    document.addEventListener("pointercancel", function () {
      window.clearTimeout(holdTimer);
      if (held) drop();
      press = null;
      swallowClick = false;
    });
    window.addEventListener("blur", function () {
      window.clearTimeout(holdTimer);
      if (held) drop();
      press = null;
    });
  }

  function pickUp(px, py) {
    window.clearTimeout(holdTimer);
    held = {
      offX: px - (pos.x - window.scrollX),
      offY: py - (pos.y - window.scrollY - HALF),
      lastX: px,
      lastY: py,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
      flips: 0,
      sign: 0,
      flipAt: 0,
      wobbleUntil: 0,
      frame: 0,
      frameAt: 0
    };
    moving = false;
    resetIdleAnimation();
    petTicks = 0;
    hideBubble();
    setSprite("scratchWallN", 0); // upright, paws up: dangling
    window.requestAnimationFrame(heldLoop);
  }
  function dragTo(x, y) {
    var now = performance.now();
    var dt = Math.max(1, now - held.lastT);
    held.vx = held.vx * 0.6 + ((x - held.lastX) / dt) * 16 * 0.4;
    held.vy = held.vy * 0.6 + ((y - held.lastY) / dt) * 16 * 0.4;
    held.lastX = x;
    held.lastY = y;
    held.lastT = now;
    // shake: quick left-right reversals make him wobble
    var sign = held.vx > 5 ? 1 : held.vx < -5 ? -1 : 0;
    if (sign && sign !== held.sign) {
      held.flips = held.sign && now - held.flipAt < 240 ? held.flips + 1 : 0;
      held.sign = sign;
      held.flipAt = now;
      if (held.flips >= 3) {
        held.wobbleUntil = now + 900;
        held.flips = 0;
      }
    }
    pos = clampTo({ x: x - held.offX + window.scrollX, y: y - held.offY + HALF + window.scrollY }, pageBounds());
    place();
  }
  // Wherever you put him down, he stays
  function drop() {
    held = null;
    settling = true;
    stretch.vsx = stretch.vsy = stretch.vskew = 0;
    idleTime = 0;
    alertTicks = 3; // lands, looks up for a beat
    setSprite("alert", 0);
    setMode("stay");
    say(MODE_LINES.stay, 2200);
    window.requestAnimationFrame(settleLoop);
  }

  // While held: stretch toward the hand, legs flail, wobble when shaken
  function heldLoop() {
    if (!held) return;
    var now = performance.now();
    if (now - held.lastT > 60) {
      held.vx *= 0.85;
      held.vy *= 0.85;
    }
    var s = Math.min(0.55, Math.hypot(held.vx, held.vy) / 55);
    stretch.sy += (1 + 0.08 + s - stretch.sy) * 0.3;
    stretch.sx += (1 - s * 0.45 - stretch.sx) * 0.3;
    var skewTarget = Math.max(-16, Math.min(16, -held.vx * 1.4));
    if (held.wobbleUntil > now) skewTarget += Math.sin(now / 45) * 14 * ((held.wobbleUntil - now) / 900);
    stretch.skew += (skewTarget - stretch.skew) * 0.3;
    applyStretch();
    if (now - held.frameAt > 140) {
      held.frameAt = now;
      held.frame += 1;
      setSprite("scratchWallN", held.frame);
    }
    window.requestAnimationFrame(heldLoop);
  }

  // After release: damped spring back to rest (squash, bounce, settle)
  function settleLoop() {
    var k = 0.2, damp = 0.72;
    stretch.vsx = (stretch.vsx + (1 - stretch.sx) * k) * damp;
    stretch.vsy = (stretch.vsy + (1 - stretch.sy) * k) * damp;
    stretch.vskew = (stretch.vskew + (0 - stretch.skew) * k) * damp;
    stretch.sx += stretch.vsx;
    stretch.sy += stretch.vsy;
    stretch.skew += stretch.vskew;
    applyStretch();
    if (
      Math.abs(stretch.sx - 1) < 0.004 &&
      Math.abs(stretch.sy - 1) < 0.004 &&
      Math.abs(stretch.skew) < 0.2 &&
      Math.abs(stretch.vsy) < 0.004
    ) {
      stretch.sx = stretch.sy = 1;
      stretch.skew = 0;
      sprite.style.transform = "";
      settling = false;
      return;
    }
    window.requestAnimationFrame(settleLoop);
  }

  /* ---------------------------------------------------- favicon ---- */
  // The idle frame's face, cropped from the sprite sheet onto a light tile
  function installFavicon(sheetCanvas) {
    var cx = sheetCanvas.getContext("2d");
    var x0 = 3 * 32, y0 = 3 * 32; // idle cell
    var data;
    try {
      data = cx.getImageData(x0, y0, 32, 32).data;
    } catch (e) {
      return;
    }
    var minX = 32, minY = 32, maxX = -1;
    for (var y = 0; y < 32; y++) {
      for (var x = 0; x < 32; x++) {
        if (data[(y * 32 + x) * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
        }
      }
    }
    if (maxX < 0) return;
    // the head: a square about three-quarters of the cat's width, from the
    // ear tips down, so the favicon reads as a face rather than a whole cat
    var size = Math.max(10, Math.min(Math.round((maxX - minX + 1) * 0.72), 32 - minY));
    var sx = Math.max(0, Math.min(32 - size, Math.round((minX + maxX + 1) / 2 - size / 2)));
    [16, 32, 180, 192].forEach(function (px) {
      var c = document.createElement("canvas");
      c.width = px;
      c.height = px;
      var g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.fillStyle = "#e9e9e9"; // light tile so the black cat reads in any tab strip
      g.fillRect(0, 0, px, px);
      var pad = Math.round(px * 0.06);
      g.drawImage(sheetCanvas, x0 + sx, y0 + minY, size, size, pad, pad, px - pad * 2, px - pad * 2);
      var isTouch = px === 180;
      var id = "kuro-favicon-" + px;
      var link = document.getElementById(id);
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = isTouch ? "apple-touch-icon" : "icon";
        if (!isTouch) {
          link.type = "image/png";
          link.sizes = px + "x" + px;
        }
        document.head.appendChild(link);
      }
      link.href = c.toDataURL("image/png");
    });
  }

  /* ------------------------------------------------------ start ---- */
  // Somewhere on screen: where he was on screen last time, else bottom right
  function placeInView() {
    var v = viewBounds();
    if (typeof saved.vx === "number" && typeof saved.vy === "number") {
      pos = clampTo({ x: saved.vx * pageW, y: window.scrollY + saved.vy * window.innerHeight }, v);
    } else {
      pos = clampTo({ x: pageW - (mobile ? 44 : 150), y: window.scrollY + window.innerHeight - (mobile ? 96 : 70) }, v);
    }
  }
  measure();
  if (mode === "stay" && typeof saved.px === "number" && typeof saved.py === "number") {
    pos = clampTo({ x: saved.px, y: saved.py }, pageBounds()); // parked on the page
  } else {
    placeInView();
  }
  setSprite("idle", 0);
  place();
  el.classList.add("is-ready");

  // The browser restores the scroll position around load; if that left him
  // behind, bring him back into view (unless he was told to stay)
  window.addEventListener("load", function () {
    measure();
    if (mode !== "stay" && !held && !inView()) {
      placeInView();
      place();
    }
  });
  window.addEventListener("resize", function () {
    measure();
    pos = clampTo(pos, pageBounds());
    place();
  });
  window.addEventListener("pagehide", save);

  if (reduceMotion) {
    // Sits still and says hello once; no animation loop at all
    window.setTimeout(function () {
      say(MESSAGES[0], 3500);
    }, 600);
    window.setTimeout(hideBubble, 4100);
    return;
  }

  // Hello, then (first visit only) how to play with him
  window.setTimeout(function () {
    if (inView()) say(MESSAGES[0], 3000);
    msgIndex = 1;
  }, 700);
  if (!saved.hinted) {
    window.setTimeout(function () {
      if (!held && !press) say(canFollow ? "Click me and I'll follow!" : "Tap me to make me stay.", 3400);
      nextChatter = performance.now() + 14000;
    }, 4200);
  }

  var last = performance.now();
  var tickAcc = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tickAcc += dt;
    if (tickAcc >= 0.1) {
      tickAcc = 0;
      tick();
    }
    step(dt);
    checkPetting(dt);
    if (bubbleUntil) {
      if (now > bubbleUntil) hideBubble();
      else placeBubble();
    }
    window.requestAnimationFrame(loop);
  }
  window.requestAnimationFrame(loop);
})();

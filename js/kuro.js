/* Kim De Guzman — portfolio
   Kuro: a black cat who lives on the page. He roams the whole window on his
   own; click him and he follows your cursor, click again and he goes back
   to wandering. Rest the cursor on him to pet him, fling the cursor past
   him to startle him, or drag him around by the scruff.

   The idle / sleep / scratch behaviour and the sprite layout come from
   oneko.js by adryd (https://github.com/adryd325/oneko.js). Movement here
   is continuous (every animation frame) instead of oneko's 100ms hops, and
   the extras (wander mode, click-to-follow, petting, startle, drag, speech
   bubble, favicon, remembering where he was) are written for this site.

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
  var canDrag = !mobile && !reduceMotion;
  var canFollow = !mobile && !reduceMotion;
  var WANDER_SPEED = mobile ? 70 : 110; // px per second
  var FOLLOW_SPEED = 240;

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

  /* ---------------------------------------------------------- state ---- */
  var saved = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(STORE)) || {};
  } catch (e) {
    saved = {};
  }

  var pos = { x: 0, y: 0 }; // centre of the cat, viewport px
  var mode = canFollow && saved.mode === "follow" ? "follow" : "wander";
  var cursor = { x: null, y: null, vx: 0, vy: 0, at: 0 };
  var moving = false;
  var wanderTarget = null;
  var wanderAt = performance.now() + 7000; // first stroll after saying hello
  var frameCount = 0;
  var idleTime = 0;
  var idleAnimation = null;
  var idleAnimationFrame = 0;
  var alertTicks = 0; // show the alert pose for this many ticks
  var petTicks = 0; // content, eyes-closed pose after being petted
  var cell = [3, 3]; // current sprite cell (column, row), for hit-testing
  var walkClock = 0;
  var hoverMs = 0;
  var petAt = -Infinity;
  var startleAt = 0;
  var held = null;
  var press = null;
  var settling = false;

  function bounds() {
    var half = CELL / 2;
    return { x0: half, x1: window.innerWidth - half, y0: half, y1: window.innerHeight - half };
  }
  function clampToBounds(p) {
    var b = bounds();
    return { x: Math.max(b.x0, Math.min(b.x1, p.x)), y: Math.max(b.y0, Math.min(b.y1, p.y)) };
  }
  function place() {
    el.style.transform = "translate3d(" + Math.round(pos.x - CELL / 2) + "px, " + Math.round(pos.y - CELL / 2) + "px, 0)";
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
        JSON.stringify({ fx: pos.x / window.innerWidth, fy: pos.y / window.innerHeight, mode: mode, hinted: !!saved.hinted })
      );
    } catch (e) {}
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
      var b = bounds();
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
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdleAnimation();
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
    if (mode === "follow" && cursor.x !== null) return clampToBounds({ x: cursor.x, y: cursor.y });
    return wanderTarget;
  }
  // A stroll to somewhere else on screen, at least a short hop away
  function pickWander() {
    var b = bounds();
    for (var i = 0; i < 10; i++) {
      var p = { x: b.x0 + Math.random() * (b.x1 - b.x0), y: b.y0 + Math.random() * (b.y1 - b.y0) };
      var d = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (d > 120 && d < (mobile ? 360 : 700)) return p;
    }
    return null;
  }

  /* ------------------------------------ logic tick (oneko cadence) ---- */
  function tick() {
    frameCount += 1;
    if (held || settling) return;

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
      if (mode === "wander" && wanderTarget && dist < arrive) {
        wanderTarget = null;
        wanderAt = now + 5000 + Math.random() * 9000;
      }
      idle();
      if (mode === "wander" && !wanderTarget && now > wanderAt && idleAnimation == null && petTicks === 0) {
        wanderTarget = pickWander();
        wanderAt = now + 8000;
      }
      return;
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
    if (!moving || held || settling) return;
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
  var MESSAGES = [
    "Hi, I'm Kuro!",
    "Welcome to Kim's portfolio!",
    "Feel free to look around!",
    "Check out the projects section!",
    "Nice to meet you :)",
    "Kim builds civic tech. I supervise.",
    "Pick me up if you like!",
    "Pet me. I don't bite.",
    "The certificates are real, I checked."
  ];
  var TAPS = ["Meow!", "Hi there!", "Mrrp?", "You found me!", "Hehe, that tickles."];
  var msgIndex = 0;
  var bubbleUntil = 0;
  var nextChatter = performance.now() + 9000;
  var TEXTY = "p, h1, h2, h3, h4, li, a, button, figcaption, span, label, input, textarea, .pill, .label, .meta";

  function coversText(x, top, bw, bh) {
    var pts = [
      [x + 4, top + 4],
      [x + bw - 4, top + 4],
      [x + 4, top + bh - 4],
      [x + bw - 4, top + bh - 4],
      [x + bw / 2, top + bh / 2]
    ];
    for (var i = 0; i < pts.length; i++) {
      var els = document.elementsFromPoint(pts[i][0], pts[i][1]);
      for (var j = 0; j < els.length; j++) {
        if (els[j] === bubble || el.contains(els[j])) continue;
        if (els[j].closest && els[j].closest(TEXTY)) return true;
        break;
      }
    }
    return false;
  }

  var side = { at: 0, below: false, hidden: false };
  // Above him by default; below him near the top of the window or when the
  // upper spot would sit on text. If both would, it stays hidden rather
  // than cover what you are reading. Always kept 6px inside the window so
  // the border is never cut off.
  function placeBubble() {
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var margin = 6;
    var x = Math.max(margin, Math.min(window.innerWidth - bw - margin, pos.x - bw / 2));
    var above = pos.y - CELL / 2 - bh - 10;
    var below = pos.y + CELL / 2 + 10;
    var now = performance.now();
    if (now >= side.at) {
      side.at = now + 250;
      side.hidden = false;
      side.below = above < margin || coversText(x, above, bw, bh);
      if (side.below && (below + bh > window.innerHeight - margin || coversText(x, below, bw, bh))) {
        // neither side is clear of text: stay above if it fits at all
        side.below = above < margin;
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
  // Rotating lines every 7-13s while he sits idle
  function maybeChatter() {
    var now = performance.now();
    if (now < nextChatter || bubbleUntil) return;
    say(MESSAGES[msgIndex++ % MESSAGES.length]);
    nextChatter = now + 7000 + Math.random() * 6000;
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
  document.addEventListener(
    "mousemove",
    function (e) {
      var now = performance.now();
      var dt = Math.max(1, now - cursor.at);
      if (cursor.x !== null) {
        cursor.vx = cursor.vx * 0.5 + ((e.clientX - cursor.x) / dt) * 16 * 0.5;
        cursor.vy = cursor.vy * 0.5 + ((e.clientY - cursor.y) / dt) * 16 * 0.5;
      }
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.at = now;
      if (held) dragTo(e.clientX, e.clientY);
      else maybeStartle(now);
    },
    { passive: true }
  );

  // Startle: a fast cursor whipping past while he is not following it
  function maybeStartle(now) {
    if (reduceMotion || mode === "follow" || moving || now - startleAt < 3000) return;
    var speed = Math.hypot(cursor.vx, cursor.vy);
    if (speed < 45) return;
    if (Math.hypot(cursor.x - pos.x, cursor.y - pos.y) > 130) return;
    startleAt = now;
    resetIdleAnimation();
    petTicks = 0;
    alertTicks = 6;
    setSprite("alert", 0);
  }

  /* ------------------------------------------------- petting ---- */
  function checkPetting(dt) {
    if (reduceMotion || mobile || held || moving || cursor.x === null) {
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
    h.style.left = Math.round(pos.x - 5 + (Math.random() * 2 - 1) * CELL * 0.35) + "px";
    h.style.top = Math.round(pos.y - CELL / 2 - 6) + "px";
    document.body.appendChild(h);
    h.addEventListener("animationend", function () {
      h.remove();
    });
  }

  /* ------------------------------- click to follow / mochi drag ---- */
  // The cat element is pointer-events:none, so links under it always work.
  // Document-level listeners react only when a press lands on one of his
  // opaque pixels: a quick click toggles follow mode, a press-and-move
  // picks him up.
  var stretch = { sx: 1, sy: 1, skew: 0, vsx: 0, vsy: 0, vskew: 0 };
  var swallowClick = false;
  function applyStretch() {
    sprite.style.transform = "skewX(" + stretch.skew.toFixed(2) + "deg) scale(" + stretch.sx.toFixed(3) + ", " + stretch.sy.toFixed(3) + ")";
  }

  function onTap() {
    if (canFollow) {
      mode = mode === "follow" ? "wander" : "follow";
      wanderTarget = null;
      wanderAt = performance.now() + 4000;
      say(mode === "follow" ? "Okay, I'll follow you!" : "Alright, I'll wander around.", 2600);
      saved.hinted = true;
      save();
    } else {
      say(TAPS[Math.floor(Math.random() * TAPS.length)], 2200);
    }
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
        press = { x: e.clientX, y: e.clientY };
      },
      { capture: true }
    );
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
    document.addEventListener("pointermove", function (e) {
      if (!press || held || !canDrag) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) return;
      pickUp(press.x, press.y);
      dragTo(e.clientX, e.clientY);
    });
    document.addEventListener("pointerup", function () {
      if (held) drop();
      else if (press) onTap();
      press = null;
    });
    document.addEventListener("pointercancel", function () {
      if (held) drop();
      press = null;
    });
    window.addEventListener("blur", function () {
      if (held) drop();
      press = null;
    });
  }

  function pickUp(px, py) {
    held = {
      offX: px - pos.x,
      offY: py - (pos.y - CELL / 2),
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
    var p = clampToBounds({ x: x - held.offX, y: y - held.offY + CELL / 2 });
    pos.x = p.x;
    pos.y = p.y;
    place();
  }
  function drop() {
    held = null;
    settling = true;
    stretch.vsx = stretch.vsy = stretch.vskew = 0;
    idleTime = 3; // lands, looks alert for a beat, then carries on
    wanderTarget = null;
    wanderAt = performance.now() + 5000;
    setSprite("alert", 0);
    save();
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
  if (typeof saved.fx === "number" && typeof saved.fy === "number") {
    pos = clampToBounds({ x: saved.fx * window.innerWidth, y: saved.fy * window.innerHeight });
  } else {
    pos = clampToBounds({ x: window.innerWidth - (mobile ? 44 : 150), y: window.innerHeight - (mobile ? 96 : 70) });
  }
  setSprite("idle", 0);
  place();
  el.classList.add("is-ready");

  window.addEventListener("resize", function () {
    pos = clampToBounds(pos);
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
    say(MESSAGES[msgIndex++], 3000);
  }, 700);
  if (!saved.hinted) {
    window.setTimeout(function () {
      say(canFollow ? "Click me and I'll follow your cursor." : "Tap me to say hi!", 3400);
      nextChatter = performance.now() + 9000;
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

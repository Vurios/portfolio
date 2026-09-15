/* Kim De Guzman — portfolio
   Kuro: a black cat that chases the cursor around the content column.

   The chase / idle / sleep / wall-scratch engine is oneko.js by adryd
   (https://github.com/adryd325/oneko.js), adapted to live inside the
   page's content container instead of the whole viewport, to render at 2x,
   and to carry a few extras: a mochi drag-and-stretch, a speech bubble,
   and a favicon cut from the same sprite sheet.

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
  var host = document.querySelector(".content");
  if (!host) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var mobile = coarse || window.innerWidth < 1024;
  var SCALE = mobile ? 1.5 : 2; // screen px per sprite px (64px cat on desktop)
  var CELL = 32 * SCALE;
  var canDrag = !mobile && !reduceMotion;

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
  host.appendChild(el);

  var bubble = document.createElement("div");
  bubble.className = "kuro-bubble";
  bubble.setAttribute("aria-hidden", "true");
  host.appendChild(bubble);

  /* ---------------------------------------------------------- state ---- */
  var nekoPosX = 0; // centre of the cat, container px
  var nekoPosY = 0;
  var clientX = null; // last known cursor, viewport px
  var clientY = null;
  var frameCount = 0;
  var idleTime = 0;
  var idleAnimation = null;
  var idleAnimationFrame = 0;
  var nekoSpeed = 10 * SCALE;
  var cell = [3, 3]; // current sprite cell (column, row), for hit-testing
  var held = null; // drag state while picked up
  var settling = false;

  function hostRect() {
    return host.getBoundingClientRect();
  }
  // Where the cat may stand: inside the column, within the slice on screen
  function bounds() {
    var r = hostRect();
    var top = Math.max(0, -r.top);
    var bottom = Math.min(r.height, window.innerHeight - r.top);
    var half = CELL / 2;
    return { x0: half, x1: Math.max(half, r.width - half), y0: top + half, y1: Math.max(top + half, bottom - half) };
  }
  function place() {
    el.style.transform = "translate(" + (nekoPosX - CELL / 2).toFixed(1) + "px, " + (nekoPosY - CELL / 2).toFixed(1) + "px)";
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

  /* ------------------------------------------------ oneko: idle ---- */
  function idle() {
    idleTime += 1;

    // every ~20 seconds
    if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation == null) {
      var b = bounds();
      var available = ["sleeping", "scratchSelf"];
      if (nekoPosX < b.x0 + 32) available.push("scratchWallW");
      if (nekoPosY < b.y0 + 32) available.push("scratchWallN");
      if (nekoPosX > b.x1 - 32) available.push("scratchWallE");
      if (nekoPosY > b.y1 - 32) available.push("scratchWallS");
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

  /* ------------------------------------------ oneko: chase tick ---- */
  // Target: the cursor, clamped into the column. On touch screens (no
  // cursor) or before the mouse has moved, the only target is "back into
  // view" when scrolling has left the cat off screen.
  function target() {
    var b = bounds();
    var r = hostRect();
    if (!mobile && clientX !== null) {
      return {
        x: Math.max(b.x0, Math.min(b.x1, clientX - r.left)),
        y: Math.max(b.y0, Math.min(b.y1, clientY - r.top))
      };
    }
    var off = nekoPosY < b.y0 || nekoPosY > b.y1;
    if (!off) return null;
    return { x: Math.max(b.x0, Math.min(b.x1, nekoPosX)), y: b.y1 - CELL / 2 };
  }

  function frame() {
    frameCount += 1;
    var t = target();
    if (!t) {
      idle();
      return;
    }
    var diffX = nekoPosX - t.x;
    var diffY = nekoPosY - t.y;
    var distance = Math.sqrt(diffX * diffX + diffY * diffY);

    if (distance < nekoSpeed || distance < 24 * SCALE) {
      idle();
      return;
    }

    resetIdleAnimation();

    if (idleTime > 1) {
      setSprite("alert", 0);
      // count down after being alerted before moving
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    var direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;
    var b = bounds();
    nekoPosX = Math.min(Math.max(b.x0, nekoPosX), b.x1);
    nekoPosY = Math.min(Math.max(b.y0, nekoPosY), b.y1);
    place();
    hideBubble();
  }

  var lastTick = 0;
  function loop(ts) {
    if (!el.isConnected) return;
    if (!lastTick) lastTick = ts;
    if (ts - lastTick > 100 && !held && !settling) {
      lastTick = ts;
      frame();
    }
    if (bubbleUntil) {
      if (performance.now() > bubbleUntil) hideBubble();
      else placeBubble();
    }
    window.requestAnimationFrame(loop);
  }

  document.addEventListener(
    "mousemove",
    function (e) {
      clientX = e.clientX;
      clientY = e.clientY;
    },
    { passive: true }
  );

  /* ------------------------------------------------ speech bubble ---- */
  var MESSAGES = [
    "Hi, I'm Kuro!",
    "Welcome to Kim's portfolio!",
    "Feel free to look around!",
    "Check out the projects section!",
    "Nice to meet you :)",
    "Kim builds civic tech. I supervise.",
    "Pick me up if you like!"
  ];
  var msgIndex = 0;
  var bubbleUntil = 0;
  var nextChatter = performance.now() + 14000;
  var TEXTY = "p, h1, h2, h3, h4, li, a, button, figcaption, span, label, input, textarea, .pill, .label, .meta";

  function coversText(x, top, bw, bh) {
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
        if (els[j] === bubble || el.contains(els[j])) continue;
        if (els[j].closest && els[j].closest(TEXTY)) return true;
        break;
      }
    }
    return false;
  }

  var side = { at: 0, below: false, hidden: false };
  // Above the cat by default; below it near the top of the view or when
  // the upper spot would sit on text. If both would, it stays hidden
  // rather than cover what you are reading.
  function placeBubble() {
    var r = hostRect();
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var x = Math.max(0, Math.min(r.width - bw, nekoPosX - bw / 2));
    var above = nekoPosY - CELL / 2 - bh - 8;
    var below = nekoPosY + CELL / 2 + 8;
    var now = performance.now();
    if (now >= side.at) {
      side.at = now + 250;
      side.hidden = false;
      side.below = above < -r.top + 8 || coversText(x, above, bw, bh);
      if (side.below && coversText(x, below, bw, bh)) side.hidden = true;
    }
    if (side.hidden) {
      bubble.classList.remove("is-on");
      return;
    }
    bubble.classList.add("is-on");
    bubble.classList.toggle("is-below", side.below);
    bubble.style.setProperty("--tail-x", Math.max(10, Math.min(bw - 10, nekoPosX - x)) + "px");
    bubble.style.transform = "translate(" + x.toFixed(1) + "px, " + (side.below ? below : above).toFixed(1) + "px)";
  }
  function say(text, ms) {
    bubble.textContent = text;
    bubbleUntil = performance.now() + (ms || 3500);
    side.at = 0;
    placeBubble();
  }
  function hideBubble() {
    bubbleUntil = 0;
    bubble.classList.remove("is-on");
  }
  // Rotating greetings, every 12-26s while he is sitting idle
  function maybeChatter() {
    var now = performance.now();
    if (now < nextChatter || bubbleUntil) return;
    say(MESSAGES[msgIndex++ % MESSAGES.length]);
    nextChatter = now + 12000 + Math.random() * 14000;
  }

  /* --------------------------------------- sprite alpha (hit test) ---- */
  var sheet = null; // ImageData of the whole sprite sheet
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

  /* ------------------------------------------------- mochi drag ---- */
  // The cat element is pointer-events:none, so links under it always work.
  // Document-level listeners pick him up only when the press lands on one
  // of his opaque pixels.
  var stretch = { sx: 1, sy: 1, skew: 0, vsx: 0, vsy: 0, vskew: 0 };
  var swallowClick = false;
  function applyStretch() {
    sprite.style.transform = "skewX(" + stretch.skew.toFixed(2) + "deg) scale(" + stretch.sx.toFixed(3) + ", " + stretch.sy.toFixed(3) + ")";
  }

  if (canDrag) {
    document.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button !== 0 || !overKuro(e.clientX, e.clientY)) return;
        e.preventDefault();
        swallowClick = true;
        var r = hostRect();
        held = {
          offX: e.clientX - r.left - nekoPosX,
          offY: e.clientY - r.top - (nekoPosY - CELL / 2),
          lastX: e.clientX,
          lastY: e.clientY,
          lastT: performance.now(),
          vx: 0,
          vy: 0,
          flips: 0,
          sign: 0,
          flipAt: 0,
          wobbleUntil: 0,
          frame: 0
        };
        resetIdleAnimation();
        hideBubble();
        setSprite("scratchWallN", 0); // upright, paws up: dangling
        heldLoop();
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
      if (!held) return;
      var now = performance.now();
      var dt = Math.max(1, now - held.lastT);
      held.vx = held.vx * 0.6 + ((e.clientX - held.lastX) / dt) * 16 * 0.4;
      held.vy = held.vy * 0.6 + ((e.clientY - held.lastY) / dt) * 16 * 0.4;
      held.lastX = e.clientX;
      held.lastY = e.clientY;
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
      var r = hostRect();
      nekoPosX = Math.max(CELL / 2, Math.min(r.width - CELL / 2, e.clientX - r.left - held.offX));
      nekoPosY = Math.max(CELL / 2, Math.min(r.height - CELL / 2, e.clientY - r.top - held.offY + CELL / 2));
      place();
    });
    var release = function () {
      if (!held) return;
      held = null;
      settling = true;
      stretch.vsx = stretch.vsy = stretch.vskew = 0;
      idleTime = 3; // lands, looks alert for a beat, then carries on
      setSprite("alert", 0);
      settleLoop();
    };
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
  }

  // While held: stretch toward the hand, legs flail, wobble when shaken
  function heldLoop() {
    if (!held) return;
    var now = performance.now();
    if (now - held.lastT > 60) {
      held.vx *= 0.85;
      held.vy *= 0.85;
    }
    var v = Math.hypot(held.vx, held.vy);
    var s = Math.min(0.55, v / 55);
    stretch.sy += (1 + 0.08 + s - stretch.sy) * 0.3;
    stretch.sx += (1 - s * 0.45 - stretch.sx) * 0.3;
    var skewTarget = Math.max(-16, Math.min(16, -held.vx * 1.4));
    if (held.wobbleUntil > now) skewTarget += Math.sin(now / 45) * 14 * ((held.wobbleUntil - now) / 900);
    stretch.skew += (skewTarget - stretch.skew) * 0.3;
    applyStretch();
    if (now - held.frameAt > 140 || !held.frameAt) {
      held.frameAt = now;
      held.frame += 1;
      setSprite("scratchWallN", held.frame);
    }
    if (bubbleUntil) placeBubble();
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
    var done =
      Math.abs(stretch.sx - 1) < 0.004 &&
      Math.abs(stretch.sy - 1) < 0.004 &&
      Math.abs(stretch.skew) < 0.2 &&
      Math.abs(stretch.vsy) < 0.004;
    if (done) {
      stretch.sx = stretch.sy = 1;
      stretch.skew = 0;
      sprite.style.transform = "";
      settling = false;
      return;
    }
    window.requestAnimationFrame(settleLoop);
  }

  /* ---------------------------------------------------- favicon ---- */
  // The idle frame's face, cropped from the sprite sheet onto a dark tile
  function installFavicon(sheetCanvas) {
    var cx = sheetCanvas.getContext("2d");
    var x0 = 3 * 32, y0 = 3 * 32; // idle cell
    var data;
    try {
      data = cx.getImageData(x0, y0, 32, 32).data;
    } catch (e) {
      return;
    }
    // bounding box of the opaque pixels in the idle cell
    var minX = 32, minY = 32, maxX = -1, maxY = -1;
    for (var y = 0; y < 32; y++) {
      for (var x = 0; x < 32; x++) {
        if (data[(y * 32 + x) * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
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
  function startSpot() {
    var b = bounds();
    var hero = host.querySelector(".hero");
    var y = hero ? Math.min(b.y1, hero.offsetTop + hero.offsetHeight - CELL / 2) : b.y1;
    return { x: b.x1 - (mobile ? 8 : 24), y: Math.max(b.y0, y) };
  }
  var s0 = startSpot();
  nekoPosX = s0.x;
  nekoPosY = s0.y;
  setSprite("idle", 0);
  place();
  el.classList.add("is-ready");

  window.addEventListener("resize", function () {
    var b = bounds();
    nekoPosX = Math.min(Math.max(b.x0, nekoPosX), b.x1);
    place();
  });

  if (reduceMotion) {
    // Sits still and says hello once; no animation loop at all
    window.setTimeout(function () {
      say(MESSAGES[0], 4000);
    }, 600);
    window.setTimeout(hideBubble, 4600);
    return;
  }

  window.setTimeout(function () {
    say(MESSAGES[msgIndex++], 3500);
  }, 700);
  window.requestAnimationFrame(loop);
})();

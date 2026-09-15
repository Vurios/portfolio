/* Kim De Guzman — portfolio
   Kuro render layer: pure canvas drawing, no state machine and no DOM
   wiring beyond the two <canvas> elements it builds. Kuro is drawn on two
   stacked logical surfaces:
     - a BODY canvas: silhouette + outline + face (everything except pupils)
     - an EYE canvas: pupils only, transparent elsewhere
   so the eyes can be redrawn every animation frame independently of
   whatever the body is doing (walking, held, asleep, ...). Both canvases
   share one 36x30 logical pixel grid and are scaled with nearest-neighbour
   sampling (see .kuro-body / .kuro-eyes in css/styles.css) so everything
   reads as crisp, hard-edged pixel art.

   ---- Things you can safely tweak from this file alone ------------------
   GRID_W / GRID_H / CX / BY  — the pixel grid and where the rig's origin
                                 sits on it (search "GRID + ORIGIN" below)
   COLORS                     — recomputed per theme; edit refreshColors()
                                 to recolor Kuro (search "COLORS")
   drawSilhouette / drawFace / drawPupils / faceOnlyGrid — the actual pixel
                                 maps and shapes (search "POSES")
   --------------------------------------------------------------------------

   Original artwork: every pose is a small set of integer-aligned fillRect
   calls (or, for the favicon, a literal 16x16 character grid) against the
   pixel grid — there is no sprite sheet and no external image asset. The
   silhouette is a loosely "cute minimalist desktop pet" black cat: solid
   black body, thin light outline, small rounded ears, a compact oval body,
   two small square eyes — an original design, not a reproduction of any
   specific product's character art.

   No dependencies. Exposes window.KuroRender for js/kuro-state.js and
   js/main.js (favicon installation) to use. */
(function () {
  "use strict";

  /* ------------------------------------------------------- GRID + ORIGIN */
  var GRID_W = 36;
  var GRID_H = 30;
  var CX = 20; // horizontal centre of the grid (tail room sits behind this)
  var BY = 27; // baseline row: where the paws touch the floor

  /* ------------------------------------------------------------- COLORS */
  // Named constants. Kuro is always solid black; only the thin outline
  // (and, with it, the eye whites) needs a theme-appropriate light shade so
  // he stays visible on both a white and a near-black page.
  var COLORS = { BODY: "#0a0a0a", OUTLINE: "#f4f4f5", EYE: "#f4f4f5", PUPIL: "#0a0a0a" };
  function refreshColors() {
    var light = document.documentElement.getAttribute("data-theme") === "light";
    COLORS.BODY = "#0a0a0a";
    COLORS.OUTLINE = light ? "#ffffff" : "#f4f4f5";
    COLORS.EYE = COLORS.OUTLINE;
    COLORS.PUPIL = COLORS.BODY;
  }
  refreshColors();

  /* ------------------------------------------------------ PIXEL HELPERS */
  // Every primitive below fills whole grid cells with ctx.fillRect — no
  // anti-aliasing, no sub-pixel placement, so the same shape works at any
  // canvas scale.
  function rect(ctx, x0, y0, x1, y1) {
    ctx.fillRect(Math.round(Math.min(x0, x1)), Math.round(Math.min(y0, y1)), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1);
  }
  function cell(ctx, x, y) {
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  function ellipseCells(ctx, cx, cy, rx, ry) {
    var x0 = Math.ceil(-rx), x1 = Math.floor(rx), y0 = Math.ceil(-ry), y1 = Math.floor(ry);
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
      }
    }
  }
  // Scanline-filled triangle: still whole-cell fillRect per row, no curves.
  function triangleCells(ctx, ax, ay, bx, by, qx, qy) {
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
      if (x1 >= x0) ctx.fillRect(x0, y, x1 - x0 + 1, 1);
    }
  }
  function capsuleCells(ctx, x0, y0, x1, y1, r) {
    var dx = x1 - x0, dy = y1 - y0;
    var steps = Math.ceil(Math.hypot(dx, dy)) + 1;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      ellipseCells(ctx, x0 + dx * t, y0 + dy * t, r, r);
    }
  }

  /* ------------------------------------------------------------- POSES */
  // A pose is a plain object of named channels, each 0 (off) to ~1-3
  // (full); js/kuro-state.js eases these toward targets over time and hands
  // the eased object to drawBody/drawEyes every frame.
  function defaultPose() {
    return {
      facing: 1, // 1 = facing right, -1 = facing left (mirrors the whole rig)
      bob: 0,
      headUp: 0, // + lifts the head block, - lowers it (groom, crouch, stretch)
      ear: 0, // + perks, - flattens
      step: 0, // walk cycle amount
      legPhase: 0,
      tail: 0, // sway, -1..1
      dangle: 0, // paws hang loose (held)
      paw: 0, // front paw raised (wave / groom)
      pawSwing: 0,
      knead: 0, // paws pressing alternately ("paws at work")
      kneadPhase: 0,
      arch: 0, // stretch: back rises, head drops
      crouch: 0, // hunt: low and forward, ready to spring
      peek: 0, // tucked at an edge: only the face + front paws show
      closed: 0, // eyes shut (blink / groom)
      squint: 0, // relaxed, content purr eyes
      happy: 0, // little upward "^ ^" eyes
      wide: 0, // startled / alert eyes
      pupilX: 0,
      pupilY: 0,
      sx: 1,
      sy: 1, // squash/stretch (mochi drag, landing bounce)
      tilt: 0,
      lift: 0 // hop height (startle, drop landing)
    };
  }

  // Body silhouette: one rounded loaf plus a head block, relative to the
  // paws at (0,0) with y negative upward. Facing right by construction;
  // the rig transform in mount() below mirrors it for facing left.
  function drawSilhouette(ctx, p) {
    ctx.fillStyle = COLORS.BODY;
    var b = Math.round(p.bob);
    var hu = Math.round(p.headUp);
    var arch = Math.round(p.arch * 3);
    var cr = p.crouch;
    var top = -13 + b + Math.round(cr * 3); // loaf top
    var headTop = -16 + b - hu + Math.round(cr * 2);
    var backX = -9, frontX = 11;
    if (p.peek > 0.5) backX = 1; // peek mode: only the face block shows

    // loaf body, corners trimmed for a soft mochi silhouette
    rect(ctx, backX + 1, top, frontX - 1, -2);
    rect(ctx, backX, top + 1, frontX, -3);
    // stretch: the back rises into an arch
    if (arch > 0) {
      rect(ctx, backX + 1, top - arch, backX + 7, top);
      rect(ctx, backX + 2, top - arch - 1, backX + 6, top - arch);
    }
    // head block (front, taller than the body)
    rect(ctx, 0, headTop, frontX - 1, top);
    rect(ctx, 1, headTop - 1, frontX - 2, headTop);
    // ears: rounded, flatten back with negative `ear`
    var e = Math.round(p.ear);
    var earY = headTop - 1 - e;
    rect(ctx, 1, earY - 1, 3, earY - 1);
    rect(ctx, 2, earY - 2, 2, earY - 2 - (e > 0 ? 1 : 0));
    rect(ctx, 7, earY - 1, 9, earY - 1);
    rect(ctx, 8, earY - 2, 8, earY - 2 - (e > 0 ? 1 : 0));
    if (e < -1) {
      // flattened: wide low stubs instead of points
      rect(ctx, 0, headTop - 1, 3, headTop - 1);
      rect(ctx, 7, headTop - 1, 10, headTop - 1);
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
    if (p.peek < 0.5) rect(ctx, -6 - kb, -2 - Math.round(lf) + dangle, -4 - kb, 0 + dangle);
    if (p.paw < 0.05) {
      rect(ctx, 5 + kf, -2 - Math.round(rf) + dangle, 7 + kf, 0 + dangle);
    } else {
      // front paw raised beside the face (wave / groom)
      var ty = Math.round(-9 - p.paw * 6 + p.pawSwing);
      rect(ctx, 12, ty, 14, -2);
      rect(ctx, 13, ty - 1, 15, ty);
    }
    // tail: curls up behind the loaf
    if (p.peek < 0.5) {
      var wag = Math.round(p.tail * 1.5);
      var t0y = -8 + b;
      rect(ctx, backX - 2, t0y, backX, t0y + 1);
      rect(ctx, backX - 4, t0y - 1 + wag, backX - 2, t0y);
      rect(ctx, backX - 5, t0y - 4 + wag, backX - 4, t0y - 1 + wag);
      rect(ctx, backX - 4, t0y - 7 + wag * 2, backX - 3, t0y - 4 + wag);
    }
  }

  // Eye whites and inner-ear highlights — everything on the face EXCEPT
  // the pupils, which live on their own layer (see drawPupils).
  function drawFace(ctx, p) {
    var b = Math.round(p.bob);
    var hu = Math.round(p.headUp);
    var cr = p.crouch;
    var headTop = -16 + b - hu + Math.round(cr * 2);
    ctx.fillStyle = COLORS.EYE;
    if (p.ear > -1) {
      var e = Math.round(p.ear);
      var earY = headTop - 1 - e;
      cell(ctx, 2, earY - 1);
      cell(ctx, 8, earY - 1);
    }
    var ey = headTop + 6; // eye row
    var exs = [3, 8];
    for (var i = 0; i < 2; i++) {
      var x = exs[i];
      if (p.closed > 0.5) {
        rect(ctx, x, ey + 2, x + 1, ey + 2);
      } else if (p.squint > 0.5) {
        rect(ctx, x, ey + 1, x + 1, ey + 1);
      } else if (p.happy > 0.5) {
        cell(ctx, x, ey + 2);
        cell(ctx, x + 1, ey + 1);
        cell(ctx, x + 2, ey + 2);
      } else if (p.wide > 0.5) {
        rect(ctx, x, ey - 1, x + 1, ey + 3);
      } else {
        rect(ctx, x, ey, x + 1, ey + 2);
      }
    }
  }

  // Pupils: drawn to their own transparent layer so eye-follow can update
  // every frame without touching (or waiting on) the body pose.
  function drawPupils(ctx, p) {
    if (p.closed > 0.5 || p.squint > 0.5 || p.happy > 0.5) return;
    var b = Math.round(p.bob);
    var hu = Math.round(p.headUp);
    var cr = p.crouch;
    var headTop = -16 + b - hu + Math.round(cr * 2);
    var ey = headTop + 6;
    var ox = p.pupilX > 0.4 ? 1 : 0; // eyes are 2 cells wide: pupil sits left or right
    var oy = Math.max(-1, Math.min(1, Math.round(p.pupilY)));
    if (p.wide > 0.5) oy = Math.max(-1, Math.min(2, oy));
    ctx.fillStyle = COLORS.PUPIL;
    var exs = [3, 8];
    for (var i = 0; i < 2; i++) cell(ctx, exs[i] + ox, ey + 1 + oy);
  }

  // Literal 16x16 pixel-map for the face-only favicon crop: 0 empty,
  // 1 outline, 2 body, 3 eye. Kept separate from the parametric rig above
  // because a favicon needs one fixed, hand-tuned frame, not an eased pose.
  function faceOnlyGrid() {
    return [
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
  }

  /* ================================================== TWO-CANVAS MOUNT === */
  function makeBuffer(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  function setSize(canvas, scale) {
    canvas.width = GRID_W * scale;
    canvas.height = GRID_H * scale;
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
  }
  function createLayer(className) {
    var c = document.createElement("canvas");
    c.className = className;
    c.setAttribute("aria-hidden", "true");
    return c;
  }

  // Builds the stacked body + eye canvases at `scale` screen px per logical
  // px and returns draw functions closed over their own compositing
  // buffers. Both layers share one coordinate system (see rig()) so a
  // caller can move/transform them identically and they stay aligned.
  function mount(scale) {
    var bodyCanvas = createLayer("kuro-body");
    var eyeCanvas = createLayer("kuro-eyes");
    setSize(bodyCanvas, scale);
    setSize(eyeCanvas, scale);
    var bodyCtx = bodyCanvas.getContext("2d");
    var eyeCtx = eyeCanvas.getContext("2d");

    // Internal buffers: silhouette mask, its dilated (outline) copy, and
    // the face layer, composited into the body canvas each call.
    var mask = makeBuffer(GRID_W, GRID_H), mctx = mask.getContext("2d");
    var outline = makeBuffer(GRID_W, GRID_H), octx = outline.getContext("2d");
    var face = makeBuffer(GRID_W, GRID_H), fctx = face.getContext("2d");
    var pupilLayer = makeBuffer(GRID_W, GRID_H), pctx = pupilLayer.getContext("2d");

    function rig(ctx, facing) {
      ctx.setTransform(facing, 0, 0, 1, CX, BY);
    }
    function composite(target, source, pose, scaleNow) {
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.clearRect(0, 0, target.canvas.width, target.canvas.height);
      target.imageSmoothingEnabled = false;
      target.setTransform(scaleNow, 0, 0, scaleNow, 0, 0);
      target.translate(CX, BY - pose.lift);
      target.rotate(pose.tilt);
      target.scale(pose.sx, pose.sy);
      source.forEach(function (layer) {
        target.drawImage(layer, -CX, -BY);
      });
    }

    function drawBody(pose, scaleNow) {
      refreshColors();
      [mctx, octx, fctx].forEach(function (b) {
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.clearRect(0, 0, GRID_W, GRID_H);
      });
      rig(mctx, pose.facing);
      drawSilhouette(mctx, pose);
      // Outline: the mask stamped in its 8 neighbouring positions, tinted light
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          octx.drawImage(mask, dx, dy);
        }
      }
      octx.globalCompositeOperation = "source-in";
      octx.fillStyle = COLORS.OUTLINE;
      octx.fillRect(0, 0, GRID_W, GRID_H);
      octx.globalCompositeOperation = "source-over";
      rig(fctx, pose.facing);
      drawFace(fctx, pose);
      composite(bodyCtx, [outline, mask, face], pose, scaleNow);
    }

    function drawEyes(pose, scaleNow) {
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.clearRect(0, 0, GRID_W, GRID_H);
      rig(pctx, pose.facing);
      drawPupils(pctx, pose);
      composite(eyeCtx, [pupilLayer], pose, scaleNow);
    }

    return {
      bodyCanvas: bodyCanvas,
      eyeCanvas: eyeCanvas,
      bodyCtx: bodyCtx,
      eyeCtx: eyeCtx,
      drawBody: drawBody,
      drawEyes: drawEyes
    };
  }

  /* ------------------------------------------------------- HIT TESTING */
  // Click-through: the canvases are pointer-events:none in CSS, so real
  // links/buttons underneath always receive clicks. js/kuro-state.js uses
  // this alpha test from document-level pointer listeners instead, to know
  // when the pointer is over an actually-opaque Kuro pixel (for drag-start,
  // petting, and swallowing the synthetic click after a drag).
  function hitTest(canvas, clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return false;
    var lx = Math.floor((clientX - r.left) * (canvas.width / r.width));
    var ly = Math.floor((clientY - r.top) * (canvas.height / r.height));
    try {
      return canvas.getContext("2d").getImageData(lx, ly, 1, 1).data[3] > 0;
    } catch (e) {
      return true;
    }
  }

  /* ----------------------------------------------------------- FAVICON */
  // Renders the face-only pose to an offscreen canvas at each requested
  // size and returns a data URL — no committed PNG/ICO files.
  function renderFaviconDataURL(size) {
    refreshColors();
    var g = document.createElement("canvas");
    g.width = 16;
    g.height = 16;
    var gc = g.getContext("2d");
    gc.fillStyle = "#0c0c0f"; // opaque ground so the tab icon has no transparent hole
    gc.fillRect(0, 0, 16, 16);
    var rows = faceOnlyGrid();
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var ch = rows[y].charAt(x);
        if (ch === "0") continue;
        gc.fillStyle = ch === "2" ? COLORS.BODY : COLORS.OUTLINE;
        gc.fillRect(x, y, 1, 1);
      }
    }
    var out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    var oc = out.getContext("2d");
    oc.imageSmoothingEnabled = false;
    oc.drawImage(g, 0, 0, size, size);
    return out.toDataURL("image/png");
  }

  function installFavicon() {
    [16, 32, 180, 192].forEach(function (size) {
      var isTouch = size === 180;
      var id = "kuro-favicon-" + size;
      var link = document.getElementById(id);
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = isTouch ? "apple-touch-icon" : "icon";
        if (!isTouch) {
          link.type = "image/png";
          link.sizes = size + "x" + size;
        }
        document.head.appendChild(link);
      }
      link.href = renderFaviconDataURL(size);
    });
  }

  window.KuroRender = {
    GRID_W: GRID_W,
    GRID_H: GRID_H,
    CX: CX,
    BY: BY,
    COLORS: COLORS,
    refreshColors: refreshColors,
    defaultPose: defaultPose,
    mount: mount,
    setSize: setSize,
    hitTest: hitTest,
    installFavicon: installFavicon
  };
})();

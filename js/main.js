/* Kim De Guzman — portfolio
   Carousels and lightbox, theme toggle, overlay menu, active nav, scroll
   reveal, typed name, copy button, back-to-top.
   Image lists live in js/images.js (loaded first).
   No dependencies. The page is usable without this file. */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    return node;
  }

  function iconSvg(id) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  /* -------------------------------------------------------------- lightbox
     One viewer, reused by every gallery and every certificate thumbnail.
     Built on first use so a visitor who never enlarges anything never pays
     for it. */
  var box = null;

  function buildLightbox() {
    var node = el("div", "lightbox", {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Image viewer",
      hidden: "hidden"
    });
    var backdrop = el("div", "lightbox__backdrop");
    var stage = el("div", "lightbox__stage");
    var img = el("img", "lightbox__img", { alt: "", decoding: "async" });
    var fig = el("figure", "lightbox__figure");
    var cap = el("figcaption", "lightbox__cap");
    var title = el("span", "lightbox__title");
    var text = el("span", "lightbox__text");
    var count = el("span", "lightbox__count");
    cap.appendChild(title);
    cap.appendChild(text);
    cap.appendChild(count);
    fig.appendChild(img);
    fig.appendChild(cap);
    stage.appendChild(fig);

    var rail = el("div", "lightbox__thumbs", { role: "tablist", "aria-label": "Choose image" });
    stage.appendChild(rail);

    var close = el("button", "lightbox__close", { type: "button", "aria-label": "Close image viewer" });
    close.appendChild(iconSvg("i-close"));
    var prev = el("button", "lightbox__btn lightbox__btn--prev", { type: "button", "aria-label": "Previous image" });
    prev.appendChild(iconSvg("i-arrow-left"));
    var next = el("button", "lightbox__btn lightbox__btn--next", { type: "button", "aria-label": "Next image" });
    next.appendChild(iconSvg("i-arrow-right"));

    node.appendChild(backdrop);
    node.appendChild(stage);
    node.appendChild(close);
    node.appendChild(prev);
    node.appendChild(next);
    document.body.appendChild(node);

    var state = { items: [], index: 0, opener: null, title: "", onClose: null };
    var thumbEls = [];

    function buildThumbs() {
      rail.textContent = "";
      thumbEls = [];
      // A rail only earns its space once there are three or more images.
      var wanted = state.items.length >= 3;
      rail.hidden = !wanted;
      if (!wanted) return;
      state.items.forEach(function (it, i) {
        var b = el("button", "lightbox__thumb", {
          type: "button",
          role: "tab",
          "aria-label": "Image " + (i + 1) + " of " + state.items.length
        });
        var t = el("img", null, { src: it.src, alt: "", loading: "lazy", decoding: "async" });
        b.appendChild(t);
        b.addEventListener("click", function () {
          show(i);
        });
        rail.appendChild(b);
        thumbEls.push(b);
      });
    }

    function focusables() {
      return [close, prev, next]
        .concat(thumbEls)
        .filter(function (b) {
          return !b.hidden && b.offsetParent !== null;
        });
    }

    function show(n) {
      var total = state.items.length;
      state.index = ((n % total) + total) % total;
      var it = state.items[state.index];
      img.setAttribute("src", it.src);
      img.setAttribute("alt", it.alt);
      if (it.w && it.h) {
        img.setAttribute("width", it.w);
        img.setAttribute("height", it.h);
      } else {
        img.removeAttribute("width");
        img.removeAttribute("height");
      }
      title.textContent = state.title || "";
      text.textContent = it.caption || "";
      count.textContent = total > 1 ? state.index + 1 + " / " + total : "";
      title.hidden = !title.textContent;
      text.hidden = !text.textContent;
      count.hidden = !count.textContent;
      cap.hidden = title.hidden && text.hidden && count.hidden;
      var many = total > 1;
      prev.hidden = !many;
      next.hidden = !many;
      for (var i = 0; i < thumbEls.length; i++) {
        if (i === state.index) thumbEls[i].setAttribute("aria-current", "true");
        else thumbEls[i].removeAttribute("aria-current");
      }
      if (thumbEls[state.index] && thumbEls[state.index].scrollIntoView) {
        thumbEls[state.index].scrollIntoView({ block: "nearest", inline: "center" });
      }
    }

    function open(items, index, opener, opts) {
      if (!items.length) return;
      state.items = items;
      state.opener = opener || null;
      state.title = (opts && opts.title) || "";
      state.onClose = (opts && opts.onClose) || null;
      buildThumbs();
      node.hidden = false;
      document.body.classList.add("is-lightboxed");
      show(index || 0);
      close.focus();
    }

    function shut() {
      node.hidden = true;
      document.body.classList.remove("is-lightboxed");
      img.removeAttribute("src");
      // Hand the card the slide the visitor ended on, so the two agree.
      if (state.onClose) state.onClose(state.index);
      if (state.opener && document.contains(state.opener)) state.opener.focus();
      state.opener = null;
      state.onClose = null;
    }

    close.addEventListener("click", shut);
    backdrop.addEventListener("click", shut);
    stage.addEventListener("click", function (e) {
      if (e.target === stage || e.target === fig) shut();
    });
    prev.addEventListener("click", function () {
      show(state.index - 1);
    });
    next.addEventListener("click", function () {
      show(state.index + 1);
    });
    document.addEventListener("keydown", function (e) {
      if (node.hidden) return;
      if (e.key === "Escape") {
        e.preventDefault();
        shut();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        show(state.index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        show(state.index + 1);
      } else if (e.key === "Tab") {
        // Keep focus inside the dialog: a short, known set of controls.
        var list = focusables();
        if (!list.length) return;
        var at = list.indexOf(document.activeElement);
        e.preventDefault();
        var step = e.shiftKey ? -1 : 1;
        var to = (((at < 0 ? 0 : at + step) % list.length) + list.length) % list.length;
        list[to].focus();
      }
    });

    swipe(stage, function (dir) {
      if (state.items.length > 1) show(state.index + dir);
    });

    return { open: open };
  }

  function enlarge(items, index, opener, opts) {
    if (!box) box = buildLightbox();
    box.open(items, index, opener, opts);
  }

  /* Horizontal swipe on a node; calls back with +1 (next) or -1 (prev). */
  function swipe(node, onSwipe) {
    var startX = null;
    var startY = null;
    node.addEventListener(
      "pointerdown",
      function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
      },
      { passive: true }
    );
    node.addEventListener(
      "pointerup",
      function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        startX = startY = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
    node.addEventListener("pointercancel", function () {
      startX = startY = null;
    });
    node.style.touchAction = "pan-y";
  }

  /* --------------------------------------------------------------- carousel */
  function placeholder(initials) {
    var ph = el("span", "thumb__ph halftone", { "aria-hidden": "true" });
    ph.setAttribute("data-initials", initials);
    return ph;
  }

  /* Accepts a path string, a { src, caption } pair, or the full
     { src, w, h, alt, pos, caption } record that js/images.js writes. */
  function normalize(entry, i, altBase) {
    var e = typeof entry === "string" ? { src: entry } : entry;
    return {
      src: e.src,
      w: e.w || 0,
      h: e.h || 0,
      alt: e.alt || altBase + " " + (i + 1),
      pos: e.pos || "",
      caption: e.caption || ""
    };
  }

  function buildCarousel(host, item) {
    var initials = host.getAttribute("data-initials") || "";
    var altBase = host.getAttribute("data-alt") || "Image";
    var list = (item && item.images) || (item && item.length ? item : []);
    var title = (item && item.title) || altBase;
    var track = el("div", "carousel__track");
    host.appendChild(track);

    var sources = [];
    for (var s = 0; s < list.length; s++) sources.push(normalize(list[s], s, altBase));

    // Probe every configured file; keep the ones that actually load, so a
    // gallery can be listed before its screenshots exist.
    var loaded = [];
    var pending = sources.length;
    if (!pending) return finish();

    sources.forEach(function (entry, i) {
      var probe = new Image();
      probe.onload = function () {
        entry.index = i;
        loaded.push(entry);
        done();
      };
      probe.onerror = done;
      probe.src = entry.src;
    });

    function done() {
      pending -= 1;
      if (pending === 0) finish();
    }

    function finish() {
      loaded.sort(function (a, b) {
        return a.index - b.index;
      });
      if (!loaded.length) {
        var only = el("div", "carousel__slide");
        only.appendChild(placeholder(initials));
        track.appendChild(only);
        host.setAttribute("aria-label", altBase + " (no images yet)");
        return;
      }
      loaded.forEach(function (it, n) {
        var slide = el("div", "carousel__slide", { role: "group", "aria-roledescription": "slide" });
        slide.setAttribute("aria-label", n + 1 + " of " + loaded.length);
        var attrs = {
          src: it.src,
          alt: it.alt,
          loading: n === 0 ? "eager" : "lazy",
          decoding: "async"
        };
        if (it.w && it.h) {
          attrs.width = it.w;
          attrs.height = it.h;
        }
        var img = el("img", null, attrs);
        if (it.pos) img.style.objectPosition = it.pos; // keep the key line inside the crop
        // The slide fills the space around a contained image with the image
        // itself, blurred (see .carousel__slide::before). Same URL, so the
        // browser reuses the one it already has: no second download. It must
        // be absolute: a relative url() inside a custom property resolves
        // against the stylesheet's folder (/css/), not the page.
        slide.style.setProperty("--shot", 'url("' + new URL(it.src, document.baseURI).href + '")');
        slide.appendChild(placeholder(initials));
        slide.appendChild(img);
        if (it.caption) {
          var cap = el("p", "carousel__caption");
          cap.textContent = it.caption;
          slide.appendChild(cap);
        }
        track.appendChild(slide);
      });

      var index = 0;
      var goTo = null; // set below when there is more than one slide
      var zoom = el("button", "carousel__zoom", {
        type: "button",
        "aria-label": "Enlarge " + title + (loaded.length > 1 ? ", " + loaded.length + " images" : "")
      });
      host.appendChild(zoom);
      // Track how the button was reached. Chromium keeps :focus-visible on a
      // clicked button, so after the popup closed the controls stayed up until
      // the next click elsewhere. On a pointer click we hand focus back to the
      // frame instead of the button, and the controls fade with the pointer.
      var viaPointer = false;
      zoom.addEventListener("pointerdown", function () {
        viaPointer = true;
      });
      zoom.addEventListener("blur", function () {
        viaPointer = false;
      });
      zoom.addEventListener("click", function () {
        var byMouse = viaPointer;
        enlarge(loaded, index, byMouse ? null : zoom, {
          title: title,
          onClose: function (n) {
            // The card follows the viewer, so closing lands on what was seen.
            if (goTo) goTo(n);
          }
        });
      });

      if (loaded.length > 1) {
        goTo = enableControls(host, track, loaded.length, altBase, function (n) {
          index = n;
        });
      }
    }
  }

  function enableControls(host, track, count, altBase, onChange) {
    var index = 0;
    host.setAttribute("tabindex", "0");
    host.setAttribute("role", "region");
    host.setAttribute("aria-roledescription", "carousel");
    host.setAttribute("aria-label", altBase + "s");

    var prev = el("button", "carousel__btn carousel__btn--prev", { type: "button", "aria-label": "Previous image" });
    prev.appendChild(iconSvg("i-arrow-left"));
    var next = el("button", "carousel__btn carousel__btn--next", { type: "button", "aria-label": "Next image" });
    next.appendChild(iconSvg("i-arrow-right"));
    var dots = el("div", "carousel__dots", { role: "tablist", "aria-label": "Choose image" });
    var dotEls = [];
    for (var i = 0; i < count; i++) {
      var d = el("button", "carousel__dot", { type: "button", role: "tab", "aria-label": "Image " + (i + 1) + " of " + count });
      d.setAttribute("data-index", String(i));
      dots.appendChild(d);
      dotEls.push(d);
    }
    var tally = el("p", "carousel__count");
    host.appendChild(prev);
    host.appendChild(next);
    host.appendChild(dots);
    host.appendChild(tally);

    function go(n) {
      index = ((n % count) + count) % count; // wrap both ends
      track.style.transform = "translateX(-" + index * 100 + "%)";
      tally.textContent = index + 1 + " / " + count;
      for (var k = 0; k < dotEls.length; k++) {
        if (k === index) dotEls[k].setAttribute("aria-current", "true");
        else dotEls[k].removeAttribute("aria-current");
      }
      onChange(index);
    }
    go(0);

    prev.addEventListener("click", function () {
      go(index - 1);
    });
    next.addEventListener("click", function () {
      go(index + 1);
    });
    dots.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-index]") : null;
      if (b) go(parseInt(b.getAttribute("data-index"), 10));
    });
    host.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(count - 1);
      }
    });

    swipe(host, function (dir) {
      go(index + dir);
    });

    return go;
  }

  var hosts = document.querySelectorAll("[data-carousel]");
  for (var h = 0; h < hosts.length; h++) {
    var key = hosts[h].getAttribute("data-carousel").split(":");
    var group = (typeof IMAGES === "object" && IMAGES[key[0]]) || {};
    buildCarousel(hosts[h], group[key[1]]);
  }

  /* Certificate and internship thumbnails: same viewer, no visible controls,
     so a visitor can actually read the certificate. */
  var thumbs = document.querySelectorAll(".thumb--cert img, .thumb--cert-lg img");
  for (var t = 0; t < thumbs.length; t++) {
    (function (img) {
      var figure = img.parentNode;
      function openThis() {
        var cap = figure.querySelector("figcaption");
        enlarge(
          [
            {
              src: img.getAttribute("src"),
              alt: img.getAttribute("alt") || "",
              caption: cap ? cap.textContent.trim() : "",
              w: img.naturalWidth,
              h: img.naturalHeight
            }
          ],
          0,
          byPointer ? null : figure,
          { title: img.getAttribute("alt") || "" }
        );
      }
      // Only a thumbnail that actually loaded becomes a control; the ones
      // still waiting on a file keep their halftone placeholder, inert.
      var byPointer = false;
      function activate() {
        if (!img.naturalWidth) return;
        figure.classList.add("thumb--zoomable");
        figure.setAttribute("tabindex", "0");
        figure.setAttribute("role", "button");
        figure.setAttribute("aria-label", "Enlarge: " + (img.getAttribute("alt") || "certificate"));
        figure.addEventListener("pointerdown", function () {
          byPointer = true;
        });
        figure.addEventListener("blur", function () {
          byPointer = false;
        });
        figure.addEventListener("click", openThis);
        figure.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openThis();
          }
        });
      }
      if (img.complete) activate();
      else img.addEventListener("load", activate);
    })(thumbs[t]);
  }

  /* ------------------------------------------------------------------ theme */
  // Two modes only, dark by default; the choice is stored under "theme".
  var toggles = document.querySelectorAll("[data-theme-toggle]");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    var next = theme === "dark" ? "light" : "dark";
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute("aria-label", "Switch to " + next + " mode");
    }
  }

  function applyTheme(theme, animate, origin) {
    if (!animate || reduceMotion.matches) return setTheme(theme);
    if (typeof document.startViewTransition === "function" && origin) {
      // Circular reveal expanding from the toggle
      var r = origin.getBoundingClientRect();
      var x = Math.round(r.left + r.width / 2);
      var y = Math.round(r.top + r.height / 2);
      var radius = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)));

      window.__themeTransitioning = true;
      var transition = document.startViewTransition(function () {
        setTheme(theme);
      });

      transition.ready.then(function () {
        var anim = document.documentElement.animate(
          {
            clipPath: [
              "circle(0px at " + x + "px " + y + "px)",
              "circle(" + radius + "px at " + x + "px " + y + "px)"
            ]
          },
          {
            duration: 360,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)"
          }
        );
        anim.finished.finally(function () {
          window.__themeTransitioning = false;
        });
      }).catch(function () {
        window.__themeTransitioning = false;
      });
      transition.finished.finally(function () {
        window.__themeTransitioning = false;
      });
      return;
    }
    root.classList.add("theme-transition");
    window.setTimeout(function () {
      root.classList.remove("theme-transition");
    }, 320);
    setTheme(theme);
  }

  for (var t = 0; t < toggles.length; t++) {
    toggles[t].addEventListener("click", function (e) {
      if (window.__themeTransitioning) return;
      var next = currentTheme() === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme", next);
      } catch (e2) {}
      applyTheme(next, true, e.currentTarget);
    });
  }
  applyTheme(currentTheme(), false);

  /* ------------------------------------------------------------- overlay menu */
  var menu = document.getElementById("menu");
  var openBtn = document.querySelector("[data-menu-open]");
  var closeBtn = document.querySelector("[data-menu-close]");
  var lastFocus = null;

  function setMenu(open) {
    if (!menu) return;
    menu.setAttribute("data-open", open ? "true" : "false");
    if (openBtn) openBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      lastFocus = document.activeElement;
      var first = menu.querySelector("a, button");
      if (first) first.focus();
    } else if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  if (menu && openBtn) {
    openBtn.addEventListener("click", function () {
      setMenu(true);
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        setMenu(false);
      });
    }
    menu.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[href^='#']") : null;
      if (a) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.getAttribute("data-open") === "true") setMenu(false);
    });
    var desktop = window.matchMedia("(min-width: 1024px)");
    if (typeof desktop.addEventListener === "function") {
      desktop.addEventListener("change", function (ev) {
        if (ev.matches) setMenu(false);
      });
    }
    menu.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || menu.getAttribute("data-open") !== "true") return;
      var focusable = menu.querySelectorAll("a[href], button:not([disabled])");
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* -------------------------------------------- active section + progress */
  var navLinks = document.querySelectorAll("[data-nav] a[href^='#']");
  var sections = [];
  for (var n = 0; n < navLinks.length; n++) {
    var id = navLinks[n].getAttribute("href").slice(1);
    var node = document.getElementById(id);
    if (node && sections.indexOf(node) === -1) sections.push(node);
  }

  function setActive(id) {
    for (var i = 0; i < navLinks.length; i++) {
      if (navLinks[i].getAttribute("href") === "#" + id) navLinks[i].setAttribute("aria-current", "true");
      else navLinks[i].removeAttribute("aria-current");
    }
  }

  // Position-based spy: the active section is the last one whose top has
  // passed a line near the top of the viewport (25%, at most 160px). At the very bottom of the page the
  // last section wins even if it is shorter than the viewport.
  if (sections.length) {
    var spyTicking = false;
    function updateActive() {
      spyTicking = false;
      var doc = document.documentElement;
      var atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      var line = window.scrollY + Math.min(window.innerHeight * 0.25, 160);
      var current = "";
      if (atBottom) {
        current = sections[sections.length - 1].id;
      } else {
        for (var i = 0; i < sections.length; i++) {
          var top = sections[i].getBoundingClientRect().top + window.scrollY;
          if (top <= line) current = sections[i].id;
        }
      }
      setActive(current);
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!spyTicking) {
          spyTicking = true;
          window.requestAnimationFrame(updateActive);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", updateActive);
    window.addEventListener("load", updateActive);
    updateActive();
  }

  /* ------------------------------------------------------------ scroll reveal */
  // Section content fades up as it enters; items that arrive together are
  // staggered a little. Nothing moves under prefers-reduced-motion.
  var revealSelector =
    ".section__head, .prose, .highlight, .tl, .skill-group, .card, .cert, .contact > *, .footer";
  var revealItems = document.querySelectorAll(revealSelector);
  if (revealItems.length && !reduceMotion.matches && "IntersectionObserver" in window) {
    for (var ri = 0; ri < revealItems.length; ri++) revealItems[ri].classList.add("reveal");
    var revealIO = new IntersectionObserver(
      function (entries, obs) {
        var k = 0;
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          entries[i].target.style.transitionDelay = Math.min(k * 70, 420) + "ms";
          entries[i].target.classList.add("is-visible");
          obs.unobserve(entries[i].target);
          k += 1;
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    for (var rj = 0; rj < revealItems.length; rj++) revealIO.observe(revealItems[rj]);
    // Anything already on screen shows at once
    window.requestAnimationFrame(function () {
      for (var rk = 0; rk < revealItems.length; rk++) {
        if (revealItems[rk].getBoundingClientRect().top < window.innerHeight * 0.9) {
          revealItems[rk].classList.add("is-visible");
        }
      }
    });
  }

  /* ----------------------------------------------------------- resume viewer */
  // "view resume" opens the PDF in a dialog on screens with a pointer; on
  // phones (no room, and mobile browsers seldom render PDFs in frames) the
  // link opens the file itself in a new tab, as it does without JS.
  var resume = document.getElementById("resume");
  var resumeFrame = resume && resume.querySelector(".resume__frame");
  var resumeInline = window.matchMedia("(min-width: 768px) and (hover: hover)");
  if (resume && typeof resume.showModal === "function") {
    var openResume = function (e) {
      if (!resumeInline.matches) return;
      e.preventDefault();
      if (!resumeFrame.src) resumeFrame.src = resumeFrame.getAttribute("data-src");
      resume.showModal();
      document.body.style.overflow = "hidden";
    };
    var closeResume = function () {
      document.body.style.overflow = "";
    };
    var openers = document.querySelectorAll("[data-resume-open]");
    for (var ro = 0; ro < openers.length; ro++) openers[ro].addEventListener("click", openResume);
    var closers = resume.querySelectorAll("[data-resume-close]");
    for (var rc = 0; rc < closers.length; rc++) {
      closers[rc].addEventListener("click", function () {
        resume.close();
      });
    }
    resume.addEventListener("close", closeResume);
    // a click on the backdrop closes it too
    resume.addEventListener("click", function (e) {
      if (e.target === resume) resume.close();
    });
  }

  /* ------------------------------------------------------- portrait develops */
  // The halftone field behind the photo resolves in once, the first time the
  // hero is on screen (styles.css, "Developing"). A timer guarantees the
  // photo shows even if the observer never fires.
  var portrait = document.querySelector(".portrait");
  if (portrait) {
    var develop = function () {
      portrait.classList.add("is-developed");
    };
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      develop();
    } else {
      var portraitIO = new IntersectionObserver(
        function (entries, obs) {
          if (!entries[0].isIntersecting) return;
          obs.disconnect();
          window.setTimeout(develop, 120);
        },
        { threshold: 0.3 }
      );
      portraitIO.observe(portrait);
      window.setTimeout(develop, 2500);
    }
  }

  /* -------------------------------------------------------------- typed name */
  var typed = document.querySelector("[data-type]");
  if (typed && !reduceMotion.matches) {
    var full = typed.getAttribute("data-type");
    typed.textContent = "";
    typed.classList.add("is-typing");
    var n = 0;
    var tick = function () {
      n += 1;
      typed.textContent = full.slice(0, n);
      if (n < full.length) {
        window.setTimeout(tick, 32 + Math.random() * 28);
      } else {
        window.setTimeout(function () {
          typed.classList.remove("is-typing");
        }, 1100);
      }
    };
    window.setTimeout(tick, 250);
  }

  /* ------------------------------------------------------------- copy button */
  var copyBtns = document.querySelectorAll("[data-copy]");
  for (var cb = 0; cb < copyBtns.length; cb++) {
    copyBtns[cb].addEventListener("click", function () {
      var btn = this;
      var text = btn.getAttribute("data-copy");
      var label = btn.querySelector("[data-copy-label]");
      var done = function () {
        btn.classList.add("is-copied");
        if (label) label.textContent = "copied";
        window.setTimeout(function () {
          btn.classList.remove("is-copied");
          if (label) label.textContent = "copy";
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  }

  /* -------------------------------------------------------------- back to top */
  var toTop = document.querySelector("[data-to-top]");
  if (toTop) {
    var topTicking = false;
    var updateTop = function () {
      topTicking = false;
      toTop.classList.toggle("is-shown", window.scrollY > 700);
    };
    window.addEventListener(
      "scroll",
      function () {
        if (!topTicking) {
          topTicking = true;
          window.requestAnimationFrame(updateTop);
        }
      },
      { passive: true }
    );
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
    updateTop();
  }

  /* -------------------------------------------------------------- footer year */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();

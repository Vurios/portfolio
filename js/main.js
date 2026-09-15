/* Kim De Guzman — portfolio
   Image config, carousels, theme toggle, overlay menu, active nav, footer year. No dependencies. The page is usable without this file. */

/* ----------------------------------------------------------------- images
   Add or remove filenames here; no markup changes needed. Each key matches a
   data-carousel="group:key" attribute in index.html. Missing files are
   skipped automatically; when none load, the halftone placeholder shows. */
var IMAGES = {
  projects: {
    saro: [
      "assets/images/projects/saro-1.jpg",
      "assets/images/projects/saro-2.jpg",
      "assets/images/projects/saro-3.jpg"
    ],
    argusph: [
      "assets/images/projects/argusph-1.jpg",
      "assets/images/projects/argusph-2.jpg",
      "assets/images/projects/argusph-3.jpg"
    ],
    safetrack: [
      "assets/images/projects/safetrack-1.jpg",
      "assets/images/projects/safetrack-2.jpg",
      "assets/images/projects/safetrack-3.jpg"
    ],
    "library-assistant": [
      "assets/images/projects/library-assistant-1.jpg",
      "assets/images/projects/library-assistant-2.jpg",
      "assets/images/projects/library-assistant-3.jpg"
    ]
  },
  achievements: {
    "ibalong-2026": [
      "assets/images/achievements/ibalong-2026-1.jpg",
      "assets/images/achievements/ibalong-2026-2.jpg",
      "assets/images/achievements/ibalong-2026-3.jpg"
    ],
    "ai4ai-2026": [
      "assets/images/achievements/ai4ai-2026-1.jpg",
      "assets/images/achievements/ai4ai-2026-2.jpg",
      "assets/images/achievements/ai4ai-2026-3.jpg"
    ]
  }
};

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

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

  /* --------------------------------------------------------------- carousel */
  function placeholder(initials) {
    var ph = el("span", "thumb__ph halftone", { "aria-hidden": "true" });
    ph.setAttribute("data-initials", initials);
    return ph;
  }

  function buildCarousel(host, sources) {
    var initials = host.getAttribute("data-initials") || "";
    var altBase = host.getAttribute("data-alt") || "Image";
    var track = el("div", "carousel__track");
    host.appendChild(track);

    // Probe every configured file; keep the ones that actually load.
    var loaded = [];
    var pending = sources.length;
    if (!pending) return finish();

    sources.forEach(function (src, i) {
      var img = new Image();
      img.onload = function () {
        loaded.push({ src: src, index: i });
        done();
      };
      img.onerror = done;
      img.src = src;
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
      loaded.forEach(function (item, n) {
        var slide = el("div", "carousel__slide", { role: "group", "aria-roledescription": "slide" });
        slide.setAttribute("aria-label", n + 1 + " of " + loaded.length);
        var img = el("img", null, {
          src: item.src,
          alt: altBase + " " + (n + 1),
          loading: n === 0 ? "eager" : "lazy",
          decoding: "async"
        });
        slide.appendChild(placeholder(initials));
        slide.appendChild(img);
        track.appendChild(slide);
      });
      if (loaded.length > 1) enableControls(host, track, loaded.length, altBase);
    }
  }

  function enableControls(host, track, count, altBase) {
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
    host.appendChild(prev);
    host.appendChild(next);
    host.appendChild(dots);

    function go(n) {
      index = ((n % count) + count) % count; // wrap both ends
      track.style.transform = "translateX(-" + index * 100 + "%)";
      for (var k = 0; k < dotEls.length; k++) {
        if (k === index) dotEls[k].setAttribute("aria-current", "true");
        else dotEls[k].removeAttribute("aria-current");
      }
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

    // Swipe: pointer events, horizontal intent only
    var startX = null;
    var startY = null;
    host.addEventListener(
      "pointerdown",
      function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
      },
      { passive: true }
    );
    host.addEventListener(
      "pointerup",
      function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        startX = startY = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? index + 1 : index - 1);
      },
      { passive: true }
    );
    host.addEventListener("pointercancel", function () {
      startX = startY = null;
    });
    host.style.touchAction = "pan-y";
  }

  var hosts = document.querySelectorAll("[data-carousel]");
  for (var h = 0; h < hosts.length; h++) {
    var key = hosts[h].getAttribute("data-carousel").split(":");
    var group = IMAGES[key[0]] || {};
    buildCarousel(hosts[h], group[key[1]] || []);
  }

  /* ------------------------------------------------------------------ theme */
  var PREFS = ["system", "light", "dark"];
  var toggles = document.querySelectorAll("[data-theme-toggle]");

  function readPref() {
    try {
      var v = localStorage.getItem("theme");
      return PREFS.indexOf(v) > -1 ? v : "system";
    } catch (e) {
      return "system";
    }
  }

  function applyTheme(pref, animate) {
    var dark = pref === "dark" || (pref === "system" && systemDark.matches);
    if (animate && !reduceMotion.matches) {
      root.classList.add("theme-transition");
      window.setTimeout(function () {
        root.classList.remove("theme-transition");
      }, 520);
    }
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-theme-pref", pref);
    var next = PREFS[(PREFS.indexOf(pref) + 1) % PREFS.length];
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute("aria-label", "Theme: " + pref + ". Switch to " + next + ".");
    }
  }

  function cyclePref() {
    var pref = PREFS[(PREFS.indexOf(readPref()) + 1) % PREFS.length];
    try {
      localStorage.setItem("theme", pref);
    } catch (e) {}
    applyTheme(pref, true);
  }

  for (var t = 0; t < toggles.length; t++) {
    toggles[t].addEventListener("click", cyclePref);
  }
  applyTheme(readPref(), false);

  if (typeof systemDark.addEventListener === "function") {
    systemDark.addEventListener("change", function () {
      if (readPref() === "system") applyTheme("system", true);
    });
  }

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

  if (sections.length && "IntersectionObserver" in window) {
    var visible = {};
    var spy = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          visible[entries[i].target.id] = entries[i].isIntersecting;
        }
        var best = null;
        for (var s = 0; s < sections.length; s++) {
          if (visible[sections[s].id]) {
            best = sections[s].id;
            break;
          }
        }
        if (best) setActive(best);
        else if (window.scrollY < 200) setActive("");
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.01] }
    );
    for (var q = 0; q < sections.length; q++) spy.observe(sections[q]);
  }

  /* -------------------------------------------------------------- footer year */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();

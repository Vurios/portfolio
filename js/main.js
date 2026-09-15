/* Kim De Guzman — portfolio
   Image config, carousels, theme toggle, overlay menu, active nav, scroll
   reveal, card spotlight, typed name, local clock, copy button, back-to-top.
   No dependencies. The page is usable without this file. */

/* ----------------------------------------------------------------- images
   Add or remove filenames here; no markup changes needed. Each key matches a
   data-carousel="group:key" attribute in index.html. Entries are either a
   path string or { src, caption }; a caption shows as a small chip on that
   slide. Missing files are skipped automatically; when none load, the
   halftone placeholder shows. */
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
      { src: "assets/images/achievements/ibalong-2026-1.jpg", caption: "Event photo · 2026" },
      { src: "assets/images/achievements/ibalong-2026-2.jpg", caption: "Event photo · 2026" },
      { src: "assets/images/achievements/ibalong-2026-3.jpg", caption: "Event photo · 2026" },
      { src: "assets/images/achievements/ibalong-cert.jpg", caption: "3rd Place Certificate · 2026" }
    ],
    "ai4ai-2026": [
      { src: "assets/images/achievements/ai4ai-2026-1.jpg", caption: "Event photo · 2026" },
      { src: "assets/images/achievements/ai4ai-2026-2.jpg", caption: "Event photo · 2026" },
      { src: "assets/images/achievements/ai4ai-2026-3.jpg", caption: "Event photo · 2026" },
      { src: "assets/images/achievements/ai4ai-cert.jpg", caption: "1st Runner-Up Certificate · 2026" }
    ]
  }
};

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

    sources.forEach(function (entry, i) {
      var src = typeof entry === "string" ? entry : entry.src;
      var caption = typeof entry === "string" ? "" : entry.caption || "";
      var img = new Image();
      img.onload = function () {
        loaded.push({ src: src, caption: caption, index: i });
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
        if (item.caption) {
          var cap = el("p", "carousel__caption");
          cap.textContent = item.caption;
          slide.appendChild(cap);
        }
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
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.style.setProperty("--vt-x", x + "px");
      root.style.setProperty("--vt-y", y + "px");
      root.style.setProperty("--vt-r", radius + "px");
      document.startViewTransition(function () {
        setTheme(theme);
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

  /* ---------------------------------------------------------- card spotlight */
  // A soft light follows the pointer across cards (pointer devices only)
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var cards = document.querySelectorAll(".card");
    for (var ci = 0; ci < cards.length; ci++) {
      cards[ci].addEventListener("pointermove", function (e) {
        var r = this.getBoundingClientRect();
        this.style.setProperty("--mx", e.clientX - r.left + "px");
        this.style.setProperty("--my", e.clientY - r.top + "px");
      });
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
        window.setTimeout(tick, 55 + Math.random() * 45);
      } else {
        window.setTimeout(function () {
          typed.classList.remove("is-typing");
        }, 1400);
      }
    };
    window.setTimeout(tick, 350);
  }

  /* ------------------------------------------------------------- local clock */
  var clock = document.querySelector("[data-clock]");
  if (clock) {
    var fmt = null;
    try {
      fmt = new Intl.DateTimeFormat("en-PH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Manila" });
    } catch (e) {}
    var updateClock = function () {
      clock.textContent = fmt ? fmt.format(new Date()) : "";
    };
    updateClock();
    window.setInterval(updateClock, 15000);
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

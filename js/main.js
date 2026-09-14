/* Kim De Guzman — portfolio
   Theme toggle, overlay menu, active-section nav, scroll reveal, footer year.
   No dependencies. The page is fully usable without this file. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

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

  // Follow the OS while in "system" mode
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
    // Close when a section link is chosen, on Escape, or when the layout
    // switches to the desktop sidebar.
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
    // Keep Tab inside the open menu
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

  /* ------------------------------------------------------ active nav section */
  var navLinks = document.querySelectorAll("[data-nav] a[href^='#']");
  var sections = [];
  for (var n = 0; n < navLinks.length; n++) {
    var id = navLinks[n].getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el && sections.indexOf(el) === -1) sections.push(el);
  }

  function setActive(id) {
    for (var i = 0; i < navLinks.length; i++) {
      var match = navLinks[i].getAttribute("href") === "#" + id;
      if (match) navLinks[i].setAttribute("aria-current", "true");
      else navLinks[i].removeAttribute("aria-current");
    }
  }

  if (sections.length && "IntersectionObserver" in window) {
    var visible = {};
    var spy = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          visible[entries[i].target.id] = entries[i].isIntersecting ? entries[i].intersectionRatio : 0;
        }
        // Pick the topmost section that is currently in the band
        var best = null;
        for (var s = 0; s < sections.length; s++) {
          if (visible[sections[s].id] > 0) {
            best = sections[s].id;
            break;
          }
        }
        if (best) setActive(best);
        else if (window.scrollY < 200) setActive("");
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.01] }
    );
    for (var s = 0; s < sections.length; s++) spy.observe(sections[s]);
  }

  /* ------------------------------------------------------------ scroll reveal */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      for (var r = 0; r < reveals.length; r++) reveals[r].classList.add("is-visible");
    } else {
      var io = new IntersectionObserver(
        function (entries, obs) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              entries[i].target.classList.add("is-visible");
              obs.unobserve(entries[i].target);
            }
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
      );
      for (var q = 0; q < reveals.length; q++) io.observe(reveals[q]);
      // Anything already on screen at load shows immediately
      window.requestAnimationFrame(function () {
        for (var k = 0; k < reveals.length; k++) {
          var rect = reveals[k].getBoundingClientRect();
          if (rect.top < window.innerHeight) reveals[k].classList.add("is-visible");
        }
      });
    }
  }

  /* -------------------------------------------------------------- footer year */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();

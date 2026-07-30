/*
 * Off-canvas nav toggle. The saved theme JS that originally drove this
 * (open/close on click) wasn't part of what got captured, so the trigger
 * was just a dead link back to the live site. This wires up the same
 * body.has-open-nav / .nav-trigger--active classes the theme's own CSS
 * already keys off of. No dependency on GSAP/motion.js — runs on every
 * page since the header is shared across all of them.
 */
(function () {
  "use strict";

  function open() {
    document.body.classList.add("has-open-nav");
    document.querySelectorAll(".js-nav-trigger").forEach(function (el) {
      el.classList.add("nav-trigger--active");
      el.setAttribute("aria-expanded", "true");
    });
  }

  function close() {
    document.body.classList.remove("has-open-nav");
    document.querySelectorAll(".js-nav-trigger").forEach(function (el) {
      el.classList.remove("nav-trigger--active");
      el.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest(".js-nav-trigger");
    if (trigger) {
      e.preventDefault();
      if (document.body.classList.contains("has-open-nav")) close();
      else open();
      return;
    }
    var closer = e.target.closest(".js-nav-trigger-close");
    if (closer) {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();

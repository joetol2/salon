/*
 * Motion layer for mysalonsuite.com clone — Lenis + GSAP/ScrollTrigger/SplitText.
 * Declarative: sections are already the real page markup, this file just
 * reads data-* attributes sprinkled onto that markup and animates it.
 *
 * Attributes:
 *   data-reveal="fade-up|mask|chars|lines"   single-element scroll reveal
 *   data-reveal-group + data-reveal-item     staggered group reveal
 *   data-parallax-container + data-parallax  scale-compensated media parallax
 *   data-parallax-speed="0.8"                direct element parallax (floating type)
 *   data-pin-horizontal + data-pin-track     pinned horizontal scroll moment
 *   data-load-in                             animated on page load, not on scroll
 */
(function () {
  "use strict";

  // Pulling the parallax image out of flow (position:absolute) means its
  // container no longer has any in-flow content to derive a height from,
  // so it collapses to 0 unless we give it one explicitly. Runs
  // unconditionally — independent of GSAP/reduced-motion — since it's a
  // layout fix, not an animation.
  document.querySelectorAll("[data-parallax-container]").forEach(function (container) {
    var media = container.querySelector("[data-parallax]");
    if (!media) return;
    var w = media.getAttribute("width");
    var h = media.getAttribute("height");
    if (w && h) container.style.aspectRatio = w + " / " + h;
  });

  function revealEverything() {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.style.opacity = "";
      el.style.visibility = "";
      el.style.clipPath = "";
      el.style.transform = "";
    });
  }

  try {
    init();
  } catch (err) {
    // whatever broke, the page's real content must not stay hidden because of it
    revealEverything();
  }

  function init() {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  if (!hasGsap) return; // no-JS / failed CDN load: page is already fully visible, nothing to do

  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  var ScrollTrigger = window.ScrollTrigger;
  var SplitText = window.SplitText;

  if (reduceMotion) {
    // Respect the OS-level preference: no smooth scroll takeover, no motion.
    // Content is visible by default in the HTML/CSS, so there's nothing else to do.
    return;
  }

  /* ---------------- Lenis <-> ScrollTrigger sync ---------------- */
  var lenis = null;
  if (window.Lenis && ScrollTrigger) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smoothWheel: true,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------- will-change hygiene helper ---------------- */
  function withWillChange(targets, tweenVars) {
    var els = gsap.utils.toArray(targets);
    els.forEach(function (el) {
      el.style.willChange = "transform, opacity";
    });
    var userOnComplete = tweenVars.onComplete;
    tweenVars.onComplete = function () {
      els.forEach(function (el) {
        el.style.willChange = "auto";
      });
      if (userOnComplete) userOnComplete();
    };
    return tweenVars;
  }

  /* ---------------- load-in sequence (header + hero) ---------------- */
  function loadInSequence() {
    var tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    var logo = document.querySelector(".header__logo:not(.header__content--hidden-desktop) img");
    var utilities = gsap.utils.toArray(".header__utilities li");
    var heroCols = gsap.utils.toArray(".hero-images__col");

    if (logo) {
      gsap.set(logo, { autoAlpha: 0, y: -16, scale: 0.96 });
      tl.to(logo, withWillChange(logo, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9 }), 0);
    }
    if (utilities.length) {
      gsap.set(utilities, { autoAlpha: 0, y: 18 });
      tl.to(
        utilities,
        withWillChange(utilities, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12 }),
        0.15
      );
    }
    if (heroCols.length) {
      gsap.set(heroCols, { clipPath: "inset(0 0 100% 0)" });
      tl.to(
        heroCols,
        withWillChange(heroCols, {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.1,
          stagger: 0.14,
          ease: "power4.out",
        }),
        0.25
      );
    }
  }
  loadInSequence();

  if (!ScrollTrigger) return;

  /* ---------------- generic scroll reveals ---------------- */
  function fadeUpReveal(el) {
    gsap.set(el, { autoAlpha: 0, y: 44 });
    gsap.to(
      el,
      withWillChange(el, {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      })
    );
  }

  function maskReveal(el) {
    gsap.set(el, { clipPath: "inset(0 0 100% 0)", y: 24 });
    gsap.to(
      el,
      withWillChange(el, {
        clipPath: "inset(0 0 0% 0)",
        y: 0,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      })
    );
  }

  function splitReveal(el, type) {
    if (!SplitText) {
      fadeUpReveal(el);
      return;
    }
    var split = new SplitText(el, { type: type, linesClass: "split-line" });
    var units = type === "chars" ? split.chars : split.lines;
    gsap.set(units, { autoAlpha: 0, yPercent: 100 });
    gsap.to(
      units,
      withWillChange(units, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.8,
        ease: "power4.out",
        stagger: type === "chars" ? 0.02 : 0.08,
        scrollTrigger: { trigger: el, start: "top 85%" },
        onComplete: function () {
          split.revert();
        },
      })
    );
  }

  gsap.utils.toArray("[data-reveal]").forEach(function (el) {
    try {
      var kind = el.getAttribute("data-reveal");
      if (kind === "mask") maskReveal(el);
      else if (kind === "chars" || kind === "lines") splitReveal(el, kind);
      else fadeUpReveal(el);
    } catch (err) {
      // one broken reveal shouldn't take the rest of the page's content down with it
      el.style.opacity = "";
      el.style.visibility = "";
      el.style.clipPath = "";
    }
  });

  gsap.utils.toArray("[data-reveal-group]").forEach(function (group) {
    try {
      var items = gsap.utils.toArray("[data-reveal-item]", group);
      if (!items.length) return;
      gsap.set(items, { autoAlpha: 0, y: 50 });
      gsap.to(
        items,
        withWillChange(items, {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: "power4.out",
          stagger: 0.12,
          scrollTrigger: { trigger: group, start: "top 80%" },
        })
      );
    } catch (err) {
      gsap.utils.toArray("[data-reveal-item]", group).forEach(function (el) {
        el.style.opacity = "";
        el.style.visibility = "";
      });
    }
  });

  /* ---------------- safety net ----------------
   * Whatever the cause — a slow connection, a throw in one of the reveal
   * branches above, a ScrollTrigger that never crosses its start point on
   * an unusual viewport — content must never stay invisible forever.
   * Belt-and-suspenders: force every [data-reveal] element visible a few
   * seconds after load if it somehow never got animated in. */
  function forceRevealIfStuck() {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      var cs = window.getComputedStyle(el);
      var visible = cs.visibility !== "hidden" && parseFloat(cs.opacity || "1") > 0.01;
      if (!visible) {
        gsap.set(el, { clearProps: "opacity,visibility,clipPath,transform" });
      }
    });
  }
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
    setTimeout(forceRevealIfStuck, 1500);
  });

  /* ---------------- parallax (desktop only) ---------------- */
  ScrollTrigger.matchMedia({
    "(min-width: 1000px)": function () {
      gsap.utils.toArray("[data-parallax-container]").forEach(function (container) {
        var media = container.querySelector("[data-parallax]");
        if (!media) return;
        var speed = parseFloat(container.getAttribute("data-parallax-speed")) || 1;
        var range = 8 * speed;
        gsap.fromTo(
          media,
          { yPercent: -range },
          {
            yPercent: range,
            ease: "none",
            scrollTrigger: { trigger: container, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      });

      gsap.utils.toArray("[data-parallax-speed]").forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax-speed")) || 1;
        var distance = (speed - 1) * 220;
        gsap.fromTo(
          el,
          { y: -distance },
          {
            y: distance,
            ease: "none",
            scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      });

      /* ---------------- pinned horizontal moment ---------------- */
      gsap.utils.toArray("[data-pin-horizontal]").forEach(function (section) {
        var track = section.querySelector("[data-pin-track]");
        if (!track) return;
        var getDistance = function () {
          return Math.max(0, track.scrollWidth - section.clientWidth);
        };
        gsap.to(track, {
          x: function () {
            return -getDistance();
          },
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: function () {
              return "+=" + getDistance();
            },
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        });
      });

      return function cleanup() {
        // ScrollTrigger.matchMedia handles teardown of triggers created in this scope
      };
    },
  });
  }
})();

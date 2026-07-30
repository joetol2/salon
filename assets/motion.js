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
  //
  // The three hero columns are grid siblings meant to read as one even
  // photo strip (object-fit: cover crops each to a shared height) — giving
  // each its own image's aspect-ratio instead made the middle (portrait)
  // photo a different height than the outer two. They share equal grid
  // column widths, so one common ratio (taken from the first) yields equal
  // heights too. Everything else (single standalone photos) keeps its own
  // image's ratio.
  var heroContainers = document.querySelectorAll(".hero-images__col [data-parallax-container]");
  if (heroContainers.length) {
    var firstMedia = heroContainers[0].querySelector("[data-parallax]");
    var fw = firstMedia && firstMedia.getAttribute("width");
    var fh = firstMedia && firstMedia.getAttribute("height");
    if (fw && fh) {
      heroContainers.forEach(function (c) {
        c.style.aspectRatio = fw + " / " + fh;
      });
    }
  }
  document.querySelectorAll("[data-parallax-container]").forEach(function (container) {
    if (container.closest(".hero-images__col")) return; // handled above as a group
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

    var stripes = gsap.utils.toArray(".color-stripes > span");
    var heroCols = gsap.utils.toArray(".hero-images__col");
    var heroSection = document.querySelector("section.hero-images");
    var header = document.querySelector(".header");
    var copyEls = [
      document.querySelector(".header__logo:not(.header__content--hidden-desktop) img"),
      document.querySelector(".header__utilities"),
    ].filter(Boolean);

    // 1. the three color stripes load in one at a time from the top
    var stripesDone = 0;
    if (stripes.length) {
      gsap.set(stripes, { scaleY: 0, transformOrigin: "top center" });
      tl.to(stripes, withWillChange(stripes, { scaleY: 1, duration: 0.45, stagger: 0.18 }), 0);
      stripesDone = 0.45 + (stripes.length - 1) * 0.18;
    }

    // 2. the photos slide out from behind the stripes, left to right
    if (heroCols.length) {
      gsap.set(heroCols, { xPercent: -100, autoAlpha: 0 });
      tl.to(
        heroCols,
        withWillChange(heroCols, { xPercent: 0, autoAlpha: 1, duration: 0.85, stagger: 0.15 }),
        stripesDone * 0.6
      );
    }
    var heroDone = stripesDone * 0.6 + 0.85 + (heroCols.length ? (heroCols.length - 1) * 0.15 : 0);

    // 3. the header copy slides in from behind the photos. Header and
    // hero-images are separate, non-overlapping sections in normal flow, so
    // this needs a real (temporary) stacking-order swap: sink the header
    // below the hero section while the copy is transformed down into the
    // photos' space, then bring it up through that boundary into its resting
    // spot — restoring both elements' original z-index once it settles so
    // nothing else on the page (nav, dropdowns) is permanently affected.
    if (copyEls.length && header && heroSection) {
      var headerOriginalZ = header.style.zIndex;
      var heroOriginalPosition = heroSection.style.position;
      var heroOriginalZ = heroSection.style.zIndex;

      heroSection.style.position = heroSection.style.position || "relative";
      heroSection.style.zIndex = "5";
      header.style.zIndex = "1";

      gsap.set(copyEls, { y: 260, autoAlpha: 0 });
      tl.to(
        copyEls,
        withWillChange(copyEls, {
          y: 0,
          autoAlpha: 1,
          duration: 1,
          stagger: 0.1,
          onComplete: function () {
            header.style.zIndex = headerOriginalZ;
            heroSection.style.position = heroOriginalPosition;
            heroSection.style.zIndex = heroOriginalZ;
          },
        }),
        heroDone
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
    // A fixed per-character delay reads great on a short headline but turns
    // a full paragraph into a multi-second crawl. Cap the whole cascade's
    // total length instead, so long text compresses to fit rather than
    // dragging out — short text (well under the cap already) is unaffected.
    var staggerConfig = 0.08;
    if (type === "chars") {
      var naturalTotal = units.length * 0.02;
      staggerConfig = naturalTotal <= 1.4 ? { each: 0.02, from: "start" } : { amount: 1.4, from: "start" };
    }
    gsap.set(units, { autoAlpha: 0, yPercent: 100 });
    gsap.to(
      units,
      withWillChange(units, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.8,
        ease: "power4.out",
        stagger: staggerConfig,
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

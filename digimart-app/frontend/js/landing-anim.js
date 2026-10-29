(function () {
  "use strict";

  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function reducedMotion() {
    return !!(motionQuery && motionQuery.matches);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setupHeroDots() {
    var host = document.getElementById("hero-title");
    if (!host) return;

    var canvas = host.querySelector(".hero-dots");
    if (!canvas) return;

    var LINES = ["Your shop,", "all in one place."];
    var FONT = '"DM Serif Display","Playfair Display",Georgia,"Times New Roman",serif';
    var ctx = null;
    var parts = [];
    var width = 0;
    var height = 0;
    var dpr = 1;
    var dot = 3;
    var last = -1;
    var raf = 0;
    var resizeTimer = 0;

    function random(n) {
      var value = Math.sin(n * 91.7 + 13.3) * 43758.5453;
      return value - Math.floor(value);
    }

    function progress() {
      var box = host.getBoundingClientRect();
      return clamp((90 - box.top) / Math.max(180, box.height * 1.05), 0, 1);
    }

    function draw(t) {
      if (!ctx || !width || !height) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      var eased = t * t * (3 - 2 * t);
      ctx.fillStyle = "#3A2E2A";

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var scatter = clamp((eased - part.delay * 0.25) / 0.75, 0, 1);
        var alpha = 1 - scatter;
        if (alpha <= 0.02) continue;
        ctx.globalAlpha = alpha;
        ctx.fillRect(
          part.x + part.vx * scatter,
          part.y + part.vy * scatter + 260 * scatter * scatter,
          dot,
          dot
        );
      }

      ctx.globalAlpha = 1;
      last = t;
    }

    function disableDots() {
      host.classList.remove("is-dots");
      parts = [];
      last = -1;
      if (ctx) {
        try {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } catch (error) {}
      }
    }

    function layout() {
      if (reducedMotion()) {
        disableDots();
        return false;
      }

      try {
        if (!ctx) {
          ctx = canvas.getContext("2d");
          if (!ctx) return false;
        }

        width = Math.floor(host.clientWidth);
        if (width < 200) {
          disableDots();
          return false;
        }

        var probe = document.createElement("canvas").getContext("2d");
        if (!probe) return false;
        probe.font = "100px " + FONT;

        var widest = 0;
        for (var i = 0; i < LINES.length; i++) {
          widest = Math.max(widest, probe.measureText(LINES[i]).width);
        }
        if (!widest) widest = 800;

        var fontSize = clamp((100 * width * 0.94) / widest, 40, 150);
        var lineHeight = fontSize * 1.06;
        height = Math.round(lineHeight * LINES.length + fontSize * 0.05);
        dpr = Math.min(2, window.devicePixelRatio || 1);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        var offset = document.createElement("canvas");
        offset.width = width;
        offset.height = height;
        var offsetContext = offset.getContext("2d");
        if (!offsetContext) return false;

        offsetContext.fillStyle = "#000";
        offsetContext.textAlign = "left";
        offsetContext.textBaseline = "alphabetic";
        offsetContext.font = fontSize + "px " + FONT;

        for (var line = 0; line < LINES.length; line++) {
          offsetContext.fillText(LINES[line], 0, lineHeight * line + fontSize * 0.88);
        }

        var pixels = offsetContext.getImageData(0, 0, width, height).data;
        var step = Math.max(4, Math.round(fontSize / 17));
        dot = Math.max(1.6, step * 0.42);
        parts = [];

        for (var y = 0; y < height; y += step) {
          for (var x = 0; x < width; x += step) {
            if (pixels[(y * width + x) * 4 + 3] > 120) {
              var index = parts.length;
              var angle = random(index) * Math.PI * 2;
              var speed = 60 + random(index + 0.5) * 260;
              parts.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 90 - random(index + 2) * 120,
                delay: random(index + 3)
              });
            }
          }
        }

        host.classList.add("is-dots");
        last = -1;
        draw(progress());
        return true;
      } catch (error) {
        disableDots();
        return false;
      }
    }

    function tick() {
      if (raf || reducedMotion()) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!parts.length || !host.classList.contains("is-dots")) return;
        var current = progress();
        if (Math.abs(current - last) > 0.0001) draw(current);
      });
    }

    function start() {
      if (reducedMotion()) {
        disableDots();
        return;
      }

      layout();

      if (document.fonts && document.fonts.load) {
        document.fonts
          .load('100px "DM Serif Display"')
          .then(function () {
            if (!reducedMotion()) layout();
          })
          .catch(function () {});
      }
    }

    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (!reducedMotion()) layout();
      }, 160);
    });

    if (motionQuery) {
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", start);
      else if (motionQuery.addListener) motionQuery.addListener(start);
    }

    start();
  }

  function setupFeatureReveal() {
    var section = document.getElementById("features");
    if (!section || !("IntersectionObserver" in window) || reducedMotion()) return;

    var items = section.querySelectorAll(".feature-item");
    if (!items.length) return;

    section.classList.add("anim-armed");

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );

    for (var i = 0; i < items.length; i++) {
      items[i].style.setProperty("--fi", i);
      observer.observe(items[i]);
    }
  }

  function setupFloatPause() {
    var hero = document.querySelector(".hero");
    if (!hero || !("IntersectionObserver" in window)) return;

    new IntersectionObserver(
      function (entries) {
        hero.classList.toggle("is-paused", !entries[0].isIntersecting);
      },
      { rootMargin: "120px 0px" }
    ).observe(hero);
  }

  function setupDoodleFooter() {
    var WORD = "DIGIMART";
    var FS = 200;
    var TRACK = -0.02;
    var FONT = "'Arial Black','Inter Display',Inter,'Helvetica Neue',Arial,sans-serif";
    var HATCH = 'fill="url(#dcfHatch)" stroke="none"';
    var ART = {
      bird: {
        k: 1.22,
        seat: "top",
        idle: "peck",
        top: -62,
        eyes: [[3, -30, 4.6, 2.3, 2], [12, -31, 4.6, 2.3, 2]],
        body: '<path class="n" d="M-5 0 L-5 -7 M-9 0 L-1 0 M5 0 L5 -7 M1 0 L9 0"/><path d="M-17 -16 C-26 -18 -31 -14 -33 -9 C-26 -10 -20 -8 -15 -10 Z"/><path d="M-18 -14 C-20 -30 -10 -40 2 -40 C16 -40 22 -28 20 -16 C18 -6 8 -4 0 -4 C-10 -4 -17 -8 -18 -14 Z"/><path d="M-11 -25 C-3 -26 1 -18 -3 -13 C-9 -12 -15 -17 -11 -25 Z" ' + HATCH + '/><path class="o" d="M19 -30 L29 -27 L19 -23 Z"/><path class="a" d="M-3 -38 L4 -59 L12 -37 Z"/><path class="n thin" d="M-1 -44 L10 -46 M1 -51 L8 -52"/><circle cx="4" cy="-60" r="2.8"/>'
      },
      mushroom: {
        k: 1.12,
        seat: "front",
        idle: "sway",
        top: -56,
        eyes: [[-4.5, -16, 0, 1.9, 1.3], [4.5, -16, 0, 1.9, 1.3]],
        body: '<ellipse class="sh" cx="0" cy="2" rx="18" ry="3"/><path class="n" d="M-10 -15 L-17 -9 M10 -15 L17 -11"/><path d="M-10 0 C-12 -10 -10 -22 -8 -28 L8 -28 C10 -22 12 -10 10 0 C4 2 -4 2 -10 0 Z"/><path d="M5 -27 C9 -20 11 -10 10 0 C8 1 6 1.5 4 1.5 C6 -8 6 -18 2 -27 Z" ' + HATCH + '/><path class="r" d="M-25 -28 C-27 -45 -12 -55 0 -55 C12 -55 27 -45 25 -28 C14 -23 -14 -23 -25 -28 Z"/><circle cx="-12" cy="-40" r="4.2"/><circle cx="6" cy="-46" r="3.4"/><circle cx="15" cy="-34" r="3"/><circle cx="-2" cy="-33" r="2.4"/><path class="n" d="M-2 -10 C-1 -8 1 -8 2 -10"/>'
      },
      ghost: {
        k: 1.3,
        seat: "behind",
        idle: "bob",
        top: -70,
        eyes: [[-8, -44, 6.5, 3.2, 3], [9, -44, 6.5, 3.2, 3]],
        body: '<path d="M-23 -14 L-23 -40 C-23 -59 -12 -67 0 -67 C12 -67 23 -59 23 -40 L23 -14 C12 -10 -12 -10 -23 -14 Z"/><path d="M13 -61 C21 -54 23 -46 23 -36 L23 -15 L15 -13 L15 -36 C15 -46 15 -54 13 -61 Z" ' + HATCH + '/><path class="n thin" d="M-16 -56 C-12 -61 -6 -63 -2 -63"/><path class="k" d="M-5 -33 C-3 -27 4 -27 6 -33 Z"/>',
        front: '<path d="M-25 -32 C-27 -38 -21 -42 -17 -38 C-15 -42 -10 -41 -10 -36 L-11 -30 C-15 -28 -22 -28 -25 -32 Z"/><path d="M25 -32 C27 -38 21 -42 17 -38 C15 -42 10 -41 10 -36 L11 -30 C15 -28 22 -28 25 -32 Z"/>'
      }
    };
    var CREW = [
      { kind: "bird", letter: 1, off: 0.02, says: "Sell something today!" },
      { kind: "mushroom", letter: 2, off: 0.12, scale: 0.95, says: "Restock the rice!" },
      { kind: "ghost", letter: 6, off: 0, says: "Boo! Who still owes you money?" }
    ];
    var DOODLES = {
      flame: '<path fill="#C2481F" d="M0 14 C-9 14 -12 6 -10 0 C-8 -5 -4 -6 -4 -12 C1 -9 3 -5 2 -1 C4 -3 5 -6 5 -8 C10 -3 11 4 8 9 C6 12 3 14 0 14 Z"/><path fill="#FBE3D3" d="M0 11.5 C-4 11.5 -6 8 -5 5 C-4 2 -1 1 -1 -3 C2 -1 4 3 3 6 C4 5 5 4 5 3 C7 6 5 11.5 0 11.5 Z"/>',
      star: '<path fill="#C2481F" d="M0 -13 L3.6 -4.4 L13 -4 L5.8 2.2 L8.2 12 L0 6.6 L-8.2 12 L-5.8 2.2 L-13 -4 L-3.6 -4.4 Z"/>',
      heart: '<path fill="#C2481F" d="M0 11 C-6 6 -13 1 -13 -5 C-13 -10 -8 -13 -4 -11 C-2 -10 -1 -8 0 -6 C1 -8 2 -10 4 -11 C8 -13 13 -10 13 -5 C13 1 6 6 0 11 Z"/>',
      bolt: '<path fill="#E8842F" d="M3 -14 L-8 2 L-1 2 L-4 14 L8 -3 L1 -3 Z"/>',
      sparkle: '<path fill="#E8842F" d="M0 -13 C1 -4 4 -1 13 0 C4 1 1 4 0 13 C-1 4 -4 1 -13 0 C-4 -1 -1 -4 0 -13 Z"/>'
    };
    var KINDS = ["flame", "star", "heart", "bolt", "sparkle", "flame", "star", "heart", "bolt", "sparkle"];
    var COLS = [
      ["Shop", [["Inventory", "dashboard.html"], ["New sale", "dashboard.html"], ["Expenses", "dashboard.html"], ["History", "dashboard.html"]]],
      ["Explore", [["Features", "#features"], ["Telugu voice", "#features"], ["Solutions", "#features"], ["Pricing", "#features"]]],
      ["Get started", [["Create account", "login.html"], ["Sign in", "login.html"], ["Dashboard", "dashboard.html"]]]
    ];

    var footer = document.getElementById("dcf");
    if (!footer) return;

    var bound = false;
    var pointer = null;
    var eyeRaf = 0;
    var bubbleTimer = 0;

    function hash(n) {
      var value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    }

    function estimate() {
      return {
        adv: Array.from(WORD).map(function (character) {
          return (/[IJ1]/.test(character) ? 0.42 : /[MW]/.test(character) ? 0.98 : 0.76) * FS;
        }),
        cap: 0.73 * FS
      };
    }

    function measure() {
      try {
        var context = document.createElement("canvas").getContext("2d");
        if (!context) return estimate();
        context.font = "900 " + FS + "px " + FONT;
        var advances = [];
        var previous = 0;
        for (var i = 0; i < WORD.length; i++) {
          var current = context.measureText(WORD.slice(0, i + 1)).width;
          advances.push(current - previous);
          previous = current;
        }
        var metrics = context.measureText(WORD);
        return {
          adv: advances,
          cap: metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : 0.73 * FS
        };
      } catch (error) {
        return estimate();
      }
    }

    function build(metrics) {
      var gap = TRACK * FS;
      var xs = [];
      var ws = [];
      var at = 0;

      metrics.adv.forEach(function (advance, index) {
        xs.push(at);
        ws.push(advance);
        at += advance + (index < metrics.adv.length - 1 ? gap : 0);
      });

      var wordWidth = at;
      var cap = metrics.cap;

      var placed = CREW.map(function (crew, index) {
        var art = ART[crew.kind];
        var scale = (cap / 144) * art.k * (crew.scale || 1);
        var x = xs[crew.letter] + ws[crew.letter] * (0.5 + crew.off);
        var y = art.seat === "top" ? -cap : art.seat === "behind" ? -cap + 30 * scale : 0;
        return { index: index, crew: crew, art: art, scale: scale, x: x, y: y };
      });

      var left = 0;
      var right = wordWidth;
      var top = -cap;

      placed.forEach(function (item) {
        left = Math.min(left, item.x - 40 * item.scale);
        right = Math.max(right, item.x + 40 * item.scale);
        top = Math.min(top, item.y + item.art.top * item.scale);
      });

      var viewX = left - 24;
      var viewY = top - 24;
      var viewWidth = right - left + 48;
      var viewHeight = -top + 30 + 48;
      var letterCount = WORD.length;
      var letterDelay = function (index) {
        return 160 + index * 80;
      };
      var crewStart = letterDelay(letterCount - 1) + 420;

      var groundStartX = viewX + 6;
      var groundEndX = viewX + viewWidth - 6;
      var ground = "M" + groundStartX.toFixed(1) + " 6";
      var tufts = "";

      for (var k = 1; k <= 14; k++) {
        var lineX = groundStartX + ((groundEndX - groundStartX) * k) / 14;
        ground +=
          " Q" +
          (lineX - (groundEndX - groundStartX) / 28).toFixed(1) +
          " " +
          (6 + (hash(k * 3.1) - 0.5) * 5).toFixed(1) +
          " " +
          lineX.toFixed(1) +
          " " +
          (6 + (hash(k * 7.7) - 0.5) * 2).toFixed(1);
      }

      for (var t = 0; t < 22; t++) {
        var tuftX = groundStartX + 20 + hash(t * 11.3) * (groundEndX - groundStartX - 40);
        var tuftScale = 0.7 + hash(t * 5.9) * 0.6;
        tufts +=
          "M" + tuftX.toFixed(1) + " 6 l" + (2 * tuftScale).toFixed(1) + " " + (-9 * tuftScale).toFixed(1) +
          " M" + (tuftX + 3 * tuftScale).toFixed(1) + " 6 l" + tuftScale.toFixed(1) + " " + (-12 * tuftScale).toFixed(1) +
          " M" + (tuftX + 6 * tuftScale).toFixed(1) + " 6 l" + (-tuftScale).toFixed(1) + " " + (-7 * tuftScale).toFixed(1) + " ";
      }

      var eyeSvg = function (item) {
        return item.art.eyes
          .map(function (eye) {
            return (
              '<g class="eye">' +
              (eye[2] > 0 ? '<circle cx="' + eye[0] + '" cy="' + eye[1] + '" r="' + eye[2] + '"/>' : "") +
              '<g class="pup" data-ex="' + (item.x + eye[0] * item.scale).toFixed(1) + '" data-ey="' + (item.y + eye[1] * item.scale).toFixed(1) + '" data-max="' + eye[4] + '">' +
              '<circle class="k" cx="' + eye[0] + '" cy="' + eye[1] + '" r="' + eye[3] + '"/>' +
              '<circle class="gl" cx="' + (eye[0] + eye[3] * 0.35).toFixed(2) + '" cy="' + (eye[1] - eye[3] * 0.4).toFixed(2) + '" r="' + (eye[3] * 0.32).toFixed(2) + '"/>' +
              '</g></g>'
            );
          })
          .join("");
      };

      var crew = function (item, part) {
        return (
          '<g transform="translate(' + item.x.toFixed(1) + " " + item.y.toFixed(1) + ') scale(' + item.scale.toFixed(4) + ')">' +
          '<g class="dcf-arrive dcf-' + item.art.seat + '" style="--d:' + (crewStart + item.index * 130) + 'ms">' +
          (part === "body"
            ? '<g class="ch" data-i="' + item.index + '" tabindex="0" role="button" aria-label="' + item.crew.kind + ': ' + item.crew.says + '">' +
              '<g class="dcf-art ' + item.art.idle + '">' + item.art.body + eyeSvg(item) + "</g></g>"
            : '<g class="dcf-art dcf-front ' + item.art.idle + '">' + (item.art.front || "") + "</g>") +
          "</g></g>"
        );
      };

      var letters = Array.from(WORD)
        .map(function (character, index) {
          return (
            '<g class="dcf-letter" style="--d:' + letterDelay(index) + "ms;--r:" + ((hash(index * 2.3) - 0.5) * 9).toFixed(2) + 'deg">' +
            '<g class="dcf-glyph"><text x="' + xs[index].toFixed(1) + '" y="0" font-size="' + FS + '" font-weight="900" style="font-family:' + FONT + '" filter="url(#dcfInk)">' + character + "</text></g></g>"
          );
        })
        .join("");

      var svg =
        '<svg class="dcf-svg" viewBox="' + viewX.toFixed(1) + " " + viewY.toFixed(1) + " " + viewWidth.toFixed(1) + " " + viewHeight.toFixed(1) + '" role="group" aria-label="DIGIMART - meet the crew">' +
        '<defs><pattern id="dcfHatch" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="4.6" style="stroke:var(--dcf-ink)" stroke-width="1.25"/></pattern>' +
        '<filter id="dcfInk" x="-4%" y="-6%" width="108%" height="112%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="e"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="e" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.018 0.32" numOctaves="2" seed="4" result="s"/>' +
        '<feColorMatrix in="s" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -16 5.6" result="sa"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="9" result="sp"/>' +
        '<feColorMatrix in="sp" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -24 7.0" result="spa"/>' +
        '<feComposite in="sa" in2="spa" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="holes"/>' +
        '<feComposite in="rough" in2="holes" operator="out"/></filter></defs>' +
        '<g class="dcf-ground"><path class="dcf-draw" pathLength="1" d="' + ground + '" style="--d:60ms"/><path class="dcf-fade" d="' + tufts + '" style="--d:560ms"/></g>' +
        placed.filter(function (item) { return item.art.seat === "behind"; }).map(function (item) { return crew(item, "body"); }).join("") +
        letters +
        placed.filter(function (item) { return item.art.seat === "behind"; }).map(function (item) { return crew(item, "front"); }).join("") +
        placed.filter(function (item) { return item.art.seat !== "behind"; }).map(function (item) { return crew(item, "body"); }).join("") +
        "</svg>";

      var bubbles = placed
        .map(function (item) {
          return (
            '<div class="dcf-bubble" data-b="' + item.index + '" style="left:' + (((item.x - viewX) / viewWidth) * 100).toFixed(2) + "%;top:" + (((item.y + item.art.top * item.scale - 6 - viewY) / viewHeight) * 100).toFixed(2) + '%">' + item.crew.says + "</div>"
          );
        })
        .join("");

      var doodles = KINDS.map(function (kind, index) {
        var size = 22 + hash(index * 4.7) * 14;
        return (
          '<div class="dcf-doodle" style="left:' + (((index + hash(index * 9.1) * 0.8) / KINDS.length) * 100).toFixed(1) + "%;width:" + size.toFixed(0) + "px;height:" + size.toFixed(0) + "px;animation-duration:" + (14 + hash(index * 2.9) * 14).toFixed(1) + "s;animation-delay:-" + (hash(index * 3.3) * 20).toFixed(1) + 's">' +
          '<svg viewBox="-16 -16 32 32">' + DOODLES[kind] + "</svg></div>"
        );
      }).join("");

      var columns = COLS.map(function (column) {
        var title = column[0];
        var links = column[1]
          .map(function (link) {
            return '<li><a class="dcf-link" href="' + link[1] + '">' + link[0] + "</a></li>";
          })
          .join("");
        return '<div><h3 class="dcf-coltitle">' + title + "</h3><ul>" + links + "</ul></div>";
      }).join("");

      var tagline = "A hand-drawn helper for every shop owner."
        .split(" ")
        .map(function (word, index) {
          return '<span class="dcf-word" style="--d:' + (crewStart + 260 + index * 45) + 'ms">' + word + " </span>";
        })
        .join("");

      return (
        '<div class="dcf-top"><div><div class="dcf-brand"><span class="dcf-logo">D</span><span class="dcf-brandname">DigiMart</span></div>' +
        '<p class="dcf-blurb">Stock, sales, bills and a Telugu-friendly assistant &mdash; one friendly place for your shop.</p></div>' +
        '<nav class="dcf-cols" aria-label="Footer">' + columns + "</nav></div>" +
        '<div class="dcf-world"><div class="dcf-stage"><h2 class="dcf-sr">DIGIMART</h2>' + svg + '<div class="dcf-bubbles" aria-hidden="true">' + bubbles + "</div></div>" +
        '<div class="dcf-doodles" aria-hidden="true">' + doodles + "</div>" +
        '<div class="dcf-cta"><p class="dcf-tagline">' + tagline + "</p>" +
        '<div class="dcf-actions"><a class="dcf-btn is-outline" href="dashboard.html">Open dashboard</a><a class="dcf-btn is-solid" href="login.html">Start free</a></div></div></div>' +
        '<div class="dcf-bar"><p class="dcf-copy">&copy; 2026 DigiMart. Made for India\'s neighbourhood shops.</p><button type="button" class="dcf-totop">Back to top &uarr;</button></div>'
      );
    }

    function sizeWorld() {
      var world = footer.querySelector(".dcf-world");
      if (world) world.style.setProperty("--h", world.clientHeight + "px");
    }

    function wire() {
      footer.querySelectorAll(".ch").forEach(function (character) {
        var poke = function () {
          var index = character.dataset.i;
          character.classList.remove("hop");
          void character.getBoundingClientRect();
          character.classList.add("hop");
          footer.querySelectorAll(".dcf-bubble").forEach(function (bubble) {
            bubble.classList.toggle("on", bubble.dataset.b === index);
          });
          window.clearTimeout(bubbleTimer);
          bubbleTimer = window.setTimeout(function () {
            footer.querySelectorAll(".dcf-bubble").forEach(function (bubble) {
              bubble.classList.remove("on");
            });
          }, 2600);
        };

        character.addEventListener("click", poke);
        character.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            poke();
          }
        });
      });

      footer.querySelectorAll(".dcf-doodle").forEach(function (doodle) {
        doodle.addEventListener("pointerdown", function () {
          doodle.classList.add("pop");
          window.setTimeout(function () {
            doodle.classList.remove("pop");
          }, 1400);
        });
      });

      footer.querySelectorAll(".dcf-totop").forEach(function (button) {
        button.addEventListener("click", function () {
          window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
        });
      });

      if (bound) return;
      bound = true;

      document.addEventListener("pointermove", function (event) {
        if (
          reducedMotion() ||
          !footer.isConnected ||
          footer.dataset.play !== "1" ||
          footer.classList.contains("is-paused")
        ) {
          return;
        }

        pointer = event;
        if (eyeRaf) return;

        eyeRaf = requestAnimationFrame(function () {
          eyeRaf = 0;
          var svg = footer.querySelector(".dcf-svg");
          if (!svg || !pointer) return;
          var matrix = svg.getScreenCTM();
          if (!matrix) return;
          var inverse = matrix.inverse();
          var pointerX = inverse.a * pointer.clientX + inverse.c * pointer.clientY + inverse.e;
          var pointerY = inverse.b * pointer.clientX + inverse.d * pointer.clientY + inverse.f;

          svg.querySelectorAll(".pup").forEach(function (pupil) {
            var dx = pointerX - Number(pupil.dataset.ex);
            var dy = pointerY - Number(pupil.dataset.ey);
            var distance = Math.hypot(dx, dy) || 1;
            var max = Number(pupil.dataset.max);
            var pull = (max * Math.min(1, distance / 220)) / distance;
            pupil.setAttribute(
              "transform",
              "translate(" + (dx * pull).toFixed(2) + " " + (dy * pull).toFixed(2) + ")"
            );
          });
        });
      });
    }

    function render() {
      footer.innerHTML = build(measure());
      wire();
      sizeWorld();
    }

    footer.classList.add("dcf");
    footer.dataset.play = "0";
    footer.innerHTML = build(estimate());
    wire();
    sizeWorld();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(render).catch(function () {});
    }

    window.addEventListener("resize", sizeWorld);

    if (window.ResizeObserver) {
      new ResizeObserver(sizeWorld).observe(footer);
    }

    if (reducedMotion()) {
      footer.dataset.play = "1";
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              footer.dataset.play = "1";
              footer.classList.remove("is-paused");
            } else if (footer.dataset.play === "1") {
              footer.classList.add("is-paused");
            }
          });
        },
        { threshold: 0.08 }
      ).observe(footer);
    } else {
      footer.dataset.play = "1";
    }
  }

  setupHeroDots();
  setupFeatureReveal();
  setupFloatPause();
  setupDoodleFooter();
})();

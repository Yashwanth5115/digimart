/* Cinematic dark dashboard: chart theming, cursor light and section motion. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function themeCharts() {
    if (!window.Chart) return;
    try {
      Chart.defaults.color = '#848aa4';
      Chart.defaults.font.family = "'Plus Jakarta Sans', 'Inter', sans-serif";
      Chart.defaults.font.size = 11;
      Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
      if (Chart.defaults.plugins && Chart.defaults.plugins.legend) {
        Chart.defaults.plugins.legend.labels.color = '#c3c7db';
      }
    } catch (e) { /* ignore */ }

    document.querySelectorAll('canvas').forEach(function (canvas) {
      var chart = null;
      try { chart = Chart.getChart(canvas); } catch (e) { chart = null; }
      if (!chart || !chart.options) return;

      chart.options.color = '#848aa4';
      if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach(function (key) {
          var scale = chart.options.scales[key] || {};
          scale.grid = Object.assign({}, scale.grid, { color: 'rgba(255,255,255,0.06)' });
          scale.ticks = Object.assign({}, scale.ticks, { color: '#848aa4' });
          scale.border = Object.assign({}, scale.border, { display: false });
          chart.options.scales[key] = scale;
        });
      }
      if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels = Object.assign(
          {}, chart.options.plugins.legend.labels, { color: '#c3c7db' }
        );
      }
      try { chart.update('none'); } catch (e) { /* ignore */ }
    });
  }

  function revealActiveSection() {
    var active = document.querySelector('.section.active');
    if (!active) return;
    active.classList.remove('cine-in');
    void active.offsetWidth;
    active.classList.add('cine-in');
  }

  ready(function () {
    document.body.classList.add('cinematic');

    themeCharts();
    setTimeout(themeCharts, 600);
    setTimeout(themeCharts, 1800);

    revealActiveSection();

    // Cursor-following light inside glass cards.
    var raf = 0;
    var last = null;
    document.addEventListener('pointermove', function (event) {
      last = event;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!last || !last.target || !last.target.closest) return;
        var card = last.target.closest('.glass-card, .stat-card, .dm-card');
        if (!card) return;
        var rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        card.style.setProperty('--mx', ((last.clientX - rect.left) / rect.width * 100).toFixed(2) + '%');
        card.style.setProperty('--my', ((last.clientY - rect.top) / rect.height * 100).toFixed(2) + '%');
      });
    }, { passive: true });

    // Ambient background parallax.
    var canvas = document.querySelector('.bg-canvas');
    if (canvas) {
      window.addEventListener('pointermove', function (event) {
        canvas.style.setProperty('--px', (event.clientX / window.innerWidth - 0.5).toFixed(3));
        canvas.style.setProperty('--py', (event.clientY / window.innerHeight - 0.5).toFixed(3));
      }, { passive: true });
    }

    // Re-theme charts whenever a section is shown or a chart is injected.
    var content = document.getElementById('contentArea');
    if (content && window.MutationObserver) {
      var pending = 0;
      var observer = new MutationObserver(function () {
        if (pending) return;
        pending = window.setTimeout(function () {
          pending = 0;
          themeCharts();
          revealActiveSection();
        }, 80);
      });
      observer.observe(content, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    // Replay the entrance animation on navigation.
    document.addEventListener('click', function (event) {
      if (!event.target.closest) return;
      var trigger = event.target.closest('.nav-item, .mobile-nav-item, .mobile-more-item');
      if (!trigger) return;
      window.setTimeout(revealActiveSection, 40);
    }, true);
  });
})();

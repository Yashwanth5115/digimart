/* Cream theme: keeps Chart.js readable and on-brand on the light canvas. */
(function () {
  'use strict';

  var TEXT = '#6B5F58';
  var STRONG = '#1A1412';
  var GRID = 'rgba(43, 38, 35, 0.08)';
  var PIES = ['#C2481F', '#D9822B', '#2F9E6B', '#E0A33A', '#8B5CF6', '#D0392B'];

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function styleScales(chart) {
    if (!chart.options || !chart.options.scales) return;
    Object.keys(chart.options.scales).forEach(function (key) {
      var scale = chart.options.scales[key];
      if (!scale) return;
      if (scale.grid) scale.grid.color = GRID;
      if (scale.ticks) scale.ticks.color = TEXT;
      if (scale.border) scale.border.display = false;
    });
  }

  function paint() {
    if (!window.Chart) return;

    Chart.defaults.color = TEXT;
    Chart.defaults.font.family = "'Inter', 'Noto Sans Telugu', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = GRID;
    if (Chart.defaults.plugins && Chart.defaults.plugins.legend) {
      Chart.defaults.plugins.legend.labels.color = STRONG;
    }

    document.querySelectorAll('canvas').forEach(function (canvas) {
      var chart = null;
      try { chart = Chart.getChart(canvas); } catch (e) { chart = null; }
      if (!chart || !chart.options) return;

      chart.options.color = TEXT;
      styleScales(chart);

      if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = STRONG;
      }

      var id = canvas.id;
      var sets = chart.data && chart.data.datasets ? chart.data.datasets : [];
      var ds = sets[0];

      if (id === 'revenueChart' && ds) {
        ds.borderColor = '#C2481F';
        ds.pointBackgroundColor = '#C2481F';
        ds.pointBorderColor = '#ffffff';
        ds.backgroundColor = function (ctx) {
          var g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
          g.addColorStop(0, 'rgba(194, 72, 31, 0.22)');
          g.addColorStop(1, 'rgba(194, 72, 31, 0)');
          return g;
        };
      } else if (id === 'salesChart' && ds) {
        ds.backgroundColor = function (ctx) {
          var g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 250);
          g.addColorStop(0, 'rgba(194, 72, 31, 0.78)');
          g.addColorStop(1, 'rgba(217, 130, 43, 0.22)');
          return g;
        };
      } else if (id === 'categoryChart' && ds) {
        ds.backgroundColor = PIES;
      } else if (id === 'svTrend' && ds) {
        ds.borderColor = '#C2481F';
        ds.pointBackgroundColor = '#C2481F';
        ds.backgroundColor = 'rgba(194, 72, 31, 0.10)';
      } else if (id === 'svMix' && ds) {
        ds.borderColor = '#ffffff';
      }

      try { chart.update('none'); } catch (e) { /* ignore */ }
    });
  }

  ready(function () {
    paint();
    window.setTimeout(paint, 400);
    window.setTimeout(paint, 1200);
    window.setTimeout(paint, 2200);

    var content = document.getElementById('contentArea');
    if (content && window.MutationObserver) {
      var pending = 0;
      new MutationObserver(function () {
        if (pending) return;
        pending = window.setTimeout(function () {
          pending = 0;
          paint();
        }, 120);
      }).observe(content, { childList: true, subtree: true });
    }
  });
})();

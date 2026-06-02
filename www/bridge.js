(function () {
  'use strict';

  var DEBOUNCE_MS = 300;
  var timer = null;

  function debounce(fn, ms) {
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  $(document).on('shiny:connected', function () {

    // ── R → JS: categories on startup ──────────────────────────────────

    Shiny.addCustomMessageHandler('categories', function (raw) {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      UI.renderCategoryChips(Array.isArray(data) ? data : []);
    });

    // ── R → JS: search results ─────────────────────────────────────────

    Shiny.addCustomMessageHandler('search_results', function (raw) {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      UI.renderProducts(Array.isArray(data) ? data : []);
    });

    // ── R → JS: basket variations ──────────────────────────────────────

    Shiny.addCustomMessageHandler('basket_data', function (raw) {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      UI.renderBasketReview(Array.isArray(data) ? data : []);
      UI.updateBasketPreview();
    });

    // ── R → JS: full results ───────────────────────────────────────────

    Shiny.addCustomMessageHandler('results', function (raw) {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      UI.renderResults(data);
    });

    // ── JS → R: search products ────────────────────────────────────────

    function requestSearch() {
      Shiny.setInputValue('search_products', {
        term:     UI.getSearchTerm(),
        category: UI.getCategory(),
        period:   UI.getPeriod(),
      });
    }

    UI.dom.searchInput.addEventListener('input', debounce(requestSearch, DEBOUNCE_MS));

    UI.dom.categoryChips.addEventListener('click', function (e) {
      if (!e.target.closest('.chip')) return;
      setTimeout(requestSearch, 0);
    });

    // ── JS → R: period change triggers re-search ───────────────────────

    var origOnPeriodChange = UI.onPeriodChange;
    UI.onPeriodChange = function (period) {
      origOnPeriodChange(period);
      requestSearch();

      if (UI.basketCount() > 0) {
        Shiny.setInputValue('basket_variations', {
          eans:   UI.getBasketEans(),
          period: period,
        });
      }
    };

    // ── JS → R: step transitions ───────────────────────────────────────

    var origGoToStep = UI.goToStep;
    UI.goToStep = function (n) {
      if (n === 2 && UI.basketCount() > 0) {
        Shiny.setInputValue('basket_variations', {
          eans:   UI.getBasketEans(),
          period: UI.getPeriod(),
        });
      }

      if (n === 3 && UI.basketCount() > 0) {
        Shiny.setInputValue('calculate', {
          eans:   UI.getBasketEans(),
          period: UI.getPeriod(),
        });
      }

      origGoToStep(n);

      if (n === 3) {
        setTimeout(function () {
          try { $(window).trigger('resize'); } catch (e) {}
        }, 200);
      }
    };

    // ── Wire up nav buttons ────────────────────────────────────────────

    UI.dom.btnReview.addEventListener('click', function () {
      if (UI.basketCount() > 0) UI.goToStep(2);
    });

    UI.dom.btnResults.addEventListener('click', function () {
      if (UI.basketCount() > 0) UI.goToStep(3);
    });

    // ── Initial search to populate product list ────────────────────────

    requestSearch();

  });
})();

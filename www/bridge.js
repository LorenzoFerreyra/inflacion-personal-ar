/**
 * Shiny Bridge — Connects UI events to R server via Shiny message protocol.
 *
 * JS → R:  Shiny.setInputValue(key, value)
 * R → JS:  Shiny.addCustomMessageHandler(key, callback)
 *
 * Depends on: UI (from ui.js), Shiny (injected by htmlTemplate)
 */

(function () {
  'use strict';

  var DEBOUNCE_MS = 300;
  var debounceTimer = null;

  function debounce(fn, ms) {
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  // ── Wait for Shiny to be ready ────────────────────────────────────────

  $(document).on('shiny:connected', function () {

    // Set last-updated date
    UI.dom.lastUpdated.textContent = new Date().toLocaleDateString('es-AR');

    // ── R → JS: Receive categories on startup ─────────────────────────

    Shiny.addCustomMessageHandler('categories', function (data) {
      var categories = JSON.parse(data);
      UI.renderCategories(categories);

      var names = categories.map(function (c) { return c.categoria; });
      UI.renderFilterChips(UI.dom.productFilters, names, 'Todos');
      UI.renderFilterChips(UI.dom.searchFilters, names, 'Todos');
    });

    // ── R → JS: Receive product list ──────────────────────────────────

    Shiny.addCustomMessageHandler('products', function (data) {
      var products = JSON.parse(data);
      UI.renderProducts(products);
    });

    // ── R → JS: Receive search results ────────────────────────────────

    Shiny.addCustomMessageHandler('search_results', function (data) {
      var results = JSON.parse(data);
      UI.renderSearchResults(results);
    });

    // ── R → JS: Receive calculation results ───────────────────────────

    Shiny.addCustomMessageHandler('results', function (data) {
      var result = JSON.parse(data);

      if (result.error) {
        UI.dom.resultCards.innerHTML =
          '<article class="stat-card"><div class="stat-label">Error</div>' +
          '<div class="stat-sub">' + UI.escapeHtml(result.error) + '</div></article>';
        return;
      }

      UI.renderResultCards(result);
      UI.renderProductBars(result.product_variation);
    });

    // ── JS → R: Step 1 → 2 triggers product fetch ────────────────────

    // Override the step navigation to add data fetching
    var originalGoToStep = UI.goToStep;

    UI.goToStep = function (n) {
      if (n === 2) {
        requestProducts('', '');
      }

      if (n === 3) {
        var eans = UI.getSelectedEans();
        if (eans.length > 0) {
          Shiny.setInputValue('calculate', { eans: eans, days: 90 });
        }
      }

      originalGoToStep(n);
    };

    // ── JS → R: Product search (debounced) ────────────────────────────

    function requestProducts(term, category) {
      Shiny.setInputValue('search_query', {
        term: term || '',
        category: category || '',
      });
    }

    UI.dom.productSearch.addEventListener('input', debounce(function () {
      var category = UI.getActiveFilterCategory(UI.dom.productFilters);
      requestProducts(this.value, category);
    }, DEBOUNCE_MS));

    UI.dom.productFilters.addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip');
      if (!chip) return;

      setTimeout(function () {
        var category = UI.getActiveFilterCategory(UI.dom.productFilters);
        requestProducts(UI.dom.productSearch.value, category);
      }, 0);
    });

    // ── JS → R: Search module (debounced) ─────────────────────────────

    function requestSearch(term, category) {
      Shiny.setInputValue('price_search', {
        term: term || '',
        category: category || '',
      });
    }

    UI.dom.searchInput.addEventListener('input', debounce(function () {
      var category = UI.getActiveFilterCategory(UI.dom.searchFilters);
      requestSearch(this.value, category);
    }, DEBOUNCE_MS));

    UI.dom.searchFilters.addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip');
      if (!chip) return;

      setTimeout(function () {
        var category = UI.getActiveFilterCategory(UI.dom.searchFilters);
        requestSearch(UI.dom.searchInput.value, category);
      }, 0);
    });

  });

})();

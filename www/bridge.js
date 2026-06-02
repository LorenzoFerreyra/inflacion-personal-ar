(function () {
  "use strict";

  var DEBOUNCE_MS = 300;
  var searchTimer = null;

  $(document).on("shiny:connected", function () {
    // ═══════════════════════════════════════════════════════════════════
    // R → JS: categories (on startup)
    // ═══════════════════════════════════════════════════════════════════
    Shiny.addCustomMessageHandler("categories", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderCategoryChips(data || []);
    });

    // ═══════════════════════════════════════════════════════════════════
    // R → JS: search results
    // ═══════════════════════════════════════════════════════════════════
    Shiny.addCustomMessageHandler("search_results", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderProducts(data || []);
    });

    // ═══════════════════════════════════════════════════════════════════
    // R → JS: basket info (names, brands, categories)
    // ═══════════════════════════════════════════════════════════════════
    Shiny.addCustomMessageHandler("basket_info", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.setBasketInfo(data);
      UI.updateBasketPreview();
    });

    // ═══════════════════════════════════════════════════════════════════
    // R → JS: basket variations
    // ═══════════════════════════════════════════════════════════════════
    Shiny.addCustomMessageHandler("basket_data", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderBasketReview(data || []);
      UI.updateBasketPreview();
    });

    // ═══════════════════════════════════════════════════════════════════
    // R → JS: step navigation
    // ═══════════════════════════════════════════════════════════════════
    Shiny.addCustomMessageHandler("go_to_step", function (step) {
      UI.goToStep(step);
    });

    // ═══════════════════════════════════════════════════════════════════
    // R → JS: results (step 3)
    // ═══════════════════════════════════════════════════════════════════
    Shiny.addCustomMessageHandler("results", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderResults(data);
    });

    // ═══════════════════════════════════════════════════════════════════
    // JS → R: search input (debounced)
    // ═══════════════════════════════════════════════════════════════════
    $(document).on("input", "#search-input", function () {
      var val = this.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        Shiny.setInputValue("search_term", val);
      }, DEBOUNCE_MS);
    });

    // ═══════════════════════════════════════════════════════════════════
    // JS → R: category change (called by UI when chip clicked)
    // ═══════════════════════════════════════════════════════════════════
    window.onCategoryChange = function (category) {
      Shiny.setInputValue("search_category", category);
    };

    // ═══════════════════════════════════════════════════════════════════
    // JS → R: period change
    // ═══════════════════════════════════════════════════════════════════
    $(document).on("click", ".period-btn", function () {
      var period = this.dataset.period;
      UI.setPeriod(period);
      Shiny.setInputValue("period", period);

      // Re-trigger search with new period
      var term = UI.dom.searchInput.value;
      Shiny.setInputValue("search_term", term);

      // If on step 2, refresh basket data
      if (UI.basketCount() > 0) {
        Shiny.setInputValue("basket_refresh", period);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // JS → R: add product
    // ═══════════════════════════════════════════════════════════════════
    window.onAddProduct = function (ean) {
      Shiny.setInputValue("add_product", ean);
    };

    // ═══════════════════════════════════════════════════════════════════
    // JS → R: remove product
    // ═══════════════════════════════════════════════════════════════════
    window.onRemoveProduct = function (ean) {
      Shiny.setInputValue("remove_product", ean);
    };

    // ═══════════════════════════════════════════════════════════════════
    // Step navigation buttons
    // ═══════════════════════════════════════════════════════════════════
    UI.dom.btnReview.addEventListener("click", function () {
      if (UI.basketCount() > 0) {
        Shiny.setInputValue("go_to_step", 2);
      }
    });

    UI.dom.btnResults.addEventListener("click", function () {
      if (UI.basketCount() > 0) {
        Shiny.setInputValue("calculate", Date.now());
        Shiny.setInputValue("go_to_step", 3);
      }
    });

    UI.dom.btnBackStep1.addEventListener("click", function () {
      Shiny.setInputValue("go_to_step", 1);
    });

    $("#btn-edit-basket").addEventListener("click", function () {
      Shiny.setInputValue("go_to_step", 2);
    });

    // Stepper number buttons (clickable for completed/current steps)
    UI.dom.stepper.addEventListener("click", function (e) {
      var num = e.target.closest(".stepper-num");
      if (!num) return;
      var step = parseInt(num.textContent);
      if (step && step <= UI.basketCount() ? 3 : 1) {
        // Allow going back, or forward only if basket has items
        Shiny.setInputValue("go_to_step", step);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // Tab switching
    // ═══════════════════════════════════════════════════════════════════
    Shiny.addCustomMessageHandler("highlight_tab", function (tab) {
      UI.showTab(tab);
    });

    $(document).on("click", ".tab-link", function () {
      var tab = this.dataset.tab;
      Shiny.setInputValue("active_tab", tab);
    });

    // ═══════════════════════════════════════════════════════════════════
    // Initial search trigger
    // ═══════════════════════════════════════════════════════════════════
    setTimeout(function () {
      Shiny.setInputValue("search_term", "");
    }, 200);
  });
})();

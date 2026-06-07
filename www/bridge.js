(function () {
  "use strict";

  var DEBOUNCE_MS = 300;
  var searchTimer = null;
  var expSearchTimer = null;

  $(document).on("shiny:connected", function () {

    // ── R → JS message handlers ─────────────────────────────────────────

    Shiny.addCustomMessageHandler("categories", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderCategoryChips(data || []);
    });

    Shiny.addCustomMessageHandler("search_results", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.handleSearchResults(data);
    });

    Shiny.addCustomMessageHandler("basket_info", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.setBasketInfo(data);
      UI.updateBasketPreview();
    });

    Shiny.addCustomMessageHandler("basket_data", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderBasketReview(data || []);
      UI.updateBasketPreview();
    });

    Shiny.addCustomMessageHandler("go_to_step", function (step) {
      UI.goToStep(step);
    });

    Shiny.addCustomMessageHandler("results", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderResults(data);
    });

    Shiny.addCustomMessageHandler("exp_search_results", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.handleExpSearchResults(data);
    });

    Shiny.addCustomMessageHandler("exp_product_detail", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderExpDetail(data);
    });

    Shiny.addCustomMessageHandler("insights_data", function (raw) {
      var data = typeof raw === "string" ? JSON.parse(raw) : raw;
      UI.renderInsights(data);
    });

    Shiny.addCustomMessageHandler("highlight_tab", function (tab) {
      UI.showTab(tab);
    });

    // ── JS → R: Tab 1 search (debounced, resets to page 1) ─────────────

    $(document).on("input", "#search-input", function () {
      var val = this.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        Shiny.setInputValue("search_term", val);
        Shiny.setInputValue("search_page", 1, { priority: "event" });
      }, DEBOUNCE_MS);
    });

    // ── JS → R: category change ─────────────────────────────────────────

    window.onCategoryChange = function (category) {
      Shiny.setInputValue("search_category", category);
      Shiny.setInputValue("search_page", 1, { priority: "event" });
    };

    // ── JS → R: period change ───────────────────────────────────────────

    $(document).on("click", ".period-btn", function () {
      var period = this.dataset.period;
      UI.setPeriod(period);
      Shiny.setInputValue("period", period);
      Shiny.setInputValue("search_page", 1, { priority: "event" });
      Shiny.setInputValue("exp_search_page", 1, { priority: "event" });

      if (UI.basketCount() > 0) {
        Shiny.setInputValue("basket_refresh", period);
      }
    });

    // ── JS → R: pagination ──────────────────────────────────────────────

    window.onSearchPage = function (page) {
      Shiny.setInputValue("search_page", page, { priority: "event" });
    };

    window.onExpSearchPage = function (page) {
      Shiny.setInputValue("exp_search_page", page, { priority: "event" });
    };

    // ── JS → R: add / remove product ────────────────────────────────────

    window.onAddProduct = function (ean) {
      Shiny.setInputValue("add_product", ean);
    };

    window.onRemoveProduct = function (ean) {
      Shiny.setInputValue("remove_product", ean);
    };

    // ── JS → R: Explorador search (debounced) ───────────────────────────

    $(document).on("input", "#exp-search-input", function () {
      var val = this.value;
      clearTimeout(expSearchTimer);
      expSearchTimer = setTimeout(function () {
        Shiny.setInputValue("exp_search_term", val);
        Shiny.setInputValue("exp_search_page", 1, { priority: "event" });
      }, DEBOUNCE_MS);
    });

    window.onSelectProductExp = function (ean) {
      Shiny.setInputValue("select_product_exp", ean, { priority: "event" });
    };

    // ── Step navigation buttons ─────────────────────────────────────────

    UI.dom.btnReview.addEventListener("click", function () {
      if (UI.basketCount() > 0) Shiny.setInputValue("go_to_step", 2);
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

    UI.dom.stepper.addEventListener("click", function (e) {
      var num = e.target.closest(".stepper-num");
      if (!num) return;
      var step = parseInt(num.textContent);
      if (step && step <= (UI.basketCount() ? 3 : 1)) {
        Shiny.setInputValue("go_to_step", step);
      }
    });

    // ── Tab switching ───────────────────────────────────────────────────

    $(document).on("click", ".tab-link", function () {
      var tab = this.dataset.tab;
      Shiny.setInputValue("active_tab", tab);

      if (tab === "insights") {
        Shiny.setInputValue("load_insights", Date.now(), { priority: "event" });
      }
    });

    // ── Initial load (page 1) ───────────────────────────────────────────

    setTimeout(function () {
      Shiny.setInputValue("search_page", 1, { priority: "event" });
      Shiny.setInputValue("exp_search_page", 1, { priority: "event" });
    }, 200);
  });
})();

var UI = (function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────────
  var currentTab = "canasta";
  var currentStep = 1;
  var currentPeriod = "mensual";
  var basket = {}; // { ean: { name, brand, category } }
  var basketVars = {}; // { ean: variation }
  var activeCategory = "";

  // ── DOM refs ───────────────────────────────────────────────────────────
  var $ = function (s, c) {
    return (c || document).querySelector(s);
  };
  var $$ = function (s, c) {
    return Array.from((c || document).querySelectorAll(s));
  };

  var dom = {
    tabLinks: $$(".tab-link"),
    tabPanes: $$(".tab-pane"),
    steps: $$(".step"),
    stepper: $("#stepper"),
    searchInput: $("#search-input"),
    chipWrapper: $("#chip-wrapper"),
    chipMore: $("#chip-more"),
    productList: $("#product-list"),
    basketPreview: $("#basket-preview"),
    basketSummary: $("#basket-summary"),
    btnReview: $("#btn-review"),
    basketReview: $("#basket-review"),
    step2Summary: $("#step2-summary"),
    btnResults: $("#btn-results"),
    resultCards: $("#result-cards"),
    resultProducts: $("#result-products"),
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return "";
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function formatPrice(n) {
    if (n == null || isNaN(n) || n <= 0) return "\u2014";
    return (
      "$" + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 })
    );
  }

  function varBadge(v) {
    if (v == null || isNaN(v))
      return '<span class="var-badge var-flat">\u2014</span>';
    var cls = v > 0 ? "var-up" : v < 0 ? "var-down" : "var-flat";
    var sign = v > 0 ? "+" : "";
    return '<span class="var-badge ' + cls + '">' + sign + v + "%</span>";
  }

  function basketCount() {
    return Object.keys(basket).length;
  }

  // ── Tab navigation ─────────────────────────────────────────────────────
  function showTab(id) {
    currentTab = id;
    dom.tabLinks.forEach(function (l) {
      l.classList.toggle("active", l.dataset.tab === id);
    });
    dom.tabPanes.forEach(function (p) {
      p.classList.toggle("active", p.id === "tab-" + id);
    });
  }

  dom.tabLinks.forEach(function (l) {
    l.addEventListener("click", function () {
      showTab(l.dataset.tab);
    });
  });

  // ── Step navigation ────────────────────────────────────────────────────
  function goToStep(n) {
    currentStep = n;
    dom.steps.forEach(function (s, i) {
      s.classList.toggle("active", i + 1 === n);
    });
    renderStepper(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (n === 3) {
      setTimeout(function () {
        $(window).trigger && $(window).trigger("resize");
      }, 200);
    }
  }

  // ── Stepper ────────────────────────────────────────────────────────────
  function renderStepper(active) {
    var steps = $$(".stepper-step", dom.stepper);
    var lines = $$(".stepper-line", dom.stepper);
    steps.forEach(function (s, i) {
      var n = i + 1;
      var num = $(".stepper-num", s);
      var txt = $(".stepper-text", s);
      num.className = "stepper-num";
      txt.className = "stepper-text";
      if (n < active) {
        num.classList.add("done");
        txt.classList.add("done");
      } else if (n === active) {
        num.classList.add("active");
        txt.classList.add("active");
      } else {
        num.classList.add("upcoming");
        txt.classList.add("upcoming");
      }
    });
    lines.forEach(function (l, i) {
      l.classList.toggle("done", i + 1 < active);
    });
  }

  // ── Period toggle ──────────────────────────────────────────────────────
  function syncPeriodToggles() {
    $$(".period-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.period === currentPeriod);
    });
  }

  function setPeriod(period) {
    currentPeriod = period;
    syncPeriodToggles();
  }

  // ── Category chips ─────────────────────────────────────────────────────
  function renderCategoryChips(categories) {
    if (!categories || !categories.length) return;
    var VISIBLE = 8;
    var nTotal = categories.length;
    var hasMore = nTotal > VISIBLE;

    // Ensure active category is visible
    if (activeCategory && hasMore) {
      var activeIdx = -1;
      for (var i = 0; i < categories.length; i++) {
        if (categories[i].categoria === activeCategory) {
          activeIdx = i;
          break;
        }
      }
      if (activeIdx >= VISIBLE) {
        var item = categories.splice(activeIdx, 1)[0];
        categories.splice(VISIBLE - 1, 0, item);
      }
    }

    var activeCat = dom.chipWrapper.querySelector(".chip.active");
    var currentActive = activeCat ? activeCat.dataset.category : "";

    dom.chipWrapper.innerHTML = categories
      .map(function (c, i) {
        var isActive = currentActive === c.categoria;
        return (
          '<button class="chip' +
          (isActive ? " active" : "") +
          '" data-category="' +
          esc(c.categoria) +
          '">' +
          esc(c.categoria) +
          "</button>"
        );
      })
      .join("");

    if (hasMore) {
      var hidden = nTotal - VISIBLE;
      dom.chipMore.style.display = "";
      dom.chipMore.textContent = "+ " + hidden + " m\u00e1s";
      dom.chipWrapper.classList.remove("expanded");
    } else {
      dom.chipMore.style.display = "none";
      dom.chipWrapper.classList.add("expanded");
    }
  }

  dom.chipMore.addEventListener("click", function () {
    var expanded = dom.chipWrapper.classList.toggle("expanded");
    if (expanded) {
      dom.chipMore.textContent = "Ver menos";
    } else {
      var hidden = dom.chipWrapper.querySelectorAll(".chip").length - 8;
      dom.chipMore.textContent = "+ " + Math.max(0, hidden) + " m\u00e1s";
    }
  });

  // Event delegation for chip clicks (on parent .chip-group)
  $("#category-chips").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    activeCategory = chip.dataset.category;
    $$(".chip", $("#category-chips")).forEach(function (c) {
      c.classList.remove("active");
    });
    chip.classList.add("active");
    // Signal to bridge that category changed
    if (typeof onCategoryChange === "function")
      onCategoryChange(activeCategory);
  });

  // ── Product list ───────────────────────────────────────────────────────
  function renderProducts(products) {
    if (!products || !products.length) {
      dom.productList.innerHTML =
        '<li class="empty-state">No se encontraron productos.</li>';
      return;
    }

    dom.productList.innerHTML = products
      .map(function (p) {
        var inB = p.ean in basket;
        return (
          '<li class="product-row' +
          (inB ? " in-basket" : "") +
          '" data-ean="' +
          esc(p.ean) +
          '">' +
          '<div class="product-info">' +
          '<div class="product-name">' +
          esc(p.product_description) +
          "</div>" +
          '<div class="product-meta">' +
          esc(p.marca || "") +
          " &middot; " +
          esc(p.categoria || "") +
          "</div>" +
          "</div>" +
          '<span class="product-price">' +
          formatPrice(p.precio_actual) +
          "</span>" +
          varBadge(p.variacion) +
          '<button class="product-add-btn">' +
          (inB ? "\u2713" : "+") +
          "</button>" +
          "</li>"
        );
      })
      .join("");
  }

  // Click on product row or its add button → toggle basket
  dom.productList.addEventListener("click", function (e) {
    var row = e.target.closest(".product-row");
    if (!row) return;
    var ean = row.dataset.ean;
    toggleBasketItem(ean, row);
  });

  // ── Basket management ──────────────────────────────────────────────────
  function toggleBasketItem(ean, row) {
    if (basket[ean]) {
      removeBasketItem(ean);
    } else {
      addBasketItem(ean, row);
    }
  }

  function addBasketItem(ean, row) {
    var nameEl = row && row.querySelector(".product-name");
    var metaEl = row && row.querySelector(".product-meta");
    basket[ean] = {
      name: nameEl ? nameEl.textContent : ean,
      brand: "",
      category: metaEl ? metaEl.textContent : "",
    };
    basketVars[ean] = null;
    if (row) row.classList.add("in-basket");
    updateBasketRowButton(ean, true);
    updateBasketPreview();
    updateBtnReview();
    if (typeof onAddProduct === "function") onAddProduct(ean);
  }

  function removeBasketItem(ean) {
    delete basket[ean];
    delete basketVars[ean];
    updateBasketRowButton(ean, false);
    updateBasketPreview();
    updateBtnReview();
    if (basketCount() === 0 && currentStep > 1) goToStep(1);
    if (typeof onRemoveProduct === "function") onRemoveProduct(ean);
  }

  function updateBasketRowButton(ean, inBasket) {
    var row = dom.productList.querySelector('[data-ean="' + ean + '"]');
    if (row) {
      row.classList.toggle("in-basket", inBasket);
      var btn = row.querySelector(".product-add-btn");
      if (btn) btn.textContent = inBasket ? "\u2713" : "+";
    }
  }

  // Merge basket info from server (fills in brand, category)
  function setBasketInfo(infoList) {
    if (!infoList) return;
    infoList.forEach(function (item) {
      if (basket[item.ean]) {
        basket[item.ean].name = item.name;
        basket[item.ean].brand = item.brand;
        basket[item.ean].category = item.category;
      }
    });
  }

  // ── Basket preview (Step 1 right column) ───────────────────────────────
  function updateBasketPreview() {
    var eans = Object.keys(basket);
    if (eans.length === 0) {
      dom.basketPreview.innerHTML =
        '<li class="empty-state">Agreg\u00e1 productos desde la izquierda.</li>';
      dom.basketSummary.classList.add("hidden");
      return;
    }

    dom.basketPreview.innerHTML = eans
      .map(function (ean) {
        var b = basket[ean];
        var v = basketVars[ean];
        return (
          '<li class="basket-item" data-ean="' +
          esc(ean) +
          '">' +
          '<div class="basket-item-info">' +
          '<div class="basket-item-name">' +
          esc(b.name || ean) +
          "</div>" +
          '<div class="basket-item-cat">' +
          esc((b.brand || "") + (b.category ? " \u00b7 " + b.category : "")) +
          "</div>" +
          "</div>" +
          varBadge(v) +
          '<button class="basket-remove" data-remove="' +
          esc(ean) +
          '" aria-label="Quitar">&times;</button>' +
          "</li>"
        );
      })
      .join("");

    updateBasketLiveSummary();
  }

  function updateBasketLiveSummary() {
    var eans = Object.keys(basket);
    var vars = eans
      .map(function (e) {
        return basketVars[e];
      })
      .filter(function (v) {
        return v != null && !isNaN(v);
      });
    if (vars.length === 0) {
      dom.basketSummary.classList.add("hidden");
      return;
    }

    var avg =
      Math.round(
        (vars.reduce(function (a, b) {
          return a + b;
        }, 0) /
          vars.length) *
          10,
      ) / 10;
    var ipcMap = { mensual: 8.8, trimestral: 26.5, interanual: 118.4 };
    var ipc = ipcMap[currentPeriod] || 8.8;
    var diff = Math.round((avg - ipc) * 10) / 10;
    var periodLabel =
      {
        mensual: "30 d\u00edas",
        trimestral: "90 d\u00edas",
        interanual: "365 d\u00edas",
      }[currentPeriod] || "30 d\u00edas";

    var avgColor = avg >= 0 ? "color-red" : "color-green";
    var diffColor = diff > 0 ? "color-red" : diff < 0 ? "color-green" : "";
    var avgSign = avg >= 0 ? "+" : "";
    var diffSign = diff >= 0 ? "+" : "";
    var diffLabel = diff > 0 ? "por encima" : diff < 0 ? "por debajo" : "";

    dom.basketSummary.classList.remove("hidden");
    dom.basketSummary.innerHTML =
      '<div class="summary-block">' +
      '<div class="summary-label">Tu inflaci\u00f3n (' +
      periodLabel +
      ")</div>" +
      '<div class="summary-value ' +
      avgColor +
      '">' +
      avgSign +
      avg +
      "%</div>" +
      "</div>" +
      '<div class="summary-block">' +
      '<div class="summary-label">IPC oficial</div>' +
      '<div class="summary-value">' +
      (ipc >= 0 ? "+" : "") +
      ipc +
      "%</div>" +
      '<div class="summary-sub ' +
      diffColor +
      '">' +
      diffSign +
      diff +
      " pp " +
      diffLabel +
      "</div>" +
      "</div>";
  }

  dom.basketPreview.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove]");
    if (btn) removeBasketItem(btn.dataset.remove);
  });

  // ── Basket review (Step 2) ─────────────────────────────────────────────
  function renderBasketReview(variationData) {
    // Update variations from server data
    if (variationData && variationData.length) {
      variationData.forEach(function (p) {
        basketVars[p.ean] = p.variacion;
      });
    }

    var eans = Object.keys(basket);
    if (eans.length === 0) {
      dom.basketReview.innerHTML =
        '<li class="empty-state">Tu canasta est\u00e1 vac\u00eda.</li>';
      dom.step2Summary.classList.add("hidden");
      return;
    }

    dom.basketReview.innerHTML = eans
      .map(function (ean) {
        var b = basket[ean];
        var v = basketVars[ean];
        return (
          '<li class="basket-item" data-ean="' +
          esc(ean) +
          '">' +
          '<div class="basket-item-info">' +
          '<div class="basket-item-name">' +
          esc(b.name || ean) +
          "</div>" +
          '<div class="basket-item-cat">' +
          esc((b.brand || "") + (b.category ? " \u00b7 " + b.category : "")) +
          "</div>" +
          "</div>" +
          varBadge(v) +
          '<button class="basket-remove" data-remove-review="' +
          esc(ean) +
          '" aria-label="Quitar">&times;</button>' +
          "</li>"
        );
      })
      .join("");

    renderStep2Summary();
  }

  function renderStep2Summary() {
    var eans = Object.keys(basket);
    var vars = eans
      .map(function (e) {
        return basketVars[e];
      })
      .filter(function (v) {
        return v != null && !isNaN(v);
      });
    if (vars.length === 0) {
      dom.step2Summary.classList.add("hidden");
      return;
    }

    var avg =
      Math.round(
        (vars.reduce(function (a, b) {
          return a + b;
        }, 0) /
          vars.length) *
          10,
      ) / 10;
    var ipcMap = { mensual: 8.8, trimestral: 26.5, interanual: 118.4 };
    var ipc = ipcMap[currentPeriod] || 8.8;
    var diff = Math.round((avg - ipc) * 10) / 10;
    var periodLabel =
      {
        mensual: "30 d\u00edas",
        trimestral: "90 d\u00edas",
        interanual: "365 d\u00edas",
      }[currentPeriod] || "30 d\u00edas";

    var avgColor = avg >= 0 ? "color-red" : "color-green";
    var diffColor = diff > 0 ? "color-red" : diff < 0 ? "color-green" : "";
    var avgSign = avg >= 0 ? "+" : "";
    var diffSign = diff >= 0 ? "+" : "";
    var diffLabel = diff > 0 ? "por encima" : diff < 0 ? "por debajo" : "";

    dom.step2Summary.classList.remove("hidden");
    dom.step2Summary.innerHTML =
      '<div class="summary-block">' +
      '<div class="summary-label">Tu inflaci\u00f3n (' +
      periodLabel +
      ")</div>" +
      '<div class="summary-value ' +
      avgColor +
      '">' +
      avgSign +
      avg +
      "%</div>" +
      "</div>" +
      '<div class="summary-block">' +
      '<div class="summary-label">IPC oficial</div>' +
      '<div class="summary-value">' +
      (ipc >= 0 ? "+" : "") +
      ipc +
      "%</div>" +
      '<div class="summary-sub ' +
      diffColor +
      '">' +
      diffSign +
      diff +
      " pp " +
      diffLabel +
      "</div>" +
      "</div>";
  }

  dom.basketReview.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove-review]");
    if (!btn) return;
    removeBasketItem(btn.dataset.removeReview);
  });

  // ── Review button state ────────────────────────────────────────────────
  function updateBtnReview() {
    var n = basketCount();
    dom.btnReview.disabled = n === 0;
    dom.btnReview.textContent =
      n > 0 ? "Revisar canasta (" + n + ")" : "Revisar canasta";
  }

  // ── Results (Step 3) ───────────────────────────────────────────────────
  function renderResults(data) {
    if (!data || data.error) {
      dom.resultCards.innerHTML =
        '<div class="result-card"><div class="result-card-label">Error</div><div class="result-card-sub">' +
        esc((data && data.error) || "Sin datos") +
        "</div></div>";
      return;
    }

    var pi = data.personal_inflation;
    var ipc = data.ipc;
    var diff = data.diff_pp;

    var piSign = pi >= 0 ? "+" : "";
    var piColor = pi > ipc ? "color-red" : "color-green";
    var diffSign = diff >= 0 ? "+" : "";
    var diffColor = diff > 0 ? "color-red" : diff < 0 ? "color-green" : "";
    var ipcSign = ipc >= 0 ? "+" : "";
    var diffLabel =
      diff > 0
        ? "Por encima del IPC"
        : diff < 0
          ? "Por debajo del IPC"
          : "Igual al IPC";

    dom.resultCards.innerHTML =
      '<div class="result-card">' +
      '<div class="result-card-label">Tu inflaci\u00f3n (' +
      esc(data.period_label) +
      ")</div>" +
      '<div class="result-card-value ' +
      piColor +
      '">' +
      piSign +
      pi +
      "%</div>" +
      "</div>" +
      '<div class="result-card">' +
      '<div class="result-card-label">IPC oficial</div>' +
      '<div class="result-card-value">' +
      ipcSign +
      ipc +
      "%</div>" +
      "</div>" +
      '<div class="result-card">' +
      '<div class="result-card-label">Diferencia</div>' +
      '<div class="result-card-value ' +
      diffColor +
      '">' +
      diffSign +
      diff +
      " pp</div>" +
      '<div class="result-card-sub">' +
      diffLabel +
      "</div>" +
      "</div>";

    var products = data.products;
    if (products && products.length) {
      dom.resultProducts.innerHTML = products
        .map(function (p) {
          return (
            '<li class="basket-item">' +
            '<div class="basket-item-info">' +
            '<div class="basket-item-name">' +
            esc(p.product_description) +
            "</div>" +
            '<div class="basket-item-cat">' +
            esc(p.marca || "") +
            " &middot; " +
            esc(p.categoria || "") +
            "</div>" +
            "</div>" +
            varBadge(p.variacion) +
            "</li>"
          );
        })
        .join("");
    } else {
      dom.resultProducts.innerHTML =
        '<li class="empty-state">Sin datos de variaci\u00f3n.</li>';
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────
  return {
    dom: dom,
    showTab: showTab,
    goToStep: goToStep,
    setPeriod: setPeriod,
    getPeriod: function () {
      return currentPeriod;
    },
    getBasketEans: function () {
      return Object.keys(basket);
    },
    basketCount: basketCount,
    getActiveCategory: function () {
      return activeCategory;
    },
    renderCategoryChips: renderCategoryChips,
    renderProducts: renderProducts,
    renderBasketReview: renderBasketReview,
    renderResults: renderResults,
    updateBasketPreview: updateBasketPreview,
    updateBtnReview: updateBtnReview,
    setBasketInfo: setBasketInfo,
    esc: esc,
  };
})();

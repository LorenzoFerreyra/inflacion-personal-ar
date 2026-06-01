/**
 * UI Controller — Pure DOM interactions, no Shiny knowledge.
 * Manages navigation, stepper, selections, and basket display.
 */

var UI = (function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────

  var currentStep = 1;
  var currentPage = 'calculator';
  var selectedProducts = {};  // { ean: {name, brand} }

  // ── DOM refs ──────────────────────────────────────────────────────────

  var dom = {
    pages:          document.querySelectorAll('.page'),
    navLinks:       document.querySelectorAll('.nav-link'),
    stepItems:      document.querySelectorAll('.step-item'),
    stepConnectors: document.querySelectorAll('.step-connector'),
    stepPanes:      document.querySelectorAll('.step-pane'),
    stepContent:    document.querySelector('.step-content'),
    resultsSection: document.getElementById('results-section'),
    basketBar:      document.getElementById('basket-bar'),
    basketCount:    document.getElementById('basket-count'),
    basketTags:     document.getElementById('basket-tags'),
    categoryGrid:   document.getElementById('category-grid'),
    productList:    document.getElementById('product-list'),
    productSearch:  document.getElementById('product-search-input'),
    productFilters: document.getElementById('product-filters'),
    searchInput:    document.getElementById('search-input'),
    searchFilters:  document.getElementById('search-filters'),
    searchResults:  document.getElementById('search-results'),
    resultCards:    document.getElementById('result-cards'),
    productBars:    document.getElementById('product-bars'),
    resultSubtitle: document.getElementById('results-subtitle'),
    lastUpdated:    document.getElementById('last-updated'),
  };

  // ── Navigation ────────────────────────────────────────────────────────

  function showPage(pageId) {
    currentPage = pageId;

    dom.pages.forEach(function (p) {
      p.classList.toggle('active', p.id === 'page-' + pageId);
    });

    dom.navLinks.forEach(function (link) {
      link.classList.toggle('active', link.dataset.page === pageId);
    });

    updateBasketBarVisibility();
  }

  dom.navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      showPage(link.dataset.page);
    });
  });

  // ── Stepper ───────────────────────────────────────────────────────────

  function goToStep(n) {
    currentStep = n;

    dom.stepItems.forEach(function (item, i) {
      var stepNum = i + 1;
      item.classList.toggle('active', stepNum === n);
      item.classList.toggle('completed', stepNum < n);
    });

    dom.stepConnectors.forEach(function (conn, i) {
      conn.classList.toggle('completed', i + 1 < n);
    });

    dom.stepPanes.forEach(function (pane) {
      pane.classList.toggle('active', pane.id === 'step-' + n);
    });

    var isResults = n === 3;
    dom.resultsSection.classList.toggle('hidden', !isResults);
    dom.stepContent.style.display = isResults ? 'none' : '';

    updateBasketBarVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  dom.stepItems.forEach(function (item) {
    item.addEventListener('click', function () {
      goToStep(parseInt(item.dataset.step, 10));
    });
  });

  // ── Action buttons (delegated) ────────────────────────────────────────

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    var handlers = {
      'next-step':    function () { goToStep(Math.min(currentStep + 1, 3)); },
      'prev-step':    function () { goToStep(Math.max(currentStep - 1, 1)); },
      'calculate':    function () { goToStep(3); },
      'edit-basket':  function () { goToStep(2); },
    };

    var handler = handlers[btn.dataset.action];
    if (handler) handler();
  });

  // ── Filter chips (delegated, exclusive within group) ──────────────────

  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.filter-chip');
    if (!chip) return;

    var group = chip.closest('.filter-chips');
    group.querySelectorAll('.filter-chip').forEach(function (c) {
      c.classList.remove('active');
    });
    chip.classList.add('active');
  });

  // ── Category cards (delegated on grid) ────────────────────────────────

  dom.categoryGrid.addEventListener('click', function (e) {
    var card = e.target.closest('.category-card');
    if (card) card.classList.toggle('selected');
  });

  // ── Product rows (delegated on list) ──────────────────────────────────

  dom.productList.addEventListener('click', function (e) {
    var row = e.target.closest('.product-row');
    if (!row) return;

    var ean = row.dataset.ean;
    var isSelected = row.classList.toggle('selected');
    row.setAttribute('aria-selected', isSelected);

    if (isSelected) {
      selectedProducts[ean] = {
        name: row.querySelector('.product-name').textContent,
        brand: row.querySelector('.product-brand').textContent,
      };
    } else {
      delete selectedProducts[ean];
    }

    updateBasketDisplay();
  });

  // ── Basket display ────────────────────────────────────────────────────

  function updateBasketDisplay() {
    var eans = Object.keys(selectedProducts);
    dom.basketCount.textContent = eans.length;

    dom.basketTags.innerHTML = eans.map(function (ean) {
      var p = selectedProducts[ean];
      return '<span class="basket-tag">' +
        escapeHtml(p.name) +
        ' <button class="basket-tag-remove" data-remove-ean="' + ean + '" aria-label="Quitar">&times;</button>' +
        '</span>';
    }).join('');

    updateBasketBarVisibility();
  }

  function updateBasketBarVisibility() {
    var hasProducts = Object.keys(selectedProducts).length > 0;
    var show = hasProducts && currentPage === 'calculator' && currentStep < 3;
    dom.basketBar.classList.toggle('visible', show);
  }

  // Remove from basket via tag × button
  dom.basketTags.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-ean]');
    if (!btn) return;

    var ean = btn.dataset.removeEan;
    delete selectedProducts[ean];

    var row = dom.productList.querySelector('[data-ean="' + ean + '"]');
    if (row) {
      row.classList.remove('selected');
      row.setAttribute('aria-selected', 'false');
    }

    updateBasketDisplay();
  });

  // ── Rendering helpers ─────────────────────────────────────────────────

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatPrice(n) {
    return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  function renderCategories(categories) {
    var icons = {
      'Carnes':           '🥩',
      'Lácteos':          '🥛',
      'Panadería':        '🍞',
      'Almacén':          '🥫',
      'Bebidas':          '🧃',
      'Limpieza':         '🧹',
      'Higiene personal': '🧴',
      'Congelados':       '❄️',
      'Alcoholes':        '🍺',
    };

    dom.categoryGrid.innerHTML = categories.map(function (cat) {
      var icon = icons[cat.categoria] || '📦';
      return '<button class="category-card" data-category="' + escapeHtml(cat.categoria) + '">' +
        '<span class="category-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="category-name">' + escapeHtml(cat.categoria) + '</span>' +
        '<span class="category-count">' + cat.n + ' productos</span>' +
        '</button>';
    }).join('');
  }

  function renderProducts(products) {
    if (products.length === 0) {
      dom.productList.innerHTML = '<li class="empty-state">No se encontraron productos.</li>';
      return;
    }

    dom.productList.innerHTML = products.map(function (p) {
      var isSelected = selectedProducts.hasOwnProperty(p.ean);
      return '<li class="product-row' + (isSelected ? ' selected' : '') + '" ' +
        'data-ean="' + escapeHtml(p.ean) + '" role="option" aria-selected="' + isSelected + '">' +
        '<div class="product-info">' +
          '<span class="product-name">' + escapeHtml(p.product_description) + '</span>' +
          '<span class="product-brand">' + escapeHtml(p.marca || '') + '</span>' +
        '</div>' +
        '<div class="check-circle" aria-hidden="true"></div>' +
        '</li>';
    }).join('');
  }

  function renderFilterChips(container, categories, allLabel) {
    var html = '<button class="filter-chip active">' + (allLabel || 'Todos') + '</button>';
    html += categories.map(function (cat) {
      return '<button class="filter-chip" data-filter-category="' + escapeHtml(cat) + '">' +
        escapeHtml(cat) + '</button>';
    }).join('');
    container.innerHTML = html;
  }

  function renderSearchResults(results) {
    if (results.length === 0) {
      dom.searchResults.innerHTML = '<li class="empty-state">No se encontraron resultados.</li>';
      return;
    }

    dom.searchResults.innerHTML = results.map(function (r) {
      var price = r.precio_actual ? formatPrice(r.precio_actual) : '—';
      var change = r.variacion;
      var changeClass = change > 0 ? 'change-up' : change < 0 ? 'change-down' : '';
      var changeText = change !== null ? (change > 0 ? '+' : '') + change + '%' : '—';

      return '<li class="result-row">' +
        '<div class="result-product">' +
          '<span class="result-product-name">' + escapeHtml(r.product_description) + '</span>' +
          '<span class="result-product-meta">' +
            escapeHtml(r.marca || '') + ' · EAN ' + escapeHtml(r.ean) + ' · ' + escapeHtml(r.categoria || '') +
          '</span>' +
        '</div>' +
        '<span class="result-price">' + price + '</span>' +
        '<span class="result-change ' + changeClass + '">' + changeText + '</span>' +
        '</li>';
    }).join('');
  }

  function renderResultCards(data) {
    var sign = data.inflation_personal >= 0 ? '+' : '';

    dom.resultSubtitle.textContent =
      'Basado en ' + data.n_products + ' productos seleccionados · últimos ' + data.days + ' días';

    dom.resultCards.innerHTML =
      '<article class="stat-card">' +
        '<div class="stat-label">Tu inflación acumulada</div>' +
        '<div class="stat-value color-red">' + sign + data.inflation_personal + '%</div>' +
        '<div class="stat-sub">Últimos ' + data.days + ' días</div>' +
      '</article>';
  }

  function renderProductBars(variations) {
    if (!variations || variations.length === 0) {
      dom.productBars.innerHTML = '<li class="empty-state">Sin datos de variación.</li>';
      return;
    }

    var maxVar = Math.max.apply(null, variations.map(function (v) { return Math.abs(v.variacion); }));

    dom.productBars.innerHTML = variations.map(function (v) {
      var width = maxVar > 0 ? Math.round(Math.abs(v.variacion) / maxVar * 100) : 0;
      var colorClass = v.variacion >= 0 ? 'bar-fill--red' : 'bar-fill--green';
      var textClass = v.variacion >= 0 ? 'color-red' : 'color-green';
      var sign = v.variacion >= 0 ? '+' : '';

      return '<li class="bar-row">' +
        '<span class="bar-label">' + escapeHtml(v.product_description) + '</span>' +
        '<div class="bar-track"><div class="bar-fill ' + colorClass + '" style="width:' + width + '%"></div></div>' +
        '<span class="bar-value ' + textClass + '">' + sign + v.variacion + '%</span>' +
        '</li>';
    }).join('');
  }

  // ── Getters for bridge.js ─────────────────────────────────────────────

  function getSelectedCategories() {
    var cards = dom.categoryGrid.querySelectorAll('.category-card.selected');
    return Array.prototype.map.call(cards, function (c) { return c.dataset.category; });
  }

  function getSelectedEans() {
    return Object.keys(selectedProducts);
  }

  function getActiveFilterCategory(container) {
    var active = container.querySelector('.filter-chip.active[data-filter-category]');
    return active ? active.dataset.filterCategory : '';
  }

  // ── Public API ────────────────────────────────────────────────────────

  return {
    dom:                    dom,
    showPage:               showPage,
    goToStep:               goToStep,
    renderCategories:       renderCategories,
    renderProducts:         renderProducts,
    renderFilterChips:      renderFilterChips,
    renderSearchResults:    renderSearchResults,
    renderResultCards:      renderResultCards,
    renderProductBars:      renderProductBars,
    getSelectedCategories:  getSelectedCategories,
    getSelectedEans:        getSelectedEans,
    getActiveFilterCategory: getActiveFilterCategory,
    formatPrice:            formatPrice,
    escapeHtml:             escapeHtml,
  };

})();

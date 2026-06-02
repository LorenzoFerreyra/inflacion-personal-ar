var UI = (function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────

  var currentTab = 'canasta';
  var currentStep = 1;
  var currentPeriod = 'mensual';
  var basket = {};           // { ean: { name, brand, category } }
  var basketVariations = {}; // { ean: number|null }

  // ── DOM ────────────────────────────────────────────────────────────────

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var dom = {
    tabLinks:       $$('.tab-link'),
    tabPanes:       $$('.tab-pane'),
    steps:          $$('.step'),
    searchInput:    $('#search-input'),
    categoryChips:  $('#category-chips'),
    periodToggle1:  $('#period-toggle-1'),
    periodToggle2:  $('#period-toggle-2'),
    productList:    $('#product-list'),
    basketPreview:  $('#basket-preview'),
    basketSummary:  $('#basket-summary'),
    btnReview:      $('#btn-review'),
    basketReview:   $('#basket-review'),
    btnResults:     $('#btn-results'),
    resultCards:    $('#result-cards'),
    resultProducts: $('#result-products'),
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function formatPrice(n) {
    if (!n) return '—';
    return '$' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }

  function varBadge(v) {
    if (v === null || v === undefined) return '<span class="var-badge var-flat">—</span>';
    var cls = v > 0 ? 'var-up' : v < 0 ? 'var-down' : 'var-flat';
    var sign = v > 0 ? '+' : '';
    return '<span class="var-badge ' + cls + '">' + sign + v + '%</span>';
  }

  function basketCount() {
    return Object.keys(basket).length;
  }

  // ── Tab navigation ─────────────────────────────────────────────────────

  function showTab(id) {
    currentTab = id;
    dom.tabLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.tab === id); });
    dom.tabPanes.forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + id); });
  }

  dom.tabLinks.forEach(function (l) {
    l.addEventListener('click', function () { showTab(l.dataset.tab); });
  });

  // ── Step navigation ────────────────────────────────────────────────────

  function goToStep(n) {
    currentStep = n;
    dom.steps.forEach(function (s) {
      s.classList.toggle('active', s.id === 'step-' + n);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (n === 3) {
      setTimeout(function () { $(window).trigger && $(window).trigger('resize'); }, 100);
    }
  }

  // ── Period toggle ──────────────────────────────────────────────────────

  function syncPeriodToggles() {
    $$('.period-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.period === currentPeriod);
    });
  }

  function onPeriodChange(period) {
    currentPeriod = period;
    syncPeriodToggles();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.period-btn');
    if (!btn) return;
    onPeriodChange(btn.dataset.period);
  });

  // ── Category chips ─────────────────────────────────────────────────────

  var activeCategory = '';

  function renderCategoryChips(categories) {
    var html = '<button class="chip active" data-category="">Todos</button>';
    html += categories.map(function (c) {
      return '<button class="chip" data-category="' + esc(c.categoria) + '">' + esc(c.categoria) + '</button>';
    }).join('');
    dom.categoryChips.innerHTML = html;
  }

  dom.categoryChips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    activeCategory = chip.dataset.category || '';
    $$('.chip', dom.categoryChips).forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
  });

  // ── Product list (Step 1) ──────────────────────────────────────────────

  function renderProducts(products) {
    if (!products || products.length === 0) {
      dom.productList.innerHTML = '<li class="empty-state">No se encontraron productos.</li>';
      return;
    }

    dom.productList.innerHTML = products.map(function (p) {
      var inBasket = basket.hasOwnProperty(p.ean);
      return '<li class="product-row' + (inBasket ? ' in-basket' : '') + '" data-ean="' + esc(p.ean) + '">' +
        '<div class="product-info">' +
          '<div class="product-name">' + esc(p.product_description) + '</div>' +
          '<div class="product-meta">' + esc(p.marca || '') + ' · ' + esc(p.categoria || '') + '</div>' +
        '</div>' +
        '<span class="product-price">' + formatPrice(p.precio_actual) + '</span>' +
        varBadge(p.variacion) +
        '<span class="product-add">' + (inBasket ? '✓' : '') + '</span>' +
      '</li>';
    }).join('');
  }

  dom.productList.addEventListener('click', function (e) {
    var row = e.target.closest('.product-row');
    if (!row) return;
    var ean = row.dataset.ean;
    toggleBasketItem(ean, row);
  });

  // ── Basket management ──────────────────────────────────────────────────

  function toggleBasketItem(ean, row) {
    if (basket[ean]) {
      delete basket[ean];
      delete basketVariations[ean];
      if (row) row.classList.remove('in-basket');
    } else {
      var nameEl = row && row.querySelector('.product-name');
      var metaEl = row && row.querySelector('.product-meta');
      var badgeEl = row && row.querySelector('.var-badge');
      basket[ean] = {
        name: nameEl ? nameEl.textContent : ean,
        meta: metaEl ? metaEl.textContent : '',
        category: '',
      };
      var badgeText = badgeEl ? badgeEl.textContent : '';
      var v = parseFloat(badgeText);
      basketVariations[ean] = isNaN(v) ? null : v;
      if (row) row.classList.add('in-basket');
    }
    if (row) {
      var addEl = row.querySelector('.product-add');
      if (addEl) addEl.textContent = basket[ean] ? '✓' : '';
    }
    updateBasketPreview();
    updateBtnReview();
  }

  function removeBasketItem(ean) {
    delete basket[ean];
    delete basketVariations[ean];
    var row = dom.productList.querySelector('[data-ean="' + ean + '"]');
    if (row) {
      row.classList.remove('in-basket');
      var addEl = row.querySelector('.product-add');
      if (addEl) addEl.textContent = '';
    }
    updateBasketPreview();
    updateBtnReview();
  }

  // ── Basket preview (Step 1 right column) ───────────────────────────────

  function updateBasketPreview() {
    var eans = Object.keys(basket);
    if (eans.length === 0) {
      dom.basketPreview.innerHTML = '<li class="empty-state">Agregá productos desde la izquierda.</li>';
      dom.basketSummary.classList.add('hidden');
      return;
    }

    dom.basketPreview.innerHTML = eans.map(function (ean) {
      var b = basket[ean];
      var v = basketVariations[ean];
      return '<li class="basket-item" data-ean="' + esc(ean) + '">' +
        '<div class="basket-item-info">' +
          '<div class="basket-item-name">' + esc(b.name) + '</div>' +
          '<div class="basket-item-cat">' + esc(b.meta) + '</div>' +
        '</div>' +
        varBadge(v) +
        '<button class="basket-remove" data-remove="' + esc(ean) + '" aria-label="Quitar">×</button>' +
      '</li>';
    }).join('');

    updateBasketSummary();
  }

  function updateBasketSummary() {
    var eans = Object.keys(basket);
    var variations = eans.map(function (ean) { return basketVariations[ean]; }).filter(function (v) { return v !== null && v !== undefined; });

    if (variations.length === 0) {
      dom.basketSummary.classList.add('hidden');
      return;
    }

    var avg = variations.reduce(function (a, b) { return a + b; }, 0) / variations.length;
    avg = Math.round(avg * 10) / 10;

    var ipcMap = { mensual: 8.8, trimestral: 26.5, interanual: 118.4 };
    var ipc = ipcMap[currentPeriod] || 8.8;
    var diff = Math.round((avg - ipc) * 10) / 10;
    var periodLabel = { mensual: '30 días', trimestral: '90 días', interanual: '365 días' }[currentPeriod] || '30 días';

    var colorClass = avg >= 0 ? 'color-red' : 'color-green';
    var diffColor = diff > 0 ? 'color-red' : diff < 0 ? 'color-green' : '';
    var sign = avg >= 0 ? '+' : '';
    var diffSign = diff >= 0 ? '+' : '';

    dom.basketSummary.classList.remove('hidden');
    dom.basketSummary.innerHTML =
      '<div class="summary-block">' +
        '<div class="summary-label">Tu inflación (' + periodLabel + ')</div>' +
        '<div class="summary-value ' + colorClass + '">' + sign + avg + '%</div>' +
      '</div>' +
      '<div class="summary-block">' +
        '<div class="summary-label">IPC oficial</div>' +
        '<div class="summary-value">' + (ipc >= 0 ? '+' : '') + ipc + '%</div>' +
        '<div class="summary-sub ' + diffColor + '">' + diffSign + diff + ' pp ' + (diff > 0 ? 'por encima' : diff < 0 ? 'por debajo' : '') + '</div>' +
      '</div>';
  }

  dom.basketPreview.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove]');
    if (btn) removeBasketItem(btn.dataset.remove);
  });

  // ── Basket review (Step 2) ─────────────────────────────────────────────

  function renderBasketReview(data) {
    if (data && data.length > 0) {
      data.forEach(function (p) {
        basketVariations[p.ean] = p.variacion;
      });
    }

    var eans = Object.keys(basket);
    if (eans.length === 0) {
      dom.basketReview.innerHTML = '<li class="empty-state">Tu canasta está vacía.</li>';
      return;
    }

    dom.basketReview.innerHTML = eans.map(function (ean) {
      var b = basket[ean];
      var v = basketVariations[ean];
      return '<li class="basket-item" data-ean="' + esc(ean) + '">' +
        '<div class="basket-item-info">' +
          '<div class="basket-item-name">' + esc(b.name) + '</div>' +
          '<div class="basket-item-cat">' + esc(b.meta) + '</div>' +
        '</div>' +
        varBadge(v) +
        '<button class="basket-remove" data-remove-review="' + esc(ean) + '" aria-label="Quitar">×</button>' +
      '</li>';
    }).join('');
  }

  dom.basketReview.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-review]');
    if (!btn) return;
    removeBasketItem(btn.dataset.removeReview);
    renderBasketReview(null);
    if (basketCount() === 0) goToStep(1);
  });

  // ── Review button state ────────────────────────────────────────────────

  function updateBtnReview() {
    var n = basketCount();
    dom.btnReview.disabled = n === 0;
    dom.btnReview.textContent = n > 0 ? 'Revisar canasta (' + n + ')' : 'Revisar canasta';
  }

  // ── Results (Step 3) ───────────────────────────────────────────────────

  function renderResults(data) {
    if (!data || data.error) {
      dom.resultCards.innerHTML = '<div class="result-card"><div class="result-card-label">Error</div><div class="result-card-sub">' + esc(data && data.error || 'Sin datos') + '</div></div>';
      return;
    }

    var pi = data.personal_inflation;
    var ipc = data.ipc;
    var diff = data.diff_pp;
    var piSign = pi >= 0 ? '+' : '';
    var piColor = pi > ipc ? 'color-red' : 'color-green';
    var diffSign = diff >= 0 ? '+' : '';
    var diffColor = diff > 0 ? 'color-red' : diff < 0 ? 'color-green' : '';

    dom.resultCards.innerHTML =
      '<div class="result-card">' +
        '<div class="result-card-label">Tu inflación (' + esc(data.period_label) + ')</div>' +
        '<div class="result-card-value ' + piColor + '">' + piSign + pi + '%</div>' +
      '</div>' +
      '<div class="result-card">' +
        '<div class="result-card-label">IPC oficial</div>' +
        '<div class="result-card-value">' + (ipc >= 0 ? '+' : '') + ipc + '%</div>' +
      '</div>' +
      '<div class="result-card">' +
        '<div class="result-card-label">Diferencia</div>' +
        '<div class="result-card-value ' + diffColor + '">' + diffSign + diff + ' pp</div>' +
        '<div class="result-card-sub">' + (diff > 0 ? 'Por encima del IPC' : diff < 0 ? 'Por debajo del IPC' : 'Igual al IPC') + '</div>' +
      '</div>';

    var products = data.products;
    if (products && products.length > 0) {
      dom.resultProducts.innerHTML = products.map(function (p) {
        return '<li class="basket-item">' +
          '<div class="basket-item-info">' +
            '<div class="basket-item-name">' + esc(p.product_description) + '</div>' +
            '<div class="basket-item-cat">' + esc(p.marca || '') + ' · ' + esc(p.categoria || '') + '</div>' +
          '</div>' +
          varBadge(p.variacion) +
        '</li>';
      }).join('');
    } else {
      dom.resultProducts.innerHTML = '<li class="empty-state">Sin datos de variación.</li>';
    }
  }

  // ── Action buttons (delegated) ─────────────────────────────────────────

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    if (action === 'back-to-1') goToStep(1);
    if (action === 'back-to-2') goToStep(2);
  });

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    dom:                 dom,
    showTab:             showTab,
    goToStep:            goToStep,
    onPeriodChange:      onPeriodChange,
    syncPeriodToggles:   syncPeriodToggles,
    renderCategoryChips: renderCategoryChips,
    renderProducts:      renderProducts,
    renderBasketReview:  renderBasketReview,
    renderResults:       renderResults,
    updateBasketPreview: updateBasketPreview,
    updateBasketSummary: updateBasketSummary,
    updateBtnReview:     updateBtnReview,
    getBasketEans:       function () { return Object.keys(basket); },
    getPeriod:           function () { return currentPeriod; },
    getCategory:         function () { return activeCategory; },
    getSearchTerm:       function () { return dom.searchInput ? dom.searchInput.value : ''; },
    basketCount:         basketCount,
    esc:                 esc,
  };

})();

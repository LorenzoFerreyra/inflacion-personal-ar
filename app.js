/**
 * Inflación Personal AR — UI Controller
 *
 * Modules:
 *   Navigation  — page switching
 *   Stepper     — multi-step calculator flow
 *   Selections  — category cards, product rows, filter chips
 *   Basket      — bottom bar visibility
 */

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────────────

  const DOM = {
    pages:          document.querySelectorAll('.page'),
    navLinks:       document.querySelectorAll('.nav-link'),
    stepItems:      document.querySelectorAll('.step-item'),
    stepConnectors: document.querySelectorAll('.step-connector'),
    stepPanes:      document.querySelectorAll('.step-pane'),
    stepContent:    document.querySelector('.step-content'),
    resultsSection: document.getElementById('results-section'),
    basketBar:      document.getElementById('basket-bar'),
    categoryCards:  document.querySelectorAll('.category-card'),
    productRows:    document.querySelectorAll('.product-row'),
    filterChips:    document.querySelectorAll('.filter-chips'),
  };

  // ── State ─────────────────────────────────────────────────────────────

  let currentStep = 1;
  let currentPage = 'calculator';

  // ── Navigation ────────────────────────────────────────────────────────

  function showPage(pageId) {
    currentPage = pageId;

    DOM.pages.forEach(function (p) {
      p.classList.toggle('active', p.id === 'page-' + pageId);
    });

    DOM.navLinks.forEach(function (link) {
      link.classList.toggle('active', link.dataset.page === pageId);
    });

    DOM.basketBar.classList.toggle('visible', pageId === 'calculator' && currentStep < 3);
  }

  DOM.navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      showPage(link.dataset.page);
    });
  });

  // ── Stepper ───────────────────────────────────────────────────────────

  function goToStep(n) {
    currentStep = n;

    DOM.stepItems.forEach(function (item, i) {
      var stepNum = i + 1;
      item.classList.toggle('active', stepNum === n);
      item.classList.toggle('completed', stepNum < n);
    });

    DOM.stepConnectors.forEach(function (conn, i) {
      conn.classList.toggle('completed', i + 1 < n);
    });

    DOM.stepPanes.forEach(function (pane) {
      pane.classList.toggle('active', pane.id === 'step-' + n);
    });

    var isResults = n === 3;
    DOM.resultsSection.classList.toggle('hidden', !isResults);
    DOM.stepContent.style.display = isResults ? 'none' : '';
    DOM.basketBar.classList.toggle('visible', !isResults && currentPage === 'calculator');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  DOM.stepItems.forEach(function (item) {
    item.addEventListener('click', function () {
      goToStep(parseInt(item.dataset.step, 10));
    });
  });

  // ── Action buttons (data-action) ─────────────────────────────────────

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    switch (btn.dataset.action) {
      case 'next-step':
        goToStep(Math.min(currentStep + 1, 3));
        break;
      case 'prev-step':
        goToStep(Math.max(currentStep - 1, 1));
        break;
      case 'calculate':
        goToStep(3);
        break;
      case 'edit-basket':
        goToStep(2);
        break;
    }
  });

  // ── Toggleable selections ─────────────────────────────────────────────

  DOM.categoryCards.forEach(function (card) {
    card.addEventListener('click', function () {
      card.classList.toggle('selected');
    });
  });

  DOM.productRows.forEach(function (row) {
    row.addEventListener('click', function () {
      var isSelected = row.classList.toggle('selected');
      row.setAttribute('aria-selected', isSelected);
    });
  });

  // ── Filter chips (exclusive selection within group) ───────────────────

  DOM.filterChips.forEach(function (group) {
    group.addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip');
      if (!chip) return;

      group.querySelectorAll('.filter-chip').forEach(function (c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');
    });
  });

})();

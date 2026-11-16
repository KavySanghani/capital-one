/**
 * Capital One Cloud Expense Management Dashboard — Client Application
 * Vanilla JS logic interacting with Express REST API & PostgreSQL
 */

(function () {
  'use strict';

  // State Management
  const state = {
    expenses: [],
    loading: false,
    dbConnected: false,
    activeSection: 'dashboard-section',
    pendingDeleteExpense: null,
    filters: {
      search: '',
      category: 'ALL',
      sort: 'date-desc',
    },
  };

  // Currency Formatter
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Category Color Map
  const CATEGORY_STYLES = {
    utilities: { bg: '#FEF3C7', color: '#92400E', dot: '#D97706' },
    infrastructure: { bg: '#DBEAFE', color: '#1E40AF', dot: '#2563EB' },
    networking: { bg: '#E0E7FF', color: '#3730A3', dot: '#4F46E5' },
    software: { bg: '#EDE9FE', color: '#5B21B6', dot: '#7C3AED' },
    hardware: { bg: '#FCE7F3', color: '#9D174D', dot: '#DB2777' },
    travel: { bg: '#CCFBF1', color: '#115E59', dot: '#0D9488' },
    office: { bg: '#DCFCE7', color: '#166534', dot: '#16A34A' },
    default: { bg: '#F1F5F9', color: '#334155', dot: '#64748B' },
  };

  function getCategoryStyle(catName) {
    if (!catName) return CATEGORY_STYLES.default;
    const key = catName.trim().toLowerCase();
    return CATEGORY_STYLES[key] || CATEGORY_STYLES.default;
  }

  // DOM Elements
  const elements = {
    // Nav & Layout
    navLinks: document.querySelectorAll('.nav-link'),
    contentSections: document.querySelectorAll('.content-section'),
    headerPageTitle: document.getElementById('header-page-title'),
    navExpenseCount: document.getElementById('nav-expense-count'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    sidebar: document.getElementById('sidebar'),

    // System Status
    dbPulseDot: document.getElementById('db-pulse-dot'),
    dbStatusLabel: document.getElementById('db-status-label'),
    dbStatusMeta: document.getElementById('db-status-meta'),
    connectionPill: document.getElementById('connection-pill'),
    headerPulseDot: document.getElementById('header-pulse-dot'),
    headerDbStatus: document.getElementById('header-db-status'),

    // Action Buttons
    btnRefresh: document.getElementById('btn-refresh'),
    btnQuickAdd: document.getElementById('btn-quick-add'),
    btnOpenAddForm: document.getElementById('btn-open-add-form'),
    btnViewAllExpenses: document.getElementById('btn-view-all-expenses'),

    // Dashboard KPIs
    kpiTotalAmount: document.getElementById('kpi-total-amount'),
    kpiTxCount: document.getElementById('kpi-tx-count'),
    kpiAvgAmount: document.getElementById('kpi-avg-amount'),
    kpiTopCategory: document.getElementById('kpi-top-category'),
    kpiTopAmount: document.getElementById('kpi-top-amount'),
    categoryBarsList: document.getElementById('category-bars-list'),
    categoryCountBadge: document.getElementById('category-count-badge'),
    recentTxList: document.getElementById('recent-tx-list'),

    // Expenses Table & Filters
    filterSearch: document.getElementById('filter-search'),
    filterCategory: document.getElementById('filter-category'),
    filterSort: document.getElementById('filter-sort'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    btnEmptyReset: document.getElementById('btn-empty-reset'),
    expensesTableBody: document.getElementById('expenses-table-body'),
    tableLoading: document.getElementById('table-loading'),
    tableEmpty: document.getElementById('table-empty'),
    tableRecordCount: document.getElementById('table-record-count'),
    tableFilteredSum: document.getElementById('table-filtered-sum'),

    // Add Expense Form
    addExpenseForm: document.getElementById('add-expense-form'),
    expenseTitle: document.getElementById('expense-title'),
    expenseCategorySelect: document.getElementById('expense-category-select'),
    expenseCategoryCustom: document.getElementById('expense-category-custom'),
    expenseAmount: document.getElementById('expense-amount'),
    expenseDate: document.getElementById('expense-date'),
    titleCharCount: document.getElementById('title-char-count'),
    btnCancelForm: document.getElementById('btn-cancel-form'),
    btnSubmitExpense: document.getElementById('btn-submit-expense'),
    btnSubmitText: document.getElementById('btn-submit-text'),
    formAlert: document.getElementById('form-alert'),
    titleError: document.getElementById('title-error'),
    categoryError: document.getElementById('category-error'),
    amountError: document.getElementById('amount-error'),
    dateError: document.getElementById('date-error'),

    // Delete Modal
    deleteModalBackdrop: document.getElementById('delete-modal-backdrop'),
    deleteModalId: document.getElementById('delete-modal-id'),
    deleteModalTitle: document.getElementById('delete-modal-title'),
    deleteModalCategory: document.getElementById('delete-modal-category'),
    deleteModalAmount: document.getElementById('delete-modal-amount'),
    deleteModalDate: document.getElementById('delete-modal-date'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    btnDeleteText: document.getElementById('btn-delete-text'),

    // Toast Container
    toastContainer: document.getElementById('toast-container'),
  };

  /* ==========================================================================
     Navigation & Routing
     ========================================================================== */

  const SECTION_TITLES = {
    'dashboard-section': 'Executive Dashboard',
    'transactions-section': 'Expense Management',
    'add-expense-section': 'Add New Expense',
    'architecture-section': 'Cloud Architecture Progression',
  };

  function switchSection(targetSectionId) {
    if (!document.getElementById(targetSectionId)) return;

    state.activeSection = targetSectionId;

    // Update section visibility
    elements.contentSections.forEach((sec) => {
      if (sec.id === targetSectionId) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });

    // Update nav link active state
    elements.navLinks.forEach((link) => {
      if (link.getAttribute('data-section') === targetSectionId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update header title
    elements.headerPageTitle.textContent = SECTION_TITLES[targetSectionId] || 'Dashboard';

    // Close mobile menu if open
    elements.sidebar.classList.remove('mobile-open');

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavigation() {
    elements.navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-section');
        switchSection(targetId);
        window.location.hash = link.getAttribute('href');
      });
    });

    // Quick add button in topbar
    elements.btnQuickAdd.addEventListener('click', () => {
      switchSection('add-expense-section');
      window.location.hash = '#add-expense';
      elements.expenseTitle.focus();
    });

    // Add form button in expenses tab
    elements.btnOpenAddForm.addEventListener('click', () => {
      switchSection('add-expense-section');
      window.location.hash = '#add-expense';
      elements.expenseTitle.focus();
    });

    // "View all" link on dashboard
    elements.btnViewAllExpenses.addEventListener('click', () => {
      switchSection('transactions-section');
      window.location.hash = '#transactions';
    });

    // Mobile menu toggle
    elements.mobileMenuBtn.addEventListener('click', () => {
      elements.sidebar.classList.toggle('mobile-open');
    });

    // Check initial hash
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      const matched = Array.from(elements.navLinks).find(
        (l) => l.getAttribute('href') === `#${hash}`
      );
      if (matched) {
        switchSection(matched.getAttribute('data-section'));
      }
    }
  }

  /* ==========================================================================
     Health & Connection Status
     ========================================================================== */

  async function checkHealth() {
    try {
      const res = await fetch('/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === 'ok' && data.database === 'connected') {
        state.dbConnected = true;
        updateDbStatusUI(true, 'PostgreSQL Connected', 'PostgreSQL 16 Healthy');
      } else {
        state.dbConnected = false;
        updateDbStatusUI(false, 'Degraded', 'Database Unhealthy');
      }
    } catch (err) {
      state.dbConnected = false;
      updateDbStatusUI(false, 'Disconnected', 'API Unreachable');
    }
  }

  function updateDbStatusUI(isConnected, label, meta) {
    if (isConnected) {
      elements.dbPulseDot.className = 'status-pulse-dot connected';
      elements.dbStatusLabel.textContent = label;
      elements.dbStatusMeta.textContent = meta;

      elements.connectionPill.className = 'connection-pill';
      elements.headerDbStatus.textContent = 'PostgreSQL Connected';
    } else {
      elements.dbPulseDot.className = 'status-pulse-dot';
      elements.dbStatusLabel.textContent = label;
      elements.dbStatusMeta.textContent = meta;

      elements.connectionPill.className = 'connection-pill disconnected';
      elements.headerDbStatus.textContent = 'DB Disconnected';
    }
  }

  /* ==========================================================================
     Toast Notifications
     ========================================================================== */

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = type === 'success'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-msg">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    elements.toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });

    setTimeout(() => {
      removeToast(toast);
    }, 3800);
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }

  /* ==========================================================================
     Data Fetching & State Updates
     ========================================================================== */

  async function loadExpenses(showLoadingSpinner = true) {
    if (state.loading) return;
    state.loading = true;

    if (showLoadingSpinner) {
      elements.tableLoading.classList.remove('d-none');
      elements.tableEmpty.classList.add('d-none');
      elements.expensesTableBody.innerHTML = '';
    }

    try {
      const res = await fetch('/expenses');
      if (!res.ok) {
        throw new Error(`Failed to load expenses (${res.status} ${res.statusText})`);
      }
      const data = await res.json();
      state.expenses = Array.isArray(data) ? data : [];

      renderDashboardAnalytics();
      populateCategoryFilterOptions();
      renderExpensesTable();
      updateNavBadge();
    } catch (err) {
      console.error('Error fetching expenses:', err);
      showToast(err.message || 'Error communicating with database', 'error');
      elements.expensesTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2rem; color: var(--color-danger);">
            <strong>Failed to fetch records:</strong> ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    } finally {
      state.loading = false;
      elements.tableLoading.classList.add('d-none');
    }
  }

  function updateNavBadge() {
    elements.navExpenseCount.textContent = state.expenses.length;
  }

  /* ==========================================================================
     Dashboard Analytics Rendering
     ========================================================================== */

  function renderDashboardAnalytics() {
    const list = state.expenses;
    const totalCount = list.length;

    // 1. Total Spend
    let totalSpend = 0;
    const categoryTotals = {};
    const categoryCounts = {};

    list.forEach((item) => {
      const amt = parseFloat(item.amount) || 0;
      totalSpend += amt;

      const cat = (item.category || 'Uncategorized').trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    elements.kpiTotalAmount.textContent = currencyFormatter.format(totalSpend);
    elements.kpiTxCount.textContent = totalCount.toLocaleString();

    // 2. Average Spend
    const avgSpend = totalCount > 0 ? totalSpend / totalCount : 0;
    elements.kpiAvgAmount.textContent = currencyFormatter.format(avgSpend);

    // 3. Top Category
    let topCatName = '—';
    let topCatAmount = 0;
    const categories = Object.keys(categoryTotals);

    categories.forEach((cat) => {
      if (categoryTotals[cat] > topCatAmount) {
        topCatAmount = categoryTotals[cat];
        topCatName = cat;
      }
    });

    elements.kpiTopCategory.textContent = topCatName;
    elements.kpiTopAmount.textContent = `${currencyFormatter.format(topCatAmount)} total`;

    // 4. Category Breakdown List
    renderCategoryBars(categoryTotals, categoryCounts, totalSpend);

    // 5. Recent Transactions
    renderRecentTransactions(list.slice(0, 5));
  }

  function renderCategoryBars(categoryTotals, categoryCounts, totalSpend) {
    const categories = Object.keys(categoryTotals).sort(
      (a, b) => categoryTotals[b] - categoryTotals[a]
    );

    elements.categoryCountBadge.textContent = `${categories.length} categories`;

    if (categories.length === 0) {
      elements.categoryBarsList.innerHTML = `
        <div class="empty-state-text" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem 0;">
          No expense categories recorded yet.
        </div>
      `;
      return;
    }

    let html = '';
    categories.forEach((cat) => {
      const amount = categoryTotals[cat];
      const count = categoryCounts[cat];
      const percentage = totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0';
      const style = getCategoryStyle(cat);

      html += `
        <div class="cat-bar-item">
          <div class="cat-bar-header">
            <span class="cat-name-badge">
              <span class="cat-color-dot" style="background-color: ${style.dot};"></span>
              ${escapeHtml(cat)} (${count})
            </span>
            <span class="cat-bar-meta">
              <strong>${currencyFormatter.format(amount)}</strong>
              <span class="cat-percent">${percentage}%</span>
            </span>
          </div>
          <div class="cat-progress-track">
            <div class="cat-progress-fill" style="width: ${percentage}%; background-color: ${style.dot};"></div>
          </div>
        </div>
      `;
    });

    elements.categoryBarsList.innerHTML = html;
  }

  function renderRecentTransactions(recentItems) {
    if (recentItems.length === 0) {
      elements.recentTxList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--color-text-muted);">
          No transactions registered yet.
        </div>
      `;
      return;
    }

    let html = '';
    recentItems.forEach((tx) => {
      const style = getCategoryStyle(tx.category);
      html += `
        <div class="recent-tx-row">
          <div class="tx-main">
            <span class="tx-title text-truncate" title="${escapeHtml(tx.title)}">${escapeHtml(tx.title)}</span>
            <div class="tx-meta">
              <span class="cat-tag" style="background-color: ${style.bg}; color: ${style.color};">
                ${escapeHtml(tx.category)}
              </span>
              <span>${escapeHtml(tx.expense_date)}</span>
            </div>
          </div>
          <span class="tx-amount">${currencyFormatter.format(tx.amount)}</span>
        </div>
      `;
    });

    elements.recentTxList.innerHTML = html;
  }

  /* ==========================================================================
     Expenses Table & Filters
     ========================================================================== */

  function populateCategoryFilterOptions() {
    const currentVal = elements.filterCategory.value;
    const cats = Array.from(new Set(state.expenses.map((e) => (e.category || '').trim())))
      .filter(Boolean)
      .sort();

    let html = '<option value="ALL">All Categories</option>';
    cats.forEach((cat) => {
      html += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });

    elements.filterCategory.innerHTML = html;
    if (cats.includes(currentVal)) {
      elements.filterCategory.value = currentVal;
    } else {
      elements.filterCategory.value = 'ALL';
    }

    // Also populate Add Expense category select
    const formSelectVal = elements.expenseCategorySelect.value;
    const defaultFormCats = [
      'Utilities',
      'Infrastructure',
      'Networking',
      'Software',
      'Hardware',
      'Travel',
      'Office',
    ];
    const combinedCats = Array.from(new Set([...defaultFormCats, ...cats])).sort();

    let formCatHtml = '<option value="">Select a category...</option>';
    combinedCats.forEach((cat) => {
      formCatHtml += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });
    formCatHtml += '<option value="__CUSTOM__">+ Enter custom category...</option>';

    elements.expenseCategorySelect.innerHTML = formCatHtml;
    if (formSelectVal) {
      elements.expenseCategorySelect.value = formSelectVal;
    }
  }

  function getFilteredExpenses() {
    const query = state.filters.search.trim().toLowerCase();
    const cat = state.filters.category;
    const sort = state.filters.sort;

    let result = state.expenses.filter((item) => {
      // 1. Search Query
      if (query) {
        const titleMatch = (item.title || '').toLowerCase().includes(query);
        const catMatch = (item.category || '').toLowerCase().includes(query);
        const idMatch = String(item.id).includes(query);
        if (!titleMatch && !catMatch && !idMatch) return false;
      }

      // 2. Category Filter
      if (cat !== 'ALL') {
        if ((item.category || '').trim().toLowerCase() !== cat.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    // 3. Sort Order
    result.sort((a, b) => {
      if (sort === 'date-desc') {
        if (a.expense_date === b.expense_date) {
          return BigInt(b.id) > BigInt(a.id) ? 1 : -1;
        }
        return b.expense_date.localeCompare(a.expense_date);
      }
      if (sort === 'date-asc') {
        if (a.expense_date === b.expense_date) {
          return BigInt(a.id) > BigInt(b.id) ? 1 : -1;
        }
        return a.expense_date.localeCompare(b.expense_date);
      }
      if (sort === 'amount-desc') {
        return parseFloat(b.amount) - parseFloat(a.amount);
      }
      if (sort === 'amount-asc') {
        return parseFloat(a.amount) - parseFloat(b.amount);
      }
      if (sort === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return result;
  }

  function renderExpensesTable() {
    const filtered = getFilteredExpenses();

    // Update counts & sum
    elements.tableRecordCount.textContent = `Showing ${filtered.length} of ${state.expenses.length} expenses`;
    const filteredSum = filtered.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
    elements.tableFilteredSum.textContent = `Total: ${currencyFormatter.format(filteredSum)}`;

    if (filtered.length === 0) {
      elements.expensesTableBody.innerHTML = '';
      elements.tableEmpty.classList.remove('d-none');
      return;
    }

    elements.tableEmpty.classList.add('d-none');

    let rowsHtml = '';
    filtered.forEach((item) => {
      const style = getCategoryStyle(item.category);
      rowsHtml += `
        <tr data-id="${escapeHtml(item.id)}">
          <td class="th-id" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-text-muted);">
            #${escapeHtml(item.id)}
          </td>
          <td class="th-date">
            <strong>${escapeHtml(item.expense_date)}</strong>
          </td>
          <td class="th-title">
            <span class="text-bold">${escapeHtml(item.title)}</span>
          </td>
          <td class="th-category">
            <span class="cat-tag" style="background-color: ${style.bg}; color: ${style.color};">
              ${escapeHtml(item.category)}
            </span>
          </td>
          <td class="th-amount text-right text-bold" style="color: var(--color-navy-dark);">
            ${currencyFormatter.format(item.amount)}
          </td>
          <td class="th-actions text-center">
            <button
              type="button"
              class="btn-delete-action"
              data-id="${escapeHtml(item.id)}"
              data-title="${escapeHtml(item.title)}"
              data-category="${escapeHtml(item.category)}"
              data-amount="${escapeHtml(item.amount)}"
              data-date="${escapeHtml(item.expense_date)}"
              title="Delete expense #${escapeHtml(item.id)}"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Delete</span>
            </button>
          </td>
        </tr>
      `;
    });

    elements.expensesTableBody.innerHTML = rowsHtml;

    // Attach delete listeners
    elements.expensesTableBody.querySelectorAll('.btn-delete-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const expenseData = {
          id: btn.getAttribute('data-id'),
          title: btn.getAttribute('data-title'),
          category: btn.getAttribute('data-category'),
          amount: btn.getAttribute('data-amount'),
          expense_date: btn.getAttribute('data-date'),
        };
        openDeleteModal(expenseData);
      });
    });
  }

  function setupTableFilters() {
    // Search input with debounce
    let debounceTimer;
    elements.filterSearch.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.filters.search = e.target.value;
        renderExpensesTable();
      }, 150);
    });

    // Category select
    elements.filterCategory.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      renderExpensesTable();
    });

    // Sort select
    elements.filterSort.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      renderExpensesTable();
    });

    // Reset filters buttons
    const resetFn = () => {
      elements.filterSearch.value = '';
      elements.filterCategory.value = 'ALL';
      elements.filterSort.value = 'date-desc';
      state.filters.search = '';
      state.filters.category = 'ALL';
      state.filters.sort = 'date-desc';
      renderExpensesTable();
    };

    elements.btnResetFilters.addEventListener('click', resetFn);
    elements.btnEmptyReset.addEventListener('click', resetFn);
  }

  /* ==========================================================================
     Add Expense Form
     ========================================================================== */

  function setupAddExpenseForm() {
    // Default date to today's date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    elements.expenseDate.value = today;

    // Title character counter
    elements.expenseTitle.addEventListener('input', (e) => {
      const len = e.target.value.length;
      elements.titleCharCount.textContent = `${len}/120`;
      if (len > 120) {
        elements.titleCharCount.style.color = 'var(--color-danger)';
      } else {
        elements.titleCharCount.style.color = 'var(--color-text-muted)';
      }
    });

    // Category custom toggle
    elements.expenseCategorySelect.addEventListener('change', (e) => {
      if (e.target.value === '__CUSTOM__') {
        elements.expenseCategoryCustom.classList.remove('d-none');
        elements.expenseCategoryCustom.focus();
      } else {
        elements.expenseCategoryCustom.classList.add('d-none');
        elements.expenseCategoryCustom.value = '';
      }
    });

    // Form clear button
    elements.btnCancelForm.addEventListener('click', () => {
      resetAddExpenseForm();
    });

    // Form submission
    elements.addExpenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors();

      // Retrieve and validate values
      const title = elements.expenseTitle.value.trim();
      let category = elements.expenseCategorySelect.value;
      if (category === '__CUSTOM__') {
        category = elements.expenseCategoryCustom.value.trim();
      }
      category = category.trim();

      const rawAmount = elements.expenseAmount.value;
      const expense_date = elements.expenseDate.value;

      let hasErrors = false;

      // Validation 1: Title
      if (!title) {
        setFieldError(elements.expenseTitle, elements.titleError, 'Title is required');
        hasErrors = true;
      } else if (title.length > 120) {
        setFieldError(elements.expenseTitle, elements.titleError, 'Title cannot exceed 120 characters');
        hasErrors = true;
      }

      // Validation 2: Category
      if (!category) {
        const targetEl = elements.expenseCategorySelect.value === '__CUSTOM__'
          ? elements.expenseCategoryCustom
          : elements.expenseCategorySelect;
        setFieldError(targetEl, elements.categoryError, 'Category is required');
        hasErrors = true;
      } else if (category.length > 50) {
        setFieldError(elements.expenseCategoryCustom, elements.categoryError, 'Category cannot exceed 50 characters');
        hasErrors = true;
      }

      // Validation 3: Amount
      const numAmount = parseFloat(rawAmount);
      if (!rawAmount || isNaN(numAmount) || numAmount <= 0) {
        setFieldError(elements.expenseAmount, elements.amountError, 'Amount must be a positive number greater than 0');
        hasErrors = true;
      } else if (numAmount > 9999999999.99) {
        setFieldError(elements.expenseAmount, elements.amountError, 'Amount exceeds maximum allowable limit');
        hasErrors = true;
      } else {
        const parts = String(rawAmount).split('.');
        if (parts.length === 2 && parts[1].length > 2) {
          setFieldError(elements.expenseAmount, elements.amountError, 'Amount cannot have more than 2 decimal places');
          hasErrors = true;
        }
      }

      // Validation 4: Date
      const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      if (!expense_date || !dateRegex.test(expense_date)) {
        setFieldError(elements.expenseDate, elements.dateError, 'Date must be a valid calendar date in YYYY-MM-DD format');
        hasErrors = true;
      }

      if (hasErrors) return;

      // Form payload
      const payload = {
        title,
        category,
        amount: numAmount.toFixed(2),
        expense_date,
      };

      // Submit to POST /expenses
      setSubmitButtonLoading(true);

      try {
        const res = await fetch('/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error || (data.details ? data.details.map((d) => d.message).join(', ') : 'Failed to save expense');
          throw new Error(errMsg);
        }

        // Success
        showToast(`Expense "${title}" ($${payload.amount}) registered successfully!`, 'success');
        resetAddExpenseForm();

        // Refresh data and switch to dashboard
        await loadExpenses(false);
        switchSection('dashboard-section');
        window.location.hash = '#dashboard';
      } catch (err) {
        console.error('Error saving expense:', err);
        showFormAlert(err.message, 'error');
        showToast(err.message, 'error');
      } finally {
        setSubmitButtonLoading(false);
      }
    });
  }

  function setFieldError(inputEl, errorEl, message) {
    inputEl.classList.add('is-invalid');
    errorEl.textContent = message;
  }

  function clearFormErrors() {
    [
      elements.expenseTitle,
      elements.expenseCategorySelect,
      elements.expenseCategoryCustom,
      elements.expenseAmount,
      elements.expenseDate,
    ].forEach((el) => el.classList.remove('is-invalid'));

    elements.titleError.textContent = '';
    elements.categoryError.textContent = '';
    elements.amountError.textContent = '';
    elements.dateError.textContent = '';
    elements.formAlert.className = 'alert d-none';
    elements.formAlert.textContent = '';
  }

  function showFormAlert(message, type = 'error') {
    elements.formAlert.className = `alert alert-${type}`;
    elements.formAlert.textContent = message;
    elements.formAlert.classList.remove('d-none');
  }

  function resetAddExpenseForm() {
    elements.addExpenseForm.reset();
    elements.expenseCategoryCustom.classList.add('d-none');
    elements.expenseCategoryCustom.value = '';
    const today = new Date().toISOString().split('T')[0];
    elements.expenseDate.value = today;
    elements.titleCharCount.textContent = '0/120';
    clearFormErrors();
  }

  function setSubmitButtonLoading(isLoading) {
    if (isLoading) {
      elements.btnSubmitExpense.disabled = true;
      elements.btnSubmitText.textContent = 'Saving to PostgreSQL...';
    } else {
      elements.btnSubmitExpense.disabled = false;
      elements.btnSubmitText.textContent = 'Save Expense to Database';
    }
  }

  /* ==========================================================================
     Delete Expense Modal
     ========================================================================== */

  function setupDeleteModal() {
    elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
    elements.deleteModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.deleteModalBackdrop) {
        closeDeleteModal();
      }
    });

    elements.btnConfirmDelete.addEventListener('click', async () => {
      if (!state.pendingDeleteExpense) return;
      const { id, title, amount } = state.pendingDeleteExpense;

      elements.btnConfirmDelete.disabled = true;
      elements.btnDeleteText.textContent = 'Deleting...';

      try {
        const res = await fetch(`/expenses/${id}`, {
          method: 'DELETE',
        });

        if (res.status === 204) {
          showToast(`Expense #${id} ("${title}") deleted successfully`, 'success');
          closeDeleteModal();
          await loadExpenses(false);
        } else if (res.status === 404) {
          throw new Error(`Expense #${id} not found in database (may have been already deleted)`);
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status} deletion failure`);
        }
      } catch (err) {
        console.error('Delete error:', err);
        showToast(err.message, 'error');
      } finally {
        elements.btnConfirmDelete.disabled = false;
        elements.btnDeleteText.textContent = 'Delete Expense';
      }
    });
  }

  function openDeleteModal(expense) {
    state.pendingDeleteExpense = expense;
    elements.deleteModalId.textContent = `#${expense.id}`;
    elements.deleteModalTitle.textContent = expense.title;
    elements.deleteModalCategory.textContent = expense.category;
    elements.deleteModalAmount.textContent = currencyFormatter.format(expense.amount);
    elements.deleteModalDate.textContent = expense.expense_date;

    elements.deleteModalBackdrop.classList.remove('d-none');
  }

  function closeDeleteModal() {
    state.pendingDeleteExpense = null;
    elements.deleteModalBackdrop.classList.add('d-none');
  }

  /* ==========================================================================
     Helper Utilities
     ========================================================================== */

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ==========================================================================
     Initialization
     ========================================================================== */

  async function init() {
    setupNavigation();
    setupTableFilters();
    setupAddExpenseForm();
    setupDeleteModal();

    // Refresh button
    elements.btnRefresh.addEventListener('click', async () => {
      elements.btnRefresh.disabled = true;
      showToast('Refreshing data from PostgreSQL...', 'info');
      await Promise.all([checkHealth(), loadExpenses(true)]);
      elements.btnRefresh.disabled = false;
    });

    // Periodic health check every 20 seconds
    setInterval(checkHealth, 20000);

    // Initial load
    await Promise.all([checkHealth(), loadExpenses(true)]);
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

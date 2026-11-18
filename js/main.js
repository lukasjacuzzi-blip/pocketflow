import { FinanceStorage, CATEGORIES } from './storage.js';
import { renderExpenseDonut } from './chart.js';
import { SubscriptionManager } from './subscriptions.js';

const THEME_KEY = 'pocketflow_theme';
const PRIVACY_KEY = 'pocketflow_privacy';

class PocketFlowApp {
  constructor() {
    this.storage = new FinanceStorage();
    this.subs = new SubscriptionManager(this.storage);

    this.activeTab = 'dashboard';
    this.txFilter = 'all';
    this.txSearch = '';
    this.formTxType = 'expense';
    this.selectedCategory = 'food';
    this.privacyMode = localStorage.getItem(PRIVACY_KEY) === 'true';

    this.cacheDOM();
    this.initTheme();
    this.updatePrivacyUI();
    this.renderCategoryGrid();
    this.bindEvents();
    this.renderAll();
  }

  cacheDOM() {
    // Header & Navigation
    this.privacyToggleBtn = document.getElementById('privacyToggleBtn');
    this.eyeOpenIcon = document.getElementById('eyeOpenIcon');
    this.eyeClosedIcon = document.getElementById('eyeClosedIcon');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.backupModalBtn = document.getElementById('backupModalBtn');
    this.navPills = document.querySelectorAll('.nav-pill');
    this.tabViews = document.querySelectorAll('.tab-view');

    // Dashboard
    this.currentMonthLabel = document.getElementById('currentMonthLabel');
    this.totalBalanceEl = document.getElementById('totalBalance');
    this.monthIncomeEl = document.getElementById('monthIncome');
    this.monthExpenseEl = document.getElementById('monthExpense');
    this.budgetUsedText = document.getElementById('budgetUsedText');
    this.budgetLimitText = document.getElementById('budgetLimitText');
    this.budgetProgressBar = document.getElementById('budgetProgressBar');
    this.editBudgetBtn = document.getElementById('editBudgetBtn');
    this.budgetEditRow = document.getElementById('budgetEditRow');
    this.budgetLimitInput = document.getElementById('budgetLimitInput');
    this.saveBudgetBtn = document.getElementById('saveBudgetBtn');
    this.subFixCostBadge = document.getElementById('subFixCostBadge');
    this.expenseChart = document.getElementById('expenseChart');
    this.donutTotalText = document.getElementById('donutTotalText');
    this.chartLegend = document.getElementById('chartLegend');
    this.recentTxList = document.getElementById('recentTxList');

    // Transactions Tab
    this.txSearchInput = document.getElementById('txSearchInput');
    this.filterChips = document.querySelectorAll('.chip-btn');
    this.fullTxList = document.getElementById('fullTxList');

    // Subscriptions Tab
    this.monthlySubTotal = document.getElementById('monthlySubTotal');
    this.openSubModalBtn = document.getElementById('openSubModalBtn');
    this.subList = document.getElementById('subList');

    // Goals Tab
    this.totalSavedGoals = document.getElementById('totalSavedGoals');
    this.openGoalModalBtn = document.getElementById('openGoalModalBtn');
    this.goalsList = document.getElementById('goalsList');

    // Modals & Forms
    this.fabAddTxBtn = document.getElementById('fabAddTxBtn');
    this.txForm = document.getElementById('txForm');
    this.typeBtns = document.querySelectorAll('.type-btn');
    this.txAmount = document.getElementById('txAmount');
    this.categoryGrid = document.getElementById('categoryGrid');
    this.txNote = document.getElementById('txNote');
    this.txDate = document.getElementById('txDate');

    this.subForm = document.getElementById('subForm');
    this.goalForm = document.getElementById('goalForm');

    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');
    this.importJsonInput = document.getElementById('importJsonInput');
    this.resetDemoBtn = document.getElementById('resetDemoBtn');
  }

  /* ==================== THEME, PRIVACY & FORMAT ==================== */

  initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }

  togglePrivacy() {
    this.privacyMode = !this.privacyMode;
    localStorage.setItem(PRIVACY_KEY, String(this.privacyMode));
    this.updatePrivacyUI();
    this.renderAll();
  }

  updatePrivacyUI() {
    this.eyeOpenIcon.classList.toggle('hidden', this.privacyMode);
    this.eyeClosedIcon.classList.toggle('hidden', !this.privacyMode);
  }

  formatMoney(amount, short = false) {
    if (this.privacyMode) return '•••• €';
    const num = Number(amount) || 0;
    if (short) {
      return num.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
    }
    return num.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €';
  }

  formatDateDE(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}.${m}.${y}`;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ==================== NAVIGATION & MODALS ==================== */

  switchTab(tabName) {
    this.activeTab = tabName;
    this.navPills.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    this.tabViews.forEach((view) => {
      view.classList.toggle('active', view.id === 'tab-' + tabName);
    });
    if (tabName === 'dashboard') {
      this.renderDashboard();
    }
  }

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
  }

  /* ==================== RENDERING ==================== */

  renderAll() {
    this.renderDashboard();
    this.renderTransactionsList();
    this.renderSubscriptions();
    this.renderGoals();
  }

  renderDashboard() {
    const txs = this.storage.state.transactions;
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);

    this.currentMonthLabel.textContent = now.toLocaleDateString('de-DE', {
      month: 'short',
      year: 'numeric'
    });

    let totalBalance = 0;
    let monthIncome = 0;
    let monthExpense = 0;
    const catMap = {};

    txs.forEach((tx) => {
      if (tx.type === 'income') {
        totalBalance += tx.amount;
        if (tx.date.startsWith(currentMonthPrefix)) {
          monthIncome += tx.amount;
        }
      } else {
        totalBalance -= tx.amount;
        if (tx.date.startsWith(currentMonthPrefix)) {
          monthExpense += tx.amount;
          catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
        }
      }
    });

    this.totalBalanceEl.textContent = this.formatMoney(totalBalance);
    this.monthIncomeEl.textContent = '+' + this.formatMoney(monthIncome);
    this.monthExpenseEl.textContent = '−' + this.formatMoney(monthExpense);

    // Monatsbudget-Fortschritt
    const limit = this.storage.state.budgetLimit;
    const pct = Math.min(100, (monthExpense / limit) * 100);
    this.budgetUsedText.textContent = `${this.formatMoney(monthExpense)} ausgegeben`;
    this.budgetLimitText.textContent = `von ${this.formatMoney(limit)}`;
    this.budgetProgressBar.style.width = pct.toFixed(1) + '%';
    this.budgetProgressBar.classList.remove('warn', 'danger');
    if (pct >= 95) {
      this.budgetProgressBar.classList.add('danger');
    } else if (pct >= 75) {
      this.budgetProgressBar.classList.add('warn');
    }

    // Fixkosten-Badge & Donut-Chart
    const monthlySubs = this.subs.getMonthlyTotal();
    this.subFixCostBadge.textContent = `Fixkosten: ${this.formatMoney(monthlySubs)}/Mon.`;
    this.donutTotalText.textContent = this.formatMoney(monthExpense, true);

    const chartData = Object.entries(catMap)
      .map(([catId, total]) => {
        const meta = this.storage.getCategoryMeta('expense', catId);
        return { ...meta, total };
      })
      .sort((a, b) => b.total - a.total);

    renderExpenseDonut(this.expenseChart, this.chartLegend, chartData, (v) =>
      this.formatMoney(v)
    );

    // Letzte 3 Buchungen
    this.renderTxItems(this.recentTxList, txs.slice(0, 3), false);
  }
renderTransactionsList() {
    const query = this.txSearch.toLowerCase();
    const filtered = this.storage.state.transactions.filter((tx) => {
      if (this.txFilter !== 'all' && tx.type !== this.txFilter) return false;
      if (!query) return true;
      const meta = this.storage.getCategoryMeta(tx.type, tx.category);
      return (
        (tx.note && tx.note.toLowerCase().includes(query)) ||
        meta.label.toLowerCase().includes(query)
      );
    });

    this.renderTxItems(this.fullTxList, filtered, true);
  }

  renderTxItems(container, list, allowDelete) {
    if (list.length === 0) {
      container.innerHTML = '<p class="empty-state">Keine Buchungen vorhanden.</p>';
      return;
    }

    container.innerHTML = list
      .map((tx) => {
        const meta = this.storage.getCategoryMeta(tx.type, tx.category);
        const title = tx.note ? this.escapeHtml(tx.note) : meta.label;
        const sign = tx.type === 'income' ? '+' : '−';
        const delBtn = allowDelete
          ? `<button class="del-btn" data-del-tx="${tx.id}" title="Löschen">✕</button>`
          : '';

        return `
          <div class="tx-item">
            <div class="tx-left">
              <div class="tx-icon">${meta.icon}</div>
              <div class="tx-info">
                <span class="tx-title">${title}</span>
                <span class="tx-meta">${meta.label} · ${this.formatDateDE(tx.date)}</span>
              </div>
            </div>
            <div class="tx-right">
              <span class="tx-amount ${tx.type} money-val">${sign}${this.formatMoney(tx.amount)}</span>
              ${delBtn}
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderSubscriptions() {
    const items = this.subs.getAll();
    this.monthlySubTotal.textContent = this.formatMoney(this.subs.getMonthlyTotal());

    if (items.length === 0) {
      this.subList.innerHTML = '<div class="glass-card empty-state">Noch keine Abos hinterlegt.</div>';
      return;
    }

    this.subList.innerHTML = items
      .map((sub) => {
        const days = this.subs.getDaysUntil(sub.nextDate);
        let dueText = `Fällig in ${days} Tagen`;
        if (days < 0) dueText = `Überfällig (${Math.abs(days)} T.)`;
        else if (days === 0) dueText = 'Heute fällig';
        else if (days === 1) dueText = 'Morgen fällig';

        const cycleLabel = sub.cycle === 'yearly' ? 'jährlich' : 'monatlich';
        const urgentClass = days <= 3 ? 'urgent' : '';

        return `
          <div class="sub-card glass-card">
            <div class="sub-top">
              <div>
                <strong>${this.escapeHtml(sub.name)}</strong>
                <div class="tx-meta">${cycleLabel} · Nächste: ${this.formatDateDE(sub.nextDate)}</div>
              </div>
              <div style="text-align:right;">
                <div class="tx-amount expense money-val">${this.formatMoney(sub.amount)}</div>
                <span class="due-badge ${urgentClass}">${dueText}</span>
              </div>
            </div>
            <div class="sub-actions">
              <button class="secondary-btn small" data-book-sub="${sub.id}">✓ Jetzt abbuchen</button>
              <button class="del-btn" data-del-sub="${sub.id}" title="Abo entfernen">Löschen</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderGoals() {
    const goals = this.storage.state.goals;
    const totalSaved = goals.reduce((sum, g) => sum + g.current, 0);
    this.totalSavedGoals.textContent = this.formatMoney(totalSaved);

    if (goals.length === 0) {
      this.goalsList.innerHTML = '<div class="glass-card empty-state">Noch keine Sparziele angelegt.</div>';
      return;
    }

    this.goalsList.innerHTML = goals
      .map((g) => {
        const pct = Math.min(100, Math.round((g.current / g.target) * 100));
        return `
          <div class="goal-card glass-card">
            <div class="goal-top">
              <div>
                <strong>${this.escapeHtml(g.title)}</strong>
                <div class="tx-meta money-val">${this.formatMoney(g.current)} von ${this.formatMoney(g.target)}</div>
              </div>
              <span class="badge-pill">${pct}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%;"></div>
            </div>
            <div class="goal-actions">
              <button class="secondary-btn small" data-add-goal="${g.id}" data-step="25">+25 €</button>
              <button class="secondary-btn small" data-add-goal="${g.id}" data-step="100">+100 €</button>
              <button class="del-btn" data-del-goal="${g.id}" style="margin-left:auto;">Löschen</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderCategoryGrid() {
    const list = CATEGORIES[this.formTxType] || CATEGORIES.expense;
    if (!list.some((c) => c.id === this.selectedCategory)) {
      this.selectedCategory = list[0].id;
    }

    this.categoryGrid.innerHTML = list
      .map(
        (cat) => `
        <button type="button" class="cat-tile ${cat.id === this.selectedCategory ? 'active' : ''}" data-cat-id="${cat.id}">
          <span>${cat.icon}</span>
          <span>${cat.label}</span>
        </button>
      `
      )
      .join('');
  }

  /* ==================== EVENT BINDINGS ==================== */

  bindEvents() {
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    this.privacyToggleBtn.addEventListener('click', () => this.togglePrivacy());
    this.backupModalBtn.addEventListener('click', () => this.openModal('backupModal'));

    this.navPills.forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    document.querySelectorAll('[data-jump-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.jumpTab));
    });

    // Budget Limit bearbeiten
    this.editBudgetBtn.addEventListener('click', () => {
      this.budgetLimitInput.value = this.storage.state.budgetLimit;
      this.budgetEditRow.classList.toggle('hidden');
    });

    this.saveBudgetBtn.addEventListener('click', () => {
      this.storage.setBudgetLimit(this.budgetLimitInput.value);
      this.budgetEditRow.classList.add('hidden');
      this.renderDashboard();
    });

    // Modals öffnen & schließen
    this.fabAddTxBtn.addEventListener('click', () => {
      this.txDate.value = new Date().toISOString().slice(0, 10);
      this.openModal('txModal');
      setTimeout(() => this.txAmount.focus(), 80);
    });

    this.openSubModalBtn.addEventListener('click', () => {
      document.getElementById('subNextDate').value = new Date().toISOString().slice(0, 10);
      this.openModal('subModal');
    });

    this.openGoalModalBtn.addEventListener('click', () => this.openModal('goalModal'));

    document.querySelectorAll('.close-modal').forEach((btn) => {
      btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });

    // Buchungs-Formular
    this.typeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.formTxType = btn.dataset.txType;
        this.typeBtns.forEach((b) => b.classList.toggle('active', b === btn));
        this.renderCategoryGrid();
      });
    });

    this.categoryGrid.addEventListener('click', (e) => {
      const tile = e.target.closest('.cat-tile');
      if (!tile) return;
      this.selectedCategory = tile.dataset.catId;
      this.renderCategoryGrid();
    });

    this.txForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(this.txAmount.value);
      if (!amount || amount <= 0) return;

      this.storage.addTransaction({
        type: this.formTxType,
        amount,
        category: this.selectedCategory,
        note: this.txNote.value,
        date: this.txDate.value
      });

      this.txForm.reset();
      this.closeModal('txModal');
      this.renderAll();
    });

    // Suche & Filter
    this.txSearchInput.addEventListener('input', () => {
      this.txSearch = this.txSearchInput.value;
      this.renderTransactionsList();
    });

    this.filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.filterChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.txFilter = chip.dataset.filter;
        this.renderTransactionsList();
      });
    });

    this.fullTxList.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del-tx]');
      if (!del) return;
      this.storage.deleteTransaction(del.dataset.delTx);
      this.renderAll();
    });

    // Abo-Formular & Aktionen
    this.subForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.subs.add({
        name: document.getElementById('subName').value,
        amount: document.getElementById('subAmount').value,
        cycle: document.getElementById('subCycle').value,
        nextDate: document.getElementById('subNextDate').value
      });
      this.subForm.reset();
      this.closeModal('subModal');
      this.renderAll();
    });

    this.subList.addEventListener('click', (e) => {
      const bookBtn = e.target.closest('[data-book-sub]');
      if (bookBtn) {
        this.subs.bookNow(bookBtn.dataset.bookSub);
        this.renderAll();
        return;
      }
      const delBtn = e.target.closest('[data-del-sub]');
      if (delBtn) {
        this.subs.delete(delBtn.dataset.delSub);
        this.renderAll();
      }
    });

    // Sparziele-Formular & Aktionen
this.goalForm.addEventListener('submit', (e) => {
e.preventDefault();
this.storage.addGoal({
title: document.getElementById('goalTitle').value,
target: document.getElementById('goalTarget').value,
current: document.getElementById('goalCurrent').value
});
this.goalForm.reset();
this.closeModal('goalModal');
this.renderGoals();
});
this.goalsList.addEventListener('click', (e) => {
const addBtn = e.target.closest('[data-add-goal]');
if (addBtn) {
this.storage.depositToGoal(addBtn.dataset.addGoal, Number(addBtn.dataset.step));
this.renderGoals();
return;
}
const delBtn = e.target.closest('[data-del-goal]');
if (delBtn) {
this.storage.deleteGoal(delBtn.dataset.delGoal);
this.renderGoals();
}
});
// Backup & Export
this.exportJsonBtn.addEventListener('click', () => this.storage.exportJSON());
this.exportCsvBtn.addEventListener('click', () => this.storage.exportCSV());
this.importJsonInput.addEventListener('change', async (e) => {
const file = e.target.files[0];
if (!file) return;
try {
await this.storage.importJSONFile(file);
this.closeModal('backupModal');
this.renderAll();
} catch (err) {
alert(err.message);
}
});
this.resetDemoBtn.addEventListener('click', () => {
if (confirm('Wirklich alle Buchungen, Abos und Ziele zurücksetzen?')) {
this.storage.resetAll();
this.closeModal('backupModal');
this.renderAll();
}
});
}
}
document.addEventListener('DOMContentLoaded', () => {
new PocketFlowApp();
});
if ('serviceWorker' in navigator) {
window.addEventListener('load', () => {
navigator.serviceWorker.register('./sw.js').catch(() => {});
});
}
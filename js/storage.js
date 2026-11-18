/**
 * Zentrales Daten- & Speicher-Management für PocketFlow (localStorage + Backup/Export)
 */

const STORAGE_KEY = 'pocketflow_data_v1';

export const CATEGORIES = {
  expense: [
    { id: 'food', label: 'Essen', icon: '🍔', color: '#06b6d4' },
    { id: 'housing', label: 'Wohnen', icon: '🏠', color: '#6366f1' },
    { id: 'transport', label: 'Transport', icon: '🚆', color: '#f59e0b' },
    { id: 'leisure', label: 'Freizeit', icon: '🎬', color: '#ec4899' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
    { id: 'subs', label: 'Abos', icon: '🔄', color: '#14b8a6' },
    { id: 'health', label: 'Gesundheit', icon: '💊', color: '#f43f5e' },
    { id: 'other', label: 'Sonstiges', icon: '📦', color: '#64748b' }
  ],
  income: [
    { id: 'salary', label: 'Gehalt', icon: '💼', color: '#10b981' },
    { id: 'bonus', label: 'Bonus', icon: '🎁', color: '#06b6d4' },
    { id: 'freelance', label: 'Nebenjob', icon: '💻', color: '#6366f1' },
    { id: 'gift', label: 'Geschenk', icon: '🎉', color: '#f59e0b' }
  ]
};

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getFutureISO(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function createInitialState() {
  const today = getTodayISO();
  return {
    budgetLimit: 1500,
    transactions: [
      {
        id: 'tx_init_1',
        type: 'income',
        amount: 2450.0,
        category: 'salary',
        note: 'Monatsgehalt',
        date: today
      },
      {
        id: 'tx_init_2',
        type: 'expense',
        amount: 42.8,
        category: 'food',
        note: 'Wocheneinkauf Supermarkt',
        date: today
      },
      {
        id: 'tx_init_3',
        type: 'expense',
        amount: 14.99,
        category: 'subs',
        note: 'Streaming-Abo',
        date: today
      }
    ],
    subscriptions: [
      {
        id: 'sub_init_1',
        name: 'Spotify Duo',
        amount: 14.99,
        cycle: 'monthly',
        nextDate: getFutureISO(4)
      },
      {
        id: 'sub_init_2',
        name: 'Fitnessstudio',
        amount: 29.9,
        cycle: 'monthly',
        nextDate: getFutureISO(12)
      }
    ],
    goals: [
      {
        id: 'goal_init_1',
        title: 'Sommerurlaub',
        target: 1200,
        current: 450
      }
    ]
  };
}

export class FinanceStorage {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createInitialState();
        this.saveState(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      return {
        budgetLimit: Number(parsed.budgetLimit) || 1500,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        goals: Array.isArray(parsed.goals) ? parsed.goals : []
      };
    } catch {
      return createInitialState();
    }
  }

  saveState(nextState = this.state) {
    this.state = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Speicher voll oder blockiert
    }
  }

  getCategoryMeta(type, categoryId) {
    const list = CATEGORIES[type] || CATEGORIES.expense;
    return (
      list.find((c) => c.id === categoryId) || {
        id: categoryId,
        label: 'Sonstiges',
        icon: '💶',
        color: '#64748b'
      }
    );
  }

  setBudgetLimit(limit) {
    const val = Number(limit);
    if (val > 0) {
      this.state.budgetLimit = val;
      this.saveState();
    }
  }

  addTransaction({ type, amount, category, note, date }) {
    const entry = {
      id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      type,
      amount: Math.abs(Number(amount)),
      category,
      note: note.trim(),
      date: date || getTodayISO()
    };
    this.state.transactions.unshift(entry);
    this.state.transactions.sort((a, b) => b.date.localeCompare(a.date));
    this.saveState();
    return entry;
  }

  deleteTransaction(id) {
    this.state.transactions = this.state.transactions.filter((t) => t.id !== id);
    this.saveState();
  }

  addGoal({ title, target, current }) {
    const goal = {
      id: 'goal_' + Date.now().toString(36),
      title: title.trim(),
      target: Math.max(1, Number(target)),
      current: Math.max(0, Number(current) || 0)
    };
    this.state.goals.push(goal);
    this.saveState();
  }

  depositToGoal(id, addAmount) {
    const goal = this.state.goals.find((g) => g.id === id);
    if (!goal) return;
    goal.current = Math.max(0, goal.current + Number(addAmount));
    this.saveState();
  }

  deleteGoal(id) {
    this.state.goals = this.state.goals.filter((g) => g.id !== id);
    this.saveState();
  }

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
    this.triggerDownload(blob, 'pocketflow-backup-' + getTodayISO() + '.json');
  }

  exportCSV() {
    const header = 'Datum;Typ;Kategorie;Notiz;Betrag\n';
    const rows = this.state.transactions
      .map((tx) => {
        const meta = this.getCategoryMeta(tx.type, tx.category);
        const typeLabel = tx.type === 'income' ? 'Einnahme' : 'Ausgabe';
        const signed = tx.type === 'income' ? tx.amount : -tx.amount;
        const cleanNote = (tx.note || '').replace(/;/g, ',');
        return [tx.date, typeLabel, meta.label, cleanNote, signed.toFixed(2).replace('.', ',')].join(';');
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, 'pocketflow-buchungen-' + getTodayISO() + '.csv');
  }

  async importJSONFile(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.transactions)) {
      throw new Error('Ungültige Backup-Datei');
    }
    this.saveState({
      budgetLimit: Number(parsed.budgetLimit) || 1500,
      transactions: parsed.transactions,
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : []
    });
  }

  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = createInitialState();
    this.saveState();
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

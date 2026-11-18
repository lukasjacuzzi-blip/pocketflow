/**
 * Verwaltung wiederkehrender Abos & Fixkosten inkl. Fälligkeits-Countdown
 */

export class SubscriptionManager {
  constructor(storage) {
    this.storage = storage;
  }

  getAll() {
    return [...this.storage.state.subscriptions].sort((a, b) =>
      a.nextDate.localeCompare(b.nextDate)
    );
  }

  getMonthlyTotal() {
    return this.storage.state.subscriptions.reduce((sum, sub) => {
      const monthly = sub.cycle === 'yearly' ? sub.amount / 12 : sub.amount;
      return sum + monthly;
    }, 0);
  }

  add({ name, amount, cycle, nextDate }) {
    const item = {
      id: 'sub_' + Date.now().toString(36),
      name: name.trim(),
      amount: Math.abs(Number(amount)),
      cycle: cycle === 'yearly' ? 'yearly' : 'monthly',
      nextDate
    };
    this.storage.state.subscriptions.push(item);
    this.storage.saveState();
  }

  delete(id) {
    this.storage.state.subscriptions = this.storage.state.subscriptions.filter((s) => s.id !== id);
    this.storage.saveState();
  }

  /**
   * Bucht ein Abo sofort als Ausgabe und schiebt das nächste Abbuchungsdatum weiter.
   */
  bookNow(id) {
    const sub = this.storage.state.subscriptions.find((s) => s.id === id);
    if (!sub) return null;

    const today = new Date().toISOString().slice(0, 10);
    this.storage.addTransaction({
      type: 'expense',
      amount: sub.amount,
      category: 'subs',
      note: 'Abo: ' + sub.name,
      date: today
    });

    const next = new Date(sub.nextDate + 'T12:00:00');
    if (sub.cycle === 'yearly') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    sub.nextDate = next.toISOString().slice(0, 10);
    this.storage.saveState();
    return sub;
  }

  getDaysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diffMs = target - today;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }
}

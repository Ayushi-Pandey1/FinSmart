import { useEffect, useState } from 'react';
import api from '../api/client';
import { Plus, X, Trash2, PiggyBank } from 'lucide-react';

const CATEGORIES = [
  'Housing','Food & Groceries','Transport','Entertainment','Dining Out',
  'Shopping','Health & Fitness','Utilities','Subscriptions','Education','Travel','Savings','Other'
];

const BAR_COLORS: Record<string, string> = {
  safe: '#10b981', warning: '#f59e0b', danger: '#ef4444'
};

export default function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: '', monthlyLimit: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([
        api.get(`/budgets?month=${selectedMonth}`),
        api.get(`/budgets/compliance?month=${selectedMonth}`),
      ]);
      setBudgets(b.data);
      setCompliance(c.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedMonth]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/budgets', { ...form, monthlyLimit: parseFloat(form.monthlyLimit), monthYear: selectedMonth });
      setShowAdd(false);
      setForm({ category: '', monthlyLimit: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save budget');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this budget?')) return;
    await api.delete(`/budgets/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>Budget Tracker</h1>
          <p>Set monthly limits and monitor your spending compliance</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input type="month" className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Budget</button>
        </div>
      </div>

      {/* Compliance banner */}
      {compliance?.rate != null && (
        <div style={{
          background: compliance.rate >= 80 ? '#d1fae5' : compliance.rate >= 50 ? '#fef3c7' : '#fee2e2',
          border: `1px solid ${compliance.rate >= 80 ? '#6ee7b7' : compliance.rate >= 50 ? '#fcd34d' : '#fca5a5'}`,
          borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: compliance.rate >= 80 ? '#065f46' : compliance.rate >= 50 ? '#92400e' : '#991b1b' }}>
              {compliance.rate}% budget compliance
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {compliance.compliant} of {compliance.total} categories within budget this month
            </div>
          </div>
          <div style={{ fontSize: '2rem' }}>
            {compliance.rate >= 80 ? '🏆' : compliance.rate >= 50 ? '⚠️' : '🚨'}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <PiggyBank size={48} />
            <h3>No budgets set</h3>
            <p>Set category budgets to track your spending compliance</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add your first budget</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {budgets.map(b => {
            const pct = Math.min(100, b.percentage);
            const color = pct >= 90 ? BAR_COLORS.danger : pct >= 70 ? BAR_COLORS.warning : BAR_COLORS.safe;
            return (
              <div key={b.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{b.category}</div>
                    {pct >= 90 && <span className="badge badge-danger">⚠ Over limit</span>}
                    {pct >= 70 && pct < 90 && <span className="badge badge-warning">Approaching limit</span>}
                    {pct < 70 && <span className="badge badge-success">On track</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right', fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color }}>£{parseFloat(b.spent).toFixed(2)}</span>
                      <span style={{ color: 'var(--text-muted)' }}> / £{parseFloat(b.monthly_limit).toFixed(2)}</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(b.id)}>
                      <Trash2 size={14} color="var(--danger)" />
                    </button>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{pct.toFixed(0)}% used</span>
                  <span>£{Math.max(0, b.remaining).toFixed(2)} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Set Budget</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required>
                  <option value="">Select category</option>
                  {CATEGORIES.filter(c => !budgets.find(b => b.category === c)).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly limit (£)</label>
                <input className="form-input" type="number" step="0.01" min="1" value={form.monthlyLimit} onChange={e => setForm(p => ({ ...p, monthlyLimit: e.target.value }))} placeholder="e.g. 300" required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

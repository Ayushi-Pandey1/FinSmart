import { useEffect, useState } from 'react';
import api from '../api/client';
import { Target, Plus, Trash2, Edit3, Check, X } from 'lucide-react';

interface Goal {
  id: number;
  goal_name: string;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  category: string;
}

const GOAL_CATEGORIES = ['Emergency Fund', 'Holiday', 'Rent Deposit', 'Laptop / Tech', 'Car', 'Tuition / Course', 'First Home', 'General'];
const GOAL_EMOJIS: Record<string, string> = {
  'Emergency Fund': '🛡️', 'Holiday': '✈️', 'Rent Deposit': '🏠',
  'Laptop / Tech': '💻', 'Car': '🚗', 'Tuition / Course': '🎓',
  'First Home': '🏡', 'General': '🎯',
};

export default function SavingsGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [form, setForm] = useState({ goalName: '', targetAmount: '', currentAmount: '', targetDate: '', category: 'General' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/savings');
      setGoals(r.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/savings', {
        goalName: form.goalName,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        targetDate: form.targetDate || undefined,
        category: form.category,
      });
      setShowAdd(false);
      setForm({ goalName: '', targetAmount: '', currentAmount: '', targetDate: '', category: 'General' });
      setSuccess('Goal created!');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch { setError('Failed to create goal'); }
  };

  const handleUpdateProgress = async (id: number) => {
    try {
      await api.put(`/savings/${id}`, { currentAmount: parseFloat(editAmount) });
      setEditingId(null);
      setSuccess('Progress updated!');
      setTimeout(() => setSuccess(''), 2000);
      load();
    } catch { setError('Failed to update'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/savings/${id}`);
      load();
    } catch {}
  };

  const daysLeft = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount), 0);
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount), 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, background: '#d1fae5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={22} color="#10b981" />
          </div>
          <div>
            <h1>Savings Goals</h1>
            <p>Track your progress towards financial targets — rent deposit, emergency fund, holiday, and more</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={15} /> New Goal
        </button>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Overall summary */}
      {goals.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', border: 'none' }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontWeight: 700, opacity: 0.8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Overall Progress</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>£{totalSaved.toFixed(0)}</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>of £{totalTarget.toFixed(0)} total target</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{overallPct.toFixed(0)}%</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>{goals.length} active goal{goals.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, height: 8 }}>
              <div style={{ width: `${Math.min(100, overallPct)}%`, height: 8, background: '#34d399', borderRadius: 6, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>
      )}

      {/* Add goal form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #10b981' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>New Savings Goal</h3>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Goal Name *</label>
                <input className="form-input" placeholder="e.g. Emergency Fund" value={form.goalName}
                  onChange={e => setForm(f => ({ ...f, goalName: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {GOAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Target Amount (£) *</label>
                <input className="form-input" type="number" placeholder="e.g. 1000" value={form.targetAmount}
                  onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} min="1" required />
              </div>
              <div>
                <label className="form-label">Amount Already Saved (£)</label>
                <input className="form-input" type="number" placeholder="0" value={form.currentAmount}
                  onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} min="0" />
              </div>
              <div>
                <label className="form-label">Target Date (optional)</label>
                <input className="form-input" type="date" value={form.targetDate}
                  onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit">Create Goal</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading goals...</span></div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Target size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No savings goals yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Set your first goal — whether it's a rent deposit, emergency fund, or holiday
          </p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Create First Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {goals.map(goal => {
            const target = parseFloat(goal.target_amount);
            const current = parseFloat(goal.current_amount);
            const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            const remaining = target - current;
            const days = daysLeft(goal.target_date);
            const isComplete = pct >= 100;
            const emoji = GOAL_EMOJIS[goal.category] || '🎯';
            const barColor = isComplete ? '#10b981' : pct >= 75 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#94a3b8';

            return (
              <div key={goal.id} className="card" style={{ border: isComplete ? '2px solid #6ee7b7' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ fontSize: 24 }}>{emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{goal.goal_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{goal.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(goal.id); setEditAmount(goal.current_amount); }} title="Update progress">
                      <Edit3 size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(goal.id)} title="Delete">
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>£{current.toFixed(0)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>of £{target.toFixed(0)}</span>
                  </div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div style={{ width: `${pct}%`, height: 10, background: barColor, borderRadius: 6, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 600, color: barColor }}>{pct.toFixed(0)}% complete</span>
                    {!isComplete && <span>£{remaining.toFixed(0)} to go</span>}
                    {isComplete && <span style={{ color: '#10b981', fontWeight: 700 }}>🎉 Goal reached!</span>}
                  </div>
                </div>

                {/* Target date */}
                {goal.target_date && (
                  <div style={{ fontSize: 12, color: days !== null && days < 30 ? '#ef4444' : 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    📅 Target: {new Date(goal.target_date).toLocaleDateString('en-GB')}
                    {days !== null && ` · ${days > 0 ? `${days} days left` : days === 0 ? 'Due today!' : 'Overdue'}`}
                  </div>
                )}

                {/* Monthly needed */}
                {!isComplete && days && days > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: 6, padding: '0.5rem 0.625rem', fontSize: 12 }}>
                    Save <strong>£{(remaining / (days / 30)).toFixed(0)}/month</strong> to hit this goal on time
                  </div>
                )}

                {/* Update progress inline */}
                {editingId === goal.id && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      type="number"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      min="0"
                      style={{ flex: 1 }}
                      placeholder="Current amount saved"
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateProgress(goal.id)}>
                      <Check size={14} />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

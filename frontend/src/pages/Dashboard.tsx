import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Receipt, PiggyBank, Star, Brain, Plus, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, GraduationCap } from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#94a3b8'];
const CAT_COLORS: Record<string, string> = {
  'Housing':'#6366f1','Food & Groceries':'#10b981','Transport':'#f59e0b','Entertainment':'#8b5cf6',
  'Dining Out':'#ef4444','Shopping':'#ec4899','Health & Fitness':'#06b6d4','Utilities':'#84cc16',
  'Subscriptions':'#f97316','Education':'#a78bfa','Travel':'#38bdf8','Savings':'#34d399','Other':'#94a3b8',
  'Salary':'#10b981','Freelance':'#6366f1','Benefits':'#f59e0b','Rental Income':'#8b5cf6','Investment':'#06b6d4',
};

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const todayMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(todayMonth);
  const [availableMonths, setAvailableMonths] = useState<string[]>([todayMonth]);
  const [expenseSummary, setExpenseSummary] = useState<any[]>([]);
  const [incomeSummary, setIncomeSummary] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [budgetCompliance, setBudgetCompliance] = useState<any>(null);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (month: string) => {
    setLoading(true);
    try {
      const [months, exp, inc, tr, bud, tx] = await Promise.all([
        api.get('/transactions/months'),
        api.get(`/transactions/summary?month=${month}`),
        api.get(`/transactions/income-summary?month=${month}`),
        api.get('/transactions/trend'),
        api.get(`/budgets/compliance?month=${month}`),
        api.get(`/transactions?month=${month}`),
      ]);
      const mList: string[] = months.data;
      if (!mList.includes(month)) mList.unshift(month);
      if (!mList.includes(todayMonth)) mList.unshift(todayMonth);
      setAvailableMonths([...new Set(mList)].sort().reverse());
      setExpenseSummary(exp.data);
      setIncomeSummary(inc.data);
      setTrend(tr.data);
      setBudgetCompliance(bud.data);
      setRecentTx(tx.data.slice(0, 6));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(selectedMonth); }, [selectedMonth]);

  const navigate = (dir: 'prev' | 'next') => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (dir === 'prev' && idx < availableMonths.length - 1) setSelectedMonth(availableMonths[idx + 1]);
    if (dir === 'next' && idx > 0) setSelectedMonth(availableMonths[idx - 1]);
  };

  const totalSpend = expenseSummary.reduce((s, c) => s + parseFloat(c.total), 0);
  const totalIncome = incomeSummary.reduce((s, c) => s + parseFloat(c.total), 0);
  const net = totalIncome - totalSpend;
  const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  const allMonths = [...new Set(trend.map((t: any) => t.month))].sort().slice(-6);
  const trendData = allMonths.map(m => {
    const expRow = trend.find((r: any) => r.month === m && r.transaction_type === 'expense');
    const incRow = trend.find((r: any) => r.month === m && r.transaction_type === 'income');
    return {
      month: m.slice(5),
      expenses: expRow ? Math.round(parseFloat(expRow.total)) : 0,
      income: incRow ? Math.round(parseFloat(incRow.total)) : 0,
    };
  });

  const isCurrentMonth = selectedMonth === todayMonth;
  const monthIdx = availableMonths.indexOf(selectedMonth);
  const canPrev = monthIdx < availableMonths.length - 1;
  const canNext = monthIdx > 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Welcome back, {user?.firstName} 👋</h1>
          <p>{isCurrentMonth ? "Here's your current financial overview" : `Viewing historical data`}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('prev')} disabled={!canPrev} title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <select
            className="form-input"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: 'auto', fontWeight: 600, color: isCurrentMonth ? 'var(--primary)' : 'var(--text)' }}
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{monthLabel(m)}{m === todayMonth ? ' (current)' : ''}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('next')} disabled={!canNext} title="Next month">
            <ChevronRight size={16} />
          </button>
          {!isCurrentMonth && (
            <button className="btn btn-primary btn-sm" onClick={() => setSelectedMonth(todayMonth)}>Today</button>
          )}
          <Link to="/spending" className="btn btn-primary btn-sm">
            <Plus size={15} /> Add
          </Link>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #c4b5fd', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <GraduationCap size={18} color="#7c3aed" />
        <div style={{ fontSize: 13, color: '#5b21b6' }}>
          <strong>FinSmart for Students & Young Adults</strong> — track spending, set savings goals, check credit cards, and build your financial profile. All features are tailored to student income patterns and UK providers.
        </div>
      </div>

      {!isCurrentMonth && (
        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          📅 Viewing <strong>{monthLabel(selectedMonth)}</strong> — historical snapshot
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label">Total Income</span>
                <div style={{ width: 36, height: 36, background: '#d1fae5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowUpCircle size={18} color="#10b981" />
                </div>
              </div>
              <div className="value" style={{ color: '#10b981' }}>£{totalIncome.toFixed(2)}</div>
              <div className="sub">{incomeSummary.length} income source{incomeSummary.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label">Total Expenses</span>
                <div style={{ width: 36, height: 36, background: '#fee2e2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowDownCircle size={18} color="#ef4444" />
                </div>
              </div>
              <div className="value" style={{ color: '#ef4444' }}>£{totalSpend.toFixed(2)}</div>
              <div className="sub">{expenseSummary.reduce((s, c) => s + parseInt(c.count), 0)} transactions</div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label">Net Balance</span>
                <div style={{ width: 36, height: 36, background: net >= 0 ? '#d1fae5' : '#fee2e2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PiggyBank size={18} color={net >= 0 ? '#10b981' : '#ef4444'} />
                </div>
              </div>
              <div className="value" style={{ color: net >= 0 ? '#10b981' : '#ef4444' }}>
                {net >= 0 ? '+' : '-'}£{Math.abs(net).toFixed(2)}
              </div>
              <div className="sub">{totalIncome > 0 ? `${savingsRate.toFixed(1)}% savings rate` : 'No income logged'}</div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label">Budget Compliance</span>
                <div style={{ width: 36, height: 36, background: '#fef3c7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={18} color="#f59e0b" />
                </div>
              </div>
              <div className="value" style={{ color: '#f59e0b' }}>
                {budgetCompliance?.rate != null ? `${budgetCompliance.rate}%` : '—'}
              </div>
              <div className="sub">{budgetCompliance?.rate != null ? `${budgetCompliance.compliant}/${budgetCompliance.total} categories` : 'No budgets set'}</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            {trendData.length > 0 && <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Income vs Expenses Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `£${v}`} />
                  <Tooltip formatter={(v: any) => `£${v}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}

            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Expense Breakdown</h3>
              {expenseSummary.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={36} />
                  <p>No expenses this month</p>
                  <Link to="/spending" className="btn btn-primary btn-sm"><Plus size={14}/> Add transaction</Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={expenseSummary.map(s => ({ name: s.category, value: parseFloat(s.total) }))}
                      cx="50%" cy="50%" outerRadius={85} dataKey="value"
                      label={({ name, percent }) => `${(name as string)?.split(' ')[0] ?? ''} ${((percent ?? 0)*100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {expenseSummary.map((s, i) => (
                        <Cell key={s.category} fill={CAT_COLORS[s.category] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `£${parseFloat(v).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Income Sources</h3>
              {incomeSummary.length === 0 ? (
                <div className="empty-state">
                  <TrendingUp size={32} />
                  <p>No income logged this month</p>
                  <Link to="/spending" className="btn btn-success btn-sm"><Plus size={14}/> Log income</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {incomeSummary.map((src, i) => (
                    <div key={src.source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: CAT_COLORS[src.source] || COLORS[i % COLORS.length] }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{src.source}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{src.count} transaction{src.count !== '1' ? 's' : ''}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#10b981' }}>+£{parseFloat(src.total).toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: '#10b981' }}>+£{totalIncome.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: 700 }}>Recent Transactions</h3>
                <Link to="/spending" style={{ color: 'var(--primary)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
              </div>
              {recentTx.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={32} />
                  <p>No transactions this month</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentTx.map(tx => (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{tx.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {tx.category} · {new Date(tx.transaction_date).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: tx.transaction_type === 'income' ? '#10b981' : '#ef4444' }}>
                        {tx.transaction_type === 'income' ? '+' : '-'}£{parseFloat(tx.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {[
                { to: '/spending', icon: Receipt, label: 'Add / Import Transactions', color: '#6366f1' },
                { to: '/budgets', icon: PiggyBank, label: 'Set Monthly Budgets', color: '#10b981' },
                { to: '/savings', icon: PiggyBank, label: 'Savings Goals', color: '#059669' },
                { to: '/creditcard', icon: Brain, label: 'Credit Card Checker', color: '#7c3aed' },
                { to: '/persona', icon: Brain, label: 'Generate AI Persona', color: '#8b5cf6' },
                { to: '/chat', icon: Star, label: 'Chat with FinSmart AI', color: '#f59e0b' },
              ].map(item => (
                <Link key={item.to} to={item.to}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', borderRadius: 10, border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', transition: 'all 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${item.color}20`, flexShrink: 0 }}>
                    <item.icon size={19} color={item.color} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useDropzone } from 'react-dropzone';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Upload, Trash2, X, FileText, ArrowUpCircle, ArrowDownCircle, Download } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Housing','Food & Groceries','Transport','Entertainment','Dining Out',
  'Shopping','Health & Fitness','Utilities','Subscriptions','Education','Travel','Savings','Other'
];
const INCOME_SOURCES = ['Salary','Freelance','Benefits','Rental Income','Investment','Gift','Other Income'];

const CAT_COLORS: Record<string, string> = {
  'Housing':'#6366f1','Food & Groceries':'#10b981','Transport':'#f59e0b','Entertainment':'#8b5cf6',
  'Dining Out':'#ef4444','Shopping':'#ec4899','Health & Fitness':'#06b6d4','Utilities':'#84cc16',
  'Subscriptions':'#f97316','Other':'#94a3b8',
  'Salary':'#10b981','Freelance':'#6366f1','Benefits':'#f59e0b',
};

export default function Spending() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any[]>([]);
  const [incomeSummary, setIncomeSummary] = useState<any[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [form, setForm] = useState({
    description: '', amount: '', category: '', incomeSource: '',
    transactionDate: new Date().toISOString().slice(0, 10), transactionType: 'expense'
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async (month: string) => {
    setLoading(true);
    try {
      const [months, tx, exp, inc] = await Promise.all([
        api.get('/transactions/months'),
        api.get('/transactions'),
        api.get(`/transactions/summary?month=${month}`),
        api.get(`/transactions/income-summary?month=${month}`),
      ]);
      const mList: string[] = months.data;
      if (!mList.includes(month)) mList.unshift(month);
      const sorted = [...new Set(mList)].sort().reverse() as string[];
      setAvailableMonths(sorted);
      setTransactions(tx.data);
      setExpenseSummary(exp.data);
      setIncomeSummary(inc.data);
      if (tx.data.length === 0 && sorted.length > 0 && sorted[0] !== month) {
        setSelectedMonth(sorted[0]);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(selectedMonth); }, [selectedMonth]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/transactions', {
        description: form.description,
        amount: parseFloat(form.amount),
        category: txType === 'expense' ? form.category : undefined,
        incomeSource: txType === 'income' ? form.incomeSource : undefined,
        transactionDate: form.transactionDate,
        transactionType: txType,
      });
      setShowAdd(false);
      setForm({ description: '', amount: '', category: '', incomeSource: '', transactionDate: new Date().toISOString().slice(0, 10), transactionType: 'expense' });
      setSuccess(`${txType === 'income' ? 'Income' : 'Transaction'} added!`);
      setTimeout(() => setSuccess(''), 3000);
      load(selectedMonth);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this?')) return;
    await api.delete(`/transactions/${id}`);
    load(selectedMonth);
  };

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setUploading(true);
    setUploadResult(null);
    const fd = new FormData();
    fd.append('file', files[0]);
    try {
      const res = await api.post('/transactions/upload-csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(res.data);
      load(selectedMonth);
    } catch (err: any) {
      setUploadResult({ error: err.response?.data?.error || 'Upload failed' });
    }
    setUploading(false);
  }, [selectedMonth]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false });

  const filtered = filterType === 'all' ? transactions
    : transactions.filter(tx => tx.transaction_type === filterType);

  const totalExpenses = expenseSummary.reduce((s, c) => s + parseFloat(c.total), 0);
  const totalIncome = incomeSummary.reduce((s, c) => s + parseFloat(c.total), 0);

  const handleExport = () => {
    const link = document.createElement('a');
    link.href = `http://localhost:3001/api/transactions/export?month=${selectedMonth}`;
    link.setAttribute('download', `finsmart-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Transactions</h1>
          <p>Track income and expenses</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: 'auto' }}>
            {availableMonths.length === 0 && <option value={selectedMonth}>{selectedMonth}</option>}
            {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-success" onClick={() => { setTxType('income'); setShowAdd(true); }}>
            <ArrowUpCircle size={15}/> Log Income
          </button>
          <button className="btn btn-primary" onClick={() => { setTxType('expense'); setShowAdd(true); }}>
            <Plus size={15}/> Add Expense
          </button>
        </div>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpCircle size={18} color="#10b981" />
            <span className="label">Total Income</span>
          </div>
          <div className="value" style={{ color: '#10b981' }}>+£{totalIncome.toFixed(2)}</div>
          <div className="sub">{incomeSummary.reduce((s, c) => s + parseInt(c.count), 0)} income entries</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowDownCircle size={18} color="#ef4444" />
            <span className="label">Total Expenses</span>
          </div>
          <div className="value" style={{ color: '#ef4444' }}>-£{totalExpenses.toFixed(2)}</div>
          <div className="sub">{expenseSummary.reduce((s, c) => s + parseInt(c.count), 0)} expense entries</div>
        </div>
      </div>

      {(expenseSummary.length > 0 || incomeSummary.length > 0) && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Expense Categories</h3>
            {expenseSummary.length === 0 ? <div className="empty-state"><p>No expenses</p></div> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={expenseSummary.map(s => ({ name: s.category.split(' ')[0], total: parseFloat(s.total) }))} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} />
                  <Tooltip formatter={(v: any) => `£${parseFloat(v).toFixed(2)}`} />
                  <Bar dataKey="total" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Income Sources</h3>
            {incomeSummary.length === 0 ? <div className="empty-state"><p>No income logged</p></div> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={incomeSummary.map(s => ({ name: s.source, total: parseFloat(s.total) }))} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} />
                  <Tooltip formatter={(v: any) => `£${parseFloat(v).toFixed(2)}`} />
                  <Bar dataKey="total" fill="#10b981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Import CSV</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: '0.75rem' }}>
          Format: <code>date (YYYY-MM-DD), description, amount, category, type (income/expense)</code>
        </p>
        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: isDragActive ? 'var(--primary-light)' : 'var(--bg)', transition: 'all 0.15s' }}>
          <input {...getInputProps()} />
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              <span>Importing...</span>
            </div>
          ) : (
            <>
              <Upload size={24} color="var(--text-muted)" style={{ marginBottom: 6 }} />
              <p style={{ fontWeight: 600, fontSize: 14 }}>{isDragActive ? 'Drop it!' : 'Drag & drop CSV or click to browse'}</p>
            </>
          )}
        </div>
        {uploadResult && (
          <div className={`alert ${uploadResult.error ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '0.75rem' }}>
            {uploadResult.error ? uploadResult.error : `✅ Imported ${uploadResult.inserted} rows${uploadResult.errors?.length ? ` (${uploadResult.errors.length} skipped)` : ''}`}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontWeight: 700 }}>All Transactions ({filtered.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'income', 'expense'] as const).map(t => (
              <button key={t} className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType(t)}>
                {t === 'all' ? 'All' : t === 'income' ? '↑ Income' : '↓ Expenses'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><FileText size={40} /><p>No transactions found</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(tx.transaction_date).toLocaleDateString('en-GB')}</td>
                    <td style={{ fontWeight: 500 }}>{tx.description}</td>
                    <td><span className="tag" style={{ background: `${CAT_COLORS[tx.category] || '#94a3b8'}20`, color: CAT_COLORS[tx.category] || '#94a3b8' }}>{tx.category}</span></td>
                    <td>
                      <span className={`badge ${tx.transaction_type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                        {tx.transaction_type === 'income' ? '↑ Income' : '↓ Expense'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: tx.transaction_type === 'income' ? '#10b981' : '#ef4444' }}>
                      {tx.transaction_type === 'income' ? '+' : '-'}£{parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(tx.id)}><Trash2 size={14} color="var(--danger)" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{txType === 'income' ? '↑ Log Income' : '↓ Add Expense'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button className={`btn btn-sm ${txType === 'expense' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTxType('expense')}>↓ Expense</button>
              <button className={`btn btn-sm ${txType === 'income' ? 'btn-success' : 'btn-secondary'}`} onClick={() => setTxType('income')}>↑ Income</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder={txType === 'income' ? 'e.g. Monthly salary' : 'e.g. Tesco supermarket'} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Amount (£)</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.transactionDate} onChange={e => setForm(p => ({...p, transactionDate: e.target.value}))} required />
                </div>
              </div>
              {txType === 'expense' ? (
                <div className="form-group">
                  <label className="form-label">Category <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(auto-detected if blank)</span></label>
                  <select className="form-input" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
                    <option value="">Auto-detect</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Income Source</label>
                  <select className="form-input" value={form.incomeSource} onChange={e => setForm(p => ({...p, incomeSource: e.target.value}))} required>
                    <option value="">Select source</option>
                    {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className={`btn ${txType === 'income' ? 'btn-success' : 'btn-primary'}`}>
                  {txType === 'income' ? 'Log Income' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
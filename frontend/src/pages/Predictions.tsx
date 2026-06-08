import { useEffect, useState } from 'react';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

export default function Predictions() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    api.get('/predictions').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Calculating predictions...</span></div>;

  const predictions = data?.predictions || [];

  return (
    <div>
      <div className="page-header">
        <h1>Expense Predictions</h1>
        <p>Weighted moving average forecast for {data?.nextMonth ? new Date(data.nextMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) : 'next month'}</p>
      </div>

      {predictions.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '4rem' }}>
            <BarChart3 size={48} />
            <h3>Not enough data yet</h3>
            <p>Add transactions across multiple months to see spending predictions</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>Predicted total spend next month</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>£{data?.totalPredicted?.toFixed(2)}</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Across {predictions.length} spending categories</div>
              </div>
              <div style={{ fontSize: '3rem' }}>📊</div>
            </div>
          </div>

          {/* Predictions overview chart */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Predicted vs Average by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={predictions.slice(0, 8).map((p: any) => ({ name: p.category.split(' ')[0], predicted: p.predictedAmount, average: p.averageAmount }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                <Tooltip formatter={(v: any) => `£${parseFloat(v).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="predicted" fill="#6366f1" name="Predicted" radius={[4, 4, 0, 0]} />
                <Bar dataKey="average" fill="#cbd5e1" name="Historical Avg" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category cards */}
          <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
            {predictions.map((p: any) => {
              const isSelected = selectedCategory === p.category;
              return (
                <div
                  key={p.category}
                  className="card"
                  style={{ cursor: 'pointer', border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, transition: 'all 0.15s' }}
                  onClick={() => setSelectedCategory(isSelected ? null : p.category)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.category}</span>
                    {p.trendDirection === 'up' && <TrendingUp size={18} color="#ef4444" />}
                    {p.trendDirection === 'down' && <TrendingDown size={18} color="#10b981" />}
                    {p.trendDirection === 'stable' && <Minus size={18} color="#94a3b8" />}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                    £{p.predictedAmount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Avg: £{p.averageAmount.toFixed(2)} ·
                    <span style={{ color: p.trendDirection === 'up' ? '#ef4444' : p.trendDirection === 'down' ? '#10b981' : '#94a3b8', marginLeft: 4 }}>
                      {p.trend > 0 ? '+' : ''}{p.trend}% trend
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail chart for selected category */}
          {selectedCategory && (() => {
            const pred = predictions.find((p: any) => p.category === selectedCategory);
            if (!pred) return null;
            return (
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{selectedCategory} — Historical Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={pred.historicalData.map((h: any) => ({ month: h.month.slice(5), amount: h.amount }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `£${v}`} />
                    <Tooltip formatter={(v: any) => `£${parseFloat(v).toFixed(2)}`} />
                    <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} name="Spent" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '0.75rem', padding: '0.875rem', background: 'var(--primary-light)', borderRadius: 8, fontSize: 14 }}>
                  <strong>Prediction for {data?.nextMonth}:</strong> £{pred.predictedAmount.toFixed(2)} (using weighted moving average)
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

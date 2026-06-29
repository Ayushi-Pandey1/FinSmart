import { useEffect, useState } from 'react';
import api from '../api/client';
import { CheckCircle, XCircle, Star, TrendingUp, CreditCard, Home, PiggyBank } from 'lucide-react';

const PRODUCT_ICONS: Record<string, any> = {
  ISA: PiggyBank, CREDIT_CARD: CreditCard, MORTGAGE: Home, LOAN: TrendingUp
};

const PRODUCT_COLORS: Record<string, string> = {
  ISA: '#6366f1', CREDIT_CARD: '#10b981', MORTGAGE: '#f59e0b', LOAN: '#8b5cf6'
};

export default function Eligibility() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    api.get('/eligibility').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Calculating eligibility...</span></div>;
  if (!data) return <div className="alert alert-error">Failed to load eligibility data.</div>;

  const types = ['ALL', 'ISA', 'CREDIT_CARD', 'MORTGAGE', 'LOAN'];
  const filtered = filter === 'ALL' ? data.results : data.results?.filter((r: any) => r.product.type === filter);

  return (
    <div>
      <div className="page-header">
        <h1>Product Eligibility</h1>
        <p>Rule-based scoring engine — see which financial products you qualify for</p>
      </div>

      {/* Profile summary */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: 'none' }}>
        <div style={{ color: 'white' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', opacity: 0.8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Financial Profile</div>
          <div className="grid-4">
            {[
              { label: 'Annual Income', value: `£${data.userProfile?.annualIncome?.toLocaleString('en-GB', { minimumFractionDigits: 0 })}` },
              { label: 'Avg Monthly Spend', value: `£${data.userProfile?.avgMonthlySpend?.toFixed(2)}` },
              { label: 'Savings Rate', value: `${data.userProfile?.savingsRate?.toFixed(1)}%` },
              { label: 'Eligible Products', value: `${data.results?.filter((r: any) => r.isEligible).length || 0}/${data.results?.length}` },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {types.map(t => (
          <button key={t}
            className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(t)}
          >
            {t === 'ALL' ? 'All Products' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {filtered?.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Star size={36} />
              <h3>No eligible products found</h3>
              <p>Try another product type or update your financial profile.</p>
            </div>
          </div>
        ) : filtered?.map((r: any) => {
          const Icon = PRODUCT_ICONS[r.product.type] || Star;
          const color = PRODUCT_COLORS[r.product.type] || '#6366f1';
          return (
            <div key={r.product.id} className="card" style={{
              border: `2px solid ${r.isEligible ? '#6ee7b7' : 'var(--border)'}`,
              opacity: r.isEligible ? 1 : 0.85,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 44, height: 44, background: `${color}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.product.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {r.product.type.replace('_', ' ')}
                      {r.product.interestRate != null && ` · ${r.product.interestRate}% AER`}
                    </div>
                  </div>
                </div>
                {r.isEligible
                  ? <CheckCircle size={24} color="#10b981" />
                  : <XCircle size={24} color="#ef4444" />}
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.875rem' }}>
                {r.product.description}
              </p>

              {/* Score bar */}
              <div style={{ marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Eligibility score</span>
                  <span style={{ fontWeight: 700, color: r.score >= 70 ? '#10b981' : r.score >= 40 ? '#f59e0b' : '#ef4444' }}>
                    {r.score}/100
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{
                    width: `${r.score}%`,
                    background: r.score >= 70 ? '#10b981' : r.score >= 40 ? '#f59e0b' : '#ef4444'
                  }} />
                </div>
              </div>

              {r.improvementTips?.length > 0 && (
                <div style={{ background: r.isEligible ? '#d1fae5' : '#f1f5f9', borderRadius: 8, padding: '0.75rem', fontSize: 13 }}>
                  {r.isEligible
                    ? <span style={{ color: '#065f46' }}>✅ {r.improvementTips[0]}</span>
                    : (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>To improve:</div>
                        {r.improvementTips.map((tip: string, i: number) => (
                          <div key={i} style={{ color: 'var(--text-muted)', marginTop: 2 }}>• {tip}</div>
                        ))}
                      </div>
                    )
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

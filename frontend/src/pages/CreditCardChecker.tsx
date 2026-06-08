import { useState } from 'react';
import api from '../api/client';
import { CreditCard, CheckCircle, XCircle, AlertTriangle, TrendingUp, Lightbulb, GraduationCap } from 'lucide-react';

interface CheckResult {
  cardName: string;
  score: number;
  verdict: string;
  verdictColor: string;
  verdictIcon: string;
  issues: string[];
  positives: string[];
  recommendations: string[];
  studentTips: string[];
  userProfile: {
    monthlyIncome: number;
    avgMonthlySpend: number;
    savingsRate: number;
    newDebtRatio: number;
    isLowIncome: boolean;
  };
  costProjection: {
    monthlyFee: number;
    annualFee: number;
    balanceScenario: number;
    monthlyInterestIfCarrying: number;
    annualCostWorstCase: number;
  };
  topCategories: { category: string; monthly: number }[];
}

const CARD_PRESETS = [
  { name: 'Barclays Student Card', limit: 1200, apr: 24.9, fee: 0 },
  { name: 'Aqua Classic', limit: 1500, apr: 34.9, fee: 0 },
  { name: 'Capital One Classic', limit: 1000, apr: 34.9, fee: 0 },
  { name: 'Santander All in One', limit: 2000, apr: 23.7, fee: 3 },
  { name: 'Amex Platinum Cashback', limit: 3000, apr: 29.8, fee: 25 },
  { name: 'Monzo Flex', limit: 3000, apr: 24.0, fee: 0 },
];

export default function CreditCardChecker() {
  const [form, setForm] = useState({ cardName: '', creditLimit: '', apr: '', monthlyFee: '' });
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const applyPreset = (preset: typeof CARD_PRESETS[0]) => {
    setForm({
      cardName: preset.name,
      creditLimit: String(preset.limit),
      apr: String(preset.apr),
      monthlyFee: String(preset.fee),
    });
    setResult(null);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.creditLimit || !form.apr) { setError('Please enter at least a credit limit and APR'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/creditcard/check', {
        cardName: form.cardName,
        creditLimit: parseFloat(form.creditLimit),
        apr: parseFloat(form.apr),
        monthlyFee: parseFloat(form.monthlyFee) || 0,
      });
      setResult(r.data);
    } catch {
      setError('Failed to check card — make sure you have transactions logged first');
    }
    setLoading(false);
  };

  const scoreColor = (s: number) => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, background: '#ede9fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={22} color="#7c3aed" />
          </div>
          <div>
            <h1>Credit Card Checker</h1>
            <p>Find out if a card is financially suitable for your situation as a student or young adult</p>
          </div>
        </div>
      </div>

      {/* Student context banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <GraduationCap size={22} color="#a5b4fc" />
        <div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Tailored for Students & Young Adults</div>
          <div style={{ color: '#a5b4fc', fontSize: 13, marginTop: 2 }}>
            Our scoring uses student-specific thresholds — lower income benchmarks, credit-building guidance, and student product recommendations from UK providers.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1.4fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* LEFT — Input form */}
        <div>
          {/* Quick presets */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: 14 }}>⚡ Popular Student Cards — Quick Fill</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {CARD_PRESETS.map(p => (
                <button
                  key={p.name}
                  className="btn btn-secondary btn-sm"
                  onClick={() => applyPreset(p)}
                  style={{ fontSize: 12 }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Card Details</h3>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleCheck}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Card Name (optional)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Barclays Student Card"
                    value={form.cardName}
                    onChange={e => setForm(f => ({ ...f, cardName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Credit Limit (£) *</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 1200"
                    value={form.creditLimit}
                    onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))}
                    min="0"
                    required
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    For students: £500–£1,500 is typical and safer
                  </div>
                </div>
                <div>
                  <label className="form-label">APR (Annual Percentage Rate %) *</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 24.9"
                    value={form.apr}
                    onChange={e => setForm(f => ({ ...f, apr: e.target.value }))}
                    step="0.1"
                    min="0"
                    required
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Student cards typically range from 20% to 35% APR
                  </div>
                </div>
                <div>
                  <label className="form-label">Monthly Fee (£) — enter 0 if none</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 0"
                    value={form.monthlyFee}
                    onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.25rem' }}>
                  {loading ? 'Analysing your finances...' : '🔍 Check This Card'}
                </button>
              </div>
            </form>
          </div>

          {/* What we check */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: 14 }}>What we check against your profile</div>
            {[
              ['💰', 'Income suitability', 'Is the limit proportionate to what you earn?'],
              ['📊', 'APR impact', 'What would interest cost if you carried a balance?'],
              ['🏦', 'Debt ratio', 'Would this push your debt obligations too high?'],
              ['💸', 'Savings rate', 'Do you have enough buffer after monthly costs?'],
              ['🎓', 'Student context', 'Thresholds adjusted for student/young adult income patterns'],
            ].map(([icon, title, desc]) => (
              <div key={title as string} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Verdict card */}
            <div className="card" style={{ border: `2px solid ${result.verdictColor}`, background: `${result.verdictColor}08` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{result.cardName}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: result.verdictColor, marginTop: 2 }}>
                    {result.verdictIcon} {result.verdict}
                  </div>
                </div>
                {/* Score ring */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor(result.score), lineHeight: 1 }}>
                    {result.score}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 100</div>
                </div>
              </div>
              {/* Score bar */}
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-bar-fill" style={{ width: `${result.score}%`, background: scoreColor(result.score), borderRadius: 6 }} />
              </div>
            </div>

            {/* Cost projection */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '0.875rem' }}>💸 Cost Projection</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Annual fee', value: `£${result.costProjection.annualFee.toFixed(0)}` },
                  { label: 'Monthly interest if carrying 30% balance', value: `£${result.costProjection.monthlyInterestIfCarrying}/mo` },
                  { label: 'Balance scenario (30% of limit)', value: `£${result.costProjection.balanceScenario}` },
                  { label: 'Worst-case annual cost', value: `£${result.costProjection.annualCostWorstCase}`, highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.625rem 0.75rem' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: highlight ? '#ef4444' : 'var(--text)', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Positives */}
            {result.positives.length > 0 && (
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} color="#10b981" /> What looks good
                </div>
                {result.positives.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: '#065f46' }}>
                    <span style={{ flexShrink: 0 }}>✓</span> {p}
                  </div>
                ))}
              </div>
            )}

            {/* Issues */}
            {result.issues.length > 0 && (
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={16} color="#ef4444" /> Concerns
                </div>
                {result.issues.map((issue, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: '#7f1d1d' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} color="#ef4444" /> {issue}
                  </div>
                ))}
              </div>
            )}

            {/* Student tips */}
            {result.studentTips.length > 0 && (
              <div className="card" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #c4b5fd' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b21b6' }}>
                  <GraduationCap size={16} color="#7c3aed" /> Student & Young Adult Guidance
                </div>
                {result.studentTips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid #ddd6fe', fontSize: 13, color: '#4c1d95' }}>
                    <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} color="#7c3aed" /> {tip}
                  </div>
                ))}
              </div>
            )}

            {/* Your profile used */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} color="#6366f1" /> Your Profile Used
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: 13 }}>
                {[
                  ['Monthly income', `£${result.userProfile.monthlyIncome.toFixed(0)}`],
                  ['Avg monthly spend', `£${result.userProfile.avgMonthlySpend.toFixed(0)}`],
                  ['Savings rate', `${result.userProfile.savingsRate.toFixed(1)}%`],
                  ['New debt ratio', `${result.userProfile.newDebtRatio.toFixed(1)}%`],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
              {result.userProfile.isLowIncome && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fef3c7', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                  🎓 Analysis applied student/low-income thresholds — income below £1,500/month
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

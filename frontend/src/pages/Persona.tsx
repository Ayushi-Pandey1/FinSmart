import { useEffect, useState } from 'react';
import api from '../api/client';
import { Brain, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Persona() {
  const [persona, setPersona] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadLatest = async () => {
    try {
      const res = await api.get('/persona/latest');
      setPersona(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadLatest(); }, []);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/persona/generate');
      setPersona(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate persona. Make sure you have transactions added.');
    }
    setGenerating(false);
  };

  

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading your persona...</span></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>AI Spender Persona</h1>
          <p>Powered by Google Gemini — personalised behavioural analysis</p>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={generating}>
          <RefreshCw size={16} className={generating ? 'spinning' : ''} />
          {generating ? 'Analysing...' : persona ? 'Regenerate' : 'Generate Persona'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {generating && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
          </div>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Gemini is analysing your spending...</h3>
          <p style={{ color: 'var(--text-muted)' }}>This usually takes a few seconds</p>
        </div>
      )}

      {!generating && !persona && !error && (
        <div className="card">
          <div className="empty-state" style={{ padding: '4rem' }}>
            <div style={{ width: 80, height: 80, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Brain size={40} color="var(--primary)" />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Discover your financial persona</h3>
            <p style={{ maxWidth: 380, lineHeight: 1.6 }}>
              FinSmart's AI analyses your spending patterns and generates a personalised behavioural profile — uncovering insights that traditional banking apps miss.
            </p>
            <button className="btn btn-primary btn-lg" onClick={generate} disabled={generating}>
              <Brain size={18} /> Generate My Persona
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>You need at least a few transactions for an accurate analysis</p>
          </div>
        </div>
      )}

      {!generating && persona && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main persona card */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 16, padding: '2rem', color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{persona.personaEmoji || '💡'}</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>{persona.personaName}</h2>
                <p style={{ opacity: 0.9, lineHeight: 1.6, maxWidth: 480 }}>{persona.summary}</p>
              </div>
              {persona.savingsScore != null && (
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '1rem 1.5rem', flexShrink: 0 }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{persona.savingsScore}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Savings Score</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>out of 100</div>
                </div>
              )}
            </div>
            {persona.generatedAt && (
              <div style={{ marginTop: '1rem', fontSize: 12, opacity: 0.6 }}>
                Generated {new Date(persona.generatedAt).toLocaleString('en-GB')}
              </div>
            )}
          </div>

          {/* Top insight */}
          {persona.topInsight && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12, padding: '1.25rem', display: 'flex', gap: '0.875rem' }}>
              <AlertTriangle size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Key Insight</div>
                <div style={{ color: '#92400e', lineHeight: 1.5 }}>{persona.topInsight}</div>
              </div>
            </div>
          )}

          {/* Actionable tip */}
          {persona.actionableTip && (
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '1.25rem', display: 'flex', gap: '0.875rem' }}>
              <CheckCircle size={22} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Action for This Month</div>
                <div style={{ color: '#065f46', lineHeight: 1.5 }}>{persona.actionableTip}</div>
              </div>
            </div>
          )}

          <div className="grid-2">
            {/* Strengths */}
            {persona.strengths?.length > 0 && (
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="#10b981" /> Your Strengths
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {persona.strengths.map((s: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, background: '#d1fae5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 11, fontWeight: 700, color: '#10b981' }}>✓</div>
                      <span style={{ lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Watch-outs */}
            {persona.watchOuts?.length > 0 && (
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingDown size={18} color="#ef4444" /> Areas to Watch
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {persona.watchOuts.map((w: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, background: '#fee2e2', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 11, fontWeight: 700, color: '#ef4444' }}>!</div>
                      <span style={{ lineHeight: 1.5 }}>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Mail, ArrowLeft, Copy, Check } from 'lucide-react';
import api from '../api/client';

type Step = 'request' | 'token' | 'done';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
        setManualToken(res.data.resetToken);
      }
      setStep('token');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: manualToken, newPassword });
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. The token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: 'white', borderRadius: 16, marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <TrendingUp size={28} color="#6366f1" />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800 }}>FinSmart</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Password reset</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>

          {step === 'request' && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Forgot your password?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.5rem' }}>
                Enter your email and we'll generate a reset token for you.
              </p>
              {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
              <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" style={{ paddingLeft: '2.25rem' }} required />
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Generating token...' : 'Send Reset Token'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: 14 }}>
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </p>
            </>
          )}

          {step === 'token' && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Reset token generated</h2>
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 4 }}>📋 Proof-of-Concept Mode</div>
                <div style={{ color: '#78350f' }}>
                  In production, this token would be sent to your email. For this local demo it's shown here directly — copy it and paste it below.
                </div>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>YOUR RESET TOKEN</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ flex: 1, fontSize: 11, wordBreak: 'break-all', color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {resetToken}
                  </code>
                  <button className="btn btn-secondary btn-sm" onClick={handleCopy}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>
              {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Reset token</label>
                  <input className="form-input" type="text" value={manualToken}
                    onChange={e => setManualToken(e.target.value)} placeholder="Paste your token here" required />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Pre-filled from above — confirm it's correct</div>
                </div>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <input className="form-input" type="password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm new password</label>
                  <input className="form-input" type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" required />
                </div>
                <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Password reset!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.5rem' }}>
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <ArrowLeft size={16} /> Back to sign in
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
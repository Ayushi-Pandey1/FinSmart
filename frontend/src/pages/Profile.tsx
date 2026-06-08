import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { User, Save } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    monthlyIncome: user?.monthlyIncome?.toString() || '0',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.put('/auth/profile', { ...form, monthlyIncome: parseFloat(form.monthlyIncome) });
      updateUser(res.data);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account details and income information</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 64, height: 64, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={28} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user?.email}</div>
          </div>
        </div>

        {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First name</label>
              <input className="form-input" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input className="form-input" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" value={user?.email} disabled style={{ opacity: 0.7 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email cannot be changed</span>
          </div>

          <div className="form-group">
            <label className="form-label">Monthly income (£)</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.monthlyIncome}
              onChange={e => setForm(p => ({ ...p, monthlyIncome: e.target.value }))} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Used for savings rate and product eligibility calculations</span>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Receipt, PiggyBank, Brain, BarChart3,
  Star, LogOut, Sparkles, User, MessageCircle
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/spending', label: 'Transactions', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/predictions', label: 'Predictions', icon: BarChart3 },
  { to: '/persona', label: 'AI Persona', icon: Brain },
  { to: '/eligibility', label: 'Eligibility', icon: Star },
  { to: '/chat', label: 'FinSmart AI', icon: MessageCircle },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 'var(--sidebar-width)', background: '#1e1b4b', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={20} color="white" />
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>FinSmart</span>
        </div>

        {/* User greeting */}
        <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signed in as</div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: 14, marginTop: 2 }}>{user?.firstName} {user?.lastName}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 0.875rem', borderRadius: 8,
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'rgba(99,102,241,0.75)' : 'transparent',
                textDecoration: 'none', fontSize: 14,
                fontWeight: isActive ? 600 : 400, transition: 'all 0.15s',
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} color={isActive ? 'white' : 'rgba(255,255,255,0.55)'} />
                  {item.label}
                  {item.to === '/chat' && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, background: '#6366f1', color: 'white', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>AI</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <NavLink to="/profile" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem',
            borderRadius: 8, color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
            background: isActive ? 'rgba(99,102,241,0.75)' : 'transparent',
            textDecoration: 'none', fontSize: 14, marginBottom: 4,
          })}>
            {() => <><User size={17} color="rgba(255,255,255,0.6)" /> Profile</>}
          </NavLink>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 'var(--sidebar-width)', flex: 1, padding: '1.5rem', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}

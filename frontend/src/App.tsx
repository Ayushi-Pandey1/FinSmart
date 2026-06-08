import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Spending from './pages/Spending';
import Budgets from './pages/Budgets';
import Persona from './pages/Persona';
import Predictions from './pages/Predictions';
import Eligibility from './pages/Eligibility';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import CreditCardChecker from './pages/CreditCardChecker';
import SavingsGoals from './pages/SavingsGoals';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/spending" element={<ProtectedRoute><Spending /></ProtectedRoute>} />
      <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
      <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
      <Route path="/persona" element={<ProtectedRoute><Persona /></ProtectedRoute>} />
      <Route path="/eligibility" element={<ProtectedRoute><Eligibility /></ProtectedRoute>} />
      <Route path="/creditcard" element={<ProtectedRoute><CreditCardChecker /></ProtectedRoute>} />
      <Route path="/savings" element={<ProtectedRoute><SavingsGoals /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

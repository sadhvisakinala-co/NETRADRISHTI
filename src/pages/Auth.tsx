import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2, ScanLine } from 'lucide-react';
import { useAuthStore } from '../store';

const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => (
  <div style={{
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  }}>
    {/* Left Brand Panel */}
    <div style={{
      background: 'linear-gradient(160deg, #171B19 0%, #183D30 100%)',
      padding: '48px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}
      className="auth-brand-panel"
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 70%, rgba(180,154,104,0.06) 0%, transparent 50%)',
      }} />

      {/* Optical visual */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 300, height: 300,
        borderRadius: '50%',
        border: '1px solid rgba(180, 154, 104, 0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 200, height: 200,
          borderRadius: '50%',
          border: '1px solid rgba(180, 154, 104, 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 80, height: 80,
            borderRadius: '50%',
            border: '2px solid rgba(180, 154, 104, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 20, height: 20,
              borderRadius: '50%',
              background: 'rgba(180, 154, 104, 0.3)',
            }} />
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(180, 154, 104, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ScanLine size={16} color="#B49A68" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--warm-ivory)' }}>NETRADRISHTI</span>
        </Link>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 3vw, 40px)',
          fontWeight: 400,
          color: 'var(--warm-ivory)',
          lineHeight: 1.2,
          marginBottom: 16,
        }}>
          Intelligent vision.<br />Adaptive inspection.
        </h2>
        <p style={{
          fontSize: 15,
          color: 'rgba(245, 242, 234, 0.4)',
          lineHeight: 1.7,
          maxWidth: 360,
        }}>
          An adaptive agentic vision system for product quality inspection.
        </p>

        <div className="demo-banner" style={{ marginTop: 32, maxWidth: 280 }}>
          <ScanLine size={12} />
          Demo Mode · Local Development
        </div>
      </div>
    </div>

    {/* Right Form Panel */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 32px',
      background: 'var(--warm-ivory)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 14, color: 'var(--secondary-text)', marginBottom: 32 }}>{subtitle}</p>
        {children}
      </motion.div>
    </div>

    <style>{`
      @media (max-width: 768px) {
        div[style*="grid-template-columns: 1fr 1fr"] {
          grid-template-columns: 1fr !important;
        }
        .auth-brand-panel {
          display: none !important;
        }
      }
    `}</style>
  </div>
);

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      navigate('/app');
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to access your inspection workspace.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="input-group">
          <label className="input-label" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            className={`input-field ${error ? 'input-error' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="input-label" htmlFor="login-password">Password</label>
            <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--muted-brass)', fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              className={`input-field ${error ? 'input-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', padding: 4, color: 'var(--secondary-text)',
              }}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="input-error-text">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={isLoading || !email || !password}
          style={{ width: '100%', marginTop: 4 }}
        >
          {isLoading ? <Loader2 size={16} className="spinning" /> : null}
          {isLoading ? 'Signing in...' : 'Sign In'}
          {!isLoading && <ArrowRight size={16} />}
        </button>

        {/* Demo Mode Instant Login */}
        <div style={{
          padding: '12px 14px',
          borderRadius: 8,
          background: 'rgba(180,154,104,0.08)',
          border: '1px solid rgba(180,154,104,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-brass)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Evaluation Mode Active
            </span>
            <span style={{ fontSize: 10, background: 'var(--deep-forest)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
              Demo
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: 0 }}>
            Click below to instantly populate credentials and enter the NetraDrishti inspection console.
          </p>
          <button
            type="button"
            onClick={async () => {
              setEmail('demo.operator@netradrishti.ai');
              setPassword('demo1234');
              clearError();
              await login('demo.operator@netradrishti.ai', 'demo1234');
              navigate('/app');
            }}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, background: '#fff', fontSize: 12, fontWeight: 600 }}
          >
            ⚡ One-Click Demo Sign In (Lead Operator)
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--secondary-text)', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--deep-forest)', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </form>

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AuthLayout>
  );
};

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState('');
  const { signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPw) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }

    await signup(name, email, password);
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      navigate('/app');
    }
  };

  const displayError = localError || error;

  return (
    <AuthLayout title="Create your account" subtitle="Start inspecting products with NETRADRISHTI.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="input-group">
          <label className="input-label" htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="signup-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-password"
              type={showPw ? 'text' : 'password'}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', padding: 4, color: 'var(--secondary-text)',
              }}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            type="password"
            className="input-field"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Re-enter your password"
            required
          />
        </div>

        {displayError && <p className="input-error-text">{displayError}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={isLoading || !name || !email || !password || !confirmPw}
          style={{ width: '100%', marginTop: 4 }}
        >
          {isLoading ? <Loader2 size={16} className="spinning" /> : null}
          {isLoading ? 'Creating account...' : 'Create Account'}
          {!isLoading && <ArrowRight size={16} />}
        </button>

        <p style={{ fontSize: 13, color: 'var(--secondary-text)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--deep-forest)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </form>

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AuthLayout>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      {sent ? (
        <div style={{
          padding: 24,
          borderRadius: 'var(--radius-md)',
          background: 'var(--success-bg)',
          border: '1px solid rgba(45, 139, 95, 0.15)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>
            Reset link sent
          </p>
          <p style={{ fontSize: 13, color: 'var(--secondary-text)' }}>
            In demo mode, password reset is simulated. Check your inbox in a production setup.
          </p>
          <Link to="/login" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="input-group">
            <label className="input-label" htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!email}
            style={{ width: '100%' }}
          >
            Send Reset Link
          </button>

          <p style={{ fontSize: 13, color: 'var(--secondary-text)', textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--deep-forest)', fontWeight: 600 }}>
              Back to Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

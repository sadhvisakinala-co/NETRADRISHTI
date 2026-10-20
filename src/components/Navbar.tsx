import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store';

const NAV_ITEMS = [
  { label: 'Platform', href: '/#platform' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Capabilities', href: '/#capabilities' },
  { label: 'Technology', href: '/#technology' },
  { label: 'About', href: '/#trust' },
];

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const handleNavClick = useCallback((href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/#')) {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById(href.replace('/#', ''));
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const el = document.getElementById(href.replace('/#', ''));
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location, navigate]);

  const isLanding = location.pathname === '/';

  return (
    <>
      <motion.nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          background: scrolled
            ? 'rgba(245, 242, 234, 0.92)'
            : isLanding
              ? 'transparent'
              : 'rgba(245, 242, 234, 0.92)',
          backdropFilter: scrolled || !isLanding ? 'blur(20px)' : 'none',
          borderBottom: scrolled || !isLanding ? '1px solid var(--border-grey)' : '1px solid transparent',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--deep-forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid var(--muted-brass)',
                position: 'relative',
              }}>
                <div style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--muted-brass)',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }} />
              </div>
              {/* Scan lines */}
              <div style={{
                position: 'absolute',
                top: 6, left: 6, right: 6, bottom: 6,
                border: '1px solid rgba(180, 154, 104, 0.3)',
                borderRadius: '50%',
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-main)',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '-0.02em',
              color: scrolled || !isLanding ? 'var(--obsidian)' : 'var(--warm-ivory)',
            }}>
              NETRADRISHTI
            </span>
          </Link>

          {/* Desktop Nav */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
            className="desktop-nav"
          >
            {isLanding && NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-main)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: scrolled ? 'var(--secondary-text)' : 'rgba(245, 242, 234, 0.7)',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'color 0.2s',
                  padding: '4px 0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = scrolled ? 'var(--obsidian)' : 'var(--warm-ivory)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = scrolled ? 'var(--secondary-text)' : 'rgba(245, 242, 234, 0.7)';
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="desktop-nav">
            {isAuthenticated ? (
              <>
                <Link to="/app" className="btn btn-ghost" style={{
                  color: scrolled || !isLanding ? 'var(--secondary-text)' : 'rgba(245, 242, 234, 0.7)',
                  fontSize: 13,
                }}>
                  Dashboard
                </Link>
                <Link to="/app/inspect" className="btn btn-primary btn-sm" style={{
                  fontSize: 13,
                  gap: 6,
                }}>
                  Start Inspecting <ArrowRight size={14} />
                </Link>
                <button onClick={logout} className="btn btn-ghost" style={{
                  color: scrolled || !isLanding ? 'var(--secondary-text)' : 'rgba(245, 242, 234, 0.7)',
                  fontSize: 13,
                }}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: scrolled || !isLanding ? 'var(--secondary-text)' : 'rgba(245, 242, 234, 0.7)',
                  padding: '6px 12px',
                }}>
                  Sign In
                </Link>
                <Link to="/app/inspect" className="btn btn-primary btn-sm" style={{
                  fontSize: 13,
                  gap: 6,
                }}>
                  Start Inspecting <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              background: 'none',
              padding: 8,
              color: scrolled || !isLanding ? 'var(--obsidian)' : 'var(--warm-ivory)',
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 64,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'var(--warm-ivory)',
              zIndex: 999,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {isLanding && NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  padding: '12px 0',
                  fontFamily: 'var(--font-main)',
                  fontSize: 18,
                  fontWeight: 500,
                  color: 'var(--graphite)',
                  borderBottom: '1px solid var(--border-grey)',
                }}
              >
                {item.label}
              </button>
            ))}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isAuthenticated ? (
                <>
                  <Link to="/app/inspect" className="btn btn-primary btn-lg" style={{ textAlign: 'center' }}>
                    Start Inspecting
                  </Link>
                  <Link to="/app" className="btn btn-secondary btn-lg" style={{ textAlign: 'center' }}>
                    Dashboard
                  </Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="btn btn-ghost btn-lg">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary btn-lg" style={{ textAlign: 'center' }}>
                    Start Inspecting
                  </Link>
                  <Link to="/login" className="btn btn-secondary btn-lg" style={{ textAlign: 'center' }}>
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  );
};

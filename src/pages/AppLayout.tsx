import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, PlusCircle, History, FileText,
  Database, Settings, HelpCircle, LogOut, Menu, X,
  ScanLine, User,
} from 'lucide-react';
import { useAuthStore, useUIStore, useInspectionStore } from '../store';
import { useBackendStatus } from '../backendStatus';

const NAV_ITEMS = [
  { path: '/app', icon: LayoutDashboard, label: 'Overview', end: true },
  { path: '/app/inspect', icon: PlusCircle, label: 'New Inspection' },
  { path: '/app/history', icon: History, label: 'Inspection History' },
  { path: '/app/reports', icon: FileText, label: 'Reports' },
  { path: '/app/datasets', icon: Database, label: 'Datasets' },
  { path: '/app/settings', icon: Settings, label: 'Settings' },
];

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { syncWithBackend } = useInspectionStore();
  const backend = useBackendStatus();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarWidth = sidebarOpen ? 240 : 72;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--warm-ivory)' }}>
      {/* Desktop Sidebar */}
      <aside
        className="app-sidebar"
        style={{
          width: sidebarWidth,
          minHeight: '100vh',
          background: 'var(--pure-white)',
          borderRight: '1px solid var(--border-grey)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 10,
          borderBottom: '1px solid var(--border-grey)',
          flexShrink: 0,
        }}>
          <button
            onClick={toggleSidebar}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: 'var(--deep-forest)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--muted-brass)',
            }}
            aria-label="Toggle sidebar"
          >
            <ScanLine size={16} />
          </button>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}
            >
              NETRADRISHTI
            </motion.span>
          )}
        </div>

        {/* Dynamic Verified Backend / Pipeline Status Badge */}
        {sidebarOpen && (
          <Link
            to="/app/settings"
            title={backend.status === 'connected' ? `OpenCV v${backend.opencvVersion || '5.0'} Vision Engine Active` : backend.errorReason || 'Demo Mode (Local Engine)'}
            style={{
              margin: '12px 12px 0',
              padding: '6px 10px',
              background: backend.status === 'connected' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(180,154,104,0.08)',
              border: `1px solid ${backend.status === 'connected' ? 'rgba(46, 125, 50, 0.25)' : 'rgba(180,154,104,0.25)'}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: 10,
              fontWeight: 700,
              color: backend.status === 'connected' ? '#2E7D32' : 'var(--muted-brass)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: backend.status === 'connected' ? '#4CAF50' : backend.status === 'checking' ? '#9E9E9E' : '#FFB74D',
              boxShadow: backend.status === 'connected' ? '0 0 6px #4CAF50' : 'none',
              flexShrink: 0,
            }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {backend.status === 'connected'
                ? `OpenCV v${backend.opencvVersion || '5.0'} Active`
                : backend.status === 'checking'
                ? 'Probing Backend...'
                : 'Demo Mode (Local)'}
            </span>
          </Link>
        )}

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: sidebarOpen ? '10px 12px' : '10px 0',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--deep-forest)' : 'var(--secondary-text)',
                background: isActive ? 'rgba(24, 61, 48, 0.06)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                position: 'relative',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        borderRadius: 2,
                        background: 'var(--muted-brass)',
                      }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <item.icon size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid var(--border-grey)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: sidebarOpen ? '10px 12px' : '10px 0',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 500, color: 'var(--secondary-text)',
              background: 'none', width: '100%', textAlign: 'left',
            }}
          >
            <HelpCircle size={18} />
            {sidebarOpen && <span>Help</span>}
          </button>

          {/* User Profile */}
          {sidebarOpen && user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              marginTop: 4,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--deep-forest)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--warm-ivory)', fontSize: 13, fontWeight: 700,
                flexShrink: 0,
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--graphite)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--secondary-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: sidebarOpen ? '10px 12px' : '10px 0',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 500, color: 'var(--error)',
              background: 'none', width: '100%', textAlign: 'left',
            }}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Nav Bar */}
      <div className="mobile-app-bar" style={{
        display: 'none',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 56,
        background: 'var(--pure-white)',
        borderBottom: '1px solid var(--border-grey)',
        zIndex: 100,
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between',
      }}>
        <button onClick={() => setMobileNav(true)} style={{ background: 'none', padding: 8 }} aria-label="Open menu">
          <Menu size={22} color="var(--graphite)" />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>NETRADRISHTI</span>
        <Link to="/app/settings" style={{ padding: 8 }}>
          <User size={20} color="var(--secondary-text)" />
        </Link>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 200,
              }}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: 260, background: 'var(--pure-white)',
                zIndex: 201, padding: 16,
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>NETRADRISHTI</span>
                <button onClick={() => setMobileNav(false)} style={{ background: 'none', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileNav(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px', borderRadius: 'var(--radius-sm)',
                    fontSize: 14, fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--deep-forest)' : 'var(--secondary-text)',
                    background: isActive ? 'rgba(24, 61, 48, 0.06)' : 'transparent',
                    textDecoration: 'none', marginBottom: 2,
                  })}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div style={{ marginTop: 'auto' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px', fontSize: 14, color: 'var(--error)',
                    background: 'none', width: '100%',
                  }}
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main style={{
        marginLeft: sidebarWidth,
        flex: 1,
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
        className="app-main"
      >
        <div style={{ padding: 'clamp(24px, 3vw, 40px)' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .app-sidebar { display: none !important; }
          .mobile-app-bar { display: flex !important; }
          .app-main {
            margin-left: 0 !important;
            padding-top: 56px !important;
          }
        }
      `}</style>
    </div>
  );
};

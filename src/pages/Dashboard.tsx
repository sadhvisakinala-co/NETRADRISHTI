import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircle, BarChart3, CheckCircle, AlertTriangle,
  XCircle, Clock, ArrowRight, ScanLine, TrendingUp, Camera,
} from 'lucide-react';
import { useInspectionStore, useAuthStore } from '../store';
import { formatDate, getStatusColor, getStatusLabel } from '../types';

const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const Dashboard: React.FC = () => {
  const { inspections, getStats } = useInspectionStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const stats = getStats();

  const recentInspections = inspections.slice(0, 5);

  const statCards = [
    { label: 'Total Inspections', value: stats.total, icon: BarChart3, color: 'var(--deep-forest)' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'var(--success)' },
    { label: 'Reviews Required', value: stats.reviewRequired, icon: AlertTriangle, color: 'var(--warning)' },
    { label: 'Processing Failures', value: stats.failed, icon: XCircle, color: 'var(--error)' },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
      {/* Header */}
      <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
            Inspection Overview
          </h1>
          <p style={{ fontSize: 14, color: 'var(--secondary-text)' }}>
            {user ? `Welcome back, ${user.name}.` : ''} Monitor inspections, review findings, and start a new quality check.
          </p>
        </div>
        <Link to="/app/inspect" className="btn btn-primary" style={{ gap: 8 }}>
          <PlusCircle size={16} />
          New Inspection
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={fadeUp}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: `${stat.color}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <stat.icon size={18} color={stat.color} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--secondary-text)', fontWeight: 500, marginBottom: 4 }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--obsidian)', lineHeight: 1 }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Content Grid */}
      <div className="dashboard-content-grid">
        {/* Recent Inspections */}
        <motion.div variants={fadeUp} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-grey)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Inspections</h3>
            <Link to="/app/history" style={{ fontSize: 13, color: 'var(--muted-brass)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {recentInspections.length === 0 ? (
            <div style={{
              padding: '60px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(24, 61, 48, 0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <ScanLine size={24} color="var(--deep-forest)" />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No inspections yet</h4>
              <p style={{ fontSize: 13, color: 'var(--secondary-text)', marginBottom: 20 }}>
                Start by uploading a product image for analysis.
              </p>
              <Link to="/app/inspect" className="btn btn-primary btn-sm">
                <PlusCircle size={14} /> Run First Inspection
              </Link>
            </div>
          ) : (
            <div>
              {recentInspections.map((inspection) => (
                <button
                  key={inspection.id}
                  onClick={() => navigate(`/app/history/${inspection.id}`, { state: { selectedId: inspection.id } })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 24px',
                    width: '100%',
                    background: 'none',
                    borderBottom: '1px solid var(--border-grey)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(24, 61, 48, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                    background: 'var(--warm-ivory)',
                    border: '1px solid var(--border-grey)',
                    overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {inspection.productImageData ? (
                      <img
                        src={inspection.productImageData}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ScanLine size={16} color="var(--secondary-text)" />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--graphite)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        margin: 0,
                      }}>
                        {inspection.fileName || inspection.id.slice(0, 8)}
                      </p>
                      {inspection.source === 'live_camera' && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 5px',
                          borderRadius: 3, background: 'rgba(24,61,48,0.1)',
                          color: 'var(--deep-forest)', letterSpacing: '0.03em',
                        }}>
                          LIVE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: '2px 0 0 0' }}>
                      {inspection.productCategory} · {formatDate(inspection.createdAt)}
                    </p>
                  </div>
                  <span className={`badge badge-${inspection.status === 'completed' ? 'success' : inspection.status === 'failed' ? 'error' : inspection.status === 'review_required' ? 'warning' : 'neutral'}`}>
                    {getStatusLabel(inspection.status)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Start</h3>
            <button
              onClick={() => navigate('/app/inspect', { state: { initialMode: 'live' } })}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Camera size={16} /> Live Webcam Inspection
            </button>
            <button
              onClick={() => navigate('/app/inspect', { state: { initialMode: 'upload' } })}
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
            >
              <PlusCircle size={16} /> Upload Image Inspection
            </button>
            <button
              onClick={() => navigate('/app/history')}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Clock size={16} /> View History
            </button>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Activity</h3>
            {inspections.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--secondary-text)' }}>
                No activity recorded yet. Start an inspection to see your timeline.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {inspections.slice(0, 3).map((insp) => (
                  <div key={insp.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: getStatusColor(insp.status),
                      flexShrink: 0,
                    }} />
                    <p style={{ fontSize: 12, color: 'var(--secondary-text)', flex: 1 }}>
                      <span style={{ fontWeight: 600, color: 'var(--graphite)' }}>
                        {getStatusLabel(insp.status)}
                      </span>
                      {' — '}{insp.fileName || 'Inspection'} · {formatDate(insp.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{
            padding: 24,
            background: 'linear-gradient(135deg, var(--deep-forest), #1a4535)',
            borderColor: 'transparent',
          }}>
            <TrendingUp size={20} color="var(--muted-brass)" style={{ marginBottom: 12 }} />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-ivory)', marginBottom: 8 }}>
              Inspection Insights
            </h4>
            <p style={{ fontSize: 12, color: 'rgba(245,242,234,0.5)', lineHeight: 1.6 }}>
              {stats.total === 0
                ? 'Run inspections to start building your quality analytics.'
                : `${stats.completed} of ${stats.total} inspections completed successfully. ${stats.reviewRequired > 0 ? `${stats.reviewRequired} require review.` : ''}`
              }
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`
        .dashboard-content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .dashboard-content-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Dashboard;

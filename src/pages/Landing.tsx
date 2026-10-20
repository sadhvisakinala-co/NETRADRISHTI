import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, Crosshair, Cpu,
  ShieldCheck, FileSearch, UserCheck, ArrowUpRight,
  ScanLine, GitBranch, BarChart3, Layers, RefreshCw, Target,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuthStore } from '../store';

import { InspectionHero } from '../components/hero/InspectionHero';

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stagger: any = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const Landing: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const appDestination = isAuthenticated ? '/app/inspect' : '/login';

  return (
    <div style={{ background: 'var(--warm-ivory)' }}>
      <Navbar />

      {/* ==================== CINEMATIC 3D OPTICAL HERO ==================== */}
      <InspectionHero />


      {/* ==================== THE PROBLEM ==================== */}
      <section id="platform" style={{ padding: 'clamp(80px, 10vw, 140px) 0' }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >
            <motion.p variants={fadeUp} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--muted-brass)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              The Challenge
            </motion.p>
            <motion.h2 variants={fadeUp} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 400,
              maxWidth: 640,
              margin: '0 auto',
              lineHeight: 1.2,
            }}>
              Inspection should be more than a pass-or-fail label.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {[
              {
                icon: Eye,
                title: 'Repetitive Manual Inspection',
                desc: 'Human inspectors face fatigue and inconsistency when examining hundreds of products daily under time pressure.',
              },
              {
                icon: GitBranch,
                title: 'Rigid Fixed Pipelines',
                desc: 'Traditional systems follow a single path regardless of image quality, product type, or ambiguous evidence.',
              },
              {
                icon: FileSearch,
                title: 'Results Without Explanation',
                desc: 'Most automated systems produce a label without showing what was found, why, or how confident the result is.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  padding: 32,
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(24, 61, 48, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <item.icon size={20} color="var(--deep-forest)" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{item.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7 }}>{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== THE SOLUTION ==================== */}
      <section style={{
        padding: 'clamp(80px, 10vw, 140px) 0',
        background: 'var(--pure-white)',
        borderTop: '1px solid var(--border-grey)',
        borderBottom: '1px solid var(--border-grey)',
      }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >
            <motion.p variants={fadeUp} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--muted-brass)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              The Approach
            </motion.p>
            <motion.h2 variants={fadeUp} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 400,
              maxWidth: 640,
              margin: '0 auto',
              lineHeight: 1.2,
            }}>
              An inspection system that knows when to look closer.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {[
              { icon: ScanLine, text: 'Checks the quality of an incoming image' },
              { icon: Layers, text: 'Aligns an image with a reference when applicable' },
              { icon: Target, text: 'Identifies suspicious differences or anomalous regions' },
              { icon: RefreshCw, text: 'Selects an appropriate follow-up inspection' },
              { icon: UserCheck, text: 'Escalates uncertain cases for human review' },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '20px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-grey)',
                  background: 'var(--warm-ivory)',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(24, 61, 48, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <item.icon size={16} color="var(--deep-forest)" />
                </div>
                <p style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--graphite)',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-main)',
                }}>
                  {item.text}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" style={{ padding: 'clamp(80px, 10vw, 140px) 0' }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            style={{ textAlign: 'center', marginBottom: 72 }}
          >
            <motion.p variants={fadeUp} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--muted-brass)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Workflow
            </motion.p>
            <motion.h2 variants={fadeUp} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 400,
              maxWidth: 500,
              margin: '0 auto',
              lineHeight: 1.2,
            }}>
              Five steps. One intelligent flow.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              position: 'relative',
            }}
          >
            {[
              { num: '01', title: 'Observe', desc: 'Inspect the image and its quality.' },
              { num: '02', title: 'Analyse', desc: 'Align images and locate candidate regions.' },
              { num: '03', title: 'Decide', desc: 'Choose the next useful inspection action.' },
              { num: '04', title: 'Verify', desc: 'Evaluate evidence and determine next steps.' },
              { num: '05', title: 'Report', desc: 'Present findings with annotated evidence.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                style={{
                  padding: 28,
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-grey)',
                  background: 'var(--pure-white)',
                  position: 'relative',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 36,
                  color: 'rgba(180, 154, 104, 0.15)',
                  position: 'absolute',
                  top: 16,
                  right: 20,
                  lineHeight: 1,
                }}>
                  {step.num}
                </span>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--muted-brass)',
                  marginBottom: 20,
                }} />
                <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{step.title}</h4>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== CAPABILITIES ==================== */}
      <section id="capabilities" style={{
        padding: 'clamp(80px, 10vw, 140px) 0',
        background: 'var(--pure-white)',
        borderTop: '1px solid var(--border-grey)',
        borderBottom: '1px solid var(--border-grey)',
      }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >
            <motion.p variants={fadeUp} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--muted-brass)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Capabilities
            </motion.p>
            <motion.h2 variants={fadeUp} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 400,
              maxWidth: 500,
              margin: '0 auto',
              lineHeight: 1.2,
            }}>
              Built for precision at every stage.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20,
            }}
          >
            {[
              { icon: ScanLine, title: 'Intelligent Image Quality Checks', desc: 'Evaluates blur, brightness, contrast, and resolution before processing to prevent unreliable results.' },
              { icon: Layers, title: 'Reference Alignment', desc: 'Aligns product images with reference templates to enable meaningful comparison and difference analysis.' },
              { icon: Crosshair, title: 'Suspicious-Region Detection', desc: 'Identifies and localizes candidate regions that differ from the expected product appearance.' },
              { icon: Cpu, title: 'Adaptive Inspection Decisions', desc: 'An agent controller that decides the next check based on previous tool results — not a fixed pipeline.' },
              { icon: BarChart3, title: 'Visual Evidence Tracking', desc: 'Every tool call, its input, output, and rationale are recorded and presented as a transparent activity trace.' },
              { icon: ShieldCheck, title: 'Human Review & Reporting', desc: 'Uncertain results are escalated with context. Reports include annotated images and the full decision trail.' },
            ].map((cap, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="card"
                style={{
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  cursor: 'default',
                }}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(23, 27, 25, 0.08)' }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(24, 61, 48, 0.08), rgba(180, 154, 104, 0.06))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <cap.icon size={20} color="var(--deep-forest)" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{cap.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7 }}>{cap.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== TECHNOLOGY ==================== */}
      <section id="technology" style={{ padding: 'clamp(80px, 10vw, 140px) 0' }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >
            <motion.p variants={fadeUp} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--muted-brass)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Technology
            </motion.p>
            <motion.h2 variants={fadeUp} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 400,
              maxWidth: 540,
              margin: '0 auto',
              lineHeight: 1.2,
            }}>
              Transparent tools. Grounded analysis.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            <motion.div variants={fadeUp} className="card" style={{ padding: 32 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--deep-forest)' }}>
                Computer Vision Stack
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Image quality estimation', 'Blur & contrast analysis', 'Reference alignment', 'Difference-image generation', 'Region extraction', 'Annotated evidence output'].map((t, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--secondary-text)' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--muted-brass)', flexShrink: 0 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={fadeUp} className="card" style={{ padding: 32 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--deep-forest)' }}>
                Agent Architecture
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Bounded tool-call controller', 'Conditional decision logic', 'Structured JSON outputs', 'Maximum call limits & stop conditions', 'Error recovery & escalation', 'Full audit trail'].map((t, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--secondary-text)' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--deep-forest)', flexShrink: 0 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>

        <style>{`
          @media (max-width: 640px) {
            #technology .container > div:last-child {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>

      {/* ==================== TRUST ==================== */}
      <section id="trust" style={{
        padding: 'clamp(80px, 10vw, 140px) 0',
        background: 'var(--pure-white)',
        borderTop: '1px solid var(--border-grey)',
        borderBottom: '1px solid var(--border-grey)',
      }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--muted-brass)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Transparency
            </motion.p>
            <motion.h2 variants={fadeUp} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 400,
              lineHeight: 1.2,
              marginBottom: 24,
            }}>
              Every finding should have evidence.
            </motion.h2>
            <motion.p variants={fadeUp} style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--secondary-text)',
              marginBottom: 16,
            }}>
              NETRADRISHTI records the tools used, the evidence returned, the reason for subsequent actions, and the final result. The full inspection trace is available in every report.
            </motion.p>
            <motion.p variants={fadeUp} style={{
              fontSize: 14,
              lineHeight: 1.8,
              color: 'var(--soft-sage)',
              fontStyle: 'italic',
            }}>
              A suspicious region is not automatically proof of a manufacturing defect. Uncertain outcomes should always be reviewed by a qualified human inspector.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section style={{
        padding: 'clamp(100px, 12vw, 180px) 0',
        background: 'linear-gradient(160deg, #171B19 0%, #183D30 100%)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 80%, rgba(180,154,104,0.06) 0%, transparent 50%)',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(30px, 4vw, 52px)',
              fontWeight: 400,
              color: 'var(--warm-ivory)',
              lineHeight: 1.15,
              marginBottom: 28,
            }}>
              Bring evidence into<br />every inspection.
            </motion.h2>
            <motion.div variants={fadeUp}>
              <Link to={appDestination} className="btn btn-lg" style={{
                background: 'var(--muted-brass)',
                color: '#171B19',
                fontWeight: 700,
                fontSize: 15,
                padding: '16px 36px',
              }}>
                Open NETRADRISHTI <ArrowUpRight size={16} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer style={{
        padding: '64px 0 32px',
        borderTop: '1px solid var(--border-grey)',
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 48,
            marginBottom: 48,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--deep-forest)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    border: '1.5px solid var(--muted-brass)',
                  }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>NETRADRISHTI</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280, color: 'var(--secondary-text)' }}>
                An adaptive agentic vision system for product quality inspection.  नेत्रदृष्टि — See beyond the surface.
              </p>
            </div>

            <div>
              <h5 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16, color: 'var(--graphite)' }}>
                Platform
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/app" style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Dashboard</Link>
                <Link to="/app/inspect" style={{ fontSize: 13, color: 'var(--secondary-text)' }}>New Inspection</Link>
                <Link to="/app/history" style={{ fontSize: 13, color: 'var(--secondary-text)' }}>History</Link>
                <Link to="/app/reports" style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Reports</Link>
                <Link to="/app/datasets" style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Datasets</Link>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16, color: 'var(--graphite)' }}>
                Resources
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'none', textAlign: 'left', fontSize: 13, color: 'var(--secondary-text)' }}>How It Works</button>
                <button onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'none', textAlign: 'left', fontSize: 13, color: 'var(--secondary-text)' }}>Capabilities</button>
                <button onClick={() => document.getElementById('technology')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'none', textAlign: 'left', fontSize: 13, color: 'var(--secondary-text)' }}>Technology</button>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16, color: 'var(--graphite)' }}>
                Account
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/login" style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Sign In</Link>
                <Link to="/signup" style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Sign Up</Link>
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-grey)',
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--secondary-text)',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <span>© {new Date().getFullYear()} NETRADRISHTI. Agentic Vision Competition Entry.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              <span style={{ cursor: 'default' }}>Privacy</span>
              <span style={{ cursor: 'default' }}>Terms</span>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            footer .container > div:first-child {
              grid-template-columns: 1fr 1fr !important;
              gap: 32px !important;
            }
          }
          @media (max-width: 480px) {
            footer .container > div:first-child {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </footer>
    </div>
  );
};

export default Landing;

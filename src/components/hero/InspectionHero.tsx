import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, ScanLine } from 'lucide-react';
import { useAuthStore } from '../../store';
import { OpticalInspectionScene } from './OpticalInspectionScene';
import { HeroHudOverlay } from './HeroHudOverlay';
import { ScanDemoControl, ScanState } from './ScanDemoControl';

const fadeUp: any = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stagger: any = {
  visible: { transition: { staggerChildren: 0.12 } },
};

export const InspectionHero: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const appDestination = isAuthenticated ? '/app/inspect' : '/login';

  // Animation State Machine for the Visual Scan Demonstration
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const scanAnimFrameRef = useRef<number | null>(null);
  const scanStartTimeRef = useRef<number | null>(null);

  // Duration of one full inspection cycle in milliseconds
  const SCAN_DURATION_MS = 4200;

  // Start the Visual Scan Demonstration
  const handleStartScan = useCallback(() => {
    if (scanState === 'scanning') return; // Prevent overlapping runs

    if (scanAnimFrameRef.current) {
      cancelAnimationFrame(scanAnimFrameRef.current);
    }

    setScanState('scanning');
    setScanProgress(0);
    scanStartTimeRef.current = performance.now();

    const animateScan = (now: number) => {
      if (!scanStartTimeRef.current) return;
      const elapsed = now - scanStartTimeRef.current;
      const rawProgress = Math.min(1, elapsed / SCAN_DURATION_MS);

      // Smooth cubic easing for high-end optical sweep feel
      const easedProgress = rawProgress < 0.5
        ? 4 * rawProgress * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

      setScanProgress(easedProgress);

      if (rawProgress < 1) {
        scanAnimFrameRef.current = requestAnimationFrame(animateScan);
      } else {
        setScanProgress(1);
        setScanState('complete');
      }
    };

    scanAnimFrameRef.current = requestAnimationFrame(animateScan);
  }, [scanState]);

  // Reset to idle ready state
  const handleResetScan = useCallback(() => {
    if (scanAnimFrameRef.current) {
      cancelAnimationFrame(scanAnimFrameRef.current);
    }
    setScanProgress(0);
    setScanState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanAnimFrameRef.current) {
        cancelAnimationFrame(scanAnimFrameRef.current);
      }
    };
  }, []);

  return (
    <section
      className="hero-section-wrapper"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #171B19 0%, #183D30 52%, #13241D 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Background Volumetric Radial Glows */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 75% 45%, rgba(180, 154, 104, 0.08) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(24, 61, 48, 0.4) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container-wide"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: 48,
          alignItems: 'center',
          paddingTop: 96,
          paddingBottom: 64,
          position: 'relative',
          zIndex: 2,
          width: '100%',
        }}
      >
        {/* ========================================================= */}
        {/* LEFT COLUMN: BRAND STORY & CALLS TO ACTION                */}
        {/* ========================================================= */}
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Eyebrow Pill */}
          <motion.div
            variants={fadeUp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: 'rgba(180, 154, 104, 0.1)',
              border: '1px solid rgba(180, 154, 104, 0.25)',
              borderRadius: 'var(--radius-full)',
              marginBottom: 28,
            }}
          >
            <ScanLine size={13} color="#D6B87D" />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#D6B87D',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Agentic Vision System
            </span>
          </motion.div>

          {/* Master Headline */}
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(42px, 5.2vw, 76px)',
              fontWeight: 400,
              color: 'var(--warm-ivory)',
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              marginBottom: 22,
            }}
          >
            See Beyond<br />the Surface.
          </motion.h1>

          {/* Supporting Headline */}
          <motion.p
            variants={fadeUp}
            style={{
              fontSize: 'clamp(17px, 1.35vw, 20px)',
              fontWeight: 500,
              color: 'rgba(245, 242, 234, 0.85)',
              lineHeight: 1.5,
              maxWidth: 500,
              marginBottom: 14,
              fontFamily: 'var(--font-body)',
            }}
          >
            Adaptive AI vision for precision product inspection.
          </motion.p>

          {/* Editorial Paragraph */}
          <motion.p
            variants={fadeUp}
            style={{
              fontSize: 'clamp(14px, 1.05vw, 16px)',
              color: 'rgba(245, 242, 234, 0.55)',
              lineHeight: 1.7,
              maxWidth: 480,
              marginBottom: 36,
              fontFamily: 'var(--font-body)',
            }}
          >
            NETRADRISHTI combines computer vision with an adaptive inspection workflow to examine product images, investigate suspicious regions, and bring visual evidence into every decision.
          </motion.p>

          {/* Action Buttons */}
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link
              to={appDestination}
              className="btn btn-primary btn-lg"
              style={{
                background: 'linear-gradient(135deg, #B49A68 0%, #D6B87D 100%)',
                color: '#171B19',
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(180, 154, 104, 0.35)',
                border: 'none',
              }}
            >
              Start Inspecting <ArrowRight size={16} />
            </Link>
            <button
              className="btn btn-lg"
              style={{
                background: 'transparent',
                color: 'rgba(245, 242, 234, 0.75)',
                border: '1.5px solid rgba(245, 242, 234, 0.2)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore the Workflow
            </button>
          </motion.div>

          {/* Supporting Micro Labels */}
          <motion.div
            variants={fadeUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 44,
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(245, 242, 234, 0.4)',
              fontFamily: 'var(--font-body)',
              flexWrap: 'wrap',
            }}
          >
            <span>Computer Vision</span>
            <span style={{ color: 'rgba(180, 154, 104, 0.5)' }}>·</span>
            <span>Adaptive Decisions</span>
            <span style={{ color: 'rgba(180, 154, 104, 0.5)' }}>·</span>
            <span>Evidence-Backed Review</span>
          </motion.div>
        </motion.div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: 3D OPTICAL INSPECTION ENGINE & HUD           */}
        {/* ========================================================= */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="hero-3d-wrapper"
          style={{
            position: 'relative',
            height: 'clamp(460px, 66vh, 720px)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Subtle Ambient Radial Backlight Behind 3D Engine */}
          <div
            style={{
              position: 'absolute',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(180, 154, 104, 0.12) 0%, rgba(24, 61, 48, 0.25) 45%, transparent 70%)',
              filter: 'blur(36px)',
              pointerEvents: 'none',
            }}
          />

          {/* Technical DOM HUD Overlay (Badges, Leader Lines, Telemetry) */}
          <HeroHudOverlay isScanning={scanState === 'scanning'} />

          {/* High-Fidelity Three.js / React Three Fiber 3D Scene */}
          <OpticalInspectionScene scanState={scanState} scanProgress={scanProgress} />

          {/* Floating Interactive "Run Visual Scan" Demonstration Control */}
          <div
            className="hero-scan-control-dock"
            style={{
              position: 'absolute',
              bottom: 20,
              right: 16,
              zIndex: 12,
            }}
          >
            <ScanDemoControl
              scanState={scanState}
              scanProgress={scanProgress}
              onStartScan={handleStartScan}
              onResetScan={handleResetScan}
            />
          </div>
        </motion.div>
      </div>

      {/* Hero Scroll Down Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 3,
          cursor: 'pointer',
        }}
        onClick={() => {
          document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: 'rgba(245, 242, 234, 0.35)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Explore System
        </span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2.2 }}>
          <ChevronDown size={15} color="rgba(245, 242, 234, 0.4)" />
        </motion.div>
      </motion.div>

      {/* Responsive Media Queries */}
      <style>{`
        @media (max-width: 1024px) {
          .hero-section-wrapper .container-wide {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
            padding-top: 84px !important;
            padding-bottom: 48px !important;
          }
          .hero-3d-wrapper {
            height: 480px !important;
          }
          .hero-scan-control-dock {
            right: 50% !important;
            transform: translateX(50%) !important;
            bottom: 12px !important;
            width: calc(100% - 32px) !important;
            max-width: 360px !important;
          }
        }
        @media (max-width: 640px) {
          .hero-3d-wrapper {
            height: 400px !important;
          }
          .hero-scan-control-dock {
            bottom: 8px !important;
          }
        }
      `}</style>
    </section>
  );
};

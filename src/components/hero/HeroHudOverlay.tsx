import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Compass, Cpu } from 'lucide-react';

interface HeroHudOverlayProps {
  isScanning: boolean;
}

export const HeroHudOverlay: React.FC<HeroHudOverlayProps> = ({ isScanning }) => {
  return (
    <div
      className="hero-hud-container"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      {/* HUD Tag 1: Top-Left — Optical Engine Core Telemetry */}
      <motion.div
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="hud-badge hud-badge-top-left"
        style={{
          position: 'absolute',
          top: 24,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '8px 14px',
          background: 'rgba(23, 27, 25, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(180, 154, 104, 0.25)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={12} color="#D6B87D" />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#D6B87D',
            }}
          >
            Optical Engine
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'rgba(245, 242, 234, 0.65)' }}>
          <span>DEMO: THREE.JS SCANNER</span>
          <span style={{ color: 'rgba(180, 154, 104, 0.5)' }}>|</span>
          <span style={{ fontFamily: 'monospace' }}>3-AXIS GIMBAL RIG</span>
        </div>
      </motion.div>

      {/* HUD Tag 2: Top-Right — Scanning Status & Sensor Frame */}
      <motion.div
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.8 }}
        className="hud-badge hud-badge-top-right"
        style={{
          position: 'absolute',
          top: 24,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          padding: '8px 14px',
          background: 'rgba(23, 27, 25, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(180, 154, 104, 0.25)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isScanning ? '#D6B87D' : '#48bb78',
            }}
          >
            {isScanning ? 'Active Optical Sweep' : 'Sensor Ready'}
          </span>
          <Activity size={12} color={isScanning ? '#D6B87D' : '#48bb78'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'rgba(245, 242, 234, 0.65)' }}>
          <span style={{ fontFamily: 'monospace' }}>OPENCV PIPELINE</span>
          <span style={{ color: 'rgba(180, 154, 104, 0.5)' }}>|</span>
          <span>CALIBRATED MATRIX</span>
        </div>
      </motion.div>

      {/* HUD Tag 3: Bottom-Left — Reference Frame Coordinate Datum */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="hud-badge hud-badge-bottom-left"
        style={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'rgba(23, 27, 25, 0.5)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(180, 154, 104, 0.2)',
          borderRadius: 'var(--radius-full)',
        }}
      >
        <Compass size={11} color="rgba(180, 154, 104, 0.8)" />
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(245, 242, 234, 0.65)',
            fontFamily: 'monospace',
          }}
        >
          VISUAL DEMONSTRATION // SYNTHETIC 3D RIG
        </span>
      </motion.div>

      {/* Global CSS for HUD Responsive Visibility */}
      <style>{`
        @media (max-width: 1180px) {
          .hud-badge-bottom-left {
            display: none !important;
          }
        }
        @media (max-width: 680px) {
          .hud-badge-top-left,
          .hud-badge-top-right,
          .hud-badge-bottom-left {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

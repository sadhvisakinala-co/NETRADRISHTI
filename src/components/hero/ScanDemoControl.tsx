import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, CheckCircle2, ScanLine, ShieldAlert } from 'lucide-react';

export type ScanState = 'idle' | 'scanning' | 'complete';

interface ScanDemoControlProps {
  scanState: ScanState;
  scanProgress: number; // 0 to 1
  onStartScan: () => void;
  onResetScan: () => void;
}

export const ScanDemoControl: React.FC<ScanDemoControlProps> = ({
  scanState,
  scanProgress,
  onStartScan,
  onResetScan,
}) => {
  // Descriptive telemetry phase based on actual progress
  const getPhaseLabel = (progress: number) => {
    if (progress < 0.25) return 'Calibrating Optical Plane · 850nm';
    if (progress < 0.55) return 'Surface Interferometry · Scanning';
    if (progress < 0.85) return 'Contour Verification · 12-Axis';
    return 'Finalizing Optical Tolerances...';
  };

  const progressPercent = Math.round(scanProgress * 100);

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 18px',
        background: 'rgba(23, 27, 25, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(180, 154, 104, 0.3)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(245, 242, 234, 0.1)',
        maxWidth: 360,
        width: '100%',
        color: 'var(--warm-ivory)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Top Header Row with Status Tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                scanState === 'scanning'
                  ? '#D6B87D'
                  : scanState === 'complete'
                  ? '#2D8B5F'
                  : 'rgba(180, 154, 104, 0.5)',
              boxShadow:
                scanState === 'scanning'
                  ? '0 0 10px #D6B87D'
                  : scanState === 'complete'
                  ? '0 0 10px #2D8B5F'
                  : 'none',
              animation: scanState === 'scanning' ? 'pulse 1s infinite' : 'none',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--warm-ivory)',
            }}
          >
            {scanState === 'idle' && 'Visual Demonstration'}
            {scanState === 'scanning' && '3D Scan in Progress'}
            {scanState === 'complete' && 'Optical Scan Complete'}
          </span>
        </div>

        {/* Live FPS / Telemetry Badge */}
        <span
          style={{
            fontSize: 10,
            fontFamily: 'monospace',
            color: 'rgba(180, 154, 104, 0.85)',
            background: 'rgba(180, 154, 104, 0.12)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(180, 154, 104, 0.25)',
          }}
        >
          {scanState === 'idle' && 'READY'}
          {scanState === 'scanning' && `${progressPercent}%`}
          {scanState === 'complete' && '100%'}
        </span>
      </div>

      {/* Progress Bar (Visible during scanning and completion) */}
      <AnimatePresence>
        {(scanState === 'scanning' || scanState === 'complete') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                width: '100%',
                height: 4,
                background: 'rgba(245, 242, 234, 0.12)',
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background:
                    scanState === 'complete'
                      ? 'linear-gradient(90deg, #2D8B5F, #48bb78)'
                      : 'linear-gradient(90deg, #B49A68, #D6B87D)',
                  transition: 'width 80ms linear',
                  boxShadow: '0 0 8px rgba(214, 184, 125, 0.6)',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: 'rgba(245, 242, 234, 0.55)',
              }}
            >
              <span>{getPhaseLabel(scanProgress)}</span>
              <span style={{ fontFamily: 'monospace' }}>±0.001mm</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {scanState === 'idle' && (
          <button
            onClick={onStartScan}
            className="btn btn-sm"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #B49A68 0%, #D6B87D 100%)',
              color: '#171B19',
              fontWeight: 700,
              fontSize: 12,
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(180, 154, 104, 0.35)',
              transition: 'all 160ms var(--ease-out)',
            }}
          >
            <Play size={13} fill="#171B19" />
            Run Visual Scan
          </button>
        )}

        {scanState === 'scanning' && (
          <div
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'rgba(180, 154, 104, 0.15)',
              color: '#D6B87D',
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              border: '1px solid rgba(180, 154, 104, 0.3)',
            }}
          >
            <ScanLine size={14} className="spin-slow" />
            Sweeping Optical Volume...
          </div>
        )}

        {scanState === 'complete' && (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <div
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(45, 139, 95, 0.15)',
                color: '#48bb78',
                fontWeight: 600,
                fontSize: 11,
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                border: '1px solid rgba(45, 139, 95, 0.35)',
              }}
            >
              <CheckCircle2 size={13} color="#48bb78" />
              Tolerances Verified
            </div>
            <button
              onClick={onResetScan}
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(245, 242, 234, 0.08)',
                color: 'var(--warm-ivory)',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                border: '1px solid rgba(245, 242, 234, 0.18)',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              Replay
            </button>
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer Note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
          fontSize: 9.5,
          color: 'rgba(245, 242, 234, 0.4)',
          lineHeight: 1.3,
        }}
      >
        <ShieldAlert size={10} color="rgba(180, 154, 104, 0.7)" />
        <span>3D animation demo. Live factory inspection uses the real vision pipeline.</span>
      </div>
    </div>
  );
};

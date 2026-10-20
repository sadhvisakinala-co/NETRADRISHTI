import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OpticalEngineMesh } from './OpticalEngineMesh';
import { ScanState } from './ScanDemoControl';

interface OpticalInspectionSceneProps {
  scanState: ScanState;
  scanProgress: number;
}

// Scene content with dynamic camera adjustments and cinematic lighting
function SceneContent({
  scanState,
  scanProgress,
}: {
  scanState: ScanState;
  scanProgress: number;
}) {
  const { viewport } = useThree();
  const sceneGroupRef = useRef<THREE.Group>(null);
  const scrollOffsetRef = useRef(0);

  // Responsive scale factor based on viewport aspect
  const responsiveScale = Math.min(1.05, Math.max(0.68, viewport.width / 6.8));

  // Listen to window scroll to adjust depth subtly without layout shifts
  useEffect(() => {
    const handleScroll = () => {
      scrollOffsetRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useFrame((_, delta) => {
    if (sceneGroupRef.current) {
      // Gentle depth displacement on scroll
      const targetZ = -Math.min(1.4, scrollOffsetRef.current * 0.0016);
      const safeDelta = Math.min(delta, 0.05);
      sceneGroupRef.current.position.z = THREE.MathUtils.damp(
        sceneGroupRef.current.position.z,
        targetZ,
        3.0,
        safeDelta
      );
    }
  });

  return (
    <>
      {/* ==================== CINEMATIC STUDIO LIGHTING ==================== */}
      {/* 1. Subtle Deep Forest Ambient Base */}
      <ambientLight intensity={0.35} color="#1d3027" />

      {/* 2. Broad Soft Warm Key Light */}
      <directionalLight
        position={[4, 6, 5]}
        intensity={1.3}
        color="#F5F2EA"
        castShadow={false}
      />

      {/* 3. Cool-Neutral Fill Light (Sage) */}
      <directionalLight
        position={[-5, 2, -3]}
        intensity={0.55}
        color="#A8B5A8"
      />

      {/* 4. High-Contrast Champagne Brass Rim Light (Separates from background) */}
      <directionalLight
        position={[0, -4, -6]}
        intensity={1.15}
        color="#D6B87D"
      />

      {/* 5. Precision Specular Optical Highlight Point */}
      <pointLight
        position={[1.5, 1.2, 3.2]}
        intensity={0.85}
        color="#F5F2EA"
        distance={10}
      />

      {/* 6. Lower Warm Bounce Light */}
      <pointLight
        position={[-1.8, -2.5, 2.0]}
        intensity={0.65}
        color="#B49A68"
        distance={8}
      />

      {/* Main 3D Composition Group */}
      <group ref={sceneGroupRef} scale={responsiveScale}>
        <OpticalEngineMesh
          isScanning={scanState === 'scanning'}
          scanProgress={scanProgress}
          scanState={scanState}
        />
      </group>
    </>
  );
}

// High-end CSS/SVG Reticle Fallback for No-WebGL or Reduced Motion
export const OpticalEngineFallback: React.FC = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}
  >
    <div
      style={{
        width: 320,
        height: 320,
        borderRadius: '50%',
        border: '1.5px solid rgba(180, 154, 104, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 0 50px rgba(24, 61, 48, 0.4), inset 0 0 40px rgba(180, 154, 104, 0.08)',
      }}
    >
      {/* Outer ticks */}
      <div
        style={{
          position: 'absolute',
          inset: -12,
          border: '1px dashed rgba(180, 154, 104, 0.25)',
          borderRadius: '50%',
        }}
      />
      {/* Middle Brass Ring */}
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '2px solid rgba(214, 184, 125, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(180, 154, 104, 0.2)',
        }}
      >
        {/* Core Lens Graphic */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #2a473b 0%, #171B19 75%)',
            border: '2px solid #D6B87D',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          }}
        />
      </div>
      {/* Reticle Crosshairs */}
      <div
        style={{
          position: 'absolute',
          width: '110%',
          height: 1,
          background: 'rgba(180, 154, 104, 0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          height: '110%',
          width: 1,
          background: 'rgba(180, 154, 104, 0.3)',
        }}
      />
    </div>
  </div>
);

export const OpticalInspectionScene: React.FC<OpticalInspectionSceneProps> = ({
  scanState,
  scanProgress,
}) => {
  const [hasWebGL, setHasWebGL] = useState(true);

  // Check WebGL availability and reduced-motion preference
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!hasWebGL || prefersReducedMotion) {
    return <OpticalEngineFallback />;
  }

  return (
    <Suspense fallback={<OpticalEngineFallback />}>
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 44 }}
        dpr={[1, 1.8]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#171B19'), 0);
        }}
      >
        <SceneContent scanState={scanState} scanProgress={scanProgress} />
      </Canvas>
    </Suspense>
  );
};

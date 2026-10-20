import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createOpticalMaterials } from './OpticalMaterials';

interface OpticalEngineMeshProps {
  isScanning: boolean;
  scanProgress: number; // 0 to 1
  scanState: 'idle' | 'scanning' | 'complete';
}

export const OpticalEngineMesh: React.FC<OpticalEngineMeshProps> = ({
  isScanning,
  scanProgress,
  scanState,
}) => {
  // Scene node refs
  const rootGroupRef = useRef<THREE.Group>(null);
  const coreGroupRef = useRef<THREE.Group>(null);
  const outerGimbalRef = useRef<THREE.Mesh>(null);
  const brassVernierRef = useRef<THREE.Group>(null);
  const sensorArcRef = useRef<THREE.Group>(null);
  const sensorCarriageRef = useRef<THREE.Mesh>(null);
  const lensElementRef = useRef<THREE.Mesh>(null);
  const scanPlaneRef = useRef<THREE.Group>(null);
  const scanLaserRef = useRef<THREE.Mesh>(null);
  const surfaceReactionRef = useRef<THREE.Mesh>(null);
  const markerGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Materials palette
  const mats = useMemo(() => createOpticalMaterials(), []);

  // Procedural geometries for precision industrial details
  const {
    fastenerGeom,
    tickGeom,
    fiducialLines,
    particlePositions,
    datumPoints,
  } = useMemo(() => {
    // 1. Fastener screws around the equator collar
    const fastenerGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12);

    // 2. Vernier tick marks (16 radial dashes)
    const tickGeom = new THREE.BoxGeometry(0.015, 0.08, 0.015);

    // 3. Technical fiducial corner lines for the 3D inspection volume
    const corners = [
      [-2.6, 2.2, -1.2],
      [2.6, 2.2, -1.2],
      [-2.6, -2.2, -1.2],
      [2.6, -2.2, -1.2],
      [-2.6, 2.2, 1.2],
      [2.6, 2.2, 1.2],
      [-2.6, -2.2, 1.2],
      [2.6, -2.2, 1.2],
    ];

    const linePoints: THREE.Vector3[] = [];
    corners.forEach(([cx, cy, cz]) => {
      const arm = 0.22;
      // X-arm
      linePoints.push(new THREE.Vector3(cx - arm, cy, cz));
      linePoints.push(new THREE.Vector3(cx + arm, cy, cz));
      // Y-arm
      linePoints.push(new THREE.Vector3(cx, cy - arm, cz));
      linePoints.push(new THREE.Vector3(cx, cy + arm, cz));
      // Z-arm
      linePoints.push(new THREE.Vector3(cx, cy, cz - arm));
      linePoints.push(new THREE.Vector3(cx, cy, cz + arm));
    });

    const fiducialLines = new THREE.BufferGeometry().setFromPoints(linePoints);

    // 4. Subtle depth particles (floating optical dust) - deterministic PRNG
    const pCount = 90;
    const particlePositions = new Float32Array(pCount * 3);
    let seed = 42;
    const nextRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < pCount; i++) {
      particlePositions[i * 3] = (nextRandom() - 0.5) * 8;
      particlePositions[i * 3 + 1] = (nextRandom() - 0.5) * 6;
      particlePositions[i * 3 + 2] = (nextRandom() - 0.5) * 5;
    }

    // 5. Circular datum plane on bottom
    const datumPts: THREE.Vector3[] = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2;
      datumPts.push(new THREE.Vector3(Math.cos(th) * 2.5, -2.2, Math.sin(th) * 2.5));
    }
    const datumPoints = new THREE.BufferGeometry().setFromPoints(datumPts);

    return { fastenerGeom, tickGeom, fiducialLines, particlePositions, datumPoints };
  }, []);

  // Frame animation loop with delta-independent updates
  useFrame(({ clock, pointer }, delta) => {
    const t = clock.getElapsedTime();
    // Clamp delta to avoid huge jumps on background tab resume
    const safeDelta = Math.min(delta, 0.05);

    // 1. Subtle mouse parallax on the root group
    if (rootGroupRef.current) {
      const targetRotY = pointer.x * 0.18;
      const targetRotX = -pointer.y * 0.12;
      rootGroupRef.current.rotation.y = THREE.MathUtils.damp(
        rootGroupRef.current.rotation.y,
        targetRotY,
        4.0,
        safeDelta
      );
      rootGroupRef.current.rotation.x = THREE.MathUtils.damp(
        rootGroupRef.current.rotation.x,
        targetRotX,
        4.0,
        safeDelta
      );
    }

    // 2. Central Core: slow precision rotation (swapping speed if scanning)
    if (coreGroupRef.current) {
      const speedMultiplier = isScanning ? 1.8 : 1.0;
      coreGroupRef.current.rotation.y += safeDelta * 0.12 * speedMultiplier;
      coreGroupRef.current.rotation.x = Math.sin(t * 0.4) * 0.06;
    }

    // 3. Inner Lens element: delicate counter-rotation
    if (lensElementRef.current) {
      lensElementRef.current.rotation.z += safeDelta * 0.08;
      lensElementRef.current.rotation.x = Math.cos(t * 0.3) * 0.04;
    }

    // 4. Outer Titanium Gimbal: slow tumble around tilted axis
    if (outerGimbalRef.current) {
      outerGimbalRef.current.rotation.y += safeDelta * 0.07;
      outerGimbalRef.current.rotation.z = Math.sin(t * 0.25) * 0.15;
    }

    // 5. Brass Vernier Ring: counter-clockwise rotation
    if (brassVernierRef.current) {
      brassVernierRef.current.rotation.z -= safeDelta * 0.11;
    }

    // 6. Sensor Arc & Sliding Optical Carriage
    if (sensorArcRef.current) {
      sensorArcRef.current.rotation.x = Math.sin(t * 0.35) * 0.3;
    }
    if (sensorCarriageRef.current) {
      // Oscillates along the 180-deg arc
      const arcAngle = (Math.sin(t * 0.8) * 0.5 + 0.5) * Math.PI - Math.PI / 2;
      const r = 2.45;
      sensorCarriageRef.current.position.set(
        Math.cos(arcAngle) * r,
        Math.sin(arcAngle) * r,
        0
      );
      sensorCarriageRef.current.rotation.z = arcAngle + Math.PI / 2;
    }

    // 7. Scanning Plane Apparatus & Surface Laser Highlight
    let scanY = 0;
    if (isScanning) {
      // Controlled linear sweep driven by the active inspection progress
      // Progress 0 -> 1 maps to Y from +1.8 to -1.8
      scanY = 1.8 - scanProgress * 3.6;
    } else {
      // Continuous ambient breathing scan
      scanY = Math.sin(t * 0.8) * 1.5;
    }

    if (scanPlaneRef.current) {
      scanPlaneRef.current.position.y = scanY;
    }

    // 8. Surface Reaction: when the laser plane crosses the core
    if (surfaceReactionRef.current) {
      const distFromCenter = Math.abs(scanY);
      // Bell-curve intensity as scan crosses y=0 (core radius ~1.2)
      const proximity = Math.max(0, 1 - distFromCenter / 1.4);
      const intensity = Math.pow(proximity, 2.5);
      const mat = surfaceReactionRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.opacity = intensity * (isScanning ? 0.85 : 0.45);
        mat.emissiveIntensity = intensity * (isScanning ? 1.6 : 0.8);
      }
    }

    // 9. Inspection Markers: sequential pulsing during active scan and verified state upon complete
    if (markerGroupRef.current) {
      const markers = markerGroupRef.current.children as THREE.Mesh[];
      markers.forEach((m, idx) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) {
          if (scanState === 'complete') {
            mat.emissive.set('#48bb78');
            mat.emissiveIntensity = 0.9;
          } else {
            mat.emissive.set('#B49A68');
            mat.emissiveIntensity = isScanning ? 1.0 : 0.6;
          }
        }

        if (isScanning) {
          // Highlight active marker based on scanProgress (4 markers over 0..1)
          const targetProgress = (idx + 1) / (markers.length + 1);
          const diff = Math.abs(scanProgress - targetProgress);
          const active = diff < 0.18;
          const scale = active ? 1.4 : 1.0;
          m.scale.lerp(new THREE.Vector3(scale, scale, scale), safeDelta * 10);
        } else {
          // Gentle ambient twinkle
          const pulse = Math.sin(t * 2 + idx * 1.5) * 0.15 + 1.0;
          m.scale.set(pulse, pulse, pulse);
        }
      });
    }

    // 10. Depth particles slow drift
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.015;
    }
  });

  return (
    <group ref={rootGroupRef}>
      {/* ========================================================= */}
      {/* LAYER A — CENTRAL PRECISION OPTICAL CORE                  */}
      {/* ========================================================= */}
      <group ref={coreGroupRef}>
        {/* Main Titanium Spherical Body */}
        <mesh material={mats.satinTitanium}>
          <sphereGeometry args={[1.05, 48, 48]} />
        </mesh>

        {/* Equatorial Precision Collar (Machined Dark Metal) */}
        <mesh material={mats.brushedDarkMetal} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.18, 1.18, 0.32, 48]} />
        </mesh>

        {/* Champagne Brass Accent Flanges on Collar */}
        <mesh material={mats.champagneBrass} position={[0, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.022, 16, 48]} />
        </mesh>
        <mesh material={mats.champagneBrass} position={[0, -0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.022, 16, 48]} />
        </mesh>

        {/* Concentric Fastener Screws on Collar Equator */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const r = 1.2;
          return (
            <mesh
              key={`fastener-${i}`}
              geometry={fastenerGeom}
              material={mats.champagneBrass}
              position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
              rotation={[0, -angle, Math.PI / 2]}
            />
          );
        })}

        {/* Front Stepped Optical Lens Barrel */}
        <group position={[0, 0, 0.72]}>
          {/* Outer Lens Housing Collar */}
          <mesh material={mats.brushedDarkMetal}>
            <cylinderGeometry args={[0.78, 0.85, 0.35, 36]} />
          </mesh>
          {/* Inner Brass Bezel Ring */}
          <mesh material={mats.champagneBrass} position={[0, 0.18, 0]}>
            <torusGeometry args={[0.74, 0.03, 16, 36]} />
          </mesh>
          {/* Optical Glass Convex Element */}
          <mesh
            ref={lensElementRef}
            material={mats.opticalGlass}
            position={[0, 0.12, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <sphereGeometry args={[0.72, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
          </mesh>
          {/* Inset Aperture Blade Assembly */}
          <mesh material={mats.apertureBlades} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 0.7, 8]} />
          </mesh>
        </group>

        {/* Rear Optical Sensor Housing */}
        <group position={[0, 0, -0.72]} rotation={[Math.PI, 0, 0]}>
          <mesh material={mats.deepGraphite}>
            <cylinderGeometry args={[0.65, 0.78, 0.3, 32]} />
          </mesh>
          <mesh material={mats.champagneBrass} position={[0, 0.16, 0]}>
            <torusGeometry args={[0.62, 0.02, 16, 32]} />
          </mesh>
        </group>

        {/* Dynamic Surface Reaction Shell (Illuminates when scan plane intersects core) */}
        <mesh ref={surfaceReactionRef} position={[0, 0, 0]}>
          <sphereGeometry args={[1.08, 36, 36]} />
          <meshStandardMaterial
            color="#D6B87D"
            emissive="#B49A68"
            emissiveIntensity={0.8}
            transparent
            opacity={0.3}
            roughness={0.2}
            metalness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* LAYER B — PRECISION ORBITAL STRUCTURES                    */}
      {/* ========================================================= */}

      {/* 1. Heavy Titanium Gimbal Ring */}
      <mesh ref={outerGimbalRef} material={mats.satinTitanium}>
        <torusGeometry args={[2.0, 0.05, 24, 64]} />
      </mesh>

      {/* 2. Champagne Brass Vernier Gauge Ring with Tick Marks */}
      <group ref={brassVernierRef} rotation={[Math.PI * 0.22, 0, 0]}>
        <mesh material={mats.champagneBrass}>
          <torusGeometry args={[1.72, 0.022, 16, 64]} />
        </mesh>
        {/* Vernier scale graduation tick marks */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const r = 1.72;
          return (
            <mesh
              key={`tick-${i}`}
              geometry={tickGeom}
              material={mats.champagneBrass}
              position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}
              rotation={[0, 0, angle]}
            />
          );
        })}
      </group>

      {/* 3. 180° Segmented Optical Sensor Track & Mobile Carriage */}
      <group ref={sensorArcRef} rotation={[0, Math.PI / 4, 0]}>
        {/* Semi-circular slotted arc */}
        <mesh material={mats.deepGraphite}>
          <torusGeometry args={[2.45, 0.035, 16, 48, Math.PI]} />
        </mesh>
        {/* Brass track liner */}
        <mesh material={mats.champagneBrass}>
          <torusGeometry args={[2.45, 0.012, 12, 48, Math.PI]} />
        </mesh>
        {/* Sliding Sensor Carriage Head */}
        <mesh ref={sensorCarriageRef} material={mats.champagneBrass}>
          <boxGeometry args={[0.18, 0.1, 0.14]} />
        </mesh>
      </group>

      {/* 4. Fine Technical Alignment Linework (Crosshair Axes) */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                -2.3, 0, 0,   2.3, 0, 0,
                0, -2.3, 0,   0, 2.3, 0,
                0, 0, -1.8,   0, 0, 1.8,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#B49A68" transparent opacity={0.16} />
      </lineSegments>

      {/* ========================================================= */}
      {/* LAYER C — 3D INSPECTION VOLUME & FIDUCIALS                */}
      {/* ========================================================= */}

      {/* 8 Corner Fiducial Crosshairs */}
      <lineSegments geometry={fiducialLines}>
        <lineBasicMaterial color="#B49A68" transparent opacity={0.35} />
      </lineSegments>

      {/* Translucent Floor Datum Circle */}
      <lineLoop geometry={datumPoints}>
        <lineBasicMaterial color="#B49A68" transparent opacity={0.15} />
      </lineLoop>

      {/* Ambient Depth Dust Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.024} color="#D6B87D" transparent opacity={0.3} sizeAttenuation />
      </points>

      {/* ========================================================= */}
      {/* LAYER D — ACTIVE OPTICAL SCANNING APPARATUS               */}
      {/* ========================================================= */}
      <group ref={scanPlaneRef}>
        {/* Intense Concentrated Scanning Laser Slit */}
        <mesh ref={scanLaserRef} material={mats.scanningLaser}>
          <boxGeometry args={[3.8, 0.018, 0.018]} />
        </mesh>

        {/* Translucent Volumetric Laser Fan / Plane */}
        <mesh material={mats.scanningGlow} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 0.8]} />
        </mesh>

        {/* Soft Trailing Glow Ribbon */}
        <mesh material={mats.scanningGlow} position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 0.4]} />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* LAYER E — PRECISION INSPECTION CALIBRATION MARKERS        */}
      {/* ========================================================= */}
      <group ref={markerGroupRef}>
        {/* Marker 1: Lens Apex Focus Node */}
        <mesh position={[0, 0, 1.15]} material={mats.markerMaterial}>
          <sphereGeometry args={[0.038, 12, 12]} />
        </mesh>
        {/* Marker 2: Equatorial Port Alpha */}
        <mesh position={[1.25, 0, 0]} material={mats.markerMaterial}>
          <octahedronGeometry args={[0.045, 0]} />
        </mesh>
        {/* Marker 3: Equatorial Port Beta */}
        <mesh position={[-1.25, 0, 0]} material={mats.markerMaterial}>
          <octahedronGeometry args={[0.045, 0]} />
        </mesh>
        {/* Marker 4: Vernier Index Flange */}
        <mesh position={[0, 1.76, 0]} material={mats.markerMaterial}>
          <sphereGeometry args={[0.032, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
};

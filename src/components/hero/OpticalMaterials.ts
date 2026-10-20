import * as THREE from 'three';

export interface OpticalMaterialPalette {
  satinTitanium: THREE.MeshStandardMaterial;
  brushedDarkMetal: THREE.MeshStandardMaterial;
  deepGraphite: THREE.MeshStandardMaterial;
  champagneBrass: THREE.MeshStandardMaterial;
  opticalGlass: THREE.MeshPhysicalMaterial;
  apertureBlades: THREE.MeshStandardMaterial;
  scanningLaser: THREE.MeshBasicMaterial;
  scanningGlow: THREE.MeshBasicMaterial;
  gridLine: THREE.LineBasicMaterial;
  markerMaterial: THREE.MeshStandardMaterial;
  accentSage: THREE.MeshStandardMaterial;
}

export function createOpticalMaterials(): OpticalMaterialPalette {
  const satinTitanium = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#384740'),
    metalness: 0.88,
    roughness: 0.28,
    envMapIntensity: 1.4,
  });

  const brushedDarkMetal = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1B2320'),
    metalness: 0.92,
    roughness: 0.35,
    envMapIntensity: 1.1,
  });

  const deepGraphite = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#181C1A'),
    metalness: 0.78,
    roughness: 0.45,
    envMapIntensity: 0.9,
  });

  const champagneBrass = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D6B87D'),
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 1.8,
  });

  const opticalGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#EBF4F0'),
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.84,
    thickness: 1.4,
    ior: 1.54,
    reflectivity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.9,
  });

  const apertureBlades = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#222B27'),
    metalness: 0.85,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });

  const scanningLaser = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#D6B87D'),
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const scanningGlow = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#B49A68'),
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const gridLine = new THREE.LineBasicMaterial({
    color: new THREE.Color('#B49A68'),
    transparent: true,
    opacity: 0.2,
  });

  const markerMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D6B87D'),
    emissive: new THREE.Color('#B49A68'),
    emissiveIntensity: 0.6,
    metalness: 0.9,
    roughness: 0.2,
  });

  const accentSage = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#A8B5A8'),
    metalness: 0.5,
    roughness: 0.4,
  });

  return {
    satinTitanium,
    brushedDarkMetal,
    deepGraphite,
    champagneBrass,
    opticalGlass,
    apertureBlades,
    scanningLaser,
    scanningGlow,
    gridLine,
    markerMaterial,
    accentSage,
  };
}

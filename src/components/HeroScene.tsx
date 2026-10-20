import React from 'react';
import { OpticalInspectionScene, OpticalEngineFallback } from './hero/OpticalInspectionScene';

export interface HeroSceneProps {
  isScanning?: boolean;
  scanProgress?: number;
}

export const HeroScene: React.FC<HeroSceneProps> = ({
  isScanning = false,
  scanProgress = 0,
}) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <OpticalInspectionScene
        scanState={isScanning ? 'scanning' : 'idle'}
        scanProgress={scanProgress}
      />
    </div>
  );
};

export { OpticalEngineFallback };

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Database, Play, CheckCircle, AlertTriangle, Download,
  ExternalLink, Layers, Sparkles, Cpu, Box, Scissors,
  Flame, Filter, Search, ShieldAlert, RefreshCw, Eye
} from 'lucide-react';
import { useToastStore } from '../store';
import { getEngineSettings } from '../engine';

// Helper to generate a realistic SVG canvas image data URL for preset datasets
function generateDatasetSVG(type: string, hasDefect: boolean): string {
  const width = 400;
  const height = 400;
  let inner = '';

  if (type === 'bottle') {
    inner = `
      <defs>
        <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#173F35" />
          <stop offset="50%" stop-color="#2D5A47" />
          <stop offset="100%" stop-color="#143028" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#202522"/>
      <!-- Bottle silhouette -->
      <path d="M175 40 L225 40 L225 90 L260 140 L260 360 L140 360 L140 140 L175 90 Z" fill="url(#bottleGrad)" stroke="#5AA584" stroke-width="2"/>
      <rect x="165" y="25" width="70" height="20" rx="3" fill="#B29A68"/>
      <rect x="150" y="180" width="100" height="90" rx="4" fill="#F5F2EA" stroke="#B29A68" stroke-width="1.5"/>
      <text x="200" y="222" font-family="Arial" font-size="11" font-weight="bold" fill="#202522" text-anchor="middle">NETRA RESERVE</text>
      <text x="200" y="240" font-family="Arial" font-size="8" fill="#666" text-anchor="middle">LOT #8402</text>
      ${
        hasDefect
          ? `<path d="M190 290 Q215 315 220 340" stroke="#FF4444" stroke-width="3.5" stroke-linecap="round"/>
             <circle cx="215" cy="330" r="5" fill="#FF5555" />`
          : `<line x1="160" y1="310" x2="240" y2="310" stroke="#5AA584" stroke-width="1" stroke-dasharray="2,2"/>`
      }
    `;
  } else if (type === 'metal' || type === 'metal_surface') {
    inner = `
      <rect width="100%" height="100%" fill="#202522"/>
      <rect x="40" y="40" width="320" height="320" rx="8" fill="#656D76" stroke="#8B949E" stroke-width="3"/>
      <!-- Machined concentric circles -->
      <circle cx="200" cy="200" r="120" fill="none" stroke="#7D8590" stroke-width="2" stroke-dasharray="6,4"/>
      <circle cx="200" cy="200" r="80" fill="none" stroke="#8B949E" stroke-width="2"/>
      <circle cx="200" cy="200" r="40" fill="#30363D" stroke="#8B949E" stroke-width="3"/>
      <circle cx="200" cy="200" r="15" fill="#161B22"/>
      <!-- Screw holes -->
      <circle cx="70" cy="70" r="10" fill="#161B22" stroke="#8B949E"/>
      <circle cx="330" cy="70" r="10" fill="#161B22" stroke="#8B949E"/>
      <circle cx="70" cy="330" r="10" fill="#161B22" stroke="#8B949E"/>
      <circle cx="330" cy="330" r="10" fill="#161B22" stroke="#8B949E"/>
      ${
        hasDefect
          ? `<path d="M140 120 L185 155 L170 175" stroke="#FF4D4D" stroke-width="3.5" stroke-linecap="round"/>
             <ellipse cx="250" cy="260" rx="14" ry="8" fill="#FF4444" opacity="0.85"/>`
          : ''
      }
    `;
  } else if (type === 'pcb') {
    inner = `
      <rect width="100%" height="100%" fill="#0D2818"/>
      <rect x="30" y="30" width="340" height="340" rx="6" fill="#14452F" stroke="#256D49" stroke-width="2"/>
      <!-- SMT Chip center -->
      <rect x="150" y="150" width="100" height="100" rx="4" fill="#1E1E1E" stroke="#555" stroke-width="1.5"/>
      <text x="200" y="205" font-family="monospace" font-size="11" fill="#B29A68" text-anchor="middle">STM32-ARM</text>
      <!-- Copper traces -->
      <path d="M50 80 H140 V160" stroke="#B29A68" stroke-width="3" fill="none"/>
      <path d="M50 110 H120 V180" stroke="#B29A68" stroke-width="3" fill="none"/>
      <path d="M260 160 V100 H350" stroke="#B29A68" stroke-width="3" fill="none"/>
      <path d="M260 190 V280 H350" stroke="#B29A68" stroke-width="3" fill="none"/>
      <path d="M170 260 V330 H100" stroke="#B29A68" stroke-width="3" fill="none"/>
      ${
        hasDefect
          ? `<line x1="140" y1="160" x2="160" y2="160" stroke="#FF3333" stroke-width="5" stroke-linecap="round"/>
             <circle cx="280" cy="190" r="12" fill="none" stroke="#FF3333" stroke-width="3" stroke-dasharray="3,2"/>`
          : ''
      }
    `;
  } else {
    // Textile
    inner = `
      <rect width="100%" height="100%" fill="#3A3845"/>
      <defs>
        <pattern id="weave" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 H20 M10 0 V20" stroke="#555263" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#weave)"/>
      <rect x="50" y="50" width="300" height="300" fill="none" stroke="#787A91" stroke-width="1" stroke-dasharray="4,4"/>
      ${
        hasDefect
          ? `<ellipse cx="210" cy="190" rx="35" ry="22" fill="#141115" opacity="0.85" filter="blur(2px)"/>
             <path d="M120 120 Q160 140 180 110" stroke="#FF5252" stroke-width="3" fill="none"/>`
          : ''
      }
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface DatasetItem {
  id: string;
  name: string;
  category: string;
  defectType: string;
  severity: 'low' | 'medium' | 'high';
  difficulty: 'Standard' | 'Challenging' | 'Edge Case';
  samplesCount: number;
  description: string;
  provenance: string;
  inspectionMethod: string;
  targetPreview: string;
  referencePreview: string;
  fileName: string;
}

const PRESET_DATASETS: DatasetItem[] = [
  {
    id: 'ds-bottle-01',
    name: 'PET / Glass Bottle Integrity Suite',
    category: 'bottle',
    defectType: 'Surface Fracture & Inclusions',
    severity: 'high',
    difficulty: 'Standard',
    samplesCount: 48,
    provenance: 'Calibrated Optical Standard (Synthetic Benchmark)',
    inspectionMethod: 'Laplacian Blur Precheck + Homography Difference',
    description: 'High-speed container sample with fracture crack and inclusion bubble.',
    targetPreview: '/samples/bottle_surface_defect.png',
    referencePreview: '/samples/bottle_golden_ref.png',
    fileName: 'bottle_surface_defect.png',
  },
  {
    id: 'ds-metal-02',
    name: 'Machined Aluminum Flange Anomaly Set',
    category: 'metal_surface',
    defectType: 'Radial Gouge, Porosity & Tooling Burrs',
    severity: 'medium',
    difficulty: 'Challenging',
    samplesCount: 64,
    provenance: 'Calibrated Optical Standard (Synthetic Benchmark)',
    inspectionMethod: 'CLAHE + ORB Registration + Multi-Operator Defect Classifier',
    description: 'CNC aerospace precision fitting with tooling burrs, radial gouge, and porosity pits.',
    targetPreview: '/samples/metal_surface_defect.png',
    referencePreview: '/samples/metal_golden_ref.png',
    fileName: 'metal_surface_defect.png',
  },
  {
    id: 'ds-pcb-03',
    name: 'SMT Electronic Assembly Defect Set',
    category: 'pcb',
    defectType: 'Solder Bridge & Trace Short',
    severity: 'high',
    difficulty: 'Edge Case',
    samplesCount: 82,
    provenance: 'Calibrated Optical Standard (Synthetic Benchmark)',
    inspectionMethod: 'Canny Topological Extraction + Contour Segmentation',
    description: 'High density circuit board sample with solder bridges and micro trace breaches.',
    targetPreview: '/samples/pcb_surface_defect.png',
    referencePreview: '/samples/pcb_golden_ref.png',
    fileName: 'pcb_surface_defect.png',
  },
  {
    id: 'ds-textile-04',
    name: 'Woven Technical Fabric Inspection',
    category: 'textile',
    defectType: 'Oil Infiltration & Fiber Snag',
    severity: 'low',
    difficulty: 'Challenging',
    samplesCount: 36,
    provenance: 'Calibrated Optical Standard (Synthetic Benchmark)',
    inspectionMethod: 'Texture Variance Map + Morphological Filter',
    description: 'Industrial synthetic fabric inspection sample detecting oil stains and loose wefts.',
    targetPreview: '/samples/textile_surface_defect.png',
    referencePreview: '/samples/textile_golden_ref.png',
    fileName: 'textile_surface_defect.png',
  },
];

// Robust dual-source dataset image component with automatic vector fallback & retry handler
const DatasetImageSlot: React.FC<{
  primarySrc: string;
  category: string;
  isDefect: boolean;
  alt: string;
  label: string;
  badgeBg: string;
}> = ({ primarySrc, category, isDefect, alt, label, badgeBg }) => {
  const [currentSrc, setCurrentSrc] = useState(primarySrc);
  const [loadError, setLoadError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const fallbackDataUri = generateDatasetSVG(category === 'metal_surface' ? 'metal' : category, isDefect);

  const handleImageError = () => {
    if (currentSrc !== fallbackDataUri) {
      setCurrentSrc(fallbackDataUri);
    } else {
      setLoadError(true);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    setLoadError(false);
    setCurrentSrc(`${primarySrc}?t=${Date.now()}`);
    setTimeout(() => setIsRetrying(false), 400);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#181B19',
        overflow: 'hidden',
      }}
    >
      {loadError ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12, textAlign: 'center' }}>
          <AlertTriangle size={20} color="var(--muted-brass)" style={{ marginBottom: 4 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Asset unavailable</span>
          <button
            type="button"
            onClick={handleRetry}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 10, padding: '2px 8px', color: '#FFF', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            <RefreshCw size={10} style={{ marginRight: 4 }} /> Retry
          </button>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          onError={handleImageError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: 10,
            opacity: isRetrying ? 0.4 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      <span
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: badgeBg,
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 4,
          letterSpacing: '0.04em',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [datasets, setDatasets] = useState<DatasetItem[]>(PRESET_DATASETS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Attempt fetching from backend dataset API
  useEffect(() => {
    const settings = getEngineSettings();
    if (settings.backendMode === 'fastapi') {
      setIsLoadingBackend(true);
      fetch(`${settings.backendUrl}/api/datasets`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('API returned non-200');
        })
        .then((data) => {
          if (data && Array.isArray(data.datasets) && data.datasets.length > 0) {
            setDatasets(data.datasets);
          }
        })
        .catch(() => {
          // Graceful fallback to built-in presets
          setDatasets(PRESET_DATASETS);
        })
        .finally(() => {
          setIsLoadingBackend(false);
        });
    }
  }, []);

  const filteredDatasets = datasets.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.defectType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const launchInspectionWithDataset = (dataset: DatasetItem) => {
    addToast({
      type: 'info',
      message: `Loading ${dataset.name} into the Adaptive Vision Agent...`,
    });

    navigate('/app/inspect', {
      state: {
        presetProductImage: dataset.targetPreview,
        presetReferenceImage: dataset.referencePreview,
        presetCategory: dataset.category,
        presetFileName: dataset.fileName,
        initialMode: 'upload',
      },
    });
  };

  const handleDownloadDataset = (dataset: DatasetItem) => {
    const manifest = {
      benchmarkId: dataset.id,
      name: dataset.name,
      category: dataset.category,
      defectType: dataset.defectType,
      difficulty: dataset.difficulty,
      samplesCount: dataset.samplesCount,
      targetImageUri: dataset.targetPreview,
      referenceImageUri: dataset.referencePreview,
      provenance: dataset.provenance,
      inspectionMethod: dataset.inspectionMethod,
      metadata: {
        resolution: '512x512',
        colorSpace: 'sRGB',
        groundTruthLabeled: true,
      },
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${dataset.id}_manifest.json`);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast({ type: 'success', message: `Downloaded benchmark package for ${dataset.name}` });
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-brass)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Optical Benchmark Suites
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--deep-charcoal)', letterSpacing: '-0.02em', margin: '4px 0 0 0' }}>
            Inspection Datasets & Samples
          </h1>
          <p style={{ fontSize: 14, color: 'var(--secondary-text)', marginTop: 4, margin: 0 }}>
            Standardized evaluation datasets, golden standard references, and one-click agent test suites.
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'var(--pure-white)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['all', 'bottle', 'metal_surface', 'pcb', 'textile'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{
                fontSize: 12,
                padding: '6px 14px',
                textTransform: 'capitalize',
                borderRadius: 20,
              }}
            >
              {cat === 'all' ? 'All Datasets' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ minWidth: 260 }}>
          <input
            type="text"
            placeholder="Search dataset or defect type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-grey)',
              fontSize: 13,
              background: 'var(--warm-ivory)',
              color: 'var(--deep-charcoal)',
            }}
          />
        </div>
      </div>

      {/* Datasets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {filteredDatasets.map((ds) => (
          <motion.div
            key={ds.id}
            whileHover={{ y: -3 }}
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              background: 'var(--pure-white)',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--border-grey)',
            }}
          >
            {/* Visual Previews Dual Box Side-by-Side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 210, position: 'relative' }}>
              <div style={{ position: 'relative', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                <DatasetImageSlot
                  primarySrc={ds.targetPreview}
                  category={ds.category}
                  isDefect={true}
                  alt={`Defective sample for ${ds.name} displaying ${ds.defectType}`}
                  label="Defective Sample"
                  badgeBg="rgba(186, 62, 52, 0.9)"
                />
              </div>
              <div style={{ position: 'relative' }}>
                <DatasetImageSlot
                  primarySrc={ds.referencePreview}
                  category={ds.category}
                  isDefect={false}
                  alt={`Golden standard reference for ${ds.name}`}
                  label="Golden Standard"
                  badgeBg="rgba(37, 120, 80, 0.9)"
                />
              </div>
            </div>

            {/* Details Content */}
            <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-brass)', textTransform: 'uppercase' }}>
                  {ds.category.replace('_', ' ')}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background:
                      ds.difficulty === 'Standard'
                        ? 'rgba(37, 120, 80, 0.1)'
                        : ds.difficulty === 'Challenging'
                        ? 'rgba(178, 130, 36, 0.12)'
                        : 'rgba(186, 62, 52, 0.1)',
                    color:
                      ds.difficulty === 'Standard'
                        ? 'var(--success)'
                        : ds.difficulty === 'Challenging'
                        ? 'var(--warning)'
                        : 'var(--error)',
                  }}
                >
                  {ds.difficulty}
                </span>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--deep-charcoal)', margin: '0 0 6px 0' }}>
                {ds.name}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--secondary-text)', lineHeight: 1.5, margin: '0 0 16px 0', flex: 1 }}>
                {ds.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px', background: 'var(--warm-ivory)', borderRadius: 8, marginBottom: 18, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--secondary-text)' }}>Defect Class:</span>
                  <strong style={{ color: 'var(--deep-charcoal)' }}>{ds.defectType}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--secondary-text)' }}>Provenance:</span>
                  <span style={{ color: 'var(--deep-charcoal)', fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{ds.provenance}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--secondary-text)' }}>Method:</span>
                  <span style={{ color: 'var(--forest-green)', fontWeight: 600 }}>{ds.inspectionMethod}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => launchInspectionWithDataset(ds)}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
                >
                  <Play size={14} fill="currentColor" />
                  Inspect With Agent
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDataset(ds)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Download dataset manifest"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DatasetsPage;

import React, { useState } from 'react';
import {
  Sliders, Cpu, Server, Database, Save, RotateCcw,
  CheckCircle, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import { useInspectionStore, useToastStore } from '../store';
import { Inspection, generateId } from '../types';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToastStore();
  const { inspections, addInspection } = useInspectionStore();

  // Engine thresholds state
  const [blurThreshold, setBlurThreshold] = useState(0.45);
  const [edgeThreshold, setEdgeThreshold] = useState(35);
  const [minAnomalyArea, setMinAnomalyArea] = useState(40);
  const [maxToolCalls, setMaxToolCalls] = useState(8);
  const [referralThreshold, setReferralThreshold] = useState(70);

  // Vision pipeline module toggles
  const [modules, setModules] = useState({
    qualityPrecheck: true,
    homographyAlignment: true,
    differenceHeatmap: true,
    contourExtraction: true,
    vlmSynthesis: true,
  });

  // Backend settings
  const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:8000');
  const [backendMode, setBackendMode] = useState<'client_engine' | 'fastapi'>('fastapi');
  const [isPinging, setIsPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'online' | 'offline'>('idle');

  // Load saved settings from localStorage on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('netradrishti-settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.blurThreshold !== undefined) setBlurThreshold(parsed.blurThreshold);
        if (parsed.edgeThreshold !== undefined) setEdgeThreshold(parsed.edgeThreshold);
        if (parsed.minAnomalyArea !== undefined) setMinAnomalyArea(parsed.minAnomalyArea);
        if (parsed.maxToolCalls !== undefined) setMaxToolCalls(parsed.maxToolCalls);
        if (parsed.referralThreshold !== undefined) setReferralThreshold(parsed.referralThreshold);
        if (parsed.modules) setModules(parsed.modules);
        if (parsed.backendUrl) setBackendUrl(parsed.backendUrl);
        if (parsed.backendMode) setBackendMode(parsed.backendMode);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handlePingBackend = async () => {
    setIsPinging(true);
    setPingStatus('idle');
    try {
      const response = await fetch(`${backendUrl}/health`, { method: 'GET', mode: 'cors' });
      if (response.ok) {
        setPingStatus('online');
        addToast({ type: 'success', message: 'FastAPI Backend connection verified!' });
      } else {
        setPingStatus('offline');
        addToast({ type: 'warning', message: 'Backend responded with an error status.' });
      }
    } catch {
      setPingStatus('offline');
      addToast({
        type: 'info',
        message: 'No external FastAPI server detected. Operating in High-Precision Client Canvas Engine mode.',
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem(
      'netradrishti-settings',
      JSON.stringify({
        blurThreshold,
        edgeThreshold,
        minAnomalyArea,
        maxToolCalls,
        referralThreshold,
        modules,
        backendUrl,
        backendMode,
      })
    );
    addToast({ type: 'success', message: 'Inspection parameters updated successfully.' });
  };

  const seedSampleData = () => {
    const demoItems: Inspection[] = [
      {
        id: generateId(),
        productCategory: 'bottle',
        inspectionProfile: 'standard',
        status: 'completed',
        productImageData: '',
        referenceImageData: null,
        fileName: 'Glass_Bottle_Lot42.png',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        completedAt: new Date(Date.now() - 3600000 * 2 + 1420).toISOString(),
        processingTime: 1420,
        result: {
          type: 'no_issue',
          summary: 'All optical checks passed. Uniform wall thickness, zero surface fractures, label aligned.',
          details: 'Standard bottle analysis completed in 4 tool steps.',
          suspiciousRegions: [],
          imageQuality: { score: 0.96, isAcceptable: true, blur: 0.12, brightness: 128, contrast: 0.82 },
          alignmentQuality: 0.98,
          toolsExecuted: 4,
          processingTime: 1420,
        },
        events: [
          {
            id: generateId(),
            toolName: 'image_quality_check',
            displayName: 'Image Quality Assessment',
            description: 'Analyzed sharpness and lighting',
            status: 'success',
            input: {},
            output: { score: 0.96 },
            reason: 'Verify image meets baseline standards before high-res anomaly evaluation',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 180,
          },
          {
            id: generateId(),
            toolName: 'edge_defect_detector',
            displayName: 'Edge Defect Detection',
            description: 'Canny edge gradient analysis',
            status: 'success',
            input: {},
            output: { defectsFound: 0 },
            reason: 'Check for fractures along silhouette perimeter',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 320,
          },
        ],
      },
      {
        id: generateId(),
        productCategory: 'pcb',
        inspectionProfile: 'detailed',
        status: 'review_required',
        productImageData: '',
        referenceImageData: null,
        fileName: 'SMT_Mainboard_V3.png',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        completedAt: new Date(Date.now() - 3600000 * 5 + 2340).toISOString(),
        processingTime: 2340,
        result: {
          type: 'suspicious_region',
          summary: 'Suspicious solder bridge detected between Pin 14 and Pin 15 of MCU.',
          details: 'High severity anomaly identified in trace channel #4.',
          suspiciousRegions: [
            {
              id: generateId(),
              boundingBox: { x: 142, y: 158, width: 26, height: 18 },
              area: 468,
              severity: 'high',
              description: 'Potential conductive bridge across capacitor leads.',
            },
          ],
          imageQuality: { score: 0.91, isAcceptable: true, blur: 0.18, brightness: 110, contrast: 0.74 },
          alignmentQuality: 0.94,
          toolsExecuted: 6,
          processingTime: 2340,
        },
        events: [],
      },
    ];

    demoItems.forEach((item) => addInspection(item));
    addToast({ type: 'success', message: 'Seeded 2 realistic sample inspections into historical logs!' });
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all inspection records? This action cannot be undone.')) {
      localStorage.removeItem('netradrishti-inspections');
      window.location.reload();
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            System Configuration
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '4px 0 0 0' }}>
            Engine Parameters & Settings
          </h1>
          <p style={{ fontSize: 14, color: 'var(--secondary-text)', marginTop: 4, margin: 0 }}>
            Fine-tune computer vision sensitivity, agent decision thresholds, and backend endpoints.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <Save size={15} />
          Save Preferences
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Section 1: Agent Decision & Thresholds */}
        <div className="card" style={{ padding: 24, background: 'var(--pure-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border-grey)', paddingBottom: 12 }}>
            <Sliders size={20} style={{ color: 'var(--amber-gold)' }} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                Vision Agent Decision Thresholds
              </h2>
              <div style={{ fontSize: 12, color: 'var(--secondary-text)' }}>
                Controls how the adaptive agent branches between follow-up tools and triggers escalations
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Blur Threshold */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Laplacian Blur Rejection</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--secondary-text)' }}>{blurThreshold}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={blurThreshold}
                onChange={(e) => setBlurThreshold(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--deep-black)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', marginTop: 4 }}>
                Images with blur higher than this value trigger automatic quality rejection.
              </div>
            </div>

            {/* Edge Threshold */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Edge Gradient Sensitivity</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--secondary-text)' }}>{edgeThreshold}</span>
              </div>
              <input
                type="range"
                min="15"
                max="80"
                step="5"
                value={edgeThreshold}
                onChange={(e) => setEdgeThreshold(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--deep-black)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', marginTop: 4 }}>
                Lower values detect fine hairline cracks; higher values reject texture noise.
              </div>
            </div>

            {/* Min Anomaly Area */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Min Anomaly Area</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--secondary-text)' }}>{minAnomalyArea} px²</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="10"
                value={minAnomalyArea}
                onChange={(e) => setMinAnomalyArea(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--deep-black)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', marginTop: 4 }}>
                Disregards clusters smaller than this pixel area to prevent dust false-positives.
              </div>
            </div>

            {/* Max Tool Calls */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Max Agent Tool Invocations</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--secondary-text)' }}>{maxToolCalls} tools</span>
              </div>
              <input
                type="range"
                min="4"
                max="12"
                step="1"
                value={maxToolCalls}
                onChange={(e) => setMaxToolCalls(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--deep-black)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--secondary-text)', marginTop: 4 }}>
                Upper bound for agent investigation depth before halting or escalating.
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Pipeline Modules */}
        <div className="card" style={{ padding: 24, background: 'var(--pure-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border-grey)', paddingBottom: 12 }}>
            <Cpu size={20} style={{ color: 'var(--amber-gold)' }} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                Active Vision Modules
              </h2>
              <div style={{ fontSize: 12, color: 'var(--secondary-text)' }}>
                Enable or disable specific computer vision sub-routines in the pipeline
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { key: 'qualityPrecheck', label: 'Image Quality Assessment', desc: 'Checks blur, underexposure, and contrast prior to anomaly search' },
              { key: 'homographyAlignment', label: 'Feature Alignment & Homography', desc: 'Auto-aligns target image to golden reference using keypoint matching' },
              { key: 'differenceHeatmap', label: 'Difference Heatmap Generation', desc: 'Calculates structural pixel difference maps against golden reference' },
              { key: 'contourExtraction', label: 'Contour Anomaly Extraction', desc: 'Detects connected components and isolates bounding coordinates' },
              { key: 'vlmSynthesis', label: 'Contextual Prompt Synthesis', desc: 'Generates human-readable engineering rationale and severity breakdown' },
            ].map((mod) => (
              <label
                key={mod.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid var(--border-grey)',
                  background: 'var(--warm-ivory)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={modules[mod.key as keyof typeof modules]}
                  onChange={(e) =>
                    setModules((prev) => ({ ...prev, [mod.key]: e.target.checked }))
                  }
                  style={{ marginTop: 3, accentColor: 'var(--deep-black)', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{mod.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--secondary-text)', marginTop: 2 }}>{mod.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section 3: Backend & Computation Engine */}
        <div className="card" style={{ padding: 24, background: 'var(--pure-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border-grey)', paddingBottom: 12 }}>
            <Server size={20} style={{ color: 'var(--amber-gold)' }} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                Compute Backend & API Gateway
              </h2>
              <div style={{ fontSize: 12, color: 'var(--secondary-text)' }}>
                Configure local OpenCV FastAPI integration or embedded Web Worker engine
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                Engine Execution Mode
              </label>
              <select
                value={backendMode}
                onChange={(e) => setBackendMode(e.target.value as 'client_engine' | 'fastapi')}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-grey)',
                  fontSize: 13,
                  background: 'var(--warm-ivory)',
                  color: 'var(--charcoal)',
                }}
              >
                <option value="client_engine">Autonomous Canvas & Web Engine (Built-in Demo)</option>
                <option value="fastapi">External Python FastAPI Backend (OpenCV Native)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                FastAPI Host URL
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="http://127.0.0.1:8000"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-grey)',
                    fontSize: 13,
                    background: 'var(--warm-ivory)',
                    color: 'var(--charcoal)',
                  }}
                />
                <button
                  onClick={handlePingBackend}
                  disabled={isPinging}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  <RefreshCw size={13} className={isPinging ? 'animate-spin' : ''} />
                  Test Ping
                </button>
              </div>
            </div>
          </div>

          {pingStatus !== 'idle' && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: pingStatus === 'online' ? 'rgba(46,125,50,0.1)' : 'rgba(239,108,0,0.1)',
                color: pingStatus === 'online' ? '#2E7D32' : '#D97706',
              }}
            >
              {pingStatus === 'online' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>
                {pingStatus === 'online'
                  ? 'FastAPI server is reachable and ready for real-time OpenCV inference.'
                  : 'FastAPI server not detected at specified URL. Using built-in high-fidelity canvas simulation.'}
              </span>
            </div>
          )}
        </div>

        {/* Section 4: Data Management */}
        <div className="card" style={{ padding: 24, background: 'var(--pure-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border-grey)', paddingBottom: 12 }}>
            <Database size={20} style={{ color: 'var(--amber-gold)' }} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                Data Management & Diagnostics
              </h2>
              <div style={{ fontSize: 12, color: 'var(--secondary-text)' }}>
                Demo data seeding, inspection history purge, and memory storage
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>
                Local Store: {inspections.length} recorded inspections
              </div>
              <div style={{ fontSize: 12, color: 'var(--secondary-text)', marginTop: 2 }}>
                Persistent client storage with real-time analytics aggregation.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={seedSampleData}
                className="btn btn-secondary"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Zap size={14} />
                Seed Sample Inspections
              </button>
              <button
                onClick={handleClearHistory}
                className="btn btn-secondary"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error)' }}
              >
                <RotateCcw size={14} />
                Clear All Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;

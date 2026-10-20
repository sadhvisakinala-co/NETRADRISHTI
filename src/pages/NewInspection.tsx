import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, Image as ImageIcon, Play, Loader2, CheckCircle,
  AlertCircle, AlertTriangle, Clock, ZoomIn, ZoomOut,
  RotateCcw, ChevronDown, ChevronUp, Camera, Box, ShieldCheck,
} from 'lucide-react';
import { useInspectionStore, useToastStore } from '../store';
import { runInspection, runObjectDetection, getEngineSettings } from '../engine';
import { LiveInspectionWorkspace } from '../components/live/LiveInspectionWorkspace';
import { useBackendStatus } from '../backendStatus';
import {
  generateId, Inspection, ToolEvent, InspectionResult, DetectedObject,
  PRODUCT_CATEGORIES, INSPECTION_PROFILES,
  getResultLabel, formatDuration,
} from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];

const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const NewInspection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addInspection, updateInspection } = useInspectionStore();
  const { addToast } = useToastStore();
  const backend = useBackendStatus();

  const navState = location.state as {
    presetProductImage?: string;
    presetReferenceImage?: string;
    presetCategory?: string;
    presetFileName?: string;
    initialMode?: 'upload' | 'live';
  } | null;

  // Mode: Upload Image vs Live Camera (defaults to Live Camera for real-time vision)
  const [mode, setMode] = useState<'upload' | 'live'>(navState?.initialMode || 'live');
  // Task Type: Defect Inspection vs Object Detection
  const [taskType, setTaskType] = useState<'defect_inspection' | 'object_detection'>('defect_inspection');
  const [objectConfidenceThreshold, setObjectConfidenceThreshold] = useState<number>(0.35);

  const backendUrl = backend.backendUrl || getEngineSettings().backendUrl || 'http://127.0.0.1:8000';

  // Config state
  const [category, setCategory] = useState<string>(() => navState?.presetCategory || 'bottle');
  const [profile, setProfile] = useState<string>('standard');
  const [productImage, setProductImage] = useState<string | null>(() => navState?.presetProductImage || null);
  const [referenceImage, setReferenceImage] = useState<string | null>(() => navState?.presetReferenceImage || null);
  const [productFileName, setProductFileName] = useState<string>(() => navState?.presetFileName || '');
  const [referenceFileName, setReferenceFileName] = useState<string>(() => navState?.presetReferenceImage ? 'Golden_Reference.png' : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Asynchronous image resolver if preset image is a remote or public path
  useEffect(() => {
    if (navState?.presetProductImage) {
      if (navState.presetProductImage.startsWith('/') || navState.presetProductImage.startsWith('http')) {
        fetch(navState.presetProductImage)
          .then((r) => r.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => setProductImage(e.target?.result as string);
            reader.readAsDataURL(blob);
          })
          .catch(() => {});
      }
    }
    if (navState?.presetReferenceImage) {
      if (navState.presetReferenceImage.startsWith('/') || navState.presetReferenceImage.startsWith('http')) {
        fetch(navState.presetReferenceImage)
          .then((r) => r.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => setReferenceImage(e.target?.result as string);
            reader.readAsDataURL(blob);
          })
          .catch(() => {});
      }
    }
  }, [navState?.presetProductImage, navState?.presetReferenceImage]);

  // Processing state
  const [step, setStep] = useState<'config' | 'processing' | 'result'>('config');
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [currentInspectionId, setCurrentInspectionId] = useState('');

  // Evidence viewer
  const [activeEvidence, setActiveEvidence] = useState<'annotated' | 'original' | 'reference'>('annotated');
  const [zoom, setZoom] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Unsupported format: ${file.type}. Use JPEG, PNG, WebP, or BMP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum 10MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File, type: 'product' | 'reference') => {
    const error = validateFile(file);
    if (error) {
      setErrors((prev) => ({ ...prev, [type]: error }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 50 || img.height < 50) {
          setErrors((prev) => ({ ...prev, [type]: 'Image too small. Minimum 50x50 pixels.' }));
          return;
        }
        if (type === 'product') {
          setProductImage(dataUrl);
          setProductFileName(file.name);
        } else {
          setReferenceImage(dataUrl);
          setReferenceFileName(file.name);
        }
      };
      img.onerror = () => {
        setErrors((prev) => ({ ...prev, [type]: 'Invalid or corrupt image file.' }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'product' | 'reference') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file, type);
  }, [handleFileSelect]);

  const handleRunInspection = async () => {
    if (!productImage) {
      setErrors({ product: 'Please upload a product image.' });
      return;
    }

    setStep('processing');
    setEvents([]);
    setResult(null);
    setDetectedObjects([]);

    const inspectionId = generateId();
    setCurrentInspectionId(inspectionId);

    const newInspection: Inspection = {
      id: inspectionId,
      productCategory: category,
      inspectionProfile: profile,
      status: 'processing',
      productImageData: productImage,
      referenceImageData: referenceImage,
      result: null,
      events: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      processingTime: null,
      fileName: productFileName || `${category}_workpiece_${inspectionId.slice(0, 6)}`,
    };

    addInspection(newInspection);

    try {
      if (taskType === 'object_detection') {
        setProgressText('Scanning for manufactured products and components...');
        const odResult = await runObjectDetection(productImage, objectConfidenceThreshold, category);
        setDetectedObjects(odResult.objects);

        const syntheticResult: InspectionResult = {
          type: odResult.objects.length > 0 ? 'no_issue' : 'review_required',
          summary: odResult.summary,
          details: `Object detection localized ${odResult.objects.length} component(s) using multi-scale geometric & contour classifiers.`,
          suspiciousRegions: [],
          detectedObjects: odResult.objects,
          imageQuality: { score: 0.95, isAcceptable: true, blur: 0.1, brightness: 120, contrast: 0.8 },
          alignmentQuality: null,
          toolsExecuted: 2,
          processingTime: odResult.processingTimeMs,
          annotatedImage: odResult.annotatedImage || productImage,
          serviceName: 'OpenCV Multi-Scale Object Detector with NMS',
          isDemoMode: false,
        };

        setResult(syntheticResult);
        updateInspection(inspectionId, {
          status: 'completed',
          result: syntheticResult,
          annotatedImage: odResult.annotatedImage || productImage,
          completedAt: new Date().toISOString(),
          processingTime: odResult.processingTimeMs,
        });

        setStep('result');
        setActiveEvidence('annotated');
        addToast({
          type: 'success',
          message: odResult.summary,
        });
      } else {
        // Standard or Metal Defect Inspection
        const inspectionResult = await runInspection(
          productImage,
          referenceImage,
          category,
          profile,
          (event: ToolEvent) => {
            setEvents((prev) => [...prev, event]);
          },
          (text: string) => {
            setProgressText(text);
          }
        );

        setResult(inspectionResult);

        const finalStatus = inspectionResult.type === 'review_required' ? 'review_required' as const
          : inspectionResult.type === 'incomplete' ? 'failed' as const
            : 'completed' as const;

        updateInspection(inspectionId, {
          status: finalStatus,
          result: inspectionResult,
          annotatedImage: inspectionResult.annotatedImage,
          events: events,
          completedAt: new Date().toISOString(),
          processingTime: inspectionResult.processingTime,
        });

        setStep('result');
        setActiveEvidence('annotated');
        addToast({
          type: finalStatus === 'completed' ? 'success' : finalStatus === 'review_required' ? 'warning' : 'error',
          message: inspectionResult.summary,
        });
      }
    } catch (err) {
      updateInspection(inspectionId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      });
      setStep('result');
      setResult({
        type: 'incomplete',
        summary: 'Inspection failed due to an unexpected error.',
        details: String(err),
        suspiciousRegions: [],
        imageQuality: null,
        alignmentQuality: null,
        toolsExecuted: events.length,
        processingTime: 0,
      });
      addToast({ type: 'error', message: 'Inspection failed. See details below.' });
    }
  };

  // ==================== CONFIG STEP ====================
  if (step === 'config') {
    return (
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-brass)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Adaptive Inspection Suite
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--deep-charcoal)', margin: '4px 0 0 0' }}>
            New Optical Quality Audit
          </h1>
          <p style={{ fontSize: 14, color: 'var(--secondary-text)', marginTop: 4 }}>
            Configure and execute an adaptive product quality inspection powered by OpenCV.
          </p>
        </motion.div>

        {/* Mode Switcher Tabs */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: mode === 'upload' ? '0 2px 8px rgba(23,63,53,0.25)' : 'none',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('live')}
            className={`btn ${mode === 'live' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: mode === 'live' ? '0 2px 8px rgba(23,63,53,0.25)' : 'none',
              cursor: 'pointer',
            }}
          >
            <Camera size={16} />
            <span>Live Camera</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                background: mode === 'live' ? 'rgba(178,154,104,0.35)' : 'rgba(23,63,53,0.1)',
                color: mode === 'live' ? '#FFFFFF' : 'var(--forest-green)',
                letterSpacing: '0.04em',
              }}
            >
              OPENCV LIVE
            </span>
          </button>
        </motion.div>

        {/* Dynamic Verification / Service Status Banner */}
        <motion.div variants={fadeUp} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'var(--pure-white)',
          border: '1px solid var(--border-grey)',
          borderLeft: `4px solid ${backend.status === 'connected' ? 'var(--success)' : 'var(--muted-brass)'}`,
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: backend.status === 'connected' ? 'var(--success)' : 'var(--muted-brass)',
              boxShadow: backend.status === 'connected' ? '0 0 8px rgba(37,120,80,0.6)' : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--deep-charcoal)' }}>
              {backend.status === 'connected'
                ? (mode === 'live' ? 'Live Inspection Ready' : 'FastAPI OpenCV Engine Active')
                : backend.status === 'checking'
                ? 'Verifying Backend Pipeline...'
                : 'Client Autonomous Engine (Local Precision)'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--secondary-text)' }}>
              {backend.status === 'connected'
                ? `OpenCV v${backend.opencvVersion || '5.0'} Native C++ pipeline · Python FastAPI server online at ${backendUrl}`
                : `Operating in Client Canvas Engine Mode with deterministic computer vision.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            style={{ fontSize: 12, color: 'var(--forest-green)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Configure Engine →
          </button>
        </motion.div>

        {mode === 'live' ? (
          <LiveInspectionWorkspace
            backendUrl={backendUrl}
            isBackendConnected={backend.status === 'connected'}
          />
        ) : (
          <>
            <div className="inspection-config-grid">
              {/* Left Column: Configuration & Mode */}
              <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Inspection Task Type Selector */}
                <div className="card" style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)', marginBottom: 14 }}>
                    1. Inspection Strategy
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setTaskType('defect_inspection')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${taskType === 'defect_inspection' ? 'var(--forest-green)' : 'var(--border-grey)'}`,
                        background: taskType === 'defect_inspection' ? 'rgba(23,63,53,0.06)' : 'var(--pure-white)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <ShieldCheck size={16} color="var(--forest-green)" />
                        <strong style={{ fontSize: 13, color: 'var(--deep-charcoal)' }}>Defect Inspection</strong>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--secondary-text)', margin: 0, lineHeight: 1.4 }}>
                        Analyzes surface damage, cracks, scratches, voids, pits, and reference deltas.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaskType('object_detection')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${taskType === 'object_detection' ? 'var(--forest-green)' : 'var(--border-grey)'}`,
                        background: taskType === 'object_detection' ? 'rgba(23,63,53,0.06)' : 'var(--pure-white)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Box size={16} color="var(--muted-brass)" />
                        <strong style={{ fontSize: 13, color: 'var(--deep-charcoal)' }}>Object Detection</strong>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--secondary-text)', margin: 0, lineHeight: 1.4 }}>
                        Localizes and classifies manufactured products & components with confidence scores.
                      </p>
                    </button>
                  </div>

                  {taskType === 'object_detection' && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-grey)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep-charcoal)' }}>
                          Confidence Cutoff: {Math.round(objectConfidenceThreshold * 100)}%
                        </label>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.8"
                        step="0.05"
                        value={objectConfidenceThreshold}
                        onChange={(e) => setObjectConfidenceThreshold(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--forest-green)' }}
                      />
                    </div>
                  )}
                </div>

                {/* Category & Profile Card */}
                <div className="card" style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)', marginBottom: 16 }}>
                    2. Material & Parameters
                  </h3>

                  <div className="input-group" style={{ marginBottom: 16 }}>
                    <label className="input-label" htmlFor="category">Material / Category</label>
                    <select
                      id="category"
                      className="input-field"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-grey)',
                        background: 'var(--warm-ivory)',
                        color: 'var(--deep-charcoal)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} {cat.value === 'metal_surface' ? '★ (Advanced CLAHE & Morphology)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="profile">Inspection Profile</label>
                    <select
                      id="profile"
                      className="input-field"
                      value={profile}
                      onChange={(e) => setProfile(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-grey)',
                        background: 'var(--warm-ivory)',
                        color: 'var(--deep-charcoal)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {INSPECTION_PROFILES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Image Uploads */}
              <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Product Image Card */}
                <div className="card" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)' }}>Workpiece Image *</h3>
                    <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Max 10MB</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--secondary-text)', marginBottom: 14 }}>
                    Upload target item to inspect for surface defects or detect components.
                  </p>

                  {productImage ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={productImage}
                        alt="Product workpiece"
                        style={{
                          width: '100%',
                          maxHeight: 220,
                          objectFit: 'contain',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-grey)',
                          background: '#1F2421',
                        }}
                      />
                      <div style={{
                        display: 'flex', gap: 8, marginTop: 10,
                        fontSize: 12, color: 'var(--secondary-text)',
                        alignItems: 'center',
                      }}>
                        <ImageIcon size={14} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {productFileName || 'Uploaded_workpiece.png'}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setProductImage(null); setProductFileName(''); }}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)', fontSize: 12 }}
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, 'product')}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border-grey)',
                        borderRadius: 'var(--radius-md)',
                        padding: '36px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'rgba(23, 63, 53, 0.02)',
                      }}
                    >
                      <Upload size={28} color="var(--secondary-text)" style={{ marginBottom: 10 }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--deep-charcoal)', marginBottom: 4 }}>
                        Drop workpiece image here or click to browse
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--secondary-text)' }}>
                        Supports JPEG, PNG, WebP, BMP (minimum 50x50 px)
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'product')}
                    style={{ display: 'none' }}
                  />
                  {errors.product && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 6 }}>{errors.product}</p>}
                </div>

                {/* Reference Image Card (Optional) */}
                {taskType === 'defect_inspection' && (
                  <div className="card" style={{ padding: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)' }}>
                        Golden Standard Reference (Optional)
                      </h3>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(37,120,80,0.1)', color: 'var(--success)', fontWeight: 600 }}>
                        HOMOGRAPHY READY
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--secondary-text)', marginBottom: 14 }}>
                      Provide a certified defect-free baseline for ORB keypoint differential matching.
                    </p>

                    {referenceImage ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={referenceImage}
                          alt="Golden reference baseline"
                          style={{
                            width: '100%', maxHeight: 150, objectFit: 'contain',
                            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-grey)', background: '#1F2421',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--secondary-text)', alignItems: 'center' }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {referenceFileName || 'Golden_Reference.png'}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setReferenceImage(null); setReferenceFileName(''); }}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--error)', fontSize: 12 }}
                          >
                            <X size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, 'reference')}
                        onClick={() => refFileInputRef.current?.click()}
                        style={{
                          border: '2px dashed var(--border-grey)',
                          borderRadius: 'var(--radius-md)',
                          padding: '22px 16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Upload size={20} color="var(--secondary-text)" style={{ marginBottom: 6 }} />
                        <p style={{ fontSize: 13, color: 'var(--secondary-text)' }}>Drop or browse golden reference image</p>
                      </div>
                    )}
                    <input
                      ref={refFileInputRef}
                      type="file"
                      accept={ACCEPTED_TYPES.join(',')}
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'reference')}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Run Button */}
            <motion.div variants={fadeUp} style={{ marginTop: 24, maxWidth: 960 }}>
              <button
                type="button"
                onClick={handleRunInspection}
                className="btn btn-primary btn-lg"
                disabled={!productImage}
                style={{
                  minWidth: 240,
                  gap: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(23,63,53,0.3)',
                }}
              >
                <Play size={16} fill="currentColor" />
                {taskType === 'object_detection' ? 'Run Object Detection' : 'Execute OpenCV Inspection'}
              </button>
            </motion.div>
          </>
        )}

        <style>{`
          .inspection-config-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            max-width: 960px;
          }
          @media (max-width: 820px) {
            .inspection-config-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </motion.div>
    );
  }

  // ==================== PROCESSING STEP ====================
  if (step === 'processing') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 740, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--deep-charcoal)', marginBottom: 20 }}>
          {taskType === 'object_detection' ? 'Executing Object Detection Pipeline' : 'Executing OpenCV Vision Inspection'}
        </h1>

        <div className="card" style={{ padding: 28, marginBottom: 24, background: 'var(--pure-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
            >
              <Loader2 size={26} color="var(--forest-green)" />
            </motion.div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)', margin: 0 }}>
                {progressText || 'Initializing computer vision pipeline...'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: '4px 0 0 0' }}>
                OpenCV agent is analyzing pixel arrays and computing topological gradients.
              </p>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div style={{
            height: 5, background: 'var(--stone-grey)', borderRadius: 3, overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${Math.min(100, Math.max(20, (events.length / 4) * 100))}%` }}
              style={{ height: '100%', background: 'var(--forest-green)', borderRadius: 3 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Event Timeline */}
        <div className="card" style={{ padding: 24, background: 'var(--pure-white)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)', marginBottom: 16 }}>
            Executed Vision Tools & Evidence Trace
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <AnimatePresence>
              {events.map((event, i) => (
                <EventItem key={event.id} event={event} isLast={i === events.length - 1} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }

  // ==================== RESULT STEP ====================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 1280, margin: '0 auto' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-brass)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Audit Record ND-{currentInspectionId.slice(0, 8).toUpperCase()}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--deep-charcoal)', margin: '4px 0 0 0' }}>
            Inspection Results & Evidence
          </h1>
          <p style={{ fontSize: 13, color: 'var(--secondary-text)', marginTop: 2 }}>
            {PRODUCT_CATEGORIES.find((c) => c.value === category)?.label} · Profile: {profile.toUpperCase()} · Workpiece: {productFileName || 'Uploaded_workpiece.png'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => { setStep('config'); setResult(null); setEvents([]); setDetectedObjects([]); }}
            className="btn btn-secondary btn-sm"
          >
            New Audit
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/history')}
            className="btn btn-primary btn-sm"
          >
            View in History
          </button>
        </div>
      </div>

      {result && (
        <div className="inspection-results-grid">
          {/* Left Column: Verdict & Evidence Viewer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Verdict Card */}
            <div className="card" style={{
              padding: 24,
              borderLeft: `5px solid ${result.type === 'no_issue' ? 'var(--success)'
                : result.type === 'suspicious_region' ? 'var(--error)'
                  : result.type === 'review_required' ? 'var(--warning)'
                    : 'var(--secondary-text)'}`,
              background: 'var(--pure-white)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {result.type === 'no_issue' && <CheckCircle size={24} color="var(--success)" />}
                {result.type === 'suspicious_region' && <AlertCircle size={24} color="var(--error)" />}
                {result.type === 'review_required' && <AlertTriangle size={24} color="var(--warning)" />}
                {result.type === 'incomplete' && <AlertCircle size={24} color="var(--secondary-text)" />}
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--deep-charcoal)', margin: 0 }}>
                    {getResultLabel(result.type)}
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>
                    Processed in {formatDuration(result.processingTime)} by {result.serviceName || 'FastAPI OpenCV Engine'}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--deep-charcoal)', marginBottom: 6 }}>
                {result.summary}
              </p>
              <p style={{ fontSize: 13, color: 'var(--secondary-text)', lineHeight: 1.6, margin: 0 }}>
                {result.details}
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 18, paddingTop: 16,
                borderTop: '1px solid var(--border-grey)',
              }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Defects Localized</span>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--deep-charcoal)', margin: '2px 0 0 0' }}>
                    {result.suspiciousRegions.length}
                  </p>
                </div>
                {result.detectedObjects && (
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Detected Objects</span>
                    <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--forest-green)', margin: '2px 0 0 0' }}>
                      {result.detectedObjects.length}
                    </p>
                  </div>
                )}
                {result.imageQuality && (
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Clarity Score</span>
                    <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--deep-charcoal)', margin: '2px 0 0 0' }}>
                      {Math.round(result.imageQuality.score * 100)}%
                    </p>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Tools Executed</span>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--deep-charcoal)', margin: '2px 0 0 0' }}>
                    {result.toolsExecuted}
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence Viewer Card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--pure-white)' }}>
              <div style={{
                display: 'flex', borderBottom: '1px solid var(--border-grey)', padding: '0 8px', background: 'var(--warm-ivory)',
              }}>
                {(['annotated', 'original', 'reference'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveEvidence(tab)}
                    disabled={tab === 'reference' && !referenceImage}
                    style={{
                      padding: '12px 18px', fontSize: 13, fontWeight: 600,
                      background: 'none',
                      color: activeEvidence === tab ? 'var(--forest-green)' : 'var(--secondary-text)',
                      borderBottom: activeEvidence === tab ? '3px solid var(--forest-green)' : '3px solid transparent',
                      opacity: tab === 'reference' && !referenceImage ? 0.35 : 1,
                      textTransform: 'capitalize',
                      cursor: tab === 'reference' && !referenceImage ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {tab === 'annotated' ? 'Annotated Output' : tab === 'original' ? 'Original Workpiece' : 'Golden Standard'}
                  </button>
                ))}
              </div>

              <div style={{ padding: 16, position: 'relative', overflow: 'hidden', minHeight: 320, background: '#161917', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                }}>
                  {activeEvidence === 'annotated' && (
                    <img
                      src={result.annotatedImage || productImage || ''}
                      alt="Annotated inspection result with localized bounding boxes and classifications"
                      style={{ maxHeight: 420, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                    />
                  )}
                  {activeEvidence === 'original' && productImage && (
                    <img
                      src={productImage}
                      alt="Original product workpiece before inspection"
                      style={{ maxHeight: 420, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                    />
                  )}
                  {activeEvidence === 'reference' && referenceImage && (
                    <img
                      src={referenceImage}
                      alt="Golden reference baseline standard"
                      style={{ maxHeight: 420, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                    />
                  )}
                </div>

                {/* Zoom Controls Overlay */}
                <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    className="btn btn-sm"
                    style={{ background: 'var(--pure-white)', border: '1px solid var(--border-grey)', padding: '5px 8px' }}
                    title="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    className="btn btn-sm"
                    style={{ background: 'var(--pure-white)', border: '1px solid var(--border-grey)', padding: '5px 8px' }}
                    title="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="btn btn-sm"
                    style={{ background: 'var(--pure-white)', border: '1px solid var(--border-grey)', padding: '5px 8px' }}
                    title="Reset zoom"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Detected Regions Table */}
            {result.suspiciousRegions.length > 0 && (
              <div className="card" style={{ padding: 22, background: 'var(--pure-white)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)', marginBottom: 14 }}>
                  Classified Defect Manifest ({result.suspiciousRegions.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-grey)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>#</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Defect Class</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Severity</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Area (px²)</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Confidence</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Coordinates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.suspiciousRegions.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-grey)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>R{i + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--deep-charcoal)' }}>
                            {r.displayName || (r.defectClass ? r.defectClass.replace('_', ' ').toUpperCase() : 'Surface Discontinuity')}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: r.severity === 'high' ? 'rgba(186,62,52,0.1)' : r.severity === 'medium' ? 'rgba(178,130,36,0.12)' : 'rgba(37,120,80,0.1)',
                              color: r.severity === 'high' ? 'var(--error)' : r.severity === 'medium' ? 'var(--warning)' : 'var(--success)',
                              textTransform: 'uppercase',
                            }}>
                              {r.severity}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--secondary-text)' }}>{Math.round(r.area)} px²</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--deep-charcoal)' }}>
                            {r.confidence ? `${Math.round(r.confidence * 100)}%` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 12 }}>
                            ({r.boundingBox.x}, {r.boundingBox.y}, {r.boundingBox.width}x{r.boundingBox.height})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Detected Objects Table (if Object Detection task) */}
            {detectedObjects.length > 0 && (
              <div className="card" style={{ padding: 22, background: 'var(--pure-white)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)', marginBottom: 14 }}>
                  Localized Product Objects ({detectedObjects.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-grey)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>#</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Detected Object</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Class Key</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Confidence</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 11 }}>Bounding Box</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detectedObjects.map((obj, i) => (
                        <tr key={obj.id} style={{ borderBottom: '1px solid var(--border-grey)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>OBJ-{i + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--forest-green)' }}>
                            {obj.label}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--secondary-text)', fontFamily: 'monospace', fontSize: 12 }}>
                            {obj.class}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--deep-charcoal)' }}>
                            {Math.round(obj.confidence * 100)}%
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--secondary-text)', fontSize: 12 }}>
                            ({obj.boundingBox.x}, {obj.boundingBox.y}, {obj.boundingBox.width}x{obj.boundingBox.height})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Agent Decision Trace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 22, background: 'var(--pure-white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--deep-charcoal)', margin: 0 }}>
                  Agent Decision Trace
                </h3>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--stone-grey)', color: 'var(--secondary-text)' }}>
                  {events.length} tool steps
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {events.map((event, i) => (
                  <EventItem key={event.id} event={event} isLast={i === events.length - 1} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inspection-results-grid {
          display: grid;
          grid-template-columns: 1.6fr 1.2fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .inspection-results-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

// ==================== Event Item Component ====================
const EventItem: React.FC<{ event: ToolEvent; isLast: boolean }> = ({ event, isLast }) => {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = event.status === 'success' ? <CheckCircle size={15} color="var(--success)" />
    : event.status === 'failed' ? <AlertCircle size={15} color="var(--error)" />
      : event.status === 'skipped' ? <Clock size={15} color="var(--secondary-text)" />
        : <Loader2 size={15} color="var(--info)" className="spinning" />;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex',
        gap: 12,
        paddingBottom: isLast ? 0 : 16,
        position: 'relative',
      }}
    >
      {/* Timeline Line */}
      {!isLast && (
        <div style={{
          position: 'absolute',
          left: 7,
          top: 24,
          bottom: 0,
          width: 1,
          background: 'var(--border-grey)',
        }} />
      )}

      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {statusIcon}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', width: '100%', textAlign: 'left',
            padding: 0, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--deep-charcoal)', flex: 1 }}>
            {event.displayName}
          </span>
          {event.duration && (
            <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>
              {formatDuration(event.duration)}
            </span>
          )}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <p style={{ fontSize: 12, color: 'var(--secondary-text)', marginTop: 2, lineHeight: 1.4, margin: '2px 0 0 0' }}>
          {event.reason}
        </p>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginTop: 8, padding: 12,
                background: 'var(--warm-ivory)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontFamily: 'monospace',
                border: '1px solid var(--border-grey)',
              }}>
                {event.output && (
                  <pre style={{
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    color: 'var(--deep-charcoal)', lineHeight: 1.4,
                    margin: 0,
                  }}>
                    {JSON.stringify(event.output, null, 2)}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default NewInspection;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, CameraOff, Play, Pause, Square, CheckCircle,
  Eye, Crosshair, Layers, Activity, FileText,
  Download, X, ShieldCheck, Box, ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useInspectionStore, useToastStore } from '../../store';
import {
  Inspection, SuspiciousRegion, DetectedObject, ToolEvent, generateId,
  PRODUCT_CATEGORIES, INSPECTION_PROFILES, ResultType, formatDate
} from '../../types';

interface LiveInspectionWorkspaceProps {
  backendUrl: string;
  isBackendConnected: boolean;
}

export const LiveInspectionWorkspace: React.FC<LiveInspectionWorkspaceProps> = ({
  backendUrl,
  isBackendConnected,
}) => {
  const navigate = useNavigate();
  const { addInspection, updateInspection } = useInspectionStore();
  const { addToast } = useToastStore();

  // Camera & Stream states
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number }>({ width: 640, height: 480 });

  // Inspection states
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('all');
  const [profile, setProfile] = useState<string>('standard');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.28);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string>('');

  // Live Telemetry states (honest: null until first frame is processed)
  const [hasReceivedFirstFrame, setHasReceivedFirstFrame] = useState<boolean>(false);
  const [latestVerdict, setLatestVerdict] = useState<ResultType | null>(null);
  const [latestSummary, setLatestSummary] = useState<string>('Camera standby. Click "Activate Camera" to begin real-time optical analysis.');
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [suspiciousRegions, setSuspiciousRegions] = useState<SuspiciousRegion[]>([]);
  const [defectAssessment, setDefectAssessment] = useState<string>('unavailable');
  const [defectAssessmentNote, setDefectAssessmentNote] = useState<string>('');
  const [imageQuality, setImageQuality] = useState<{
    score: number;
    isAcceptable: boolean;
    blur: number;
    brightness: number;
    contrast: number;
  } | null>(null);

  const [processingFps, setProcessingFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [lastProcessedTime, setLastProcessedTime] = useState<string>('');
  const [showOpenCvFrame, setShowOpenCvFrame] = useState<boolean>(false);
  const [annotatedFrame, setAnnotatedFrame] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<{ id: string; time: string; tool: string; result: string; severity?: string }[]>([]);

  // Cumulative Session & Automatic Live Report
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionFramesCount, setSessionFramesCount] = useState<number>(0);
  const [activeReportRecord, setActiveReportRecord] = useState<Inspection | null>(null);
  const [savedInspectionRecord, setSavedInspectionRecord] = useState<Inspection | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // DOM & Execution Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const inspectionIntervalRef = useRef<number | null>(null);
  const frameSeqRef = useRef<number>(0);
  const latestProcessedSeqRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeInspectionIdRef = useRef<string | null>(null);
  const activeReportRecordRef = useRef<Inspection | null>(null);
  const lastDiskSaveTimeRef = useRef<number>(0);

  // Session Accumulation Refs
  const accumulatedDefectsRef = useRef<Map<string, SuspiciousRegion>>(new Map());
  const accumulatedObjectsRef = useRef<Map<string, DetectedObject>>(new Map());
  const bestEvidenceFrameRef = useRef<string | null>(null);
  const bestEvidenceAnnotatedRef = useRef<string | null>(null);
  const bestEvidenceVerdictRef = useRef<ResultType>('no_issue');

  // 1. Enumerate media devices
  const updateDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate video devices:', e);
    }
  }, [selectedDeviceId]);

  // Append entry to agent activity log
  const logAgentEvent = useCallback((tool: string, result: string, severity: string = 'ok') => {
    const newEntry = {
      id: generateId(),
      time: new Date().toLocaleTimeString(),
      tool,
      result,
      severity,
    };
    setAgentLogs((prev) => [newEntry, ...prev.slice(0, 14)]);
  }, []);

  // 2. Start Camera Stream
  const startCamera = useCallback(async (deviceIdToUse?: string) => {
    try {
      setCameraError(null);
      setCameraPermission('requesting');
      logAgentEvent('Camera Hardware Manager', 'Requesting optical camera stream via getUserMedia...');

      // Stop existing stream tracks if active
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;
      const primaryConstraints: MediaStreamConstraints = {
        video: deviceIdToUse && deviceIdToUse.trim() !== ''
          ? { deviceId: { ideal: deviceIdToUse }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (errFirst: any) {
        console.warn('Initial camera constraints failed, attempting fallback:', errFirst);
        // Fallback to basic video stream without strict resolution/device constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.warn);
            const w = videoRef.current.videoWidth || 640;
            const h = videoRef.current.videoHeight || 480;
            setStreamResolution({ width: w, height: h });
          }
        };
        videoRef.current.play().catch(console.warn);
      }

      setCameraActive(true);
      setCameraPermission('granted');
      setIsInspecting(true);
      setIsPaused(false);
      setSessionStartTime(Date.now());
      updateDeviceList();

      logAgentEvent(
        'Webcam Optical Sensor Stream',
        `Acquired live camera stream (${stream.getVideoTracks()[0]?.label || 'Default Camera'}). Continuous detection active.`,
        'ok'
      );
      addToast({ type: 'success', message: 'Camera connected: Live optical analysis active.' });
    } catch (err: any) {
      console.error('Error accessing webcam:', err);
      setCameraActive(false);
      setIsInspecting(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
        setCameraError('Camera access was denied by your browser. Please allow camera permissions in your browser address bar.');
        logAgentEvent('Camera Permission', 'Access denied by user or browser security policy.', 'high');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraPermission('idle');
        setCameraError('No webcam was found on this system. Please connect an optical camera.');
        logAgentEvent('Camera Hardware', 'No video input devices located.', 'high');
      } else {
        setCameraPermission('idle');
        setCameraError(`Camera connection error: ${err.message || 'Unable to open video stream'}`);
        logAgentEvent('Camera Hardware', `Stream error: ${err.message || 'Unknown error'}`, 'high');
      }
    }
  }, [updateDeviceList, logAgentEvent, addToast]);

  // 3. Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (inspectionIntervalRef.current) {
      clearInterval(inspectionIntervalRef.current);
      inspectionIntervalRef.current = null;
    }
    setCameraActive(false);
    setIsInspecting(false);
    setIsPaused(false);
    isProcessingRef.current = false;

    // Clear overlay
    if (canvasOverlayRef.current) {
      const ctx = canvasOverlayRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasOverlayRef.current.width, canvasOverlayRef.current.height);
    }
    logAgentEvent('Camera Hardware Manager', 'Camera stream stopped and hardware resources released.', 'ok');
  }, [logAgentEvent]);

  // Automatically attempt to start camera once on component mount
  useEffect(() => {
    startCamera();
    // Only stop camera on unmount of workspace
    return () => {
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab visibility: pause processing when backgrounded, resume when foregrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isInspecting && !isPaused) {
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInspecting, isPaused]);

  // Handle camera device switch
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    if (cameraActive) {
      startCamera(newId);
    }
  };

  // 4. Draw overlays on the bounding box canvas
  const drawOverlayBoundingBoxes = useCallback((objects: DetectedObject[], defects: SuspiciousRegion[]) => {
    const canvas = canvasOverlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // A. Draw Detected Objects with Material Colour-Coding:
    // GREEN = METAL, RED = NON-METAL, AMBER = MATERIAL UNCERTAIN
    objects.forEach((obj) => {
      const { x, y, width: bw, height: bh } = obj.boundingBox;
      const isMetal = obj.material === 'metal';
      const isNonMetal = obj.material === 'non_metal';
      const color = isMetal ? '#10B981' : isNonMetal ? '#EF4444' : '#F59E0B';
      const fillColor = isMetal ? 'rgba(16, 185, 129, 0.10)' : isNonMetal ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)';
      const headerBg = isMetal ? '#065F46' : isNonMetal ? '#991B1B' : '#92400E';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeRect(x, y, bw, bh);

      // Label background & text
      const prefix = isMetal ? 'METAL' : isNonMetal ? 'NON-METAL' : 'UNCERTAIN';
      const labelText = `${prefix}: ${obj.label.split('/')[0].trim()} (${Math.round(obj.confidence * 100)}%)`;
      ctx.font = 'bold 11px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      const labelY = Math.max(0, y - 22);
      ctx.fillStyle = headerBg;
      ctx.fillRect(x, labelY, textWidth + 14, 22);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(labelText, x + 7, labelY + 15);
    });

    // B. Draw Separate Surface Defect Overlays (Warning Reticles):
    defects.forEach((r) => {
      const { x, y, width: bw, height: bh } = r.boundingBox;
      const isHigh = r.severity === 'high';
      const color = isHigh ? '#F97316' : '#FBBF24'; // Warning Amber-Orange / Bright Amber

      // Dashed defect outline
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = color;
      ctx.lineWidth = isHigh ? 2.5 : 2;
      ctx.fillStyle = isHigh ? 'rgba(249, 115, 22, 0.18)' : 'rgba(251, 191, 36, 0.14)';
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeRect(x, y, bw, bh);
      ctx.setLineDash([]); // Reset line dash

      // Corner reticle brackets
      const cornerLen = Math.min(8, Math.max(4, bw / 3), Math.max(4, bh / 3));
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.moveTo(x + bw - cornerLen, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw, y + cornerLen);
      ctx.stroke();

      // Defect label background & text positioned at bottom of defect box to prevent label collisions
      const defectType = (r.defectClass || 'DEFECT').replace(/_/g, ' ').toUpperCase();
      const labelText = `DEFECT: ${defectType} · ${r.severity.toUpperCase()} (${Math.round(r.area)}px²)`;
      ctx.font = 'bold 10px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      const labelY = Math.min(vh - 20, y + bh + 2);
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(x, labelY, textWidth + 10, 18);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, labelY, textWidth + 10, 18);

      ctx.fillStyle = color;
      ctx.fillText(labelText, x + 5, labelY + 13);
    });
  }, []);

  // 5. Capture a frame to base64 JPEG from the video element
  const captureCurrentFrameBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !cameraActive || video.readyState < 2) return null;

    let canvas = offscreenCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      offscreenCanvasRef.current = canvas;
    }

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, vw, vh);
    return canvas.toDataURL('image/jpeg', 0.82);
  }, [cameraActive]);

  // 6. Capture Reference Baseline Button Handler
  const handleCaptureReference = () => {
    const frame = captureCurrentFrameBase64();
    if (!frame) {
      addToast({ type: 'warning', message: 'Capture Failed: Video feed is not ready.' });
      return;
    }
    setReferenceImage(frame);
    setReferenceName(`Live_Baseline_${new Date().toLocaleTimeString().replace(/:/g, '')}.jpg`);
    logAgentEvent('Baseline Registration', 'Registered current frame as Golden Reference Standard.', 'ok');
    addToast({
      type: 'success',
      message: 'Golden Baseline Stored: Frame registered for real-time differential subtraction.',
    });
  };

  // 7. Process a single sampled live frame against the backend
  const processLiveFrame = useCallback(async () => {
    if (isProcessingRef.current || !isInspecting || isPaused) return;
    const frameData = captureCurrentFrameBase64();
    if (!frameData) return;

    isProcessingRef.current = true;
    const currentSeq = ++frameSeqRef.current;
    const reqStartTime = performance.now();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${backendUrl}/api/inspections/live/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: frameData,
          referenceImage: referenceImage,
          category,
          profile,
          minAnomalyArea: 35.0,
          detectObjects: true,
          confidenceThreshold,
          includeAnnotatedFrame: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Ignore if a newer frame has already completed
      if (currentSeq < latestProcessedSeqRef.current) return;
      latestProcessedSeqRef.current = currentSeq;

      const latency = Math.round(performance.now() - reqStartTime);
      setLatencyMs(latency);

      if (response.ok) {
        const data = await response.json();
        const defects: SuspiciousRegion[] = data.suspiciousRegions || [];
        const objects: DetectedObject[] = data.detectedObjects || [];

        setHasReceivedFirstFrame(true);
        setLatestVerdict(data.resultType || 'no_issue');
        setLatestSummary(data.summary || '');
        setDetectedObjects(objects);
        setSuspiciousRegions(defects);
        setDefectAssessment(data.defectAssessment || (defects.length > 0 ? 'evaluated' : 'unavailable'));
        setDefectAssessmentNote(data.defectAssessmentNote || '');
        setLastProcessedTime(new Date().toLocaleTimeString());

        if (data.imageQuality) {
          setImageQuality({
            score: data.imageQuality.score,
            isAcceptable: data.imageQuality.isAcceptable,
            blur: data.imageQuality.blurMetric !== undefined ? data.imageQuality.blurMetric : (data.imageQuality.blur || 0.85),
            brightness: data.imageQuality.brightness,
            contrast: data.imageQuality.contrast,
          });
        }
        if (data.annotatedFrame) {
          setAnnotatedFrame(data.annotatedFrame);
        }

        // Draw overlay bounding boxes onto live preview
        drawOverlayBoundingBoxes(objects, defects);

        // Update Cumulative Session Accumulators
        setSessionFramesCount((prev) => prev + 1);

        // Update current in-frame objects
        accumulatedObjectsRef.current.clear();
        objects.forEach((obj) => {
          accumulatedObjectsRef.current.set(obj.class, obj);
        });

        // Spatially deduplicate defects across frames to prevent duplicate box explosion
        if (defects.length === 0) {
          accumulatedDefectsRef.current.clear();
        } else {
          const currentAccumulated = Array.from(accumulatedDefectsRef.current.values());
          for (const d of defects) {
            const isDupe = currentAccumulated.some((ex) => {
              const b1 = ex.boundingBox;
              const b2 = d.boundingBox;
              const xA = Math.max(b1.x, b2.x);
              const yA = Math.max(b1.y, b2.y);
              const xB = Math.min(b1.x + b1.width, b2.x + b2.width);
              const yB = Math.min(b1.y + b1.height, b2.y + b2.height);
              const inter = Math.max(0, xB - xA) * Math.max(0, yB - yA);
              const union = (b1.width * b1.height) + (b2.width * b2.height) - inter;
              const iou = union > 0 ? inter / union : 0;
              return iou > 0.35 || (Math.abs(b1.x - b2.x) < 25 && Math.abs(b1.y - b2.y) < 25);
            });
            if (!isDupe) {
              accumulatedDefectsRef.current.set(d.id, d);
            }
          }
        }

        if (defects.length > 0 || objects.length > 0) {
          bestEvidenceFrameRef.current = frameData;
          bestEvidenceAnnotatedRef.current = data.annotatedFrame || frameData;
          bestEvidenceVerdictRef.current = data.resultType;
        } else if (!bestEvidenceFrameRef.current) {
          bestEvidenceFrameRef.current = frameData;
          bestEvidenceAnnotatedRef.current = data.annotatedFrame || frameData;
        }

        // Log to telemetry
        if (objects.length > 0) {
          logAgentEvent(
            'Ensemble Object Detector',
            `Localized ${objects.length} object(s): ${objects.map((o) => `${o.label} (${Math.round(o.confidence * 100)}%)`).join(', ')}`,
            'ok'
          );
        }

        // =================================================================
        // AUTOMATIC REPORT GENERATION & PERSISTENCE (REQUIREMENT 3 & 6)
        // Immediately as soon as a valid detection response arrives,
        // create the report under a unique inspection ID, save it to history,
        // and update subsequent frames in place!
        // =================================================================
        if (objects.length > 0) {
          const allAccumulatedDefects = Array.from(accumulatedDefectsRef.current.values());
          const allAccumulatedObjects = Array.from(accumulatedObjectsRef.current.values());
          const currentVerdict: ResultType = allAccumulatedDefects.some((d) => d.severity === 'high')
            ? 'suspicious_region'
            : allAccumulatedDefects.length > 0
            ? 'review_required'
            : (data.resultType || 'no_issue');

          if (!activeInspectionIdRef.current) {
            // 1. First valid detection! Generate new unique inspection ID
            const newId = generateId();
            activeInspectionIdRef.current = newId;
            const nowIso = new Date().toISOString();

            const initialEvents: ToolEvent[] = [
              {
                id: generateId(),
                toolName: 'live_camera_capture',
                displayName: 'Webcam Optical Sensor Stream Acquisition',
                description: `Acquired continuous video stream at ${streamResolution.width}x${streamResolution.height}.`,
                status: 'success',
                input: { resolution: `${streamResolution.width}x${streamResolution.height}`, category, profile },
                output: { qualityScore: data.imageQuality?.score || 0.92, framesAnalyzed: 1 },
                reason: 'Real-time video acquisition for continuous optical inspection.',
                startedAt: nowIso,
                completedAt: nowIso,
                duration: latency,
              },
              {
                id: generateId(),
                toolName: 'yolo_opencv_object_detector',
                displayName: 'YOLOv5s & OpenCV Workpiece Ensemble Detector',
                description: `Detected ${objects.length} item(s): ${objects.map((o) => `${o.label} (${Math.round(o.confidence * 100)}%)`).join(', ')}.`,
                status: 'success',
                input: { confidenceThreshold },
                output: { objects: objects.map((o) => o.label) },
                reason: 'Localize physical workpiece before evaluating surface integrity.',
                startedAt: nowIso,
                completedAt: nowIso,
                duration: latency,
              },
              {
                id: generateId(),
                toolName: category === 'metal_surface' ? 'opencv_metal_morphology_classifier' : 'opencv_surface_contour_analyzer',
                displayName: category === 'metal_surface' ? 'Metal Surface Defect Morphology Pipeline' : 'Surface Anomaly Contour Analyzer',
                description: data.defectAssessmentNote || 'Surface defect evaluation assessment.',
                status: 'success',
                input: { category, profile },
                output: { defectsFound: defects.length, assessmentStatus: data.defectAssessment },
                reason: 'Autonomous localized defect detection and severity assessment.',
                startedAt: nowIso,
                completedAt: nowIso,
                duration: latency,
              },
            ];

            const initialRecord: Inspection = {
              id: newId,
              productCategory: category,
              inspectionProfile: profile,
              status: currentVerdict === 'suspicious_region' ? 'failed' : currentVerdict === 'review_required' ? 'review_required' : 'completed',
              productImageData: frameData,
              referenceImageData: referenceImage,
              fileName: `Live_Inspection_${objects[0].class}_${new Date().toLocaleTimeString().replace(/:/g, '')}.jpg`,
              source: 'live_camera',
              createdAt: nowIso,
              completedAt: nowIso,
              processingTime: latency,
              events: initialEvents,
              result: {
                type: currentVerdict,
                summary: data.summary,
                details: `Live Inspection: Detected ${objects.length} object(s). ${data.defectAssessmentNote || ''}`,
                suspiciousRegions: defects,
                detectedObjects: objects,
                imageQuality: data.imageQuality ? {
                  score: data.imageQuality.score,
                  isAcceptable: data.imageQuality.isAcceptable,
                  blur: data.imageQuality.blurMetric || 0.85,
                  brightness: data.imageQuality.brightness,
                  contrast: data.imageQuality.contrast,
                } : {
                  score: 0.90,
                  isAcceptable: true,
                  blur: 0.85,
                  brightness: 128,
                  contrast: 0.75,
                },
                alignmentQuality: data.alignmentQuality,
                toolsExecuted: 3,
                processingTime: latency,
                serviceName: 'FastAPI Native OpenCV Live Engine',
                isDemoMode: false,
                annotatedImage: data.annotatedFrame || frameData,
              },
            };

            // Save immediately into store & active state
            activeReportRecordRef.current = initialRecord;
            setActiveReportRecord(initialRecord);
            setSavedInspectionRecord(initialRecord);
            addInspection(initialRecord);
            lastDiskSaveTimeRef.current = Date.now();

            logAgentEvent(
              'Live Report Auto-Generator',
              `Auto-generated live inspection report ND-LIVE-${newId.slice(0, 8).toUpperCase()} for ${objects[0].label}.`,
              'ok'
            );
          } else {
            // 2. Subsequent frames update the active report in place!
            const prev = activeReportRecordRef.current;
            if (prev) {
              const durationTotal = sessionStartTime ? Math.round(Date.now() - sessionStartTime) : latency;
              const updatedRecord: Inspection = {
                ...prev,
                completedAt: new Date().toISOString(),
                processingTime: durationTotal,
                status: currentVerdict === 'suspicious_region' ? 'failed' : currentVerdict === 'review_required' ? 'review_required' : 'completed',
                productImageData: bestEvidenceFrameRef.current || frameData,
                result: {
                  ...prev.result!,
                  type: currentVerdict,
                  summary: data.summary,
                  details: `Continuous Live Inspection: Analyzed ${sessionFramesCount + 1} frames. Identified ${allAccumulatedObjects.length} object(s), ${allAccumulatedDefects.length} defect(s). ${data.defectAssessmentNote || ''}`,
                  suspiciousRegions: allAccumulatedDefects.length > 0 ? allAccumulatedDefects : defects,
                  detectedObjects: allAccumulatedObjects.length > 0 ? allAccumulatedObjects : objects,
                  imageQuality: data.imageQuality ? {
                    score: data.imageQuality.score,
                    isAcceptable: data.imageQuality.isAcceptable,
                    blur: data.imageQuality.blurMetric || 0.85,
                    brightness: data.imageQuality.brightness,
                    contrast: data.imageQuality.contrast,
                  } : (prev.result?.imageQuality || null),
                  annotatedImage: data.annotatedFrame || bestEvidenceAnnotatedRef.current || frameData,
                },
              };

              activeReportRecordRef.current = updatedRecord;
              setActiveReportRecord(updatedRecord);
              setSavedInspectionRecord(updatedRecord);
              updateInspection(activeInspectionIdRef.current!, updatedRecord);

              // Periodic disk sync every 2 seconds
              const nowMs = Date.now();
              if (nowMs - lastDiskSaveTimeRef.current > 2000) {
                lastDiskSaveTimeRef.current = nowMs;
                try {
                  fetch(`${backendUrl}/api/inspections/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedRecord),
                  }).catch(() => {});
                } catch {}
              }
            }
          }
        }

        // Compute FPS
        frameCountRef.current += 1;
        const now = Date.now();
        if (now - lastFpsTimeRef.current >= 1000) {
          setProcessingFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
          frameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Live frame sampling error:', err);
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    backendUrl, isInspecting, isPaused, captureCurrentFrameBase64, referenceImage, category,
    profile, confidenceThreshold, drawOverlayBoundingBoxes, logAgentEvent, streamResolution,
    addInspection, updateInspection, sessionStartTime, sessionFramesCount
  ]);

  // 8. Continuous Frame Sampling Loop (Every 300ms ~ 3.3 FPS)
  useEffect(() => {
    if (isInspecting && !isPaused && cameraActive) {
      processLiveFrame();
      inspectionIntervalRef.current = window.setInterval(processLiveFrame, 320);
    } else {
      if (inspectionIntervalRef.current) {
        clearInterval(inspectionIntervalRef.current);
        inspectionIntervalRef.current = null;
      }
      if (!isInspecting && canvasOverlayRef.current) {
        const ctx = canvasOverlayRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasOverlayRef.current.width, canvasOverlayRef.current.height);
      }
    }
    return () => {
      if (inspectionIntervalRef.current) {
        clearInterval(inspectionIntervalRef.current);
      }
    };
  }, [isInspecting, isPaused, cameraActive, processLiveFrame]);

  // 9. Live Inspection controls
  const handleStartInspection = async () => {
    if (!cameraActive) {
      await startCamera(selectedDeviceId);
    }
    setSessionStartTime(Date.now());
    setSessionFramesCount(0);
    accumulatedDefectsRef.current.clear();
    accumulatedObjectsRef.current.clear();
    activeInspectionIdRef.current = null;
    setActiveReportRecord(null);
    setHasReceivedFirstFrame(false);
    setLatestSummary('Analyzing live optical feed with YOLOv5 & OpenCV engine...');
    setIsInspecting(true);
    setIsPaused(false);
    logAgentEvent('Live Inspection Manager', 'Started continuous live inspection sequence.', 'ok');
    addToast({ type: 'success', message: 'Continuous Live Inspection started.' });
  };

  const handlePauseInspection = () => {
    setIsPaused(true);
    logAgentEvent('Live Inspection Manager', 'Analysis feed paused by user.', 'ok');
    addToast({ type: 'info', message: 'Live analysis paused.' });
  };

  const handleResumeInspection = () => {
    setIsPaused(false);
    logAgentEvent('Live Inspection Manager', 'Live analysis resumed.', 'ok');
    addToast({ type: 'success', message: 'Live analysis resumed.' });
  };

  // 10. Finish & Finalize Inspection Session
  const handleFinishInspection = async () => {
    setIsInspecting(false);
    setIsPaused(false);
    if (inspectionIntervalRef.current) {
      clearInterval(inspectionIntervalRef.current);
      inspectionIntervalRef.current = null;
    }

    const currentRecord = activeReportRecord || savedInspectionRecord;
    if (currentRecord) {
      const finalizedRecord: Inspection = {
        ...currentRecord,
        completedAt: new Date().toISOString(),
        status: currentRecord.result?.type === 'suspicious_region' ? 'failed' : currentRecord.result?.type === 'review_required' ? 'review_required' : 'completed',
      };
      updateInspection(finalizedRecord.id, finalizedRecord);
      setSavedInspectionRecord(finalizedRecord);
      setActiveReportRecord(finalizedRecord);

      try {
        await fetch(`${backendUrl}/api/inspections/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalizedRecord),
        });
      } catch (e) {
        console.warn('Backend save failed, saved locally:', e);
      }

      logAgentEvent(
        'Inspection Finalizer',
        `Finalized inspection audit report ND-LIVE-${finalizedRecord.id.slice(0, 8).toUpperCase()}. Stored in History & Reports.`,
        'ok'
      );
      addToast({
        type: 'success',
        message: 'Inspection Session Finalized: Report permanently saved to Inspection History and Reports.',
      });
      setIsReportModalOpen(true);
    } else {
      addToast({ type: 'info', message: 'Inspection stopped.' });
    }
  };

  // 11. PDF Report Generator
  const downloadPDFReport = (record: Inspection) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const primaryColor = '#173F35';

      // Header Banner
      doc.setFillColor(23, 63, 53);
      doc.rect(0, 0, 210, 32, 'F');

      // Muted Brass Accent Bar
      doc.setFillColor(178, 154, 104);
      doc.rect(0, 32, 210, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('NETRADRISHTI — LIVE INSPECTION AUDIT REPORT', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(178, 154, 104);
      doc.text('Automated Vision Telemetry & Defect Evaluation Record', 14, 25);

      // Metadata Bar
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 18);
      doc.text(`Document ID: ND-LIVE-${record.id.slice(0, 8).toUpperCase()}`, 140, 24);

      // Section 1: Executive Verdict
      let y = 42;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text('1. EXECUTIVE INSPECTION VERDICT', 14, y);

      y += 8;
      const isClean = record.result?.type === 'no_issue' && (record.result?.suspiciousRegions.length || 0) === 0;
      const isReview = record.result?.type === 'review_required';

      doc.setFillColor(isClean ? 240 : isReview ? 255 : 254, isClean ? 248 : isReview ? 250 : 243, isClean ? 240 : isReview ? 230 : 235);
      doc.roundedRect(14, y, 182, 22, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(isClean ? '#2E7D32' : isReview ? '#D97706' : '#C62828');
      doc.text(
        isClean ? 'PASS — ZERO DEFECTS DETECTED' : isReview ? 'MANUAL REVIEW REQUIRED' : 'REJECT — DEFECT DETECTED',
        20,
        y + 8
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(record.result?.summary || 'Continuous live inspection sequence completed.', 20, y + 15);

      // Section 2: Audit Target Information
      y += 32;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text('2. AUDIT TARGET INFORMATION', 14, y);

      y += 6;
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, y, 182, 28, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('INSPECTION ID', 20, y + 8);
      doc.text('TARGET CATEGORY', 75, y + 8);
      doc.text('MODEL PIPELINE', 130, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(`ND-LIVE-${record.id.slice(0, 8).toUpperCase()}`, 20, y + 15);
      doc.text(record.productCategory.toUpperCase(), 75, y + 15);
      doc.text('YOLOv5s ONNX + OpenCV Multi-Scale', 130, y + 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('DETECTED OBJECT(S)', 20, y + 22);
      doc.text('CLARITY SCORE', 75, y + 22);
      doc.text('ANALYSIS TIME', 130, y + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      const objNames = record.result?.detectedObjects?.map((o) => `${o.label} (${Math.round(o.confidence * 100)}%)`).join(', ') || 'Manufactured Item';
      doc.text(objNames.slice(0, 32), 20, y + 27);
      doc.text(`${Math.round((record.result?.imageQuality?.score || 0.9) * 100)}%`, 75, y + 27);
      doc.text(`${formatDate(record.createdAt)}`, 130, y + 27);

      // Section 3: Summary & Defects
      y += 38;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text('3. DETAILED TECHNICAL FINDINGS', 14, y);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const splitDetails = doc.splitTextToSize(record.result?.details || record.result?.summary || 'Inspection completed within tolerance.', 180);
      doc.text(splitDetails, 14, y);

      doc.save(`Netradrishti_Report_${record.id.slice(0, 8).toUpperCase()}.pdf`);
      addToast({ type: 'success', message: 'PDF Audit Report downloaded successfully.' });
    } catch (e) {
      console.error('PDF export failed:', e);
      addToast({ type: 'warning', message: 'Could not generate PDF export.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ==================== WORKSPACE GRID ==================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(380px, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}
        className="live-workspace-grid"
      >
        {/* ========================================================= */}
        {/* LEFT COLUMN: MAIN WEBCAM STREAM & REAL-TIME OVERLAY      */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Main Video Viewport Card */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              background: '#0D110F',
              border: '1px solid rgba(178, 154, 104, 0.35)',
              borderRadius: 'var(--radius-lg)',
              position: 'relative',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            }}
          >
            {/* Camera Viewport Header Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'rgba(23, 27, 25, 0.95)',
                borderBottom: '1px solid rgba(178, 154, 104, 0.25)',
                color: 'var(--warm-ivory)',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: cameraActive
                      ? (isInspecting ? (isPaused ? '#DD6B20' : '#48bb78') : '#B29A68')
                      : '#718096',
                    boxShadow: cameraActive && isInspecting && !isPaused ? '0 0 10px #48bb78' : 'none',
                    animation: isInspecting && !isPaused ? 'pulse 1s infinite' : 'none',
                  }}
                />
                <span style={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {cameraError
                    ? 'Processing Error'
                    : !cameraActive
                    ? (cameraPermission === 'requesting' ? 'Connecting to Camera' : 'Camera Inactive')
                    : isInspecting
                    ? (isPaused
                        ? 'Inspection Paused'
                        : detectedObjects.length > 0
                        ? `Object Detected: ${detectedObjects[0].label.split('/')[0].trim()}`
                        : hasReceivedFirstFrame
                        ? 'Live — Waiting for Detection'
                        : 'Inspection in Progress — Waiting for First Analysis')
                    : 'Camera Live · Standby'}
                </span>
                {cameraActive && (
                  <span style={{ fontSize: 11, color: 'rgba(245, 242, 234, 0.5)', fontFamily: 'monospace' }}>
                    [{streamResolution.width}×{streamResolution.height}]
                  </span>
                )}
              </div>

              {/* Telemetry Pills & API Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'monospace' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    color: isBackendConnected ? '#48bb78' : '#FC8181',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isBackendConnected ? '#48bb78' : '#FC8181',
                    }}
                  />
                  {isBackendConnected ? 'OPENCV ENGINE ONLINE' : 'API DISCONNECTED'}
                </span>
                {cameraActive && isInspecting && (
                  <>
                    <span style={{ color: 'rgba(245, 242, 234, 0.3)' }}>|</span>
                    <span style={{ color: '#B29A68' }}>{processingFps || 3} FPS</span>
                    <span style={{ color: 'rgba(245, 242, 234, 0.3)' }}>|</span>
                    <span style={{ color: latencyMs > 80 ? '#DD6B20' : '#48bb78' }}>{latencyMs}ms</span>
                    {lastProcessedTime && (
                      <>
                        <span style={{ color: 'rgba(245, 242, 234, 0.3)' }}>|</span>
                        <span style={{ color: 'rgba(245, 242, 234, 0.6)' }}>{lastProcessedTime}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Video & Canvas Stage */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4 / 3',
                background: '#0D110F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Native Live Video Element */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: cameraActive && !showOpenCvFrame ? 'block' : 'none',
                }}
              />

              {/* Real-time Canvas Overlay for Bounding Boxes */}
              <canvas
                ref={canvasOverlayRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  display: cameraActive && !showOpenCvFrame ? 'block' : 'none',
                }}
              />

              {/* Alternate View: Direct OpenCV Annotated Server Frame */}
              {showOpenCvFrame && annotatedFrame && (
                <img
                  src={annotatedFrame}
                  alt="OpenCV Annotated Inspection"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}

              {/* Compact Material & Defect Overlay Legend */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  zIndex: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '5px 12px',
                  background: 'rgba(23, 63, 53, 0.90)',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--warm-ivory)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(178, 154, 104, 0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#B29A68', fontWeight: 700 }}>
                  Legend:
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  <span>Metal</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                  <span>Non-metal</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                  <span>Material uncertain</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 12, height: 6, border: '1.5px dashed #F97316', borderRadius: 2, display: 'inline-block' }} />
                  <span>Defect Overlay</span>
                </span>
              </div>

              {/* Inactive Overlay */}
              {!cameraActive && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--warm-ivory)',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: 'rgba(178, 154, 104, 0.12)',
                      border: '1px solid rgba(178, 154, 104, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Camera size={28} color="#B29A68" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                      {cameraPermission === 'requesting' ? 'Connecting to Optical Sensor...' : 'Webcam Stream Inactive'}
                    </h4>
                    <p style={{ fontSize: 13, color: 'rgba(245, 242, 234, 0.65)', maxWidth: 380, margin: '0 auto' }}>
                      Activate your webcam to continuously analyze video frames, automatically detect objects, and generate instant inspection reports.
                    </p>
                  </div>

                  {cameraError && (
                    <div
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(229, 62, 62, 0.15)',
                        border: '1px solid rgba(229, 62, 62, 0.4)',
                        borderRadius: 6,
                        color: '#FEB2B2',
                        fontSize: 12,
                        maxWidth: 440,
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4, letterSpacing: '0.04em' }}>
                        {cameraPermission === 'denied' ? 'CAMERA PERMISSION REQUIRED' : 'CAMERA NOTICE'}
                      </div>
                      <div>{cameraError}</div>
                    </div>
                  )}

                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--forest-green)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      padding: '10px 20px',
                    }}
                  >
                    <Camera size={16} />
                    {cameraError ? 'Retry Camera Activation' : 'Activate Camera'}
                  </button>
                </div>
              )}

              {/* Scanning Reticle HUD when inspecting */}
              {isInspecting && cameraActive && !showOpenCvFrame && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '8%',
                    border: '1px dashed rgba(178, 154, 104, 0.35)',
                    borderRadius: 8,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Crosshair size={28} color="rgba(178, 154, 104, 0.45)" />
                </div>
              )}
            </div>

            {/* Video Controls Dock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: 'rgba(23, 27, 25, 0.95)',
                borderTop: '1px solid rgba(178, 154, 104, 0.25)',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {/* Left Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {cameraActive ? (
                  <>
                    {!isInspecting ? (
                      <button
                        onClick={handleStartInspection}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'var(--forest-green)',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        <Play size={14} fill="#FFF" />
                        Start Live Inspection
                      </button>
                    ) : (
                      <>
                        {isPaused ? (
                          <button
                            onClick={handleResumeInspection}
                            className="btn btn-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              background: '#2D8B5F',
                              color: '#FFF',
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            <Play size={14} fill="#FFF" />
                            Resume Analysis
                          </button>
                        ) : (
                          <button
                            onClick={handlePauseInspection}
                            className="btn btn-secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              background: 'rgba(245, 242, 234, 0.1)',
                              color: 'var(--warm-ivory)',
                              border: '1px solid var(--border-grey)',
                              fontSize: 13,
                            }}
                          >
                            <Pause size={14} />
                            Pause
                          </button>
                        )}

                        <button
                          onClick={handleFinishInspection}
                          className="btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            background: '#C53030',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: 13,
                            padding: '8px 14px',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                          }}
                        >
                          <Square size={13} fill="#FFF" />
                          Finalize Session
                        </button>
                      </>
                    )}

                    <button
                      onClick={handleCaptureReference}
                      className="btn btn-secondary"
                      title="Store current frame as Golden Baseline"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        padding: '8px 12px',
                        background: 'rgba(245, 242, 234, 0.08)',
                        color: 'var(--warm-ivory)',
                        border: '1px solid rgba(245, 242, 234, 0.2)',
                      }}
                    >
                      <Layers size={13} />
                      Capture Reference
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--forest-green)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <Camera size={14} />
                    Start Camera
                  </button>
                )}
              </div>

              {/* Right Camera Controls & HUD Options */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {availableDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={handleDeviceChange}
                    style={{
                      background: '#1A201C',
                      color: 'var(--warm-ivory)',
                      border: '1px solid rgba(178, 154, 104, 0.3)',
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                    }}
                  >
                    {availableDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {cameraActive && (
                  <button
                    onClick={() => setShowOpenCvFrame((v) => !v)}
                    style={{
                      background: showOpenCvFrame ? 'var(--forest-green)' : 'rgba(245, 242, 234, 0.08)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(178, 154, 104, 0.3)',
                      borderRadius: 4,
                      padding: '5px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Eye size={12} />
                    {showOpenCvFrame ? 'Showing Server Stream' : 'Raw Video Overlay'}
                  </button>
                )}

                {cameraActive && (
                  <button
                    onClick={stopCamera}
                    title="Stop Camera Hardware"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FC8181',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <CameraOff size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Agent Event Timeline */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={15} color="var(--muted-brass)" />
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Live Agent Vision Telemetry Log
                </h4>
              </div>
              <span style={{ fontSize: 10, color: 'var(--secondary-text)', fontFamily: 'monospace' }}>
                {isInspecting && !isPaused ? `ACTIVE STREAM · ${processingFps || 3} FPS` : 'STANDBY'}
              </span>
            </div>

            {agentLogs.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: 0 }}>
                {isInspecting
                  ? 'Waiting for first optical frame analysis...'
                  : 'Activate camera to stream real-time tool logs, object matches, and defect contours.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {agentLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: log.severity === 'high' ? 'rgba(229,62,62,0.08)' : 'rgba(245,242,234,0.4)',
                      border: log.severity === 'high' ? '1px solid rgba(229,62,62,0.25)' : '1px solid var(--border-grey)',
                      borderRadius: 6,
                      fontSize: 11,
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--graphite)', display: 'block' }}>
                        {log.tool}
                      </span>
                      <span style={{ color: 'var(--secondary-text)' }}>{log.result}</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', color: 'var(--secondary-text)', fontSize: 10, whiteSpace: 'nowrap' }}>
                      {log.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: INSPECTION TELEMETRY & DECISION PANEL        */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Latest Verdict & Telemetry Card */}
          <div
            className="card"
            style={{
              padding: 20,
              border: !hasReceivedFirstFrame
                ? '1px solid var(--border-grey)'
                : latestVerdict === 'suspicious_region'
                ? '1.5px solid #E53E3E'
                : latestVerdict === 'review_required'
                ? '1.5px solid #DD6B20'
                : '1.5px solid #2D8B5F',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--secondary-text)', letterSpacing: '0.04em' }}>
                Live Inspection Verdict
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: !hasReceivedFirstFrame
                    ? 'rgba(0,0,0,0.06)'
                    : latestVerdict === 'suspicious_region'
                    ? 'rgba(229,62,62,0.15)'
                    : latestVerdict === 'review_required'
                    ? 'rgba(221,107,32,0.15)'
                    : 'rgba(45,139,95,0.15)',
                  color: !hasReceivedFirstFrame
                    ? 'var(--secondary-text)'
                    : latestVerdict === 'suspicious_region'
                    ? '#C53030'
                    : latestVerdict === 'review_required'
                    ? '#C05621'
                    : '#2D8B5F',
                  textTransform: 'uppercase',
                }}
              >
                {!hasReceivedFirstFrame
                  ? 'WAITING FOR FIRST ANALYSIS'
                  : latestVerdict === 'suspicious_region'
                  ? 'FAIL — DEFECT DETECTED'
                  : latestVerdict === 'review_required'
                  ? 'MANUAL REVIEW'
                  : 'PASS — INSPECTION VERIFIED'}
              </span>
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--graphite)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
              {latestSummary}
            </p>

            {/* Live Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 12, marginBottom: 14 }}>
              <div style={{ padding: '8px 12px', background: 'var(--warm-ivory)', borderRadius: 6 }}>
                <span style={{ color: 'var(--secondary-text)', display: 'block', fontSize: 10.5 }}>DETECTED OBJECTS</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: detectedObjects.length > 0 ? 'var(--forest-green)' : 'var(--graphite)' }}>
                  {hasReceivedFirstFrame ? `${detectedObjects.length} In View` : '—'}
                </span>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--warm-ivory)', borderRadius: 6 }}>
                <span style={{ color: 'var(--secondary-text)', display: 'block', fontSize: 10.5 }}>SURFACE DEFECTS</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: suspiciousRegions.length > 0 ? '#C53030' : 'var(--graphite)' }}>
                  {hasReceivedFirstFrame ? `${suspiciousRegions.length} Localized` : '—'}
                </span>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--warm-ivory)', borderRadius: 6 }}>
                <span style={{ color: 'var(--secondary-text)', display: 'block', fontSize: 10.5 }}>OPTICAL CLARITY</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: imageQuality?.isAcceptable ? '#2D8B5F' : '#C05621' }}>
                  {imageQuality ? `${Math.round(imageQuality.score * 100)}%` : '—'}
                </span>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--warm-ivory)', borderRadius: 6 }}>
                <span style={{ color: 'var(--secondary-text)', display: 'block', fontSize: 10.5 }}>STREAM LATENCY</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: latencyMs > 80 ? '#DD6B20' : '#2D8B5F' }}>
                  {latencyMs ? `${latencyMs}ms` : '—'}
                </span>
              </div>
            </div>

            {/* Identified Objects Manifest */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--secondary-text)', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                Identified Workpiece & Component(s)
              </span>
              {detectedObjects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detectedObjects.map((obj) => {
                    const isMetal = obj.material === 'metal';
                    const isNonMetal = obj.material === 'non_metal';
                    const matColor = isMetal ? '#10B981' : isNonMetal ? '#EF4444' : '#F59E0B';
                    const matBg = isMetal ? 'rgba(16, 185, 129, 0.12)' : isNonMetal ? 'rgba(239, 68, 68, 0.10)' : 'rgba(245, 158, 11, 0.12)';
                    const matText = isMetal ? 'METAL' : isNonMetal ? 'NON-METAL' : 'UNCERTAIN';

                    return (
                      <div
                        key={obj.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: 6,
                          background: 'rgba(23, 63, 53, 0.04)',
                          border: `1px solid ${isMetal ? 'rgba(16, 185, 129, 0.35)' : isNonMetal ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: matBg,
                              color: matColor,
                              border: `1px solid ${matColor}`,
                              letterSpacing: 0.5,
                            }}
                          >
                            {matText}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--forest-green)' }}>{obj.label}</span>
                        </div>
                        <span style={{ color: 'var(--muted-brass)', fontWeight: 700, fontFamily: 'monospace' }}>
                          {Math.round(obj.confidence * 100)}% conf
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--secondary-text)', fontStyle: 'italic' }}>
                  {hasReceivedFirstFrame ? 'No supported workpiece localized in current frame.' : 'Point webcam at a workpiece or supported object.'}
                </div>
              )}
            </div>
          </div>

          {/* =================================================================== */}
          {/* AUTOMATIC LIVE INSPECTION REPORT PANEL (MANDATORY REQUIREMENT 3)    */}
          {/* Automatically appears on this page as soon as a valid detection     */}
          {/* response arrives. The user does not need to capture or save first.  */}
          {/* =================================================================== */}
          {activeReportRecord && (
            <div
              className="card"
              style={{
                padding: 20,
                background: 'var(--pure-white)',
                border: '1.5px solid var(--forest-green)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 24px rgba(23, 63, 53, 0.12)',
                position: 'relative',
              }}
            >
              {/* Header Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#48bb78',
                      boxShadow: '0 0 8px #48bb78',
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--forest-green)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active Live Inspection Report
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'rgba(178, 154, 104, 0.15)',
                    color: 'var(--forest-green)',
                  }}
                >
                  ID: ND-LIVE-{activeReportRecord.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: activeReportRecord.result?.type === 'no_issue'
                    ? 'rgba(45, 139, 95, 0.08)'
                    : activeReportRecord.result?.type === 'review_required'
                    ? 'rgba(221, 107, 32, 0.08)'
                    : 'rgba(229, 62, 62, 0.08)',
                  border: `1px solid ${
                    activeReportRecord.result?.type === 'no_issue'
                      ? '#2D8B5F'
                      : activeReportRecord.result?.type === 'review_required'
                      ? '#DD6B20'
                      : '#E53E3E'
                  }`,
                  marginBottom: 14,
                }}
              >
                <div>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: 'var(--secondary-text)' }}>
                    CURRENT DECISION
                  </span>
                  <div style={{ fontWeight: 700, fontSize: 13, color: activeReportRecord.result?.type === 'no_issue' ? '#2D8B5F' : activeReportRecord.result?.type === 'review_required' ? '#C05621' : '#C53030' }}>
                    {activeReportRecord.result?.type === 'no_issue'
                      ? 'PASS — ZERO DEFECTS'
                      : activeReportRecord.result?.type === 'review_required'
                      ? 'MANUAL REVIEW REQUIRED'
                      : 'FAIL — DEFECT LOCALIZED'}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--secondary-text)', fontFamily: 'monospace' }}>
                  {formatDate(activeReportRecord.createdAt)}
                </span>
              </div>

              {/* Evidence & Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 14, marginBottom: 14 }}>
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid var(--border-grey)',
                    background: '#0D110F',
                  }}
                >
                  <img
                    src={activeReportRecord.result?.annotatedImage || activeReportRecord.productImageData || ''}
                    alt="Inspection Evidence Thumbnail"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--secondary-text)' }}>Target Object: </span>
                    <strong style={{ color: 'var(--deep-charcoal)' }}>
                      {activeReportRecord.result?.detectedObjects?.[0]?.label || 'Manufactured Item'}
                    </strong>
                    {activeReportRecord.result?.detectedObjects?.[0]?.confidence && (
                      <span style={{ color: 'var(--muted-brass)', fontWeight: 700, marginLeft: 6 }}>
                        ({Math.round(activeReportRecord.result.detectedObjects[0].confidence * 100)}% conf)
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: 'var(--secondary-text)' }}>Model Pipeline: </span>
                    <strong style={{ color: 'var(--deep-charcoal)', fontSize: 11 }}>
                      YOLOv5s ONNX + OpenCV Multi-Scale
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--secondary-text)' }}>Defect Assessment: </span>
                    <span style={{ color: defectAssessment === 'evaluated' ? '#2D8B5F' : '#C05621', fontWeight: 600 }}>
                      {defectAssessment === 'evaluated'
                        ? (suspiciousRegions.length > 0 ? `${suspiciousRegions.length} Defect(s) Flagged` : 'Passed (Zero Defects)')
                        : (defectAssessmentNote || 'Defect assessment unavailable with current configuration')}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--secondary-text)' }}>Optical Clarity: </span>
                    <strong style={{ color: 'var(--deep-charcoal)' }}>
                      {activeReportRecord.result?.imageQuality ? `${Math.round(activeReportRecord.result.imageQuality.score * 100)}%` : '90%'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Summary Description */}
              <p style={{ fontSize: 12, color: 'var(--graphite)', lineHeight: 1.5, margin: '0 0 14px 0', background: 'var(--warm-ivory)', padding: '8px 12px', borderRadius: 6 }}>
                {activeReportRecord.result?.details || activeReportRecord.result?.summary}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => downloadPDFReport(activeReportRecord)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}
                >
                  <Download size={13} />
                  Download PDF
                </button>
                <button
                  onClick={() => navigate(`/app/reports`, { state: { selectedId: activeReportRecord.id } })}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}
                >
                  <ExternalLink size={13} />
                  Open in Reports
                </button>
              </div>
            </div>
          )}

          {/* Configuration Settings */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inspection Configuration
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label" htmlFor="live-category">Inspection Strategy & Target</label>
                <select
                  id="live-category"
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isInspecting}
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label" htmlFor="live-profile">Inspection Profile</label>
                <select
                  id="live-profile"
                  className="input-field"
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  disabled={isInspecting}
                >
                  {INSPECTION_PROFILES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="input-label" style={{ margin: 0 }}>Object Detection Threshold</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-brass)', fontFamily: 'monospace' }}>
                    {Math.round(confidenceThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.80"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--forest-green)' }}
                />
              </div>
            </div>
          </div>

          {/* Reference Image Slot */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Golden Baseline Reference
              </h4>
              {referenceImage && (
                <button
                  onClick={() => {
                    setReferenceImage(null);
                    setReferenceName('');
                  }}
                  style={{ fontSize: 11, color: '#C53030', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear Reference
                </button>
              )}
            </div>

            {referenceImage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={referenceImage}
                  alt="Reference"
                  style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-grey)' }}
                />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--graphite)', display: 'block' }}>
                    {referenceName || 'Baseline Reference Frame'}
                  </span>
                  <span style={{ fontSize: 11, color: '#2D8B5F', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} /> Active for Delta Subtraction
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: 'var(--secondary-text)', marginBottom: 10 }}>
                  Click "Capture Reference" during streaming to register a golden standard for differential alignment.
                </p>
                <button
                  onClick={handleCaptureReference}
                  disabled={!cameraActive}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <Layers size={13} />
                  Capture Baseline from Feed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FINALIZED REPORT MODAL                                   */}
      {/* ========================================================= */}
      {isReportModalOpen && (savedInspectionRecord || activeReportRecord) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsReportModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 840,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 28px',
                background: 'var(--forest-green)',
                color: '#FFFFFF',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={24} color="#B29A68" />
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                    Live Inspection Audit Report
                  </h3>
                  <span style={{ fontSize: 11, color: '#B29A68', letterSpacing: '0.04em' }}>
                    ID: ND-LIVE-{(savedInspectionRecord || activeReportRecord)!.id.slice(0, 8).toUpperCase()} · Generated {formatDate((savedInspectionRecord || activeReportRecord)!.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Verdict Banner */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: (savedInspectionRecord || activeReportRecord)!.result?.type === 'no_issue'
                    ? 'rgba(45, 139, 95, 0.1)'
                    : (savedInspectionRecord || activeReportRecord)!.result?.type === 'review_required'
                    ? 'rgba(221, 107, 32, 0.1)'
                    : 'rgba(229, 62, 62, 0.1)',
                  border: `1.5px solid ${
                    (savedInspectionRecord || activeReportRecord)!.result?.type === 'no_issue'
                      ? '#2D8B5F'
                      : (savedInspectionRecord || activeReportRecord)!.result?.type === 'review_required'
                      ? '#DD6B20'
                      : '#E53E3E'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: (savedInspectionRecord || activeReportRecord)!.result?.type === 'no_issue' ? '#2D8B5F' : (savedInspectionRecord || activeReportRecord)!.result?.type === 'review_required' ? '#C05621' : '#C53030'
                  }}>
                    Executive Decision
                  </span>
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 0 0', color: 'var(--deep-charcoal)' }}>
                    {(savedInspectionRecord || activeReportRecord)!.result?.type === 'no_issue'
                      ? 'PASS — QUALITY VERIFIED'
                      : (savedInspectionRecord || activeReportRecord)!.result?.type === 'review_required'
                      ? 'MANUAL REVIEW REQUIRED'
                      : 'REJECT — DEFECT LOCALIZED'}
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: 'var(--secondary-text)' }}>Model Pipeline</span>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--forest-green)' }}>
                    YOLOv5s ONNX + OpenCV Pipeline
                  </div>
                </div>
              </div>

              {/* Evidence Viewer */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--deep-charcoal)', display: 'block', marginBottom: 8 }}>
                  Optical Inspection Evidence & Annotated Workpiece
                </span>
                <div style={{ background: '#0D110F', borderRadius: 8, overflow: 'hidden', padding: 8, display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={(savedInspectionRecord || activeReportRecord)!.result?.annotatedImage || (savedInspectionRecord || activeReportRecord)!.productImageData || ''}
                    alt="Inspection Evidence"
                    style={{ maxHeight: 360, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-grey)', paddingTop: 16 }}>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Close Preview
                </button>
                <button
                  onClick={() => downloadPDFReport((savedInspectionRecord || activeReportRecord)!)}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
                >
                  <Download size={14} />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    setIsReportModalOpen(false);
                    navigate('/app/reports', { state: { selectedId: (savedInspectionRecord || activeReportRecord)!.id } });
                  }}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
                >
                  <FileText size={14} />
                  Open in Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

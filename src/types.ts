import { v4 as uuidv4 } from 'uuid';

// ==================== Enums ====================
export type InspectionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'review_required';
export type ResultType = 'no_issue' | 'suspicious_region' | 'review_required' | 'incomplete';
export type ToolStatus = 'running' | 'success' | 'failed' | 'skipped';

// ==================== Core Types ====================
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface InspectionConfig {
  productCategory: string;
  inspectionProfile: string;
  productImage: File | null;
  referenceImage: File | null;
  productImagePreview: string;
  referenceImagePreview: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SuspiciousRegion {
  id: string;
  boundingBox: BoundingBox;
  area: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  defectClass?: string;
  displayName?: string;
  confidence?: number;
  metrics?: Record<string, unknown>;
}

export type MaterialType = 'metal' | 'non_metal' | 'uncertain';

export interface DetectedObject {
  id: string;
  class: string;
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
  area: number;
  material?: MaterialType;
  materialLabel?: string;
  materialConfidence?: number;
  materialColor?: string;
}

export interface ToolEvent {
  id: string;
  toolName: string;
  displayName: string;
  description: string;
  status: ToolStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  reason: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

export interface InspectionResult {
  type: ResultType;
  summary: string;
  details: string;
  suspiciousRegions: SuspiciousRegion[];
  detectedObjects?: DetectedObject[];
  imageQuality: {
    score: number;
    isAcceptable: boolean;
    blur: number;
    brightness: number;
    contrast: number;
  } | null;
  alignmentQuality: number | null;
  toolsExecuted: number;
  processingTime: number;
  serviceName?: string;
  isDemoMode?: boolean;
  annotatedImage?: string;
  defectMask?: string;
  defectHeatmap?: string;
}

export interface Inspection {
  id: string;
  productCategory: string;
  inspectionProfile: string;
  status: InspectionStatus;
  productImageData: string;
  referenceImageData: string | null;
  result: InspectionResult | null;
  events: ToolEvent[];
  createdAt: string;
  completedAt: string | null;
  processingTime: number | null;
  fileName: string;
  source?: 'upload' | 'live_camera';
  annotatedImage?: string;
}

export interface DashboardStats {
  total: number;
  completed: number;
  reviewRequired: number;
  failed: number;
}

// ==================== Helper Functions ====================
export function generateId(): string {
  return uuidv4();
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function getStatusColor(status: InspectionStatus): string {
  switch (status) {
    case 'completed': return 'var(--success)';
    case 'processing': return 'var(--info)';
    case 'review_required': return 'var(--warning)';
    case 'failed': return 'var(--error)';
    default: return 'var(--secondary-text)';
  }
}

export function getStatusLabel(status: InspectionStatus): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'processing': return 'Processing';
    case 'review_required': return 'Review Required';
    case 'failed': return 'Failed';
    case 'pending': return 'Pending';
    default: return status;
  }
}

export function getResultLabel(type: ResultType): string {
  switch (type) {
    case 'no_issue': return 'No Suspicious Region Detected';
    case 'suspicious_region': return 'Suspicious Region Detected';
    case 'review_required': return 'Human Review Required';
    case 'incomplete': return 'Inspection Could Not Be Completed';
    default: return type;
  }
}

export const PRODUCT_CATEGORIES = [
  { value: 'all', label: 'All Supported Workpieces (Auto-Route)' },
  { value: 'bottle', label: 'Bottle / Container Inspection' },
  { value: 'metal_surface', label: 'Metal Surface (Scratches & Dents)' },
  { value: 'pcb', label: 'PCB / Electronic Assembly' },
  { value: 'textile', label: 'Textile / Fabric Swatch' },
];

export const INSPECTION_PROFILES = [
  { value: 'standard', label: 'Standard Inspection' },
  { value: 'detailed', label: 'Detailed Analysis' },
  { value: 'quick', label: 'Quick Check' },
];

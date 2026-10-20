import { create } from 'zustand';

export type BackendConnectionState = 'checking' | 'connected' | 'demo' | 'unavailable';

export interface BackendCapabilities {
  live_frame_inspection?: boolean;
  reference_alignment?: boolean;
  contour_extraction?: boolean;
  quality_precheck?: boolean;
  storage_persistence?: boolean;
}

export interface BackendStatusState {
  status: BackendConnectionState;
  backendUrl: string;
  opencvVersion: string | null;
  opencvLoaded: boolean;
  capabilities: BackendCapabilities;
  lastChecked: number | null;
  errorReason: string | null;
  isChecking: boolean;
  checkBackend: (urlOverride?: string) => Promise<void>;
  setBackendUrl: (url: string) => void;
}

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

export const useBackendStatus = create<BackendStatusState>((set, get) => ({
  status: 'checking',
  backendUrl: DEFAULT_BACKEND_URL,
  opencvVersion: null,
  opencvLoaded: false,
  capabilities: {},
  lastChecked: null,
  errorReason: null,
  isChecking: false,

  setBackendUrl: (url: string) => {
    set({ backendUrl: url });
    get().checkBackend(url);
  },

  checkBackend: async (urlOverride?: string) => {
    const url = urlOverride || get().backendUrl || DEFAULT_BACKEND_URL;
    set({ isChecking: true });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Probe /api/health first
      let res = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }).catch(() => null);

      // Fallback probe /health
      if (!res || !res.ok) {
        res = await fetch(`${url}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        }).catch(() => null);
      }

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        set({
          status: 'connected',
          opencvVersion: data.opencv_version || '5.0.0',
          opencvLoaded: !!data.opencv_available,
          capabilities: data.capabilities || {
            live_frame_inspection: true,
            reference_alignment: true,
            contour_extraction: true,
            quality_precheck: true,
          },
          lastChecked: Date.now(),
          errorReason: null,
          isChecking: false,
        });
        return;
      }

      set({
        status: 'demo',
        opencvVersion: null,
        opencvLoaded: false,
        capabilities: {},
        lastChecked: Date.now(),
        errorReason: `FastAPI backend responded with HTTP status ${res ? res.status : 'offline'}. Operating with Client Autonomous Vision Engine.`,
        isChecking: false,
      });
    } catch (err: any) {
      set({
        status: 'demo',
        opencvVersion: null,
        opencvLoaded: false,
        capabilities: {},
        lastChecked: Date.now(),
        errorReason: `FastAPI service unreachable at ${url}. Operating with Client Autonomous Vision Engine.`,
        isChecking: false,
      });
    }
  },
}));

// Run initial check automatically on application startup
if (typeof window !== 'undefined') {
  useBackendStatus.getState().checkBackend();
}

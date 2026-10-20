import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Inspection, InspectionStatus, generateId } from './types';

// ==================== Auth Store ====================
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        // Simulate API delay for demo mode
        await new Promise((r) => setTimeout(r, 800));

        // Demo mode validation
        if (!email || !password) {
          set({ isLoading: false, error: 'Please enter both email and password.' });
          return;
        }
        if (password.length < 6) {
          set({ isLoading: false, error: 'Invalid credentials.' });
          return;
        }

        const user: User = {
          id: generateId(),
          name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          email,
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      },

      signup: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        await new Promise((r) => setTimeout(r, 800));

        if (!name || !email || !password) {
          set({ isLoading: false, error: 'Please fill in all fields.' });
          return;
        }
        if (password.length < 8) {
          set({ isLoading: false, error: 'Password must be at least 8 characters.' });
          return;
        }

        const user: User = {
          id: generateId(),
          name,
          email,
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'netradrishti-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ==================== Inspection Store ====================
interface InspectionState {
  inspections: Inspection[];
  currentInspection: Inspection | null;
  isProcessing: boolean;
  addInspection: (inspection: Inspection) => void;
  updateInspection: (id: string, updates: Partial<Inspection>) => void;
  setCurrentInspection: (inspection: Inspection | null) => void;
  setProcessing: (processing: boolean) => void;
  getInspection: (id: string) => Inspection | undefined;
  getStats: () => { total: number; completed: number; reviewRequired: number; failed: number };
  syncWithBackend: (backendUrlOverride?: string) => Promise<void>;
  clearInspections: () => void;
}

export const useInspectionStore = create<InspectionState>()(
  persist(
    (set, get) => ({
      inspections: [],
      currentInspection: null,
      isProcessing: false,

      addInspection: (inspection) => {
        set((state) => ({
          inspections: [inspection, ...state.inspections.filter((i) => i.id !== inspection.id)],
          currentInspection: inspection,
        }));
        // Background disk persistence attempt
        try {
          fetch('http://127.0.0.1:8000/api/inspections/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inspection),
          }).catch(() => {});
        } catch {}
      },

      updateInspection: (id, updates) => {
        set((state) => {
          const updatedList = state.inspections.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          );
          const updatedCurrent =
            state.currentInspection?.id === id
              ? { ...state.currentInspection, ...updates }
              : state.currentInspection;

          if (updatedCurrent) {
            try {
              fetch('http://127.0.0.1:8000/api/inspections/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCurrent),
              }).catch(() => {});
            } catch {}
          }

          return {
            inspections: updatedList,
            currentInspection: updatedCurrent,
          };
        });
      },

      setCurrentInspection: (inspection) => set({ currentInspection: inspection }),
      setProcessing: (processing) => set({ isProcessing: processing }),
      getInspection: (id) => get().inspections.find((i) => i.id === id),

      getStats: () => {
        const inspections = get().inspections;
        return {
          total: inspections.length,
          completed: inspections.filter((i) => i.status === 'completed').length,
          reviewRequired: inspections.filter((i) => i.status === 'review_required').length,
          failed: inspections.filter((i) => i.status === 'failed').length,
        };
      },

      syncWithBackend: async (backendUrlOverride?: string) => {
        const url = backendUrlOverride || 'http://127.0.0.1:8000';
        try {
          const res = await fetch(`${url}/api/inspections`);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.inspections)) {
              set((state) => {
                const existingMap = new Map(state.inspections.map((i) => [i.id, i]));
                for (const backendRec of data.inspections) {
                  if (backendRec.id && !existingMap.has(backendRec.id)) {
                    existingMap.set(backendRec.id, {
                      id: backendRec.id,
                      productCategory: backendRec.productCategory || 'bottle',
                      inspectionProfile: backendRec.inspectionProfile || 'standard',
                      status: backendRec.status || 'completed',
                      productImageData: backendRec.result?.annotatedImage || backendRec.productImageData || '',
                      referenceImageData: backendRec.referenceImageData || null,
                      result: backendRec.result || null,
                      events: backendRec.events || [],
                      createdAt: backendRec.createdAt || new Date().toISOString(),
                      completedAt: backendRec.completedAt || backendRec.createdAt || null,
                      processingTime: backendRec.result?.processingTime || null,
                      fileName: backendRec.fileName || `${backendRec.productCategory || 'item'}_audit_${backendRec.id.slice(0, 6)}`,
                      source: backendRec.source || 'upload',
                      annotatedImage: backendRec.result?.annotatedImage || null,
                    });
                  }
                }
                const merged = Array.from(existingMap.values()).sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                return { inspections: merged };
              });
            }
          }
        } catch {}
      },

      clearInspections: () => set({ inspections: [], currentInspection: null }),
    }),
    {
      name: 'netradrishti-inspections',
      partialize: (state) => ({
        // Retain recent inspections with intact image references, without corrupting base64 data
        inspections: state.inspections.slice(0, 25).map((i) => ({
          ...i,
          // Only keep valid data if intact; do not truncate with substring which corrupts base64
          productImageData: i.productImageData || '',
          referenceImageData: i.referenceImageData || null,
          annotatedImage: i.annotatedImage || null,
        })),
      }),
    }
  )
);

// ==================== Toast Store ====================
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = generateId();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration || 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// ==================== UI Store ====================
interface UIState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}));

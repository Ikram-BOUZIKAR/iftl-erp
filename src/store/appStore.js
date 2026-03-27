import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAppStore = create(
  devtools((set) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    theme: localStorage.getItem('theme') || 'light',
    setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      set({ theme });
    },

    academicYear: localStorage.getItem('academicYear') || '2025-2026',
    setAcademicYear: (year) => {
      localStorage.setItem('academicYear', year);
      set({ academicYear: year });
    },

    notifications: [],
    addNotification: (notification) => set((state) => ({ notifications: [...state.notifications, { id: Date.now(), ...notification }] })),
    removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),

    activeModal: null,
    openModal: (modal) => set({ activeModal: modal }),
    closeModal: () => set({ activeModal: null }),

    filters: {
      students: { filiere: null, niveau: null, statut: null },
      candidatures: { statut: null }
    },
    setFilters: (section, filters) =>
      set((state) => ({
        filters: {
          ...state.filters,
          [section]: filters
        }
      }))
  }))
);

export const useUserStore = create(
  devtools((set) => ({
    user: null,
    setUser: (user) => set({ user }),
    clearUser: () => set({ user: null }),

    preferences: {
      language: 'fr',
      notifications: true,
      emailNotifications: true
    },
    setPreferences: (prefs) => set((state) => ({ preferences: { ...state.preferences, ...prefs } }))
  }))
);

export const useDataStore = create(
  devtools((set) => ({
    students: [],
    setStudents: (students) => set({ students }),
    addStudent: (student) => set((state) => ({ students: [...state.students, student] })),
    updateStudent: (id, updates) =>
      set((state) => ({ students: state.students.map((s) => (s.id === id ? { ...s, ...updates } : s)) })),
    deleteStudent: (id) => set((state) => ({ students: state.students.filter((s) => s.id !== id) })),

    intervenants: [],
    setIntervenants: (intervenants) => set({ intervenants }),
    addIntervenant: (intervenant) => set((state) => ({ intervenants: [...state.intervenants, intervenant] })),

    edt: [],
    setEDT: (edt) => set({ edt }),
    addEDTEntry: (entry) => set((state) => ({ edt: [...state.edt, entry] })),

    candidatures: [],
    setCandidatures: (candidatures) => set({ candidatures }),
    updateCandidatureStatus: (id, status) =>
      set((state) => ({ candidatures: state.candidatures.map((c) => (c.id === id ? { ...c, statut: status } : c)) })),

    loading: {
      students: false,
      intervenants: false,
      edt: false,
      candidatures: false
    },
    setLoading: (key, value) => set((state) => ({ loading: { ...state.loading, [key]: value } }))
  }))
);

export default {
  useAppStore,
  useUserStore,
  useDataStore
};

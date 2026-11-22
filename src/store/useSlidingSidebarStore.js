import { create } from "zustand";

export const useSlidingSidebarStore = create((set, get) => ({
  // Desktop state: collapsed (icon-only ~76px) vs expanded (~280px)
  // Default to false (expanded by default on desktop)
  isCollapsed: false,

  // Mobile & tablet off-canvas drawer open/close
  isMobileOpen: false,

  // Help & Support modal
  isHelpOpen: false,

  toggleCollapse: () => {
    const next = !get().isCollapsed;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("chatty_sidebar_collapsed", String(next));
      } catch {}
    }
    set({ isCollapsed: next });
  },

  setCollapsed: (collapsed) => {
    const val = Boolean(collapsed);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("chatty_sidebar_collapsed", String(val));
      } catch {}
    }
    set({ isCollapsed: val });
  },

  openMobile: () => set({ isMobileOpen: true }),
  closeMobile: () => set({ isMobileOpen: false }),
  toggleMobile: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),

  setHelpOpen: (open) => set({ isHelpOpen: Boolean(open) }),
}));

// Neptune Navigation Store - Zustand state management
// SIMPLIFIED: Index-based navigation 
import { create } from 'zustand';
import type { TabId } from '@/components/TabNavigation';

export type ViewState = 'ORBIT' | 'FOCUS';

// Tab order - stable index-based system
export const TABS: { id: TabId; name: string; desc: string }[] = [
    { id: 'dashboard', name: 'DASHBOARD', desc: 'System overview & quick stats' },
    { id: 'daily', name: 'DAILY LOG', desc: 'Daily journal entries' },
    { id: 'goals', name: 'GOALS', desc: 'Track your objectives' },
    { id: 'roadmap', name: 'ROADMAP', desc: 'Project milestones' },
    { id: 'wallet', name: 'WALLET', desc: 'Financial overview' },
    { id: 'snippets', name: 'SNIPPETS', desc: 'Code snippets library' },
    { id: 'notes', name: 'NOTES', desc: 'Personal notes' },
    { id: 'ai', name: 'AI COACH', desc: 'AI-powered assistant' },
    { id: 'aireviews', name: 'AI REVIEWS', desc: 'Weekly/Monthly/Yearly insights' },
];

export const TAB_COUNT = TABS.length;

interface NeptuneState {
    // STABLE INDEX - Single source of truth for active tab
    activeTabIndex: number;
    // Current view state
    viewState: ViewState;
    // Modal visibility
    isModalOpen: boolean;
    // Intro completion
    isIntroComplete: boolean;
    // Arrow interaction tracking
    hasInteractedWithArrows: boolean;
    // First navigation after intro - skip index increment
    isFirstNavigation: boolean;
    // Performance setting - blur toggle
    blurEnabled: boolean;
    // Scroll performance - throttle 3D render during scroll
    isScrolling: boolean;

    // Actions
    setActiveTabIndex: (index: number) => void;
    navigateNext: () => void;
    navigatePrev: () => void;
    setViewState: (state: ViewState) => void;
    openModal: () => void;
    closeModal: () => void;
    openCurrentTab: () => void;
    setIntroComplete: (complete: boolean) => void;
    setHasInteractedWithArrows: (interacted: boolean) => void;
    setBlurEnabled: (enabled: boolean) => void;
    setIsScrolling: (scrolling: boolean) => void;

    // Computed helpers
    getActiveTab: () => typeof TABS[number];
    getActiveTabId: () => TabId;
}

export const useNeptuneStore = create<NeptuneState>((set, get) => ({
    activeTabIndex: 0,
    viewState: 'ORBIT',
    isModalOpen: false,
    isIntroComplete: false,
    hasInteractedWithArrows: false,
    isFirstNavigation: true, // First press just shows button, doesn't increment
    blurEnabled: true, // Glassmorphism blur enabled by default
    isScrolling: false, // For 3D render throttling during scroll

    setActiveTabIndex: (index) => set({
        activeTabIndex: ((index % TAB_COUNT) + TAB_COUNT) % TAB_COUNT
    }),

    // Simple index navigation
    // First call after intro: just reveal button at current index (0)
    // Subsequent calls: normal index increment
    navigateNext: () => set((state) => {
        if (state.isFirstNavigation) {
            // First press: just show current tab, don't increment
            return {
                isFirstNavigation: false,
                hasInteractedWithArrows: true,
            };
        }
        // Normal navigation
        return {
            activeTabIndex: (state.activeTabIndex + 1) % TAB_COUNT,
            hasInteractedWithArrows: true,
        };
    }),

    navigatePrev: () => set((state) => {
        if (state.isFirstNavigation) {
            // First press: just show current tab, don't decrement
            return {
                isFirstNavigation: false,
                hasInteractedWithArrows: true,
            };
        }
        // Normal navigation
        return {
            activeTabIndex: (state.activeTabIndex - 1 + TAB_COUNT) % TAB_COUNT,
            hasInteractedWithArrows: true,
        };
    }),

    setViewState: (viewState) => set({ viewState }),

    openModal: () => set({ viewState: 'FOCUS', isModalOpen: true }),

    closeModal: () => set({ viewState: 'ORBIT', isModalOpen: false }),

    // Open modal for the current tab (used when clicking the button)
    openCurrentTab: () => set({ viewState: 'FOCUS', isModalOpen: true }),

    setIntroComplete: (complete) => set({ isIntroComplete: complete }),

    setHasInteractedWithArrows: (interacted) => set({ hasInteractedWithArrows: interacted }),

    setBlurEnabled: (enabled) => set({ blurEnabled: enabled }),

    setIsScrolling: (scrolling) => set({ isScrolling: scrolling }),

    // Computed helpers
    getActiveTab: () => TABS[get().activeTabIndex],
    getActiveTabId: () => TABS[get().activeTabIndex].id,
}));

export default useNeptuneStore;


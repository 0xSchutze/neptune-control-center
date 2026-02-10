/**
 * Lazy Component Loader
 * 
 * Central lazy loading file - dynamically loads all heavy components.
 * This reduces initial bundle size and only loads required components.
 */

import { lazy } from 'react';

// ============================================================================
// TAB COMPONENTS - Main tab components
// ============================================================================

// Lazy loading wrappers for named exports
export const DashboardTab = lazy(() =>
    import('./DashboardTab').then(module => ({ default: module.DashboardTab }))
);

export const DailyLogTab = lazy(() =>
    import('./DailyLogTab').then(module => ({ default: module.DailyLogTab }))
);

export const GoalsTab = lazy(() =>
    import('./GoalsTab').then(module => ({ default: module.GoalsTab }))
);

export const NotesTab = lazy(() =>
    import('./NotesTab').then(module => ({ default: module.NotesTab }))
);

export const SnippetsTab = lazy(() =>
    import('./SnippetsTab').then(module => ({ default: module.SnippetsTab }))
);

export const WalletTab = lazy(() =>
    import('./WalletTab').then(module => ({ default: module.WalletTab }))
);



// ============================================================================
// FEATURE COMPONENTS - Feature components
// ============================================================================

export const LearningRoadmap = lazy(() =>
    import('./LearningRoadmap').then(module => ({ default: module.LearningRoadmap }))
);

export const WeeklyStats = lazy(() =>
    import('./WeeklyStats').then(module => ({ default: module.WeeklyStats }))
);

export const AIChat = lazy(() =>
    import('./AIChat').then(module => ({ default: module.AIChat }))
);

export const AIReviewsTab = lazy(() =>
    import('./AIReviewsTab').then(module => ({ default: module.default }))
);

export const AchievementSystem = lazy(() =>
    import('./AchievementSystem').then(module => ({ default: module.AchievementSystem }))
);

export const ResourceLibrary = lazy(() =>
    import('./ResourceLibrary').then(module => ({ default: module.ResourceLibrary }))
);

export const SkillRadar = lazy(() =>
    import('./SkillRadar').then(module => ({ default: module.SkillRadar }))
);

export const StudyTimer = lazy(() =>
    import('./StudyTimer').then(module => ({ default: module.default }))
);

export const StreakTracker = lazy(() =>
    import('./StreakTracker').then(module => ({ default: module.StreakTracker }))
);

export const QuickActions = lazy(() =>
    import('./QuickActions').then(module => ({ default: module.QuickActions }))
);

export const StatsCard = lazy(() =>
    import('./StatsCard').then(module => ({ default: module.StatsCard }))
);

// ============================================================================
// SETTINGS
// ============================================================================

export const SettingsPanel = lazy(() =>
    import('./SettingsPanel').then(module => ({ default: module.SettingsPanel }))
);

export const ProfilePanel = lazy(() =>
    import('./ProfilePanel').then(module => ({ default: module.default }))
);

export const NotificationCenter = lazy(() =>
    import('./NotificationCenter').then(module => ({ default: module.default }))
);


// ============================================================================
// LOADING FALLBACK COMPONENT
// ============================================================================

/**
 * Neptune themed loading spinner
 * Fallback displayed while lazy components are loading
 */
export const NeptuneLoader = () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="relative">
            {/* Spinning ring */}
            <div className="w-16 h-16 border-4 border-[var(--neptune-primary-dim)] border-t-[var(--neptune-primary)] rounded-full animate-spin" />

            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-[var(--neptune-primary)] rounded-full animate-pulse shadow-[0_0_10px_var(--neptune-primary)]" />
            </div>

            {/* Loading text */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <p className="text-[10px] font-mono text-[var(--neptune-text-muted)] tracking-widest uppercase">
                    LOADING MODULE...
                </p>
            </div>
        </div>
    </div>
);

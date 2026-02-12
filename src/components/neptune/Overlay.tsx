// Neptune Overlay - Holographic Interface
// OPTIMIZED: All components memoized to prevent unnecessary re-renders
import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, ChevronLeft, ChevronRight, Minimize2, Grid, Settings, LayoutDashboard, CalendarDays, Target, Map, Wallet, Code2, FileText, Bot, BarChart3 } from 'lucide-react';
import { useNeptuneStore, TABS } from './Store';
import NotificationCenter from '../NotificationCenter';
import ProfilePanel, { ProfileButton } from '../ProfilePanel';
import SimpleBarReact from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import './neptune-design.css';

/**
 * NavigationArrows - Holographic Arrows
 * OPTIMIZED: Memoized component with breathing animation
 */
const NavigationArrows = memo(() => {
    const navigateNext = useNeptuneStore(state => state.navigateNext);
    const navigatePrev = useNeptuneStore(state => state.navigatePrev);
    const viewState = useNeptuneStore(state => state.viewState);
    const isIntroComplete = useNeptuneStore(state => state.isIntroComplete);
    const hasInteractedWithArrows = useNeptuneStore(state => state.hasInteractedWithArrows);
    const setHasInteractedWithArrows = useNeptuneStore(state => state.setHasInteractedWithArrows);

    const [leftHover, setLeftHover] = useState(false);
    const [rightHover, setRightHover] = useState(false);

    // Memoized callbacks
    const handleAction = useCallback((direction: 'left' | 'right') => {
        setHasInteractedWithArrows(true);
        if (direction === 'left') navigatePrev();
        else navigateNext();
    }, [navigatePrev, navigateNext, setHasInteractedWithArrows]);

    const handleLeftClick = useCallback(() => handleAction('left'), [handleAction]);
    const handleRightClick = useCallback(() => handleAction('right'), [handleAction]);

    const setLeftHoverTrue = useCallback(() => setLeftHover(true), []);
    const setLeftHoverFalse = useCallback(() => setLeftHover(false), []);
    const setRightHoverTrue = useCallback(() => setRightHover(true), []);
    const setRightHoverFalse = useCallback(() => setRightHover(false), []);

    if (viewState === 'FOCUS' || !isIntroComplete) return null;

    const shouldPulse = !hasInteractedWithArrows;

    // Arrow SVG - Simple open triangle with center dot
    const GeometricArrow = ({ direction, isHovered }: { direction: 'left' | 'right'; isHovered: boolean }) => {
        const isLeft = direction === 'left';

        return (
            <svg
                width="70"
                height="90"
                viewBox="0 0 60 80"
                fill="none"
                style={{
                    transform: isLeft ? 'none' : 'scaleX(-1)',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    filter: isHovered
                        ? 'drop-shadow(0 0 15px rgba(0, 229, 255, 0.9)) drop-shadow(0 0 30px rgba(0, 229, 255, 0.5))'
                        : 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.4))',
                }}
            >
                {/* Open triangle - top line */}
                <line
                    x1="15" y1="40"
                    x2="45" y2="15"
                    stroke={isHovered ? '#00D4E8' : '#00C5D9'}
                    strokeWidth={isHovered ? '2.5' : '1.8'}
                    strokeLinecap="round"
                    style={{ transition: 'all 0.3s ease' }}
                />

                {/* Open triangle - bottom line */}
                <line
                    x1="15" y1="40"
                    x2="45" y2="65"
                    stroke={isHovered ? '#00D4E8' : '#00C5D9'}
                    strokeWidth={isHovered ? '2.5' : '1.8'}
                    strokeLinecap="round"
                    style={{ transition: 'all 0.3s ease' }}
                />

                {/* Small accent at top tip */}
                <circle
                    cx="45" cy="15" r="1.5"
                    fill={isHovered ? '#00D4E8' : '#00C5D9'}
                    style={{ opacity: isHovered ? 0.8 : 0.4, transition: 'all 0.3s ease' }}
                />

                {/* Small accent at bottom tip */}
                <circle
                    cx="45" cy="65" r="1.5"
                    fill={isHovered ? '#00D4E8' : '#00C5D9'}
                    style={{ opacity: isHovered ? 0.8 : 0.4, transition: 'all 0.3s ease' }}
                />

                {/* Center dot - where base would be */}
                <circle
                    cx="45"
                    cy="40"
                    r="2.5"
                    fill={isHovered ? '#00D4E8' : '#00C5D9'}
                    style={{
                        opacity: isHovered ? 1 : 0.7,
                        transition: 'all 0.3s ease',
                    }}
                />
            </svg>
        );
    };

    return (
        <>
            {/* Smooth breathing animation keyframes */}
            <style>{`
                @keyframes arrowBreathing {
                    0%, 100% { 
                        opacity: 0.35;
                        transform: scale(1);
                        filter: drop-shadow(0 0 3px rgba(0, 229, 255, 0.15));
                    }
                    25% {
                        opacity: 0.55;
                        transform: scale(1.03);
                        filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.4)) drop-shadow(0 0 20px rgba(0, 229, 255, 0.2));
                    }
                    50% { 
                        opacity: 0.95;
                        transform: scale(1.06);
                        filter: drop-shadow(0 0 20px rgba(0, 229, 255, 0.7)) drop-shadow(0 0 40px rgba(0, 229, 255, 0.4)) drop-shadow(0 0 60px rgba(0, 229, 255, 0.2));
                    }
                    75% {
                        opacity: 0.55;
                        transform: scale(1.03);
                        filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.4)) drop-shadow(0 0 20px rgba(0, 229, 255, 0.2));
                    }
                }
            `}</style>

            <motion.button
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                onClick={handleLeftClick}
                onMouseEnter={setLeftHoverTrue}
                onMouseLeave={setLeftHoverFalse}
                className="fixed left-6 top-1/2 -translate-y-1/2 z-40 group outline-none cursor-pointer"
                style={{
                    animation: shouldPulse && !leftHover ? 'arrowBreathing 2.5s ease-in-out infinite' : 'none',
                    transformOrigin: 'center',
                }}
            >
                <GeometricArrow direction="left" isHovered={leftHover} />
            </motion.button>

            <motion.button
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                onClick={handleRightClick}
                onMouseEnter={setRightHoverTrue}
                onMouseLeave={setRightHoverFalse}
                className="fixed right-6 top-1/2 -translate-y-1/2 z-40 group outline-none cursor-pointer"
                style={{
                    animation: shouldPulse && !rightHover ? 'arrowBreathing 2.5s ease-in-out infinite 0.5s' : 'none',
                    transformOrigin: 'center',
                }}
            >
                <GeometricArrow direction="right" isHovered={rightHover} />
            </motion.button>
        </>
    );
});
NavigationArrows.displayName = 'NavigationArrows';

/**
 * ScrollableContent - SimpleBar custom scrollbar for optimized scrollbar drag
 * Mouse wheel stays native and smooth, scrollbar drag uses requestAnimationFrame throttling
 */
const ScrollableContent = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <SimpleBarReact
            className="flex-1 relative z-10"
            style={{ maxHeight: '100%' }}
            autoHide={false}
        >
            <div className="p-6 md:p-8">
                {children}
            </div>
        </SimpleBarReact>
    );
});
ScrollableContent.displayName = 'ScrollableContent';

/**
 * GlassModal - The Main Interface Container
 * OPTIMIZED: Memoized component with useCallback for event handlers
 */
const GlassModal = memo(({ children, onOpenSettings, onNavigateTab }: { children: React.ReactNode; onOpenSettings?: () => void; onNavigateTab?: (tab: string) => void }) => {
    const isModalOpen = useNeptuneStore(state => state.isModalOpen);
    const closeModal = useNeptuneStore(state => state.closeModal);
    const activeTabIndex = useNeptuneStore(state => state.activeTabIndex);
    const blurEnabled = useNeptuneStore(state => state.blurEnabled);
    const is2DMode = useNeptuneStore(state => state.is2DMode);
    const currentTab = TABS[activeTabIndex];

    // Profile panel state
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const handleOpenProfile = useCallback(() => setIsProfileOpen(true), []);
    const handleCloseProfile = useCallback(() => setIsProfileOpen(false), []);

    // OPTIMIZED: Memoize random coordinates to prevent re-renders during scroll
    const coordinates = useMemo(() => ({
        x: Math.random().toFixed(4),
        y: Math.random().toFixed(4)
    }), []);

    // Memoized event handlers
    const handleBackdropClick = useCallback(() => {
        closeModal();
    }, [closeModal]);

    // Trigger welcome notification on first modal open of the day
    useEffect(() => {
        if (isModalOpen) {
            import('@/services/ReminderService').then(({ checkWelcomeBack }) => {
                checkWelcomeBack();
            });
        }
    }, [isModalOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen && !is2DMode) closeModal();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, closeModal, is2DMode]);

    // In 2D mode: always show modal
    const shouldShow = is2DMode || isModalOpen;

    return (
        <AnimatePresence>
            {shouldShow && (
                <>
                    {/* Dark Matter Backdrop - animated gradient in 2D mode */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        onClick={is2DMode ? undefined : handleBackdropClick}
                        className={`fixed inset-0 z-40 ${is2DMode
                                ? 'neptune-2d-bg'
                                : 'bg-[var(--neptune-void-bg)]/90'
                            }`}
                    />

                    {/* Holographic Projector Container */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={{
                            hidden: { opacity: 0, scale: 0.95, y: 20 },
                            visible: {
                                opacity: 1, scale: 1, y: 0,
                                transition: { type: "spring", damping: 30, stiffness: 200 }
                            },
                            exit: {
                                opacity: 0, scale: 0.98,
                                transition: { duration: 0.15 }
                            }
                        }}
                        className={`fixed z-50 flex flex-col pointer-events-none ${is2DMode ? 'inset-3' : 'inset-4 md:inset-10 lg:inset-20'
                            }`}
                    >
                        {/* The Actual Panel (Pointer events re-enabled) */}
                        <div className={`
                            neptune-glass-panel pointer-events-auto
                            w-full h-full overflow-hidden
                            flex flex-col relative rounded-2xl
                            ${!blurEnabled ? 'no-blur' : ''}
                        `}>
                            {/* HUD Scanline Overlay */}
                            <div className="neptune-scan-overlay absolute inset-0 z-0 opacity-20" />

                            {/* Header Bar */}
                            <div className="
                                relative z-10 flex items-center justify-between 
                                px-6 py-4 border-b border-[rgba(255,255,255,0.05)]
                                bg-gradient-to-r from-[rgba(0,180,216,0.05)] to-transparent
                            ">
                                <div className="flex items-center gap-4">
                                    <div className="w-1 h-8 bg-[var(--neptune-primary)] rounded-full shadow-[0_0_10px_var(--neptune-primary)]" />
                                    <div>
                                        <h2 className="text-[var(--neptune-text-primary)] text-xl font-display tracking-widest uppercase flex items-center gap-3">
                                            {is2DMode && (
                                                <span className="text-[var(--neptune-primary)] text-sm tracking-[0.3em] opacity-60">NEPTUNE</span>
                                            )}
                                            {is2DMode && (
                                                <span className="w-px h-5 bg-[var(--neptune-primary)] opacity-30" />
                                            )}
                                            {currentTab.name}
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[var(--neptune-secondary)] animate-pulse" />
                                            <p className="text-[var(--neptune-text-muted)] text-[10px] tracking-[0.2em] font-mono">
                                                SYSTEM: ONLINE
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Notification Center */}
                                    <NotificationCenter onNavigate={onNavigateTab} />
                                    {/* Profile Button */}
                                    <ProfileButton onClick={handleOpenProfile} />
                                    {/* Settings Button */}
                                    <button
                                        onClick={onOpenSettings}
                                        className="
                                            p-2 rounded-lg text-[var(--neptune-text-secondary)]
                                            hover:bg-[rgba(0,180,216,0.1)] hover:text-[var(--neptune-primary)]
                                            transition-all duration-300
                                        "
                                        title="Settings"
                                    >
                                        <Settings size={20} />
                                    </button>
                                    {/* Minimize Button - hidden in 2D mode */}
                                    {!is2DMode && (
                                        <button
                                            onClick={closeModal}
                                            className="
                                            p-2 rounded-lg text-[var(--neptune-text-secondary)]
                                            hover:bg-[rgba(0,180,216,0.1)] hover:text-[var(--neptune-primary)]
                                            transition-all duration-300
                                        "
                                            title="Return to Orbit"
                                        >
                                            <Minimize2 size={20} />
                                        </button>
                                    )}
                                </div>

                                {/* Profile Panel */}
                                <AnimatePresence>
                                    {isProfileOpen && <ProfilePanel onClose={handleCloseProfile} />}
                                </AnimatePresence>
                            </div>

                            {/* Main Scrollable Content - with tab transition in 2D mode */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTabIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="flex-1 min-h-0"
                                >
                                    <ScrollableContent children={children} />
                                </motion.div>
                            </AnimatePresence>

                            {/* Footer Status Bar */}
                            <div className="
                                relative z-10 h-8 border-t border-[rgba(255,255,255,0.05)]
                                flex items-center justify-between px-6
                                bg-[rgba(0,0,0,0.3)]
                            ">
                                <span className="text-[var(--neptune-text-muted)] text-[9px] font-mono">
                                    COORD: {coordinates.x} • {coordinates.y}
                                </span>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-1 h-3 bg-[var(--neptune-primary)] opacity-${i * 30}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
GlassModal.displayName = 'GlassModal';

/**
 * StealthSidebar - HUD Style Navigation with Hover Expand
 * OPTIMIZED: Memoized component with hover expand functionality
 */
const StealthSidebar = memo(() => {
    const isModalOpen = useNeptuneStore(state => state.isModalOpen);
    const activeTabIndex = useNeptuneStore(state => state.activeTabIndex);
    const setActiveTabIndex = useNeptuneStore(state => state.setActiveTabIndex);
    const [isExpanded, setIsExpanded] = useState(false);

    // Tab icons mapping - Professional Lucide icons
    const tabIcons: Record<string, typeof LayoutDashboard> = {
        dashboard: LayoutDashboard,
        daily: CalendarDays,
        goals: Target,
        roadmap: Map,
        wallet: Wallet,
        snippets: Code2,
        notes: FileText,
        ai: Bot,
        aireviews: BarChart3,
    };

    if (!isModalOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed left-0 top-[37%] -translate-y-1/2 z-[60]"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Hover trigger zone - invisible extension */}
            <div className="absolute left-0 top-0 w-4 h-full" />

            {/* Sidebar Panel */}
            <motion.div
                animate={{
                    width: isExpanded ? 180 : 48,
                    backgroundColor: isExpanded ? 'rgba(0, 15, 25, 0.95)' : 'rgba(0, 15, 25, 0.6)',
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`
                    ml-2 py-4 rounded-r-xl border-r border-t border-b
                    ${isExpanded
                        ? 'border-[var(--neptune-primary-dim)] shadow-[0_0_30px_rgba(0,180,216,0.2)]'
                        : 'border-[rgba(255,255,255,0.05)]'}
                    backdrop-blur-xl
                `}
            >
                {TABS.map((tab, index) => {
                    const isActive = activeTabIndex === index;
                    const IconComponent = tabIcons[tab.id] || LayoutDashboard;

                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTabIndex(index)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200
                                ${isActive
                                    ? 'bg-[var(--neptune-primary-dim)] text-[var(--neptune-primary)]'
                                    : 'text-[var(--neptune-text-muted)] hover:text-[var(--neptune-text-primary)] hover:bg-[rgba(255,255,255,0.05)]'}
                            `}
                            whileHover={{ x: isExpanded ? 4 : 0 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-6 flex items-center justify-center transition-all duration-300 ${isActive ? 'text-[var(--neptune-primary)]' : ''}`}>
                                <IconComponent size={18} strokeWidth={1.5} />
                            </div>

                            {/* Label - Only visible when expanded */}
                            <motion.span
                                animate={{
                                    opacity: isExpanded ? 1 : 0,
                                    x: isExpanded ? 0 : -10
                                }}
                                transition={{ duration: 0.2 }}
                                className={`
                                    text-xs font-mono whitespace-nowrap overflow-hidden
                                    ${isActive ? 'text-[var(--neptune-primary)]' : ''}
                                `}
                            >
                                {tab.name}
                            </motion.span>

                            {/* Active indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute left-0 w-1 h-8 bg-[var(--neptune-primary)] rounded-r shadow-[0_0_10px_var(--neptune-primary)]"
                                />
                            )}
                        </motion.button>
                    );
                })}

                {/* Expand hint when collapsed */}
                {!isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2"
                    >
                        <ChevronRight size={12} className="text-[var(--neptune-text-muted)]" />
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
});
StealthSidebar.displayName = 'StealthSidebar';

/**
 * CornerDecorations - Static HUD Elements
 * OPTIMIZED: Memoized component
 */
const CornerDecorations = memo(() => {
    const viewState = useNeptuneStore(state => state.viewState);
    if (viewState === 'FOCUS') return null;

    return (
        <div className="fixed inset-6 pointer-events-none z-30 opacity-50">
            {/* Top Left */}
            <div className="absolute top-0 left-0 w-24 h-24 border-l border-t border-[var(--neptune-primary-dim)] rounded-tl-3xl" />

            {/* Top Right */}
            <div className="absolute top-0 right-0 w-24 h-24 border-r border-t border-[var(--neptune-primary-dim)] rounded-tr-3xl" />

            {/* Bottom Left */}
            <div className="absolute bottom-0 left-0 w-24 h-24 border-l border-b border-[var(--neptune-primary-dim)] rounded-bl-3xl" />

            {/* Bottom Right */}
            <div className="absolute bottom-0 right-0 w-24 h-24 border-r border-b border-[var(--neptune-primary-dim)] rounded-br-3xl" />
        </div>
    );
});
CornerDecorations.displayName = 'CornerDecorations';

/**
 * Main Overlay Component
 */
interface NeptuneOverlayProps {
    children: React.ReactNode;
}

export default function NeptuneOverlay({ children }: NeptuneOverlayProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const is2DMode = useNeptuneStore(state => state.is2DMode);

    const handleOpenSettings = useCallback(() => {
        setIsSettingsOpen(true);
    }, []);

    const handleCloseSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    // Handle navigation from notifications
    const handleNavigateTab = useCallback((tabId: string) => {
        const tabIndex = TABS.findIndex(t => t.id === tabId);
        if (tabIndex !== -1) {
            const { setActiveTabIndex, openModal } = useNeptuneStore.getState();
            setActiveTabIndex(tabIndex);
            openModal();
            setIsSettingsOpen(false); // Close settings if open
        }
    }, []);

    return (
        <>
            {/* Title HUD - only in 3D mode */}
            {!is2DMode && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none mix-blend-screen">
                    <h1 className="text-[var(--neptune-text-primary)] text-sm font-display tracking-[0.5em] drop-shadow-[0_0_10px_rgba(0,180,216,0.5)]">
                        NEPTUNE
                    </h1>
                    <div className="w-24 h-px bg-gradient-to-r from-transparent via-[var(--neptune-primary)] to-transparent mx-auto mt-2 opacity-50" />
                </div>
            )}

            {!is2DMode && <CornerDecorations />}
            {!is2DMode && <NavigationArrows />}
            <StealthSidebar />
            <GlassModal onOpenSettings={handleOpenSettings} onNavigateTab={handleNavigateTab}>
                {/* Settings Panel inside modal content area */}
                {isSettingsOpen ? (
                    <div className="relative">
                        <SettingsPanelInline
                            isOpen={isSettingsOpen}
                            onClose={handleCloseSettings}
                        />
                    </div>
                ) : (
                    children
                )}
            </GlassModal>
        </>
    );
}

// Inline settings panel wrapper for modal - self-contained with own apiKey state
const SettingsPanelInline = memo(({ isOpen, onClose }: {
    isOpen: boolean;
    onClose: () => void;
}) => {
    // Lazy import SettingsPanel to avoid circular deps
    const [SettingsPanel, setSettingsPanel] = useState<any>(null);

    // Self-contained apiKey state - load from settings.json
    const [apiKey, setApiKey] = useState('');

    // Load API key from settings.json on mount
    useEffect(() => {
        const loadApiKey = async () => {
            if (window.electronAPI?.readFile) {
                const result = await window.electronAPI.readFile('settings.json');
                if (result.success && result.data?.apiKey) {
                    setApiKey(result.data.apiKey);
                }
            }
        };
        loadApiKey();
    }, []);

    const handleApiKeyChange = useCallback(async (key: string) => {
        setApiKey(key);
        // Save to settings.json instead of localStorage
        if (window.electronAPI?.readFile && window.electronAPI?.saveFile) {
            const result = await window.electronAPI.readFile('settings.json');
            const existingSettings = result.success && result.data ? result.data : {};
            await window.electronAPI.saveFile('settings.json', { ...existingSettings, apiKey: key });

            // Dispatch global event so index.tsx can update its state
            window.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: { apiKey: key } }));
        }
    }, []);

    useEffect(() => {
        import('../SettingsPanel').then(mod => {
            setSettingsPanel(() => mod.SettingsPanel);
        });
    }, []);

    if (!SettingsPanel) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <SettingsPanel isOpen={isOpen} onClose={onClose} apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />;
});
SettingsPanelInline.displayName = 'SettingsPanelInline';



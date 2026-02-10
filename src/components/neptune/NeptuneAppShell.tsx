// Neptune App Shell - Main container integrating scene and overlay
// Store is the SINGLE SOURCE OF TRUTH - parent receives updates, never pushes
import { useEffect } from 'react';
import { NeptuneScene } from './Scene.tsx';
import NeptuneOverlay from './Overlay.tsx';
import { useNeptuneStore, TABS } from './Store.ts';
import type { TabId } from '@/components/TabNavigation';

interface NeptuneAppShellProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    children: React.ReactNode;
}

/**
 * NeptuneAppShell - The Neptune Orbital Interface shell
 * Combines the 3D scene with UI overlay
 */
export function NeptuneAppShell({ activeTab, onTabChange, children }: NeptuneAppShellProps) {
    const { activeTabIndex } = useNeptuneStore();

    // Get current tab from index
    const storeTab = TABS[activeTabIndex].id as TabId;

    // Sync Store → Parent ONLY (Store is the source of truth)
    useEffect(() => {
        if (storeTab !== activeTab) {
            onTabChange(storeTab);
        }
    }, [storeTab, activeTab, onTabChange]);

    return (
        <div className="relative min-h-screen bg-[#050510] overflow-hidden">
            {/* 3D Scene Background */}
            <NeptuneScene />

            {/* UI Overlay */}
            <NeptuneOverlay>
                {/* Content passed to modal */}
                <div className="min-h-full p-4 md:p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </NeptuneOverlay>
        </div>
    );
}

export default NeptuneAppShell;



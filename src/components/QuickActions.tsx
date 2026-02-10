import { motion } from 'framer-motion';
import { memo, useCallback, useMemo } from 'react';
import {
  Plus, Target,
  MessageSquare, FileText, Zap, ExternalLink, Command
} from 'lucide-react';
import { useNeptuneStore, TABS } from './neptune/Store';
import './neptune/neptune-design.css';

interface QuickActionsProps {
  onNavigate: (tab: any) => void; // Keep for compatibility but use store instead
  onAddLog: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  sub: string;
  icon: React.ComponentType<any>;
  action: () => void;
}

/**
 * OPTIMIZED: Memoized QuickActions component
 */
export const QuickActions = memo(({ onNavigate, onAddLog }: QuickActionsProps) => {
  const setActiveTabIndex = useNeptuneStore(state => state.setActiveTabIndex);

  // Navigate using store directly
  const navigateToTab = useCallback((tabId: string) => {
    const tabIndex = TABS.findIndex(t => t.id === tabId);
    if (tabIndex !== -1) {
      setActiveTabIndex(tabIndex);
    }
  }, [setActiveTabIndex]);

  // Memoized callbacks
  const handleNavigateDailyLog = useCallback(() => navigateToTab('daily'), [navigateToTab]);
  const handleNavigateGoals = useCallback(() => navigateToTab('goals'), [navigateToTab]);
  const handleNavigateNotes = useCallback(() => navigateToTab('notes'), [navigateToTab]);
  const handleNavigateAI = useCallback(() => navigateToTab('ai'), [navigateToTab]);
  const handleOpenExternal = useCallback((url: string) => () => window.open(url, '_blank'), []);

  // Memoized actions array to prevent recreation on every render
  const actions: QuickAction[] = useMemo(() => [
    { id: 'add-log', label: 'Daily Log', sub: 'Add Entry', icon: Plus, action: handleNavigateDailyLog },
    { id: 'goals', label: 'Goals', sub: 'Track Progress', icon: Target, action: handleNavigateGoals },
    { id: 'notes', label: 'Notes', sub: 'View Notes', icon: FileText, action: handleNavigateNotes },
    { id: 'ai', label: 'AI Chat', sub: 'Connect', icon: MessageSquare, action: handleNavigateAI },
  ], [handleNavigateDailyLog, handleNavigateGoals, handleNavigateNotes, handleNavigateAI]);

  const externalLinks = [
    { label: 'ETHERNAUT', url: 'https://ethernaut.openzeppelin.com/', icon: Zap },
    { label: 'CODE4RENA', url: 'https://code4rena.com/', icon: Target },
    { label: 'DOCS', url: 'https://docs.soliditylang.org/', icon: FileText },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      /* Added h-full and flex flex-col to match height */
      className="neptune-glass-panel rounded-xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden h-full flex flex-col"
    >
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(var(--neptune-primary) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 relative z-10 flex-none">
        <div className="w-8 h-8 rounded bg-[var(--neptune-primary)] flex items-center justify-center text-black shadow-[0_0_10px_var(--neptune-primary)]">
          <Command size={18} />
        </div>
        <div>
          <h3 className="font-display tracking-widest text-lg text-[var(--neptune-text-primary)] uppercase">Quick Actions</h3>
          <p className="text-[9px] font-mono text-[var(--neptune-text-muted)]">Shortcuts</p>
        </div>
      </div>

      {/* Main Buttons - Added flex-1 to fill space */}
      <div className="grid grid-cols-2 gap-3 mb-6 relative z-10 flex-1">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={action.action}
              className="
                            group relative p-4 rounded-lg bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.05)]
                            hover:bg-[var(--neptune-primary-dim)] hover:border-[var(--neptune-primary)]
                            transition-all duration-200 text-left overflow-hidden h-full flex flex-col justify-center
                        "
            >
              {/* Target Lock Brackets (Corners) */}
              <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-[var(--neptune-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-[var(--neptune-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-[var(--neptune-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-[var(--neptune-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />

              <Icon className="w-5 h-5 mb-2 text-[var(--neptune-secondary)] group-hover:text-[var(--neptune-primary)] group-hover:drop-shadow-[0_0_5px_var(--neptune-primary)] transition-all" />
              <div className="font-display text-sm text-[var(--neptune-text-primary)]">{action.label}</div>
              <div className="font-mono text-[9px] text-[var(--neptune-text-muted)] group-hover:text-[var(--neptune-text-secondary)]">{action.sub}</div>
            </motion.button>
          )
        })}
      </div>

      {/* External Links */}
      <div className="border-t border-[rgba(255,255,255,0.05)] pt-4 relative z-10 flex-none">
        <h4 className="text-[10px] font-mono text-[var(--neptune-text-muted)] mb-3">External Links</h4>
        <div className="flex flex-wrap gap-2">
          {externalLinks.map(link => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={handleOpenExternal(link.url)}
                className="
                                flex items-center px-3 py-1.5 rounded bg-[rgba(255,255,255,0.05)] border border-transparent
                                hover:border-[var(--neptune-text-muted)] hover:bg-[rgba(255,255,255,0.1)]
                                transition-all text-[10px] font-mono text-[var(--neptune-text-secondary)]
                            "
              >
                <Icon size={10} className="mr-2" />
                {link.label}
                <ExternalLink size={10} className="ml-2 opacity-50" />
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  );
});
QuickActions.displayName = 'QuickActions';

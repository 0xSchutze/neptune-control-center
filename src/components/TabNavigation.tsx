import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, DollarSign, Code, Brain, StickyNote, Target, Map, Zap } from 'lucide-react';

export type TabId = 'dashboard' | 'daily' | 'wallet' | 'snippets' | 'notes' | 'goals' | 'roadmap' | 'ai' | 'aireviews';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs = [
  { id: 'dashboard' as TabId, icon: TrendingUp, label: 'Dashboard' },
  { id: 'daily' as TabId, icon: BookOpen, label: 'Daily Log' },
  { id: 'goals' as TabId, icon: Target, label: 'Goals' },
  { id: 'roadmap' as TabId, icon: Map, label: 'Roadmap' },
  { id: 'wallet' as TabId, icon: DollarSign, label: 'Wallet' },
  { id: 'snippets' as TabId, icon: Code, label: 'Snippets' },
  { id: 'notes' as TabId, icon: StickyNote, label: 'Notes' },
  { id: 'ai' as TabId, icon: Brain, label: 'AI Coach' },
  { id: 'aireviews' as TabId, icon: Zap, label: 'AI Reviews' },
];

export const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <nav className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap
              ${isActive
                ? 'gradient-primary text-white glow-primary'
                : 'bg-card hover:bg-secondary text-foreground'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </motion.button>
        );
      })}
    </nav>
  );
};

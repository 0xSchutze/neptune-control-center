import { motion } from 'framer-motion';
import { memo, useState, useEffect, useRef } from 'react';
import {
  Award, Lock, Star, Zap, Target, BookOpen,
  Clock, Bug, DollarSign, Flame, Trophy, Code, Hexagon, AlertTriangle, Coins
} from 'lucide-react';
import { Progress, Bounty, Transaction } from '@/types';
import { addNotification } from '@/stores/NotificationStore';
import './neptune/neptune-design.css';

// Inline wallet type (since not exported from types)
interface WalletData {
  transactions?: Transaction[];
}

interface AchievementSystemProps {
  progress: Progress;
  dailyLogsCount: number;
  currentStreak: number;
  completedGoalsCount: number;
  wallet?: WalletData;
  bounties?: Bounty[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  requirement: number;
  current: number;
  unlocked: boolean;
}

/**
 * OPTIMIZED: Memoized AchievementSystem with persistence
 */
export const AchievementSystem = memo(({
  progress,
  dailyLogsCount,
  currentStreak,
  completedGoalsCount,
  wallet,
  bounties = []
}: AchievementSystemProps) => {
  const totalHours = (progress.studyHours?.morning || 0) + (progress.studyHours?.evening || 0) + (progress.studyHours?.night || 0);

  // Permanently unlocked achievements (saved to file)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved achievements on mount
  useEffect(() => {
    const loadSavedAchievements = async () => {
      if (window.electronAPI?.readFile) {
        try {
          const result = await window.electronAPI.readFile('achievements.json');
          if (result.success && result.data?.unlockedIds) {
            setUnlockedIds(new Set(result.data.unlockedIds));
          }
        } catch (error) {
          console.error('Failed to load achievements:', error);
        }
      }
      setIsLoaded(true); // Mark as loaded even if no file exists
    };
    loadSavedAchievements();
  }, []);

  // Calculate bounty earnings from wallet transactions
  const bountyEarnings = wallet?.transactions
    ?.filter(t => t.category === 'bounty' && t.type === 'income')
    ?.reduce((sum, t) => sum + t.amount, 0) || 0;

  // Count high severity findings across all bounties (only ACCEPTED ones count!)
  const highSeverityCount = bounties
    .flatMap(b => b.findings || [])
    .filter(f => (f.severity === 'High' || f.severity === 'Critical') && f.status === 'accepted')
    .length;

  // Check if achievement is currently met
  const checkAchievementMet = (id: string): boolean => {
    switch (id) {
      case 'first_log': return dailyLogsCount >= 1;
      case 'week_warrior': return currentStreak >= 7;
      case 'month_master': return currentStreak >= 30;
      case 'time_investor': return totalHours >= 100;
      case 'high_severity': return highSeverityCount >= 1;
      case 'bounty_hunter_1k': return bountyEarnings >= 1000;
      case 'bug_hunter': return progress.bugs >= 1;
      case 'first_bounty': return progress.earnings > 0;
      case 'goal_setter': return completedGoalsCount >= 5;
      case 'dedication': return totalHours >= 500;
      default: return false;
    }
  };

  // Get current value for progress bar (use requirement if permanently unlocked)
  const getCurrentValue = (id: string, liveValue: number, requirement: number): number => {
    if (unlockedIds.has(id)) return requirement; // Show full if permanently unlocked
    return liveValue;
  };

  const achievements: Achievement[] = [
    { id: 'first_log', name: 'Initiate Link', description: 'Create your first daily log entry.', icon: Star, requirement: 1, current: getCurrentValue('first_log', dailyLogsCount, 1), unlocked: unlockedIds.has('first_log') || dailyLogsCount >= 1 },
    { id: 'week_warrior', name: 'Orbital Streak', description: 'Maintain a 7-day login streak.', icon: Flame, requirement: 7, current: getCurrentValue('week_warrior', currentStreak, 7), unlocked: unlockedIds.has('week_warrior') || currentStreak >= 7 },
    { id: 'month_master', name: 'Lunar Master', description: 'Maintain a 30-day streak.', icon: Trophy, requirement: 30, current: getCurrentValue('month_master', currentStreak, 30), unlocked: unlockedIds.has('month_master') || currentStreak >= 30 },
    { id: 'time_investor', name: 'Deep Focus', description: 'Reach 100 total study hours.', icon: Clock, requirement: 100, current: getCurrentValue('time_investor', totalHours, 100), unlocked: unlockedIds.has('time_investor') || totalHours >= 100 },
    { id: 'high_severity', name: 'Critical Hit', description: 'Find a High or Critical severity bug.', icon: AlertTriangle, requirement: 1, current: getCurrentValue('high_severity', highSeverityCount, 1), unlocked: unlockedIds.has('high_severity') || highSeverityCount >= 1 },
    { id: 'bounty_hunter_1k', name: 'Bounty Hunter $1K', description: 'Earn $1,000 from bug bounties.', icon: Coins, requirement: 1000, current: getCurrentValue('bounty_hunter_1k', bountyEarnings, 1000), unlocked: unlockedIds.has('bounty_hunter_1k') || bountyEarnings >= 1000 },
    { id: 'bug_hunter', name: 'Glitch Fixer', description: 'Resolve your first code bug.', icon: Bug, requirement: 1, current: getCurrentValue('bug_hunter', progress.bugs, 1), unlocked: unlockedIds.has('bug_hunter') || progress.bugs >= 1 },
    { id: 'first_bounty', name: 'Credit Earned', description: 'Earn your first freelance payout.', icon: DollarSign, requirement: 1, current: getCurrentValue('first_bounty', progress.earnings > 0 ? 1 : 0, 1), unlocked: unlockedIds.has('first_bounty') || progress.earnings > 0 },
    { id: 'goal_setter', name: 'Mission Complete', description: 'Complete 5 primary goals.', icon: Target, requirement: 5, current: getCurrentValue('goal_setter', completedGoalsCount, 5), unlocked: unlockedIds.has('goal_setter') || completedGoalsCount >= 5 },
    { id: 'dedication', name: 'Grand Admiral', description: 'Reach 500 total study hours.', icon: Zap, requirement: 500, current: getCurrentValue('dedication', totalHours, 500), unlocked: unlockedIds.has('dedication') || totalHours >= 500 },
  ];

  // Track IDs we've already processed to prevent re-saving
  const savedIdsRef = useRef<Set<string>>(new Set());

  // Save newly unlocked achievements to file (only genuinely new ones)
  useEffect(() => {
    // CRITICAL: Don't save until we've loaded existing achievements
    if (!isLoaded) return;

    const saveNewUnlocks = async () => {
      // Find achievements that are unlocked NOW but weren't in our saved set
      const genuinelyNew = achievements
        .filter(a => a.unlocked && !savedIdsRef.current.has(a.id) && !unlockedIds.has(a.id))
        .map(a => a.id);

      if (genuinelyNew.length > 0 && window.electronAPI?.saveFile) {
        const updatedIds = new Set([...unlockedIds, ...genuinelyNew]);
        savedIdsRef.current = updatedIds;
        setUnlockedIds(updatedIds);
        try {
          await window.electronAPI.saveFile('achievements.json', {
            unlockedIds: Array.from(updatedIds),
            lastUpdated: new Date().toISOString()
          });

          // Send notification for each new achievement
          genuinelyNew.forEach(achievementId => {
            const achievement = achievements.find(a => a.id === achievementId);
            if (achievement) {
              addNotification(
                'achievement',
                `🏆 ${achievement.name} Unlocked!`,
                achievement.description,
                { tab: 'dashboard' }
              );
            }
          });
        } catch (error) {
          console.error('Failed to save achievements:', error);
        }
      }
    };

    saveNewUnlocks();
  }, [isLoaded, dailyLogsCount, currentStreak, totalHours, highSeverityCount, bountyEarnings, progress.bugs, progress.earnings, completedGoalsCount]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const progressPercentage = (unlockedCount / achievements.length) * 100;

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--neptune-primary-dim)] border border-[var(--neptune-primary-dim)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[var(--neptune-primary)] flex items-center justify-center shadow-[0_0_15px_var(--neptune-primary-glow)]">
            <Award className="w-6 h-6 text-black" />
          </div>
          <div>
            <h3 className="font-display tracking-widest text-lg text-[var(--neptune-text-primary)]">ACHIEVEMENTS</h3>
            <p className="text-xs font-mono text-[var(--neptune-text-muted)]">
              SYNC STATUS: {unlockedCount}/{achievements.length} UNLOCKED
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-display text-[var(--neptune-primary)] neptune-text-glow">
            {Math.round(progressPercentage)}%
          </div>
        </div>
      </div>

      {/* Hex Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {achievements.map((achievement, i) => {
          const Icon = achievement.icon;
          const percentage = Math.min((achievement.current / achievement.requirement) * 100, 100);

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`
                relative group overflow-hidden p-4 rounded-xl border transition-all duration-300
                flex flex-col items-center text-center
                ${achievement.unlocked
                  ? 'bg-[var(--neptune-glass)] border-[var(--neptune-primary-dim)]'
                  : 'bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.05)] opacity-60 grayscale'
                }
              `}
            >
              {/* Unlock Glow */}
              {achievement.unlocked && (
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--neptune-primary-dim)] to-transparent opacity-0 group-hover:opacity-30 transition-opacity" />
              )}

              {/* Icon */}
              <div className={`
                w-14 h-14 mb-3 rounded-full flex items-center justify-center relative
                ${achievement.unlocked
                  ? 'text-[var(--neptune-primary)] drop-shadow-[0_0_8px_var(--neptune-primary)]'
                  : 'text-[var(--neptune-text-muted)]'
                }
              `}>
                <Hexagon className="w-full h-full absolute stroke-1 opacity-20" />
                {achievement.unlocked ? <Icon size={24} /> : <Lock size={20} />}
              </div>

              {/* Info */}
              <h4 className={`text-sm font-bold mb-1 tracking-wide ${achievement.unlocked ? 'text-[var(--neptune-text-primary)]' : 'text-[var(--neptune-text-muted)]'}`}>
                {achievement.name}
              </h4>
              <p className="text-[10px] text-[var(--neptune-text-muted)] mb-3 leading-tight min-h-[2.5em]">
                {achievement.description}
              </p>

              {/* Progress Line */}
              <div className="w-full h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden mt-auto">
                <div
                  className={`h-full transition-all duration-1000 ${achievement.unlocked ? 'bg-[var(--neptune-primary)] shadow-[0_0_5px_var(--neptune-primary)]' : 'bg-[var(--neptune-text-muted)]'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Progress Value Text */}
              <div className="mt-1.5 text-[9px] font-mono text-[var(--neptune-text-muted)]">
                {(() => {
                  const { current, requirement, id } = achievement;
                  // Format based on achievement type
                  if (id.includes('bounty_hunter') || id === 'first_bounty') {
                    return `$${current.toLocaleString()}/$${requirement.toLocaleString()}`;
                  } else if (id.includes('streak') || id === 'week_warrior' || id === 'month_master') {
                    return `${current}/${requirement} days`;
                  } else if (id.includes('time') || id === 'dedication') {
                    return `${current}/${requirement} hrs`;
                  } else if (id === 'goal_setter') {
                    return `${current}/${requirement} goals`;
                  } else if (id.includes('bug') || id === 'high_severity') {
                    return `${current}/${requirement} bugs`;
                  } else {
                    return `${current}/${requirement}`;
                  }
                })()}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
AchievementSystem.displayName = 'AchievementSystem';

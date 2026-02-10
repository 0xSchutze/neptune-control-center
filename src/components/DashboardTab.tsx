import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Bug, Smile } from 'lucide-react';
import { Progress as ProgressType } from '@/types';
import { StatsCard } from './StatsCard';
import { QuickActions } from './QuickActions';
import { StreakTracker } from './StreakTracker';
import { StudyTimer } from './StudyTimer';
import TodaysMission from './TodaysMission';
import './neptune/neptune-design.css';

interface DashboardTabProps {
    progress: ProgressType;
    weeklyStats: { days: number; hours: number; avgMood: string };
    onNavigate: (tab: any) => void;
}

export const DashboardTab = memo(({
    progress,
    weeklyStats,
    onNavigate
}: DashboardTabProps) => {
    const totalHours = (progress.studyHours?.morning || 0) + (progress.studyHours?.evening || 0) + (progress.studyHours?.night || 0);

    // --- PARALLAX EFFECT LOGIC ---

    // Load pinned goal image
    const [pinnedGoalImage, setPinnedGoalImage] = useState<string | null>(null);
    const pinnedGoal = progress.wallet?.financialGoals?.find(g => g.isPinned);

    useEffect(() => {
        const loadImage = async () => {
            if (pinnedGoal?.imagePath && window.electronAPI?.readMedia) {
                try {
                    const result = await window.electronAPI.readMedia(pinnedGoal.imagePath);
                    if (result?.success && result.dataUrl) {
                        setPinnedGoalImage(result.dataUrl);
                    }
                } catch (err) {
                    console.error('Failed to load goal image:', err);
                }
            } else {
                setPinnedGoalImage(null);
            }
        };
        loadImage();
    }, [pinnedGoal?.imagePath]);

    return (
        <div className="flex flex-col h-full gap-6 relative overflow-hidden">
            {/* OPTIMIZED: Removed neptune-scanline overlay for better scroll performance */}

            {/* Main Content */}
            <motion.div
                className="flex flex-col h-full gap-6 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* HEADER: Greeting & Context */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-end border-b border-[rgba(255,255,255,0.05)] pb-4 flex-none"
                >
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-display text-[var(--neptune-text-primary)] tracking-tight">Control Center</h2>
                            <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono animate-pulse" style={{ animationDuration: '3s' }}>
                                ONLINE
                            </div>
                        </div>
                        <div className="text-[var(--neptune-text-muted)] font-mono text-xs mt-1 tracking-wider uppercase opacity-60">
                            {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </motion.div>

                {/* ROW 1: STATS OVERVIEW (4 Cards) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
                    <StatsCard icon={Clock} label="TOTAL HOURS" value={`${totalHours}h`} description={`This week: ${weeklyStats.hours}h`} gradient="primary" delay={0} />
                    <StatsCard icon={DollarSign} label="EARNINGS" value={`$${(progress.wallet?.balance || 0).toLocaleString('en-US')}`} description={`Net: +$${(progress.earnings || 0).toLocaleString('en-US')}`} gradient="success" delay={0.1} />
                    <StatsCard icon={Bug} label="BUGS FOUND" value={progress.bugs || 0} description="Vulnerabilities detected" gradient="warning" delay={0.2} />
                    <StatsCard icon={Smile} label="AVG MOOD" value={`${weeklyStats.avgMood}/10`} description="Weekly average" gradient="danger" delay={0.3} />
                </div>

                {/* ROW 2: PRIORITY OBJECTIVE / FINANCIAL GOAL */}
                {(() => {
                    const pinnedGoal = progress.wallet?.financialGoals?.find(g => g.isPinned);
                    const goalTitle = pinnedGoal?.title || 'Set a Financial Goal';
                    const goalIcon = pinnedGoal?.icon || '🎯';
                    const goalTarget = pinnedGoal?.targetAmount || 1000;
                    const currentBalance = progress.wallet?.balance || 0;
                    const goalProgress = pinnedGoal ? Math.min((currentBalance / goalTarget) * 100, 100) : 0;

                    return (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 }}
                            className="neptune-glass-panel rounded-xl p-4 border border-[var(--neptune-primary-dim)] relative overflow-hidden flex-none flex items-center gap-6"
                        >
                            {/* Bg Glow */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--neptune-primary)]" />
                            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--neptune-primary-dim)] to-transparent opacity-30" />

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded bg-[var(--neptune-primary-dim)] flex items-center justify-center overflow-hidden">
                                    {pinnedGoalImage ? (
                                        <img src={pinnedGoalImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl">{goalIcon}</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-display text-sm text-[var(--neptune-text-primary)] uppercase tracking-wider">
                                        {pinnedGoal ? `Savings Goal: ${goalTitle}` : 'No Goal Pinned'}
                                    </h4>
                                    <p className="font-mono text-[10px] text-[var(--neptune-text-muted)]">
                                        {pinnedGoal
                                            ? `Target: $${goalTarget.toLocaleString()} • Saved: $${currentBalance.toLocaleString()}`
                                            : 'Go to Wallet → Add a goal → Pin to Dashboard'
                                        }
                                    </p>
                                </div>
                            </div>

                            {pinnedGoal && (
                                <div className="flex-1 px-4">
                                    <div className="flex justify-between text-[10px] font-mono text-[var(--neptune-text-secondary)] mb-1">
                                        <span>PROGRESS STATUS</span>
                                        <span>{goalProgress.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-[rgba(0,0,0,0.5)] rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${goalProgress}%` }}
                                            transition={{ duration: 1 }}
                                            className="h-full bg-[var(--neptune-primary)] shadow-[0_0_10px_var(--neptune-primary)] relative"
                                        >
                                            <div className="absolute inset-0 bg-white/10 animate-pulse" style={{ animationDuration: '4s' }} />
                                        </motion.div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })()}

                {/* ROW 3: TODAY'S MISSION (AI Generated) */}
                <div className="flex-none">
                    <TodaysMission logs={progress.dailyLogs} />
                </div>

                {/* ROW 4: MAIN OPERATIONS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0"> {/* Max depth */}

                    {/* LEFT: Temporal Engine (Span 8) */}
                    <div className="lg:col-span-8">
                        <StudyTimer
                            onSessionComplete={() => { }}
                            bounties={progress.bounties}
                            goals={progress.goals}
                            notes={progress.notes}
                            snippets={progress.snippets}
                        />
                    </div>

                    {/* RIGHT: Command Deck (Span 4) */}
                    <div className="lg:col-span-4">
                        <QuickActions onNavigate={onNavigate} onAddLog={() => { }} />
                    </div>

                    {/* BOTTOM: Reactor Core (Span 12 - Full Width) */}
                    <div className="lg:col-span-12">
                        <StreakTracker dailyLogs={progress.dailyLogs} />
                    </div>
                </div>
            </motion.div>
        </div>
    );
});
DashboardTab.displayName = 'DashboardTab';

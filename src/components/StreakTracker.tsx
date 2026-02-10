import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import { Flame, Calendar, Trophy, TrendingUp, Zap, Activity } from 'lucide-react';
import { DailyLog } from '@/types';
import './neptune/neptune-design.css';

interface StreakTrackerProps {
    dailyLogs: DailyLog[];
}

/**
 * OPTIMIZED: Memoized StreakTracker with useMemo for expensive calculations
 */
export const StreakTracker = memo(({ dailyLogs }: StreakTrackerProps) => {
    // Helper: Parse YYYY-MM-DD string to local midnight Date
    const parseLocalDate = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
    };

    // Helper: Get today at local midnight
    const getToday = (): Date => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    };

    // Memoized: Calculate streak only when dailyLogs change
    const currentStreak = useMemo(() => {
        if (dailyLogs.length === 0) return 0;

        // Sort by date descending (most recent first)
        const sortedLogs = [...dailyLogs].sort((a, b) =>
            parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
        );

        const today = getToday();
        let streak = 0;
        let expectedDate = new Date(today);

        for (const log of sortedLogs) {
            const logDate = parseLocalDate(log.date);
            const diffDays = Math.floor((expectedDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else if (diffDays === 1) {
                streak++;
                expectedDate = new Date(logDate);
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }, [dailyLogs]);

    // Memoized: Calculate week activity only when dailyLogs change
    const weekActivity = useMemo(() => {
        const today = getToday();
        const weekDays = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            const logsForDay = dailyLogs.filter(l => l.date === dateStr);
            const totalHours = logsForDay.reduce((sum, log) => sum + (log.hours || 0), 0);
            const hasLog = logsForDay.length > 0;

            weekDays.push({
                date,
                hours: totalHours,
                hasLog,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
            });
        }
        return weekDays;
    }, [dailyLogs]);

    const intensity = Math.min(currentStreak / 7, 1); // 0 to 1 based on week streak

    // Calculate total weekly hours
    const totalWeeklyHours = weekActivity.reduce((sum, day) => sum + day.hours, 0);
    const activeDays = weekActivity.filter(d => d.hasLog).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="neptune-glass-panel rounded-xl p-6 relative overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500 opacity-20 animate-pulse" style={{ animationDuration: `${2 - intensity}s` }} />
                        <Activity className="w-5 h-5 text-blue-400 relative z-10" />
                    </div>
                    <div>
                        <h3 className="font-display tracking-widest text-lg text-[var(--neptune-text-primary)] uppercase">Activity Streak</h3>
                        <p className="text-[10px] font-mono text-blue-400">
                            {activeDays}/7 days • {totalWeeklyHours}h total
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-display text-blue-400" style={{ textShadow: '0 0 20px rgba(59,130,246,0.5)' }}>
                        {currentStreak}<span className="text-sm ml-1 opacity-50">day streak</span>
                    </div>
                </div>
            </div>

            {/* Premium Graph */}
            <div className="flex justify-between items-end gap-3 mb-4" style={{ height: '100px' }}>
                {weekActivity.map((day, i) => {
                    const maxHours = Math.max(...weekActivity.map(d => d.hours), 1);
                    const heightPercent = day.hasLog
                        ? Math.max(20, (day.hours / maxHours) * 100)
                        : 8;
                    const isActive = day.hasLog;
                    const isToday = i === 6;

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            {/* Hours label on hover */}
                            {isActive && (
                                <div className="text-[10px] font-mono text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {day.hours}h
                                </div>
                            )}
                            {/* Bar container */}
                            <div
                                className={`relative w-full rounded-lg overflow-hidden transition-all duration-300 ${isToday ? 'ring-2 ring-blue-500/50' : ''}`}
                                style={{
                                    height: '70px',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.2) 100%)'
                                }}
                            >
                                {/* Gradient bar */}
                                <div
                                    className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${isActive
                                        ? 'bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400'
                                        : 'bg-[rgba(255,255,255,0.05)]'
                                        }`}
                                    style={{
                                        height: `${heightPercent}%`,
                                        boxShadow: isActive ? '0 0 15px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                                    }}
                                />
                                {/* Shine effect */}
                                {isActive && (
                                    <div
                                        className="absolute bottom-0 left-0 w-1/2 h-full opacity-20"
                                        style={{
                                            background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                                            height: `${heightPercent}%`
                                        }}
                                    />
                                )}
                            </div>
                            {/* Day label */}
                            <span className={`text-[10px] font-mono text-center ${isToday
                                ? 'text-blue-400 font-bold'
                                : isActive
                                    ? 'text-blue-300'
                                    : 'text-[var(--neptune-text-muted)]'
                                }`}>
                                {day.dayName}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Stats Row */}
            <div className="flex justify-between items-center pt-4 border-t border-[rgba(59,130,246,0.1)]">
                <div className="flex gap-6">
                    <div>
                        <span className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase">Best Day</span>
                        <p className="text-sm font-mono text-blue-300">
                            {weekActivity.reduce((best, day) => day.hours > best.hours ? day : best, weekActivity[0]).dayName} ({Math.max(...weekActivity.map(d => d.hours))}h)
                        </p>
                    </div>
                    <div>
                        <span className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase">Avg/Day</span>
                        <p className="text-sm font-mono text-blue-300">
                            {activeDays > 0 ? (totalWeeklyHours / activeDays).toFixed(1) : 0}h
                        </p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-mono ${currentStreak >= 5 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    currentStreak >= 2 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-[rgba(255,255,255,0.05)] text-[var(--neptune-text-muted)] border border-[rgba(255,255,255,0.1)]'
                    }`}>
                    {currentStreak >= 5 ? '🔥 On Fire!' : currentStreak >= 2 ? '⚡ Building Momentum' : currentStreak >= 1 ? '✓ Started' : 'Start logging!'}
                </div>
            </div>
        </motion.div>
    );
});
StreakTracker.displayName = 'StreakTracker';

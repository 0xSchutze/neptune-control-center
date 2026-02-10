// TodaysMission.tsx - Daily Command Briefing showing yesterday's AI review
import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, ChevronDown, Zap, TrendingUp, AlertTriangle, Lightbulb, Award, Calendar, Activity } from 'lucide-react';
import type { DailyLog } from '../types';

interface TodaysMissionProps {
    logs: DailyLog[];
}

interface MissionItem {
    id: string;
    text: string;
    completed: boolean;
}

interface DayReviewData {
    date: string;
    primaryMissions: string[];
    strengths: string[];
    weaknesses: string[];
    insights: string[];
    hours: number;
    mood: number;
}

// localStorage key for mission completion
const MISSION_STORAGE_KEY = 'todaysMission_completed';

const TodaysMission: React.FC<TodaysMissionProps> = memo(({ logs }) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set());

    // Load completed missions from localStorage
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const stored = localStorage.getItem(MISSION_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.date === today) {
                    setCompletedMissions(new Set(parsed.completed));
                } else {
                    localStorage.removeItem(MISSION_STORAGE_KEY);
                }
            } catch {
                localStorage.removeItem(MISSION_STORAGE_KEY);
            }
        }
    }, []);

    // Toggle mission completion
    const toggleMission = (missionId: string) => {
        setCompletedMissions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(missionId)) {
                newSet.delete(missionId);
            } else {
                newSet.add(missionId);
            }

            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify({
                date: today,
                completed: Array.from(newSet)
            }));

            return newSet;
        });
    };

    // Get the most recent log with AI review (BEFORE today)
    const dayReview = useMemo((): DayReviewData | null => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Filter: has AI review AND is before today
        const logsWithAI = logs.filter(log => log.aiReview && log.date < todayStr);
        if (logsWithAI.length === 0) return null;

        // Get the most recent log before today
        const targetLog = logsWithAI
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (!targetLog) return null;

        return {
            date: targetLog.date,
            primaryMissions: targetLog.aiReview?.tomorrowFocus || [],
            strengths: targetLog.aiReview?.strengths || [],
            weaknesses: targetLog.aiReview?.weaknesses || [],
            insights: targetLog.aiReview?.insights || [],
            hours: targetLog.hours || 0,
            mood: targetLog.mood || 0
        };
    }, [logs]);

    // Create mission items
    const missionItems: MissionItem[] = useMemo(() => {
        if (!dayReview) return [];
        return dayReview.primaryMissions.map((text, idx) => ({
            id: `mission-${idx}`,
            text,
            completed: completedMissions.has(`mission-${idx}`)
        }));
    }, [dayReview, completedMissions]);

    const completedCount = missionItems.filter(m => m.completed).length;
    const progressPercent = missionItems.length > 0 ? (completedCount / missionItems.length) * 100 : 0;

    // No data state
    if (!dayReview) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
            >
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider relative z-10">
                    <Target className="w-5 h-5 text-[var(--neptune-primary)]" />
                    Today's Mission
                </h2>

                <div className="text-center py-10 border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)] relative z-10">
                    <Target className="w-8 h-8 text-[var(--neptune-text-muted)] mx-auto mb-2" />
                    <p className="text-sm font-display text-[var(--neptune-text-secondary)]">No mission data available</p>
                    <p className="text-[10px] font-mono text-[var(--neptune-text-muted)] mt-1">Submit a daily log to initialize</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--neptune-primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--neptune-secondary)]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider">
                        <Target className="w-5 h-5 text-[var(--neptune-primary)]" />
                        Today's Mission
                    </h2>

                    <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 rounded-lg bg-[rgba(0,180,216,0.05)] border border-[rgba(0,180,216,0.1)] text-[10px] font-mono text-[var(--neptune-primary)]">
                            {dayReview.hours}h WORKED
                        </div>
                        <div className="text-[10px] font-mono text-[var(--neptune-text-muted)] flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            Based on {new Date(dayReview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {missionItems.length > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-mono uppercase text-[var(--neptune-text-muted)] mb-1.5 pl-1">
                            <span>Mission Progress</span>
                            <span className={progressPercent === 100 ? 'text-green-400' : 'text-[var(--neptune-primary)]'}>
                                {Math.round(progressPercent)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.8, ease: 'circOut' }}
                                className={`h-full relative ${progressPercent === 100
                                    ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                    : 'bg-[var(--neptune-primary)] shadow-[0_0_10px_rgba(0,180,216,0.5)]'
                                    }`}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Mission Items */}
            <div className="space-y-3 relative z-10 mb-6">
                <AnimatePresence>
                    {missionItems.map((mission, idx) => (
                        <motion.div
                            key={mission.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => toggleMission(mission.id)}
                            className={`
                                p-4 rounded-xl border transition-all relative overflow-hidden group cursor-pointer
                                ${mission.completed
                                    ? 'bg-green-500/10 border-green-500/20'
                                    : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[var(--neptune-primary-dim)]'
                                }
                            `}
                        >
                            <div className="flex items-start gap-3 relative z-10">
                                <div className={`
                                    flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all duration-300 mt-0.5
                                    ${mission.completed
                                        ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                        : 'border border-[var(--neptune-text-muted)] group-hover:border-[var(--neptune-primary)]'
                                    }
                                `}>
                                    {mission.completed && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                                </div>
                                <span className={`
                                    text-sm transition-all duration-300 font-light leading-relaxed
                                    ${mission.completed
                                        ? 'text-green-400 line-through opacity-70'
                                        : 'text-[var(--neptune-text-primary)] group-hover:text-white'
                                    }
                                `}>
                                    {mission.text}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {missionItems.length === 0 && (
                    <div className="text-center py-8 text-[var(--neptune-text-muted)] border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]">
                        <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <span className="text-xs font-mono">NO ACTIVE MISSIONS</span>
                    </div>
                )}
            </div>

            {/* Analysis Sections (Expandable) */}
            <div className="space-y-2 relative z-10 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                {/* Strengths */}
                {dayReview.strengths.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-transparent hover:border-[rgba(255,255,255,0.05)] transition-colors">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'strengths' ? null : 'strengths')}
                            className="w-full flex items-center justify-between p-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Award className="w-4 h-4 text-yellow-500 group-hover:drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                                <span className="text-xs font-display text-[var(--neptune-text-secondary)] uppercase tracking-wider">
                                    Strengths
                                </span>
                                <span className="text-[9px] text-[var(--neptune-void-bg)] bg-yellow-500/80 px-1.5 py-0.5 rounded-sm font-bold font-mono">
                                    {dayReview.strengths.length}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-[var(--neptune-text-muted)] transition-transform duration-300 ${expandedSection === 'strengths' ? 'rotate-180 text-yellow-500' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'strengths' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <div className="px-3 pb-3 pt-1 space-y-2">
                                        {dayReview.strengths.map((strength, idx) => (
                                            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-yellow-500/5 border border-yellow-500/10">
                                                <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-yellow-500 flex-shrink-0" />
                                                <span className="text-xs text-[var(--neptune-text-primary)]">{strength}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Weaknesses */}
                {dayReview.weaknesses.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-transparent hover:border-[rgba(255,255,255,0.05)] transition-colors">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'weaknesses' ? null : 'weaknesses')}
                            className="w-full flex items-center justify-between p-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-red-500 group-hover:drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                <span className="text-xs font-display text-[var(--neptune-text-secondary)] uppercase tracking-wider">
                                    Areas to Improve
                                </span>
                                <span className="text-[9px] text-[var(--neptune-void-bg)] bg-red-500/80 px-1.5 py-0.5 rounded-sm font-bold font-mono">
                                    {dayReview.weaknesses.length}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-[var(--neptune-text-muted)] transition-transform duration-300 ${expandedSection === 'weaknesses' ? 'rotate-180 text-red-500' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'weaknesses' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <div className="px-3 pb-3 pt-1 space-y-2">
                                        {dayReview.weaknesses.map((weakness, idx) => (
                                            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/10">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                                <span className="text-xs text-[var(--neptune-text-primary)]">{weakness}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Insights */}
                {dayReview.insights.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-transparent hover:border-[rgba(255,255,255,0.05)] transition-colors">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'insights' ? null : 'insights')}
                            className="w-full flex items-center justify-between p-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Lightbulb className="w-4 h-4 text-[var(--neptune-primary)] group-hover:drop-shadow-[0_0_5px_var(--neptune-primary-glow)]" />
                                <span className="text-xs font-display text-[var(--neptune-text-secondary)] uppercase tracking-wider">
                                    AI Insights
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-[var(--neptune-text-muted)] transition-transform duration-300 ${expandedSection === 'insights' ? 'rotate-180 text-[var(--neptune-primary)]' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'insights' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <div className="px-3 pb-3 pt-1 space-y-2">
                                        {dayReview.insights.map((insight, idx) => (
                                            <div key={idx} className="p-3 rounded bg-[var(--neptune-primary)]/5 border-l-2 border-[var(--neptune-primary)]">
                                                <p className="text-xs text-[var(--neptune-text-secondary)] italic leading-relaxed">
                                                    "{insight}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

TodaysMission.displayName = 'TodaysMission';

export default TodaysMission;

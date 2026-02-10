// AIReviewsTab.tsx - Main component for hierarchical AI reviews
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, TrendingUp, Target, Award, AlertTriangle,
    Lightbulb, ChevronDown, ChevronRight, Loader2, RefreshCw,
    BarChart3, Zap, Star, ArrowUpRight, FileText, Twitter, Copy, Check, X
} from 'lucide-react';
import type { DailyLog, UserProfile } from '../types';
import { WeeklyReview, MonthlyReview, YearlyReview, ReviewsData } from '../types/aiAnalysis';
import { addNotification } from '../stores/NotificationStore';
import {
    readReviewsData,
    saveReviewsData,
    generateWeeklyReview,
    generateMonthlyReview,
    generateYearlyReview,
    getWeekNumber,
    getCurrentMonth,
    getPreviousWeek,
    getPreviousMonth,
    checkAndGenerateMissingReviews
} from '../services/reviewService';

const TWEET_MODEL = 'openai/gpt-oss-120b';

interface AIReviewsTabProps {
    dailyLogs: DailyLog[];
}

type SubTab = 'daily' | 'weekly' | 'monthly' | 'yearly';

const AIReviewsTab: React.FC<AIReviewsTabProps> = memo(({ dailyLogs }) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('weekly');
    const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedReview, setExpandedReview] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState<string>('');
    const [tweetModal, setTweetModal] = useState<{ open: boolean; type: 'monthly' | 'yearly'; review: MonthlyReview | YearlyReview | null }>({ open: false, type: 'monthly', review: null });
    const [generatedTweet, setGeneratedTweet] = useState<string>('');
    const [isGeneratingTweet, setIsGeneratingTweet] = useState(false);
    const [tweetCopied, setTweetCopied] = useState(false);

    // Load API key and reviews data
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load API key
                const settingsResult = await (window as any).electronAPI.readFile('settings.json');
                if (settingsResult.success && settingsResult.data) {
                    const settings = typeof settingsResult.data === 'string' ? JSON.parse(settingsResult.data) : settingsResult.data;
                    setApiKey(settings.apiKey || settings.groqApiKey || '');
                }

                // Load reviews
                const reviews = await readReviewsData();
                setReviewsData(reviews);
            } catch (error) {
                console.error('[AI-REVIEWS] Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Check and generate missing reviews on mount
    useEffect(() => {
        const checkMissing = async () => {
            if (!apiKey || dailyLogs.length === 0) return;

            try {
                // Load user profile
                let userProfile: UserProfile | undefined;
                const profileResult = await (window as any).electronAPI.readFile('UserProfile.json');
                if (profileResult.success && profileResult.data) {
                    userProfile = typeof profileResult.data === 'string' ? JSON.parse(profileResult.data) : profileResult.data;
                }

                const result = await checkAndGenerateMissingReviews(dailyLogs, apiKey, userProfile);
                if (result.generated > 0) {
                    const updatedReviews = await readReviewsData();
                    setReviewsData(updatedReviews);
                }
            } catch (error) {
                console.error('[AI-REVIEWS] Error checking missing reviews:', error);
            }
        };

        if (!isLoading && apiKey) {
            checkMissing();
        }
    }, [isLoading, apiKey, dailyLogs]);

    // Generate review for specific period
    const handleGenerateReview = useCallback(async (type: 'weekly' | 'monthly' | 'yearly', period: string | number) => {
        if (!apiKey || isGenerating) return;

        setIsGenerating(true);
        try {
            let userProfile: UserProfile | undefined;
            const profileResult = await (window as any).electronAPI.readFile('UserProfile.json');
            if (profileResult.success && profileResult.data) {
                userProfile = typeof profileResult.data === 'string' ? JSON.parse(profileResult.data) : profileResult.data;
            }

            const reviews = reviewsData || await readReviewsData();
            let newReview: WeeklyReview | MonthlyReview | YearlyReview | null = null;

            if (type === 'weekly') {
                newReview = await generateWeeklyReview(dailyLogs, period as string, apiKey, userProfile);
                if (newReview) {
                    reviews.weekly = reviews.weekly.filter(w => w.week !== period);
                    reviews.weekly.push(newReview);
                }
            } else if (type === 'monthly') {
                newReview = await generateMonthlyReview(reviews.weekly, period as string, apiKey, userProfile);
                if (newReview) {
                    reviews.monthly = reviews.monthly.filter(m => m.month !== period);
                    reviews.monthly.push(newReview);
                }
            } else if (type === 'yearly') {
                newReview = await generateYearlyReview(reviews.monthly, period as number, apiKey);
                if (newReview) {
                    reviews.yearly = reviews.yearly.filter(y => y.year !== period);
                    reviews.yearly.push(newReview);
                }
            }

            if (newReview) {
                await saveReviewsData(reviews);
                setReviewsData({ ...reviews });
            }
        } catch (error) {
            console.error('[AI-REVIEWS] Error generating review:', error);
        } finally {
            setIsGenerating(false);
        }
    }, [apiKey, isGenerating, dailyLogs, reviewsData]);

    // Generate tweet from review
    const handleGenerateTweet = useCallback(async (type: 'weekly' | 'monthly' | 'yearly', review: WeeklyReview | MonthlyReview | YearlyReview) => {
        if (!apiKey || isGeneratingTweet) return;

        setTweetModal({ open: true, type: type as 'monthly' | 'yearly', review: review as MonthlyReview | YearlyReview });
        setGeneratedTweet('');
        setIsGeneratingTweet(true);

        try {
            // Convert score to descriptive word
            const getScoreWord = (score: number): string => {
                if (score >= 9) return 'exceptional';
                if (score >= 8) return 'outstanding';
                if (score >= 7) return 'solid';
                if (score >= 6) return 'good';
                if (score >= 5) return 'steady';
                if (score >= 4) return 'moderate';
                return 'growing';
            };

            // Convert mood to descriptive word
            const getMoodWord = (mood: number): string => {
                if (mood >= 9) return 'amazing';
                if (mood >= 8) return 'great';
                if (mood >= 7) return 'positive';
                if (mood >= 6) return 'good';
                if (mood >= 5) return 'balanced';
                if (mood >= 4) return 'mixed';
                return 'challenging';
            };

            let context = '';
            if (type === 'weekly') {
                const w = review as WeeklyReview;
                context = `Weekly Review Summary (${w.week}):
${w.summary}

Key Achievements: ${w.keyAchievements.join(', ')}

Progress: ${getScoreWord(w.progressScore)} week
Overall mood: ${getMoodWord(w.averageMood)}
Total Hours: ${w.totalHours}h`;
            } else if (type === 'monthly') {
                const m = review as MonthlyReview;
                context = `Monthly Review Summary (${m.month}):
${m.summary}

Month Highlights: ${m.monthHighlights.join(', ')}

Progress: ${getScoreWord(m.progressScore)} month
Overall mood: ${getMoodWord(m.averageMood)}
Total Hours: ${m.totalHours}h`;
            } else {
                const y = review as YearlyReview;
                context = `Yearly Review Summary (${y.year}):
${y.summary}

Year Highlights: ${y.yearHighlights.join(', ')}

Progress: ${getScoreWord(y.progressScore)} year
Overall mood: ${getMoodWord(y.averageMood)}
Total Hours: ${y.totalHours}h`;
            }

            // Direct API call for review tweet
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        { role: 'system', content: 'You generate engaging Twitter/X posts. Respond only with valid JSON.' },
                        {
                            role: 'user', content: `You are a Web3 security researcher sharing your ${type} progress on Twitter.

CRITICAL: Generate a UNIQUE tweet celebrating this ${type} review achievement.

RULES:
1. Use ONLY info from the review - no hallucination
2. 250-280 characters MAX (count carefully!)
3. Include specific achievements and progress from the review
4. Add personal reaction (proud, wild, epic, grateful, etc.)
5. 1-2 emojis (🔥 🚀 💪 🎯 ⚡ 🧠)
6. End with punchy insight or motivation
7. Include relevant hashtags: #buildinpublic #Web3 #Security

=== YOUR ${type.toUpperCase()} REVIEW ===
${context}
================================

STYLE EXAMPLES (DO NOT COPY - just for format):
- "[Time period] of grinding: [achievement]. [Personal take] 🔥 #buildinpublic"
- "Just hit [milestone]! [Key stat]. [Motivational ending] 💪 #Web3"

Write a UNIQUE tweet about YOUR review. JSON only:
{
  "tweet": "your original 250-280 char tweet",
  "hashtags": ["buildinpublic", "Web3", "Security"]
}` }
                    ],
                    temperature: 1,
                    max_tokens: 4000,
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                // Check for rate limit (429)
                if (response.status === 429) {
                    addNotification(
                        'error',
                        'Token Limit Reached',
                        `Daily token limit exceeded for model "${TWEET_MODEL}". Tweet generation cannot continue. Please try again tomorrow.`,
                        { tab: 'settings' }
                    );
                    throw new Error(`Token limit reached for ${TWEET_MODEL}`);
                }
                const errorData = await response.json().catch(() => ({}));
                console.error('[AI-REVIEWS] Tweet API error:', response.status, errorData);
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from API');
            }

            // Parse JSON response
            try {
                const parsed = JSON.parse(content);
                setGeneratedTweet(parsed.tweet || content);
            } catch {
                // Fallback if not JSON
                setGeneratedTweet(content.replace(/^["']|["']$/g, '').trim());
            }
        } catch (error) {
            console.error('[AI-REVIEWS] Error generating tweet:', error);
            setGeneratedTweet(`Tweet generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsGeneratingTweet(false);
        }
    }, [apiKey, isGeneratingTweet]);

    const copyTweet = useCallback(() => {
        navigator.clipboard.writeText(generatedTweet);
        setTweetCopied(true);
        setTimeout(() => setTweetCopied(false), 2000);
    }, [generatedTweet]);

    // Get daily logs with AI reviews
    const dailyReviews = useMemo(() => {
        return dailyLogs
            .filter(log => log.aiReview)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyLogs]);

    // Sub-tab buttons
    const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
        { id: 'daily', label: 'Daily', icon: <FileText className="w-4 h-4" /> },
        { id: 'weekly', label: 'Weekly', icon: <Calendar className="w-4 h-4" /> },
        { id: 'monthly', label: 'Monthly', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'yearly', label: 'Yearly', icon: <Star className="w-4 h-4" /> }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-[var(--neptune-primary)] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--neptune-primary-dim)] to-purple-900/30 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-[var(--neptune-primary)]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-display text-[var(--neptune-text-primary)] tracking-wider">
                            AI Reviews
                        </h2>
                        <p className="text-xs text-[var(--neptune-text-muted)] font-mono">
                            Hierarchical productivity analysis
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex gap-2 p-1 bg-[rgba(0,0,0,0.3)] rounded-xl">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`
                            flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm transition-all
                            ${activeSubTab === tab.id
                                ? 'bg-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] border border-[var(--neptune-primary)]'
                                : 'text-[var(--neptune-text-muted)] hover:text-[var(--neptune-text-secondary)] hover:bg-[rgba(255,255,255,0.03)]'
                            }
                        `}
                    >
                        {tab.icon}
                        <span className="uppercase tracking-wider">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content based on active sub-tab */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSubTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeSubTab === 'daily' && (
                        <DailyReviewsList
                            reviews={dailyReviews}
                            expandedReview={expandedReview}
                            setExpandedReview={setExpandedReview}
                        />
                    )}

                    {activeSubTab === 'weekly' && (
                        <WeeklyReviewsList
                            reviews={reviewsData?.weekly || []}
                            onGenerate={(week) => handleGenerateReview('weekly', week)}
                            onGenerateTweet={(review) => handleGenerateTweet('weekly', review)}
                            isGenerating={isGenerating}
                            expandedReview={expandedReview}
                            setExpandedReview={setExpandedReview}
                            hasApiKey={!!apiKey}
                        />
                    )}

                    {activeSubTab === 'monthly' && (
                        <MonthlyReviewsList
                            reviews={reviewsData?.monthly || []}
                            onGenerate={(month) => handleGenerateReview('monthly', month)}
                            onGenerateTweet={(review) => handleGenerateTweet('monthly', review)}
                            isGenerating={isGenerating}
                            expandedReview={expandedReview}
                            setExpandedReview={setExpandedReview}
                            hasApiKey={!!apiKey}
                        />
                    )}

                    {activeSubTab === 'yearly' && (
                        <YearlyReviewsList
                            reviews={reviewsData?.yearly || []}
                            onGenerate={(year) => handleGenerateReview('yearly', year)}
                            onGenerateTweet={(review) => handleGenerateTweet('yearly', review)}
                            isGenerating={isGenerating}
                            expandedReview={expandedReview}
                            setExpandedReview={setExpandedReview}
                            hasApiKey={!!apiKey}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Tweet Modal */}
            <AnimatePresence>
                {tweetModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setTweetModal({ ...tweetModal, open: false })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="neptune-glass-panel p-6 rounded-2xl border border-[#1DA1F2]/30 w-full max-w-md"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                                    <h3 className="text-lg font-display text-[var(--neptune-text-primary)]">
                                        Generated Tweet
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setTweetModal({ ...tweetModal, open: false })}
                                    className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                                >
                                    <X className="w-5 h-5 text-[var(--neptune-text-muted)]" />
                                </button>
                            </div>

                            {isGeneratingTweet ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 text-[#1DA1F2] animate-spin" />
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 rounded-xl bg-[rgba(0,0,0,0.3)] mb-4">
                                        <p className="text-[var(--neptune-text-secondary)] whitespace-pre-wrap">
                                            {generatedTweet}
                                        </p>
                                        <p className="text-xs text-[var(--neptune-text-muted)] mt-2">
                                            {generatedTweet.length}/280 characters
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={copyTweet}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/30 transition-all"
                                        >
                                            {tweetCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {tweetCopied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <a
                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedTweet)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1DA1F2] text-white hover:bg-[#1DA1F2]/80 transition-all"
                                        >
                                            <Twitter className="w-4 h-4" />
                                            Post
                                        </a>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

// ================== SUB-COMPONENTS ==================

// Daily Reviews List
const DailyReviewsList: React.FC<{
    reviews: DailyLog[];
    expandedReview: string | null;
    setExpandedReview: (id: string | null) => void;
}> = ({ reviews, expandedReview, setExpandedReview }) => {
    if (reviews.length === 0) {
        return (
            <div className="neptune-glass-panel p-8 rounded-xl text-center">
                <FileText className="w-12 h-12 text-[var(--neptune-text-muted)] mx-auto mb-4" />
                <p className="text-[var(--neptune-text-muted)]">No daily reviews yet.</p>
                <p className="text-xs text-[var(--neptune-text-muted)] mt-2">
                    AI reviews are generated when you save a daily log.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {reviews.slice(0, 10).map(log => (
                <ReviewCard
                    key={log.id}
                    title={new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    subtitle={`${log.hours}h • Mood: ${log.mood}/10`}
                    isExpanded={expandedReview === `daily-${log.id}`}
                    onToggle={() => setExpandedReview(expandedReview === `daily-${log.id}` ? null : `daily-${log.id}`)}
                    progressScore={log.mood}
                >
                    <div className="space-y-4">
                        {log.aiReport && (
                            <div className="p-3 rounded-lg bg-[rgba(0,0,0,0.2)]">
                                <p className="text-sm text-[var(--neptune-text-secondary)]">{log.aiReport}</p>
                            </div>
                        )}

                        {log.aiReview?.strengths && log.aiReview.strengths.length > 0 && (
                            <ReviewSection title="Strengths" items={log.aiReview.strengths} icon={<TrendingUp className="w-4 h-4 text-green-400" />} color="green" />
                        )}

                        {log.aiReview?.weaknesses && log.aiReview.weaknesses.length > 0 && (
                            <ReviewSection title="Areas to Improve" items={log.aiReview.weaknesses} icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} color="orange" />
                        )}

                        {log.aiReview?.tomorrowFocus && log.aiReview.tomorrowFocus.length > 0 && (
                            <ReviewSection title="Focus Areas" items={log.aiReview.tomorrowFocus} icon={<Target className="w-4 h-4 text-cyan-400" />} color="cyan" />
                        )}
                    </div>
                </ReviewCard>
            ))}
        </div>
    );
};

// Weekly Reviews List
const WeeklyReviewsList: React.FC<{
    reviews: WeeklyReview[];
    onGenerate: (week: string) => void;
    onGenerateTweet: (review: WeeklyReview) => void;
    isGenerating: boolean;
    expandedReview: string | null;
    setExpandedReview: (id: string | null) => void;
    hasApiKey: boolean;
}> = ({ reviews, onGenerate, onGenerateTweet, isGenerating, expandedReview, setExpandedReview, hasApiKey }) => {
    const sortedReviews = useMemo(() =>
        [...reviews].sort((a, b) => b.week.localeCompare(a.week)),
        [reviews]
    );

    const currentWeek = getWeekNumber(new Date());
    const lastWeek = getPreviousWeek(currentWeek);
    const hasLastWeekReview = reviews.some(r => r.week === lastWeek);

    return (
        <div className="space-y-4">
            {/* Generate button for last week if missing */}
            {!hasLastWeekReview && hasApiKey && (
                <div className="neptune-glass-panel p-4 rounded-xl border border-dashed border-[var(--neptune-primary-dim)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[var(--neptune-text-primary)] font-mono">{lastWeek}</p>
                            <p className="text-xs text-[var(--neptune-text-muted)]">Last week's review not generated yet</p>
                        </div>
                        <button
                            onClick={() => onGenerate(lastWeek)}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] hover:bg-[var(--neptune-primary)] hover:text-black transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>
                </div>
            )}

            {sortedReviews.length === 0 ? (
                <div className="neptune-glass-panel p-8 rounded-xl text-center">
                    <Calendar className="w-12 h-12 text-[var(--neptune-text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--neptune-text-muted)]">No weekly reviews yet.</p>
                    <p className="text-xs text-[var(--neptune-text-muted)] mt-2">
                        Weekly reviews are generated from your daily logs.
                    </p>
                </div>
            ) : (
                sortedReviews.map(review => (
                    <ReviewCard
                        key={review.id}
                        title={`Week ${review.week.split('-W')[1]}`}
                        subtitle={`${review.startDate} - ${review.endDate} • ${review.totalHours}h • ${review.logsCount} logs`}
                        isExpanded={expandedReview === review.id}
                        onToggle={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                        progressScore={review.progressScore}
                    >
                        <div className="space-y-4">
                            <p className="text-sm text-[var(--neptune-text-secondary)]">{review.summary}</p>

                            {review.keyAchievements.length > 0 && (
                                <ReviewSection title="Key Achievements" items={review.keyAchievements} icon={<Award className="w-4 h-4 text-yellow-400" />} color="yellow" />
                            )}

                            {review.mainChallenges.length > 0 && (
                                <ReviewSection title="Main Challenges" items={review.mainChallenges} icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} color="orange" />
                            )}

                            {review.focusAreas.length > 0 && (
                                <ReviewSection title="Focus for Next Week" items={review.focusAreas} icon={<Target className="w-4 h-4 text-cyan-400" />} color="cyan" />
                            )}

                            {review.insights.length > 0 && (
                                <ReviewSection title="Insights" items={review.insights} icon={<Lightbulb className="w-4 h-4 text-purple-400" />} color="purple" />
                            )}

                            {/* Tweet Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onGenerateTweet(review); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(29,161,242,0.15)] text-[#1DA1F2] hover:bg-[rgba(29,161,242,0.25)] transition-all w-fit"
                            >
                                <Twitter className="w-4 h-4" />
                                Generate Tweet
                            </button>
                        </div>
                    </ReviewCard>
                ))
            )}
        </div>
    );
};

// Monthly Reviews List
const MonthlyReviewsList: React.FC<{
    reviews: MonthlyReview[];
    onGenerate: (month: string) => void;
    onGenerateTweet: (review: MonthlyReview) => void;
    isGenerating: boolean;
    expandedReview: string | null;
    setExpandedReview: (id: string | null) => void;
    hasApiKey: boolean;
}> = ({ reviews, onGenerate, onGenerateTweet, isGenerating, expandedReview, setExpandedReview, hasApiKey }) => {
    const sortedReviews = useMemo(() =>
        [...reviews].sort((a, b) => b.month.localeCompare(a.month)),
        [reviews]
    );

    const currentMonth = getCurrentMonth();
    const lastMonth = getPreviousMonth(currentMonth);
    const hasLastMonthReview = reviews.some(r => r.month === lastMonth);

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <div className="space-y-4">
            {!hasLastMonthReview && hasApiKey && (
                <div className="neptune-glass-panel p-4 rounded-xl border border-dashed border-[var(--neptune-primary-dim)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[var(--neptune-text-primary)] font-mono">{lastMonth}</p>
                            <p className="text-xs text-[var(--neptune-text-muted)]">Last month's review not generated yet</p>
                        </div>
                        <button
                            onClick={() => onGenerate(lastMonth)}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] hover:bg-[var(--neptune-primary)] hover:text-black transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>
                </div>
            )}

            {sortedReviews.length === 0 ? (
                <div className="neptune-glass-panel p-8 rounded-xl text-center">
                    <BarChart3 className="w-12 h-12 text-[var(--neptune-text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--neptune-text-muted)]">No monthly reviews yet.</p>
                    <p className="text-xs text-[var(--neptune-text-muted)] mt-2">
                        Monthly reviews require weekly reviews to be generated first.
                    </p>
                </div>
            ) : (
                sortedReviews.map(review => (
                    <ReviewCard
                        key={review.id}
                        title={`${monthNames[review.monthNumber]} ${review.year}`}
                        subtitle={`${review.totalHours}h total • ${review.weeksCount} weeks • Avg mood: ${review.averageMood}/10`}
                        isExpanded={expandedReview === review.id}
                        onToggle={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                        progressScore={review.progressScore}
                    >
                        <div className="space-y-4">
                            <p className="text-sm text-[var(--neptune-text-secondary)]">{review.summary}</p>

                            {review.monthHighlights.length > 0 && (
                                <ReviewSection title="Month Highlights" items={review.monthHighlights} icon={<Star className="w-4 h-4 text-yellow-400" />} color="yellow" />
                            )}

                            {review.skillProgress.length > 0 && (
                                <ReviewSection title="Skill Progress" items={review.skillProgress} icon={<TrendingUp className="w-4 h-4 text-green-400" />} color="green" />
                            )}

                            {review.areasNeedingFocus.length > 0 && (
                                <ReviewSection title="Areas Needing Focus" items={review.areasNeedingFocus} icon={<Target className="w-4 h-4 text-cyan-400" />} color="cyan" />
                            )}

                            {review.overallGrowth && (
                                <div className="p-3 rounded-lg bg-[rgba(0,255,255,0.05)] border border-[var(--neptune-primary-dim)]">
                                    <p className="text-xs text-[var(--neptune-text-muted)] mb-1">Overall Growth</p>
                                    <p className="text-sm text-[var(--neptune-text-secondary)] italic">"{review.overallGrowth}"</p>
                                </div>
                            )}

                            {/* Tweet Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onGenerateTweet(review); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(29,161,242,0.15)] text-[#1DA1F2] hover:bg-[rgba(29,161,242,0.25)] transition-all w-fit"
                            >
                                <Twitter className="w-4 h-4" />
                                Generate Tweet
                            </button>
                        </div>
                    </ReviewCard>
                ))
            )}
        </div>
    );
};

// Yearly Reviews List
const YearlyReviewsList: React.FC<{
    reviews: YearlyReview[];
    onGenerate: (year: number) => void;
    onGenerateTweet: (review: YearlyReview) => void;
    isGenerating: boolean;
    expandedReview: string | null;
    setExpandedReview: (id: string | null) => void;
    hasApiKey: boolean;
}> = ({ reviews, onGenerate, onGenerateTweet, isGenerating, expandedReview, setExpandedReview, hasApiKey }) => {
    const sortedReviews = useMemo(() =>
        [...reviews].sort((a, b) => b.year - a.year),
        [reviews]
    );

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const hasLastYearReview = reviews.some(r => r.year === lastYear);

    return (
        <div className="space-y-4">
            {!hasLastYearReview && hasApiKey && (
                <div className="neptune-glass-panel p-4 rounded-xl border border-dashed border-[var(--neptune-primary-dim)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[var(--neptune-text-primary)] font-mono">{lastYear}</p>
                            <p className="text-xs text-[var(--neptune-text-muted)]">Last year's review not generated yet</p>
                        </div>
                        <button
                            onClick={() => onGenerate(lastYear)}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] hover:bg-[var(--neptune-primary)] hover:text-black transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>
                </div>
            )}

            {sortedReviews.length === 0 ? (
                <div className="neptune-glass-panel p-8 rounded-xl text-center">
                    <Star className="w-12 h-12 text-[var(--neptune-text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--neptune-text-muted)]">No yearly reviews yet.</p>
                    <p className="text-xs text-[var(--neptune-text-muted)] mt-2">
                        Yearly reviews require monthly reviews to be generated first.
                    </p>
                </div>
            ) : (
                sortedReviews.map(review => (
                    <ReviewCard
                        key={review.id}
                        title={`Year ${review.year}`}
                        subtitle={`${review.totalHours}h total • ${review.monthsCount} months • Avg mood: ${review.averageMood}/10`}
                        isExpanded={expandedReview === review.id}
                        onToggle={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                        progressScore={review.progressScore}
                        isYearly
                    >
                        <div className="space-y-4">
                            <p className="text-sm text-[var(--neptune-text-secondary)]">{review.summary}</p>

                            {review.yearHighlights.length > 0 && (
                                <ReviewSection title="Year Highlights" items={review.yearHighlights} icon={<Star className="w-4 h-4 text-yellow-400" />} color="yellow" />
                            )}

                            {review.majorAchievements.length > 0 && (
                                <ReviewSection title="Major Achievements" items={review.majorAchievements} icon={<Award className="w-4 h-4 text-green-400" />} color="green" />
                            )}

                            {review.skillsLearned.length > 0 && (
                                <ReviewSection title="Skills Learned" items={review.skillsLearned} icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} color="cyan" />
                            )}

                            {review.nextYearGoals.length > 0 && (
                                <ReviewSection title="Goals for Next Year" items={review.nextYearGoals} icon={<ArrowUpRight className="w-4 h-4 text-purple-400" />} color="purple" />
                            )}

                            {review.personalGrowth && (
                                <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20">
                                    <p className="text-xs text-purple-300 mb-1">Personal Growth</p>
                                    <p className="text-sm text-[var(--neptune-text-primary)] italic">"{review.personalGrowth}"</p>
                                </div>
                            )}

                            {/* Tweet Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onGenerateTweet(review); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(29,161,242,0.15)] text-[#1DA1F2] hover:bg-[rgba(29,161,242,0.25)] transition-all w-fit"
                            >
                                <Twitter className="w-4 h-4" />
                                Generate Tweet
                            </button>
                        </div>
                    </ReviewCard>
                ))
            )}
        </div>
    );
};

// ================== SHARED COMPONENTS ==================

// Review Card Component
const ReviewCard: React.FC<{
    title: string;
    subtitle: string;
    isExpanded: boolean;
    onToggle: () => void;
    progressScore: number;
    isYearly?: boolean;
    children: React.ReactNode;
}> = ({ title, subtitle, isExpanded, onToggle, progressScore, isYearly, children }) => {
    const scoreColor = progressScore >= 7 ? 'text-green-400' : progressScore >= 4 ? 'text-yellow-400' : 'text-red-400';
    const scoreBg = progressScore >= 7 ? 'bg-green-500/20' : progressScore >= 4 ? 'bg-yellow-500/20' : 'bg-red-500/20';

    return (
        <motion.div
            layout
            className={`neptune-glass-panel rounded-xl border overflow-hidden ${isYearly ? 'border-purple-500/30' : 'border-[var(--neptune-primary-dim)]'}`}
        >
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-lg ${scoreBg} ${scoreColor} text-sm font-bold font-mono`}>
                        {progressScore}/10
                    </div>
                    <div className="text-left">
                        <h3 className="text-[var(--neptune-text-primary)] font-display">{title}</h3>
                        <p className="text-xs text-[var(--neptune-text-muted)] font-mono">{subtitle}</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-[var(--neptune-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 border-t border-[rgba(255,255,255,0.05)]">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Review Section Component
const ReviewSection: React.FC<{
    title: string;
    items: string[];
    icon: React.ReactNode;
    color: 'green' | 'orange' | 'cyan' | 'yellow' | 'purple';
}> = ({ title, items, icon, color }) => {
    const colorClasses = {
        green: 'text-green-300',
        orange: 'text-orange-300',
        cyan: 'text-cyan-300',
        yellow: 'text-yellow-300',
        purple: 'text-purple-300'
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">{title}</span>
            </div>
            <ul className="space-y-1.5 ml-6">
                {items.map((item, idx) => (
                    <li key={idx} className={`text-sm ${colorClasses[color]}`}>
                        • {item}
                    </li>
                ))}
            </ul>
        </div>
    );
};

AIReviewsTab.displayName = 'AIReviewsTab';

export default AIReviewsTab;

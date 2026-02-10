import { useState, useEffect, useRef, Suspense } from 'react';
import { TabId } from '@/components/TabNavigation';
import { useProgress } from '@/hooks/useProgress';
import { useRoadmap } from '@/hooks/useRoadmap';
import { NeptuneAppShell } from '@/components/neptune';
import { initializeReminders } from '@/services/ReminderService';
import { loadAchievements } from '@/services/AchievementService';
import '@/types/electron';

// Lazy loaded components
import {
    DashboardTab,
    DailyLogTab,
    GoalsTab,
    NotesTab,
    SnippetsTab,
    WalletTab,
    LearningRoadmap,
    WeeklyStats,
    AIChat,
    AIReviewsTab,
    AchievementSystem,
    ResourceLibrary,
    SkillRadar,
    SettingsPanel,
    NeptuneLoader,
} from '@/components/LazyComponents';

// Wrapper component for LearningRoadmap with hook
const LearningRoadmapWithHook = ({ apiKey }: { apiKey: string }) => {
    const {
        roadmap,
        isGenerating,
        generationProgress,
        error,
        generateRoadmap,
        toggleMilestone,
        deleteMilestone,
        updateMilestone,
        moveMilestone,
        addCustomMilestone,
        clearRoadmap,
    } = useRoadmap();

    return (
        <LearningRoadmap
            roadmap={roadmap}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            error={error}
            apiKey={apiKey}
            onGenerate={generateRoadmap}
            onToggleMilestone={toggleMilestone}
            onDeleteMilestone={deleteMilestone}
            onUpdateMilestone={updateMilestone}
            onMoveMilestone={moveMilestone}
            onAddMilestone={addCustomMilestone}
            onClearRoadmap={clearRoadmap}
        />
    );
};

const Index = () => {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState('');

    // Get refreshDailyLogs early for use in useEffect
    const {
        progress,
        isLoading,
        addDailyLog,
        addSnippet,
        updateSnippet,
        deleteSnippet,
        addTransaction,
        deleteTransaction,
        addNote,
        updateNote,
        deleteNote,
        addGoal,
        updateGoal,
        deleteGoal,
        addBounty,
        updateBounty,
        deleteBounty,
        addFinding,
        updateFinding,
        deleteFinding,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        addFinancialGoal,
        updateFinancialGoal,
        deleteFinancialGoal,
        toggleRoadmapWeek,
        exportData,
        importData,
        refreshDailyLogs,
    } = useProgress();

    // Track previous tab to detect actual tab changes
    const prevTabRef = useRef<TabId>(activeTab);

    // Refresh dailyLogs ONLY when switching TO dashboard from another tab
    useEffect(() => {
        const prevTab = prevTabRef.current;
        prevTabRef.current = activeTab;

        // Only refresh if we're switching TO dashboard FROM another tab
        if (activeTab === 'dashboard' && prevTab !== 'dashboard') {
            refreshDailyLogs();
        }
    }, [activeTab, refreshDailyLogs]);

    useEffect(() => {
        const loadSettings = async () => {
            if (window.electronAPI?.readFile) {
                const result = await window.electronAPI.readFile('settings.json');
                if (result.success && result.data) {
                    setApiKey(result.data.apiKey || '');
                }
            }
        };
        loadSettings();

        // Initialize smart reminder notifications
        const initReminders = async () => {
            if (window.electronAPI?.listFolder) {
                // Load bounties from folder (same as useProgress)
                const bountiesResult = await window.electronAPI.listFolder('bounties');
                const bounties = bountiesResult.success && bountiesResult.data
                    ? bountiesResult.data : [];

                // Load goals from folder (same as useProgress)
                const goalsResult = await window.electronAPI.listFolder('goals');
                const goals = goalsResult.success && goalsResult.data
                    ? goalsResult.data : [];

                initializeReminders({ bounties, goals });
            }
        };
        initReminders();

        // Load achievement cache on app start
        loadAchievements();

        // Listen for API key changes from Settings Panel (in Overlay)
        const handleApiKeyUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{ apiKey: string }>;
            setApiKey(customEvent.detail.apiKey);
        };

        window.addEventListener('apiKeyChanged', handleApiKeyUpdate);

        return () => {
            window.removeEventListener('apiKeyChanged', handleApiKeyUpdate);
        };
    }, []);

    const handleApiKeyChange = async (key: string) => {
        setApiKey(key);
        if (window.electronAPI?.saveFile && window.electronAPI?.readFile) {
            // Read existing settings first
            const result = await window.electronAPI.readFile('settings.json');
            const existingSettings = result.success && result.data ? result.data : {};
            // Merge with new API key
            await window.electronAPI.saveFile('settings.json', { ...existingSettings, apiKey: key });
        }
    };

    const generateWeeklyReport = () => {
        const lastWeek = progress.dailyLogs.filter((log) => {
            const logDate = new Date(log.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return logDate >= weekAgo;
        });

        const weeklyHours = lastWeek.reduce((sum, log) => sum + log.hours, 0);
        const avgMood =
            lastWeek.length > 0
                ? (lastWeek.reduce((sum, log) => sum + log.mood, 0) / lastWeek.length).toFixed(1)
                : '0';

        return { days: lastWeek.length, hours: weeklyHours, avgMood };
    };

    const weeklyStats = generateWeeklyReport();

    // Calculate actual consecutive streak (same logic as StreakTracker)
    const calculateStreak = (): number => {
        if (progress.dailyLogs.length === 0) return 0;

        const parseLocalDate = (dateStr: string): Date => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day, 0, 0, 0, 0);
        };

        const getToday = (): Date => {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        };

        const sortedLogs = [...progress.dailyLogs].sort((a, b) =>
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
    };

    const currentStreak = calculateStreak();
    const totalHours =
        progress.studyHours.morning +
        progress.studyHours.evening +
        progress.studyHours.night;

    return (
        <NeptuneAppShell activeTab={activeTab} onTabChange={setActiveTab}>
            <Suspense fallback={<NeptuneLoader />}>
                <SettingsPanel
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    apiKey={apiKey}
                    onApiKeyChange={handleApiKeyChange}
                />
            </Suspense>

            {activeTab === 'dashboard' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <div className="space-y-6">
                        <DashboardTab
                            key={`dashboard-${progress.dailyLogs.length}`}
                            progress={progress}
                            weeklyStats={weeklyStats}
                            onNavigate={setActiveTab}
                        />
                        <div className="grid lg:grid-cols-2 gap-6">
                            <SkillRadar progress={progress} />
                            <AchievementSystem
                                progress={progress}
                                dailyLogsCount={progress.dailyLogs.length}
                                currentStreak={currentStreak}
                                completedGoalsCount={progress.goals.filter(g => g.status === 'completed').length}
                                wallet={progress.wallet}
                                bounties={progress.bounties}
                            />
                        </div>
                        <WeeklyStats
                            dailyLogs={progress.dailyLogs}
                            studyHours={progress.studyHours}
                        />
                    </div>
                </Suspense>
            )}

            {activeTab === 'daily' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <DailyLogTab
                        dailyLogs={progress.dailyLogs}
                        onAddLog={addDailyLog}
                        bounties={progress.bounties}
                        goals={progress.goals}
                        notes={progress.notes}
                        snippets={progress.snippets}
                    />
                </Suspense>
            )}

            {activeTab === 'goals' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <GoalsTab
                        goals={progress.goals}
                        bounties={progress.bounties}
                        onAddGoal={addGoal}
                        onUpdateGoal={updateGoal}
                        onDeleteGoal={deleteGoal}
                        onAddBounty={addBounty}
                        onUpdateBounty={updateBounty}
                        onDeleteBounty={deleteBounty}
                        onAddFinding={addFinding}
                        onUpdateFinding={updateFinding}
                        onDeleteFinding={deleteFinding}
                        onAddMilestone={addMilestone}
                        onUpdateMilestone={updateMilestone}
                        onDeleteMilestone={deleteMilestone}
                    />
                </Suspense>
            )}

            {activeTab === 'roadmap' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <div className="space-y-6">
                        <LearningRoadmapWithHook apiKey={apiKey} />
                        <ResourceLibrary />
                    </div>
                </Suspense>
            )}

            {activeTab === 'wallet' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <WalletTab
                        balance={progress.wallet?.balance || 0}
                        earnings={progress.earnings}
                        transactions={progress.wallet?.transactions || []}
                        onAddTransaction={addTransaction}
                        onDeleteTransaction={deleteTransaction}
                        bounties={progress.bounties}
                        financialGoals={progress.wallet?.financialGoals || []}
                        onAddFinancialGoal={addFinancialGoal}
                        onUpdateFinancialGoal={updateFinancialGoal}
                        onDeleteFinancialGoal={deleteFinancialGoal}
                    />
                </Suspense>
            )}

            {activeTab === 'snippets' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <SnippetsTab
                        snippets={progress.snippets}
                        onAddSnippet={addSnippet}
                        onUpdateSnippet={updateSnippet}
                        onDeleteSnippet={deleteSnippet}
                    />
                </Suspense>
            )}

            {activeTab === 'notes' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <NotesTab
                        notes={progress.notes}
                        onAddNote={addNote}
                        onUpdateNote={updateNote}
                        onDeleteNote={deleteNote}
                    />
                </Suspense>
            )}

            {activeTab === 'ai' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <AIChat
                        apiKey={apiKey}
                        progressContext={{
                            totalHours,
                            earnings: progress.earnings,
                            bugs: progress.bugs,
                            weeklyHours: weeklyStats.hours,
                            notes: progress.notes.map(n => n.title),
                        }}
                    />
                </Suspense>
            )}

            {activeTab === 'aireviews' && (
                <Suspense fallback={<NeptuneLoader />}>
                    <AIReviewsTab dailyLogs={progress.dailyLogs} />
                </Suspense>
            )}
        </NeptuneAppShell>
    );
};

export default Index;
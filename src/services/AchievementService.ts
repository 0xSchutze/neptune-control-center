// AchievementService.ts - Event-driven achievement checking
// Runs only when data changes, not on every render
import { addNotification } from '../stores/NotificationStore';
import type { Progress, Bounty } from '../types';

interface Wallet {
    transactions: { type: 'income' | 'expense'; amount: number; category: string }[];
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    requirement: number;
    current: number;
    unlocked: boolean;
}

// Cache to track what we've already unlocked
let unlockedIds: Set<string> = new Set();
let isLoaded = false;

/**
 * Load saved achievements from file (call once on app start)
 */
export async function loadAchievements(): Promise<void> {
    if (isLoaded) return;

    try {
        if (window.electronAPI?.readFile) {
            const result = await window.electronAPI.readFile('achievements.json');
            if (result.success && result.data?.unlockedIds) {
                unlockedIds = new Set(result.data.unlockedIds);
            }
        }
    } catch (error) {
        console.error('Failed to load achievements:', error);
    }
    isLoaded = true;
}

/**
 * Check and unlock achievements based on current data
 * Call this when: log saved, goal completed, bounty added, finding status changed
 */
export async function checkAchievements(
    progress: Progress,
    wallet?: Wallet | null,
    bounties?: Bounty[],
    currentStreak?: number
): Promise<void> {
    // Ensure we've loaded first
    if (!isLoaded) await loadAchievements();

    const dailyLogsCount = progress.dailyLogs.length;
    const streak = currentStreak || 0;
    const totalHours = progress.dailyLogs.reduce((sum, log) => sum + log.hours, 0);
    const completedGoalsCount = progress.goals.filter(g => g.status === 'completed').length;

    // Bounty earnings
    const bountyEarnings = wallet?.transactions
        ?.filter(t => t.category === 'bounty' && t.type === 'income')
        ?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // High severity ACCEPTED findings
    const highSeverityCount = (bounties || [])
        .flatMap(b => b.findings || [])
        .filter(f => (f.severity === 'High' || f.severity === 'Critical') && f.status === 'accepted')
        .length;

    // First bounty earnings (any amount)
    const hasFirstBounty = bountyEarnings > 0;

    // Bug count (any accepted finding)
    const acceptedBugCount = (bounties || [])
        .flatMap(b => b.findings || [])
        .filter(f => f.status === 'accepted')
        .length;

    // Define achievements
    const achievements: Achievement[] = [
        { id: 'first_log', name: 'Initiate Link', description: 'Create your first daily log entry.', requirement: 1, current: dailyLogsCount, unlocked: dailyLogsCount >= 1 },
        { id: 'week_warrior', name: 'Week Warrior', description: 'Maintain a 7-day streak.', requirement: 7, current: streak, unlocked: streak >= 7 },
        { id: 'month_master', name: 'Lunar Master', description: 'Achieve a 30-day streak.', requirement: 30, current: streak, unlocked: streak >= 30 },
        { id: 'time_investor', name: 'Deep Focus', description: 'Log 50+ total hours.', requirement: 50, current: totalHours, unlocked: totalHours >= 50 },
        { id: 'high_severity', name: 'Critical Hit', description: 'Find a High/Critical severity bug (accepted).', requirement: 1, current: highSeverityCount, unlocked: highSeverityCount >= 1 },
        { id: 'bounty_hunter_1k', name: '$1K Bounty Hunter', description: 'Earn $1,000+ from bounties.', requirement: 1000, current: bountyEarnings, unlocked: bountyEarnings >= 1000 },
        { id: 'bug_hunter', name: 'Bug Hunter', description: 'Find 10 accepted bugs.', requirement: 10, current: acceptedBugCount, unlocked: acceptedBugCount >= 10 },
        { id: 'first_bounty', name: 'First Blood', description: 'Receive your first bounty reward.', requirement: 1, current: hasFirstBounty ? 1 : 0, unlocked: hasFirstBounty },
        { id: 'goal_setter', name: 'Goal Master', description: 'Complete 5 goals.', requirement: 5, current: completedGoalsCount, unlocked: completedGoalsCount >= 5 },
        { id: 'dedication', name: 'Grand Admiral', description: 'Log 100 daily entries.', requirement: 100, current: dailyLogsCount, unlocked: dailyLogsCount >= 100 },
    ];

    // Find newly unlocked achievements
    const newlyUnlocked = achievements.filter(a => a.unlocked && !unlockedIds.has(a.id));

    if (newlyUnlocked.length > 0) {
        // Update cache
        newlyUnlocked.forEach(a => unlockedIds.add(a.id));

        // Save to file
        try {
            if (window.electronAPI?.saveFile) {
                await window.electronAPI.saveFile('achievements.json', {
                    unlockedIds: Array.from(unlockedIds),
                    lastUpdated: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Failed to save achievements:', error);
        }

        // Send notifications
        newlyUnlocked.forEach(achievement => {
            addNotification(
                'achievement',
                `🏆 ${achievement.name} Unlocked!`,
                achievement.description,
                { tab: 'dashboard' }
            );
        });
    }
}

/**
 * Get currently unlocked achievement IDs (for UI display)
 */
export function getUnlockedIds(): string[] {
    return Array.from(unlockedIds);
}

/**
 * Check if a specific achievement is unlocked
 */
export function isUnlocked(id: string): boolean {
    return unlockedIds.has(id);
}

export default { loadAchievements, checkAchievements, getUnlockedIds, isUnlocked };

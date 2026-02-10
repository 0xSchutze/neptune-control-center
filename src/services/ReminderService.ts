// ReminderService.ts - Smart reminders for bounties, goals, and activities
import { addNotification } from '../stores/NotificationStore';
import { Bounty, Goal } from '../types';

const REMINDER_STORAGE_KEY = 'smartReminderState';

interface ReminderState {
    lastLoginDate: string | null;
    lastBountyReminder: string | null;
    lastGoalReminder: string | null;
    reminderCount: number;
}

function getReminderState(): ReminderState {
    try {
        const stored = localStorage.getItem(REMINDER_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { }
    return {
        lastLoginDate: null,
        lastBountyReminder: null,
        lastGoalReminder: null,
        reminderCount: 0
    };
}

function saveReminderState(state: ReminderState): void {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(state));
}

function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
}

function getRandomElement<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

// Welcome Notification

export async function checkWelcomeBack(): Promise<void> {
    const state = getReminderState();
    const today = getTodayString();

    if (state.lastLoginDate !== today) {
        const timeOfDay = getTimeOfDay();
        const greeting = timeOfDay === 'morning' ? 'Good morning' :
            timeOfDay === 'afternoon' ? 'Good afternoon' : 'Good evening';

        addNotification(
            'info',
            `${greeting}! 👋`,
            'Ready to make progress today?',
            { tab: 'dashboard' }
        );

        state.lastLoginDate = today;
        state.reminderCount = 0; // Reset daily count
        saveReminderState(state);
    }
}

// Bounty Reminders

const bountyMessages = [
    {
        condition: 'submitted', messages: [
            "Any updates on your submitted findings? 🔍",
            "Check if there's feedback on your bug reports! 🐛",
            "Time to follow up on pending submissions? ⏰"
        ]
    },
    {
        condition: 'ongoing', messages: [
            "How's the audit going? Found anything interesting? 🕵️",
            "Keep hunting! Every line of code matters 💪",
            "Remember to document your findings! 📝"
        ]
    }
];

export async function checkBountyReminders(bounties: Bounty[]): Promise<void> {
    const state = getReminderState();
    const today = getTodayString();

    // Only one bounty reminder per day
    if (state.lastBountyReminder === today) return;

    // Filter to only include bounties NOT created today (at least 1 day old)
    const eligibleBounties = bounties.filter(b => {
        if (!b.createdAt) return true; // If no createdAt, include it
        const createdDate = b.createdAt.split('T')[0];
        return createdDate !== today;
    });

    // Check for submitted (pending) bounties
    const submittedBounties = eligibleBounties.filter(b => b.status === 'submitted');
    if (submittedBounties.length > 0) {
        const randomBounty = getRandomElement(submittedBounties);
        const messages = bountyMessages.find(m => m.condition === 'submitted')?.messages || [];
        const message = getRandomElement(messages);

        if (randomBounty && message) {
            addNotification(
                'reminder',
                `📋 ${randomBounty.contest}`,
                message,
                { tab: 'goals' }
            );

            state.lastBountyReminder = today;
            saveReminderState(state);
            return;
        }
    }

    // Check for ongoing bounties (also filtered by eligibleBounties)
    const ongoingBounties = eligibleBounties.filter(b => b.status === 'ongoing');
    if (ongoingBounties.length > 0) {
        const randomBounty = getRandomElement(ongoingBounties);
        const messages = bountyMessages.find(m => m.condition === 'ongoing')?.messages || [];
        const message = getRandomElement(messages);

        if (randomBounty && message) {
            // Only remind occasionally for ongoing (random chance)
            if (Math.random() < 0.3) { // 30% chance
                addNotification(
                    'reminder',
                    `🎯 ${randomBounty.contest}`,
                    message,
                    { tab: 'goals' }
                );

                state.lastBountyReminder = today;
                saveReminderState(state);
            }
        }
    }
}

// Goal Reminders

const goalMessages = [
    "How's your progress on this goal? 📈",
    "Small steps lead to big achievements! 🚀",
    "Time to check in on your objectives? ✅",
    "Remember why you started! Keep pushing 💪",
    "Any milestones completed today? 🎯"
];

export async function checkGoalReminders(goals: Goal[]): Promise<void> {
    const state = getReminderState();
    const today = getTodayString();

    // Only one goal reminder per day
    if (state.lastGoalReminder === today) return;

    // Filter to only include goals NOT created today (at least 1 day old)
    const eligibleGoals = goals.filter(g => {
        if (!g.createdAt) return true; // If no createdAt, include it
        const createdDate = g.createdAt.split('T')[0];
        return createdDate !== today;
    });

    // Focus on active goals from eligible ones
    const activeGoals = eligibleGoals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) return;

    // Random chance to send reminder (don't spam)
    if (Math.random() > 0.4) return; // 40% chance

    const randomGoal = getRandomElement(activeGoals);
    const message = getRandomElement(goalMessages);

    if (randomGoal && message) {
        // Check if goal has a deadline approaching
        let title = `🎯 ${randomGoal.title}`;
        let finalMessage = message;

        if (randomGoal.deadline) {
            const deadline = new Date(randomGoal.deadline);
            const now = new Date();
            const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntil <= 3 && daysUntil > 0) {
                title = `⚠️ ${randomGoal.title}`;
                finalMessage = `Deadline in ${daysUntil} day${daysUntil > 1 ? 's' : ''}! ${randomGoal.progress}% complete`;
            } else if (daysUntil <= 0) {
                title = `🚨 ${randomGoal.title}`;
                finalMessage = `Deadline passed! Currently at ${randomGoal.progress}%`;
            }
        }

        addNotification(
            'goal',
            title,
            finalMessage,
            { tab: 'goals' }
        );

        state.lastGoalReminder = today;
        saveReminderState(state);
    }
}

// Initialize

interface ReminderData {
    bounties?: Bounty[];
    goals?: Goal[];
}

export async function initializeReminders(data: ReminderData): Promise<void> {
    try {
        // NOTE: Welcome notification is now triggered on first tab open (see Overlay.tsx)
        // Not called here to avoid notification before user interacts

        // Delayed smart reminders (random timing: 15-60 minutes)
        // Min: 15 min = 15 * 60 * 1000 = 900000ms
        // Max: 60 min = 60 * 60 * 1000 = 3600000ms
        const minDelay = 15 * 60 * 1000; // 15 minutes
        const maxDelay = 60 * 60 * 1000; // 60 minutes
        const bountyDelay = minDelay + Math.random() * (maxDelay - minDelay);
        const goalDelay = minDelay + Math.random() * (maxDelay - minDelay);

        setTimeout(async () => {
            if (data.bounties && data.bounties.length > 0) {
                await checkBountyReminders(data.bounties);
            }
        }, bountyDelay);

        setTimeout(async () => {
            if (data.goals && data.goals.length > 0) {
                await checkGoalReminders(data.goals);
            }
        }, goalDelay);

    } catch (error) {
        console.error('[REMINDER] Error initializing reminders:', error);
    }
}

export default {
    initializeReminders,
    checkWelcomeBack,
    checkBountyReminders,
    checkGoalReminders
};

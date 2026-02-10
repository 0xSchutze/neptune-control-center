// UserProfile.ts - User profile type definitions for AI personalization

export interface UserProfile {
    // Manual settings (from Settings)
    identity: {
        nickname: string;
        aiInstructions: string;
    };

    // AI-updated skill levels (flexible - users can add custom skills)
    skillLevels: Record<string, 'beginner' | 'intermediate' | 'advanced'>;

    // Learning status
    learning: {
        completedTopics: string[];
        currentFocus: string;
        wantsToLearn: string[];
        strugglingWith: string[];
    };

    // Mental state
    mentalState: {
        motivationLevel: 'low' | 'medium' | 'high';
        energyPattern: 'morning' | 'afternoon' | 'evening' | 'night';
        stressLevel: number; // 1-10
        burnoutRisk: 'low' | 'medium' | 'high';
    };

    // Personal traits
    traits: {
        strengths: string[];
        areasToImprove: string[];
        workStyle: string;
    };

    // Goals summary (from Goals tab)
    goalsSummary: {
        activeCount: number;
        topPriority: string;
        overallProgress: number;
    };

    // Financial status (from Wallet)
    financialStatus: {
        currentBalance: number;
        totalEarnings: number;
        targetProgress: number; // Goal progress percentage
    };

    // Bounty status
    bountyStatus: {
        activeBounties: number;
        totalSubmissions: number;
        successRate: number;
    };

    // Metadata
    meta: {
        createdAt: string;
        lastUpdated: string;
        totalLogsAnalyzed: number;
    };
}

// Default UserProfile template
export const createDefaultUserProfile = (): UserProfile => ({
    identity: {
        nickname: '',
        aiInstructions: ''
    },
    skillLevels: {
        solidity: 'beginner',
        security: 'beginner',
        defi: 'beginner',
        smartContractAuditing: 'beginner'
    },
    learning: {
        completedTopics: [],
        currentFocus: '',
        wantsToLearn: [],
        strugglingWith: []
    },
    mentalState: {
        motivationLevel: 'medium',
        energyPattern: 'evening',
        stressLevel: 5,
        burnoutRisk: 'low'
    },
    traits: {
        strengths: [],
        areasToImprove: [],
        workStyle: ''
    },
    goalsSummary: {
        activeCount: 0,
        topPriority: '',
        overallProgress: 0
    },
    financialStatus: {
        currentBalance: 0,
        totalEarnings: 0,
        targetProgress: 0
    },
    bountyStatus: {
        activeBounties: 0,
        totalSubmissions: 0,
        successRate: 0
    },
    meta: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalLogsAnalyzed: 0
    }
});

// Helper: Merge partial updates into existing profile
export const mergeUserProfileUpdates = (
    existing: UserProfile,
    updates: Partial<UserProfile>
): UserProfile => {
    return {
        identity: { ...existing.identity, ...(updates.identity || {}) },
        skillLevels: { ...existing.skillLevels, ...(updates.skillLevels || {}) },
        learning: { ...existing.learning, ...(updates.learning || {}) },
        mentalState: { ...existing.mentalState, ...(updates.mentalState || {}) },
        traits: { ...existing.traits, ...(updates.traits || {}) },
        goalsSummary: { ...existing.goalsSummary, ...(updates.goalsSummary || {}) },
        financialStatus: { ...existing.financialStatus, ...(updates.financialStatus || {}) },
        bountyStatus: { ...existing.bountyStatus, ...(updates.bountyStatus || {}) },
        meta: {
            ...existing.meta,
            ...(updates.meta || {}),
            lastUpdated: new Date().toISOString()
        }
    };
};

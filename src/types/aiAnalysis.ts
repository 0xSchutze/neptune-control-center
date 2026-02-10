// aiAnalysis.ts - AI Analysis response types for daily log reviews

// AI Review structure - structured feedback from daily analysis
export interface AIReview {
    strengths: string[];      // Strong points
    weaknesses: string[];     // Areas to improve
    tomorrowFocus: string[];  // Focus areas for tomorrow
    insights: string[];       // General insights
}

// AI-generated updates for UserProfile
export interface UserProfileUpdates {
    skillLevels?: {
        solidity?: 'beginner' | 'intermediate' | 'advanced';
        security?: 'beginner' | 'intermediate' | 'advanced';
        defi?: 'beginner' | 'intermediate' | 'advanced';
        smartContractAuditing?: 'beginner' | 'intermediate' | 'advanced';
    };
    learning?: {
        completedTopics?: string[];
        currentFocus?: string;
        wantsToLearn?: string[];
        strugglingWith?: string[];
    };
    mentalState?: {
        motivationLevel?: 'low' | 'medium' | 'high';
        stressLevel?: number;
        burnoutRisk?: 'low' | 'medium' | 'high';
    };
    traits?: {
        strengths?: string[];
        areasToImprove?: string[];
    };
}

// Full analysis response expected from AI
export interface AIAnalysisResponse {
    aiReport: string;                      // Free-form daily summary
    aiReview: AIReview;                    // Structured review object
    userProfileUpdates: UserProfileUpdates; // UserProfile updates
}

// Analysis status
export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

// AI fields to add to DailyLog
export interface DailyLogAIFields {
    aiReport?: string;
    aiReview?: AIReview;
    aiAnalysisStatus?: AnalysisStatus;
    aiAnalyzedAt?: string;
}

// Tweet generation response
export interface TweetGenerationResponse {
    tweet: string;
    hashtags: string[];
}

// ================== HIERARCHICAL REVIEWS ==================

// Weekly Review - aggregation of 7 daily logs
export interface WeeklyReview {
    id: string;
    week: string;        // ISO format: "2026-W04"
    startDate: string;   // "2026-01-20"
    endDate: string;     // "2026-01-26"
    generatedAt: string;

    // Aggregated stats
    totalHours: number;
    averageMood: number;
    logsCount: number;

    // AI-generated content
    summary: string;
    keyAchievements: string[];
    mainChallenges: string[];
    focusAreas: string[];      // For next week
    insights: string[];
    progressScore: number;     // Progress score (1-10)
}

// Monthly Review - aggregation of 4 weekly reviews
export interface MonthlyReview {
    id: string;
    month: string;       // "2026-01"
    year: number;
    monthNumber: number; // 1-12
    generatedAt: string;

    // Aggregated stats
    totalHours: number;
    averageMood: number;
    weeksCount: number;

    // AI-generated content
    summary: string;
    monthHighlights: string[];
    skillProgress: string[];
    challengesOvercome: string[];
    areasNeedingFocus: string[];
    overallGrowth: string;
    progressScore: number;
}

// Yearly Review - aggregation of 12 monthly reviews
export interface YearlyReview {
    id: string;
    year: number;        // 2026
    generatedAt: string;

    // Aggregated stats
    totalHours: number;
    averageMood: number;
    monthsCount: number;

    // AI-generated content
    summary: string;
    yearHighlights: string[];
    majorAchievements: string[];
    skillsLearned: string[];
    challengesFaced: string[];
    personalGrowth: string;
    nextYearGoals: string[];
    progressScore: number;
}

// Reviews storage
export interface ReviewsData {
    weekly: WeeklyReview[];
    monthly: MonthlyReview[];
    yearly: YearlyReview[];
    lastChecked: {
        weekly: string;   // Last checked week: "2026-W04"
        monthly: string;  // Last checked month: "2026-01"
        yearly: number;   // Last checked year: 2026
    };
}

import type { AIReview, AnalysisStatus } from './aiAnalysis';

// Re-export all types from submodules
export * from './userProfile';
export * from './aiAnalysis';

export interface DailyLog {
  id: number;
  date: string;
  hours: number;
  timeSlot: 'morning' | 'evening' | 'night';
  activities: string;
  mood: number;
  learnings: string;
  media: MediaItem[];
  timerData?: {
    sessionId: string;
    startTime: string;
    endTime: string;
    totalFocusTime: number;
    totalBreakTime: number;
    breaksCount: number;
  } | null;
  context?: { // Context - related items
    bountyIds: number[];
    goalIds: number[];
    noteIds: number[];
    snippetIds: number[];
  };
  // AI Analysis Fields
  aiReport?: string;
  aiReview?: AIReview;
  aiAnalysisStatus?: AnalysisStatus;
  aiAnalyzedAt?: string;
}

export interface MediaItem {
  id: number;
  type: string;
  name: string;
  size: number;
  path: string;
  createdAt: string;
}
export interface Snippet {
  id: number;
  title: string;
  code: string;
  language: string;
  category: string;
  notes: string;
  createdAt: string;
  // Additional fields
  tags?: string[];
  isFavorite?: boolean;
  usageCount?: number;
  source?: string;
  linkedBountyId?: number;
  isTemplate?: boolean;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  // Additional fields
  category?: 'bounty' | 'salary' | 'investment' | 'expense' | 'other';
  source?: string;
  linkedBountyId?: number;
  currency?: 'USD' | 'ETH' | 'USDC' | 'TRY';
  txHash?: string;
  status?: 'pending' | 'completed' | 'failed';
  tags?: string[];
}

// Financial Goal - Target savings
export interface FinancialGoal {
  id: number;
  title: string;
  targetAmount: number;
  icon?: string;           // Emoji like 💻
  imagePath?: string;      // Custom image path
  isPinned: boolean;       // Only 1 can be pinned (shows on Dashboard)
  createdAt: string;
}

// Milestone - Goal sub-targets
export interface Milestone {
  id: number;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface Goal {
  id: number;
  title: string;
  deadline: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  createdAt: string;
  // Additional fields
  description?: string;
  milestones?: Milestone[];
  category?: 'learning' | 'earning' | 'skill' | 'other';
  priority?: 'low' | 'medium' | 'high';
  linkedBountyIds?: number[];
  linkedNoteIds?: number[];
  reminderDate?: string;
}

// Finding - Bugs found in Bounty
export interface Finding {
  id: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  title: string;
  description?: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'duplicate';
  reward?: number;
  createdAt: string;
}

export interface Bounty {
  id: number;
  platform: string;
  contest: string;
  status: 'ongoing' | 'submitted' | 'won' | 'lost';
  submission: string;
  reward: number;
  createdAt: string;
  // Additional fields
  url?: string;
  startDate?: string;
  endDate?: string;
  scope?: string[];
  findings?: Finding[];
  timeSpent?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  notes?: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields
  category?: 'audit' | 'learning' | 'research' | 'general';
  tags?: string[];
  isPinned?: boolean;
  linkedBountyIds?: number[];
  linkedGoalIds?: number[];
  attachments?: string[];
  isMarkdown?: boolean;
}

export interface Progress {
  dailyLogs: DailyLog[];
  studyHours: {
    morning: number;
    evening: number;
    night: number;
  };
  wallet: {
    balance: number;
    transactions: Transaction[];
    financialGoals?: FinancialGoal[];
  };
  snippets: Snippet[];
  goals: Goal[];
  bounties: Bounty[];
  notes: Note[];
  earnings: number;
  bugs: number;
  currentWeek: number;
  completedRoadmapWeeks: number[];
}

export interface TimerSession {
  id: string;
  startTime: string; // ISO string
  endTime?: string;
  totalFocusTime: number; // in seconds
  breaks: Array<{
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number; // seconds
  }>;
  status: 'running' | 'paused' | 'stopped';
  type: 'smart' | 'pomodoro';
}



// Timer log modal type
export interface TimerLogData {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalFocusTime: string; // format: "3:45"
  totalBreakTime: string;
  breaks: Array<{ start: string; end: string; duration: string }>;
}

// ============================================
// AI Learning Roadmap Types
// ============================================

export interface RoadmapResource {
  name: string;
  url: string;
  type: 'docs' | 'video' | 'interactive' | 'github' | 'course';
}

export interface RoadmapMilestone {
  id: number;
  title: string;
  description: string;
  topics: string[];
  resources: RoadmapResource[];
  estimatedHours: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface UserRoadmap {
  goal: string;
  generatedAt: string;
  milestones: RoadmapMilestone[];
}
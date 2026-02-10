// weeklyReviewService.ts - Weekly AI review generation and management
import { WeeklyReview, MonthlyReview, YearlyReview, ReviewsData } from '../types/aiAnalysis';
import type { DailyLog, UserProfile } from '../types';
import { addNotification } from '../stores/NotificationStore';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REVIEWS_FILE = 'AIReviews.json';
const REVIEW_MODEL = 'openai/gpt-oss-120b';

// Check if error is rate limit (429) and show notification
function checkRateLimitError(response: Response, context: string): boolean {
    if (response.status === 429) {
        addNotification(
            'error',
            'Token Limit Reached',
            `Daily token limit exceeded for model "${REVIEW_MODEL}". ${context} cannot continue. Please try again tomorrow or upgrade your API tier.`,
            { tab: 'settings' }
        );
        return true;
    }
    return false;
}

// ================== DATE UTILITIES ==================

// Get ISO week number (YYYY-Www format)
export function getWeekNumber(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Get week start and end dates
export function getWeekDates(weekStr: string): { start: Date; end: Date } {
    const [year, week] = weekStr.split('-W').map(Number);
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

    const start = new Date(firstMonday);
    start.setDate(firstMonday.getDate() + (week - 1) * 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start, end };
}

// Get previous week
export function getPreviousWeek(weekStr: string): string {
    const dates = getWeekDates(weekStr);
    dates.start.setDate(dates.start.getDate() - 7);
    return getWeekNumber(dates.start);
}

// Get current month string
export function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get previous month
export function getPreviousMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-').map(Number);
    if (month === 1) {
        return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
}

// ================== REVIEWS DATA MANAGEMENT ==================

// Read reviews from file
export async function readReviewsData(): Promise<ReviewsData> {
    try {
        const result = await (window as any).electronAPI.readFile(REVIEWS_FILE);
        if (result.success && result.data) {
            // Handle both string and already-parsed object
            const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
            // Validate structure
            if (data.weekly && data.monthly && data.yearly) {
                return data as ReviewsData;
            }
        }
    } catch (error) {
        console.error('[REVIEWS] Error loading reviews:', error);
    }

    // Return default structure
    return {
        weekly: [],
        monthly: [],
        yearly: [],
        lastChecked: {
            weekly: '',
            monthly: '',
            yearly: 0
        }
    };
}

// Save reviews to file
export async function saveReviewsData(data: ReviewsData): Promise<void> {
    await (window as any).electronAPI.saveFile(REVIEWS_FILE, data);
}

// ================== WEEKLY REVIEW GENERATION ==================

// Get logs for a specific week
export function getLogsForWeek(logs: DailyLog[], weekStr: string): DailyLog[] {
    const { start, end } = getWeekDates(weekStr);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    return logs.filter(log => log.date >= startStr && log.date <= endStr);
}

// Build prompt for weekly review
function buildWeeklyReviewPrompt(logs: DailyLog[], weekStr: string, userProfile?: UserProfile): string {
    const { start, end } = getWeekDates(weekStr);

    const logsContext = logs.map(log => {
        let logText = `Date: ${log.date}
Hours: ${log.hours}
Mood: ${log.mood}/10
Activities: ${log.activities}
Learnings: ${log.learnings || 'N/A'}`;

        if (log.aiReview) {
            logText += `
AI Review - Strengths: ${log.aiReview.strengths?.join(', ') || 'N/A'}
AI Review - Weaknesses: ${log.aiReview.weaknesses?.join(', ') || 'N/A'}
AI Review - Insights: ${log.aiReview.insights?.join(', ') || 'N/A'}`;
        }

        return logText;
    }).join('\n\n---\n\n');

    return `You are an AI productivity coach analyzing a week's worth of work logs for a Web3/Security professional.

## Week: ${weekStr}
Period: ${start.toDateString()} to ${end.toDateString()}
Total Logs: ${logs.length}

## User Profile:
${userProfile ? `
Current Focus: ${userProfile.learning?.currentFocus || 'Web3 Security'}
Skill Levels: Solidity (${userProfile.skillLevels?.solidity || 'beginner'}), Security (${userProfile.skillLevels?.security || 'beginner'})
` : 'No profile available'}

## Daily Logs This Week:
${logsContext}

## Your Task:
Analyze this week's work and provide a comprehensive weekly review.

Respond ONLY with valid JSON in this exact format:
{
    "summary": "2-3 sentence overview of the week",
    "keyAchievements": ["achievement 1", "achievement 2", "achievement 3"],
    "mainChallenges": ["challenge 1", "challenge 2"],
    "focusAreas": ["focus area 1 for next week", "focus area 2"],
    "insights": ["insight 1", "insight 2"],
    "progressScore": 7
}

Guidelines:
- Be specific and reference actual activities from the logs
- progressScore should be 1-10 based on productivity and learning
- Focus on patterns and trends across the week
- Keep achievements and challenges actionable`;
}

// Generate weekly review using AI
export async function generateWeeklyReview(
    logs: DailyLog[],
    weekStr: string,
    apiKey: string,
    userProfile?: UserProfile,
    silent: boolean = false  // true = no notifications (for background checks)
): Promise<WeeklyReview | null> {
    const weekLogs = getLogsForWeek(logs, weekStr);

    if (weekLogs.length === 0) {
        if (!silent) {
            addNotification(
                'info',
                'No Logs Found',
                `No daily logs found for week ${weekStr}. Add logs to generate a review.`,
                { tab: 'daily-log' }
            );
        }
        return null;
    }

    const { start, end } = getWeekDates(weekStr);

    // Calculate aggregated stats
    const totalHours = weekLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const averageMood = weekLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / weekLogs.length;

    try {
        const prompt = buildWeeklyReviewPrompt(weekLogs, weekStr, userProfile);

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You are an AI productivity coach. Respond only with valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 5000
            })
        });

        if (!response.ok) {
            if (checkRateLimitError(response, 'Weekly Review generation')) {
                return null;
            }
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const review: WeeklyReview = {
            id: `weekly-${weekStr}-${Date.now()}`,
            week: weekStr,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            generatedAt: new Date().toISOString(),
            totalHours,
            averageMood: Math.round(averageMood * 10) / 10,
            logsCount: weekLogs.length,
            summary: parsed.summary || '',
            keyAchievements: parsed.keyAchievements || [],
            mainChallenges: parsed.mainChallenges || [],
            focusAreas: parsed.focusAreas || [],
            insights: parsed.insights || [],
            progressScore: parsed.progressScore || 5
        };

        // Send notification
        addNotification(
            'review',
            `Weekly Review: ${weekStr}`,
            `Score: ${review.progressScore}/10 • ${weekLogs.length} logs analyzed`,
            { tab: 'aireviews' }
        );

        return review;

    } catch (error) {
        console.error(`[WEEKLY] Error generating review for ${weekStr}:`, error);
        if (!silent) {
            addNotification(
                'error',
                'Weekly Review Failed',
                `Failed to generate review for ${weekStr}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { tab: 'aireviews' }
            );
        }
        return null;
    }
}

// ================== MONTHLY REVIEW GENERATION ==================

function buildMonthlyReviewPrompt(weeklyReviews: WeeklyReview[], monthStr: string, userProfile?: UserProfile): string {
    const weeksContext = weeklyReviews.map(w => `
Week ${w.week}:
- Hours: ${w.totalHours}h, Mood: ${w.averageMood}/10, Score: ${w.progressScore}/10
- Summary: ${w.summary}
- Achievements: ${w.keyAchievements.join(', ')}
- Challenges: ${w.mainChallenges.join(', ')}
- Insights: ${w.insights.join(', ')}
`).join('\n');

    return `You are an AI productivity coach analyzing a month's worth of weekly reviews for a Web3/Security professional.

## Month: ${monthStr}
Total Weeks Analyzed: ${weeklyReviews.length}

## Weekly Reviews:
${weeksContext}

## Your Task:
Synthesize these weekly reviews into a comprehensive monthly review.

Respond ONLY with valid JSON in this exact format:
{
    "summary": "3-4 sentence overview of the month",
    "monthHighlights": ["highlight 1", "highlight 2", "highlight 3"],
    "skillProgress": ["skill progress 1", "skill progress 2"],
    "challengesOvercome": ["challenge overcome 1", "challenge overcome 2"],
    "areasNeedingFocus": ["area 1 for next month", "area 2"],
    "overallGrowth": "1-2 sentences about personal/professional growth",
    "progressScore": 7
}

Guidelines:
- Look for patterns across weeks, not just individual events
- Highlight month-over-month progress
- Be encouraging but honest about areas needing work`;
}

export async function generateMonthlyReview(
    weeklyReviews: WeeklyReview[],
    monthStr: string,
    apiKey: string,
    userProfile?: UserProfile,
    silent: boolean = false
): Promise<MonthlyReview | null> {
    // Filter weekly reviews for this month
    const monthReviews = weeklyReviews.filter(w => w.startDate.startsWith(monthStr));

    if (monthReviews.length === 0) {
        if (!silent) {
            addNotification(
                'info',
                'No Weekly Reviews',
                `No weekly reviews for ${monthStr}. Weekly reviews are needed to generate monthly.`,
                { tab: 'aireviews' }
            );
        }
        return null;
    }

    const [year, month] = monthStr.split('-').map(Number);

    // Calculate aggregated stats
    const totalHours = monthReviews.reduce((sum, w) => sum + w.totalHours, 0);
    const averageMood = monthReviews.reduce((sum, w) => sum + w.averageMood, 0) / monthReviews.length;

    try {
        const prompt = buildMonthlyReviewPrompt(monthReviews, monthStr, userProfile);

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You are an AI productivity coach. Respond only with valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 6000
            })
        });

        if (!response.ok) {
            if (checkRateLimitError(response, 'Monthly Review generation')) {
                return null;
            }
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const review: MonthlyReview = {
            id: `monthly-${monthStr}-${Date.now()}`,
            month: monthStr,
            year,
            monthNumber: month,
            generatedAt: new Date().toISOString(),
            totalHours,
            averageMood: Math.round(averageMood * 10) / 10,
            weeksCount: monthReviews.length,
            summary: parsed.summary || '',
            monthHighlights: parsed.monthHighlights || [],
            skillProgress: parsed.skillProgress || [],
            challengesOvercome: parsed.challengesOvercome || [],
            areasNeedingFocus: parsed.areasNeedingFocus || [],
            overallGrowth: parsed.overallGrowth || '',
            progressScore: parsed.progressScore || 5
        };

        // Send notification
        addNotification(
            'review',
            `Monthly Review: ${monthStr}`,
            `Score: ${review.progressScore}/10 • ${monthReviews.length} weeks analyzed`,
            { tab: 'aireviews' }
        );

        return review;

    } catch (error) {
        console.error(`[MONTHLY] Error generating review for ${monthStr}:`, error);
        if (!silent) {
            addNotification(
                'error',
                'Monthly Review Failed',
                `Failed to generate review for ${monthStr}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { tab: 'aireviews' }
            );
        }
        return null;
    }
}

// ================== YEARLY REVIEW GENERATION ==================

function buildYearlyReviewPrompt(monthlyReviews: MonthlyReview[], year: number): string {
    const monthsContext = monthlyReviews.map(m => `
${m.month}:
- Hours: ${m.totalHours}h, Mood: ${m.averageMood}/10, Score: ${m.progressScore}/10
- Summary: ${m.summary}
- Highlights: ${m.monthHighlights.join(', ')}
- Growth: ${m.overallGrowth}
`).join('\n');

    return `You are an AI productivity coach analyzing a year's worth of monthly reviews for a Web3/Security professional.

## Year: ${year}
Total Months Analyzed: ${monthlyReviews.length}

## Monthly Reviews:
${monthsContext}

## Your Task:
Create a comprehensive yearly review with reflection and goals.

Respond ONLY with valid JSON in this exact format:
{
    "summary": "4-5 sentence overview of the year",
    "yearHighlights": ["highlight 1", "highlight 2", "highlight 3"],
    "majorAchievements": ["major achievement 1", "major achievement 2"],
    "skillsLearned": ["skill 1", "skill 2", "skill 3"],
    "challengesFaced": ["challenge 1", "challenge 2"],
    "personalGrowth": "2-3 sentences about personal/professional transformation",
    "nextYearGoals": ["goal 1 for next year", "goal 2", "goal 3"],
    "progressScore": 8
}

Guidelines:
- Celebrate major wins and milestones
- Be reflective and forward-looking
- Connect the dots between months to show progression`;
}

export async function generateYearlyReview(
    monthlyReviews: MonthlyReview[],
    year: number,
    apiKey: string,
    silent: boolean = false
): Promise<YearlyReview | null> {
    const yearReviews = monthlyReviews.filter(m => m.year === year);

    if (yearReviews.length === 0) {
        if (!silent) {
            addNotification(
                'info',
                'No Monthly Reviews',
                `No monthly reviews for ${year}. Monthly reviews are needed to generate yearly.`,
                { tab: 'aireviews' }
            );
        }
        return null;
    }

    const totalHours = yearReviews.reduce((sum, m) => sum + m.totalHours, 0);
    const averageMood = yearReviews.reduce((sum, m) => sum + m.averageMood, 0) / yearReviews.length;

    try {
        const prompt = buildYearlyReviewPrompt(yearReviews, year);

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You are an AI productivity coach. Respond only with valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 8000
            })
        });

        if (!response.ok) {
            if (checkRateLimitError(response, 'Yearly Review generation')) {
                return null;
            }
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const review: YearlyReview = {
            id: `yearly-${year}-${Date.now()}`,
            year,
            generatedAt: new Date().toISOString(),
            totalHours,
            averageMood: Math.round(averageMood * 10) / 10,
            monthsCount: yearReviews.length,
            summary: parsed.summary || '',
            yearHighlights: parsed.yearHighlights || [],
            majorAchievements: parsed.majorAchievements || [],
            skillsLearned: parsed.skillsLearned || [],
            challengesFaced: parsed.challengesFaced || [],
            personalGrowth: parsed.personalGrowth || '',
            nextYearGoals: parsed.nextYearGoals || [],
            progressScore: parsed.progressScore || 5
        };

        // Send notification
        addNotification(
            'review',
            `Yearly Review: ${year}`,
            `Score: ${review.progressScore}/10 • ${yearReviews.length} months analyzed`,
            { tab: 'aireviews' }
        );

        return review;

    } catch (error) {
        console.error(`[YEARLY] Error generating review for ${year}:`, error);
        if (!silent) {
            addNotification(
                'error',
                'Yearly Review Failed',
                `Failed to generate review for ${year}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { tab: 'aireviews' }
            );
        }
        return null;
    }
}

// ================== LAZY GENERATION CHECK ==================

export async function checkAndGenerateMissingReviews(
    logs: DailyLog[],
    apiKey: string,
    userProfile?: UserProfile
): Promise<{ generated: number; errors: number }> {
    const reviews = await readReviewsData();
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentMonth = getCurrentMonth();
    const currentYear = now.getFullYear();

    let generated = 0;
    let errors = 0;

    // Check for missing weekly reviews (last 4 completed weeks)
    let weekToCheck = getPreviousWeek(currentWeek);
    for (let i = 0; i < 4; i++) {
        const existingWeekly = reviews.weekly.find(w => w.week === weekToCheck);
        if (!existingWeekly) {
            const review = await generateWeeklyReview(logs, weekToCheck, apiKey, userProfile, true); // silent=true for background
            if (review) {
                reviews.weekly.push(review);
                generated++;
            } else {
                errors++;
            }
        }
        weekToCheck = getPreviousWeek(weekToCheck);
    }

    // Check for missing monthly reviews (last 2 completed months)
    let monthToCheck = getPreviousMonth(currentMonth);
    for (let i = 0; i < 2; i++) {
        const existingMonthly = reviews.monthly.find(m => m.month === monthToCheck);
        if (!existingMonthly && reviews.weekly.length > 0) {
            const review = await generateMonthlyReview(reviews.weekly, monthToCheck, apiKey, userProfile, true); // silent=true for background
            if (review) {
                reviews.monthly.push(review);
                generated++;
            } else {
                errors++;
            }
        }
        monthToCheck = getPreviousMonth(monthToCheck);
    }

    // Check for missing yearly review (previous year)
    const previousYear = currentYear - 1;
    const existingYearly = reviews.yearly.find(y => y.year === previousYear);
    if (!existingYearly && reviews.monthly.filter(m => m.year === previousYear).length > 0) {
        const review = await generateYearlyReview(reviews.monthly, previousYear, apiKey, true); // silent=true for background
        if (review) {
            reviews.yearly.push(review);
            generated++;
        } else {
            errors++;
        }
    }

    // Save updated reviews
    if (generated > 0) {
        reviews.lastChecked = {
            weekly: currentWeek,
            monthly: currentMonth,
            yearly: currentYear
        };
        await saveReviewsData(reviews);
    }

    return { generated, errors };
}

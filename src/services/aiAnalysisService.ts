// aiAnalysisService.ts - AI Analysis Service for Daily Log Reviews
import type { DailyLog, Goal, Bounty, Note, Snippet, MediaItem } from '../types';
import type { UserProfile } from '../types/userProfile';
import type { AIAnalysisResponse, TweetGenerationResponse } from '../types/aiAnalysis';
import { addNotification } from '../stores/NotificationStore';
import '../types/electron'; // Global ElectronAPI type

// API Config
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ANALYSIS_MODEL = 'openai/gpt-oss-120b'; // Best quality for deep analysis
// Testing: GPT-OSS 120B with higher max_tokens
const TWEET_MODEL = 'openai/gpt-oss-120b';

// Check if error is rate limit (429) and show notification
function checkRateLimitError(response: Response, context: string, model: string = ANALYSIS_MODEL): boolean {
    if (response.status === 429) {
        addNotification(
            'error',
            'Token Limit Reached',
            `Daily token limit exceeded for model "${model}". ${context} cannot continue. Please try again tomorrow or upgrade your API tier.`,
            { tab: 'settings' }
        );
        return true;
    }
    return false;
}

// Text-based file extensions that can be read
const TEXT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.sol', '.py', '.rs', '.go', '.java', '.css', '.scss', '.json', '.md', '.txt', '.yaml', '.yml', '.toml', '.env', '.sh', '.bash', '.html', '.xml'];

interface AnalysisContext {
    log: DailyLog;
    linkedBounties: Bounty[];
    linkedGoals: Goal[];
    linkedNotes: Note[];
    linkedSnippets: Snippet[];
    allActiveGoals: Goal[];
    walletStatus: { balance: number; totalEarnings: number };
    last7DaysSummary: string;
    userProfile: UserProfile;
    mediaContents: { name: string; content: string }[];
}

// Check if file is text-based
export const isTextBasedFile = (filename: string): boolean => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return TEXT_EXTENSIONS.includes(ext);
};

// Read media file content via Electron IPC
export const readMediaTextContent = async (filename: string): Promise<string | null> => {
    try {
        if (window.electronAPI?.readMediaText) {
            const result = await window.electronAPI.readMediaText(filename);
            if (result.success && result.content) {
                // Limit content to 3000 chars
                return result.content.length > 3000
                    ? result.content.substring(0, 3000) + '\n...[truncated]'
                    : result.content;
            }
        }
        return null;
    } catch (error) {
        console.error('Error reading media text:', error);
        return null;
    }
};

// Get last 7 days summary from logs
export const getLast7DaysSummary = (logs: DailyLog[]): string => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = logs
        .filter(log => {
            const logDate = new Date(log.date);
            return logDate >= sevenDaysAgo && logDate <= today;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (recentLogs.length === 0) {
        return 'No logs in the last 7 days.';
    }

    return recentLogs.map(log => {
        const moodEmoji = log.mood >= 7 ? '😊' : log.mood >= 4 ? '😐' : '😔';
        return `📅 ${log.date} | ${log.hours}h | ${moodEmoji} Mood: ${log.mood}/10
📝 ${log.activities.substring(0, 150)}${log.activities.length > 150 ? '...' : ''}
💡 ${log.learnings.substring(0, 100)}${log.learnings.length > 100 ? '...' : ''}`;
    }).join('\n\n');
};

// Build the system prompt for analysis
const buildAnalysisSystemPrompt = (userProfile: UserProfile): string => {
    const nickname = userProfile?.identity?.nickname || 'User';
    const customInstructions = userProfile?.identity?.aiInstructions || '';

    return `You are Neptune AI, a personal development coach and productivity analyst for ${nickname}. You analyze daily work logs and provide insightful, actionable feedback.

Your personality:
- Supportive but honest
- Data-driven insights
- Focus on growth and learning
- Acknowledge achievements genuinely
- Be direct about areas needing improvement

${customInstructions ? `Custom Instructions from ${nickname}:\n${customInstructions}\n` : ''}

You must respond ONLY with valid JSON in this exact format:
{
  "aiReport": "A 2-3 paragraph narrative summary of the day's work, achievements, challenges, and overall assessment. Be specific and reference actual activities.",
  "aiReview": {
    "strengths": ["2-4 specific things done well today"],
    "weaknesses": ["1-3 areas that need improvement or attention"],
    "tomorrowFocus": ["2-4 concrete action items for tomorrow"],
    "insights": ["1-2 broader observations about patterns, growth, or suggestions"]
  },
  "userProfileUpdates": {
    "skillLevels": {"solidity": "beginner|intermediate|advanced"},
    "learning": {"currentFocus": "topic", "strugglingWith": ["topics"]},
    "mentalState": {"motivationLevel": "low|medium|high", "stressLevel": 1-10, "burnoutRisk": "low|medium|high"},
    "traits": {"strengths": ["observed traits"], "areasToImprove": ["areas"]}
  }
}

Important:
- Only include userProfileUpdates fields if you have evidence to update them
- Be specific and actionable in tomorrowFocus
- Reference actual work done in the log`;
};

// Build the user prompt with full context
const buildAnalysisUserPrompt = (context: AnalysisContext): string => {
    const { log, linkedBounties, linkedGoals, linkedNotes, linkedSnippets, allActiveGoals, walletStatus, last7DaysSummary, userProfile, mediaContents } = context;

    let prompt = `## Today's Log (${log.date})

**Work Duration:** ${log.hours} hours (${log.timeSlot})
**Mood:** ${log.mood}/10

**Activities:**
${log.activities}

**Learnings:**
${log.learnings}

`;

    // Add linked context
    if (linkedBounties.length > 0) {
        prompt += `## Linked Bounties\n`;
        linkedBounties.forEach(b => {
            prompt += `- ${b.platform}/${b.contest} [${b.status}] - ${b.submission || 'No submission yet'}\n`;
        });
        prompt += '\n';
    }

    if (linkedGoals.length > 0) {
        prompt += `## Linked Goals\n`;
        linkedGoals.forEach(g => {
            prompt += `- ${g.title} [${g.progress}%] - ${g.status}\n`;
        });
        prompt += '\n';
    }

    if (linkedNotes.length > 0) {
        prompt += `## Linked Notes\n`;
        linkedNotes.forEach(n => {
            prompt += `- ${n.title}: ${n.content.substring(0, 200)}...\n`;
        });
        prompt += '\n';
    }

    if (linkedSnippets.length > 0) {
        prompt += `## Linked Snippets\n`;
        linkedSnippets.forEach(s => {
            prompt += `- ${s.title} (${s.language}): ${s.code.substring(0, 150)}...\n`;
        });
        prompt += '\n';
    }

    // Add media file contents
    if (mediaContents.length > 0) {
        prompt += `## Attached Files Content\n`;
        mediaContents.forEach(m => {
            prompt += `### ${m.name}\n\`\`\`\n${m.content}\n\`\`\`\n\n`;
        });
    }

    // Add active goals overview
    if (allActiveGoals.length > 0) {
        prompt += `## All Active Goals\n`;
        allActiveGoals.slice(0, 5).forEach(g => {
            prompt += `- ${g.title} [${g.progress}%] - Priority: ${g.priority || 'medium'}\n`;
        });
        prompt += '\n';
    }

    // Add wallet status
    prompt += `## Financial Status
- Current Balance: $${walletStatus.balance.toFixed(2)}
- Total Earnings: $${walletStatus.totalEarnings.toFixed(2)}

`;

    // Add user profile context
    prompt += `## User Profile
- Current Skill Levels: Solidity(${userProfile?.skillLevels?.solidity || 'N/A'}), Security(${userProfile?.skillLevels?.security || 'N/A'}), DeFi(${userProfile?.skillLevels?.defi || 'N/A'})
- Current Focus: ${userProfile?.learning?.currentFocus || 'Not set'}
- Energy Pattern: ${userProfile?.mentalState?.energyPattern || 'N/A'}
- Recent Motivation: ${userProfile?.mentalState?.motivationLevel || 'N/A'}

`;

    // Add 7-day summary
    prompt += `## Last 7 Days Summary
${last7DaysSummary}

Now analyze today's log and provide your structured JSON response.`;

    return prompt;
};

// Main analysis function
export const analyzeLog = async (
    context: AnalysisContext,
    apiKey: string,
    onProgress?: (status: string) => void
): Promise<AIAnalysisResponse> => {
    onProgress?.('Building analysis context...');

    const systemPrompt = buildAnalysisSystemPrompt(context.userProfile);
    const userPrompt = buildAnalysisUserPrompt(context);

    onProgress?.('Sending to Llama 3.3 70B...');

    const requestBody = {
        model: ANALYSIS_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
    };

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        if (checkRateLimitError(response, 'AI Analysis')) {
            throw new Error('Rate limit exceeded');
        }
        const error = await response.text();
        console.error('AI Analysis API Error:', error);
        throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
        console.error('Empty response from AI');
        throw new Error('Empty response from AI');
    }

    onProgress?.('Parsing AI response...');

    try {
        const parsed = JSON.parse(content) as AIAnalysisResponse;

        // Validate required fields
        if (!parsed.aiReport || !parsed.aiReview) {
            console.error('Invalid response structure - missing aiReport or aiReview');
            throw new Error('Invalid response structure');
        }

        return parsed;
    } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Failed to parse AI response as JSON');
    }
};

// Tweet generation prompt
const buildTweetPrompt = (log: DailyLog, userProfile: UserProfile, journeyDay: number): string => {
    const nickname = userProfile?.identity?.nickname || 'User';

    // Build AI review context if available
    let aiContext = '';
    if (log.aiReview) {
        if (log.aiReview.strengths?.length > 0) {
            aiContext += `\nKey achievements: ${log.aiReview.strengths.join(', ')}`;
        }
        if (log.aiReview.insights?.length > 0) {
            aiContext += `\nInsights: ${log.aiReview.insights.join(', ')}`;
        }
    }
    if (log.aiReport) {
        aiContext += `\nAI Summary: ${log.aiReport.substring(0, 300)}`;
    }

    return `You are ${nickname}, a Web3 security researcher sharing your progress on Twitter.

CRITICAL: Generate a UNIQUE tweet based on the LOG below. DO NOT copy the examples!

RULES:
1. Use ONLY info from the log - no hallucination
2. 250-280 characters MAX (count carefully!)
3. Include specific details from both activities AND learnings
4. Add personal reaction (wild, fascinating, tricky, underrated, etc.)
5. 1-2 emojis (🧪 🔐 🦉 💡 ⚡)
6. End with punchy insight
7. DO NOT COPY THE EXAMPLE TWEETS - they are just for style reference!

=== YOUR LOG (BASE YOUR TWEET ON THIS!) ===
Hours: ${log.hours}h
Activities: ${log.activities}
Learnings: ${log.learnings}
${aiContext}
===========================================

STYLE EXAMPLES (DO NOT COPY - just see the format):
- "[Time] doing [specific thing]. [Key finding/insight]. [Personal take or punchy ending] [emoji]"
- "Found [specific issue] in [context]. [Why it matters]. [Memorable conclusion]"

EXAMPLE PATTERNS (use as inspiration, NOT verbatim):
- Start with time spent or what you found
- Include the technical detail from YOUR log
- End with your personal observation
- Keep it authentic to YOUR work

Write a UNIQUE tweet about YOUR log content. JSON only:
{
  "tweet": "your original 250-280 char tweet based on the log above",
  "hashtags": ["Web3Security", "Solidity", "SmartContractAudit", "buildinpublic"]
}`
};

// Generate tweet from log
export const generateTweet = async (
    log: DailyLog,
    userProfile: UserProfile,
    apiKey: string,
    journeyDay: number = 1  // Default to 1 if not provided
): Promise<TweetGenerationResponse> => {
    const requestBody = {
        model: TWEET_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You generate engaging Twitter/X posts. Respond only with valid JSON.'
            },
            {
                role: 'user',
                content: buildTweetPrompt(log, userProfile, journeyDay)
            }
        ],
        temperature: 1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
    };

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        if (checkRateLimitError(response, 'Tweet generation')) {
            throw new Error('Rate limit exceeded');
        }
        const error = await response.text();
        console.error('Tweet API Error:', error);
        throw new Error(`Tweet generation failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
        return JSON.parse(content) as TweetGenerationResponse;
    } catch {
        // Fallback if JSON parse fails
        return {
            tweet: `Day ${journeyDay}: ${log.hours}h of focused work! ${log.learnings.substring(0, 100)}... #buildinpublic`,
            hashtags: ['buildinpublic', 'web3']
        };
    }
};

// Open Twitter Intent URL
export const openTwitterIntent = (tweet: string, hashtags: string[] = []): void => {
    const hashtagString = hashtags.length > 0 ? hashtags.join(',') : '';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}${hashtagString ? `&hashtags=${hashtagString}` : ''}`;

    // If Electron available, open in system browser, otherwise use window.open
    if (window.electronAPI?.openExternalUrl) {
        window.electronAPI.openExternalUrl(url);
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

// ============================================
// AI Learning Roadmap Generator
// ============================================

// Use GPT-OSS 120B for best quality and reasoning
const ROADMAP_MODEL = 'openai/gpt-oss-120b';

interface RoadmapGenerationResponse {
    milestones: Array<{
        title: string;
        description: string;
        topics: string[];
        resources: Array<{
            name: string;
            url: string;
            type: 'docs' | 'video' | 'interactive' | 'github' | 'course';
        }>;
        estimatedHours: number;
    }>;
}

const buildRoadmapPrompt = (goal: string): string => {
    return `You are a specialized Web3 education consultant. Your task is to create a PERSONALIZED learning roadmap based on the user's SPECIFIC goal.

═══════════════════════════════════════════════════════════
USER'S LEARNING GOAL:
"${goal}"
═══════════════════════════════════════════════════════════

LANGUAGE RULE (CRITICAL):
- DETECT the language of the user's goal above
- RESPOND IN THE SAME LANGUAGE as the user wrote their goal
- If user wrote in Turkish → titles and descriptions in Turkish
- If user wrote in English → titles and descriptions in English
- If user wrote in German → titles and descriptions in German
- etc.

CRITICAL INSTRUCTIONS:
1. Analyze the user's goal CAREFULLY and tailor the roadmap specifically to it
2. If they want to be an auditor, focus on auditing skills
3. If they want to learn DeFi, focus on DeFi protocols
4. If they want Web3 development, focus on Solidity/tooling
5. DO NOT give a generic blockchain roadmap - be SPECIFIC to their goal

RESOURCE RULES - USE ONLY THESE VERIFIED URLS:
Documentation:
- https://ethereum.org/developers
- https://docs.soliditylang.org/
- https://book.getfoundry.sh/
- https://docs.openzeppelin.com/contracts

Interactive Learning:
- https://cryptozombies.io/
- https://speedrunethereum.com/
- https://ethernaut.openzeppelin.com/

Security Resources:
- https://swcregistry.io/
- https://github.com/crytic/not-so-smart-contracts
- https://github.com/OpenZeppelin/openzeppelin-contracts

YouTube (use EXACT URLs):
- https://www.youtube.com/c/PatrickCollins (Solidity courses)
- https://www.youtube.com/c/SmartContractProgrammer (tutorials)

Audit Platforms:
- https://code4rena.com/
- https://www.sherlock.xyz/
- https://immunefi.com/

DO NOT invent URLs. If unsure, use only the domains listed above.

OUTPUT FORMAT - Return VALID JSON only:
{
    "milestones": [
        {
            "title": "Title in USER'S LANGUAGE",
            "description": "Description in USER'S LANGUAGE (1-2 sentences)",
            "topics": ["Topic 1", "Topic 2", "Topic 3"],
            "resources": [
                {"name": "Resource Name", "url": "https://...", "type": "docs|video|interactive|github|course"}
            ],
            "estimatedHours": 8
        }
    ]
}

IMPORTANT:
- 5-8 milestones total
- Each milestone 5-15 hours
- 2-4 resources per milestone
- Progress from beginner to advanced
- RESPOND IN THE SAME LANGUAGE AS THE USER'S GOAL
- MUST be relevant to: "${goal}"`;
};

export const generateLearningRoadmap = async (
    goal: string,
    apiKey: string,
    onProgress?: (status: string) => void
): Promise<RoadmapGenerationResponse> => {
    onProgress?.('Preparing roadmap generation...');

    const prompt = buildRoadmapPrompt(goal);
    const systemPrompt = `You are a Web3 education expert. Generate structured learning roadmaps.

CRITICAL LANGUAGE RULE:
- Detect the language of the user's goal
- If goal is in ENGLISH → respond in English
- If goal is in TURKISH → respond in Turkish
- Match the user's language EXACTLY

Respond only with valid JSON.`;

    onProgress?.('Sending to GPT-OSS 120B with reasoning...');

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: ROADMAP_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.6,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        })
    });

    if (!response.ok) {
        if (checkRateLimitError(response, 'Roadmap generation')) {
            throw new Error('Rate limit exceeded');
        }
        const error = await response.text();
        console.error('Roadmap API Error:', error);
        throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
        throw new Error('Empty response from AI');
    }

    onProgress?.('Parsing roadmap...');

    try {
        const parsed = JSON.parse(content) as RoadmapGenerationResponse;

        if (!parsed.milestones || !Array.isArray(parsed.milestones)) {
            console.error('Invalid roadmap structure - parsed object:', parsed);
            throw new Error('Invalid roadmap structure');
        }

        return parsed;
    } catch (parseError) {
        console.error('Roadmap parse error:', parseError);
        throw new Error('Failed to parse AI roadmap response');
    }
};

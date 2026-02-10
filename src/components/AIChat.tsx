import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, Sparkles, Loader2, User, Bot, Trash2, Copy, Check, Settings, FileText, Zap, ZapOff, Download, X, Square, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import SimpleBarReact from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { toast } from 'sonner';
import { MarkdownRenderer } from './MarkdownRenderer';
import { addNotification } from '@/stores/NotificationStore';
import type { DailyLog, Goal } from '@/types';
import type { UserProfile } from '@/types/userProfile';
import { createDefaultUserProfile } from '@/types/userProfile';
import '@/types/electron';
import ChatHistorySidebar from './ChatHistorySidebar';
import {
  ChatSession,
  ChatMessage as HistoryMessage,
  createChatSession,
  getChatSession,
  updateChatSession,
  listChatSessions,
  generateTitleWithAI,
  renameChat
} from '@/services/ChatHistoryService';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  copied?: boolean;
  files?: File[];
  // Reasoning and tool usage
  reasoning?: string;  // Thinking process from reasoning models
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface AIChatProps {
  apiKey: string;
  progressContext: {
    totalHours: number;
    earnings: number;
    bugs: number;
    weeklyHours: number;
    notes: string[];
  };
}

interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  streamEnabled: boolean;
  reasoningEnabled: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
  // Tool settings
  toolsEnabled: boolean;
  enabledTools: string[];  // ['browser_search', 'code_interpreter']
}

// Rich context for AI - loaded once when chat opens
interface ChatContext {
  userProfile: UserProfile | null;
  recentLogs: DailyLog[];
  activeGoals: Goal[];
  isLoaded: boolean;
}

// System prompt - English only (AI responds in user's language automatically)
const SYSTEM_PROMPT = `You are the user's personal Web3 security mentor and friend. The user is a student trying to become a bug hunter.

## IMPORTANT: Language Rule
- ALWAYS respond in the SAME LANGUAGE as the user's message
- If they write in Turkish, respond in Turkish
- If they write in English, respond in English
- If they write in any other language, respond in that language

## Conversation Rules
- Be natural and friendly, don't act like a robot
- If they say "Hello" or "Merhaba", just greet back, don't recommend resources
- Don't dump information unless asked
- Keep answers concise, elaborate when needed
- Use emojis but don't overdo it
- KNOW the user's past work and status, give personalized responses

## Markdown Format
- Headers: #, ##, ###
- Lists: - or *
- Code: \`\`\`solidity ... \`\`\`
- Important: **bold**

## Your Expertise
- Solidity and EVM security
- Bug bounty (Code4rena, Sherlock, Immunefi)
- Smart contract auditing
- DeFi protocols

## Behavior
- Motivate but avoid fake positivity
- Be realistic, correct errors gently
- Speak according to the user's level`;

// Available Models - Groq API (2025)
// reasoningType: 'full' = supports low/medium/high, 'simple' = only on/off (default/none)
const GROQ_MODELS = [
  // Production Models
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', category: 'Production', speed: '~560 t/s', emoji: '🚀', reasoning: false, reasoningType: null, toolsSupported: false, availableTools: [] as string[] },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', category: 'Production', speed: '~280 t/s', emoji: '💪', reasoning: false, reasoningType: null, toolsSupported: false, availableTools: [] as string[] },
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', category: 'Production', speed: '~500 t/s', emoji: '🧠', reasoning: true, reasoningType: 'full' as const, toolsSupported: true, availableTools: ['browser_search', 'code_interpreter'] },
  { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', category: 'Production', speed: '~700 t/s', emoji: '⚡', reasoning: true, reasoningType: 'full' as const, toolsSupported: true, availableTools: ['browser_search', 'code_interpreter'] },
  // Preview Models
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', category: 'Preview', speed: '~400 t/s', emoji: '🦙', reasoning: false, reasoningType: null, toolsSupported: false, availableTools: [] as string[] },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', category: 'Preview', speed: '~450 t/s', emoji: '🔍', reasoning: false, reasoningType: null, toolsSupported: false, availableTools: [] as string[] },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', category: 'Preview', speed: '~350 t/s', emoji: '🌐', reasoning: true, reasoningType: 'simple' as const, toolsSupported: false, availableTools: [] as string[] },
  { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2', category: 'Preview', speed: '~300 t/s', emoji: '🌙', reasoning: false, reasoningType: null, toolsSupported: false, availableTools: [] as string[] },
];

// Default settings
const defaultSettings: ChatSettings = {
  model: 'llama-3.1-8b-instant',
  temperature: 0.7,
  maxTokens: 2000,
  streamEnabled: true,
  reasoningEnabled: false,
  reasoningEffort: 'medium',
  toolsEnabled: false,
  enabledTools: [],
};

export const AIChat = ({ apiKey, progressContext }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamedReasoning, setStreamedReasoning] = useState('');
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);

  // Chat history state
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0); // Trigger sidebar reload

  // Rich context state - loaded once when chat opens
  const [chatContext, setChatContext] = useState<ChatContext>({
    userProfile: null,
    recentLogs: [],
    activeGoals: [],
    isLoaded: false
  });

  // Load rich context when component mounts
  const loadChatContext = useCallback(async () => {
    try {
      let userProfile: UserProfile | null = null;
      let recentLogs: DailyLog[] = [];
      let activeGoals: Goal[] = [];

      if (window.electronAPI?.readFile) {
        // Load UserProfile
        const profileResult = await window.electronAPI.readFile('UserProfile.json');
        if (profileResult.success && profileResult.data) {
          userProfile = profileResult.data;
        } else {
          userProfile = createDefaultUserProfile();
        }

        // Load last 7 days logs from BasicLogs.json
        const logsResult = await window.electronAPI.readFile('BasicLogs.json');
        if (logsResult.success && logsResult.data?.dailyLogs) {
          const allLogs = logsResult.data.dailyLogs as DailyLog[];
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

          recentLogs = allLogs
            .filter((log: DailyLog) => log.date >= sevenDaysAgoStr)
            .sort((a: DailyLog, b: DailyLog) => b.date.localeCompare(a.date));
        }

        // Load active goals
        const goalsResult = await window.electronAPI.readFile('Goals.json');
        if (goalsResult.success && goalsResult.data?.goals) {
          activeGoals = (goalsResult.data.goals as Goal[]).filter((g: Goal) => g.status === 'active');
        }
      }

      setChatContext({
        userProfile,
        recentLogs,
        activeGoals,
        isLoaded: true
      });
    } catch (error) {
      console.error('Failed to load chat context:', error);
      setChatContext(prev => ({ ...prev, isLoaded: true }));
    }
  }, []);

  // Build enhanced system prompt with all context
  const buildEnhancedSystemPrompt = useCallback(() => {
    let prompt = SYSTEM_PROMPT;

    // English-only labels
    const labels = {
      userProfile: '👤 USER PROFILE',
      name: 'Name',
      specialInstructions: 'Special Instructions',
      skillLevels: '📊 Skill Levels',
      learning: '📚 Learning',
      completed: 'Completed',
      wantsToLearn: 'Wants to Learn',
      strugglingWith: 'Struggling With',
      mentalState: '🧠 Mental State',
      motivation: 'Motivation',
      energy: 'Energy Pattern',
      stress: 'Stress (1-10)',
      personality: '💪 Personality',
      strengths: 'Strengths',
      areasToImprove: 'Areas to Improve',
      notSpecified: 'Not specified',
      notYet: 'Not yet',
      recentWork: '📅 LAST 7 DAYS WORK',
      activities: 'Activities',
      learnings: 'Learnings',
      tomorrowFocus: 'Tomorrow Focus',
      activeGoals: '🎯 ACTIVE GOALS',
      stats: '📈 GENERAL STATISTICS',
      totalWork: 'Total Work',
      thisWeek: 'This Week',
      bugsFound: 'Bugs Found',
      earnings: 'Earnings',
      hours: 'hours'
    };

    // Add user profile context
    if (chatContext.userProfile) {
      const p = chatContext.userProfile;
      prompt += `\n\n═══════════════════════════════════════════════════════
${labels.userProfile}
═══════════════════════════════════════════════════════
${labels.name}: ${p.identity?.nickname || 'Friend'}
${p.identity?.aiInstructions ? `${labels.specialInstructions}: ${p.identity.aiInstructions}` : ''}

${labels.skillLevels}:
- Solidity: ${p.skillLevels?.solidity || 'beginner'}
- Security: ${p.skillLevels?.security || 'beginner'}
- DeFi: ${p.skillLevels?.defi || 'beginner'}
- Auditing: ${p.skillLevels?.smartContractAuditing || 'beginner'}

${labels.learning}:
- ${labels.completed}: ${(p.learning?.completedTopics || []).join(', ') || labels.notYet}
- ${labels.wantsToLearn}: ${(p.learning?.wantsToLearn || []).join(', ') || labels.notSpecified}
- ${labels.strugglingWith}: ${(p.learning?.strugglingWith || []).join(', ') || labels.notSpecified}

${labels.mentalState}:
- ${labels.motivation}: ${p.mentalState?.motivationLevel || 'medium'}
- ${labels.energy}: ${p.mentalState?.energyPattern || 'evening'}
- ${labels.stress}: ${p.mentalState?.stressLevel || 5}

${labels.personality}:
- ${labels.strengths}: ${(p.traits?.strengths || []).join(', ') || labels.notSpecified}
- ${labels.areasToImprove}: ${(p.traits?.areasToImprove || []).join(', ') || labels.notSpecified}`;
    }

    // Add recent logs summary
    if (chatContext.recentLogs.length > 0) {
      prompt += `\n\n═══════════════════════════════════════════════════════
${labels.recentWork}
═══════════════════════════════════════════════════════`;

      chatContext.recentLogs.slice(0, 7).forEach(log => {
        prompt += `\n\n📆 ${log.date} (${log.hours}h, Mood: ${log.mood}/10)
${labels.activities}: ${log.activities?.substring(0, 200) || labels.notSpecified}
${labels.learnings}: ${log.learnings?.substring(0, 200) || labels.notSpecified}`;

        if (log.aiReview?.tomorrowFocus) {
          prompt += `\n${labels.tomorrowFocus}: ${log.aiReview.tomorrowFocus.join(', ')}`;
        }
      });
    }

    // Add active goals
    if (chatContext.activeGoals.length > 0) {
      prompt += `\n\n═══════════════════════════════════════════════════════
${labels.activeGoals}
═══════════════════════════════════════════════════════`;

      chatContext.activeGoals.forEach(goal => {
        prompt += `\n- ${goal.title} (${goal.progress || 0}%)`;
      });
    }

    // Add current stats from progressContext
    prompt += `\n\n═══════════════════════════════════════════════════════
${labels.stats}
═══════════════════════════════════════════════════════
- ${labels.totalWork}: ${progressContext.totalHours} ${labels.hours}
- ${labels.thisWeek}: ${progressContext.weeklyHours} ${labels.hours}
- ${labels.bugsFound}: ${progressContext.bugs}
- ${labels.earnings}: $${progressContext.earnings}`;

    return prompt;
  }, [chatContext, progressContext]);

  // Load context on mount
  useEffect(() => {
    loadChatContext();
  }, [loadChatContext]);

  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI?.readFile) {
        try {
          const result = await window.electronAPI.readFile('settings.json');
          if (result.success && result.data?.chatSettings) {
            setSettings(prev => ({ ...prev, ...result.data.chatSettings }));
          }
        } catch (error) {
          console.error('Failed to load chat settings:', error);
        }
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (newSettings: ChatSettings) => {
    if (window.electronAPI?.readFile && window.electronAPI?.saveFile) {
      try {
        const result = await window.electronAPI.readFile('settings.json');
        const existingSettings = result.success && result.data ? result.data : {};

        await window.electronAPI.saveFile('settings.json', {
          ...existingSettings,
          chatSettings: newSettings,
        });
      } catch (error) {
        console.error('Failed to save chat settings:', error);
      }
    }
  };

  // Manual save triggered by Save button
  const saveAllSettings = async () => {
    if (window.electronAPI?.saveFile && window.electronAPI?.readFile) {
      try {
        const result = await window.electronAPI.readFile('settings.json');
        const existingSettings = result.success && result.data ? result.data : {};
        await window.electronAPI.saveFile('settings.json', {
          ...existingSettings,
          chatSettings: settings
        });
        toast.success('⚙️ Settings saved successfully!');
      } catch (error) {
        console.error('Failed to save chat settings:', error);
        toast.error('❌ Failed to save settings');
      }
    }
  };

  const updateSettings = (newSettings: Partial<ChatSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  };

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, streamedText, streamedReasoning]);

  // Auto-scroll thinking panel
  useEffect(() => {
    if (thinkingRef.current && streamedReasoning) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [streamedReasoning]);

  // Chat history: Load a chat session
  const loadChat = useCallback(async (chatId: string) => {
    const session = await getChatSession(chatId);
    if (session) {
      setCurrentChatId(chatId);
      // Convert HistoryMessage to Message
      const loadedMessages: Message[] = session.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        reasoning: m.reasoning
      }));
      setMessages(loadedMessages);
      // Update settings model if different
      if (session.model !== settings.model) {
        updateSettings({ model: session.model });
      }
    }
  }, [settings.model]);

  // Chat history: Save current chat to history
  const saveCurrentChat = useCallback(async () => {
    if (!currentChatId || messages.length === 0) return;

    // Convert Message to HistoryMessage
    const historyMessages: HistoryMessage[] = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      reasoning: m.reasoning
    }));

    // Get current session to check title
    const session = await getChatSession(currentChatId);
    const isFirstSave = session?.title === 'New Chat' && messages.length >= 1;

    await updateChatSession(currentChatId, {
      messages: historyMessages,
      model: settings.model
    });

    // Generate AI title in background on first user message
    if (isFirstSave && apiKey) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        generateTitleWithAI(firstUserMessage.content, apiKey).then(async (aiTitle) => {
          if (aiTitle) {
            await renameChat(currentChatId, aiTitle);
            setSidebarRefresh(prev => prev + 1);
          }
        });
      }
    }

    setSidebarRefresh(prev => prev + 1);
  }, [currentChatId, messages, settings.model, apiKey]);

  // Chat history: Create new chat
  const handleNewChat = useCallback(async () => {
    const newSession = await createChatSession(settings.model);
    setCurrentChatId(newSession.id);
    setMessages([]);
    setStreamedText('');
    setStreamedReasoning('');
    setSidebarRefresh(prev => prev + 1);
  }, [settings.model]);

  // Chat history: Select a chat
  const handleSelectChat = useCallback(async (chatId: string) => {
    // Save current chat before switching
    if (currentChatId && messages.length > 0) {
      await saveCurrentChat();
    }
    await loadChat(chatId);
  }, [currentChatId, messages.length, saveCurrentChat, loadChat]);

  // Auto-save chat when messages change
  useEffect(() => {
    if (currentChatId && messages.length > 0 && !isLoading && !isStreaming) {
      const timer = setTimeout(() => {
        saveCurrentChat();
      }, 1000); // Debounce 1 second
      return () => clearTimeout(timer);
    }
  }, [currentChatId, messages, isLoading, isStreaming, saveCurrentChat]);

  // Initialize: Create a new chat on first load if none exists
  useEffect(() => {
    const initChat = async () => {
      const sessions = await listChatSessions();
      if (sessions.length > 0) {
        // Load most recent chat
        await loadChat(sessions[0].id);
      } else {
        // Create new chat
        await handleNewChat();
      }
    };
    initChat();
  }, []);



  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['text/', 'application/pdf'];
    const validFiles = files.filter(file =>
      allowedTypes.some(type => file.type.startsWith(type))
    );

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) selected`);
    } else {
      toast.error('Only text and PDF files are supported');
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const prepareFileContent = async (files: File[]) => {
    let textContent = '';

    for (const file of files) {
      if (file.type.startsWith('text/') || file.type === 'application/pdf') {
        try {
          const text = await file.text();
          textContent += `\n[File Content: ${file.name}]\n${text.substring(0, 5000)}...\n`;
        } catch (error) {
          textContent += `\n[File Unreadable: ${file.name}]\n`;
        }
      }
    }

    return textContent;
  };

  const sendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    if (!apiKey) {
      toast.error('Please enter your API key in settings');
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      files: [...selectedFiles],
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedFiles([]);
    setIsLoading(true);

    if (settings.streamEnabled) {
      setIsStreaming(true);
      setStreamedText('');
    }

    try {
      let fileContent = '';
      if (userMessage.files && userMessage.files.length > 0) {
        fileContent = await prepareFileContent(userMessage.files);
      }

      const systemPrompt = buildEnhancedSystemPrompt();

      const messageHistory = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: input + (fileContent ? `\n\n${fileContent} ` : '')
        }
      ];

      abortControllerRef.current = new AbortController();

      if (settings.streamEnabled) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey} `,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify((() => {
            const currentModel = GROQ_MODELS.find(m => m.id === settings.model);
            const body: Record<string, unknown> = {
              model: settings.model,
              messages: messageHistory,
              temperature: settings.temperature,
              max_tokens: settings.maxTokens,
              stream: true
            };
            // Add reasoning_effort for reasoning models
            if (currentModel?.reasoning && settings.reasoningEnabled) {
              // 'simple' type only supports 'default', 'full' type supports low/medium/high
              body.reasoning_effort = currentModel.reasoningType === 'simple' ? 'default' : settings.reasoningEffort;
              // Add reasoning_format to separate thinking from answer
              body.reasoning_format = 'parsed';
            }
            if (currentModel?.toolsSupported) {
              body.tool_choice = 'none';
            }
            return body;
          })()),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          // Check for rate limit (429) - need to distinguish between types
          if (response.status === 429) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || '';

            // Check if it's "too many requests" (temporary) - check for rate/request keywords
            const isRateLimit = errorMessage.toLowerCase().includes('rate') ||
              errorMessage.toLowerCase().includes('request') ||
              errorMessage.toLowerCase().includes('try again');

            if (isRateLimit) {
              // Rate limiting - too many requests (temporary)
              addNotification(
                'info',
                'Too Many Requests',
                `Rate limited. Please wait a moment before sending another message.`,
                { tab: 'settings' }
              );
              throw new Error('Rate limited - please wait a moment');
            } else {
              // Token/daily limit exceeded
              addNotification(
                'error',
                'Token Limit Reached',
                `Daily token limit exceeded for model "${settings.model}". AI Chat cannot continue. Please try again tomorrow or switch to a different model.`,
                { tab: 'settings' }
              );
              throw new Error(`Token limit reached for ${settings.model}`);
            }
          }
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `HTTP error! status: ${response.status} `);
        }


        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let fullReasoning = '';
        let toolCalls: any[] = [];

        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.substring(6));
                const delta = data.choices?.[0]?.delta;

                // Capture main content
                if (delta?.content) {
                  fullResponse += delta.content;
                  setStreamedText(fullResponse);
                  // Clear live thinking stream when content starts (thinking is done)
                  if (streamedReasoning) {
                    setStreamedReasoning('');
                  }
                }

                // Capture reasoning (thinking process) - LIVE STREAM
                if (delta?.reasoning) {
                  fullReasoning += delta.reasoning;
                  setStreamedReasoning(fullReasoning);
                }

                // Capture tool calls
                if (delta?.tool_calls) {
                  toolCalls.push(...delta.tool_calls)
                }
              } catch (e) {
                // JSON parse error, continue
              }
            }
          }
        }

        const newMessageId = Date.now() + 1;
        const assistantMessage: Message = {
          id: newMessageId,
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          reasoning: fullReasoning || undefined,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setStreamedText('');
        setStreamedReasoning('')
        setIsStreaming(false);
        // Don't auto-expand completed messages - they start collapsed
      } else {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey} `,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify((() => {
            const currentModel = GROQ_MODELS.find(m => m.id === settings.model);
            const body: Record<string, unknown> = {
              model: settings.model,
              messages: messageHistory,
              temperature: settings.temperature,
              max_tokens: settings.maxTokens,
              stream: false
            };
            // Add reasoning_effort for reasoning models
            if (currentModel?.reasoning && settings.reasoningEnabled) {
              // 'simple' type only supports 'default', 'full' type supports low/medium/high
              body.reasoning_effort = currentModel.reasoningType === 'simple' ? 'default' : settings.reasoningEffort;
              // Add reasoning_format to separate thinking from answer
              body.reasoning_format = 'parsed';
            }
            if (currentModel?.toolsSupported) {
              body.tool_choice = 'none';
            }
            return body;
          })()),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          // Check for rate limit (429) - need to distinguish between types
          if (response.status === 429) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || '';

            // Check if it's "too many requests" (temporary) - check for rate/request keywords
            const isRateLimit = errorMessage.toLowerCase().includes('rate') ||
              errorMessage.toLowerCase().includes('request') ||
              errorMessage.toLowerCase().includes('try again');

            if (isRateLimit) {
              // Rate limiting - too many requests (temporary)
              addNotification(
                'info',
                'Too Many Requests',
                `Rate limited. Please wait a moment before sending another message.`,
                { tab: 'settings' }
              );
              throw new Error('Rate limited - please wait a moment');
            } else {
              // Token/daily limit exceeded
              addNotification(
                'error',
                'Token Limit Reached',
                `Daily token limit exceeded for model "${settings.model}". AI Chat cannot continue. Please try again tomorrow or switch to a different model.`,
                { tab: 'settings' }
              );
              throw new Error(`Token limit reached for ${settings.model}`);
            }
          }
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `HTTP error! status: ${response.status} `);
        }

        const data = await response.json();

        if (data.choices?.[0]?.message?.content) {
          const message = data.choices[0].message;

          const assistantMessage: Message = {
            id: Date.now() + 1,
            role: 'assistant',
            content: message.content,
            timestamp: new Date(),
            reasoning: message.reasoning || undefined,
            tool_calls: message.tool_calls || undefined,
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error('No response received');
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Request cancelled');
      } else if (error.message.includes('429')) {
        toast.error('Rate limit exceeded. Please wait a few minutes.');
      } else {
        toast.error(`An error occurred: ${error.message}`);
        console.error(error);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const copyMessage = (id: number, content: string) => {
    navigator.clipboard.writeText(content);
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, copied: true } : m
    ));
    setTimeout(() => {
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, copied: false } : m
      ));
    }, 2000);
    toast.success('Copied!');
  };

  const downloadChatHistory = () => {
    const history = messages.map(m =>
      `${m.timestamp.toLocaleString('en-US')} - ${m.role}: ${m.content}`
    ).join('\n\n---\n\n');

    const blob = new Blob([history], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Chat history downloaded');
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsStreaming(false);
      toast.info('Generation stopped');
    }
  };

  const quickPrompts = [
    'What should I study today?',
    'What is a reentrancy attack?',
    'How do flash loan attacks work?',
    'What is slippage?',
    'Where should I start for my first bug bounty?',
    'I lost motivation, help me',
  ];

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('text/') || file.type === 'application/pdf') {
      return <FileText className="w-3 h-3" />;
    }
    return <FileText className="w-3 h-3" />;
  };

  return (
    <div className="flex h-[calc(100vh-280px)] w-full max-w-7xl mx-auto">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        currentModel={settings.model}
        key={sidebarRefresh}
      />

      {/* Divider */}
      <div className="w-px bg-white/5 shrink-0" />

      {/* Main Chat Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl flex flex-col flex-1 relative bg-transparent overflow-hidden"
      >
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        {/* Header - Fixed at top (outside scroll) */}
        <div className="shrink-0 p-4 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(var(--neptune-primary-rgb),0.1)] border border-[var(--neptune-primary-dim)] flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[var(--neptune-primary)] opacity-0 group-hover:opacity-20 transition-opacity" />
              <Brain className="w-5 h-5 text-[var(--neptune-primary)]" />
            </div>
            <div>
              <h3 className="font-bold flex items-center gap-2 text-sm font-display tracking-widest text-[var(--neptune-text-primary)]">
                AI CHAT
                <span className="text-[10px] bg-[var(--neptune-primary)] text-black px-1 rounded font-mono font-bold">V.2.4</span>
              </h3>
              <p className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Connected: {settings.model}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={downloadChatHistory} className="text-[var(--neptune-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] h-8 w-8">
              <Download className="w-4 h-4" />
            </Button>
            {(isLoading || isStreaming) && (
              <Button variant="ghost" size="icon" onClick={stopGeneration} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 animate-pulse">
                <Square className="w-3 h-3 fill-current" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className={`h-8 w-8 transition-all ${showSettings ? 'text-[var(--neptune-primary)] bg-[rgba(var(--neptune-primary-rgb),0.1)]' : 'text-[var(--neptune-text-muted)] hover:text-white'}`}>
              <Settings className={`w-4 h-4 ${showSettings ? 'animate-spin-slow' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl overflow-hidden bg-[#05080c] mx-2 mb-2 outline-none ring-0 border-0"
            >
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-medium mb-1 block text-[var(--neptune-text-secondary)] uppercase">AI Model</label>
                  <select
                    value={settings.model}
                    onChange={(e) => updateSettings({ model: e.target.value })}
                    className="w-full text-xs bg-[#0a0f16] border border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] rounded px-3 py-2 font-mono focus:border-[var(--neptune-primary)] outline-none"
                  >
                    <optgroup label="Production Models">
                      {GROQ_MODELS.filter(m => m.category === 'Production').map(m => (
                        <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Beta Models">
                      {GROQ_MODELS.filter(m => m.category === 'Preview').map(m => (
                        <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-[9px] text-[var(--neptune-text-muted)] mt-1 font-mono">
                    Speed: {GROQ_MODELS.find(m => m.id === settings.model)?.speed || 'Unknown'}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-medium mb-1 block text-[var(--neptune-text-secondary)] uppercase">
                    Temperature: {settings.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-[var(--neptune-primary)]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-medium mb-1 block text-[var(--neptune-text-secondary)] uppercase">
                    Max Tokens: {settings.maxTokens}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={settings.maxTokens}
                    onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
                    className="w-full accent-[var(--neptune-primary)]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="streaming"
                      checked={settings.streamEnabled}
                      onChange={(e) => updateSettings({ streamEnabled: e.target.checked })}
                      className="w-3.5 h-3.5 accent-[var(--neptune-primary)] bg-transparent border-[var(--neptune-primary-dim)]"
                    />
                    <label htmlFor="streaming" className="text-[10px] uppercase font-mono flex items-center gap-1 text-[var(--neptune-text-primary)]">
                      {settings.streamEnabled ? <Zap className="w-3 h-3 text-yellow-400" /> : <ZapOff className="w-3 h-3 text-gray-500" />} Stream Responses
                    </label>
                  </div>

                  {/* Reasoning Section - Only for reasoning models */}
                  {GROQ_MODELS.find(m => m.id === settings.model)?.reasoning && (
                    <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="reasoning"
                          checked={settings.reasoningEnabled}
                          onChange={(e) => updateSettings({ reasoningEnabled: e.target.checked })}
                          className="w-3.5 h-3.5 accent-[var(--neptune-primary)] bg-transparent border-[var(--neptune-primary-dim)]"
                        />
                        <label htmlFor="reasoning" className="text-[10px] uppercase font-mono text-[var(--neptune-text-primary)]">🧠 Thinking Mode</label>
                      </div>
                      {settings.reasoningEnabled && (
                        <>
                          {/* Show effort selector only for 'full' reasoning models */}
                          {GROQ_MODELS.find(m => m.id === settings.model)?.reasoningType === 'full' ? (
                            <div className="ml-5 space-y-1">
                              <label className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase">Reasoning Effort:</label>
                              <div className="flex gap-1">
                                {(['low', 'medium', 'high'] as const).map((level) => (
                                  <button
                                    key={level}
                                    onClick={() => updateSettings({ reasoningEffort: level })}
                                    className={`text-[9px] font-mono px-2 py-1 rounded border transition-all ${settings.reasoningEffort === level
                                      ? 'bg-[var(--neptune-primary)] text-black border-[var(--neptune-primary)]'
                                      : 'border-[var(--neptune-primary-dim)] text-[var(--neptune-text-muted)] hover:border-[var(--neptune-primary)]'
                                      }`}
                                  >
                                    {level === 'low' && '⚡'} {level === 'medium' && '🔄'} {level === 'high' && '🧠'} {level.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[8px] text-[var(--neptune-text-muted)] font-mono">
                                {settings.reasoningEffort === 'low' && 'Quick thinking - faster responses'}
                                {settings.reasoningEffort === 'medium' && 'Balanced reasoning - good for most tasks'}
                                {settings.reasoningEffort === 'high' && 'Deep analysis - thorough but slower'}
                              </p>
                            </div>
                          ) : (
                            <p className="ml-5 text-[8px] text-[var(--neptune-text-muted)] font-mono">
                              ✓ Extended thinking enabled for deeper analysis
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="text-[9px] font-mono text-[var(--neptune-primary)] bg-[rgba(var(--neptune-primary-rgb),0.1)] p-1 rounded border border-[var(--neptune-primary-dim)] text-center">
                    Premium Access Enabled
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>




        {/* Messages - Scrollable area with SimpleBar */}
        <SimpleBarReact
          className="flex-1 min-h-0"
          style={{ maxHeight: '100%' }}
          scrollableNodeProps={{ ref: scrollRef }}
        >
          <div className="p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                <div className="w-16 h-16 rounded-full border border-[var(--neptune-primary)] flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 rounded-full bg-[var(--neptune-primary)] opacity-20 animate-ping" />
                  <Brain className="w-8 h-8 text-[var(--neptune-primary)]" />
                </div>
                <h4 className="font-mono font-bold mb-2 text-[var(--neptune-text-primary)] tracking-widest text-sm">AI CHAT READY</h4>
                <p className="text-xs font-mono text-[var(--neptune-text-muted)] mb-6 max-w-sm">
                  Ready to help with Web3 security, Solidity questions, and protocol analysis.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(prompt);
                        inputRef.current?.focus();
                      }}
                      className="text-[10px] font-mono text-[var(--neptune-text-secondary)] border border-[var(--neptune-primary-dim)] px-2 py-1 rounded hover:bg-[var(--neptune-primary)] hover:text-black transition-all uppercase"
                    >
                      {prompt} {'>'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 font-mono text-sm pb-4">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative ${msg.role === 'user' ? 'ml-8' : 'mr-4'}`}
                    >
                      <div className={`relative rounded-xl overflow-hidden ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10'
                        : 'bg-gradient-to-br from-[rgba(var(--neptune-primary-rgb),0.1)] to-[rgba(var(--neptune-primary-rgb),0.02)] border border-[var(--neptune-primary-dim)]'
                        }`}>
                        {/* Header */}
                        <div className={`px-4 py-2 flex items-center gap-3 border-b ${msg.role === 'user'
                          ? 'border-white/5 bg-white/[0.02]'
                          : 'border-[var(--neptune-primary-dim)] bg-[rgba(var(--neptune-primary-rgb),0.05)]'
                          }`}>
                          {/* Avatar */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white'
                            : 'bg-gradient-to-br from-[var(--neptune-primary)] to-cyan-400 text-black'
                            }`}>
                            {msg.role === 'user' ? '👤' : '🤖'}
                          </div>

                          {/* Name & Time */}
                          <div className="flex-1">
                            <span className={`font-bold text-[11px] uppercase tracking-wider ${msg.role === 'user' ? 'text-slate-300' : 'text-[var(--neptune-primary)]'
                              }`}>
                              {msg.role === 'user' ? 'You' : 'Neptune AI'}
                            </span>
                          </div>

                          {/* Timestamp */}
                          <span className="text-[9px] text-[var(--neptune-text-muted)] font-mono">
                            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Content area */}
                        <div className="p-4">

                          {msg.files && msg.files.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {msg.files.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="text-[10px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-2 py-1 rounded flex items-center gap-1 text-[var(--neptune-text-secondary)]"
                                >
                                  {getFileIcon(file)}
                                  <span className="truncate max-w-[150px]">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reasoning (Thinking Process) - Premium Collapsible Modal */}
                          {msg.role === 'assistant' && msg.reasoning && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mb-3 relative overflow-hidden rounded-xl"
                            >
                              {/* Gradient border glow */}
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-purple-500/20 blur-sm" />

                              <div className="relative bg-[rgba(15,10,30,0.95)] backdrop-blur-xl rounded-xl border border-purple-500/30">
                                {/* Header - Always visible */}
                                <button
                                  onClick={() => {
                                    setExpandedThinking(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(msg.id)) {
                                        newSet.delete(msg.id);
                                      } else {
                                        newSet.add(msg.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-purple-500/10 transition-colors rounded-t-xl"
                                >
                                  <div className="flex items-center gap-2">
                                    <motion.span
                                      animate={{ rotate: expandedThinking.has(msg.id) ? 0 : -90 }}
                                      className="text-purple-300"
                                    >
                                      ▼
                                    </motion.span>
                                    <span className="text-lg">🧠</span>
                                    <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-semibold">
                                      Thinking Process
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-purple-400/60 bg-purple-500/10 px-2 py-1 rounded-full">
                                    {msg.reasoning.length} chars
                                  </span>
                                </button>

                                {/* Content - Collapsible */}
                                <AnimatePresence>
                                  {expandedThinking.has(msg.id) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-4 pt-0 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
                                        <pre className="text-[11px] font-mono text-purple-200/80 whitespace-pre-wrap leading-relaxed">
                                          {msg.reasoning}
                                        </pre>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          )}

                          {/* Tool Calls - Only for assistant with tool usage */}
                          {msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0 && (
                            <div className="mb-3 space-y-2">
                              {msg.tool_calls.map((tool, idx) => {
                                // Parse arguments safely - might already be an object or a string
                                let toolArgs;
                                try {
                                  toolArgs = typeof tool.function.arguments === 'string'
                                    ? JSON.parse(tool.function.arguments)
                                    : tool.function.arguments;
                                } catch (e) {
                                  toolArgs = tool.function.arguments;
                                }

                                return (
                                  <details key={idx} className="bg-[rgba(0,180,216,0.1)] border border-cyan-500/30 rounded-lg p-3" open>
                                    <summary className="cursor-pointer text-[10px] font-mono uppercase text-cyan-300 mb-2 flex items-center gap-2">
                                      🔧 {tool.function.name === 'browser_search' && '🌐 Web Search'}
                                      {tool.function.name === 'code_interpreter' && '💻 Code Execution'}
                                      {!['browser_search', 'code_interpreter'].includes(tool.function.name) && tool.function.name}
                                    </summary>
                                    <pre className="text-[10px] font-mono text-cyan-200/80 whitespace-pre-wrap overflow-x-auto">
                                      {typeof toolArgs === 'object' ? JSON.stringify(toolArgs, null, 2) : String(toolArgs)}
                                    </pre>
                                  </details>
                                );
                              })}
                            </div>
                          )}

                          <div className={`prose prose-invert max-w-none text-xs leading-relaxed ${msg.role === 'user' ? 'text-[var(--neptune-text-primary)]' : 'text-[var(--neptune-text-secondary)]'}`}>
                            {msg.role === 'assistant' ? (
                              <MarkdownRenderer content={msg.content} />
                            ) : (
                              <p className="whitespace-pre-wrap font-mono">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {msg.role === 'assistant' && (
                        <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)]"
                            onClick={() => copyMessage(msg.id, msg.content)}
                          >
                            {msg.copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Streaming response */}
                {isStreaming && (streamedText || streamedReasoning) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mr-4"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[rgba(var(--neptune-primary-rgb),0.15)] to-[rgba(var(--neptune-primary-rgb),0.02)] border border-[var(--neptune-primary)] animate-pulse">
                      {/* Header */}
                      <div className="px-4 py-2 flex items-center gap-3 border-b border-[var(--neptune-primary-dim)] bg-[rgba(var(--neptune-primary-rgb),0.1)]">
                        {/* Avatar with animation */}
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--neptune-primary)] to-cyan-400"
                        >
                          <span className="text-black text-xs">⚡</span>
                        </motion.div>
                        <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--neptune-primary)]">
                          Neptune AI <span className="text-cyan-400 ml-1">• Typing...</span>
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        {/* Live Thinking Stream */}
                        {streamedReasoning && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative overflow-hidden rounded-xl"
                          >
                            {/* Animated gradient border */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/30 via-purple-500/40 to-cyan-500/30 animate-pulse blur-sm" />

                            <div className="relative bg-[rgba(15,10,30,0.95)] backdrop-blur-xl rounded-xl border border-cyan-500/40">
                              <div className="px-4 py-3 flex items-center gap-2 border-b border-cyan-500/20">
                                <motion.span
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="text-lg"
                                >
                                  🧠
                                </motion.span>
                                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                                  Thinking...
                                </span>
                                <motion.div
                                  animate={{ opacity: [0.4, 1, 0.4] }}
                                  transition={{ repeat: Infinity, duration: 1.2 }}
                                  className="ml-auto text-[9px] font-mono text-cyan-400/60 bg-cyan-500/10 px-2 py-1 rounded-full"
                                >
                                  {streamedReasoning.length} chars
                                </motion.div>
                              </div>
                              <div ref={thinkingRef} className="px-4 py-3 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                                <pre className="text-[11px] font-mono text-cyan-200/80 whitespace-pre-wrap leading-relaxed">
                                  {streamedReasoning}
                                  <motion.span
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.5 }}
                                    className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 align-middle"
                                  />
                                </pre>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Response text */}
                        {streamedText && (
                          <div className="prose prose-invert max-w-none text-xs leading-relaxed text-[var(--neptune-text-secondary)]">
                            <MarkdownRenderer content={streamedText} />
                            <motion.span
                              animate={{ opacity: [1, 0] }}
                              transition={{ repeat: Infinity, duration: 0.5 }}
                              className="inline-block w-2 h-4 bg-[var(--neptune-primary)] ml-1 align-middle"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {isLoading && !isStreaming && (
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--neptune-text-muted)]">
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--neptune-primary)]" />
                    Thinking...
                  </div>
                )}
              </div>
            )}
          </div>
        </SimpleBarReact>

        {/* File preview */}
        {selectedFiles.length > 0 && (
          <div className="border-t border-[var(--neptune-primary-dim)] p-2 bg-[#080c11]">
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="text-[10px] font-mono bg-[rgba(var(--neptune-primary-rgb),0.1)] border border-[var(--neptune-primary-dim)] px-2 py-1 rounded flex items-center gap-2 text-[var(--neptune-text-primary)]"
                >
                  {getFileIcon(file)}
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-[var(--neptune-text-muted)] hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-mono text-[var(--neptune-text-muted)] mt-1 uppercase">
              Files attached: Text/PDF only.
            </p>
          </div>
        )}


        {/* Input - Fixed at bottom (outside scroll) */}
        <div className="shrink-0 p-4 relative z-20">
          <div className="relative">
            {/* Gradient glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--neptune-primary)]/20 via-cyan-500/10 to-[var(--neptune-primary)]/20 rounded-xl blur-sm opacity-50" />

            <div className="relative flex gap-2 items-center bg-[#0a0f16]/90 backdrop-blur-sm border border-[var(--neptune-primary-dim)] rounded-xl px-3 shadow-lg shadow-black/30">
              <div className="flex gap-1 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  accept="text/*,application/pdf"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  disabled={isLoading || isStreaming}
                  className="h-8 w-8 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] hover:bg-[var(--neptune-primary)]/10 rounded-lg transition-all"
                  title="Attach file"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>

              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Neptune anything..."
                disabled={isLoading || isStreaming}
                className="flex-1 bg-transparent border-none text-sm font-mono text-[var(--neptune-text-primary)] h-11 focus:ring-0 placeholder:text-[var(--neptune-text-muted)]/40 focus:outline-none"
              />

              <Button
                onClick={sendMessage}
                disabled={(isLoading || isStreaming) || (!input.trim() && selectedFiles.length === 0)}
                className="h-8 px-4 bg-gradient-to-r from-[var(--neptune-primary)] to-cyan-500 hover:from-[var(--neptune-secondary)] hover:to-cyan-400 text-black font-bold font-mono text-[10px] uppercase transition-all shadow-lg shadow-[var(--neptune-primary)]/20 rounded-lg disabled:opacity-40"
              >
                {(isLoading || isStreaming) ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1">Send <Send className="w-2.5 h-2.5" /></span>
                )}
              </Button>
            </div>
          </div>
          <div className="mt-1 flex justify-between px-1">
            <div className="text-[8px] font-mono text-[var(--neptune-text-muted)] uppercase">
              Secure connection
            </div>
            <div className="text-[8px] font-mono text-[var(--neptune-text-muted)] uppercase flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ONLINE
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
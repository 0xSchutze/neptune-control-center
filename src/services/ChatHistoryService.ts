// ChatHistoryService - Chat history management
// Saves chat history as JSON to data/chats/ folder via API

import '@/types/electron';

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    reasoning?: string;
    files?: { name: string; type: string }[];
}

export interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    model: string;
    pinned: boolean;
    messages: ChatMessage[];
}

const CHATS_FOLDER = 'chats';

// Generate unique chat ID
export const generateChatId = (): string => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate title from first message (fallback)
export const generateTitleSimple = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';

    const content = firstUserMessage.content;
    // First 50 chars, end at word boundary
    if (content.length <= 50) return content;

    const truncated = content.substring(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + '...';
};

// Generate smart title using LLM (async, background call)
export const generateTitleWithAI = async (
    firstMessage: string,
    apiKey: string
): Promise<string> => {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a title generator. Generate a very short, concise title (max 5-6 words) for a chat conversation based on the first user message. IMPORTANT: Generate the title in the SAME LANGUAGE as the user message. Reply with ONLY the title, nothing else. No quotes, no punctuation at the end.'
                    },
                    {
                        role: 'user',
                        content: `Generate a title for this chat: "${firstMessage.substring(0, 200)}"`
                    }
                ],
                max_tokens: 30,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            return '';
        }

        const data = await response.json();
        const title = data.choices?.[0]?.message?.content?.trim();

        if (title && title.length > 0 && title.length <= 60) {
            return title;
        }

        return '';
    } catch (error) {
        console.error('[ChatHistory] AI title generation error:', error);
        return '';
    }
};

// Combined title generator (uses AI if available, falls back to simple)
export const generateTitle = (messages: ChatMessage[]): string => {
    return generateTitleSimple(messages);
};

// List all chat sessions
export const listChatSessions = async (): Promise<ChatSession[]> => {
    try {
        if (!window.electronAPI?.listFolder) {
            return [];
        }

        const result = await window.electronAPI.listFolder(CHATS_FOLDER);

        if (!result.success || !result.data) {
            return [];
        }

        // result.data is already an array of parsed ChatSession objects
        const sessions: ChatSession[] = result.data as ChatSession[];

        // Sort: pinned first, then by updatedAt
        return sessions.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    } catch (error) {
        console.error('[ChatHistory] Error listing sessions:', error);
        return [];
    }
};

// Get a single chat session
export const getChatSession = async (chatId: string): Promise<ChatSession | null> => {
    try {
        if (!window.electronAPI?.readFile) return null;

        const result = await window.electronAPI.readFile(`${CHATS_FOLDER}/${chatId}.json`);

        if (!result.success || !result.data) return null;

        return result.data as ChatSession;
    } catch (error) {
        console.error('[ChatHistory] Error getting session:', error);
        return null;
    }
};

// Save a chat session
export const saveChatSession = async (session: ChatSession): Promise<boolean> => {
    try {
        if (!window.electronAPI?.saveToFolder) {
            return false;
        }

        const result = await window.electronAPI.saveToFolder(
            CHATS_FOLDER,
            `${session.id}.json`,
            session
        );

        return result.success;
    } catch (error) {
        console.error('[ChatHistory] Error saving session:', error);
        return false;
    }
};

// Create a new chat session
export const createChatSession = async (model: string): Promise<ChatSession> => {
    const session: ChatSession = {
        id: generateChatId(),
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model,
        pinned: false,
        messages: []
    };

    await saveChatSession(session);
    return session;
};

// Update chat session (auto-title, messages, etc.)
export const updateChatSession = async (
    chatId: string,
    updates: Partial<ChatSession>
): Promise<ChatSession | null> => {
    const session = await getChatSession(chatId);
    if (!session) return null;

    const updatedSession: ChatSession = {
        ...session,
        ...updates,
        updatedAt: new Date().toISOString()
    };

    // Auto-generate title if still "New Chat" and has messages
    if (updatedSession.title === 'New Chat' && updatedSession.messages.length > 0) {
        updatedSession.title = generateTitle(updatedSession.messages);
    }

    await saveChatSession(updatedSession);
    return updatedSession;
};

// Delete a chat session
export const deleteChatSession = async (chatId: string): Promise<boolean> => {
    try {
        if (!window.electronAPI?.deleteFromFolder) return false;

        const result = await window.electronAPI.deleteFromFolder(CHATS_FOLDER, `${chatId}.json`);
        return result.success;
    } catch (error) {
        console.error('[ChatHistory] Error deleting session:', error);
        return false;
    }
};

// Toggle pin status
export const togglePinChat = async (chatId: string): Promise<boolean> => {
    const session = await getChatSession(chatId);
    if (!session) return false;

    const updated = await updateChatSession(chatId, { pinned: !session.pinned });
    return !!updated;
};

// Rename chat
export const renameChat = async (chatId: string, newTitle: string): Promise<boolean> => {
    const updated = await updateChatSession(chatId, { title: newTitle });
    return !!updated;
};

// Export chat as JSON
export const exportChatAsJSON = (session: ChatSession): string => {
    return JSON.stringify(session, null, 2);
};

// Export chat as Markdown
export const exportChatAsMD = (session: ChatSession): string => {
    let md = `# ${session.title}\n\n`;
    md += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
    md += `**Model:** ${session.model}\n\n`;
    md += `---\n\n`;

    for (const msg of session.messages) {
        const role = msg.role === 'user' ? '👤 **You**' : '🤖 **Neptune AI**';
        const time = new Date(msg.timestamp).toLocaleTimeString();

        md += `### ${role} (${time})\n\n`;

        if (msg.reasoning) {
            md += `<details>\n<summary>💭 Thinking</summary>\n\n${msg.reasoning}\n\n</details>\n\n`;
        }

        md += `${msg.content}\n\n`;
        md += `---\n\n`;
    }

    return md;
};

// Parse MD to ChatSession
export const importChatFromMD = (mdContent: string, model: string = 'gpt-4o'): ChatSession => {
    const lines = mdContent.split('\n');
    const messages: ChatMessage[] = [];

    let title = 'Imported Chat';
    let currentRole: 'user' | 'assistant' | null = null;
    let currentContent = '';
    let msgId = 1;

    for (const line of lines) {
        // Extract title
        if (line.startsWith('# ')) {
            title = line.substring(2).trim();
            continue;
        }

        // Detect role
        if (line.includes('👤 **You**') || line.includes('**You**')) {
            if (currentRole && currentContent.trim()) {
                messages.push({
                    id: msgId++,
                    role: currentRole,
                    content: currentContent.trim(),
                    timestamp: new Date().toISOString()
                });
            }
            currentRole = 'user';
            currentContent = '';
            continue;
        }

        if (line.includes('🤖 **Neptune AI**') || line.includes('**Neptune AI**') || line.includes('**Assistant**')) {
            if (currentRole && currentContent.trim()) {
                messages.push({
                    id: msgId++,
                    role: currentRole,
                    content: currentContent.trim(),
                    timestamp: new Date().toISOString()
                });
            }
            currentRole = 'assistant';
            currentContent = '';
            continue;
        }

        // Skip separators and metadata
        if (line.startsWith('---') || line.startsWith('**Created:**') || line.startsWith('**Model:**')) {
            continue;
        }

        // Accumulate content
        if (currentRole) {
            currentContent += line + '\n';
        }
    }

    // Add last message
    if (currentRole && currentContent.trim()) {
        messages.push({
            id: msgId,
            role: currentRole,
            content: currentContent.trim(),
            timestamp: new Date().toISOString()
        });
    }

    return {
        id: generateChatId(),
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model,
        pinned: false,
        messages
    };
};

// Import chat from JSON
export const importChatFromJSON = (jsonContent: string): ChatSession | null => {
    try {
        const session = JSON.parse(jsonContent) as ChatSession;
        // Assign new ID to avoid conflicts
        return {
            ...session,
            id: generateChatId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    } catch (e) {
        console.error('[ChatHistory] Failed to parse JSON:', e);
        return null;
    }
};

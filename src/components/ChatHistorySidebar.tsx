// ChatHistorySidebar - Transparent chat history list on the left side
import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pin, MoreVertical, Trash2, Edit2, Download, Upload, FileJson, FileText, X, Check } from 'lucide-react';
import SimpleBarReact from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import {
    ChatSession,
    listChatSessions,
    createChatSession,
    deleteChatSession,
    togglePinChat,
    renameChat,
    exportChatAsJSON,
    exportChatAsMD,
    importChatFromJSON,
    importChatFromMD,
    saveChatSession
} from '@/services/ChatHistoryService';

interface ChatHistorySidebarProps {
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    currentModel: string;
}

const ChatHistorySidebar = memo(({
    currentChatId,
    onSelectChat,
    onNewChat,
    currentModel
}: ChatHistorySidebarProps) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    // Load chat sessions
    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        const loaded = await listChatSessions();
        setSessions(loaded);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // Handle new chat
    const handleNewChat = async () => {
        onNewChat();
        await loadSessions();
    };

    // Handle delete - show confirm modal
    const handleDeleteClick = (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmId(chatId);
        setMenuOpen(null);
    };

    // Confirm delete
    const handleConfirmDelete = async () => {
        if (deleteConfirmId) {
            await deleteChatSession(deleteConfirmId);
            await loadSessions();
            setDeleteConfirmId(null);
            // Open new chat after deleting
            onNewChat();
        }
    };

    // Handle pin toggle
    const handlePin = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await togglePinChat(chatId);
        await loadSessions();
        setMenuOpen(null);
    };

    // Handle rename start
    const handleStartRename = (chatId: string, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(chatId);
        setEditTitle(currentTitle);
        setMenuOpen(null);
    };

    // Handle rename save
    const handleSaveRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId && editTitle.trim()) {
            await renameChat(editingId, editTitle.trim());
            await loadSessions();
        }
        setEditingId(null);
        setEditTitle('');
    };

    // Handle export JSON
    const handleExportJSON = (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        const json = exportChatAsJSON(session);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMenuOpen(null);
    };

    // Handle export MD
    const handleExportMD = (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        const md = exportChatAsMD(session);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
        setMenuOpen(null);
    };

    // Handle import
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const content = await file.text();
        let session: ChatSession | null = null;

        if (file.name.endsWith('.json')) {
            session = importChatFromJSON(content);
        } else if (file.name.endsWith('.md')) {
            session = importChatFromMD(content, currentModel);
        }

        if (session) {
            await saveChatSession(session);
            await loadSessions();
            onSelectChat(session.id);
        }

        // Reset input
        e.target.value = '';
    };

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString('en-US');
    };

    return (
        <div className="w-64 shrink-0 flex flex-col h-full">
            {/* Header */}
            <div className="p-3 flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--neptune-text-muted)]">
                    Chats
                </h3>
                <div className="flex gap-1">
                    {/* Import button */}
                    <label className="p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 text-[var(--neptune-text-muted)]" />
                        <input
                            type="file"
                            accept=".json,.md"
                            className="hidden"
                            onChange={handleImport}
                        />
                    </label>
                    {/* New chat button */}
                    <button
                        onClick={handleNewChat}
                        className="p-1.5 rounded-lg hover:bg-[var(--neptune-primary)]/10 transition-colors group"
                    >
                        <Plus className="w-4 h-4 text-[var(--neptune-primary)] group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Chat list */}
            <SimpleBarReact className="flex-1 min-h-0" style={{ maxHeight: '100%' }}>
                <div className="px-2 pb-2 space-y-1">
                    {isLoading ? (
                        <div className="text-center py-8 text-xs text-[var(--neptune-text-muted)]">
                            Loading...
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[var(--neptune-text-muted)]">
                            No chats yet
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectChat(session.id)}
                                className={`
                  group relative p-2.5 rounded-xl cursor-pointer transition-all duration-200
                  ${currentChatId === session.id
                                        ? 'bg-[var(--neptune-primary)]/10 border border-[var(--neptune-primary)]/30'
                                        : 'hover:bg-white/5 border border-transparent'
                                    }
                `}
                            >
                                {/* Editing mode */}
                                {editingId === session.id ? (
                                    <form onSubmit={handleSaveRename} className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            autoFocus
                                            className="flex-1 bg-black/30 border border-[var(--neptune-primary)]/50 rounded px-2 py-1 text-xs text-white outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button type="submit" className="p-1 hover:bg-green-500/20 rounded">
                                            <Check className="w-3 h-3 text-green-400" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                                            className="p-1 hover:bg-red-500/20 rounded"
                                        >
                                            <X className="w-3 h-3 text-red-400" />
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        {/* Title row */}
                                        <div className="flex items-start gap-2">
                                            {session.pinned && (
                                                <Pin className="w-3 h-3 text-[var(--neptune-primary)] shrink-0 mt-0.5" />
                                            )}
                                            <span className="text-xs text-[var(--neptune-text-primary)] line-clamp-2 flex-1">
                                                {session.title}
                                            </span>

                                            {/* 3-dot menu */}
                                            <button
                                                ref={(el) => {
                                                    if (el) menuButtonRefs.current.set(session.id, el);
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (menuOpen === session.id) {
                                                        setMenuOpen(null);
                                                        setMenuPosition(null);
                                                    } else {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setMenuPosition({
                                                            top: rect.bottom + 4,
                                                            left: rect.right - 160
                                                        });
                                                        setMenuOpen(session.id);
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                                            >
                                                <MoreVertical className="w-3 h-3 text-[var(--neptune-text-muted)]" />
                                            </button>
                                        </div>

                                        {/* Date */}
                                        <div className="text-[9px] font-mono text-[var(--neptune-text-muted)] mt-1">
                                            {formatDate(session.updatedAt)}
                                        </div>

                                        {/* Dropdown menu rendered via portal below */}
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </SimpleBarReact>

            {/* Dropdown Menu Portal - renders outside scroll container */}
            {menuOpen && menuPosition && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            top: menuPosition.top,
                            left: menuPosition.left,
                            zIndex: 9999
                        }}
                        className="bg-[#0a0f16] border border-[var(--neptune-primary-dim)] rounded-lg shadow-xl overflow-hidden min-w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {sessions.find(s => s.id === menuOpen) && (() => {
                            const session = sessions.find(s => s.id === menuOpen)!;
                            return (
                                <>
                                    <button
                                        onClick={(e) => handleStartRename(session.id, session.title, e)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--neptune-text-secondary)] hover:bg-white/5 transition-colors"
                                    >
                                        <Edit2 className="w-3 h-3" /> Rename
                                    </button>
                                    <button
                                        onClick={(e) => handlePin(session.id, e)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--neptune-text-secondary)] hover:bg-white/5 transition-colors"
                                    >
                                        <Pin className="w-3 h-3" /> {session.pinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <div className="border-t border-white/5" />
                                    <button
                                        onClick={(e) => handleExportJSON(session, e)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--neptune-text-secondary)] hover:bg-white/5 transition-colors"
                                    >
                                        <FileJson className="w-3 h-3" /> Export as JSON
                                    </button>
                                    <button
                                        onClick={(e) => handleExportMD(session, e)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--neptune-text-secondary)] hover:bg-white/5 transition-colors"
                                    >
                                        <FileText className="w-3 h-3" /> Export as Markdown
                                    </button>
                                    <div className="border-t border-white/5" />
                                    <button
                                        onClick={(e) => handleDeleteClick(session.id, e)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </>
                            );
                        })()}
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Click outside to close menu */}
            {menuOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => { setMenuOpen(null); setMenuPosition(null); }}
                />,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setDeleteConfirmId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0a0f16] border border-red-500/30 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-400" />
                                </div>
                                <h3 className="text-white font-bold">Delete Chat</h3>
                            </div>
                            <p className="text-[var(--neptune-text-secondary)] text-sm mb-6">
                                Are you sure you want to delete this chat? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-[var(--neptune-text-secondary)] hover:bg-white/5 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

ChatHistorySidebar.displayName = 'ChatHistorySidebar';

export default ChatHistorySidebar;

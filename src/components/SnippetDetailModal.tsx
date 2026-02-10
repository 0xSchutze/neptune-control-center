import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Star, Tag, Edit2, Trash2, Save, FileCode } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Snippet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { toast } from 'sonner';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';

interface SnippetDetailModalProps {
    snippet: Snippet | null;
    isOpen: boolean;
    onClose: () => void;
    onToggleFavorite: (id: number, isFavorite: boolean) => void;
    onUpdate: (id: number, updates: Partial<Snippet>) => void;
    onDelete: (id: number) => void;
}

const categories = [
    { value: 'security', label: '🔒 Security' },
    { value: 'gas', label: '⛽ Gas Optimization' },
    { value: 'pattern', label: '📐 Design Pattern' },
    { value: 'test', label: '🧪 Testing' },
    { value: 'defi', label: '💰 DeFi' },
    { value: 'other', label: '📁 Other' },
];

const languages = [
    { value: 'solidity', label: 'Solidity' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'rust', label: 'Rust' },
];

// Memoized code display component for performance
const CodeDisplay = memo(({ code, language }: { code: string; language: string }) => (
    <SyntaxHighlighter
        language={language === 'solidity' ? 'javascript' : language}
        style={oneDark}
        showLineNumbers
        customStyle={{
            background: 'transparent',
            padding: 0,
            margin: 0,
            fontSize: '12px',
            lineHeight: '1.6',
        }}
        lineNumberStyle={{
            color: 'rgba(255,255,255,0.2)',
            minWidth: '2.5em',
            paddingRight: '1em',
        }}
        codeTagProps={{
            style: {
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
            }
        }}
    >
        {code}
    </SyntaxHighlighter>
));
CodeDisplay.displayName = 'CodeDisplay';

export const SnippetDetailModal = memo(({
    snippet,
    isOpen,
    onClose,
    onToggleFavorite,
    onUpdate,
    onDelete,
}: SnippetDetailModalProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        title: '',
        code: '',
        language: 'solidity',
        category: 'security',
        notes: '',
        tags: [] as string[],
    });
    const [newTag, setNewTag] = useState('');

    // Sync edit data when snippet changes
    useEffect(() => {
        if (snippet) {
            setEditData({
                title: snippet.title,
                code: snippet.code,
                language: snippet.language,
                category: snippet.category,
                notes: snippet.notes || '',
                tags: snippet.tags || [],
            });
            setIsEditing(false);
        }
    }, [snippet]);

    const copyToClipboard = useCallback(() => {
        if (snippet) {
            navigator.clipboard.writeText(snippet.code);
            toast.success('Code copied to clipboard!');
        }
    }, [snippet]);

    const handleDelete = useCallback(() => {
        if (snippet) {
            onDelete(snippet.id);
            onClose();
            toast.success('Snippet deleted!');
        }
    }, [snippet, onDelete, onClose]);

    const handleSave = useCallback(() => {
        if (!editData.title.trim() || !editData.code.trim()) {
            toast.error('Title and code are required');
            return;
        }
        if (snippet) {
            onUpdate(snippet.id, editData);
            toast.success('Snippet updated!');
            setIsEditing(false);
        }
    }, [snippet, editData, onUpdate]);

    const handleAddTag = useCallback(() => {
        if (newTag.trim() && !editData.tags.includes(newTag.trim())) {
            setEditData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
            setNewTag('');
        }
    }, [newTag, editData.tags]);

    const handleRemoveTag = useCallback((tag: string) => {
        setEditData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (isEditing) {
                setIsEditing(false);
            } else {
                onClose();
            }
        }
        if (e.key === 's' && (e.metaKey || e.ctrlKey) && isEditing) {
            e.preventDefault();
            handleSave();
        }
    }, [isEditing, onClose, handleSave]);

    // Memoize file extension
    const fileExtension = useMemo(() => {
        if (!snippet) return '';
        switch (snippet.language) {
            case 'solidity': return 'sol';
            case 'typescript': return 'ts';
            case 'javascript': return 'js';
            case 'python': return 'py';
            case 'rust': return 'rs';
            default: return 'txt';
        }
    }, [snippet?.language]);

    if (!snippet) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[9998] bg-black/90"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                        onKeyDown={handleKeyDown}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-4xl max-h-[90vh] bg-[rgba(10,15,25,0.98)] rounded-2xl border border-[var(--neptune-primary-dim)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-[var(--neptune-primary-dim)] bg-gradient-to-r from-[rgba(0,180,216,0.1)] to-transparent flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <FileCode className="w-5 h-5 text-[var(--neptune-primary)]" />
                                            <span className="text-lg font-bold text-[var(--neptune-text-primary)] font-display">
                                                EDIT SNIPPET
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col min-w-0">
                                            <h2 className="text-lg font-bold text-[var(--neptune-text-primary)] font-display truncate">
                                                {snippet.title}
                                            </h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[9px] font-mono uppercase border-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] bg-[rgba(var(--neptune-primary-rgb),0.05)]">
                                                    {snippet.language}
                                                </Badge>
                                                <Badge variant="secondary" className="text-[9px] font-mono uppercase bg-[rgba(255,255,255,0.05)] text-[var(--neptune-text-secondary)]">
                                                    {categories.find((c) => c.value === snippet.category)?.label}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {!isEditing && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setIsEditing(true)}
                                                className="h-8 w-8 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)]"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-8 w-8 ${snippet.isFavorite ? 'text-yellow-400' : 'text-[var(--neptune-text-muted)] hover:text-yellow-400'}`}
                                                onClick={() => onToggleFavorite(snippet.id, !snippet.isFavorite)}
                                            >
                                                <Star className={`w-4 h-4 ${snippet.isFavorite ? 'fill-yellow-400' : ''}`} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={copyToClipboard}
                                                className="h-8 w-8 text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)]"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleDelete}
                                                className="h-8 w-8 text-[var(--neptune-text-muted)] hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={isEditing ? () => setIsEditing(false) : onClose}
                                        className="h-8 w-8 text-[var(--neptune-text-muted)] hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            <NeptuneScrollbar className="flex-1" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                                {isEditing ? (
                                    /* Edit Mode */
                                    <div className="p-6 space-y-4">
                                        {/* Title */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Title</Label>
                                            <Input
                                                value={editData.title}
                                                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                                placeholder="Snippet title..."
                                                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-10 text-sm font-semibold"
                                            />
                                        </div>

                                        {/* Language & Category */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Language</Label>
                                                <Select value={editData.language} onValueChange={(v) => setEditData({ ...editData, language: v })}>
                                                    <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-10 text-xs font-mono">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] z-[10000]">
                                                        {languages.map((lang) => (
                                                            <SelectItem key={lang.value} value={lang.value} className="text-xs font-mono">
                                                                {lang.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Category</Label>
                                                <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                                                    <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-10 text-xs font-mono">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] z-[10000]">
                                                        {categories.map((cat) => (
                                                            <SelectItem key={cat.value} value={cat.value} className="text-xs font-mono">
                                                                {cat.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Code */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Code</Label>
                                            <Textarea
                                                value={editData.code}
                                                onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                                                placeholder="// Paste your code here..."
                                                rows={12}
                                                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] font-mono text-xs"
                                            />
                                        </div>

                                        {/* Tags */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Tags</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newTag}
                                                    onChange={(e) => setNewTag(e.target.value)}
                                                    placeholder="Add tag..."
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                                    className="flex-1 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono"
                                                />
                                                <Button type="button" variant="outline" onClick={handleAddTag} className="h-9 border-[var(--neptune-primary-dim)]">
                                                    <Tag className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            {editData.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {editData.tags.map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant="secondary"
                                                            className="text-[10px] font-mono cursor-pointer bg-[rgba(var(--neptune-primary-rgb),0.1)] border border-[var(--neptune-primary-dim)] text-[var(--neptune-primary)] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                                                            onClick={() => handleRemoveTag(tag)}
                                                        >
                                                            #{tag} ×
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Notes</Label>
                                            <Textarea
                                                value={editData.notes}
                                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                placeholder="Additional notes..."
                                                rows={3}
                                                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <>
                                        {/* Tags */}
                                        {snippet.tags && snippet.tags.length > 0 && (
                                            <div className="px-6 py-2 border-b border-[var(--neptune-primary-dim)] bg-[rgba(0,0,0,0.2)] flex items-center gap-2 flex-wrap">
                                                <Tag className="w-3 h-3 text-[var(--neptune-text-muted)]" />
                                                {snippet.tags.map((tag) => (
                                                    <Badge key={tag} variant="outline" className="text-[9px] border-dashed border-[var(--neptune-text-muted)] text-[var(--neptune-text-secondary)] px-1.5 py-0">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Code Block */}
                                        <div className="bg-[#05080c] m-4 rounded-xl border border-[rgba(255,255,255,0.05)] overflow-hidden">
                                            {/* Terminal Header */}
                                            <div className="bg-[#0f1419] px-4 py-2 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                                                    <span className="ml-2 text-[10px] font-mono text-[var(--neptune-text-muted)] opacity-50">
                                                        {snippet.title}.{fileExtension}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={copyToClipboard}
                                                    className="h-6 px-2 text-[10px] font-mono text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)]"
                                                >
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    Copy
                                                </Button>
                                            </div>

                                            {/* Code */}
                                            <div className="p-4 overflow-x-auto">
                                                <CodeDisplay code={snippet.code} language={snippet.language} />
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {snippet.notes && (
                                            <div className="mx-4 mb-4 p-4 bg-[rgba(0,180,216,0.05)] border border-dashed border-[var(--neptune-primary-dim)] rounded-lg">
                                                <div className="flex items-start gap-2 text-xs font-mono text-[var(--neptune-text-secondary)]">
                                                    <span className="text-[var(--neptune-primary)] font-bold">::</span>
                                                    <span>{snippet.notes}</span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </NeptuneScrollbar>

                            {/* Footer */}
                            <div className="px-6 py-3 border-t border-[var(--neptune-primary-dim)] bg-[rgba(0,0,0,0.3)] flex items-center justify-between shrink-0">
                                <p className="text-[10px] font-mono text-[var(--neptune-text-muted)]">
                                    {isEditing ? 'Press Ctrl+S to save' : `Created: ${new Date(snippet.createdAt).toLocaleString()}`}
                                </p>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsEditing(false)}
                                            className="border-[var(--neptune-primary-dim)] text-[var(--neptune-text-muted)] hover:text-white px-4"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSave}
                                            className="bg-[var(--neptune-primary)] text-black font-bold hover:bg-[var(--neptune-secondary)] px-6 shadow-[0_0_15px_rgba(0,180,216,0.3)]"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={onClose}
                                        className="bg-[var(--neptune-primary)] text-black font-bold hover:bg-[var(--neptune-secondary)] px-6 shadow-[0_0_15px_rgba(0,180,216,0.3)]"
                                    >
                                        Close
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
});
SnippetDetailModal.displayName = 'SnippetDetailModal';

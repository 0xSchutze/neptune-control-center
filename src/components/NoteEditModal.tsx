import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Pin, PinOff, Tag, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';

interface NoteEditModalProps {
    note: Note | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: number, updates: Partial<Note>) => void;
}

const noteColors = [
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
];

const categories = [
    { value: 'audit', label: '🛡️ AUDIT' },
    { value: 'learning', label: '📚 LEARNING' },
    { value: 'research', label: '🔬 RESEARCH' },
    { value: 'general', label: '📝 GENERAL' },
];

export const NoteEditModal = ({
    note,
    isOpen,
    onClose,
    onSave,
}: NoteEditModalProps) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [color, setColor] = useState('purple');
    const [category, setCategory] = useState<'audit' | 'learning' | 'research' | 'general'>('general');
    const [isPinned, setIsPinned] = useState(false);

    // Sync state when note changes
    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setColor(note.color || 'purple');
            setCategory(note.category || 'general');
            setIsPinned(note.isPinned || false);
        }
    }, [note]);

    if (!note) return null;

    const handleSave = () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }
        onSave(note.id, {
            title,
            content,
            color,
            category,
            isPinned,
        });
        toast.success('Note updated!');
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
        if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={handleKeyDown}
                            className="w-full max-w-3xl max-h-[85vh] bg-[rgba(10,15,25,0.98)] rounded-2xl border border-[var(--neptune-primary-dim)] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,180,216,0.1)] flex flex-col overflow-hidden pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-[var(--neptune-primary-dim)] bg-gradient-to-r from-[rgba(0,180,216,0.1)] to-transparent flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[rgba(0,180,216,0.15)] flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-[var(--neptune-primary)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[var(--neptune-text-primary)] font-display">
                                            EDIT NOTE
                                        </h2>
                                        <p className="text-[10px] font-mono text-[var(--neptune-text-muted)]">
                                            Press Cmd/Ctrl + S to save
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="text-[var(--neptune-text-muted)] hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5 neptune-scrollbar">
                                {/* Title */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">
                                        Title
                                    </Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Note title..."
                                        className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-10 text-sm font-semibold focus:border-[var(--neptune-primary)]"
                                        autoFocus
                                    />
                                </div>

                                {/* Category, Color, Pin - Row */}
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Category */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">
                                            Category
                                        </Label>
                                        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                                            <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-10 text-xs font-mono">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] z-[10000]">
                                                {categories.map((c) => (
                                                    <SelectItem key={c.value} value={c.value} className="text-xs font-mono">
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Color */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">
                                            Color
                                        </Label>
                                        <div className="flex items-center gap-2 h-10 px-3 bg-[#0a0f16] border border-[var(--neptune-primary-dim)] rounded-md">
                                            {noteColors.map((c) => (
                                                <button
                                                    key={c.value}
                                                    onClick={() => setColor(c.value)}
                                                    className={`w-5 h-5 rounded-full transition-all ${c.class} ${color === c.value
                                                        ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0a0f16] scale-110'
                                                        : 'opacity-40 hover:opacity-100'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pin Toggle */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">
                                            Pin Status
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsPinned(!isPinned)}
                                            className={`w-full h-10 text-xs font-mono border-[var(--neptune-primary-dim)] ${isPinned
                                                ? 'bg-[rgba(0,180,216,0.15)] text-[var(--neptune-primary)] border-[var(--neptune-primary)]'
                                                : 'bg-[#0a0f16] text-[var(--neptune-text-muted)]'
                                                }`}
                                        >
                                            {isPinned ? (
                                                <>
                                                    <Pin className="w-3.5 h-3.5 mr-2 fill-current" />
                                                    PINNED
                                                </>
                                            ) : (
                                                <>
                                                    <PinOff className="w-3.5 h-3.5 mr-2" />
                                                    NOT PINNED
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-2 flex-1">
                                    <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">
                                        Content
                                    </Label>
                                    <Textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Write your note content..."
                                        className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] font-mono text-xs focus:border-[var(--neptune-primary)] min-h-[380px] resize-none"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-[var(--neptune-primary-dim)] bg-[rgba(0,0,0,0.3)] flex items-center justify-between">
                                <p className="text-[10px] font-mono text-[var(--neptune-text-muted)]">
                                    Last updated: {new Date(note.updatedAt).toLocaleString()}
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="border-[var(--neptune-primary-dim)] text-[var(--neptune-text-muted)] hover:text-white px-6"
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
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

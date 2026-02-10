import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Trash2, Edit2, Check, X, Eye, Search, Filter, Grid, List, Pin, PinOff, Tag, FileText, Hash } from 'lucide-react';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { NoteDetailModal } from './NoteDetailModal';
import { NoteEditModal } from './NoteEditModal';

interface NotesTabProps {
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote: (id: number, updates: Partial<Note>) => void;
  onDeleteNote: (id: number) => void;
}

const noteColors = [
  { value: 'purple', class: 'bg-[rgba(168,85,247,0.1)] border-purple-500/30 text-purple-400', dotClass: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' },
  { value: 'blue', class: 'bg-[rgba(59,130,246,0.1)] border-blue-500/30 text-blue-400', dotClass: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' },
  { value: 'green', class: 'bg-[rgba(34,197,94,0.1)] border-green-500/30 text-green-400', dotClass: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' },
  { value: 'orange', class: 'bg-[rgba(249,115,22,0.1)] border-orange-500/30 text-orange-400', dotClass: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' },
  { value: 'pink', class: 'bg-[rgba(236,72,153,0.1)] border-pink-500/30 text-pink-400', dotClass: 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' },
  { value: 'cyan', class: 'bg-[rgba(6,182,212,0.1)] border-cyan-500/30 text-cyan-400', dotClass: 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' },
];

const categories = [
  { value: 'all', label: 'ALL LOGS' },
  { value: 'audit', label: '🛡️ AUDIT' },
  { value: 'learning', label: '📚 LEARNING' },
  { value: 'research', label: '🔬 RESEARCH' },
  { value: 'general', label: '📝 GENERAL' },
];

export const NotesTab = memo(({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: NotesTabProps) => {
  const [newNote, setNewNote] = useState<{
    title: string;
    content: string;
    color: string;
    category: 'audit' | 'learning' | 'research' | 'general';
    isPinned: boolean;
    markdown: boolean;
  }>({
    title: '',
    content: '',
    color: 'purple',
    category: 'general',
    isPinned: false,
    markdown: false,
  });


  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [animatingNoteId, setAnimatingNoteId] = useState<number | null>(null);

  // Pop Out/In animation for pin toggle
  const handlePinToggle = async (noteId: number, currentlyPinned: boolean) => {
    setAnimatingNoteId(noteId); // Start fade-out
    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for fade-out
    onUpdateNote(noteId, { isPinned: !currentlyPinned }); // Update
    await new Promise(resolve => setTimeout(resolve, 50)); // Brief pause for reorder
    setAnimatingNoteId(null); // Start fade-in
  };

  const handleSubmit = () => {
    if (!newNote.title.trim()) {
      toast.error('Please enter a note title');
      return;
    }

    onAddNote(newNote);
    setNewNote({
      title: '',
      content: '',
      color: 'purple',
      category: 'general',
      isPinned: false,
      markdown: false,
    });
    toast.success('Note created!');
  };

  // Open edit modal
  const startEditing = (note: Note) => {
    setEditingNote(note);
    setIsEditModalOpen(true);
  };

  // Handle save from edit modal
  const handleEditSave = (id: number, updates: Partial<Note>) => {
    onUpdateNote(id, updates);
  };

  const handleDelete = (id: number) => {
    onDeleteNote(id);
    toast.success('Note deleted!');
  };

  const openNoteDetail = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const getColorClass = (color: string) => {
    return noteColors.find((c) => c.value === color)?.class || noteColors[0].class;
  };

  const getDotClass = (color: string) => {
    return noteColors.find((c) => c.value === color)?.dotClass || noteColors[0].dotClass;
  };

  // Filter notes
  const filteredNotes = notes
    .filter((note) => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesColor = !selectedColor || note.color === selectedColor;
      const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory || (!note.category && selectedCategory === 'general');
      return matchesSearch && matchesColor && matchesCategory;
    })
    .sort((a, b) => {
      if (a.isPinned === b.isPinned) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.isPinned ? -1 : 1;
    });

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6" >
      {/* Add Note Form */}
      < motion.div
        initial={{
          opacity: 0, y: - 20
        }}
        animate={{ opacity: 1, y: 0 }}
        className="neptune-glass-panel rounded-2xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,180,216,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--neptune-text-primary)] font-display tracking-wider relative z-10">
          <StickyNote className="w-5 h-5 text-[var(--neptune-primary)]" />
          NEW NOTE
        </h2>

        <div className="grid md:grid-cols-2 gap-4 relative z-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Subject</Label>
              <Input
                value={newNote.title}
                onChange={(e) =>
                  setNewNote({ ...newNote, title: e.target.value })
                }
                placeholder="Note title..."
                className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono focus:border-[var(--neptune-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Category</Label>
                <Select
                  value={newNote.category}
                  onValueChange={(v) => setNewNote({ ...newNote, category: v as any })}
                >
                  <SelectTrigger className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1419] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                    {categories.filter(c => c.value !== 'all').map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs font-mono">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Color</Label>
                <div className="flex gap-2">
                  {noteColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewNote({ ...newNote, color: color.value })}
                      className={`w-6 h-6 rounded-full border border-[rgba(255,255,255,0.1)] transition-all hover:scale-110 ${color.dotClass.split(' ')[0]} ${newNote.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110 blur-[0.5px]' : 'opacity-40 hover:opacity-100'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-mono text-[var(--neptune-text-muted)]">Content</Label>
            <Textarea
              value={newNote.content}
              onChange={(e) =>
                setNewNote({ ...newNote, content: e.target.value })
              }
              placeholder="Write your note..."
              rows={6}
              className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-secondary)] font-mono text-xs focus:border-[var(--neptune-primary)] h-[178px]"
            />
          </div>
        </div>

        <Button onClick={handleSubmit} className="mt-4 w-full bg-[var(--neptune-primary)] hover:bg-[var(--neptune-secondary)] text-black font-bold font-mono text-xs uppercase transition-all duration-300 shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.3)] hover:shadow-[0_0_20px_rgba(var(--neptune-secondary-rgb),0.5)] relative z-10">
          <Plus className="w-4 h-4 mr-2" />
          SAVE NOTE
        </Button>
      </motion.div >

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="neptune-glass-panel rounded-xl p-4 border border-[var(--neptune-primary-dim)] space-y-4"
      >
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 neptune-scrollbar" >
          {
            categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-[10px] font-mono font-medium transition-all whitespace-nowrap border ${selectedCategory === cat.value
                  ? 'bg-[rgba(var(--neptune-primary-rgb),0.1)] border-[var(--neptune-primary)] text-[var(--neptune-primary)] shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.2)]'
                  : 'bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-muted)] hover:border-[var(--neptune-primary)] hover:text-white'
                  }`}
              >
                {cat.label}
              </button>
            ))
          }
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neptune-text-muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-9 bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] h-9 text-xs font-mono focus:border-[var(--neptune-primary)] rounded-lg"
            />
          </div>

          {/* Color Filter */}
          <div className="flex items-center gap-2 bg-[#0a0f16] rounded-lg p-1.5 border border-[var(--neptune-primary-dim)]">
            <Filter className="w-3.5 h-3.5 text-[var(--neptune-text-muted)] ml-1" />
            <div className="w-[1px] h-4 bg-[var(--neptune-primary-dim)] mx-1" />
            <Button
              variant={selectedColor === null ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedColor(null)}
              className={`h-6 text-[10px] font-mono px-2 ${selectedColor === null ? 'bg-[var(--neptune-primary)] text-black font-bold' : 'text-[var(--neptune-text-muted)] hover:text-white'}`}
            >
              ALL
            </Button>
            {noteColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(selectedColor === color.value ? null : color.value)}
                className={`w-5 h-5 rounded-full ${color.dotClass.split(' ')[0]} transition-all ${selectedColor === color.value ? 'ring-2 ring-white scale-110' : 'opacity-40 hover:opacity-100'
                  }`}
              />
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#0a0f16] rounded-lg p-1 border border-[var(--neptune-primary-dim)]">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded ${viewMode === 'grid' ? 'bg-[rgba(var(--neptune-primary-rgb),0.2)] text-[var(--neptune-primary)]' : 'text-[var(--neptune-text-muted)] hover:text-white'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded ${viewMode === 'list' ? 'bg-[rgba(var(--neptune-primary-rgb),0.2)] text-[var(--neptune-primary)]' : 'text-[var(--neptune-text-muted)] hover:text-white'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-[10px] font-mono text-[var(--neptune-text-muted)] border-t border-[rgba(255,255,255,0.05)] pt-2 uppercase tracking-wider">
          <span>Total: {notes.length}</span>
          {searchQuery && <span className="text-[var(--neptune-primary)]">Found: {filteredNotes.length}</span>}
        </div>
      </motion.div>

      {/* Notes Grid/List */}
      < div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        <AnimatePresence mode="popLayout">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note, i) => (
              <motion.div
                key={note.id}
                layoutId={`note-${note.id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: animatingNoteId === note.id ? 0 : 1,
                  scale: animatingNoteId === note.id ? 0.8 : 1
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  opacity: { duration: 0.2, ease: 'easeInOut' },
                  scale: { duration: 0.2, ease: 'easeInOut' },
                  layout: { duration: 0 }
                }}
                layout
                className={`rounded-xl border relative group overflow-hidden transition-all hover:border-[var(--neptune-primary)] hover:shadow-[0_0_15px_rgba(var(--neptune-primary-rgb),0.1)] ${viewMode === 'list' ? 'p-4 flex gap-4' : 'p-5 flex flex-col'} ${note.color === 'purple' ? 'bg-[rgba(168,85,247,0.05)] border-purple-500/20' :
                  note.color === 'blue' ? 'bg-[rgba(59,130,246,0.05)] border-blue-500/20' :
                    note.color === 'green' ? 'bg-[rgba(34,197,94,0.05)] border-green-500/20' :
                      note.color === 'orange' ? 'bg-[rgba(249,115,22,0.05)] border-orange-500/20' :
                        note.color === 'pink' ? 'bg-[rgba(236,72,153,0.05)] border-pink-500/20' :
                          'bg-[rgba(6,182,212,0.05)] border-cyan-500/20'
                  }`}
              >
                <>
                  {/* Note Content Wrapper */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3 relative">
                      <div className="flex items-center gap-2 pr-8 min-w-0">
                        {/* Dot Indicator */}
                        <div className={`w-2 h-2 rounded-full shrink-0 ${noteColors.find(c => c.value === note.color)?.dotClass.split(' ')[0]}`} />
                        <h4 className="font-bold font-display tracking-wide text-[var(--neptune-text-primary)] truncate text-sm">
                          {note.title}
                        </h4>
                      </div>

                      {/* Pin Indicator */}
                      {note.isPinned && (
                        <div className="absolute right-0 top-0">
                          <Pin className="w-3.5 h-3.5 text-[var(--neptune-primary)] fill-[var(--neptune-primary)]" />
                        </div>
                      )}
                    </div>

                    {/* Content Preview */}
                    <p className={`text-xs font-mono text-[var(--neptune-text-secondary)] opacity-80 mb-4 ${viewMode === 'grid' ? 'line-clamp-4 h-[4.5em]' : 'line-clamp-2'}`}>
                      {note.content ? truncateContent(note.content, viewMode === 'grid' ? 120 : 200) : <span className="italic text-white/20">Empty log entry...</span>}
                    </p>

                    {/* Footer Metadata */}
                    <div className={`flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.05)] mt-auto ${viewMode === 'list' ? 'gap-6' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono uppercase bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-muted)] h-5 px-1.5">
                          {categories.find(c => c.value === note.category)?.label || 'GENERAL'}
                        </Badge>
                        <span className="text-[9px] font-mono text-[var(--neptune-text-muted)]">
                          {new Date(note.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 ${note.isPinned ? 'text-[var(--neptune-primary)]' : 'text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)]'}`}
                          onClick={() => handlePinToggle(note.id, note.isPinned)}
                          title={note.isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          {note.isPinned ? <Pin className="w-3 h-3 fill-current" /> : <PinOff className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-[var(--neptune-text-muted)] hover:text-white"
                          onClick={() => openNoteDetail(note)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-[var(--neptune-text-muted)] hover:text-white"
                          onClick={() => startEditing(note)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-[var(--neptune-text-muted)] hover:text-red-500"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-16 text-center border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]"
            >
              <FileText className="w-10 h-10 mx-auto mb-3 text-[var(--neptune-text-muted)] opacity-50" />
              <p className="font-display text-[var(--neptune-text-secondary)] text-sm">No notes found</p>
              <p className="text-xs font-mono text-[var(--neptune-text-muted)] mt-1">Adjust search parameters or create new entry</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div >

      {/* Note Detail Modal */}
      <NoteDetailModal
        note={selectedNote}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEdit={startEditing}
        getColorClass={getColorClass}
      />

      {/* Note Edit Modal */}
      <NoteEditModal
        note={editingNote}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleEditSave}
      />
    </div >
  );
});
NotesTab.displayName = 'NotesTab';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Calendar, Clock, Tag } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NoteDetailModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: Note) => void;
  getColorClass: (color: string) => string;
}

export const NoteDetailModal = ({
  note,
  isOpen,
  onClose,
  onEdit,
  getColorClass,
}: NoteDetailModalProps) => {
  if (!note) return null;

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

          {/* Modal Container - flex for centering */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] bg-[rgba(10,15,25,0.98)] rounded-2xl border border-[var(--neptune-primary-dim)] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,180,216,0.1)] flex flex-col overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className={`p-6 border-b border-[var(--neptune-primary-dim)] ${getColorClass(note.color)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-[var(--neptune-text-muted)]" />
                      <span className="text-xs text-[var(--neptune-text-muted)] uppercase tracking-wide font-mono">
                        {note.color} note
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--neptune-text-primary)]">{note.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[var(--neptune-text-muted)] hover:text-white"
                      onClick={() => {
                        onEdit(note);
                        onClose();
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="text-[var(--neptune-text-muted)] hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--neptune-text-muted)] font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Created: {new Date(note.createdAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Updated: {new Date(note.updatedAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 neptune-scrollbar">
                {note.content ? (
                  <MarkdownRenderer content={note.content} />
                ) : (
                  <p className="text-[var(--neptune-text-muted)] italic">No content for this note.</p>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--neptune-primary-dim)] bg-[rgba(0,0,0,0.3)]">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="border-[var(--neptune-primary-dim)] text-[var(--neptune-text-muted)] hover:text-white"
                  >
                    Close
                  </Button>
                  <Button
                    className="bg-[var(--neptune-primary)] text-black font-bold hover:bg-[var(--neptune-secondary)]"
                    onClick={() => {
                      onEdit(note);
                      onClose();
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
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

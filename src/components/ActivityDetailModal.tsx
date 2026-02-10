import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Smile, Image, Video, FileText } from 'lucide-react';
import { DailyLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ActivityDetailModalProps {
  log: DailyLog | null;
  isOpen: boolean;
  onClose: () => void;
}

const timeSlotInfo = {
  morning: { icon: '☀️', label: 'Morning' },
  evening: { icon: '🌅', label: 'Afternoon' },
  night: { icon: '🌙', label: 'Evening' },
};

const getMoodEmoji = (mood: number) => {
  if (mood >= 8) return '😄';
  if (mood >= 6) return '😊';
  if (mood >= 4) return '😐';
  return '😔';
};

export const ActivityDetailModal = ({ log, isOpen, onClose }: ActivityDetailModalProps) => {
  if (!log) return null;

  const slot = timeSlotInfo[log.timeSlot];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Calendar className="w-5 h-5 text-primary" />
            {log.date} Activity Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{log.hours}h</div>
              <div className="text-xs text-muted-foreground">Work Duration</div>
            </div>
            <div className="bg-secondary rounded-xl p-4 text-center">
              <span className="text-2xl">{slot.icon}</span>
              <div className="text-lg font-bold mt-1">{slot.label}</div>
              <div className="text-xs text-muted-foreground">Time of Day</div>
            </div>
            <div className="bg-secondary rounded-xl p-4 text-center">
              <span className="text-2xl">{getMoodEmoji(log.mood)}</span>
              <div className="text-lg font-bold mt-1">{log.mood}/10</div>
              <div className="text-xs text-muted-foreground">Mood</div>
            </div>
          </div>

          {/* Activities */}
          {log.activities && (
            <div className="bg-secondary rounded-xl p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Activities
              </h4>
              <p className="text-muted-foreground">{log.activities}</p>
            </div>
          )}

          {/* Learnings */}
          {log.learnings && (
            <div className="bg-secondary rounded-xl p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                💡 Learnings
              </h4>
              <p className="text-muted-foreground">{log.learnings}</p>
            </div>
          )}

          {/* Media Gallery */}
          {log.media && log.media.length > 0 && (
            <div className="bg-secondary rounded-xl p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                Media ({log.media.length})
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {log.media.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-lg overflow-hidden bg-background"
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.path}
                        alt={item.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <video
                        src={item.path}
                        controls
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <div className="flex items-center gap-2 text-xs text-white">
                        {item.type === 'image' ? (
                          <Image className="w-3 h-3" />
                        ) : (
                          <Video className="w-3 h-3" />
                        )}
                        <span className="truncate">{item.name}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Trash2, Eye, Calendar, Clock, Zap, FolderOpen, FileText, Image, Video, File, Code, Play, Save, X, Link, Activity, Twitter, Sparkles, Brain } from 'lucide-react';
import { DailyLog, MediaItem, Bounty, Goal, Note, Snippet } from '@/types';
import '@/types/electron'; // Global ElectronAPI type
import './neptune/neptune-design.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useUserProfile } from '../hooks/useUserProfile';
import { analyzeLog, getLast7DaysSummary, isTextBasedFile, readMediaTextContent } from '../services/aiAnalysisService';
import TweetModal from './TweetModal';

// ================== UTILITY FUNCTIONS (DailyLogModal'dan) ==================
const createPreviewForFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read image'));

    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        const thumbnailTime = Math.min(0.5, video.duration * 0.1);
        video.currentTime = thumbnailTime;
      };

      video.onseeked = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL();
            URL.revokeObjectURL(video.src);
            resolve(dataUrl);
          } else {
            URL.revokeObjectURL(video.src);
            resolve('');
          }
        } else {
          URL.revokeObjectURL(video.src);
          resolve('');
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve('');
      };

    } else {
      resolve('');
    }
  });
};

const formatFileSizeShort = (bytes: number): string => {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'K', 'M', 'G'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(1)}${sizes[i]}`;
};

const truncateFileName = (filename: string, maxLength: number = 10): string => {
  if (filename.length <= maxLength) return filename;
  const extension = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  const availableLength = maxLength - (extension ? extension.length + 1 : 0);

  if (availableLength <= 3) {
    return `...${extension ? '.' + extension : ''}`;
  }

  const truncatedName = nameWithoutExt.substring(0, availableLength - 3) + '...';
  return `${truncatedName}${extension ? '.' + extension : ''}`;
};

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = error => reject(error);
  });
};

const sanitizeFilename = (filename: string): string => {
  const extension = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
  return extension ? `${cleanName}.${extension}` : cleanName;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (file: File) => {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (type.startsWith('video/')) return <Video className="w-5 h-5 text-red-500" />;
  if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
  if (name.endsWith('.txt') || name.endsWith('.md')) return <FileText className="w-5 h-5 text-gray-600" />;
  if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.tsx'))
    return <Code className="w-5 h-5 text-yellow-600" />;
  if (name.endsWith('.sol')) return <Code className="w-5 h-5 text-purple-600" />;
  return <File className="w-5 h-5 text-gray-500" />;
};

const getFileType = (file: File): string => {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.includes('pdf')) return 'pdf';

  if (name.endsWith('.js') || name.endsWith('.jsx')) return 'javascript';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript';
  if (name.endsWith('.py')) return 'python';
  if (name.endsWith('.java')) return 'java';
  if (name.endsWith('.cpp') || name.endsWith('.cc') || name.endsWith('.cxx')) return 'cpp';
  if (name.endsWith('.c')) return 'c';
  if (name.endsWith('.go')) return 'go';
  if (name.endsWith('.rs')) return 'rust';
  if (name.endsWith('.sol')) return 'solidity';

  if (name.endsWith('.txt') || name.endsWith('.text')) return 'text';
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.csv')) return 'csv';

  return 'file';
};

// Auto-format date input with slashes (MM/DD/YYYY) and validate values
const formatDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  let month = digits.slice(0, 2);
  let day = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (month.length === 2 && parseInt(month) > 12) month = '12';
  if (day.length === 2 && parseInt(day) > 31) day = '31';
  if (digits.length <= 2) return month;
  if (digits.length <= 4) return `${month}/${day}`;
  return `${month}/${day}/${year}`;
};

// ================== INTERFACES ==================
interface TodayLogState {
  date: string;
  hours: number;
  timeSlot: 'morning' | 'evening' | 'night';
  activities: string;
  mood: number;
  learnings: string;
  media: File[];
}

interface DailyLogTabProps {
  dailyLogs: DailyLog[];
  onAddLog: (log: Omit<DailyLog, 'id'>) => void;
  bounties?: Bounty[];
  goals?: Goal[];
  notes?: Note[];
  snippets?: Snippet[];
}

// ================== MOOD EMOJI HELPER ==================
const getMoodEmoji = (mood: number) => {
  if (mood >= 8) return '😄';
  if (mood >= 6) return '😊';
  if (mood >= 4) return '😐';
  return '😔';
};

// ================== MEDIA MODAL COMPONENT ==================
interface MediaModalProps {
  file: File;
  previewUrl: string;
  onClose: () => void;
  onDownload: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  textContent?: string;
}

const MediaModal = ({
  file,
  previewUrl,
  onClose,
  onDownload,
  onPrevious,
  onNext,
  textContent
}: MediaModalProps) => {
  const [fontSize, setFontSize] = useState(14);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isText = file.type.startsWith('text/') ||
    file.name.match(/\.(txt|md|js|ts|jsx|tsx|py|java|cpp|c|go|rs|sol|json)$/i);

  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative neptune-glass-panel rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[var(--neptune-primary-dim)]"
        style={{
          width: '90vw',
          maxWidth: '1200px',
          height: '80vh',
          maxHeight: '700px'
        }}>

        {/* TOP BAR */}
        <div className="flex justify-between items-center p-4 bg-[rgba(0,0,0,0.6)] backdrop-blur-md border-b border-[var(--neptune-primary-dim)] flex-shrink-0">
          <div className="max-w-[80%]">
            <h3 className="font-display tracking-wider text-[var(--neptune-text-primary)] font-medium truncate text-base flex items-center gap-2">
              <span className="text-[var(--neptune-primary)]">///</span> {file.name}
            </h3>
            <p className="text-[var(--neptune-text-muted)] text-xs font-mono mt-1">
              DATA_SIZE: {formatFileSize(file.size)} • TYPE: {getFileType(file).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--neptune-text-secondary)] hover:text-white hover:bg-[var(--neptune-primary-dim)] rounded-full p-2 transition-all duration-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 min-h-0 overflow-auto p-4 flex items-start justify-center bg-[rgba(0,0,0,0.3)] neptune-scrollbar">
          {isImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={previewUrl || URL.createObjectURL(file)}
                alt="Large View"
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-[rgba(255,255,255,0.1)] shadow-2xl"
              />
            </div>
          ) : isVideo ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden border border-[var(--neptune-primary-dim)]">
                <video
                  controls
                  controlsList="nodownload"
                  className="w-full h-full"
                  src={URL.createObjectURL(file)}
                >
                  Browser does not support video tag.
                </video>
              </div>
              <div className="mt-4 text-center text-[var(--neptune-text-muted)] text-sm font-mono">
                <p>/// Click to play ///</p>
              </div>
            </div>
          ) : isText && textContent ? (
            <div className="w-full h-full flex flex-col rounded-lg overflow-hidden border border-[rgba(255,255,255,0.05)]">
              <div className="sticky top-0 bg-[rgba(0,0,0,0.8)] px-4 py-2 border-b border-[rgba(255,255,255,0.05)] z-50 flex justify-between items-center">
                <div className="font-mono text-xs text-[var(--neptune-text-secondary)]">SOURCE CODE VIEW</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(textContent);
                    toast.success('Copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-[var(--neptune-text-primary)] rounded text-xs transition-colors font-mono"
                >
                  COPY DATA
                </button>
              </div>

              <div className="flex-1 overflow-auto bg-[#0a0f16] neptune-scrollbar">
                <pre
                  className="text-[var(--neptune-text-secondary)] font-mono p-4 whitespace-pre-wrap break-all min-h-full leading-relaxed"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {textContent}
                </pre>
              </div>

              <div className="sticky bottom-0 bg-[rgba(0,0,0,0.8)] px-4 py-2 border-t border-[rgba(255,255,255,0.05)]">
                <div className="flex justify-between items-center text-[var(--neptune-text-muted)] text-xs font-mono">
                  <span>
                    CHARS: {textContent.length} • LINES: {textContent.split('\n').length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                      className="px-2 py-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontSize(prev => prev + 1)}
                      className="px-2 py-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-6 scale-150 opacity-50">
                {getFileIcon(file)}
              </div>
              <p className="text-[var(--neptune-text-primary)] text-xl mb-2 font-display tracking-widest">Preview not available</p>
              <p className="text-[var(--neptune-text-muted)] max-w-md mx-auto font-mono text-xs">
                This file type requires an external application: {getFileType(file).toUpperCase()}
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM BAR */}
        <div className="p-4 bg-[rgba(0,0,0,0.6)] backdrop-blur-md border-t border-[var(--neptune-primary-dim)] flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
          <div className="text-[var(--neptune-text-muted)] text-xs font-mono w-full sm:w-auto">
            <p className="truncate">
              <span className="text-[var(--neptune-secondary)]">TARGET:</span> {file.name}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-[var(--neptune-text-primary)] rounded hover:shadow-[0_0_15px_var(--neptune-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-xs font-bold tracking-wider flex-1 sm:flex-none"
            >
              <Save className="w-4 h-4" />
              DOWNLOAD
            </button>

            {(onPrevious || onNext) && (
              <div className="flex gap-1">
                {onPrevious && (
                  <button
                    onClick={onPrevious}
                    className="px-3 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] rounded transition-colors"
                    title="Previous Data"
                  >
                    ←
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
                    className="px-3 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] rounded transition-colors"
                    title="Next Data"
                  >
                    →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================== MEDIA FILE ICON HELPER (for saved media) ==================
const getMediaFileIcon = (type: string, name: string) => {
  const nameLower = name.toLowerCase();

  if (type === 'image') return <Image className="w-5 h-5 text-blue-500" />;
  if (type === 'video') return <Video className="w-5 h-5 text-red-500" />;
  if (type === 'pdf') return <FileText className="w-5 h-5 text-red-600" />;
  if (nameLower.endsWith('.txt') || nameLower.endsWith('.md')) return <FileText className="w-5 h-5 text-gray-600" />;
  if (nameLower.endsWith('.js') || nameLower.endsWith('.ts') || nameLower.endsWith('.jsx') || nameLower.endsWith('.tsx'))
    return <Code className="w-5 h-5 text-yellow-600" />;
  if (nameLower.endsWith('.sol')) return <Code className="w-5 h-5 text-purple-600" />;
  return <File className="w-5 h-5 text-gray-500" />;
};

// ================== ACTIVITY DETAIL MODAL ==================
interface ActivityDetailModalProps {
  log: DailyLog | null;
  isOpen: boolean;
  onClose: () => void;
  bounties?: Bounty[];
  goals?: Goal[];
  notes?: Note[];
  snippets?: Snippet[];
}

const ActivityDetailModal = ({ log, isOpen, onClose, bounties = [], goals = [], notes = [], snippets = [] }: ActivityDetailModalProps) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [textContent, setTextContent] = useState<string>('');
  const [fontSize, setFontSize] = useState(14);
  const [mediaUrls, setMediaUrls] = useState<{ [key: string]: string }>({});
  const [loadingMedia, setLoadingMedia] = useState<{ [key: string]: boolean }>({});

  // Context preview states
  const [previewItem, setPreviewItem] = useState<{
    type: 'bounty' | 'goal' | 'note' | 'snippet';
    data: Bounty | Goal | Note | Snippet;
  } | null>(null);

  // Preload thumbnails when modal opens
  useEffect(() => {
    if (isOpen && log?.media) {
      setSelectedMediaIndex(null);
      setShowMediaModal(false);

      // Preload all image and video media
      const preloadThumbnails = async () => {
        for (const media of log.media!) {
          if ((media.type === 'image' || media.type === 'video') && media.path) {
            setLoadingMedia(prev => ({ ...prev, [media.path]: true }));

            try {
              if (window.electronAPI?.readMedia) {
                const result = await window.electronAPI.readMedia(media.path);
                if (result.success && result.dataUrl) {
                  setMediaUrls(prev => ({ ...prev, [media.path]: result.dataUrl! }));
                }
              }
            } catch (error) {
              console.error('Thumbnail load failed:', error);
            } finally {
              setLoadingMedia(prev => ({ ...prev, [media.path]: false }));
            }
          }
        }
      };

      preloadThumbnails();
    } else if (!isOpen) {
      // Cleanup when modal closes
      setMediaUrls({});
      setLoadingMedia({});
    }
  }, [isOpen, log]);

  if (!log || !isOpen) return null;

  // Read media file via IPC
  const loadMediaUrl = async (filename: string): Promise<string> => {
    if (!filename) return '';

    // Return from cache if available
    if (mediaUrls[filename]) {
      return mediaUrls[filename];
    }

    // Wait if currently loading
    if (loadingMedia[filename]) {
      return '';
    }

    setLoadingMedia(prev => ({ ...prev, [filename]: true }));

    try {
      if (window.electronAPI?.readMedia) {
        const result = await window.electronAPI.readMedia(filename);
        if (result.success && result.dataUrl) {
          setMediaUrls(prev => ({ ...prev, [filename]: result.dataUrl! }));
          return result.dataUrl;
        }
      }
    } catch (error) {
      console.error('Media load failed:', error);
    } finally {
      setLoadingMedia(prev => ({ ...prev, [filename]: false }));
    }

    return '';
  };

  // Open media modal
  const openMediaModal = async (index: number) => {
    const media = log.media![index];

    // Read content if text file
    if (media.type === 'text' || media.type === 'markdown' || media.type === 'json' ||
      media.type === 'javascript' || media.type === 'typescript' || media.type === 'python' ||
      media.type === 'java' || media.type === 'cpp' || media.type === 'c' || media.type === 'go' ||
      media.type === 'rust' || media.type === 'solidity' ||
      media.name.match(/\.(txt|md|js|ts|jsx|tsx|py|java|cpp|c|go|rs|sol|json)$/i)) {

      try {
        if (window.electronAPI?.readMediaText) {
          const result = await window.electronAPI.readMediaText(media.path);
          if (result.success && result.content) {
            setTextContent(result.content);
          } else {
            setTextContent('Could not load file content.');
          }
        }
      } catch (error) {
        console.error('Could not read text file:', error);
        setTextContent('Could not load file content.');
      }
    } else {
      // Preload for image/video
      await loadMediaUrl(media.path);
    }

    setSelectedMediaIndex(index);
    setShowMediaModal(true);
  };

  // Close media modal
  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedMediaIndex(null);
    setTextContent('');
  };

  // Dosya indirme
  const handleDownload = async () => {
    if (selectedMediaIndex === null || !log.media) return;
    const media = log.media[selectedMediaIndex];

    const url = mediaUrls[media.path] || await loadMediaUrl(media.path);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = media.name;
      link.click();
      toast.success(`Downloading ${media.name}...`);
    } else {
      toast.error('Could not download file');
    }
  };

  return createPortal(
    <>
      {/*backdrop that covers entire viewport */}
      <div className="fixed inset-0 bg-black/90 z-[9998] backdrop-blur-sm" onClick={onClose} />

      {/* Centered modal container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="neptune-glass-panel rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--neptune-primary-dim)] shadow-[0_0_50px_rgba(0,0,0,0.5)] neptune-scrollbar pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-6 border-b border-[var(--neptune-primary-dim)] pb-4">
              <div>
                <h2 className="text-3xl font-display font-bold text-[var(--neptune-text-primary)] tracking-tight flex items-center gap-3">
                  <span className="text-[var(--neptune-primary)]">///</span> {log.date}
                </h2>
                <div className="flex items-center gap-3 mt-2 font-mono text-xs text-[var(--neptune-text-muted)]">
                  <span className="px-2 py-0.5 rounded bg-[var(--neptune-primary-dim)] text-[var(--neptune-primary)]">
                    {log.hours} HOURS
                  </span>
                  <span>•</span>
                  <span>
                    {log.timeSlot === 'morning' ? 'MORNING CYCLE' :
                      log.timeSlot === 'evening' ? 'EVENING CYCLE' : 'NIGHT CYCLE'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    MOOD: {log.mood}/10 <span className="text-base">{getMoodEmoji(log.mood)}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[var(--neptune-text-secondary)] hover:text-white p-2 rounded-lg hover:bg-[var(--neptune-primary-dim)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-[var(--neptune-secondary)] mb-3 flex items-center gap-2 uppercase tracking-widest">
                  <Zap className="w-4 h-4" />
                  Daily Activities
                </h3>
                <div className="text-[var(--neptune-text-primary)] bg-[rgba(0,0,0,0.3)] p-4 rounded-lg whitespace-pre-wrap border border-[rgba(255,255,255,0.05)] font-mono text-sm leading-relaxed">
                  {log.activities || 'NO ACTIVITY DATA LOGGED'}
                </div>
              </div>

              {log.learnings && (
                <div>
                  <h3 className="text-sm font-bold text-[var(--neptune-secondary)] mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <BookOpen className="w-4 h-4" />
                    Intel Acquired
                  </h3>
                  <div className="text-[var(--neptune-text-primary)] bg-[rgba(0,0,0,0.3)] p-4 rounded-lg whitespace-pre-wrap border border-[rgba(255,255,255,0.05)] font-mono text-sm leading-relaxed">
                    {log.learnings}
                  </div>
                </div>
              )}

              {log.media && log.media.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[var(--neptune-secondary)] mb-3 flex items-center gap-2 uppercase tracking-widest">
                    📎 Attachments ({log.media.length})
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {log.media.map((media, index) => {
                      const isImage = media.type === 'image';
                      const isVideo = media.type === 'video';
                      const cachedUrl = mediaUrls[media.path];
                      const isLoading = loadingMedia[media.path];

                      return (
                        <button
                          key={media.id}
                          onClick={() => openMediaModal(index)}
                          className="flex flex-col items-center w-20 hover:scale-105 transition-transform group"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--neptune-primary-dim)] flex items-center justify-center bg-[rgba(0,0,0,0.3)] relative group-hover:border-[var(--neptune-primary)] group-hover:shadow-[0_0_10px_var(--neptune-primary)] transition-all duration-300">
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--neptune-primary)]"></div>
                            ) : isImage && cachedUrl ? (
                              <img
                                src={cachedUrl}
                                alt={media.name}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              />
                            ) : isVideo && cachedUrl ? (
                              <>
                                <video
                                  src={cachedUrl}
                                  className="w-full h-full object-cover opacity-80"
                                  muted
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black/50 rounded-full p-1.5 border border-white/20">
                                    <Play className="w-3 h-3 text-white" fill="white" />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="p-1 opacity-70 group-hover:opacity-100">
                                {getMediaFileIcon(media.type, media.name)}
                              </div>
                            )}
                          </div>

                          <div className="mt-1 text-center w-full px-1">
                            <p className="text-[10px] font-medium text-[var(--neptune-text-muted)] truncate group-hover:text-[var(--neptune-text-primary)] transition-colors">
                              {truncateFileName(media.name, 10)}
                            </p>
                            <p className="text-[9px] text-[var(--neptune-text-secondary)] font-mono">
                              {formatFileSizeShort(media.size)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {log.timerData && (
                <div className="bg-[rgba(56,189,248,0.1)] p-4 rounded-lg border border-[rgba(56,189,248,0.2)]">
                  <h3 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <Clock className="w-4 h-4" />
                    Timer Data
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm font-mono text-[var(--neptune-text-primary)]">
                    <div>
                      <p className="text-sky-500/70 text-xs">START_TIME</p>
                      <p>{new Date(log.timerData.startTime).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-sky-500/70 text-xs">END_TIME</p>
                      <p>{new Date(log.timerData.endTime).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-sky-500/70 text-xs">DURATION</p>
                      <p>{Math.round(log.timerData.totalFocusTime / 3600 * 100) / 100} HRS</p>
                    </div>
                    <div>
                      <p className="text-sky-500/70 text-xs">INTERRUPTIONS</p>
                      <p>{log.timerData.breaksCount}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Context */}
              {log.context && (
                (log.context.bountyIds?.length > 0 || log.context.goalIds?.length > 0 ||
                  log.context.noteIds?.length > 0 || log.context.snippetIds?.length > 0) && (
                  <div className="bg-[rgba(168,85,247,0.1)] p-4 rounded-lg border border-[rgba(168,85,247,0.2)]">
                    <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                      <Link className="w-4 h-4" />
                      Linked Items
                    </h3>
                    <div className="space-y-3">
                      {log.context.bountyIds && log.context.bountyIds.length > 0 && (
                        <div>
                          <p className="text-purple-500/70 text-xs font-mono mb-1">Bounties:</p>
                          <div className="flex flex-wrap gap-2">
                            {log.context.bountyIds.map(id => {
                              const bounty = bounties.find(b => b.id === id);
                              return bounty ? (
                                <button
                                  key={id}
                                  onClick={() => setPreviewItem({ type: 'bounty', data: bounty })}
                                  className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded text-xs hover:bg-orange-500/20 transition-colors cursor-pointer font-mono"
                                >
                                  {bounty.platform} :: {bounty.contest}
                                </button>
                              ) : (
                                <span key={id} className="px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/30 rounded text-xs font-mono">
                                  UNKNOWN_TARGET #{id}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {log.context.goalIds && log.context.goalIds.length > 0 && (
                        <div>
                          <p className="text-purple-500/70 text-xs font-mono mb-1">LINKED_GOALS:</p>
                          <div className="flex flex-wrap gap-2">
                            {log.context.goalIds.map(id => {
                              const goal = goals.find(g => g.id === id);
                              return goal ? (
                                <button
                                  key={id}
                                  onClick={() => setPreviewItem({ type: 'goal', data: goal })}
                                  className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-500/20 transition-colors cursor-pointer font-mono"
                                >
                                  {goal.title}
                                </button>
                              ) : (
                                <span key={id} className="px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/30 rounded text-xs font-mono">
                                  UNKNOWN_OBJ #{id}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {log.context.noteIds && log.context.noteIds.length > 0 && (
                        <div>
                          <p className="text-purple-500/70 text-xs font-mono mb-1">Notes:</p>
                          <div className="flex flex-wrap gap-2">
                            {log.context.noteIds.map(id => {
                              const note = notes.find(n => n.id === id);
                              return note ? (
                                <button
                                  key={id}
                                  onClick={() => setPreviewItem({ type: 'note', data: note })}
                                  className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs hover:bg-emerald-500/20 transition-colors cursor-pointer font-mono"
                                >
                                  {note.title}
                                </button>
                              ) : (
                                <span key={id} className="px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/30 rounded text-xs font-mono">
                                  UNKNOWN_NOTE #{id}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {log.context.snippetIds && log.context.snippetIds.length > 0 && (
                        <div>
                          <p className="text-purple-500/70 text-xs font-mono mb-1">Snippets:</p>
                          <div className="flex flex-wrap gap-2">
                            {log.context.snippetIds.map(id => {
                              const snippet = snippets.find(s => s.id === id);
                              return snippet ? (
                                <button
                                  key={id}
                                  onClick={() => setPreviewItem({ type: 'snippet', data: snippet })}
                                  className="px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded text-xs hover:bg-yellow-500/20 transition-colors cursor-pointer font-mono"
                                >
                                  {snippet.title}
                                </button>
                              ) : (
                                <span key={id} className="px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/30 rounded text-xs font-mono">
                                  UNKNOWN_FRAG #{id}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Context Preview Modal */}
            {previewItem && (
              <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewItem(null)}>
                <div
                  className="neptune-glass-panel rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto border border-[var(--neptune-primary-dim)] shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-[var(--neptune-primary-dim)] flex justify-between items-center bg-[rgba(0,0,0,0.4)]">
                    <h4 className="text-lg font-bold text-[var(--neptune-text-primary)] flex items-center gap-2 font-display">
                      {previewItem.type === 'bounty' && '🏆 Bounty'}
                      {previewItem.type === 'goal' && '🎯 Goal'}
                      {previewItem.type === 'note' && '📝 Note'}
                      {previewItem.type === 'snippet' && '💻 Snippet'}
                    </h4>
                    <button
                      onClick={() => setPreviewItem(null)}
                      className="text-[var(--neptune-text-secondary)] hover:text-white p-1 rounded hover:bg-[var(--neptune-primary-dim)] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 space-y-3 bg-[rgba(0,0,0,0.3)]">
                    {/* Bounty Preview */}
                    {previewItem.type === 'bounty' && (() => {
                      const b = previewItem.data as Bounty;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded text-xs font-mono">{b.platform}</span>
                            <span className={`px-2 py-1 rounded text-xs font-mono ${b.status === 'won' ? 'bg-green-500/20 text-green-300' :
                              b.status === 'lost' ? 'bg-red-500/20 text-red-300' :
                                b.status === 'submitted' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-gray-500/20 text-gray-300'
                              }`}>{b.status.toUpperCase()}</span>
                          </div>
                          <h5 className="text-xl font-bold text-[var(--neptune-text-primary)] font-display">{b.contest}</h5>
                          {b.reward > 0 && <p className="text-2xl font-bold text-green-400 neptune-text-glow font-mono">${b.reward}</p>}
                          {b.url && <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-[var(--neptune-primary)] hover:underline text-sm font-mono flex items-center gap-1">🔗 View Link</a>}
                          {b.findings && b.findings.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[var(--neptune-text-secondary)] text-sm">{b.findings.length} findings logged</p>
                            </div>
                          )}
                          {b.notes && <p className="text-[var(--neptune-text-primary)] text-sm mt-2 bg-[rgba(255,255,255,0.05)] p-3 rounded border border-[rgba(255,255,255,0.05)]">{b.notes}</p>}
                        </>
                      );
                    })()}
                    {/* Goal Preview */}
                    {previewItem.type === 'goal' && (() => {
                      const g = previewItem.data as Goal;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-mono ${g.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              g.status === 'paused' ? 'bg-orange-500/20 text-orange-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>{g.status.toUpperCase()}</span>
                            {g.priority && <span className={`px-2 py-1 rounded text-xs font-mono ${g.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                              g.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>{g.priority.toUpperCase()}</span>}
                          </div>
                          <h5 className="text-xl font-bold text-[var(--neptune-text-primary)] font-display">{g.title}</h5>
                          {g.description && <p className="text-[var(--neptune-text-secondary)] text-sm">{g.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                              <div className="bg-[var(--neptune-primary)] h-2 rounded-full shadow-[0_0_10px_var(--neptune-primary)]" style={{ width: `${g.progress}%` }} />
                            </div>
                            <span className="text-[var(--neptune-primary)] text-sm font-medium font-mono">{g.progress}%</span>
                          </div>
                          {g.deadline && <p className="text-[var(--neptune-text-muted)] text-xs mt-2 font-mono">Deadline: {new Date(g.deadline).toLocaleDateString('en-US')}</p>}
                          {g.milestones && g.milestones.length > 0 && (
                            <div className="mt-2 text-sm">
                              <p className="text-[var(--neptune-text-secondary)]">{g.milestones.filter(m => m.completed).length}/{g.milestones.length} milestones complete</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {/* Note Preview */}
                    {previewItem.type === 'note' && (() => {
                      const n = previewItem.data as Note;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            {n.category && <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-mono">{n.category}</span>}
                            {n.isPinned && <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-mono">📌 PINNED</span>}
                          </div>
                          <h5 className="text-xl font-bold text-[var(--neptune-text-primary)] font-display">{n.title}</h5>
                          <div className="bg-[rgba(255,255,255,0.05)] p-3 rounded-lg max-h-60 overflow-y-auto border border-[rgba(255,255,255,0.05)]">
                            <p className="text-[var(--neptune-text-secondary)] text-sm whitespace-pre-wrap">{n.content || 'NO DATA'}</p>
                          </div>
                          {n.tags && n.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {n.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-muted)] rounded text-xs font-mono">#{tag}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-[var(--neptune-text-muted)] text-xs mt-2 font-mono">Updated: {new Date(n.updatedAt).toLocaleString('en-US')}</p>
                        </>
                      );
                    })()}
                    {/* Snippet Preview */}
                    {previewItem.type === 'snippet' && (() => {
                      const s = previewItem.data as Snippet;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-mono">{s.language}</span>
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-mono">{s.category}</span>
                            {s.isFavorite && <span className="text-yellow-400">⭐</span>}
                          </div>
                          <h5 className="text-xl font-bold text-[var(--neptune-text-primary)] font-display">{s.title}</h5>
                          <div className="bg-[#0a0f16] p-3 rounded-lg overflow-x-auto max-h-60 overflow-y-auto border border-[rgba(255,255,255,0.1)] neptune-scrollbar">
                            <pre className="text-green-400 text-xs font-mono whitespace-pre">{s.code}</pre>
                          </div>
                          {s.notes && <p className="text-[var(--neptune-text-muted)] text-sm mt-2 italic border-l-2 border-[var(--neptune-primary-dim)] pl-2">{s.notes}</p>}
                          {s.tags && s.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {s.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-muted)] rounded text-xs font-mono">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="p-4 border-t border-[var(--neptune-primary-dim)] bg-[rgba(0,0,0,0.4)]">
                    <button
                      onClick={() => setPreviewItem(null)}
                      className="w-full py-2 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-[var(--neptune-text-primary)] rounded-lg transition-colors font-bold tracking-wider"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-[var(--neptune-primary-dim)]">
              <Button onClick={onClose} className="w-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-secondary)]">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MEDIA DETAIL MODAL */}
      {showMediaModal && selectedMediaIndex !== null && log.media && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/80">
          <div className="relative neptune-glass-panel rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[var(--neptune-primary-dim)]"
            style={{
              width: '90vw',
              maxWidth: '1200px',
              height: '80vh',
              maxHeight: '700px'
            }}>

            {/* TOP BAR */}
            <div className="flex justify-between items-center p-3 sm:p-4 bg-[rgba(0,0,0,0.6)] backdrop-blur-md border-b border-[var(--neptune-primary-dim)] flex-shrink-0">
              <div className="max-w-[70%] sm:max-w-[80%]">
                <h3 className="font-display tracking-wider text-[var(--neptune-text-primary)] font-medium truncate text-sm sm:text-base flex items-center gap-2">
                  <span className="text-[var(--neptune-primary)]">///</span> {log.media[selectedMediaIndex].name}
                </h3>
                <p className="text-[var(--neptune-text-muted)] text-xs sm:text-sm font-mono mt-0.5">
                  DATA_SIZE: {formatFileSize(log.media[selectedMediaIndex].size)} • TYPE: {log.media[selectedMediaIndex].type.toUpperCase()}
                </p>
              </div>
              <button
                onClick={closeMediaModal}
                className="text-[var(--neptune-text-secondary)] hover:text-white hover:bg-[var(--neptune-primary-dim)] rounded-full p-2 transition-all"
                aria-label="Kapat"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center bg-[rgba(0,0,0,0.3)] neptune-scrollbar">
              {(() => {
                const media = log.media![selectedMediaIndex];
                const cachedUrl = mediaUrls[media.path];

                // 1. IMAGE
                if (media.type === 'image') {
                  return (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {cachedUrl ? (
                        <img
                          src={cachedUrl}
                          alt={media.name}
                          className="max-w-full max-h-[60vh] object-contain rounded-lg border border-[rgba(255,255,255,0.1)] shadow-2xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            toast.error('IMAGE_LOAD_FAILURE');
                          }}
                        />
                      ) : (
                        <div className="text-[var(--neptune-text-muted)] font-mono animate-pulse">LOADING_DATA_STREAM...</div>
                      )}
                    </div>
                  );
                }

                // 2. VIDEO
                if (media.type === 'video') {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      {cachedUrl ? (
                        <>
                          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden border border-[var(--neptune-primary-dim)]">
                            <video
                              controls
                              controlsList="nodownload"
                              className="w-full h-full"
                              src={cachedUrl}
                              onError={() => toast.error('VIDEO_STREAM_FAILURE')}
                            >
                              Browser does not support video tag.
                            </video>
                          </div>
                          <div className="mt-4 text-center text-[var(--neptune-text-secondary)] text-sm font-mono">
                            <p>/// SECURE PLAYBACK PROTOCOL ///</p>
                          </div>
                        </>
                      ) : (
                        <div className="text-[var(--neptune-text-muted)] font-mono animate-pulse">BUFFERING_VIDEO_STREAM...</div>
                      )}
                    </div>
                  );
                }

                // 3. TEXT FILES
                if (media.type === 'text' || media.type === 'markdown' || media.type === 'json' ||
                  media.type === 'javascript' || media.type === 'typescript' || media.type === 'python' ||
                  media.type === 'java' || media.type === 'cpp' || media.type === 'c' || media.type === 'go' ||
                  media.type === 'rust' || media.type === 'solidity' ||
                  media.name.match(/\.(txt|md|js|ts|jsx|tsx|py|java|cpp|c|go|rs|sol|json)$/i)) {
                  return (
                    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden border border-[rgba(255,255,255,0.05)]">
                      <div className="sticky top-0 bg-[rgba(0,0,0,0.8)] px-4 py-3 border-b border-[rgba(255,255,255,0.05)] z-50 flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-mono text-[var(--neptune-text-primary)] font-medium truncate text-sm">
                            {media.name}
                          </h3>
                          <p className="text-[var(--neptune-text-secondary)] text-xs font-mono">
                            {formatFileSize(media.size)} • {media.type.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(textContent);
                              toast.success('DATA_COPIED');
                            }}
                            className="px-3 py-1.5 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-[var(--neptune-text-primary)] rounded text-xs transition-colors font-mono"
                          >
                            COPY
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto bg-[#0a0f16] neptune-scrollbar">
                        <pre
                          className="text-[var(--neptune-text-secondary)] font-mono p-4 whitespace-pre-wrap break-all min-h-full leading-relaxed"
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {textContent || 'LOADING_TEXT_STREAM...'}
                        </pre>
                      </div>

                      <div className="sticky bottom-0 bg-[rgba(0,0,0,0.8)] px-4 py-2 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="flex justify-between items-center text-[var(--neptune-text-muted)] text-xs font-mono">
                          <span>
                            CHARS: {textContent.length} • LINES: {textContent.split('\n').length}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                              className="px-2 py-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded"
                            >
                              A-
                            </button>
                            <button
                              onClick={() => setFontSize(prev => prev + 1)}
                              className="px-2 py-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded"
                            >
                              A+
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 4. OTHER FILES
                return (
                  <div className="text-center py-8">
                    <div className="mb-6 scale-150 opacity-50">
                      {getMediaFileIcon(media.type, media.name)}
                    </div>
                    <p className="text-[var(--neptune-text-primary)] text-xl mb-2 font-display tracking-widest">Preview not available</p>
                    <p className="text-[var(--neptune-text-muted)] max-w-md mx-auto font-mono text-xs">
                      Download required for: {media.name}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* BOTTOM BAR */}
            <div className="p-4 bg-[rgba(0,0,0,0.6)] backdrop-blur-md border-t border-[var(--neptune-primary-dim)] flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
              <div className="text-[var(--neptune-text-muted)] text-xs font-mono w-full sm:w-auto">
                <p className="truncate">
                  <span className="text-[var(--neptune-secondary)]">File:</span> {log.media![selectedMediaIndex].name}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-[var(--neptune-text-primary)] rounded hover:shadow-[0_0_15px_var(--neptune-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-xs font-bold tracking-wider flex-1 sm:flex-none"
                >
                  <Save className="w-4 h-4" />
                  DOWNLOAD
                </button>

                {log.media!.length > 1 && (
                  <div className="flex gap-1">
                    {selectedMediaIndex > 0 && (
                      <button
                        onClick={() => openMediaModal(selectedMediaIndex - 1)}
                        className="px-3 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] rounded transition-colors"
                        title="Previous"
                      >
                        ←
                      </button>
                    )}
                    {selectedMediaIndex < log.media!.length - 1 && (
                      <button
                        onClick={() => openMediaModal(selectedMediaIndex + 1)}
                        className="px-3 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] rounded transition-colors"
                        title="Next"
                      >
                        →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
// ================== CONTEXT ITEM CARD COMPONENT ==================
interface ContextItemCardProps {
  type: 'bounty' | 'goal' | 'note' | 'snippet';
  data: any;
  isSelected: boolean;
  onToggle: () => void;
}

const ContextItemCard = ({ type, data, isSelected, onToggle }: ContextItemCardProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringCardRef = useRef(false);
  const isHoveringPreviewRef = useRef(false);

  const updatePreviewPosition = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPreviewPos({
        top: rect.top,
        left: rect.right + 10
      });
    }
  };

  const tryHidePreview = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringCardRef.current && !isHoveringPreviewRef.current) {
        setShowPreview(false);
      }
    }, 100);
  };

  const handleCardMouseEnter = () => {
    isHoveringCardRef.current = true;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    updatePreviewPosition();
    setShowPreview(true);
  };

  const handleCardMouseLeave = () => {
    isHoveringCardRef.current = false;
    tryHidePreview();
  };

  const handlePreviewMouseEnter = () => {
    isHoveringPreviewRef.current = true;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handlePreviewMouseLeave = () => {
    isHoveringPreviewRef.current = false;
    tryHidePreview();
  };

  useEffect(() => {
    if (showPreview) {
      updatePreviewPosition();
      window.addEventListener('scroll', updatePreviewPosition, true);
      window.addEventListener('resize', updatePreviewPosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePreviewPosition, true);
      window.removeEventListener('resize', updatePreviewPosition);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [showPreview]);

  const getIcon = () => {
    switch (type) {
      case 'bounty': return <Zap className="w-3 h-3 text-yellow-500" />;
      case 'goal': return <Activity className="w-3 h-3 text-blue-500" />;
      case 'note': return <FileText className="w-3 h-3 text-green-500" />;
      case 'snippet': return <Code className="w-3 h-3 text-purple-500" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'bounty': return `${data.platform} - ${data.contest}`;
      case 'goal': return data.title;
      case 'note': return data.title;
      case 'snippet': return `${data.title} (${data.language})`;
    }
  };

  const getSubtext = () => {
    switch (type) {
      case 'bounty': return `Reward: $${data.reward} • Priority: ${data.priority || 'Normal'}`;
      case 'goal': return `Deadline: ${data.deadline ? new Date(data.deadline).toLocaleDateString() : 'None'} • Progress: ${data.progress}%`;
      case 'note': return `Tags: ${data.tags?.join(', ') || 'None'}`;
      case 'snippet': return `Language: ${data.language}`;
    }
  };

  const getPreviewContent = () => {
    switch (type) {
      case 'bounty':
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] text-[var(--neptune-text-muted)] border-b border-[rgba(255,255,255,0.05)] pb-1">
              <span>STATUS: {data.status}</span>
              <span>ID: {data.id}</span>
            </div>
            <p className="text-xs text-[var(--neptune-text-primary)]">{data.notes || 'No description provided.'}</p>
          </div>
        )
      case 'goal':
        return (
          <div className="space-y-2">
            <div className="h-1 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--neptune-primary)]" style={{ width: `${data.progress}%` }} />
            </div>
            <p className="text-xs text-[var(--neptune-text-primary)]">{data.description || 'No description provided.'}</p>
          </div>
        );
      case 'note':
        return (
          <div className="max-h-32 overflow-y-auto neptune-scrollbar">
            <div className="text-[10px] text-[var(--neptune-text-muted)] mb-2 uppercase">Preview Content:</div>
            <p className="text-xs font-mono text-[var(--neptune-text-secondary)] whitespace-pre-wrap">{data.content?.substring(0, 300)}...</p>
          </div>
        );
      case 'snippet':
        return (
          <div className="max-h-32 overflow-y-auto neptune-scrollbar bg-[rgba(0,0,0,0.3)] p-2 rounded border border-[rgba(255,255,255,0.05)]">
            <pre className="text-[10px] font-mono text-[var(--neptune-text-secondary)] whitespace-pre-wrap">{data.code?.substring(0, 300)}...</pre>
          </div>
        );
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`relative group border rounded-lg transition-all duration-300 ${isSelected
          ? 'bg-[rgba(var(--neptune-primary-rgb),0.1)] border-[var(--neptune-primary)] shadow-[0_0_10px_rgba(var(--neptune-primary-rgb),0.1)]'
          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)]'
          }`}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
      >
        <div className="p-2 flex items-center gap-3 cursor-pointer" onClick={onToggle}>
          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected
            ? 'bg-[var(--neptune-primary)] border-[var(--neptune-primary)] text-black'
            : 'border-[var(--neptune-text-muted)] bg-transparent'
            }`}>
            {isSelected && <Zap className="w-3 h-3 fill-current" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {getIcon()}
              <span className={`text-xs font-bold font-mono truncate ${isSelected ? 'text-[var(--neptune-primary)]' : 'text-[var(--neptune-text-primary)]'}`}>
                {getTitle()}
              </span>
            </div>
            <div className="text-[9px] text-[var(--neptune-text-muted)] font-mono truncate uppercase">
              {getSubtext()}
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
            <Eye className="w-3 h-3 text-[var(--neptune-text-muted)]" />
          </div>
        </div>
      </div>

      {/* PORTAL FOR HOVER PREVIEW - Escapes modal clipping */}
      {showPreview && createPortal(
        <div
          className="fixed w-64 bg-[#0a0f16] border border-[var(--neptune-primary-dim)] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] z-[10001] overflow-hidden p-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: previewPos.top,
            left: previewPos.left
          }}
          onMouseEnter={handlePreviewMouseEnter}
          onMouseLeave={handlePreviewMouseLeave}
        >
          <div className="flex items-center gap-2 border-b border-[var(--neptune-primary-dim)] pb-2 mb-2">
            {getIcon()}
            <span className="text-xs font-bold text-[var(--neptune-text-primary)] font-display truncate">{getTitle()}</span>
          </div>
          {getPreviewContent()}
        </div>,
        document.body
      )}
    </>
  );
};
export const DailyLogTab = ({ dailyLogs: initialLogs, onAddLog, bounties = [], goals = [], notes = [], snippets = [] }: DailyLogTabProps) => {
  // States
  const [todayLog, setTodayLog] = useState<TodayLogState>({
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    timeSlot: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'evening' : 'night',
    activities: '',
    mood: 5,
    learnings: '',
    media: []
  });

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(initialLogs);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [logToDelete, setLogToDelete] = useState<number | null>(null); // For custom delete modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Media modal states
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [textContent, setTextContent] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [rightColumnHeight, setRightColumnHeight] = useState<number | null>(null);

  // Height matching for left and right columns
  useEffect(() => {
    const updateHeight = () => {
      if (leftColumnRef.current) {
        setRightColumnHeight(leftColumnRef.current.offsetHeight);
      }
    };

    updateHeight();

    // ResizeObserver for dynamic updates
    const resizeObserver = new ResizeObserver(updateHeight);
    if (leftColumnRef.current) {
      resizeObserver.observe(leftColumnRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Context Picker State
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [selectedContext, setSelectedContext] = useState<{
    bountyIds: number[];
    goalIds: number[];
    noteIds: number[];
    snippetIds: number[];
  }>({
    bountyIds: [],
    goalIds: [],
    noteIds: [],
    snippetIds: [],
  });

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTweetModal, setShowTweetModal] = useState(false);
  const [tweetLog, setTweetLog] = useState<DailyLog | null>(null);
  const [showAIReportModal, setShowAIReportModal] = useState(false);
  const [aiReportLog, setAIReportLog] = useState<DailyLog | null>(null);
  const { profile, updateFromAI } = useUserProfile();

  // API Key state - loaded from settings.json
  const [apiKey, setApiKey] = useState('');

  // Load API key from settings.json
  useEffect(() => {
    const loadApiKey = async () => {
      if (window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile('settings.json');
        if (result.success && result.data?.apiKey) {
          setApiKey(result.data.apiKey);
        }
      }
    };
    loadApiKey();
  }, []);

  // Load logs from BasicLogs.json
  useEffect(() => {
    loadLogsFromFile();
  }, []);

  // Listen for navigation events (from notifications)
  useEffect(() => {
    const handleNavigation = (e: Event) => {
      const event = e as CustomEvent<{ type: string; data?: { logId?: number; logDate?: string } }>;
      const { logId, logDate } = event.detail.data || {};

      // Find the target log
      let targetLog: DailyLog | null = null;
      if (logId) {
        targetLog = dailyLogs.find(log => log.id === logId) || null;
      } else if (logDate) {
        targetLog = dailyLogs.find(log => log.date === logDate) || null;
      } else {
        // Use latest log if no ID provided
        targetLog = dailyLogs.length > 0 ? dailyLogs[dailyLogs.length - 1] : null;
      }

      if (event.detail.type === 'openLogDetail') {
        if (targetLog) {
          setSelectedLog(targetLog);
          setIsModalOpen(true);
        }
      } else if (event.detail.type === 'openAIReport') {
        if (targetLog && targetLog.aiReview) {
          setAIReportLog(targetLog);
          setShowAIReportModal(true);
        } else {
          // Fallback to log detail if no AI analysis
          if (targetLog) {
            setSelectedLog(targetLog);
            setIsModalOpen(true);
          }
        }
      }
    };

    window.addEventListener('neptune-navigation', handleNavigation);
    return () => window.removeEventListener('neptune-navigation', handleNavigation);
  }, [dailyLogs]);

  const loadLogsFromFile = async () => {
    if (!window.electronAPI?.readFile) {
      console.warn('ElectronAPI not available');
      return;
    }

    try {
      const result = await window.electronAPI.readFile('BasicLogs.json');
      if (result.success && result.data && result.data.dailyLogs) {
        setDailyLogs(result.data.dailyLogs);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  // Auto-trigger AI analysis for logs without aiAnalysisStatus
  // This catches logs saved from DailyLogModal (timer sessions)
  useEffect(() => {
    const checkForUnanalyzedLogs = async () => {
      if (!apiKey || !profile || isAnalyzing) return;

      // Find the most recent log without AI analysis
      const unanalyzedLog = dailyLogs.find(log =>
        !log.aiAnalysisStatus &&
        !log.aiReport &&
        log.activities &&
        log.activities.length > 10 // Only analyze logs with meaningful content
      );

      if (unanalyzedLog) {
        triggerAIAnalysis(unanalyzedLog, dailyLogs);
      }
    };

    // Small delay to avoid race conditions
    const timeoutId = setTimeout(checkForUnanalyzedLogs, 1000);
    return () => clearTimeout(timeoutId);
  }, [dailyLogs, apiKey, profile, isAnalyzing]);

  // Log delete function
  const deleteLog = async (logId: number) => {
    if (!window.electronAPI?.readFile || !window.electronAPI?.saveFile) {
      toast.error('Electron API not available');
      return;
    }

    try {
      // Read BasicLogs.json
      const result = await window.electronAPI.readFile('BasicLogs.json');
      if (!result.success || !result.data) {
        toast.error('Could not read log file');
        return;
      }

      // Find and delete log
      const existingLogs = result.data.dailyLogs || [];
      const logToDelete = existingLogs.find((log: DailyLog) => log.id === logId);

      if (!logToDelete) {
        toast.error('Log not found');
        return;
      }

      // New log list (excluding deleted)
      const updatedLogs = existingLogs.filter((log: DailyLog) => log.id !== logId);

      // Save to file
      const saveResult = await window.electronAPI.saveFile('BasicLogs.json', { dailyLogs: updatedLogs });

      if (saveResult.success) {
        // Update state
        setDailyLogs(updatedLogs);

        // Close modal if open
        if (selectedLog?.id === logId) {
          setIsModalOpen(false);
          setSelectedLog(null);
        }

        toast.success('Log deleted');
      } else {
        toast.error('Error deleting log');
      }
    } catch (error) {
      console.error('Log delete error:', error);
      toast.error('Error deleting log');
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const newPreviewUrls: { [key: string]: string } = { ...previewUrls };

    for (const file of files) {
      try {
        const previewUrl = await createPreviewForFile(file);
        newPreviewUrls[file.name] = previewUrl;
      } catch (error) {
        console.error(`Failed to create preview for ${file.name}:`, error);
        newPreviewUrls[file.name] = '';
      }
    }

    setPreviewUrls(newPreviewUrls);
    setTodayLog(prev => ({
      ...prev,
      media: [...prev.media, ...files]
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const file = todayLog.media[index];

    if (previewUrls[file.name]) {
      const url = previewUrls[file.name];
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        URL.revokeObjectURL(url);
      }
      const newPreviewUrls = { ...previewUrls };
      delete newPreviewUrls[file.name];
      setPreviewUrls(newPreviewUrls);
    }

    setTodayLog(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const openMediaModal = async (index: number) => {
    const file = todayLog.media[index];

    if (file.type.startsWith('text/') ||
      file.name.match(/\.(txt|md|js|ts|jsx|tsx|py|java|cpp|c|go|rs|sol|json)$/i)) {
      const reader = new FileReader();
      reader.onload = () => {
        setTextContent(reader.result as string);
        setSelectedMediaIndex(index);
        setShowMediaModal(true);
      };
      reader.readAsText(file);
    } else {
      setSelectedMediaIndex(index);
      setShowMediaModal(true);
    }
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedMediaIndex(null);
    setTextContent('');
  };

  // AI Analysis - Background function
  const triggerAIAnalysis = useCallback(async (savedLog: DailyLog, allLogs: DailyLog[]) => {
    if (!apiKey || !profile) {
      // Notify user about missing API key (delayed to appear after "Log saved" toast)
      if (!apiKey) {
        setTimeout(() => {
          toast.warning('🔑 AI Analysis requires an API key. Please add your Groq API key in Settings.', {
            duration: 5000,
          });
        }, 1000);
      }
      return;
    }

    setIsAnalyzing(true);
    toast.info('🧠 Starting AI analysis...', { duration: 2000 });

    try {
      // Find linked content
      const linkedBounties = savedLog.context?.bountyIds
        ? bounties.filter(b => savedLog.context!.bountyIds.includes(b.id))
        : [];
      const linkedGoals = savedLog.context?.goalIds
        ? goals.filter(g => savedLog.context!.goalIds.includes(g.id))
        : [];
      const linkedNotes = savedLog.context?.noteIds
        ? notes.filter(n => savedLog.context!.noteIds.includes(n.id))
        : [];
      const linkedSnippets = savedLog.context?.snippetIds
        ? snippets.filter(s => savedLog.context!.snippetIds.includes(s.id))
        : [];

      // Active goals
      const allActiveGoals = goals.filter(g => g.status === 'active');

      // Wallet status
      const walletStatus = {
        balance: 0,
        totalEarnings: 0
      };

      // Last 7 days summary
      const last7DaysSummary = getLast7DaysSummary(allLogs);

      // Read text content from media files
      const mediaContents: { name: string; content: string }[] = [];

      for (const media of savedLog.media) {
        if (isTextBasedFile(media.name) && media.path) {
          const content = await readMediaTextContent(media.path);
          if (content) {
            mediaContents.push({ name: media.name, content });
          }
        }
      }

      // Run AI Analysis
      const result = await analyzeLog({
        log: savedLog,
        linkedBounties,
        linkedGoals,
        linkedNotes,
        linkedSnippets,
        allActiveGoals,
        walletStatus,
        last7DaysSummary,
        userProfile: profile,
        mediaContents
      }, apiKey, () => { });

      // Add results to log
      const updatedLog: DailyLog = {
        ...savedLog,
        aiReport: result.aiReport,
        aiReview: result.aiReview,
        aiAnalysisStatus: 'completed',
        aiAnalyzedAt: new Date().toISOString()
      };

      // Update BasicLogs.json
      if (window.electronAPI?.readFile && window.electronAPI?.saveFile) {
        const readResult = await window.electronAPI.readFile('BasicLogs.json');

        if (readResult.success && readResult.data) {
          const data = readResult.data;
          const logIndex = data.dailyLogs.findIndex((l: DailyLog) => l.id === savedLog.id);

          if (logIndex !== -1) {
            data.dailyLogs[logIndex] = updatedLog;
            await window.electronAPI.saveFile('BasicLogs.json', data);
            setDailyLogs(data.dailyLogs);
          }
        }
      }

      // Update UserProfile with AI suggestions
      if (result.userProfileUpdates) {
        await updateFromAI(result.userProfileUpdates);
      }

      // Add to notification center
      const { addNotification } = await import('../stores/NotificationStore');
      addNotification(
        'info',
        'AI Analysis Complete',
        'Daily log analyzed with insights added',
        { tab: 'daily' }
      );

    } catch (error) {
      console.error('AI Analysis error:', error);
      toast.error('AI analysis failed', { duration: 3000 });

      // Save failure status to log
      if (window.electronAPI?.readFile && window.electronAPI?.saveFile) {
        const readResult = await window.electronAPI.readFile('BasicLogs.json');
        if (readResult.success && readResult.data) {
          const data = readResult.data;
          const logIndex = data.dailyLogs.findIndex((l: DailyLog) => l.id === savedLog.id);
          if (logIndex !== -1) {
            data.dailyLogs[logIndex] = {
              ...savedLog,
              aiAnalysisStatus: 'failed',
              aiAnalyzedAt: new Date().toISOString()
            };
            await window.electronAPI.saveFile('BasicLogs.json', data);
            setDailyLogs(data.dailyLogs);
          }
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [profile, bounties, goals, notes, snippets, updateFromAI, apiKey]);

  // Select log for tweet sharing
  const openTweetModal = useCallback((log: DailyLog) => {
    // Show notification if no API key (modal will still open and show error state)
    if (!apiKey) {
      toast.warning('🔑 Tweet generation requires an API key. Please add your Groq API key in Settings.', {
        duration: 5000,
      });
    }
    setTweetLog(log);
    setShowTweetModal(true);
  }, [apiKey]);

  const closeTweetModal = useCallback(() => {
    setShowTweetModal(false);
    setTweetLog(null);
  }, []);

  // AI Report Modal functions
  const openAIReportModal = useCallback((log: DailyLog) => {
    setAIReportLog(log);
    setShowAIReportModal(true);
  }, []);

  const closeAIReportModal = useCallback(() => {
    setShowAIReportModal(false);
    setAIReportLog(null);
  }, []);

  const handleSubmit = async () => {
    // Validation
    if (todayLog.hours <= 0) {
      toast.error('Please enter work hours (must be greater than 0)');
      return;
    }

    if (!todayLog.activities.trim()) {
      toast.error('Please fill in activities');
      return;
    }

    if (!todayLog.learnings.trim()) {
      toast.error('Please fill in learnings');
      return;
    }

    setIsSaving(true);

    try {
      // Create JSON data
      const logId = Date.now();
      const logData = {
        id: logId,
        date: todayLog.date,
        hours: todayLog.hours,
        timeSlot: todayLog.timeSlot,
        activities: todayLog.activities,
        mood: todayLog.mood,
        learnings: todayLog.learnings,
        media: todayLog.media.map(file => ({
          id: Date.now() + Math.random(),
          type: getFileType(file),
          name: file.name,
          size: file.size,
          path: '',
          createdAt: new Date().toISOString()
        })),
        timerData: null,
        // Context - linked items
        context: selectedContext.bountyIds.length > 0 || selectedContext.goalIds.length > 0 ||
          selectedContext.noteIds.length > 0 || selectedContext.snippetIds.length > 0
          ? selectedContext : undefined
      };

      // Read or create BasicLogs.json file
      let existingData = { dailyLogs: [] as any[] };

      if (window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile('BasicLogs.json');
        if (result.success && result.data) {
          existingData = result.data;
        } else if (!result.success) {
          existingData = { dailyLogs: [] };
        }
      }

      // Save media files
      const savedMediaPaths = [];
      if (todayLog.media.length > 0 && window.electronAPI?.saveMedia) {
        for (const [index, file] of todayLog.media.entries()) {
          try {
            const cleanFilename = sanitizeFilename(file.name);
            const mediaFilename = `media_${logId}_${index}_${Date.now()}_${cleanFilename}`;

            const arrayBuffer = await fileToArrayBuffer(file);

            const saveResult = await window.electronAPI.saveMedia(mediaFilename, arrayBuffer);

            if (saveResult && saveResult.success) {
              savedMediaPaths.push({
                index,
                path: mediaFilename
              });
            } else {
              console.error('Media could not be saved:', saveResult?.error);
              toast.error(`${file.name} could not be saved!`);
            }
          } catch (mediaError) {
            console.error('Media save error:', mediaError);
            toast.error(`Error saving ${file.name}!`);
          }
        }

        // Add media paths to log
        savedMediaPaths.forEach(({ index, path }) => {
          logData.media[index].path = path;
        });
      }

      // Add new log
      existingData.dailyLogs.push(logData);

      // Save to BasicLogs.json
      if (window.electronAPI?.saveFile) {
        const saveResult = await window.electronAPI.saveFile('BasicLogs.json', existingData);
        if (saveResult && saveResult.success) {
          toast.success('✅ Log entry saved!');
          setDailyLogs(existingData.dailyLogs);

          // Reset form
          setTodayLog({
            date: new Date().toISOString().split('T')[0],
            hours: 0,
            timeSlot: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'evening' : 'night',
            activities: '',
            mood: 5,
            learnings: '',
            media: []
          });

          // Clear preview URLs
          Object.values(previewUrls).forEach(url => {
            if (url.startsWith('blob:') || url.startsWith('data:')) {
              URL.revokeObjectURL(url);
            }
          });
          setPreviewUrls({});

          // AI Analysis - Runs in background (non-blocking)
          triggerAIAnalysis(logData as DailyLog, existingData.dailyLogs);

        } else {
          toast.error('Error saving log entry!');
        }
      } else {
        // If ElectronAPI not available, call prop function
        onAddLog(logData);
        toast.success('✅ Log entry saved! (local)');
      }

    } catch (error) {
      console.error('Log save error:', error);
      toast.error('Error saving log entry!');
    } finally {
      setIsSaving(false);
    }
  };

  const openLogDetail = (log: DailyLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const showDataPath = async () => {
    if (window.electronAPI?.getDataPath) {
      const path = await window.electronAPI.getDataPath();
      toast.info(`Data stored at: ${path}`);
    }
  };

  const openDataFolder = async () => {
    if (window.electronAPI?.openDataFolder) {
      await window.electronAPI.openDataFolder();
    }
  };

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url.startsWith('blob:') || url.startsWith('data:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  return (
    <div className="grid lg:grid-cols-2 gap-6 p-1 items-start">
      {/* Left Column - Manual Entry Form */}
      <motion.div
        ref={leftColumnRef}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="neptune-glass-panel rounded-xl p-6 border border-[var(--neptune-primary-dim)] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-2 opacity-20">
          <BookOpen className="w-24 h-24 text-[var(--neptune-primary)]" />
        </div>

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-display font-bold text-[var(--neptune-text-primary)] flex items-center gap-2 uppercase tracking-wider">
              <span className="text-[var(--neptune-primary)]">///</span> Daily Log
            </h2>
            <p className="text-[var(--neptune-text-muted)] text-xs font-mono mt-1">
              NEW_LOG_ENTRY
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={showDataPath}
            className="text-[var(--neptune-text-secondary)] hover:text-white hover:bg-[var(--neptune-primary-dim)] font-mono text-xs border border-transparent hover:border-[var(--neptune-primary-dim)]"
            title="Open data folder"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Data Folder
          </Button>
        </div>

        <div className="space-y-5 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[var(--neptune-secondary)] font-mono text-xs uppercase">
                <Calendar className="w-3 h-3" />
                Date
              </Label>
              <div className="relative group">
                <DatePicker
                  selected={todayLog.date ? new Date(todayLog.date) : new Date()}
                  onChange={(date: Date | null) => setTodayLog({ ...todayLog, date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0] })}
                  onChangeRaw={(e) => {
                    const input = e?.target as HTMLInputElement;
                    if (input?.value) {
                      input.value = formatDateInput(input.value);
                    }
                  }}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="MM/DD/YYYY"
                  className="w-full"
                />
                <div className="absolute inset-0 border border-[var(--neptune-primary)] opacity-0 group-hover:opacity-30 rounded-md pointer-events-none transition-opacity" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[var(--neptune-secondary)] font-mono text-xs uppercase">
                <Clock className="w-3 h-3" />
                Duration (Hours)
              </Label>
              <div className="relative group">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={todayLog.hours || ''}
                  onChange={(e) =>
                    setTodayLog({ ...todayLog, hours: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.0"
                  className="bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] focus:border-[var(--neptune-primary)] focus:ring-[var(--neptune-primary)] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-3 top-2.5 text-[var(--neptune-text-muted)] text-xs font-mono">HR</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--neptune-secondary)] font-mono text-xs uppercase">Time of Day</Label>
            <Select
              value={todayLog.timeSlot}
              onValueChange={(v) =>
                setTodayLog({ ...todayLog, timeSlot: v as any })
              }
            >
              <SelectTrigger className="bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f16] border-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)]">
                <SelectItem value="morning">☀️ Morning</SelectItem>
                <SelectItem value="evening">🌅 Afternoon</SelectItem>
                <SelectItem value="night">🌙 Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[var(--neptune-secondary)] font-mono text-xs uppercase">
              <Zap className="w-3 h-3" />
              Activities
            </Label>
            <Textarea
              value={todayLog.activities}
              onChange={(e) =>
                setTodayLog({ ...todayLog, activities: e.target.value })
              }
              placeholder="What did you work on today?"
              rows={4}
              className="resize-none bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] focus:border-[var(--neptune-primary)] focus:ring-[var(--neptune-primary)] neptune-scrollbar font-sans"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--neptune-secondary)] font-mono text-xs uppercase">Learnings (Required)</Label>
            <Textarea
              value={todayLog.learnings}
              onChange={(e) =>
                setTodayLog({ ...todayLog, learnings: e.target.value })
              }
              placeholder="What did you learn today?"
              rows={3}
              className="resize-none bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-primary)] focus:border-[var(--neptune-primary)] focus:ring-[var(--neptune-primary)] neptune-scrollbar font-sans"
            />
          </div>

          <div className="space-y-3 bg-[rgba(255,255,255,0.03)] p-4 rounded-lg border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between">
              <Label className="text-[var(--neptune-secondary)] font-mono text-xs uppercase">Mood</Label>
              <span className="text-sm font-bold text-[var(--neptune-text-primary)]">
                {todayLog.mood}/10 <span className="text-lg ml-1">{getMoodEmoji(todayLog.mood)}</span>
              </span>
            </div>
            <Slider
              value={[todayLog.mood]}
              onValueChange={(v) =>
                setTodayLog({ ...todayLog, mood: v[0] })
              }
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-[var(--neptune-text-muted)] font-mono uppercase">
              <span>Low</span>
              <span>Okay</span>
              <span>Great</span>
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-3">
            <Label className="text-[var(--neptune-secondary)] font-mono text-xs uppercase">Attachments (Screenshots, Videos, Code)</Label>

            <div className="border border-dashed border-[var(--neptune-primary-dim)] rounded-lg p-4 bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(var(--neptune-primary-rgb), 0.05)] transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.txt,.pdf,.sol,.js,.ts,.jsx,.tsx,.md,.py,.java,.cpp,.c,.go,.rs"
                onChange={handleMediaUpload}
                className="hidden"
                id="file-upload-tab"
              />

              <div className="flex flex-wrap gap-3 items-start min-h-[100px]">
                {todayLog.media.map((file, index) => {
                  const previewUrl = previewUrls[file.name];
                  const isImage = file.type.startsWith('image/');
                  const isVideo = file.type.startsWith('video/');
                  const isText = file.type.startsWith('text/') ||
                    file.name.match(/\.(txt|md|js|ts|jsx|tsx|py|java|cpp|c|go|rs|sol|json)$/i);

                  return (
                    <div key={index} className="relative group animate-in zoom-in duration-300">
                      <button
                        type="button"
                        onClick={() => openMediaModal(index)}
                        className="flex flex-col items-center w-20 hover:scale-105 transition-transform"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--neptune-primary-dim)] flex items-center justify-center bg-[rgba(0,0,0,0.5)] relative group-hover:border-[var(--neptune-primary)] group-hover:shadow-[0_0_10px_var(--neptune-primary)] transition-all">
                          {previewUrl && (isImage || isVideo) ? (
                            <>
                              <img
                                src={previewUrl}
                                alt={`Thumbnail ${index}`}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                              />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black/50 rounded-full p-1.5 border border-white/20">
                                    <Play className="w-3 h-3 text-white" fill="white" />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="p-1 opacity-70 group-hover:opacity-100">
                              {getFileIcon(file)}
                            </div>
                          )}
                        </div>

                        <div className="mt-1 text-center w-full px-1">
                          <p className="text-[10px] font-medium truncate text-[var(--neptune-text-primary)]">
                            {truncateFileName(file.name, 10)}
                          </p>
                          <p className="text-[9px] text-[var(--neptune-text-muted)] font-mono">
                            {formatFileSizeShort(file.size)}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}

                <label
                  htmlFor="file-upload-tab"
                  className="cursor-pointer flex flex-col items-center justify-center w-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-16 h-16 rounded-lg border border-dashed border-[var(--neptune-primary-dim)] hover:border-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.1)] transition-all flex flex-col items-center justify-center group">
                    <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center mb-0.5 group-hover:bg-[var(--neptune-primary)] group-hover:text-black transition-colors">
                      <span className="text-lg">+</span>
                    </div>
                    <p className="text-[10px] text-[var(--neptune-text-muted)] group-hover:text-[var(--neptune-primary)]">UPLOAD</p>
                  </div>
                  <div className="mt-1 text-center">
                    <p className="text-[10px] font-medium text-transparent">.</p>
                    <p className="text-[10px] text-transparent">.</p>
                  </div>
                </label>
              </div>

              <div className="text-center mt-3">
                <p className="text-xs text-[var(--neptune-text-muted)] font-mono">
                  {todayLog.media.length === 0
                    ? 'Click + to add files'
                    : `${todayLog.media.length} file(s) added`}
                </p>
                <p className="text-[10px] text-[var(--neptune-text-secondary)] mt-0.5 opacity-50 font-mono">
                  Supports: Images, Videos, Code files • No size limit
                </p>
              </div>
            </div>
          </div>

          {/* Context Picker - Add Context */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowContextPicker(!showContextPicker)}
              className="w-full flex items-center justify-center gap-2 border-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary-dim)] text-[var(--neptune-text-primary)] font-mono text-xs uppercase"
            >
              <Link className="w-4 h-4 text-[var(--neptune-secondary)]" />
              Link Related Items
              {(selectedContext.bountyIds.length + selectedContext.goalIds.length +
                selectedContext.noteIds.length + selectedContext.snippetIds.length) > 0 && (
                  <span className="ml-2 bg-[var(--neptune-primary)] text-black font-bold px-2 py-0.5 rounded-full text-[10px]">
                    {selectedContext.bountyIds.length + selectedContext.goalIds.length +
                      selectedContext.noteIds.length + selectedContext.snippetIds.length}
                  </span>
                )}
            </Button>

            {showContextPicker && (
              <NeptuneScrollbar
                maxHeight="400px"
                className="border border-[var(--neptune-primary-dim)] rounded-lg p-3 space-y-3 bg-[rgba(0,0,0,0.4)] neptune-glass-panel pr-6"
              >
                {/* BOUNTIES */}
                {bounties.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-[10px] text-[var(--neptune-secondary)] font-mono uppercase mb-2 block flex items-center gap-2">
                      🎯 Active Bounties <span className="text-[var(--neptune-text-muted)]">({bounties.length})</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {bounties.map(b => (
                        <ContextItemCard
                          key={b.id}
                          type="bounty"
                          data={b}
                          isSelected={selectedContext.bountyIds.includes(b.id)}
                          onToggle={() => {
                            setSelectedContext(prev => ({
                              ...prev,
                              bountyIds: prev.bountyIds.includes(b.id)
                                ? prev.bountyIds.filter(id => id !== b.id)
                                : [...prev.bountyIds, b.id]
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* GOALS */}
                {goals.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-[10px] text-[var(--neptune-secondary)] font-mono uppercase mb-2 block flex items-center gap-2">
                      📈 Linked Goals <span className="text-[var(--neptune-text-muted)]">({goals.length})</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {goals.map(g => (
                        <ContextItemCard
                          key={g.id}
                          type="goal"
                          data={g}
                          isSelected={selectedContext.goalIds.includes(g.id)}
                          onToggle={() => {
                            setSelectedContext(prev => ({
                              ...prev,
                              goalIds: prev.goalIds.includes(g.id)
                                ? prev.goalIds.filter(id => id !== g.id)
                                : [...prev.goalIds, g.id]
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* NOTES */}
                {notes.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-[10px] text-[var(--neptune-secondary)] font-mono uppercase mb-2 block flex items-center gap-2">
                      📝 Notes <span className="text-[var(--neptune-text-muted)]">({notes.length})</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {notes.map(n => (
                        <ContextItemCard
                          key={n.id}
                          type="note"
                          data={n}
                          isSelected={selectedContext.noteIds.includes(n.id)}
                          onToggle={() => {
                            setSelectedContext(prev => ({
                              ...prev,
                              noteIds: prev.noteIds.includes(n.id)
                                ? prev.noteIds.filter(id => id !== n.id)
                                : [...prev.noteIds, n.id]
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* SNIPPETS */}
                {snippets.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-[10px] text-[var(--neptune-secondary)] font-mono uppercase mb-2 block flex items-center gap-2">
                      💻 Snippets <span className="text-[var(--neptune-text-muted)]">({snippets.length})</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {snippets.map(s => (
                        <ContextItemCard
                          key={s.id}
                          type="snippet"
                          data={s}
                          isSelected={selectedContext.snippetIds.includes(s.id)}
                          onToggle={() => {
                            setSelectedContext(prev => ({
                              ...prev,
                              snippetIds: prev.snippetIds.includes(s.id)
                                ? prev.snippetIds.filter(id => id !== s.id)
                                : [...prev.snippetIds, s.id]
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {bounties.length === 0 && goals.length === 0 && notes.length === 0 && snippets.length === 0 && (
                  <p className="text-xs text-[var(--neptune-text-muted)] text-center py-2 font-mono">
                    No items available to link
                  </p>
                )}
              </NeptuneScrollbar>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full gap-2 bg-[var(--neptune-primary)] text-black hover:bg-[var(--neptune-secondary)] font-bold tracking-widest shadow-[0_0_20px_rgba(var(--neptune-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--neptune-primary-rgb),0.5)] transition-all duration-300"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                PROCESSING...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Log Entry
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Right Column - Past Logs */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="neptune-glass-panel rounded-xl p-6 border border-[var(--neptune-primary-dim)] flex flex-col overflow-hidden"
        style={rightColumnHeight ? { height: rightColumnHeight } : undefined}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold text-[var(--neptune-text-primary)] uppercase tracking-wider">
            📅 Log Archive
          </h2>
          <div className="text-[var(--neptune-text-muted)] font-mono text-xs">
            TOTAL_ENTRIES: {dailyLogs.length}
          </div>
        </div>

        <NeptuneScrollbar className="flex-1 min-h-0 pr-6" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="space-y-3">
            {dailyLogs.length > 0 ? (
              [...dailyLogs]
                .sort((a, b) => {
                  const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                  if (dateDiff !== 0) return dateDiff;
                  return b.id - a.id; // Tie-breaker: Newest created first
                })
                .map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative bg-[rgba(0,0,0,0.4)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)] hover:border-[var(--neptune-primary)] hover:bg-[rgba(var(--neptune-primary-rgb),0.05)] transition-all duration-300 overflow-hidden mb-3"
                  >
                    {/* Hover Scanline Effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--neptune-primary)] to-transparent opacity-0 group-hover:opacity-10 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 w-full pointer-events-none" />

                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <span className="font-display font-bold text-[var(--neptune-text-primary)] tracking-wider">
                        {log.date}
                      </span>
                      <span className="text-xs font-mono flex items-center gap-2 text-[var(--neptune-text-secondary)]">
                        <span className={`px-1.5 py-0.5 rounded ${log.timeSlot === 'morning' ? 'bg-yellow-500/10 text-yellow-500' :
                          log.timeSlot === 'evening' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                          {log.timeSlot === 'morning' ? 'MORNING' : log.timeSlot === 'evening' ? 'EVENING' : 'NIGHT'}
                        </span>
                        <span className="text-[var(--neptune-primary)] font-bold">{log.hours} HR</span>
                      </span>
                    </div>

                    <div className="text-sm text-[var(--neptune-text-secondary)] mb-3 line-clamp-2 font-san border-l-2 border-[var(--neptune-primary-dim)] pl-2">
                      {log.activities || 'No activities logged'}
                    </div>

                    <div className="flex justify-between items-center relative z-10 mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                      <span className="text-xs text-[var(--neptune-text-muted)] font-mono flex items-center gap-2 flex-wrap">
                        <span>MOOD: {log.mood}/10</span>
                        {log.media && log.media.length > 0 && (
                          <span className="flex items-center gap-1 text-[var(--neptune-secondary)]">
                            • 📎 {log.media.length} files
                          </span>
                        )}
                        {log.context && (
                          <span className="flex items-center gap-1 text-[var(--neptune-secondary)]">
                            • <Link className="w-3 h-3" /> LINKS: {
                              (log.context.bountyIds?.length || 0) +
                              (log.context.goalIds?.length || 0) +
                              (log.context.noteIds?.length || 0) +
                              (log.context.snippetIds?.length || 0)
                            }
                          </span>
                        )}
                        {/* AI Status Badge */}
                        {log.aiAnalysisStatus === 'completed' && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            • <Brain className="w-3 h-3" /> AI ✓
                          </span>
                        )}
                        {log.aiAnalysisStatus === 'analyzing' && (
                          <span className="flex items-center gap-1 text-cyan-400 animate-pulse">
                            • <Brain className="w-3 h-3" /> AI...
                          </span>
                        )}
                        {log.aiAnalysisStatus === 'failed' && (
                          <span className="flex items-center gap-1 text-red-400">
                            • <Brain className="w-3 h-3" /> AI ✗
                          </span>
                        )}
                      </span>
                      <div className="flex gap-1">
                        {/* AI Report Button - only show if analysis completed */}
                        {log.aiAnalysisStatus === 'completed' && log.aiReport && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAIReportModal(log)}
                            className="text-[10px] h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                            title="View AI Report"
                          >
                            <Sparkles className="w-3 h-3" />
                          </Button>
                        )}
                        {/* Share on X Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTweetModal(log)}
                          className="text-[10px] h-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20"
                          title="Share on X"
                        >
                          <Twitter className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openLogDetail(log)}
                          className="text-[10px] h-7 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-[var(--neptune-text-primary)] border border-transparent hover:border-[var(--neptune-secondary)] transition-all font-mono uppercase tracking-wider"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogToDelete(log.id)}
                          className="text-[10px] h-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
            ) : (
              <div className="text-center py-20 border border-dashed border-[var(--neptune-primary-dim)] rounded-xl bg-[rgba(0,0,0,0.2)]">
                <div className="flex flex-col items-center justify-center opacity-50">
                  <BookOpen className="w-12 h-12 text-[var(--neptune-text-muted)] mb-4" />
                  <p className="text-[var(--neptune-text-primary)] font-display tracking-widest text-lg">No logs yet</p>
                  <p className="text-[var(--neptune-text-muted)] text-xs font-mono mt-2">Start by adding your first entry</p>
                </div>
              </div>
            )}
          </div>
        </NeptuneScrollbar>
      </motion.div>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bounties={bounties}
        goals={goals}
        notes={notes}
        snippets={snippets}
      />

      {/* Delete Confirmation Modal */}
      {logToDelete !== null && (() => {
        const targetLog = dailyLogs.find(l => l.id === logToDelete);
        return (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="neptune-glass-panel p-6 rounded-xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-md w-full"
            >
              <div className="flex items-center gap-4 mb-4 text-red-500">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold tracking-wider text-white">CONFIRM DELETION</h3>
                  <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                    TARGET: {targetLog?.date || 'UNKNOWN_LOG'}
                  </p>
                </div>
              </div>

              <p className="text-[var(--neptune-text-secondary)] text-sm mb-6 font-mono leading-relaxed">
                Are you sure you want to delete this log entry? This will permanently remove the log record and <span className="text-red-400">attached Evidence (Media)</span>. Linked Context Items (Bounties, Goals, etc.) will NOT be deleted, but will be unlinked.
              </p>

              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setLogToDelete(null)}
                  className="font-mono text-xs text-[var(--neptune-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] uppercase"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (logToDelete) {
                      deleteLog(logToDelete);
                      setLogToDelete(null);
                    }
                  }}
                  className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all font-mono text-xs uppercase tracking-widest"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete Log
                </Button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Media Modal */}
      {showMediaModal && selectedMediaIndex !== null && (
        <MediaModal
          file={todayLog.media[selectedMediaIndex]}
          previewUrl={previewUrls[todayLog.media[selectedMediaIndex].name] || ''}
          onClose={closeMediaModal}
          onDownload={() => {
            const file = todayLog.media[selectedMediaIndex];
            const link = document.createElement('a');
            link.href = URL.createObjectURL(file);
            link.download = file.name;
            link.click();
            toast.success(`Downloading ${file.name}...`);
          }}
          onPrevious={
            selectedMediaIndex > 0
              ? () => {
                const newIndex = selectedMediaIndex - 1;
                openMediaModal(newIndex);
              }
              : undefined
          }
          onNext={
            selectedMediaIndex < todayLog.media.length - 1
              ? () => {
                const newIndex = selectedMediaIndex + 1;
                openMediaModal(newIndex);
              }
              : undefined
          }
          textContent={textContent}
        />
      )}

      {/* Tweet Modal */}
      {tweetLog && (
        <TweetModal
          isOpen={showTweetModal}
          onClose={closeTweetModal}
          log={tweetLog}
          userProfile={profile}
          apiKey={apiKey}
          journeyDay={(() => {
            // Calculate real journey days from first log to today
            if (dailyLogs.length === 0) return 1;
            const sortedLogs = [...dailyLogs].sort((a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const firstLogDate = new Date(sortedLogs[0].date);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - firstLogDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(1, diffDays); // At least day 1
          })()}
        />
      )}

      {/* AI Analysis Indicator */}
      {isAnalyzing && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-950/90 border border-cyan-500/30 shadow-lg">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-300 text-sm font-mono">AI Analyzing...</span>
        </div>
      )}

      {/* AI Report Modal */}
      {showAIReportModal && aiReportLog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={closeAIReportModal}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="neptune-glass-panel w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-300">AI Analysis Report</h3>
                  <p className="text-xs text-gray-400">{aiReportLog.date} • {aiReportLog.hours}h logged</p>
                </div>
              </div>
              <button
                onClick={closeAIReportModal}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <NeptuneScrollbar maxHeight="60vh" className="p-6 space-y-6 pr-6">
              {/* AI Report Summary */}
              {aiReportLog.aiReport && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Daily Summary
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {aiReportLog.aiReport}
                  </p>
                </div>
              )}

              {/* AI Review Details */}
              {aiReportLog.aiReview && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  {aiReportLog.aiReview.strengths && aiReportLog.aiReview.strengths.length > 0 && (
                    <div className="p-4 rounded-xl bg-green-950/30 border border-green-500/20">
                      <h4 className="text-sm font-semibold text-green-400 mb-3">💪 Strengths</h4>
                      <ul className="space-y-2">
                        {aiReportLog.aiReview.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-green-400 mt-1">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {aiReportLog.aiReview.weaknesses && aiReportLog.aiReview.weaknesses.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20">
                      <h4 className="text-sm font-semibold text-amber-400 mb-3">⚠️ Areas to Improve</h4>
                      <ul className="space-y-2">
                        {aiReportLog.aiReview.weaknesses.map((w, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-amber-400 mt-1">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tomorrow's Focus */}
                  {aiReportLog.aiReview.tomorrowFocus && aiReportLog.aiReview.tomorrowFocus.length > 0 && (
                    <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 md:col-span-2">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-3">🎯 Tomorrow's Focus</h4>
                      <ul className="space-y-2">
                        {aiReportLog.aiReview.tomorrowFocus.map((f, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">{i + 1}.</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Insights */}
                  {aiReportLog.aiReview.insights && aiReportLog.aiReview.insights.length > 0 && (
                    <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 md:col-span-2">
                      <h4 className="text-sm font-semibold text-purple-400 mb-3">💡 Insights</h4>
                      <ul className="space-y-2">
                        {aiReportLog.aiReview.insights.map((ins, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-purple-400 mt-1">✦</span>
                            <span>{ins}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Analysis timestamp */}
              {aiReportLog.aiAnalyzedAt && (
                <p className="text-center text-xs text-gray-500">
                  Analyzed at {new Date(aiReportLog.aiAnalyzedAt).toLocaleString('en-US')}
                </p>
              )}
            </NeptuneScrollbar>
          </motion.div>
        </div>
      )}
    </div>
  );
};
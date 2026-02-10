import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Clock, Calendar, Coffee, Zap, FolderOpen, FileText, Image, Video, File, Code, Play, Link, Activity, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Bounty, Goal, Note, Snippet, DailyLog, UserProfile } from '@/types';
import { analyzeLog, getLast7DaysSummary, isTextBasedFile, readMediaTextContent } from '../services/aiAnalysisService';
import { addNotification } from '../stores/NotificationStore';
import './neptune/neptune-design.css'; // Ensure Neptune CSS is active

// Define electronAPI interface for TypeScript
interface ElectronAPI {
  saveFile?: (filename: string, data: any) => Promise<{ success: boolean; error?: string }>;
  readFile?: (filename: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  saveMedia?: (filename: string, arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; error?: string; path?: string }>;
  getDataPath?: () => Promise<string>;
  openDataFolder?: () => Promise<{ success: boolean }>;
}


interface TimerLogData {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalFocusTime: number;
  totalBreakTime: number;
  breaks: Array<{ start: Date; end?: Date; duration?: number }>;
  breaksCount: number;
}

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerData: TimerLogData;
  bounties?: Bounty[];
  goals?: Goal[];
  notes?: Note[];
  snippets?: Snippet[];
  onLogSaved?: (log: any) => void; // Callback to notify parent when log is saved
}

// ================== UPDATED FUNCTIONS ==================

// Mood emoji helper - same as DailyLogTab
const getMoodEmoji = (mood: number) => {
  if (mood >= 8) return '😄';
  if (mood >= 6) return '😊';
  if (mood >= 4) return '😐';
  return '😔';
};

// Create preview for file type - only thumbnails for images and videos
const createPreviewForFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      // For images
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read image'));

    } else if (file.type.startsWith('video/')) {
      // For videos - create thumbnail (safer version)
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        // Get thumbnail from 10% of video duration (minimum 0.5s)
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
      // For all other files, return empty string (icon will be shown)
      resolve('');
    }
  });
};

// Short file size format
const formatFileSizeShort = (bytes: number): string => {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'K', 'M', 'G'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(1)}${sizes[i]}`;
};

// Truncate file name
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

// Convert File to ArrayBuffer
const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = error => reject(error);
  });
};

// Sanitize filename
const sanitizeFilename = (filename: string): string => {
  const extension = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
  return extension ? `${cleanName}.${extension}` : cleanName;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Select icon based on file type
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

// Determine file type
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

// ================== MEDIA MODAL COMPONENT (Copied from DailyLogTab) ==================
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

  // Lock body scroll when MediaModal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 z-[10001] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="relative neptune-glass-panel rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[var(--neptune-primary-dim)]"
        style={{
          width: '90vw',
          maxWidth: '1200px',
          height: '80vh',
          maxHeight: '700px'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >

        {/* TOP BAR */}
        <div className="flex justify-between items-center p-4 bg-[rgba(0,0,0,0.6)] backdrop-blur-md border-b border-[var(--neptune-primary-dim)] flex-shrink-0">
          <div className="max-w-[80%]">
            <h3 className="font-display tracking-wider text-[var(--neptune-text-primary)] font-medium truncate text-base flex items-center gap-2">
              <span className="text-[var(--neptune-primary)]">///</span> {file.name}
            </h3>
            <p className="text-[var(--neptune-text-muted)] text-xs font-mono mt-1">
              Size: {formatFileSize(file.size)} • Type: {getFileType(file).toUpperCase()}
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
                <div className="font-mono text-xs text-[var(--neptune-text-secondary)]">Code Preview</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(textContent);
                    toast.success('Copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-[var(--neptune-text-primary)] rounded text-xs transition-colors font-mono"
                >
                  Copy
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
                This file type requires an external app: {getFileType(file).toUpperCase()}
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM BAR */}
        <div className="p-4 bg-[rgba(0,0,0,0.6)] backdrop-blur-md border-t border-[var(--neptune-primary-dim)] flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
          <div className="text-[var(--neptune-text-muted)] text-xs font-mono w-full sm:w-auto">
            <p className="truncate">
              <span className="text-[var(--neptune-secondary)]">File:</span> {file.name}
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
                    title="Previous"
                  >
                    ←
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
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
    </div>,
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
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    // Wait a bit to see if mouse moved to the other element
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

// ================== MAIN COMPONENT ==================
const DailyLogModal = ({ isOpen, onClose, timerData, bounties = [], goals = [], notes = [], snippets = [], onLogSaved }: DailyLogModalProps) => {
  const [activities, setActivities] = useState('');
  const [mood, setMood] = useState<number>(5); // 1-10 scale like DailyLogTab
  const [learnings, setLearnings] = useState(''); // Renamed from feelings
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [textContent, setTextContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Format timer data
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Open media modal
  const openMediaModal = async (index: number) => {
    const file = mediaFiles[index];

    // If text file, read content
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
      // For other files
      setSelectedMediaIndex(index);
      setShowMediaModal(true);
    }
  };

  // Close media modal
  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedMediaIndex(null);
    setTextContent('');
  };

  // AI Analysis - Background function
  const triggerAIAnalysis = async (savedLog: DailyLog, allLogs: DailyLog[]) => {
    try {
      // Load API key from settings
      let apiKey = '';
      if (window.electronAPI?.readFile) {
        const settingsResult = await window.electronAPI.readFile('settings.json');
        // Check both 'apiKey' and 'groqApiKey' for compatibility
        if (settingsResult.success && settingsResult.data) {
          apiKey = settingsResult.data.apiKey || settingsResult.data.groqApiKey || '';
        }
      }

      if (!apiKey) {
        console.warn('⚠️ [MODAL-AI] No API key found, skipping analysis');
        setTimeout(() => {
          toast.warning('🔑 AI Analysis requires an API key. Please add your Groq API key in Settings.', {
            duration: 5000,
          });
        }, 1000);
        return;
      }

      // Load user profile
      let profile: UserProfile | null = null;
      if (window.electronAPI?.readFile) {
        const profileResult = await window.electronAPI.readFile('UserProfile.json');
        if (profileResult.success && profileResult.data) {
          profile = profileResult.data;
        }
      }

      if (!profile) {
        console.warn('⚠️ [MODAL-AI] No profile found, skipping analysis');
        return;
      }

      toast.info('🧠 Starting AI analysis...', { duration: 2000 });

      // Prepare context
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

      const allActiveGoals = goals.filter(g => g.status === 'active');
      const last7DaysSummary = getLast7DaysSummary(allLogs);

      // Read media text contents
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
        walletStatus: { balance: 0, totalEarnings: 0 },
        last7DaysSummary,
        userProfile: profile,
        mediaContents
      }, apiKey, () => { });



      // Update the log with AI results
      const updatedLog: DailyLog = {
        ...savedLog,
        aiReport: result.aiReport,
        aiReview: result.aiReview,
        aiAnalysisStatus: 'completed',
        aiAnalyzedAt: new Date().toISOString()
      };

      // Save to BasicLogs.json
      if (window.electronAPI?.readFile && window.electronAPI?.saveFile) {
        const readResult = await window.electronAPI.readFile('BasicLogs.json');
        if (readResult.success && readResult.data) {
          const data = readResult.data;
          const logIndex = data.dailyLogs.findIndex((l: DailyLog) => l.id === savedLog.id);
          if (logIndex !== -1) {
            data.dailyLogs[logIndex] = updatedLog;
            await window.electronAPI.saveFile('BasicLogs.json', data);

            // Add to notification center (removed duplicate toast)
            addNotification(
              'info',
              'AI Analysis Complete',
              'Your daily log has been analyzed and insights added',
              { tab: 'daily' }
            );
          }
        }
      }

    } catch (error) {
      console.error('❌ [MODAL-AI] Analysis failed:', error);
      toast.error('AI analysis failed');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    // Validation: activities and learnings are required
    const trimmedActivities = activities.trim();
    const trimmedLearnings = learnings.trim();

    // Check if activities is empty or only contains the placeholder template
    const placeholderTemplate = "What I worked on:...\nWhat I accomplished:...\nChallenges faced:...\nPlan for tomorrow:...";
    const isActivitiesEmpty = !trimmedActivities || trimmedActivities === placeholderTemplate;

    if (isActivitiesEmpty || !trimmedLearnings) {
      toast.error('Please fill in both Activities and Learnings fields before saving.');
      return;
    }

    setIsSaving(true);

    // Create JSON data
    const logData = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      hours: Math.round(timerData.totalFocusTime / 3600 * 100) / 100,
      timeSlot: getTimeSlot(new Date(timerData.startTime)),
      activities,
      mood,
      learnings,
      media: mediaFiles.map(file => ({
        id: Date.now(),
        type: getFileType(file),
        name: file.name,
        size: file.size,
        path: '',
        createdAt: new Date().toISOString()
      })),
      timerData: {
        sessionId: timerData.sessionId,
        startTime: timerData.startTime,
        endTime: timerData.endTime,
        totalFocusTime: timerData.totalFocusTime,
        totalBreakTime: timerData.totalBreakTime,
        breaksCount: timerData.breaksCount
      },
      // Context - linked items
      context: selectedContext.bountyIds.length > 0 || selectedContext.goalIds.length > 0 ||
        selectedContext.noteIds.length > 0 || selectedContext.snippetIds.length > 0
        ? selectedContext : undefined
    };

    try {
      // Read or create BasicLogs.json file
      let existingData = { dailyLogs: [] };

      if (window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile('BasicLogs.json');
        if (result.success && result.data) {
          existingData = result.data;
        } else if (!result.success) {
          existingData = { dailyLogs: [] };
        }
      }

      // Add new log
      const newLogIndex = existingData.dailyLogs.length;
      existingData.dailyLogs.push(logData);

      // Save media files (if any)
      const savedMediaPaths = [];
      if (mediaFiles.length > 0 && window.electronAPI?.saveMedia) {
        for (const [index, file] of mediaFiles.entries()) {
          try {
            const cleanFilename = sanitizeFilename(file.name);
            const mediaFilename = `media_${logData.id}_${index}_${Date.now()}_${cleanFilename}`;

            const arrayBuffer = await fileToArrayBuffer(file);

            const saveResult = await window.electronAPI.saveMedia(mediaFilename, arrayBuffer);

            if (saveResult && saveResult.success) {
              savedMediaPaths.push({
                index,
                path: mediaFilename
              });
            } else {
              console.error('Failed to save media:', saveResult?.error);
              toast.error(`Failed to save ${file.name}!`);
            }
          } catch (mediaError) {
            console.error('Media save error:', mediaError);
            toast.error(`Error saving ${file.name}!`);
          }
        }

        // Add media paths to log
        savedMediaPaths.forEach(({ index, path }) => {
          existingData.dailyLogs[newLogIndex].media[index].path = path;
        });
      }

      // Write to BasicLogs.json file
      if (window.electronAPI?.saveFile) {
        const saveResult = await window.electronAPI.saveFile('BasicLogs.json', existingData);
        if (saveResult && saveResult.success) {
          // Get the final log data with media paths
          const savedLog = existingData.dailyLogs[existingData.dailyLogs.length - 1];

          // Send notification with log ID for deep navigation
          addNotification(
            'log_saved',
            'Daily Log Saved',
            `${savedLog.hours}h logged • Mood: ${savedLog.mood}/10`,
            {
              tab: 'daily',
              data: {
                logId: savedLog.id,
                logDate: savedLog.date
              }
            }
          );

          // Notify parent component about the new log
          if (onLogSaved) {
            onLogSaved(savedLog);
          }

          // Trigger AI Analysis in background (non-blocking)
          triggerAIAnalysis(savedLog as DailyLog, existingData.dailyLogs);

          toast.info('DATA_VAULT_OPEN', {
            action: {
              label: 'Open folder',
              onClick: () => openDataFolder()
            }
          });
        } else {
          toast.error('Save failed!');
        }
      }

      onClose();
      resetForm();

    } catch (error) {
      console.error('Log save error:', error);
      toast.error('Error saving log!');
    } finally {
      setIsSaving(false);
    }
  };



  const getTimeSlot = (date: Date): 'morning' | 'evening' | 'night' => {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'evening';
    return 'night';
  };

  const resetForm = () => {
    setActivities('');
    setMood(5);
    setLearnings('');
    setMediaFiles([]);
    Object.values(previewUrls).forEach(url => {
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        URL.revokeObjectURL(url);
      }
    });
    setPreviewUrls({});
    closeMediaModal();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
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
      setMediaFiles([...mediaFiles, ...files]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const file = mediaFiles[index];

    if (previewUrls[file.name]) {
      const url = previewUrls[file.name];
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        URL.revokeObjectURL(url);
      }
      const newPreviewUrls = { ...previewUrls };
      delete newPreviewUrls[file.name];
      setPreviewUrls(newPreviewUrls);
    }

    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const openDataFolder = async () => {
    if (window.electronAPI?.openDataFolder) {
      await window.electronAPI.openDataFolder();
    }
  };

  const showDataPath = async () => {
    if (window.electronAPI?.getDataPath) {
      const path = await window.electronAPI.getDataPath();
      toast.info(`Data stored at: ${path}`);
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
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const suggestions = [
        "What I worked on:...",
        "What I accomplished:...",
        "Challenges faced:...",
        "Plan for tomorrow:..."
      ];
      setActivities(suggestions.join('\n'));
    }
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="neptune-glass-panel w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col border border-[var(--neptune-primary-dim)] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--neptune-primary-dim)] bg-[rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[var(--neptune-primary-dim)] flex items-center justify-center border border-[var(--neptune-primary)] shadow-[0_0_15px_var(--neptune-primary-dim)]">
                  <Zap className="w-6 h-6 text-[var(--neptune-primary)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-[var(--neptune-text-primary)] tracking-wider">
                    Session Summary
                  </h2>
                  <p className="text-[var(--neptune-text-secondary)] font-mono text-xs uppercase tracking-widest">
                    SESSION ID: {timerData.sessionId.substring(0, 8)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={showDataPath}
                  className="text-[var(--neptune-text-secondary)] hover:text-white hover:bg-[var(--neptune-primary-dim)] font-mono text-xs uppercase"
                  title="Open data folder"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Data
                </Button>
                <button onClick={onClose} className="rounded-full p-2 bg-[rgba(255,255,255,0.05)] hover:bg-red-500/20 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/50">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto neptune-scrollbar p-6">
              <Tabs defaultValue="timer" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[rgba(0,0,0,0.3)] border border-[var(--neptune-primary-dim)] p-1 h-12 rounded-xl mb-6">
                  <TabsTrigger
                    value="timer"
                    className="flex items-center gap-2 data-[state=active]:bg-[var(--neptune-primary-dim)] data-[state=active]:text-white font-mono uppercase tracking-wider text-xs"
                  >
                    <Clock className="w-4 h-4" />
                    Timer Data
                  </TabsTrigger>
                  <TabsTrigger
                    value="log"
                    className="flex items-center gap-2 data-[state=active]:bg-[var(--neptune-primary-dim)] data-[state=active]:text-white font-mono uppercase tracking-wider text-xs"
                  >
                    <Activity className="w-4 h-4" />
                    LOG ENTRY
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="timer" className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Time Panel */}
                    <div className="neptune-glass-panel p-5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                      <h4 className="font-mono text-[var(--neptune-secondary)] text-xs uppercase mb-4 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Duration Analysis
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-[rgba(255,255,255,0.05)] pb-2">
                          <span className="text-[var(--neptune-text-muted)] text-xs font-mono">Started</span>
                          <span className="text-[var(--neptune-text-primary)] font-bold">{formatDateTime(timerData.startTime)}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-[rgba(255,255,255,0.05)] pb-2">
                          <span className="text-[var(--neptune-text-muted)] text-xs font-mono">Ended</span>
                          <span className="text-[var(--neptune-text-primary)] font-bold">{formatDateTime(timerData.endTime)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-1">
                          <span className="text-[var(--neptune-text-muted)] text-xs font-mono">Focus Time</span>
                          <span className="text-[var(--neptune-primary)] font-display text-xl font-bold">{formatTime(timerData.totalFocusTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Break Panel */}
                    <div className="neptune-glass-panel p-5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                      <h4 className="font-mono text-[var(--neptune-secondary)] text-xs uppercase mb-4 flex items-center gap-2">
                        <Coffee className="w-3 h-3" />
                        Breaks
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[rgba(255,255,255,0.03)] p-3 rounded text-center">
                            <div className="text-2xl font-bold text-[var(--neptune-text-primary)]">{timerData.breaksCount}</div>
                            <div className="text-[10px] text-[var(--neptune-text-muted)] font-mono uppercase">Breaks</div>
                          </div>
                          <div className="bg-[rgba(255,255,255,0.03)] p-3 rounded text-center">
                            <div className="text-lg font-bold text-[var(--neptune-text-primary)] mt-1">
                              {timerData.breaksCount > 0 ?
                                formatTime(timerData.totalBreakTime / timerData.breaksCount) : '0m'}
                            </div>
                            <div className="text-[10px] text-[var(--neptune-text-muted)] font-mono uppercase">Avg Length</div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[var(--neptune-text-muted)] font-mono">Focus Rate</span>
                            <span className="text-[var(--neptune-primary)] font-bold">
                              {Math.round((timerData.totalFocusTime / (timerData.totalFocusTime + timerData.totalBreakTime)) * 100)}%
                            </span>
                          </div>
                          <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--neptune-primary)] shadow-[0_0_10px_var(--neptune-primary)]"
                              style={{ width: `${Math.round((timerData.totalFocusTime / (timerData.totalFocusTime + timerData.totalBreakTime)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-[rgba(var(--neptune-primary-rgb),0.05)] border border-[var(--neptune-primary-dim)] rounded-lg text-[var(--neptune-text-secondary)] text-xs font-mono">
                    <Zap className="w-4 h-4 text-[var(--neptune-primary)] animate-pulse" />
                    <span>Note: Timer data will be saved automatically.</span>
                  </div>
                </TabsContent>

                <TabsContent value="log" className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="activities" className="flex items-center gap-2 text-[var(--neptune-secondary)] font-mono text-xs uppercase">
                      <Zap className="w-3 h-3" />
                      Activity Log
                    </Label>
                    <Textarea
                      id="activities"
                      placeholder="What did you work on today?..."
                      value={activities}
                      onChange={(e) => setActivities(e.target.value)}
                      className="min-h-[120px] bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] focus:border-[var(--neptune-primary)] text-[var(--neptune-text-primary)] font-mono text-sm neptune-scrollbar"
                    />
                  </div>

                  {/* Mood Slider - Same as DailyLogTab */}
                  <div className="space-y-3 bg-[rgba(255,255,255,0.03)] p-4 rounded-lg border border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between">
                      <Label className="text-[var(--neptune-secondary)] font-mono text-xs uppercase">Mood</Label>
                      <span className="text-sm font-bold text-[var(--neptune-text-primary)]">
                        {mood}/10 <span className="text-lg ml-1">{getMoodEmoji(mood)}</span>
                      </span>
                    </div>
                    <Slider
                      value={[mood]}
                      onValueChange={(v) => setMood(v[0])}
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

                  {/* Learnings - Same as DailyLogTab */}
                  <div className="space-y-2">
                    <Label htmlFor="learnings" className="text-[var(--neptune-secondary)] font-mono text-xs uppercase">Learnings (Required)</Label>
                    <Textarea
                      id="learnings"
                      placeholder="What did you learn today?"
                      value={learnings}
                      onChange={(e) => setLearnings(e.target.value)}
                      className="min-h-[80px] bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] focus:border-[var(--neptune-primary)] text-[var(--neptune-text-primary)] font-mono text-sm neptune-scrollbar"
                    />
                  </div>

                  {/* File Upload Section will continue in next chunk... */}
                  <div className="space-y-2">
                    <Label className="text-[var(--neptune-secondary)] font-mono text-xs uppercase">Attachments (Screenshots, Code)</Label>

                    <div className="border border-dashed border-[var(--neptune-primary-dim)] rounded-lg p-4 bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(var(--neptune-primary-rgb),0.05)] transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,.txt,.pdf,.sol,.js,.ts,.jsx,.tsx,.md,.py,.java,.cpp,.c,.go,.rs"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />

                      <div className="flex flex-wrap gap-3 items-start min-h-[100px]">
                        {mediaFiles.map((file, index) => {
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
                          htmlFor="file-upload"
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
                          {mediaFiles.length === 0
                            ? 'Click + to add files'
                            : `${mediaFiles.length} file(s) added`}
                        </p>
                        <p className="text-xs text-[var(--neptune-text-secondary)] mt-0.5 opacity-50 font-mono">
                          Supports: Images, Videos, Code files • No size limit
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                    <Label className="text-[var(--neptune-secondary)] font-mono text-xs uppercase flex items-center gap-2">
                      <Link className="w-3 h-3" />
                      Link Related Items
                    </Label>

                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowContextPicker(!showContextPicker)}
                        className="w-full flex items-center justify-between gap-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] text-[var(--neptune-text-primary)] font-mono text-xs h-10"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[var(--neptune-text-muted)]">Linked items:</span>
                          {(selectedContext.bountyIds.length + selectedContext.goalIds.length +
                            selectedContext.noteIds.length + selectedContext.snippetIds.length) > 0 ? (
                            <span className="text-[var(--neptune-primary)] font-bold">
                              {selectedContext.bountyIds.length + selectedContext.goalIds.length +
                                selectedContext.noteIds.length + selectedContext.snippetIds.length} ACTIVE
                            </span>
                          ) : <span>NONE</span>}
                        </span>
                        <span>{showContextPicker ? '[-]' : '[+]'}</span>
                      </Button>

                      {showContextPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full mb-2 left-0 right-0 bg-[#0F1419] border border-[var(--neptune-primary-dim)] rounded-lg p-3 shadow-2xl z-50 max-h-[400px] overflow-y-auto neptune-scrollbar"
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
                                📈 Goals <span className="text-[var(--neptune-text-muted)]">({goals.length})</span>
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


                        </motion.div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-[var(--neptune-primary-dim)] bg-[rgba(0,0,0,0.4)] flex justify-end gap-3 rounded-b-2xl">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
                className="font-mono text-xs text-[var(--neptune-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[var(--neptune-primary-dim)] hover:bg-[var(--neptune-primary)] text-white border border-[var(--neptune-primary)] hover:shadow-[0_0_20px_var(--neptune-primary)] transition-all font-mono text-xs uppercase tracking-widest px-6"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    COMMITTING...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Log
                  </>
                )}
              </Button>
            </div>

            {/* INTERNAL MEDIA MODAL - Component Usage */}
            {showMediaModal && selectedMediaIndex !== null && (
              <MediaModal
                file={mediaFiles[selectedMediaIndex]}
                previewUrl={previewUrls[mediaFiles[selectedMediaIndex].name]}
                onClose={closeMediaModal}
                onDownload={() => {
                  const file = mediaFiles[selectedMediaIndex];
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(file);
                  link.download = file.name;
                  link.click();
                  toast.success(`Downloading ${file.name}...`);
                }}
                onPrevious={mediaFiles.length > 1 ? () => {
                  const newIndex = selectedMediaIndex > 0 ? selectedMediaIndex - 1 : mediaFiles.length - 1;
                  openMediaModal(newIndex);
                } : undefined}
                onNext={mediaFiles.length > 1 ? () => {
                  const newIndex = selectedMediaIndex < mediaFiles.length - 1 ? selectedMediaIndex + 1 : 0;
                  openMediaModal(newIndex);
                } : undefined}
                textContent={textContent}
              />
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default DailyLogModal;
// ProfilePanel.tsx - User Profile Viewer & Editor
import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, Plus, Trash2, Save, Loader2, BookOpen, Target, Camera, Award, Star, Flame, Trophy, Clock, AlertTriangle, Coins, Bug, DollarSign, Zap, Download, Upload, RefreshCcw } from 'lucide-react';
import { UserProfile } from '@/types/userProfile';
import '@/types/electron';
import './neptune/neptune-design.css';
import ImageCropModal from './ImageCropModal';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';
import { toast } from 'sonner';

interface ProfilePanelProps {
    onClose: () => void;
}

// Skill level options
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

// Skill level to progress percentage
const skillLevelToPercent = (level: string): number => {
    switch (level?.toLowerCase()) {
        case 'beginner': return 33;
        case 'intermediate': return 66;
        case 'advanced': return 100;
        default: return 0;
    }
};

const ProfilePanel = memo(({ onClose }: ProfilePanelProps) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Editable state
    const [editableSkills, setEditableSkills] = useState<Record<string, string>>({});
    const [wantsToLearn, setWantsToLearn] = useState<string[]>([]);
    const [newSkillName, setNewSkillName] = useState('');
    const [newSkillLevel, setNewSkillLevel] = useState<string>('beginner');
    const [newTopic, setNewTopic] = useState('');

    // Identity state (moved from Settings)
    const [nickname, setNickname] = useState('');
    const [aiInstructions, setAiInstructions] = useState('');

    // Profile photo state
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null); // For crop modal
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Unlocked achievements/badges
    const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);

    // Data Export/Import state
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showRestartModal, setShowRestartModal] = useState(false);
    const [showOverwriteModal, setShowOverwriteModal] = useState(false);

    // Badge display info with Lucide icons
    const badgeInfo: Record<string, { name: string; Icon: typeof Star; color: string; gradient: string }> = {
        first_log: { name: 'Initiate', Icon: Star, color: '#f9c74f', gradient: 'from-amber-500/20 to-yellow-500/10' },
        week_warrior: { name: 'Week Warrior', Icon: Flame, color: '#f8961e', gradient: 'from-orange-500/20 to-red-500/10' },
        month_master: { name: 'Lunar Master', Icon: Trophy, color: '#90be6d', gradient: 'from-green-500/20 to-emerald-500/10' },
        time_investor: { name: 'Deep Focus', Icon: Clock, color: '#00b4d8', gradient: 'from-cyan-500/20 to-blue-500/10' },
        high_severity: { name: 'Critical Hit', Icon: AlertTriangle, color: '#ff6b6b', gradient: 'from-red-500/20 to-rose-500/10' },
        bounty_hunter_1k: { name: '$1K Hunter', Icon: Coins, color: '#90be6d', gradient: 'from-green-500/20 to-lime-500/10' },
        bug_hunter: { name: 'Bug Hunter', Icon: Bug, color: '#c084fc', gradient: 'from-purple-500/20 to-violet-500/10' },
        first_bounty: { name: 'First Bounty', Icon: DollarSign, color: '#4ade80', gradient: 'from-emerald-500/20 to-green-500/10' },
        goal_setter: { name: 'Goal Master', Icon: Target, color: '#00b4d8', gradient: 'from-blue-500/20 to-cyan-500/10' },
        dedication: { name: 'Grand Admiral', Icon: Zap, color: '#fdba74', gradient: 'from-amber-500/20 to-orange-500/10' },
    };

    // Memoized JSON syntax highlighting - CRITICAL for scroll performance
    const formattedProfileJson = useMemo(() => {
        if (!profile) return '';
        return JSON.stringify(profile, null, 2)
            .replace(/(".*?"):/g, '<span style="color:#00b4d8">$1</span>:')
            .replace(/: (".*?")/g, ': <span style="color:#90be6d">$1</span>')
            .replace(/: (\d+)/g, ': <span style="color:#f9c74f">$1</span>')
            .replace(/: (true|false)/g, ': <span style="color:#f8961e">$1</span>')
            .replace(/: (null)/g, ': <span style="color:#ff6b6b">$1</span>');
    }, [profile]);

    // Check for duplicates (case-insensitive)
    const isDuplicateSkill = useCallback((skillName: string): boolean => {
        const lowerName = skillName.toLowerCase().trim();
        return Object.keys(editableSkills).some(
            existing => existing.toLowerCase() === lowerName
        );
    }, [editableSkills]);

    // Load profile
    useEffect(() => {
        const loadProfile = async () => {
            try {
                if (window.electronAPI?.readFile) {
                    const result = await window.electronAPI.readFile('UserProfile.json');
                    if (result.success && result.data) {
                        setProfile(result.data);
                        setEditableSkills(result.data.skillLevels || {});
                        setWantsToLearn(result.data.learning?.wantsToLearn || []);
                        // Load identity
                        setNickname(result.data.identity?.nickname || '');
                        setAiInstructions(result.data.identity?.aiInstructions || '');
                    }
                }
                // Load profile photo
                if (window.electronAPI?.readMedia) {
                    try {
                        const photoResult = await window.electronAPI.readMedia('profile.png');
                        if (photoResult?.success && photoResult.dataUrl) {
                            setProfilePhoto(photoResult.dataUrl);
                        }
                    } catch {
                        // No profile photo exists, that's ok
                    }
                }
                // Load unlocked achievements/badges
                if (window.electronAPI?.readFile) {
                    try {
                        const achievementsResult = await window.electronAPI.readFile('achievements.json');
                        if (achievementsResult.success && achievementsResult.data?.unlockedIds) {
                            setUnlockedBadges(achievementsResult.data.unlockedIds);
                        }
                    } catch {
                        // No achievements yet
                    }
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    // Handle file selection - opens crop modal
    const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Read file as data URL and open crop modal
        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Reset file input for next selection
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // Handle cropped image save
    const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
        setCropImageSrc(null); // Close crop modal
        setUploadingPhoto(true);

        try {
            // Convert Blob to ArrayBuffer
            const arrayBuffer = await croppedBlob.arrayBuffer();

            // Save using saveMedia API
            if (window.electronAPI?.saveMedia) {
                const result = await window.electronAPI.saveMedia('profile.png', arrayBuffer);
                if (result?.success) {
                    // Reload the photo
                    const photoResult = await window.electronAPI.readMedia?.('profile.png');
                    if (photoResult?.success && photoResult.dataUrl) {
                        setProfilePhoto(photoResult.dataUrl);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to save cropped photo:', error);
        } finally {
            setUploadingPhoto(false);
        }
    }, []);

    // Add new skill
    const handleAddSkill = useCallback(() => {
        const trimmedName = newSkillName.trim();
        if (!trimmedName) return;

        if (isDuplicateSkill(trimmedName)) {
            toast.warning('This skill already exists!');
            return;
        }

        setEditableSkills(prev => ({
            ...prev,
            [trimmedName]: newSkillLevel
        }));
        setNewSkillName('');
        setNewSkillLevel('beginner');
    }, [newSkillName, newSkillLevel, isDuplicateSkill]);

    // Remove skill
    const handleRemoveSkill = useCallback((skillName: string) => {
        setEditableSkills(prev => {
            const updated = { ...prev };
            delete updated[skillName];
            return updated;
        });
    }, []);

    // Update skill level
    const handleUpdateSkillLevel = useCallback((skillName: string, level: string) => {
        setEditableSkills(prev => ({
            ...prev,
            [skillName]: level
        }));
    }, []);

    // Add topic to wants to learn
    const handleAddTopic = useCallback(() => {
        const trimmed = newTopic.trim();
        if (!trimmed) return;
        if (wantsToLearn.includes(trimmed)) {
            toast.warning('This topic is already in the list!');
            return;
        }
        setWantsToLearn(prev => [...prev, trimmed]);
        setNewTopic('');
    }, [newTopic, wantsToLearn]);

    // Remove topic from wants to learn
    const handleRemoveTopic = useCallback((topic: string) => {
        setWantsToLearn(prev => prev.filter(t => t !== topic));
    }, []);

    // Save changes
    const handleSave = useCallback(async () => {
        if (!profile) return;

        setSaving(true);
        try {
            // Normalize skill keys (capitalize first letter)
            const normalizedSkills: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {};
            Object.entries(editableSkills).forEach(([key, value]) => {
                const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                // Ensure the value is a valid skill level
                const validLevel = SKILL_LEVELS.includes(value as typeof SKILL_LEVELS[number])
                    ? (value as 'beginner' | 'intermediate' | 'advanced')
                    : 'beginner';
                normalizedSkills[normalizedKey] = validLevel;
            });

            const updatedProfile: UserProfile = {
                ...profile,
                identity: {
                    ...profile.identity,
                    nickname: nickname.trim() || profile.identity?.nickname || 'User',
                    aiInstructions: aiInstructions.trim()
                },
                skillLevels: normalizedSkills,
                learning: {
                    ...profile.learning,
                    wantsToLearn
                },
                meta: {
                    ...profile.meta,
                    lastUpdated: new Date().toISOString()
                }
            };

            if (window.electronAPI?.saveFile) {
                const result = await window.electronAPI.saveFile('UserProfile.json', updatedProfile);
                if (result.success) {
                    setProfile(updatedProfile);
                    setEditableSkills(normalizedSkills); // Sync state for JSON refresh
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2000);
                }
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setSaving(false);
        }
    }, [profile, editableSkills, wantsToLearn, nickname, aiInstructions, onClose]);

    // Export all data
    const handleExport = useCallback(async () => {
        if (!window.electronAPI?.exportAllData) {
            toast.error('Export not available');
            return;
        }

        setExporting(true);
        try {
            const result = await window.electronAPI.exportAllData();
            if (result.canceled) {
                // User cancelled, no toast
            } else if (result.success) {
                toast.success('Data exported successfully!');
            } else {
                toast.error(result.error || 'Export failed');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    }, []);

    // Import data - Show confirmation modal first
    const handleImport = useCallback(() => {
        if (!window.electronAPI?.importAllData) {
            toast.error('Import not available');
            return;
        }
        // Show custom overwrite confirmation modal
        setShowOverwriteModal(true);
    }, []);

    // Confirm import after user accepts overwrite
    const confirmImport = useCallback(async () => {
        setShowOverwriteModal(false);
        setImporting(true);
        try {
            const result = await window.electronAPI!.importAllData();
            if (result.canceled) {
                // User cancelled, no toast
            } else if (result.success) {
                // Show restart confirmation modal
                setShowRestartModal(true);
            } else {
                toast.error(result.error || 'Import failed');
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Import failed');
        } finally {
            setImporting(false);
        }
    }, []);

    // Restart app handler
    const handleRestart = useCallback(async () => {
        if (window.electronAPI?.restartApp) {
            await window.electronAPI.restartApp();
        }
    }, []);

    // Dismiss restart modal
    const handleDismissRestart = useCallback(() => {
        setShowRestartModal(false);
        toast.success('Data imported! Restart the app when ready.');
    }, []);

    // Export for NotebookLM
    const [exportingNLM, setExportingNLM] = useState(false);
    const [showNLMSuccessModal, setShowNLMSuccessModal] = useState(false);
    const [nlmExportPath, setNlmExportPath] = useState('');

    const handleExportNotebookLM = useCallback(async () => {
        if (!window.electronAPI?.exportNotebookLM) {
            toast.error('NotebookLM export not available');
            return;
        }

        setExportingNLM(true);
        try {
            const result = await window.electronAPI.exportNotebookLM();
            if (result.success && result.path) {
                setNlmExportPath(result.path);
                setShowNLMSuccessModal(true);
            } else {
                toast.error(result.error || 'Export failed');
            }
        } catch (error) {
            console.error('NotebookLM export error:', error);
            toast.error('Export failed');
        } finally {
            setExportingNLM(false);
        }
    }, []);

    const handleOpenNLMFolder = useCallback(async () => {
        if (nlmExportPath && window.electronAPI?.showItemInFolder) {
            // Use showItemInFolder to highlight the exported file in file explorer
            await window.electronAPI.showItemInFolder(nlmExportPath);
        }
        setShowNLMSuccessModal(false);
    }, [nlmExportPath]);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (loading) {
        return createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.9)', willChange: 'opacity' }}
            >
                <Loader2 className="w-8 h-8 text-[var(--neptune-primary)] animate-spin" />
            </div>,
            document.body
        );
    }

    if (!profile) {
        return createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.9)', willChange: 'opacity' }}
            >
                <div className="text-[var(--neptune-text-muted)]">Profile not found</div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <>
            {/* Backdrop - static, no animation for smoother opening */}
            <div
                className="fixed inset-0 z-[9998]"
                style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-4 md:inset-10 lg:inset-20 z-[9999] flex items-center justify-center pointer-events-none"
            >
                <div
                    className="rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto border border-[var(--neptune-primary-dim)] bg-[rgba(5,10,20,0.95)]"
                    style={{ boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 180, 216, 0.05)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header - Premium Design */}
                    <div className="px-6 py-5 border-b border-[var(--neptune-primary-dim)] bg-gradient-to-r from-[rgba(0,180,216,0.12)] via-[rgba(0,180,216,0.05)] to-transparent">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Avatar with photo upload - ROUND */}
                                <div className="relative group">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--neptune-primary)] to-[var(--neptune-secondary)] opacity-50 blur-lg group-hover:opacity-70 transition-opacity duration-500" />
                                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[var(--neptune-primary)] to-[var(--neptune-secondary)] p-[2px]">
                                        <div className="w-full h-full rounded-full bg-[rgba(5,10,20,0.95)] flex items-center justify-center overflow-hidden">
                                            {profilePhoto ? (
                                                <img
                                                    src={profilePhoto}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-8 h-8 text-[var(--neptune-primary)]" />
                                            )}
                                        </div>
                                    </div>
                                    {/* Upload button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingPhoto}
                                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[rgba(30,60,100,0.9)] border-[2px] border-[rgba(5,10,20,0.95)] flex items-center justify-center hover:bg-[rgba(40,80,130,1)] transition-colors cursor-pointer"
                                    >
                                        {uploadingPhoto ? (
                                            <Loader2 className="w-3 h-3 text-white animate-spin" />
                                        ) : (
                                            <Camera className="w-3 h-3 text-white" />
                                        )}
                                    </button>
                                    {/* Hidden file input */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoSelect}
                                        className="hidden"
                                    />
                                </div>

                                {/* Name & Info */}
                                <div>
                                    <h2 className="text-2xl font-display font-bold tracking-wide text-[var(--neptune-text-primary)]">
                                        {profile?.identity?.nickname || 'Unknown User'}
                                    </h2>
                                    <p className="text-[11px] font-mono text-[var(--neptune-text-muted)] flex items-center gap-2 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--neptune-primary)] animate-pulse" />
                                        {profile.meta?.lastUpdated
                                            ? `Updated ${new Date(profile.meta.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                            : 'Never Updated'
                                        }
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-xl text-[var(--neptune-text-secondary)] hover:bg-[var(--neptune-primary-dim)] hover:text-white transition-all border border-transparent hover:border-[rgba(0,180,216,0.2)]"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Quick Stats Row */}
                        <div className="flex gap-3 mt-4">
                            <div className="flex-1 px-4 py-3 rounded-lg bg-[rgba(0,180,216,0.08)] border border-[rgba(0,180,216,0.15)]">
                                <div className="text-xl font-bold text-[var(--neptune-primary)]">{Object.keys(editableSkills).length}</div>
                                <div className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">Skills</div>
                            </div>
                            <div className="flex-1 px-4 py-3 rounded-lg bg-[rgba(144,190,109,0.08)] border border-[rgba(144,190,109,0.15)]">
                                <div className="text-xl font-bold text-[#90be6d]">{wantsToLearn.length}</div>
                                <div className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">Learning</div>
                            </div>
                            <div className="flex-1 px-4 py-3 rounded-lg bg-[rgba(249,199,79,0.08)] border border-[rgba(249,199,79,0.15)]">
                                <div className="text-xl font-bold text-[#f9c74f]">{profile.learning?.completedTopics?.length || 0}</div>
                                <div className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">Completed</div>
                            </div>
                        </div>

                        {/* Badges/Achievements Section */}
                        {unlockedBadges.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                                <div className="flex items-center gap-2 mb-3">
                                    <Award className="w-4 h-4 text-[var(--neptune-secondary)]" />
                                    <span className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">
                                        Achievements ({unlockedBadges.length})
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {unlockedBadges.map(badgeId => {
                                        const badge = badgeInfo[badgeId];
                                        if (!badge) return null;
                                        const IconComponent = badge.Icon;
                                        return (
                                            <div
                                                key={badgeId}
                                                className={`group relative px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 cursor-default transition-all duration-300 hover:scale-105 bg-gradient-to-br ${badge.gradient} backdrop-blur-sm`}
                                                style={{
                                                    border: `1px solid ${badge.color}30`,
                                                    boxShadow: `0 2px 8px ${badge.color}15, inset 0 1px 0 rgba(255,255,255,0.1)`
                                                }}
                                            >
                                                {/* Icon with glow */}
                                                <div
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                                                    style={{
                                                        backgroundColor: `${badge.color}20`,
                                                        boxShadow: `0 0 12px ${badge.color}30`
                                                    }}
                                                >
                                                    <IconComponent size={14} style={{ color: badge.color }} strokeWidth={2} />
                                                </div>
                                                <span style={{ color: badge.color }} className="font-semibold">{badge.name}</span>
                                                {/* Glow effect on hover */}
                                                <div
                                                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                                                    style={{ boxShadow: `0 0 20px ${badge.color}25` }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content - optimized scroll container */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 neptune-scrollbar" style={{ contain: 'content', willChange: 'scroll-position' }}>

                        {/* ══════════════ READ-ONLY SECTION - JSON View ══════════════ */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-mono text-[var(--neptune-secondary)] uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" /> UserProfile.json
                                </h3>
                                {saveSuccess && (
                                    <span className="text-[10px] font-mono text-green-400 flex items-center gap-1 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                        JSON Updated
                                    </span>
                                )}
                            </div>

                            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden bg-gradient-to-b from-[rgba(5,10,20,0.9)] to-[rgba(0,5,15,0.95)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,180,216,0.03)]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                    </div>
                                    <span className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">Read Only</span>
                                </div>
                                <pre className="p-4 text-xs font-mono overflow-x-auto text-[var(--neptune-text-primary)] max-h-[300px] overflow-y-auto" style={{ contain: 'content' }}>
                                    <code dangerouslySetInnerHTML={{ __html: formattedProfileJson }} />
                                </pre>
                            </div>
                        </div>

                        {/* ══════════════ EDITABLE SECTION ══════════════ */}
                        <div className="relative pt-8 space-y-5">
                            {/* Fancy divider */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--neptune-primary)] to-transparent opacity-40" />

                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-mono text-[var(--neptune-secondary)] uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-[var(--neptune-primary-dim)] flex items-center justify-center">
                                        <Target className="w-3.5 h-3.5 text-[var(--neptune-primary)]" />
                                    </div>
                                    Edit Profile
                                </h3>
                                <span className="text-[9px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider px-2 py-1 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                                    Changes auto-save on click
                                </span>
                            </div>

                            {/* Two Column Grid for Edit Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Identity (NEW - moved from Settings) */}
                                <div className="md:col-span-2 p-5 rounded-xl border border-purple-500/20 bg-gradient-to-br from-[rgba(168,85,247,0.08)] to-[rgba(5,10,20,0.8)]">
                                    <h4 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                                        👤 Identity & AI Personalization
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Nickname */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">
                                                Nickname / Display Name
                                            </label>
                                            <input
                                                type="text"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                placeholder="e.g., Chief, Captain, Hacker"
                                                className="w-full px-3 py-2.5 rounded-lg bg-[rgba(5,10,20,0.8)] border border-purple-500/20 text-[var(--neptune-text-primary)] text-sm font-mono placeholder:text-[var(--neptune-text-muted)] focus:outline-none focus:border-purple-500/50 transition-colors"
                                            />
                                        </div>

                                        {/* AI Instructions */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-[var(--neptune-text-muted)] uppercase tracking-wider">
                                                Custom AI Instructions
                                            </label>
                                            <textarea
                                                value={aiInstructions}
                                                onChange={(e) => setAiInstructions(e.target.value)}
                                                placeholder="e.g., Give short answers. Be motivating. Focus on Web3 security."
                                                className="w-full h-[42px] px-3 py-2.5 rounded-lg bg-[rgba(5,10,20,0.8)] border border-purple-500/20 text-[var(--neptune-text-primary)] text-sm font-mono placeholder:text-[var(--neptune-text-muted)] focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-[9px] font-mono text-[var(--neptune-text-muted)] mt-3 opacity-70">
                                        💡 These settings personalize how the AI Coach addresses and interacts with you
                                    </p>
                                </div>

                                {/* Wants to Learn (Editable) */}
                                <div className="p-5 rounded-xl border border-[var(--neptune-primary-dim)] bg-gradient-to-br from-[rgba(0,180,216,0.08)] to-[rgba(5,10,20,0.8)]">
                                    <h4 className="text-sm font-semibold text-[var(--neptune-primary)] mb-4 flex items-center gap-2">
                                        📚 Wants to Learn
                                    </h4>

                                    {/* Current topics */}
                                    <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                                        {wantsToLearn.length > 0 ? wantsToLearn.map((topic, i) => (
                                            <div key={i} className="flex items-center gap-1 px-3 py-1.5 bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)] rounded-full group hover:bg-[rgba(0,180,216,0.3)] transition-all">
                                                <span className="text-sm text-[var(--neptune-primary)]">{topic}</span>
                                                <button
                                                    onClick={() => handleRemoveTopic(topic)}
                                                    className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )) : (
                                            <span className="text-xs text-[var(--neptune-text-muted)] italic">No topics yet...</span>
                                        )}
                                    </div>

                                    {/* Add new topic */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTopic}
                                            onChange={e => setNewTopic(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
                                            placeholder="Add topic..."
                                            className="flex-1 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.15)] rounded-lg px-4 py-2.5 text-sm text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] focus:border-[var(--neptune-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--neptune-primary-dim)] transition-all"
                                        />
                                        <button
                                            onClick={handleAddTopic}
                                            className="px-4 py-2.5 bg-[var(--neptune-primary)] text-black rounded-lg hover:shadow-[0_0_15px_var(--neptune-primary)] transition-all font-medium"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Skill Levels (Editable) */}
                                <div className="p-5 rounded-xl border border-[var(--neptune-primary-dim)] bg-gradient-to-br from-[rgba(144,190,109,0.08)] to-[rgba(5,10,20,0.8)]">
                                    <h4 className="text-sm font-semibold text-[#90be6d] mb-4 flex items-center gap-2">
                                        ⚡ Skill Levels
                                    </h4>

                                    {/* Current skills */}
                                    <NeptuneScrollbar maxHeight="200px" className="space-y-2 mb-4 pr-2">
                                        {Object.entries(editableSkills).length > 0 ? Object.entries(editableSkills).map(([skill, level]) => (
                                            <div key={skill} className="flex items-center gap-2 group p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-all">
                                                <span className="text-sm text-[var(--neptune-text-primary)] flex-1 font-medium">{skill}</span>
                                                <select
                                                    value={level}
                                                    onChange={e => handleUpdateSkillLevel(skill, e.target.value)}
                                                    className="bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.15)] rounded-lg px-3 py-1.5 text-sm text-[var(--neptune-text-primary)] focus:border-[var(--neptune-primary)] focus:outline-none cursor-pointer"
                                                >
                                                    {SKILL_LEVELS.map(l => (
                                                        <option key={l} value={l}>{l}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleRemoveSkill(skill)}
                                                    className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[rgba(255,0,0,0.2)] rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )) : (
                                            <span className="text-xs text-[var(--neptune-text-muted)] italic">No skills yet...</span>
                                        )}
                                    </NeptuneScrollbar>

                                    {/* Add new skill */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newSkillName}
                                            onChange={e => setNewSkillName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                                            placeholder="Skill name..."
                                            className="flex-1 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.15)] rounded-lg px-4 py-2.5 text-sm text-[var(--neptune-text-primary)] placeholder:text-[var(--neptune-text-muted)] focus:border-[var(--neptune-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--neptune-primary-dim)] transition-all"
                                        />
                                        <select
                                            value={newSkillLevel}
                                            onChange={e => setNewSkillLevel(e.target.value)}
                                            className="bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.15)] rounded-lg px-3 py-2.5 text-sm text-[var(--neptune-text-primary)] focus:border-[var(--neptune-primary)] focus:outline-none cursor-pointer"
                                        >
                                            {SKILL_LEVELS.map(l => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddSkill}
                                            className="px-4 py-2.5 bg-[#90be6d] text-black rounded-lg hover:shadow-[0_0_15px_rgba(144,190,109,0.5)] transition-all font-medium"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer with Save */}
                    <div className="px-6 py-4 border-t border-[var(--neptune-primary-dim)] bg-gradient-to-r from-[rgba(0,0,0,0.4)] to-[rgba(0,180,216,0.05)]">
                        <button
                            onClick={handleSave}
                            disabled={saving || saveSuccess}
                            className={`w-full py-3 font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${saveSuccess
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-[rgba(30,60,100,0.6)] hover:bg-[rgba(40,80,130,0.7)] border border-[rgba(60,100,160,0.4)] hover:border-[rgba(80,130,200,0.5)] text-white'
                                } disabled:opacity-70`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : saveSuccess ? (
                                <>
                                    ✓ Saved!
                                </>
                            ) : (
                                <>
                                    Save Changes
                                </>
                            )}
                        </button>

                        {/* Export/Import Buttons */}
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-[rgba(0,180,216,0.1)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.2)] hover:border-[rgba(0,180,216,0.3)] text-[var(--neptune-primary)] disabled:opacity-50"
                            >
                                {exporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Export Data
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] text-[var(--neptune-text-secondary)] disabled:opacity-50"
                            >
                                {importing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                Import Data
                            </button>
                        </div>

                        {/* NotebookLM Export */}
                        <button
                            onClick={handleExportNotebookLM}
                            disabled={exportingNLM}
                            className="w-full mt-2 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-[rgba(139,92,246,0.1)] hover:bg-[rgba(139,92,246,0.2)] border border-[rgba(139,92,246,0.2)] hover:border-[rgba(139,92,246,0.3)] text-purple-400 disabled:opacity-50"
                        >
                            {exportingNLM ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <BookOpen className="w-4 h-4" />
                            )}
                            Export for NotebookLM
                        </button>
                    </div>
                </div>
            </motion.div >

            {/* Image Crop Modal */}
            {cropImageSrc && (
                <ImageCropModal
                    imageSrc={cropImageSrc}
                    onClose={() => setCropImageSrc(null)}
                    onCropComplete={handleCropComplete}
                />
            )}

            {/* Restart Confirmation Modal */}
            {showRestartModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-md p-6 rounded-2xl bg-[var(--neptune-glass)] border border-[var(--neptune-primary-dim)] shadow-xl"
                    >
                        {/* Icon */}
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--neptune-primary-dim)] flex items-center justify-center">
                            <RefreshCcw className="w-8 h-8 text-[var(--neptune-primary)]" />
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-display font-bold text-center text-[var(--neptune-text-primary)] mb-2">
                            Import Successful!
                        </h3>

                        {/* Message */}
                        <p className="text-center text-[var(--neptune-text-secondary)] mb-6">
                            Your data has been imported. Please restart the application to apply all changes.
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleDismissRestart}
                                className="flex-1 py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-secondary)] font-medium transition-all"
                            >
                                Later
                            </button>
                            <button
                                onClick={handleRestart}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--neptune-primary)] to-[var(--neptune-secondary)] hover:opacity-90 text-black font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Restart Now
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* NotebookLM Export Success Modal */}
            {showNLMSuccessModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-md p-6 rounded-2xl bg-[var(--neptune-glass)] border border-purple-500/30 shadow-xl"
                    >
                        {/* Success Icon */}
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-purple-400" />
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-display font-bold text-center text-purple-400 mb-2">
                            Export Complete!
                        </h3>

                        {/* Message */}
                        <p className="text-center text-[var(--neptune-text-secondary)] mb-3">
                            Your progress data has been exported for NotebookLM.
                        </p>

                        {/* File Path */}
                        <div className="p-3 rounded-lg bg-[rgba(0,0,0,0.3)] mb-6 overflow-hidden">
                            <p className="text-xs text-[var(--neptune-text-muted)] mb-1">File location:</p>
                            <p className="text-sm text-purple-300 font-mono truncate">{nlmExportPath}</p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNLMSuccessModal(false)}
                                className="flex-1 py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-secondary)] font-medium transition-all"
                            >
                                OK
                            </button>
                            <button
                                onClick={handleOpenNLMFolder}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 hover:opacity-90 text-white font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Open Folder
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Overwrite Confirmation Modal */}
            {showOverwriteModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-md p-6 rounded-2xl bg-[var(--neptune-glass)] border border-amber-500/30 shadow-xl"
                    >
                        {/* Warning Icon */}
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-amber-400" />
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-display font-bold text-center text-amber-400 mb-2">
                            Overwrite Data?
                        </h3>

                        {/* Message */}
                        <p className="text-center text-[var(--neptune-text-secondary)] mb-6">
                            This will replace all your existing data with the imported backup. This action cannot be undone.
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowOverwriteModal(false)}
                                className="flex-1 py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--neptune-text-secondary)] font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmImport}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-black font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Import Anyway
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>,
        document.body
    );
});

ProfilePanel.displayName = 'ProfilePanel';

// Profile Button Component (to be used in header)
export const ProfileButton = memo(({ onClick }: { onClick: () => void }) => {
    return (
        <button
            onClick={onClick}
            className="p-2 rounded-lg text-[var(--neptune-text-secondary)] hover:bg-[rgba(0,180,216,0.1)] hover:text-[var(--neptune-primary)] transition-all duration-300"
            title="Profile"
        >
            <User size={20} />
        </button>
    );
});

ProfileButton.displayName = 'ProfileButton';

export default ProfilePanel;

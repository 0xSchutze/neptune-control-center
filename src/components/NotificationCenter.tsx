// NotificationCenter.tsx - Notification bell icon with dropdown
import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, X, CheckCheck, Trash2,
    BarChart3, FileText, Target, Trophy, Clock, Info, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationStore, Notification, NotificationType } from '../stores/NotificationStore';
import { NeptuneScrollbar } from './neptune/NeptuneScrollbar';

interface NotificationCenterProps {
    onNavigate?: (tab: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
    const {
        notifications,
        unreadCount,
        isOpen,
        toggleOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
    } = useNotificationStore();

    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcut: Ctrl+B to toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                toggleOpen();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleOpen]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Delay to prevent immediate close
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, setIsOpen]);

    // Auto mark all as read when opening panel
    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            // Small delay then mark all as read
            const timer = setTimeout(() => {
                markAllAsRead();
            }, 2000); // 2 seconds after opening
            return () => clearTimeout(timer);
        }
    }, [isOpen, unreadCount, markAllAsRead]);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'review': return <BarChart3 className="w-4 h-4 text-cyan-400" />;
            case 'log_saved': return <FileText className="w-4 h-4 text-green-400" />;
            case 'goal': return <Target className="w-4 h-4 text-yellow-400" />;
            case 'achievement': return <Trophy className="w-4 h-4 text-purple-400" />;
            case 'reminder': return <Clock className="w-4 h-4 text-orange-400" />;
            default: return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        setIsOpen(false);

        // Deep navigation based on notification type
        if (notification.type === 'log_saved' && notification.action?.data?.logId) {
            // Navigate to daily tab and open specific log
            if (onNavigate) onNavigate('daily');
            // Dispatch event to open log detail
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('neptune-navigation', {
                    detail: {
                        type: 'openLogDetail',
                        data: {
                            logId: notification.action?.data?.logId,
                            logDate: notification.action?.data?.logDate
                        }
                    }
                }));
            }, 300);
        } else if (notification.type === 'info' && notification.action?.tab === 'daily') {
            // AI Analysis complete - navigate to daily tab and show AI report
            if (onNavigate) onNavigate('daily');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('neptune-navigation', {
                    detail: {
                        type: 'openAIReport',
                        data: { logId: notification.action?.data?.logId }
                    }
                }));
            }, 300);
        } else if (notification.type === 'review') {
            // AI Review - navigate to aireviews tab
            if (onNavigate) onNavigate('aireviews');
        } else if (notification.action?.tab && onNavigate) {
            // Default: just navigate to the tab
            onNavigate(notification.action.tab);
        }
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        clearAll();
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        markAllAsRead();
    };

    const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        removeNotification(id);
    };

    // Get dropdown position
    const getDropdownPosition = () => {
        if (!buttonRef.current) return { top: 0, right: 0 };
        const rect = buttonRef.current.getBoundingClientRect();
        return {
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right
        };
    };

    const dropdownPosition = getDropdownPosition();

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleOpen();
                }}
                className="
                    p-2 rounded-lg text-[var(--neptune-text-secondary)]
                    hover:bg-[rgba(0,180,216,0.1)] hover:text-[var(--neptune-primary)]
                    transition-all duration-300 relative
                "
                title="Notifications (Ctrl+B)"
            >
                <Bell size={20} />
                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="
                            absolute -top-1 -right-1 w-5 h-5 
                            bg-[var(--neptune-primary)] text-black
                            text-[10px] font-bold rounded-full
                            flex items-center justify-center
                            shadow-[0_0_10px_var(--neptune-primary)]
                            animate-pulse
                        "
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Dropdown - Render via Portal */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="
                            fixed z-[9999]
                            w-80 max-h-[400px] overflow-hidden
                            neptune-glass-panel rounded-xl
                            border border-[var(--neptune-primary-dim)]
                            shadow-[0_10px_40px_rgba(0,0,0,0.7)]
                        "
                        style={{
                            top: dropdownPosition.top,
                            right: dropdownPosition.right
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="
                            flex items-center justify-between px-4 py-3
                            border-b border-[rgba(255,255,255,0.05)]
                            bg-gradient-to-r from-[rgba(0,180,216,0.15)] to-transparent
                        ">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-[var(--neptune-primary)]" />
                                <span className="text-sm font-mono text-[var(--neptune-text-primary)] uppercase tracking-wider">
                                    Notifications
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {notifications.length > 0 && (
                                    <>
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="p-2 rounded-lg hover:bg-[rgba(0,180,216,0.2)] text-[var(--neptune-text-muted)] hover:text-[var(--neptune-primary)] transition-colors"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck size={16} />
                                        </button>
                                        <button
                                            onClick={handleClearAll}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--neptune-text-muted)] hover:text-red-400 transition-colors"
                                            title="Clear all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <NeptuneScrollbar maxHeight="320px">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-10 h-10 text-[var(--neptune-text-muted)] mx-auto mb-3 opacity-30" />
                                    <p className="text-sm text-[var(--neptune-text-muted)]">No notifications</p>
                                    <p className="text-xs text-[var(--neptune-text-muted)] mt-1 opacity-50">
                                        You're all caught up!
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`
                                            group relative px-4 py-3 cursor-pointer
                                            border-b border-[rgba(255,255,255,0.03)]
                                            hover:bg-[rgba(0,180,216,0.08)] transition-colors
                                            ${!notification.read ? 'bg-[rgba(0,180,216,0.05)]' : ''}
                                        `}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.4)] flex items-center justify-center border border-[rgba(255,255,255,0.05)]">
                                                {getIcon(notification.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 pr-6">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-medium ${!notification.read ? 'text-[var(--neptune-text-primary)]' : 'text-[var(--neptune-text-secondary)]'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {/* Unread indicator */}
                                                    {!notification.read && (
                                                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--neptune-primary)] animate-pulse" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-[var(--neptune-text-muted)] mt-0.5 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] text-[var(--neptune-text-muted)] opacity-60">
                                                        {formatTime(notification.timestamp)}
                                                    </p>
                                                    {notification.action?.tab && (
                                                        <span className="text-[10px] text-[var(--neptune-primary)] flex items-center gap-1">
                                                            <ExternalLink size={10} /> Go to tab
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete button (always visible on right) */}
                                            <button
                                                onClick={(e) => handleDeleteNotification(e, notification.id)}
                                                className="
                                                    absolute right-3 top-3
                                                    p-1.5 rounded-lg text-[var(--neptune-text-muted)]
                                                    hover:text-red-400 hover:bg-red-500/20
                                                    opacity-0 group-hover:opacity-100
                                                    transition-all
                                                "
                                                title="Delete"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </NeptuneScrollbar>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

// Toast notification helper - call this when adding notifications
export const showNotificationToast = (title: string, message: string, type: NotificationType) => {
    const icons: Record<NotificationType, string> = {
        review: '📊',
        log_saved: '✅',
        goal: '🎯',
        achievement: '🏆',
        reminder: '⏰',
        info: 'ℹ️',
        error: '❌'
    };

    toast(title, {
        description: message,
        icon: icons[type],
        duration: 4000,
        action: {
            label: 'View',
            onClick: () => {
                useNotificationStore.getState().setIsOpen(true);
            }
        }
    });
};

export default NotificationCenter;

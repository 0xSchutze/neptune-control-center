// NotificationStore.ts - Zustand store for managing notifications
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import React from 'react';
import { BarChart3, CheckCircle2, Target, Trophy, Bell, Info, XCircle } from 'lucide-react';

export type NotificationType = 'review' | 'log_saved' | 'goal' | 'achievement' | 'reminder' | 'info' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    action?: {
        tab?: string;
        data?: any;
    };
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;

    // Actions
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    setIsOpen: (isOpen: boolean) => void;
    toggleOpen: () => void;
}

// Icon component factory for toast notifications
const createToastIcon = (IconComponent: typeof BarChart3, color: string, bgColor: string) => {
    return React.createElement('div', {
        style: {
            width: 28,
            height: 28,
            borderRadius: 8,
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${color}30`,
        }
    }, React.createElement(IconComponent, { size: 16, color, strokeWidth: 2 }));
};

// Toast icons for notification types - Lucide icons with styled wrappers
const getToastIcon = (type: NotificationType) => {
    switch (type) {
        case 'review': return createToastIcon(BarChart3, '#00b4d8', 'rgba(0,180,216,0.15)');
        case 'log_saved': return createToastIcon(CheckCircle2, '#4ade80', 'rgba(74,222,128,0.15)');
        case 'goal': return createToastIcon(Target, '#f9c74f', 'rgba(249,199,79,0.15)');
        case 'achievement': return createToastIcon(Trophy, '#f8961e', 'rgba(248,150,30,0.15)');
        case 'reminder': return createToastIcon(Bell, '#c084fc', 'rgba(192,132,252,0.15)');
        case 'info': return createToastIcon(Info, '#60a5fa', 'rgba(96,165,250,0.15)');
        case 'error': return createToastIcon(XCircle, '#ef4444', 'rgba(239,68,68,0.15)');
    }
};

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,
            isOpen: false,

            addNotification: (notification) => {
                const newNotification: Notification = {
                    ...notification,
                    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    timestamp: new Date().toISOString(),
                    read: false,
                };

                set((state) => ({
                    notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep max 50
                    unreadCount: state.unreadCount + 1,
                }));

                // Show toast notification
                toast(notification.title, {
                    description: notification.message,
                    icon: getToastIcon(notification.type),
                    duration: 4000,
                    action: notification.action?.tab ? {
                        label: 'View',
                        onClick: () => {
                            get().setIsOpen(true);
                        }
                    } : undefined
                });
            },

            markAsRead: (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id);
                    if (notification && !notification.read) {
                        return {
                            notifications: state.notifications.map(n =>
                                n.id === id ? { ...n, read: true } : n
                            ),
                            unreadCount: Math.max(0, state.unreadCount - 1),
                        };
                    }
                    return state;
                });
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                    unreadCount: 0,
                }));
            },

            removeNotification: (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id);
                    return {
                        notifications: state.notifications.filter(n => n.id !== id),
                        unreadCount: notification && !notification.read
                            ? Math.max(0, state.unreadCount - 1)
                            : state.unreadCount,
                    };
                });
            },

            clearAll: () => {
                set({ notifications: [], unreadCount: 0 });
            },

            setIsOpen: (isOpen) => set({ isOpen }),
            toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
        }),
        {
            name: 'notifications-storage',
            partialize: (state) => ({
                notifications: state.notifications,
                unreadCount: state.unreadCount,
            }),
        }
    )
);

// Helper function to add notifications from anywhere
export const addNotification = (
    type: NotificationType,
    title: string,
    message: string,
    action?: Notification['action']
) => {
    useNotificationStore.getState().addNotification({ type, title, message, action });
};

export default useNotificationStore;


// NavigationEvents.ts - Global event system for deep navigation
// Used to navigate to specific content (e.g., opening a log detail modal)

export type NavigationEventType = 'openLogDetail' | 'openAIReview' | 'navigateToTab';

export interface NavigationEvent {
    type: NavigationEventType;
    data?: {
        logId?: number;
        logDate?: string;
        reviewType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
        reviewId?: string;
        tab?: string;
    };
}

// Custom event name
const NAV_EVENT_NAME = 'neptune-navigation';

/**
 * Dispatch a navigation event
 */
export function dispatchNavigationEvent(event: NavigationEvent): void {
    const customEvent = new CustomEvent(NAV_EVENT_NAME, { detail: event });
    window.dispatchEvent(customEvent);
}

/**
 * Subscribe to navigation events
 */
export function subscribeToNavigation(callback: (event: NavigationEvent) => void): () => void {
    const handler = (e: Event) => {
        const customEvent = e as CustomEvent<NavigationEvent>;
        callback(customEvent.detail);
    };
    window.addEventListener(NAV_EVENT_NAME, handler);
    return () => window.removeEventListener(NAV_EVENT_NAME, handler);
}

/**
 * Helper: Navigate to a specific log's detail modal
 */
export function navigateToLogDetail(logId: number, logDate?: string): void {
    dispatchNavigationEvent({
        type: 'openLogDetail',
        data: { logId, logDate }
    });
}

/**
 * Helper: Navigate to a specific AI review
 */
export function navigateToAIReview(reviewType: 'daily' | 'weekly' | 'monthly' | 'yearly', reviewId?: string): void {
    dispatchNavigationEvent({
        type: 'openAIReview',
        data: { reviewType, reviewId }
    });
}

/**
 * Helper: Navigate to a tab
 */
export function navigateToTab(tab: string): void {
    dispatchNavigationEvent({
        type: 'navigateToTab',
        data: { tab }
    });
}

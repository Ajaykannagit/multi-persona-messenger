/**
 * Browser Push Notification Service
 * Handles requesting permissions and sending browser notifications
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationData {
    channelId?: string;
    contactId?: string;
    personaId?: string;
    messageId?: string;
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
    return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission as NotificationPermission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isNotificationSupported()) {
        console.warn('Notifications are not supported in this browser');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        return permission as NotificationPermission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return 'denied';
    }
}

/**
 * Send a browser notification
 */
export function sendNotification(
    title: string,
    options?: {
        body?: string;
        icon?: string;
        badge?: string;
        tag?: string;
        data?: NotificationData;
        requireInteraction?: boolean;
    }
): Notification | null {
    if (!isNotificationSupported()) {
        console.warn('Notifications are not supported');
        return null;
    }

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    // Don't send notification if page is visible
    if (!document.hidden) {
        return null;
    }

    try {
        const notification = new Notification(title, {
            body: options?.body,
            icon: options?.icon || '/icon-192.png',
            badge: options?.badge || '/icon-192.png',
            tag: options?.tag,
            data: options?.data,
            requireInteraction: options?.requireInteraction || false,
        });

        // Auto-close after 5 seconds if not requiring interaction
        if (!options?.requireInteraction) {
            setTimeout(() => notification.close(), 5000);
        }

        return notification;
    } catch (error) {
        console.error('Error sending notification:', error);
        return null;
    }
}

/**
 * Send notification for a new message
 */
export function sendMessageNotification(
    senderName: string,
    messageContent: string,
    personaName: string,
    data: NotificationData
): Notification | null {
    const title = `${senderName} (${personaName})`;
    const body = messageContent.length > 100
        ? messageContent.substring(0, 100) + '...'
        : messageContent;

    return sendNotification(title, {
        body,
        tag: `message-${data.channelId}`,
        data,
    });
}

/**
 * Handle notification click events
 * Returns the data associated with the notification
 */
export function setupNotificationClickHandler(
    callback: (data: NotificationData) => void
) {
    if (!isNotificationSupported()) return;

    // Handle notification click
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'notification-click') {
                callback(event.data.notification.data);
            }
        });
    }
}

/**
 * Initialize notification service
 * Requests permission if not already granted
 */
export async function initializeNotifications(): Promise<boolean> {
    if (!isNotificationSupported()) {
        console.warn('Notifications not supported');
        return false;
    }

    const permission = await requestNotificationPermission();

    if (permission === 'granted') {
        console.log('Notification permission granted');
        return true;
    } else {
        console.log('Notification permission denied or dismissed');
        return false;
    }
}

/**
 * Check if notifications should be sent
 * Based on page visibility and permission
 */
export function shouldSendNotification(): boolean {
    return (
        isNotificationSupported() &&
        Notification.permission === 'granted' &&
        document.hidden
    );
}

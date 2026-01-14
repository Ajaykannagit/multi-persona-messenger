import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PresenceStatus = 'online' | 'offline' | 'away';

interface UserPresence {
    id: string;
    user_id: string;
    status: PresenceStatus;
    last_seen: string;
    updated_at: string;
}

let heartbeatInterval: NodeJS.Timeout | null = null;
let presenceChannel: RealtimeChannel | null = null;

/**
 * Update the current user's presence status
 */
export async function updatePresence(userId: string, status: PresenceStatus) {
    const { error } = await supabase
        .from('user_presence')
        .upsert({
            user_id: userId,
            status,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error('Error updating presence:', error);
    }
}

/**
 * Get presence for a specific user
 */
export async function getUserPresence(userId: string): Promise<UserPresence | null> {
    const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching presence:', error);
        return null;
    }

    return data;
}

/**
 * Get presence for multiple users
 */
export async function getMultipleUserPresence(userIds: string[]): Promise<UserPresence[]> {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

    if (error) {
        console.error('Error fetching multiple presence:', error);
        return [];
    }

    return data || [];
}

/**
 * Subscribe to presence changes for specific users
 */
export function subscribeToPresence(
    userIds: string[],
    callback: (presence: UserPresence) => void
): RealtimeChannel {
    const channel = supabase
        .channel('presence-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'user_presence',
                filter: `user_id=in.(${userIds.join(',')})`,
            },
            (payload) => {
                callback(payload.new as UserPresence);
            }
        )
        .subscribe();

    return channel;
}

/**
 * Start heartbeat to maintain online status
 * Sends a presence update every 30 seconds
 */
export function startHeartbeat(userId: string) {
    // Clear any existing heartbeat
    stopHeartbeat();

    // Set initial status to online
    updatePresence(userId, 'online');

    // Send heartbeat every 30 seconds
    heartbeatInterval = setInterval(() => {
        updatePresence(userId, 'online');
    }, 30000);

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            updatePresence(userId, 'away');
        } else {
            updatePresence(userId, 'online');
        }
    });

    // Handle beforeunload to set offline status
    window.addEventListener('beforeunload', () => {
        updatePresence(userId, 'offline');
    });
}

/**
 * Stop heartbeat and set user to offline
 */
export function stopHeartbeat(userId?: string) {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    if (userId) {
        updatePresence(userId, 'offline');
    }
}

/**
 * Cleanup presence subscriptions
 */
export function cleanupPresenceSubscription() {
    if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
        presenceChannel = null;
    }
}

/**
 * Get human-readable last seen text
 */
export function getLastSeenText(lastSeen: string): string {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastSeenDate.toLocaleDateString();
}

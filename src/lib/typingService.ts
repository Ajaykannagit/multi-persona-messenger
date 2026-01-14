import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingIndicator {
    id: string;
    channel_id: string;
    user_id: string;
    created_at: string;
    expires_at: string;
}

const typingTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Send typing indicator for a channel
 * Auto-expires after 5 seconds
 */
export async function sendTypingIndicator(channelId: string, userId: string) {
    const expiresAt = new Date(Date.now() + 5000).toISOString();

    const { error } = await supabase
        .from('typing_indicators')
        .upsert({
            channel_id: channelId,
            user_id: userId,
            expires_at: expiresAt,
        }, {
            onConflict: 'channel_id,user_id'
        });

    if (error) {
        console.error('Error sending typing indicator:', error);
    }
}

/**
 * Remove typing indicator for a user in a channel
 */
export async function removeTypingIndicator(channelId: string, userId: string) {
    const { error } = await supabase
        .from('typing_indicators')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error removing typing indicator:', error);
    }
}

/**
 * Get active typing indicators for a channel
 */
export async function getTypingIndicators(channelId: string): Promise<TypingIndicator[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('typing_indicators')
        .select('*')
        .eq('channel_id', channelId)
        .gt('expires_at', now);

    if (error) {
        console.error('Error fetching typing indicators:', error);
        return [];
    }

    return data || [];
}

/**
 * Subscribe to typing indicator changes for a channel
 */
export function subscribeToTyping(
    channelId: string,
    currentUserId: string,
    callback: (isTyping: boolean, userId: string) => void
): RealtimeChannel {
    const channel = supabase
        .channel(`typing:${channelId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'typing_indicators',
                filter: `channel_id=eq.${channelId}`,
            },
            (payload) => {
                const indicator = payload.new as TypingIndicator;

                // Ignore own typing indicators
                if (indicator.user_id === currentUserId) return;

                // Check if indicator is still valid
                const isValid = new Date(indicator.expires_at) > new Date();

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    callback(isValid, indicator.user_id);
                } else if (payload.eventType === 'DELETE') {
                    callback(false, indicator.user_id);
                }
            }
        )
        .subscribe();

    return channel;
}

/**
 * Handle typing input with debouncing
 * Sends typing indicator and auto-stops after user stops typing
 */
export function handleTypingInput(
    channelId: string,
    userId: string,
    isTyping: boolean
) {
    const key = `${channelId}-${userId}`;

    // Clear existing timeout
    if (typingTimeouts.has(key)) {
        clearTimeout(typingTimeouts.get(key)!);
        typingTimeouts.delete(key);
    }

    if (isTyping) {
        // Send typing indicator
        sendTypingIndicator(channelId, userId);

        // Set timeout to remove indicator after 3 seconds of inactivity
        const timeout = setTimeout(() => {
            removeTypingIndicator(channelId, userId);
            typingTimeouts.delete(key);
        }, 3000);

        typingTimeouts.set(key, timeout);
    } else {
        // User stopped typing, remove indicator immediately
        removeTypingIndicator(channelId, userId);
    }
}

/**
 * Cleanup typing indicator subscriptions and timeouts
 */
export function cleanupTyping(channelId?: string, userId?: string) {
    if (channelId && userId) {
        const key = `${channelId}-${userId}`;
        if (typingTimeouts.has(key)) {
            clearTimeout(typingTimeouts.get(key)!);
            typingTimeouts.delete(key);
        }
        removeTypingIndicator(channelId, userId);
    } else {
        // Clear all timeouts
        typingTimeouts.forEach(timeout => clearTimeout(timeout));
        typingTimeouts.clear();
    }
}

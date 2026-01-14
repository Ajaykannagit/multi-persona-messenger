import type { PresenceStatus } from '../lib/presenceService';

interface PresenceBadgeProps {
    status: PresenceStatus;
    lastSeen?: string;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

export function PresenceBadge({ status, lastSeen, size = 'md', showTooltip = true }: PresenceBadgeProps) {
    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4',
    };

    const statusColors = {
        online: 'bg-green-500',
        offline: 'bg-gray-400',
        away: 'bg-yellow-500',
    };

    const statusText = {
        online: 'Online',
        offline: lastSeen ? `Last seen ${getLastSeenText(lastSeen)}` : 'Offline',
        away: 'Away',
    };

    function getLastSeenText(lastSeen: string): string {
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diffMs = now.getTime() - lastSeenDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return lastSeenDate.toLocaleDateString();
    }

    return (
        <div className="relative inline-block">
            <div
                className={`${sizeClasses[size]} ${statusColors[status]} rounded-full border-2 border-white`}
                title={showTooltip ? statusText[status] : undefined}
            />
            {status === 'online' && (
                <div className={`absolute inset-0 ${statusColors[status]} rounded-full animate-ping opacity-75`} />
            )}
        </div>
    );
}

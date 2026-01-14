import { Check, CheckCheck } from 'lucide-react';

type MessageStatus = 'sent' | 'delivered' | 'read';

interface MessageStatusProps {
    status: MessageStatus;
    timestamp?: string;
}

export function MessageStatus({ status, timestamp }: MessageStatusProps) {
    const getStatusIcon = () => {
        switch (status) {
            case 'sent':
                return <Check className="w-4 h-4" />;
            case 'delivered':
                return <CheckCheck className="w-4 h-4" />;
            case 'read':
                return <CheckCheck className="w-4 h-4 text-blue-500" />;
        }
    };

    const getStatusColor = () => {
        return status === 'read' ? 'text-blue-500' : 'text-gray-400';
    };

    return (
        <div className="flex items-center gap-1">
            {timestamp && (
                <span className="text-xs opacity-70">
                    {new Date(timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
            )}
            <div className={getStatusColor()}>
                {getStatusIcon()}
            </div>
        </div>
    );
}

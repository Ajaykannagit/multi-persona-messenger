interface TypingIndicatorProps {
    userName?: string;
    compact?: boolean;
}

export function TypingIndicator({ userName, compact = false }: TypingIndicatorProps) {
    if (compact) {
        return (
            <div className="flex items-center gap-1 px-2 py-1">
                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg max-w-fit">
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-600">
                {userName ? `${userName} is typing...` : 'Typing...'}
            </span>
        </div>
    );
}

interface UnreadBadgeProps {
    count: number;
    size?: 'sm' | 'md' | 'lg';
    max?: number;
}

export function UnreadBadge({ count, size = 'md', max = 99 }: UnreadBadgeProps) {
    if (count <= 0) return null;

    const sizeClasses = {
        sm: 'min-w-[16px] h-4 text-[10px] px-1',
        md: 'min-w-[20px] h-5 text-xs px-1.5',
        lg: 'min-w-[24px] h-6 text-sm px-2',
    };

    const displayCount = count > max ? `${max}+` : count.toString();

    return (
        <div
            className={`${sizeClasses[size]} bg-red-500 text-white rounded-full flex items-center justify-center font-semibold`}
        >
            {displayCount}
        </div>
    );
}

import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface MessageSearchProps {
    onSearch: (query: string) => void;
    onClose: () => void;
    placeholder?: string;
}

export function MessageSearch({ onSearch, onClose, placeholder = 'Search messages...' }: MessageSearchProps) {
    const [query, setQuery] = useState('');

    const handleSearch = (value: string) => {
        setQuery(value);
        onSearch(value);
    };

    const handleClear = () => {
        setQuery('');
        onSearch('');
    };

    return (
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            <button
                onClick={onClose}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
            >
                Cancel
            </button>
        </div>
    );
}

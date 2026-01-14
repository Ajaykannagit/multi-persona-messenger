import { useState, useRef, useEffect } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { IGif } from '@giphy/js-types';
import { Image as ImageIcon, X, Search } from 'lucide-react';

// Note: Replace with your actual Giphy API key
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'demo';
const gf = new GiphyFetch(GIPHY_API_KEY);

interface GifPickerProps {
    onGifSelect: (gifUrl: string) => void;
    onClose: () => void;
}

export function GifPicker({ onGifSelect, onClose }: GifPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const fetchGifs = (offset: number) => {
        if (searchQuery) {
            return gf.search(searchQuery, { offset, limit: 10 });
        }
        return gf.trending({ offset, limit: 10 });
    };

    const handleGifClick = (gif: IGif, e: React.SyntheticEvent<HTMLElement, Event>) => {
        e.preventDefault();
        const gifUrl = gif.images.original.url;
        onGifSelect(gifUrl);
        onClose();
    };

    return (
        <div
            ref={pickerRef}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 w-96"
        >
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Choose a GIF</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="p-3 border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search GIFs..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="p-3 overflow-y-auto max-h-96">
                <Grid
                    key={searchQuery}
                    width={360}
                    columns={2}
                    gutter={6}
                    fetchGifs={fetchGifs}
                    onGifClick={handleGifClick}
                />
            </div>

            <div className="p-2 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">Powered by GIPHY</p>
            </div>
        </div>
    );
}

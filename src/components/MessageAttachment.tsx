import { useState } from 'react';
import { Download, FileText, Image as ImageIcon, Video, Music, File as FileIcon, X } from 'lucide-react';
import { isImageFile, isVideoFile, isAudioFile, formatFileSize, getFileIcon } from '../lib/fileService';

interface MessageAttachmentProps {
    fileUrl: string;
    fileType: string;
    fileName: string;
    fileSize?: number;
}

export function MessageAttachment({ fileUrl, fileType, fileName, fileSize }: MessageAttachmentProps) {
    const [showLightbox, setShowLightbox] = useState(false);

    const renderIcon = () => {
        const iconName = getFileIcon(fileType);
        const iconProps = { className: 'w-6 h-6' };

        switch (iconName) {
            case 'Image':
                return <ImageIcon {...iconProps} />;
            case 'Video':
                return <Video {...iconProps} />;
            case 'Music':
                return <Music {...iconProps} />;
            case 'FileText':
                return <FileText {...iconProps} />;
            default:
                return <FileIcon {...iconProps} />;
        }
    };

    if (isImageFile(fileType)) {
        return (
            <>
                <div
                    className="relative group cursor-pointer rounded-lg overflow-hidden max-w-sm"
                    onClick={() => setShowLightbox(true)}
                >
                    <img
                        src={fileUrl}
                        alt={fileName}
                        className="w-full h-auto max-h-96 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <Download className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                {showLightbox && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLightbox(false)}
                    >
                        <button
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                            onClick={() => setShowLightbox(false)}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={fileUrl}
                            alt={fileName}
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <a
                            href={fileUrl}
                            download={fileName}
                            className="absolute bottom-4 right-4 bg-white text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                    </div>
                )}
            </>
        );
    }

    if (isVideoFile(fileType)) {
        return (
            <div className="rounded-lg overflow-hidden max-w-sm">
                <video controls className="w-full">
                    <source src={fileUrl} type={fileType} />
                    Your browser does not support the video tag.
                </video>
            </div>
        );
    }

    if (isAudioFile(fileType)) {
        return (
            <div className="bg-gray-100 rounded-lg p-3 max-w-sm">
                <audio controls className="w-full">
                    <source src={fileUrl} type={fileType} />
                    Your browser does not support the audio tag.
                </audio>
                <p className="text-xs text-gray-600 mt-2">{fileName}</p>
            </div>
        );
    }

    // Default file display
    return (
        <a
            href={fileUrl}
            download={fileName}
            className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 rounded-lg p-3 max-w-sm transition-colors group"
        >
            <div className="p-2 bg-white rounded-lg text-gray-600">
                {renderIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                {fileSize && (
                    <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
                )}
            </div>
            <Download className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        </a>
    );
}

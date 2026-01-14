import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadFile, validateFile, createImageThumbnail, formatFileSize, isImageFile } from '../lib/fileService';

interface FileUploadProps {
    channelId: string;
    userId: string;
    onFileUploaded: (fileData: {
        url: string;
        type: string;
        name: string;
    }) => void;
    onCancel?: () => void;
}

export function FileUpload({ channelId, userId, onFileUploaded, onCancel }: FileUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setSelectedFile(file);

        // Create preview for images
        if (isImageFile(file.type)) {
            try {
                const thumbnail = await createImageThumbnail(file);
                setPreview(thumbnail);
            } catch (err) {
                console.error('Error creating thumbnail:', err);
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setError(null);

        try {
            const result = await uploadFile(
                selectedFile,
                channelId,
                userId,
                (progress) => setUploadProgress(progress)
            );

            onFileUploaded({
                url: result.url,
                type: result.type,
                name: result.name,
            });

            // Reset state
            setSelectedFile(null);
            setPreview(null);
            setUploadProgress(0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setPreview(null);
        setError(null);
        setUploadProgress(0);
        if (onCancel) onCancel();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            const fakeEvent = {
                target: { files: [file] },
            } as React.ChangeEvent<HTMLInputElement>;
            handleFileSelect(fakeEvent);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    if (selectedFile) {
        return (
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3">
                    {preview ? (
                        <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded" />
                    ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>

                        {uploading && (
                            <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                        )}
                    </div>

                    <button
                        onClick={handleCancel}
                        disabled={uploading}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Upload
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={uploading}
                        className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
        >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
                Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
                Images, documents, videos (max 50MB)
            </p>
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/*,audio/*"
            />
        </div>
    );
}

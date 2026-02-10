// ImageCropModal.tsx - Profile Photo Cropper
import { useState, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCcw } from 'lucide-react';

interface ImageCropModalProps {
    imageSrc: string;
    onClose: () => void;
    onCropComplete: (croppedImage: Blob) => void;
    cropShape?: 'round' | 'rect'; // Default: 'round' for profile, 'rect' for goals
}

// Helper function to create cropped image
const createCroppedImage = async (
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    // Set canvas size to desired crop size
    canvas.width = 256;
    canvas.height = 256;

    // Draw cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        256,
        256
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create blob'));
            },
            'image/png',
            1
        );
    });
};

const ImageCropModal = memo(({ imageSrc, onClose, onCropComplete, cropShape = 'round' }: ImageCropModalProps) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropChange = useCallback((newCrop: { x: number; y: number }) => {
        setCrop(newCrop);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropAreaComplete = useCallback(
        (_: unknown, croppedPixels: { x: number; y: number; width: number; height: number }) => {
            setCroppedAreaPixels(croppedPixels);
        },
        []
    );

    const handleConfirm = useCallback(async () => {
        if (!croppedAreaPixels) return;

        setProcessing(true);
        try {
            const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);
            onCropComplete(croppedBlob);
        } catch (error) {
            console.error('Failed to crop image:', error);
        } finally {
            setProcessing(false);
        }
    }, [imageSrc, croppedAreaPixels, onCropComplete]);

    const handleReset = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-[90vw] max-w-md bg-[rgba(5,10,20,0.98)] rounded-2xl border border-[var(--neptune-primary-dim)] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.1)]">
                    <h3 className="text-lg font-display font-bold text-white">Crop Photo</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--neptune-text-secondary)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative h-[300px] bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape={cropShape}
                        showGrid={false}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropAreaComplete}
                    />
                </div>

                {/* Zoom Slider */}
                <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.1)]">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--neptune-text-muted)]">Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.1)] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--neptune-primary)]"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 border-t border-[rgba(255,255,255,0.1)]">
                    <button
                        onClick={handleReset}
                        className="flex-1 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[var(--neptune-text-secondary)] hover:bg-[rgba(255,255,255,0.05)] transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={processing}
                        className="flex-1 py-2.5 rounded-lg bg-[rgba(30,60,100,0.8)] hover:bg-[rgba(40,80,130,0.9)] text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Check size={16} />
                        {processing ? 'Processing...' : 'Apply'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
});

ImageCropModal.displayName = 'ImageCropModal';

export default ImageCropModal;

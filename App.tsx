
import React, { useState, useRef, useEffect, useCallback } from 'react';

// Helper function to convert hex color to an RGB object
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Icon Component defined outside the main component to prevent re-creation
const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);


const App: React.FC = () => {
    const [selectedColor, setSelectedColor] = useState<string>('#4ade80'); // Default: Tailwind's lime-400
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processImage = useCallback(() => {
        if (!originalImage || !canvasRef.current) return;

        setIsLoading(true);
        setError(null);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const newColorRgb = hexToRgb(selectedColor);

        if (!ctx || !newColorRgb) {
            setError('Invalid color format.');
            setIsLoading(false);
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha > 0) { // If pixel is not fully transparent
                        const r_old = data[i];
                        const g_old = data[i + 1];
                        const b_old = data[i + 2];

                        // Calculate luminance of the original pixel (0-255).
                        const luminance = (0.299 * r_old + 0.587 * g_old + 0.114 * b_old);

                        // Use the inverse of the normalized luminance as the intensity for the new color.
                        // This makes dark pixels in the original image take on the new color more strongly.
                        const intensity = 1 - (luminance / 255);

                        // Blend the new color with white based on the calculated intensity.
                        // This preserves the original shading.
                        data[i] = newColorRgb.r * intensity + 255 * (1 - intensity);     // Red
                        data[i + 1] = newColorRgb.g * intensity + 255 * (1 - intensity); // Green
                        data[i + 2] = newColorRgb.b * intensity + 255 * (1 - intensity); // Blue
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                setProcessedImage(dataUrl);

            } catch (e) {
                 setError('Could not process the image. Please ensure it is a valid PNG file.');
                 console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        
        img.onerror = () => {
            setError('Failed to load the image. It might be an invalid format.');
            setIsLoading(false);
        };

        img.src = originalImage;
    }, [originalImage, selectedColor]);

    useEffect(() => {
        if (originalImage) {
            processImage();
        }
    }, [processImage, originalImage]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'image/png') {
            setError(null);
            const reader = new FileReader();
            reader.onload = (event) => {
                setOriginalImage(event.target?.result as string);
                setProcessedImage(null); // Clear previous result to trigger re-processing
            };
            reader.onerror = () => {
                setError("Failed to read the file.");
            }
            reader.readAsDataURL(file);
        } else {
            setError('Please upload a valid PNG file.');
            setOriginalImage(null);
            setProcessedImage(null);
        }
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedColor(e.target.value);
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">PNG Color <span style={{color: selectedColor}} className="transition-colors duration-300">Changer</span></h1>
                    <p className="text-gray-400 mt-2">Upload a PNG and instantly recolor it while preserving details.</p>
                </header>

                <main className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <h2 className="text-2xl font-semibold text-white">Controls</h2>
                            <p className="text-sm text-gray-400 text-center">First, upload a PNG file. Then, pick a new color.</p>
                            
                            <input
                                type="file"
                                accept="image/png"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                aria-label="Upload PNG file"
                            />
                            
                            <button
                                onClick={triggerFileSelect}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg"
                            >
                                <UploadIcon/>
                                {originalImage ? 'Change PNG File' : 'Upload PNG File'}
                            </button>

                            <div className="w-full flex items-center space-x-4 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                                <label htmlFor="color-picker" className="font-medium text-white">New Color:</label>
                                <input
                                    id="color-picker"
                                    type="color"
                                    value={selectedColor}
                                    onChange={handleColorChange}
                                    className="w-14 h-10 p-1 bg-transparent border-none rounded-md cursor-pointer"
                                    title="Select a color"
                                />
                                <span className="font-mono text-lg text-gray-300">{selectedColor.toUpperCase()}</span>
                            </div>
                            {error && <p className="text-red-400 text-sm mt-2 animate-pulse">{error}</p>}
                        </div>

                        <div className="bg-gray-900/70 rounded-lg p-4 h-80 flex items-center justify-center border-2 border-dashed border-gray-600 relative overflow-hidden">
                            {isLoading ? (
                                <div className="flex flex-col items-center" aria-live="polite">
                                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-2 text-gray-400">Processing...</p>
                                </div>
                            ) : processedImage ? (
                                <img id="result" src={processedImage} alt="Processed result" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="mt-2">Your result will appear here.</p>
                                    <p className="text-sm">Upload a PNG to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            <canvas ref={canvasRef} className="hidden" aria-hidden="true"></canvas>
            <footer className="text-center mt-8 text-gray-500 text-sm">
                <p>Designed and built for a superior user experience.</p>
            </footer>
        </div>
    );
};

export default App;

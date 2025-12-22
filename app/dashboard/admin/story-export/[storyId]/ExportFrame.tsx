'use client';

import { useState, useRef } from 'react';
import { Download, Eye, EyeOff } from 'lucide-react';

interface Frame {
  type: 'cover' | 'scene';
  index?: number;
  imageUrl?: string;
  text?: string;
  title?: string;
}

interface ExportFrameProps {
  frame: Frame;
  frameNumber: number;
}

export default function ExportFrame({ frame, frameNumber }: ExportFrameProps) {
  const [showText, setShowText] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!frame.imageUrl) return;

    setIsDownloading(true);
    try {
      // Load the original image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = frame.imageUrl!;
      });

      // Create canvas with image dimensions (preserve original quality)
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Failed to get canvas context');

      // Draw the original image at full resolution
      ctx.drawImage(img, 0, 0);

      // Add text overlay if enabled
      if (showText && (frame.title || frame.text)) {
        // Add semi-transparent background for text readability
        const padding = img.width * 0.05;
        const textAreaHeight = img.height * 0.25;

        if (frame.type === 'scene' && frame.text) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, img.height - textAreaHeight - padding, img.width, textAreaHeight + padding);
        }

        // Set text properties
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        if (frame.type === 'cover' && frame.title) {
          const fontSize = img.width * 0.03;
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 15;

          // Word wrap for title
          const words = frame.title.split(' ');
          const lines: string[] = [];
          let currentLine = words[0];

          for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > img.width * 0.8) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);

          const lineHeight = fontSize * 1.2;
          const startY = img.height - padding - (lines.length - 1) * lineHeight;
          lines.forEach((line, i) => {
            ctx.fillText(line, img.width / 2, startY + i * lineHeight);
          });
        } else if (frame.type === 'scene' && frame.text) {
          const fontSize = img.width * 0.0175;
          ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 10;

          // Word wrap for paragraph
          const words = frame.text.split(' ');
          const lines: string[] = [];
          let currentLine = words[0];
          const maxWidth = img.width * 0.85;

          for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);

          const lineHeight = fontSize * 1.4;
          const startY = img.height - padding - (lines.length - 1) * lineHeight;
          lines.forEach((line, i) => {
            ctx.fillText(line, img.width / 2, startY + i * lineHeight);
          });
        }
      }

      // Download
      const link = document.createElement('a');
      const filename = frame.type === 'cover'
        ? `cover-${frameNumber}.png`
        : `scene-${frame.index! + 1}-frame-${frameNumber}.png`;

      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download frame. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
      {/* Frame Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {frame.type === 'cover' ? 'Cover Frame' : `Scene ${(frame.index || 0) + 1}`}
          </h3>
          <p className="text-sm text-gray-600">
            Frame #{frameNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowText(!showText)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            {showText ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Text
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Text
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>

      {/* Frame Display - 4:5 Aspect Ratio */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div
          ref={frameRef}
          className="relative w-full"
          style={{ aspectRatio: '4/5' }}
        >
          {/* Background Image */}
          {frame.imageUrl && (
            <img
              src={frame.imageUrl}
              alt={frame.type === 'cover' ? 'Cover' : `Scene ${(frame.index || 0) + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          )}

          {/* Text Overlay */}
          {showText && (frame.title || frame.text) && (
            <div className="absolute inset-0 flex items-end p-8">
              <div className="w-full">
                {frame.type === 'cover' && frame.title && (
                  <h2 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center leading-tight">
                    {frame.title}
                  </h2>
                )}
                {frame.type === 'scene' && frame.text && (
                  <p className="text-base text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-relaxed bg-black/30 backdrop-blur-sm p-6 rounded-xl">
                    {frame.text}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Frame Info */}
      {frame.text && frame.type === 'scene' && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 leading-relaxed">
            {frame.text}
          </p>
        </div>
      )}
    </div>
  );
}

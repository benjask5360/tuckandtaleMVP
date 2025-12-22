'use client';

import { useState, useRef } from 'react';
import { Download, Eye, EyeOff, Edit2, Save, X, User } from 'lucide-react';

interface Frame {
  type: 'cover' | 'scene';
  index?: number;
  imageUrl?: string;
  text?: string;
  title?: string;
  characterAvatarUrl?: string;
}

interface ExportFrameProps {
  frame: Frame;
  frameNumber: number;
  canEdit?: boolean;
  storyId?: string;
  onUpdate?: (type: 'title' | 'sceneText', value: string, sceneIndex?: number) => Promise<void>;
}

export default function ExportFrame({ frame, frameNumber, canEdit = false, storyId, onUpdate }: ExportFrameProps) {
  const [showText, setShowText] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const handleEdit = () => {
    setEditValue(frame.type === 'cover' ? frame.title || '' : frame.text || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!onUpdate || !storyId) return;

    setIsSaving(true);
    try {
      if (frame.type === 'cover') {
        await onUpdate('title', editValue);
      } else {
        await onUpdate('sceneText', editValue, frame.index);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

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

      // Use edited values if in edit mode, otherwise use frame values
      const displayTitle = isEditing && frame.type === 'cover' ? editValue : frame.title;
      const displayText = isEditing && frame.type === 'scene' ? editValue : frame.text;

      // Add text overlay if enabled
      if (showText && (displayTitle || displayText)) {
        // Add semi-transparent background for text readability
        const padding = img.width * 0.05;
        const textAreaHeight = img.height * 0.25;

        if (frame.type === 'scene' && displayText) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, img.height - textAreaHeight - padding, img.width, textAreaHeight + padding);
        }

        // Set text properties
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        if (frame.type === 'cover' && displayTitle) {
          const fontSize = img.width * 0.03;
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 15;

          // Word wrap for title
          const words = displayTitle.split(' ');
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
        } else if (frame.type === 'scene' && displayText) {
          const fontSize = img.width * 0.0175;
          ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 10;

          // Word wrap for paragraph
          const words = displayText.split(' ');
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

      // Add character avatar to cover if enabled
      if (frame.type === 'cover' && showAvatar && frame.characterAvatarUrl) {
        try {
          const avatarImg = new Image();
          avatarImg.crossOrigin = 'anonymous';

          await new Promise((resolve, reject) => {
            avatarImg.onload = resolve;
            avatarImg.onerror = reject;
            avatarImg.src = frame.characterAvatarUrl!;
          });

          // Calculate avatar size and position (bottom-right corner)
          const avatarSize = img.width * 0.12; // 12% of image width
          const margin = img.width * 0.025; // 2.5% margin
          const avatarX = img.width - avatarSize - margin;
          const avatarY = img.height - avatarSize - margin;

          // Draw white circle background
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, (avatarSize / 2) + 8, 0, Math.PI * 2);
          ctx.fill();

          // Clip to circle for avatar
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
          ctx.restore();

          // Draw white border around avatar
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.stroke();
        } catch (error) {
          console.error('Failed to load avatar:', error);
          // Continue with download even if avatar fails
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
          {canEdit && !isEditing && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
          {!isEditing && (
            <>
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
              {frame.type === 'cover' && frame.characterAvatarUrl && (
                <button
                  onClick={() => setShowAvatar(!showAvatar)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  {showAvatar ? (
                    <>
                      <User className="w-4 h-4" />
                      Hide Avatar
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      Show Avatar
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Frame Display */}
      {frame.type === 'cover' ? (
        /* Cover Frame - Image + Title Below with White Border */
        <div className="bg-white rounded-2xl shadow-md overflow-hidden p-6">
          <div ref={frameRef} className="w-full">
            {/* Image Container with Avatar */}
            <div className="relative">
              {frame.imageUrl && (
                <img
                  src={frame.imageUrl}
                  alt="Cover"
                  className="w-full h-auto rounded-2xl"
                  crossOrigin="anonymous"
                />
              )}
              {/* Character Avatar Circle - Bottom Right */}
              {showAvatar && frame.characterAvatarUrl && (
                <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                  <img
                    src={frame.characterAvatarUrl}
                    alt="Character"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
            </div>
            {/* Title Below */}
            {showText && (
              <div className="pt-4 pb-6 px-6">
                {isEditing ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full text-4xl font-bold text-gray-800 text-center leading-tight bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter title..."
                  />
                ) : (
                  <h2 className="text-4xl font-bold text-gray-800 text-center leading-tight">
                    {frame.title}
                  </h2>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Scene Frame - 4:5 with text overlay and White Border */
        <div className="bg-white rounded-2xl shadow-md overflow-hidden p-8">
          <div
            ref={frameRef}
            className="relative w-full bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] overflow-hidden"
            style={{ aspectRatio: '4/5' }}
          >
            {/* Background Image */}
            {frame.imageUrl && (
              <img
                src={frame.imageUrl}
                alt={`Scene ${(frame.index || 0) + 1}`}
                className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                crossOrigin="anonymous"
              />
            )}

            {/* Text Overlay */}
            {showText && (
              <div className="absolute inset-0 flex items-end p-8">
                <div className="w-full">
                  {isEditing ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      className="w-full text-base text-gray-800 leading-relaxed bg-white border border-gray-300 rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Enter scene text..."
                    />
                  ) : (
                    <p className="text-base text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-relaxed bg-black/30 backdrop-blur-sm p-6 rounded-2xl">
                      {frame.text}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

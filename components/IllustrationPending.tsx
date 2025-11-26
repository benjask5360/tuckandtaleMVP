/**
 * IllustrationPending Component
 * Displays a delightful pending state while story illustrations are being generated
 * With rotating messages and progress indication
 */

'use client';

import { Sparkles, Palette, Wand2, Stars } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IllustrationPendingProps {
  type?: 'cover' | 'scene';
  sceneNumber?: number;
  totalScenes?: number;
  className?: string;
}

export function IllustrationPending({
  type = 'scene',
  sceneNumber,
  totalScenes = 8,
  className = ''
}: IllustrationPendingProps) {
  // Rotating messages for delightful waiting experience
  const messages = type === 'cover' ? [
    'Creating your magical cover...',
    'Adding sparkles of wonder...',
    'Bringing your story to life...',
    'Painting the perfect scene...',
  ] : [
    'Painting the magic...',
    'Bringing characters to life...',
    'Adding colors to your imagination...',
    'Creating something wonderful...',
    'Weaving visual storytelling...',
    'Illustrating your adventure...',
  ];

  const [messageIndex, setMessageIndex] = useState(0);
  const [iconRotation, setIconRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
      setIconRotation((prev) => (prev + 1) % 4);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  const message = messages[messageIndex];

  // Rotating icons for visual variety
  const icons = [Sparkles, Palette, Wand2, Stars];
  const Icon = icons[iconRotation];

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, #fef9f3 0%, #fff5eb 50%, #fef3e8 100%)',
        minHeight: type === 'cover' ? '400px' : '300px',
      }}
    >
      {/* Ambient glow effect */}
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 147, 0.3) 0%, transparent 70%)',
      }}></div>

      {/* More floating sparkles for extra magic */}
      <div className="absolute top-1/4 left-1/4">
        <Sparkles className="w-6 h-6 text-amber-400/60" style={{
          animation: 'floatSparkle 3s ease-in-out infinite',
        }} />
      </div>
      <div className="absolute top-1/3 right-1/4">
        <Stars className="w-5 h-5 text-rose-400/50" style={{
          animation: 'floatSparkle 3s ease-in-out infinite 1s',
        }} />
      </div>
      <div className="absolute bottom-1/4 right-1/3">
        <Wand2 className="w-4 h-4 text-purple-400/40" style={{
          animation: 'floatSparkle 3s ease-in-out infinite 2s',
        }} />
      </div>
      <div className="absolute bottom-1/3 left-1/3">
        <Palette className="w-5 h-5 text-blue-400/40" style={{
          animation: 'floatSparkle 3s ease-in-out infinite 0.5s',
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Pulsing loader with glow and changing icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-amber-300/30 rounded-full blur-xl" style={{
            animation: 'gentlePulse 2s ease-in-out infinite',
          }}></div>
          <Icon className="w-16 h-16 text-amber-500 relative z-10" style={{
            animation: 'gentlePulse 2s ease-in-out infinite, iconSpin 8s linear infinite',
            filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))',
          }} />
        </div>

        {/* Message text with fade transition */}
        <p
          className="text-lg font-semibold text-center mb-2 text-amber-900 transition-opacity duration-500"
          style={{
            fontFamily: 'Nunito Sans, sans-serif',
            opacity: messageIndex === 0 ? 1 : 0.95,
          }}
        >
          {message}
        </p>

        {/* Encouraging subtitle */}
        <p className="text-xs text-amber-600/70 font-medium">
          This magic takes just a moment...
        </p>
      </div>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes floatSparkle {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0.4;
          }
          25% {
            transform: translateY(-15px) rotate(90deg) scale(1.1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-20px) rotate(180deg) scale(1);
            opacity: 1;
          }
          75% {
            transform: translateY(-10px) rotate(270deg) scale(0.9);
            opacity: 0.7;
          }
        }

        @keyframes gentlePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.85;
          }
        }

        @keyframes iconSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeMessage {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
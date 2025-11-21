/**
 * IllustrationPending Component
 * Displays a friendly pending state while story illustrations are being generated
 * Similar to avatar generation experience
 */

'use client';

import { Sparkles } from 'lucide-react';

interface IllustrationPendingProps {
  type?: 'cover' | 'scene';
  className?: string;
}

export function IllustrationPending({ type = 'scene', className = '' }: IllustrationPendingProps) {
  const message = type === 'cover'
    ? 'Your magical cover illustration is being created...'
    : 'Your magical illustration is being created...';

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

      {/* Floating sparkles */}
      <div className="absolute top-1/4 left-1/4">
        <Sparkles className="w-6 h-6 text-amber-400/60" style={{
          animation: 'floatSparkle 3s ease-in-out infinite',
        }} />
      </div>
      <div className="absolute top-1/3 right-1/4">
        <Sparkles className="w-5 h-5 text-rose-400/50" style={{
          animation: 'floatSparkle 3s ease-in-out infinite 1s',
        }} />
      </div>
      <div className="absolute bottom-1/4 right-1/3">
        <Sparkles className="w-4 h-4 text-purple-400/40" style={{
          animation: 'floatSparkle 3s ease-in-out infinite 2s',
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Pulsing loader with glow */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-amber-300/30 rounded-full blur-xl" style={{
            animation: 'gentlePulse 2s ease-in-out infinite',
          }}></div>
          <Sparkles className="w-16 h-16 text-amber-500 relative z-10" style={{
            animation: 'gentlePulse 2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))',
          }} />
        </div>

        {/* Message text */}
        <p className="text-lg font-semibold text-center mb-2 text-amber-900" style={{
          fontFamily: 'Nunito Sans, sans-serif',
        }}>
          {message}
        </p>

        {/* Encouraging subtitle */}
        <p className="text-sm text-amber-700/80 font-medium">
          This should only take a moment...
        </p>
      </div>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes floatSparkle {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
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
      `}</style>
    </div>
  );
}

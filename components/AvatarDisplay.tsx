/**
 * AvatarDisplay Component
 * Displays character avatar with generation/regeneration functionality
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, RefreshCw, User, Sparkles } from 'lucide-react';

interface RegenerationStatus {
  used: number;
  limit: number;
  remaining: number;
  resetsInDays: number;
  lastConfigUsed?: string;
}

interface AvatarDisplayProps {
  characterId?: string;
  currentAvatarUrl?: string | null;
  profileType: 'child' | 'storybook_character' | 'pet' | 'magical_creature';
  onAvatarGenerated?: (avatarUrl: string, avatarCacheId?: string) => void;
  isNew?: boolean; // Is this a new character being created?
  previewMode?: boolean; // Generate without character ID (preview)
  formData?: Record<string, any>; // Form data for preview generation
  calculatedAge?: number | null; // Calculated age for child characters
}

type GenerationState = 'idle' | 'generating' | 'polling' | 'complete' | 'error';

export function AvatarDisplay({
  characterId,
  currentAvatarUrl,
  profileType,
  onAvatarGenerated,
  isNew = false,
  previewMode = false,
  formData,
  calculatedAge,
}: AvatarDisplayProps) {
  const [state, setState] = useState<GenerationState>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [regenerationStatus, setRegenerationStatus] = useState<RegenerationStatus | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [avatarCacheId, setAvatarCacheId] = useState<string | null>(null);

  /**
   * Sanitize error messages to be user-friendly
   */
  const sanitizeErrorMessage = (error: string): string => {
    // Check for inappropriate content flags from Leonardo
    if (error.toLowerCase().includes('inappropriate') ||
        error.toLowerCase().includes('moderation') ||
        error.toLowerCase().includes('content policy') ||
        error.toLowerCase().includes('nsfw') ||
        error.toLowerCase().includes('adult content') ||
        error.toLowerCase().includes('violated') ||
        error.toLowerCase().includes('flagged')) {
      return 'Avatar generation failed. Please try again with a different character description.';
    }

    // Check for Leonardo API errors
    if (error.toLowerCase().includes('leonardo')) {
      return 'Avatar generation service is temporarily unavailable. Please try again.';
    }

    // Generic fallback for other errors
    return 'Something went wrong generating the avatar. Please try again.';
  };
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Update avatar URL when currentAvatarUrl prop changes
  useEffect(() => {
    if (currentAvatarUrl) {
      setAvatarUrl(currentAvatarUrl);
    }
  }, [currentAvatarUrl]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  /**
   * Start avatar generation
   */
  const generateAvatar = async () => {
    try {
      setState('generating');
      setProgress(0);
      setMessage('Starting avatar generation...');
      setErrorMessage('');

      let response;
      let data;

      if (previewMode && !characterId) {
        // Preview mode - generate without character ID
        response = await fetch('/api/avatars/generate-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profileType,
            attributes: {
              age: calculatedAge ?? formData?.age,
              gender: formData?.gender,
              hairColor: formData?.hairColor,
              hairLength: formData?.hairLength,
              hairType: formData?.hairType,
              eyeColor: formData?.eyeColor,
              skinTone: formData?.skinTone,
              bodyType: formData?.bodyType,
              hasGlasses: formData?.hasGlasses,
              primaryColor: formData?.primaryColor,
              species: formData?.species,
              breed: formData?.breed,
              creatureType: formData?.creatureType,
              color: formData?.color, // Magical creature color
            },
          }),
        });

        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate preview avatar');
        }

        setGenerationId(data.generationId);
        setAvatarCacheId(data.avatarCacheId);
        setMessage('Painting your character...');
        setProgress(10);

        // Start polling for preview status
        startPreviewPolling(data.generationId);
      } else if (characterId) {
        // Edit mode with unsaved changes - use current form data
        // This ensures regeneration uses the latest form values, not saved DB values
        // We're in edit mode if we have both characterId AND formData
        if (formData) {
          response = await fetch('/api/avatars/generate-preview', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              profileType: profileType,
              attributes: {
                age: formData?.age,
                gender: formData?.gender,
                hairColor: formData?.hairColor,
                hairLength: formData?.hairLength,
                hairType: formData?.hairType,
                eyeColor: formData?.eyeColor,
                skinTone: formData?.skinTone,
                bodyType: formData?.bodyType,
                hasGlasses: formData?.hasGlasses,
                primaryColor: formData?.primaryColor,
                species: formData?.species,
                breed: formData?.breed,
                creatureType: formData?.creatureType,
                color: formData?.color, // Magical creature color
              },
            }),
          });

          data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to generate avatar');
          }

          setGenerationId(data.generationId);
          setAvatarCacheId(data.avatarCacheId);
          setMessage('Painting your character...');
          setProgress(10);

          // Start polling for preview status (not regular status)
          startPreviewPolling(data.generationId);
        } else {
          // Normal mode - character already saved, no formData means viewing only
          response = await fetch(`/api/characters/${characterId}/generate-avatar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              regenerate: !!avatarUrl,
            }),
          });

          data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to generate avatar');
          }

          setGenerationId(data.generationId);
          setRegenerationStatus(data.regenerationStatus);
          setMessage('Painting your character...');
          setProgress(10);

          // Start polling for status
          startPolling(data.generationId);
        }
      } else {
        throw new Error('Either characterId or preview mode with formData is required');
      }
    } catch (error: any) {
      console.error('Avatar generation error:', error);
      setState('error');
      setErrorMessage(sanitizeErrorMessage(error.message || 'Failed to generate avatar'));
      setMessage('');
      setProgress(0);
    }
  };

  /**
   * Poll for generation status
   */
  const startPolling = (genId: string) => {
    setState('polling');
    let pollCount = 0;
    const maxPolls = 30; // 60 seconds max

    const interval = setInterval(async () => {
      pollCount++;

      // Update progress based on poll count
      const progressValue = Math.min(90, 10 + (pollCount / maxPolls) * 80);
      setProgress(progressValue);

      // Update message based on time elapsed
      if (pollCount < 5) {
        setMessage('Painting your character...');
      } else if (pollCount < 10) {
        setMessage('Adding magical details...');
      } else if (pollCount < 20) {
        setMessage('Almost ready...');
      } else {
        setMessage('Putting on finishing touches...');
      }

      try {
        const response = await fetch(
          `/api/characters/${characterId}/generate-avatar?generationId=${genId}`
        );

        const data = await response.json();

        if (data.status === 'complete') {
          // Success!
          clearInterval(interval);
          setState('idle');
          setAvatarUrl(data.imageUrl);
          setProgress(100);
          setMessage('');

          if (onAvatarGenerated) {
            onAvatarGenerated(data.imageUrl, avatarCacheId || undefined);
          }
        } else if (data.status === 'failed') {
          // Failed
          clearInterval(interval);
          setState('error');
          setErrorMessage(sanitizeErrorMessage(data.error || 'Generation failed'));
          setMessage('');
          setProgress(0);
        }

        // Continue polling if still processing
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling unless we've exceeded max attempts
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setState('error');
          setErrorMessage(sanitizeErrorMessage('Generation timed out. Please try again.'));
          setMessage('');
          setProgress(0);
        }
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  };

  /**
   * Poll for preview generation status
   */
  const startPreviewPolling = (genId: string) => {
    setState('polling');
    let pollCount = 0;
    const maxPolls = 30; // 60 seconds max

    const interval = setInterval(async () => {
      pollCount++;

      // Update progress based on poll count
      const progressValue = Math.min(90, 10 + (pollCount / maxPolls) * 80);
      setProgress(progressValue);

      // Update message based on time elapsed
      if (pollCount < 5) {
        setMessage('Painting your character...');
      } else if (pollCount < 10) {
        setMessage('Adding magical details...');
      } else if (pollCount < 20) {
        setMessage('Almost ready...');
      } else {
        setMessage('Putting on finishing touches...');
      }

      try {
        const response = await fetch(
          `/api/avatars/generate-preview?generationId=${genId}`
        );

        const data = await response.json();

        if (data.status === 'complete') {
          // Success!
          clearInterval(interval);
          setState('idle');
          setAvatarUrl(data.imageUrl);
          setProgress(100);
          setMessage('');

          if (onAvatarGenerated) {
            onAvatarGenerated(data.imageUrl, data.avatarCacheId);
          }
        } else if (data.status === 'failed') {
          // Failed
          clearInterval(interval);
          setState('error');
          setErrorMessage(sanitizeErrorMessage(data.error || 'Generation failed'));
          setMessage('');
          setProgress(0);
        }

        // Continue polling if still processing
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling unless we've exceeded max attempts
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setState('error');
          setErrorMessage(sanitizeErrorMessage('Generation timed out. Please try again.'));
          setMessage('');
          setProgress(0);
        }
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  };

  /**
   * Format regeneration limit message
   */
  const formatLimitMessage = useCallback(() => {
    if (!regenerationStatus) return '';

    if (regenerationStatus.remaining === 0) {
      return `Monthly limit reached. Resets in ${regenerationStatus.resetsInDays} day${
        regenerationStatus.resetsInDays !== 1 ? 's' : ''
      }`;
    }

    if (regenerationStatus.remaining === 1) {
      return 'You can regenerate 1 more time this month';
    }

    return `You can regenerate ${regenerationStatus.remaining} more times this month`;
  }, [regenerationStatus]);

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Avatar Display Area - Only show if avatar exists or currently generating */}
      {(avatarUrl || state === 'generating' || state === 'polling') && (
        <div className="relative w-48 h-72 rounded-xl overflow-hidden border-2" style={{
          borderColor: '#f5f5f4',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        }}>
          {avatarUrl ? (
            <>
              <Image
                src={avatarUrl}
                alt="Character avatar"
                fill
                className="object-contain"
                priority
              />
              {/* Show pending indicator if avatar is newly generated */}
              {avatarUrl !== currentAvatarUrl && state !== 'generating' && state !== 'polling' && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-lg">
                  Pending
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, #fef9f3 0%, #fff5eb 50%, #fef3e8 100%)',
            }}>
              {/* Ambient glow effect */}
              <div className="absolute inset-0 opacity-30" style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 147, 0.3) 0%, transparent 70%)',
              }}></div>

              {/* Floating sparkles */}
              <div className="absolute top-1/4 left-1/4">
                <Sparkles className="w-5 h-5 text-amber-400/60" style={{
                  animation: 'floatSparkle 3s ease-in-out infinite',
                }} />
              </div>
              <div className="absolute top-1/3 right-1/4">
                <Sparkles className="w-4 h-4 text-rose-400/50" style={{
                  animation: 'floatSparkle 3s ease-in-out infinite 1s',
                }} />
              </div>

              {/* Main content */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Pulsing loader with glow */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-amber-300/30 rounded-full blur-xl" style={{
                    animation: 'gentlePulse 2s ease-in-out infinite',
                  }}></div>
                  <Sparkles className="w-14 h-14 text-amber-500 relative z-10" style={{
                    animation: 'gentlePulse 2s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))',
                  }} />
                </div>

                {/* Message text */}
                <p className="text-base font-semibold text-center px-4 mb-3 text-amber-900" style={{
                  fontFamily: 'Nunito Sans, sans-serif',
                }}>
                  {message}
                </p>

                {/* Magical progress bar */}
                <div className="w-36 h-2.5 bg-white/60 rounded-full shadow-inner overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #fbbf93 0%, #f59e0b 50%, #fb923c 100%)',
                      boxShadow: '0 0 12px rgba(251, 191, 147, 0.6)',
                    }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-60" style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s linear infinite',
                    }}></div>
                  </div>

                  {/* Sparkle trail on progress bar */}
                  {progress > 0 && (
                    <Sparkles className="w-3 h-3 text-amber-400 absolute top-1/2 -translate-y-1/2" style={{
                      left: `${Math.min(progress, 95)}%`,
                      filter: 'drop-shadow(0 0 4px rgba(251, 191, 147, 0.8))',
                      transition: 'left 0.7s ease-out',
                    }} />
                  )}
                </div>

                {/* Encouraging subtitle */}
                <p className="text-xs text-amber-700/80 mt-3 font-medium">
                  Sprinkling some magic...
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

                @keyframes shimmer {
                  0% {
                    background-position: -200% center;
                  }
                  100% {
                    background-position: 200% center;
                  }
                }
              `}</style>
            </div>
          )}
        </div>
      )}

      {/* Success/Error Messages */}
      {message && state === 'complete' && (
        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Pending Avatar Message */}
      {avatarUrl && avatarUrl !== currentAvatarUrl && state !== 'generating' && state !== 'polling' && (
        <div className="text-sm text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
          Click "Update Profile" to save this avatar
        </div>
      )}

      {/* Generation/Regeneration Button */}
      {state !== 'generating' && state !== 'polling' && (
        <div className="w-full space-y-2">
          <button
            onClick={generateAvatar}
            disabled={!!(regenerationStatus && regenerationStatus.remaining === 0)}
            className="w-full px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {avatarUrl ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate Avatar
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Avatar
              </>
            )}
          </button>

          {/* Regeneration Limit Info */}
          {regenerationStatus && (
            <p className="text-xs text-muted-foreground text-center">
              {formatLimitMessage()}
            </p>
          )}

          {/* Model Info */}
          {regenerationStatus?.lastConfigUsed && (
            <p className="text-xs text-muted-foreground text-center">
              Generated with: {regenerationStatus.lastConfigUsed.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      )}

      {/* Loading State Button */}
      {(state === 'generating' || state === 'polling') && (
        <button
          disabled
          className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-md cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </button>
      )}
    </div>
  );
}
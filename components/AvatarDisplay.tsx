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
  characterId: string;
  currentAvatarUrl?: string;
  profileType: 'child' | 'storybook_character' | 'pet' | 'magical_creature';
  onAvatarGenerated?: (avatarUrl: string) => void;
  isNew?: boolean; // Is this a new character being created?
}

type GenerationState = 'idle' | 'generating' | 'polling' | 'complete' | 'error';

export function AvatarDisplay({
  characterId,
  currentAvatarUrl,
  profileType,
  onAvatarGenerated,
  isNew = false,
}: AvatarDisplayProps) {
  const [state, setState] = useState<GenerationState>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [regenerationStatus, setRegenerationStatus] = useState<RegenerationStatus | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

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

      // Call generation API
      const response = await fetch(`/api/characters/${characterId}/generate-avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regenerate: !!avatarUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate avatar');
      }

      setGenerationId(data.generationId);
      setRegenerationStatus(data.regenerationStatus);
      setMessage('Generating your unique avatar...');
      setProgress(10);

      // Start polling for status
      startPolling(data.generationId);
    } catch (error: any) {
      console.error('Avatar generation error:', error);
      setState('error');
      setErrorMessage(error.message || 'Failed to generate avatar');
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
        setMessage('Generating your unique avatar...');
      } else if (pollCount < 10) {
        setMessage('Adding finishing touches...');
      } else if (pollCount < 20) {
        setMessage('Almost ready...');
      } else {
        setMessage('This is taking a bit longer than usual...');
      }

      try {
        const response = await fetch(
          `/api/characters/${characterId}/generate-avatar?generationId=${genId}`
        );

        const data = await response.json();

        if (data.status === 'complete') {
          // Success!
          clearInterval(interval);
          setState('complete');
          setAvatarUrl(data.imageUrl);
          setProgress(100);
          setMessage('Avatar generated successfully!');

          if (onAvatarGenerated) {
            onAvatarGenerated(data.imageUrl);
          }

          // Clear success message after 3 seconds
          setTimeout(() => {
            setMessage('');
          }, 3000);
        } else if (data.status === 'failed') {
          // Failed
          clearInterval(interval);
          setState('error');
          setErrorMessage(data.error || 'Generation failed');
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
          setErrorMessage('Generation timed out. Please try again.');
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
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display Area */}
      <div className="relative w-48 h-64 bg-muted rounded-lg overflow-hidden border-2 border-border">
        {avatarUrl ? (
          <>
            <Image
              src={avatarUrl}
              alt="Character avatar"
              fill
              className="object-cover"
              priority
            />
            {state === 'complete' && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center animate-pulse">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            {state === 'generating' || state === 'polling' ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin mb-3" />
                <p className="text-sm font-medium text-center px-4">{message}</p>
                <div className="w-32 h-2 bg-muted-foreground/20 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This usually takes 10-30 seconds
                </p>
              </>
            ) : (
              <>
                <User className="w-16 h-16 mb-2" />
                <p className="text-sm">No avatar yet</p>
              </>
            )}
          </div>
        )}
      </div>

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

      {/* Generation/Regeneration Button */}
      {state !== 'generating' && state !== 'polling' && (
        <div className="w-full space-y-2">
          <button
            onClick={generateAvatar}
            disabled={
              state === 'generating' ||
              state === 'polling' ||
              !!(regenerationStatus && regenerationStatus.remaining === 0)
            }
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
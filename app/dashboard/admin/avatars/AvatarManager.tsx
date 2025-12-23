'use client';

import { useState } from 'react';
import { Copy, Check, User } from 'lucide-react';
import Image from 'next/image';

interface Avatar {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  isCurrent: boolean;
  createdAt: string;
  characterName: string;
  characterType: string;
  userName: string;
}

interface AvatarManagerProps {
  avatars: Avatar[];
}

export default function AvatarManager({ avatars }: AvatarManagerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'current' | 'preview'>('all');

  const filteredAvatars = avatars.filter(avatar => {
    if (filter === 'current') return avatar.isCurrent;
    if (filter === 'preview') return avatar.characterName === 'Preview';
    return true;
  });

  const handleCopyPrompt = async (prompt: string, avatarId: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(avatarId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCharacterTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      child: 'Child',
      pet: 'Pet',
      magical_creature: 'Magical Creature',
      storybook_character: 'Storybook Character',
      unknown: 'Preview',
    };
    return labels[type] || type;
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          All ({avatars.length})
        </button>
        <button
          onClick={() => setFilter('current')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'current'
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Active ({avatars.filter(a => a.isCurrent).length})
        </button>
        <button
          onClick={() => setFilter('preview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'preview'
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Previews ({avatars.filter(a => a.characterName === 'Preview').length})
        </button>
      </div>

      {/* Avatars Grid - Large Images with Prompts */}
      <div className="space-y-6">
        {filteredAvatars.map((avatar) => (
          <div
            key={avatar.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
          >
            <div className="flex flex-col md:flex-row">
              {/* Image */}
              <div className="relative w-full md:w-64 h-64 flex-shrink-0 bg-gray-100">
                <Image
                  src={avatar.imageUrl}
                  alt={avatar.characterName}
                  fill
                  className="object-cover"
                  sizes="256px"
                />
                {/* Badges */}
                {avatar.isCurrent && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    Active
                  </div>
                )}
                {avatar.characterName === 'Preview' && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                    Preview
                  </div>
                )}
              </div>

              {/* Info & Prompt */}
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">
                      {avatar.characterName}
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {getCharacterTypeLabel(avatar.characterType)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyPrompt(avatar.prompt, avatar.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {copiedId === avatar.id ? (
                      <>
                        <Check className="w-3 h-3 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Prompt */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {avatar.prompt}
                  </pre>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{avatar.userName}</span>
                  <span>{formatDate(avatar.createdAt)}</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
                    {avatar.style}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAvatars.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No avatars match the selected filter.
        </div>
      )}
    </div>
  );
}

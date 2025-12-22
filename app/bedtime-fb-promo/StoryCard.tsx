'use client';

import Image from 'next/image';

interface StoryCardProps {
  title: string;
  coverImageUrl: string;
  characterAvatarUrl?: string;
}

export default function StoryCard({ title, coverImageUrl, characterAvatarUrl }: StoryCardProps) {
  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Cover Image with Avatar */}
      <div className="relative h-96 bg-gray-100">
        <Image
          src={coverImageUrl}
          alt={title}
          fill
          className="object-cover"
        />
        {/* Character Avatar Circle - Bottom Right */}
        {characterAvatarUrl && (
          <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
            <Image
              src={characterAvatarUrl}
              alt="Character"
              fill
              className="object-cover object-top"
            />
          </div>
        )}
      </div>
      {/* Title */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 text-center leading-tight">
          {title}
        </h3>
      </div>
    </div>
  );
}

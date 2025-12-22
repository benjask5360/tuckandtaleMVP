'use client';

import { useState } from 'react';
import { Plus, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  title: string;
  coverImageUrl?: string;
  createdAt: string;
}

interface AvailableStoriesProps {
  stories: Story[];
}

export default function AvailableStories({ stories }: AvailableStoriesProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleAddToCarousel = async (storyId: string, storyTitle: string) => {
    if (!confirm(`Add "${storyTitle}" to the carousel?`)) {
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch('/api/admin/toggle-fb-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          featured: true,
          displayOrder: 999, // Will be placed at the end
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add story');
      }

      router.refresh();
    } catch (error) {
      console.error('Error adding story:', error);
      alert('Failed to add story. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (stories.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">No available stories to add to the carousel.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stories.map((story) => (
        <div
          key={story.id}
          className={`bg-white rounded-xl border-2 border-gray-200 p-4 transition-all ${
            isUpdating ? 'opacity-50 pointer-events-none' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Cover Image */}
            {story.coverImageUrl && (
              <div className="flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-gray-100 relative">
                <Image
                  src={story.coverImageUrl}
                  alt={story.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Title */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {story.title}
              </h3>
              <p className="text-xs text-gray-500">
                {new Date(story.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <Link
                href={`/dashboard/admin/story-export/${story.id}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View
              </Link>
              <button
                onClick={() => handleAddToCarousel(story.id, story.title)}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface StorySelectorProps {
  stories: Story[];
  userProfiles: Record<string, { id: string; full_name: string | null; email: string }>;
}

export default function StorySelector({ stories, userProfiles }: StorySelectorProps) {
  const router = useRouter();
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const storyId = e.target.value;
    setSelectedStoryId(storyId);
    if (storyId) {
      router.push(`/dashboard/admin/stories/${storyId}`);
    }
  };

  return (
    <div className="space-y-4">
      <label htmlFor="story-select" className="block text-sm font-medium text-gray-700 mb-2">
        Select a story to inspect
      </label>
      <div className="relative">
        <select
          id="story-select"
          value={selectedStoryId}
          onChange={handleSelectChange}
          className="block w-full px-4 py-3 pr-10 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white appearance-none cursor-pointer"
        >
          <option value="">Choose a story...</option>
          {stories.map((story) => {
            const user = userProfiles[story.user_id];
            const userName = user?.full_name || user?.email || 'Unknown User';
            const date = new Date(story.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <option key={story.id} value={story.id}>
                {story.title || 'Untitled Story'} — {userName} — {date}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
          <BookOpen className="w-5 h-5" />
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        {stories.length} {stories.length === 1 ? 'story' : 'stories'} available
      </p>
    </div>
  );
}

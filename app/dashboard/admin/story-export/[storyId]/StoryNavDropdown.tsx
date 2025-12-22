'use client';

import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface Props {
  stories: Story[];
  currentStoryId: string;
  userProfiles: Record<string, { full_name: string | null; email: string }>;
}

export default function StoryNavDropdown({ stories, currentStoryId, userProfiles }: Props) {
  const router = useRouter();

  return (
    <select
      value={currentStoryId}
      onChange={(e) => router.push(`/dashboard/admin/story-export/${e.target.value}`)}
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white max-w-md truncate"
    >
      {stories.map((story) => {
        const user = userProfiles[story.user_id];
        const userName = user?.full_name || user?.email?.split('@')[0] || 'Unknown';
        const date = new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <option key={story.id} value={story.id}>
            {story.title || 'Untitled'} — {userName} — {date}
          </option>
        );
      })}
    </select>
  );
}

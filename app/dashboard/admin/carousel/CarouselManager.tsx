'use client';

import { useState } from 'react';
import { GripVertical, ExternalLink, X, Pencil, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  title: string;
  coverImageUrl?: string;
  displayOrder: number;
}

interface CarouselManagerProps {
  stories: Story[];
}

export default function CarouselManager({ stories: initialStories }: CarouselManagerProps) {
  const [stories, setStories] = useState(initialStories);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const router = useRouter();

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newStories = [...stories];
    const draggedStory = newStories[draggedIndex];

    // Remove from old position
    newStories.splice(draggedIndex, 1);
    // Insert at new position
    newStories.splice(index, 0, draggedStory);

    setStories(newStories);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    setIsUpdating(true);

    try {
      // Update display order for all stories
      const updates = stories.map((story, index) => ({
        storyId: story.id,
        displayOrder: index,
      }));

      const response = await fetch('/api/admin/update-carousel-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating carousel order:', error);
      alert('Failed to update order. Please try again.');
      // Revert to initial order
      setStories(initialStories);
    } finally {
      setDraggedIndex(null);
      setIsUpdating(false);
    }
  };

  const handleRemove = async (storyId: string, storyTitle: string) => {
    if (!confirm(`Remove "${storyTitle}" from the carousel?`)) {
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
          featured: false,
          displayOrder: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove story');
      }

      // Remove from local state
      setStories(stories.filter(s => s.id !== storyId));
      router.refresh();
    } catch (error) {
      console.error('Error removing story:', error);
      alert('Failed to remove story. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartEdit = (storyId: string, currentTitle: string) => {
    setEditingId(storyId);
    setEditTitle(currentTitle);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleSaveTitle = async (storyId: string) => {
    if (!editTitle.trim()) {
      alert('Title cannot be empty');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch('/api/admin/update-story-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          title: editTitle.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      // Update local state
      setStories(stories.map(s =>
        s.id === storyId ? { ...s, title: editTitle.trim() } : s
      ));
      setEditingId(null);
      setEditTitle('');
      router.refresh();
    } catch (error) {
      console.error('Error updating title:', error);
      alert('Failed to update title. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {stories.map((story, index) => (
        <div
          key={story.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`group bg-white rounded-xl border-2 p-4 cursor-move transition-all ${
            draggedIndex === index
              ? 'border-purple-500 shadow-lg opacity-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <div className="flex items-center gap-4">
            {/* Drag Handle */}
            <div className="flex-shrink-0">
              <GripVertical className="w-6 h-6 text-gray-400" />
            </div>

            {/* Order Number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
              {index + 1}
            </div>

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
              {editingId === story.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle(story.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="flex-1 px-2 py-1 text-base border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                    disabled={isUpdating}
                  />
                  <button
                    onClick={() => handleSaveTitle(story.id)}
                    disabled={isUpdating}
                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {story.title}
                  </h3>
                  <button
                    onClick={() => handleStartEdit(story.id, story.title)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all"
                    title="Edit title"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Display Order: {index}
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
                onClick={() => handleRemove(story.id, story.title)}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      {isUpdating && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">Saving order...</p>
        </div>
      )}
    </div>
  );
}
